import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { hasPermission } from "../../../../packages/auth/src";
import {
  EstimateLineType,
  EstimateStatus,
  EstimateVersionStatus,
  Prisma,
  type SupplierPriceBasis,
} from "@prisma/client/index";
import type { SessionContext } from "../../../../packages/types/src";
import { AuditService } from "./audit.service";
import { AuthorizationService } from "./authorization.service";
import { BranchAccessService } from "./branch-access.service";
import { PrismaService } from "./prisma.service";
import { selectCurrentPrice } from "./supplier-pricing-rules";
import { TenantAccessService } from "./tenant-access.service";
import {
  assertEstimateMutable,
  assertEstimateTransition,
  calculateEstimateLine,
  calculateRequiredArea,
  summarizeEstimate,
} from "./estimate-rules";

type PrismaTransaction = Prisma.TransactionClient;
type TenantSession = Parameters<TenantAccessService["ensureTenant"]>[0];

type ListEstimateQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  customerId?: string;
  siteId?: string;
  branchId?: string;
};

type EstimateRoomInput = {
  surveyRoomId?: string | null;
  roomName: string;
  grossArea?: number | null;
  deductionArea?: number | null;
  netArea: number;
  wastePercent?: number | null;
  perimeter?: number | null;
  notes?: string | null;
};

type EstimateLineInput = {
  estimateRoomId?: string | null;
  lineType?: EstimateLineType;
  productId?: string | null;
  productVariantId?: string | null;
  supplierProductId?: string | null;
  description: string;
  quantity: number;
  unit?: string | null;
  unitCost?: number | null;
  unitSellPrice?: number | null;
  vatRate?: number | null;
  overrideReason?: string | null;
  notes?: string | null;
};

type CreateEstimateInput = {
  branchId?: string | null;
  customerId: string;
  siteId: string;
  surveyId?: string | null;
  title?: string | null;
  currency?: string | null;
  vatRate?: number | null;
  internalNotes?: string | null;
  customerNotes?: string | null;
  importSurveyRooms?: boolean;
  rooms?: EstimateRoomInput[];
  lines?: EstimateLineInput[];
};

type UpdateEstimateInput = Partial<
  Pick<
    CreateEstimateInput,
    "title" | "currency" | "vatRate" | "internalNotes" | "customerNotes"
  >
> & {
  rooms?: EstimateRoomInput[];
  lines?: EstimateLineInput[];
};

const ESTIMATE_INCLUDE: any = {
  branch: { select: { id: true, name: true, branchCode: true } },
  customer: { select: { id: true, displayName: true, primaryEmail: true, primaryPhone: true } },
  site: { select: { id: true, label: true, addressLine1: true, city: true, postcode: true } },
  survey: { select: { id: true, reference: true, status: true } },
  rooms: {
    orderBy: [{ displayOrder: "asc" }],
    include: {
      surveyRoom: { select: { id: true, name: true, netArea: true, wasteAdjustedArea: true } },
    },
  },
  lines: {
    orderBy: [{ displayOrder: "asc" }],
    include: {
      estimateRoom: { select: { id: true, roomName: true } },
      product: { select: { id: true, name: true, sku: true } },
      productVariant: { select: { id: true, name: true, sku: true } },
      supplierProduct: { select: { id: true, supplierSku: true, supplierDescription: true } },
    },
  },
  versions: {
    orderBy: [{ versionNumber: "desc" }],
    take: 5,
  },
};

@Injectable()
export class EstimatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantAccess: TenantAccessService,
    private readonly branchAccess: BranchAccessService,
    private readonly authorization: AuthorizationService,
    private readonly audit: AuditService,
  ) {}

  async listEstimates(session: TenantSession, query: ListEstimateQuery) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const where: Prisma.EstimateWhereInput = {
      tenantId,
      ...this.branchAccess.branchWhere(session, tenantId),
      ...(query.status ? { status: query.status as EstimateStatus } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.siteId ? { siteId: query.siteId } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.search
        ? {
            OR: [
              { estimateNumber: { contains: query.search, mode: "insensitive" } },
              { title: { contains: query.search, mode: "insensitive" } },
              { customer: { displayName: { contains: query.search, mode: "insensitive" } } },
              { site: { label: { contains: query.search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [total, items] = await this.prisma.client.$transaction([
      this.prisma.client.estimate.count({ where }),
      this.prisma.client.estimate.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          branch: { select: { id: true, name: true, branchCode: true } },
          customer: { select: { id: true, displayName: true } },
          site: { select: { id: true, label: true } },
          _count: { select: { rooms: true, lines: true, versions: true } },
        },
      }),
    ]);

    return {
      items: this.sanitizeEstimatePayload(items, session),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async getEstimate(session: TenantSession, estimateId: string) {
    const estimate = await this.ensureEstimate(session, estimateId, { include: ESTIMATE_INCLUDE });
    return this.sanitizeEstimatePayload(estimate, session);
  }

  async createEstimate(session: TenantSession, input: CreateEstimateInput) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const branchId = await this.branchAccess.resolveCreateBranchId(
      session,
      input.branchId ?? undefined,
      tenantId,
    );
    const currency = this.normalizeCurrency(input.currency ?? "GBP");
    const vatRate = this.decimal(input.vatRate ?? 0.2);

    await this.ensureCustomerSiteSurvey(tenantId, input.customerId, input.siteId, input.surveyId ?? null);

    const estimate = await this.prisma.client.$transaction(async (tx) => {
      const estimateNumber = await this.allocateNumber(tx, tenantId, "estimate", "EST");
      const created = await tx.estimate.create({
        data: {
          tenantId,
          branchId,
          customerId: input.customerId,
          siteId: input.siteId,
          surveyId: input.surveyId ?? null,
          estimateNumber,
          title: this.trimOrNull(input.title),
          currency,
          vatRate,
          internalNotes: this.trimOrNull(input.internalNotes),
          customerNotes: this.trimOrNull(input.customerNotes),
          createdById: session.user.id,
          updatedById: session.user.id,
        },
      });

      if (input.importSurveyRooms && input.surveyId) {
        await this.importSurveyRoomsTx(tx, tenantId, created.id, input.surveyId);
      }

      if (input.rooms?.length) {
        await this.replaceRoomsTx(tx, tenantId, created.id, input.rooms);
      }

      if (input.lines?.length) {
        const lineData = await this.buildEstimateLines(tx, session, tenantId, created.id, input.lines, vatRate);
        await tx.estimateLine.createMany({
          data: lineData.map((line, index) => ({
            ...line,
            tenantId,
            estimateId: created.id,
            displayOrder: index,
          })) as Prisma.EstimateLineCreateManyInput[],
        });
      }

      return this.recalculateTx(tx, tenantId, created.id, session.user.id, EstimateStatus.CALCULATED);
    });

    await this.audit.record({
      tenantId,
      actorUserId: session.user.id,
      action: "estimate:create",
      entityType: "estimate",
      entityId: estimate.id,
      newValues: { estimateNumber: estimate.estimateNumber, status: estimate.status },
    });

    return this.sanitizeEstimatePayload(estimate, session);
  }

  async updateEstimate(session: TenantSession, estimateId: string, input: UpdateEstimateInput) {
    const existing = await this.ensureEstimate(session, estimateId);
    assertEstimateMutable(existing.status);
    const vatRate = input.vatRate != null ? this.decimal(input.vatRate) : this.money(existing.vatRate);

    const updated = await this.prisma.client.$transaction(async (tx) => {
      if (input.rooms) {
        await tx.estimateLine.updateMany({
          where: { tenantId: existing.tenantId, estimateId: existing.id },
          data: { estimateRoomId: null },
        });
        await tx.estimateRoom.deleteMany({ where: { tenantId: existing.tenantId, estimateId: existing.id } });
        await this.replaceRoomsTx(tx, existing.tenantId, existing.id, input.rooms);
      }

      if (input.lines) {
        await tx.estimateLine.deleteMany({ where: { tenantId: existing.tenantId, estimateId: existing.id } });
        const lineData = await this.buildEstimateLines(tx, session, existing.tenantId, existing.id, input.lines, vatRate);
        await tx.estimateLine.createMany({
          data: lineData.map((line, index) => ({
            ...line,
            tenantId: existing.tenantId,
            estimateId: existing.id,
            displayOrder: index,
          })) as Prisma.EstimateLineCreateManyInput[],
        });
      }

      await tx.estimate.update({
        where: { id: existing.id },
        data: {
          ...(input.title !== undefined ? { title: this.trimOrNull(input.title) } : {}),
          ...(input.currency !== undefined ? { currency: this.normalizeCurrency(input.currency ?? existing.currency) } : {}),
          ...(input.vatRate !== undefined ? { vatRate } : {}),
          ...(input.internalNotes !== undefined ? { internalNotes: this.trimOrNull(input.internalNotes) } : {}),
          ...(input.customerNotes !== undefined ? { customerNotes: this.trimOrNull(input.customerNotes) } : {}),
          updatedById: session.user.id,
        },
      });

      return this.recalculateTx(tx, existing.tenantId, existing.id, session.user.id, EstimateStatus.CALCULATED);
    });

    await this.audit.record({
      tenantId: existing.tenantId,
      actorUserId: session.user.id,
      action: "estimate:update",
      entityType: "estimate",
      entityId: existing.id,
      previousValues: { status: existing.status },
      newValues: { status: updated.status, lineCount: updated.lines?.length ?? 0 },
    });

    return this.sanitizeEstimatePayload(updated, session);
  }

  async importSurveyRooms(session: TenantSession, estimateId: string) {
    const estimate = await this.ensureEstimate(session, estimateId);
    assertEstimateMutable(estimate.status);
    if (!estimate.surveyId) {
      throw new BadRequestException("This estimate is not linked to a survey.");
    }

    const updated = await this.prisma.client.$transaction(async (tx) => {
      await this.importSurveyRoomsTx(tx, estimate.tenantId, estimate.id, estimate.surveyId);
      return this.recalculateTx(tx, estimate.tenantId, estimate.id, session.user.id, EstimateStatus.CALCULATED);
    });

    await this.audit.record({
      tenantId: estimate.tenantId,
      actorUserId: session.user.id,
      action: "estimate:rooms:import",
      entityType: "estimate",
      entityId: estimate.id,
    });

    return this.sanitizeEstimatePayload(updated, session);
  }

  async addLine(session: TenantSession, estimateId: string, input: EstimateLineInput) {
    const estimate = await this.ensureEstimate(session, estimateId);
    assertEstimateMutable(estimate.status);
    const updated = await this.prisma.client.$transaction(async (tx) => {
      const lines = await this.buildEstimateLines(
        tx,
        session,
        estimate.tenantId,
        estimate.id,
        [input],
        this.money(estimate.vatRate),
      );
      const nextOrder = await tx.estimateLine.count({ where: { estimateId: estimate.id, tenantId: estimate.tenantId } });
      await tx.estimateLine.create({
        data: {
          ...lines[0]!,
          tenantId: estimate.tenantId,
          estimateId: estimate.id,
          displayOrder: nextOrder,
        } as Prisma.EstimateLineCreateManyInput,
      });
      return this.recalculateTx(tx, estimate.tenantId, estimate.id, session.user.id, EstimateStatus.CALCULATED);
    });
    return this.sanitizeEstimatePayload(updated, session);
  }

  async updateLine(session: TenantSession, estimateId: string, lineId: string, input: EstimateLineInput) {
    const estimate = await this.ensureEstimate(session, estimateId);
    assertEstimateMutable(estimate.status);

    const updated = await this.prisma.client.$transaction(async (tx) => {
      const existing = await tx.estimateLine.findFirst({
        where: { id: lineId, tenantId: estimate.tenantId, estimateId: estimate.id },
      });
      if (!existing) {
        throw new NotFoundException("Resource not found.");
      }
      const lines = await this.buildEstimateLines(
        tx,
        session,
        estimate.tenantId,
        estimate.id,
        [input],
        this.money(estimate.vatRate),
      );
      await tx.estimateLine.update({ where: { id: existing.id }, data: lines[0]! as any });
      return this.recalculateTx(tx, estimate.tenantId, estimate.id, session.user.id, EstimateStatus.CALCULATED);
    });

    return this.sanitizeEstimatePayload(updated, session);
  }

  async deleteLine(session: TenantSession, estimateId: string, lineId: string) {
    const estimate = await this.ensureEstimate(session, estimateId);
    assertEstimateMutable(estimate.status);
    const updated = await this.prisma.client.$transaction(async (tx) => {
      await tx.estimateLine.deleteMany({
        where: { id: lineId, tenantId: estimate.tenantId, estimateId: estimate.id },
      });
      return this.recalculateTx(tx, estimate.tenantId, estimate.id, session.user.id, EstimateStatus.CALCULATED);
    });
    return this.sanitizeEstimatePayload(updated, session);
  }

  async recalculate(session: TenantSession, estimateId: string) {
    const estimate = await this.ensureEstimate(session, estimateId);
    assertEstimateMutable(estimate.status);
    const updated = await this.prisma.client.$transaction((tx) =>
      this.recalculateTx(tx, estimate.tenantId, estimate.id, session.user.id, EstimateStatus.CALCULATED),
    );
    return this.sanitizeEstimatePayload(updated, session);
  }

  async readyForQuote(session: TenantSession, estimateId: string) {
    const estimate = await this.ensureEstimate(session, estimateId, { include: ESTIMATE_INCLUDE });
    assertEstimateTransition(estimate.status, EstimateStatus.READY_FOR_QUOTE);
    if (!estimate.lines.length) {
      throw new BadRequestException("An estimate needs at least one line before it is ready for quote.");
    }

    const updated = await this.prisma.client.$transaction(async (tx) => {
      const recalculated = await this.recalculateTx(
        tx,
        estimate.tenantId,
        estimate.id,
        session.user.id,
        EstimateStatus.READY_FOR_QUOTE,
      );
      const versionNumber = await tx.estimateVersion.count({
        where: { tenantId: estimate.tenantId, estimateId: estimate.id },
      });
      await tx.estimateVersion.create({
        data: {
          tenantId: estimate.tenantId,
          estimateId: estimate.id,
          versionNumber: versionNumber + 1,
          status: EstimateVersionStatus.READY_FOR_QUOTE,
          currency: recalculated.currency,
          subtotal: recalculated.subtotal,
          materialCost: recalculated.materialCost,
          labourCost: recalculated.labourCost,
          accessoryCost: recalculated.accessoryCost,
          supplierCost: recalculated.supplierCost,
          marginAmount: recalculated.marginAmount,
          discountAmount: recalculated.discountAmount,
          vatRate: recalculated.vatRate,
          vatAmount: recalculated.vatAmount,
          grandTotal: recalculated.grandTotal,
          grossProfit: recalculated.grossProfit,
          grossMarginPercent: recalculated.grossMarginPercent,
          snapshot: this.toSnapshot(recalculated),
          createdById: session.user.id,
        },
      });
      return this.ensureEstimateTx(tx, estimate.tenantId, estimate.id, { include: ESTIMATE_INCLUDE });
    });

    await this.audit.record({
      tenantId: estimate.tenantId,
      actorUserId: session.user.id,
      action: "estimate:ready-for-quote",
      entityType: "estimate",
      entityId: estimate.id,
      previousValues: { status: estimate.status },
      newValues: { status: updated.status },
    });

    return this.sanitizeEstimatePayload(updated, session);
  }

  async cancel(session: TenantSession, estimateId: string) {
    const estimate = await this.ensureEstimate(session, estimateId);
    assertEstimateTransition(estimate.status, EstimateStatus.CANCELLED);
    const updated = await this.prisma.client.estimate.update({
      where: { id: estimate.id },
      data: { status: EstimateStatus.CANCELLED, cancelledAt: new Date(), updatedById: session.user.id },
      include: ESTIMATE_INCLUDE,
    });
    return this.sanitizeEstimatePayload(updated, session);
  }

  private async recalculateTx(
    tx: PrismaTransaction,
    tenantId: string,
    estimateId: string,
    actorUserId: string,
    status: EstimateStatus,
  ) {
    const estimate = await this.ensureEstimateTx(tx, tenantId, estimateId, {
      include: { lines: true },
    });
    const summary = summarizeEstimate(
      estimate.lines.map((line: any) => ({
        lineType: line.lineType,
        costTotal: this.money(line.costTotal),
        sellTotal: this.money(line.sellTotal),
        marginAmount: this.money(line.marginAmount),
        vatAmount: this.money(line.vatAmount),
        lineTotal: this.money(line.lineTotal),
      })),
      this.money(estimate.vatRate),
    );

    await tx.estimate.update({
      where: { id: estimate.id },
      data: {
        ...summary,
        status,
        updatedById: actorUserId,
      },
    });

    return this.ensureEstimateTx(tx, tenantId, estimateId, { include: ESTIMATE_INCLUDE });
  }

  private async buildEstimateLines(
    tx: PrismaTransaction,
    session: SessionContext,
    tenantId: string,
    estimateId: string,
    lines: EstimateLineInput[],
    defaultVatRate: Prisma.Decimal,
  ) {
    const results: Array<Record<string, unknown>> = [];

    for (const input of lines) {
      if (input.estimateRoomId) {
        await tx.estimateRoom.findFirstOrThrow({
          where: { id: input.estimateRoomId, tenantId, estimateId },
          select: { id: true },
        });
      }

      let productId = input.productId ?? null;
      let productVariantId = input.productVariantId ?? null;
      let supplierProduct: any = null;
      let selectedPrice: any = null;

      if (input.supplierProductId) {
        supplierProduct = await tx.supplierProduct.findFirst({
          where: { id: input.supplierProductId, tenantId },
          include: {
            product: { select: { id: true, name: true, sku: true } },
            variant: { select: { id: true, name: true, sku: true } },
            supplierUnit: { select: { code: true, name: true, symbol: true } },
            prices: { include: { priceListVersion: true } },
          },
        });
        if (!supplierProduct) {
          throw new NotFoundException("Resource not found.");
        }
        productId = supplierProduct.productId;
        productVariantId = supplierProduct.variantId;
        selectedPrice = selectCurrentPrice(
          supplierProduct.prices as any,
          new Date(),
          this.money(input.quantity),
        ) as any;
      }

      if (productId) {
        await this.ensureProductReference(tx, tenantId, productId, productVariantId);
      }

      const lineType = input.lineType ?? EstimateLineType.MATERIAL;
      const quantity = this.money(input.quantity);
      const catalogCost = selectedPrice
        ? this.money(selectedPrice.promotionalCost ?? selectedPrice.baseCost)
        : this.money(input.unitCost ?? 0);
      let unitCost = catalogCost;
      let hasOverride = false;

      if (input.unitCost != null && !this.money(input.unitCost).equals(catalogCost)) {
        if (!input.overrideReason?.trim()) {
          throw new BadRequestException("overrideReason is required when overriding a known supplier cost.");
        }
        hasOverride = true;
        unitCost = this.money(input.unitCost);
      }

      if (hasOverride && !hasPermission(session, "estimate:cost:override")) {
        this.authorization.requirePermissions(session, ["estimate:cost:override"]);
      }

      const unitSellPrice = this.money(input.unitSellPrice ?? unitCost.mul(1.35));
      const vatRate = input.vatRate != null ? this.decimal(input.vatRate) : defaultVatRate;
      const calculated = calculateEstimateLine({
        lineType,
        quantity,
        unitCost,
        unitSellPrice,
        vatRate,
      });

      results.push({
        estimateRoomId: input.estimateRoomId ?? null,
        lineType,
        productId,
        productVariantId,
        supplierProductId: input.supplierProductId ?? null,
        supplierProductPriceId: selectedPrice?.id ?? null,
        description:
          input.description.trim() ||
          supplierProduct?.supplierDescription ||
          supplierProduct?.product?.name ||
          "Estimate line",
        quantity,
        unit: input.unit?.trim() || supplierProduct?.supplierUnit?.code || "SQM",
        unitCost,
        unitSellPrice,
        ...calculated,
        vatRate,
        priceSnapshot: selectedPrice
          ? {
              supplierPriceId: selectedPrice.id,
              priceListVersionId: selectedPrice.priceListVersionId,
              priceBasis: selectedPrice.priceBasis as SupplierPriceBasis,
              currency: selectedPrice.currency,
              baseCost: selectedPrice.baseCost,
              promotionalCost: selectedPrice.promotionalCost,
              supplierSku: supplierProduct?.supplierSku ?? null,
              supplierDescription: supplierProduct?.supplierDescription ?? null,
            }
          : null,
        overrideReason: this.trimOrNull(input.overrideReason),
        overrideActorUserId: hasOverride ? session.user.id : null,
        overrideAt: hasOverride ? new Date() : null,
        notes: this.trimOrNull(input.notes),
      });
    }

    return results;
  }

  private async replaceRoomsTx(
    tx: PrismaTransaction,
    tenantId: string,
    estimateId: string,
    rooms: EstimateRoomInput[],
  ) {
    await tx.estimateRoom.createMany({
      data: rooms.map((room, index) => {
        const netArea = this.money(room.netArea);
        const wastePercent = this.money(room.wastePercent ?? 0);
        return {
          tenantId,
          estimateId,
          surveyRoomId: room.surveyRoomId ?? null,
          roomName: room.roomName.trim(),
          grossArea: this.money(room.grossArea ?? room.netArea),
          deductionArea: this.money(room.deductionArea ?? 0),
          netArea,
          wastePercent,
          requiredArea: calculateRequiredArea(netArea, wastePercent),
          perimeter: this.money(room.perimeter ?? 0),
          notes: this.trimOrNull(room.notes),
          displayOrder: index,
        };
      }),
    });
  }

  private async importSurveyRoomsTx(
    tx: PrismaTransaction,
    tenantId: string,
    estimateId: string,
    surveyId: string,
  ) {
    const rooms = await tx.surveyRoom.findMany({
      where: { tenantId, surveyId },
      orderBy: [{ sequence: "asc" }],
    });
    await tx.estimateRoom.deleteMany({ where: { tenantId, estimateId } });
    if (!rooms.length) {
      return;
    }
    await tx.estimateRoom.createMany({
      data: rooms.map((room, index) => ({
        tenantId,
        estimateId,
        surveyRoomId: room.id,
        roomName: room.name,
        grossArea: room.grossArea,
        deductionArea: this.money(room.grossArea).minus(this.money(room.netArea)),
        netArea: room.overrideArea ?? room.netArea,
        wastePercent: room.wastePercentage,
        requiredArea: room.wasteAdjustedArea,
        perimeter: room.perimeter,
        notes: room.preparationNotes ?? room.installationNotes ?? null,
        displayOrder: index,
      })),
    });
  }

  private async ensureCustomerSiteSurvey(
    tenantId: string,
    customerId: string,
    siteId: string,
    surveyId: string | null,
  ) {
    const site = await this.prisma.client.site.findFirst({
      where: { id: siteId, tenantId, customerId },
      select: { id: true },
    });
    if (!site) {
      throw new NotFoundException("Resource not found.");
    }
    if (surveyId) {
      const survey = await this.prisma.client.survey.findFirst({
        where: { id: surveyId, tenantId, customerId, siteId },
        select: { id: true },
      });
      if (!survey) {
        throw new NotFoundException("Resource not found.");
      }
    }
  }

  private async ensureProductReference(
    tx: PrismaTransaction,
    tenantId: string,
    productId: string,
    productVariantId: string | null,
  ) {
    const product = await tx.product.findFirst({ where: { id: productId, tenantId }, select: { id: true } });
    if (!product) {
      throw new NotFoundException("Resource not found.");
    }
    if (productVariantId) {
      const variant = await tx.productVariant.findFirst({
        where: { id: productVariantId, tenantId, productId },
        select: { id: true },
      });
      if (!variant) {
        throw new NotFoundException("Resource not found.");
      }
    }
  }

  private async ensureEstimate(
    session: TenantSession,
    estimateId: string,
    args?: Omit<Prisma.EstimateFindFirstArgs, "where">,
  ): Promise<any> {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const estimate = await this.prisma.client.estimate.findFirst({
      where: {
        id: estimateId,
        tenantId,
        ...this.branchAccess.branchWhere(session, tenantId),
      },
      ...(args ?? {}),
    });
    if (!estimate) {
      throw new NotFoundException("Resource not found.");
    }
    return estimate;
  }

  private async ensureEstimateTx(
    tx: PrismaTransaction,
    tenantId: string,
    estimateId: string,
    args?: Omit<Prisma.EstimateFindFirstArgs, "where">,
  ): Promise<any> {
    const estimate = await tx.estimate.findFirst({
      where: { id: estimateId, tenantId },
      ...(args ?? {}),
    });
    if (!estimate) {
      throw new NotFoundException("Resource not found.");
    }
    return estimate;
  }

  private async allocateNumber(
    tx: PrismaTransaction,
    tenantId: string,
    key: string,
    prefix: string,
  ) {
    const sql = Prisma.sql`
      INSERT INTO "NumberSequence" ("id", "tenantId", "key", "prefix", "nextValue", "padding", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${tenantId}::uuid, ${key}, ${prefix}, 2, 6, now(), now())
      ON CONFLICT ("tenantId", "key")
      DO UPDATE SET "nextValue" = "NumberSequence"."nextValue" + 1, "prefix" = EXCLUDED."prefix", "padding" = EXCLUDED."padding", "updatedAt" = now()
      RETURNING "prefix", "nextValue", "padding"
    `;
    const rows = await tx.$queryRaw<Array<{ prefix: string; nextValue: number; padding: number }>>(sql);
    const row = rows[0];
    if (!row) {
      throw new BadRequestException("Unable to allocate the next estimate number.");
    }
    return `${row.prefix}-${new Date().getUTCFullYear()}-${String(row.nextValue - 1).padStart(row.padding, "0")}`;
  }

  private sanitizeEstimatePayload<T>(payload: T, session: SessionContext): T {
    if (hasPermission(session, "estimate:cost:read")) {
      return payload;
    }

    return JSON.parse(
      JSON.stringify(payload, (key, value) => {
        if (
          [
            "materialCost",
            "labourCost",
            "accessoryCost",
            "supplierCost",
            "unitCost",
            "costTotal",
            "marginAmount",
            "marginPercent",
            "grossProfit",
            "grossMarginPercent",
            "priceSnapshot",
          ].includes(key)
        ) {
          return null;
        }
        return value;
      }),
    ) as T;
  }

  private toSnapshot(estimate: any) {
    return JSON.parse(JSON.stringify(estimate));
  }

  private normalizeCurrency(value: string) {
    const normalized = value.trim().toUpperCase();
    if (normalized.length !== 3) {
      throw new BadRequestException("Currency must be a three-letter ISO code.");
    }
    return normalized;
  }

  private decimal(value: number | string) {
    return new Prisma.Decimal(value);
  }

  private money(value: number | string | Prisma.Decimal | null | undefined) {
    return new Prisma.Decimal(value ?? 0);
  }

  private trimOrNull(value: string | null | undefined) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }
}

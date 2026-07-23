import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { hasPermission } from "../../../../packages/auth/src";
import {
  Prisma,
  PurchaseOrderDeliveryPlanStatus,
  PurchaseOrderStatus,
  PurchaseOrderVersionStatus,
  PurchaseRequisitionStatus,
  SupplierAcknowledgementStatus,
  type SupplierPriceBasis,
} from "@prisma/client/index";
import type { SessionContext } from "../../../../packages/types/src";
import { AuditService } from "./audit.service";
import { AuthorizationService } from "./authorization.service";
import { BranchAccessService } from "./branch-access.service";
import { PrismaService } from "./prisma.service";
import { TenantAccessService } from "./tenant-access.service";
import { selectCurrentPrice } from "./supplier-pricing-rules";
import {
  assertPurchaseOrderTransition,
  assertPurchaseOrderVersionTransition,
  assertRequisitionMutable,
  assertRequisitionTransition,
  calculateOrderLine,
  summarizeOrder,
} from "./procurement-rules";

type RequisitionLineInput = {
  productId: string;
  productVariantId?: string | null | undefined;
  supplierProductId?: string | null | undefined;
  preferredSupplierId?: string | null | undefined;
  description: string;
  requestedQuantity: number;
  unit: string;
  estimatedUnitCost?: number | null | undefined;
  requiredDate?: Date | null | undefined;
  notes?: string | null | undefined;
};

type CreateRequisitionInput = {
  branchId?: string | null | undefined;
  requiredDate?: Date | null | undefined;
  purpose?: string | null | undefined;
  internalNotes?: string | null | undefined;
  lines: RequisitionLineInput[];
};

type UpdateRequisitionInput = {
  requiredDate?: Date | null | undefined;
  purpose?: string | null | undefined;
  internalNotes?: string | null | undefined;
  lines?: RequisitionLineInput[] | undefined;
};

type PurchaseOrderLineInput = {
  purchaseRequisitionLineId?: string | null | undefined;
  productId: string;
  productVariantId?: string | null | undefined;
  supplierProductId?: string | null | undefined;
  description?: string | null | undefined;
  quantity: number;
  unit?: string | null | undefined;
  unitCost?: number | null | undefined;
  taxRate?: number | null | undefined;
  requiredDate?: Date | null | undefined;
  expectedDate?: Date | null | undefined;
  notes?: string | null | undefined;
  overrideReason?: string | null | undefined;
};

type CreatePurchaseOrderInput = {
  branchId?: string | null | undefined;
  supplierId: string;
  purchaseRequisitionId?: string | null | undefined;
  currency?: string | null | undefined;
  deliveryAmount?: number | null | undefined;
  requiredDate?: Date | null | undefined;
  expectedDate?: Date | null | undefined;
  deliveryAddress?: string | null | undefined;
  supplierReference?: string | null | undefined;
  internalNotes?: string | null | undefined;
  terms?: string | null | undefined;
  lines: PurchaseOrderLineInput[];
};

type UpdatePurchaseOrderInput = {
  branchId?: string | null | undefined;
  deliveryAmount?: number | null | undefined;
  requiredDate?: Date | null | undefined;
  expectedDate?: Date | null | undefined;
  deliveryAddress?: string | null | undefined;
  supplierReference?: string | null | undefined;
  internalNotes?: string | null | undefined;
  terms?: string | null | undefined;
  lines?: PurchaseOrderLineInput[] | undefined;
};

type DeliveryPlanInput = {
  purchaseOrderVersionId?: string | null | undefined;
  expectedDate?: Date | null | undefined;
  deliveryAddress?: string | null | undefined;
  status?: PurchaseOrderDeliveryPlanStatus | undefined;
  supplierReference?: string | null | undefined;
  notes?: string | null | undefined;
};

type AcknowledgementInput = {
  purchaseOrderVersionId?: string | null | undefined;
  status?: SupplierAcknowledgementStatus | undefined;
  supplierReference?: string | null | undefined;
  acknowledgedAt?: Date | null | undefined;
  expectedDeliveryDate?: Date | null | undefined;
  notes?: string | null | undefined;
};

type ListQuery = {
  page?: number | undefined;
  pageSize?: number | undefined;
  search?: string | undefined;
  status?: string | undefined;
  supplierId?: string | undefined;
  branchId?: string | undefined;
};

type PrismaTransaction = Prisma.TransactionClient;
type TenantSession = Parameters<TenantAccessService["ensureTenant"]>[0];

const PURCHASE_REQUISITION_SELECT: any = {
  branch: { select: { id: true, name: true, branchCode: true } },
  lines: {
    orderBy: [{ displayOrder: "asc" }],
    include: {
      product: { select: { id: true, name: true, sku: true } },
      productVariant: { select: { id: true, name: true, sku: true } },
      supplierProduct: { select: { id: true, supplierSku: true, supplierDescription: true } },
      preferredSupplier: { select: { id: true, legalName: true, tradingName: true } },
      purchaseOrderLines: {
        select: {
          id: true,
          quantity: true,
          purchaseOrderVersion: {
            select: {
              id: true,
              purchaseOrder: {
                select: { id: true, purchaseOrderNumber: true, status: true },
              },
            },
          },
        },
      },
    },
  },
  purchaseOrders: {
    select: { id: true, purchaseOrderNumber: true, status: true, supplierId: true },
  },
};

const PURCHASE_ORDER_SELECT: any = {
  branch: { select: { id: true, name: true, branchCode: true } },
  supplier: { select: { id: true, legalName: true, tradingName: true, supplierCode: true } },
  purchaseRequisition: {
    select: { id: true, requisitionNumber: true, status: true, branchId: true },
  },
  versions: {
    orderBy: [{ versionNumber: "desc" }],
    include: {
      lines: {
        orderBy: [{ displayOrder: "asc" }],
        include: {
          product: { select: { id: true, name: true, sku: true } },
          productVariant: { select: { id: true, name: true, sku: true } },
          supplierProduct: { select: { id: true, supplierSku: true, supplierDescription: true } },
          purchaseRequisitionLine: {
            select: { id: true, purchaseRequisitionId: true, requestedQuantity: true, orderedQuantity: true },
          },
        },
      },
    },
  },
  acknowledgements: { orderBy: [{ createdAt: "desc" }] },
  deliveryPlans: { orderBy: [{ expectedDate: "asc" }, { createdAt: "asc" }] },
};

@Injectable()
export class ProcurementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantAccess: TenantAccessService,
    private readonly branchAccess: BranchAccessService,
    private readonly authorization: AuthorizationService,
    private readonly audit: AuditService,
  ) {}

  async listRequisitions(session: TenantSession, query: ListQuery) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const branchWhere = this.branchAccess.branchWhere(session, tenantId);
    const where: Prisma.PurchaseRequisitionWhereInput = {
      tenantId,
      ...branchWhere,
      ...(query.status
        ? { status: query.status as PurchaseRequisitionStatus }
        : {}),
      ...(query.search
        ? {
            OR: [
              { requisitionNumber: { contains: query.search, mode: "insensitive" } },
              { purpose: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
    };

    const [total, items] = await this.prisma.client.$transaction([
      this.prisma.client.purchaseRequisition.count({ where }),
      this.prisma.client.purchaseRequisition.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          branch: { select: { id: true, name: true, branchCode: true } },
          _count: { select: { lines: true, purchaseOrders: true } },
        },
      }),
    ]);

    return {
      items: this.sanitizeProcurementPayload(items, session),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async getRequisition(session: TenantSession, requisitionId: string) {
    const requisition = await this.ensureRequisition(session, requisitionId, {
      include: PURCHASE_REQUISITION_SELECT,
    });
    return this.sanitizeProcurementPayload(requisition, session);
  }

  async createRequisition(session: TenantSession, input: CreateRequisitionInput) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const branchId = await this.branchAccess.resolveCreateBranchId(
      session,
      input.branchId ?? undefined,
      tenantId,
    );

    if (!input.lines.length) {
      throw new BadRequestException("At least one requisition line is required.");
    }
    if (!branchId) {
      throw new BadRequestException("A branch is required for procurement records.");
    }

    const requisition: any = await this.prisma.client.$transaction(async (tx) => {
      const requisitionNumber = await this.allocateNumber(tx, tenantId, "purchase-requisition");

      await this.validateRequisitionLines(tx, tenantId, input.lines);

      const created = await tx.purchaseRequisition.create({
        data: {
          tenantId,
          branchId,
          requisitionNumber,
          requiredDate: input.requiredDate ?? null,
          purpose: this.trimOrNull(input.purpose),
          internalNotes: this.trimOrNull(input.internalNotes),
          requestedById: session.user.id,
          lines: {
            create: input.lines.map((line, index) => ({
              tenantId,
              productId: line.productId,
              productVariantId: line.productVariantId ?? null,
              supplierProductId: line.supplierProductId ?? null,
              preferredSupplierId: line.preferredSupplierId ?? null,
              description: line.description.trim(),
              requestedQuantity: this.decimal(line.requestedQuantity),
              unit: line.unit.trim(),
              estimatedUnitCost:
                line.estimatedUnitCost != null
                  ? this.decimal(line.estimatedUnitCost)
                  : null,
              estimatedTotal:
                line.estimatedUnitCost != null
                  ? this.money(line.requestedQuantity).mul(this.money(line.estimatedUnitCost))
                  : null,
              requiredDate: line.requiredDate ?? null,
              notes: this.trimOrNull(line.notes),
              displayOrder: index,
            })),
          },
        },
        include: PURCHASE_REQUISITION_SELECT,
      });

      return created;
    });

    await this.audit.record({
      tenantId,
      actorUserId: session.user.id,
      action: "procurement:requisition:create",
      entityType: "purchaseRequisition",
      entityId: requisition.id,
      newValues: {
        requisitionNumber: requisition.requisitionNumber,
        branchId: requisition.branchId,
        lineCount: requisition.lines.length,
      },
    });

    return this.sanitizeProcurementPayload(requisition, session);
  }

  async updateRequisition(
    session: TenantSession,
    requisitionId: string,
    input: UpdateRequisitionInput,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const existing = await this.ensureRequisition(session, requisitionId);
    assertRequisitionMutable(existing.status);

    if (input.lines) {
      await this.validateRequisitionLines(this.prisma.client, tenantId, input.lines);
    }

    const updated = await this.prisma.client.$transaction(async (tx) => {
      if (input.lines) {
        await tx.purchaseRequisitionLine.deleteMany({
          where: { purchaseRequisitionId: existing.id, tenantId },
        });
      }

      return tx.purchaseRequisition.update({
        where: { id: existing.id },
        data: {
          ...(input.requiredDate !== undefined ? { requiredDate: input.requiredDate } : {}),
          ...(input.purpose !== undefined ? { purpose: this.trimOrNull(input.purpose) } : {}),
          ...(input.internalNotes !== undefined
            ? { internalNotes: this.trimOrNull(input.internalNotes) }
            : {}),
          ...(input.lines
            ? {
                lines: {
                  create: input.lines.map((line, index) => ({
                    tenantId,
                    productId: line.productId,
                    productVariantId: line.productVariantId ?? null,
                    supplierProductId: line.supplierProductId ?? null,
                    preferredSupplierId: line.preferredSupplierId ?? null,
                    description: line.description.trim(),
                    requestedQuantity: this.decimal(line.requestedQuantity),
                    unit: line.unit.trim(),
                    estimatedUnitCost:
                      line.estimatedUnitCost != null
                        ? this.decimal(line.estimatedUnitCost)
                        : null,
                    estimatedTotal:
                      line.estimatedUnitCost != null
                        ? this.money(line.requestedQuantity).mul(this.money(line.estimatedUnitCost))
                        : null,
                    requiredDate: line.requiredDate ?? null,
                    notes: this.trimOrNull(line.notes),
                    displayOrder: index,
                  })),
                },
              }
            : {}),
        },
        include: PURCHASE_REQUISITION_SELECT,
      });
    });

    await this.audit.record({
      tenantId,
      actorUserId: session.user.id,
      action: "procurement:requisition:update",
      entityType: "purchaseRequisition",
      entityId: existing.id,
      previousValues: {
        requiredDate: existing.requiredDate,
        purpose: existing.purpose,
        internalNotes: existing.internalNotes,
      },
      newValues: {
        requiredDate: updated.requiredDate,
        purpose: updated.purpose,
        internalNotes: updated.internalNotes,
        lineCount: updated.lines?.length ?? 0,
      },
    });

    return this.sanitizeProcurementPayload(updated, session);
  }

  async submitRequisition(session: TenantSession, requisitionId: string) {
    return this.transitionRequisition(
      session,
      requisitionId,
      PurchaseRequisitionStatus.SUBMITTED,
      "procurement:requisition:submit",
    );
  }

  async approveRequisition(session: TenantSession, requisitionId: string) {
    return this.transitionRequisition(
      session,
      requisitionId,
      PurchaseRequisitionStatus.APPROVED,
      "procurement:requisition:approve",
    );
  }

  async rejectRequisition(session: TenantSession, requisitionId: string) {
    return this.transitionRequisition(
      session,
      requisitionId,
      PurchaseRequisitionStatus.REJECTED,
      "procurement:requisition:reject",
    );
  }

  async cancelRequisition(session: TenantSession, requisitionId: string) {
    return this.transitionRequisition(
      session,
      requisitionId,
      PurchaseRequisitionStatus.CANCELLED,
      "procurement:requisition:cancel",
    );
  }

  async createPurchaseOrderFromRequisition(
    session: TenantSession,
    requisitionId: string,
    input: CreatePurchaseOrderInput,
  ) {
    const requisition = await this.ensureRequisition(session, requisitionId, {
      include: { lines: true },
    });
    if (
      requisition.status !== PurchaseRequisitionStatus.APPROVED &&
      requisition.status !== PurchaseRequisitionStatus.PARTIALLY_ORDERED
    ) {
      throw new BadRequestException("Only approved requisitions can create purchase orders.");
    }

    const created = await this.createPurchaseOrder(session, {
      ...input,
      branchId: requisition.branchId,
      purchaseRequisitionId: requisition.id,
    });

    await this.audit.record({
      tenantId: requisition.tenantId,
      actorUserId: session.user.id,
      action: "procurement:requisition:convert",
      entityType: "purchaseRequisition",
      entityId: requisition.id,
      newValues: { purchaseOrderId: (created as { id: string }).id },
    });

    return created;
  }

  async listPurchaseOrders(session: TenantSession, query: ListQuery) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    const branchWhere = this.branchAccess.branchWhere(session, tenantId);
    const where: Prisma.PurchaseOrderWhereInput = {
      tenantId,
      ...branchWhere,
      ...(query.status ? { status: query.status as PurchaseOrderStatus } : {}),
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.search
        ? {
            OR: [
              { purchaseOrderNumber: { contains: query.search, mode: "insensitive" } },
              { supplierReference: { contains: query.search, mode: "insensitive" } },
              { supplier: { legalName: { contains: query.search, mode: "insensitive" } } },
              { supplier: { tradingName: { contains: query.search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const [total, items] = await this.prisma.client.$transaction([
      this.prisma.client.purchaseOrder.count({ where }),
      this.prisma.client.purchaseOrder.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          branch: { select: { id: true, name: true, branchCode: true } },
          supplier: { select: { id: true, legalName: true, tradingName: true, supplierCode: true } },
          versions: {
            select: {
              id: true,
              versionNumber: true,
              status: true,
              total: true,
            },
            orderBy: { versionNumber: "desc" },
            take: 1,
          },
        },
      }),
    ]);

    return {
      items: this.sanitizeProcurementPayload(items, session),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async getPurchaseOrder(session: TenantSession, purchaseOrderId: string) {
    const purchaseOrder = await this.ensurePurchaseOrder(session, purchaseOrderId, {
      include: PURCHASE_ORDER_SELECT,
    });
    return this.sanitizeProcurementPayload(purchaseOrder, session);
  }

  async getPurchaseOrderPrint(session: TenantSession, purchaseOrderId: string) {
    const purchaseOrder = await this.ensurePurchaseOrder(session, purchaseOrderId, {
      include: PURCHASE_ORDER_SELECT,
    });
    const sanitized = this.sanitizeProcurementPayload(purchaseOrder, session);
    delete (sanitized as any).internalNotes;
    for (const version of sanitized.versions ?? []) {
      for (const line of version.lines ?? []) {
        delete (line as any).overrideReason;
        delete (line as any).overrideActorUserId;
        delete (line as any).overrideAt;
        delete (line as any).priceSnapshot;
      }
    }
    return sanitized;
  }

  async createPurchaseOrder(session: TenantSession, input: CreatePurchaseOrderInput) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const branchId = await this.branchAccess.resolveCreateBranchId(
      session,
      input.branchId ?? undefined,
      tenantId,
    );

    if (!input.lines.length) {
      throw new BadRequestException("At least one purchase-order line is required.");
    }
    if (!branchId) {
      throw new BadRequestException("A branch is required for procurement records.");
    }

    const order: any = await this.prisma.client.$transaction(async (tx) => {
      await this.ensureSupplierTx(tx, tenantId, input.supplierId);
      if (input.purchaseRequisitionId) {
        await this.ensureRequisitionTx(tx, tenantId, input.purchaseRequisitionId);
      }

      const lineDraft = await this.buildPurchaseOrderLines(
        tx,
        session,
        tenantId,
        input.supplierId,
        input.lines,
      );

      const purchaseOrderNumber = await this.allocateNumber(tx, tenantId, "purchase-order");
      const totals = summarizeOrder(lineDraft, this.money(input.deliveryAmount ?? 0));

      const createdOrder = await tx.purchaseOrder.create({
        data: {
          tenantId,
          branchId,
          supplierId: input.supplierId,
          purchaseRequisitionId: input.purchaseRequisitionId ?? null,
          purchaseOrderNumber,
          status: PurchaseOrderStatus.DRAFT,
          currency: this.normalizeCurrency(input.currency ?? "GBP"),
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          deliveryAmount: totals.deliveryAmount,
          total: totals.total,
          requiredDate: input.requiredDate ?? null,
          expectedDate: input.expectedDate ?? null,
          deliveryAddress: this.trimOrNull(input.deliveryAddress),
          supplierReference: this.trimOrNull(input.supplierReference),
          internalNotes: this.trimOrNull(input.internalNotes),
          createdById: session.user.id,
        },
      });

      await tx.purchaseOrderVersion.create({
        data: {
          tenantId,
          purchaseOrderId: createdOrder.id,
          versionNumber: 1,
          status: PurchaseOrderVersionStatus.DRAFT,
          currency: createdOrder.currency,
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          deliveryAmount: totals.deliveryAmount,
          total: totals.total,
          requiredDate: input.requiredDate ?? null,
          expectedDate: input.expectedDate ?? null,
          deliveryAddress: this.trimOrNull(input.deliveryAddress),
          supplierReference: this.trimOrNull(input.supplierReference),
          terms: this.trimOrNull(input.terms),
          notes: this.trimOrNull(input.internalNotes),
          createdById: session.user.id,
          lines: {
            createMany: {
              data: lineDraft.map((line: any, index: number) => ({
                tenantId,
                purchaseRequisitionLineId: line.purchaseRequisitionLineId,
                productId: line.productId,
                productVariantId: line.productVariantId,
                supplierProductId: line.supplierProductId,
                supplierSku: line.supplierSku,
                description: line.description,
                quantity: line.quantity,
                unit: line.unit,
                unitCost: line.unitCost,
                lineSubtotal: line.lineSubtotal,
                taxRate: line.taxRate,
                taxAmount: line.taxAmount,
                lineTotal: line.lineTotal,
                requiredDate: line.requiredDate,
                expectedDate: line.expectedDate,
                notes: line.notes,
                displayOrder: index,
                priceSnapshot: line.priceSnapshot ?? Prisma.JsonNull,
                overrideReason: line.overrideReason,
                overrideActorUserId: line.overrideActorUserId,
                overrideAt: line.overrideAt,
              })),
            },
          },
        },
      });

      

      if (input.purchaseRequisitionId) {
        await this.applyRequisitionAllocation(tx, tenantId, input.purchaseRequisitionId, lineDraft);
      }

      return this.ensurePurchaseOrderTx(tx, tenantId, createdOrder.id, {
        include: PURCHASE_ORDER_SELECT,
      });
    });

    await this.audit.record({
      tenantId,
      actorUserId: session.user.id,
      action: "procurement:order:create",
      entityType: "purchaseOrder",
      entityId: order.id,
      newValues: {
        purchaseOrderNumber: order.purchaseOrderNumber,
        supplierId: order.supplierId,
        lineCount: order.versions?.[0]?.lines.length ?? 0,
      },
    });

    return this.sanitizeProcurementPayload(order, session);
  }

  async updatePurchaseOrder(
    session: TenantSession,
    purchaseOrderId: string,
    input: UpdatePurchaseOrderInput,
  ) {
    const existing = await this.ensurePurchaseOrder(session, purchaseOrderId, {
      include: { versions: { include: { lines: true }, orderBy: { versionNumber: "desc" }, take: 1 } },
    });

    if ((!existing.versions || existing.versions.length === 0)) {
      throw new BadRequestException("Purchase order is missing a current version.");
    }

    if (existing.versions[0].status !== PurchaseOrderVersionStatus.DRAFT) {
      throw new BadRequestException("Only draft purchase orders can be edited.");
    }

    const updated: any = await this.prisma.client.$transaction(async (tx) => {
      const lineDraft = input.lines
        ? await this.buildPurchaseOrderLines(
            tx,
            session,
            existing.tenantId,
            existing.supplierId,
            input.lines,
          )
        : existing.versions[0]!.lines.map((line: any) => ({
            purchaseRequisitionLineId: line.purchaseRequisitionLineId,
            productId: line.productId,
            productVariantId: line.productVariantId,
            supplierProductId: line.supplierProductId,
            supplierSku: line.supplierSku,
            description: line.description,
            quantity: line.quantity,
            unit: line.unit,
            unitCost: line.unitCost,
            lineSubtotal: line.lineSubtotal,
            taxRate: line.taxRate,
            taxAmount: line.taxAmount,
            lineTotal: line.lineTotal,
            requiredDate: line.requiredDate,
            expectedDate: line.expectedDate,
            notes: line.notes,
            priceSnapshot: line.priceSnapshot,
            overrideReason: line.overrideReason,
            overrideActorUserId: line.overrideActorUserId,
            overrideAt: line.overrideAt,
          }));

      const totals = summarizeOrder(
        lineDraft,
        this.money(input.deliveryAmount ?? Number(existing.deliveryAmount)),
      );

      if (input.lines) {
        await tx.purchaseOrderLine.deleteMany({
          where: { purchaseOrderVersionId: existing.versions[0]!.id },
        });
      }

      await tx.purchaseOrderVersion.update({
        where: { id: existing.versions[0]!.id },
        data: {
          ...(input.lines
            ? {
                lines: {
                  createMany: {
                    data: lineDraft.map((line: any, index: number) => ({
                      tenantId: existing.tenantId,
                      purchaseRequisitionLineId: line.purchaseRequisitionLineId,
                      productId: line.productId,
                      productVariantId: line.productVariantId,
                      supplierProductId: line.supplierProductId,
                      supplierSku: line.supplierSku,
                      description: line.description,
                      quantity: line.quantity,
                      unit: line.unit,
                      unitCost: line.unitCost,
                      lineSubtotal: line.lineSubtotal,
                      taxRate: line.taxRate,
                      taxAmount: line.taxAmount,
                      lineTotal: line.lineTotal,
                      requiredDate: line.requiredDate,
                      expectedDate: line.expectedDate,
                      notes: line.notes,
                      displayOrder: index,
                      priceSnapshot: line.priceSnapshot ?? Prisma.JsonNull,
                      overrideReason: line.overrideReason,
                      overrideActorUserId: line.overrideActorUserId,
                      overrideAt: line.overrideAt,
                    })),
                  },
                },
              }
            : {}),
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          deliveryAmount: totals.deliveryAmount,
          total: totals.total,
          ...(input.requiredDate !== undefined ? { requiredDate: input.requiredDate } : {}),
          ...(input.expectedDate !== undefined ? { expectedDate: input.expectedDate } : {}),
          ...(input.deliveryAddress !== undefined
            ? { deliveryAddress: this.trimOrNull(input.deliveryAddress) }
            : {}),
          ...(input.supplierReference !== undefined
            ? { supplierReference: this.trimOrNull(input.supplierReference) }
            : {}),
          ...(input.terms !== undefined ? { terms: this.trimOrNull(input.terms) } : {}),
          ...(input.internalNotes !== undefined
            ? { notes: this.trimOrNull(input.internalNotes) }
            : {}),
        },
      });

      await tx.purchaseOrder.update({
        where: { id: existing.id },
        data: {
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          deliveryAmount: totals.deliveryAmount,
          total: totals.total,
          ...(input.requiredDate !== undefined ? { requiredDate: input.requiredDate } : {}),
          ...(input.expectedDate !== undefined ? { expectedDate: input.expectedDate } : {}),
          ...(input.deliveryAddress !== undefined
            ? { deliveryAddress: this.trimOrNull(input.deliveryAddress) }
            : {}),
          ...(input.supplierReference !== undefined
            ? { supplierReference: this.trimOrNull(input.supplierReference) }
            : {}),
          ...(input.internalNotes !== undefined
            ? { internalNotes: this.trimOrNull(input.internalNotes) }
            : {}),
        },
      });

      return this.ensurePurchaseOrderTx(tx, existing.tenantId, existing.id, {
        include: PURCHASE_ORDER_SELECT,
      });
    });

    await this.audit.record({
      tenantId: existing.tenantId,
      actorUserId: session.user.id,
      action: "procurement:order:update",
      entityType: "purchaseOrder",
      entityId: existing.id,
      previousValues: {
        total: existing.total,
        lineCount: existing.versions?.[0]?.lines.length ?? 0,
      },
      newValues: {
        total: updated.total,
        lineCount: updated.versions?.[0]?.lines.length ?? 0,
      },
    });

    return this.sanitizeProcurementPayload(updated, session);
  }

  async submitPurchaseOrder(session: TenantSession, purchaseOrderId: string) {
    return this.transitionPurchaseOrder(
      session,
      purchaseOrderId,
      PurchaseOrderStatus.PENDING_APPROVAL,
      PurchaseOrderVersionStatus.PENDING_APPROVAL,
      "procurement:order:submit",
    );
  }

  async approvePurchaseOrder(session: TenantSession, purchaseOrderId: string) {
    return this.transitionPurchaseOrder(
      session,
      purchaseOrderId,
      PurchaseOrderStatus.APPROVED,
      PurchaseOrderVersionStatus.APPROVED,
      "procurement:order:approve",
    );
  }

  async rejectPurchaseOrder(session: TenantSession, purchaseOrderId: string) {
    return this.transitionPurchaseOrder(
      session,
      purchaseOrderId,
      PurchaseOrderStatus.REJECTED,
      PurchaseOrderVersionStatus.REJECTED,
      "procurement:order:reject",
    );
  }

  async issuePurchaseOrder(session: TenantSession, purchaseOrderId: string) {
    return this.transitionPurchaseOrder(
      session,
      purchaseOrderId,
      PurchaseOrderStatus.ISSUED,
      PurchaseOrderVersionStatus.ISSUED,
      "procurement:order:issue",
    );
  }

  async cancelPurchaseOrder(session: TenantSession, purchaseOrderId: string) {
    return this.transitionPurchaseOrder(
      session,
      purchaseOrderId,
      PurchaseOrderStatus.CANCELLED,
      PurchaseOrderVersionStatus.CANCELLED,
      "procurement:order:cancel",
    );
  }

  async createNewVersion(session: TenantSession, purchaseOrderId: string) {
    const existing = await this.ensurePurchaseOrder(session, purchaseOrderId, {
      include: { versions: { include: { lines: true }, orderBy: { versionNumber: "desc" } } },
    });

    if ((!existing.versions || existing.versions.length === 0)) {
      throw new BadRequestException("Purchase order is missing a current version.");
    }

    if (
      existing.versions[0].status !== PurchaseOrderVersionStatus.APPROVED &&
      existing.versions[0].status !== PurchaseOrderVersionStatus.ISSUED
    ) {
      throw new BadRequestException(
        "Only approved or issued purchase orders can create a new version.",
      );
    }

    const updated: any = await this.prisma.client.$transaction(async (tx) => {
      const nextVersionNumber =
        Math.max(...existing.versions.map((version: any) => version.versionNumber)) + 1;

      await tx.purchaseOrderVersion.create({
        data: {
          tenantId: existing.tenantId,
          purchaseOrderId: existing.id,
          versionNumber: nextVersionNumber,
          status: PurchaseOrderVersionStatus.DRAFT,
          currency: existing.versions[0]!.currency,
          subtotal: existing.versions[0]!.subtotal,
          taxAmount: existing.versions[0]!.taxAmount,
          deliveryAmount: existing.versions[0]!.deliveryAmount,
          total: existing.versions[0]!.total,
          requiredDate: existing.versions[0]!.requiredDate,
          expectedDate: existing.versions[0]!.expectedDate,
          deliveryAddress: existing.versions[0]!.deliveryAddress,
          supplierReference: existing.versions[0]!.supplierReference,
          terms: existing.versions[0]!.terms,
          notes: existing.versions[0]!.notes,
          createdById: session.user.id,
          lines: {
            createMany: {
              data: existing.versions[0]!.lines.map((line: any, index: number) => ({
                tenantId: existing.tenantId,
                purchaseRequisitionLineId: line.purchaseRequisitionLineId,
                productId: line.productId,
                productVariantId: line.productVariantId,
                supplierProductId: line.supplierProductId,
                supplierSku: line.supplierSku,
                description: line.description,
                quantity: line.quantity,
                unit: line.unit,
                unitCost: line.unitCost,
                lineSubtotal: line.lineSubtotal,
                taxRate: line.taxRate,
                taxAmount: line.taxAmount,
                lineTotal: line.lineTotal,
                requiredDate: line.requiredDate,
                expectedDate: line.expectedDate,
                notes: line.notes,
                displayOrder: index,
                priceSnapshot: line.priceSnapshot ?? Prisma.JsonNull,
                overrideReason: line.overrideReason,
                overrideActorUserId: line.overrideActorUserId,
                overrideAt: line.overrideAt,
              })),
            },
          },
        },
      });

      await tx.purchaseOrder.update({
        where: { id: existing.id },
        data: {
                    status: PurchaseOrderStatus.DRAFT,
          approvedAt: null,
          issuedAt: null,
          approvedById: null,
          issuedById: null,
        },
      });

      return this.ensurePurchaseOrderTx(tx, existing.tenantId, existing.id, {
        include: PURCHASE_ORDER_SELECT,
      });
    });

    await this.audit.record({
      tenantId: existing.tenantId,
      actorUserId: session.user.id,
      action: "procurement:order:version:create",
      entityType: "purchaseOrder",
      entityId: existing.id,
      newValues: { newVersionId: updated.versions?.[0]?.id },
    });

    return this.sanitizeProcurementPayload(updated, session);
  }

  async createAcknowledgement(
    session: TenantSession,
    purchaseOrderId: string,
    input: AcknowledgementInput,
  ) {
    const order = await this.ensurePurchaseOrder(session, purchaseOrderId);
    const created = await this.prisma.client.supplierAcknowledgement.create({
      data: {
        tenantId: order.tenantId,
        purchaseOrderId: order.id,
        purchaseOrderVersionId: input.purchaseOrderVersionId ?? (order.versions?.[0]?.id ?? null) ?? null,
        status: input.status ?? SupplierAcknowledgementStatus.PENDING,
        supplierReference: this.trimOrNull(input.supplierReference),
        acknowledgedAt: input.acknowledgedAt ?? null,
        expectedDeliveryDate: input.expectedDeliveryDate ?? null,
        notes: this.trimOrNull(input.notes),
        createdById: session.user.id,
      },
    });

    await this.maybeMarkAcknowledged(order.id, order.tenantId, created.status);
    await this.audit.record({
      tenantId: order.tenantId,
      actorUserId: session.user.id,
      action: "procurement:acknowledgement:create",
      entityType: "purchaseOrder",
      entityId: order.id,
      newValues: created,
    });

    return created;
  }

  async updateAcknowledgement(
    session: TenantSession,
    purchaseOrderId: string,
    acknowledgementId: string,
    input: AcknowledgementInput,
  ) {
    const order = await this.ensurePurchaseOrder(session, purchaseOrderId);
    const existing = await this.prisma.client.supplierAcknowledgement.findFirst({
      where: { id: acknowledgementId, purchaseOrderId: order.id, tenantId: order.tenantId },
    });
    if (!existing) {
      throw new NotFoundException("Resource not found.");
    }

    const updated = await this.prisma.client.supplierAcknowledgement.update({
      where: { id: existing.id },
      data: {
        ...(input.purchaseOrderVersionId !== undefined
          ? { purchaseOrderVersionId: input.purchaseOrderVersionId }
          : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.supplierReference !== undefined
          ? { supplierReference: this.trimOrNull(input.supplierReference) }
          : {}),
        ...(input.acknowledgedAt !== undefined ? { acknowledgedAt: input.acknowledgedAt } : {}),
        ...(input.expectedDeliveryDate !== undefined
          ? { expectedDeliveryDate: input.expectedDeliveryDate }
          : {}),
        ...(input.notes !== undefined ? { notes: this.trimOrNull(input.notes) } : {}),
      },
    });

    await this.maybeMarkAcknowledged(order.id, order.tenantId, updated.status);
    await this.audit.record({
      tenantId: order.tenantId,
      actorUserId: session.user.id,
      action: "procurement:acknowledgement:update",
      entityType: "purchaseOrder",
      entityId: order.id,
      previousValues: existing,
      newValues: updated,
    });

    return updated;
  }

  async listDeliveryPlans(session: TenantSession, purchaseOrderId: string) {
    const order = await this.ensurePurchaseOrder(session, purchaseOrderId);
    return this.prisma.client.purchaseOrderDeliveryPlan.findMany({
      where: { tenantId: order.tenantId, purchaseOrderId: order.id },
      orderBy: [{ expectedDate: "asc" }, { createdAt: "asc" }],
    });
  }

  async createDeliveryPlan(
    session: TenantSession,
    purchaseOrderId: string,
    input: DeliveryPlanInput,
  ) {
    const order = await this.ensurePurchaseOrder(session, purchaseOrderId);
    const created = await this.prisma.client.purchaseOrderDeliveryPlan.create({
      data: {
        tenantId: order.tenantId,
        purchaseOrderId: order.id,
        purchaseOrderVersionId: input.purchaseOrderVersionId ?? (order.versions?.[0]?.id ?? null) ?? null,
        expectedDate: input.expectedDate ?? null,
        deliveryAddress: this.trimOrNull(input.deliveryAddress),
        status: input.status ?? PurchaseOrderDeliveryPlanStatus.PLANNED,
        supplierReference: this.trimOrNull(input.supplierReference),
        notes: this.trimOrNull(input.notes),
        createdById: session.user.id,
      },
    });

    await this.audit.record({
      tenantId: order.tenantId,
      actorUserId: session.user.id,
      action: "procurement:delivery-plan:create",
      entityType: "purchaseOrder",
      entityId: order.id,
      newValues: created,
    });

    return created;
  }

  async updateDeliveryPlan(
    session: TenantSession,
    purchaseOrderId: string,
    deliveryPlanId: string,
    input: DeliveryPlanInput,
  ) {
    const order = await this.ensurePurchaseOrder(session, purchaseOrderId);
    const existing = await this.prisma.client.purchaseOrderDeliveryPlan.findFirst({
      where: { id: deliveryPlanId, purchaseOrderId: order.id, tenantId: order.tenantId },
    });
    if (!existing) {
      throw new NotFoundException("Resource not found.");
    }

    const updated = await this.prisma.client.purchaseOrderDeliveryPlan.update({
      where: { id: existing.id },
      data: {
        ...(input.purchaseOrderVersionId !== undefined
          ? { purchaseOrderVersionId: input.purchaseOrderVersionId }
          : {}),
        ...(input.expectedDate !== undefined ? { expectedDate: input.expectedDate } : {}),
        ...(input.deliveryAddress !== undefined
          ? { deliveryAddress: this.trimOrNull(input.deliveryAddress) }
          : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.supplierReference !== undefined
          ? { supplierReference: this.trimOrNull(input.supplierReference) }
          : {}),
        ...(input.notes !== undefined ? { notes: this.trimOrNull(input.notes) } : {}),
      },
    });

    await this.audit.record({
      tenantId: order.tenantId,
      actorUserId: session.user.id,
      action: "procurement:delivery-plan:update",
      entityType: "purchaseOrder",
      entityId: order.id,
      previousValues: existing,
      newValues: updated,
    });

    return updated;
  }

  private async transitionRequisition(
    session: TenantSession,
    requisitionId: string,
    nextStatus: PurchaseRequisitionStatus,
    action: string,
  ) {
    const requisition = await this.ensureRequisition(session, requisitionId);
    assertRequisitionTransition(requisition.status, nextStatus);

    const updated = await this.prisma.client.purchaseRequisition.update({
      where: { id: requisition.id },
      data: {
        status: nextStatus,
        ...(nextStatus === PurchaseRequisitionStatus.SUBMITTED ? { submittedAt: new Date() } : {}),
        ...(nextStatus === PurchaseRequisitionStatus.APPROVED
          ? { approvedAt: new Date(), approvedById: session.user.id }
          : {}),
        ...(nextStatus === PurchaseRequisitionStatus.REJECTED ? { rejectedAt: new Date() } : {}),
        ...(nextStatus === PurchaseRequisitionStatus.CANCELLED
          ? { cancelledAt: new Date() }
          : {}),
      },
      include: PURCHASE_REQUISITION_SELECT,
    });

    await this.audit.record({
      tenantId: requisition.tenantId,
      actorUserId: session.user.id,
      action,
      entityType: "purchaseRequisition",
      entityId: requisition.id,
      previousValues: { status: requisition.status },
      newValues: { status: updated.status },
    });

    return this.sanitizeProcurementPayload(updated, session);
  }

  private async transitionPurchaseOrder(
    session: TenantSession,
    purchaseOrderId: string,
    nextStatus: PurchaseOrderStatus,
    nextVersionStatus: PurchaseOrderVersionStatus,
    action: string,
  ) {
    const order = await this.ensurePurchaseOrder(session, purchaseOrderId, {
      include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
    });
    if ((!order.versions || order.versions.length === 0)) {
      throw new BadRequestException("Purchase order is missing a current version.");
    }

    assertPurchaseOrderTransition(order.status, nextStatus);
    assertPurchaseOrderVersionTransition(order.versions[0].status, nextVersionStatus);

    const updated = await this.prisma.client.$transaction(async (tx) => {
      await tx.purchaseOrderVersion.update({
        where: { id: order.versions[0]!.id },
        data: {
          status: nextVersionStatus,
          ...(nextVersionStatus === PurchaseOrderVersionStatus.APPROVED
            ? { approvedAt: new Date(), approvedById: session.user.id }
            : {}),
          ...(nextVersionStatus === PurchaseOrderVersionStatus.ISSUED
            ? { issuedAt: new Date(), issuedById: session.user.id }
            : {}),
        },
      });

      await tx.purchaseOrder.update({
        where: { id: order.id },
        data: {
          status: nextStatus,
          ...(nextStatus === PurchaseOrderStatus.APPROVED
            ? { approvedAt: new Date(), approvedById: session.user.id }
            : {}),
          ...(nextStatus === PurchaseOrderStatus.ISSUED
            ? { issuedAt: new Date(), issuedById: session.user.id }
            : {}),
          ...(nextStatus === PurchaseOrderStatus.CANCELLED
            ? { cancelledAt: new Date(), cancelledById: session.user.id }
            : {}),
        },
      });

      return this.ensurePurchaseOrderTx(tx, order.tenantId, order.id, {
        include: PURCHASE_ORDER_SELECT,
      });
    });

    await this.audit.record({
      tenantId: order.tenantId,
      actorUserId: session.user.id,
      action,
      entityType: "purchaseOrder",
      entityId: order.id,
      previousValues: { status: order.status, versionStatus: order.versions[0].status },
      newValues: { status: updated.status, versionStatus: updated.versions?.[0]?.status },
    });

    return this.sanitizeProcurementPayload(updated, session);
  }

  private async buildPurchaseOrderLines(
    tx: PrismaTransaction,
    session: SessionContext,
    tenantId: string,
    supplierId: string,
    lines: PurchaseOrderLineInput[],
  ) {
    const results: Array<Record<string, unknown>> = [];

    for (const line of lines) {
      await this.ensureProductReference(tx, tenantId, line.productId, line.productVariantId ?? null);

      let supplierProduct: any = null;

      if (line.supplierProductId) {
        supplierProduct = await tx.supplierProduct.findFirst({
          where: {
            id: line.supplierProductId,
            tenantId,
            supplierId,
          },
          include: {
            product: {
              select: { id: true, name: true, sku: true, category: { select: { slug: true } } },
            },
            variant: { select: { id: true, name: true, sku: true } },
            supplierUnit: { select: { code: true, name: true, symbol: true } },
            prices: {
              include: { priceListVersion: true },
            },
          },
        });
        if (!supplierProduct) {
          throw new NotFoundException("Resource not found.");
        }
      }

      if (line.purchaseRequisitionLineId) {
        const requisitionLine = await tx.purchaseRequisitionLine.findFirst({
          where: {
            id: line.purchaseRequisitionLineId,
            tenantId,
          },
        });
        if (!requisitionLine) {
          throw new NotFoundException("Resource not found.");
        }
        const remaining = this.money(requisitionLine.requestedQuantity).minus(
          this.money(requisitionLine.orderedQuantity),
        );
        if (this.money(line.quantity).greaterThan(remaining)) {
          throw new BadRequestException(
            "Purchase-order quantity cannot exceed the remaining approved requisition quantity.",
          );
        }
      }

      let selectedPrice: any = null;
      if (supplierProduct) {
        selectedPrice = selectCurrentPrice(
          supplierProduct.prices as any,
          new Date(),
          this.money(line.quantity),
        ) as any;
      }

        const catalogCost = selectedPrice
          ? this.money(selectedPrice.promotionalCost ?? selectedPrice.baseCost)
          : new Prisma.Decimal(0);

        let resolvedUnitCost = catalogCost;
        let hasOverride = false;

        if (line.unitCost != null) {
          const providedCost = this.money(line.unitCost);
          if (!providedCost.equals(catalogCost)) {
            if (!line.overrideReason?.trim()) {
              throw new BadRequestException("overrideReason is required when overriding a known cost.");
            }
            hasOverride = true;
            resolvedUnitCost = providedCost;
          }
        }

        if (hasOverride && !hasPermission(session, "procurement:cost:override")) {
          this.authorization.requirePermissions(session, ["procurement:cost:override"]);
        }

        const quantity = this.money(line.quantity);
      const taxRate = line.taxRate != null ? this.decimal(line.taxRate) : new Prisma.Decimal(0);
      const { lineSubtotal, taxAmount, lineTotal } = calculateOrderLine(quantity, resolvedUnitCost, taxRate);

      results.push({
        purchaseRequisitionLineId: line.purchaseRequisitionLineId ?? null,
        productId: line.productId,
        productVariantId: line.productVariantId ?? null,
        supplierProductId: line.supplierProductId ?? null,
        supplierSku: supplierProduct?.supplierSku ?? null,
        description:
          line.description?.trim() ||
          supplierProduct?.supplierDescription ||
          supplierProduct?.product.name ||
          "Purchase-order line",
        quantity,
        unit:
          line.unit?.trim() ||
          supplierProduct?.supplierUnit?.code ||
          "EACH",
        unitCost: resolvedUnitCost,
        lineSubtotal,
        taxRate,
        taxAmount,
        lineTotal,
        requiredDate: line.requiredDate ?? null,
        expectedDate: line.expectedDate ?? null,
        notes: this.trimOrNull(line.notes),
        priceSnapshot: selectedPrice
          ? {
              supplierPriceId: selectedPrice.id,
              priceListVersionId: selectedPrice.priceListVersionId,
              priceBasis: selectedPrice.priceBasis as SupplierPriceBasis,
              currency: selectedPrice.currency,
              baseCost: selectedPrice.baseCost,
              promotionalCost: selectedPrice.promotionalCost,
              supplierSku: supplierProduct?.supplierSku ?? null,
              supplierDescription:
                supplierProduct?.supplierDescription ?? supplierProduct?.product.name ?? null,
            }
          : null,
        overrideReason: this.trimOrNull(line.overrideReason),
        overrideActorUserId: hasOverride ? session.user.id : null,
        overrideAt: hasOverride ? new Date() : null,
      });
    }

    return results as Array<{
      purchaseRequisitionLineId: string | null;
      productId: string;
      productVariantId: string | null;
      supplierProductId: string | null;
      supplierSku: string | null;
      description: string;
      quantity: Prisma.Decimal;
      unit: string;
      unitCost: Prisma.Decimal;
      lineSubtotal: Prisma.Decimal;
      taxRate: Prisma.Decimal;
      taxAmount: Prisma.Decimal;
      lineTotal: Prisma.Decimal;
      requiredDate: Date | null;
      expectedDate: Date | null;
      notes: string | null;
      priceSnapshot: Record<string, unknown> | null;
      overrideReason: string | null;
      overrideActorUserId: string | null;
      overrideAt: Date | null;
    }>;
  }

  private async applyRequisitionAllocation(
    tx: PrismaTransaction,
    tenantId: string,
    requisitionId: string,
    lines: Array<{ purchaseRequisitionLineId: string | null; quantity: Prisma.Decimal }>,
  ) {
    for (const line of lines) {
      if (!line.purchaseRequisitionLineId) {
        continue;
      }
      await tx.purchaseRequisitionLine.update({
        where: { id: line.purchaseRequisitionLineId },
        data: {
          orderedQuantity: {
            increment: line.quantity,
          },
        },
      });
    }

    const requisitionLines = await tx.purchaseRequisitionLine.findMany({
      where: { tenantId, purchaseRequisitionId: requisitionId },
      select: { requestedQuantity: true, orderedQuantity: true },
    });
    const allOrdered = requisitionLines.every((line) =>
      this.money(line.orderedQuantity).greaterThanOrEqualTo(this.money(line.requestedQuantity)),
    );
    await tx.purchaseRequisition.update({
      where: { id: requisitionId },
      data: {
        status: allOrdered
          ? PurchaseRequisitionStatus.ORDERED
          : PurchaseRequisitionStatus.PARTIALLY_ORDERED,
      },
    });
  }

  private sanitizeProcurementPayload<T>(payload: T, session: SessionContext): T {
    if (hasPermission(session, "procurement:cost:view")) {
      return payload;
    }

    return JSON.parse(
      JSON.stringify(payload, (key, value) => {
        if (
          [
            "estimatedUnitCost",
            "estimatedTotal",
            "subtotal",
            "taxAmount",
            "deliveryAmount",
            "total",
            "unitCost",
            "lineSubtotal",
            "lineTotal",
            "priceSnapshot",
            "taxRate",
          ].includes(key)
        ) {
          return null;
        }
        return value;
      }),
    ) as T;
  }

  private async validateRequisitionLines(
    tx: PrismaTransaction | PrismaService["client"],
    tenantId: string,
    lines: RequisitionLineInput[],
  ) {
    for (const line of lines) {
      await this.ensureProductReference(
        tx,
        tenantId,
        line.productId,
        line.productVariantId ?? null,
      );
      if (line.supplierProductId) {
        await tx.supplierProduct.findFirstOrThrow({
          where: { id: line.supplierProductId, tenantId },
          select: { id: true },
        });
      }
      if (line.preferredSupplierId) {
        await tx.supplier.findFirstOrThrow({
          where: { id: line.preferredSupplierId, tenantId },
          select: { id: true },
        });
      }
    }
  }

  private async ensureProductReference(
    tx: PrismaTransaction | PrismaService["client"],
    tenantId: string,
    productId: string,
    productVariantId: string | null,
  ) {
    const product = await tx.product.findFirst({
      where: { id: productId, tenantId },
      select: { id: true },
    });
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

  private async ensureSupplierTx(
    tx: PrismaTransaction,
    tenantId: string,
    supplierId: string,
  ) {
    const supplier = await tx.supplier.findFirst({
      where: { id: supplierId, tenantId },
      select: { id: true },
    });
    if (!supplier) {
      throw new NotFoundException("Resource not found.");
    }
    return supplier;
  }

  private async ensureRequisitionTx(
    tx: PrismaTransaction,
    tenantId: string,
    requisitionId: string,
  ) {
    const requisition = await tx.purchaseRequisition.findFirst({
      where: { id: requisitionId, tenantId },
      select: { id: true },
    });
    if (!requisition) {
      throw new NotFoundException("Resource not found.");
    }
    return requisition;
  }

  private async ensureRequisition(
    session: TenantSession,
    requisitionId: string,
    args?: Omit<Prisma.PurchaseRequisitionFindFirstArgs, "where">,
  ): Promise<any> {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const requisition = await this.prisma.client.purchaseRequisition.findFirst({
      where: {
        id: requisitionId,
        tenantId,
        ...this.branchAccess.branchWhere(session, tenantId),
      },
      ...(args ?? {}),
    });
    if (!requisition) {
      throw new NotFoundException("Resource not found.");
    }
    return requisition;
  }

  private async ensurePurchaseOrder(
    session: TenantSession,
    purchaseOrderId: string,
    args?: Omit<Prisma.PurchaseOrderFindFirstArgs, "where">,
  ): Promise<any> {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const order = await this.prisma.client.purchaseOrder.findFirst({
      where: {
        id: purchaseOrderId,
        tenantId,
        ...this.branchAccess.branchWhere(session, tenantId),
      },
      ...(args ?? {}),
    });
    if (!order) {
      throw new NotFoundException("Resource not found.");
    }
    return order;
  }

  private async ensurePurchaseOrderTx(
    tx: PrismaTransaction,
    tenantId: string,
    purchaseOrderId: string,
    args?: Omit<Prisma.PurchaseOrderFindFirstArgs, "where">,
  ): Promise<any> {
    const order = await tx.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, tenantId },
      ...(args ?? {}),
    });
    if (!order) {
      throw new NotFoundException("Resource not found.");
    }
    return order;
  }

  private async maybeMarkAcknowledged(
    purchaseOrderId: string,
    tenantId: string,
    status: SupplierAcknowledgementStatus,
  ) {
    if (
      status === SupplierAcknowledgementStatus.ACCEPTED ||
      status === SupplierAcknowledgementStatus.ACCEPTED_WITH_CHANGES
    ) {
      await this.prisma.client.purchaseOrder.updateMany({
        where: {
          id: purchaseOrderId,
          tenantId,
          status: { in: [PurchaseOrderStatus.ISSUED, PurchaseOrderStatus.APPROVED] },
        },
        data: { status: PurchaseOrderStatus.ACKNOWLEDGED },
      });
    }
  }

  private async allocateNumber(
    tx: PrismaTransaction,
    tenantId: string,
    key: "purchase-requisition" | "purchase-order",
  ) {
    const prefix = key === "purchase-requisition" ? "PR" : "PO";
    const sql = Prisma.sql`
      INSERT INTO "NumberSequence" ("id", "tenantId", "key", "prefix", "nextValue", "padding", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${tenantId}::uuid, ${key}, ${prefix}, 2, 6, now(), now())
      ON CONFLICT ("tenantId", "key")
      DO UPDATE SET "nextValue" = "NumberSequence"."nextValue" + 1, "updatedAt" = now()
      RETURNING "prefix", "nextValue", "padding"
    `;
    const rows = await tx.$queryRaw<Array<{ prefix: string; nextValue: number; padding: number }>>(sql);
    const row = rows[0];
    if (!row) {
      throw new BadRequestException("Unable to allocate the next procurement number.");
    }
    const currentValue = row.nextValue - 1;
    const year = new Date().getUTCFullYear();
    return `${row.prefix}-${year}-${String(currentValue).padStart(row.padding, "0")}`;
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

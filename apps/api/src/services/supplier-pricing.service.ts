import { BadRequestException, Injectable } from "@nestjs/common";
import crypto from "node:crypto";
import {
  SupplierPriceImportFileType,
  SupplierPriceImportRowStatus,
  SupplierPriceListStatus,
  SupplierPriceSourceType,
  Prisma,
  type SupplierPriceBasis,
} from "@prisma/client";
import { AuditService } from "./audit.service";
import { PrismaService } from "./prisma.service";
import {
  assertImportApprovable,
  assertImportEditableForMapping,
  assertImportExecutable,
  assertImportLifecycleTransition,
  assertImportValidatable,
  assertLifecycleTransition,
  assertMutablePriceListStatus,
  assertPriceBasisCompatibility,
  assertPriceListDates,
  assertPromotionDates,
  assertQuantityBreak,
  buildPriceHistoryReason,
  normalizeCurrencyCode,
  selectCurrentPrice,
} from "./supplier-pricing-rules";
import {
  IMPORT_FILE_SIZE_LIMIT_BYTES,
  type ImportMappingSnapshot,
  type ImportUploadFile,
  normalizeImportRows,
  parseImportFile,
  summarizeNormalizedRows,
} from "./supplier-price-imports";

type PriceListInput = {
  name: string;
  reference?: string | null | undefined;
  currency: string;
  effectiveDate: Date;
  expiryDate?: Date | null | undefined;
  notes?: string | null | undefined;
  sourceType?: SupplierPriceSourceType | undefined;
  sourceFilename?: string | null | undefined;
};

type PriceListVersionInput = {
  effectiveDate?: Date | undefined;
  expiryDate?: Date | null | undefined;
  revisionReason?: string | null | undefined;
  sourceType?: SupplierPriceSourceType | undefined;
  sourceImportId?: string | null | undefined;
};

type SupplierProductPriceInput = {
  priceListVersionId: string;
  pricingUnitId?: string | null | undefined;
  priceBasis: SupplierPriceBasis;
  currency: string;
  baseCost: Prisma.Decimal | number;
  packCost?: Prisma.Decimal | number | null | undefined;
  rollCost?: Prisma.Decimal | number | null | undefined;
  areaCost?: Prisma.Decimal | number | null | undefined;
  quantityFrom?: Prisma.Decimal | number | null | undefined;
  quantityTo?: Prisma.Decimal | number | null | undefined;
  minimumOrderQty?: Prisma.Decimal | number | null | undefined;
  deliveryCostPlaceholder?: Prisma.Decimal | number | null | undefined;
  promotionalCost?: Prisma.Decimal | number | null | undefined;
  promotionStart?: Date | null | undefined;
  promotionEnd?: Date | null | undefined;
  effectiveDate: Date;
  expiryDate?: Date | null | undefined;
  taxTreatmentCode?: string | null | undefined;
  isActive?: boolean | undefined;
  changeReason?: string | null | undefined;
  sourceType?: SupplierPriceSourceType | undefined;
};

type CreatePriceImportInput = {
  priceListId?: string | null | undefined;
  worksheetName?: string | null | undefined;
  headerRowNumber?: number | null | undefined;
};

type UpdatePriceImportMappingInput = {
  name?: string | null | undefined;
  mapping: ImportMappingSnapshot;
};

type ManualImportRowMatchInput = {
  supplierProductId?: string | null | undefined;
  productId?: string | null | undefined;
  variantId?: string | null | undefined;
};

type PriceImportRowSort = "rowNumberAsc" | "rowNumberDesc";
type PriceImportRowMatchFilter =
  | "MATCHED"
  | "UNMATCHED"
  | "MANUAL"
  | "SUPPLIER_PRODUCT_ID"
  | "SUPPLIER_SKU"
  | "PRODUCT_SKU"
  | "VARIANT_SKU";
type PriceImportRowExecutionFilter = "PENDING" | "IMPORTED";

type ListPriceImportRowsInput = {
  page?: number | undefined;
  pageSize?: number | undefined;
  search?: string | undefined;
  status?: SupplierPriceImportRowStatus | undefined;
  matchStatus?: PriceImportRowMatchFilter | undefined;
  executionStatus?: PriceImportRowExecutionFilter | undefined;
  duplicateOnly?: boolean | undefined;
  hasWarnings?: boolean | undefined;
  sort?: PriceImportRowSort | undefined;
};

type PriceImportRowsSummary = {
  rowCount: number;
  validRowCount: number;
  invalidRowCount: number;
  unmatchedRowCount: number;
  duplicateRowCount: number;
  importedRowCount: number;
  warningRowCount: number;
};

@Injectable()
export class SupplierPricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listPriceLists(tenantId: string, supplierId: string) {
    await this.ensureSupplier(tenantId, supplierId);
    return this.prisma.client.supplierPriceList.findMany({
      where: { tenantId, supplierId },
      orderBy: [{ updatedAt: "desc" }],
      include: {
        versions: {
          orderBy: [{ versionNumber: "desc" }],
          include: { _count: { select: { prices: true } } },
        },
        _count: {
          select: {
            imports: true,
          },
        },
      },
    });
  }

  async getPriceList(tenantId: string, supplierId: string, priceListId: string) {
    return this.ensurePriceList(tenantId, supplierId, priceListId);
  }

  async createPriceList(
    tenantId: string,
    supplierId: string,
    userId: string,
    input: PriceListInput,
  ) {
    await this.ensureSupplierIsActive(tenantId, supplierId);
    assertPriceListDates(input);
    const currency = normalizeCurrencyCode(input.currency);

    return this.prisma.client.$transaction(async (tx) => {
      const priceList = await tx.supplierPriceList.create({
        data: {
          tenantId,
          supplierId,
          name: input.name.trim(),
          reference: input.reference ?? null,
          currency,
          status: SupplierPriceListStatus.DRAFT,
          sourceType: input.sourceType ?? SupplierPriceSourceType.MANUAL,
          sourceFilename: input.sourceFilename ?? null,
          effectiveDate: input.effectiveDate,
          expiryDate: input.expiryDate ?? null,
          notes: input.notes ?? null,
          createdById: userId,
          updatedById: userId,
        },
      });

      await tx.supplierPriceListVersion.create({
        data: {
          tenantId,
          supplierId,
          priceListId: priceList.id,
          versionNumber: 1,
          status: SupplierPriceListStatus.DRAFT,
          effectiveDate: input.effectiveDate,
          expiryDate: input.expiryDate ?? null,
          currency,
          sourceType: input.sourceType ?? SupplierPriceSourceType.MANUAL,
          createdById: userId,
        },
      });

      return this.ensurePriceListTx(tx, tenantId, supplierId, priceList.id);
    });
  }

  async updatePriceList(
    tenantId: string,
    supplierId: string,
    userId: string,
    priceListId: string,
    input: Partial<PriceListInput>,
  ) {
    const existing = await this.ensurePriceList(tenantId, supplierId, priceListId);
    assertMutablePriceListStatus(existing.status);
    assertPriceListDates({
      effectiveDate: input.effectiveDate ?? existing.effectiveDate,
      expiryDate:
        input.expiryDate === undefined ? existing.expiryDate : input.expiryDate,
    });

    return this.prisma.client.supplierPriceList.update({
      where: { id: existing.id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.reference !== undefined ? { reference: input.reference } : {}),
        ...(input.currency !== undefined
          ? { currency: normalizeCurrencyCode(input.currency) }
          : {}),
        ...(input.effectiveDate !== undefined
          ? { effectiveDate: input.effectiveDate }
          : {}),
        ...(input.expiryDate !== undefined ? { expiryDate: input.expiryDate } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.sourceType !== undefined ? { sourceType: input.sourceType } : {}),
        ...(input.sourceFilename !== undefined
          ? { sourceFilename: input.sourceFilename }
          : {}),
        updatedById: userId,
      },
      include: {
        versions: {
          orderBy: [{ versionNumber: "desc" }],
          include: { _count: { select: { prices: true } } },
        },
      },
    });
  }

  async transitionPriceList(
    tenantId: string,
    supplierId: string,
    userId: string,
    priceListId: string,
    nextStatus: SupplierPriceListStatus,
  ) {
    const priceList = await this.ensurePriceList(tenantId, supplierId, priceListId);
    assertLifecycleTransition(priceList.status, nextStatus);
    const latestVersion = priceList.versions[0];
    if (!latestVersion) {
      throw new BadRequestException("A price list requires at least one version.");
    }

    const statusesRequiringRows = new Set<SupplierPriceListStatus>([
      SupplierPriceListStatus.VALIDATED,
      SupplierPriceListStatus.APPROVED,
      SupplierPriceListStatus.ACTIVE,
    ]);
    if (statusesRequiringRows.has(nextStatus) && latestVersion._count.prices === 0) {
      throw new BadRequestException(
        "A price list must contain at least one price before validation or activation.",
      );
    }

    return this.prisma.client.$transaction(async (tx) => {
      if (nextStatus === SupplierPriceListStatus.ACTIVE) {
        await tx.supplierPriceList.updateMany({
          where: {
            tenantId,
            supplierId,
            id: { not: priceList.id },
            status: SupplierPriceListStatus.ACTIVE,
          },
          data: {
            status: SupplierPriceListStatus.SUPERSEDED,
            archivedAt: null,
            updatedById: userId,
          },
        });
        await tx.supplierPriceListVersion.updateMany({
          where: {
            tenantId,
            supplierId,
            priceListId: { not: priceList.id },
            status: SupplierPriceListStatus.ACTIVE,
          },
          data: {
            status: SupplierPriceListStatus.SUPERSEDED,
            supersededAt: new Date(),
          },
        });
      }

      await tx.supplierPriceList.update({
        where: { id: priceList.id },
        data: {
          status: nextStatus,
          approvedById:
            nextStatus === SupplierPriceListStatus.APPROVED ||
            nextStatus === SupplierPriceListStatus.ACTIVE
              ? userId
              : priceList.approvedById,
          approvedAt:
            nextStatus === SupplierPriceListStatus.APPROVED ||
            nextStatus === SupplierPriceListStatus.ACTIVE
              ? new Date()
              : priceList.approvedAt,
          archivedAt:
            nextStatus === SupplierPriceListStatus.ARCHIVED ? new Date() : null,
          updatedById: userId,
        },
      });

      await tx.supplierPriceListVersion.update({
        where: { id: latestVersion.id },
        data: {
          status: nextStatus,
          approvedById:
            nextStatus === SupplierPriceListStatus.APPROVED ||
            nextStatus === SupplierPriceListStatus.ACTIVE
              ? userId
              : latestVersion.approvedById,
          approvedAt:
            nextStatus === SupplierPriceListStatus.APPROVED ||
            nextStatus === SupplierPriceListStatus.ACTIVE
              ? new Date()
              : latestVersion.approvedAt,
          supersededAt:
            nextStatus === SupplierPriceListStatus.SUPERSEDED ? new Date() : null,
          archivedAt:
            nextStatus === SupplierPriceListStatus.ARCHIVED ? new Date() : null,
        },
      });

      return this.ensurePriceListTx(tx, tenantId, supplierId, priceList.id);
    });
  }

  async listVersions(tenantId: string, supplierId: string, priceListId: string) {
    const priceList = await this.ensurePriceList(tenantId, supplierId, priceListId);
    return priceList.versions;
  }

  async createVersion(
    tenantId: string,
    supplierId: string,
    userId: string,
    priceListId: string,
    input: PriceListVersionInput,
  ) {
    const priceList = await this.ensurePriceList(tenantId, supplierId, priceListId);
    const latestVersion = priceList.versions[0];
    if (!latestVersion) {
      throw new BadRequestException("A price list requires an initial version.");
    }

    assertPriceListDates({
      effectiveDate: input.effectiveDate ?? priceList.effectiveDate,
      expiryDate:
        input.expiryDate === undefined ? priceList.expiryDate : input.expiryDate,
    });

    return this.prisma.client.supplierPriceListVersion.create({
      data: {
        tenantId,
        supplierId,
        priceListId,
        versionNumber: latestVersion.versionNumber + 1,
        status: SupplierPriceListStatus.DRAFT,
        effectiveDate: input.effectiveDate ?? priceList.effectiveDate,
        expiryDate:
          input.expiryDate === undefined ? priceList.expiryDate : input.expiryDate,
        currency: priceList.currency,
        sourceType: input.sourceType ?? SupplierPriceSourceType.MANUAL,
        sourceImportId: input.sourceImportId ?? null,
        revisionReason: input.revisionReason ?? null,
        createdById: userId,
      },
      include: {
        prices: true,
      },
    });
  }

  async getVersion(
    tenantId: string,
    supplierId: string,
    priceListId: string,
    versionId: string,
  ) {
    await this.ensurePriceList(tenantId, supplierId, priceListId);
    return this.ensurePriceListVersion(tenantId, supplierId, priceListId, versionId);
  }

  async listSupplierProductPrices(
    tenantId: string,
    supplierId: string,
    supplierProductId: string,
  ) {
    await this.ensureSupplierProduct(tenantId, supplierId, supplierProductId);
    return this.prisma.client.supplierProductPrice.findMany({
      where: { tenantId, supplierId, supplierProductId },
      orderBy: [{ effectiveDate: "desc" }, { createdAt: "desc" }],
      include: {
        priceListVersion: true,
        pricingUnit: { select: { id: true, code: true, name: true, symbol: true } },
      },
    });
  }

  async createSupplierProductPrice(
    tenantId: string,
    supplierId: string,
    supplierProductId: string,
    userId: string,
    input: SupplierProductPriceInput,
  ) {
    const context = await this.ensurePricingContext(
      tenantId,
      supplierId,
      supplierProductId,
      input,
    );
    assertMutablePriceListStatus(context.version.status);

    return this.prisma.client.$transaction(async (tx) => {
      const record = await tx.supplierProductPrice.create({
        data: {
          tenantId,
          supplierId,
          supplierProductId,
          priceListVersionId: context.version.id,
          pricingUnitId: context.pricingUnitId,
          priceBasis: input.priceBasis,
          currency: normalizeCurrencyCode(input.currency),
          baseCost: input.baseCost,
          packCost: input.packCost ?? null,
          rollCost: input.rollCost ?? null,
          areaCost: input.areaCost ?? null,
          quantityFrom: input.quantityFrom ?? null,
          quantityTo: input.quantityTo ?? null,
          minimumOrderQty: input.minimumOrderQty ?? null,
          deliveryCostPlaceholder: input.deliveryCostPlaceholder ?? null,
          promotionalCost: input.promotionalCost ?? null,
          promotionStart: input.promotionStart ?? null,
          promotionEnd: input.promotionEnd ?? null,
          effectiveDate: input.effectiveDate,
          expiryDate: input.expiryDate ?? null,
          taxTreatmentCode: input.taxTreatmentCode ?? null,
          isActive: input.isActive ?? true,
          createdById: userId,
          updatedById: userId,
        },
        include: {
          priceListVersion: true,
          pricingUnit: {
            select: { id: true, code: true, name: true, symbol: true },
          },
        },
      });

      await tx.supplierProductPriceHistory.create({
        data: {
          tenantId,
          supplierId,
          supplierProductId,
          supplierProductPriceId: record.id,
          priceListVersionId: context.version.id,
          currency: record.currency,
          priceBasis: record.priceBasis,
          newBaseCost: record.baseCost,
          newPromotionalCost: record.promotionalCost,
          effectiveDate: record.effectiveDate,
          approvalStatus: context.version.status,
          changeReason: buildPriceHistoryReason(
            input.sourceType ?? SupplierPriceSourceType.MANUAL,
            input.changeReason ?? undefined,
          ),
          sourceType: input.sourceType ?? SupplierPriceSourceType.MANUAL,
          sourceLabel: context.priceList.name,
          actorUserId: userId,
        },
      });

      return record;
    });
  }

  async updateSupplierProductPrice(
    tenantId: string,
    supplierId: string,
    supplierProductId: string,
    priceId: string,
    userId: string,
    input: Partial<SupplierProductPriceInput>,
  ) {
    const existing = await this.ensureSupplierProductPrice(
      tenantId,
      supplierId,
      supplierProductId,
      priceId,
    );
    assertMutablePriceListStatus(existing.priceListVersion.status);

    const merged = {
      ...existing,
      ...input,
      pricingUnitId:
        input.pricingUnitId === undefined ? existing.pricingUnitId : input.pricingUnitId,
      expiryDate: input.expiryDate === undefined ? existing.expiryDate : input.expiryDate,
      promotionalCost:
        input.promotionalCost === undefined
          ? existing.promotionalCost
          : input.promotionalCost,
      promotionStart:
        input.promotionStart === undefined
          ? existing.promotionStart
          : input.promotionStart,
      promotionEnd:
        input.promotionEnd === undefined
          ? existing.promotionEnd
          : input.promotionEnd,
      quantityFrom:
        input.quantityFrom === undefined ? existing.quantityFrom : input.quantityFrom,
      quantityTo: input.quantityTo === undefined ? existing.quantityTo : input.quantityTo,
      minimumOrderQty:
        input.minimumOrderQty === undefined
          ? existing.minimumOrderQty
          : input.minimumOrderQty,
    };
    await this.ensurePricingContext(tenantId, supplierId, supplierProductId, {
      ...merged,
      priceListVersionId: existing.priceListVersionId,
    });

    return this.prisma.client.$transaction(async (tx) => {
      const record = await tx.supplierProductPrice.update({
        where: { id: existing.id },
        data: {
          ...(input.pricingUnitId !== undefined
            ? { pricingUnitId: merged.pricingUnitId }
            : {}),
          ...(input.priceBasis !== undefined ? { priceBasis: input.priceBasis } : {}),
          ...(input.currency !== undefined
            ? { currency: normalizeCurrencyCode(input.currency) }
            : {}),
          ...(input.baseCost !== undefined ? { baseCost: input.baseCost } : {}),
          ...(input.packCost !== undefined ? { packCost: input.packCost } : {}),
          ...(input.rollCost !== undefined ? { rollCost: input.rollCost } : {}),
          ...(input.areaCost !== undefined ? { areaCost: input.areaCost } : {}),
          ...(input.quantityFrom !== undefined
            ? { quantityFrom: input.quantityFrom }
            : {}),
          ...(input.quantityTo !== undefined ? { quantityTo: input.quantityTo } : {}),
          ...(input.minimumOrderQty !== undefined
            ? { minimumOrderQty: input.minimumOrderQty }
            : {}),
          ...(input.deliveryCostPlaceholder !== undefined
            ? { deliveryCostPlaceholder: input.deliveryCostPlaceholder }
            : {}),
          ...(input.promotionalCost !== undefined
            ? { promotionalCost: input.promotionalCost }
            : {}),
          ...(input.promotionStart !== undefined
            ? { promotionStart: input.promotionStart }
            : {}),
          ...(input.promotionEnd !== undefined ? { promotionEnd: input.promotionEnd } : {}),
          ...(input.effectiveDate !== undefined
            ? { effectiveDate: input.effectiveDate }
            : {}),
          ...(input.expiryDate !== undefined ? { expiryDate: input.expiryDate } : {}),
          ...(input.taxTreatmentCode !== undefined
            ? { taxTreatmentCode: input.taxTreatmentCode }
            : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
          updatedById: userId,
        },
        include: {
          priceListVersion: true,
          pricingUnit: {
            select: { id: true, code: true, name: true, symbol: true },
          },
        },
      });

      await tx.supplierProductPriceHistory.create({
        data: {
          tenantId,
          supplierId,
          supplierProductId,
          supplierProductPriceId: record.id,
          priceListVersionId: record.priceListVersionId,
          currency: record.currency,
          priceBasis: record.priceBasis,
          previousBaseCost: existing.baseCost,
          newBaseCost: record.baseCost,
          previousPromotionalCost: existing.promotionalCost,
          newPromotionalCost: record.promotionalCost,
          effectiveDate: record.effectiveDate,
          approvalStatus: existing.priceListVersion.status,
          changeReason: buildPriceHistoryReason(
            input.sourceType ?? SupplierPriceSourceType.MANUAL,
            input.changeReason ?? undefined,
          ),
          sourceType: input.sourceType ?? SupplierPriceSourceType.MANUAL,
          sourceLabel: existing.priceListVersion.priceList.name,
          actorUserId: userId,
        },
      });

      return record;
    });
  }

  async listSupplierProductPriceHistory(
    tenantId: string,
    supplierId: string,
    supplierProductId: string,
  ) {
    await this.ensureSupplierProduct(tenantId, supplierId, supplierProductId);
    return this.prisma.client.supplierProductPriceHistory.findMany({
      where: { tenantId, supplierId, supplierProductId },
      orderBy: [{ createdAt: "desc" }],
      include: {
        priceListVersion: true,
      },
    });
  }

  async listProductSupplierPrices(tenantId: string, productId: string) {
    return this.prisma.client.supplierProduct.findMany({
      where: { tenantId, productId, status: { not: "ARCHIVED" } },
      orderBy: [{ preferredSupplier: "desc" }, { supplierSku: "asc" }],
      include: {
        supplier: {
          select: {
            id: true,
            legalName: true,
            tradingName: true,
            supplierCode: true,
            status: true,
          },
        },
        supplierUnit: { select: { id: true, code: true, name: true, symbol: true } },
        prices: {
          where: { isActive: true },
          orderBy: [{ effectiveDate: "desc" }, { createdAt: "desc" }],
          include: {
            priceListVersion: true,
          },
        },
      },
    });
  }

  async listCurrentProductSupplierPrices(
    tenantId: string,
    productId: string,
    quantity?: number | undefined,
  ) {
    const records = await this.listProductSupplierPrices(tenantId, productId);
    return records.map((record) => {
      const selected = selectCurrentPrice(record.prices, new Date(), quantity);
      return {
        supplierProductId: record.id,
        supplier: record.supplier,
        supplierSku: record.supplierSku,
        supplierDescription: record.supplierDescription,
        supplierUnit: record.supplierUnit,
        preferredSupplier: record.preferredSupplier,
        selectedPrice: selected,
        availablePrices: record.prices,
      };
    });
  }

  async listPriceImports(tenantId: string, supplierId: string) {
    await this.ensureSupplier(tenantId, supplierId);
    return this.prisma.client.supplierPriceImport.findMany({
      where: { tenantId, supplierId },
      orderBy: [{ createdAt: "desc" }],
      include: {
        rows: {
          orderBy: [{ rowNumber: "asc" }],
          take: 10,
        },
      },
    });
  }

  async getPriceImport(tenantId: string, supplierId: string, importId: string) {
    return this.ensurePriceImport(tenantId, supplierId, importId);
  }

  async createPriceImport(
    tenantId: string,
    supplierId: string,
    userId: string,
    file: ImportUploadFile,
    input: CreatePriceImportInput,
  ) {
    await this.ensureSupplierIsActive(tenantId, supplierId);
    const parsed = await parseImportFile(file, {
      ...(input.worksheetName !== undefined
        ? { worksheetName: input.worksheetName }
        : {}),
      ...(input.headerRowNumber !== undefined
        ? { headerRowNumber: input.headerRowNumber }
        : {}),
    });
    const mappingSnapshot: ImportMappingSnapshot = {
      columns: parsed.mapping,
      headers: parsed.headers,
      rowOverrides: {},
    };
    const context = await this.getImportContext(tenantId, supplierId);
    const normalizedRows = normalizeImportRows(
      parsed.rows,
      parsed.headers,
      parsed.mapping,
      mappingSnapshot.rowOverrides,
      context,
      parsed.headerRowNumber + 1,
    );
    const summary = summarizeNormalizedRows(normalizedRows);
    const checksum = crypto.createHash("sha256").update(file.buffer).digest("hex");

    const priceListId = input.priceListId
      ? await this.ensurePriceListById(tenantId, supplierId, input.priceListId).then(
          (record) => record.id,
        )
      : null;

    return this.prisma.client.$transaction(async (tx) => {
      const importRecord = await tx.supplierPriceImport.create({
        data: {
          tenantId,
          supplierId,
          priceListId,
          status: "DRAFT",
          fileType: parsed.fileType,
          sourceFilename: file.originalname,
          worksheetName: parsed.worksheetName,
          headerRowNumber: parsed.headerRowNumber,
          rowCount: summary.rowCount,
          validRowCount: summary.validRowCount,
          invalidRowCount: summary.invalidRowCount,
          unmatchedRowCount: summary.unmatchedRowCount,
          duplicateRowCount: summary.duplicateRowCount,
          mappingSnapshot: mappingSnapshot as Prisma.InputJsonValue,
          validationSummary: {
            phase: "PARSED",
            fileSizeBytes: file.size,
            mimeType: file.mimetype,
            checksum,
            worksheetCount: parsed.worksheetCount,
            headers: parsed.headers,
            fileSizeLimitBytes: IMPORT_FILE_SIZE_LIMIT_BYTES,
          } as Prisma.InputJsonValue,
          createdById: userId,
        },
      });

      await tx.supplierPriceImportRow.createMany({
        data: normalizedRows.map((row) => ({
          tenantId,
          importId: importRecord.id,
          supplierId,
          supplierProductId: row.matched.supplierProductId,
          matchedProductId: row.matched.productId,
          matchedVariantId: row.matched.variantId,
          rowNumber: row.rowNumber,
          status: row.status,
          duplicateKey: row.duplicateKey,
          rawData: row.rawData as Prisma.InputJsonValue,
          normalizedData: row.normalizedData as Prisma.InputJsonValue,
          errorMessages: row.errorMessages as Prisma.InputJsonValue,
          warningMessages: row.warningMessages as Prisma.InputJsonValue,
        })),
      });

      return this.ensurePriceImportTx(tx, tenantId, supplierId, importRecord.id);
    });
  }

  async listPriceImportRows(
    tenantId: string,
    supplierId: string,
    importId: string,
    input: ListPriceImportRowsInput = {},
  ) {
    await this.ensurePriceImport(tenantId, supplierId, importId);
    const pageSize = Math.min(Math.max(input.pageSize ?? 25, 1), 100);
    const page = Math.max(input.page ?? 1, 1);
    const offset = (page - 1) * pageSize;
    const sortDirection = input.sort === "rowNumberDesc" ? Prisma.sql`DESC` : Prisma.sql`ASC`;
    const trimmedSearch = input.search?.trim();

    const conditions: Prisma.Sql[] = [
      Prisma.sql`"tenantId" = ${tenantId}::uuid`,
      Prisma.sql`"supplierId" = ${supplierId}::uuid`,
      Prisma.sql`"importId" = ${importId}::uuid`,
    ];

    if (input.status) {
      conditions.push(Prisma.sql`"status"::text = ${input.status}`);
    }

    if (input.executionStatus) {
      conditions.push(
        Prisma.sql`COALESCE("normalizedData"->>'executionStatus', 'PENDING') = ${input.executionStatus}`,
      );
    }

    if (input.matchStatus) {
      if (input.matchStatus === "MATCHED") {
        conditions.push(
          Prisma.sql`COALESCE("normalizedData"->>'matchMethod', 'UNMATCHED') <> 'UNMATCHED'`,
        );
      } else if (input.matchStatus === "UNMATCHED") {
        conditions.push(
          Prisma.sql`COALESCE("normalizedData"->>'matchMethod', 'UNMATCHED') = 'UNMATCHED'`,
        );
      } else {
        conditions.push(
          Prisma.sql`COALESCE("normalizedData"->>'matchMethod', 'UNMATCHED') = ${input.matchStatus}`,
        );
      }
    }

    if (input.duplicateOnly) {
      conditions.push(
        Prisma.sql`("status"::text = 'DUPLICATE' OR "duplicateKey" IS NOT NULL)`,
      );
    }

    if (input.hasWarnings) {
      conditions.push(
        Prisma.sql`(
          "warningMessages" IS NOT NULL
          AND jsonb_typeof("warningMessages"::jsonb) = 'array'
          AND jsonb_array_length("warningMessages"::jsonb) > 0
        )`,
      );
    }

    if (trimmedSearch) {
      const like = `%${trimmedSearch.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
      const rowNumber = Number(trimmedSearch);
      conditions.push(
        Prisma.sql`(
          COALESCE("normalizedData"->>'supplierSku', '') ILIKE ${like}
          OR COALESCE("normalizedData"->>'productSku', '') ILIKE ${like}
          OR COALESCE("normalizedData"->>'productName', '') ILIKE ${like}
          OR COALESCE("normalizedData"->>'variantSku', '') ILIKE ${like}
          ${Number.isInteger(rowNumber) ? Prisma.sql`OR "rowNumber" = ${rowNumber}` : Prisma.empty}
        )`,
      );
    }

    const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;
    const aggregateRows = await this.prisma.client.$queryRaw<
      Array<PriceImportRowsSummary & { total: bigint }>
    >(Prisma.sql`
      SELECT
        COUNT(*)::bigint AS total,
        COUNT(*)::int AS "rowCount",
        COUNT(*) FILTER (WHERE "status"::text = 'VALID')::int AS "validRowCount",
        COUNT(*) FILTER (WHERE "status"::text = 'INVALID')::int AS "invalidRowCount",
        COUNT(*) FILTER (WHERE "status"::text = 'UNMATCHED')::int AS "unmatchedRowCount",
        COUNT(*) FILTER (WHERE "status"::text = 'DUPLICATE')::int AS "duplicateRowCount",
        COUNT(*) FILTER (
          WHERE COALESCE("normalizedData"->>'executionStatus', 'PENDING') = 'IMPORTED'
        )::int AS "importedRowCount",
        COUNT(*) FILTER (
          WHERE "warningMessages" IS NOT NULL
            AND jsonb_typeof("warningMessages"::jsonb) = 'array'
            AND jsonb_array_length("warningMessages"::jsonb) > 0
        )::int AS "warningRowCount"
      FROM "SupplierPriceImportRow"
      ${whereClause}
    `);

    const aggregate = aggregateRows[0] ?? {
      total: 0n,
      rowCount: 0,
      validRowCount: 0,
      invalidRowCount: 0,
      unmatchedRowCount: 0,
      duplicateRowCount: 0,
      importedRowCount: 0,
      warningRowCount: 0,
    };
    const total = Number(aggregate.total);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const idRows = await this.prisma.client.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id"
      FROM "SupplierPriceImportRow"
      ${whereClause}
      ORDER BY "rowNumber" ${sortDirection}, "id" ASC
      OFFSET ${offset}
      LIMIT ${pageSize}
    `);
    const ids = idRows.map((row) => row.id);

    const items = ids.length
      ? await this.prisma.client.supplierPriceImportRow.findMany({
          where: { id: { in: ids } },
        }).then((rows) => {
          const order = new Map(ids.map((id, index) => [id, index]));
          return rows.sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0));
        })
      : [];

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
      summary: {
        rowCount: aggregate.rowCount,
        validRowCount: aggregate.validRowCount,
        invalidRowCount: aggregate.invalidRowCount,
        unmatchedRowCount: aggregate.unmatchedRowCount,
        duplicateRowCount: aggregate.duplicateRowCount,
        importedRowCount: aggregate.importedRowCount,
        warningRowCount: aggregate.warningRowCount,
      },
    };
  }

  async updatePriceImportMapping(
    tenantId: string,
    supplierId: string,
    importId: string,
    userId: string,
    input: UpdatePriceImportMappingInput,
  ) {
    const importRecord = await this.ensurePriceImport(tenantId, supplierId, importId);
    assertImportEditableForMapping(importRecord.status);

    const context = await this.getImportContext(tenantId, supplierId);
    const existingRows = await this.prisma.client.supplierPriceImportRow.findMany({
      where: { tenantId, supplierId, importId },
      orderBy: [{ rowNumber: "asc" }],
    });
    const headers = (input.mapping.headers ?? []) as string[];
    const rawRows = existingRows.map((row) =>
      headers.map((header) => String((row.rawData as Record<string, unknown>)[header] ?? "")),
    );

    const normalizedRows = normalizeImportRows(
      rawRows,
      headers,
      input.mapping.columns,
      input.mapping.rowOverrides,
      context,
      (importRecord.headerRowNumber ?? 1) + 1,
    );
    const summary = summarizeNormalizedRows(normalizedRows);

    await this.prisma.client.$transaction(async (tx) => {
      for (const row of normalizedRows) {
        await tx.supplierPriceImportRow.update({
          where: {
            importId_rowNumber: {
              importId,
              rowNumber: row.rowNumber,
            },
          },
          data: {
            supplierProductId: row.matched.supplierProductId,
            matchedProductId: row.matched.productId,
            matchedVariantId: row.matched.variantId,
            status: row.status,
            duplicateKey: row.duplicateKey,
            normalizedData: row.normalizedData as Prisma.InputJsonValue,
            errorMessages: row.errorMessages as Prisma.InputJsonValue,
            warningMessages: row.warningMessages as Prisma.InputJsonValue,
          },
        });
      }

      await tx.supplierPriceImport.update({
        where: { id: importId },
        data: {
          status: "DRAFT",
          mappingSnapshot: input.mapping as Prisma.InputJsonValue,
          validRowCount: summary.validRowCount,
          invalidRowCount: summary.invalidRowCount,
          unmatchedRowCount: summary.unmatchedRowCount,
          duplicateRowCount: summary.duplicateRowCount,
          validationSummary: {
            ...((importRecord.validationSummary as Prisma.JsonObject | null) ?? {}),
            phase: "MAPPED",
          } as Prisma.InputJsonValue,
          updatedAt: new Date(),
        },
      });
    });

    if (input.name?.trim()) {
      await this.prisma.client.supplierPriceImportMapping.upsert({
        where: {
          tenantId_supplierId_name: {
            tenantId,
            supplierId,
            name: input.name.trim(),
          },
        },
        update: {
          mappingJson: input.mapping as Prisma.InputJsonValue,
          updatedById: userId,
        },
        create: {
          tenantId,
          supplierId,
          name: input.name.trim(),
          fileType: importRecord.fileType,
          mappingJson: input.mapping as Prisma.InputJsonValue,
          createdById: userId,
          updatedById: userId,
        },
      });
    }

    return this.ensurePriceImport(tenantId, supplierId, importId);
  }

  async manuallyMatchPriceImportRow(
    tenantId: string,
    supplierId: string,
    importId: string,
    rowId: string,
    input: ManualImportRowMatchInput,
  ) {
    const importRecord = await this.ensurePriceImport(tenantId, supplierId, importId);
    assertImportEditableForMapping(importRecord.status);

    const row = await this.prisma.client.supplierPriceImportRow.findFirstOrThrow({
      where: {
        id: rowId,
        tenantId,
        supplierId,
        importId,
      },
    });

    let supplierProductId: string | null = null;
    let productId: string | null = null;
    let variantId: string | null = null;

    if (input.supplierProductId) {
      const supplierProduct = await this.prisma.client.supplierProduct.findFirstOrThrow({
        where: {
          id: input.supplierProductId,
          tenantId,
          supplierId,
        },
        select: {
          id: true,
          productId: true,
          variantId: true,
        },
      });
      supplierProductId = supplierProduct.id;
      productId = supplierProduct.productId;
      variantId = supplierProduct.variantId;
    } else {
      if (input.productId) {
        const product = await this.prisma.client.product.findFirstOrThrow({
          where: { id: input.productId, tenantId },
          select: { id: true },
        });
        productId = product.id;
      }

      if (input.variantId) {
        const variant = await this.prisma.client.productVariant.findFirstOrThrow({
          where: {
            id: input.variantId,
            tenantId,
          },
          select: { id: true, productId: true },
        });
        if (productId && variant.productId !== productId) {
          throw new BadRequestException(
            "Selected variant must belong to the selected product.",
          );
        }
        variantId = variant.id;
        productId = variant.productId;
      }
    }

    if (!supplierProductId && !productId && !variantId) {
      throw new BadRequestException(
        "A supplier product, product, or variant is required for manual matching.",
      );
    }

    const normalizedData = (row.normalizedData as Prisma.JsonObject | null) ?? {};
    const errorMessages = ((row.errorMessages as Prisma.JsonArray | null) ?? []).filter(
      (item) =>
        !(
          typeof item === "object" &&
          item !== null &&
          "code" in item &&
          (item as { code?: string }).code === "UNMATCHED_ROW"
        ),
    );
    const warningMessages = ((row.warningMessages as Prisma.JsonArray | null) ?? []).filter(
      (item) =>
        !(
          typeof item === "object" &&
          item !== null &&
          "code" in item &&
          (item as { code?: string }).code === "UNMATCHED_ROW"
        ),
    );

    return this.prisma.client.supplierPriceImportRow.update({
      where: { id: row.id },
      data: {
        supplierProductId,
        matchedProductId: productId,
        matchedVariantId: variantId,
        status: errorMessages.length ? "INVALID" : "VALID",
        normalizedData: {
          ...(normalizedData as Prisma.JsonObject),
          matchMethod: "MANUAL",
        } as Prisma.InputJsonValue,
        errorMessages: errorMessages as Prisma.InputJsonValue,
        warningMessages: warningMessages as Prisma.InputJsonValue,
      },
    });
  }

  async validatePriceImport(
    tenantId: string,
    supplierId: string,
    importId: string,
  ) {
    const importRecord = await this.ensurePriceImport(tenantId, supplierId, importId);
    assertImportValidatable(importRecord.status);
    const summary = {
      rowCount: importRecord.rowCount,
      validRowCount: importRecord.validRowCount,
      invalidRowCount: importRecord.invalidRowCount,
      unmatchedRowCount: importRecord.unmatchedRowCount,
      duplicateRowCount: importRecord.duplicateRowCount,
    };
    if (summary.invalidRowCount > 0 || summary.unmatchedRowCount > 0) {
      throw new BadRequestException(
        "Imports with invalid or unmatched rows cannot be validated.",
      );
    }

    return this.prisma.client.supplierPriceImport.update({
      where: { id: importId },
      data: {
        status: "VALIDATED",
        validationSummary: {
          ...((importRecord.validationSummary as Prisma.JsonObject | null) ?? {}),
          phase: "VALIDATED",
        } as Prisma.InputJsonValue,
      },
    });
  }

  async approvePriceImport(
    tenantId: string,
    supplierId: string,
    importId: string,
    userId: string,
  ) {
    const importRecord = await this.ensurePriceImport(tenantId, supplierId, importId);
    assertImportApprovable(importRecord.status);
    if (importRecord.duplicateRowCount > 0) {
      throw new BadRequestException("Duplicate rows must be resolved before approval.");
    }

    return this.prisma.client.supplierPriceImport.update({
      where: { id: importId },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        approvedById: userId,
        validationSummary: {
          ...((importRecord.validationSummary as Prisma.JsonObject | null) ?? {}),
          phase: "APPROVED",
        } as Prisma.InputJsonValue,
      },
    });
  }

  async executePriceImport(
    tenantId: string,
    supplierId: string,
    importId: string,
    userId: string,
  ) {
    const importRecord = await this.ensurePriceImport(tenantId, supplierId, importId);
    if (importRecord.status === "EXECUTED") {
      return importRecord;
    }
    if (importRecord.status === "EXECUTING") {
      throw new BadRequestException("Import execution is already in progress.");
    }
    assertImportExecutable(importRecord.status);

    try {
      const result = await this.prisma.client.$transaction(async (tx) => {
        const claimedExecution = await tx.supplierPriceImport.updateMany({
          where: { id: importId, tenantId, supplierId, status: "APPROVED" },
          data: { status: "EXECUTING" },
        });

        const lockedImport = await tx.supplierPriceImport.findFirstOrThrow({
          where: { id: importId, tenantId, supplierId },
        });
        if (claimedExecution.count === 0 && lockedImport.status === "EXECUTED") {
          return this.ensurePriceImportTx(tx, tenantId, supplierId, importId);
        }
        if (claimedExecution.count === 0 && lockedImport.status === "EXECUTING") {
          throw new BadRequestException("Import execution is already in progress.");
        }
        assertImportLifecycleTransition(lockedImport.status, "EXECUTING");

        const allRows = await tx.supplierPriceImportRow.findMany({
          where: {
            tenantId,
            supplierId,
            importId,
          },
          orderBy: [{ rowNumber: "asc" }],
        });
        const blockingRows = allRows.filter((row) => row.status !== "VALID");
        if (blockingRows.length > 0) {
          throw new BadRequestException(
            "Imports must not contain invalid, unmatched, duplicate, or previously imported rows before execution.",
          );
        }
        const rows = allRows;
        if (!rows.length) {
          throw new BadRequestException("No executable import rows were available.");
        }

        const earliestEffectiveDate = rows
          .map((row) => new Date(String((row.normalizedData as Prisma.JsonObject).effectiveDate)))
          .sort((left, right) => left.getTime() - right.getTime())[0] ?? new Date();

        let priceListId = lockedImport.priceListId;
        if (!priceListId) {
          const priceList = await tx.supplierPriceList.create({
            data: {
              tenantId,
              supplierId,
              name: `Imported ${lockedImport.sourceFilename}`,
              reference: `IMPORT-${lockedImport.id.slice(0, 8).toUpperCase()}`,
              currency: String(
                (rows[0]?.normalizedData as Prisma.JsonObject | undefined)?.currency ?? "GBP",
              ),
              status: "APPROVED",
              sourceType:
                lockedImport.fileType === SupplierPriceImportFileType.CSV
                  ? SupplierPriceSourceType.CSV_IMPORT
                  : SupplierPriceSourceType.XLSX_IMPORT,
              sourceFilename: lockedImport.sourceFilename,
              effectiveDate: earliestEffectiveDate,
              createdById: userId,
              updatedById: userId,
              approvedById: userId,
              approvedAt: new Date(),
            },
          });
          priceListId = priceList.id;
        }

        const latestVersion = await tx.supplierPriceListVersion.findFirst({
          where: { tenantId, supplierId, priceListId },
          orderBy: [{ versionNumber: "desc" }],
        });
        const version = await tx.supplierPriceListVersion.create({
          data: {
            tenantId,
            supplierId,
            priceListId,
            versionNumber: (latestVersion?.versionNumber ?? 0) + 1,
            status: "APPROVED",
            effectiveDate: earliestEffectiveDate,
            currency: String(
              (rows[0]?.normalizedData as Prisma.JsonObject | undefined)?.currency ?? "GBP",
            ),
            sourceType:
              lockedImport.fileType === SupplierPriceImportFileType.CSV
                ? SupplierPriceSourceType.CSV_IMPORT
                : SupplierPriceSourceType.XLSX_IMPORT,
            sourceImportId: lockedImport.id,
            revisionReason: `Created from import ${lockedImport.sourceFilename}`,
            createdById: userId,
            approvedById: userId,
            approvedAt: new Date(),
          },
        });

        for (const row of rows) {
          const normalizedData = row.normalizedData as Prisma.JsonObject;
          let supplierProductId = row.supplierProductId;
          if (!supplierProductId) {
            const productId = typeof row.matchedProductId === "string" ? row.matchedProductId : null;
            if (!productId) {
              throw new BadRequestException(`Import row ${row.rowNumber} could not resolve a product.`);
            }
            const product = await tx.product.findFirst({
              where: { id: productId, tenantId },
              select: { id: true },
            });
            if (!product) {
              throw new BadRequestException(
                `Import row ${row.rowNumber} references a product outside this tenant.`,
              );
            }
            if (row.matchedVariantId) {
              const variant = await tx.productVariant.findFirst({
                where: { id: row.matchedVariantId, tenantId, productId },
                select: { id: true },
              });
              if (!variant) {
                throw new BadRequestException(
                  `Import row ${row.rowNumber} references an invalid product variant.`,
                );
              }
            }
            const supplierUnitId = await this.resolveSupplierUnitId(
              tx,
              tenantId,
              String(normalizedData.unit ?? ""),
            );
            const supplierProduct = await tx.supplierProduct.create({
              data: {
                tenantId,
                supplierId,
                productId,
                variantId: row.matchedVariantId,
                supplierUnitId,
                supplierSku:
                  String(normalizedData.supplierSku ?? normalizedData.productSku ?? `IMPORT-${row.rowNumber}`),
                supplierDescription:
                  typeof normalizedData.productName === "string"
                    ? normalizedData.productName
                    : null,
                createdById: userId,
                updatedById: userId,
              },
            });
            supplierProductId = supplierProduct.id;
          } else {
            const supplierProduct = await tx.supplierProduct.findFirst({
              where: { id: supplierProductId, tenantId, supplierId },
              select: { id: true },
            });
            if (!supplierProduct) {
              throw new BadRequestException(
                `Import row ${row.rowNumber} references an invalid supplier product.`,
              );
            }
          }

          const price = await tx.supplierProductPrice.create({
            data: {
              tenantId,
              supplierId,
              supplierProductId,
              priceListVersionId: version.id,
              priceBasis: normalizedData.priceBasis as SupplierPriceBasis,
              currency: String(normalizedData.currency),
              baseCost: String(normalizedData.baseCost),
              packCost: nullableString(normalizedData.packCost),
              rollCost: nullableString(normalizedData.rollCost),
              areaCost: nullableString(normalizedData.areaCost),
              quantityFrom: nullableString(normalizedData.quantityFrom),
              quantityTo: nullableString(normalizedData.quantityTo),
              minimumOrderQty: nullableString(normalizedData.minimumOrderQty),
              promotionalCost: nullableString(normalizedData.promotionalCost),
              promotionStart: normalizedData.promotionStart ? new Date(String(normalizedData.promotionStart)) : null,
              promotionEnd: normalizedData.promotionEnd ? new Date(String(normalizedData.promotionEnd)) : null,
              effectiveDate: new Date(String(normalizedData.effectiveDate)),
              expiryDate: normalizedData.expiryDate ? new Date(String(normalizedData.expiryDate)) : null,
              taxTreatmentCode: nullableString(normalizedData.taxTreatmentCode),
              createdById: userId,
              updatedById: userId,
            },
          });

          await tx.supplierProductPriceHistory.create({
            data: {
              tenantId,
              supplierId,
              supplierProductId,
              supplierProductPriceId: price.id,
              priceListVersionId: version.id,
              currency: price.currency,
              priceBasis: price.priceBasis,
              newBaseCost: price.baseCost,
              newPromotionalCost: price.promotionalCost,
              effectiveDate: price.effectiveDate,
              approvalStatus: "APPROVED",
              changeReason: `Imported from ${lockedImport.sourceFilename}`,
              sourceType:
                lockedImport.fileType === SupplierPriceImportFileType.CSV
                  ? SupplierPriceSourceType.CSV_IMPORT
                  : SupplierPriceSourceType.XLSX_IMPORT,
              sourceLabel: lockedImport.sourceFilename,
              actorUserId: userId,
            },
          });

          await tx.supplierPriceImportRow.update({
            where: {
              importId_rowNumber: {
                importId,
                rowNumber: row.rowNumber,
              },
            },
            data: {
              supplierProductId,
              status: "IMPORTED",
              normalizedData: {
                ...(normalizedData as Prisma.JsonObject),
                executionStatus: "IMPORTED",
                createdPriceId: price.id,
              } as Prisma.InputJsonValue,
            },
          });
        }

        await tx.supplierPriceImport.update({
          where: { id: importId },
          data: {
            priceListId,
            status: "EXECUTED",
            executedAt: new Date(),
            executedById: userId,
            importedRowCount: rows.length,
            validationSummary: {
              ...((lockedImport.validationSummary as Prisma.JsonObject | null) ?? {}),
              phase: "COMPLETED",
              createdVersionId: version.id,
            } as Prisma.InputJsonValue,
          },
        });

        return this.ensurePriceImportTx(tx, tenantId, supplierId, importId);
      });

      return result;
    } catch (error) {
      await this.prisma.client.supplierPriceImport.update({
        where: { id: importId },
        data: {
          status: "FAILED",
          errorSummary: {
            code:
              error instanceof BadRequestException
                ? "IMPORT_EXECUTION_INVALID"
                : "IMPORT_EXECUTION_FAILED",
            message: error instanceof Error ? error.message : "Import execution failed.",
          } as Prisma.InputJsonValue,
        },
      });
      throw error;
    }
  }

  async cancelPriceImport(
    tenantId: string,
    supplierId: string,
    importId: string,
  ) {
    const importRecord = await this.ensurePriceImport(tenantId, supplierId, importId);
    assertImportLifecycleTransition(importRecord.status, "REJECTED");
    return this.prisma.client.supplierPriceImport.update({
      where: { id: importId },
      data: {
        status: "REJECTED",
        validationSummary: {
          ...((importRecord.validationSummary as Prisma.JsonObject | null) ?? {}),
          phase: "CANCELLED",
        } as Prisma.InputJsonValue,
      },
    });
  }

  async listPriceImportMappings(tenantId: string, supplierId: string) {
    await this.ensureSupplier(tenantId, supplierId);
    return this.prisma.client.supplierPriceImportMapping.findMany({
      where: { tenantId, supplierId },
      orderBy: [{ updatedAt: "desc" }],
    });
  }

  async createPriceImportMapping(
    tenantId: string,
    supplierId: string,
    userId: string,
    name: string,
    fileType: SupplierPriceImportFileType,
    mapping: ImportMappingSnapshot,
  ) {
    await this.ensureSupplier(tenantId, supplierId);
    return this.prisma.client.supplierPriceImportMapping.create({
      data: {
        tenantId,
        supplierId,
        name: name.trim(),
        fileType,
        mappingJson: mapping as Prisma.InputJsonValue,
        createdById: userId,
        updatedById: userId,
      },
    });
  }

  async updatePriceImportMappingRecord(
    tenantId: string,
    supplierId: string,
    mappingId: string,
    userId: string,
    name: string | null | undefined,
    mapping: ImportMappingSnapshot,
  ) {
    await this.ensurePriceImportMapping(tenantId, supplierId, mappingId);
    return this.prisma.client.supplierPriceImportMapping.update({
      where: { id: mappingId },
      data: {
        ...(name !== undefined ? { name: name?.trim() || "Saved mapping" } : {}),
        mappingJson: mapping as Prisma.InputJsonValue,
        updatedById: userId,
      },
    });
  }

  async auditAction(
    tenantId: string,
    userId: string,
    action: string,
    entityType: string,
    entityId: string | null,
    payload: unknown,
    previousValues?: unknown,
  ) {
    await this.audit.record({
      tenantId,
      actorUserId: userId,
      action,
      entityType,
      entityId,
      previousValues: previousValues as Prisma.InputJsonValue | undefined,
      newValues: payload as Prisma.InputJsonValue,
    });
  }

  private async ensurePricingContext(
    tenantId: string,
    supplierId: string,
    supplierProductId: string,
    input: SupplierProductPriceInput,
  ) {
    const supplierProduct = await this.prisma.client.supplierProduct.findFirstOrThrow({
      where: { id: supplierProductId, tenantId, supplierId },
      include: {
        product: {
          select: {
            id: true,
            category: { select: { slug: true } },
          },
        },
        supplierUnit: { select: { code: true } },
      },
    });
    const version = await this.ensureVersionById(tenantId, supplierId, input.priceListVersionId);
    const priceList = await this.prisma.client.supplierPriceList.findFirstOrThrow({
      where: { id: version.priceListId, tenantId, supplierId },
      select: { id: true, name: true, currency: true },
    });

    const pricingUnitId = input.pricingUnitId
      ? await this.prisma.client.unitOfMeasure
          .findFirstOrThrow({
            where: { id: input.pricingUnitId, tenantId },
            select: { id: true, code: true, status: true },
          })
          .then((record) => {
            if (record.status === "ARCHIVED") {
              throw new BadRequestException("Archived units cannot be used for pricing.");
            }
            return record.id;
          })
      : null;

    assertPriceListDates({
      effectiveDate: input.effectiveDate,
      expiryDate: input.expiryDate,
    });
    assertPromotionDates(input);
    assertQuantityBreak(input);
    assertPriceBasisCompatibility({
      priceBasis: input.priceBasis,
      supplierUnitCode: supplierProduct.supplierUnit?.code,
      productCategorySlug: supplierProduct.product.category.slug,
      packQuantity: supplierProduct.packQuantity,
      packCoverageM2: supplierProduct.packCoverageM2,
      rollWidthM: supplierProduct.rollWidthM,
      standardRollLengthM: supplierProduct.standardRollLengthM,
    });

    if (normalizeCurrencyCode(input.currency) !== priceList.currency) {
      throw new BadRequestException(
        "Price currency must match the owning price-list currency.",
      );
    }

    return {
      supplierProduct,
      version,
      priceList,
      pricingUnitId,
    };
  }

  private ensureSupplier(tenantId: string, supplierId: string) {
    return this.prisma.client.supplier.findFirstOrThrow({
      where: { id: supplierId, tenantId },
      select: { id: true, status: true },
    });
  }

  private async ensureSupplierIsActive(tenantId: string, supplierId: string) {
    const supplier = await this.ensureSupplier(tenantId, supplierId);
    if (supplier.status === "ARCHIVED") {
      throw new BadRequestException("Archived suppliers cannot be modified.");
    }

    return supplier;
  }

  private ensureSupplierProduct(
    tenantId: string,
    supplierId: string,
    supplierProductId: string,
  ) {
    return this.prisma.client.supplierProduct.findFirstOrThrow({
      where: { id: supplierProductId, tenantId, supplierId },
      select: { id: true },
    });
  }

  private ensureVersionById(
    tenantId: string,
    supplierId: string,
    versionId: string,
  ) {
    return this.prisma.client.supplierPriceListVersion.findFirstOrThrow({
      where: { id: versionId, tenantId, supplierId },
      include: {
        prices: { select: { id: true } },
      },
    });
  }

  private ensurePriceListVersion(
    tenantId: string,
    supplierId: string,
    priceListId: string,
    versionId: string,
  ) {
    return this.prisma.client.supplierPriceListVersion.findFirstOrThrow({
      where: {
        id: versionId,
        tenantId,
        supplierId,
        priceListId,
      },
      include: {
        prices: {
          orderBy: [{ effectiveDate: "desc" }, { createdAt: "desc" }],
          include: {
            pricingUnit: {
              select: { id: true, code: true, name: true, symbol: true },
            },
          },
        },
      },
    });
  }

  private ensurePriceList(
    tenantId: string,
    supplierId: string,
    priceListId: string,
  ) {
    return this.prisma.client.supplierPriceList.findFirstOrThrow({
      where: { id: priceListId, tenantId, supplierId },
      include: {
        versions: {
          orderBy: [{ versionNumber: "desc" }],
          include: { _count: { select: { prices: true } } },
        },
        imports: {
          orderBy: [{ createdAt: "desc" }],
        },
      },
    });
  }

  private ensurePriceListTx(
    tx: Prisma.TransactionClient,
    tenantId: string,
    supplierId: string,
    priceListId: string,
  ) {
    return tx.supplierPriceList.findFirstOrThrow({
      where: { id: priceListId, tenantId, supplierId },
      include: {
        versions: {
          orderBy: [{ versionNumber: "desc" }],
          include: { _count: { select: { prices: true } } },
        },
        imports: {
          orderBy: [{ createdAt: "desc" }],
        },
      },
    });
  }

  private ensureSupplierProductPrice(
    tenantId: string,
    supplierId: string,
    supplierProductId: string,
    priceId: string,
  ) {
    return this.prisma.client.supplierProductPrice.findFirstOrThrow({
      where: {
        id: priceId,
        tenantId,
        supplierId,
        supplierProductId,
      },
      include: {
        priceListVersion: {
          include: {
            priceList: {
              select: { name: true },
            },
          },
        },
      },
    });
  }

  private ensurePriceImport(
    tenantId: string,
    supplierId: string,
    importId: string,
  ) {
    return this.prisma.client.supplierPriceImport.findFirstOrThrow({
      where: { id: importId, tenantId, supplierId },
      include: {
        rows: {
          orderBy: [{ rowNumber: "asc" }],
        },
      },
    });
  }

  private ensurePriceImportTx(
    tx: Prisma.TransactionClient,
    tenantId: string,
    supplierId: string,
    importId: string,
  ) {
    return tx.supplierPriceImport.findFirstOrThrow({
      where: { id: importId, tenantId, supplierId },
      include: {
        rows: {
          orderBy: [{ rowNumber: "asc" }],
        },
      },
    });
  }

  private ensurePriceImportMapping(
    tenantId: string,
    supplierId: string,
    mappingId: string,
  ) {
    return this.prisma.client.supplierPriceImportMapping.findFirstOrThrow({
      where: { id: mappingId, tenantId, supplierId },
    });
  }

  private ensurePriceListById(
    tenantId: string,
    supplierId: string,
    priceListId: string,
  ) {
    return this.prisma.client.supplierPriceList.findFirstOrThrow({
      where: { id: priceListId, tenantId, supplierId },
      select: { id: true },
    });
  }

  private async getImportContext(tenantId: string, supplierId: string) {
    const [supplierProducts, products, variants] = await Promise.all([
      this.prisma.client.supplierProduct.findMany({
        where: { tenantId, supplierId },
        select: {
          id: true,
          supplierSku: true,
          productId: true,
          variantId: true,
        },
      }),
      this.prisma.client.product.findMany({
        where: { tenantId },
        select: {
          id: true,
          sku: true,
        },
      }),
      this.prisma.client.productVariant.findMany({
        where: { tenantId },
        select: {
          id: true,
          sku: true,
          productId: true,
        },
      }),
    ]);

    return { supplierProducts, products, variants };
  }

  private async resolveSupplierUnitId(
    tx: Prisma.TransactionClient,
    tenantId: string,
    unitCode: string,
  ) {
    if (!unitCode.trim()) {
      return null;
    }

    return tx.unitOfMeasure
      .findFirst({
        where: { tenantId, code: unitCode.trim().toUpperCase() },
        select: { id: true },
      })
      .then((record) => record?.id ?? null);
  }
}

function nullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

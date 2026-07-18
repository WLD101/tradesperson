import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Module,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  SupplierPriceImportFileType,
  SupplierPriceImportRowStatus,
  SupplierPriceBasis,
  SupplierPriceListStatus,
  SupplierPriceSourceType,
} from "@prisma/client";
import { z } from "zod";
import { IMPORT_FILE_SIZE_LIMIT_BYTES } from "../services/supplier-price-imports";
import { SupplierPricingService } from "../services/supplier-pricing.service";
import { AuthGuard } from "../shared/auth.guard";
import { RequirePermissions } from "../shared/permissions.decorator";
import { PermissionsGuard } from "../shared/permissions.guard";
import { CurrentSession } from "../shared/session.decorator";
import { TenantAccessService } from "../services/tenant-access.service";

const emptyStringToNull = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? null : value;

const decimalField = z.coerce.number().nonnegative().nullable().optional();
const positiveDecimalField = z.coerce.number().positive();

const priceListSchema = z.object({
  name: z.string().min(2).max(120),
  reference: z.preprocess(emptyStringToNull, z.string().max(80).nullable()).optional(),
  currency: z.string().min(3).max(3),
  effectiveDate: z.coerce.date(),
  expiryDate: z.coerce.date().nullable().optional(),
  notes: z.preprocess(emptyStringToNull, z.string().max(1000).nullable()).optional(),
  sourceType: z.nativeEnum(SupplierPriceSourceType).optional(),
  sourceFilename: z.preprocess(emptyStringToNull, z.string().max(255).nullable()).optional(),
});

const versionSchema = z.object({
  effectiveDate: z.coerce.date().optional(),
  expiryDate: z.coerce.date().nullable().optional(),
  revisionReason: z.preprocess(emptyStringToNull, z.string().max(500).nullable()).optional(),
  sourceType: z.nativeEnum(SupplierPriceSourceType).optional(),
  sourceImportId: z.preprocess(emptyStringToNull, z.string().uuid().nullable()).optional(),
});

const priceSchema = z.object({
  priceListVersionId: z.string().uuid(),
  pricingUnitId: z.preprocess(emptyStringToNull, z.string().uuid().nullable()).optional(),
  priceBasis: z.nativeEnum(SupplierPriceBasis),
  currency: z.string().min(3).max(3),
  baseCost: positiveDecimalField,
  packCost: decimalField,
  rollCost: decimalField,
  areaCost: decimalField,
  quantityFrom: decimalField,
  quantityTo: decimalField,
  minimumOrderQty: decimalField,
  deliveryCostPlaceholder: decimalField,
  promotionalCost: decimalField,
  promotionStart: z.coerce.date().nullable().optional(),
  promotionEnd: z.coerce.date().nullable().optional(),
  effectiveDate: z.coerce.date(),
  expiryDate: z.coerce.date().nullable().optional(),
  taxTreatmentCode: z.preprocess(emptyStringToNull, z.string().max(40).nullable()).optional(),
  isActive: z.boolean().optional(),
  changeReason: z.preprocess(emptyStringToNull, z.string().max(500).nullable()).optional(),
  sourceType: z.nativeEnum(SupplierPriceSourceType).optional(),
});

const currentPriceQuerySchema = z.object({
  quantity: z.coerce.number().positive().optional(),
});
const priceImportCreateSchema = z.object({
  priceListId: z.preprocess(emptyStringToNull, z.string().uuid().nullable()).optional(),
  worksheetName: z.preprocess(emptyStringToNull, z.string().max(120).nullable()).optional(),
  headerRowNumber: z.coerce.number().int().min(1).nullable().optional(),
});
const priceImportRowsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().min(1).max(120).optional(),
  status: z.nativeEnum(SupplierPriceImportRowStatus).optional(),
  matchStatus: z
    .enum([
      "MATCHED",
      "UNMATCHED",
      "MANUAL",
      "SUPPLIER_PRODUCT_ID",
      "SUPPLIER_SKU",
      "PRODUCT_SKU",
      "VARIANT_SKU",
    ])
    .optional(),
  executionStatus: z.enum(["PENDING", "IMPORTED"]).optional(),
  duplicateOnly: z.coerce.boolean().optional(),
  hasWarnings: z.coerce.boolean().optional(),
  sort: z.enum(["rowNumberAsc", "rowNumberDesc"]).optional(),
});
const priceImportMappingSchema = z.object({
  name: z.preprocess(emptyStringToNull, z.string().max(120).nullable()).optional(),
  mapping: z.object({
    headers: z.array(z.string()),
    columns: z.record(z.string(), z.string().nullable()),
    rowOverrides: z.record(
      z.string(),
      z.object({
        supplierProductId: z.preprocess(emptyStringToNull, z.string().uuid().nullable()).optional(),
        productId: z.preprocess(emptyStringToNull, z.string().uuid().nullable()).optional(),
        variantId: z.preprocess(emptyStringToNull, z.string().uuid().nullable()).optional(),
      }),
    ).optional(),
  }),
});
const manualPriceImportRowMatchSchema = z.object({
  supplierProductId: z.preprocess(emptyStringToNull, z.string().uuid().nullable()).optional(),
  productId: z.preprocess(emptyStringToNull, z.string().uuid().nullable()).optional(),
  variantId: z.preprocess(emptyStringToNull, z.string().uuid().nullable()).optional(),
});
const savedMappingSchema = z.object({
  name: z.string().min(2).max(120),
  fileType: z.nativeEnum(SupplierPriceImportFileType),
  mapping: priceImportMappingSchema.shape.mapping,
});

type TenantSession = Parameters<TenantAccessService["ensureTenant"]>[0];
type UpdatePriceListInput = Partial<
  Omit<ReturnType<typeof priceListSchema.parse>, "name" | "currency" | "effectiveDate">
> & {
  name?: string | undefined;
  currency?: string | undefined;
  effectiveDate?: Date | undefined;
};
type UpdatePriceInput = Partial<
  Omit<ReturnType<typeof priceSchema.parse>, "priceListVersionId" | "priceBasis" | "currency" | "baseCost" | "effectiveDate">
> & {
  priceListVersionId?: string | undefined;
  priceBasis?: SupplierPriceBasis | undefined;
  currency?: string | undefined;
  baseCost?: number | undefined;
  effectiveDate?: Date | undefined;
};
const stripUndefined = <T extends Record<string, unknown>>(value: T) =>
  Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as Partial<T>;
const normalizeImportMappingPayload = (
  input: z.infer<typeof priceImportMappingSchema>,
) => ({
  ...(input.name !== undefined ? { name: input.name } : {}),
  mapping: {
    headers: input.mapping.headers,
    columns: input.mapping.columns,
    ...(input.mapping.rowOverrides
      ? {
          rowOverrides: Object.fromEntries(
            Object.entries(input.mapping.rowOverrides).map(([rowNumber, override]) => [
              rowNumber,
              Object.fromEntries(
                Object.entries(override).filter(([, value]) => value !== undefined),
              ),
            ]),
          ),
        }
      : {}),
  },
});

@Controller({ path: "suppliers", version: "1" })
class SupplierPricingController {
  constructor(
    private readonly tenantAccess: TenantAccessService,
    private readonly pricing: SupplierPricingService,
  ) {}

  @Get(":supplierId/price-lists")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("supplier_pricing.view")
  listPriceLists(
    @Param("supplierId") supplierId: string,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    return this.pricing.listPriceLists(tenantId, supplierId);
  }

  @Post(":supplierId/price-lists")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("supplier_pricing.manage")
  async createPriceList(
    @Param("supplierId") supplierId: string,
    @Body() body: unknown,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const input = priceListSchema.parse(body);
    const record = await this.pricing.createPriceList(
      tenantId,
      supplierId,
      session.user.id,
      input,
    );
    await this.pricing.auditAction(
      tenantId,
      session.user.id,
      "supplier.pricing.price-list.create",
      "supplierPriceList",
      record.id,
      input,
    );
    return record;
  }

  @Get(":supplierId/price-lists/:priceListId")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("supplier_pricing.view")
  getPriceList(
    @Param("supplierId") supplierId: string,
    @Param("priceListId") priceListId: string,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    return this.pricing.getPriceList(tenantId, supplierId, priceListId);
  }

  @Patch(":supplierId/price-lists/:priceListId")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("supplier_pricing.manage")
  async updatePriceList(
    @Param("supplierId") supplierId: string,
    @Param("priceListId") priceListId: string,
    @Body() body: unknown,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const previous = await this.pricing.getPriceList(tenantId, supplierId, priceListId);
    const input = stripUndefined(
      priceListSchema.partial().parse(body) as UpdatePriceListInput,
    ) as Partial<{
      name: string;
      reference: string | null;
      currency: string;
      effectiveDate: Date;
      expiryDate: Date | null;
      notes: string | null;
      sourceType: SupplierPriceSourceType;
      sourceFilename: string | null;
    }>;
    const record = await this.pricing.updatePriceList(
      tenantId,
      supplierId,
      session.user.id,
      priceListId,
      input,
    );
    await this.pricing.auditAction(
      tenantId,
      session.user.id,
      "supplier.pricing.price-list.update",
      "supplierPriceList",
      record.id,
      input,
      previous,
    );
    return record;
  }

  @Post(":supplierId/price-lists/:priceListId/validate")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("supplier_pricing.manage")
  async validatePriceList(
    @Param("supplierId") supplierId: string,
    @Param("priceListId") priceListId: string,
    @CurrentSession() session: TenantSession,
  ) {
    return this.transitionPriceList(
      supplierId,
      priceListId,
      session,
      SupplierPriceListStatus.VALIDATED,
      "supplier.pricing.price-list.validate",
    );
  }

  @Post(":supplierId/price-lists/:priceListId/approve")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("supplier_pricing.approve")
  async approvePriceList(
    @Param("supplierId") supplierId: string,
    @Param("priceListId") priceListId: string,
    @CurrentSession() session: TenantSession,
  ) {
    return this.transitionPriceList(
      supplierId,
      priceListId,
      session,
      SupplierPriceListStatus.APPROVED,
      "supplier.pricing.price-list.approve",
    );
  }

  @Post(":supplierId/price-lists/:priceListId/activate")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("supplier_pricing.approve")
  async activatePriceList(
    @Param("supplierId") supplierId: string,
    @Param("priceListId") priceListId: string,
    @CurrentSession() session: TenantSession,
  ) {
    return this.transitionPriceList(
      supplierId,
      priceListId,
      session,
      SupplierPriceListStatus.ACTIVE,
      "supplier.pricing.price-list.activate",
    );
  }

  @Post(":supplierId/price-lists/:priceListId/supersede")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("supplier_pricing.archive")
  async supersedePriceList(
    @Param("supplierId") supplierId: string,
    @Param("priceListId") priceListId: string,
    @CurrentSession() session: TenantSession,
  ) {
    return this.transitionPriceList(
      supplierId,
      priceListId,
      session,
      SupplierPriceListStatus.SUPERSEDED,
      "supplier.pricing.price-list.supersede",
    );
  }

  @Post(":supplierId/price-lists/:priceListId/archive")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("supplier_pricing.archive")
  async archivePriceList(
    @Param("supplierId") supplierId: string,
    @Param("priceListId") priceListId: string,
    @CurrentSession() session: TenantSession,
  ) {
    return this.transitionPriceList(
      supplierId,
      priceListId,
      session,
      SupplierPriceListStatus.ARCHIVED,
      "supplier.pricing.price-list.archive",
    );
  }

  @Get(":supplierId/price-lists/:priceListId/versions")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("supplier_pricing.view")
  listVersions(
    @Param("supplierId") supplierId: string,
    @Param("priceListId") priceListId: string,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    return this.pricing.listVersions(tenantId, supplierId, priceListId);
  }

  @Post(":supplierId/price-lists/:priceListId/versions")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("supplier_pricing.manage")
  async createVersion(
    @Param("supplierId") supplierId: string,
    @Param("priceListId") priceListId: string,
    @Body() body: unknown,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const input = versionSchema.parse(body);
    const record = await this.pricing.createVersion(
      tenantId,
      supplierId,
      session.user.id,
      priceListId,
      input,
    );
    await this.pricing.auditAction(
      tenantId,
      session.user.id,
      "supplier.pricing.version.create",
      "supplierPriceListVersion",
      record.id,
      input,
    );
    return record;
  }

  @Get(":supplierId/price-lists/:priceListId/versions/:versionId")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("supplier_pricing.view")
  getVersion(
    @Param("supplierId") supplierId: string,
    @Param("priceListId") priceListId: string,
    @Param("versionId") versionId: string,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    return this.pricing.getVersion(tenantId, supplierId, priceListId, versionId);
  }

  @Get(":supplierId/products/:supplierProductId/prices")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("supplier_pricing.view")
  listSupplierProductPrices(
    @Param("supplierId") supplierId: string,
    @Param("supplierProductId") supplierProductId: string,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    return this.pricing.listSupplierProductPrices(
      tenantId,
      supplierId,
      supplierProductId,
    );
  }

  @Post(":supplierId/products/:supplierProductId/prices")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("supplier_pricing.manage")
  async createSupplierProductPrice(
    @Param("supplierId") supplierId: string,
    @Param("supplierProductId") supplierProductId: string,
    @Body() body: unknown,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const input = priceSchema.parse(body);
    const record = await this.pricing.createSupplierProductPrice(
      tenantId,
      supplierId,
      supplierProductId,
      session.user.id,
      input,
    );
    await this.pricing.auditAction(
      tenantId,
      session.user.id,
      "supplier.pricing.price.create",
      "supplierProductPrice",
      record.id,
      input,
    );
    return record;
  }

  @Patch(":supplierId/products/:supplierProductId/prices/:priceId")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("supplier_pricing.manage")
  async updateSupplierProductPrice(
    @Param("supplierId") supplierId: string,
    @Param("supplierProductId") supplierProductId: string,
    @Param("priceId") priceId: string,
    @Body() body: unknown,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const previous = await this.pricing.listSupplierProductPrices(
      tenantId,
      supplierId,
      supplierProductId,
    ).then((items) => items.find((item) => item.id === priceId) ?? null);
    const input = stripUndefined(
      priceSchema.partial().parse(body) as UpdatePriceInput,
    ) as Partial<{
      priceListVersionId: string;
      pricingUnitId: string | null;
      priceBasis: SupplierPriceBasis;
      currency: string;
      baseCost: number;
      packCost: number | null;
      rollCost: number | null;
      areaCost: number | null;
      quantityFrom: number | null;
      quantityTo: number | null;
      minimumOrderQty: number | null;
      deliveryCostPlaceholder: number | null;
      promotionalCost: number | null;
      promotionStart: Date | null;
      promotionEnd: Date | null;
      effectiveDate: Date;
      expiryDate: Date | null;
      taxTreatmentCode: string | null;
      isActive: boolean;
      changeReason: string | null;
      sourceType: SupplierPriceSourceType;
    }>;
    const record = await this.pricing.updateSupplierProductPrice(
      tenantId,
      supplierId,
      supplierProductId,
      priceId,
      session.user.id,
      input,
    );
    await this.pricing.auditAction(
      tenantId,
      session.user.id,
      "supplier.pricing.price.update",
      "supplierProductPrice",
      record.id,
      input,
      previous,
    );
    return record;
  }

  @Get(":supplierId/products/:supplierProductId/price-history")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("supplier_pricing.history.view")
  listSupplierProductPriceHistory(
    @Param("supplierId") supplierId: string,
    @Param("supplierProductId") supplierProductId: string,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    return this.pricing.listSupplierProductPriceHistory(
      tenantId,
      supplierId,
      supplierProductId,
    );
  }

  @Post(":supplierId/price-imports")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("supplier_pricing.import")
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: IMPORT_FILE_SIZE_LIMIT_BYTES } }),
  )
  async createPriceImport(
    @Param("supplierId") supplierId: string,
    @UploadedFile() file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
    @Body() body: Record<string, unknown>,
    @CurrentSession() session: TenantSession,
  ) {
    if (!file) {
      throw new BadRequestException("A CSV or XLSX file is required.");
    }
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const input = priceImportCreateSchema.parse(body);
    const record = await this.pricing.createPriceImport(
      tenantId,
      supplierId,
      session.user.id,
      file,
      input,
    );
    await this.pricing.auditAction(
      tenantId,
      session.user.id,
      "supplier.pricing.import.create",
      "supplierPriceImport",
      record.id,
      {
        filename: file.originalname,
        fileType: record.fileType,
        size: file.size,
      },
    );
    return record;
  }

  @Get(":supplierId/price-imports")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("supplier_pricing.import")
  listPriceImports(
    @Param("supplierId") supplierId: string,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    return this.pricing.listPriceImports(tenantId, supplierId);
  }

  @Get(":supplierId/price-imports/:importId")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("supplier_pricing.import")
  getPriceImport(
    @Param("supplierId") supplierId: string,
    @Param("importId") importId: string,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    return this.pricing.getPriceImport(tenantId, supplierId, importId);
  }

  @Get(":supplierId/price-imports/:importId/rows")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("supplier_pricing.import")
  listPriceImportRows(
    @Param("supplierId") supplierId: string,
    @Param("importId") importId: string,
    @Query() query: Record<string, string | string[] | undefined>,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const parsed = priceImportRowsQuerySchema.parse(query);
    return this.pricing.listPriceImportRows(
      tenantId,
      supplierId,
      importId,
      parsed,
    );
  }

  @Patch(":supplierId/price-imports/:importId/mapping")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("supplier_pricing.import")
  async updatePriceImportMapping(
    @Param("supplierId") supplierId: string,
    @Param("importId") importId: string,
    @Body() body: unknown,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const input = normalizeImportMappingPayload(priceImportMappingSchema.parse(body));
    const previous = await this.pricing.getPriceImport(tenantId, supplierId, importId);
    const record = await this.pricing.updatePriceImportMapping(
      tenantId,
      supplierId,
      importId,
      session.user.id,
      input,
    );
    await this.pricing.auditAction(
      tenantId,
      session.user.id,
      "supplier.pricing.import.mapping.update",
      "supplierPriceImport",
      record.id,
      input,
      previous,
    );
    return record;
  }

  @Patch(":supplierId/price-imports/:importId/rows/:rowId/match")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("supplier_pricing.import")
  async matchPriceImportRow(
    @Param("supplierId") supplierId: string,
    @Param("importId") importId: string,
    @Param("rowId") rowId: string,
    @Body() body: unknown,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const input = manualPriceImportRowMatchSchema.parse(body);
    const record = await this.pricing.manuallyMatchPriceImportRow(
      tenantId,
      supplierId,
      importId,
      rowId,
      input,
    );
    await this.pricing.auditAction(
      tenantId,
      session.user.id,
      "supplier.pricing.import.row.match",
      "supplierPriceImportRow",
      record.id,
      input,
    );
    return record;
  }

  @Post(":supplierId/price-imports/:importId/validate")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("supplier_pricing.import")
  async validatePriceImport(
    @Param("supplierId") supplierId: string,
    @Param("importId") importId: string,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const previous = await this.pricing.getPriceImport(tenantId, supplierId, importId);
    const record = await this.pricing.validatePriceImport(tenantId, supplierId, importId);
    await this.pricing.auditAction(
      tenantId,
      session.user.id,
      "supplier.pricing.import.validate",
      "supplierPriceImport",
      record.id,
      { status: "VALIDATED" },
      previous,
    );
    return record;
  }

  @Post(":supplierId/price-imports/:importId/approve")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("supplier_pricing.approve")
  async approvePriceImport(
    @Param("supplierId") supplierId: string,
    @Param("importId") importId: string,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const previous = await this.pricing.getPriceImport(tenantId, supplierId, importId);
    const record = await this.pricing.approvePriceImport(
      tenantId,
      supplierId,
      importId,
      session.user.id,
    );
    await this.pricing.auditAction(
      tenantId,
      session.user.id,
      "supplier.pricing.import.approve",
      "supplierPriceImport",
      record.id,
      { status: "APPROVED" },
      previous,
    );
    return record;
  }

  @Post(":supplierId/price-imports/:importId/execute")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("supplier_pricing.approve")
  async executePriceImport(
    @Param("supplierId") supplierId: string,
    @Param("importId") importId: string,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const previous = await this.pricing.getPriceImport(tenantId, supplierId, importId);
    const record = await this.pricing.executePriceImport(
      tenantId,
      supplierId,
      importId,
      session.user.id,
    );
    await this.pricing.auditAction(
      tenantId,
      session.user.id,
      "supplier.pricing.import.execute",
      "supplierPriceImport",
      record.id,
      { status: "EXECUTED" },
      previous,
    );
    return record;
  }

  @Post(":supplierId/price-imports/:importId/cancel")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("supplier_pricing.import")
  async cancelPriceImport(
    @Param("supplierId") supplierId: string,
    @Param("importId") importId: string,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const previous = await this.pricing.getPriceImport(tenantId, supplierId, importId);
    const record = await this.pricing.cancelPriceImport(tenantId, supplierId, importId);
    await this.pricing.auditAction(
      tenantId,
      session.user.id,
      "supplier.pricing.import.cancel",
      "supplierPriceImport",
      record.id,
      { status: "REJECTED" },
      previous,
    );
    return record;
  }

  @Get(":supplierId/price-import-mappings")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("supplier_pricing.import")
  listPriceImportMappings(
    @Param("supplierId") supplierId: string,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    return this.pricing.listPriceImportMappings(tenantId, supplierId);
  }

  @Post(":supplierId/price-import-mappings")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("supplier_pricing.import")
  async createPriceImportMapping(
    @Param("supplierId") supplierId: string,
    @Body() body: unknown,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const input = {
      ...savedMappingSchema.parse(body),
      mapping: normalizeImportMappingPayload({
        name: null,
        mapping: savedMappingSchema.parse(body).mapping,
      }).mapping,
    };
    const record = await this.pricing.createPriceImportMapping(
      tenantId,
      supplierId,
      session.user.id,
      input.name,
      input.fileType,
      input.mapping,
    );
    await this.pricing.auditAction(
      tenantId,
      session.user.id,
      "supplier.pricing.import-mapping.create",
      "supplierPriceImportMapping",
      record.id,
      input,
    );
    return record;
  }

  @Patch(":supplierId/price-import-mappings/:mappingId")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("supplier_pricing.import")
  async updateSavedPriceImportMapping(
    @Param("supplierId") supplierId: string,
    @Param("mappingId") mappingId: string,
    @Body() body: unknown,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const input = normalizeImportMappingPayload(priceImportMappingSchema.parse(body));
    const record = await this.pricing.updatePriceImportMappingRecord(
      tenantId,
      supplierId,
      mappingId,
      session.user.id,
      input.name,
      input.mapping,
    );
    await this.pricing.auditAction(
      tenantId,
      session.user.id,
      "supplier.pricing.import-mapping.update",
      "supplierPriceImportMapping",
      record.id,
      input,
    );
    return record;
  }

  private async transitionPriceList(
    supplierId: string,
    priceListId: string,
    session: TenantSession,
    nextStatus: SupplierPriceListStatus,
    action: string,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const previous = await this.pricing.getPriceList(tenantId, supplierId, priceListId);
    const record = await this.pricing.transitionPriceList(
      tenantId,
      supplierId,
      session.user.id,
      priceListId,
      nextStatus,
    );
    await this.pricing.auditAction(
      tenantId,
      session.user.id,
      action,
      "supplierPriceList",
      record.id,
      { status: nextStatus },
      previous,
    );
    return record;
  }
}

@Controller({ path: "catalogue/products", version: "1" })
class ProductSupplierPricingController {
  constructor(
    private readonly tenantAccess: TenantAccessService,
    private readonly pricing: SupplierPricingService,
  ) {}

  @Get(":productId/supplier-prices")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("catalogue.view", "supplier_pricing.view")
  listSupplierPrices(
    @Param("productId") productId: string,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    return this.pricing.listProductSupplierPrices(tenantId, productId);
  }

  @Get(":productId/current-supplier-prices")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("catalogue.view", "supplier_pricing.view")
  listCurrentSupplierPrices(
    @Param("productId") productId: string,
    @Query() query: Record<string, string | string[] | undefined>,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const parsed = currentPriceQuerySchema.parse(query);
    return this.pricing.listCurrentProductSupplierPrices(
      tenantId,
      productId,
      parsed.quantity,
    );
  }
}

@Module({
  controllers: [SupplierPricingController, ProductSupplierPricingController],
  providers: [SupplierPricingService],
})
export class SupplierPricingModule {}

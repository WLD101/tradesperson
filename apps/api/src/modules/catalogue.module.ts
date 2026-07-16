import {
  Body,
  Controller,
  Get,
  Module,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ProductAttributeValueType,
  ProductLifecycleStatus,
  ProductRecordStatus,
  UnitOfMeasureKind,
} from "@prisma/client";
import { z } from "zod";
import { AuthGuard } from "../shared/auth.guard";
import { RequirePermissions } from "../shared/permissions.decorator";
import { PermissionsGuard } from "../shared/permissions.guard";
import { CurrentSession } from "../shared/session.decorator";
import { CatalogueService } from "../services/catalogue.service";
import { TenantAccessService } from "../services/tenant-access.service";

const emptyStringToNull = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? null : value;

const lookupSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.preprocess(emptyStringToNull, z.string().nullable()).optional(),
  manufacturerId: z.string().uuid().nullable().optional(),
  brandId: z.string().uuid().nullable().optional(),
  code: z.string().min(1).optional(),
  symbol: z.preprocess(emptyStringToNull, z.string().nullable()).optional(),
  kind: z.nativeEnum(UnitOfMeasureKind).optional(),
});

const productSchema = z.object({
  categoryId: z.string().uuid(),
  manufacturerId: z.string().uuid().nullable().optional(),
  brandId: z.string().uuid().nullable().optional(),
  collectionId: z.string().uuid().nullable().optional(),
  primaryUnitId: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  sku: z.string().min(1),
  supplierSkuPlaceholder: z.preprocess(
    emptyStringToNull,
    z.string().nullable(),
  ).optional(),
  description: z.preprocess(emptyStringToNull, z.string().nullable()).optional(),
  material: z.preprocess(emptyStringToNull, z.string().nullable()).optional(),
  colour: z.preprocess(emptyStringToNull, z.string().nullable()).optional(),
  shade: z.preprocess(emptyStringToNull, z.string().nullable()).optional(),
  pattern: z.preprocess(emptyStringToNull, z.string().nullable()).optional(),
  batchTrackingRequired: z.boolean().optional(),
  fireRating: z.preprocess(emptyStringToNull, z.string().nullable()).optional(),
  slipRating: z.preprocess(emptyStringToNull, z.string().nullable()).optional(),
  acousticRating: z.preprocess(emptyStringToNull, z.string().nullable()).optional(),
  underfloorHeatingCompatible: z.boolean().nullable().optional(),
  domesticCommercialClass: z.preprocess(
    emptyStringToNull,
    z.string().nullable(),
  ).optional(),
  warranty: z.preprocess(emptyStringToNull, z.string().nullable()).optional(),
  recommendedAdhesive: z.preprocess(
    emptyStringToNull,
    z.string().nullable(),
  ).optional(),
  recommendedUnderlay: z.preprocess(
    emptyStringToNull,
    z.string().nullable(),
  ).optional(),
  technicalData: z.preprocess(emptyStringToNull, z.string().nullable()).optional(),
  safetyData: z.preprocess(emptyStringToNull, z.string().nullable()).optional(),
  lifecycleStatus: z.nativeEnum(ProductLifecycleStatus).optional(),
});

const decimalField = z.coerce.number().positive().nullable().optional();

const variantSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  unitOfMeasureId: z.string().uuid().nullable().optional(),
  colour: z.preprocess(emptyStringToNull, z.string().nullable()).optional(),
  shade: z.preprocess(emptyStringToNull, z.string().nullable()).optional(),
  pattern: z.preprocess(emptyStringToNull, z.string().nullable()).optional(),
  thicknessMm: decimalField,
  wearLayerMm: decimalField,
  rollWidthM: decimalField,
  standardRollLengthM: decimalField,
  tileLengthMm: decimalField,
  tileWidthMm: decimalField,
  packQuantity: z.coerce.number().int().positive().nullable().optional(),
  packCoverageM2: decimalField,
  isDefault: z.boolean().optional(),
  lifecycleStatus: z.nativeEnum(ProductLifecycleStatus).optional(),
});

const createProductSchema = z.object({
  product: productSchema,
  initialVariant: variantSchema,
});

const productListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  categoryId: z.string().uuid().optional(),
  manufacturerId: z.string().uuid().optional(),
  brandId: z.string().uuid().optional(),
  collectionId: z.string().uuid().optional(),
  unitId: z.string().uuid().optional(),
  lifecycleStatus: z.nativeEnum(ProductLifecycleStatus).optional(),
  includeArchived: z.coerce.boolean().default(false),
  sort: z
    .enum(["nameAsc", "nameDesc", "createdAtDesc", "updatedAtDesc"])
    .default("updatedAtDesc"),
});

const attributeDefinitionSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.preprocess(emptyStringToNull, z.string().nullable()).optional(),
  categoryId: z.string().uuid().nullable().optional(),
  valueType: z.nativeEnum(ProductAttributeValueType),
  isRequired: z.boolean().optional(),
  isFilterable: z.boolean().optional(),
});

type TenantSession = Parameters<TenantAccessService["ensureTenant"]>[0];

@Controller({ path: "catalogue/categories", version: "1" })
class CatalogueCategoriesController {
  constructor(
    private readonly tenantAccess: TenantAccessService,
    private readonly catalogue: CatalogueService,
  ) {}

  @Get()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("catalogue.view")
  list(@CurrentSession() session: TenantSession) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    return this.catalogue.listLookups(tenantId, "categories");
  }

  @Get(":id")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("catalogue.view")
  get(@Param("id") id: string, @CurrentSession() session: TenantSession) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    return this.catalogue.getLookup(tenantId, "categories", id);
  }

  @Post()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("catalogue.manage")
  async create(@Body() body: unknown, @CurrentSession() session: TenantSession) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const input = lookupSchema.parse(body);
    const record = await this.catalogue.createLookup(
      tenantId,
      session.user.id,
      "categories",
      input,
    );
    await this.catalogue.auditAction(
      tenantId,
      session.user.id,
      "catalogue.category.create",
      "productCategory",
      record.id,
      input,
    );
    return record;
  }

  @Patch(":id")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("catalogue.manage")
  async update(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const input = lookupSchema.partial().parse(body);
    const record = await this.catalogue.updateLookup(
      tenantId,
      session.user.id,
      "categories",
      id,
      input,
    );
    await this.catalogue.auditAction(
      tenantId,
      session.user.id,
      "catalogue.category.update",
      "productCategory",
      record.id,
      input,
    );
    return record;
  }

  @Patch(":id/archive")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("catalogue.archive")
  async archive(@Param("id") id: string, @CurrentSession() session: TenantSession) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const record = await this.catalogue.archiveLookup(
      tenantId,
      session.user.id,
      "categories",
      id,
      ProductRecordStatus.ARCHIVED,
    );
    await this.catalogue.auditAction(
      tenantId,
      session.user.id,
      "catalogue.category.archive",
      "productCategory",
      record.id,
      { status: ProductRecordStatus.ARCHIVED },
    );
    return record;
  }

  @Patch(":id/restore")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("catalogue.archive")
  async restore(@Param("id") id: string, @CurrentSession() session: TenantSession) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const record = await this.catalogue.archiveLookup(
      tenantId,
      session.user.id,
      "categories",
      id,
      ProductRecordStatus.ACTIVE,
    );
    await this.catalogue.auditAction(
      tenantId,
      session.user.id,
      "catalogue.category.restore",
      "productCategory",
      record.id,
      { status: ProductRecordStatus.ACTIVE },
    );
    return record;
  }
}

function buildLookupController(path: LookupKind) {
  @Controller({ path: `catalogue/${path}`, version: "1" })
  class LookupController {
    constructor(
      private readonly tenantAccess: TenantAccessService,
      private readonly catalogue: CatalogueService,
    ) {}

    @Get()
    @UseGuards(AuthGuard, PermissionsGuard)
    @RequirePermissions("catalogue.view")
    list(@CurrentSession() session: TenantSession) {
      const { tenantId } = this.tenantAccess.ensureTenant(session);
      return this.catalogue.listLookups(tenantId, path);
    }

    @Get(":id")
    @UseGuards(AuthGuard, PermissionsGuard)
    @RequirePermissions("catalogue.view")
    get(@Param("id") id: string, @CurrentSession() session: TenantSession) {
      const { tenantId } = this.tenantAccess.ensureTenant(session);
      return this.catalogue.getLookup(tenantId, path, id);
    }

    @Post()
    @UseGuards(AuthGuard, PermissionsGuard)
    @RequirePermissions("catalogue.manage")
    async create(@Body() body: unknown, @CurrentSession() session: TenantSession) {
      const { tenantId } = this.tenantAccess.ensureTenant(session);
      const input = lookupSchema.parse(body);
      const record = await this.catalogue.createLookup(
        tenantId,
        session.user.id,
        path,
        input,
      );
      await this.catalogue.auditAction(
        tenantId,
        session.user.id,
        `catalogue.${path.slice(0, -1)}.create`,
        path.slice(0, -1),
        (record as { id: string }).id,
        input,
      );
      return record;
    }

    @Patch(":id")
    @UseGuards(AuthGuard, PermissionsGuard)
    @RequirePermissions("catalogue.manage")
    async update(
      @Param("id") id: string,
      @Body() body: unknown,
      @CurrentSession() session: TenantSession,
    ) {
      const { tenantId } = this.tenantAccess.ensureTenant(session);
      const input = lookupSchema.partial().parse(body);
      const record = await this.catalogue.updateLookup(
        tenantId,
        session.user.id,
        path,
        id,
        input,
      );
      await this.catalogue.auditAction(
        tenantId,
        session.user.id,
        `catalogue.${path.slice(0, -1)}.update`,
        path.slice(0, -1),
        (record as { id: string }).id,
        input,
      );
      return record;
    }

    @Patch(":id/archive")
    @UseGuards(AuthGuard, PermissionsGuard)
    @RequirePermissions("catalogue.archive")
    async archive(@Param("id") id: string, @CurrentSession() session: TenantSession) {
      const { tenantId } = this.tenantAccess.ensureTenant(session);
      const record = await this.catalogue.archiveLookup(
        tenantId,
        session.user.id,
        path,
        id,
        ProductRecordStatus.ARCHIVED,
      );
      await this.catalogue.auditAction(
        tenantId,
        session.user.id,
        `catalogue.${path.slice(0, -1)}.archive`,
        path.slice(0, -1),
        (record as { id: string }).id,
        { status: ProductRecordStatus.ARCHIVED },
      );
      return record;
    }

    @Patch(":id/restore")
    @UseGuards(AuthGuard, PermissionsGuard)
    @RequirePermissions("catalogue.archive")
    async restore(@Param("id") id: string, @CurrentSession() session: TenantSession) {
      const { tenantId } = this.tenantAccess.ensureTenant(session);
      const record = await this.catalogue.archiveLookup(
        tenantId,
        session.user.id,
        path,
        id,
        ProductRecordStatus.ACTIVE,
      );
      await this.catalogue.auditAction(
        tenantId,
        session.user.id,
        `catalogue.${path.slice(0, -1)}.restore`,
        path.slice(0, -1),
        (record as { id: string }).id,
        { status: ProductRecordStatus.ACTIVE },
      );
      return record;
    }
  }

  return LookupController;
}

type LookupKind = "manufacturers" | "brands" | "collections" | "units";

const CatalogueManufacturersController = buildLookupController("manufacturers");
const CatalogueBrandsController = buildLookupController("brands");
const CatalogueCollectionsController = buildLookupController("collections");
const CatalogueUnitsController = buildLookupController("units");

@Controller({ path: "catalogue/products", version: "1" })
class CatalogueProductsController {
  constructor(
    private readonly tenantAccess: TenantAccessService,
    private readonly catalogue: CatalogueService,
  ) {}

  @Get()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("catalogue.view")
  list(
    @Query() query: Record<string, string | string[] | undefined>,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const parsed = productListQuerySchema.parse(query);
    return this.catalogue.listProducts(tenantId, parsed);
  }

  @Get(":id")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("catalogue.view")
  get(@Param("id") id: string, @CurrentSession() session: TenantSession) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    return this.catalogue.getProduct(tenantId, id);
  }

  @Post()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("catalogue.manage")
  async create(@Body() body: unknown, @CurrentSession() session: TenantSession) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const input = createProductSchema.parse(body);
    const record = await this.catalogue.createProduct(
      tenantId,
      session.user.id,
      input.product,
      input.initialVariant,
    );
    await this.catalogue.auditAction(
      tenantId,
      session.user.id,
      "catalogue.product.create",
      "product",
      record.id,
      input,
    );
    return record;
  }

  @Patch(":id")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("catalogue.manage")
  async update(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const input = productSchema.partial().parse(body);
    const record = await this.catalogue.updateProduct(
      tenantId,
      session.user.id,
      id,
      input,
    );
    await this.catalogue.auditAction(
      tenantId,
      session.user.id,
      "catalogue.product.update",
      "product",
      record.id,
      input,
    );
    return record;
  }

  @Patch(":id/archive")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("catalogue.archive")
  async archive(@Param("id") id: string, @CurrentSession() session: TenantSession) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const record = await this.catalogue.setProductLifecycle(
      tenantId,
      session.user.id,
      id,
      ProductLifecycleStatus.ARCHIVED,
    );
    await this.catalogue.auditAction(
      tenantId,
      session.user.id,
      "catalogue.product.archive",
      "product",
      record.id,
      { lifecycleStatus: ProductLifecycleStatus.ARCHIVED },
    );
    return record;
  }

  @Patch(":id/restore")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("catalogue.archive")
  async restore(@Param("id") id: string, @CurrentSession() session: TenantSession) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const record = await this.catalogue.setProductLifecycle(
      tenantId,
      session.user.id,
      id,
      ProductLifecycleStatus.ACTIVE,
    );
    await this.catalogue.auditAction(
      tenantId,
      session.user.id,
      "catalogue.product.restore",
      "product",
      record.id,
      { lifecycleStatus: ProductLifecycleStatus.ACTIVE },
    );
    return record;
  }

  @Get(":id/variants")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("catalogue.view")
  async listVariants(
    @Param("id") id: string,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const product = await this.catalogue.getProduct(tenantId, id);
    return product.variants;
  }

  @Post(":id/variants")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("catalogue.manage")
  async createVariant(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const input = variantSchema.parse(body);
    const record = await this.catalogue.createVariant(
      tenantId,
      session.user.id,
      id,
      input,
    );
    await this.catalogue.auditAction(
      tenantId,
      session.user.id,
      "catalogue.variant.create",
      "productVariant",
      record.id,
      input,
    );
    return record;
  }

  @Patch(":id/variants/:variantId")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("catalogue.manage")
  async updateVariant(
    @Param("id") id: string,
    @Param("variantId") variantId: string,
    @Body() body: unknown,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const input = variantSchema.partial().parse(body);
    const record = await this.catalogue.updateVariant(
      tenantId,
      session.user.id,
      id,
      variantId,
      input,
    );
    await this.catalogue.auditAction(
      tenantId,
      session.user.id,
      "catalogue.variant.update",
      "productVariant",
      record.id,
      input,
    );
    return record;
  }

  @Patch(":id/variants/:variantId/archive")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("catalogue.archive")
  async archiveVariant(
    @Param("id") id: string,
    @Param("variantId") variantId: string,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const record = await this.catalogue.setVariantLifecycle(
      tenantId,
      session.user.id,
      id,
      variantId,
      ProductLifecycleStatus.ARCHIVED,
    );
    await this.catalogue.auditAction(
      tenantId,
      session.user.id,
      "catalogue.variant.archive",
      "productVariant",
      record.id,
      { lifecycleStatus: ProductLifecycleStatus.ARCHIVED },
    );
    return record;
  }

  @Patch(":id/variants/:variantId/restore")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("catalogue.archive")
  async restoreVariant(
    @Param("id") id: string,
    @Param("variantId") variantId: string,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const record = await this.catalogue.setVariantLifecycle(
      tenantId,
      session.user.id,
      id,
      variantId,
      ProductLifecycleStatus.ACTIVE,
    );
    await this.catalogue.auditAction(
      tenantId,
      session.user.id,
      "catalogue.variant.restore",
      "productVariant",
      record.id,
      { lifecycleStatus: ProductLifecycleStatus.ACTIVE },
    );
    return record;
  }
}

@Controller({ path: "catalogue/attributes", version: "1" })
class CatalogueAttributesController {
  constructor(
    private readonly tenantAccess: TenantAccessService,
    private readonly catalogue: CatalogueService,
  ) {}

  @Get()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("catalogue.view")
  list(@CurrentSession() session: TenantSession) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    return this.catalogue.listAttributeDefinitions(tenantId);
  }

  @Post()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("catalogue.manage")
  async create(@Body() body: unknown, @CurrentSession() session: TenantSession) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const input = attributeDefinitionSchema.parse(body);
    const record = await this.catalogue.createAttributeDefinition(
      tenantId,
      session.user.id,
      input,
    );
    await this.catalogue.auditAction(
      tenantId,
      session.user.id,
      "catalogue.attribute.create",
      "productAttributeDefinition",
      record.id,
      input,
    );
    return record;
  }
}

@Module({
  controllers: [
    CatalogueCategoriesController,
    CatalogueManufacturersController,
    CatalogueBrandsController,
    CatalogueCollectionsController,
    CatalogueUnitsController,
    CatalogueProductsController,
    CatalogueAttributesController,
  ],
  providers: [CatalogueService],
})
export class CatalogueModule {}

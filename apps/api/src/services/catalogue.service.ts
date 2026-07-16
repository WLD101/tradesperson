import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  ProductAttributeValueType,
  ProductLifecycleStatus,
  ProductRecordStatus,
  UnitOfMeasureKind,
  type Prisma,
} from "@prisma/client";
import { PrismaService } from "./prisma.service";
import { AuditService } from "./audit.service";
import { validateVariantForCategory } from "./catalogue-rules";

type LookupKind =
  | "categories"
  | "manufacturers"
  | "brands"
  | "collections"
  | "units";

type LookupInput = {
  name: string;
  slug: string;
  description?: string | null | undefined;
  manufacturerId?: string | null | undefined;
  brandId?: string | null | undefined;
  code?: string | undefined;
  symbol?: string | null | undefined;
  kind?: UnitOfMeasureKind | undefined;
};

type LookupUpdateInput = {
  name?: string | undefined;
  slug?: string | undefined;
  description?: string | null | undefined;
  manufacturerId?: string | null | undefined;
  brandId?: string | null | undefined;
  code?: string | undefined;
  symbol?: string | null | undefined;
  kind?: UnitOfMeasureKind | undefined;
};

type ProductListQuery = {
  page: number;
  pageSize: number;
  search?: string | undefined;
  categoryId?: string | undefined;
  manufacturerId?: string | undefined;
  brandId?: string | undefined;
  collectionId?: string | undefined;
  unitId?: string | undefined;
  lifecycleStatus?: ProductLifecycleStatus | undefined;
  includeArchived: boolean;
  sort: "nameAsc" | "nameDesc" | "createdAtDesc" | "updatedAtDesc";
};

type ProductInput = {
  categoryId: string;
  manufacturerId?: string | null | undefined;
  brandId?: string | null | undefined;
  collectionId?: string | null | undefined;
  primaryUnitId: string;
  name: string;
  slug: string;
  sku: string;
  supplierSkuPlaceholder?: string | null | undefined;
  description?: string | null | undefined;
  material?: string | null | undefined;
  colour?: string | null | undefined;
  shade?: string | null | undefined;
  pattern?: string | null | undefined;
  batchTrackingRequired?: boolean | undefined;
  fireRating?: string | null | undefined;
  slipRating?: string | null | undefined;
  acousticRating?: string | null | undefined;
  underfloorHeatingCompatible?: boolean | null | undefined;
  domesticCommercialClass?: string | null | undefined;
  warranty?: string | null | undefined;
  recommendedAdhesive?: string | null | undefined;
  recommendedUnderlay?: string | null | undefined;
  technicalData?: string | null | undefined;
  safetyData?: string | null | undefined;
  lifecycleStatus?: ProductLifecycleStatus | undefined;
};

type ProductUpdateInput = {
  categoryId?: string | undefined;
  manufacturerId?: string | null | undefined;
  brandId?: string | null | undefined;
  collectionId?: string | null | undefined;
  primaryUnitId?: string | undefined;
  name?: string | undefined;
  slug?: string | undefined;
  sku?: string | undefined;
  supplierSkuPlaceholder?: string | null | undefined;
  description?: string | null | undefined;
  material?: string | null | undefined;
  colour?: string | null | undefined;
  shade?: string | null | undefined;
  pattern?: string | null | undefined;
  batchTrackingRequired?: boolean | undefined;
  fireRating?: string | null | undefined;
  slipRating?: string | null | undefined;
  acousticRating?: string | null | undefined;
  underfloorHeatingCompatible?: boolean | null | undefined;
  domesticCommercialClass?: string | null | undefined;
  warranty?: string | null | undefined;
  recommendedAdhesive?: string | null | undefined;
  recommendedUnderlay?: string | null | undefined;
  technicalData?: string | null | undefined;
  safetyData?: string | null | undefined;
  lifecycleStatus?: ProductLifecycleStatus | undefined;
};

type VariantInput = {
  name: string;
  sku: string;
  unitOfMeasureId?: string | null | undefined;
  colour?: string | null | undefined;
  shade?: string | null | undefined;
  pattern?: string | null | undefined;
  thicknessMm?: Prisma.Decimal | number | null | undefined;
  wearLayerMm?: Prisma.Decimal | number | null | undefined;
  rollWidthM?: Prisma.Decimal | number | null | undefined;
  standardRollLengthM?: Prisma.Decimal | number | null | undefined;
  tileLengthMm?: Prisma.Decimal | number | null | undefined;
  tileWidthMm?: Prisma.Decimal | number | null | undefined;
  packQuantity?: number | null | undefined;
  packCoverageM2?: Prisma.Decimal | number | null | undefined;
  isDefault?: boolean | undefined;
  lifecycleStatus?: ProductLifecycleStatus | undefined;
};

type VariantUpdateInput = {
  name?: string | undefined;
  sku?: string | undefined;
  unitOfMeasureId?: string | null | undefined;
  colour?: string | null | undefined;
  shade?: string | null | undefined;
  pattern?: string | null | undefined;
  thicknessMm?: Prisma.Decimal | number | null | undefined;
  wearLayerMm?: Prisma.Decimal | number | null | undefined;
  rollWidthM?: Prisma.Decimal | number | null | undefined;
  standardRollLengthM?: Prisma.Decimal | number | null | undefined;
  tileLengthMm?: Prisma.Decimal | number | null | undefined;
  tileWidthMm?: Prisma.Decimal | number | null | undefined;
  packQuantity?: number | null | undefined;
  packCoverageM2?: Prisma.Decimal | number | null | undefined;
  isDefault?: boolean | undefined;
  lifecycleStatus?: ProductLifecycleStatus | undefined;
};

type AttributeDefinitionInput = {
  key: string;
  name: string;
  description?: string | null | undefined;
  categoryId?: string | null | undefined;
  valueType: ProductAttributeValueType;
  isRequired?: boolean | undefined;
  isFilterable?: boolean | undefined;
};

@Injectable()
export class CatalogueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listLookups(tenantId: string, kind: LookupKind) {
    switch (kind) {
      case "categories":
        return this.prisma.client.productCategory.findMany({
          where: { tenantId },
          orderBy: [{ status: "asc" }, { name: "asc" }],
        });
      case "manufacturers":
        return this.prisma.client.manufacturer.findMany({
          where: { tenantId },
          orderBy: [{ status: "asc" }, { name: "asc" }],
        });
      case "brands":
        return this.prisma.client.brand.findMany({
          where: { tenantId },
          orderBy: [{ status: "asc" }, { name: "asc" }],
          include: {
            manufacturer: { select: { id: true, name: true } },
          },
        });
      case "collections":
        return this.prisma.client.productCollection.findMany({
          where: { tenantId },
          orderBy: [{ status: "asc" }, { name: "asc" }],
          include: {
            manufacturer: { select: { id: true, name: true } },
            brand: { select: { id: true, name: true } },
          },
        });
      case "units":
        return this.prisma.client.unitOfMeasure.findMany({
          where: { tenantId },
          orderBy: [{ status: "asc" }, { name: "asc" }],
        });
    }
  }

  async getLookup(tenantId: string, kind: LookupKind, id: string) {
    switch (kind) {
      case "categories":
        return this.ensureCategory(tenantId, id);
      case "manufacturers":
        return this.ensureManufacturer(tenantId, id);
      case "brands":
        return this.prisma.client.brand.findFirstOrThrow({
          where: { id, tenantId },
          include: { manufacturer: { select: { id: true, name: true } } },
        });
      case "collections":
        return this.prisma.client.productCollection.findFirstOrThrow({
          where: { id, tenantId },
          include: {
            manufacturer: { select: { id: true, name: true } },
            brand: { select: { id: true, name: true } },
          },
        });
      case "units":
        return this.ensureUnit(tenantId, id);
    }
  }

  async createLookup(
    tenantId: string,
    userId: string,
    kind: LookupKind,
    input: LookupInput,
  ) {
    switch (kind) {
      case "categories":
        return this.prisma.client.productCategory.create({
          data: {
            tenantId,
            name: input.name,
            slug: input.slug,
            description: input.description ?? null,
            createdById: userId,
          },
        });
      case "manufacturers":
        return this.prisma.client.manufacturer.create({
          data: {
            tenantId,
            name: input.name,
            slug: input.slug,
            description: input.description ?? null,
            createdById: userId,
          },
        });
      case "brands": {
        const manufacturerId = input.manufacturerId
          ? await this.ensureManufacturer(tenantId, input.manufacturerId).then(
              (record) => record.id,
            )
          : null;
        return this.prisma.client.brand.create({
          data: {
            tenantId,
            manufacturerId,
            name: input.name,
            slug: input.slug,
            description: input.description ?? null,
            createdById: userId,
          },
          include: {
            manufacturer: { select: { id: true, name: true } },
          },
        });
      }
      case "collections": {
        const manufacturerId = input.manufacturerId
          ? await this.ensureManufacturer(tenantId, input.manufacturerId).then(
              (record) => record.id,
            )
          : null;
        const brandId = input.brandId
          ? await this.ensureBrand(
              tenantId,
              input.brandId,
              manufacturerId ?? undefined,
            ).then(
              (record) => record.id,
            )
          : null;
        return this.prisma.client.productCollection.create({
          data: {
            tenantId,
            manufacturerId,
            brandId,
            name: input.name,
            slug: input.slug,
            description: input.description ?? null,
            createdById: userId,
          },
          include: {
            manufacturer: { select: { id: true, name: true } },
            brand: { select: { id: true, name: true } },
          },
        });
      }
      case "units":
        return this.prisma.client.unitOfMeasure.create({
          data: {
            tenantId,
            code: input.code ?? input.slug.toUpperCase(),
            name: input.name,
            symbol: input.symbol ?? null,
            kind: input.kind ?? UnitOfMeasureKind.OTHER,
            description: input.description ?? null,
            createdById: userId,
          },
        });
    }
  }

  async updateLookup(
    tenantId: string,
    userId: string,
    kind: LookupKind,
    id: string,
    input: LookupUpdateInput,
  ) {
    switch (kind) {
      case "categories":
        await this.ensureCategory(tenantId, id);
        return this.prisma.client.productCategory.update({
          where: { id },
          data: {
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.slug !== undefined ? { slug: input.slug } : {}),
            ...(input.description !== undefined
              ? { description: input.description }
              : {}),
            updatedById: userId,
          },
        });
      case "manufacturers":
        await this.ensureManufacturer(tenantId, id);
        return this.prisma.client.manufacturer.update({
          where: { id },
          data: {
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.slug !== undefined ? { slug: input.slug } : {}),
            ...(input.description !== undefined
              ? { description: input.description }
              : {}),
            updatedById: userId,
          },
        });
      case "brands": {
        await this.ensureBrand(tenantId, id);
        const manufacturerId =
          input.manufacturerId === undefined
            ? undefined
            : input.manufacturerId
              ? await this.ensureManufacturer(tenantId, input.manufacturerId).then(
                  (record) => record.id,
                )
              : null;
        return this.prisma.client.brand.update({
          where: { id },
          data: {
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.slug !== undefined ? { slug: input.slug } : {}),
            ...(input.description !== undefined
              ? { description: input.description }
              : {}),
            ...(manufacturerId !== undefined ? { manufacturerId } : {}),
            updatedById: userId,
          },
          include: {
            manufacturer: { select: { id: true, name: true } },
          },
        });
      }
      case "collections": {
        await this.ensureCollection(tenantId, id);
        const manufacturerId =
          input.manufacturerId === undefined
            ? undefined
            : input.manufacturerId
              ? await this.ensureManufacturer(tenantId, input.manufacturerId).then(
                  (record) => record.id,
                )
              : null;
        const brandId =
          input.brandId === undefined
            ? undefined
            : input.brandId
              ? await this.ensureBrand(
                  tenantId,
                  input.brandId,
                  manufacturerId ?? undefined,
                ).then((record) => record.id)
              : null;
        return this.prisma.client.productCollection.update({
          where: { id },
          data: {
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.slug !== undefined ? { slug: input.slug } : {}),
            ...(input.description !== undefined
              ? { description: input.description }
              : {}),
            ...(manufacturerId !== undefined ? { manufacturerId } : {}),
            ...(brandId !== undefined ? { brandId } : {}),
            updatedById: userId,
          },
          include: {
            manufacturer: { select: { id: true, name: true } },
            brand: { select: { id: true, name: true } },
          },
        });
      }
      case "units":
        await this.ensureUnit(tenantId, id);
        return this.prisma.client.unitOfMeasure.update({
          where: { id },
          data: {
            ...(input.code !== undefined ? { code: input.code } : {}),
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.symbol !== undefined ? { symbol: input.symbol } : {}),
            ...(input.kind !== undefined ? { kind: input.kind } : {}),
            ...(input.description !== undefined
              ? { description: input.description }
              : {}),
            updatedById: userId,
          },
        });
    }
  }

  async archiveLookup(
    tenantId: string,
    userId: string,
    kind: LookupKind,
    id: string,
    status: ProductRecordStatus,
  ) {
    switch (kind) {
      case "categories":
        await this.ensureCategory(tenantId, id);
        return this.prisma.client.productCategory.update({
          where: { id },
          data: { status, updatedById: userId },
        });
      case "manufacturers":
        await this.ensureManufacturer(tenantId, id);
        return this.prisma.client.manufacturer.update({
          where: { id },
          data: { status, updatedById: userId },
        });
      case "brands":
        await this.ensureBrand(tenantId, id);
        return this.prisma.client.brand.update({
          where: { id },
          data: { status, updatedById: userId },
        });
      case "collections":
        await this.ensureCollection(tenantId, id);
        return this.prisma.client.productCollection.update({
          where: { id },
          data: { status, updatedById: userId },
        });
      case "units":
        await this.ensureUnit(tenantId, id);
        return this.prisma.client.unitOfMeasure.update({
          where: { id },
          data: { status, updatedById: userId },
        });
    }
  }

  async listProducts(tenantId: string, query: ProductListQuery) {
    const where: Prisma.ProductWhereInput = {
      tenantId,
      ...(query.includeArchived
        ? {}
        : { lifecycleStatus: { not: ProductLifecycleStatus.ARCHIVED } }),
      ...(query.lifecycleStatus
        ? { lifecycleStatus: query.lifecycleStatus }
        : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.manufacturerId ? { manufacturerId: query.manufacturerId } : {}),
      ...(query.brandId ? { brandId: query.brandId } : {}),
      ...(query.collectionId ? { collectionId: query.collectionId } : {}),
      ...(query.unitId ? { primaryUnitId: query.unitId } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { sku: { contains: query.search, mode: "insensitive" } },
              {
                supplierSkuPlaceholder: {
                  contains: query.search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
    };

    const orderBy =
      query.sort === "nameAsc"
        ? ({ name: "asc" } as const)
        : query.sort === "nameDesc"
          ? ({ name: "desc" } as const)
          : query.sort === "updatedAtDesc"
            ? ({ updatedAt: "desc" } as const)
            : ({ createdAt: "desc" } as const);

    const [items, total] = await this.prisma.client.$transaction([
      this.prisma.client.product.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          category: { select: { id: true, name: true } },
          manufacturer: { select: { id: true, name: true } },
          brand: { select: { id: true, name: true } },
          collection: { select: { id: true, name: true } },
          primaryUnit: { select: { id: true, name: true, code: true, symbol: true } },
          variants: {
            where: { lifecycleStatus: { not: ProductLifecycleStatus.ARCHIVED } },
            orderBy: [{ isDefault: "desc" }, { name: "asc" }],
            select: {
              id: true,
              name: true,
              sku: true,
              colour: true,
              thicknessMm: true,
              packCoverageM2: true,
              lifecycleStatus: true,
              isDefault: true,
            },
          },
        },
      }),
      this.prisma.client.product.count({ where }),
    ]);

    return {
      items,
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    };
  }

  async getProduct(tenantId: string, id: string) {
    return this.prisma.client.product.findFirstOrThrow({
      where: { id, tenantId },
      include: {
        category: { select: { id: true, name: true } },
        manufacturer: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        collection: { select: { id: true, name: true } },
        primaryUnit: { select: { id: true, name: true, code: true, symbol: true } },
        variants: {
          include: {
            unitOfMeasure: {
              select: { id: true, name: true, code: true, symbol: true },
            },
          },
          orderBy: [{ isDefault: "desc" }, { name: "asc" }],
        },
      },
    });
  }

  async createProduct(
    tenantId: string,
    userId: string,
    input: ProductInput,
    initialVariant: VariantInput,
  ) {
    const category = await this.assertProductReferences(tenantId, input);
    validateVariantForCategory(category.slug, this.variantValidationShape(initialVariant));
    const variantUnitId = initialVariant.unitOfMeasureId
      ? await this.ensureUnit(tenantId, initialVariant.unitOfMeasureId).then(
          (record) => record.id,
        )
      : null;

    return this.prisma.client.product.create({
      data: {
        tenantId,
        ...this.toProductCreateData(input, userId),
        variants: {
          create: {
            ...this.toVariantCreateData(initialVariant, userId),
            tenantId,
            unitOfMeasureId: variantUnitId ?? input.primaryUnitId,
            isDefault: initialVariant.isDefault ?? true,
          },
        },
      },
      include: {
        category: { select: { id: true, name: true } },
        manufacturer: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        collection: { select: { id: true, name: true } },
        primaryUnit: { select: { id: true, name: true, code: true, symbol: true } },
        variants: {
          include: {
            unitOfMeasure: {
              select: { id: true, name: true, code: true, symbol: true },
            },
          },
        },
      },
    });
  }

  async updateProduct(
    tenantId: string,
    userId: string,
    productId: string,
    input: ProductUpdateInput,
  ) {
    const existing = await this.ensureProduct(tenantId, productId);
    await this.assertProductReferences(tenantId, {
      categoryId: input.categoryId ?? existing.categoryId,
      manufacturerId: input.manufacturerId ?? existing.manufacturerId,
      brandId: input.brandId ?? existing.brandId,
      collectionId: input.collectionId ?? existing.collectionId,
      primaryUnitId: input.primaryUnitId ?? existing.primaryUnitId,
      name: input.name ?? existing.name,
      slug: input.slug ?? existing.slug,
      sku: input.sku ?? existing.sku,
      supplierSkuPlaceholder:
        input.supplierSkuPlaceholder ?? existing.supplierSkuPlaceholder,
      description: input.description ?? existing.description,
      material: input.material ?? existing.material,
      colour: input.colour ?? existing.colour,
      shade: input.shade ?? existing.shade,
      pattern: input.pattern ?? existing.pattern,
      batchTrackingRequired:
        input.batchTrackingRequired ?? existing.batchTrackingRequired,
      fireRating: input.fireRating ?? existing.fireRating,
      slipRating: input.slipRating ?? existing.slipRating,
      acousticRating: input.acousticRating ?? existing.acousticRating,
      underfloorHeatingCompatible:
        input.underfloorHeatingCompatible ?? existing.underfloorHeatingCompatible,
      domesticCommercialClass:
        input.domesticCommercialClass ?? existing.domesticCommercialClass,
      warranty: input.warranty ?? existing.warranty,
      recommendedAdhesive:
        input.recommendedAdhesive ?? existing.recommendedAdhesive,
      recommendedUnderlay:
        input.recommendedUnderlay ?? existing.recommendedUnderlay,
      technicalData: input.technicalData ?? existing.technicalData,
      safetyData: input.safetyData ?? existing.safetyData,
      lifecycleStatus: input.lifecycleStatus ?? existing.lifecycleStatus,
    });

    return this.prisma.client.product.update({
      where: { id: existing.id },
      data: {
        ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
        ...(input.manufacturerId !== undefined
          ? { manufacturerId: input.manufacturerId }
          : {}),
        ...(input.brandId !== undefined ? { brandId: input.brandId } : {}),
        ...(input.collectionId !== undefined
          ? { collectionId: input.collectionId }
          : {}),
        ...(input.primaryUnitId !== undefined
          ? { primaryUnitId: input.primaryUnitId }
          : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.sku !== undefined ? { sku: input.sku } : {}),
        ...(input.supplierSkuPlaceholder !== undefined
          ? { supplierSkuPlaceholder: input.supplierSkuPlaceholder }
          : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.material !== undefined ? { material: input.material } : {}),
        ...(input.colour !== undefined ? { colour: input.colour } : {}),
        ...(input.shade !== undefined ? { shade: input.shade } : {}),
        ...(input.pattern !== undefined ? { pattern: input.pattern } : {}),
        ...(input.batchTrackingRequired !== undefined
          ? { batchTrackingRequired: input.batchTrackingRequired }
          : {}),
        ...(input.fireRating !== undefined ? { fireRating: input.fireRating } : {}),
        ...(input.slipRating !== undefined ? { slipRating: input.slipRating } : {}),
        ...(input.acousticRating !== undefined
          ? { acousticRating: input.acousticRating }
          : {}),
        ...(input.underfloorHeatingCompatible !== undefined
          ? { underfloorHeatingCompatible: input.underfloorHeatingCompatible }
          : {}),
        ...(input.domesticCommercialClass !== undefined
          ? { domesticCommercialClass: input.domesticCommercialClass }
          : {}),
        ...(input.warranty !== undefined ? { warranty: input.warranty } : {}),
        ...(input.recommendedAdhesive !== undefined
          ? { recommendedAdhesive: input.recommendedAdhesive }
          : {}),
        ...(input.recommendedUnderlay !== undefined
          ? { recommendedUnderlay: input.recommendedUnderlay }
          : {}),
        ...(input.technicalData !== undefined
          ? { technicalData: input.technicalData }
          : {}),
        ...(input.safetyData !== undefined ? { safetyData: input.safetyData } : {}),
        ...(input.lifecycleStatus !== undefined
          ? { lifecycleStatus: input.lifecycleStatus }
          : {}),
        updatedById: userId,
      },
      include: {
        category: { select: { id: true, name: true } },
        manufacturer: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        collection: { select: { id: true, name: true } },
        primaryUnit: { select: { id: true, name: true, code: true, symbol: true } },
        variants: {
          include: {
            unitOfMeasure: {
              select: { id: true, name: true, code: true, symbol: true },
            },
          },
          orderBy: [{ isDefault: "desc" }, { name: "asc" }],
        },
      },
    });
  }

  async setProductLifecycle(
    tenantId: string,
    userId: string,
    productId: string,
    lifecycleStatus: ProductLifecycleStatus,
  ) {
    await this.ensureProduct(tenantId, productId);
    return this.prisma.client.product.update({
      where: { id: productId },
      data: { lifecycleStatus, updatedById: userId },
    });
  }

  async createVariant(
    tenantId: string,
    userId: string,
    productId: string,
    input: VariantInput,
  ) {
    const product = await this.prisma.client.product.findFirstOrThrow({
      where: { id: productId, tenantId },
      include: {
        category: { select: { slug: true } },
      },
    });
    validateVariantForCategory(
      product.category.slug,
      this.variantValidationShape(input),
    );
    const unitOfMeasureId = input.unitOfMeasureId
      ? await this.ensureUnit(tenantId, input.unitOfMeasureId).then(
          (record) => record.id,
        )
      : product.primaryUnitId;

    const nextDefault = input.isDefault ?? false;

    return this.prisma.client.$transaction(async (tx) => {
      if (nextDefault) {
        await tx.productVariant.updateMany({
          where: { tenantId, productId },
          data: { isDefault: false },
        });
      }

      return tx.productVariant.create({
        data: {
          tenantId,
          productId,
          unitOfMeasureId,
          ...this.toVariantCreateData(input, userId),
        },
        include: {
          unitOfMeasure: {
            select: { id: true, name: true, code: true, symbol: true },
          },
        },
      });
    });
  }

  async updateVariant(
    tenantId: string,
    userId: string,
    productId: string,
    variantId: string,
    input: VariantUpdateInput,
  ) {
    const product = await this.prisma.client.product.findFirstOrThrow({
      where: { id: productId, tenantId },
      include: {
        category: { select: { slug: true } },
      },
    });
    const existing = await this.prisma.client.productVariant.findFirstOrThrow({
      where: { id: variantId, tenantId, productId },
    });
    validateVariantForCategory(product.category.slug, {
      packQuantity: input.packQuantity ?? existing.packQuantity,
      packCoverageM2:
        input.packCoverageM2 == null
          ? existing.packCoverageM2?.toNumber()
          : Number(input.packCoverageM2),
      rollWidthM:
        input.rollWidthM == null
          ? existing.rollWidthM?.toNumber()
          : Number(input.rollWidthM),
      standardRollLengthM:
        input.standardRollLengthM == null
          ? existing.standardRollLengthM?.toNumber()
          : Number(input.standardRollLengthM),
      tileLengthMm:
        input.tileLengthMm == null
          ? existing.tileLengthMm?.toNumber()
          : Number(input.tileLengthMm),
      tileWidthMm:
        input.tileWidthMm == null
          ? existing.tileWidthMm?.toNumber()
          : Number(input.tileWidthMm),
      thicknessMm:
        input.thicknessMm == null
          ? existing.thicknessMm?.toNumber()
          : Number(input.thicknessMm),
      wearLayerMm:
        input.wearLayerMm == null
          ? existing.wearLayerMm?.toNumber()
          : Number(input.wearLayerMm),
    });

    const unitOfMeasureId =
      input.unitOfMeasureId === undefined
        ? undefined
        : input.unitOfMeasureId
          ? await this.ensureUnit(tenantId, input.unitOfMeasureId).then(
              (record) => record.id,
            )
          : null;

    return this.prisma.client.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.productVariant.updateMany({
          where: { tenantId, productId },
          data: { isDefault: false },
        });
      }

      return tx.productVariant.update({
        where: { id: existing.id },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.sku !== undefined ? { sku: input.sku } : {}),
          ...(unitOfMeasureId !== undefined ? { unitOfMeasureId } : {}),
          ...(input.colour !== undefined ? { colour: input.colour } : {}),
          ...(input.shade !== undefined ? { shade: input.shade } : {}),
          ...(input.pattern !== undefined ? { pattern: input.pattern } : {}),
          ...(input.thicknessMm !== undefined
            ? { thicknessMm: input.thicknessMm }
            : {}),
          ...(input.wearLayerMm !== undefined
            ? { wearLayerMm: input.wearLayerMm }
            : {}),
          ...(input.rollWidthM !== undefined ? { rollWidthM: input.rollWidthM } : {}),
          ...(input.standardRollLengthM !== undefined
            ? { standardRollLengthM: input.standardRollLengthM }
            : {}),
          ...(input.tileLengthMm !== undefined
            ? { tileLengthMm: input.tileLengthMm }
            : {}),
          ...(input.tileWidthMm !== undefined
            ? { tileWidthMm: input.tileWidthMm }
            : {}),
          ...(input.packQuantity !== undefined
            ? { packQuantity: input.packQuantity }
            : {}),
          ...(input.packCoverageM2 !== undefined
            ? { packCoverageM2: input.packCoverageM2 }
            : {}),
          ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
          ...(input.lifecycleStatus !== undefined
            ? { lifecycleStatus: input.lifecycleStatus }
            : {}),
          updatedById: userId,
        },
        include: {
          unitOfMeasure: {
            select: { id: true, name: true, code: true, symbol: true },
          },
        },
      });
    });
  }

  async setVariantLifecycle(
    tenantId: string,
    userId: string,
    productId: string,
    variantId: string,
    lifecycleStatus: ProductLifecycleStatus,
  ) {
    await this.ensureProduct(tenantId, productId);
    await this.prisma.client.productVariant.findFirstOrThrow({
      where: { id: variantId, tenantId, productId },
      select: { id: true },
    });
    return this.prisma.client.productVariant.update({
      where: { id: variantId },
      data: { lifecycleStatus, updatedById: userId },
    });
  }

  async listAttributeDefinitions(tenantId: string) {
    return this.prisma.client.productAttributeDefinition.findMany({
      where: { tenantId },
      orderBy: [{ status: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      include: {
        category: { select: { id: true, name: true } },
      },
    });
  }

  async createAttributeDefinition(
    tenantId: string,
    userId: string,
    input: AttributeDefinitionInput,
  ) {
    const categoryId = input.categoryId
      ? await this.ensureCategory(tenantId, input.categoryId).then(
          (record) => record.id,
        )
      : null;

    return this.prisma.client.productAttributeDefinition.create({
      data: {
        tenantId,
        categoryId,
        key: input.key,
        name: input.name,
        description: input.description ?? null,
        valueType: input.valueType,
        isRequired: input.isRequired ?? false,
        isFilterable: input.isFilterable ?? false,
        createdById: userId,
      },
      include: {
        category: { select: { id: true, name: true } },
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
  ) {
    await this.audit.record({
      tenantId,
      actorUserId: userId,
      action,
      entityType,
      entityId,
      newValues: payload as Prisma.InputJsonValue,
    });
  }

  private async assertProductReferences(tenantId: string, input: ProductInput) {
    const category = await this.ensureCategory(tenantId, input.categoryId);
    const manufacturer = input.manufacturerId
      ? await this.ensureManufacturer(tenantId, input.manufacturerId)
      : null;
    const brand = input.brandId
      ? await this.ensureBrand(
          tenantId,
          input.brandId,
          manufacturer?.id ?? undefined,
        )
      : null;
    const collection = input.collectionId
      ? await this.ensureCollection(
          tenantId,
          input.collectionId,
          manufacturer?.id ?? undefined,
          brand?.id ?? undefined,
        )
      : null;
    await this.ensureUnit(tenantId, input.primaryUnitId);

    if (category.status === ProductRecordStatus.ARCHIVED) {
      throw new BadRequestException("Archived categories cannot be assigned.");
    }
    if (manufacturer?.status === ProductRecordStatus.ARCHIVED) {
      throw new BadRequestException("Archived manufacturers cannot be assigned.");
    }
    if (brand?.status === ProductRecordStatus.ARCHIVED) {
      throw new BadRequestException("Archived brands cannot be assigned.");
    }
    if (collection?.status === ProductRecordStatus.ARCHIVED) {
      throw new BadRequestException("Archived collections cannot be assigned.");
    }

    return category;
  }

  private toProductCreateData(input: ProductInput, userId: string) {
    return {
      categoryId: input.categoryId,
      manufacturerId: input.manufacturerId ?? null,
      brandId: input.brandId ?? null,
      collectionId: input.collectionId ?? null,
      primaryUnitId: input.primaryUnitId,
      name: input.name,
      slug: input.slug,
      sku: input.sku,
      supplierSkuPlaceholder: input.supplierSkuPlaceholder ?? null,
      description: input.description ?? null,
      material: input.material ?? null,
      colour: input.colour ?? null,
      shade: input.shade ?? null,
      pattern: input.pattern ?? null,
      batchTrackingRequired: input.batchTrackingRequired ?? false,
      fireRating: input.fireRating ?? null,
      slipRating: input.slipRating ?? null,
      acousticRating: input.acousticRating ?? null,
      underfloorHeatingCompatible: input.underfloorHeatingCompatible ?? null,
      domesticCommercialClass: input.domesticCommercialClass ?? null,
      warranty: input.warranty ?? null,
      recommendedAdhesive: input.recommendedAdhesive ?? null,
      recommendedUnderlay: input.recommendedUnderlay ?? null,
      technicalData: input.technicalData ?? null,
      safetyData: input.safetyData ?? null,
      lifecycleStatus: input.lifecycleStatus ?? ProductLifecycleStatus.ACTIVE,
      createdById: userId,
    };
  }

  private toVariantCreateData(input: VariantInput, userId: string) {
    return {
      name: input.name,
      sku: input.sku,
      colour: input.colour ?? null,
      shade: input.shade ?? null,
      pattern: input.pattern ?? null,
      thicknessMm: input.thicknessMm ?? null,
      wearLayerMm: input.wearLayerMm ?? null,
      rollWidthM: input.rollWidthM ?? null,
      standardRollLengthM: input.standardRollLengthM ?? null,
      tileLengthMm: input.tileLengthMm ?? null,
      tileWidthMm: input.tileWidthMm ?? null,
      packQuantity: input.packQuantity ?? null,
      packCoverageM2: input.packCoverageM2 ?? null,
      isDefault: input.isDefault ?? false,
      lifecycleStatus: input.lifecycleStatus ?? ProductLifecycleStatus.ACTIVE,
      createdById: userId,
    };
  }

  private variantValidationShape(input: VariantInput) {
    return {
      packQuantity: input.packQuantity == null ? null : Number(input.packQuantity),
      packCoverageM2:
        input.packCoverageM2 == null ? null : Number(input.packCoverageM2),
      rollWidthM: input.rollWidthM == null ? null : Number(input.rollWidthM),
      standardRollLengthM:
        input.standardRollLengthM == null
          ? null
          : Number(input.standardRollLengthM),
      tileLengthMm:
        input.tileLengthMm == null ? null : Number(input.tileLengthMm),
      tileWidthMm: input.tileWidthMm == null ? null : Number(input.tileWidthMm),
      thicknessMm: input.thicknessMm == null ? null : Number(input.thicknessMm),
      wearLayerMm:
        input.wearLayerMm == null ? null : Number(input.wearLayerMm),
    };
  }

  private ensureProduct(tenantId: string, id: string) {
    return this.prisma.client.product.findFirstOrThrow({
      where: { id, tenantId },
    });
  }

  private ensureCategory(tenantId: string, id: string) {
    return this.prisma.client.productCategory.findFirstOrThrow({
      where: { id, tenantId },
    });
  }

  private ensureManufacturer(tenantId: string, id: string) {
    return this.prisma.client.manufacturer.findFirstOrThrow({
      where: { id, tenantId },
    });
  }

  private async ensureBrand(
    tenantId: string,
    id: string,
    manufacturerId?: string,
  ) {
    const brand = await this.prisma.client.brand.findFirstOrThrow({
      where: { id, tenantId },
    });

    if (manufacturerId && brand.manufacturerId && brand.manufacturerId !== manufacturerId) {
      throw new NotFoundException("Resource not found.");
    }

    return brand;
  }

  private async ensureCollection(
    tenantId: string,
    id: string,
    manufacturerId?: string,
    brandId?: string,
  ) {
    const collection = await this.prisma.client.productCollection.findFirstOrThrow({
      where: { id, tenantId },
    });

    if (
      manufacturerId &&
      collection.manufacturerId &&
      collection.manufacturerId !== manufacturerId
    ) {
      throw new NotFoundException("Resource not found.");
    }

    if (brandId && collection.brandId && collection.brandId !== brandId) {
      throw new NotFoundException("Resource not found.");
    }

    return collection;
  }

  private ensureUnit(tenantId: string, id: string) {
    return this.prisma.client.unitOfMeasure.findFirstOrThrow({
      where: { id, tenantId },
    });
  }
}

import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";
import { SupplierStatus, type Prisma } from "@prisma/client";
import { AuditService } from "./audit.service";
import { PrismaService } from "./prisma.service";
import {
  assertSinglePrimaryContact,
  assertVariantMatchesProduct,
  normalizeSupplierCode,
  normalizeUkPostcode,
} from "./supplier-rules";

type SupplierListQuery = {
  page: number;
  pageSize: number;
  search?: string | undefined;
  status?: SupplierStatus | undefined;
  preferred?: boolean | undefined;
  countryCode?: string | undefined;
  includeArchived: boolean;
  sort:
    | "nameAsc"
    | "nameDesc"
    | "createdAtDesc"
    | "updatedAtDesc"
    | "leadTimeAsc";
};

type SupplierInput = {
  branchId?: string | null | undefined;
  legalName: string;
  tradingName?: string | null | undefined;
  supplierCode: string;
  accountNumber?: string | null | undefined;
  companyRegistrationNumber?: string | null | undefined;
  vatRegistrationNumber?: string | null | undefined;
  email?: string | null | undefined;
  telephone?: string | null | undefined;
  website?: string | null | undefined;
  addressLine1?: string | null | undefined;
  addressLine2?: string | null | undefined;
  city?: string | null | undefined;
  county?: string | null | undefined;
  postcode?: string | null | undefined;
  countryCode?: string | undefined;
  paymentTermsDescription?: string | null | undefined;
  creditLimit?: Prisma.Decimal | number | null | undefined;
  defaultCurrency?: string | undefined;
  typicalLeadTimeDays?: number | null | undefined;
  minimumOrderNotes?: string | null | undefined;
  deliveryNotes?: string | null | undefined;
  returnPolicyNotes?: string | null | undefined;
  preferredSupplier?: boolean | undefined;
  status?: SupplierStatus | undefined;
  internalNotes?: string | null | undefined;
};

type SupplierContactInput = {
  branchId?: string | null | undefined;
  name: string;
  jobTitle?: string | null | undefined;
  email?: string | null | undefined;
  telephone?: string | null | undefined;
  mobile?: string | null | undefined;
  isPrimary?: boolean | undefined;
  isOrderingContact?: boolean | undefined;
  isAccountsContact?: boolean | undefined;
  isTechnicalContact?: boolean | undefined;
  notes?: string | null | undefined;
  status?: SupplierStatus | undefined;
};

type SupplierProductInput = {
  productId: string;
  variantId?: string | null | undefined;
  supplierUnitId?: string | null | undefined;
  supplierSku: string;
  supplierDescription?: string | null | undefined;
  packQuantity?: Prisma.Decimal | number | null | undefined;
  packCoverageM2?: Prisma.Decimal | number | null | undefined;
  rollWidthM?: Prisma.Decimal | number | null | undefined;
  standardRollLengthM?: Prisma.Decimal | number | null | undefined;
  minimumOrderQty?: Prisma.Decimal | number | null | undefined;
  leadTimeDays?: number | null | undefined;
  preferredSupplier?: boolean | undefined;
  status?: SupplierStatus | undefined;
  lastConfirmedAt?: Date | null | undefined;
  notes?: string | null | undefined;
};

@Injectable()
export class SuppliersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listSuppliers(tenantId: string, query: SupplierListQuery) {
    const where: Prisma.SupplierWhereInput = {
      tenantId,
      ...(query.includeArchived ? {} : { status: { not: SupplierStatus.ARCHIVED } }),
      ...(query.status ? { status: query.status } : {}),
      ...(query.preferred !== undefined
        ? { preferredSupplier: query.preferred }
        : {}),
      ...(query.countryCode ? { countryCode: query.countryCode } : {}),
      ...(query.search
        ? {
            OR: [
              { legalName: { contains: query.search, mode: "insensitive" } },
              { tradingName: { contains: query.search, mode: "insensitive" } },
              { supplierCode: { contains: query.search, mode: "insensitive" } },
              { accountNumber: { contains: query.search, mode: "insensitive" } },
              { email: { contains: query.search, mode: "insensitive" } },
              { postcode: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const orderBy =
      query.sort === "nameAsc"
        ? [{ legalName: "asc" as const }]
        : query.sort === "nameDesc"
          ? [{ legalName: "desc" as const }]
          : query.sort === "createdAtDesc"
            ? [{ createdAt: "desc" as const }]
            : query.sort === "leadTimeAsc"
              ? [{ typicalLeadTimeDays: "asc" as const }, { legalName: "asc" as const }]
              : [{ updatedAt: "desc" as const }];

    const [items, total] = await this.prisma.client.$transaction([
      this.prisma.client.supplier.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          contacts: {
            where: { status: { not: SupplierStatus.ARCHIVED } },
            orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
            take: 1,
          },
          _count: {
            select: {
              supplierProducts: true,
            },
          },
        },
      }),
      this.prisma.client.supplier.count({ where }),
    ]);

    return {
      items,
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    };
  }

  async getSupplier(tenantId: string, supplierId: string) {
    return this.prisma.client.supplier.findFirstOrThrow({
      where: { id: supplierId, tenantId },
      include: {
        branch: { select: { id: true, name: true } },
        contacts: {
          orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
        },
        supplierProducts: {
          orderBy: [{ preferredSupplier: "desc" }, { supplierSku: "asc" }],
          include: {
            product: {
              select: { id: true, name: true, sku: true },
            },
            variant: {
              select: { id: true, name: true, sku: true },
            },
            supplierUnit: {
              select: { id: true, name: true, code: true, symbol: true },
            },
          },
        },
      },
    });
  }

  async createSupplier(tenantId: string, userId: string, input: SupplierInput) {
    return this.prisma.client.supplier.create({
      data: this.toSupplierCreateData(tenantId, userId, input),
      include: {
        branch: { select: { id: true, name: true } },
      },
    });
  }

  async updateSupplier(
    tenantId: string,
    userId: string,
    supplierId: string,
    input: Partial<SupplierInput>,
  ) {
    await this.ensureSupplier(tenantId, supplierId);
    return this.prisma.client.supplier.update({
      where: { id: supplierId },
      data: this.toSupplierUpdateData(userId, input),
      include: {
        branch: { select: { id: true, name: true } },
      },
    });
  }

  async setSupplierStatus(
    tenantId: string,
    userId: string,
    supplierId: string,
    status: SupplierStatus,
  ) {
    await this.ensureSupplier(tenantId, supplierId);
    return this.prisma.client.supplier.update({
      where: { id: supplierId },
      data: {
        status,
        updatedById: userId,
      },
    });
  }

  async listContacts(tenantId: string, supplierId: string) {
    await this.ensureSupplier(tenantId, supplierId);
    return this.prisma.client.supplierContact.findMany({
      where: { tenantId, supplierId },
      orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
    });
  }

  async createContact(
    tenantId: string,
    userId: string,
    supplierId: string,
    input: SupplierContactInput,
  ) {
    await this.ensureSupplierIsActive(tenantId, supplierId);

    return this.prisma.client.$transaction(async (tx) => {
      if (input.isPrimary) {
        await tx.supplierContact.updateMany({
          where: { tenantId, supplierId },
          data: { isPrimary: false, updatedById: userId },
        });
      }

      const contact = await tx.supplierContact.create({
        data: {
          tenantId,
          supplierId,
          branchId: input.branchId ?? null,
          name: input.name,
          jobTitle: input.jobTitle ?? null,
          email: input.email ?? null,
          telephone: input.telephone ?? null,
          mobile: input.mobile ?? null,
          isPrimary: input.isPrimary ?? false,
          isOrderingContact: input.isOrderingContact ?? false,
          isAccountsContact: input.isAccountsContact ?? false,
          isTechnicalContact: input.isTechnicalContact ?? false,
          notes: input.notes ?? null,
          status: input.status ?? SupplierStatus.ACTIVE,
          createdById: userId,
        },
      });

      const contacts = await tx.supplierContact.findMany({
        where: { tenantId, supplierId, status: { not: SupplierStatus.ARCHIVED } },
        select: { id: true, isPrimary: true },
      });
      assertSinglePrimaryContact(contacts, contact.isPrimary ? contact.id : null);
      return contact;
    });
  }

  async updateContact(
    tenantId: string,
    userId: string,
    supplierId: string,
    contactId: string,
    input: Partial<SupplierContactInput>,
  ) {
    await this.ensureSupplier(tenantId, supplierId);
    await this.ensureContact(tenantId, supplierId, contactId);

    return this.prisma.client.$transaction(async (tx) => {
      if (input.isPrimary) {
        await tx.supplierContact.updateMany({
          where: { tenantId, supplierId },
          data: { isPrimary: false, updatedById: userId },
        });
      }

      const updated = await tx.supplierContact.update({
        where: { id: contactId },
        data: {
          ...(input.branchId !== undefined ? { branchId: input.branchId } : {}),
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.jobTitle !== undefined ? { jobTitle: input.jobTitle } : {}),
          ...(input.email !== undefined ? { email: input.email } : {}),
          ...(input.telephone !== undefined ? { telephone: input.telephone } : {}),
          ...(input.mobile !== undefined ? { mobile: input.mobile } : {}),
          ...(input.isPrimary !== undefined ? { isPrimary: input.isPrimary } : {}),
          ...(input.isOrderingContact !== undefined
            ? { isOrderingContact: input.isOrderingContact }
            : {}),
          ...(input.isAccountsContact !== undefined
            ? { isAccountsContact: input.isAccountsContact }
            : {}),
          ...(input.isTechnicalContact !== undefined
            ? { isTechnicalContact: input.isTechnicalContact }
            : {}),
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          updatedById: userId,
        },
      });

      const contacts = await tx.supplierContact.findMany({
        where: { tenantId, supplierId, status: { not: SupplierStatus.ARCHIVED } },
        select: { id: true, isPrimary: true },
      });
      assertSinglePrimaryContact(contacts, updated.isPrimary ? updated.id : null);
      return updated;
    });
  }

  async setContactStatus(
    tenantId: string,
    userId: string,
    supplierId: string,
    contactId: string,
    status: SupplierStatus,
  ) {
    await this.ensureContact(tenantId, supplierId, contactId);
    return this.prisma.client.supplierContact.update({
      where: { id: contactId },
      data: {
        status,
        ...(status === SupplierStatus.ARCHIVED ? { isPrimary: false } : {}),
        updatedById: userId,
      },
    });
  }

  async listSupplierProducts(tenantId: string, supplierId: string) {
    await this.ensureSupplier(tenantId, supplierId);
    return this.prisma.client.supplierProduct.findMany({
      where: { tenantId, supplierId },
      orderBy: [{ preferredSupplier: "desc" }, { supplierSku: "asc" }],
      include: {
        product: {
          select: { id: true, name: true, sku: true, lifecycleStatus: true },
        },
        variant: {
          select: { id: true, name: true, sku: true, lifecycleStatus: true },
        },
        supplierUnit: {
          select: { id: true, name: true, code: true, symbol: true },
        },
      },
    });
  }

  async getSupplierProduct(
    tenantId: string,
    supplierId: string,
    supplierProductId: string,
  ) {
    return this.prisma.client.supplierProduct.findFirstOrThrow({
      where: { id: supplierProductId, tenantId, supplierId },
      include: {
        product: {
          select: { id: true, name: true, sku: true, lifecycleStatus: true },
        },
        variant: {
          select: { id: true, name: true, sku: true, lifecycleStatus: true },
        },
        supplierUnit: {
          select: { id: true, name: true, code: true, symbol: true },
        },
      },
    });
  }

  async createSupplierProduct(
    tenantId: string,
    userId: string,
    supplierId: string,
    input: SupplierProductInput,
  ) {
    const supplier = await this.ensureSupplierIsActive(tenantId, supplierId);
    const validated = await this.validateSupplierProductReferences(tenantId, input);
    if (supplier.status === SupplierStatus.ARCHIVED) {
      throw new BadRequestException(
        "Archived suppliers cannot receive new product links.",
      );
    }

    return this.prisma.client.supplierProduct.create({
      data: {
        tenantId,
        supplierId,
        ...validated,
        createdById: userId,
      },
      include: {
        product: { select: { id: true, name: true, sku: true, lifecycleStatus: true } },
        variant: { select: { id: true, name: true, sku: true, lifecycleStatus: true } },
        supplierUnit: {
          select: { id: true, name: true, code: true, symbol: true },
        },
      },
    });
  }

  async updateSupplierProduct(
    tenantId: string,
    userId: string,
    supplierId: string,
    supplierProductId: string,
    input: Partial<SupplierProductInput>,
  ) {
    const existing = await this.ensureSupplierProduct(
      tenantId,
      supplierId,
      supplierProductId,
    );
    const validated = await this.validateSupplierProductReferences(tenantId, {
      productId: input.productId ?? existing.productId,
      variantId:
        input.variantId === undefined ? existing.variantId : input.variantId,
      supplierUnitId:
        input.supplierUnitId === undefined
          ? existing.supplierUnitId
          : input.supplierUnitId,
      supplierSku: input.supplierSku ?? existing.supplierSku,
      supplierDescription:
        input.supplierDescription === undefined
          ? existing.supplierDescription
          : input.supplierDescription,
      packQuantity:
        input.packQuantity === undefined ? existing.packQuantity : input.packQuantity,
      packCoverageM2:
        input.packCoverageM2 === undefined
          ? existing.packCoverageM2
          : input.packCoverageM2,
      rollWidthM: input.rollWidthM === undefined ? existing.rollWidthM : input.rollWidthM,
      standardRollLengthM:
        input.standardRollLengthM === undefined
          ? existing.standardRollLengthM
          : input.standardRollLengthM,
      minimumOrderQty:
        input.minimumOrderQty === undefined
          ? existing.minimumOrderQty
          : input.minimumOrderQty,
      leadTimeDays:
        input.leadTimeDays === undefined ? existing.leadTimeDays : input.leadTimeDays,
      preferredSupplier:
        input.preferredSupplier === undefined
          ? existing.preferredSupplier
          : input.preferredSupplier,
      status: input.status === undefined ? existing.status : input.status,
      lastConfirmedAt:
        input.lastConfirmedAt === undefined
          ? existing.lastConfirmedAt
          : input.lastConfirmedAt,
      notes: input.notes === undefined ? existing.notes : input.notes,
    });

    return this.prisma.client.supplierProduct.update({
      where: { id: supplierProductId },
      data: {
        ...validated,
        updatedById: userId,
      },
      include: {
        product: { select: { id: true, name: true, sku: true, lifecycleStatus: true } },
        variant: { select: { id: true, name: true, sku: true, lifecycleStatus: true } },
        supplierUnit: {
          select: { id: true, name: true, code: true, symbol: true },
        },
      },
    });
  }

  async setSupplierProductStatus(
    tenantId: string,
    userId: string,
    supplierId: string,
    supplierProductId: string,
    status: SupplierStatus,
  ) {
    await this.ensureSupplierProduct(tenantId, supplierId, supplierProductId);
    return this.prisma.client.supplierProduct.update({
      where: { id: supplierProductId },
      data: {
        status,
        updatedById: userId,
      },
    });
  }

  async listProductSuppliers(tenantId: string, productId: string) {
    await this.ensureProduct(tenantId, productId);
    return this.prisma.client.supplierProduct.findMany({
      where: {
        tenantId,
        productId,
        status: { not: SupplierStatus.ARCHIVED },
        supplier: { status: { not: SupplierStatus.ARCHIVED } },
      },
      orderBy: [{ preferredSupplier: "desc" }, { supplierSku: "asc" }],
      include: {
        supplier: {
          select: {
            id: true,
            legalName: true,
            tradingName: true,
            supplierCode: true,
            status: true,
            preferredSupplier: true,
          },
        },
        variant: { select: { id: true, name: true, sku: true } },
        supplierUnit: {
          select: { id: true, name: true, code: true, symbol: true },
        },
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

  private toSupplierCreateData(
    tenantId: string,
    userId: string,
    input: SupplierInput,
  ) {
    return {
      tenantId,
      branchId: input.branchId ?? null,
      legalName: input.legalName.trim(),
      tradingName: input.tradingName ?? null,
      supplierCode: normalizeSupplierCode(input.supplierCode),
      accountNumber: input.accountNumber ?? null,
      companyRegistrationNumber: input.companyRegistrationNumber ?? null,
      vatRegistrationNumber: input.vatRegistrationNumber ?? null,
      email: input.email ?? null,
      telephone: input.telephone ?? null,
      website: input.website ?? null,
      addressLine1: input.addressLine1 ?? null,
      addressLine2: input.addressLine2 ?? null,
      city: input.city ?? null,
      county: input.county ?? null,
      postcode: normalizeUkPostcode(input.postcode),
      countryCode: input.countryCode ?? "GB",
      paymentTermsDescription: input.paymentTermsDescription ?? null,
      creditLimit: input.creditLimit ?? null,
      defaultCurrency: input.defaultCurrency ?? "GBP",
      typicalLeadTimeDays: input.typicalLeadTimeDays ?? null,
      minimumOrderNotes: input.minimumOrderNotes ?? null,
      deliveryNotes: input.deliveryNotes ?? null,
      returnPolicyNotes: input.returnPolicyNotes ?? null,
      preferredSupplier: input.preferredSupplier ?? false,
      status: input.status ?? SupplierStatus.ACTIVE,
      internalNotes: input.internalNotes ?? null,
      createdById: userId,
    };
  }

  private toSupplierUpdateData(userId: string, input: Partial<SupplierInput>) {
    return {
      ...(input.branchId !== undefined ? { branchId: input.branchId } : {}),
      ...(input.legalName !== undefined ? { legalName: input.legalName.trim() } : {}),
      ...(input.tradingName !== undefined ? { tradingName: input.tradingName } : {}),
      ...(input.supplierCode !== undefined
        ? { supplierCode: normalizeSupplierCode(input.supplierCode) }
        : {}),
      ...(input.accountNumber !== undefined
        ? { accountNumber: input.accountNumber }
        : {}),
      ...(input.companyRegistrationNumber !== undefined
        ? { companyRegistrationNumber: input.companyRegistrationNumber }
        : {}),
      ...(input.vatRegistrationNumber !== undefined
        ? { vatRegistrationNumber: input.vatRegistrationNumber }
        : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.telephone !== undefined ? { telephone: input.telephone } : {}),
      ...(input.website !== undefined ? { website: input.website } : {}),
      ...(input.addressLine1 !== undefined ? { addressLine1: input.addressLine1 } : {}),
      ...(input.addressLine2 !== undefined ? { addressLine2: input.addressLine2 } : {}),
      ...(input.city !== undefined ? { city: input.city } : {}),
      ...(input.county !== undefined ? { county: input.county } : {}),
      ...(input.postcode !== undefined
        ? { postcode: normalizeUkPostcode(input.postcode) }
        : {}),
      ...(input.countryCode !== undefined ? { countryCode: input.countryCode } : {}),
      ...(input.paymentTermsDescription !== undefined
        ? { paymentTermsDescription: input.paymentTermsDescription }
        : {}),
      ...(input.creditLimit !== undefined ? { creditLimit: input.creditLimit } : {}),
      ...(input.defaultCurrency !== undefined
        ? { defaultCurrency: input.defaultCurrency }
        : {}),
      ...(input.typicalLeadTimeDays !== undefined
        ? { typicalLeadTimeDays: input.typicalLeadTimeDays }
        : {}),
      ...(input.minimumOrderNotes !== undefined
        ? { minimumOrderNotes: input.minimumOrderNotes }
        : {}),
      ...(input.deliveryNotes !== undefined ? { deliveryNotes: input.deliveryNotes } : {}),
      ...(input.returnPolicyNotes !== undefined
        ? { returnPolicyNotes: input.returnPolicyNotes }
        : {}),
      ...(input.preferredSupplier !== undefined
        ? { preferredSupplier: input.preferredSupplier }
        : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.internalNotes !== undefined ? { internalNotes: input.internalNotes } : {}),
      updatedById: userId,
    };
  }

  private async validateSupplierProductReferences(
    tenantId: string,
    input: SupplierProductInput,
  ) {
    const product = await this.prisma.client.product.findFirstOrThrow({
      where: { id: input.productId, tenantId },
      select: { id: true, lifecycleStatus: true },
    });

    const variant = input.variantId
      ? await this.prisma.client.productVariant.findFirstOrThrow({
          where: { id: input.variantId, tenantId },
          select: { id: true, productId: true, lifecycleStatus: true },
        })
      : null;

    if (variant) {
      assertVariantMatchesProduct(product.id, variant.productId);
    }

    if (product.lifecycleStatus === "ARCHIVED") {
      throw new BadRequestException("Archived products cannot be linked.");
    }

    const supplierUnitId = input.supplierUnitId
      ? await this.prisma.client.unitOfMeasure.findFirstOrThrow({
          where: { id: input.supplierUnitId, tenantId },
          select: { id: true, status: true },
        }).then((record) => {
          if (record.status === "ARCHIVED") {
            throw new BadRequestException("Archived units cannot be linked.");
          }
          return record.id;
        })
      : null;

    return {
      productId: product.id,
      variantId: variant?.id ?? null,
      supplierUnitId,
      supplierSku: input.supplierSku.trim(),
      supplierDescription: input.supplierDescription ?? null,
      packQuantity: input.packQuantity ?? null,
      packCoverageM2: input.packCoverageM2 ?? null,
      rollWidthM: input.rollWidthM ?? null,
      standardRollLengthM: input.standardRollLengthM ?? null,
      minimumOrderQty: input.minimumOrderQty ?? null,
      leadTimeDays: input.leadTimeDays ?? null,
      preferredSupplier: input.preferredSupplier ?? false,
      status: input.status ?? SupplierStatus.ACTIVE,
      lastConfirmedAt: input.lastConfirmedAt ?? null,
      notes: input.notes ?? null,
    };
  }

  private async ensureSupplier(tenantId: string, supplierId: string) {
    return this.prisma.client.supplier.findFirstOrThrow({
      where: { id: supplierId, tenantId },
    });
  }

  private async ensureSupplierIsActive(tenantId: string, supplierId: string) {
    const supplier = await this.ensureSupplier(tenantId, supplierId);
    if (supplier.status === SupplierStatus.ARCHIVED) {
      throw new BadRequestException("Archived suppliers cannot be modified.");
    }
    return supplier;
  }

  private ensureContact(tenantId: string, supplierId: string, contactId: string) {
    return this.prisma.client.supplierContact.findFirstOrThrow({
      where: { id: contactId, tenantId, supplierId },
    });
  }

  private ensureSupplierProduct(
    tenantId: string,
    supplierId: string,
    supplierProductId: string,
  ) {
    return this.prisma.client.supplierProduct.findFirstOrThrow({
      where: { id: supplierProductId, tenantId, supplierId },
    });
  }

  private ensureProduct(tenantId: string, productId: string) {
    return this.prisma.client.product.findFirstOrThrow({
      where: { id: productId, tenantId },
      select: { id: true },
    });
  }
}

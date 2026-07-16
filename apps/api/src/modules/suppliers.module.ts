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
import { SupplierStatus } from "@prisma/client";
import { z } from "zod";
import { BranchAccessService } from "../services/branch-access.service";
import { SuppliersService } from "../services/suppliers.service";
import { TenantAccessService } from "../services/tenant-access.service";
import { AuthGuard } from "../shared/auth.guard";
import { RequirePermissions } from "../shared/permissions.decorator";
import { PermissionsGuard } from "../shared/permissions.guard";
import { CurrentSession } from "../shared/session.decorator";

const emptyStringToNull = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? null : value;

const decimalField = z.coerce.number().nonnegative().nullable().optional();
const positiveDecimalField = z.coerce.number().positive().nullable().optional();

const supplierSchema = z.object({
  branchId: z.string().uuid().nullable().optional(),
  legalName: z.string().min(2),
  tradingName: z.preprocess(emptyStringToNull, z.string().min(2).nullable()).optional(),
  supplierCode: z.string().min(2).max(40),
  accountNumber: z.preprocess(emptyStringToNull, z.string().max(80).nullable()).optional(),
  companyRegistrationNumber: z.preprocess(
    emptyStringToNull,
    z.string().max(80).nullable(),
  ).optional(),
  vatRegistrationNumber: z.preprocess(
    emptyStringToNull,
    z.string().max(80).nullable(),
  ).optional(),
  email: z.preprocess(emptyStringToNull, z.string().email().nullable()).optional(),
  telephone: z.preprocess(emptyStringToNull, z.string().max(40).nullable()).optional(),
  website: z.preprocess(emptyStringToNull, z.string().url().nullable()).optional(),
  addressLine1: z.preprocess(emptyStringToNull, z.string().max(120).nullable()).optional(),
  addressLine2: z.preprocess(emptyStringToNull, z.string().max(120).nullable()).optional(),
  city: z.preprocess(emptyStringToNull, z.string().max(80).nullable()).optional(),
  county: z.preprocess(emptyStringToNull, z.string().max(80).nullable()).optional(),
  postcode: z.preprocess(emptyStringToNull, z.string().max(16).nullable()).optional(),
  countryCode: z.string().min(2).max(2).optional(),
  paymentTermsDescription: z.preprocess(
    emptyStringToNull,
    z.string().max(200).nullable(),
  ).optional(),
  creditLimit: decimalField,
  defaultCurrency: z.string().min(3).max(3).optional(),
  typicalLeadTimeDays: z.coerce.number().int().nonnegative().nullable().optional(),
  minimumOrderNotes: z.preprocess(
    emptyStringToNull,
    z.string().max(400).nullable(),
  ).optional(),
  deliveryNotes: z.preprocess(emptyStringToNull, z.string().max(400).nullable()).optional(),
  returnPolicyNotes: z.preprocess(
    emptyStringToNull,
    z.string().max(400).nullable(),
  ).optional(),
  preferredSupplier: z.boolean().optional(),
  status: z.nativeEnum(SupplierStatus).optional(),
  internalNotes: z.preprocess(emptyStringToNull, z.string().max(1000).nullable()).optional(),
});

const supplierContactSchema = z.object({
  branchId: z.string().uuid().nullable().optional(),
  name: z.string().min(2).max(120),
  jobTitle: z.preprocess(emptyStringToNull, z.string().max(120).nullable()).optional(),
  email: z.preprocess(emptyStringToNull, z.string().email().nullable()).optional(),
  telephone: z.preprocess(emptyStringToNull, z.string().max(40).nullable()).optional(),
  mobile: z.preprocess(emptyStringToNull, z.string().max(40).nullable()).optional(),
  isPrimary: z.boolean().optional(),
  isOrderingContact: z.boolean().optional(),
  isAccountsContact: z.boolean().optional(),
  isTechnicalContact: z.boolean().optional(),
  notes: z.preprocess(emptyStringToNull, z.string().max(600).nullable()).optional(),
  status: z.nativeEnum(SupplierStatus).optional(),
});

const supplierProductSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().nullable().optional(),
  supplierUnitId: z.string().uuid().nullable().optional(),
  supplierSku: z.string().min(1).max(80),
  supplierDescription: z.preprocess(
    emptyStringToNull,
    z.string().max(240).nullable(),
  ).optional(),
  packQuantity: positiveDecimalField,
  packCoverageM2: positiveDecimalField,
  rollWidthM: positiveDecimalField,
  standardRollLengthM: positiveDecimalField,
  minimumOrderQty: decimalField,
  leadTimeDays: z.coerce.number().int().nonnegative().nullable().optional(),
  preferredSupplier: z.boolean().optional(),
  status: z.nativeEnum(SupplierStatus).optional(),
  lastConfirmedAt: z.coerce.date().nullable().optional(),
  notes: z.preprocess(emptyStringToNull, z.string().max(600).nullable()).optional(),
});

const supplierListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  status: z.nativeEnum(SupplierStatus).optional(),
  preferred: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  countryCode: z.string().min(2).max(2).optional(),
  includeArchived: z.coerce.boolean().default(false),
  sort: z
    .enum(["nameAsc", "nameDesc", "createdAtDesc", "updatedAtDesc", "leadTimeAsc"])
    .default("updatedAtDesc"),
});

type TenantSession = Parameters<TenantAccessService["ensureTenant"]>[0];
type CreateSupplierInput = Parameters<SuppliersService["createSupplier"]>[2];
type UpdateSupplierInput = Parameters<SuppliersService["updateSupplier"]>[3];
type CreateSupplierContactInput = Parameters<SuppliersService["createContact"]>[3];
type UpdateSupplierContactInput = Parameters<SuppliersService["updateContact"]>[4];
type CreateSupplierProductInput = Parameters<SuppliersService["createSupplierProduct"]>[3];
type UpdateSupplierProductInput = Parameters<SuppliersService["updateSupplierProduct"]>[4];

const stripUndefined = <T extends Record<string, unknown>>(value: T) =>
  Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as Partial<T>;

@Controller({ path: "suppliers", version: "1" })
class SuppliersController {
  constructor(
    private readonly tenantAccess: TenantAccessService,
    private readonly branchAccess: BranchAccessService,
    private readonly suppliers: SuppliersService,
  ) {}

  @Get()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("suppliers.view")
  list(
    @Query() query: Record<string, string | string[] | undefined>,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    return this.suppliers.listSuppliers(tenantId, supplierListQuerySchema.parse(query));
  }

  @Get(":supplierId")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("suppliers.view")
  get(
    @Param("supplierId") supplierId: string,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    return this.suppliers.getSupplier(tenantId, supplierId);
  }

  @Post()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("suppliers.manage")
  async create(@Body() body: unknown, @CurrentSession() session: TenantSession) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const input = supplierSchema.parse(body);
    const branchId =
      input.branchId === undefined
        ? undefined
        : input.branchId
          ? await this.branchAccess.ensureAuthorizedBranch(session, input.branchId, tenantId)
          : null;
    const supplierInput: CreateSupplierInput = {
      ...input,
      branchId,
    };
    const record = await this.suppliers.createSupplier(
      tenantId,
      session.user.id,
      supplierInput,
    );
    await this.suppliers.auditAction(
      tenantId,
      session.user.id,
      "supplier.create",
      "supplier",
      record.id,
      input,
    );
    return record;
  }

  @Patch(":supplierId")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("suppliers.manage")
  async update(
    @Param("supplierId") supplierId: string,
    @Body() body: unknown,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const input = supplierSchema.partial().parse(body);
    const branchId =
      input.branchId === undefined
        ? undefined
        : input.branchId
          ? await this.branchAccess.ensureAuthorizedBranch(session, input.branchId, tenantId)
          : null;
    const previous = await this.suppliers.getSupplier(tenantId, supplierId);
    const supplierInput = stripUndefined({
      ...input,
      branchId,
    }) as UpdateSupplierInput;
    const record = await this.suppliers.updateSupplier(
      tenantId,
      session.user.id,
      supplierId,
      supplierInput,
    );
    await this.suppliers.auditAction(
      tenantId,
      session.user.id,
      "supplier.update",
      "supplier",
      record.id,
      input,
      previous,
    );
    return record;
  }

  @Patch(":supplierId/archive")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("suppliers.archive")
  async archive(
    @Param("supplierId") supplierId: string,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const record = await this.suppliers.setSupplierStatus(
      tenantId,
      session.user.id,
      supplierId,
      SupplierStatus.ARCHIVED,
    );
    await this.suppliers.auditAction(
      tenantId,
      session.user.id,
      "supplier.archive",
      "supplier",
      record.id,
      { status: SupplierStatus.ARCHIVED },
    );
    return record;
  }

  @Patch(":supplierId/restore")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("suppliers.archive")
  async restore(
    @Param("supplierId") supplierId: string,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const record = await this.suppliers.setSupplierStatus(
      tenantId,
      session.user.id,
      supplierId,
      SupplierStatus.ACTIVE,
    );
    await this.suppliers.auditAction(
      tenantId,
      session.user.id,
      "supplier.restore",
      "supplier",
      record.id,
      { status: SupplierStatus.ACTIVE },
    );
    return record;
  }

  @Get(":supplierId/contacts")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("suppliers.view")
  listContacts(
    @Param("supplierId") supplierId: string,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    return this.suppliers.listContacts(tenantId, supplierId);
  }

  @Post(":supplierId/contacts")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("suppliers.contacts.manage")
  async createContact(
    @Param("supplierId") supplierId: string,
    @Body() body: unknown,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const input = supplierContactSchema.parse(body);
    const branchId =
      input.branchId === undefined
        ? undefined
        : input.branchId
          ? await this.branchAccess.ensureAuthorizedBranch(session, input.branchId, tenantId)
          : null;
    const contactInput: CreateSupplierContactInput = {
      ...input,
      branchId,
    };
    const record = await this.suppliers.createContact(
      tenantId,
      session.user.id,
      supplierId,
      contactInput,
    );
    await this.suppliers.auditAction(
      tenantId,
      session.user.id,
      "supplier.contact.create",
      "supplierContact",
      record.id,
      contactInput,
    );
    return record;
  }

  @Patch(":supplierId/contacts/:contactId")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("suppliers.contacts.manage")
  async updateContact(
    @Param("supplierId") supplierId: string,
    @Param("contactId") contactId: string,
    @Body() body: unknown,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const input = supplierContactSchema.partial().parse(body);
    const branchId =
      input.branchId === undefined
        ? undefined
        : input.branchId
          ? await this.branchAccess.ensureAuthorizedBranch(session, input.branchId, tenantId)
          : null;
    const contactInput = stripUndefined({
      ...input,
      branchId,
    }) as UpdateSupplierContactInput;
    const record = await this.suppliers.updateContact(
      tenantId,
      session.user.id,
      supplierId,
      contactId,
      contactInput,
    );
    await this.suppliers.auditAction(
      tenantId,
      session.user.id,
      "supplier.contact.update",
      "supplierContact",
      record.id,
      input,
    );
    return record;
  }

  @Patch(":supplierId/contacts/:contactId/archive")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("suppliers.contacts.manage")
  async archiveContact(
    @Param("supplierId") supplierId: string,
    @Param("contactId") contactId: string,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const record = await this.suppliers.setContactStatus(
      tenantId,
      session.user.id,
      supplierId,
      contactId,
      SupplierStatus.ARCHIVED,
    );
    await this.suppliers.auditAction(
      tenantId,
      session.user.id,
      "supplier.contact.archive",
      "supplierContact",
      record.id,
      { status: SupplierStatus.ARCHIVED },
    );
    return record;
  }

  @Patch(":supplierId/contacts/:contactId/restore")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("suppliers.contacts.manage")
  async restoreContact(
    @Param("supplierId") supplierId: string,
    @Param("contactId") contactId: string,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const record = await this.suppliers.setContactStatus(
      tenantId,
      session.user.id,
      supplierId,
      contactId,
      SupplierStatus.ACTIVE,
    );
    await this.suppliers.auditAction(
      tenantId,
      session.user.id,
      "supplier.contact.restore",
      "supplierContact",
      record.id,
      { status: SupplierStatus.ACTIVE },
    );
    return record;
  }

  @Get(":supplierId/products")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("suppliers.view")
  listSupplierProducts(
    @Param("supplierId") supplierId: string,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    return this.suppliers.listSupplierProducts(tenantId, supplierId);
  }

  @Get(":supplierId/products/:supplierProductId")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("suppliers.view")
  getSupplierProduct(
    @Param("supplierId") supplierId: string,
    @Param("supplierProductId") supplierProductId: string,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    return this.suppliers.getSupplierProduct(tenantId, supplierId, supplierProductId);
  }

  @Post(":supplierId/products")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("suppliers.products.manage")
  async createSupplierProduct(
    @Param("supplierId") supplierId: string,
    @Body() body: unknown,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const input = supplierProductSchema.parse(body);
    const supplierProductInput: CreateSupplierProductInput = input;
    const record = await this.suppliers.createSupplierProduct(
      tenantId,
      session.user.id,
      supplierId,
      supplierProductInput,
    );
    await this.suppliers.auditAction(
      tenantId,
      session.user.id,
      "supplier.product.link",
      "supplierProduct",
      record.id,
      input,
    );
    return record;
  }

  @Patch(":supplierId/products/:supplierProductId")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("suppliers.products.manage")
  async updateSupplierProduct(
    @Param("supplierId") supplierId: string,
    @Param("supplierProductId") supplierProductId: string,
    @Body() body: unknown,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const input = supplierProductSchema.partial().parse(body);
    const supplierProductInput =
      stripUndefined(input) as UpdateSupplierProductInput;
    const record = await this.suppliers.updateSupplierProduct(
      tenantId,
      session.user.id,
      supplierId,
      supplierProductId,
      supplierProductInput,
    );
    await this.suppliers.auditAction(
      tenantId,
      session.user.id,
      "supplier.product.update",
      "supplierProduct",
      record.id,
      input,
    );
    return record;
  }

  @Patch(":supplierId/products/:supplierProductId/archive")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("suppliers.products.manage")
  async archiveSupplierProduct(
    @Param("supplierId") supplierId: string,
    @Param("supplierProductId") supplierProductId: string,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const record = await this.suppliers.setSupplierProductStatus(
      tenantId,
      session.user.id,
      supplierId,
      supplierProductId,
      SupplierStatus.ARCHIVED,
    );
    await this.suppliers.auditAction(
      tenantId,
      session.user.id,
      "supplier.product.archive",
      "supplierProduct",
      record.id,
      { status: SupplierStatus.ARCHIVED },
    );
    return record;
  }

  @Patch(":supplierId/products/:supplierProductId/restore")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("suppliers.products.manage")
  async restoreSupplierProduct(
    @Param("supplierId") supplierId: string,
    @Param("supplierProductId") supplierProductId: string,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const record = await this.suppliers.setSupplierProductStatus(
      tenantId,
      session.user.id,
      supplierId,
      supplierProductId,
      SupplierStatus.ACTIVE,
    );
    await this.suppliers.auditAction(
      tenantId,
      session.user.id,
      "supplier.product.restore",
      "supplierProduct",
      record.id,
      { status: SupplierStatus.ACTIVE },
    );
    return record;
  }
}

@Controller({ path: "catalogue/products", version: "1" })
class ProductSuppliersController {
  constructor(
    private readonly tenantAccess: TenantAccessService,
    private readonly suppliers: SuppliersService,
  ) {}

  @Get(":productId/suppliers")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("catalogue.view", "suppliers.view")
  listForProduct(
    @Param("productId") productId: string,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    return this.suppliers.listProductSuppliers(tenantId, productId);
  }
}

@Module({
  controllers: [SuppliersController, ProductSuppliersController],
  providers: [SuppliersService],
})
export class SuppliersModule {}

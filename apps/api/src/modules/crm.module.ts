import {
  Body,
  Controller,
  Get,
  Module,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { z } from "zod";
import { AuthGuard } from "../shared/auth.guard";
import { RequirePermissions } from "../shared/permissions.decorator";
import { PermissionsGuard } from "../shared/permissions.guard";
import { CurrentSession } from "../shared/session.decorator";
import { AuditService } from "../services/audit.service";
import { BranchAccessService } from "../services/branch-access.service";
import { PrismaService } from "../services/prisma.service";
import { TenantAccessService } from "../services/tenant-access.service";

const branchIdSchema = z.string().uuid().optional();
const emptyStringToNull = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? null : value;

const leadSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  companyName: z.preprocess(emptyStringToNull, z.string().min(1).nullable()).optional(),
  email: z.preprocess(
    emptyStringToNull,
    z.string().email().nullable(),
  ).optional(),
  phone: z.preprocess(emptyStringToNull, z.string().min(3).nullable()).optional(),
  source: z.preprocess(emptyStringToNull, z.string().min(2).nullable()).optional(),
  notes: z.preprocess(emptyStringToNull, z.string().min(2).nullable()).optional(),
  addressLine1: z.preprocess(emptyStringToNull, z.string().min(2).nullable()).optional(),
  addressLine2: z.preprocess(emptyStringToNull, z.string().min(2).nullable()).optional(),
  city: z.preprocess(emptyStringToNull, z.string().min(2).nullable()).optional(),
  postcode: z.preprocess(emptyStringToNull, z.string().min(2).nullable()).optional(),
  countryCode: z.string().min(2).max(2).optional(),
  branchId: branchIdSchema,
  status: z
    .enum([
      "NEW",
      "QUALIFIED",
      "SURVEY_BOOKED",
      "QUOTED",
      "WON",
      "LOST",
      "ARCHIVED",
    ])
    .optional(),
});

const customerSchema = z.object({
  displayName: z.string().min(2),
  companyName: z.preprocess(emptyStringToNull, z.string().min(1).nullable()).optional(),
  primaryEmail: z.preprocess(
    emptyStringToNull,
    z.string().email().nullable(),
  ).optional(),
  primaryPhone: z.preprocess(emptyStringToNull, z.string().min(3).nullable()).optional(),
  notes: z.preprocess(emptyStringToNull, z.string().min(2).nullable()).optional(),
  branchId: branchIdSchema,
  customerType: z.enum(["RESIDENTIAL", "COMMERCIAL"]).optional(),
});

const siteSchema = z.object({
  customerId: z.string().uuid(),
  label: z.string().min(2),
  branchId: branchIdSchema,
  siteType: z
    .enum(["RESIDENTIAL", "COMMERCIAL", "MIXED_USE", "OTHER"])
    .optional(),
  addressLine1: z.preprocess(emptyStringToNull, z.string().min(2).nullable()).optional(),
  addressLine2: z.preprocess(emptyStringToNull, z.string().min(2).nullable()).optional(),
  city: z.preprocess(emptyStringToNull, z.string().min(2).nullable()).optional(),
  county: z.preprocess(emptyStringToNull, z.string().min(2).nullable()).optional(),
  postcode: z.preprocess(emptyStringToNull, z.string().min(2).nullable()).optional(),
  countryCode: z.string().min(2).max(2).optional(),
  accessNotes: z.preprocess(emptyStringToNull, z.string().min(2).nullable()).optional(),
  occupancyStatus: z.enum(["OCCUPIED", "UNOCCUPIED", "NEW_BUILD", "UNDER_RENOVATION"]).optional(),
});

const leadConversionSchema = z.object({
  customerType: z.enum(["RESIDENTIAL", "COMMERCIAL"]).optional(),
  siteType: z
    .enum(["RESIDENTIAL", "COMMERCIAL", "MIXED_USE", "OTHER"])
    .optional(),
  siteLabel: z.preprocess(emptyStringToNull, z.string().min(2).nullable()).optional(),
});

type TenantSession = Parameters<TenantAccessService["ensureTenant"]>[0];

@Controller({ path: "leads", version: "1" })
class LeadsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantAccess: TenantAccessService,
    private readonly audit: AuditService,
    private readonly branchAccess: BranchAccessService,
  ) {}

  @Get()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("leads.view")
  async list(@CurrentSession() session: TenantSession) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    return this.prisma.client.lead.findMany({
      where: {
        tenantId,
        ...this.branchAccess.branchWhere(session, tenantId),
      },
      orderBy: { createdAt: "desc" },
      include: {
        branch: { select: { id: true, name: true } },
        convertedCustomer: { select: { id: true, displayName: true } },
        convertedSite: { select: { id: true, label: true } },
      },
    });
  }

  @Post()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("leads.manage")
  async create(@Body() body: unknown, @CurrentSession() session: TenantSession) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const input = leadSchema.parse(body);
    const branchId = await this.branchAccess.resolveCreateBranchId(
      session,
      input.branchId,
      tenantId,
    );
    const lead = await this.prisma.client.lead.create({
      data: {
        tenantId,
        branchId,
        status: input.status ?? "NEW",
        firstName: input.firstName,
        lastName: input.lastName,
        companyName: input.companyName ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
        source: input.source ?? null,
        notes: input.notes ?? null,
        addressLine1: input.addressLine1 ?? null,
        addressLine2: input.addressLine2 ?? null,
        city: input.city ?? null,
        postcode: input.postcode ?? null,
        countryCode: input.countryCode ?? "GB",
      },
      include: {
        branch: { select: { id: true, name: true } },
      },
    });

    await this.audit.record({
      tenantId,
      actorUserId: session.user.id,
      action: "lead.create",
      entityType: "lead",
      entityId: lead.id,
      newValues: input,
    });

    return lead;
  }

  @Patch(":leadId")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("leads.manage")
  async update(
    @Param("leadId") leadId: string,
    @Body() body: unknown,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const input = leadSchema.partial().parse(body);
    const previous = await this.prisma.client.lead.findFirstOrThrow({
      where: {
        id: leadId,
        tenantId,
        ...this.branchAccess.branchWhere(session, tenantId),
      },
    });
    const branchId =
      input.branchId === undefined
        ? undefined
        : await this.branchAccess.resolveCreateBranchId(
            session,
            input.branchId,
            tenantId,
          );
    const lead = await this.prisma.client.lead.update({
      where: { id: leadId },
      data: {
        ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
        ...(input.lastName !== undefined ? { lastName: input.lastName } : {}),
        ...(input.companyName !== undefined ? { companyName: input.companyName } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.source !== undefined ? { source: input.source } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.addressLine1 !== undefined ? { addressLine1: input.addressLine1 } : {}),
        ...(input.addressLine2 !== undefined ? { addressLine2: input.addressLine2 } : {}),
        ...(input.city !== undefined ? { city: input.city } : {}),
        ...(input.postcode !== undefined ? { postcode: input.postcode } : {}),
        ...(input.countryCode !== undefined ? { countryCode: input.countryCode } : {}),
        ...(branchId !== undefined ? { branchId } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
      include: {
        branch: { select: { id: true, name: true } },
        convertedCustomer: { select: { id: true, displayName: true } },
        convertedSite: { select: { id: true, label: true } },
      },
    });

    await this.audit.record({
      tenantId,
      actorUserId: session.user.id,
      action: "lead.update",
      entityType: "lead",
      entityId: lead.id,
      previousValues: previous,
      newValues: input,
    });

    return lead;
  }

  @Post(":leadId/convert")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("leads.manage", "customers.manage", "sites.manage")
  async convert(
    @Param("leadId") leadId: string,
    @Body() body: unknown,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const input = leadConversionSchema.parse(body);
    const lead = await this.prisma.client.lead.findFirstOrThrow({
      where: {
        id: leadId,
        tenantId,
        ...this.branchAccess.branchWhere(session, tenantId),
      },
    });

    const result = await this.prisma.client.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: {
          tenantId,
          branchId: lead.branchId,
          customerType:
            input.customerType ??
            (lead.companyName ? "COMMERCIAL" : "RESIDENTIAL"),
          displayName: lead.companyName ?? `${lead.firstName} ${lead.lastName}`,
          companyName: lead.companyName ?? null,
          primaryEmail: lead.email ?? null,
          primaryPhone: lead.phone ?? null,
          notes: lead.notes ?? null,
        },
      });

      const site = await tx.site.create({
        data: {
          tenantId,
          customerId: customer.id,
          branchId: lead.branchId,
          siteType: input.siteType ?? "RESIDENTIAL",
          label:
            input.siteLabel ??
            [lead.lastName, "site"].filter(Boolean).join(" "),
          addressLine1: lead.addressLine1 ?? null,
          addressLine2: lead.addressLine2 ?? null,
          city: lead.city ?? null,
          postcode: lead.postcode ?? null,
          countryCode: lead.countryCode,
          accessNotes: null,
        },
      });

      const convertedLead = await tx.lead.update({
        where: { id: lead.id },
        data: {
          status: "WON",
          convertedAt: new Date(),
          convertedCustomerId: customer.id,
          convertedSiteId: site.id,
        },
      });

      return { customer, site, lead: convertedLead };
    });

    await this.audit.record({
      tenantId,
      actorUserId: session.user.id,
      action: "lead.convert",
      entityType: "lead",
      entityId: lead.id,
      previousValues: lead,
      newValues: result,
    });

    return result;
  }
}

@Controller({ path: "customers", version: "1" })
class CustomersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantAccess: TenantAccessService,
    private readonly audit: AuditService,
    private readonly branchAccess: BranchAccessService,
  ) {}

  @Get()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("customers.view")
  async list(@CurrentSession() session: TenantSession) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    return this.prisma.client.customer.findMany({
      where: {
        tenantId,
        ...this.branchAccess.branchWhere(session, tenantId),
      },
      orderBy: { createdAt: "desc" },
      include: {
        branch: { select: { id: true, name: true } },
        sites: {
          where: this.branchAccess.branchWhere(session, tenantId),
          select: { id: true, label: true, city: true, postcode: true },
        },
      },
    });
  }

  @Post()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("customers.manage")
  async create(@Body() body: unknown, @CurrentSession() session: TenantSession) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const input = customerSchema.parse(body);
    const branchId = await this.branchAccess.resolveCreateBranchId(
      session,
      input.branchId,
      tenantId,
    );
    const customer = await this.prisma.client.customer.create({
      data: {
        tenantId,
        branchId,
        customerType: input.customerType ?? "RESIDENTIAL",
        displayName: input.displayName,
        companyName: input.companyName ?? null,
        primaryEmail: input.primaryEmail ?? null,
        primaryPhone: input.primaryPhone ?? null,
        notes: input.notes ?? null,
      },
      include: {
        branch: { select: { id: true, name: true } },
        sites: { select: { id: true, label: true, city: true, postcode: true } },
      },
    });

    await this.audit.record({
      tenantId,
      actorUserId: session.user.id,
      action: "customer.create",
      entityType: "customer",
      entityId: customer.id,
      newValues: input,
    });

    return customer;
  }
}

@Controller({ path: "sites", version: "1" })
export class SitesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantAccess: TenantAccessService,
    private readonly audit: AuditService,
    private readonly branchAccess: BranchAccessService,
  ) {}

  @Get()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("sites.view")
  async list(@CurrentSession() session: TenantSession) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    return this.prisma.client.site.findMany({
      where: {
        tenantId,
        ...this.branchAccess.branchWhere(session, tenantId),
      },
      orderBy: { createdAt: "desc" },
      include: {
        branch: { select: { id: true, name: true } },
        customer: { select: { id: true, displayName: true } },
      },
    });
  }

  @Post()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("sites.manage")
  async create(@Body() body: unknown, @CurrentSession() session: TenantSession) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const input = siteSchema.parse(body);
    const branchId = await this.branchAccess.resolveCreateBranchId(
      session,
      input.branchId,
      tenantId,
    );
    await this.prisma.client.customer.findFirstOrThrow({
      where: {
        id: input.customerId,
        tenantId,
        ...this.branchAccess.branchWhere(session, tenantId),
      },
      select: { id: true },
    });
    const site = await this.prisma.client.site.create({
      data: {
        tenantId,
        customerId: input.customerId,
        branchId,
        siteType: input.siteType ?? "RESIDENTIAL",
        label: input.label,
        addressLine1: input.addressLine1 ?? null,
        addressLine2: input.addressLine2 ?? null,
        city: input.city ?? null,
        county: input.county ?? null,
        postcode: input.postcode ?? null,
        countryCode: input.countryCode ?? "GB",
        accessNotes: input.accessNotes ?? null,
        occupancyStatus: input.occupancyStatus ?? null,
      },
      include: {
        branch: { select: { id: true, name: true } },
        customer: { select: { id: true, displayName: true } },
      },
    });

    await this.audit.record({
      tenantId,
      actorUserId: session.user.id,
      action: "site.create",
      entityType: "site",
      entityId: site.id,
      newValues: input,
    });

    return site;
  }
}

/**
 * @deprecated Use SitesController instead
 */
@Controller({ path: "properties", version: "1" })
export class PropertiesController {
  constructor(private readonly sitesController: SitesController) {}

  @Get()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("properties.view")
  async list(@CurrentSession() session: TenantSession) {
    const sites = await this.sitesController.list(session);
    return sites.map(s => ({
      ...s,
      propertyType: s.siteType,
    }));
  }

  @Post()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("properties.manage")
  async create(@Body() body: unknown, @CurrentSession() session: TenantSession) {
    // Map backwards compatible fields
    const siteBody = {
      ...(body as any),
      siteType: (body as any).propertyType,
    };
    const site = await this.sitesController.create(siteBody, session);
    return {
      ...site,
      propertyType: site.siteType,
    };
  }
}

@Module({
  controllers: [LeadsController, CustomersController, SitesController, PropertiesController],
  providers: [SitesController],
})
export class CrmModule {}

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
import { hasPermission } from "../../../../packages/auth/src";
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
  primaryContactName: z.preprocess(emptyStringToNull, z.string().min(2).nullable()).optional(),
  primaryContactPhone: z.preprocess(emptyStringToNull, z.string().min(3).nullable()).optional(),
  primaryContactEmail: z.preprocess(
    emptyStringToNull,
    z.string().email().nullable(),
  ).optional(),
  floorLevel: z.preprocess(emptyStringToNull, z.string().min(1).nullable()).optional(),
  hasLift: z.boolean().optional(),
  parkingNotes: z.preprocess(emptyStringToNull, z.string().min(2).nullable()).optional(),
  workingHourNotes: z.preprocess(emptyStringToNull, z.string().min(2).nullable()).optional(),
  asbestosConcern: z.boolean().optional(),
  dampConcern: z.boolean().optional(),
  generalSiteNotes: z.preprocess(emptyStringToNull, z.string().min(2).nullable()).optional(),
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
  @RequirePermissions("leads:view")
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
  @RequirePermissions("leads:manage")
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
  @RequirePermissions("leads:manage")
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
  @RequirePermissions("leads:manage", "customers:manage", "sites:manage")
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
  @RequirePermissions("customers:view")
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

  @Get(":customerId/360")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("customers:view")
  async getCustomer360(
    @Param("customerId") customerId: string,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const branchWhere = this.branchAccess.branchWhere(session, tenantId);
    const can = (permission: string) => hasPermission(session, permission);
    const customer = await this.prisma.client.customer.findFirstOrThrow({
      where: {
        id: customerId,
        tenantId,
        ...branchWhere,
      },
      include: {
        branch: { select: { id: true, name: true } },
      },
    });

    const [
      sites,
      leads,
      surveys,
      estimates,
      quotes,
      jobs,
      invoices,
      attachments,
    ] = await Promise.all([
      can("sites:view")
        ? this.prisma.client.site.findMany({
            where: { tenantId, customerId, ...branchWhere },
            orderBy: { createdAt: "desc" },
            take: 50,
            select: {
              id: true,
              label: true,
              siteType: true,
              addressLine1: true,
              city: true,
              postcode: true,
              isActive: true,
              createdAt: true,
              branch: { select: { id: true, name: true } },
            },
          })
        : Promise.resolve([]),
      can("leads:view")
        ? this.prisma.client.lead.findMany({
            where: { tenantId, convertedCustomerId: customerId, ...branchWhere },
            orderBy: { createdAt: "desc" },
            take: 25,
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
              status: true,
              source: true,
              createdAt: true,
              convertedAt: true,
              branch: { select: { id: true, name: true } },
            },
          })
        : Promise.resolve([]),
      can("sites:view")
        ? this.prisma.client.survey.findMany({
            where: { tenantId, customerId, ...branchWhere },
            orderBy: { createdAt: "desc" },
            take: 50,
            select: {
              id: true,
              reference: true,
              status: true,
              scheduledAt: true,
              completedAt: true,
              createdAt: true,
              branch: { select: { id: true, name: true } },
              site: { select: { id: true, label: true } },
            },
          })
        : Promise.resolve([]),
      can("estimate:read")
        ? this.prisma.client.estimate.findMany({
            where: { tenantId, customerId, ...branchWhere },
            orderBy: { createdAt: "desc" },
            take: 50,
            select: {
              id: true,
              estimateNumber: true,
              title: true,
              status: true,
              grandTotal: true,
              currency: true,
              createdAt: true,
              branch: { select: { id: true, name: true } },
              site: { select: { id: true, label: true } },
            },
          })
        : Promise.resolve([]),
      can("quote:read")
        ? this.prisma.client.quote.findMany({
            where: { tenantId, customerId, ...branchWhere },
            orderBy: { createdAt: "desc" },
            take: 50,
            select: {
              id: true,
              quoteNumber: true,
              title: true,
              status: true,
              grandTotal: true,
              currency: true,
              sentAt: true,
              approvedAt: true,
              createdAt: true,
              branch: { select: { id: true, name: true } },
              site: { select: { id: true, label: true } },
            },
          })
        : Promise.resolve([]),
      can("job:read")
        ? this.prisma.client.job.findMany({
            where: { tenantId, customerId, ...branchWhere },
            orderBy: { createdAt: "desc" },
            take: 50,
            select: {
              id: true,
              jobNumber: true,
              title: true,
              status: true,
              totalValue: true,
              currency: true,
              scheduledStart: true,
              scheduledEnd: true,
              completedAt: true,
              createdAt: true,
              branch: { select: { id: true, name: true } },
              site: { select: { id: true, label: true } },
              assignedInstaller: { select: { id: true, firstName: true, lastName: true } },
            },
          })
        : Promise.resolve([]),
      can("job:read")
        ? this.prisma.client.invoice.findMany({
            where: { tenantId, customerId, ...branchWhere },
            orderBy: { createdAt: "desc" },
            take: 50,
            select: {
              id: true,
              invoiceNumber: true,
              status: true,
              total: true,
              paidAmount: true,
              balanceDue: true,
              currency: true,
              issuedAt: true,
              dueDate: true,
              createdAt: true,
              branch: { select: { id: true, name: true } },
              job: { select: { id: true, jobNumber: true } },
              payments: {
                orderBy: { paidAt: "desc" },
                take: 20,
                select: {
                  id: true,
                  paymentNumber: true,
                  status: true,
                  amount: true,
                  currency: true,
                  method: true,
                  reference: true,
                  paidAt: true,
                  createdAt: true,
                  branch: { select: { id: true, name: true } },
                },
              },
            },
          })
        : Promise.resolve([]),
      this.prisma.client.fileAttachment.findMany({
        where: { tenantId, entityType: "CUSTOMER", entityId: customerId },
        orderBy: { createdAt: "desc" },
        take: 25,
        select: {
          id: true,
          fileName: true,
          contentType: true,
          sizeBytes: true,
          status: true,
          createdAt: true,
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
    ]);

    const payments = invoices.flatMap((invoice) =>
      invoice.payments.map((payment) => ({
        ...payment,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        jobId: invoice.job.id,
        jobNumber: invoice.job.jobNumber,
      })),
    );
    const totalInvoiced = invoices.reduce((sum, invoice) => sum + Number(invoice.total), 0);
    const totalPaid = invoices.reduce((sum, invoice) => sum + Number(invoice.paidAmount), 0);
    const outstandingBalance = invoices.reduce((sum, invoice) => sum + Number(invoice.balanceDue), 0);
    const activeJobs = jobs.filter((job) => !["COMPLETED", "CANCELLED"].includes(job.status));
    const relatedIds = [
      customer.id,
      ...sites.map((item) => item.id),
      ...leads.map((item) => item.id),
      ...surveys.map((item) => item.id),
      ...estimates.map((item) => item.id),
      ...quotes.map((item) => item.id),
      ...jobs.map((item) => item.id),
      ...invoices.map((item) => item.id),
      ...payments.map((item) => item.id),
      ...attachments.map((item) => item.id),
    ];
    const auditLogs = await this.prisma.client.auditLog.findMany({
      where: {
        tenantId,
        entityId: { in: relatedIds },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        actorUser: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    const timeline = [
      { action: "Customer created", recordType: "Customer", date: customer.createdAt, branch: customer.branch, href: `/app/crm/customers/${customer.id}`, actor: null },
      ...leads.map((lead) => ({
        action: lead.convertedAt ? "Lead converted" : "Lead created",
        recordType: "Lead",
        date: lead.convertedAt ?? lead.createdAt,
        branch: lead.branch,
        href: "/app/crm/leads",
        actor: null,
        reference: lead.companyName ?? `${lead.firstName} ${lead.lastName}`,
      })),
      ...surveys.map((survey) => ({
        action: survey.completedAt ? "Survey completed" : survey.scheduledAt ? "Survey scheduled" : "Survey created",
        recordType: "Survey",
        date: survey.completedAt ?? survey.scheduledAt ?? survey.createdAt,
        branch: survey.branch,
        href: `/app/crm/surveys/${survey.id}`,
        actor: null,
        reference: survey.reference,
      })),
      ...estimates.map((estimate) => ({
        action: "Estimate created",
        recordType: "Estimate",
        date: estimate.createdAt,
        branch: estimate.branch,
        href: `/app/estimates/${estimate.id}`,
        actor: null,
        reference: estimate.estimateNumber,
      })),
      ...quotes.map((quote) => ({
        action: quote.approvedAt ? "Quote approved" : quote.sentAt ? "Quote sent" : "Quote created",
        recordType: "Quote",
        date: quote.approvedAt ?? quote.sentAt ?? quote.createdAt,
        branch: quote.branch,
        href: `/app/quotes/${quote.id}`,
        actor: null,
        reference: quote.quoteNumber,
      })),
      ...jobs.map((job) => ({
        action: job.completedAt ? "Job completed" : job.assignedInstaller ? "Installer assigned" : "Job created",
        recordType: "Job",
        date: job.completedAt ?? job.scheduledStart ?? job.createdAt,
        branch: job.branch,
        href: `/app/jobs/${job.id}`,
        actor: job.assignedInstaller ? { id: job.assignedInstaller.id, name: `${job.assignedInstaller.firstName} ${job.assignedInstaller.lastName}`.trim() } : null,
        reference: job.jobNumber,
      })),
      ...invoices.map((invoice) => ({
        action: "Invoice generated",
        recordType: "Invoice",
        date: invoice.issuedAt ?? invoice.createdAt,
        branch: invoice.branch,
        href: `/app/jobs/${invoice.job.id}`,
        actor: null,
        reference: invoice.invoiceNumber,
      })),
      ...payments.map((payment) => ({
        action: "Payment recorded",
        recordType: "Payment",
        date: payment.paidAt ?? payment.createdAt,
        branch: payment.branch,
        href: `/app/jobs/${payment.jobId}`,
        actor: null,
        reference: payment.paymentNumber,
      })),
      ...attachments.map((attachment) => ({
        action: "Attachment uploaded",
        recordType: "Attachment",
        date: attachment.createdAt,
        branch: null,
        href: `/app/crm/customers/${customer.id}`,
        actor: { id: attachment.user.id, name: `${attachment.user.firstName} ${attachment.user.lastName}`.trim() || attachment.user.email },
        reference: attachment.fileName,
      })),
      ...auditLogs.map((log) => ({
        action: this.describeAuditAction(log.action, log.entityType),
        recordType: this.toTitleCase(log.entityType),
        date: log.createdAt,
        branch: null,
        href: this.hrefForAudit(log.entityType, log.entityId, customer.id),
        actor: log.actorUser ? { id: log.actorUser.id, name: `${log.actorUser.firstName} ${log.actorUser.lastName}`.trim() || log.actorUser.email } : null,
        reference: log.action,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 80);

    const lastActivityAt = timeline[0]?.date ?? customer.updatedAt ?? customer.createdAt;

    return {
      customer,
      summary: {
        outstandingBalance,
        totalInvoiced,
        totalPaid,
        siteCount: sites.length,
        activeJobCount: activeJobs.length,
        lastActivityAt,
      },
      related: {
        sites,
        leads,
        surveys,
        estimates,
        quotes,
        jobs,
        invoices,
        payments,
        attachments,
      },
      timeline,
      quickActions: {
        addSite: can("sites:manage"),
        createSurvey: can("sites:manage"),
        createEstimate: can("estimate:create"),
        viewActiveJob: can("job:read") && activeJobs.length > 0,
        createOrViewInvoice: can("job:write") && jobs.length > 0,
        recordPayment: can("job:write") && invoices.some((invoice) => Number(invoice.balanceDue) > 0),
        uploadAttachment: can("job:write") || can("customers:manage"),
      },
      notes: {
        customerNotes: customer.notes,
        dedicatedNotesAvailable: false,
      },
    };
  }

  @Post()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("customers:manage")
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

  private describeAuditAction(action: string, entityType: string) {
    const normalized = action.replace(/[:.]/g, " ");
    if (normalized.includes("payment")) return "Payment recorded";
    if (normalized.includes("invoice")) return "Invoice generated";
    if (normalized.includes("schedule")) return "Job scheduled";
    if (normalized.includes("complete")) return "Job completed";
    if (normalized.includes("convert")) return "Lead converted";
    if (normalized.includes("create")) return `${this.toTitleCase(entityType)} created`;
    if (normalized.includes("update")) return `${this.toTitleCase(entityType)} updated`;
    return this.toTitleCase(normalized);
  }

  private toTitleCase(value: string) {
    return value
      .replace(/[_:-]/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  private hrefForAudit(entityType: string, entityId: string | null, customerId: string) {
    if (!entityId) return `/app/crm/customers/${customerId}`;
    if (entityType === "lead") return "/app/crm/leads";
    if (entityType === "site") return `/app/crm/sites/${entityId}`;
    if (entityType === "survey") return `/app/crm/surveys/${entityId}`;
    if (entityType === "estimate") return `/app/estimates/${entityId}`;
    if (entityType === "quote") return `/app/quotes/${entityId}`;
    if (entityType === "job") return `/app/jobs/${entityId}`;
    return `/app/crm/customers/${customerId}`;
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
  @RequirePermissions("sites:view")
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

  @Get(":siteId")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("sites:view")
  async getSite(
    @Param("siteId") siteId: string,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    return this.prisma.client.site.findFirstOrThrow({
      where: {
        id: siteId,
        tenantId,
        ...this.branchAccess.branchWhere(session, tenantId),
      },
      include: {
        branch: { select: { id: true, name: true } },
        customer: { select: { id: true, displayName: true } },
      },
    });
  }

  @Post()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("sites:manage")
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
        primaryContactName: input.primaryContactName ?? null,
        primaryContactPhone: input.primaryContactPhone ?? null,
        primaryContactEmail: input.primaryContactEmail ?? null,
        floorLevel: input.floorLevel ?? null,
        hasLift: input.hasLift ?? null,
        parkingNotes: input.parkingNotes ?? null,
        workingHourNotes: input.workingHourNotes ?? null,
        asbestosConcern: input.asbestosConcern ?? false,
        dampConcern: input.dampConcern ?? false,
        generalSiteNotes: input.generalSiteNotes ?? null,
        createdById: session.user.id,
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

  @Patch(":siteId")
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("sites:manage")
  async update(
    @Param("siteId") siteId: string,
    @Body() body: unknown,
    @CurrentSession() session: TenantSession,
  ) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const input = siteSchema.partial().parse(body);
    const previous = await this.prisma.client.site.findFirstOrThrow({
      where: {
        id: siteId,
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

    if (input.customerId) {
      await this.prisma.client.customer.findFirstOrThrow({
        where: {
          id: input.customerId,
          tenantId,
          ...this.branchAccess.branchWhere(session, tenantId),
        },
        select: { id: true },
      });
    }

    const site = await this.prisma.client.site.update({
      where: { id: previous.id },
      data: {
        ...(input.customerId !== undefined ? { customerId: input.customerId } : {}),
        ...(input.label !== undefined ? { label: input.label } : {}),
        ...(branchId !== undefined ? { branchId } : {}),
        ...(input.siteType !== undefined ? { siteType: input.siteType } : {}),
        ...(input.addressLine1 !== undefined ? { addressLine1: input.addressLine1 } : {}),
        ...(input.addressLine2 !== undefined ? { addressLine2: input.addressLine2 } : {}),
        ...(input.city !== undefined ? { city: input.city } : {}),
        ...(input.county !== undefined ? { county: input.county } : {}),
        ...(input.postcode !== undefined ? { postcode: input.postcode } : {}),
        ...(input.countryCode !== undefined ? { countryCode: input.countryCode } : {}),
        ...(input.accessNotes !== undefined ? { accessNotes: input.accessNotes } : {}),
        ...(input.occupancyStatus !== undefined
          ? { occupancyStatus: input.occupancyStatus }
          : {}),
        ...(input.primaryContactName !== undefined
          ? { primaryContactName: input.primaryContactName }
          : {}),
        ...(input.primaryContactPhone !== undefined
          ? { primaryContactPhone: input.primaryContactPhone }
          : {}),
        ...(input.primaryContactEmail !== undefined
          ? { primaryContactEmail: input.primaryContactEmail }
          : {}),
        ...(input.floorLevel !== undefined ? { floorLevel: input.floorLevel } : {}),
        ...(input.hasLift !== undefined ? { hasLift: input.hasLift } : {}),
        ...(input.parkingNotes !== undefined ? { parkingNotes: input.parkingNotes } : {}),
        ...(input.workingHourNotes !== undefined
          ? { workingHourNotes: input.workingHourNotes }
          : {}),
        ...(input.asbestosConcern !== undefined
          ? { asbestosConcern: input.asbestosConcern }
          : {}),
        ...(input.dampConcern !== undefined ? { dampConcern: input.dampConcern } : {}),
        ...(input.generalSiteNotes !== undefined
          ? { generalSiteNotes: input.generalSiteNotes }
          : {}),
        updatedById: session.user.id,
      },
      include: {
        branch: { select: { id: true, name: true } },
        customer: { select: { id: true, displayName: true } },
      },
    });

    await this.audit.record({
      tenantId,
      actorUserId: session.user.id,
      action: "site.update",
      entityType: "site",
      entityId: site.id,
      previousValues: previous,
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
  @RequirePermissions("properties:view")
  async list(@CurrentSession() session: TenantSession) {
    const sites = await this.sitesController.list(session);
    return sites.map(s => ({
      ...s,
      propertyType: s.siteType,
    }));
  }

  @Post()
  @UseGuards(AuthGuard, PermissionsGuard)
  @RequirePermissions("properties:manage")
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

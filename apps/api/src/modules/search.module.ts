import { Controller, Get, Module, Query, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { hasPermission } from "../../../../packages/auth/src";
import { AuthGuard } from "../shared/auth.guard";
import { CurrentSession } from "../shared/session.decorator";
import { BranchAccessService } from "../services/branch-access.service";
import { PrismaService } from "../services/prisma.service";
import { TenantAccessService } from "../services/tenant-access.service";

const searchQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
});

type TenantSession = Parameters<TenantAccessService["ensureTenant"]>[0];
type SearchResult = {
  id: string;
  type: string;
  label: string;
  title: string;
  detail: string;
  status?: string;
  branch?: string | null;
  href: string;
};

@Controller({ path: "search", version: "1" })
class SearchController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantAccess: TenantAccessService,
    private readonly branchAccess: BranchAccessService,
  ) {}

  @Get()
  @UseGuards(AuthGuard)
  async search(@CurrentSession() session: TenantSession, @Query() query: unknown) {
    const { tenantId } = this.tenantAccess.ensureTenant(session);
    const input = searchQuerySchema.parse(query);
    const q = input.q?.trim() ?? "";
    const commands = this.commandsFor(session);

    if (q.length < 2) {
      return {
        query: q,
        minQueryLength: 2,
        results: [],
        commands,
      };
    }

    const branchWhere = this.branchAccess.branchWhere(session, tenantId);
    const can = (permission: string) => hasPermission(session, permission);
    const contains = { contains: q, mode: "insensitive" as const };

    const [
      customers,
      leads,
      sites,
      surveys,
      estimates,
      quotes,
      jobs,
      invoices,
      products,
      suppliers,
      purchaseOrders,
    ] = await Promise.all([
      can("customers:view")
        ? this.prisma.client.customer.findMany({
            where: {
              tenantId,
              ...branchWhere,
              OR: [{ displayName: contains }, { companyName: contains }, { primaryEmail: contains }, { primaryPhone: contains }],
            },
            orderBy: { updatedAt: "desc" },
            take: 5,
            select: { id: true, displayName: true, primaryEmail: true, primaryPhone: true, customerType: true, branch: { select: { name: true } } },
          })
        : Promise.resolve([]),
      can("leads:view")
        ? this.prisma.client.lead.findMany({
            where: {
              tenantId,
              ...branchWhere,
              OR: [{ firstName: contains }, { lastName: contains }, { companyName: contains }, { email: contains }, { phone: contains }],
            },
            orderBy: { updatedAt: "desc" },
            take: 5,
            select: { id: true, firstName: true, lastName: true, companyName: true, source: true, status: true, branch: { select: { name: true } } },
          })
        : Promise.resolve([]),
      can("sites:view")
        ? this.prisma.client.site.findMany({
            where: {
              tenantId,
              ...branchWhere,
              OR: [{ label: contains }, { addressLine1: contains }, { city: contains }, { postcode: contains }, { customer: { displayName: contains } }],
            },
            orderBy: { updatedAt: "desc" },
            take: 5,
            select: { id: true, label: true, city: true, postcode: true, isActive: true, customer: { select: { displayName: true } }, branch: { select: { name: true } } },
          })
        : Promise.resolve([]),
      can("sites:view")
        ? this.prisma.client.survey.findMany({
            where: { tenantId, ...branchWhere, OR: [{ reference: contains }, { customer: { displayName: contains } }, { site: { label: contains } }] },
            orderBy: { updatedAt: "desc" },
            take: 5,
            select: { id: true, reference: true, status: true, site: { select: { label: true } }, branch: { select: { name: true } } },
          })
        : Promise.resolve([]),
      can("estimate:read")
        ? this.prisma.client.estimate.findMany({
            where: { tenantId, ...branchWhere, OR: [{ estimateNumber: contains }, { title: contains }, { customer: { displayName: contains } }, { site: { label: contains } }] },
            orderBy: { updatedAt: "desc" },
            take: 5,
            select: { id: true, estimateNumber: true, title: true, status: true, customer: { select: { displayName: true } }, branch: { select: { name: true } } },
          })
        : Promise.resolve([]),
      can("quote:read")
        ? this.prisma.client.quote.findMany({
            where: { tenantId, ...branchWhere, OR: [{ quoteNumber: contains }, { title: contains }, { customer: { displayName: contains } }] },
            orderBy: { updatedAt: "desc" },
            take: 5,
            select: { id: true, quoteNumber: true, title: true, status: true, customer: { select: { displayName: true } }, branch: { select: { name: true } } },
          })
        : Promise.resolve([]),
      can("job:read")
        ? this.prisma.client.job.findMany({
            where: { tenantId, ...branchWhere, OR: [{ jobNumber: contains }, { title: contains }, { customer: { displayName: contains } }, { site: { label: contains } }] },
            orderBy: { updatedAt: "desc" },
            take: 5,
            select: { id: true, jobNumber: true, title: true, status: true, customer: { select: { displayName: true } }, branch: { select: { name: true } } },
          })
        : Promise.resolve([]),
      can("job:read")
        ? this.prisma.client.invoice.findMany({
            where: { tenantId, ...branchWhere, OR: [{ invoiceNumber: contains }, { customer: { displayName: contains } }, { job: { jobNumber: contains } }] },
            orderBy: { updatedAt: "desc" },
            take: 5,
            select: { id: true, invoiceNumber: true, status: true, jobId: true, job: { select: { jobNumber: true } }, customer: { select: { displayName: true } }, branch: { select: { name: true } } },
          })
        : Promise.resolve([]),
      can("catalogue.view")
        ? this.prisma.client.product.findMany({
            where: { tenantId, OR: [{ name: contains }, { sku: contains }, { material: contains }, { colour: contains }] },
            orderBy: { updatedAt: "desc" },
            take: 5,
            select: { id: true, name: true, sku: true, lifecycleStatus: true, category: { select: { name: true } } },
          })
        : Promise.resolve([]),
      can("suppliers.view")
        ? this.prisma.client.supplier.findMany({
            where: { tenantId, OR: [{ legalName: contains }, { tradingName: contains }, { supplierCode: contains }, { email: contains }, { postcode: contains }] },
            orderBy: { updatedAt: "desc" },
            take: 5,
            select: { id: true, legalName: true, tradingName: true, supplierCode: true, status: true, branch: { select: { name: true } } },
          })
        : Promise.resolve([]),
      can("procurement:order:read")
        ? this.prisma.client.purchaseOrder.findMany({
            where: { tenantId, ...branchWhere, OR: [{ purchaseOrderNumber: contains }, { supplierReference: contains }, { supplier: { legalName: contains } }, { supplier: { tradingName: contains } }] },
            orderBy: { updatedAt: "desc" },
            take: 5,
            select: { id: true, purchaseOrderNumber: true, status: true, supplier: { select: { legalName: true, tradingName: true } }, branch: { select: { name: true } } },
          })
        : Promise.resolve([]),
    ]);

    const results: SearchResult[] = [
      ...customers.map((item) => ({
        id: item.id,
        type: "customers",
        label: "Customer",
        title: item.displayName,
        detail: item.primaryEmail ?? item.primaryPhone ?? item.customerType,
        branch: item.branch?.name ?? null,
        href: `/app/crm/customers/${item.id}`,
      })),
      ...leads.map((item) => ({
        id: item.id,
        type: "leads",
        label: "Lead",
        title: item.companyName ?? `${item.firstName} ${item.lastName}`,
        detail: item.source ?? "Lead",
        status: item.status,
        branch: item.branch?.name ?? null,
        href: "/app/crm/leads",
      })),
      ...sites.map((item) => ({
        id: item.id,
        type: "sites",
        label: "Site",
        title: item.label,
        detail: `${item.customer.displayName} | ${[item.city, item.postcode].filter(Boolean).join(" ") || "No address"}`,
        status: item.isActive ? "ACTIVE" : "INACTIVE",
        branch: item.branch?.name ?? null,
        href: `/app/crm/sites/${item.id}`,
      })),
      ...surveys.map((item) => ({
        id: item.id,
        type: "surveys",
        label: "Survey",
        title: item.reference,
        detail: item.site.label,
        status: item.status,
        branch: item.branch?.name ?? null,
        href: `/app/crm/surveys/${item.id}`,
      })),
      ...estimates.map((item) => ({
        id: item.id,
        type: "estimates",
        label: "Estimate",
        title: item.estimateNumber,
        detail: `${item.title ?? "Untitled"} | ${item.customer.displayName}`,
        status: item.status,
        branch: item.branch?.name ?? null,
        href: `/app/estimates/${item.id}`,
      })),
      ...quotes.map((item) => ({
        id: item.id,
        type: "quotes",
        label: "Quote",
        title: item.quoteNumber,
        detail: `${item.title ?? "Untitled"} | ${item.customer.displayName}`,
        status: item.status,
        branch: item.branch?.name ?? null,
        href: `/app/quotes/${item.id}`,
      })),
      ...jobs.map((item) => ({
        id: item.id,
        type: "jobs",
        label: "Job",
        title: item.jobNumber,
        detail: `${item.title ?? "Untitled"} | ${item.customer.displayName}`,
        status: item.status,
        branch: item.branch?.name ?? null,
        href: `/app/jobs/${item.id}`,
      })),
      ...invoices.map((item) => ({
        id: item.id,
        type: "invoices",
        label: "Invoice",
        title: item.invoiceNumber,
        detail: `${item.job.jobNumber} | ${item.customer.displayName}`,
        status: item.status,
        branch: item.branch?.name ?? null,
        href: `/app/jobs/${item.jobId}`,
      })),
      ...products.map((item) => ({
        id: item.id,
        type: "products",
        label: "Product",
        title: item.name,
        detail: `${item.sku} | ${item.category.name}`,
        status: item.lifecycleStatus,
        branch: null,
        href: `/app/catalogue/products/${item.id}`,
      })),
      ...suppliers.map((item) => ({
        id: item.id,
        type: "suppliers",
        label: "Supplier",
        title: item.tradingName ?? item.legalName,
        detail: item.supplierCode ?? item.legalName,
        status: item.status,
        branch: item.branch?.name ?? null,
        href: `/app/suppliers/${item.id}`,
      })),
      ...purchaseOrders.map((item) => ({
        id: item.id,
        type: "purchaseOrders",
        label: "Purchase order",
        title: item.purchaseOrderNumber,
        detail: item.supplier.tradingName ?? item.supplier.legalName,
        status: item.status,
        branch: item.branch?.name ?? null,
        href: `/app/procurement/purchase-orders/${item.id}`,
      })),
    ];

    return {
      query: q,
      minQueryLength: 2,
      results: results.slice(0, 40),
      commands,
    };
  }

  private commandsFor(session: TenantSession) {
    const can = (permission: string) => hasPermission(session, permission);
    return [
      can("leads:manage") ? { id: "create-lead", label: "Create lead", href: "/app/crm/leads" } : null,
      can("customers:manage") ? { id: "create-customer", label: "Create customer", href: "/app/crm/customers" } : null,
      can("sites:manage") ? { id: "create-survey", label: "Create survey", href: "/app/crm/surveys/new" } : null,
      can("estimate:create") ? { id: "create-estimate", label: "Create estimate", href: "/app/estimates/new" } : null,
      can("job:read") ? { id: "open-schedule", label: "Open schedule", href: "/app/schedule" } : null,
      can("job:read") ? { id: "open-jobs", label: "Open jobs", href: "/app/jobs" } : null,
      can("inventory:read") ? { id: "open-inventory", label: "Open inventory", href: "/app/procurement" } : null,
      { id: "open-dashboard", label: "Open dashboard", href: "/app/dashboard" },
    ].filter(Boolean);
  }
}

@Module({
  controllers: [SearchController],
})
export class SearchModule {}

import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  PackageCheck,
  PackageSearch,
  PoundSterling,
  TrendingUp,
  Users,
} from "lucide-react";
import { Card } from "@tradesperson/ui";
import { apiFetch, getSession } from "@/lib/api";
import { getEstimatePermissions, getEstimates } from "@/lib/estimates";
import { getJobPermissions, getJobs, type Job } from "@/lib/jobs";
import {
  getProcurementPermissions,
  getPurchaseOrders,
  getRequisitions,
} from "@/lib/procurement";
import { getQuotePermissions, getQuotes } from "@/lib/quotes";
import { DateDisplay, Money, PageHeader, StatusBadge } from "@/components/shared";

type TenantSummary = {
  name: string;
  branches: Array<{ id: string; name?: string }>;
  subscriptions: Array<{ plan: { name: string } }>;
};

type AuditItem = {
  id: string;
  action: string;
  entityType?: string | null;
  createdAt: string;
  actor?: { firstName?: string | null; lastName?: string | null } | null;
};

type InventoryReconciliation = {
  mismatchCount: number;
  total: number;
  rows: Array<{
    stockBalanceId: string;
    productName?: string | null;
    warehouseName?: string | null;
    onHandQuantity: string;
    ledgerQuantity: string;
  }>;
};

type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

const number = new Intl.NumberFormat("en-GB");

async function safeFetch<T>(fallback: T, fetcher: () => Promise<T>) {
  try {
    return await fetcher();
  } catch {
    return fallback;
  }
}

function emptyPage<T>(): Paginated<T> {
  return { items: [], total: 0, page: 1, pageSize: 0, totalPages: 1 };
}

function moneyValue(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isOverdue(date: string | null | undefined) {
  if (!date) return false;
  return new Date(date).getTime() < Date.now();
}

function statusColor(status: string) {
  if (["COMPLETED", "PAID", "APPROVED", "FULFILLED"].includes(status)) return "green" as const;
  if (["SCHEDULED", "IN_PROGRESS", "ISSUED", "ACKNOWLEDGED", "CONVERTED"].includes(status)) return "blue" as const;
  if (["SUBMITTED", "PENDING_APPROVAL", "PARTIALLY_PAID", "PARTIALLY_FULFILLED"].includes(status)) return "amber" as const;
  if (["CANCELLED", "REJECTED", "EXPIRED"].includes(status)) return "red" as const;
  return "slate" as const;
}

function KpiCard({
  title,
  value,
  detail,
  href,
  icon: Icon,
  tone = "slate",
  dark = false,
}: {
  title: string;
  value: string;
  detail: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "slate" | "blue" | "green" | "amber" | "red";
  dark?: boolean;
}) {
  const tones = {
    slate: "bg-slate-50 text-slate-700 ring-slate-200",
    blue: "bg-blue-50 text-blue-700 ring-blue-200",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    red: "bg-red-50 text-red-700 ring-red-200",
  };

  return (
    <Link href={href} className="group block h-full">
      <Card className={`h-full overflow-hidden p-0 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md ${dark ? "border-slate-950 bg-slate-950 text-white" : "bg-white"}`}>
        <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={`text-label-caps uppercase ${dark ? "text-slate-400" : "text-slate-500"}`}>{title}</p>
            <p className={`mt-3 font-mono text-3xl font-semibold tracking-tight ${dark ? "text-white" : "text-slate-950"}`}>{value}</p>
            <p className={`mt-2 text-sm ${dark ? "text-slate-300" : "text-slate-500"}`}>{detail}</p>
          </div>
          <span className={`rounded-xl p-2 ring-1 ${dark ? "bg-white/10 text-emerald-300 ring-white/10" : tones[tone]}`}>
            <Icon className="h-5 w-5" />
          </span>
        </div>
        <div className={`mt-5 flex items-center text-sm font-semibold opacity-0 transition group-hover:opacity-100 ${dark ? "text-emerald-300" : "text-emerald-700"}`}>
          Open <ArrowRight className="ml-1 h-4 w-4" />
        </div>
        </div>
      </Card>
    </Link>
  );
}

function SectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden rounded-xl border-slate-200 bg-white p-0 shadow-stitch">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
        <div>
          <h2 className="text-title-md text-slate-950">{title}</h2>
          {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return <div className="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400">{message}</div>;
}

function formatActor(item: AuditItem) {
  const name = [item.actor?.firstName, item.actor?.lastName].filter(Boolean).join(" ").trim();
  return name || "System";
}

export default async function DashboardPage() {
  const session = await getSession();
  const tenant = await apiFetch<TenantSummary>("/api/v1/tenants/current");
  const activeBranch = tenant.branches.find((branch) => branch.id === session!.activeBranchId);

  const estimatePerms = getEstimatePermissions(session);
  const quotePerms = getQuotePermissions(session);
  const jobPerms = getJobPermissions(session);
  const procurementPerms = getProcurementPermissions(session);

  const [
    members,
    audits,
    leads,
    customers,
    sites,
    estimates,
    quotes,
    jobs,
    scheduledJobs,
    completedJobs,
    requisitions,
    purchaseOrders,
    reconciliation,
  ] = await Promise.all([
    safeFetch<Array<unknown>>([], () => apiFetch<Array<unknown>>(`/api/v1/tenants/${session!.activeTenantId}/memberships`)),
    safeFetch<AuditItem[]>([], () => apiFetch<AuditItem[]>("/api/v1/audit-logs")),
    safeFetch<Array<{ id: string }>>([], () => apiFetch<Array<{ id: string }>>("/api/v1/leads")),
    safeFetch<Array<{ id: string }>>([], () => apiFetch<Array<{ id: string }>>("/api/v1/customers")),
    safeFetch<Array<{ id: string }>>([], () => apiFetch<Array<{ id: string }>>("/api/v1/properties")),
    estimatePerms.canRead ? safeFetch(emptyPage<Awaited<ReturnType<typeof getEstimates>>["items"][number]>(), () => getEstimates({ pageSize: 100 })) : emptyPage<Awaited<ReturnType<typeof getEstimates>>["items"][number]>(),
    quotePerms.canRead ? safeFetch(emptyPage<Awaited<ReturnType<typeof getQuotes>>["items"][number]>(), () => getQuotes({ pageSize: 100 })) : emptyPage<Awaited<ReturnType<typeof getQuotes>>["items"][number]>(),
    jobPerms.canRead ? safeFetch(emptyPage<Job>(), () => getJobs({ pageSize: 100 })) : emptyPage<Job>(),
    jobPerms.canRead ? safeFetch(emptyPage<Job>(), () => getJobs({ status: "SCHEDULED", pageSize: 8 })) : emptyPage<Job>(),
    jobPerms.canRead ? safeFetch(emptyPage<Job>(), () => getJobs({ status: "COMPLETED", pageSize: 100 })) : emptyPage<Job>(),
    procurementPerms.canViewRequisition
      ? safeFetch(emptyPage<Awaited<ReturnType<typeof getRequisitions>>["items"][number]>(), () => getRequisitions({ pageSize: 20 }))
      : emptyPage<Awaited<ReturnType<typeof getRequisitions>>["items"][number]>(),
    procurementPerms.canViewPo
      ? safeFetch(emptyPage<Awaited<ReturnType<typeof getPurchaseOrders>>["items"][number]>(), () => getPurchaseOrders({ pageSize: 20 }))
      : emptyPage<Awaited<ReturnType<typeof getPurchaseOrders>>["items"][number]>(),
    safeFetch<InventoryReconciliation | null>(null, () => apiFetch<InventoryReconciliation>("/api/v1/inventory/reconciliation")),
  ]);

  const openEstimates = estimates.items.filter((item) => !["QUOTED", "ACCEPTED", "CANCELLED", "REJECTED"].includes(item.status));
  const activeQuotes = quotes.items.filter((item) => ["DRAFT", "SENT", "APPROVED"].includes(item.status));
  const activeJobs = jobs.items.filter((item) => ["SCHEDULED", "IN_PROGRESS"].includes(item.status));
  const unscheduledJobs = jobs.items.filter((item) => item.status !== "COMPLETED" && item.status !== "CANCELLED" && !item.scheduledStart);
  const todayKey = new Date().toDateString();
  const jobsToday = jobs.items.filter((item) => item.scheduledStart && new Date(item.scheduledStart).toDateString() === todayKey);
  const overdueInvoices = jobs.items.flatMap((job) =>
    (job.invoices ?? [])
      .filter((invoice) => invoice.status !== "PAID" && invoice.status !== "CANCELLED" && isOverdue(invoice.dueDate))
      .map((invoice) => ({ ...invoice, job })),
  );
  const receivables = jobs.items.flatMap((job) => job.invoices ?? []).reduce((sum, invoice) => sum + moneyValue(invoice.balanceDue), 0);
  const wonRevenue = completedJobs.items.reduce((sum, job) => sum + moneyValue(job.totalValue), 0);
  const estimatedRevenue = activeQuotes.reduce((sum, quote) => sum + moneyValue(quote.grandTotal), 0);
  const materialToAction = jobs.items.reduce(
    (sum, job) =>
      sum +
      (job.materialRequirements ?? []).filter((line) =>
        ["PLANNED", "PARTIALLY_REQUISITIONED", "REQUISITIONED", "PARTIALLY_ALLOCATED"].includes(line.status),
      ).length,
    0,
  );
  const procurementPressure = purchaseOrders.items.filter((order) =>
    ["PENDING_APPROVAL", "APPROVED", "ISSUED", "ACKNOWLEDGED", "PARTIALLY_FULFILLED"].includes(order.status),
  );
  const lowStockRows = reconciliation?.rows.filter((row) => moneyValue(row.onHandQuantity) <= moneyValue(row.ledgerQuantity) && moneyValue(row.ledgerQuantity) <= 5) ?? [];
  const inventoryIssues = (reconciliation?.mismatchCount ?? 0) + lowStockRows.length;

  const nextActions = [
    unscheduledJobs.length
      ? {
          title: "Schedule open jobs",
          detail: `${unscheduledJobs.length} job${unscheduledJobs.length === 1 ? "" : "s"} need an installation slot.`,
          href: "/app/jobs",
          tone: "amber" as const,
        }
      : null,
    materialToAction
      ? {
          title: "Check job materials",
          detail: `${materialToAction} material line${materialToAction === 1 ? "" : "s"} need reservation, requisition, or issue.`,
          href: "/app/jobs",
          tone: "blue" as const,
        }
      : null,
    overdueInvoices.length
      ? {
          title: "Chase overdue invoices",
          detail: `${overdueInvoices.length} invoice${overdueInvoices.length === 1 ? "" : "s"} are past due.`,
          href: "/app/jobs",
          tone: "red" as const,
        }
      : null,
    procurementPressure.length
      ? {
          title: "Review supplier commitments",
          detail: `${procurementPressure.length} purchase order${procurementPressure.length === 1 ? "" : "s"} need attention.`,
          href: "/app/procurement",
          tone: "amber" as const,
        }
      : null,
    inventoryIssues
      ? {
          title: "Review inventory accuracy",
          detail: `${inventoryIssues} stock signal${inventoryIssues === 1 ? "" : "s"} need a look.`,
          href: "/app/procurement",
          tone: "red" as const,
        }
      : null,
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-stitch">
        <PageHeader
          title="Operations Command Centre"
          description={`${tenant.name} · ${activeBranch?.name ?? "All branches"} · ${tenant.subscriptions[0]?.plan.name ?? "No active plan"}`}
          actions={
            <div className="flex flex-wrap gap-2">
              <Link className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800" href="/app/jobs">
                View jobs
              </Link>
              <Link className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50" href="/app/procurement">
                Procurement
              </Link>
            </div>
          }
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <KpiCard title="Revenue" value={gbp.format(wonRevenue)} detail="Completed job value" href="/app/jobs" icon={TrendingUp} tone="green" />
          <KpiCard title="Profitability" value="Server-led" detail="Job drill-downs use authoritative costs" href="/app/jobs" icon={Activity} tone="blue" />
          <KpiCard title="Today's jobs" value={number.format(jobsToday.length)} detail={`${activeJobs.length} active jobs`} href="/app/schedule" icon={BriefcaseBusiness} tone="green" />
          <KpiCard title="Unscheduled" value={number.format(unscheduledJobs.length)} detail="Jobs waiting for a slot" href="/app/jobs" icon={AlertTriangle} tone={unscheduledJobs.length ? "red" : "slate"} />
          <KpiCard title="Open pipeline" value={gbp.format(estimatedRevenue)} detail={`${openEstimates.length} estimates · ${activeQuotes.length} quotes`} href="/app/estimates" icon={TrendingUp} tone="green" />
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard title="Leads" value={number.format(leads.length)} detail="New enquiries to qualify" href="/app/crm/leads" icon={ClipboardList} />
        <KpiCard title="Customers" value={number.format(customers.length)} detail={`${sites.length} active customer sites`} href="/app/crm/customers" icon={Users} />
        <KpiCard title="Procurement" value={number.format(procurementPressure.length)} detail={`${requisitions.total} requisitions · ${purchaseOrders.total} POs`} href="/app/procurement" icon={PackageCheck} tone={procurementPressure.length ? "amber" : "slate"} />
        <KpiCard title="Inventory signals" value={number.format(inventoryIssues)} detail={`${reconciliation?.mismatchCount ?? 0} ledger mismatches · ${lowStockRows.length} low-stock`} href="/app/procurement" icon={PackageSearch} tone={inventoryIssues ? "red" : "green"} />
        <KpiCard title="Team" value={number.format(members.length)} detail={`${tenant.branches.length} branch${tenant.branches.length === 1 ? "" : "es"} configured`} href="/app/settings/users" icon={CheckCircle2} />
        <KpiCard title="Receivables" value={gbp.format(receivables)} detail={`${overdueInvoices.length} overdue invoice reminders`} href="/app/jobs" icon={PoundSterling} tone={overdueInvoices.length ? "red" : "slate"} dark />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <SectionCard
          title="Jobs Needing Attention"
          description="Prioritised exceptions that reduce delays, stock mistakes, and missed cash collection."
          action={<AlertTriangle className="h-5 w-5 text-amber-500" />}
        >
          {nextActions.length ? (
            <div className="divide-y divide-slate-100">
              {nextActions.map((item) => (
                <Link key={item!.title} href={item!.href} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50">
                  <div>
                    <p className="font-semibold text-slate-950">{item!.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{item!.detail}</p>
                  </div>
                  <StatusBadge status={item!.tone === "red" ? "Urgent" : "Action"} color={item!.tone} />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyPanel message="No urgent exceptions. The current workflow is in good shape." />
          )}
        </SectionCard>

        <SectionCard title="Upcoming Schedule" description="Scheduled installer work visible at a glance." action={<CalendarDays className="h-5 w-5 text-emerald-600" />}>
          {scheduledJobs.items.length ? (
            <div className="divide-y divide-slate-100">
              {scheduledJobs.items.map((job: Job) => (
                <Link key={job.id} href={`/app/jobs/${job.id}`} className="block px-5 py-4 hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{job.jobNumber}</p>
                      <p className="mt-1 text-sm text-slate-500">{job.customer?.displayName ?? "Customer"} · {job.site?.label ?? "Site"}</p>
                    </div>
                    <StatusBadge status={job.status} color={statusColor(job.status)} />
                  </div>
                  <p className="mt-3 text-sm text-slate-600">
                    <DateDisplay date={job.scheduledStart} /> · {job.assignedInstaller ? `${job.assignedInstaller.firstName} ${job.assignedInstaller.lastName}` : job.installationTeamName ?? "No installer assigned"}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyPanel message="No scheduled jobs yet. Convert approved quotes or schedule open jobs." />
          )}
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <SectionCard title="Sales pipeline" description="Estimate and quote throughput." action={<Link className="text-sm font-medium text-blue-700" href="/app/quotes">View quotes</Link>}>
          <div className="grid gap-3 p-5 sm:grid-cols-3 xl:grid-cols-1">
            {[
              ["Draft estimates", estimates.items.filter((item) => item.status === "DRAFT").length],
              ["Ready for quote", estimates.items.filter((item) => item.status === "READY_FOR_QUOTE").length],
              ["Approved quotes", quotes.items.filter((item) => item.status === "APPROVED").length],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-label-caps uppercase text-slate-500">{label}</p>
                <p className="mt-1 font-mono text-2xl font-semibold text-slate-950">{value}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Cash and Profitability" description="Revenue visibility without opening every job." action={<PoundSterling className="h-5 w-5 text-emerald-600" />}>
          <div className="space-y-3 p-5">
            <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <span>Completed job value</span>
              <strong className="font-mono">{gbp.format(wonRevenue)}</strong>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <span>Outstanding balance</span>
              <strong className="font-mono"><Money amount={receivables} /></strong>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
              <span>Overdue reminders</span>
              <strong className="font-mono">{overdueInvoices.length}</strong>
            </div>
            <div className="rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500">
              Job profitability remains server-authoritative and is exposed from job drill-downs where supported.
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Recent Activity" description="Latest tenant activity for operational context." action={<Activity className="h-5 w-5 text-slate-500" />}>
          {audits.length ? (
            <div className="divide-y divide-slate-100">
              {audits.slice(0, 6).map((item) => (
                <div key={item.id} className="px-5 py-4">
                  <p className="text-sm font-semibold text-slate-950">{item.action}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatActor(item)} · <DateDisplay date={item.createdAt} />
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyPanel message="No audit activity yet." />
          )}
        </SectionCard>
      </div>
    </div>
  );
}

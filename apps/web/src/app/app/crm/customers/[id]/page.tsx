import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Activity,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CreditCard,
  FileText,
  Mail,
  MapPin,
  Paperclip,
  Phone,
  Plus,
  ReceiptText,
  WalletCards,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { StatusBadge } from "@/components/shared";

type BranchRef = { id: string; name: string } | null;
type TimelineEntry = {
  action: string;
  recordType: string;
  date: string;
  reference?: string;
  href: string;
  branch: BranchRef;
  actor: { id: string; name: string } | null;
};

type Customer360 = {
  customer: {
    id: string;
    displayName: string;
    customerType: string;
    primaryEmail: string | null;
    primaryPhone: string | null;
    notes: string | null;
    createdAt: string;
    branch: BranchRef;
  };
  summary: {
    outstandingBalance: number;
    totalInvoiced: number;
    totalPaid: number;
    siteCount: number;
    activeJobCount: number;
    lastActivityAt: string;
  };
  related: {
    sites: Array<{ id: string; label: string; siteType: string; addressLine1: string | null; city: string | null; postcode: string | null; isActive: boolean }>;
    leads: Array<{ id: string; firstName: string; lastName: string; companyName: string | null; status: string; source: string | null }>;
    surveys: Array<{ id: string; reference: string; status: string; site: { id: string; label: string } }>;
    estimates: Array<{ id: string; estimateNumber: string; title: string | null; status: string; grandTotal: string | number; currency: string; site: { id: string; label: string } }>;
    quotes: Array<{ id: string; quoteNumber: string; title: string | null; status: string; grandTotal: string | number; currency: string; site: { id: string; label: string } }>;
    jobs: Array<{ id: string; jobNumber: string; title: string | null; status: string; totalValue: string | number; currency: string; site: { id: string; label: string } }>;
    invoices: Array<{ id: string; invoiceNumber: string; status: string; balanceDue: string | number; currency: string; job: { id: string; jobNumber: string } }>;
    payments: Array<{ id: string; paymentNumber: string; status: string; amount: string | number; currency: string; method: string | null; invoiceNumber: string; jobId: string }>;
    attachments: Array<{ id: string; fileName: string; contentType: string; sizeBytes: number; status: string }>;
  };
  timeline: TimelineEntry[];
  quickActions: {
    addSite: boolean;
    createSurvey: boolean;
    createEstimate: boolean;
    viewActiveJob: boolean;
    createOrViewInvoice: boolean;
    recordPayment: boolean;
    uploadAttachment: boolean;
  };
  notes: { customerNotes: string | null; dedicatedNotesAvailable: boolean };
};

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const dateOnly = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });
const dateTime = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });

async function loadCustomer(id: string) {
  try {
    return await apiFetch<Customer360>(`/api/v1/customers/${id}/360`);
  } catch {
    notFound();
  }
}

function money(value: string | number | undefined, currency = "GBP") {
  const amount = Number(value ?? 0);
  return currency === "GBP" ? gbp.format(amount) : `${currency} ${amount.toFixed(2)}`;
}

function when(value: string | null | undefined, withTime = false) {
  if (!value) return "-";
  const date = new Date(value);
  return withTime ? dateTime.format(date) : dateOnly.format(date);
}

function statusColor(status: string) {
  if (["ACTIVE", "PAID", "CONVERTED", "COMPLETED", "APPROVED"].includes(status)) return "green" as const;
  if (["SCHEDULED", "IN_PROGRESS", "SENT", "READY_FOR_QUOTE"].includes(status)) return "blue" as const;
  if (["DRAFT", "PARTIALLY_PAID", "PENDING"].includes(status)) return "amber" as const;
  if (["CANCELLED", "REJECTED", "EXPIRED", "OVERDUE"].includes(status)) return "red" as const;
  return "slate" as const;
}

export default async function Customer360Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await loadCustomer(id);
  const { customer, summary, related, quickActions } = data;
  const activeJob = related.jobs.find((job) => !["COMPLETED", "CANCELLED"].includes(job.status));
  const invoiceWithBalance = related.invoices.find((invoice) => Number(invoice.balanceDue) > 0);
  const primarySite = related.sites[0];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-stitch">
        <nav className="mb-5 flex items-center gap-2 text-sm text-slate-500" aria-label="Breadcrumb">
          <Link className="font-medium hover:text-slate-950" href="/app/dashboard">Dashboard</Link>
          <span>/</span>
          <Link className="font-medium hover:text-slate-950" href="/app/crm/customers">Customers</Link>
          <span>/</span>
          <span className="text-slate-900">{customer.displayName}</span>
        </nav>
        <div className="grid gap-6 xl:grid-cols-[1fr_auto] xl:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-600">CUST-{customer.id.slice(0, 6).toUpperCase()}</span>
              <StatusBadge status={customer.customerType} color="green" />
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold uppercase tracking-[0.08em] text-emerald-700">Customer 360</span>
            </div>
            <h1 className="mt-3 max-w-4xl text-display-lg text-slate-950 max-lg:text-headline-lg">{customer.displayName}</h1>
            <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
              <span className="inline-flex items-center gap-2"><Mail className="h-4 w-4" />{customer.primaryEmail ?? "No email"}</span>
              <span className="inline-flex items-center gap-2"><Phone className="h-4 w-4" />{customer.primaryPhone ?? "No phone"}</span>
              <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" />{customer.branch?.name ?? "No branch"}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {quickActions.addSite ? <QuickAction href={`/app/crm/sites/new?customerId=${customer.id}`} label="Add Site" icon={Plus} /> : null}
            {quickActions.createSurvey ? <QuickAction href="/app/crm/surveys/new" label="Schedule Survey" icon={CalendarDays} /> : null}
            {quickActions.createEstimate ? <QuickAction href={`/app/estimates/new?customerId=${customer.id}`} label="Create Estimate" icon={FileText} primary /> : null}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5" aria-label="Customer financial and operational summary">
        <MetricCard label="Outstanding Balance" value={money(summary.outstandingBalance)} icon={WalletCards} tone={summary.outstandingBalance > 0 ? "red" : "green"} />
        <MetricCard label="Total Invoiced" value={money(summary.totalInvoiced)} icon={ReceiptText} />
        <MetricCard label="Total Paid" value={money(summary.totalPaid)} icon={CreditCard} tone="green" />
        <MetricCard label="Active Jobs" value={String(summary.activeJobCount)} icon={BriefcaseBusiness} />
        <MetricCard label="Sites" value={String(summary.siteCount)} icon={Building2} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <aside className="space-y-6">
          <Panel title="Primary Contact" icon={Phone}>
            <div className="space-y-3 text-sm text-slate-600">
              <p className="text-base font-bold text-slate-950">{customer.displayName}</p>
              <p>{customer.primaryEmail ?? "No email captured"}</p>
              <p>{customer.primaryPhone ?? "No phone captured"}</p>
              <p>Created {when(customer.createdAt)}</p>
            </div>
          </Panel>

          <Panel title="HQ Location" icon={MapPin}>
            {primarySite ? (
              <div className="text-sm text-slate-600">
                <p className="font-bold text-slate-950">{primarySite.label}</p>
                <p className="mt-1">{[primarySite.addressLine1, primarySite.city, primarySite.postcode].filter(Boolean).join(", ") || "No address captured"}</p>
                <Link className="mt-3 inline-flex font-semibold text-emerald-700" href={`/app/crm/sites/${primarySite.id}`}>Open site</Link>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No customer sites yet.</p>
            )}
          </Panel>

          <Panel title="Site Portfolio" icon={Building2} badge={`${related.sites.length} sites`}>
            <div className="space-y-3">
              {related.sites.slice(0, 5).map((site) => (
                <Link key={site.id} className="block rounded-xl border border-slate-100 bg-slate-50 p-3 hover:border-emerald-200 hover:bg-emerald-50" href={`/app/crm/sites/${site.id}`}>
                  <p className="font-bold text-slate-950">{site.label}</p>
                  <p className="mt-1 text-sm text-slate-500">{site.siteType} · {site.isActive ? "Active" : "Inactive"}</p>
                </Link>
              ))}
              {!related.sites.length ? <p className="text-sm text-slate-500">No sites connected.</p> : null}
            </div>
          </Panel>
        </aside>

        <main className="space-y-6">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-stitch">
            <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50/80 px-5 py-3" aria-label="Customer workspace sections">
              {["Overview", "Sites", "Leads", "Surveys", "Estimates", "Quotes", "Jobs", "Invoices", "Payments", "Attachments"].map((tab, index) => (
                <a key={tab} className={`rounded-md px-3 py-2 text-sm font-semibold ${index === 0 ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:bg-white hover:text-slate-950"}`} href={`#${tab.toLowerCase()}`}>{tab}</a>
              ))}
            </div>
            <div className="space-y-6 p-5">
              <RecordGrid id="overview" title="Critical Projects" items={related.jobs.slice(0, 4).map((job) => ({
                href: `/app/jobs/${job.id}`,
                title: job.title ?? job.jobNumber,
                meta: `${job.site.label} · ${money(job.totalValue, job.currency)}`,
                status: job.status,
              }))} empty="No active or historic jobs yet." />
              <RecordGrid id="sites" title="Sites" items={related.sites.map((site) => ({
                href: `/app/crm/sites/${site.id}`,
                title: site.label,
                meta: [site.addressLine1, site.city, site.postcode].filter(Boolean).join(", ") || site.siteType,
                status: site.isActive ? "ACTIVE" : "INACTIVE",
              }))} empty="No customer sites yet." />
              <RecordGrid id="leads" title="Leads" items={related.leads.map((lead) => ({
                href: "/app/crm/leads",
                title: lead.companyName ?? `${lead.firstName} ${lead.lastName}`,
                meta: lead.source ?? "Lead",
                status: lead.status,
              }))} empty="No connected leads." />
              <RecordGrid id="surveys" title="Surveys" items={related.surveys.map((survey) => ({
                href: `/app/crm/surveys/${survey.id}`,
                title: survey.reference,
                meta: survey.site.label,
                status: survey.status,
              }))} empty="No surveys yet." />
              <RecordGrid id="estimates" title="Estimates" items={related.estimates.map((estimate) => ({
                href: `/app/estimates/${estimate.id}`,
                title: estimate.estimateNumber,
                meta: `${estimate.title ?? estimate.site.label} · ${money(estimate.grandTotal, estimate.currency)}`,
                status: estimate.status,
              }))} empty="No estimates yet." />
              <RecordGrid id="quotes" title="Quotes" items={related.quotes.map((quote) => ({
                href: `/app/quotes/${quote.id}`,
                title: quote.quoteNumber,
                meta: `${quote.title ?? quote.site.label} · ${money(quote.grandTotal, quote.currency)}`,
                status: quote.status,
              }))} empty="No quotes yet." />
              <RecordGrid id="invoices" title="Invoices" items={related.invoices.map((invoice) => ({
                href: `/app/jobs/${invoice.job.id}`,
                title: invoice.invoiceNumber,
                meta: `${invoice.job.jobNumber} · ${money(invoice.balanceDue, invoice.currency)} due`,
                status: invoice.status,
              }))} empty="No invoices yet." />
              <RecordGrid id="payments" title="Payments" items={related.payments.map((payment) => ({
                href: `/app/jobs/${payment.jobId}`,
                title: payment.paymentNumber,
                meta: `${payment.invoiceNumber} · ${money(payment.amount, payment.currency)} · ${payment.method ?? "Payment"}`,
                status: payment.status,
              }))} empty="No payments yet." />
              <RecordGrid id="attachments" title="Attachments" items={related.attachments.map((attachment) => ({
                href: `/app/crm/customers/${customer.id}`,
                title: attachment.fileName,
                meta: `${attachment.contentType} · ${Math.round(attachment.sizeBytes / 1024)} KB`,
                status: attachment.status,
              }))} empty="No attachments yet." />
            </div>
          </section>

          <Panel title="Activity Timeline" icon={Activity}>
            {data.timeline.length ? (
              <ol className="space-y-4">
                {data.timeline.map((item, index) => (
                  <li key={`${item.recordType}-${item.reference ?? item.action}-${item.date}-${index}`} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[170px_1fr]">
                    <time className="font-mono text-xs text-slate-500">{when(item.date, true)}</time>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-slate-950">{item.action}</p>
                        <StatusBadge status={item.recordType} color="slate" />
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {item.reference ?? item.recordType}
                        {item.actor ? ` · ${item.actor.name}` : ""}
                        {item.branch?.name ? ` · ${item.branch.name}` : ""}
                      </p>
                      <Link className="mt-2 inline-flex text-sm font-semibold text-emerald-700 hover:text-emerald-900" href={item.href}>Open record</Link>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-slate-500">No activity has been recorded for this customer yet.</p>
            )}
          </Panel>
        </main>
      </div>

      <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Panel title="Customer Notes" icon={FileText}>
          {data.notes.customerNotes ? <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{data.notes.customerNotes}</p> : <p className="text-sm text-slate-500">No customer notes captured.</p>}
          {!data.notes.dedicatedNotesAvailable ? <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">Dedicated note threads are not exposed yet; Customer 360 is showing existing notes and lifecycle activity only.</p> : null}
        </Panel>
        <Panel title="Quick Actions" icon={Plus}>
          <div className="grid gap-2">
            {quickActions.viewActiveJob && activeJob ? <Action href={`/app/jobs/${activeJob.id}`} label="Open active job" /> : null}
            {quickActions.createOrViewInvoice && activeJob ? <Action href={`/app/jobs/${activeJob.id}`} label="Create or view invoice" /> : null}
            {quickActions.recordPayment && invoiceWithBalance ? <Action href={`/app/jobs/${invoiceWithBalance.job.id}`} label="Record payment" /> : null}
            {quickActions.uploadAttachment ? <DisabledAction label="Upload attachment" note="Attachment upload is intentionally disabled here until the existing attachment UI exposes this workflow." /> : null}
            {!Object.values(quickActions).some(Boolean) ? <p className="text-sm text-slate-500">No quick actions are available for your permissions.</p> : null}
          </div>
        </Panel>
      </section>
    </div>
  );
}

function QuickAction({
  href,
  label,
  icon: Icon,
  primary = false,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  primary?: boolean;
}) {
  return (
    <Link className={`inline-flex min-h-12 items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold shadow-sm ${primary ? "bg-black text-white hover:bg-slate-800" : "bg-slate-100 text-slate-950 hover:bg-slate-200"}`} href={href}>
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  tone = "slate",
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "slate" | "green" | "red";
}) {
  const toneClass = tone === "red" ? "text-red-700 bg-red-50" : tone === "green" ? "text-emerald-700 bg-emerald-50" : "text-slate-700 bg-slate-50";
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-stitch">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-label-caps uppercase text-slate-500">{label}</p>
          <p className="mt-3 font-mono text-2xl font-semibold text-slate-950">{value}</p>
        </div>
        <span className={`rounded-xl p-2 ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </article>
  );
}

function Panel({
  title,
  icon: Icon,
  badge,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-stitch">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-slate-700" />
          <h2 className="text-title-md text-slate-950">{title}</h2>
        </div>
        {badge ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold uppercase text-slate-600">{badge}</span> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function RecordGrid({
  id,
  title,
  items,
  empty,
}: {
  id: string;
  title: string;
  items: Array<{ href: string; title: string; meta: string; status: string }>;
  empty: string;
}) {
  return (
    <section id={id}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-title-md text-slate-950">{title}</h3>
        <span className="font-mono text-xs text-slate-500">{items.length}</span>
      </div>
      {items.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {items.map((item) => (
            <Link key={`${item.href}-${item.title}`} className="group rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-emerald-200 hover:bg-emerald-50" href={item.href}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-950">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.meta}</p>
                </div>
                <StatusBadge status={item.status} color={statusColor(item.status)} />
              </div>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 opacity-0 transition group-hover:opacity-100">
                Open <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">{empty}</div>
      )}
    </section>
  );
}

function Action({ href, label }: { href: string; label: string }) {
  return <Link className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-300" href={href}>{label}</Link>;
}

function DisabledAction({ label, note }: { label: string; note: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
        <Paperclip className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-1 text-xs text-slate-500">{note}</p>
    </div>
  );
}

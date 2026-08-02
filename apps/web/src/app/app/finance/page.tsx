import Link from "next/link";
import { redirect } from "next/navigation";
import type React from "react";
import { AlertTriangle, Banknote, CreditCard, ReceiptText, TrendingUp } from "lucide-react";
import { getSession } from "@/lib/api";
import { getJobPermissions, getJobs } from "@/lib/jobs";
import { Breadcrumbs, DateDisplay, EmptyState, Money, PageHeader, StatusBadge } from "@/components/shared";

type InvoiceLike = NonNullable<Awaited<ReturnType<typeof getJobs>>["items"][number]["invoices"]>[number] & {
  job: Awaited<ReturnType<typeof getJobs>>["items"][number];
};

function moneyValue(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isOverdue(invoice: InvoiceLike) {
  return invoice.dueDate && new Date(invoice.dueDate).getTime() < Date.now() && !["PAID", "CANCELLED"].includes(invoice.status);
}

function invoiceStatusColor(status: string) {
  if (status === "PAID") return "green" as const;
  if (status === "PARTIALLY_PAID" || status === "SENT") return "blue" as const;
  if (status === "DRAFT") return "amber" as const;
  if (status === "CANCELLED" || status === "OVERDUE") return "red" as const;
  return "slate" as const;
}

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const perms = getJobPermissions(session);
  if (!perms.canRead) redirect("/app/dashboard");

  const params = await searchParams;
  const statusFilter = typeof params.status === "string" ? params.status : "";
  const fromFilter = typeof params.from === "string" ? params.from : "";
  const toFilter = typeof params.to === "string" ? params.to : "";
  const searchFilter = typeof params.search === "string" ? params.search.trim().toLowerCase() : "";
  const paymentMethodFilter = typeof params.paymentMethod === "string" ? params.paymentMethod : "";
  const overdueOnly = params.overdue === "1";

  const jobs = await getJobs({ pageSize: 100 });
  const invoices = jobs.items.flatMap((job) => (job.invoices ?? []).map((invoice) => ({ ...invoice, job })));
  const payments = invoices.flatMap((invoice) => (invoice.payments ?? []).map((payment) => ({ ...payment, invoice })));
  const filteredInvoices = invoices.filter((invoice) => {
    const dueTime = invoice.dueDate ? new Date(invoice.dueDate).getTime() : null;
    const fromTime = fromFilter ? new Date(`${fromFilter}T00:00:00`).getTime() : null;
    const toTime = toFilter ? new Date(`${toFilter}T23:59:59`).getTime() : null;
    const haystack = [
      invoice.invoiceNumber,
      invoice.status,
      invoice.job.jobNumber,
      invoice.job.title,
      invoice.job.customer?.displayName,
      invoice.job.site?.label,
    ].filter(Boolean).join(" ").toLowerCase();
    if (statusFilter && invoice.status !== statusFilter) return false;
    if (fromTime && dueTime && dueTime < fromTime) return false;
    if (toTime && dueTime && dueTime > toTime) return false;
    if ((fromTime || toTime) && !dueTime) return false;
    if (overdueOnly && !isOverdue(invoice)) return false;
    if (paymentMethodFilter && !(invoice.payments ?? []).some((payment) => payment.method === paymentMethodFilter)) return false;
    if (searchFilter && !haystack.includes(searchFilter)) return false;
    return true;
  });
  const paymentMethods = Array.from(new Set(payments.map((payment) => payment.method).filter(Boolean))).sort();
  const totalInvoiced = invoices.reduce((sum, invoice) => sum + moneyValue(invoice.total), 0);
  const totalPaid = invoices.reduce((sum, invoice) => sum + moneyValue(invoice.paidAmount), 0);
  const outstanding = invoices.reduce((sum, invoice) => sum + moneyValue(invoice.balanceDue), 0);
  const overdue = invoices.filter(isOverdue);
  const completedUnpaid = jobs.items.filter((job) => job.status === "COMPLETED" && (job.invoices ?? []).some((invoice) => moneyValue(invoice.balanceDue) > 0));
  const negativeMarginJobs = jobs.items.filter((job) => job.profitability && moneyValue(job.profitability.grossProfit) < 0);
  const missingCostJobs = jobs.items.filter((job) => !job.profitability);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Finance", href: "/app/finance" }, { label: "Accounts Receivable" }]} />
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-stitch">
        <PageHeader
          title="Accounts Receivable"
          description="Invoice, payment, overdue, and profitability visibility from existing job billing data."
          actions={<Link className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800" href="/app/jobs">Open jobs</Link>}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Metric label="Total Invoiced" value={<Money amount={totalInvoiced} />} icon={ReceiptText} />
        <Metric label="Total Paid" value={<Money amount={totalPaid} />} icon={CreditCard} tone="green" />
        <Metric label="Outstanding" value={<Money amount={outstanding} />} icon={Banknote} tone={outstanding ? "amber" : "green"} />
        <Metric label="Overdue" value={String(overdue.length)} icon={AlertTriangle} tone={overdue.length ? "red" : "green"} />
        <Metric label="Negative Margin" value={String(negativeMarginJobs.length)} icon={TrendingUp} tone={negativeMarginJobs.length ? "red" : "green"} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-stitch">
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.8fr_auto]" method="get">
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Search
            <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" name="search" defaultValue={typeof params.search === "string" ? params.search : ""} placeholder="Invoice, customer, job, site" />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Status
            <select className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" name="status" defaultValue={statusFilter}>
              <option value="">All statuses</option>
              {["DRAFT", "ISSUED", "PARTIALLY_PAID", "PAID", "CANCELLED"].map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Due from
            <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" name="from" type="date" defaultValue={fromFilter} />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Due to
            <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" name="to" type="date" defaultValue={toFilter} />
          </label>
          <label className="space-y-1 text-sm font-medium text-slate-700">
            Payment
            <select className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" name="paymentMethod" defaultValue={paymentMethodFilter}>
              <option value="">Any method</option>
              {paymentMethods.map((method) => <option key={method} value={method ?? ""}>{method}</option>)}
            </select>
          </label>
          <div className="flex items-end gap-2">
            <label className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">
              <input name="overdue" type="checkbox" value="1" defaultChecked={overdueOnly} />
              Overdue
            </label>
            <button className="min-h-10 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white" type="submit">Filter</button>
            <Link className="inline-flex min-h-10 items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" href="/app/finance">Reset</Link>
          </div>
        </form>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-stitch">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-title-md text-slate-950">Invoice Register</h2>
            <p className="mt-1 text-sm text-slate-500">Visible invoices from existing job records.</p>
          </div>
          {filteredInvoices.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-table-data">
                <thead className="bg-slate-50/90 text-left text-label-caps uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Invoice</th>
                    <th className="px-4 py-3">Customer / Job</th>
                    <th className="px-4 py-3">Due</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right">Paid</th>
                    <th className="px-4 py-3 text-right">Outstanding</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link className="font-mono font-semibold text-slate-950 hover:text-emerald-700" href={`/app/jobs/${invoice.job.id}`}>{invoice.invoiceNumber}</Link>
                        {isOverdue(invoice) ? <p className="mt-1 text-xs font-semibold text-red-700">Overdue</p> : null}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{invoice.job.customer?.displayName ?? "Customer"} · {invoice.job.jobNumber}</td>
                      <td className="px-4 py-3"><DateDisplay date={invoice.dueDate} /></td>
                      <td className="px-4 py-3 text-right"><Money amount={moneyValue(invoice.total)} currency={invoice.currency} /></td>
                      <td className="px-4 py-3 text-right"><Money amount={moneyValue(invoice.paidAmount)} currency={invoice.currency} /></td>
                      <td className="px-4 py-3 text-right font-semibold"><Money amount={moneyValue(invoice.balanceDue)} currency={invoice.currency} /></td>
                      <td className="px-4 py-3"><StatusBadge status={invoice.status} color={invoiceStatusColor(invoice.status)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-5"><EmptyState title={invoices.length ? "No invoices match these filters" : "No invoices yet"} description={invoices.length ? "Adjust the finance filters to widen the register." : "Completed jobs can generate invoices through the existing job workflow."} /></div>
          )}
        </section>

        <aside className="space-y-6">
          <Panel title="Recent Payments">
            <div className="space-y-3">
              {payments.slice(0, 8).map((payment) => (
                <Link key={payment.id} href={`/app/jobs/${payment.invoice.job.id}`} className="block rounded-xl border border-slate-200 bg-slate-50 p-4 hover:border-emerald-200 hover:bg-emerald-50">
                  <p className="font-mono text-sm font-semibold text-slate-950">{payment.paymentNumber}</p>
                  <p className="mt-1 text-sm text-slate-500">{payment.invoice.invoiceNumber} · {payment.method ?? "Payment"}</p>
                  <p className="mt-2 font-mono font-semibold text-emerald-700"><Money amount={moneyValue(payment.amount)} currency={payment.currency} /></p>
                </Link>
              ))}
              {!payments.length ? <p className="text-sm text-slate-500">No payments have been recorded yet.</p> : null}
            </div>
          </Panel>
          <Panel title="Warnings">
            <div className="space-y-3 text-sm">
              <Warning count={overdue.length} label="Overdue invoices" href="/app/finance" />
              <Warning count={completedUnpaid.length} label="Unpaid completed jobs" href="/app/jobs" />
              <Warning count={negativeMarginJobs.length} label="Negative margin jobs" href="/app/jobs" />
              <Warning count={missingCostJobs.length} label="Jobs missing server profitability" href="/app/jobs" tone="amber" />
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
  tone = "slate",
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "slate" | "green" | "amber" | "red";
}) {
  const toneClass = tone === "green" ? "text-emerald-700 bg-emerald-50" : tone === "amber" ? "text-amber-700 bg-amber-50" : tone === "red" ? "text-red-700 bg-red-50" : "text-slate-700 bg-slate-50";
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-stitch">
      <div className="flex items-center justify-between gap-3">
        <p className="text-label-caps uppercase text-slate-500">{label}</p>
        <span className={`rounded-xl p-2 ${toneClass}`}><Icon className="h-5 w-5" /></span>
      </div>
      <p className="mt-3 font-mono text-2xl font-semibold text-slate-950">{value}</p>
    </article>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-stitch">
      <h2 className="text-title-md text-slate-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Warning({ count, label, href, tone = "red" }: { count: number; label: string; href: string; tone?: "red" | "amber" }) {
  return (
    <Link href={href} className={`flex items-center justify-between rounded-xl px-4 py-3 ${tone === "red" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-800"}`}>
      <span>{label}</span>
      <strong className="font-mono">{count}</strong>
    </Link>
  );
}

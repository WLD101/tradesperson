import Link from "next/link";
import { Download, FileCheck2, FileWarning } from "lucide-react";
import { Card } from "@tradesperson/ui";
import { apiFetch } from "@/lib/api";
import { Breadcrumbs, StatusBadge } from "@/components/shared";

type JobList = {
  items: Array<{
    id: string;
    jobNumber: string;
    status: string;
    customer?: { id: string; displayName: string };
    invoices?: Array<{ id: string; invoiceNumber: string; status: string }> | null;
  }>;
};

type PurchaseOrders = {
  items: Array<{ id: string; purchaseOrderNumber?: string; poNumber?: string; status: string; goodsReceipts?: Array<{ id: string; receiptNumber: string }> }>;
};

type Estimates = { items: Array<{ id: string; estimateNumber: string; status: string }> };
type Quotes = { items: Array<{ id: string; quoteNumber: string; status: string }> };
type Survey = { id: string; reference: string; status: string };

async function optionalFetch<T>(path: string, fallback: T): Promise<T> {
  try {
    return await apiFetch<T>(path);
  } catch {
    return fallback;
  }
}

export default async function DocumentsPage() {
  const [jobs, purchaseOrders, estimates, quotes, surveys] = await Promise.all([
    optionalFetch<JobList>("/api/v1/jobs?page=1&pageSize=10", { items: [] }),
    optionalFetch<PurchaseOrders>("/api/v1/purchase-orders?page=1&pageSize=10", { items: [] }),
    optionalFetch<Estimates>("/api/v1/estimates?page=1&pageSize=10", { items: [] }),
    optionalFetch<Quotes>("/api/v1/quotes?page=1&pageSize=10", { items: [] }),
    optionalFetch<Survey[]>("/api/v1/surveys", []),
  ]);

  const invoice = jobs.items.flatMap((job) => job.invoices ?? []).find((item) => item.status !== "CANCELLED");
  const purchaseOrder = purchaseOrders.items[0];
  const estimate = estimates.items[0];
  const quote = quotes.items[0];
  const job = jobs.items[0];
  const completedJob = jobs.items.find((item) => item.status === "COMPLETED") ?? job;
  const survey = surveys[0];
  const customer = jobs.items.find((item) => item.customer)?.customer;
  const goodsReceipt = purchaseOrders.items.flatMap((item) => item.goodsReceipts ?? [])[0];

  const documents = [
    {
      name: "Invoice PDF",
      status: invoice ? "Live" : "Empty",
      route: invoice ? `/api/v1/invoices/${invoice.id}/pdf` : undefined,
      note: invoice ? `Available for ${invoice.invoiceNumber}.` : "Generate an invoice from a completed job to enable this.",
      live: Boolean(invoice),
    },
    {
      name: "Purchase order print",
      status: purchaseOrder ? "Live" : "Empty",
      route: purchaseOrder ? `/app/procurement/purchase-orders/${purchaseOrder.id}/print` : undefined,
      note: purchaseOrder ? `Printable PO ${purchaseOrder.purchaseOrderNumber ?? purchaseOrder.poNumber}.` : "Create or seed a purchase order to preview.",
      live: Boolean(purchaseOrder),
    },
    {
      name: "Estimate document",
      status: estimate ? "Live" : "Empty",
      route: estimate ? `/app/estimates/${estimate.id}` : "/app/estimates/new",
      note: estimate ? `Live estimate workspace for ${estimate.estimateNumber}.` : "Create an estimate to preview this document.",
      live: Boolean(estimate),
    },
    {
      name: "Quote document",
      status: quote ? "Live" : "Empty",
      route: quote ? `/app/quotes/${quote.id}` : "/app/quotes",
      note: quote ? `Live quote workspace for ${quote.quoteNumber}.` : "Create a quote from an estimate to preview this document.",
      live: Boolean(quote),
    },
    {
      name: "Job sheet",
      status: job ? "Live" : "Empty",
      route: job ? `/app/field/jobs/${job.id}` : "/app/field/jobs",
      note: job ? `Installer-ready field sheet for ${job.jobNumber}.` : "Schedule or create a job to preview the installer sheet.",
      live: Boolean(job),
    },
    {
      name: "Survey report",
      status: survey ? "Live" : "Empty",
      route: survey ? `/app/crm/surveys/${survey.id}/measurements` : "/app/crm/surveys",
      note: survey ? `Live measurements and calculated room areas for ${survey.reference}.` : "Create a survey to preview measurements.",
      live: Boolean(survey),
    },
    {
      name: "Completion certificate",
      status: completedJob ? "Live" : "Empty",
      route: completedJob ? `/app/jobs/${completedJob.id}` : "/app/jobs",
      note: completedJob ? `Completion record available for ${completedJob.jobNumber}.` : "Complete a job to preview completion details.",
      live: Boolean(completedJob),
    },
    {
      name: "Customer statement",
      status: customer ? "Live" : "Empty",
      route: customer ? `/app/crm/customers/${customer.id}` : "/app/crm/customers",
      note: customer ? `Customer 360 statement context for ${customer.displayName}.` : "Create invoice/payment history to preview a customer statement.",
      live: Boolean(customer),
    },
    {
      name: "Material picking list",
      status: job ? "Live" : "Empty",
      route: job ? `/app/jobs/${job.id}` : "/app/jobs",
      note: job ? `Material readiness and issue lines are visible on ${job.jobNumber}.` : "Generate material requirements on a job to preview picking data.",
      live: Boolean(job),
    },
    {
      name: "Delivery note",
      status: goodsReceipt ? "Live" : "Empty",
      route: goodsReceipt ? `/app/procurement/goods-receipts/${goodsReceipt.id}` : "/app/procurement/purchase-orders",
      note: goodsReceipt ? `Goods receipt delivery evidence for ${goodsReceipt.receiptNumber}.` : "Post a goods receipt to preview delivery evidence.",
      live: Boolean(goodsReceipt),
    },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Dashboard", href: "/app/dashboard" }, { label: "Documents" }]} />

      <section className="rounded-3xl bg-slate-950 p-6 text-white shadow-stitch-overlay lg:p-8">
        <p className="text-label-caps text-emerald-300">Customer and operations pack</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">Document Centre</h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300">
          A sellable flooring ERP needs clean documents. This hub exposes live exports plus working app-backed document
          views using the existing tenant-safe records.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {documents.map((document) => (
          <Card key={document.name} className="border-slate-200 bg-white shadow-stitch">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className={`mt-1 inline-flex h-10 w-10 items-center justify-center rounded-2xl ${document.live ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                  {document.live ? <FileCheck2 className="h-5 w-5" /> : <FileWarning className="h-5 w-5" />}
                </span>
                <div>
                  <h2 className="text-lg font-black text-slate-950">{document.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{document.note}</p>
                </div>
              </div>
              <StatusBadge status={document.status} color={document.live ? "green" : document.status === "Empty" ? "amber" : "slate"} />
            </div>
            {document.route ? (
              <Link className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-emerald-700 hover:text-emerald-900" href={document.route}>
                Open live path <Download className="h-4 w-4" />
              </Link>
            ) : (
              <p className="mt-5 text-sm font-semibold text-slate-400">Create source records to enable this document path.</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

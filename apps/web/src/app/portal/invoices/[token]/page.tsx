import { notFound } from "next/navigation";
import { Button, Card } from "@tradesperson/ui";
import { StatusBadge } from "@/components/shared";

type ApiEnvelope<T> = { data?: T; error?: { message?: string } };

type PublicInvoice = {
  tenant: { name: string; businessEmail: string | null; businessPhone: string | null };
  customer: { displayName: string; companyName: string | null; primaryEmail: string | null };
  job: { title: string | null; workNotes: string | null };
  invoiceNumber: string;
  status: string;
  subtotal: string;
  vatAmount: string;
  total: string;
};

async function getInvoice(token: string) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    const res = await fetch(`${apiUrl}/api/v1/public/portal/invoices/${token}`, {
      cache: "no-store",
    });
    const payload = (await res.json()) as ApiEnvelope<PublicInvoice>;
    if (!res.ok || payload.error || !payload.data) return null;
    return payload.data;
  } catch {
    return null;
  }
}

export default async function PublicInvoicePage(props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  const invoice = await getInvoice(params.token);
  if (!invoice) notFound();

  return (
    <div className="min-h-screen bg-stitch-background px-4 py-8 sm:px-6 lg:px-8">
      <Card className="mx-auto w-full max-w-4xl overflow-hidden p-0">
        <div className="bg-slate-950 p-6 text-white">
          <div className="flex flex-col justify-between gap-6 sm:flex-row">
            <div>
              <p className="text-label-caps uppercase text-emerald-300">Customer Portal</p>
              <h1 className="mt-2 text-2xl font-black tracking-tight">{invoice.tenant.name}</h1>
              <div className="mt-4 text-sm text-slate-300">
                <p>{invoice.tenant.businessEmail}</p>
                <p>{invoice.tenant.businessPhone}</p>
              </div>
            </div>
            <div className="sm:text-right">
              <h2 className="text-3xl font-black">Invoice</h2>
              <p className="mt-1 font-mono text-slate-300">{invoice.invoiceNumber}</p>
              <div className="mt-4"><StatusBadge status={invoice.status} color={invoice.status === "PAID" ? "green" : "amber"} /></div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-8 grid grid-cols-1 gap-8 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 text-label-caps uppercase text-slate-500">Billed To</h3>
              <p className="text-sm font-bold text-slate-950">{invoice.customer.displayName}</p>
              {invoice.customer.companyName ? <p className="text-sm text-slate-600">{invoice.customer.companyName}</p> : null}
              <p className="text-sm text-slate-600">{invoice.customer.primaryEmail}</p>
            </div>
            <div>
              <h3 className="mb-2 text-label-caps uppercase text-slate-500">Job Details</h3>
              <p className="text-sm font-bold text-slate-950">{invoice.job.title}</p>
              <p className="mt-1 text-sm text-slate-600">{invoice.job.workNotes}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-slate-600">Subtotal</span>
              <span className="font-mono font-semibold">GBP {Number(invoice.subtotal).toFixed(2)}</span>
            </div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-slate-600">VAT</span>
              <span className="font-mono font-semibold">GBP {Number(invoice.vatAmount).toFixed(2)}</span>
            </div>
            <div className="mt-4 flex items-center justify-between border-t pt-4 text-lg font-bold">
              <span>Total Due</span>
              <span className="font-mono">GBP {Number(invoice.total).toFixed(2)}</span>
            </div>
          </div>

          {invoice.status !== "PAID" ? (
            <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
              <Button className="w-full sm:w-auto" disabled>Online payment not connected</Button>
              <p className="mt-3 text-sm text-slate-500">Please contact the business using the details above to arrange payment.</p>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

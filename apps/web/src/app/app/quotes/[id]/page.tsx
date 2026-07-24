import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { QuoteActions } from "@/components/quotes/quote-actions";
import { Breadcrumbs, DataTable, DateDisplay, Money, PageHeader, StatusBadge, SummaryStrip } from "@/components/shared";
import { getSession } from "@/lib/api";
import { getQuote, getQuotePermissions } from "@/lib/quotes";

function statusColor(status: string) {
  if (status === "DRAFT") return "slate" as const;
  if (status === "SENT") return "blue" as const;
  if (["APPROVED", "CONVERTED"].includes(status)) return "green" as const;
  if (["REJECTED", "EXPIRED", "CANCELLED"].includes(status)) return "red" as const;
  return "slate" as const;
}

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const perms = getQuotePermissions(session);
  if (!perms.canRead) redirect("/app/dashboard");
  const { id } = await params;
  let quote;
  try {
    quote = await getQuote(id);
  } catch (err: any) {
    if (err?.message?.includes("404") || err?.message?.includes("not found")) notFound();
    throw err;
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Quotes", href: "/app/quotes" }, { label: quote.quoteNumber }]} />
      <PageHeader
        title={quote.quoteNumber}
        description={quote.title ?? "Customer quote"}
        actions={
          <div className="flex items-center gap-3">
            <StatusBadge status={quote.status} color={statusColor(quote.status)} />
            <QuoteActions
              quoteId={quote.id}
              status={quote.status}
              canSend={perms.canSend}
              canApprove={perms.canApprove}
              canConvert={perms.canConvert}
            />
          </div>
        }
      />
      <SummaryStrip
        items={[
          { label: "Customer", value: quote.customer?.displayName ?? "-" },
          { label: "Site", value: quote.site?.label ?? "-" },
          { label: "Estimate", value: quote.estimate ? <Link className="text-blue-600" href={`/app/estimates/${quote.estimate.id}`}>{quote.estimate.estimateNumber}</Link> : "-" },
          { label: "Deposit", value: <Money amount={Number(quote.depositRequired)} currency={quote.currency} /> },
          { label: "Paid", value: <Money amount={Number(quote.depositPaid)} currency={quote.currency} /> },
          { label: "Total", value: <Money amount={Number(quote.grandTotal)} currency={quote.currency} /> },
        ]}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
            <h2 className="font-semibold text-slate-950">Quote Lines</h2>
          </div>
          <DataTable headers={["Type", "Description", "Qty", "Sell", "VAT", "Line Total"]}>
            {quote.lines.map((line) => (
              <tr key={line.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-600">{line.lineType}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{line.description}</td>
                <td className="px-4 py-3">{Number(line.quantity).toFixed(2)} {line.unit}</td>
                <td className="px-4 py-3"><Money amount={Number(line.sellTotal)} currency={quote.currency} /></td>
                <td className="px-4 py-3"><Money amount={Number(line.vatAmount)} currency={quote.currency} /></td>
                <td className="px-4 py-3 font-medium"><Money amount={Number(line.lineTotal)} currency={quote.currency} /></td>
              </tr>
            ))}
          </DataTable>
        </section>
        <aside className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="border-b border-slate-100 pb-2 font-semibold text-slate-950">Quote Summary</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd><Money amount={Number(quote.subtotal)} currency={quote.currency} /></dd></div>
              <div className="flex justify-between"><dt>VAT</dt><dd><Money amount={Number(quote.vatAmount)} currency={quote.currency} /></dd></div>
              <div className="flex justify-between border-t border-slate-100 pt-3 text-base font-semibold"><dt>Total</dt><dd><Money amount={Number(quote.grandTotal)} currency={quote.currency} /></dd></div>
              <div className="flex justify-between"><dt>Valid until</dt><dd><DateDisplay date={quote.validUntil} /></dd></div>
              <div className="flex justify-between"><dt>Sent</dt><dd><DateDisplay date={quote.sentAt} /></dd></div>
              <div className="flex justify-between"><dt>Approved</dt><dd><DateDisplay date={quote.approvedAt} /></dd></div>
            </dl>
          </section>
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="border-b border-slate-100 pb-2 font-semibold text-slate-950">Versions</h2>
            <div className="mt-4 space-y-3">
              {quote.versions.length ? quote.versions.map((version) => (
                <div className="rounded-md border border-slate-200 p-3 text-sm" key={version.id}>
                  <div className="flex justify-between font-medium">
                    <span>Version {version.versionNumber}</span>
                    <StatusBadge status={version.status} color={statusColor(version.status)} />
                  </div>
                  <p className="mt-2"><Money amount={Number(version.grandTotal)} currency={quote.currency} /></p>
                  <p className="text-xs text-slate-500"><DateDisplay date={version.createdAt} /></p>
                </div>
              )) : <p className="text-sm text-slate-500">No quote versions yet.</p>}
            </div>
          </section>
          {quote.terms ? (
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-slate-950">Terms</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{quote.terms}</p>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

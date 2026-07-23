import Link from "next/link";
import { redirect } from "next/navigation";
import { Breadcrumbs, DataTable, DateDisplay, EmptyState, FilterBar, Money, PageHeader, StatusBadge } from "@/components/shared";
import { getSession } from "@/lib/api";
import { getQuotePermissions, getQuotes } from "@/lib/quotes";

function statusColor(status: string) {
  if (status === "DRAFT") return "slate" as const;
  if (status === "SENT") return "blue" as const;
  if (["APPROVED", "CONVERTED"].includes(status)) return "green" as const;
  if (["REJECTED", "EXPIRED", "CANCELLED"].includes(status)) return "red" as const;
  return "slate" as const;
}

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const perms = getQuotePermissions(session);
  if (!perms.canRead) redirect("/app/dashboard");

  const params = await searchParams;
  const page = typeof params.page === "string" ? Number(params.page) : 1;
  const search = typeof params.search === "string" ? params.search : undefined;
  const status = typeof params.status === "string" ? params.status : undefined;
  const response = await getQuotes({ page, pageSize: 20, search, status });

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Quotes" }]} />
      <PageHeader title="Quotes" description="Customer-facing quote versions created from approved estimates." />
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <FilterBar>
          <form className="flex w-full flex-col gap-3 sm:flex-row" method="get">
            <input className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm sm:w-64" name="search" defaultValue={search ?? ""} placeholder="Search quote or customer" />
            <select className="rounded-md border border-slate-300 px-3 py-1.5 text-sm" name="status" defaultValue={status ?? ""}>
              <option value="">All statuses</option>
              {["DRAFT", "SENT", "APPROVED", "REJECTED", "EXPIRED", "CANCELLED", "CONVERTED"].map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <button className="rounded-md bg-slate-100 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200" type="submit">Apply</button>
          </form>
        </FilterBar>
        {response.items.length ? (
          <>
            <DataTable headers={["Number", "Customer", "Site", "Estimate", "Deposit", "Total", "Status", "Created", ""]}>
              {response.items.map((quote) => (
                <tr key={quote.id} className="group hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <Link href={`/app/quotes/${quote.id}`}>{quote.quoteNumber}</Link>
                    {quote.title ? <p className="mt-0.5 text-xs font-normal text-slate-500">{quote.title}</p> : null}
                  </td>
                  <td className="px-4 py-3">{quote.customer?.displayName ?? "-"}</td>
                  <td className="px-4 py-3">{quote.site?.label ?? "-"}</td>
                  <td className="px-4 py-3">{quote.estimate?.estimateNumber ?? "-"}</td>
                  <td className="px-4 py-3"><Money amount={Number(quote.depositRequired)} currency={quote.currency} /></td>
                  <td className="px-4 py-3"><Money amount={Number(quote.grandTotal)} currency={quote.currency} /></td>
                  <td className="px-4 py-3"><StatusBadge status={quote.status} color={statusColor(quote.status)} /></td>
                  <td className="px-4 py-3 text-slate-500"><DateDisplay date={quote.createdAt} /></td>
                  <td className="px-4 py-3 text-right opacity-0 group-hover:opacity-100">
                    <Link href={`/app/quotes/${quote.id}`} className="text-sm font-medium text-blue-600">View</Link>
                  </td>
                </tr>
              ))}
            </DataTable>
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              <span>Showing {response.items.length} of {response.total} quotes</span>
              <span>Page {response.page} of {response.totalPages}</span>
            </div>
          </>
        ) : (
          <EmptyState title="No quotes found" description="Create a quote from an estimate marked ready for quote." />
        )}
      </div>
    </div>
  );
}

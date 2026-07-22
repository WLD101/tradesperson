import Link from "next/link";
import { Card } from "@tradesperson/ui";
import { apiFetch } from "@/lib/api";

export default async function PurchaseOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // session not used yet
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value.trim()) {
      query.set(key, value);
    }
  }

  const response = await apiFetch<{
    items: Array<any>;
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>(`/api/v1/purchase-orders?${query.toString()}`);

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">Purchase Orders</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage purchase orders.
            </p>
          </div>
          <Link
            href="/app/procurement/purchase-orders/new"
            className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            New purchase order
          </Link>
        </div>
        <form className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6" method="get">
          <input
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            name="search"
            defaultValue={typeof params.search === "string" ? params.search : ""}
            placeholder="Search by ID or reference"
          />
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Apply filters
          </button>
        </form>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            {response.total} purchase orders across {response.totalPages} pages
          </p>
          <p className="text-sm text-slate-500">
            Page {response.page} of {response.totalPages}
          </p>
        </div>
        <div className="mt-4">
          {response.items.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2 text-sm">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">ID</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {response.items.map((item) => (
                    <tr key={item.id} className="rounded-xl bg-slate-50">
                      <td className="border-y border-slate-200 px-3 py-3 first:rounded-l-xl first:border-l">{item.purchaseOrderNumber}</td>
                      <td className="border-y border-slate-200 px-3 py-3">{item.status}</td>
                      <td className="border-y border-slate-200 px-3 py-3 last:rounded-r-xl last:border-r">
                        <Link href={`/app/procurement/purchase-orders/${item.id}`} className="text-sm font-medium text-slate-700 hover:text-slate-950">View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
              No purchase orders found.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

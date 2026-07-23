import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Breadcrumbs,
  DataTable,
  DateDisplay,
  EmptyState,
  FilterBar,
  Money,
  PageHeader,
  StatusBadge,
} from "@/components/shared";
import { apiFetch, getSession } from "@/lib/api";
import { getEstimatePermissions, getEstimates } from "@/lib/estimates";

function statusColor(status: string) {
  if (status === "DRAFT") return "slate" as const;
  if (["CALCULATED", "READY_FOR_QUOTE", "QUOTED"].includes(status)) return "blue" as const;
  if (status === "ACCEPTED") return "green" as const;
  if (["REJECTED", "CANCELLED"].includes(status)) return "red" as const;
  return "slate" as const;
}

export default async function EstimatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  const perms = getEstimatePermissions(session);
  if (!perms.canRead) redirect("/app/dashboard");

  const params = await searchParams;
  const page = typeof params.page === "string" ? Number(params.page) : 1;
  const status = typeof params.status === "string" ? params.status : undefined;
  const branchId = typeof params.branchId === "string" ? params.branchId : undefined;
  const search = typeof params.search === "string" ? params.search : undefined;

  const [branches, responseResult] = await Promise.all([
    apiFetch<Array<{ id: string; name: string }>>("/api/v1/branches").catch(() => []),
    getEstimates({ page, pageSize: 20, status, branchId, search })
      .then((data) => ({ data, error: null as string | null }))
      .catch((err: Error) => ({
        data: { items: [], total: 0, page: 1, pageSize: 20, totalPages: 1 },
        error: err.message || "Unable to load estimates right now.",
      })),
  ]);
  const response = responseResult.data;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Estimates" }]} />
      <PageHeader
        title="Estimates"
        description="Create costed flooring estimates from customer sites, rooms and catalogue lines."
        actions={
          perms.canCreate ? (
            <Link
              href="/app/estimates/new"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              New Estimate
            </Link>
          ) : null
        }
      />

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <FilterBar>
          <form className="flex w-full flex-col gap-3 sm:flex-row" method="get">
            <input
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm sm:w-64"
              name="search"
              defaultValue={search ?? ""}
              placeholder="Search estimate, customer or site"
            />
            <select
              name="status"
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm"
              defaultValue={status ?? ""}
            >
              <option value="">All statuses</option>
              {["DRAFT", "CALCULATED", "READY_FOR_QUOTE", "QUOTED", "ACCEPTED", "REJECTED", "CANCELLED"].map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <select
              name="branchId"
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm"
              defaultValue={branchId ?? ""}
            >
              <option value="">All branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
            <button className="rounded-md bg-slate-100 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200" type="submit">
              Apply
            </button>
          </form>
        </FilterBar>

        {responseResult.error ? (
          <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {responseResult.error}
          </div>
        ) : null}

        {response.items.length ? (
          <>
            <DataTable headers={["Number", "Customer", "Site", "Lines", "Total", "Margin", "Status", "Created", ""]}>
              {response.items.map((estimate) => (
                <tr key={estimate.id} className="group hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <Link href={`/app/estimates/${estimate.id}`}>{estimate.estimateNumber}</Link>
                    {estimate.title ? <p className="mt-0.5 text-xs font-normal text-slate-500">{estimate.title}</p> : null}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{estimate.customer?.displayName ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-700">{estimate.site?.label ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-700">{estimate._count?.lines ?? estimate.lines?.length ?? 0}</td>
                  <td className="px-4 py-3 text-slate-700">
                    <Money amount={Number(estimate.grandTotal)} currency={estimate.currency} />
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {estimate.grossMarginPercent ? `${Number(estimate.grossMarginPercent).toFixed(1)}%` : "-"}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={estimate.status} color={statusColor(estimate.status)} /></td>
                  <td className="px-4 py-3 text-slate-500"><DateDisplay date={estimate.createdAt} /></td>
                  <td className="px-4 py-3 text-right opacity-0 transition-opacity group-hover:opacity-100">
                    <Link className="text-sm font-medium text-blue-600 hover:text-blue-800" href={`/app/estimates/${estimate.id}`}>View</Link>
                  </td>
                </tr>
              ))}
            </DataTable>
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              <span>Showing {response.items.length} of {response.total} estimates</span>
              <span>Page {response.page} of {response.totalPages}</span>
            </div>
          </>
        ) : (
          <EmptyState
            title="No estimates found"
            description="Create an estimate from a customer site, rooms and priced catalogue lines."
            action={perms.canCreate ? (
              <Link className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800" href="/app/estimates/new">
                Create Estimate
              </Link>
            ) : null}
          />
        )}
      </div>
    </div>
  );
}

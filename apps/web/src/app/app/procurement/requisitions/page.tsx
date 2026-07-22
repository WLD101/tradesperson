import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/api";
import { getProcurementPermissions, getRequisitions } from "@/lib/procurement";
import { PageHeader, Breadcrumbs, StatusBadge, DataTable, FilterBar, EmptyState, DateDisplay } from "@/components/shared";

export default async function RequisitionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }

  const perms = getProcurementPermissions(session);
  if (!perms.canViewRequisition) {
    redirect("/app/dashboard");
  }

  const params = await searchParams;
  const page = typeof params.page === "string" ? parseInt(params.page, 10) : 1;
  const status = typeof params.status === "string" ? params.status : undefined;
  const branchId = typeof params.branchId === "string" ? params.branchId : undefined;
  const search = typeof params.search === "string" ? params.search : undefined;

  const apiParams: any = { page, pageSize: 20 };
  if (status) apiParams.status = status;
  if (branchId) apiParams.branchId = branchId;
  if (search) apiParams.search = search;

  const response = await getRequisitions(apiParams).catch(() => ({
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  }));

  const getStatusColor = (s: string) => {
    if (s === "DRAFT") return "slate";
    if (s === "SUBMITTED") return "amber";
    if (s === "APPROVED") return "green";
    if (s === "ORDERED") return "blue";
    if (s === "REJECTED" || s === "CANCELLED") return "red";
    return "slate";
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "Procurement", href: "/app/procurement" }, 
        { label: "Requisitions" }
      ]} />
      
      <PageHeader 
        title="Purchase Requisitions" 
        description="Manage purchase requisitions across your branches."
        actions={
          perms.canManageRequisition && (
            <Link
              href="/app/procurement/requisitions/new"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 shadow-sm"
            >
              New Requisition
            </Link>
          )
        }
      />

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <FilterBar>
          <form className="flex flex-col sm:flex-row gap-3 w-full" method="get">
            <input
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-500 w-full sm:w-64"
              name="search"
              defaultValue={search ?? ""}
              placeholder="Search by Requisition #"
            />
            <select
              name="status"
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-500"
              defaultValue={status ?? ""}
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="ORDERED">Ordered</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <select
              name="branchId"
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-500"
              defaultValue={branchId ?? ""}
            >
              <option value="">All Branches</option>
              {session.memberships
                .find((m) => m.tenantId === session.activeTenantId)
                ?.permissions.includes("admin") && <option value="unfiltered">Show All</option>
              }
            </select>
            <button
              type="submit"
              className="rounded-md bg-slate-100 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              Apply
            </button>
          </form>
        </FilterBar>

        {response.items.length > 0 ? (
          <>
            <DataTable headers={["Number", "Purpose", "Requested By", "Required Date", "Lines", "Status", "Created", ""]}>
              {response.items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors group cursor-pointer">
                  <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                    <Link href={`/app/procurement/requisitions/${item.id}`} className="block">
                      {item.requisitionNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-700 max-w-xs truncate">
                    {item.purpose || "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                    {item.createdBy ? `${item.createdBy.firstName} ${item.createdBy.lastName}` : "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                    <DateDisplay date={item.requiredDate} />
                  </td>
                  <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                    {item.lines?.length || 0}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge status={item.status} color={getStatusColor(item.status)} />
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    <DateDisplay date={item.createdAt} />
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link href={`/app/procurement/requisitions/${item.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </DataTable>
            <div className="flex items-center justify-between p-4 border-t border-slate-200 bg-slate-50">
              <p className="text-sm text-slate-500">
                Showing <span className="font-medium">{response.items.length}</span> of <span className="font-medium">{response.total}</span> requisitions
              </p>
              <div className="flex items-center space-x-2">
                <p className="text-sm text-slate-500">
                  Page {response.page} of {response.totalPages}
                </p>
              </div>
            </div>
          </>
        ) : (
          <EmptyState 
            title="No requisitions found" 
            description="Adjust your filters or create a new requisition to get started."
            action={perms.canManageRequisition ? (
              <Link href="/app/procurement/requisitions/new" className="mt-4 inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
                Create Requisition
              </Link>
            ) : null}
          />
        )}
      </div>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { apiFetch, getSession } from "@/lib/api";
import { getProcurementPermissions, getPurchaseOrders } from "@/lib/procurement";
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

export default async function PurchaseOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }

  const permissions = getProcurementPermissions(session);
  if (!permissions.canViewPo) {
    redirect("/app/procurement");
  }

  const params = await searchParams;
  const page = typeof params.page === "string" ? Number.parseInt(params.page, 10) : 1;
  const status = typeof params.status === "string" ? params.status : undefined;
  const branchId = typeof params.branchId === "string" ? params.branchId : undefined;
  const supplierId = typeof params.supplierId === "string" ? params.supplierId : undefined;
  const search = typeof params.search === "string" ? params.search : undefined;

  const listParams: Parameters<typeof getPurchaseOrders>[0] = { page, pageSize: 20 };
  if (status) listParams.status = status;
  if (branchId) listParams.branchId = branchId;
  if (supplierId) listParams.supplierId = supplierId;
  if (search) listParams.search = search;

  const [branches, suppliers, response] = await Promise.all([
    apiFetch<Array<{ id: string; name: string }>>("/api/v1/branches").catch(() => []),
    apiFetch<{
      items: Array<{ id: string; legalName: string; tradingName: string | null; supplierCode: string }>;
    }>("/api/v1/suppliers?pageSize=100&sort=nameAsc").catch(() => ({ items: [] })),
    getPurchaseOrders(listParams),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Procurement", href: "/app/procurement" },
          { label: "Purchase Orders" },
        ]}
      />

      <PageHeader
        title="Purchase Orders"
        description="Manage supplier orders, versions, acknowledgements, and delivery commitments."
        actions={
          permissions.canManagePo ? (
            <Link
              href="/app/procurement/purchase-orders/new"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              New Purchase Order
            </Link>
          ) : null
        }
      />

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <FilterBar>
          <form className="grid w-full gap-3 md:grid-cols-2 xl:grid-cols-5" method="get">
            <input
              name="search"
              defaultValue={search ?? ""}
              placeholder="Search PO, supplier, reference"
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            />
            <select
              name="status"
              defaultValue={status ?? ""}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING_APPROVAL">Pending approval</option>
              <option value="APPROVED">Approved</option>
              <option value="ISSUED">Issued</option>
              <option value="ACKNOWLEDGED">Acknowledged</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <select
              name="branchId"
              defaultValue={branchId ?? ""}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="">All branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
            <select
              name="supplierId"
              defaultValue={supplierId ?? ""}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="">All suppliers</option>
              {suppliers.items.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {(supplier.tradingName || supplier.legalName)} ({supplier.supplierCode})
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              Apply
            </button>
          </form>
        </FilterBar>

        {response.items.length > 0 ? (
          <>
            <DataTable
              headers={["PO Number", "Supplier", "Branch", "Version", "Total", "Expected", "Status", ""]}
            >
              {response.items.map((item) => {
                const currentVersion = item.versions[0];
                return (
                  <tr key={item.id} className="group hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <Link href={`/app/procurement/purchase-orders/${item.id}`}>{item.purchaseOrderNumber}</Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {item.supplier.tradingName || item.supplier.legalName}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{item.branch.name}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {currentVersion ? `v${currentVersion.versionNumber}` : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <Money amount={Number.parseFloat(item.total)} currency={item.currency} />
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <DateDisplay date={item.expectedDate} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} color={statusColor(item.status)} />
                    </td>
                    <td className="px-4 py-3 text-right opacity-0 transition-opacity group-hover:opacity-100">
                      <Link
                        href={`/app/procurement/purchase-orders/${item.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </DataTable>
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              <p>
                Showing <span className="font-medium">{response.items.length}</span> of{" "}
                <span className="font-medium">{response.total}</span> purchase orders
              </p>
              <p>
                Page {response.page} of {response.totalPages}
              </p>
            </div>
          </>
        ) : (
          <EmptyState
            title="No purchase orders found"
            description="Create a draft purchase order or adjust the active filters."
            action={
              permissions.canManagePo ? (
                <Link
                  href="/app/procurement/purchase-orders/new"
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Create purchase order
                </Link>
              ) : null
            }
          />
        )}
      </div>
    </div>
  );
}

function statusColor(status: string) {
  if (status === "DRAFT") return "slate";
  if (status === "PENDING_APPROVAL") return "amber";
  if (status === "APPROVED") return "green";
  if (status === "ISSUED" || status === "ACKNOWLEDGED") return "blue";
  if (status === "REJECTED" || status === "CANCELLED") return "red";
  return "slate";
}

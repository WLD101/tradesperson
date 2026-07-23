import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@tradesperson/ui";
import { getSession } from "@/lib/api";
import {
  getProcurementPermissions,
  getRequisitions,
  getPurchaseOrders,
} from "@/lib/procurement";
import { PageHeader, Breadcrumbs, StatusBadge } from "@/components/shared";

export default async function ProcurementPage() {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }

  const perms = getProcurementPermissions(session);

  let draftReq = 0;
  let subReq = 0;
  let appReq = 0;
  let recentRequisitions: Awaited<ReturnType<typeof getRequisitions>>["items"] = [];

  if (perms.canViewRequisition) {
    const [reqD, reqS, reqA, reqRecent] = await Promise.all([
      getRequisitions({ status: "DRAFT", pageSize: 1 }).catch(() => ({ total: 0 })),
      getRequisitions({ status: "SUBMITTED", pageSize: 1 }).catch(() => ({ total: 0 })),
      getRequisitions({ status: "APPROVED", pageSize: 1 }).catch(() => ({ total: 0 })),
      getRequisitions({ pageSize: 5 }).catch(() => ({ items: [] })),
    ]);
    draftReq = reqD.total;
    subReq = reqS.total;
    appReq = reqA.total;
    recentRequisitions = reqRecent.items;
  }

  let draftPo = 0;
  let pendPo = 0;
  let appPo = 0;
  let issPo = 0;
  let recentPurchaseOrders: Awaited<ReturnType<typeof getPurchaseOrders>>["items"] = [];

  if (perms.canViewPo) {
    const [poD, poP, poA, poI, poRecent] = await Promise.all([
      getPurchaseOrders({ status: "DRAFT", pageSize: 1 }).catch(() => ({ total: 0 })),
      getPurchaseOrders({ status: "PENDING_APPROVAL", pageSize: 1 }).catch(() => ({ total: 0 })),
      getPurchaseOrders({ status: "APPROVED", pageSize: 1 }).catch(() => ({ total: 0 })),
      getPurchaseOrders({ status: "ISSUED", pageSize: 1 }).catch(() => ({ total: 0 })),
      getPurchaseOrders({ pageSize: 5 }).catch(() => ({ items: [] })),
    ]);
    draftPo = poD.total;
    pendPo = poP.total;
    appPo = poA.total;
    issPo = poI.total;
    recentPurchaseOrders = poRecent.items;
  }

  const getStatusColor = (status: string) => {
    if (status === "DRAFT") return "slate";
    if (status === "SUBMITTED" || status === "PENDING_APPROVAL") return "amber";
    if (status === "APPROVED") return "green";
    if (status === "PARTIALLY_ORDERED" || status === "ORDERED" || status === "ISSUED" || status === "ACKNOWLEDGED") return "blue";
    if (status === "REJECTED" || status === "CANCELLED") return "red";
    return "slate";
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <Breadcrumbs items={[{ label: "Procurement", href: "/app/procurement" }, { label: "Command Centre" }]} />
      <PageHeader 
        title="Procurement Command Centre" 
        description="Monitor requisitions, purchase orders, and supplier commitments."
        actions={
          <>
            {perms.canManageRequisition && (
              <Link href="/app/procurement/requisitions/new" className="rounded-md bg-white border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                New Requisition
              </Link>
            )}
          </>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        {perms.canViewRequisition && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-lg font-medium text-slate-900">Requisitions</h2>
              <Link href="/app/procurement/requisitions" className="text-sm text-blue-600 hover:underline">View all</Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Link href="/app/procurement/requisitions?status=DRAFT">
                <Card className="h-full hover:border-slate-300 transition-colors bg-white">
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-medium text-slate-500">Draft</p>
                    <StatusBadge status="Action Required" color="slate" />
                  </div>
                  <p className="mt-4 text-3xl font-semibold text-slate-900">{draftReq}</p>
                </Card>
              </Link>
              <Link href="/app/procurement/requisitions?status=SUBMITTED">
                <Card className="h-full hover:border-slate-300 transition-colors bg-white">
                  <p className="text-sm font-medium text-amber-600">Awaiting Approval</p>
                  <p className="mt-4 text-3xl font-semibold text-slate-900">{subReq}</p>
                </Card>
              </Link>
              <Link href="/app/procurement/requisitions?status=APPROVED">
                <Card className="h-full hover:border-slate-300 transition-colors bg-white">
                  <p className="text-sm font-medium text-emerald-600">Approved</p>
                  <p className="mt-4 text-3xl font-semibold text-slate-900">{appReq}</p>
                </Card>
              </Link>
            </div>
          </div>
        )}

        {perms.canViewPo && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-lg font-medium text-slate-900">Purchase Orders</h2>
              <Link href="/app/procurement/purchase-orders" className="text-sm text-blue-600 hover:underline">View all</Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Link href="/app/procurement/purchase-orders?status=PENDING_APPROVAL">
                <Card className="h-full hover:border-slate-300 transition-colors bg-white">
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-medium text-amber-600">Pending</p>
                  </div>
                  <p className="mt-4 text-3xl font-semibold text-slate-900">{pendPo}</p>
                </Card>
              </Link>
              <Link href="/app/procurement/purchase-orders?status=APPROVED">
                <Card className="h-full hover:border-slate-300 transition-colors bg-white">
                  <p className="text-sm font-medium text-emerald-600">Approved</p>
                  <p className="mt-4 text-3xl font-semibold text-slate-900">{appPo}</p>
                </Card>
              </Link>
              <Link href="/app/procurement/purchase-orders?status=ISSUED">
                <Card className="h-full hover:border-slate-300 transition-colors bg-white">
                  <p className="text-sm font-medium text-blue-600">Issued to Supplier</p>
                  <p className="mt-4 text-3xl font-semibold text-slate-900">{issPo}</p>
                </Card>
              </Link>
              <Link href="/app/procurement/purchase-orders?status=DRAFT">
                <Card className="h-full hover:border-slate-300 transition-colors bg-white">
                  <p className="text-sm font-medium text-slate-500">Draft</p>
                  <p className="mt-4 text-3xl font-semibold text-slate-900">{draftPo}</p>
                </Card>
              </Link>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-8 grid gap-6 border-t border-slate-200 pt-8 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-slate-900">Recent Requisitions</h2>
            <Link href="/app/procurement/requisitions" className="text-sm text-blue-600 hover:underline">View all</Link>
          </div>
          <Card className="divide-y divide-slate-100 p-0">
            {recentRequisitions.length ? recentRequisitions.map((item) => (
              <Link
                key={item.id}
                href={`/app/procurement/requisitions/${item.id}`}
                className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50"
              >
                <div>
                  <p className="font-medium text-slate-900">{item.requisitionNumber}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.purpose || item.branch.name}</p>
                </div>
                <StatusBadge status={item.status} color={getStatusColor(item.status)} />
              </Link>
            )) : (
              <div className="px-5 py-10 text-sm text-slate-500">No requisitions are available yet.</div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-slate-900">Recent Purchase Orders</h2>
            <Link href="/app/procurement/purchase-orders" className="text-sm text-blue-600 hover:underline">View all</Link>
          </div>
          <Card className="divide-y divide-slate-100 p-0">
            {recentPurchaseOrders.length ? recentPurchaseOrders.map((item) => (
              <Link
                key={item.id}
                href={`/app/procurement/purchase-orders/${item.id}`}
                className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50"
              >
                <div>
                  <p className="font-medium text-slate-900">{item.purchaseOrderNumber}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {item.supplier.tradingName || item.supplier.legalName}
                  </p>
                </div>
                <StatusBadge status={item.status} color={getStatusColor(item.status)} />
              </Link>
            )) : (
              <div className="px-5 py-10 text-sm text-slate-500">No purchase orders are available yet.</div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

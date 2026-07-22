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

  if (perms.canViewRequisition) {
    const [reqD, reqS, reqA] = await Promise.all([
      getRequisitions({ status: "DRAFT", pageSize: 1 }).catch(() => ({ total: 0 })),
      getRequisitions({ status: "SUBMITTED", pageSize: 1 }).catch(() => ({ total: 0 })),
      getRequisitions({ status: "APPROVED", pageSize: 1 }).catch(() => ({ total: 0 })),
    ]);
    draftReq = reqD.total;
    subReq = reqS.total;
    appReq = reqA.total;
  }

  let draftPo = 0;
  let pendPo = 0;
  let appPo = 0;
  let issPo = 0;

  if (perms.canViewPo) {
    const [poD, poP, poA, poI] = await Promise.all([
      getPurchaseOrders({ status: "DRAFT", pageSize: 1 }).catch(() => ({ total: 0 })),
      getPurchaseOrders({ status: "PENDING_APPROVAL", pageSize: 1 }).catch(() => ({ total: 0 })),
      getPurchaseOrders({ status: "APPROVED", pageSize: 1 }).catch(() => ({ total: 0 })),
      getPurchaseOrders({ status: "ISSUED", pageSize: 1 }).catch(() => ({ total: 0 })),
    ]);
    draftPo = poD.total;
    pendPo = poP.total;
    appPo = poA.total;
    issPo = poI.total;
  }

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
            {perms.canManagePo && (
              <Link href="/app/procurement/purchase-orders/new" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 shadow-sm">
                New Purchase Order
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
      
      <div className="mt-8 pt-8 border-t border-slate-200">
        <h2 className="text-lg font-medium text-slate-900 mb-4">Recent Procurement Activity</h2>
        <Card className="bg-slate-50/50 flex items-center justify-center py-12 text-slate-500 border-dashed border-slate-300">
          Activity timeline will appear here once orders are processed.
        </Card>
      </div>
    </div>
  );
}

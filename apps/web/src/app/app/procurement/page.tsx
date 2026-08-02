import Link from "next/link";
import { redirect } from "next/navigation";
import type React from "react";
import { AlertTriangle, PackageCheck, ReceiptText, ShoppingCart, Truck } from "lucide-react";
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
  let partialPo = 0;
  let fulfilledPo = 0;
  let cancelledPo = 0;
  let recentPurchaseOrders: Awaited<ReturnType<typeof getPurchaseOrders>>["items"] = [];

  if (perms.canViewPo) {
    const [poD, poP, poA, poI, poPartial, poFulfilled, poCancelled, poRecent] = await Promise.all([
      getPurchaseOrders({ status: "DRAFT", pageSize: 1 }).catch(() => ({ total: 0 })),
      getPurchaseOrders({ status: "PENDING_APPROVAL", pageSize: 1 }).catch(() => ({ total: 0 })),
      getPurchaseOrders({ status: "APPROVED", pageSize: 1 }).catch(() => ({ total: 0 })),
      getPurchaseOrders({ status: "ISSUED", pageSize: 1 }).catch(() => ({ total: 0 })),
      getPurchaseOrders({ status: "PARTIALLY_FULFILLED", pageSize: 1 }).catch(() => ({ total: 0 })),
      getPurchaseOrders({ status: "FULFILLED", pageSize: 1 }).catch(() => ({ total: 0 })),
      getPurchaseOrders({ status: "CANCELLED", pageSize: 1 }).catch(() => ({ total: 0 })),
      getPurchaseOrders({ pageSize: 12 }).catch(() => ({ items: [] })),
    ]);
    draftPo = poD.total;
    pendPo = poP.total;
    appPo = poA.total;
    issPo = poI.total;
    partialPo = poPartial.total;
    fulfilledPo = poFulfilled.total;
    cancelledPo = poCancelled.total;
    recentPurchaseOrders = poRecent.items;
  }

  const openPurchaseOrders = recentPurchaseOrders.filter((order) => !["FULFILLED", "CANCELLED", "REJECTED"].includes(order.status));
  const overdueOrders = recentPurchaseOrders.filter((order) => order.expectedDate && new Date(order.expectedDate).getTime() < Date.now() && !["FULFILLED", "CANCELLED"].includes(order.status));
  const committedSpend = openPurchaseOrders.reduce((sum, order) => sum + Number(order.total ?? 0), 0);
  const supplierCount = new Set(recentPurchaseOrders.map((order) => order.supplierId)).size;
  const recentReceipts = recentPurchaseOrders.flatMap((order) => order.goodsReceipts ?? []).slice(0, 5);

  const getStatusColor = (status: string) => {
    if (status === "DRAFT") return "slate";
    if (status === "SUBMITTED" || status === "PENDING_APPROVAL") return "amber";
    if (status === "APPROVED") return "green";
    if (status === "PARTIALLY_ORDERED" || status === "ORDERED" || status === "ISSUED" || status === "ACKNOWLEDGED") return "blue";
    if (status === "REJECTED" || status === "CANCELLED") return "red";
    return "slate";
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Procurement", href: "/app/procurement" }, { label: "Command Centre" }]} />
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-stitch">
        <PageHeader
          title="Procurement Command Centre"
          description="Monitor purchase orders, requisitions, supplier commitments, goods receipts, and material pressure."
          actions={
            <div className="flex flex-wrap gap-2">
              {perms.canManageRequisition && (
                <Link href="/app/procurement/requisitions/new" className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">
                  New Requisition
                </Link>
              )}
              {perms.canManagePo && (
                <Link href="/app/procurement/purchase-orders/new" className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                  New Purchase Order
                </Link>
              )}
            </div>
          }
        />
      </section>

      {perms.canViewPo ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <Metric href="/app/procurement/purchase-orders" label="Open POs" value={openPurchaseOrders.length} icon={ShoppingCart} />
          <Metric href="/app/procurement/purchase-orders?status=DRAFT" label="Draft" value={draftPo} icon={ReceiptText} />
          <Metric href="/app/procurement/purchase-orders?status=PENDING_APPROVAL" label="Awaiting Approval" value={pendPo} icon={AlertTriangle} tone={pendPo ? "amber" : "slate"} />
          <Metric href="/app/procurement/purchase-orders?status=ISSUED" label="Ordered" value={issPo} icon={Truck} tone="blue" />
          <Metric href="/app/procurement/purchase-orders?status=PARTIALLY_FULFILLED" label="Partial Receipts" value={partialPo} icon={PackageCheck} tone={partialPo ? "amber" : "green"} />
          <Metric href="/app/procurement/purchase-orders" label="Overdue" value={overdueOrders.length} icon={AlertTriangle} tone={overdueOrders.length ? "red" : "green"} />
        </section>
      ) : null}

      {perms.canViewPo ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="bg-slate-950 text-white">
            <p className="text-label-caps uppercase text-slate-400">Committed Spend</p>
            <p className="mt-3 font-mono text-3xl font-semibold">£{committedSpend.toFixed(2)}</p>
            <p className="mt-2 text-sm text-slate-300">From open visible purchase orders.</p>
          </Card>
          <Card>
            <p className="text-label-caps uppercase text-slate-500">Supplier Count</p>
            <p className="mt-3 font-mono text-3xl font-semibold text-slate-950">{supplierCount}</p>
            <p className="mt-2 text-sm text-slate-500">Suppliers with recent visible orders.</p>
          </Card>
          <Card>
            <p className="text-label-caps uppercase text-slate-500">Fully Received</p>
            <p className="mt-3 font-mono text-3xl font-semibold text-emerald-700">{fulfilledPo}</p>
            <p className="mt-2 text-sm text-slate-500">Fulfilled purchase orders.</p>
          </Card>
          <Card>
            <p className="text-label-caps uppercase text-slate-500">Cancelled</p>
            <p className="mt-3 font-mono text-3xl font-semibold text-slate-950">{cancelledPo}</p>
            <p className="mt-2 text-sm text-slate-500">Cancelled purchase orders.</p>
          </Card>
        </section>
      ) : null}

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
      
      <div className="grid gap-6 lg:grid-cols-3">
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

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-slate-900">Recent Receipts</h2>
            <Link href="/app/procurement/purchase-orders" className="text-sm text-blue-600 hover:underline">PO receipts</Link>
          </div>
          <Card className="divide-y divide-slate-100 p-0">
            {recentReceipts.length ? recentReceipts.map((receipt) => (
              <Link key={receipt.id} href={`/app/procurement/goods-receipts/${receipt.id}`} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50">
                <div>
                  <p className="font-medium text-slate-900">{receipt.receiptNumber}</p>
                  <p className="mt-1 text-sm text-slate-500">{receipt.warehouse?.name ?? "Warehouse pending"}</p>
                </div>
                <StatusBadge status={receipt.status} color={getStatusColor(receipt.status)} />
              </Link>
            )) : (
              <div className="px-5 py-10 text-sm text-slate-500">No recent goods receipts are available.</div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Metric({
  href,
  label,
  value,
  icon: Icon,
  tone = "slate",
}: {
  href: string;
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "slate" | "green" | "amber" | "red" | "blue";
}) {
  const toneClass = {
    slate: "bg-slate-50 text-slate-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    blue: "bg-blue-50 text-blue-700",
  }[tone];
  return (
    <Link href={href} className="block rounded-xl border border-slate-200 bg-white p-4 shadow-stitch transition hover:border-emerald-200 hover:bg-emerald-50/40">
      <div className="flex items-center justify-between gap-3">
        <p className="text-label-caps uppercase text-slate-500">{label}</p>
        <span className={`rounded-xl p-2 ${toneClass}`}><Icon className="h-4 w-4" /></span>
      </div>
      <p className="mt-3 font-mono text-3xl font-semibold text-slate-950">{value}</p>
    </Link>
  );
}

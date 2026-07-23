import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/api";
import { getProcurementPermissions, getPurchaseOrderPrint } from "@/lib/procurement";
import { DateDisplay, Money, StatusBadge } from "@/components/shared";

export default async function PurchaseOrderPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }

  const permissions = getProcurementPermissions(session);
  if (!permissions.canViewPo) {
    redirect("/app/procurement/purchase-orders");
  }

  const { id } = await params;
  let purchaseOrder;
  try {
    purchaseOrder = await getPurchaseOrderPrint(id);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("404")) {
      notFound();
    }
    throw err;
  }

  const currentVersion = purchaseOrder.versions[0];
  const supplierName = purchaseOrder.supplier.tradingName || purchaseOrder.supplier.legalName;

  return (
    <div className="mx-auto max-w-5xl space-y-6 bg-white px-6 py-8 text-slate-900">
      <div className="flex items-start justify-between gap-6 border-b border-slate-200 pb-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Tradesperson Network</p>
          <h1 className="mt-2 text-3xl font-semibold">{purchaseOrder.purchaseOrderNumber}</h1>
          <p className="mt-2 text-sm text-slate-600">Supplier-facing purchase order print view</p>
        </div>
        <StatusBadge status={purchaseOrder.status} color={statusColor(purchaseOrder.status)} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-lg border border-slate-200 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Supplier</h2>
          <p className="mt-3 text-lg font-semibold">{supplierName}</p>
          <p className="mt-1 text-sm text-slate-600">Code: {purchaseOrder.supplier.supplierCode || "-"}</p>
          <p className="mt-1 text-sm text-slate-600">Supplier reference: {purchaseOrder.supplierReference || "-"}</p>
        </section>

        <section className="rounded-lg border border-slate-200 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Delivery</h2>
          <p className="mt-3 text-sm text-slate-700 whitespace-pre-wrap">{purchaseOrder.deliveryAddress || "Delivery address to be confirmed"}</p>
          <div className="mt-3 space-y-1 text-sm text-slate-600">
            <p>Required date: <DateDisplay date={purchaseOrder.requiredDate} /></p>
            <p>Expected date: <DateDisplay date={purchaseOrder.expectedDate} /></p>
            <p>Version: {currentVersion ? `v${currentVersion.versionNumber}` : "-"}</p>
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Description</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Qty</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Unit Cost</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Line Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {currentVersion?.lines.map((line) => (
              <tr key={line.id}>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{line.description}</p>
                  {line.supplierSku ? <p className="mt-1 text-xs text-slate-500">Supplier SKU: {line.supplierSku}</p> : null}
                </td>
                <td className="px-4 py-3">{line.quantity} {line.unit}</td>
                <td className="px-4 py-3"><Money amount={Number.parseFloat(line.unitCost)} currency={currentVersion.currency} /></td>
                <td className="px-4 py-3"><Money amount={Number.parseFloat(line.lineTotal)} currency={currentVersion.currency} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="ml-auto max-w-sm space-y-2 rounded-lg border border-slate-200 p-5 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Subtotal</span>
          <span><Money amount={Number.parseFloat(currentVersion?.subtotal ?? "0")} currency={currentVersion?.currency ?? purchaseOrder.currency} /></span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Tax</span>
          <span><Money amount={Number.parseFloat(currentVersion?.taxAmount ?? "0")} currency={currentVersion?.currency ?? purchaseOrder.currency} /></span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Delivery</span>
          <span><Money amount={Number.parseFloat(currentVersion?.deliveryAmount ?? purchaseOrder.deliveryAmount ?? "0")} currency={currentVersion?.currency ?? purchaseOrder.currency} /></span>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 pt-2 text-base font-semibold">
          <span>Total</span>
          <span><Money amount={Number.parseFloat(currentVersion?.total ?? purchaseOrder.total)} currency={currentVersion?.currency ?? purchaseOrder.currency} /></span>
        </div>
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

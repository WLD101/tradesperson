import { notFound, redirect } from "next/navigation";
import { apiFetch, getSession } from "@/lib/api";
import { getProcurementPermissions, getPurchaseOrder } from "@/lib/procurement";
import { GoodsReceiptForm } from "@/components/procurement/goods-receipt-form";

export default async function NewGoodsReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }

  const permissions = getProcurementPermissions(session);
  if (!permissions.canCreateReceipt) {
    redirect("/app/procurement/purchase-orders");
  }

  const { id } = await params;
  let purchaseOrder;
  try {
    purchaseOrder = await getPurchaseOrder(id);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("404")) {
      notFound();
    }
    throw err;
  }

  // Must be ISSUED to receive goods
  if (purchaseOrder.status !== "ISSUED" && purchaseOrder.status !== "PARTIALLY_FULFILLED" && purchaseOrder.status !== "ACKNOWLEDGED") {
    redirect(`/app/procurement/purchase-orders/${id}`);
  }

  const warehouses = await apiFetch<Array<{ id: string; name: string }>>("/api/v1/branches").catch(() => []); // Temp fallback until Warehouse API exists

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Receive Goods</h1>
        <p className="mt-1 text-sm text-slate-500">Record items received for PO {purchaseOrder.purchaseOrderNumber}</p>
      </div>

      <GoodsReceiptForm purchaseOrder={purchaseOrder} warehouses={warehouses} />
    </div>
  );
}

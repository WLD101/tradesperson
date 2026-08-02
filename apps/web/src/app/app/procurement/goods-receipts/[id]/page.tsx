import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/api";
import { getProcurementPermissions, getGoodsReceipt } from "@/lib/procurement";
import { Breadcrumbs, DataTable, DateDisplay, PageHeader, StatusBadge, SummaryStrip } from "@/components/shared";
import { GoodsReceiptWorkflow } from "@/components/procurement/goods-receipt-workflow";

const getStatusColor = (status: string) => {
  if (status === "DRAFT") return "slate";
  if (status === "POSTED") return "green";
  if (status === "CANCELLED") return "red";
  return "slate";
};

export default async function GoodsReceiptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }

  const permissions = getProcurementPermissions(session);
  if (!permissions.canViewReceipt) {
    redirect("/app/procurement");
  }

  const { id } = await params;
  let receipt;
  try {
    receipt = await getGoodsReceipt(id);
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("404")) {
      notFound();
    }
    throw err;
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Procurement", href: "/app/procurement" },
          { label: "Purchase Orders", href: "/app/procurement/purchase-orders" },
          { label: receipt.purchaseOrderId, href: `/app/procurement/purchase-orders/${receipt.purchaseOrderId}` },
          { label: `Receipt ${receipt.receiptNumber}` },
        ]}
      />

      <PageHeader
        title={`Goods Receipt ${receipt.receiptNumber}`}
        description={`Recorded against PO ${receipt.purchaseOrderId}`}
        actions={
          <StatusBadge
            status={receipt.status}
            color={getStatusColor(receipt.status)}
          />
        }
      />

      <SummaryStrip
        items={[
          { label: "Warehouse", value: receipt.warehouse?.name ?? "Unknown" },
          { label: "Supplier Ref", value: receipt.supplierReference || "-" },
          { label: "Received", value: <DateDisplay date={receipt.receivedAt} /> },
          { label: "Posted", value: <DateDisplay date={receipt.postedAt} /> },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
              <h2 className="text-lg font-medium text-slate-900">Received Items</h2>
            </div>
            {receipt.lines.length ? (
              <DataTable
                headers={[
                  "Item",
                  "Usable",
                  "Damaged",
                  "Rejected",
                  "Notes",
                ]}
              >
                {receipt.lines.map((line) => (
                  <tr key={line.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{line.purchaseOrderLine?.description ?? "Unknown Item"}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-green-700 font-medium">
                      {line.usableQuantity} {line.unit}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-amber-700">
                      {line.damagedQuantity} {line.unit}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-red-700">
                      {line.rejectedQuantity} {line.unit}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {line.notes || "-"}
                    </td>
                  </tr>
                ))}
              </DataTable>
            ) : (
              <div className="px-4 py-10 text-sm text-slate-500">No lines on this receipt.</div>
            )}
          </div>

          {receipt.notes ? (
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Notes</h3>
              <p className="whitespace-pre-wrap text-sm text-slate-600">{receipt.notes}</p>
            </div>
          ) : null}
          
          <GoodsReceiptWorkflow receipt={receipt} permissions={permissions} />
        </div>
      </div>
    </div>
  );
}

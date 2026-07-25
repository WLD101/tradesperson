import { notFound, redirect } from "next/navigation";
import {
  ActivityTimeline,
  Breadcrumbs,
  DataTable,
  DateDisplay,
  Money,
  PageHeader,
  StatusBadge,
  SummaryStrip,
} from "@/components/shared";
import { getSession } from "@/lib/api";
import { getProcurementPermissions, getPurchaseOrder } from "@/lib/procurement";
import { PurchaseOrderWorkflow } from "@/components/procurement/purchase-order-workflow";

const getStatusColor = (status: string) => {
  if (status === "DRAFT") return "slate";
  if (status === "PENDING_APPROVAL") return "amber";
  if (status === "APPROVED") return "green";
  if (status === "FULFILLED") return "green";
  if (status === "PARTIALLY_FULFILLED") return "amber";
  if (status === "ISSUED" || status === "ACKNOWLEDGED") return "blue";
  if (status === "REJECTED" || status === "CANCELLED") return "red";
  return "slate";
};

export default async function PurchaseOrderDetailPage({
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
    redirect("/app/procurement");
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

  const currentVersion = purchaseOrder.versions[0];
  const supplierName =
    purchaseOrder.supplier.tradingName || purchaseOrder.supplier.legalName;

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Procurement", href: "/app/procurement" },
          { label: "Purchase Orders", href: "/app/procurement/purchase-orders" },
          { label: purchaseOrder.purchaseOrderNumber },
        ]}
      />

      <PageHeader
        title={purchaseOrder.purchaseOrderNumber}
        description={`Supplier ${supplierName}`}
        actions={
          <StatusBadge
            status={purchaseOrder.status}
            color={getStatusColor(purchaseOrder.status)}
          />
        }
      />

      <SummaryStrip
        items={[
          { label: "Branch", value: purchaseOrder.branch.name },
          { label: "Supplier", value: supplierName },
          { label: "Current Version", value: currentVersion ? `v${currentVersion.versionNumber}` : "-" },
          {
            label: "Source Requisition",
            value: purchaseOrder.purchaseRequisition?.requisitionNumber || "Manual PO",
          },
          { label: "Required Date", value: <DateDisplay date={purchaseOrder.requiredDate} /> },
          { label: "Expected Date", value: <DateDisplay date={purchaseOrder.expectedDate} /> },
          { label: "Total", value: <Money amount={parseFloat(purchaseOrder.total)} currency={purchaseOrder.currency} /> },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
              <h2 className="text-lg font-medium text-slate-900">Current Version Lines</h2>
            </div>
            {currentVersion?.lines.length ? (
              <DataTable
                headers={[
                  "Item",
                  "Qty",
                  "Unit Cost",
                  "Line Total",
                  "Required",
                  "Expected",
                ]}
              >
                {currentVersion.lines.map((line) => (
                  <tr key={line.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{line.description}</p>
                      {line.supplierSku ? (
                        <p className="mt-1 text-xs text-slate-500">Supplier SKU: {line.supplierSku}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {line.quantity} {line.unit}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Money amount={parseFloat(line.unitCost)} currency={currentVersion.currency} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Money amount={parseFloat(line.lineTotal)} currency={currentVersion.currency} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <DateDisplay date={line.requiredDate} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <DateDisplay date={line.expectedDate} />
                    </td>
                  </tr>
                ))}
              </DataTable>
            ) : (
              <div className="px-4 py-10 text-sm text-slate-500">No lines are available on the current version.</div>
            )}
          </div>

          {purchaseOrder.internalNotes ? (
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Internal Notes</h3>
              <p className="whitespace-pre-wrap text-sm text-slate-600">{purchaseOrder.internalNotes}</p>
            </div>
          ) : null}

          <PurchaseOrderWorkflow
            purchaseOrder={purchaseOrder}
            permissions={{
              canManagePo: permissions.canManagePo,
              canApprovePo: permissions.canApprovePo,
              canIssuePo: permissions.canIssuePo,
              canManageAcknowledgement: permissions.canManageAcknowledgement,
              canManageDeliveryPlan: permissions.canManageDeliveryPlan,
              canCreateReceipt: permissions.canCreateReceipt,
              canPostReceipt: permissions.canPostReceipt,
            }}
          />
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 border-b border-slate-100 pb-2 text-base font-semibold text-slate-900">
              Version Summary
            </h2>
            {currentVersion ? (
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">Version status</dt>
                  <dd>
                    <StatusBadge
                      status={currentVersion.status}
                      color={getStatusColor(currentVersion.status)}
                    />
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">Subtotal</dt>
                  <dd className="font-medium text-slate-900">
                    <Money amount={parseFloat(currentVersion.subtotal)} currency={currentVersion.currency} />
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">Tax</dt>
                  <dd className="font-medium text-slate-900">
                    <Money amount={parseFloat(currentVersion.taxAmount)} currency={currentVersion.currency} />
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">Delivery</dt>
                  <dd className="font-medium text-slate-900">
                    <Money amount={parseFloat(currentVersion.deliveryAmount)} currency={currentVersion.currency} />
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">Total</dt>
                  <dd className="font-semibold text-slate-950">
                    <Money amount={parseFloat(currentVersion.total)} currency={currentVersion.currency} />
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">Approved</dt>
                  <dd className="text-slate-900">
                    <DateDisplay date={currentVersion.approvedAt} />
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">Issued</dt>
                  <dd className="text-slate-900">
                    <DateDisplay date={currentVersion.issuedAt} />
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-slate-500">No current version is available yet.</p>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 border-b border-slate-100 pb-2 text-base font-semibold text-slate-900">
              Lifecycle Activity
            </h2>
            <ActivityTimeline
              items={[
                ...(purchaseOrder.cancelledAt
                  ? [{ id: "cancelled", user: "System", action: "cancelled", date: purchaseOrder.cancelledAt }]
                  : []),
                ...(purchaseOrder.issuedAt
                  ? [{ id: "issued", user: "System", action: "issued to supplier", date: purchaseOrder.issuedAt }]
                  : []),
                ...(purchaseOrder.approvedAt
                  ? [{ id: "approved", user: "System", action: "approved", date: purchaseOrder.approvedAt }]
                  : []),
                ...(currentVersion && purchaseOrder.status === "PENDING_APPROVAL"
                  ? [{ id: "submitted", user: "System", action: "submitted for approval", date: currentVersion.createdAt ?? purchaseOrder.updatedAt }]
                  : []),
                { id: "created", user: "System", action: "created", date: purchaseOrder.versions.at(-1)?.createdAt ?? purchaseOrder.versions[0]?.createdAt ?? purchaseOrder.updatedAt },
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

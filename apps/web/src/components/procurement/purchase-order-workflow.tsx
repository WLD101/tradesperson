"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  PurchaseOrder,
  PurchaseOrderDeliveryPlanStatus,
  SupplierAcknowledgementStatus,
} from "@/lib/procurement";
import {
  approvePurchaseOrder,
  cancelPurchaseOrder,
  createGoodsReceipt,
  createDeliveryPlan,
  createPurchaseOrderVersion,
  createSupplierAcknowledgement,
  issuePurchaseOrder,
  postGoodsReceipt,
  rejectPurchaseOrder,
  submitPurchaseOrder,
  updateDeliveryPlan,
  updateSupplierAcknowledgement,
} from "@/lib/procurement-client";
import { DateDisplay, Money, StatusBadge } from "@/components/shared";

type Props = {
  purchaseOrder: PurchaseOrder;
  permissions: {
    canManagePo: boolean;
    canApprovePo: boolean;
    canIssuePo: boolean;
    canManageAcknowledgement: boolean;
    canManageDeliveryPlan: boolean;
    canCreateReceipt: boolean;
    canPostReceipt: boolean;
  };
};

export function PurchaseOrderWorkflow({ purchaseOrder, permissions }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const currentVersion = purchaseOrder.versions[0];

  const refresh = () => {
    router.refresh();
  };

  const runAction = async (
    label: string,
    action: () => Promise<unknown>,
    requireConfirm = false,
  ) => {
    if (requireConfirm && !window.confirm(`Are you sure you want to ${label.toLowerCase()} this purchase order?`)) {
      return;
    }

    try {
      setLoadingAction(label);
      setError(null);
      await action();
      refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to ${label.toLowerCase()} purchase order.`);
    } finally {
      setLoadingAction(null);
    }
  };

  const isDraft = purchaseOrder.status === "DRAFT";
  const isPending = purchaseOrder.status === "PENDING_APPROVAL";
  const canCreateNewVersion =
    purchaseOrder.status === "APPROVED" ||
    purchaseOrder.status === "ISSUED" ||
    purchaseOrder.status === "ACKNOWLEDGED";

  return (
    <div className="space-y-6">
      {error ? <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {isDraft && permissions.canManagePo ? (
            <>
              <Link
                href={`/app/procurement/purchase-orders/${purchaseOrder.id}/edit`}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Edit Draft
              </Link>
              <button
                onClick={() => runAction("Submit", () => submitPurchaseOrder(purchaseOrder.id))}
                disabled={loadingAction !== null}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {loadingAction === "Submit" ? "Submitting..." : "Submit for Approval"}
              </button>
            </>
          ) : null}

          {isPending && permissions.canApprovePo ? (
            <>
              <button
                onClick={() => runAction("Approve", () => approvePurchaseOrder(purchaseOrder.id))}
                disabled={loadingAction !== null}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {loadingAction === "Approve" ? "Approving..." : "Approve"}
              </button>
              <button
                onClick={() => runAction("Reject", () => rejectPurchaseOrder(purchaseOrder.id), true)}
                disabled={loadingAction !== null}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {loadingAction === "Reject" ? "Rejecting..." : "Reject"}
              </button>
            </>
          ) : null}

          {purchaseOrder.status === "APPROVED" && permissions.canIssuePo ? (
            <button
              onClick={() => runAction("Issue", () => issuePurchaseOrder(purchaseOrder.id))}
              disabled={loadingAction !== null}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loadingAction === "Issue" ? "Issuing..." : "Issue to Supplier"}
            </button>
          ) : null}

          {canCreateNewVersion && permissions.canManagePo ? (
            <button
              onClick={() => runAction("Create new version", () => createPurchaseOrderVersion(purchaseOrder.id))}
              disabled={loadingAction !== null}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {loadingAction === "Create new version" ? "Creating..." : "New Version"}
            </button>
          ) : null}

          {(purchaseOrder.status === "DRAFT" ||
            purchaseOrder.status === "PENDING_APPROVAL" ||
            purchaseOrder.status === "APPROVED") &&
          permissions.canManagePo ? (
            <button
              onClick={() => runAction("Cancel", () => cancelPurchaseOrder(purchaseOrder.id), true)}
              disabled={loadingAction !== null}
              className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
            >
              {loadingAction === "Cancel" ? "Cancelling..." : "Cancel PO"}
            </button>
          ) : null}

          <Link
            href={`/app/procurement/purchase-orders/${purchaseOrder.id}/print`}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            target="_blank"
          >
            Supplier Print View
          </Link>
        </div>

        {currentVersion ? (
          <p className="mt-3 text-sm text-slate-500">
            Current version: <span className="font-medium text-slate-900">v{currentVersion.versionNumber}</span> with{" "}
            <StatusBadge status={currentVersion.status} color={statusColor(currentVersion.status)} />
          </p>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Version History</h3>
              <p className="mt-1 text-sm text-slate-500">Track every issued or draft revision on this order.</p>
            </div>
          </div>
          <div className="space-y-3">
            {purchaseOrder.versions.map((version) => (
              <div key={version.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">Version {version.versionNumber}</p>
                    <p className="text-sm text-slate-500">
                      {version.lines.length} lines, total <Money amount={Number.parseFloat(version.total)} currency={version.currency} />
                    </p>
                  </div>
                  <StatusBadge status={version.status} color={statusColor(version.status)} />
                </div>
                <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                  <p>Expected: <span className="text-slate-900"><DateDisplay date={version.expectedDate} /></span></p>
                  <p>Approved: <span className="text-slate-900"><DateDisplay date={version.approvedAt} /></span></p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <AcknowledgementsPanel
          purchaseOrder={purchaseOrder}
          canManage={permissions.canManageAcknowledgement}
          onError={setError}
          onSuccess={refresh}
        />
      </div>

      <DeliveryPlansPanel
        purchaseOrder={purchaseOrder}
        canManage={permissions.canManageDeliveryPlan}
        onError={setError}
        onSuccess={refresh}
      />

      <GoodsReceiptsPanel
        purchaseOrder={purchaseOrder}
        canCreate={permissions.canCreateReceipt}
        canPost={permissions.canPostReceipt}
        onError={setError}
        onSuccess={refresh}
      />
    </div>
  );
}

function GoodsReceiptsPanel({
  purchaseOrder,
  canCreate,
  canPost,
  onError,
  onSuccess,
}: {
  purchaseOrder: PurchaseOrder;
  canCreate: boolean;
  canPost: boolean;
  onError: (value: string | null) => void;
  onSuccess: () => void;
}) {
  const currentVersion = purchaseOrder.versions[0];
  const [supplierReference, setSupplierReference] = useState("");
  const [notes, setNotes] = useState("");
  const [quantities, setQuantities] = useState<Record<string, { received: string; damaged: string; rejected: string }>>(
    () =>
      Object.fromEntries(
        (currentVersion?.lines ?? []).map((line) => [
          line.id,
          { received: remainingQuantity(purchaseOrder, line.id, Number.parseFloat(line.quantity)).toString(), damaged: "0", rejected: "0" },
        ]),
      ),
  );
  const [saving, setSaving] = useState(false);
  const [postingId, setPostingId] = useState<string | null>(null);

  const canReceive =
    canCreate &&
    currentVersion &&
    ["APPROVED", "ISSUED", "ACKNOWLEDGED", "PARTIALLY_FULFILLED"].includes(purchaseOrder.status);

  const handleQuantity = (
    lineId: string,
    key: "received" | "damaged" | "rejected",
    value: string,
  ) => {
    setQuantities((current) => ({
      ...current,
      [lineId]: { ...(current[lineId] ?? { received: "0", damaged: "0", rejected: "0" }), [key]: value },
    }));
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentVersion) return;

    const lines = currentVersion.lines
      .map((line) => {
        const qty = quantities[line.id] ?? { received: "0", damaged: "0", rejected: "0" };
        return {
          purchaseOrderLineId: line.id,
          receivedQuantity: Number.parseFloat(qty.received || "0"),
          damagedQuantity: Number.parseFloat(qty.damaged || "0"),
          rejectedQuantity: Number.parseFloat(qty.rejected || "0"),
        };
      })
      .filter((line) => line.receivedQuantity + line.damagedQuantity + line.rejectedQuantity > 0);

    if (lines.length === 0) {
      onError("Enter at least one quantity to receive.");
      return;
    }

    try {
      setSaving(true);
      onError(null);
      await createGoodsReceipt(purchaseOrder.id, {
        supplierReference: supplierReference || null,
        idempotencyKey: `web-${purchaseOrder.id}-${Date.now()}`,
        notes: notes || null,
        lines,
      });
      setSupplierReference("");
      setNotes("");
      onSuccess();
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : "Failed to create goods receipt.");
    } finally {
      setSaving(false);
    }
  };

  const handlePost = async (receiptId: string) => {
    if (!window.confirm("Post this goods receipt into stock? This creates immutable inventory movements.")) {
      return;
    }
    try {
      setPostingId(receiptId);
      onError(null);
      await postGoodsReceipt(receiptId);
      onSuccess();
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : "Failed to post goods receipt.");
    } finally {
      setPostingId(null);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Goods Receipts</h3>
          <p className="mt-1 text-sm text-slate-500">
            Receive usable stock, quarantine damaged goods, and post immutable stock movements.
          </p>
        </div>
        <StatusBadge status={purchaseOrder.status} color={statusColor(purchaseOrder.status)} />
      </div>

      {canReceive && currentVersion ? (
        <form onSubmit={handleCreate} className="mt-5 space-y-4 border-t border-slate-200 pt-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Supplier reference</label>
              <input
                type="text"
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={supplierReference}
                onChange={(event) => setSupplierReference(event.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Receipt notes</label>
              <input
                type="text"
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Ordered</th>
                  <th className="px-3 py-2">Remaining</th>
                  <th className="px-3 py-2">Usable</th>
                  <th className="px-3 py-2">Damaged</th>
                  <th className="px-3 py-2">Rejected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentVersion.lines.map((line) => {
                  const remaining = remainingQuantity(purchaseOrder, line.id, Number.parseFloat(line.quantity));
                  const value = quantities[line.id] ?? { received: "0", damaged: "0", rejected: "0" };
                  return (
                    <tr key={line.id}>
                      <td className="px-3 py-2 font-medium text-slate-900">{line.description}</td>
                      <td className="px-3 py-2 text-slate-600">{line.quantity} {line.unit}</td>
                      <td className="px-3 py-2 text-slate-600">{remaining.toFixed(4)} {line.unit}</td>
                      {(["received", "damaged", "rejected"] as const).map((key) => (
                        <td key={key} className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            step="0.0001"
                            className="w-24 rounded-md border border-slate-300 px-2 py-1"
                            value={value[key]}
                            onChange={(event) => handleQuantity(line.id, key, event.target.value)}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {saving ? "Creating receipt..." : "Create Draft Receipt"}
          </button>
        </form>
      ) : (
        <p className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-slate-500">
          Receipts can be created after the purchase order is approved or issued.
        </p>
      )}

      <div className="mt-5 space-y-3">
        {purchaseOrder.goodsReceipts.length === 0 ? (
          <p className="text-sm text-slate-500">No goods receipts recorded yet.</p>
        ) : (
          purchaseOrder.goodsReceipts.map((receipt) => (
            <div key={receipt.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{receipt.receiptNumber}</p>
                  <p className="text-sm text-slate-500">
                    {receipt.warehouse?.name ?? "Warehouse"} · received <DateDisplay date={receipt.receivedAt} />
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={receipt.status} color={statusColor(receipt.status)} />
                  {receipt.status === "DRAFT" && canPost ? (
                    <button
                      type="button"
                      onClick={() => handlePost(receipt.id)}
                      disabled={postingId !== null}
                      className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      {postingId === receipt.id ? "Posting..." : "Post"}
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
                <p>Lines: <span className="font-medium text-slate-900">{receipt.lines.length}</span></p>
                <p>Movements: <span className="font-medium text-slate-900">{receipt.inventoryMovements.length}</span></p>
                <p>Posted: <span className="font-medium text-slate-900"><DateDisplay date={receipt.postedAt} /></span></p>
              </div>
              <div className="mt-3 space-y-1 text-sm text-slate-600">
                {receipt.lines.map((line) => (
                  <p key={line.id}>
                    {line.product?.name ?? line.purchaseOrderLine?.description ?? "Receipt line"}:{" "}
                    <span className="text-slate-900">{line.usableQuantity} usable</span>,{" "}
                    <span>{line.damagedQuantity} damaged</span>,{" "}
                    <span>{line.rejectedQuantity} rejected</span>
                  </p>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AcknowledgementsPanel({
  purchaseOrder,
  canManage,
  onError,
  onSuccess,
}: {
  purchaseOrder: PurchaseOrder;
  canManage: boolean;
  onError: (value: string | null) => void;
  onSuccess: () => void;
}) {
  const [status, setStatus] = useState<SupplierAcknowledgementStatus>("PENDING");
  const [supplierReference, setSupplierReference] = useState("");
  const [acknowledgedAt, setAcknowledgedAt] = useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setSaving(true);
      onError(null);
      const payload = {
        purchaseOrderVersionId: purchaseOrder.versions[0]?.id ?? null,
        status,
        supplierReference: supplierReference || null,
        acknowledgedAt: acknowledgedAt ? new Date(acknowledgedAt).toISOString() : null,
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate).toISOString() : null,
        notes: notes || null,
      };

      if (editingId) {
        await updateSupplierAcknowledgement(purchaseOrder.id, editingId, payload);
      } else {
        await createSupplierAcknowledgement(purchaseOrder.id, payload);
      }

      setEditingId(null);
      setStatus("PENDING");
      setSupplierReference("");
      setAcknowledgedAt("");
      setExpectedDeliveryDate("");
      setNotes("");
      onSuccess();
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : "Failed to save supplier acknowledgement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Supplier Acknowledgements</h3>
      <div className="mt-4 space-y-3">
        {purchaseOrder.acknowledgements.length === 0 ? (
          <p className="text-sm text-slate-500">No acknowledgement recorded yet.</p>
        ) : (
          purchaseOrder.acknowledgements.map((ack) => (
            <button
              key={ack.id}
              type="button"
              disabled={!canManage}
              onClick={() => {
                setEditingId(ack.id);
                setStatus(ack.status);
                setSupplierReference(ack.supplierReference ?? "");
                setAcknowledgedAt(toDateInput(ack.acknowledgedAt));
                setExpectedDeliveryDate(toDateInput(ack.expectedDeliveryDate));
                setNotes(ack.notes ?? "");
              }}
              className="w-full rounded-lg border border-slate-200 p-4 text-left disabled:cursor-default"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{ack.supplierReference || "No supplier reference"}</p>
                  <p className="text-sm text-slate-500">
                    Expected delivery <DateDisplay date={ack.expectedDeliveryDate} />
                  </p>
                </div>
                <StatusBadge status={ack.status} color={statusColor(ack.status)} />
              </div>
            </button>
          ))
        )}
      </div>

      {canManage ? (
        <form onSubmit={handleSubmit} className="mt-5 space-y-4 border-t border-slate-200 pt-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
              <select
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={status}
                onChange={(event) => setStatus(event.target.value as SupplierAcknowledgementStatus)}
              >
                <option value="PENDING">Pending</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="ACCEPTED_WITH_CHANGES">Accepted with changes</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Supplier Reference</label>
              <input
                type="text"
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={supplierReference}
                onChange={(event) => setSupplierReference(event.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Acknowledged At</label>
              <input
                type="date"
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={acknowledgedAt}
                onChange={(event) => setAcknowledgedAt(event.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Expected Delivery</label>
              <input
                type="date"
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={expectedDeliveryDate}
                onChange={(event) => setExpectedDeliveryDate(event.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
              <textarea
                rows={3}
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? "Saving..." : editingId ? "Update acknowledgement" : "Record acknowledgement"}
          </button>
        </form>
      ) : null}
    </div>
  );
}

function DeliveryPlansPanel({
  purchaseOrder,
  canManage,
  onError,
  onSuccess,
}: {
  purchaseOrder: PurchaseOrder;
  canManage: boolean;
  onError: (value: string | null) => void;
  onSuccess: () => void;
}) {
  const [status, setStatus] = useState<PurchaseOrderDeliveryPlanStatus>("PLANNED");
  const [expectedDate, setExpectedDate] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState(purchaseOrder.deliveryAddress ?? "");
  const [supplierReference, setSupplierReference] = useState("");
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setSaving(true);
      onError(null);
      const payload = {
        purchaseOrderVersionId: purchaseOrder.versions[0]?.id ?? null,
        status,
        expectedDate: expectedDate ? new Date(expectedDate).toISOString() : null,
        deliveryAddress: deliveryAddress || null,
        supplierReference: supplierReference || null,
        notes: notes || null,
      };

      if (editingId) {
        await updateDeliveryPlan(purchaseOrder.id, editingId, payload);
      } else {
        await createDeliveryPlan(purchaseOrder.id, payload);
      }

      setEditingId(null);
      setStatus("PLANNED");
      setExpectedDate("");
      setSupplierReference("");
      setNotes("");
      onSuccess();
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : "Failed to save delivery plan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Delivery Plans</h3>
      <div className="mt-4 space-y-3">
        {purchaseOrder.deliveryPlans.length === 0 ? (
          <p className="text-sm text-slate-500">No delivery plans recorded yet.</p>
        ) : (
          purchaseOrder.deliveryPlans.map((plan) => (
            <button
              key={plan.id}
              type="button"
              disabled={!canManage}
              onClick={() => {
                setEditingId(plan.id);
                setStatus(plan.status);
                setExpectedDate(toDateInput(plan.expectedDate));
                setDeliveryAddress(plan.deliveryAddress ?? "");
                setSupplierReference(plan.supplierReference ?? "");
                setNotes(plan.notes ?? "");
              }}
              className="w-full rounded-lg border border-slate-200 p-4 text-left disabled:cursor-default"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900"><DateDisplay date={plan.expectedDate} /></p>
                  <p className="text-sm text-slate-500">{plan.deliveryAddress || "No address set"}</p>
                </div>
                <StatusBadge status={plan.status} color={statusColor(plan.status)} />
              </div>
            </button>
          ))
        )}
      </div>

      {canManage ? (
        <form onSubmit={handleSubmit} className="mt-5 space-y-4 border-t border-slate-200 pt-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
              <select
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={status}
                onChange={(event) => setStatus(event.target.value as PurchaseOrderDeliveryPlanStatus)}
              >
                <option value="PLANNED">Planned</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="DELAYED">Delayed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Expected Date</label>
              <input
                type="date"
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={expectedDate}
                onChange={(event) => setExpectedDate(event.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Delivery Address</label>
              <textarea
                rows={3}
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={deliveryAddress}
                onChange={(event) => setDeliveryAddress(event.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Supplier Reference</label>
              <input
                type="text"
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={supplierReference}
                onChange={(event) => setSupplierReference(event.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
              <textarea
                rows={3}
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? "Saving..." : editingId ? "Update delivery plan" : "Add delivery plan"}
          </button>
        </form>
      ) : null}
    </div>
  );
}

function statusColor(status: string) {
  if (status === "DRAFT" || status === "PENDING") {
    return "slate";
  }
  if (status === "PENDING_APPROVAL" || status === "DELAYED") {
    return "amber";
  }
  if (status === "APPROVED" || status === "ACCEPTED" || status === "CONFIRMED" || status === "COMPLETED") {
    return "green";
  }
  if (status === "POSTED" || status === "FULFILLED") {
    return "green";
  }
  if (status === "PARTIALLY_FULFILLED") {
    return "amber";
  }
  if (status === "ISSUED" || status === "ACKNOWLEDGED" || status === "ACCEPTED_WITH_CHANGES") {
    return "blue";
  }
  if (status === "REJECTED" || status === "CANCELLED") {
    return "red";
  }
  return "slate";
}

function toDateInput(value: string | null | undefined) {
  if (!value) {
    return "";
  }
  return new Date(value).toISOString().split("T")[0] ?? "";
}

function remainingQuantity(purchaseOrder: PurchaseOrder, lineId: string, orderedQuantity: number) {
  const receivedQuantity = purchaseOrder.goodsReceipts
    .filter((receipt) => receipt.status === "POSTED")
    .flatMap((receipt) => receipt.lines)
    .filter((line) => line.purchaseOrderLineId === lineId)
    .reduce((total, line) => total + Number.parseFloat(line.receivedQuantity), 0);

  return Math.max(0, orderedQuantity - receivedQuantity);
}

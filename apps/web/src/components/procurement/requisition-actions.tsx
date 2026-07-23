"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PurchaseRequisition } from "@/lib/procurement";
import {
  approveRequisition,
  cancelRequisition,
  convertRequisitionToPurchaseOrder,
  rejectRequisition,
  submitRequisition,
} from "@/lib/procurement-client";

type SupplierOption = {
  id: string;
  name: string;
  supplierCode: string;
};

type Props = {
  requisition: PurchaseRequisition;
  suppliers: SupplierOption[];
  permissions: {
    canManage: boolean;
    canApprove: boolean;
  };
};

export function RequisitionActions({ requisition, suppliers, permissions }: Props) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (
    actionLabel: string,
    actionFn: () => Promise<unknown>,
    requireConfirm = false,
  ) => {
    if (
      requireConfirm &&
      !window.confirm(`Are you sure you want to ${actionLabel.toLowerCase()} this requisition?`)
    ) {
      return;
    }

    try {
      setLoadingAction(actionLabel);
      setError(null);
      await actionFn();
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to ${actionLabel.toLowerCase()}.`);
    } finally {
      setLoadingAction(null);
    }
  };

  const isDraft = requisition.status === "DRAFT";
  const isSubmitted = requisition.status === "SUBMITTED";
  const isApproved = requisition.status === "APPROVED";

  return (
    <div className="space-y-4">
      {error ? <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      <div className="flex flex-wrap items-center gap-3">
        {isDraft && permissions.canManage ? (
          <button
            onClick={() => handleAction("Submit", () => submitRequisition(requisition.id))}
            disabled={loadingAction !== null}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {loadingAction === "Submit" ? "Submitting..." : "Submit"}
          </button>
        ) : null}

        {isSubmitted && permissions.canApprove ? (
          <>
            <button
              onClick={() => handleAction("Approve", () => approveRequisition(requisition.id))}
              disabled={loadingAction !== null}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {loadingAction === "Approve" ? "Approving..." : "Approve"}
            </button>
            <button
              onClick={() => handleAction("Reject", () => rejectRequisition(requisition.id), true)}
              disabled={loadingAction !== null}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {loadingAction === "Reject" ? "Rejecting..." : "Reject"}
            </button>
          </>
        ) : null}

        {isApproved && permissions.canManage ? (
          <button
            onClick={() => setShowConvertModal(true)}
            disabled={loadingAction !== null}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Convert to PO
          </button>
        ) : null}

        {(isDraft || isSubmitted || isApproved) && permissions.canManage ? (
          <button
            onClick={() => handleAction("Cancel", () => cancelRequisition(requisition.id), true)}
            disabled={loadingAction !== null}
            className="rounded-md bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-300 disabled:opacity-50"
          >
            {loadingAction === "Cancel" ? "Cancelling..." : "Cancel"}
          </button>
        ) : null}
      </div>

      {showConvertModal ? (
        <ConvertModal
          requisition={requisition}
          suppliers={suppliers}
          onClose={() => setShowConvertModal(false)}
          onSuccess={(purchaseOrderId) => {
            setShowConvertModal(false);
            router.push(`/app/procurement/purchase-orders/${purchaseOrderId}`);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function ConvertModal({
  requisition,
  suppliers,
  onClose,
  onSuccess,
}: {
  requisition: PurchaseRequisition;
  suppliers: SupplierOption[];
  onClose: () => void;
  onSuccess: (purchaseOrderId: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversionLines, setConversionLines] = useState(
    requisition.lines.map((line) => ({
      ...line,
      convertQuantity: Math.max(
        0,
        parseFloat(line.requestedQuantity) - parseFloat(line.orderedQuantity),
      ).toString(),
      selected:
        Math.max(0, parseFloat(line.requestedQuantity) - parseFloat(line.orderedQuantity)) > 0,
    })),
  );

  const [supplierId, setSupplierId] = useState(requisition.lines[0]?.preferredSupplierId || "");
  const [requiredDate, setRequiredDate] = useState("");
  const [expectedDate, setExpectedDate] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const selectedLines = conversionLines.filter(
      (line) => line.selected && parseFloat(line.convertQuantity) > 0,
    );

    if (selectedLines.length === 0) {
      setError("Select at least one line to convert.");
      return;
    }

    if (!supplierId) {
      setError("Supplier is required.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const purchaseOrder = await convertRequisitionToPurchaseOrder(requisition.id, {
        supplierId,
        branchId: requisition.branchId,
        purchaseRequisitionId: requisition.id,
        requiredDate: requiredDate ? new Date(requiredDate).toISOString() : null,
        expectedDate: expectedDate ? new Date(expectedDate).toISOString() : null,
        lines: selectedLines.map((line) => ({
          purchaseRequisitionLineId: line.id,
          productId: line.productId,
          productVariantId: line.productVariantId,
          supplierProductId: line.supplierProductId,
          description: line.description,
          quantity: parseFloat(line.convertQuantity),
          unit: line.unit,
          requiredDate: line.requiredDate,
          notes: line.notes,
        })),
      });
      onSuccess(purchaseOrder.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to convert requisition to a purchase order.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900">Convert to Purchase Order</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            &times;
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {error ? <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

          <form id="convert-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">Supplier *</label>
                <select
                  required
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={supplierId}
                  onChange={(event) => setSupplierId(event.target.value)}
                >
                  <option value="">Select a supplier...</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name} ({supplier.supplierCode})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Required Date</label>
                <input
                  type="date"
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={requiredDate}
                  onChange={(event) => setRequiredDate(event.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Expected Date</label>
                <input
                  type="date"
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={expectedDate}
                  onChange={(event) => setExpectedDate(event.target.value)}
                />
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-medium text-slate-900">Lines to Convert</h3>
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 font-medium text-slate-500">
                    <tr>
                      <th className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={conversionLines.every((line) => line.selected)}
                          onChange={(event) => {
                            setConversionLines((current) =>
                              current.map((line) => ({
                                ...line,
                                selected:
                                  Math.max(
                                    0,
                                    parseFloat(line.requestedQuantity) - parseFloat(line.orderedQuantity),
                                  ) > 0 && event.target.checked,
                              })),
                            );
                          }}
                        />
                      </th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Requested</th>
                      <th className="px-4 py-3">Ordered</th>
                      <th className="px-4 py-3">Remaining</th>
                      <th className="w-32 px-4 py-3">Convert Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {conversionLines.map((line, index) => {
                      const requested = parseFloat(line.requestedQuantity);
                      const ordered = parseFloat(line.orderedQuantity);
                      const remaining = Math.max(0, requested - ordered);

                      return (
                        <tr key={line.id}>
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={line.selected}
                              disabled={remaining === 0}
                              onChange={(event) => {
                                const nextLines = [...conversionLines];
                                nextLines[index] = { ...nextLines[index]!, selected: event.target.checked };
                                setConversionLines(nextLines);
                              }}
                            />
                          </td>
                          <td className="px-4 py-3">{line.description}</td>
                          <td className="px-4 py-3">
                            {requested} {line.unit}
                          </td>
                          <td className="px-4 py-3">
                            {ordered} {line.unit}
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {remaining} {line.unit}
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              max={remaining}
                              disabled={!line.selected}
                              className="block w-full rounded-md border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-100"
                              value={line.convertQuantity}
                              onChange={(event) => {
                                const nextLines = [...conversionLines];
                                nextLines[index] = {
                                  ...nextLines[index]!,
                                  convertQuantity: event.target.value,
                                };
                                setConversionLines(nextLines);
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </form>
        </div>
        <div className="flex justify-end gap-3 rounded-b-xl border-t border-slate-200 bg-slate-50 p-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="convert-form"
            disabled={loading}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Converting..." : "Convert to PO"}
          </button>
        </div>
      </div>
    </div>
  );
}

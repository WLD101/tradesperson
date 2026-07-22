"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  submitRequisition, 
  approveRequisition, 
  rejectRequisition, 
  cancelRequisition,
  convertRequisitionToPurchaseOrder
} from "@/lib/procurement-client";
import type { PurchaseRequisition } from "@/lib/procurement";

type Props = {
  requisition: PurchaseRequisition;
  permissions: {
    canManage: boolean;
    canApprove: boolean;
  };
};

export function RequisitionActions({ requisition, permissions }: Props) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (actionStr: string, actionFn: () => Promise<any>, requireConfirm = false) => {
    if (requireConfirm) {
      if (!window.confirm(`Are you sure you want to ${actionStr.toLowerCase()} this requisition?`)) {
        return;
      }
    }
    
    try {
      setLoadingAction(actionStr);
      setError(null);
      await actionFn();
      router.refresh();
    } catch (err: any) {
      setError(err.message || `Failed to ${actionStr.toLowerCase()}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const isDraft = requisition.status === "DRAFT";
  const isSubmitted = requisition.status === "SUBMITTED";
  const isApproved = requisition.status === "APPROVED";

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        {isDraft && permissions.canManage && (
          <button
            onClick={() => handleAction("Submit", () => submitRequisition(requisition.id))}
            disabled={loadingAction !== null}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {loadingAction === "Submit" ? "Submitting..." : "Submit"}
          </button>
        )}
        {isSubmitted && permissions.canApprove && (
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
        )}
        {isApproved && permissions.canManage && (
          <button
            onClick={() => setShowConvertModal(true)}
            disabled={loadingAction !== null}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Convert to PO
          </button>
        )}
        {(isDraft || isSubmitted || isApproved) && permissions.canManage && (
          <button
            onClick={() => handleAction("Cancel", () => cancelRequisition(requisition.id), true)}
            disabled={loadingAction !== null}
            className="rounded-md bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-300 disabled:opacity-50"
          >
            {loadingAction === "Cancel" ? "Cancelling..." : "Cancel"}
          </button>
        )}
      </div>

      {showConvertModal && (
        <ConvertModal
          requisition={requisition}
          onClose={() => setShowConvertModal(false)}
          onSuccess={() => {
            setShowConvertModal(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function ConvertModal({ requisition, onClose, onSuccess }: { requisition: PurchaseRequisition; onClose: () => void; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for line conversion amounts
  const [conversionLines, setConversionLines] = useState(
    requisition.lines.map((l) => ({
      ...l,
      convertQuantity: Math.max(0, parseFloat(l.requestedQuantity) - parseFloat(l.orderedQuantity)).toString(),
      selected: Math.max(0, parseFloat(l.requestedQuantity) - parseFloat(l.orderedQuantity)) > 0,
    }))
  );

  const [supplierId, setSupplierId] = useState(requisition.lines[0]?.preferredSupplierId || "");
  const [requiredDate, setRequiredDate] = useState("");
  const [expectedDate, setExpectedDate] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedLines = conversionLines.filter((l) => l.selected && parseFloat(l.convertQuantity) > 0);
    
    if (selectedLines.length === 0) {
      setError("Please select at least one line to convert.");
      return;
    }
    if (!supplierId) {
      setError("Supplier is required.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await convertRequisitionToPurchaseOrder(requisition.id, {
        supplierId,
        requiredDate: requiredDate ? new Date(requiredDate).toISOString() : null,
        expectedDate: expectedDate ? new Date(expectedDate).toISOString() : null,
        lines: selectedLines.map(l => ({
          purchaseRequisitionLineId: l.id,
          quantity: parseFloat(l.convertQuantity)
        }))
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to convert requisition to PO.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-900">Convert to Purchase Order</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          {error && <div className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>}
          
          <form id="convert-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Supplier ID *</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  placeholder="UUID of supplier"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Required Date</label>
                <input
                  type="date"
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={requiredDate}
                  onChange={(e) => setRequiredDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Expected Date</label>
                <input
                  type="date"
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-slate-900 mb-2">Lines to Convert</h3>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200 text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-medium">
                    <tr>
                      <th className="px-4 py-3"><input type="checkbox" onChange={(e) => {
                        setConversionLines(conversionLines.map(l => ({ ...l, selected: e.target.checked })))
                      }} /></th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3">Requested</th>
                      <th className="px-4 py-3">Ordered</th>
                      <th className="px-4 py-3">Remaining</th>
                      <th className="px-4 py-3 w-32">Convert Qty</th>
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
                              onChange={(e) => {
                                const newLines = [...conversionLines];
                                newLines[index]!.selected = e.target.checked;
                                setConversionLines(newLines);
                              }}
                            />
                          </td>
                          <td className="px-4 py-3">{line.description}</td>
                          <td className="px-4 py-3">{requested} {line.unit}</td>
                          <td className="px-4 py-3">{ordered} {line.unit}</td>
                          <td className="px-4 py-3 font-medium">{remaining} {line.unit}</td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              max={remaining}
                              disabled={!line.selected}
                              className="block w-full rounded-md border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-100"
                              value={line.convertQuantity}
                              onChange={(e) => {
                                const newLines = [...conversionLines];
                                newLines[index]!.convertQuantity = e.target.value;
                                setConversionLines(newLines);
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
        <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 rounded-b-xl">
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

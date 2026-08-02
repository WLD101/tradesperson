"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PurchaseOrder } from "@/lib/procurement";
import { createGoodsReceipt } from "@/lib/procurement-client";
import { StickyActionBar } from "@/components/shared";

type Props = {
  purchaseOrder: PurchaseOrder;
  warehouses: Array<{ id: string; name: string }>;
};

export function GoodsReceiptForm({ purchaseOrder, warehouses }: Props) {
  const router = useRouter();
  const currentVersion = purchaseOrder.versions[0];
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [warehouseId, setWarehouseId] = useState("");
  const [supplierReference, setSupplierReference] = useState("");
  const [receivedAt, setReceivedAt] = useState(new Date().toISOString().split("T")[0]!);
  const [notes, setNotes] = useState("");

  const [lines, setLines] = useState(
    currentVersion?.lines.map((line) => ({
      purchaseOrderLineId: line.id,
      description: line.description,
      orderedQuantity: Number.parseFloat(line.quantity),
      unit: line.unit,
      receivedQuantity: line.quantity, // default to receiving all
      damagedQuantity: "0",
      rejectedQuantity: "0",
      notes: "",
    })) ?? [],
  );

  const updateLine = (id: string, field: string, value: string) => {
    setLines((current) =>
      current.map((line) => {
        if (line.purchaseOrderLineId !== id) return line;
        return { ...line, [field]: value };
      }),
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!warehouseId) {
      setError("Please select a warehouse to receive goods into.");
      return;
    }

    // Filter to only lines that are actually being received
    const validLines = lines.filter(
      (l) => Number.parseFloat(l.receivedQuantity) > 0 || Number.parseFloat(l.damagedQuantity) > 0 || Number.parseFloat(l.rejectedQuantity) > 0,
    );

    if (validLines.length === 0) {
      setError("You must receive, damage, or reject at least some quantity on one line.");
      return;
    }

    for (const line of validLines) {
      if (Number.parseFloat(line.receivedQuantity) < 0) {
        setError("Received quantity cannot be negative.");
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const payload = {
        warehouseId,
        supplierReference: supplierReference || null,
        receivedAt: receivedAt ? new Date(receivedAt).toISOString() : null,
        notes: notes || null,
        lines: validLines.map((line) => ({
          purchaseOrderLineId: line.purchaseOrderLineId,
          receivedQuantity: Number.parseFloat(line.receivedQuantity) || 0,
          damagedQuantity: Number.parseFloat(line.damagedQuantity) || 0,
          rejectedQuantity: Number.parseFloat(line.rejectedQuantity) || 0,
          notes: line.notes || null,
        })),
      };

      const created = await createGoodsReceipt(purchaseOrder.id, payload);
      router.push(`/app/procurement/goods-receipts/${created.id}`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create goods receipt.");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Receipt Details</h2>
        </div>
        <div className="grid gap-6 p-6 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Destination Warehouse *</label>
            <select
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={warehouseId}
              onChange={(event) => setWarehouseId(event.target.value)}
              required
            >
              <option value="">Select a warehouse...</option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Received Date *</label>
            <input
              type="date"
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={receivedAt}
              onChange={(event) => setReceivedAt(event.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Supplier Reference / Delivery Note</label>
            <input
              type="text"
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={supplierReference}
              onChange={(event) => setSupplierReference(event.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Internal Notes</label>
            <textarea
              rows={2}
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Received Items</h2>
          <p className="mt-1 text-sm text-slate-500">Record quantities received against the purchase order lines.</p>
        </div>
        <div className="space-y-4 p-6">
          {lines.map((line) => (
            <div key={line.purchaseOrderLineId} className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">
                {line.description} <span className="text-slate-500 font-normal ml-2">Ordered: {line.orderedQuantity} {line.unit}</span>
              </h3>
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Received (Usable)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={line.receivedQuantity}
                    onChange={(event) => updateLine(line.purchaseOrderLineId, "receivedQuantity", event.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Damaged</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={line.damagedQuantity}
                    onChange={(event) => updateLine(line.purchaseOrderLineId, "damagedQuantity", event.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Rejected / Missing</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={line.rejectedQuantity}
                    onChange={(event) => updateLine(line.purchaseOrderLineId, "rejectedQuantity", event.target.value)}
                  />
                </div>
                <div className="md:col-span-4">
                  <label className="mb-1 block text-xs font-medium text-slate-700">Line Notes</label>
                  <input
                    type="text"
                    className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={line.notes}
                    onChange={(event) => updateLine(line.purchaseOrderLineId, "notes", event.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {error ? <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      <StickyActionBar>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-slate-900 px-6 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {isSubmitting ? "Creating..." : "Create Goods Receipt"}
        </button>
      </StickyActionBar>
    </form>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createRequisition, updateRequisition } from "@/lib/procurement-client";
import type { PurchaseRequisition } from "@/lib/procurement";
import { StickyActionBar } from "@/components/shared";
import { Trash2, Plus } from "lucide-react";

type RequisitionFormProps = {
  branches: Array<{ id: string; name: string }>;
  canViewCost: boolean;
  initialData?: PurchaseRequisition;
};

export function RequisitionForm({ branches, canViewCost, initialData }: RequisitionFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [branchId, setBranchId] = useState(initialData?.branchId || "");
  const [purpose, setPurpose] = useState(initialData?.purpose || "");
  const [requiredDate, setRequiredDate] = useState(initialData?.requiredDate ? new Date(initialData.requiredDate).toISOString().split("T")[0] : "");
  const [internalNotes, setInternalNotes] = useState(initialData?.internalNotes || "");

  const [lines, setLines] = useState<Array<{
    id: string;
    isNew?: boolean;
    productId: string;
    productVariantId: string;
    preferredSupplierId: string;
    supplierProductId: string;
    description: string;
    requestedQuantity: string;
    unit: string;
    estimatedUnitCost: string;
    requiredDate: string;
    notes: string;
  }>>(
    initialData?.lines.map((l) => ({
      id: l.id,
      productId: l.productId,
      productVariantId: l.productVariantId || "",
      preferredSupplierId: l.preferredSupplierId || "",
      supplierProductId: l.supplierProductId || "",
      description: l.description,
      requestedQuantity: l.requestedQuantity,
      unit: l.unit,
      estimatedUnitCost: l.estimatedUnitCost || "",
      requiredDate: (l.requiredDate ? new Date(l.requiredDate).toISOString().split("T")[0] : "") as string,
      notes: l.notes || "",
    })) || []
  );

  const addLine = () => {
    setLines([
      ...lines,
      {
        id: crypto.randomUUID(),
        isNew: true,
        productId: "",
        productVariantId: "",
        preferredSupplierId: "",
        supplierProductId: "",
        description: "",
        requestedQuantity: "1",
        unit: "EA",
        estimatedUnitCost: "",
        requiredDate: "",
        notes: "",
      },
    ]);
  };

  const removeLine = (id: string) => {
    setLines(lines.filter((l) => l.id !== id));
  };

  const updateLine = (id: string, field: string, value: string) => {
    setLines(lines.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId) {
      setError("Branch is required");
      return;
    }
    if (lines.length === 0) {
      setError("At least one line is required");
      return;
    }

    // Validate lines
    for (const line of lines) {
      if (!line.productId) {
        setError("Product is required for all lines");
        return;
      }
      if (!line.description) {
        setError("Description is required for all lines");
        return;
      }
      const qty = parseFloat(line.requestedQuantity);
      if (isNaN(qty) || qty <= 0) {
        setError("Requested quantity must be positive");
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setError(null);
      
      const payload = {
        branchId,
        purpose: purpose || null,
        requiredDate: requiredDate ? new Date(requiredDate).toISOString() : null,
        internalNotes: internalNotes || null,
        lines: lines.map((l, index) => {
          const lPayload: any = {
            productId: l.productId,
            productVariantId: l.productVariantId || null,
            preferredSupplierId: l.preferredSupplierId || null,
            supplierProductId: l.supplierProductId || null,
            description: l.description,
            requestedQuantity: parseFloat(l.requestedQuantity),
            unit: l.unit,
            estimatedUnitCost: l.estimatedUnitCost && canViewCost ? parseFloat(l.estimatedUnitCost) : null,
            requiredDate: l.requiredDate ? new Date(l.requiredDate).toISOString() : null,
            notes: l.notes || null,
            displayOrder: index,
          };
          if (!l.isNew && initialData) {
            lPayload.id = l.id;
          }
          return lPayload;
        }),
      };

      if (initialData) {
        await updateRequisition(initialData.id, payload);
        router.push(`/app/procurement/requisitions/${initialData.id}`);
      } else {
        const res = await createRequisition(payload);
        router.push(`/app/procurement/requisitions/${res.id}`);
      }
    } catch (err: any) {
      setError(err.message || `Failed to ${initialData ? 'update' : 'create'} requisition`);
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">General Information</h2>
        </div>
        <div className="p-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Branch *</label>
              <select
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                required
              >
                <option value="">Select a branch...</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Required Date</label>
              <input
                type="date"
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                value={requiredDate}
                onChange={(e) => setRequiredDate(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Purpose</label>
              <input
                type="text"
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="e.g., Office Supplies Restock"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Internal Notes</label>
              <textarea
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex justify-between items-center">
          <h2 className="text-base font-semibold text-slate-900">Line Items</h2>
          <button
            type="button"
            onClick={addLine}
            className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-md"
          >
            <Plus className="w-4 h-4" /> Add Line
          </button>
        </div>
        
        <div className="p-6">
          {lines.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 px-4 py-12 text-center bg-slate-50">
              <p className="text-sm font-medium text-slate-900 mb-1">No items added</p>
              <p className="text-sm text-slate-500 mb-4">Add products to your requisition.</p>
              <button
                type="button"
                onClick={addLine}
                className="inline-flex items-center gap-2 rounded-md bg-white border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Plus className="w-4 h-4" /> Add First Line
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {lines.map((line, index) => (
                <div key={line.id} className="relative rounded-lg border border-slate-200 p-5 bg-slate-50/50">
                  <div className="absolute top-5 right-5">
                    <button
                      type="button"
                      onClick={() => removeLine(line.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Remove line"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-slate-900">Line {index + 1}</h3>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-12 pr-10">
                    <div className="md:col-span-4">
                      <label className="block text-xs font-medium text-slate-700 mb-1">Product ID *</label>
                      <input
                        type="text"
                        className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                        value={line.productId}
                        onChange={(e) => updateLine(line.id, "productId", e.target.value)}
                        placeholder="UUID of product"
                        required
                      />
                    </div>
                    <div className="md:col-span-4">
                      <label className="block text-xs font-medium text-slate-700 mb-1">Description *</label>
                      <input
                        type="text"
                        className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                        value={line.description}
                        onChange={(e) => updateLine(line.id, "description", e.target.value)}
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-slate-700 mb-1">Qty *</label>
                      <input
                        type="number"
                        step="any"
                        min="0.0001"
                        className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                        value={line.requestedQuantity}
                        onChange={(e) => updateLine(line.id, "requestedQuantity", e.target.value)}
                        required
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-slate-700 mb-1">Unit *</label>
                      <input
                        type="text"
                        className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                        value={line.unit}
                        onChange={(e) => updateLine(line.id, "unit", e.target.value)}
                        required
                      />
                    </div>
                    
                    {canViewCost && (
                      <div className="md:col-span-4">
                        <label className="block text-xs font-medium text-slate-700 mb-1">Est. Unit Cost</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-slate-500 text-sm">£</span>
                          <input
                            type="number"
                            step="any"
                            className="block w-full rounded-md border border-slate-300 pl-7 pr-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                            value={line.estimatedUnitCost}
                            onChange={(e) => updateLine(line.id, "estimatedUnitCost", e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                    
                    <div className="md:col-span-12">
                      <label className="block text-xs font-medium text-slate-700 mb-1">Line Notes</label>
                      <input
                        type="text"
                        className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                        value={line.notes}
                        onChange={(e) => updateLine(line.id, "notes", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 border border-red-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <StickyActionBar>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-slate-900 px-6 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm"
        >
          {isSubmitting ? "Saving..." : "Save as Draft"}
        </button>
      </StickyActionBar>
    </form>
  );
}

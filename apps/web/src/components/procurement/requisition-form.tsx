"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus } from "lucide-react";
import type { ProductRecord } from "@/lib/catalogue";
import type { PurchaseRequisition } from "@/lib/procurement";
import { createRequisition, updateRequisition } from "@/lib/procurement-client";
import { StickyActionBar } from "@/components/shared";

type SupplierOption = {
  id: string;
  name: string;
  supplierCode: string;
};

type RequisitionFormProps = {
  branches: Array<{ id: string; name: string }>;
  products: ProductRecord[];
  suppliers: SupplierOption[];
  canViewCost: boolean;
  initialData?: PurchaseRequisition;
};

type EditableLine = {
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
};

export function RequisitionForm({
  branches,
  products,
  suppliers,
  canViewCost,
  initialData,
}: RequisitionFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [branchId, setBranchId] = useState(initialData?.branchId || "");
  const [purpose, setPurpose] = useState(initialData?.purpose || "");
  const [requiredDate, setRequiredDate] = useState(
    initialData?.requiredDate
      ? new Date(initialData.requiredDate).toISOString().split("T")[0] || ""
      : "",
  );
  const [internalNotes, setInternalNotes] = useState(initialData?.internalNotes || "");

  const [lines, setLines] = useState<EditableLine[]>(
    initialData?.lines.map((line) => ({
      id: line.id,
      productId: line.productId,
      productVariantId: line.productVariantId || "",
      preferredSupplierId: line.preferredSupplierId || "",
      supplierProductId: line.supplierProductId || "",
      description: line.description,
      requestedQuantity: line.requestedQuantity,
      unit: line.unit,
      estimatedUnitCost: line.estimatedUnitCost || "",
      requiredDate: line.requiredDate
        ? new Date(line.requiredDate).toISOString().split("T")[0] || ""
        : "",
      notes: line.notes || "",
    })) || [],
  );

  const findProduct = (productId: string) =>
    products.find((product) => product.id === productId);

  const addLine = () => {
    const firstProduct = products[0];
    setLines((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        isNew: true,
        productId: firstProduct?.id || "",
        productVariantId: firstProduct?.variants.find((variant) => variant.isDefault)?.id || "",
        preferredSupplierId: "",
        supplierProductId: "",
        description: firstProduct?.name || "",
        requestedQuantity: "1",
        unit: firstProduct?.primaryUnit.code || "EA",
        estimatedUnitCost: "",
        requiredDate: "",
        notes: "",
      },
    ]);
  };

  const removeLine = (id: string) => {
    setLines((current) => current.filter((line) => line.id !== id));
  };

  const updateLine = (id: string, field: keyof EditableLine, value: string) => {
    setLines((current) =>
      current.map((line) => {
        if (line.id !== id) {
          return line;
        }

        if (field === "productId") {
          const product = findProduct(value);
          const defaultVariant = product?.variants.find((variant) => variant.isDefault);
          return {
            ...line,
            productId: value,
            productVariantId: defaultVariant?.id || "",
            description: product?.name || "",
            unit: product?.primaryUnit.code || line.unit,
            supplierProductId: "",
          };
        }

        if (field === "productVariantId") {
          const product = findProduct(line.productId);
          const variant = product?.variants.find((item) => item.id === value);
          return {
            ...line,
            productVariantId: value,
            description: variant ? `${product?.name} - ${variant.name}` : line.description,
          };
        }

        return { ...line, [field]: value };
      }),
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!branchId) {
      setError("Branch is required.");
      return;
    }

    if (lines.length === 0) {
      setError("At least one line is required.");
      return;
    }

    for (const line of lines) {
      if (!line.productId) {
        setError("Select a product for every line.");
        return;
      }
      if (!line.description.trim()) {
        setError("Description is required for every line.");
        return;
      }
      const qty = parseFloat(line.requestedQuantity);
      if (Number.isNaN(qty) || qty <= 0) {
        setError("Requested quantity must be positive on every line.");
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
        lines: lines.map((line) => ({
          productId: line.productId,
          productVariantId: line.productVariantId || null,
          preferredSupplierId: line.preferredSupplierId || null,
          supplierProductId: line.supplierProductId || null,
          description: line.description,
          requestedQuantity: parseFloat(line.requestedQuantity),
          unit: line.unit,
          estimatedUnitCost:
            line.estimatedUnitCost && canViewCost
              ? parseFloat(line.estimatedUnitCost)
              : null,
          requiredDate: line.requiredDate ? new Date(line.requiredDate).toISOString() : null,
          notes: line.notes || null,
        })),
      };

      if (initialData) {
        await updateRequisition(initialData.id, payload);
        router.push(`/app/procurement/requisitions/${initialData.id}`);
      } else {
        const result = await createRequisition(payload);
        router.push(`/app/procurement/requisitions/${result.id}`);
      }
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : `Failed to ${initialData ? "update" : "create"} requisition.`;
      setError(message);
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">General Information</h2>
        </div>
        <div className="p-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Branch *</label>
              <select
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                value={branchId}
                onChange={(event) => setBranchId(event.target.value)}
                required
              >
                <option value="">Select a branch...</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Required Date</label>
              <input
                type="date"
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                value={requiredDate}
                onChange={(event) => setRequiredDate(event.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Purpose</label>
              <input
                type="text"
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                value={purpose}
                onChange={(event) => setPurpose(event.target.value)}
                placeholder="e.g. Carpet tile replenishment for July fit-outs"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Internal Notes</label>
              <textarea
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                value={internalNotes}
                onChange={(event) => setInternalNotes(event.target.value)}
                rows={3}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Line Items</h2>
            <p className="mt-1 text-sm text-slate-500">
              Select real catalogue products and preferred suppliers for this requisition.
            </p>
          </div>
          <button
            type="button"
            onClick={addLine}
            className="flex items-center gap-1 rounded-md bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            <Plus className="h-4 w-4" /> Add Line
          </button>
        </div>

        <div className="p-6">
          {lines.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center">
              <p className="mb-1 text-sm font-medium text-slate-900">No items added</p>
              <p className="mb-4 text-sm text-slate-500">
                Add at least one catalogue line before saving this requisition.
              </p>
              <button
                type="button"
                onClick={addLine}
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" /> Add First Line
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {lines.map((line, index) => {
                const selectedProduct = findProduct(line.productId);
                const variants = selectedProduct?.variants || [];

                return (
                  <div
                    key={line.id}
                    className="relative rounded-lg border border-slate-200 bg-slate-50/50 p-5"
                  >
                    <div className="absolute right-5 top-5">
                      <button
                        type="button"
                        onClick={() => removeLine(line.id)}
                        className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        title="Remove line"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-slate-900">Line {index + 1}</h3>
                    </div>

                    <div className="grid gap-4 pr-10 md:grid-cols-12">
                      <div className="md:col-span-4">
                        <label className="mb-1 block text-xs font-medium text-slate-700">Product *</label>
                        <select
                          className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                          value={line.productId}
                          onChange={(event) => updateLine(line.id, "productId", event.target.value)}
                          required
                        >
                          <option value="">Select a product...</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name} ({product.sku})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-4">
                        <label className="mb-1 block text-xs font-medium text-slate-700">Variant</label>
                        <select
                          className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                          value={line.productVariantId}
                          onChange={(event) =>
                            updateLine(line.id, "productVariantId", event.target.value)
                          }
                          disabled={variants.length === 0}
                        >
                          <option value="">Base product</option>
                          {variants.map((variant) => (
                            <option key={variant.id} value={variant.id}>
                              {variant.name} ({variant.sku})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-4">
                        <label className="mb-1 block text-xs font-medium text-slate-700">
                          Preferred Supplier
                        </label>
                        <select
                          className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                          value={line.preferredSupplierId}
                          onChange={(event) =>
                            updateLine(line.id, "preferredSupplierId", event.target.value)
                          }
                        >
                          <option value="">No preferred supplier</option>
                          {suppliers.map((supplier) => (
                            <option key={supplier.id} value={supplier.id}>
                              {supplier.name} ({supplier.supplierCode})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-5">
                        <label className="mb-1 block text-xs font-medium text-slate-700">
                          Description *
                        </label>
                        <input
                          type="text"
                          className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                          value={line.description}
                          onChange={(event) =>
                            updateLine(line.id, "description", event.target.value)
                          }
                          required
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="mb-1 block text-xs font-medium text-slate-700">Qty *</label>
                        <input
                          type="number"
                          step="any"
                          min="0.0001"
                          className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                          value={line.requestedQuantity}
                          onChange={(event) =>
                            updateLine(line.id, "requestedQuantity", event.target.value)
                          }
                          required
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="mb-1 block text-xs font-medium text-slate-700">Unit *</label>
                        <input
                          type="text"
                          className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                          value={line.unit}
                          onChange={(event) => updateLine(line.id, "unit", event.target.value)}
                          required
                        />
                      </div>

                      <div className="md:col-span-3">
                        <label className="mb-1 block text-xs font-medium text-slate-700">
                          Line Required Date
                        </label>
                        <input
                          type="date"
                          className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                          value={line.requiredDate}
                          onChange={(event) =>
                            updateLine(line.id, "requiredDate", event.target.value)
                          }
                        />
                      </div>

                      {canViewCost ? (
                        <div className="md:col-span-4">
                          <label className="mb-1 block text-xs font-medium text-slate-700">
                            Est. Unit Cost
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-2 text-sm text-slate-500">GBP</span>
                            <input
                              type="number"
                              step="any"
                              className="block w-full rounded-md border border-slate-300 py-2 pl-12 pr-3 text-sm focus:border-slate-500 focus:outline-none"
                              value={line.estimatedUnitCost}
                              onChange={(event) =>
                                updateLine(line.id, "estimatedUnitCost", event.target.value)
                              }
                            />
                          </div>
                        </div>
                      ) : null}

                      <div className="md:col-span-12">
                        <label className="mb-1 block text-xs font-medium text-slate-700">Line Notes</label>
                        <input
                          type="text"
                          className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                          value={line.notes}
                          onChange={(event) => updateLine(line.id, "notes", event.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <StickyActionBar>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-slate-900 px-6 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : "Save as Draft"}
        </button>
      </StickyActionBar>
    </form>
  );
}

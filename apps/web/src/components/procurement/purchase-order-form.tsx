"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import type { ProductRecord } from "@/lib/catalogue";
import type { PurchaseOrder } from "@/lib/procurement";
import { createPurchaseOrder, updatePurchaseOrder } from "@/lib/procurement-client";
import { StickyActionBar } from "@/components/shared";

type SupplierOption = {
  id: string;
  name: string;
  supplierCode: string;
};

type EditableOrderLine = {
  id: string;
  productId: string;
  productVariantId: string;
  supplierProductId: string;
  description: string;
  quantity: string;
  unit: string;
  unitCost: string;
  taxRate: string;
  requiredDate: string;
  expectedDate: string;
  notes: string;
  overrideReason: string;
};

type Props = {
  branches: Array<{ id: string; name: string }>;
  products: ProductRecord[];
  suppliers: SupplierOption[];
  canOverrideCost: boolean;
  initialData?: PurchaseOrder;
};

const EMPTY_RATE = "0";

export function PurchaseOrderForm({
  branches,
  products,
  suppliers,
  canOverrideCost,
  initialData,
}: Props) {
  const router = useRouter();
  const currentVersion = initialData?.versions[0];
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [branchId, setBranchId] = useState(initialData?.branchId ?? "");
  const [supplierId, setSupplierId] = useState(initialData?.supplierId ?? "");
  const [currency, setCurrency] = useState(currentVersion?.currency ?? initialData?.currency ?? "GBP");
  const [deliveryAmount, setDeliveryAmount] = useState(
    currentVersion?.deliveryAmount ?? initialData?.deliveryAmount ?? "0",
  );
  const [requiredDate, setRequiredDate] = useState(toDateInput(initialData?.requiredDate ?? currentVersion?.requiredDate));
  const [expectedDate, setExpectedDate] = useState(toDateInput(initialData?.expectedDate ?? currentVersion?.expectedDate));
  const [deliveryAddress, setDeliveryAddress] = useState(
    currentVersion?.deliveryAddress ?? initialData?.deliveryAddress ?? "",
  );
  const [supplierReference, setSupplierReference] = useState(
    currentVersion?.supplierReference ?? initialData?.supplierReference ?? "",
  );
  const [terms, setTerms] = useState(currentVersion?.terms ?? "");
  const [internalNotes, setInternalNotes] = useState(
    initialData?.internalNotes ?? currentVersion?.notes ?? "",
  );
  const [lines, setLines] = useState<EditableOrderLine[]>(
    currentVersion?.lines.map((line) => ({
      id: line.id,
      productId: line.productId,
      productVariantId: line.productVariantId ?? "",
      supplierProductId: line.supplierProductId ?? "",
      description: line.description,
      quantity: line.quantity,
      unit: line.unit,
      unitCost: line.unitCost,
      taxRate: line.taxRate ?? EMPTY_RATE,
      requiredDate: toDateInput(line.requiredDate),
      expectedDate: toDateInput(line.expectedDate),
      notes: line.notes ?? "",
      overrideReason: "",
    })) ?? [],
  );

  const findProduct = (productId: string) => products.find((product) => product.id === productId);

  const addLine = () => {
    const product = products[0];
    const variant = product?.variants.find((item) => item.isDefault) ?? product?.variants[0];
    setLines((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        productId: product?.id ?? "",
        productVariantId: variant?.id ?? "",
        supplierProductId: "",
        description: variant ? `${product?.name} - ${variant.name}` : product?.name ?? "",
        quantity: "1",
        unit: product?.primaryUnit.code ?? "EA",
        unitCost: "",
        taxRate: EMPTY_RATE,
        requiredDate: "",
        expectedDate: "",
        notes: "",
        overrideReason: "",
      },
    ]);
  };

  const updateLine = (id: string, field: keyof EditableOrderLine, value: string) => {
    setLines((current) =>
      current.map((line) => {
        if (line.id !== id) {
          return line;
        }

        if (field === "productId") {
          const product = findProduct(value);
          const variant = product?.variants.find((item) => item.isDefault) ?? product?.variants[0];
          return {
            ...line,
            productId: value,
            productVariantId: variant?.id ?? "",
            supplierProductId: "",
            description: variant ? `${product?.name} - ${variant.name}` : product?.name ?? "",
            unit: product?.primaryUnit.code ?? line.unit,
          };
        }

        if (field === "productVariantId") {
          const product = findProduct(line.productId);
          const variant = product?.variants.find((item) => item.id === value);
          return {
            ...line,
            productVariantId: value,
            description: variant ? `${product?.name} - ${variant.name}` : product?.name ?? line.description,
          };
        }

        return { ...line, [field]: value };
      }),
    );
  };

  const removeLine = (id: string) => {
    setLines((current) => current.filter((line) => line.id !== id));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!branchId) {
      setError("Branch is required.");
      return;
    }
    if (!supplierId) {
      setError("Supplier is required.");
      return;
    }
    if (lines.length === 0) {
      setError("Add at least one purchase-order line.");
      return;
    }

    for (const line of lines) {
      if (!line.productId) {
        setError("Every line needs a product.");
        return;
      }
      if (!line.description.trim()) {
        setError("Every line needs a description.");
        return;
      }
      const quantity = Number.parseFloat(line.quantity);
      if (Number.isNaN(quantity) || quantity <= 0) {
        setError("Each line quantity must be greater than zero.");
        return;
      }
      if (line.unitCost && !canOverrideCost && Number.parseFloat(line.unitCost) > 0) {
        setError("This account cannot override supplier costs.");
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const payload = {
        branchId,
        supplierId,
        currency,
        deliveryAmount: deliveryAmount ? Number.parseFloat(deliveryAmount) : 0,
        requiredDate: requiredDate ? new Date(requiredDate).toISOString() : null,
        expectedDate: expectedDate ? new Date(expectedDate).toISOString() : null,
        deliveryAddress: deliveryAddress || null,
        supplierReference: supplierReference || null,
        internalNotes: internalNotes || null,
        terms: terms || null,
        lines: lines.map((line) => ({
          productId: line.productId,
          productVariantId: line.productVariantId || null,
          supplierProductId: line.supplierProductId || null,
          description: line.description,
          quantity: Number.parseFloat(line.quantity),
          unit: line.unit,
          unitCost: line.unitCost ? Number.parseFloat(line.unitCost) : null,
          taxRate: line.taxRate ? Number.parseFloat(line.taxRate) : 0,
          requiredDate: line.requiredDate ? new Date(line.requiredDate).toISOString() : null,
          expectedDate: line.expectedDate ? new Date(line.expectedDate).toISOString() : null,
          notes: line.notes || null,
          overrideReason: line.overrideReason || null,
        })),
      };

      if (initialData) {
        await updatePurchaseOrder(initialData.id, payload);
        router.push(`/app/procurement/purchase-orders/${initialData.id}`);
      } else {
        const created = await createPurchaseOrder(payload);
        router.push(`/app/procurement/purchase-orders/${created.id}`);
      }
      router.refresh();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to ${initialData ? "update" : "create"} purchase order.`,
      );
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Order Summary</h2>
        </div>
        <div className="grid gap-6 p-6 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Branch *</label>
            <select
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
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
            <label className="mb-1 block text-sm font-medium text-slate-700">Supplier *</label>
            <select
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={supplierId}
              onChange={(event) => setSupplierId(event.target.value)}
              required
              disabled={Boolean(initialData)}
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
            <label className="mb-1 block text-sm font-medium text-slate-700">Required Date</label>
            <input
              type="date"
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={requiredDate}
              onChange={(event) => setRequiredDate(event.target.value)}
            />
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
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Currency</label>
            <input
              type="text"
              maxLength={3}
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm uppercase"
              value={currency}
              onChange={(event) => setCurrency(event.target.value.toUpperCase())}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Delivery Amount</label>
            <input
              type="number"
              min="0"
              step="any"
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={deliveryAmount}
              onChange={(event) => setDeliveryAmount(event.target.value)}
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
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Terms</label>
            <input
              type="text"
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={terms}
              onChange={(event) => setTerms(event.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Internal Notes</label>
            <textarea
              rows={3}
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={internalNotes}
              onChange={(event) => setInternalNotes(event.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Order Lines</h2>
            <p className="mt-1 text-sm text-slate-500">
              Use catalogue products and enter the commercial values needed for this supplier order.
            </p>
          </div>
          <button
            type="button"
            onClick={addLine}
            className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add line
          </button>
        </div>
        <div className="space-y-5 p-6">
          {lines.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              Add at least one order line before saving.
            </div>
          ) : null}

          {lines.map((line, index) => {
            const product = findProduct(line.productId);
            const variants = product?.variants ?? [];

            return (
              <div key={line.id} className="relative rounded-lg border border-slate-200 bg-slate-50/60 p-5">
                <div className="absolute right-5 top-5">
                  <button
                    type="button"
                    onClick={() => removeLine(line.id)}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    title="Remove line"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <h3 className="mb-4 text-sm font-semibold text-slate-900">Line {index + 1}</h3>
                <div className="grid gap-4 pr-10 md:grid-cols-12">
                  <div className="md:col-span-4">
                    <label className="mb-1 block text-xs font-medium text-slate-700">Product *</label>
                    <select
                      className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      value={line.productId}
                      onChange={(event) => updateLine(line.id, "productId", event.target.value)}
                    >
                      <option value="">Select a product...</option>
                      {products.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.sku})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className="mb-1 block text-xs font-medium text-slate-700">Variant</label>
                    <select
                      className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      value={line.productVariantId}
                      onChange={(event) => updateLine(line.id, "productVariantId", event.target.value)}
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
                  <div className="md:col-span-5">
                    <label className="mb-1 block text-xs font-medium text-slate-700">Description *</label>
                    <input
                      type="text"
                      className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      value={line.description}
                      onChange={(event) => updateLine(line.id, "description", event.target.value)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-700">Qty *</label>
                    <input
                      type="number"
                      min="0.0001"
                      step="any"
                      className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      value={line.quantity}
                      onChange={(event) => updateLine(line.id, "quantity", event.target.value)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-700">Unit *</label>
                    <input
                      type="text"
                      className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      value={line.unit}
                      onChange={(event) => updateLine(line.id, "unit", event.target.value)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-700">Unit Cost</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      value={line.unitCost}
                      onChange={(event) => updateLine(line.id, "unitCost", event.target.value)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-700">Tax Rate</label>
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      value={line.taxRate}
                      onChange={(event) => updateLine(line.id, "taxRate", event.target.value)}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="mb-1 block text-xs font-medium text-slate-700">Required Date</label>
                    <input
                      type="date"
                      className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      value={line.requiredDate}
                      onChange={(event) => updateLine(line.id, "requiredDate", event.target.value)}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="mb-1 block text-xs font-medium text-slate-700">Expected Date</label>
                    <input
                      type="date"
                      className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      value={line.expectedDate}
                      onChange={(event) => updateLine(line.id, "expectedDate", event.target.value)}
                    />
                  </div>
                  <div className="md:col-span-12">
                    <label className="mb-1 block text-xs font-medium text-slate-700">Notes</label>
                    <input
                      type="text"
                      className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      value={line.notes}
                      onChange={(event) => updateLine(line.id, "notes", event.target.value)}
                    />
                  </div>
                  {canOverrideCost ? (
                    <div className="md:col-span-12">
                      <label className="mb-1 block text-xs font-medium text-slate-700">Override Reason</label>
                      <input
                        type="text"
                        className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        value={line.overrideReason}
                        onChange={(event) => updateLine(line.id, "overrideReason", event.target.value)}
                        placeholder="Only required when overriding a known supplier cost."
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
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
          {isSubmitting ? "Saving..." : initialData ? "Save Draft Changes" : "Create Draft PO"}
        </button>
      </StickyActionBar>
    </form>
  );
}

function toDateInput(value: string | null | undefined) {
  if (!value) {
    return "";
  }
  return new Date(value).toISOString().split("T")[0] ?? "";
}

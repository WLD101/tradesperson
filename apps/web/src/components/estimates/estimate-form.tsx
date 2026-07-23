"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { StickyActionBar } from "@/components/shared";
import type { ProductRecord } from "@/lib/catalogue";
import type { Estimate, EstimateLineType } from "@/lib/estimates";
import { createEstimate, updateEstimate } from "@/lib/estimates-client";

type Option = { id: string; label: string; customerId?: string; siteId?: string };

type EditableRoom = {
  id: string;
  roomName: string;
  grossArea: string;
  deductionArea: string;
  netArea: string;
  wastePercent: string;
  perimeter: string;
  notes: string;
};

type EditableLine = {
  id: string;
  lineType: EstimateLineType;
  productId: string;
  productVariantId: string;
  description: string;
  quantity: string;
  unit: string;
  unitCost: string;
  unitSellPrice: string;
  vatRate: string;
  notes: string;
};

export function EstimateForm({
  branches,
  customers,
  sites,
  surveys,
  products,
  initialData,
}: {
  branches: Option[];
  customers: Option[];
  sites: Option[];
  surveys: Option[];
  products: ProductRecord[];
  initialData?: Estimate;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [branchId, setBranchId] = useState(initialData?.branchId ?? branches[0]?.id ?? "");
  const [customerId, setCustomerId] = useState(initialData?.customerId ?? customers[0]?.id ?? "");
  const [siteId, setSiteId] = useState(initialData?.siteId ?? "");
  const [surveyId, setSurveyId] = useState(initialData?.surveyId ?? "");
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [internalNotes, setInternalNotes] = useState(initialData?.internalNotes ?? "");
  const [customerNotes, setCustomerNotes] = useState(initialData?.customerNotes ?? "");
  const [vatRate, setVatRate] = useState(initialData?.vatRate ?? "0.2");

  const [rooms, setRooms] = useState<EditableRoom[]>(
    initialData?.rooms.map((room) => ({
      id: room.id,
      roomName: room.roomName,
      grossArea: room.grossArea,
      deductionArea: room.deductionArea,
      netArea: room.netArea,
      wastePercent: room.wastePercent,
      perimeter: room.perimeter,
      notes: room.notes ?? "",
    })) ?? [
      {
        id: crypto.randomUUID(),
        roomName: "Measured room",
        grossArea: "10",
        deductionArea: "0",
        netArea: "10",
        wastePercent: "10",
        perimeter: "0",
        notes: "",
      },
    ],
  );

  const firstProduct = products[0];
  const [lines, setLines] = useState<EditableLine[]>(
    initialData?.lines.map((line) => ({
      id: line.id,
      lineType: line.lineType,
      productId: line.product?.id ?? "",
      productVariantId: line.productVariant?.id ?? "",
      description: line.description,
      quantity: line.quantity,
      unit: line.unit,
      unitCost: line.unitCost ?? "",
      unitSellPrice: line.unitSellPrice,
      vatRate: line.vatRate,
      notes: line.notes ?? "",
    })) ?? [
      {
        id: crypto.randomUUID(),
        lineType: "MATERIAL",
        productId: firstProduct?.id ?? "",
        productVariantId: firstProduct?.variants.find((variant) => variant.isDefault)?.id ?? "",
        description: firstProduct?.name ?? "Material line",
        quantity: "10",
        unit: firstProduct?.primaryUnit.code ?? "SQM",
        unitCost: "10",
        unitSellPrice: "20",
        vatRate: "0.2",
        notes: "",
      },
    ],
  );

  const filteredSites = sites.filter((site) => !customerId || site.customerId === customerId);
  const filteredSurveys = surveys.filter((survey) => !siteId || survey.siteId === siteId);

  const updateRoom = (id: string, field: keyof EditableRoom, value: string) => {
    setRooms((current) =>
      current.map((room) => (room.id === id ? { ...room, [field]: value } : room)),
    );
  };

  const updateLine = (id: string, field: keyof EditableLine, value: string) => {
    setLines((current) =>
      current.map((line) => {
        if (line.id !== id) return line;
        if (field === "productId") {
          const product = products.find((item) => item.id === value);
          const variant = product?.variants.find((item) => item.isDefault);
          return {
            ...line,
            productId: value,
            productVariantId: variant?.id ?? "",
            description: product?.name ?? line.description,
            unit: product?.primaryUnit.code ?? line.unit,
          };
        }
        return { ...line, [field]: value };
      }),
    );
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = {
        branchId,
        customerId,
        siteId,
        surveyId: surveyId || null,
        title,
        currency: "GBP",
        vatRate: Number(vatRate || 0.2),
        internalNotes,
        customerNotes,
        rooms: rooms.map((room) => ({
          roomName: room.roomName,
          grossArea: Number(room.grossArea || room.netArea || 0),
          deductionArea: Number(room.deductionArea || 0),
          netArea: Number(room.netArea || 0),
          wastePercent: Number(room.wastePercent || 0),
          perimeter: Number(room.perimeter || 0),
          notes: room.notes,
        })),
        lines: lines.map((line) => ({
          lineType: line.lineType,
          productId: line.productId || null,
          productVariantId: line.productVariantId || null,
          description: line.description,
          quantity: Number(line.quantity || 0),
          unit: line.unit,
          unitCost: line.unitCost ? Number(line.unitCost) : null,
          unitSellPrice: Number(line.unitSellPrice || 0),
          vatRate: Number(line.vatRate || vatRate || 0.2),
          notes: line.notes,
        })),
      };
      const result = initialData
        ? await updateEstimate(initialData.id, payload)
        : await createEstimate(payload);
      router.push(`/app/estimates/${result.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save estimate.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Estimate Details</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Title</span>
            <input className="w-full rounded-md border border-slate-300 px-3 py-2" value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Branch</span>
            <select className="w-full rounded-md border border-slate-300 px-3 py-2" value={branchId} onChange={(event) => setBranchId(event.target.value)}>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.label}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Customer</span>
            <select disabled={Boolean(initialData)} className="w-full rounded-md border border-slate-300 px-3 py-2 disabled:bg-slate-100" value={customerId} onChange={(event) => { setCustomerId(event.target.value); setSiteId(""); setSurveyId(""); }}>
              {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.label}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Site</span>
            <select disabled={Boolean(initialData)} className="w-full rounded-md border border-slate-300 px-3 py-2 disabled:bg-slate-100" value={siteId} onChange={(event) => { setSiteId(event.target.value); setSurveyId(""); }}>
              <option value="">Select site</option>
              {filteredSites.map((site) => <option key={site.id} value={site.id}>{site.label}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Survey Link</span>
            <select disabled={Boolean(initialData)} className="w-full rounded-md border border-slate-300 px-3 py-2 disabled:bg-slate-100" value={surveyId} onChange={(event) => setSurveyId(event.target.value)}>
              <option value="">No linked survey</option>
              {filteredSurveys.map((survey) => <option key={survey.id} value={survey.id}>{survey.label}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">VAT Rate</span>
            <input className="w-full rounded-md border border-slate-300 px-3 py-2" value={vatRate} onChange={(event) => setVatRate(event.target.value)} />
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-950">Rooms</h2>
          <button type="button" onClick={() => setRooms((current) => [...current, { id: crypto.randomUUID(), roomName: "New room", grossArea: "0", deductionArea: "0", netArea: "0", wastePercent: "10", perimeter: "0", notes: "" }])} className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200">
            <Plus className="h-4 w-4" /> Add Room
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {rooms.map((room) => (
            <div key={room.id} className="grid gap-3 rounded-md border border-slate-200 p-3 md:grid-cols-[1.5fr_repeat(4,1fr)_auto]">
              <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={room.roomName} onChange={(event) => updateRoom(room.id, "roomName", event.target.value)} placeholder="Room" />
              <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={room.netArea} onChange={(event) => updateRoom(room.id, "netArea", event.target.value)} placeholder="Net m2" />
              <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={room.wastePercent} onChange={(event) => updateRoom(room.id, "wastePercent", event.target.value)} placeholder="Waste %" />
              <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={room.perimeter} onChange={(event) => updateRoom(room.id, "perimeter", event.target.value)} placeholder="Perimeter" />
              <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={room.notes} onChange={(event) => updateRoom(room.id, "notes", event.target.value)} placeholder="Notes" />
              <button type="button" onClick={() => setRooms((current) => current.filter((item) => item.id !== room.id))} className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-950">Estimate Lines</h2>
          <button type="button" onClick={() => setLines((current) => [...current, { id: crypto.randomUUID(), lineType: "MATERIAL", productId: firstProduct?.id ?? "", productVariantId: firstProduct?.variants.find((variant) => variant.isDefault)?.id ?? "", description: firstProduct?.name ?? "New line", quantity: "1", unit: firstProduct?.primaryUnit.code ?? "SQM", unitCost: "0", unitSellPrice: "0", vatRate, notes: "" }])} className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200">
            <Plus className="h-4 w-4" /> Add Line
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {lines.map((line) => (
            <div key={line.id} className="grid gap-3 rounded-md border border-slate-200 p-3 md:grid-cols-[120px_1.5fr_repeat(5,1fr)_auto]">
              <select className="rounded-md border border-slate-300 px-2 py-2 text-sm" value={line.lineType} onChange={(event) => updateLine(line.id, "lineType", event.target.value as EstimateLineType)}>
                {["MATERIAL", "LABOUR", "ACCESSORY", "SERVICE", "DISCOUNT"].map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
              <select className="rounded-md border border-slate-300 px-2 py-2 text-sm" value={line.productId} onChange={(event) => updateLine(line.id, "productId", event.target.value)}>
                <option value="">Manual line</option>
                {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
              </select>
              <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={line.description} onChange={(event) => updateLine(line.id, "description", event.target.value)} placeholder="Description" />
              <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={line.quantity} onChange={(event) => updateLine(line.id, "quantity", event.target.value)} placeholder="Qty" />
              <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={line.unit} onChange={(event) => updateLine(line.id, "unit", event.target.value)} placeholder="Unit" />
              <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={line.unitCost} onChange={(event) => updateLine(line.id, "unitCost", event.target.value)} placeholder="Cost" />
              <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={line.unitSellPrice} onChange={(event) => updateLine(line.id, "unitSellPrice", event.target.value)} placeholder="Sell" />
              <button type="button" onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))} className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700">Internal Notes</span>
          <textarea className="min-h-28 w-full rounded-md border border-slate-300 px-3 py-2" value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-700">Customer Notes</span>
          <textarea className="min-h-28 w-full rounded-md border border-slate-300 px-3 py-2" value={customerNotes} onChange={(event) => setCustomerNotes(event.target.value)} />
        </label>
      </section>

      <StickyActionBar>
        <button type="button" onClick={() => router.back()} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Cancel
        </button>
        <button disabled={isSubmitting || !customerId || !siteId || lines.length === 0} type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
          {isSubmitting ? "Saving..." : initialData ? "Update Estimate" : "Create Estimate"}
        </button>
      </StickyActionBar>
    </form>
  );
}

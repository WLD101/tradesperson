"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PackageSearch, Plus, Ruler, Send, Sofa, Timer, Trash2 } from "lucide-react";
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
  initialCustomerId,
  initialSiteId,
  initialSurveyId,
}: {
  branches: Option[];
  customers: Option[];
  sites: Option[];
  surveys: Option[];
  products: ProductRecord[];
  initialData?: Estimate;
  initialCustomerId?: string | undefined;
  initialSiteId?: string | undefined;
  initialSurveyId?: string | undefined;
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [branchId, setBranchId] = useState(initialData?.branchId ?? branches[0]?.id ?? "");
  const [customerId, setCustomerId] = useState(initialData?.customerId ?? initialCustomerId ?? customers[0]?.id ?? "");
  const [siteId, setSiteId] = useState(initialData?.siteId ?? initialSiteId ?? "");
  const [surveyId, setSurveyId] = useState(initialData?.surveyId ?? initialSurveyId ?? "");
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
  const subtotal = lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unitSellPrice || 0), 0);
  const costTotal = lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unitCost || 0), 0);
  const vatTotal = lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unitSellPrice || 0) * Number(line.vatRate || vatRate || 0), 0);
  const grandTotal = subtotal + vatTotal;
  const marginPercent = subtotal > 0 ? ((subtotal - costTotal) / subtotal) * 100 : 0;
  const totalArea = rooms.reduce((sum, room) => sum + Number(room.netArea || 0), 0);

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

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-stitch">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-label-caps uppercase text-emerald-700">{initialData ? initialData.estimateNumber : "Drafting phase"}</p>
            <h2 className="mt-2 text-headline-md text-slate-950">{title || "Luxury flooring installation"}</h2>
            <p className="mt-2 text-sm text-slate-500">Build rooms, material lines, margin, and customer-facing totals without changing estimate calculations.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700"><Ruler className="h-4 w-4" /> {totalArea.toFixed(2)} m2</span>
            <span className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700"><PackageSearch className="h-4 w-4" /> {lines.length} lines</span>
          </div>
        </div>
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

      <div className="grid min-w-0 gap-6 2xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-6">
      <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-stitch">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sofa className="h-5 w-5 text-emerald-700" />
            <h2 className="text-title-md text-slate-950">Rooms / Areas</h2>
          </div>
          <button type="button" onClick={() => setRooms((current) => [...current, { id: crypto.randomUUID(), roomName: "New room", grossArea: "0", deductionArea: "0", netArea: "0", wastePercent: "10", perimeter: "0", notes: "" }])} className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
            <Plus className="h-4 w-4" /> Add Room
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {rooms.map((room) => (
            <div key={room.id} className="grid min-w-0 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2 xl:grid-cols-6">
              <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 sm:col-span-2 xl:col-span-2">
                Room
                <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal normal-case tracking-normal" value={room.roomName} onChange={(event) => updateRoom(room.id, "roomName", event.target.value)} placeholder="Room" />
              </label>
              <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                Net m2
                <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal normal-case tracking-normal" value={room.netArea} onChange={(event) => updateRoom(room.id, "netArea", event.target.value)} placeholder="Net m2" />
              </label>
              <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                Waste %
                <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal normal-case tracking-normal" value={room.wastePercent} onChange={(event) => updateRoom(room.id, "wastePercent", event.target.value)} placeholder="Waste %" />
              </label>
              <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                Perimeter
                <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal normal-case tracking-normal" value={room.perimeter} onChange={(event) => updateRoom(room.id, "perimeter", event.target.value)} placeholder="Perimeter" />
              </label>
              <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 sm:col-span-2 xl:col-span-1">
                Notes
                <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal normal-case tracking-normal" value={room.notes} onChange={(event) => updateRoom(room.id, "notes", event.target.value)} placeholder="Notes" />
              </label>
              <button type="button" onClick={() => setRooms((current) => current.filter((item) => item.id !== room.id))} className="self-end rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-stitch">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PackageSearch className="h-5 w-5 text-emerald-700" />
            <h2 className="text-title-md text-slate-950">Material Lookup & Lines</h2>
          </div>
          <button type="button" onClick={() => setLines((current) => [...current, { id: crypto.randomUUID(), lineType: "MATERIAL", productId: firstProduct?.id ?? "", productVariantId: firstProduct?.variants.find((variant) => variant.isDefault)?.id ?? "", description: firstProduct?.name ?? "New line", quantity: "1", unit: firstProduct?.primaryUnit.code ?? "SQM", unitCost: "0", unitSellPrice: "0", vatRate, notes: "" }])} className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
            <Plus className="h-4 w-4" /> Add Line
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {lines.map((line) => (
            <div key={line.id} className="grid min-w-0 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2 xl:grid-cols-6">
              <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                Type
                <select className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm font-normal normal-case tracking-normal" value={line.lineType} onChange={(event) => updateLine(line.id, "lineType", event.target.value as EstimateLineType)}>
                {["MATERIAL", "LABOUR", "ACCESSORY", "SERVICE", "DISCOUNT"].map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
              </label>
              <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                Product
                <select className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm font-normal normal-case tracking-normal" value={line.productId} onChange={(event) => updateLine(line.id, "productId", event.target.value)}>
                <option value="">Manual line</option>
                {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
              </select>
              </label>
              <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 sm:col-span-2 xl:col-span-2">
                Description
                <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal normal-case tracking-normal" value={line.description} onChange={(event) => updateLine(line.id, "description", event.target.value)} placeholder="Description" />
              </label>
              <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                Qty
                <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal normal-case tracking-normal" value={line.quantity} onChange={(event) => updateLine(line.id, "quantity", event.target.value)} placeholder="Qty" />
              </label>
              <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                Unit
                <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal normal-case tracking-normal" value={line.unit} onChange={(event) => updateLine(line.id, "unit", event.target.value)} placeholder="Unit" />
              </label>
              <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                Cost
                <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal normal-case tracking-normal" value={line.unitCost} onChange={(event) => updateLine(line.id, "unitCost", event.target.value)} placeholder="Cost" />
              </label>
              <label className="space-y-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                Sell
                <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal normal-case tracking-normal" value={line.unitSellPrice} onChange={(event) => updateLine(line.id, "unitSellPrice", event.target.value)} placeholder="Sell" />
              </label>
              <button type="button" onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))} className="self-end rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </section>
      </div>

      <aside className="space-y-6 2xl:sticky 2xl:top-24 2xl:self-start">
        <section className="rounded-2xl border border-slate-950 bg-slate-950 p-6 text-white shadow-stitch-overlay">
          <p className="text-label-caps uppercase text-slate-400">Estimate Summary</p>
          <dl className="mt-6 space-y-4">
            <div className="flex items-center justify-between gap-3 text-slate-300"><dt>Subtotal</dt><dd className="font-mono text-xl font-semibold text-white">£{subtotal.toFixed(2)}</dd></div>
            <div className="flex items-center justify-between gap-3 text-slate-300"><dt>VAT</dt><dd className="font-mono text-xl font-semibold text-white">£{vatTotal.toFixed(2)}</dd></div>
            <div className="border-t border-white/10 pt-5">
              <dt className="text-slate-400">Grand Total</dt>
              <dd className="mt-2 font-mono text-5xl font-bold text-emerald-300">£{grandTotal.toFixed(2)}</dd>
            </div>
          </dl>
          <div className="mt-6 rounded-xl bg-white/10 p-4">
            <div className="flex items-center justify-between">
              <span className="text-label-caps uppercase text-slate-400">Project Margin</span>
              <strong className="font-mono text-xl text-emerald-300">{marginPercent.toFixed(1)}%</strong>
            </div>
            <div className="mt-3 h-2 rounded-full bg-white/10">
              <div className="h-2 rounded-full bg-emerald-300" style={{ width: `${Math.max(0, Math.min(100, marginPercent))}%` }} />
            </div>
            <p className="mt-3 text-sm text-emerald-200">Preview only; saved totals remain server-calculated after submission.</p>
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-stitch">
          <div className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-slate-700" />
            <h2 className="text-title-md text-slate-950">Send Actions</h2>
          </div>
          <p className="mt-3 text-sm text-slate-500">Save this estimate first, then use the existing estimate detail actions to progress it into the quote workflow.</p>
        </section>
      </aside>
      </div>

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
        <button disabled={isSubmitting || !customerId || !siteId || lines.length === 0} type="submit" className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
          <Send className="h-4 w-4" />
          {isSubmitting ? "Saving..." : initialData ? "Update Estimate" : "Create Estimate"}
        </button>
      </StickyActionBar>
    </form>
  );
}

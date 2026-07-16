"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button, Card, Input } from "@tradesperson/ui";
import { ClientApiError, clientApiFetch } from "@/lib/client-api";
import type { LookupRecord, ProductDetail } from "@/lib/catalogue";

const productFormSchema = z.object({
  categoryId: z.string().uuid("Select a category."),
  manufacturerId: z.string().optional(),
  brandId: z.string().optional(),
  collectionId: z.string().optional(),
  primaryUnitId: z.string().uuid("Select a unit."),
  name: z.string().min(1, "Product name is required."),
  slug: z.string().min(1, "Slug is required."),
  sku: z.string().min(1, "SKU is required."),
  supplierSkuPlaceholder: z.string().optional(),
  description: z.string().optional(),
  material: z.string().optional(),
  colour: z.string().optional(),
  shade: z.string().optional(),
  pattern: z.string().optional(),
  fireRating: z.string().optional(),
  slipRating: z.string().optional(),
  acousticRating: z.string().optional(),
  domesticCommercialClass: z.string().optional(),
  warranty: z.string().optional(),
  recommendedAdhesive: z.string().optional(),
  recommendedUnderlay: z.string().optional(),
  technicalData: z.string().optional(),
  safetyData: z.string().optional(),
  batchTrackingRequired: z.boolean(),
  underfloorHeatingCompatible: z.string().optional(),
  lifecycleStatus: z.enum(["ACTIVE", "DISCONTINUED", "ARCHIVED"]),
  initialVariantName: z.string().optional(),
  initialVariantSku: z.string().optional(),
  initialVariantUnitId: z.string().optional(),
  initialVariantThicknessMm: z.string().optional(),
  initialVariantWearLayerMm: z.string().optional(),
  initialVariantRollWidthM: z.string().optional(),
  initialVariantStandardRollLengthM: z.string().optional(),
  initialVariantTileLengthMm: z.string().optional(),
  initialVariantTileWidthMm: z.string().optional(),
  initialVariantPackQuantity: z.string().optional(),
  initialVariantPackCoverageM2: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

type Props = {
  mode: "create" | "edit";
  product?: ProductDetail;
  lookups: {
    categories: LookupRecord[];
    manufacturers: LookupRecord[];
    brands: LookupRecord[];
    collections: LookupRecord[];
    units: LookupRecord[];
  };
};

function toBooleanOrNull(value: string) {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function toNullableNumber(value: string) {
  return value.trim() ? Number(value) : null;
}

function formatError(error: unknown) {
  if (error instanceof ClientApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong.";
}

export function ProductForm({ mode, product, lookups }: Props) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { register, handleSubmit } = useForm<ProductFormValues>({
    defaultValues: {
      categoryId: product?.category.id ?? "",
      manufacturerId: product?.manufacturer?.id ?? "",
      brandId: product?.brand?.id ?? "",
      collectionId: product?.collection?.id ?? "",
      primaryUnitId: product?.primaryUnit.id ?? "",
      name: product?.name ?? "",
      slug: product?.slug ?? "",
      sku: product?.sku ?? "",
      supplierSkuPlaceholder: product?.supplierSkuPlaceholder ?? "",
      description: product?.description ?? "",
      material: product?.material ?? "",
      colour: product?.colour ?? "",
      shade: product?.shade ?? "",
      pattern: product?.pattern ?? "",
      fireRating: product?.fireRating ?? "",
      slipRating: product?.slipRating ?? "",
      acousticRating: product?.acousticRating ?? "",
      domesticCommercialClass: product?.domesticCommercialClass ?? "",
      warranty: product?.warranty ?? "",
      recommendedAdhesive: product?.recommendedAdhesive ?? "",
      recommendedUnderlay: product?.recommendedUnderlay ?? "",
      technicalData: product?.technicalData ?? "",
      safetyData: product?.safetyData ?? "",
      batchTrackingRequired: product?.batchTrackingRequired ?? false,
      underfloorHeatingCompatible:
        product?.underfloorHeatingCompatible == null
          ? ""
          : String(product.underfloorHeatingCompatible),
      lifecycleStatus: product?.lifecycleStatus ?? "ACTIVE",
      initialVariantName: product?.variants[0]?.name ?? "",
      initialVariantSku: product?.variants[0]?.sku ?? "",
      initialVariantUnitId: product?.variants[0]?.unitOfMeasure?.id ?? "",
      initialVariantThicknessMm: product?.variants[0]?.thicknessMm ?? "",
      initialVariantWearLayerMm: product?.variants[0]?.wearLayerMm ?? "",
      initialVariantRollWidthM: product?.variants[0]?.rollWidthM ?? "",
      initialVariantStandardRollLengthM:
        product?.variants[0]?.standardRollLengthM ?? "",
      initialVariantTileLengthMm: product?.variants[0]?.tileLengthMm ?? "",
      initialVariantTileWidthMm: product?.variants[0]?.tileWidthMm ?? "",
      initialVariantPackQuantity:
        product?.variants[0]?.packQuantity?.toString() ?? "",
      initialVariantPackCoverageM2: product?.variants[0]?.packCoverageM2 ?? "",
    },
  });

  return (
    <Card>
      <div>
        <h1 className="text-xl font-semibold text-slate-950">
          {mode === "create" ? "New product" : "Edit product"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Functional catalogue administration first. Final branded UI comes later.
        </p>
      </div>

      {error ? (
        <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      <form
        className="mt-6 grid gap-4 md:grid-cols-2"
        onSubmit={handleSubmit(async (values) => {
          setSaving(true);
          setError("");
          setSuccess("");
          setFieldErrors({});

          const parsed = productFormSchema.safeParse(values);
          if (!parsed.success) {
            const errors = Object.fromEntries(
              Object.entries(parsed.error.flatten().fieldErrors).map(([key, value]) => [
                key,
                value?.[0] ?? "Invalid value.",
              ]),
            );
            setFieldErrors(errors);
            setSaving(false);
            return;
          }

          const supplierSkuPlaceholder = values.supplierSkuPlaceholder ?? "";
          const description = values.description ?? "";
          const material = values.material ?? "";
          const colour = values.colour ?? "";
          const shade = values.shade ?? "";
          const pattern = values.pattern ?? "";
          const fireRating = values.fireRating ?? "";
          const slipRating = values.slipRating ?? "";
          const acousticRating = values.acousticRating ?? "";
          const domesticCommercialClass = values.domesticCommercialClass ?? "";
          const warranty = values.warranty ?? "";
          const recommendedAdhesive = values.recommendedAdhesive ?? "";
          const recommendedUnderlay = values.recommendedUnderlay ?? "";
          const technicalData = values.technicalData ?? "";
          const safetyData = values.safetyData ?? "";
          const underfloorHeatingCompatible =
            values.underfloorHeatingCompatible ?? "";
          const initialVariantName = values.initialVariantName ?? "";
          const initialVariantSku = values.initialVariantSku ?? "";
          const initialVariantThicknessMm =
            values.initialVariantThicknessMm ?? "";
          const initialVariantWearLayerMm =
            values.initialVariantWearLayerMm ?? "";
          const initialVariantRollWidthM = values.initialVariantRollWidthM ?? "";
          const initialVariantStandardRollLengthM =
            values.initialVariantStandardRollLengthM ?? "";
          const initialVariantTileLengthMm =
            values.initialVariantTileLengthMm ?? "";
          const initialVariantTileWidthMm = values.initialVariantTileWidthMm ?? "";
          const initialVariantPackQuantity =
            values.initialVariantPackQuantity ?? "";
          const initialVariantPackCoverageM2 =
            values.initialVariantPackCoverageM2 ?? "";

          if (mode === "create" && !initialVariantSku.trim()) {
            setFieldErrors({ initialVariantSku: "Initial variant SKU is required." });
            setSaving(false);
            return;
          }

          try {
            const productPayload = {
              categoryId: values.categoryId,
              manufacturerId: values.manufacturerId || null,
              brandId: values.brandId || null,
              collectionId: values.collectionId || null,
              primaryUnitId: values.primaryUnitId,
              name: values.name.trim(),
              slug: values.slug.trim(),
              sku: values.sku.trim(),
              supplierSkuPlaceholder: supplierSkuPlaceholder.trim() || null,
              description: description.trim() || null,
              material: material.trim() || null,
              colour: colour.trim() || null,
              shade: shade.trim() || null,
              pattern: pattern.trim() || null,
              fireRating: fireRating.trim() || null,
              slipRating: slipRating.trim() || null,
              acousticRating: acousticRating.trim() || null,
              domesticCommercialClass: domesticCommercialClass.trim() || null,
              warranty: warranty.trim() || null,
              recommendedAdhesive: recommendedAdhesive.trim() || null,
              recommendedUnderlay: recommendedUnderlay.trim() || null,
              technicalData: technicalData.trim() || null,
              safetyData: safetyData.trim() || null,
              batchTrackingRequired: values.batchTrackingRequired,
              underfloorHeatingCompatible:
                toBooleanOrNull(underfloorHeatingCompatible),
              lifecycleStatus: values.lifecycleStatus,
            };

            if (mode === "create") {
              await clientApiFetch("/api/v1/catalogue/products", {
                method: "POST",
                body: JSON.stringify({
                  product: productPayload,
                  initialVariant: {
                    name: initialVariantName.trim() || values.name.trim(),
                    sku: initialVariantSku.trim(),
                    unitOfMeasureId:
                      values.initialVariantUnitId || values.primaryUnitId,
                    thicknessMm: toNullableNumber(initialVariantThicknessMm),
                    wearLayerMm: toNullableNumber(initialVariantWearLayerMm),
                    rollWidthM: toNullableNumber(initialVariantRollWidthM),
                    standardRollLengthM: toNullableNumber(
                      initialVariantStandardRollLengthM,
                    ),
                    tileLengthMm: toNullableNumber(initialVariantTileLengthMm),
                    tileWidthMm: toNullableNumber(initialVariantTileWidthMm),
                    packQuantity: toNullableNumber(initialVariantPackQuantity),
                    packCoverageM2: toNullableNumber(
                      initialVariantPackCoverageM2,
                    ),
                    isDefault: true,
                  },
                }),
              });
              setSuccess("Product created. Return to the products list to review it.");
            } else {
              await clientApiFetch(`/api/v1/catalogue/products/${product?.id}`, {
                method: "PATCH",
                body: JSON.stringify(productPayload),
              });
              setSuccess("Product updated.");
            }
          } catch (err) {
            setError(formatError(err));
          } finally {
            setSaving(false);
          }
        })}
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
          <select
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            {...register("categoryId")}
          >
            <option value="">Select category</option>
            {lookups.categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          {fieldErrors.categoryId ? (
            <p className="mt-1 text-xs text-rose-600">{fieldErrors.categoryId}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Primary unit</label>
          <select
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            {...register("primaryUnitId")}
          >
            <option value="">Select unit</option>
            {lookups.units.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.code})
              </option>
            ))}
          </select>
          {fieldErrors.primaryUnitId ? (
            <p className="mt-1 text-xs text-rose-600">{fieldErrors.primaryUnitId}</p>
          ) : null}
        </div>

            {([
              ["name", "Product name"],
              ["slug", "Slug"],
              ["sku", "Internal SKU"],
              ["supplierSkuPlaceholder", "Supplier SKU placeholder"],
              ["material", "Material"],
              ["colour", "Colour"],
              ["shade", "Shade"],
              ["pattern", "Pattern"],
              ["fireRating", "Fire rating"],
              ["slipRating", "Slip rating"],
              ["acousticRating", "Acoustic rating"],
              ["domesticCommercialClass", "Domestic/commercial class"],
              ["warranty", "Warranty"],
              ["recommendedAdhesive", "Recommended adhesive"],
              ["recommendedUnderlay", "Recommended underlay"],
            ] as const).map(([key, label]) => (
              <div key={key}>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {label}
            </label>
            <Input {...register(key as keyof ProductFormValues)} />
            {fieldErrors[key] ? (
              <p className="mt-1 text-xs text-rose-600">{fieldErrors[key]}</p>
            ) : null}
          </div>
        ))}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Manufacturer</label>
          <select
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            {...register("manufacturerId")}
          >
            <option value="">Not set</option>
            {lookups.manufacturers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Brand</label>
          <select
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            {...register("brandId")}
          >
            <option value="">Not set</option>
            {lookups.brands.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Collection</label>
          <select
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            {...register("collectionId")}
          >
            <option value="">Not set</option>
            {lookups.collections.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Lifecycle</label>
          <select
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            {...register("lifecycleStatus")}
          >
            <option value="ACTIVE">Active</option>
            <option value="DISCONTINUED">Discontinued</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Underfloor heating
          </label>
          <select
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            {...register("underfloorHeatingCompatible")}
          >
            <option value="">Not set</option>
            <option value="true">Compatible</option>
            <option value="false">Not compatible</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
          <textarea
            className="min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            {...register("description")}
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">Technical data</label>
          <textarea
            className="min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            {...register("technicalData")}
          />
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">Safety data</label>
          <textarea
            className="min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            {...register("safetyData")}
          />
        </div>

        <div className="md:col-span-2 flex items-center gap-3">
          <input
            id="batchTrackingRequired"
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300"
            {...register("batchTrackingRequired")}
          />
          <label htmlFor="batchTrackingRequired" className="text-sm font-medium text-slate-700">
            Batch or dye-lot tracking required
          </label>
        </div>

        {mode === "create" ? (
          <>
            <div className="md:col-span-2 pt-2">
              <h2 className="text-lg font-semibold text-slate-950">
                Initial variant
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Create the first sellable variant now. Additional variants can be added later.
              </p>
            </div>
            {([
              ["initialVariantName", "Variant name"],
              ["initialVariantSku", "Variant SKU"],
              ["initialVariantThicknessMm", "Thickness (mm)"],
              ["initialVariantWearLayerMm", "Wear layer (mm)"],
              ["initialVariantRollWidthM", "Roll width (m)"],
              ["initialVariantStandardRollLengthM", "Roll length (m)"],
              ["initialVariantTileLengthMm", "Tile/plank length (mm)"],
              ["initialVariantTileWidthMm", "Tile/plank width (mm)"],
              ["initialVariantPackQuantity", "Pack quantity"],
              ["initialVariantPackCoverageM2", "Pack coverage (m2)"],
            ] as const).map(([key, label]) => (
              <div key={key}>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  {label}
                </label>
                <Input {...register(key as keyof ProductFormValues)} />
                {fieldErrors[key] ? (
                  <p className="mt-1 text-xs text-rose-600">{fieldErrors[key]}</p>
                ) : null}
              </div>
            ))}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Variant unit
              </label>
              <select
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                {...register("initialVariantUnitId")}
              >
                <option value="">Use product unit</option>
                {lookups.units.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.code})
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : null}

        <div className="md:col-span-2 flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving
              ? mode === "create"
                ? "Creating..."
                : "Saving..."
              : mode === "create"
                ? "Create product"
                : "Save product"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

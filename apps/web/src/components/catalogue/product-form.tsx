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

const flooringProductSuggestions = [
  "Laminate planks",
  "Oak laminate",
  "LVT",
  "Herringbone",
  "Chevron flooring",
  "SPC click vinyl",
  "WPC vinyl flooring",
  "Luxury vinyl plank",
  "Luxury vinyl tile",
  "Sheet vinyl",
  "Safety flooring",
  "Carpet roll",
  "Carpet tiles",
  "Loop pile carpet",
  "Cut pile carpet",
  "Twist pile carpet",
  "Saxony carpet",
  "Berber carpet",
  "Needle felt carpet",
  "Artificial grass",
  "Engineered oak flooring",
  "Engineered wood flooring",
  "Solid oak flooring",
  "Solid wood flooring",
  "Parquet flooring",
  "Bamboo flooring",
  "Cork flooring",
  "Rubber flooring",
  "Commercial vinyl",
  "Entrance matting",
  "Stair nosing",
  "Door threshold",
  "Scotia trim",
  "Reducer profile",
  "Expansion profile",
  "Flooring underlay",
  "Acoustic underlay",
  "DPM underlay",
  "Flexible adhesive",
  "Pressure sensitive adhesive",
  "Smoothing compound",
  "Self levelling compound",
  "Primer",
];

const materialSuggestions = [
  "Laminate",
  "Oak laminate",
  "LVT",
  "SPC",
  "WPC",
  "Vinyl",
  "Carpet",
  "Wool",
  "Polypropylene",
  "Nylon",
  "Engineered oak",
  "Solid oak",
  "Wood",
  "Bamboo",
  "Cork",
  "Rubber",
  "Felt",
  "Foam",
];

const patternSuggestions = [
  "Plank",
  "Herringbone",
  "Chevron",
  "Straight lay",
  "Basket weave",
  "Parquet",
  "Tile",
  "Stone effect",
  "Wood effect",
  "Oak effect",
  "Concrete effect",
  "Loop pile",
  "Cut pile",
  "Ribbed",
  "Textured",
  "Plain",
];

const colourSuggestions = [
  "Natural Oak",
  "Light Oak",
  "Grey Oak",
  "Warm Oak",
  "Smoked Oak",
  "Walnut",
  "Maple",
  "Beige",
  "Charcoal",
  "Graphite",
  "Cream",
  "Brown",
  "Black",
  "White",
];

const adhesiveSuggestions = [
  "Pressure sensitive adhesive",
  "High temperature adhesive",
  "Flexible flooring adhesive",
  "Wood flooring adhesive",
  "Carpet tile tackifier",
  "Vinyl adhesive",
  "Contact adhesive",
];

const underlaySuggestions = [
  "Acoustic underlay",
  "DPM underlay",
  "Foam underlay",
  "Rubber crumb underlay",
  "Felt underlay",
  "Wood fibre underlay",
  "LVT underlay",
  "Laminate underlay",
];

const manufacturerSuggestions = [
  "Amtico",
  "Karndean",
  "Polyflor",
  "Tarkett",
  "Forbo",
  "Quick-Step",
  "Egger",
  "Balterio",
  "Furlong Flooring",
  "Cormar Carpets",
  "Abingdon Flooring",
  "Victoria Carpets",
  "Gradus",
  "QA Flooring",
  "Floorwise",
];

const brandSuggestions = [
  "Signature",
  "Spacia",
  "Van Gogh",
  "Knight Tile",
  "Expona",
  "Palio",
  "Camaro",
  "Safetred",
  "Flotex",
  "Elka",
  "Hydroshield",
  "Everyroom",
  "Primo",
  "Apollo",
];

const collectionSuggestions = [
  "Classic Oak",
  "Heritage Oak",
  "Natural Plank",
  "Urban Stone",
  "Commercial Safety",
  "Acoustic Comfort",
  "Domestic Elegance",
  "Contract Plus",
  "Herringbone Select",
  "Rigid Core",
  "Waterproof Click",
  "Entrance Plus",
];

const additionalFlooringCategories = [
  "Laminate Planks",
  "Oak Laminate",
  "Luxury Vinyl Tile",
  "Luxury Vinyl Plank",
  "Herringbone",
  "Chevron",
  "SPC Flooring",
  "WPC Flooring",
  "Engineered Wood",
  "Solid Wood",
  "Parquet",
  "Carpet Tiles",
  "Carpet Roll",
  "Commercial Carpet",
  "Safety Flooring",
  "Rubber Flooring",
  "Cork Flooring",
  "Bamboo Flooring",
  "Entrance Matting",
  "Stair Nosings",
  "Floor Profiles",
  "Trims",
  "Primers",
  "Screeds",
  "Moisture Barriers",
  "Tools & Accessories",
];

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

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mergeLookupNames(options: LookupRecord[], suggestions: string[]) {
  return Array.from(new Set([...options.map((item) => item.name), ...suggestions])).sort((a, b) =>
    a.localeCompare(b),
  );
}

export function ProductForm({ mode, product, lookups }: Props) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<LookupRecord[]>(lookups.categories);
  const [manufacturers, setManufacturers] = useState<LookupRecord[]>(lookups.manufacturers);
  const [brands, setBrands] = useState<LookupRecord[]>(lookups.brands);
  const [collections, setCollections] = useState<LookupRecord[]>(lookups.collections);
  const [categorySearch, setCategorySearch] = useState("");
  const [manufacturerSearch, setManufacturerSearch] = useState("");
  const [brandSearch, setBrandSearch] = useState("");
  const [collectionSearch, setCollectionSearch] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [addingLookup, setAddingLookup] = useState<"manufacturers" | "brands" | "collections" | null>(null);
  const { register, handleSubmit, setValue, watch } = useForm<ProductFormValues>({
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
  const selectedCategoryId = watch("categoryId");
  const selectedManufacturerId = watch("manufacturerId");
  const selectedBrandId = watch("brandId");
  const selectedCollectionId = watch("collectionId");
  const selectedCategory = categories.find((item) => item.id === selectedCategoryId);
  const selectedManufacturer = manufacturers.find((item) => item.id === selectedManufacturerId);
  const selectedBrand = brands.find((item) => item.id === selectedBrandId);
  const selectedCollection = collections.find((item) => item.id === selectedCollectionId);
  const mergedCategoryNames = Array.from(
    new Set([...categories.map((item) => item.name), ...additionalFlooringCategories]),
  ).sort((a, b) => a.localeCompare(b));
  const filteredCategoryNames = mergedCategoryNames.filter((name) =>
    name.toLowerCase().includes(categorySearch.trim().toLowerCase()),
  );
  const categoryAlreadyExists = categories.some(
    (item) => item.name.toLowerCase() === categorySearch.trim().toLowerCase(),
  );

  async function addCategory(name: string) {
    const trimmed = name.trim();
    if (!trimmed || categoryAlreadyExists) return;
    setAddingCategory(true);
    setError("");
    try {
      const created = await clientApiFetch<LookupRecord>("/api/v1/catalogue/categories", {
        method: "POST",
        body: JSON.stringify({
          name: trimmed,
          slug: slugify(trimmed),
          description: "Custom category added from product creation.",
        }),
      });
      setCategories((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setValue("categoryId", created.id, { shouldValidate: true, shouldDirty: true });
      setCategorySearch("");
      setSuccess(`Category "${created.name}" added and selected.`);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setAddingCategory(false);
    }
  }

  async function addLookup(
    kind: "manufacturers" | "brands" | "collections",
    name: string,
  ) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const current =
      kind === "manufacturers" ? manufacturers : kind === "brands" ? brands : collections;
    const exists = current.find((item) => item.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setValue(
        kind === "manufacturers" ? "manufacturerId" : kind === "brands" ? "brandId" : "collectionId",
        exists.id,
        { shouldValidate: true, shouldDirty: true },
      );
      return;
    }
    setAddingLookup(kind);
    setError("");
    try {
      const payload: Record<string, string | null> = {
        name: trimmed,
        slug: slugify(trimmed),
        description: "Custom lookup added from product creation.",
      };
      if (kind === "brands") {
        payload.manufacturerId = selectedManufacturerId || null;
      }
      if (kind === "collections") {
        payload.manufacturerId = selectedManufacturerId || null;
        payload.brandId = selectedBrandId || null;
      }
      const created = await clientApiFetch<LookupRecord>(`/api/v1/catalogue/${kind}`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (kind === "manufacturers") {
        setManufacturers((items) => [...items, created].sort((a, b) => a.name.localeCompare(b.name)));
        setValue("manufacturerId", created.id, { shouldValidate: true, shouldDirty: true });
        setManufacturerSearch("");
      } else if (kind === "brands") {
        setBrands((items) => [...items, created].sort((a, b) => a.name.localeCompare(b.name)));
        setValue("brandId", created.id, { shouldValidate: true, shouldDirty: true });
        setBrandSearch("");
      } else {
        setCollections((items) => [...items, created].sort((a, b) => a.name.localeCompare(b.name)));
        setValue("collectionId", created.id, { shouldValidate: true, shouldDirty: true });
        setCollectionSearch("");
      }
      setSuccess(`${created.name} added and selected.`);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setAddingLookup(null);
    }
  }

  return (
    <Card>
      <div>
        <h1 className="text-xl font-semibold text-slate-950">
          {mode === "create" ? "New product" : "Edit product"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Highly customizable product creation with searchable suggestions and add-your-own catalogue controls.
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
        <div className="md:col-span-2 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
          <h2 className="text-sm font-black uppercase tracking-[0.12em] text-emerald-800">Highly customizable product creation</h2>
          <p className="mt-2 text-sm text-slate-600">
            Search built-in suggestions, select existing catalogue records, or add custom categories, manufacturers, brands, collections, materials, colours, patterns, adhesives, and underlays as you work.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
          <div className="rounded-xl border border-slate-300 bg-white p-2 focus-within:border-slate-500">
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none"
              list="flooring-category-suggestions"
              placeholder={selectedCategory ? `Selected: ${selectedCategory.name}` : "Search category or type your own..."}
              value={categorySearch}
              onChange={(event) => setCategorySearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  const match = categories.find(
                    (item) => item.name.toLowerCase() === categorySearch.trim().toLowerCase(),
                  );
                  if (match) {
                    setValue("categoryId", match.id, { shouldValidate: true, shouldDirty: true });
                    setCategorySearch("");
                    return;
                  }
                  void addCategory(categorySearch);
                }
              }}
            />
            <datalist id="flooring-category-suggestions">
              {filteredCategoryNames.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            <div className="mt-2 flex flex-wrap gap-2">
              {filteredCategoryNames.slice(0, 14).map((name) => {
                const existing = categories.find((item) => item.name.toLowerCase() === name.toLowerCase());
                const selected = existing?.id === selectedCategoryId;
                return (
                  <button
                    key={name}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                      selected ? "border-emerald-500 bg-emerald-100 text-emerald-900" : "border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-200"
                    }`}
                    type="button"
                    onClick={() => {
                      if (existing) {
                        setValue("categoryId", existing.id, { shouldValidate: true, shouldDirty: true });
                        setCategorySearch("");
                      } else {
                        void addCategory(name);
                      }
                    }}
                  >
                    {name}{existing ? "" : " + add"}
                  </button>
                );
              })}
            </div>
            {categorySearch.trim() && !categoryAlreadyExists ? (
              <button
                className="mt-2 rounded-full bg-slate-950 px-3 py-1.5 text-xs font-black text-white disabled:opacity-60"
                type="button"
                disabled={addingCategory}
                onClick={() => void addCategory(categorySearch)}
              >
                {addingCategory ? "Adding..." : `Add "${categorySearch.trim()}"`}
              </button>
            ) : null}
            <input type="hidden" {...register("categoryId")} />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Search existing categories, click a suggested category, or type a new one and press Enter.
          </p>
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
              ["name", "Product name", flooringProductSuggestions],
              ["slug", "Slug"],
              ["sku", "Internal SKU"],
              ["supplierSkuPlaceholder", "Supplier SKU placeholder"],
              ["material", "Material", materialSuggestions],
              ["colour", "Colour", colourSuggestions],
              ["shade", "Shade"],
              ["pattern", "Pattern", patternSuggestions],
              ["fireRating", "Fire rating"],
              ["slipRating", "Slip rating"],
              ["acousticRating", "Acoustic rating"],
              ["domesticCommercialClass", "Domestic/commercial class"],
              ["warranty", "Warranty"],
              ["recommendedAdhesive", "Recommended adhesive", adhesiveSuggestions],
              ["recommendedUnderlay", "Recommended underlay", underlaySuggestions],
            ] as const).map(([key, label, suggestions]) => (
              <div key={key}>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {label}
            </label>
            <Input
              {...register(key as keyof ProductFormValues)}
              list={suggestions ? `${key}-suggestions` : undefined}
              placeholder={key === "name" ? "Search product or type your own..." : undefined}
            />
            {suggestions ? (
              <datalist id={`${key}-suggestions`}>
                {suggestions.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            ) : null}
            {fieldErrors[key] ? (
              <p className="mt-1 text-xs text-rose-600">{fieldErrors[key]}</p>
            ) : null}
          </div>
        ))}

        <LookupPicker
          label="Manufacturer"
          name="manufacturerId"
          options={manufacturers}
          selected={selectedManufacturer}
          search={manufacturerSearch}
          setSearch={setManufacturerSearch}
          suggestions={manufacturerSuggestions}
          adding={addingLookup === "manufacturers"}
          onSelect={(id) => setValue("manufacturerId", id, { shouldValidate: true, shouldDirty: true })}
          onAdd={(name) => void addLookup("manufacturers", name)}
        />

        <LookupPicker
          label="Brand"
          name="brandId"
          options={brands}
          selected={selectedBrand}
          search={brandSearch}
          setSearch={setBrandSearch}
          suggestions={brandSuggestions}
          adding={addingLookup === "brands"}
          onSelect={(id) => setValue("brandId", id, { shouldValidate: true, shouldDirty: true })}
          onAdd={(name) => void addLookup("brands", name)}
          helper={selectedManufacturer ? `Linked to ${selectedManufacturer.name} when added.` : "Add a manufacturer first if this brand should be linked."}
        />

        <LookupPicker
          label="Collection"
          name="collectionId"
          options={collections}
          selected={selectedCollection}
          search={collectionSearch}
          setSearch={setCollectionSearch}
          suggestions={collectionSuggestions}
          adding={addingLookup === "collections"}
          onSelect={(id) => setValue("collectionId", id, { shouldValidate: true, shouldDirty: true })}
          onAdd={(name) => void addLookup("collections", name)}
          helper={selectedBrand ? `Linked to ${selectedBrand.name} when added.` : "Add/select a brand first if this collection should be linked."}
        />

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

function LookupPicker({
  label,
  name,
  options,
  selected,
  search,
  setSearch,
  suggestions,
  adding,
  onSelect,
  onAdd,
  helper,
}: {
  label: string;
  name: string;
  options: LookupRecord[];
  selected: LookupRecord | undefined;
  search: string;
  setSearch: (value: string) => void;
  suggestions: string[];
  adding: boolean;
  onSelect: (id: string) => void;
  onAdd: (name: string) => void;
  helper?: string | undefined;
}) {
  const mergedNames = mergeLookupNames(options, suggestions);
  const trimmedSearch = search.trim();
  const filteredNames = mergedNames.filter((item) =>
    item.toLowerCase().includes(trimmedSearch.toLowerCase()),
  );
  const existingMatch = options.find(
    (item) => item.name.toLowerCase() === trimmedSearch.toLowerCase(),
  );

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <div className="rounded-xl border border-slate-300 bg-white p-2 focus-within:border-slate-500">
        <input
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none"
          list={`${name}-suggestions`}
          placeholder={selected ? `Selected: ${selected.name}` : `Search ${label.toLowerCase()} or type your own...`}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            if (existingMatch) {
              onSelect(existingMatch.id);
              setSearch("");
              return;
            }
            onAdd(search);
          }}
        />
        <datalist id={`${name}-suggestions`}>
          {filteredNames.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
        <div className="mt-2 flex flex-wrap gap-2">
          {filteredNames.slice(0, 10).map((item) => {
            const existing = options.find((option) => option.name.toLowerCase() === item.toLowerCase());
            const isSelected = existing?.id === selected?.id;
            return (
              <button
                key={item}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                  isSelected
                    ? "border-emerald-500 bg-emerald-100 text-emerald-900"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-200"
                }`}
                type="button"
                onClick={() => {
                  if (existing) {
                    onSelect(existing.id);
                    setSearch("");
                    return;
                  }
                  onAdd(item);
                }}
              >
                {item}{existing ? "" : " + add"}
              </button>
            );
          })}
        </div>
        {selected ? (
          <button
            className="mt-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
            type="button"
            onClick={() => onSelect("")}
          >
            Clear {label.toLowerCase()}
          </button>
        ) : null}
        {trimmedSearch && !existingMatch ? (
          <button
            className="ml-2 mt-2 rounded-full bg-slate-950 px-3 py-1.5 text-xs font-black text-white disabled:opacity-60"
            type="button"
            disabled={adding}
            onClick={() => onAdd(trimmedSearch)}
          >
            {adding ? "Adding..." : `Add "${trimmedSearch}"`}
          </button>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {helper ?? `Search existing ${label.toLowerCase()} records or add a custom one.`}
      </p>
    </div>
  );
}

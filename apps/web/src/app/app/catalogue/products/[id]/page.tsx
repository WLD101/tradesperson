import Link from "next/link";
import { Card, Input } from "@tradesperson/ui";
import { apiFetch, getSession } from "@/lib/api";
import {
  fetchCatalogueLookups,
  getCataloguePermissions,
  type ProductDetail,
} from "@/lib/catalogue";

async function archiveProduct(formData: FormData) {
  "use server";
  const productId = String(formData.get("productId"));
  await apiFetch(`/api/v1/catalogue/products/${productId}/archive`, {
    method: "PATCH",
  });
}

async function restoreProduct(formData: FormData) {
  "use server";
  const productId = String(formData.get("productId"));
  await apiFetch(`/api/v1/catalogue/products/${productId}/restore`, {
    method: "PATCH",
  });
}

async function createVariant(formData: FormData) {
  "use server";
  const productId = String(formData.get("productId"));
  await apiFetch(`/api/v1/catalogue/products/${productId}/variants`, {
    method: "POST",
    body: JSON.stringify({
      name: formData.get("name"),
      sku: formData.get("sku"),
      unitOfMeasureId: formData.get("unitOfMeasureId") || null,
      colour: formData.get("colour") || null,
      thicknessMm: formData.get("thicknessMm")
        ? Number(formData.get("thicknessMm"))
        : null,
      packCoverageM2: formData.get("packCoverageM2")
        ? Number(formData.get("packCoverageM2"))
        : null,
      packQuantity: formData.get("packQuantity")
        ? Number(formData.get("packQuantity"))
        : null,
      isDefault: formData.get("isDefault") === "on",
    }),
  });
}

async function updateVariant(formData: FormData) {
  "use server";
  const productId = String(formData.get("productId"));
  const variantId = String(formData.get("variantId"));
  await apiFetch(`/api/v1/catalogue/products/${productId}/variants/${variantId}`, {
    method: "PATCH",
    body: JSON.stringify({
      name: formData.get("name"),
      sku: formData.get("sku"),
      unitOfMeasureId: formData.get("unitOfMeasureId") || null,
      colour: formData.get("colour") || null,
      thicknessMm: formData.get("thicknessMm")
        ? Number(formData.get("thicknessMm"))
        : null,
      packCoverageM2: formData.get("packCoverageM2")
        ? Number(formData.get("packCoverageM2"))
        : null,
      packQuantity: formData.get("packQuantity")
        ? Number(formData.get("packQuantity"))
        : null,
      isDefault: formData.get("isDefault") === "on",
      lifecycleStatus: formData.get("lifecycleStatus"),
    }),
  });
}

async function archiveVariant(formData: FormData) {
  "use server";
  const productId = String(formData.get("productId"));
  const variantId = String(formData.get("variantId"));
  await apiFetch(
    `/api/v1/catalogue/products/${productId}/variants/${variantId}/archive`,
    {
      method: "PATCH",
    },
  );
}

async function restoreVariant(formData: FormData) {
  "use server";
  const productId = String(formData.get("productId"));
  const variantId = String(formData.get("variantId"));
  await apiFetch(
    `/api/v1/catalogue/products/${productId}/variants/${variantId}/restore`,
    {
      method: "PATCH",
    },
  );
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  const permissions = getCataloguePermissions(session);
  const { id } = await params;
  const [product, lookups, suppliers] = await Promise.all([
    apiFetch<ProductDetail>(`/api/v1/catalogue/products/${id}`),
    fetchCatalogueLookups(),
    apiFetch<
      Array<{
        id: string;
        supplierSku: string;
        packCoverageM2: string | null;
        rollWidthM: string | null;
        minimumOrderQty: string | null;
        leadTimeDays: number | null;
        preferredSupplier: boolean;
        status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
        lastConfirmedAt: string | null;
        supplier: {
          id: string;
          legalName: string;
          tradingName: string | null;
          supplierCode: string;
        };
        variant: {
          id: string;
          name: string;
          sku: string;
        } | null;
        supplierUnit: {
          id: string;
          name: string;
          code: string;
          symbol: string | null;
        } | null;
      }>
    >(`/api/v1/catalogue/products/${id}/suppliers`),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link
            href="/app/catalogue/products"
            className="text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            Back to products
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">
            {product.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {product.sku} • {product.category.name} • {product.lifecycleStatus}
          </p>
        </div>
        {permissions.canManage ? (
          <Link
            href={`/app/catalogue/products/${product.id}/edit`}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Edit product
          </Link>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <h2 className="text-lg font-semibold text-slate-950">Product details</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {[
              ["Manufacturer", product.manufacturer?.name ?? "Not set"],
              ["Brand", product.brand?.name ?? "Not set"],
              ["Collection", product.collection?.name ?? "Not set"],
              ["Primary unit", `${product.primaryUnit.name} (${product.primaryUnit.code})`],
              ["Material", product.material ?? "Not set"],
              ["Colour", product.colour ?? "Not set"],
              ["Pattern", product.pattern ?? "Not set"],
              ["Warranty", product.warranty ?? "Not set"],
              ["Adhesive", product.recommendedAdhesive ?? "Not set"],
              ["Underlay", product.recommendedUnderlay ?? "Not set"],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {label}
                </p>
                <p className="mt-1 text-sm text-slate-900">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-3">
            <p className="text-sm text-slate-600">
              {product.description ?? "No product description yet."}
            </p>
            <p className="text-sm text-slate-600">
              Technical data: {product.technicalData ?? "Not set"}
            </p>
            <p className="text-sm text-slate-600">
              Safety data: {product.safetyData ?? "Not set"}
            </p>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-slate-950">Lifecycle</h2>
          <p className="mt-1 text-sm text-slate-500">
            Archive support is active for the product and each variant.
          </p>
          <div className="mt-4 space-y-3">
            {permissions.canArchive ? (
              product.lifecycleStatus === "ARCHIVED" ? (
                <form action={restoreProduct}>
                  <input type="hidden" name="productId" value={product.id} />
                  <button
                    type="submit"
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Restore product
                  </button>
                </form>
              ) : (
                <form action={archiveProduct}>
                  <input type="hidden" name="productId" value={product.id} />
                  <button
                    type="submit"
                    className="rounded-md border border-amber-300 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-50"
                  >
                    Archive product
                  </button>
                </form>
              )
            ) : (
              <p className="text-sm text-slate-500">
                You have view access only for lifecycle actions.
              </p>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Variants</h2>
            <p className="mt-1 text-sm text-slate-500">
              Maintain sellable packs, rolls, or accessory variants here.
            </p>
          </div>
          <p className="text-sm text-slate-500">{product.variants.length} total</p>
        </div>

        <div className="mt-4 space-y-4">
          {product.variants.map((variant) => (
            <div key={variant.id} className="rounded-xl border border-slate-200 px-4 py-4">
              <form action={updateVariant} className="grid gap-3 md:grid-cols-3">
                <input type="hidden" name="productId" value={product.id} />
                <input type="hidden" name="variantId" value={variant.id} />
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Name
                  </label>
                  <Input name="name" defaultValue={variant.name} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    SKU
                  </label>
                  <Input name="sku" defaultValue={variant.sku} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Unit
                  </label>
                  <select
                    name="unitOfMeasureId"
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                    defaultValue={variant.unitOfMeasure?.id ?? ""}
                  >
                    <option value="">Use product unit</option>
                    {lookups.units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name} ({unit.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Colour
                  </label>
                  <Input name="colour" defaultValue={variant.colour ?? ""} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Thickness (mm)
                  </label>
                  <Input name="thicknessMm" defaultValue={variant.thicknessMm ?? ""} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Pack coverage (m2)
                  </label>
                  <Input
                    name="packCoverageM2"
                    defaultValue={variant.packCoverageM2 ?? ""}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Pack quantity
                  </label>
                  <Input name="packQuantity" defaultValue={variant.packQuantity ?? ""} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Lifecycle
                  </label>
                  <select
                    name="lifecycleStatus"
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                    defaultValue={variant.lifecycleStatus}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="DISCONTINUED">Discontinued</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    id={`default-${variant.id}`}
                    type="checkbox"
                    name="isDefault"
                    defaultChecked={variant.isDefault}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <label htmlFor={`default-${variant.id}`} className="text-sm text-slate-700">
                    Default variant
                  </label>
                </div>
                <div className="md:col-span-3 flex flex-wrap justify-end gap-3">
                  {permissions.canManage ? (
                    <button
                      type="submit"
                      className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Save variant
                    </button>
                  ) : null}
                  {permissions.canArchive ? (
                    variant.lifecycleStatus === "ARCHIVED" ? (
                      <button
                        type="submit"
                        formAction={restoreVariant}
                        className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Restore variant
                      </button>
                    ) : (
                      <button
                        type="submit"
                        formAction={archiveVariant}
                        className="rounded-md border border-amber-300 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-50"
                      >
                        Archive variant
                      </button>
                    )
                  ) : null}
                </div>
              </form>
            </div>
          ))}

          {permissions.canManage ? (
            <div className="rounded-xl border border-dashed border-slate-300 px-4 py-4">
              <h3 className="text-base font-semibold text-slate-950">Add variant</h3>
              <form action={createVariant} className="mt-4 grid gap-3 md:grid-cols-3">
                <input type="hidden" name="productId" value={product.id} />
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Name
                  </label>
                  <Input name="name" required />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    SKU
                  </label>
                  <Input name="sku" required />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Unit
                  </label>
                  <select
                    name="unitOfMeasureId"
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                    defaultValue=""
                  >
                    <option value="">Use product unit</option>
                    {lookups.units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name} ({unit.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Colour
                  </label>
                  <Input name="colour" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Thickness (mm)
                  </label>
                  <Input name="thicknessMm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Pack coverage (m2)
                  </label>
                  <Input name="packCoverageM2" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Pack quantity
                  </label>
                  <Input name="packQuantity" />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    id="new-variant-default"
                    type="checkbox"
                    name="isDefault"
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <label htmlFor="new-variant-default" className="text-sm text-slate-700">
                    Set as default
                  </label>
                </div>
                <div className="md:col-span-3 flex justify-end">
                  <button
                    type="submit"
                    className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    Add variant
                  </button>
                </div>
              </form>
            </div>
          ) : null}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Linked suppliers</h2>
            <p className="mt-1 text-sm text-slate-500">
              Supplier pricing is intentionally deferred to Phase C.
            </p>
          </div>
          <p className="text-sm text-slate-500">{suppliers.length} linked</p>
        </div>
        <div className="mt-4 space-y-3">
          {suppliers.length ? (
            suppliers.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200 px-4 py-4 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">
                      {item.supplier.tradingName ?? item.supplier.legalName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.supplier.supplierCode} • {item.supplierSku}
                    </p>
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {item.status}
                  </span>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <p className="text-slate-600">
                    Variant: {item.variant ? `${item.variant.name} (${item.variant.sku})` : "Product default"}
                  </p>
                  <p className="text-slate-600">
                    Unit: {item.supplierUnit ? `${item.supplierUnit.name} (${item.supplierUnit.code})` : "Not set"}
                  </p>
                  <p className="text-slate-600">
                    Lead time: {item.leadTimeDays == null ? "Not set" : `${item.leadTimeDays} days`}
                  </p>
                  <p className="text-slate-600">
                    Minimum order: {item.minimumOrderQty ?? "Not set"}
                  </p>
                  <p className="text-slate-600">
                    Roll width: {item.rollWidthM ?? "Not set"}
                  </p>
                  <p className="text-slate-600">
                    Pack coverage: {item.packCoverageM2 ?? "Not set"}
                  </p>
                  <p className="text-slate-600">
                    Preferred: {item.preferredSupplier ? "Yes" : "No"}
                  </p>
                  <p className="text-slate-600">
                    Last confirmed: {item.lastConfirmedAt ? item.lastConfirmedAt.slice(0, 10) : "Not set"}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
              No supplier links yet. Price history will be added in Phase C.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

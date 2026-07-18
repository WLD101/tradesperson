import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Input } from "@tradesperson/ui";
import { apiFetch, getSession } from "@/lib/api";
import {
  listSupplierPriceImports,
  getSupplierPermissions,
  type SupplierDetail,
  type SupplierPriceImportRecord,
  type SupplierPriceListRecord,
  type SupplierProductPriceRecord,
} from "@/lib/suppliers";

async function createPriceList(formData: FormData) {
  "use server";
  const supplierId = String(formData.get("supplierId"));
  await apiFetch(`/api/v1/suppliers/${supplierId}/price-lists`, {
    method: "POST",
    body: JSON.stringify({
      name: formData.get("name"),
      reference: formData.get("reference") || null,
      currency: formData.get("currency") || "GBP",
      effectiveDate: formData.get("effectiveDate"),
      expiryDate: formData.get("expiryDate") || null,
      sourceType: formData.get("sourceType") || "MANUAL",
      sourceFilename: formData.get("sourceFilename") || null,
      notes: formData.get("notes") || null,
    }),
  });
}

export default async function SupplierPricingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  const permissions = getSupplierPermissions(session);
  if (!permissions.canViewPricing) {
    return notFound();
  }

  const { id } = await params;
  const supplier = await apiFetch<SupplierDetail>(`/api/v1/suppliers/${id}`);
  const [priceLists, recentImports] = await Promise.all([
    apiFetch<SupplierPriceListRecord[]>(`/api/v1/suppliers/${id}/price-lists`),
    permissions.canImportPricing
      ? listSupplierPriceImports(id)
      : Promise.resolve([] as SupplierPriceImportRecord[]),
  ]);
  const productPrices = permissions.canViewPricing
    ? await Promise.all(
        supplier.supplierProducts.slice(0, 12).map(async (supplierProduct) => ({
          supplierProduct,
          prices: await apiFetch<SupplierProductPriceRecord[]>(
            `/api/v1/suppliers/${id}/products/${supplierProduct.id}/prices`,
          ),
        })),
      )
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href={`/app/suppliers/${supplier.id}`}
            className="text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            Back to supplier
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">
            Supplier pricing
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {supplier.tradingName ?? supplier.legalName} • deterministic server-side price lists and history
          </p>
        </div>
        {permissions.canImportPricing ? (
          <Link
            href={`/app/suppliers/${supplier.id}/price-imports/new`}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Import preview
          </Link>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
        <div className="space-y-6">
          <Card>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Price lists</h2>
              <p className="mt-1 text-sm text-slate-500">
                Approved versions stay immutable. New corrections should create a new version.
              </p>
            </div>
            <p className="text-sm text-slate-500">{priceLists.length} total</p>
          </div>

          <div className="mt-4 space-y-3">
            {priceLists.length ? (
              priceLists.map((priceList) => {
                const latestVersion = priceList.versions[0];
                return (
                  <div
                    key={priceList.id}
                    className="rounded-xl border border-slate-200 px-4 py-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-slate-950">
                          {priceList.name}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {priceList.reference ?? "No reference"} • {priceList.currency} • {priceList.status}
                        </p>
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        <p>{priceList._count.imports} imports</p>
                        <p>
                          {latestVersion?._count.prices ?? 0} price rows in latest version
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-3 text-sm text-slate-700">
                      <p>Effective: {new Date(priceList.effectiveDate).toLocaleDateString()}</p>
                      <p>
                        Expires:{" "}
                        {priceList.expiryDate
                          ? new Date(priceList.expiryDate).toLocaleDateString()
                          : "Open"}
                      </p>
                      <p>Source: {priceList.sourceType}</p>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <Link
                        href={`/app/suppliers/${supplier.id}/pricing/${priceList.id}`}
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Open detail
                      </Link>
                    </div>
                    {priceList.notes ? (
                      <p className="mt-3 text-sm text-slate-600">{priceList.notes}</p>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
                No supplier price lists yet.
              </div>
            )}
          </div>
          </Card>

          {permissions.canImportPricing ? (
            <Card>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">
                    Recent imports
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Server-persisted pricing imports with validation and execution status.
                  </p>
                </div>
                <p className="text-sm text-slate-500">{recentImports.length} total</p>
              </div>

              <div className="mt-4 space-y-3">
                {recentImports.length ? (
                  recentImports.slice(0, 8).map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-200 px-4 py-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold text-slate-950">
                            {item.sourceFilename}
                          </h3>
                          <p className="mt-1 text-sm text-slate-500">
                            {item.fileType} • {item.status} • {new Date(item.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <Link
                          href={`/app/suppliers/${supplier.id}/price-imports/${item.id}`}
                          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Open import
                        </Link>
                      </div>
                      <div className="mt-3 grid gap-3 text-sm text-slate-700 md:grid-cols-4">
                        <p>Total rows: {item.rowCount}</p>
                        <p>Valid rows: {item.validRowCount}</p>
                        <p>Invalid rows: {item.invalidRowCount}</p>
                        <p>Imported rows: {item.importedRowCount}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
                    No persisted supplier imports yet.
                  </div>
                )}
              </div>
            </Card>
          ) : null}
        </div>

        <Card>
          <h2 className="text-lg font-semibold text-slate-950">Create draft price list</h2>
          <p className="mt-1 text-sm text-slate-500">
            Start with a draft list, then build versions and product prices under approval control.
          </p>
          {permissions.canManagePricing ? (
            <form action={createPriceList} className="mt-4 grid gap-3">
              <input type="hidden" name="supplierId" value={supplier.id} />
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Name
                </label>
                <Input name="name" required />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Reference
                </label>
                <Input name="reference" />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Currency
                  </label>
                  <Input name="currency" defaultValue={supplier.defaultCurrency} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Source type
                  </label>
                  <select
                    name="sourceType"
                    defaultValue="MANUAL"
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                  >
                    <option value="MANUAL">Manual</option>
                    <option value="NEGOTIATED">Negotiated</option>
                    <option value="CSV_IMPORT">CSV import</option>
                    <option value="XLSX_IMPORT">XLSX import</option>
                    <option value="PROMOTION">Promotion</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Effective date
                  </label>
                  <Input name="effectiveDate" type="date" required />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Expiry date
                  </label>
                  <Input name="expiryDate" type="date" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Source filename
                </label>
                <Input name="sourceFilename" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Notes
                </label>
                <textarea
                  name="notes"
                  className="min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Create draft price list
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-slate-300 px-4 py-8 text-sm text-slate-500">
              You have read-only access to supplier pricing.
            </div>
          )}
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Current supplier product pricing
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Internal pricing only. Estimate and quotation consumption remains a later phase.
            </p>
          </div>
          <p className="text-sm text-slate-500">
            Showing {productPrices.length} supplier product records
          </p>
        </div>

        <div className="mt-4 space-y-4">
          {productPrices.length ? (
            productPrices.map(({ supplierProduct, prices }) => {
              const current = prices[0] ?? null;
              return (
                <div
                  key={supplierProduct.id}
                  className="rounded-xl border border-slate-200 px-4 py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-slate-950">
                        {supplierProduct.product.name}
                        {supplierProduct.variant ? ` • ${supplierProduct.variant.name}` : ""}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {supplierProduct.supplierSku} • {supplierProduct.status} • {supplierProduct.supplierUnit?.code ?? "No unit"}
                      </p>
                    </div>
                    <div className="text-right text-sm text-slate-700">
                      <p>{prices.length} stored price rows</p>
                      <p>
                        {current
                          ? `${current.currency} ${current.baseCost} • ${current.priceBasis}`
                          : "No price rows yet"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
              No supplier products are available for pricing yet.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@tradesperson/ui";
import { apiFetch, getSession } from "@/lib/api";
import {
  getSupplierPermissions,
  getSupplierPriceImport,
  getSupplierPriceList,
  getSupplierPriceListVersion,
  listSupplierPriceListVersions,
  type SupplierDetail,
} from "@/lib/suppliers";

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Not set";
  }

  return new Date(value).toLocaleString();
}

function formatDateOnly(value: string | null | undefined) {
  if (!value) {
    return "Open";
  }

  return new Date(value).toLocaleDateString();
}

export default async function SupplierPriceListDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; priceListId: string }>;
  searchParams?: Promise<{ versionId?: string }>;
}) {
  const session = await getSession();
  const permissions = getSupplierPermissions(session);
  if (!permissions.canViewPricing) {
    return notFound();
  }

  const { id, priceListId } = await params;
  const versionId = (await searchParams)?.versionId;

  const [supplier, priceList, versions] = await Promise.all([
    apiFetch<SupplierDetail>(`/api/v1/suppliers/${id}`),
    getSupplierPriceList(id, priceListId),
    listSupplierPriceListVersions(id, priceListId),
  ]);

  const activeVersion = versionId
    ? await getSupplierPriceListVersion(id, priceListId, versionId)
    : versions[0]
      ? await getSupplierPriceListVersion(id, priceListId, versions[0].id)
      : null;

  const sourceImport =
    activeVersion?.sourceImportId && permissions.canImportPricing
      ? await getSupplierPriceImport(id, activeVersion.sourceImportId)
      : null;
  const linkedImports = priceList.imports ?? [];
  const linkedImportCount = priceList._count?.imports ?? linkedImports.length;
  const activeVersionPrices = activeVersion?.prices ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={`/app/suppliers/${supplier.id}/pricing`}
            className="text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            Back to supplier pricing
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">
            Supplier price-list detail
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {supplier.tradingName ?? supplier.legalName} - {priceList.name}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
        <Card>
          <h2 className="text-lg font-semibold text-slate-950">Price list</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <p className="text-sm text-slate-700">Status: {priceList.status}</p>
            <p className="text-sm text-slate-700">Currency: {priceList.currency}</p>
            <p className="text-sm text-slate-700">
              Effective: {formatDateOnly(priceList.effectiveDate)}
            </p>
            <p className="text-sm text-slate-700">
              Expiry: {formatDateOnly(priceList.expiryDate)}
            </p>
            <p className="text-sm text-slate-700">Source: {priceList.sourceType}</p>
            <p className="text-sm text-slate-700">
              Imports linked: {linkedImportCount}
            </p>
          </div>
          {priceList.notes ? (
            <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {priceList.notes}
            </p>
          ) : null}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-slate-950">Version history</h2>
          <div className="mt-4 space-y-3">
            {versions.length ? (
              versions.map((version) => {
                const isActive = version.id === activeVersion?.id;
                const versionPrices = version.prices ?? [];
                return (
                  <Link
                    key={version.id}
                    href={`/app/suppliers/${supplier.id}/pricing/${priceList.id}?versionId=${version.id}`}
                    className={`block rounded-xl border px-4 py-4 ${
                      isActive
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">
                          Version {version.versionNumber}
                        </p>
                        <p className={`mt-1 text-xs ${isActive ? "text-slate-200" : "text-slate-500"}`}>
                          {version.status} - {formatDateOnly(version.effectiveDate)}
                        </p>
                      </div>
                      <p className={`text-xs ${isActive ? "text-slate-200" : "text-slate-500"}`}>
                        {versionPrices.length} rows
                      </p>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
                No versions are available yet.
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
        <Card>
          <h2 className="text-lg font-semibold text-slate-950">Active version</h2>
          {activeVersion ? (
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <p className="text-sm text-slate-700">Version: {activeVersion.versionNumber}</p>
                <p className="text-sm text-slate-700">Status: {activeVersion.status}</p>
                <p className="text-sm text-slate-700">
                  Approved at: {formatDateTime(activeVersion.approvedAt)}
                </p>
                <p className="text-sm text-slate-700">
                  Approved by: {activeVersion.approvedById ?? "Not approved"}
                </p>
                <p className="text-sm text-slate-700">
                  Revision reason: {activeVersion.revisionReason ?? "Not set"}
                </p>
                <p className="text-sm text-slate-700">
                  Source import: {activeVersion.sourceImportId ?? "Manual / not linked"}
                </p>
              </div>
              {sourceImport ? (
                <Link
                  href={`/app/suppliers/${supplier.id}/price-imports/${sourceImport.id}`}
                  className="inline-flex rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Open source import
                </Link>
              ) : null}
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Approved versions are treated as immutable records. Corrections should create a new version rather than rewriting historical pricing.
              </div>
            </div>
          ) : (
            <div className="mt-4 text-sm text-slate-500">No version selected.</div>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-slate-950">Linked imports</h2>
          <div className="mt-4 space-y-3">
            {linkedImports.length ? (
              linkedImports.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">
                        {item.sourceFilename}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.status} - created {formatDateTime(item.createdAt)}
                      </p>
                    </div>
                    {permissions.canImportPricing ? (
                      <Link
                        href={`/app/suppliers/${supplier.id}/price-imports/${item.id}`}
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Open import
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
                No imports are linked to this price list yet.
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Product-price rows</h2>
            <p className="mt-1 text-sm text-slate-500">
              Read-only rows for the selected version, including pricing basis and promotional fields.
            </p>
          </div>
          <p className="text-sm text-slate-500">
            {activeVersionPrices.length} rows
          </p>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-2 py-3">Price basis</th>
                <th className="px-2 py-3">Currency</th>
                <th className="px-2 py-3">Base cost</th>
                <th className="px-2 py-3">Promo cost</th>
                <th className="px-2 py-3">Quantity break</th>
                <th className="px-2 py-3">Effective</th>
                <th className="px-2 py-3">Expiry</th>
              </tr>
            </thead>
            <tbody>
              {activeVersionPrices.length ? (
                activeVersionPrices.map((price) => (
                  <tr key={price.id} className="border-b border-slate-100">
                    <td className="px-2 py-3 text-slate-900">{price.priceBasis}</td>
                    <td className="px-2 py-3 text-slate-900">{price.currency}</td>
                    <td className="px-2 py-3 text-slate-900">{price.baseCost}</td>
                    <td className="px-2 py-3 text-slate-900">
                      {price.promotionalCost ?? "-"}
                    </td>
                    <td className="px-2 py-3 text-slate-900">
                      {price.quantityFrom ?? "-"} to {price.quantityTo ?? "-"}
                    </td>
                    <td className="px-2 py-3 text-slate-900">
                      {formatDateOnly(price.effectiveDate)}
                    </td>
                    <td className="px-2 py-3 text-slate-900">
                      {formatDateOnly(price.expiryDate)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-2 py-10 text-center text-sm text-slate-500">
                    No product-price rows are available for this version.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

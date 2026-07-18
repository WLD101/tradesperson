import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@tradesperson/ui";
import { apiFetch, getSession } from "@/lib/api";
import { PriceImportPreview } from "@/components/suppliers/price-import-preview";
import { getSupplierPermissions, type SupplierDetail } from "@/lib/suppliers";

export default async function SupplierPriceImportPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  const permissions = getSupplierPermissions(session);
  if (!permissions.canImportPricing) {
    return notFound();
  }

  const { id } = await params;
  const supplier = await apiFetch<SupplierDetail>(`/api/v1/suppliers/${id}`);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/app/suppliers/${supplier.id}/pricing`}
          className="text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          Back to supplier pricing
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">
          Supplier import preview
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {supplier.tradingName ?? supplier.legalName} • preview CSV and XLSX rows before approval workflows are executed.
        </p>
      </div>

      <Card>
        <PriceImportPreview
          supplierId={supplier.id}
          supplierName={supplier.tradingName ?? supplier.legalName}
        />
      </Card>
    </div>
  );
}

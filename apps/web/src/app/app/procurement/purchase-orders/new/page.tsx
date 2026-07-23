import { redirect } from "next/navigation";
import { apiFetch, getSession } from "@/lib/api";
import { getProcurementPermissions } from "@/lib/procurement";
import type { ProductListResponse } from "@/lib/catalogue";
import type { SupplierListResponse } from "@/lib/suppliers";
import { PurchaseOrderForm } from "@/components/procurement/purchase-order-form";

export default async function NewPurchaseOrderPage() {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }

  const permissions = getProcurementPermissions(session);
  if (!permissions.canManagePo) {
    redirect("/app/procurement/purchase-orders");
  }

  const tenant = await apiFetch<{
    branches: Array<{ id: string; name: string }>;
  }>("/api/v1/tenants/current");
  const [products, suppliers] = await Promise.all([
    apiFetch<ProductListResponse>("/api/v1/catalogue/products?pageSize=100&sort=nameAsc"),
    apiFetch<SupplierListResponse>("/api/v1/suppliers?pageSize=100&sort=nameAsc"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">New Purchase Order</h1>
        <p className="mt-1 text-sm text-slate-500">Create a manual draft purchase order for a supplier.</p>
      </div>

      <PurchaseOrderForm
        branches={tenant.branches}
        products={products.items}
        suppliers={suppliers.items.map((supplier) => ({
          id: supplier.id,
          name: supplier.tradingName || supplier.legalName,
          supplierCode: supplier.supplierCode,
        }))}
        canOverrideCost={permissions.canOverrideCost}
      />
    </div>
  );
}

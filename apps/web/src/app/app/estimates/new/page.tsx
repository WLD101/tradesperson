import { redirect } from "next/navigation";
import { EstimateForm } from "@/components/estimates/estimate-form";
import { Breadcrumbs, PageHeader } from "@/components/shared";
import { apiFetch, getSession } from "@/lib/api";
import type { ProductListResponse } from "@/lib/catalogue";
import { getEstimatePermissions } from "@/lib/estimates";

export default async function NewEstimatePage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const perms = getEstimatePermissions(session);
  if (!perms.canCreate) redirect("/app/estimates");

  const [tenant, customers, sites, surveys, products] = await Promise.all([
    apiFetch<{ branches: Array<{ id: string; name: string }> }>("/api/v1/tenants/current"),
    apiFetch<any>("/api/v1/customers?pageSize=100").catch(() => ({ items: [] })),
    apiFetch<any>("/api/v1/sites?pageSize=100").catch(() => ({ items: [] })),
    apiFetch<any>("/api/v1/surveys?pageSize=100").catch(() => ({ items: [] })),
    apiFetch<ProductListResponse>("/api/v1/catalogue/products?pageSize=100&sort=nameAsc"),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Estimates", href: "/app/estimates" }, { label: "New" }]} />
      <PageHeader
        title="New Estimate"
        description="Build a costed estimate from customer/site context, rooms and priced lines."
      />
      <EstimateForm
        branches={tenant.branches.map((branch) => ({ id: branch.id, label: branch.name }))}
        customers={(customers.items ?? customers).map((customer: any) => ({
          id: customer.id,
          label: customer.displayName,
        }))}
        sites={(sites.items ?? sites).map((site: any) => ({
          id: site.id,
          label: site.label,
          customerId: site.customerId,
        }))}
        surveys={(surveys.items ?? surveys).map((survey: any) => ({
          id: survey.id,
          label: survey.reference,
          siteId: survey.siteId,
        }))}
        products={products.items}
      />
    </div>
  );
}

import { redirect } from "next/navigation";
import { EstimateForm } from "@/components/estimates/estimate-form";
import { Breadcrumbs, PageHeader } from "@/components/shared";
import { apiFetch, getSession } from "@/lib/api";
import type { ProductListResponse } from "@/lib/catalogue";
import { getEstimatePermissions } from "@/lib/estimates";

type ListResponse<T> = { items: T[] };
type CustomerOptionRecord = { id: string; displayName: string };
type SiteOptionRecord = { id: string; label: string; customerId: string };
type SurveyOptionRecord = { id: string; reference: string; siteId: string };

export default async function NewEstimatePage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string; siteId?: string; surveyId?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const perms = getEstimatePermissions(session);
  if (!perms.canCreate) redirect("/app/estimates");
  const initialSelection = await searchParams;

  const [tenant, customers, sites, surveys, products] = await Promise.all([
    apiFetch<{ branches: Array<{ id: string; name: string }> }>("/api/v1/tenants/current"),
    apiFetch<ListResponse<CustomerOptionRecord> | CustomerOptionRecord[]>("/api/v1/customers?pageSize=100").catch(() => ({ items: [] })),
    apiFetch<ListResponse<SiteOptionRecord> | SiteOptionRecord[]>("/api/v1/sites?pageSize=100").catch(() => ({ items: [] })),
    apiFetch<ListResponse<SurveyOptionRecord> | SurveyOptionRecord[]>("/api/v1/surveys?pageSize=100").catch(() => ({ items: [] })),
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
        customers={(Array.isArray(customers) ? customers : customers.items).map((customer) => ({
          id: customer.id,
          label: customer.displayName,
        }))}
        sites={(Array.isArray(sites) ? sites : sites.items).map((site) => ({
          id: site.id,
          label: site.label,
          customerId: site.customerId,
        }))}
        surveys={(Array.isArray(surveys) ? surveys : surveys.items).map((survey) => ({
          id: survey.id,
          label: survey.reference,
          siteId: survey.siteId,
        }))}
        products={products.items}
        initialCustomerId={initialSelection.customerId}
        initialSiteId={initialSelection.siteId}
        initialSurveyId={initialSelection.surveyId}
      />
    </div>
  );
}

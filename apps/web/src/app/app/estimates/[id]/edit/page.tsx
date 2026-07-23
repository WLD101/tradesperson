import { notFound, redirect } from "next/navigation";
import { EstimateForm } from "@/components/estimates/estimate-form";
import { Breadcrumbs, PageHeader } from "@/components/shared";
import { apiFetch, getSession } from "@/lib/api";
import type { ProductListResponse } from "@/lib/catalogue";
import { getEstimate, getEstimatePermissions } from "@/lib/estimates";

export default async function EditEstimatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const perms = getEstimatePermissions(session);
  if (!perms.canWrite) redirect("/app/estimates");

  const { id } = await params;
  let estimate;
  try {
    estimate = await getEstimate(id);
  } catch (err: any) {
    if (err?.message?.includes("404") || err?.message?.includes("not found")) notFound();
    throw err;
  }

  if (!["DRAFT", "CALCULATED"].includes(estimate.status)) {
    redirect(`/app/estimates/${estimate.id}`);
  }

  const [tenant, customers, sites, surveys, products] = await Promise.all([
    apiFetch<{ branches: Array<{ id: string; name: string }> }>("/api/v1/tenants/current"),
    apiFetch<any>("/api/v1/customers").catch(() => []),
    apiFetch<any>("/api/v1/sites").catch(() => []),
    apiFetch<any>("/api/v1/surveys").catch(() => []),
    apiFetch<ProductListResponse>("/api/v1/catalogue/products?pageSize=100&sort=nameAsc"),
  ]);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Estimates", href: "/app/estimates" },
          { label: estimate.estimateNumber, href: `/app/estimates/${estimate.id}` },
          { label: "Edit" },
        ]}
      />
      <PageHeader title={`Edit ${estimate.estimateNumber}`} description="Update rooms, lines and estimate notes." />
      <EstimateForm
        initialData={estimate}
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

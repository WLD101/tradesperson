import { redirect } from "next/navigation";
import { apiFetch, getSession } from "@/lib/api";
import { getProcurementPermissions } from "@/lib/procurement";
import { RequisitionForm } from "@/components/procurement/requisition-form";

export default async function NewRequisitionPage() {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }

  const perms = getProcurementPermissions(session);
  if (!perms.canManageRequisition) {
    redirect("/app/procurement/requisitions");
  }

  const tenant = await apiFetch<{
    name: string;
    branches: Array<{ id: string; name: string }>;
  }>("/api/v1/tenants/current");
    
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">New Requisition</h1>
        <p className="mt-1 text-sm text-slate-500">
          Create a new purchase requisition.
        </p>
      </div>

      <RequisitionForm 
        branches={tenant.branches}
        canViewCost={perms.canViewCost}
      />
    </div>
  );
}

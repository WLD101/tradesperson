import { notFound, redirect } from "next/navigation";
import { apiFetch, getSession } from "@/lib/api";
import { getProcurementPermissions, getRequisition } from "@/lib/procurement";
import { RequisitionForm } from "@/components/procurement/requisition-form";

export default async function EditRequisitionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }

  const perms = getProcurementPermissions(session);
  if (!perms.canManageRequisition) {
    redirect("/app/procurement/requisitions");
  }

  const { id } = await params;
  let requisition;
  try {
    requisition = await getRequisition(id);
  } catch (err: any) {
    if (err?.message?.includes("404")) {
      notFound();
    }
    throw err;
  }

  if (requisition.status !== "DRAFT") {
    redirect(`/app/procurement/requisitions/${id}`);
  }

  const tenant = await apiFetch<{
    name: string;
    branches: Array<{ id: string; name: string }>;
  }>("/api/v1/tenants/current");
    
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Edit Requisition</h1>
        <p className="mt-1 text-sm text-slate-500">
          Editing {requisition.requisitionNumber}
        </p>
      </div>

      <RequisitionForm 
        branches={tenant.branches}
        canViewCost={perms.canViewCost}
        initialData={requisition}
      />
    </div>
  );
}

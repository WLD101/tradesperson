import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/api";
import { getProcurementPermissions, getRequisition } from "@/lib/procurement";
import { RequisitionActions } from "@/components/procurement/requisition-actions";
import { 
  PageHeader, 
  Breadcrumbs, 
  StatusBadge, 
  SummaryStrip,
  DataTable,
  DateDisplay,
  Money,
  ActivityTimeline
} from "@/components/shared";

export default async function RequisitionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }

  const perms = getProcurementPermissions(session);
  if (!perms.canViewRequisition) {
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

  const getStatusColor = (s: string) => {
    if (s === "DRAFT") return "slate";
    if (s === "SUBMITTED") return "amber";
    if (s === "APPROVED") return "green";
    if (s === "ORDERED") return "blue";
    if (s === "REJECTED" || s === "CANCELLED") return "red";
    return "slate";
  };

  const isDraft = requisition.status === "DRAFT";

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "Procurement", href: "/app/procurement" }, 
        { label: "Requisitions", href: "/app/procurement/requisitions" },
        { label: requisition.requisitionNumber }
      ]} />
      
      <PageHeader 
        title={requisition.requisitionNumber} 
        description={`Created on ${new Date(requisition.createdAt).toLocaleDateString()}`}
        actions={
          <div className="flex items-center gap-3">
            <StatusBadge status={requisition.status} color={getStatusColor(requisition.status)} />
            <RequisitionActions
              requisition={requisition}
              permissions={{
                canManage: perms.canManageRequisition,
                canApprove: perms.canApproveRequisition,
              }}
            />
          </div>
        }
      />

      <SummaryStrip items={[
        { label: "Branch", value: requisition.branch.name },
        { label: "Requested By", value: requisition.createdBy ? `${requisition.createdBy.firstName} ${requisition.createdBy.lastName}` : "-" },
        { label: "Required Date", value: <DateDisplay date={requisition.requiredDate} /> },
        { label: "Purpose", value: requisition.purpose || "-" },
      ]} />

      <div className="grid gap-6 md:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-medium text-slate-900">Lines</h2>
              {isDraft && perms.canManageRequisition && (
                <Link
                  href={`/app/procurement/requisitions/${requisition.id}/edit`}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  Edit Requisition
                </Link>
              )}
            </div>
            
            {requisition.lines.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No lines found.
              </div>
            ) : (
              <DataTable headers={[
                "Item Details", 
                "Requested", 
                "Ordered", 
                "Remaining", 
                ...(perms.canViewCost ? ["Est. Total"] : []), 
                "Notes"
              ]}>
                {requisition.lines.map((line) => {
                  const requested = parseFloat(line.requestedQuantity);
                  const ordered = parseFloat(line.orderedQuantity);
                  const remaining = Math.max(0, requested - ordered);
                  
                  return (
                    <tr key={line.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{line.description}</p>
                        {line.product && <p className="text-xs text-slate-500 mt-1">Product: {line.product.name} ({line.product.sku})</p>}
                        {line.preferredSupplier && <p className="text-xs text-slate-500 mt-0.5">Pref. Supplier: {line.preferredSupplier.name}</p>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{requested} {line.unit}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{ordered} {line.unit}</td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium">
                        <span className={remaining === 0 ? "text-slate-400" : "text-amber-600"}>
                          {remaining} {line.unit}
                        </span>
                      </td>
                      {perms.canViewCost && (
                        <td className="px-4 py-3 whitespace-nowrap">
                          {line.estimatedTotal ? <Money amount={parseFloat(line.estimatedTotal)} currency="GBP" /> : "-"}
                        </td>
                      )}
                      <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                        {line.notes || "-"}
                      </td>
                    </tr>
                  );
                })}
              </DataTable>
            )}
          </div>
          
          {requisition.internalNotes && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">Internal Notes</h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{requisition.internalNotes}</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
            <h2 className="text-base font-semibold text-slate-900 mb-4 border-b border-slate-100 pb-2">Lifecycle Activity</h2>
            <div className="space-y-4">
              <ActivityTimeline items={[
                ...(requisition.cancelledAt ? [{
                  id: "cancelled",
                  user: "System",
                  action: "cancelled",
                  date: requisition.cancelledAt
                }] : []),
                ...(requisition.rejectedAt ? [{
                  id: "rejected",
                  user: "System",
                  action: "rejected",
                  date: requisition.rejectedAt
                }] : []),
                ...(requisition.approvedAt ? [{
                  id: "approved",
                  user: requisition.approvedBy ? `${requisition.approvedBy.firstName} ${requisition.approvedBy.lastName}` : "System",
                  action: "approved",
                  date: requisition.approvedAt
                }] : []),
                ...(requisition.submittedAt ? [{
                  id: "submitted",
                  user: "System",
                  action: "submitted for approval",
                  date: requisition.submittedAt
                }] : []),
                {
                  id: "created",
                  user: requisition.createdBy ? `${requisition.createdBy.firstName} ${requisition.createdBy.lastName}` : "System",
                  action: "created",
                  date: requisition.createdAt
                }
              ]} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

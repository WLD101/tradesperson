import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Breadcrumbs, DateDisplay, Money, PageHeader, StatusBadge, SummaryStrip } from "@/components/shared";
import { getSession } from "@/lib/api";
import { createJobMaterialRequisition, generateJobMaterialRequirements, getJob, getJobPermissions, issueJobStock, reserveJobStock } from "@/lib/jobs";

function statusColor(status: string) {
  if (status === "SCHEDULED") return "blue" as const;
  if (["IN_PROGRESS", "COMPLETED"].includes(status)) return "green" as const;
  if (status === "CANCELLED") return "red" as const;
  return "slate" as const;
}

async function generateRequirementsAction(formData: FormData) {
  "use server";
  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) return;
  await generateJobMaterialRequirements(jobId);
}

async function createRequisitionAction(formData: FormData) {
  "use server";
  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) return;
  await createJobMaterialRequisition(jobId);
}

async function reserveStockAction(formData: FormData) {
  "use server";
  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) return;
  await reserveJobStock(jobId);
}

async function issueStockAction(formData: FormData) {
  "use server";
  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) return;
  await issueJobStock(jobId);
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const perms = getJobPermissions(session);
  if (!perms.canRead) redirect("/app/dashboard");
  const { id } = await params;
  let job;
  try {
    job = await getJob(id);
  } catch (err: any) {
    if (err?.message?.includes("404") || err?.message?.includes("not found")) notFound();
    throw err;
  }
  const depositComplete = Number(job.depositRequired) <= Number(job.depositPaid);
  const materialRequirements = job.materialRequirements ?? [];
  const hasOutstandingRequirements = materialRequirements.some((requirement) => {
    const required = Number(requirement.requiredQuantity);
    const requisitioned = Number(requirement.requisitionedQuantity);
    return required > requisitioned;
  });
  const hasStockToReserve = materialRequirements.some((requirement) => {
    const required = Number(requirement.requiredQuantity);
    const allocated = Number(requirement.allocatedQuantity);
    return required > allocated;
  });
  const hasReservedStockToIssue = materialRequirements.some((requirement) => {
    const reserved = (requirement.stockReservations ?? []).reduce((sum, reservation) => sum + Number(reservation.reservedQuantity) - Number(reservation.issuedQuantity), 0);
    return reserved > 0;
  });

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Jobs", href: "/app/jobs" }, { label: job.jobNumber }]} />
      <PageHeader title={job.jobNumber} description={job.title ?? "Converted customer job"} actions={<StatusBadge status={job.status} color={statusColor(job.status)} />} />
      <SummaryStrip
        items={[
          { label: "Customer", value: job.customer?.displayName ?? "-" },
          { label: "Site", value: job.site?.label ?? "-" },
          { label: "Quote", value: job.quote ? <Link className="text-blue-600" href={`/app/quotes/${job.quote.id}`}>{job.quote.quoteNumber}</Link> : "-" },
          { label: "Deposit", value: depositComplete ? "Paid" : "Outstanding" },
          { label: "Start", value: <DateDisplay date={job.scheduledStart} /> },
          { label: "Total", value: <Money amount={Number(job.totalValue)} currency={job.currency} /> },
        ]}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="border-b border-slate-100 pb-2 font-semibold text-slate-950">Work Context</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between"><dt>Branch</dt><dd>{job.branch?.name ?? "-"}</dd></div>
            <div className="flex justify-between"><dt>Scheduled start</dt><dd><DateDisplay date={job.scheduledStart} /></dd></div>
            <div className="flex justify-between"><dt>Scheduled end</dt><dd><DateDisplay date={job.scheduledEnd} /></dd></div>
            <div className="flex justify-between"><dt>Address</dt><dd className="text-right">{[job.site?.addressLine1, job.site?.city, job.site?.postcode].filter(Boolean).join(", ") || "-"}</dd></div>
          </dl>
          {job.accessNotes ? <p className="mt-5 rounded-md bg-slate-50 p-3 text-sm text-slate-600">{job.accessNotes}</p> : null}
          {job.workNotes ? <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-600">{job.workNotes}</p> : null}
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="border-b border-slate-100 pb-2 font-semibold text-slate-950">Deposit Status</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between"><dt>Required</dt><dd><Money amount={Number(job.depositRequired)} currency={job.currency} /></dd></div>
            <div className="flex justify-between"><dt>Paid</dt><dd><Money amount={Number(job.depositPaid)} currency={job.currency} /></dd></div>
            <div className="flex justify-between border-t border-slate-100 pt-3 font-semibold"><dt>Status</dt><dd className={depositComplete ? "text-green-700" : "text-amber-700"}>{depositComplete ? "Deposit paid" : "Deposit outstanding"}</dd></div>
          </dl>
        </section>
      </div>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-950">Material Requirements</h2>
            <p className="text-sm text-slate-500">Generated from material quote lines and ready for procurement and stock allocation.</p>
          </div>
          {!materialRequirements.length && perms.canWrite ? (
            <form action={generateRequirementsAction}>
              <input name="jobId" type="hidden" value={job.id} />
              <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700" type="submit">
                Generate requirements
              </button>
            </form>
          ) : null}
          {materialRequirements.length && hasOutstandingRequirements && perms.canWrite ? (
            <form action={createRequisitionAction}>
              <input name="jobId" type="hidden" value={job.id} />
              <button className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600" type="submit">
                Create draft requisition
              </button>
            </form>
          ) : null}
          {materialRequirements.length && hasStockToReserve && perms.canWrite ? (
            <form action={reserveStockAction}>
              <input name="jobId" type="hidden" value={job.id} />
              <button className="rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-600" type="submit">
                Reserve stock
              </button>
            </form>
          ) : null}
          {materialRequirements.length && hasReservedStockToIssue && perms.canWrite ? (
            <form action={issueStockAction}>
              <input name="jobId" type="hidden" value={job.id} />
              <button className="rounded-md bg-orange-700 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600" type="submit">
                Issue reserved stock
              </button>
            </form>
          ) : null}
        </div>
        {materialRequirements.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Material</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3 text-right">Required</th>
                  <th className="px-4 py-3 text-right">Requisitioned</th>
                  <th className="px-4 py-3 text-right">Ordered</th>
                  <th className="px-4 py-3 text-right">Received</th>
                  <th className="px-4 py-3 text-right">Allocated</th>
                  <th className="px-4 py-3 text-right">Issued</th>
                  <th className="px-4 py-3 text-right">To requisition</th>
                  <th className="px-4 py-3">Warehouse</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Requisition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {materialRequirements.map((requirement) => {
                  const required = Number(requirement.requiredQuantity);
                  const requisitioned = Number(requirement.requisitionedQuantity);
                  const ordered = Number(requirement.orderedQuantity);
                  const received = Number(requirement.receivedQuantity);
                  const allocated = Number(requirement.allocatedQuantity);
                  const issued = Number(requirement.issuedQuantity);
                  const toRequisition = Math.max(0, required - requisitioned);
                  const reservedSummary = requirement.stockReservations?.filter((reservation) => reservation.status !== "CANCELLED") ?? [];
                  return (
                    <tr key={requirement.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{requirement.description}</div>
                        <div className="text-xs text-slate-500">Required <DateDisplay date={requirement.requiredDate} /></div>
                      </td>
                      <td className="px-4 py-3">
                        <div>{requirement.product?.name ?? "Unmatched material"}</div>
                        <div className="text-xs text-slate-500">
                          {[requirement.product?.sku, requirement.productVariant?.sku, requirement.supplierProduct?.supplierSku].filter(Boolean).join(" / ") || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">{required.toFixed(2)} {requirement.unit}</td>
                      <td className="px-4 py-3 text-right">{requisitioned.toFixed(2)} {requirement.unit}</td>
                      <td className="px-4 py-3 text-right">{ordered.toFixed(2)} {requirement.unit}</td>
                      <td className="px-4 py-3 text-right">{received.toFixed(2)} {requirement.unit}</td>
                      <td className="px-4 py-3 text-right">{allocated.toFixed(2)} {requirement.unit}</td>
                      <td className="px-4 py-3 text-right">{issued.toFixed(2)} {requirement.unit}</td>
                      <td className={toRequisition > 0 ? "px-4 py-3 text-right font-semibold text-amber-700" : "px-4 py-3 text-right text-green-700"}>
                        {toRequisition.toFixed(2)} {requirement.unit}
                      </td>
                      <td className="px-4 py-3">
                        {reservedSummary.length ? (
                          <div className="space-y-1 text-xs text-slate-600">
                            {reservedSummary.map((reservation) => (
                              <div key={reservation.id}>{reservation.warehouse.code}: {Number(reservation.reservedQuantity).toFixed(2)} {reservation.unit}</div>
                            ))}
                          </div>
                        ) : "-"}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={requirement.status} color={requirement.status === "PLANNED" ? "blue" : "green"} /></td>
                      <td className="px-4 py-3">
                        {requirement.purchaseRequisitionLine ? (
                          <Link className="font-medium text-blue-600" href={`/app/procurement/requisitions/${requirement.purchaseRequisitionLine.purchaseRequisition.id}`}>
                            {requirement.purchaseRequisitionLine.purchaseRequisition.requisitionNumber}
                          </Link>
                        ) : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-500">
            No material requirements have been generated yet. Use the action above to create the first procurement-ready requirement list from this job's quote.
          </div>
        )}
      </section>
    </div>
  );
}

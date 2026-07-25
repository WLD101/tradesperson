import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Breadcrumbs, DateDisplay, Money, PageHeader, StatusBadge, SummaryStrip } from "@/components/shared";
import { getSession } from "@/lib/api";
import { completeJob, createJobInvoice, createJobMaterialRequisition, generateJobMaterialRequirements, getJob, getJobPermissions, issueJobStock, recordInvoicePayment, reserveJobStock, returnJobStock, scheduleJob } from "@/lib/jobs";

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

async function returnStockAction(formData: FormData) {
  "use server";
  const jobId = String(formData.get("jobId") ?? "");
  const stockReservationId = String(formData.get("stockReservationId") ?? "");
  const usableQuantity = Number(formData.get("usableQuantity") ?? 0);
  const damagedQuantity = Number(formData.get("damagedQuantity") ?? 0);
  if (!jobId || !stockReservationId || usableQuantity + damagedQuantity <= 0) return;
  const idempotencyKey =
    String(formData.get("idempotencyKey") ?? "") ||
    `return-${jobId}-${stockReservationId}-${Date.now()}`;
  await returnJobStock(jobId, {
    idempotencyKey,
    notes: String(formData.get("notes") ?? ""),
    lines: [{ stockReservationId, usableQuantity, damagedQuantity }],
  });
}

async function scheduleJobAction(formData: FormData) {
  "use server";
  const jobId = String(formData.get("jobId") ?? "");
  const scheduledStart = String(formData.get("scheduledStart") ?? "");
  const scheduledEnd = String(formData.get("scheduledEnd") ?? "");
  if (!jobId || !scheduledStart || !scheduledEnd) return;
  await scheduleJob(jobId, {
    scheduledStart,
    scheduledEnd,
    accessNotes: String(formData.get("accessNotes") ?? ""),
    workNotes: String(formData.get("workNotes") ?? ""),
  });
}

async function completeJobAction(formData: FormData) {
  "use server";
  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) return;
  await completeJob(jobId, {
    completionNotes: String(formData.get("completionNotes") ?? ""),
    customerSignoffName: String(formData.get("customerSignoffName") ?? ""),
  });
}

async function createInvoiceAction(formData: FormData) {
  "use server";
  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) return;
  await createJobInvoice(jobId, {
    dueDate: String(formData.get("dueDate") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });
}

async function recordPaymentAction(formData: FormData) {
  "use server";
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  if (!invoiceId || amount <= 0) return;
  await recordInvoicePayment(invoiceId, {
    amount,
    method: String(formData.get("method") ?? ""),
    reference: String(formData.get("reference") ?? ""),
    idempotencyKey: String(formData.get("idempotencyKey") ?? ""),
    paidAt: String(formData.get("paidAt") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });
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
  const invoices = job.invoices ?? [];
  const activeInvoice = invoices.find((invoice) => invoice.status !== "CANCELLED");
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
  const hasIssuedStockToReturn = materialRequirements.some((requirement) =>
    (requirement.stockReservations ?? []).some((reservation) => Number(reservation.issuedQuantity) > 0),
  );

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
          { label: "Completed", value: <DateDisplay date={job.completedAt} /> },
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
        <h2 className="border-b border-slate-100 pb-2 font-semibold text-slate-950">Installation Schedule</h2>
        <form action={scheduleJobAction} className="mt-4 grid gap-4 md:grid-cols-2">
          <input name="jobId" type="hidden" value={job.id} />
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">Start</span>
            <input className="w-full rounded-md border border-slate-300 px-3 py-2" name="scheduledStart" type="datetime-local" defaultValue={job.scheduledStart?.slice(0, 16) ?? ""} required />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-slate-700">End</span>
            <input className="w-full rounded-md border border-slate-300 px-3 py-2" name="scheduledEnd" type="datetime-local" defaultValue={job.scheduledEnd?.slice(0, 16) ?? ""} required />
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="font-medium text-slate-700">Access notes</span>
            <textarea className="min-h-20 w-full rounded-md border border-slate-300 px-3 py-2" name="accessNotes" defaultValue={job.accessNotes ?? ""} />
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="font-medium text-slate-700">Work notes</span>
            <textarea className="min-h-20 w-full rounded-md border border-slate-300 px-3 py-2" name="workNotes" defaultValue={job.workNotes ?? ""} />
          </label>
          {perms.canWrite ? (
            <div className="md:col-span-2">
              <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700" type="submit">Save schedule</button>
            </div>
          ) : null}
        </form>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="border-b border-slate-100 pb-2 font-semibold text-slate-950">Completion</h2>
        {job.status === "COMPLETED" ? (
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            <p>Completed <DateDisplay date={job.completedAt} /></p>
            <p>Customer sign-off: {job.customerSignoffName ?? "-"}</p>
            {job.completionNotes ? <p className="rounded-md bg-slate-50 p-3">{job.completionNotes}</p> : null}
          </div>
        ) : (
          <form action={completeJobAction} className="mt-4 grid gap-4">
            <input name="jobId" type="hidden" value={job.id} />
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Customer sign-off name</span>
              <input className="w-full rounded-md border border-slate-300 px-3 py-2" name="customerSignoffName" placeholder="Name of customer or site contact" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Completion notes</span>
              <textarea className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2" name="completionNotes" placeholder="Installation complete, rooms checked, waste removed, aftercare explained." />
            </label>
            {perms.canWrite ? (
              <div>
                <button className="rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-600" type="submit">Mark job complete</button>
              </div>
            ) : null}
          </form>
        )}
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-950">Invoice & Payments</h2>
            <p className="text-sm text-slate-500">Final billing for this flooring job, including deposit credit and recorded customer payments.</p>
          </div>
          {!activeInvoice && job.status === "COMPLETED" && perms.canWrite ? (
            <form action={createInvoiceAction} className="flex flex-col gap-2 sm:w-80">
              <input name="jobId" type="hidden" value={job.id} />
              <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" name="dueDate" type="date" aria-label="Invoice due date" />
              <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" name="notes" placeholder="Optional invoice note" />
              <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700" type="submit">
                Create invoice
              </button>
            </form>
          ) : null}
        </div>
        {activeInvoice ? (
          <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_360px]">
            <div>
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm text-slate-500">Invoice</div>
                    <div className="text-lg font-semibold text-slate-950">{activeInvoice.invoiceNumber}</div>
                  </div>
                  <StatusBadge status={activeInvoice.status} color={activeInvoice.status === "PAID" ? "green" : "blue"} />
                </div>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div className="flex justify-between gap-3"><dt>Total</dt><dd><Money amount={Number(activeInvoice.total)} currency={activeInvoice.currency} /></dd></div>
                  <div className="flex justify-between gap-3"><dt>Deposit / paid</dt><dd><Money amount={Number(activeInvoice.paidAmount)} currency={activeInvoice.currency} /></dd></div>
                  <div className="flex justify-between gap-3"><dt>Balance due</dt><dd className={Number(activeInvoice.balanceDue) > 0 ? "font-semibold text-amber-700" : "font-semibold text-green-700"}><Money amount={Number(activeInvoice.balanceDue)} currency={activeInvoice.currency} /></dd></div>
                  <div className="flex justify-between gap-3"><dt>Due</dt><dd><DateDisplay date={activeInvoice.dueDate} /></dd></div>
                </dl>
                {activeInvoice.notes ? <p className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-slate-600">{activeInvoice.notes}</p> : null}
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Payment</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Method</th>
                      <th className="px-4 py-3">Reference</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeInvoice.payments?.length ? activeInvoice.payments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-4 py-3 font-medium text-slate-900">{payment.paymentNumber}</td>
                        <td className="px-4 py-3"><DateDisplay date={payment.paidAt} /></td>
                        <td className="px-4 py-3">{payment.method ?? "-"}</td>
                        <td className="px-4 py-3">{payment.reference ?? "-"}</td>
                        <td className="px-4 py-3 text-right"><Money amount={Number(payment.amount)} currency={payment.currency} /></td>
                      </tr>
                    )) : (
                      <tr>
                        <td className="px-4 py-6 text-center text-slate-500" colSpan={5}>No additional payments have been recorded yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {Number(activeInvoice.balanceDue) > 0 && perms.canWrite ? (
              <form action={recordPaymentAction} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <input name="invoiceId" type="hidden" value={activeInvoice.id} />
                <input name="idempotencyKey" type="hidden" value={`${activeInvoice.id}:${activeInvoice.balanceDue}:${Date.now()}`} />
                <h3 className="font-semibold text-slate-950">Record payment</h3>
                <div className="mt-4 space-y-3">
                  <label className="block space-y-1 text-sm">
                    <span className="font-medium text-slate-700">Amount</span>
                    <input className="w-full rounded-md border border-slate-300 px-3 py-2" name="amount" type="number" min="0.01" max={Number(activeInvoice.balanceDue)} step="0.01" defaultValue={Number(activeInvoice.balanceDue).toFixed(2)} required />
                  </label>
                  <label className="block space-y-1 text-sm">
                    <span className="font-medium text-slate-700">Paid at</span>
                    <input className="w-full rounded-md border border-slate-300 px-3 py-2" name="paidAt" type="date" />
                  </label>
                  <label className="block space-y-1 text-sm">
                    <span className="font-medium text-slate-700">Method</span>
                    <input className="w-full rounded-md border border-slate-300 px-3 py-2" name="method" placeholder="Card, bank transfer, cash" />
                  </label>
                  <label className="block space-y-1 text-sm">
                    <span className="font-medium text-slate-700">Reference</span>
                    <input className="w-full rounded-md border border-slate-300 px-3 py-2" name="reference" placeholder="Receipt or bank reference" />
                  </label>
                  <label className="block space-y-1 text-sm">
                    <span className="font-medium text-slate-700">Notes</span>
                    <textarea className="min-h-20 w-full rounded-md border border-slate-300 px-3 py-2" name="notes" />
                  </label>
                </div>
                <button className="mt-4 w-full rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-600" type="submit">
                  Record payment
                </button>
              </form>
            ) : null}
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-500">
            {job.status === "COMPLETED" ? "No invoice has been created yet." : "Complete the installation before creating the final invoice."}
          </div>
        )}
      </section>
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
        {materialRequirements.length && hasIssuedStockToReturn && perms.canWrite ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <h3 className="text-sm font-semibold text-amber-950">Return issued material</h3>
            <p className="mt-1 text-sm text-amber-800">Return usable stock to inventory or record damaged material without making it available for reservation.</p>
            <div className="mt-3 grid gap-3">
              {materialRequirements.flatMap((requirement) =>
                (requirement.stockReservations ?? [])
                  .filter((reservation) => Number(reservation.issuedQuantity) > 0)
                  .map((reservation) => (
                    <form key={reservation.id} action={returnStockAction} className="grid gap-2 rounded-md border border-amber-200 bg-white p-3 md:grid-cols-[1fr_120px_120px_1fr_auto]">
                      <input name="jobId" type="hidden" value={job.id} />
                      <input name="stockReservationId" type="hidden" value={reservation.id} />
                      <div className="text-sm">
                        <div className="font-medium text-slate-900">{requirement.description}</div>
                        <div className="text-xs text-slate-500">{reservation.warehouse.code}: issued {Number(reservation.issuedQuantity).toFixed(2)} {reservation.unit}</div>
                      </div>
                      <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" name="usableQuantity" type="number" min="0" step="0.0001" placeholder="Usable" />
                      <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" name="damagedQuantity" type="number" min="0" step="0.0001" placeholder="Damaged" />
                      <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" name="notes" placeholder="Return note" />
                      <button className="rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600" type="submit">Return</button>
                    </form>
                  )),
              )}
            </div>
          </div>
        ) : null}
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

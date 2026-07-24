import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Breadcrumbs, DateDisplay, Money, PageHeader, StatusBadge, SummaryStrip } from "@/components/shared";
import { getSession } from "@/lib/api";
import { getJob, getJobPermissions } from "@/lib/jobs";

function statusColor(status: string) {
  if (status === "SCHEDULED") return "blue" as const;
  if (["IN_PROGRESS", "COMPLETED"].includes(status)) return "green" as const;
  if (status === "CANCELLED") return "red" as const;
  return "slate" as const;
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
    </div>
  );
}

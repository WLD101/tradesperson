"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Clock, ExternalLink, PackageCheck, UserRound } from "lucide-react";
import { ClientApiError } from "@/lib/client-api";
import { scheduleJobClient, unscheduleJobClient } from "@/lib/jobs-client";
import type { Job, ScheduleInstaller } from "@/lib/jobs";
import { DateDisplay, Money, StatusBadge } from "@/components/shared";

type DialogState = {
  job: Job;
  scheduledStart: string;
  scheduledEnd: string;
  assignedInstallerId: string;
  installationTeamName: string;
  accessNotes: string;
  workNotes: string;
};

function toLocalInput(value: string | null | undefined, fallbackDate: string, fallbackHour: number) {
  if (!value) return `${fallbackDate}T${String(fallbackHour).padStart(2, "0")}:00`;
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function durationHours(job: Job) {
  if (!job.scheduledStart || !job.scheduledEnd) return 0;
  const ms = new Date(job.scheduledEnd).getTime() - new Date(job.scheduledStart).getTime();
  return Math.max(0, ms / 36e5);
}

function overlaps(aStart: string, aEnd: string, bStart: string | null, bEnd: string | null) {
  if (!bStart || !bEnd) return false;
  return new Date(bStart).getTime() < new Date(aEnd).getTime() && new Date(bEnd).getTime() > new Date(aStart).getTime();
}

function materialSignal(job: Job) {
  const requirements = job.materialRequirements ?? [];
  if (!requirements.length) return { label: "No material lines", tone: "slate" as const };
  const issued = requirements.filter((line) => Number(line.issuedQuantity) >= Number(line.requiredQuantity)).length;
  const allocated = requirements.filter((line) => Number(line.allocatedQuantity) >= Number(line.requiredQuantity)).length;
  if (issued === requirements.length) return { label: "Materials issued", tone: "green" as const };
  if (allocated === requirements.length) return { label: "Stock reserved", tone: "blue" as const };
  return { label: "Materials pending", tone: "amber" as const };
}

function statusTone(status: string) {
  if (status === "COMPLETED") return "green" as const;
  if (status === "SCHEDULED" || status === "IN_PROGRESS") return "blue" as const;
  if (status === "CANCELLED") return "red" as const;
  return "slate" as const;
}

export function ScheduleBoard({
  canWrite,
  initialDate,
  installers,
  scheduledJobs,
  unscheduledJobs,
  view,
}: {
  canWrite: boolean;
  initialDate: string;
  installers: ScheduleInstaller[];
  scheduledJobs: Job[];
  unscheduledJobs: Job[];
  view: "day" | "week";
}) {
  const router = useRouter();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const workload = useMemo(() => installers.map((installer) => {
    const jobs = scheduledJobs.filter((job) => job.assignedInstallerId === installer.id);
    const hours = jobs.reduce((sum, job) => sum + durationHours(job), 0);
    const overlapCount = jobs.reduce((count, job, index) => count + jobs.slice(index + 1).filter((other) => overlaps(job.scheduledStart ?? "", job.scheduledEnd ?? "", other.scheduledStart, other.scheduledEnd)).length, 0);
    return { installer, jobs, hours, overlapCount };
  }), [installers, scheduledJobs]);

  const openScheduleDialog = (job: Job, installerId = job.assignedInstallerId ?? "") => {
    setError(null);
    setDialog({
      job,
      scheduledStart: toLocalInput(job.scheduledStart, initialDate, 9),
      scheduledEnd: toLocalInput(job.scheduledEnd, initialDate, 17),
      assignedInstallerId: installerId,
      installationTeamName: job.installationTeamName ?? "",
      accessNotes: job.accessNotes ?? "",
      workNotes: job.workNotes ?? "",
    });
  };

  const obviousConflict = dialog
    ? scheduledJobs.find((job) =>
        job.id !== dialog.job.id &&
        ((dialog.assignedInstallerId && job.assignedInstallerId === dialog.assignedInstallerId) ||
          (dialog.installationTeamName && job.installationTeamName === dialog.installationTeamName)) &&
        overlaps(dialog.scheduledStart, dialog.scheduledEnd, job.scheduledStart, job.scheduledEnd),
      )
    : null;

  const submitSchedule = () => {
    if (!dialog) return;
    setError(null);
    startTransition(async () => {
      try {
        await scheduleJobClient(dialog.job.id, {
          scheduledStart: new Date(dialog.scheduledStart).toISOString(),
          scheduledEnd: new Date(dialog.scheduledEnd).toISOString(),
          assignedInstallerId: dialog.assignedInstallerId,
          installationTeamName: dialog.installationTeamName,
          accessNotes: dialog.accessNotes,
          workNotes: dialog.workNotes,
        });
        setDialog(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof ClientApiError ? err.message : "Unable to save schedule.");
      }
    });
  };

  const unschedule = (job: Job) => {
    setError(null);
    startTransition(async () => {
      try {
        await unscheduleJobClient(job.id);
        setSelectedJob(null);
        setDialog(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof ClientApiError ? err.message : "Unable to return job to unscheduled queue.");
      }
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-stitch">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-title-md text-slate-950">Installer Workload</h2>
          <p className="mt-1 text-sm text-slate-500">Capacity is shown as scheduled jobs, hours, visible overlaps, and unscheduled queue pressure.</p>
        </div>
        <div className="divide-y divide-slate-100">
          {workload.length ? workload.map(({ installer, jobs, hours, overlapCount }) => (
            <div key={installer.id} className="grid gap-4 px-5 py-5 lg:grid-cols-[260px_1fr]">
              <div>
                <div className="flex items-center gap-2">
                  <UserRound className="h-5 w-5 text-slate-400" />
                  <h3 className="font-semibold text-slate-950">{installer.name || installer.email}</h3>
                </div>
                <p className="mt-1 text-sm text-slate-500">{installer.defaultBranch?.name ?? "All branches"} · {installer.userStatus}</p>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-slate-50 p-2"><strong className="block font-mono text-lg text-slate-950">{jobs.length}</strong> jobs</div>
                  <div className="rounded-lg bg-slate-50 p-2"><strong className="block font-mono text-lg text-slate-950">{hours.toFixed(1)}</strong> hrs</div>
                  <div className={overlapCount ? "rounded-lg bg-red-50 p-2 text-red-700" : "rounded-lg bg-emerald-50 p-2 text-emerald-700"}><strong className="block text-lg">{overlapCount}</strong> conflicts</div>
                </div>
              </div>
              <div className={view === "week" ? "grid gap-3 md:grid-cols-2 2xl:grid-cols-3" : "grid gap-3"}>
                {jobs.length ? jobs.map((job) => (
                  <JobCard key={job.id} job={job} onDetails={() => setSelectedJob(job)} onSchedule={() => openScheduleDialog(job, installer.id)} />
                )) : (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No scheduled work in this range.</div>
                )}
              </div>
            </div>
          )) : (
            <div className="px-5 py-12 text-center text-sm text-slate-500">No active installers are available for this branch.</div>
          )}
        </div>
      </section>

      <aside className="space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-stitch">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-title-md text-slate-950">Unscheduled Queue</h2>
              <p className="mt-1 text-sm text-slate-500">Jobs without date, time, or installer.</p>
            </div>
            <Link className="text-sm font-medium text-blue-700" href="/app/jobs">All jobs</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {unscheduledJobs.length ? unscheduledJobs.map((job) => (
              <div key={job.id} className="px-5 py-4" data-testid={`unscheduled-job-${job.id}`}>
                <JobSummary job={job} />
                <div className="mt-3 flex gap-2">
                  <button className="rounded-md bg-slate-950 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60" disabled={!canWrite || isPending} onClick={() => openScheduleDialog(job)}>
                    Quick schedule
                  </button>
                  <button className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => setSelectedJob(job)}>
                    Details
                  </button>
                </div>
              </div>
            )) : (
              <div className="px-5 py-12 text-center text-sm text-slate-500">No unscheduled jobs need dispatch.</div>
            )}
          </div>
        </section>

        {error ? (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <div className="flex gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        ) : null}
      </aside>

      {selectedJob ? (
        <div className="fixed inset-0 z-50 bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelectedJob(null)}>
          <section aria-label="Job details" className="ml-auto flex h-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-6 py-4">
              <JobSummary job={selectedJob} />
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5 text-sm">
              <DetailRow label="Customer" value={selectedJob.customer?.displayName ?? "-"} />
              <DetailRow label="Site" value={[selectedJob.site?.label, selectedJob.site?.postcode].filter(Boolean).join(" · ") || "-"} />
              <DetailRow label="Schedule" value={selectedJob.scheduledStart ? `${new Date(selectedJob.scheduledStart).toLocaleString()} - ${new Date(selectedJob.scheduledEnd ?? selectedJob.scheduledStart).toLocaleTimeString()}` : "Unscheduled"} />
              <DetailRow label="Installer" value={selectedJob.assignedInstaller ? `${selectedJob.assignedInstaller.firstName} ${selectedJob.assignedInstaller.lastName}` : "-"} />
              <DetailRow label="Team" value={selectedJob.installationTeamName ?? "-"} />
              <DetailRow label="Material readiness" value={materialSignal(selectedJob).label} />
              <DetailRow label="Work notes" value={selectedJob.workNotes ?? "-"} />
              <div>
                <h3 className="font-medium text-slate-950">Material requirements</h3>
                <div className="mt-2 space-y-2">
                  {(selectedJob.materialRequirements ?? []).length ? selectedJob.materialRequirements?.map((line) => (
                    <div key={line.id} className="rounded-lg bg-slate-50 p-3">
                      <p className="font-medium text-slate-900">{line.description}</p>
                      <p className="mt-1 text-slate-500">{line.issuedQuantity}/{line.requiredQuantity} {line.unit} issued · {line.status}</p>
                    </div>
                  )) : <p className="text-slate-500">No material requirements.</p>}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={() => setSelectedJob(null)}>Close</button>
              {canWrite && selectedJob.status !== "COMPLETED" && selectedJob.status !== "CANCELLED" ? (
                <>
                  <button className="rounded-md border border-amber-300 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50" disabled={isPending} onClick={() => unschedule(selectedJob)}>Return to queue</button>
                  <button className="rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800" onClick={() => openScheduleDialog(selectedJob)}>Reschedule</button>
                </>
              ) : null}
              <Link data-testid="schedule-full-job-link" className="inline-flex items-center rounded-md bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800" href={`/app/jobs/${selectedJob.id}`}>
                Full job <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </section>
        </div>
      ) : null}

      {dialog ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setDialog(null)}>
          <section aria-labelledby="schedule-dialog-title" className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <h2 id="schedule-dialog-title" className="text-lg font-semibold text-slate-950">Schedule {dialog.job.jobNumber}</h2>
            <p className="mt-1 text-sm text-slate-500">Server-side validation remains authoritative. Visible conflicts are warned before submission.</p>
            {obviousConflict ? (
              <div role="alert" data-testid="schedule-obvious-conflict" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Obvious conflict: {obviousConflict.jobNumber} overlaps this installer or team in the selected time range.
              </div>
            ) : null}
            {error ? (
              <div role="alert" data-testid="schedule-server-error" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
            ) : null}
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="Start">
                <input aria-label="Schedule start" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" type="datetime-local" value={dialog.scheduledStart} onChange={(event) => setDialog({ ...dialog, scheduledStart: event.target.value })} />
              </Field>
              <Field label="End">
                <input aria-label="Schedule end" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" type="datetime-local" value={dialog.scheduledEnd} onChange={(event) => setDialog({ ...dialog, scheduledEnd: event.target.value })} />
              </Field>
              <Field label="Installer">
                <select aria-label="Assigned installer" className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" value={dialog.assignedInstallerId} onChange={(event) => setDialog({ ...dialog, assignedInstallerId: event.target.value })}>
                  <option value="">Unassigned</option>
                  {installers.map((installer) => <option key={installer.id} value={installer.id}>{installer.name || installer.email}</option>)}
                </select>
              </Field>
              <Field label="Team name">
                <input aria-label="Installation team name" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" value={dialog.installationTeamName} onChange={(event) => setDialog({ ...dialog, installationTeamName: event.target.value })} placeholder="Team A, van 2, subcontractor crew" />
              </Field>
              <Field label="Access notes">
                <textarea aria-label="Access notes" className="min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" value={dialog.accessNotes} onChange={(event) => setDialog({ ...dialog, accessNotes: event.target.value })} />
              </Field>
              <Field label="Work notes">
                <textarea aria-label="Work notes" className="min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" value={dialog.workNotes} onChange={(event) => setDialog({ ...dialog, workNotes: event.target.value })} />
              </Field>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={() => setDialog(null)}>Cancel</button>
              <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60" disabled={!canWrite || isPending} onClick={submitSchedule}>
                {isPending ? "Saving..." : "Save schedule"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function JobCard({ job, onDetails, onSchedule }: { job: Job; onDetails: () => void; onSchedule: () => void }) {
  const material = materialSignal(job);
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-stitch transition hover:border-emerald-200 hover:bg-emerald-50/40" data-testid={`scheduled-job-${job.id}`}>
      <div className="flex items-start justify-between gap-3">
        <JobSummary job={job} />
        <StatusBadge status={job.status} color={statusTone(job.status)} />
      </div>
      <div className="mt-4 grid gap-2 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> <DateDisplay date={job.scheduledStart} /> - {job.scheduledEnd ? new Date(job.scheduledEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "-"}</span>
        <span className="inline-flex items-center gap-1"><UserRound className="h-3.5 w-3.5" /> {job.assignedInstaller ? `${job.assignedInstaller.firstName} ${job.assignedInstaller.lastName}` : job.installationTeamName ?? "No installer"}</span>
        <span className="inline-flex items-center gap-1"><PackageCheck className="h-3.5 w-3.5" /> {material.label}</span>
      </div>
      <div className="mt-4 flex gap-2">
        <button className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={onDetails}>Details</button>
        <button className="rounded-md bg-slate-950 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800" onClick={onSchedule}>Move</button>
      </div>
    </article>
  );
}

function JobSummary({ job }: { job: Job }) {
  return (
    <div>
      <p className="font-mono text-sm font-semibold text-slate-950">{job.jobNumber}</p>
      <p className="mt-1 text-sm text-slate-600">{job.customer?.displayName ?? "Customer"} · {job.site?.label ?? "Site"}</p>
      <p className="mt-1 text-xs text-slate-500">{[job.site?.addressLine1, job.site?.city, job.site?.postcode].filter(Boolean).join(", ") || "No address"} · <Money amount={Number(job.totalValue)} currency={job.currency} /></p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1 text-sm">
      <span className="font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{value}</dd>
    </div>
  );
}

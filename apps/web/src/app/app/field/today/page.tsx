import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarDays, Camera, CheckCircle2, Clock, History, Map, PackageCheck, UserCircle, Wrench } from "lucide-react";
import { getSession } from "@/lib/api";
import { getJobPermissions, getJobs, getSchedule, type Job } from "@/lib/jobs";
import { DateDisplay, StatusBadge } from "@/components/shared";

function dayBounds(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
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

function statusColor(status: string) {
  if (status === "COMPLETED") return "green" as const;
  if (status === "SCHEDULED" || status === "IN_PROGRESS") return "blue" as const;
  if (status === "CANCELLED") return "red" as const;
  return "slate" as const;
}

export default async function FieldTodayPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const perms = getJobPermissions(session);
  if (!perms.canRead) redirect("/app/dashboard");

  const today = new Date();
  const { start, end } = dayBounds(today);
  const [schedule, activeJobs] = await Promise.all([
    getSchedule({
      start: start.toISOString(),
      end: end.toISOString(),
      unscheduledLimit: 1,
      ...(session.activeBranchId ? { branchId: session.activeBranchId } : {}),
    }),
    getJobs({ pageSize: 30, sort: "scheduledStartAsc" }),
  ]);
  const assignedJobs = schedule.scheduledJobs.filter((job) => job.assignedInstallerId === session.user.id);
  const fallbackJobs = activeJobs.items
    .filter((job) => !["COMPLETED", "CANCELLED"].includes(job.status))
    .filter((job) => !job.assignedInstallerId || job.assignedInstallerId === session.user.id)
    .slice(0, 8);
  const visibleJobs = assignedJobs.length ? assignedJobs : schedule.scheduledJobs.length ? schedule.scheduledJobs : fallbackJobs;
  const nextJob = visibleJobs.find((job) => job.status !== "COMPLETED") ?? visibleJobs[0];
  const showingFallback = !assignedJobs.length && !schedule.scheduledJobs.length && fallbackJobs.length > 0;

  return (
    <div className="-mx-4 -my-5 min-h-screen bg-slate-100 pb-24 sm:-mx-6 lg:-mx-8 lg:-my-5">
      <section className="bg-black px-6 pb-6 pt-5 text-white">
        <div className="mx-auto max-w-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-label-caps uppercase text-slate-400">Installer App</p>
              <h1 className="mt-1 text-headline-lg text-white">{showingFallback ? "Upcoming Work" : "Today"}</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-white/10 px-3 py-2 text-sm font-bold text-emerald-300">Synced</span>
              <UserCircle className="h-10 w-10 text-white" />
            </div>
          </div>

          <div className="mt-7 rounded-3xl bg-gradient-to-br from-slate-800 to-slate-950 p-5">
            <p className="flex items-center gap-2 text-label-caps uppercase text-emerald-300"><span className="h-2 w-2 rounded-full bg-emerald-300" /> {showingFallback ? "Next visible job" : "Up next"}</p>
            {nextJob ? (
              <>
                <div className="mt-4 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-black tracking-tight">{nextJob.site?.label ?? nextJob.jobNumber}</h2>
                    <p className="mt-2 text-slate-400">{nextJob.customer?.displayName ?? "Customer"} · {nextJob.title ?? "Flooring installation"}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-4xl font-black text-emerald-300">{nextJob.scheduledStart ? new Date(nextJob.scheduledStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--"}</p>
                    <p className="text-label-caps uppercase text-slate-400">Start</p>
                  </div>
                </div>
                <div className="mt-6 h-2 rounded-full bg-white/10">
                  <div className="h-2 w-2/3 rounded-full bg-emerald-300" />
                </div>
              </>
            ) : (
              <p className="mt-4 text-slate-300">No assigned jobs are scheduled for today. Upcoming active jobs from the main app will appear here after dispatch.</p>
            )}
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-md space-y-5 px-6 py-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-slate-950">{showingFallback ? "Upcoming Jobs" : "Today's Schedule"}</h2>
          <span className="rounded-full bg-slate-200 px-3 py-2 text-sm font-bold text-slate-700">{visibleJobs.length} jobs</span>
        </div>

        {showingFallback ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            No installer-specific jobs are scheduled today, so this view is showing active upcoming work from the ERP job list.
          </div>
        ) : null}

        {visibleJobs.map((job) => {
          const material = materialSignal(job);
          return (
            <article key={job.id} className={`rounded-3xl border bg-white p-5 shadow-stitch ${job.status === "COMPLETED" ? "border-slate-100 opacity-60" : "border-slate-200"}`}>
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-sm font-semibold text-slate-600">{job.jobNumber}</span>
                <StatusBadge status={job.status} color={statusColor(job.status)} />
              </div>
              <h3 className="mt-4 text-2xl font-black tracking-tight text-slate-950">{job.site?.label ?? job.title ?? "Job"}</h3>
              <p className="mt-3 text-slate-600">{[job.site?.addressLine1, job.site?.city, job.site?.postcode].filter(Boolean).join(", ") || "No site address"}</p>
              <div className="mt-4 grid gap-2 text-sm text-slate-600">
                <span className="inline-flex items-center gap-2"><Clock className="h-4 w-4" /><DateDisplay date={job.scheduledStart} /></span>
                <span className="inline-flex items-center gap-2"><PackageCheck className="h-4 w-4" />{material.label}</span>
              </div>
              {job.accessNotes ? <p className="mt-4 rounded-xl bg-slate-100 p-3 text-sm text-slate-700">{job.accessNotes}</p> : null}
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Link className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-slate-100 text-base font-bold text-slate-900" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([job.site?.addressLine1, job.site?.city, job.site?.postcode].filter(Boolean).join(", "))}`}>
                  <Map className="h-5 w-5" /> Navigate
                </Link>
                <Link className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-black text-base font-bold text-white" href={`/app/field/jobs/${job.id}`}>
                  <ArrowRight className="h-5 w-5" /> Resume Job
                </Link>
              </div>
            </article>
          );
        })}

        {!visibleJobs.length ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
            <p className="mt-3 font-bold text-slate-950">No field jobs today</p>
            <p className="mt-1 text-sm text-slate-500">Assigned jobs will appear here when scheduled.</p>
          </div>
        ) : null}
      </main>

      <Link className="fixed bottom-24 right-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-700 text-white shadow-stitch-overlay" href={nextJob ? `/app/field/jobs/${nextJob.id}` : "/app/schedule"}>
        <Camera className="h-7 w-7" />
        <span className="sr-only">Open job photos or schedule</span>
      </Link>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-6 py-3 backdrop-blur" aria-label="Field navigation">
        <div className="mx-auto grid max-w-md grid-cols-4 text-center text-xs font-bold text-slate-500">
          <Link className="flex flex-col items-center gap-1 text-emerald-700" href="/app/field/today"><CalendarDays className="h-6 w-6" />Today</Link>
          <Link className="flex flex-col items-center gap-1" href="/app/field/jobs"><Wrench className="h-6 w-6" />Jobs</Link>
          <Link className="flex flex-col items-center gap-1" href="/app/field/history"><History className="h-6 w-6" />History</Link>
          <Link className="flex flex-col items-center gap-1" href="/app/field/profile"><UserCircle className="h-6 w-6" />Profile</Link>
        </div>
      </nav>
    </div>
  );
}

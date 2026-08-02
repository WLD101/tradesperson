import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, History, Map, UserCircle, Wrench } from "lucide-react";
import { getSession } from "@/lib/api";
import { getJobPermissions, getJobs, type Job } from "@/lib/jobs";
import { DateDisplay, StatusBadge } from "@/components/shared";

function statusColor(status: string) {
  if (status === "COMPLETED") return "green" as const;
  if (status === "SCHEDULED" || status === "IN_PROGRESS") return "blue" as const;
  if (status === "CANCELLED") return "red" as const;
  return "slate" as const;
}

function address(job: Job) {
  return [job.site?.addressLine1, job.site?.city, job.site?.postcode].filter(Boolean).join(", ");
}

export default async function FieldJobsPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (!getJobPermissions(session).canRead) redirect("/app/dashboard");

  const jobs = await getJobs({ pageSize: 50, sort: "scheduledStartAsc" });
  const visibleJobs = jobs.items
    .filter((job) => job.status !== "COMPLETED" && job.status !== "CANCELLED")
    .filter((job) => !job.assignedInstallerId || job.assignedInstallerId === session.user.id)
    .slice(0, 20);

  return (
    <div className="-mx-4 -my-5 min-h-screen bg-slate-100 pb-24 sm:-mx-6 lg:-mx-8 lg:-my-5">
      <section className="bg-black px-6 pb-6 pt-5 text-white">
        <div className="mx-auto max-w-md">
          <p className="text-label-caps uppercase text-slate-400">Installer App</p>
          <h1 className="mt-1 text-headline-lg text-white">Upcoming Jobs</h1>
          <p className="mt-3 text-sm text-slate-300">Assigned and visible installation work from the existing job schedule.</p>
        </div>
      </section>

      <main className="mx-auto max-w-md space-y-4 px-6 py-6">
        {visibleJobs.map((job) => (
          <article key={job.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-stitch">
            <div className="flex items-start justify-between gap-3">
              <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-sm font-semibold text-slate-600">{job.jobNumber}</span>
              <StatusBadge status={job.status} color={statusColor(job.status)} />
            </div>
            <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-950">{job.site?.label ?? job.title ?? "Flooring job"}</h2>
            <p className="mt-2 text-sm text-slate-600">{job.customer?.displayName ?? "Customer not linked"}</p>
            <p className="mt-3 text-sm text-slate-500">{address(job) || "No site address"}</p>
            <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <CalendarDays className="h-4 w-4" />
              <DateDisplay date={job.scheduledStart} />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Link className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-100 text-sm font-bold text-slate-900" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address(job))}`}>
                <Map className="h-4 w-4" /> Navigate
              </Link>
              <Link className="inline-flex min-h-12 items-center justify-center rounded-xl bg-black text-sm font-bold text-white" href={`/app/field/jobs/${job.id}`}>
                Open job
              </Link>
            </div>
          </article>
        ))}

        {!visibleJobs.length ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="font-bold text-slate-950">No upcoming assigned jobs</p>
            <p className="mt-1 text-sm text-slate-500">Scheduled jobs will appear here after dispatch assigns them.</p>
          </div>
        ) : null}
      </main>

      <FieldNav active="jobs" />
    </div>
  );
}

function FieldNav({ active }: { active: "today" | "jobs" | "history" | "profile" }) {
  const itemClass = (key: typeof active) => `flex flex-col items-center gap-1 ${active === key ? "text-emerald-700" : ""}`;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-6 py-3 backdrop-blur" aria-label="Field navigation">
      <div className="mx-auto grid max-w-md grid-cols-4 text-center text-xs font-bold text-slate-500">
        <Link className={itemClass("today")} href="/app/field/today"><CalendarDays className="h-6 w-6" />Today</Link>
        <Link className={itemClass("jobs")} href="/app/field/jobs"><Wrench className="h-6 w-6" />Jobs</Link>
        <Link className={itemClass("history")} href="/app/field/history"><History className="h-6 w-6" />History</Link>
        <Link className={itemClass("profile")} href="/app/field/profile"><UserCircle className="h-6 w-6" />Profile</Link>
      </div>
    </nav>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, CheckCircle2, History, UserCircle, Wrench } from "lucide-react";
import { getSession } from "@/lib/api";
import { getJobPermissions, getJobs } from "@/lib/jobs";
import { DateDisplay, StatusBadge } from "@/components/shared";

export default async function FieldHistoryPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (!getJobPermissions(session).canRead) redirect("/app/dashboard");

  const jobs = await getJobs({ pageSize: 50, sort: "scheduledStartDesc" });
  const completedJobs = jobs.items
    .filter((job) => job.status === "COMPLETED")
    .filter((job) => !job.assignedInstallerId || job.assignedInstallerId === session.user.id)
    .slice(0, 20);

  return (
    <div className="-mx-4 -my-5 min-h-screen bg-slate-100 pb-24 sm:-mx-6 lg:-mx-8 lg:-my-5">
      <section className="bg-black px-6 pb-6 pt-5 text-white">
        <div className="mx-auto max-w-md">
          <p className="text-label-caps uppercase text-slate-400">Installer App</p>
          <h1 className="mt-1 text-headline-lg text-white">History</h1>
          <p className="mt-3 text-sm text-slate-300">Completed installations visible to this installer.</p>
        </div>
      </section>

      <main className="mx-auto max-w-md space-y-4 px-6 py-6">
        {completedJobs.map((job) => (
          <Link key={job.id} className="block rounded-3xl border border-slate-200 bg-white p-5 shadow-stitch" href={`/app/field/jobs/${job.id}`}>
            <div className="flex items-start justify-between gap-3">
              <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-sm font-semibold text-slate-600">{job.jobNumber}</span>
              <StatusBadge status="COMPLETED" color="green" />
            </div>
            <h2 className="mt-4 text-xl font-black text-slate-950">{job.site?.label ?? job.title ?? "Completed job"}</h2>
            <p className="mt-2 text-sm text-slate-600">{job.customer?.displayName ?? "Customer"}</p>
            <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-700"><CheckCircle2 className="h-4 w-4 text-emerald-600" /><DateDisplay date={job.completedAt ?? job.scheduledEnd} /></p>
          </Link>
        ))}

        {!completedJobs.length ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="font-bold text-slate-950">No completed jobs yet</p>
            <p className="mt-1 text-sm text-slate-500">Completed field work will appear here.</p>
          </div>
        ) : null}
      </main>

      <FieldNav active="history" />
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

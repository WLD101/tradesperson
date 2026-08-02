import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, CalendarDays, RefreshCw, UserRoundCheck } from "lucide-react";
import { apiFetch, getSession } from "@/lib/api";
import { getJobPermissions, getSchedule } from "@/lib/jobs";
import { Breadcrumbs, PageHeader, StatusBadge } from "@/components/shared";
import { ScheduleBoard } from "./schedule-board";

type TenantSummary = {
  branches: Array<{ id: string; name: string; branchCode: string }>;
};

function startOfWeek(date: Date) {
  const next = new Date(date);
  const day = next.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + offset);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dateLabel(start: Date, end: Date, view: string) {
  if (view === "day") {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(start);
  }
  return `${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(start)} - ${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(addDays(end, -1))}`;
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const perms = getJobPermissions(session);
  if (!perms.canRead) redirect("/app/dashboard");

  const params = await searchParams;
  const view = params.view === "day" ? "day" : "week";
  const anchor = typeof params.date === "string" ? new Date(`${params.date}T00:00:00`) : new Date();
  const start = view === "day" ? anchor : startOfWeek(anchor);
  const end = view === "day" ? addDays(start, 1) : addDays(start, 7);
  const branchId = typeof params.branchId === "string" ? params.branchId : undefined;
  const installerId = typeof params.installerId === "string" ? params.installerId : undefined;
  const status = typeof params.status === "string" ? params.status : undefined;
  const search = typeof params.search === "string" ? params.search : undefined;
  const tenant = await apiFetch<TenantSummary>("/api/v1/tenants/current");
  const schedule = await getSchedule({
    start: start.toISOString(),
    end: end.toISOString(),
    unscheduledLimit: 30,
    ...(branchId ? { branchId } : {}),
    ...(installerId ? { installerId } : {}),
    ...(status ? { status } : {}),
    ...(search ? { search } : {}),
  });
  const today = new Date();
  const previousDate = isoDate(addDays(start, view === "day" ? -1 : -7));
  const nextDate = isoDate(addDays(start, view === "day" ? 1 : 7));

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Schedule" }]} />
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-stitch">
        <PageHeader
          title="Enterprise Dispatch"
          description="Dispatch installation work, balance installer workload, and safely reschedule through the existing server-authoritative job rules."
          actions={
            <div className="flex flex-wrap gap-2">
              <Link className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" href={`/app/schedule?view=${view}&date=${isoDate(today)}`}>
                Today
              </Link>
              <Link className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" href={`/app/schedule?view=${view}&date=${previousDate}`}>
                Previous
              </Link>
              <Link className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" href={`/app/schedule?view=${view}&date=${nextDate}`}>
                Next
              </Link>
              <Link className="rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800" href={`/app/schedule?view=day&date=${isoDate(start)}`}>
                Day
              </Link>
              <Link className="rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800" href={`/app/schedule?view=week&date=${isoDate(start)}`}>
                Week
              </Link>
            </div>
          }
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-stitch">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <CalendarDays className="h-4 w-4" />
              <span>{view === "day" ? "Day view" : "Week view"}</span>
            </div>
            <h2 className="mt-1 text-headline-md text-slate-950">{dateLabel(start, end, view)}</h2>
          </div>
          <form className="grid gap-3 md:grid-cols-5" method="get">
            <input name="view" type="hidden" value={view} />
            <input name="date" type="hidden" value={isoDate(start)} />
            <select aria-label="Branch filter" className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500" name="branchId" defaultValue={branchId ?? ""}>
              <option value="">All authorised branches</option>
              {tenant.branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
            <select aria-label="Installer filter" className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500" name="installerId" defaultValue={installerId ?? ""}>
              <option value="">All installers</option>
              {schedule.installers.map((installer) => (
                <option key={installer.id} value={installer.id}>{installer.name || installer.email}</option>
              ))}
            </select>
            <select aria-label="Job status filter" className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500" name="status" defaultValue={status ?? ""}>
              <option value="">All active statuses</option>
              {["DRAFT", "SCHEDULED", "IN_PROGRESS", "COMPLETED"].map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <input aria-label="Search schedule" className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500" name="search" defaultValue={search ?? ""} placeholder="Search job, customer, site" />
            <button className="inline-flex items-center justify-center rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800" type="submit">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </button>
          </form>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Metric label="Scheduled today" value={schedule.scheduledJobs.filter((job) => job.scheduledStart?.slice(0, 10) === isoDate(today)).length} icon={CalendarDays} />
        <Metric label="Scheduled in view" value={schedule.scheduledJobs.length} icon={CalendarDays} />
        <Metric label="Unscheduled" value={schedule.unscheduledJobs.length} tone={schedule.unscheduledJobs.length ? "amber" : "green"} icon={AlertTriangle} />
        <Metric label="Active installers" value={schedule.installers.length} icon={UserRoundCheck} />
        <Metric label="Awaiting completion" value={schedule.scheduledJobs.filter((job) => job.status !== "COMPLETED").length} icon={RefreshCw} />
        <Metric label="Overdue scheduled" value={schedule.scheduledJobs.filter((job) => job.scheduledEnd && new Date(job.scheduledEnd).getTime() < Date.now() && job.status !== "COMPLETED").length} tone="red" icon={AlertTriangle} />
      </div>

      <ScheduleBoard
        canWrite={perms.canWrite}
        initialDate={isoDate(start)}
        installers={schedule.installers}
        scheduledJobs={schedule.scheduledJobs}
        unscheduledJobs={schedule.unscheduledJobs}
        view={view}
      />
    </div>
  );
}

function Metric({
  label,
  value,
  tone = "slate",
  icon: Icon,
}: {
  label: string;
  value: number;
  tone?: "slate" | "green" | "amber" | "red";
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-stitch">
      <div className="flex items-center justify-between gap-3">
        <p className="text-label-caps uppercase text-slate-500">{label}</p>
        <Icon className="h-4 w-4 text-slate-400" />
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="font-mono text-3xl font-semibold text-slate-950">{value}</p>
        <StatusBadge status={tone === "red" ? "Risk" : tone === "amber" ? "Action" : "OK"} color={tone} />
      </div>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { Breadcrumbs, DataTable, DateDisplay, EmptyState, FilterBar, Money, PageHeader, StatusBadge } from "@/components/shared";
import { getSession } from "@/lib/api";
import { getJobPermissions, getJobs } from "@/lib/jobs";

function statusColor(status: string) {
  if (status === "SCHEDULED") return "blue" as const;
  if (["IN_PROGRESS", "COMPLETED"].includes(status)) return "green" as const;
  if (status === "CANCELLED") return "red" as const;
  return "slate" as const;
}

export default async function JobsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const perms = getJobPermissions(session);
  if (!perms.canRead) redirect("/app/dashboard");
  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search : undefined;
  const status = typeof params.status === "string" ? params.status : undefined;
  const response = await getJobs({ page: 1, pageSize: 20, search, status });

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Jobs" }]} />
      <PageHeader title="Jobs" description="Converted customer jobs with deposit and schedule context." />
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <FilterBar>
          <form className="flex w-full flex-col gap-3 sm:flex-row" method="get">
            <input className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm sm:w-64" name="search" defaultValue={search ?? ""} placeholder="Search job or customer" />
            <select className="rounded-md border border-slate-300 px-3 py-1.5 text-sm" name="status" defaultValue={status ?? ""}>
              <option value="">All statuses</option>
              {["DRAFT", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <button className="rounded-md bg-slate-100 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200" type="submit">Apply</button>
          </form>
        </FilterBar>
        {response.items.length ? (
          <DataTable headers={["Number", "Customer", "Site", "Quote", "Deposit", "Total", "Schedule", "Status", ""]}>
            {response.items.map((job) => (
              <tr key={job.id} className="group hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900"><Link href={`/app/jobs/${job.id}`}>{job.jobNumber}</Link></td>
                <td className="px-4 py-3">{job.customer?.displayName ?? "-"}</td>
                <td className="px-4 py-3">{job.site?.label ?? "-"}</td>
                <td className="px-4 py-3">{job.quote?.quoteNumber ?? "-"}</td>
                <td className="px-4 py-3"><Money amount={Number(job.depositPaid)} currency={job.currency} /> / <Money amount={Number(job.depositRequired)} currency={job.currency} /></td>
                <td className="px-4 py-3"><Money amount={Number(job.totalValue)} currency={job.currency} /></td>
                <td className="px-4 py-3"><DateDisplay date={job.scheduledStart} /></td>
                <td className="px-4 py-3"><StatusBadge status={job.status} color={statusColor(job.status)} /></td>
                <td className="px-4 py-3 text-right opacity-0 group-hover:opacity-100"><Link className="text-sm font-medium text-blue-600" href={`/app/jobs/${job.id}`}>View</Link></td>
              </tr>
            ))}
          </DataTable>
        ) : <EmptyState title="No jobs found" description="Convert an approved quote to create a job." />}
      </div>
    </div>
  );
}

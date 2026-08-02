import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Camera, CheckCircle2, ClipboardList, Map, PackageCheck, UserRound, Wrench } from "lucide-react";
import { getSession } from "@/lib/api";
import { getJob, getJobPermissions } from "@/lib/jobs";
import { DateDisplay, StatusBadge } from "@/components/shared";

function materialSignal(job: Awaited<ReturnType<typeof getJob>>) {
  const requirements = job.materialRequirements ?? [];
  if (!requirements.length) return { label: "No material lines", tone: "slate" as const };
  const issued = requirements.filter((line) => Number(line.issuedQuantity) >= Number(line.requiredQuantity)).length;
  const allocated = requirements.filter((line) => Number(line.allocatedQuantity) >= Number(line.requiredQuantity)).length;
  if (issued === requirements.length) return { label: "Materials issued", tone: "green" as const };
  if (allocated === requirements.length) return { label: "Stock reserved", tone: "blue" as const };
  return { label: "Materials pending", tone: "amber" as const };
}

export default async function FieldJobPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const perms = getJobPermissions(session);
  if (!perms.canRead) redirect("/app/dashboard");
  const { id } = await params;

  let job: Awaited<ReturnType<typeof getJob>>;
  try {
    job = await getJob(id);
  } catch {
    notFound();
  }

  const material = materialSignal(job);
  const address = [job.site?.addressLine1, job.site?.city, job.site?.postcode].filter(Boolean).join(", ");

  return (
    <div className="-mx-4 -my-5 min-h-screen bg-slate-100 pb-24 sm:-mx-6 lg:-mx-8 lg:-my-5">
      <section className="bg-black px-6 pb-6 pt-5 text-white">
        <div className="mx-auto max-w-md">
          <Link className="inline-flex items-center gap-2 text-sm font-bold text-slate-300" href="/app/field/today"><ArrowLeft className="h-4 w-4" /> Today</Link>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-white/10 px-2 py-1 font-mono text-sm font-semibold">{job.jobNumber}</span>
            <StatusBadge status={job.status} color={job.status === "COMPLETED" ? "green" : "blue"} />
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight">{job.site?.label ?? job.title ?? "Field job"}</h1>
          <p className="mt-2 text-slate-400">{job.customer?.displayName ?? "Customer"} · {job.title ?? "Flooring installation"}</p>
        </div>
      </section>

      <main className="mx-auto max-w-md space-y-5 px-6 py-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-stitch">
          <h2 className="text-xl font-black text-slate-950">Site & Contact</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <p className="flex gap-2"><UserRound className="h-5 w-5 text-slate-400" /> {job.customer?.displayName ?? "Customer"}</p>
            <p className="flex gap-2"><Map className="h-5 w-5 text-slate-400" /> {address || "No address captured"}</p>
            <p className="flex gap-2"><Wrench className="h-5 w-5 text-slate-400" /> {job.assignedInstaller ? `${job.assignedInstaller.firstName} ${job.assignedInstaller.lastName}` : job.installationTeamName ?? "No installer assigned"}</p>
          </div>
          {job.accessNotes ? <p className="mt-4 rounded-xl bg-slate-100 p-3 text-sm text-slate-700">{job.accessNotes}</p> : null}
          <Link className="mt-5 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 text-base font-bold text-white" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}>
            <Map className="h-5 w-5" /> Navigate
          </Link>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-stitch">
          <h2 className="text-xl font-black text-slate-950">Schedule</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Info label="Start" value={<DateDisplay date={job.scheduledStart} />} />
            <Info label="End" value={<DateDisplay date={job.scheduledEnd} />} />
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-stitch">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black text-slate-950">Materials</h2>
            <StatusBadge status={material.label} color={material.tone} />
          </div>
          <div className="mt-4 space-y-3">
            {(job.materialRequirements ?? []).map((line) => (
              <div key={line.id} className="rounded-xl bg-slate-50 p-3">
                <p className="font-bold text-slate-950">{line.description}</p>
                <p className="mt-1 text-sm text-slate-500">{line.issuedQuantity}/{line.requiredQuantity} {line.unit} issued · {line.status}</p>
              </div>
            ))}
            {!(job.materialRequirements ?? []).length ? <p className="text-sm text-slate-500">No material requirements.</p> : null}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-stitch">
          <h2 className="text-xl font-black text-slate-950">Checklist & Completion</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <p className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-600" /> Review site access and scope.</p>
            <p className="flex items-center gap-2"><PackageCheck className="h-5 w-5 text-emerald-600" /> Confirm materials using existing job workflow.</p>
            <p className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-emerald-600" /> Complete job from the authorised job workspace.</p>
          </div>
          <Link className="mt-5 inline-flex min-h-14 w-full items-center justify-center rounded-xl bg-black text-base font-bold text-white" href={`/app/jobs/${job.id}`}>
            Open full job workflow
          </Link>
        </section>
      </main>

      <div className="fixed bottom-24 right-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-700 text-white shadow-stitch-overlay">
        <Camera className="h-7 w-7" />
        <span className="sr-only">Photo upload requires existing attachment workflow</span>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-label-caps uppercase text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-950">{value}</p>
    </div>
  );
}

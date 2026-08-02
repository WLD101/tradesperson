import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, History, ShieldCheck, UserCircle, Wrench } from "lucide-react";
import { getSession } from "@/lib/api";
import { getJobPermissions } from "@/lib/jobs";
import { StatusBadge } from "@/components/shared";

export default async function FieldProfilePage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (!getJobPermissions(session).canRead) redirect("/app/dashboard");

  const activeMembership = session.memberships.find((membership) => membership.tenantId === session.activeTenantId);

  return (
    <div className="-mx-4 -my-5 min-h-screen bg-slate-100 pb-24 sm:-mx-6 lg:-mx-8 lg:-my-5">
      <section className="bg-black px-6 pb-6 pt-5 text-white">
        <div className="mx-auto max-w-md">
          <p className="text-label-caps uppercase text-slate-400">Installer App</p>
          <h1 className="mt-1 text-headline-lg text-white">Profile</h1>
          <p className="mt-3 text-sm text-slate-300">Current signed-in installer context and mobile readiness.</p>
        </div>
      </section>

      <main className="mx-auto max-w-md space-y-4 px-6 py-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-stitch">
          <UserCircle className="mx-auto h-16 w-16 text-slate-950" />
          <h2 className="mt-4 text-2xl font-black text-slate-950">{session.user.firstName} {session.user.lastName}</h2>
          <p className="mt-1 text-sm text-slate-500">{session.user.email}</p>
          <div className="mt-4 flex justify-center">
            <StatusBadge status={activeMembership?.status ?? "UNKNOWN"} color={activeMembership?.status === "ACTIVE" ? "green" : "amber"} />
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-stitch">
          <h3 className="flex items-center gap-2 text-lg font-black text-slate-950"><ShieldCheck className="h-5 w-5 text-emerald-600" /> Mobile capabilities</h3>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <p className="rounded-2xl bg-emerald-50 p-3 text-emerald-900">Live: today jobs, upcoming jobs, job detail, materials, notes, site address, and completion context.</p>
            <p className="rounded-2xl bg-amber-50 p-3 text-amber-900">Needs backend/UI support: native photo capture flow, customer signature capture, and offline sync.</p>
            <p className="rounded-2xl bg-slate-50 p-3 text-slate-700">Navigation opens Google Maps with the job site address; no GPS route optimisation is stored in ERP.</p>
          </div>
        </section>
      </main>

      <FieldNav active="profile" />
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

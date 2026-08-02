import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleDashed } from "lucide-react";
import { Card } from "@tradesperson/ui";
import { apiFetch } from "@/lib/api";
import { Breadcrumbs, StatusBadge } from "@/components/shared";

type TenantProfile = {
  name: string;
  legalName?: string | null;
  tradingName?: string | null;
  businessEmail?: string | null;
  businessPhone?: string | null;
  branches: Array<{ id: string; name: string }>;
};

type PaginatedCount = { total?: number; items?: unknown[] };

type Step = {
  title: string;
  description: string;
  href: string;
  optional?: boolean;
  done: boolean;
  live: boolean;
  note: string;
};

function count(result: PaginatedCount | unknown[] | null) {
  if (Array.isArray(result)) return result.length;
  return result?.total ?? result?.items?.length ?? 0;
}

async function optionalFetch<T>(path: string, fallback: T): Promise<T> {
  try {
    return await apiFetch<T>(path);
  } catch {
    return fallback;
  }
}

export default async function OnboardingPage() {
  const [tenant, products, suppliers, jobs] = await Promise.all([
    apiFetch<TenantProfile>("/api/v1/tenants/current"),
    optionalFetch<PaginatedCount>("/api/v1/catalogue/products?page=1&pageSize=1", { total: 0, items: [] }),
    optionalFetch<PaginatedCount>("/api/v1/suppliers?page=1&pageSize=1", { total: 0, items: [] }),
    optionalFetch<PaginatedCount>("/api/v1/jobs?page=1&pageSize=1", { total: 0, items: [] }),
  ]);

  const steps: Step[] = [
    {
      title: "Company",
      description: "Confirm legal/trading details and customer-facing contact channels.",
      href: "/app/settings/business",
      done: Boolean(tenant.legalName || tenant.tradingName) && Boolean(tenant.businessEmail),
      live: true,
      note: "Uses tenant profile API.",
    },
    {
      title: "Branch",
      description: "Create the first operational branch and default workspace.",
      href: "/app/settings/branches",
      done: tenant.branches.length > 0,
      live: true,
      note: "Branch isolation is enforced by existing APIs.",
    },
    {
      title: "Users",
      description: "Invite estimators, office staff, warehouse users, and installers.",
      href: "/app/settings/users",
      done: true,
      live: true,
      note: "Membership and invitations are available.",
    },
    {
      title: "Tax and numbering",
      description: "Review VAT, quote, estimate, job, invoice, and PO number prefixes.",
      href: "/app/settings",
      done: true,
      live: false,
      note: "Prefixes are seeded; editable finance defaults need backend UI support.",
    },
    {
      title: "Products",
      description: "Add flooring products, variants, units, accessories, thresholds, and underlay.",
      href: "/app/catalogue/products",
      done: count(products) > 0,
      live: true,
      note: "Catalogue CRUD exists.",
    },
    {
      title: "Suppliers",
      description: "Add suppliers, contacts, supplier products, and price imports.",
      href: "/app/suppliers",
      done: count(suppliers) > 0,
      live: true,
      note: "Supplier and supplier pricing workflows exist.",
    },
    {
      title: "Installers",
      description: "Use team users as installers for scheduled jobs.",
      href: "/app/schedule",
      done: count(jobs) > 0,
      live: true,
      note: "Installer assignment and double-booking prevention are active.",
    },
    {
      title: "Business defaults",
      description: "Waste %, room templates, labour rates, working hours, holidays, and document branding.",
      href: "/app/settings",
      optional: true,
      done: false,
      live: false,
      note: "Present as launch gap until editable backend defaults exist.",
    },
  ];

  const completed = steps.filter((step) => step.done).length;
  const completion = Math.round((completed / steps.length) * 100);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Dashboard", href: "/app/dashboard" }, { label: "Onboarding" }]} />

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-stitch lg:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-label-caps text-emerald-700">First-run workspace</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">Flooring company onboarding</h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
              A practical launch checklist for {tenant.name}. Optional steps can be skipped for a demo, but should be
              closed before charging a real flooring contractor.
            </p>
          </div>
          <div className="min-w-[14rem] rounded-2xl bg-slate-950 p-5 text-white">
            <p className="text-sm text-slate-300">Setup progress</p>
            <p className="mt-2 text-4xl font-black">{completion}%</p>
            <div className="mt-4 h-2 rounded-full bg-white/10">
              <div className="h-2 rounded-full bg-emerald-300" style={{ width: `${completion}%` }} />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {steps.map((step, index) => (
          <Card key={step.title} className="border-slate-200 bg-white shadow-stitch">
            <div className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-950">
                {step.done ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <CircleDashed className="h-5 w-5 text-amber-600" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-mono text-xs text-slate-400">Step {index + 1}</p>
                  <StatusBadge status={step.done ? "Complete" : step.optional ? "Optional" : "Needs attention"} color={step.done ? "green" : "amber"} />
                  {!step.live ? <StatusBadge status="Config gap" color="slate" /> : null}
                </div>
                <h2 className="mt-2 text-xl font-black text-slate-950">{step.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
                <p className="mt-3 text-xs font-semibold text-slate-500">{step.note}</p>
                <Link className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-emerald-700 hover:text-emerald-900" href={step.href}>
                  Continue <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

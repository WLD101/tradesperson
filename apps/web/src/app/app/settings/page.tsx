import Link from "next/link";
import { AlertTriangle, CheckCircle2, ExternalLink, LockKeyhole, Settings2 } from "lucide-react";
import { Card } from "@tradesperson/ui";
import { apiFetch, getSession } from "@/lib/api";
import { Breadcrumbs, StatusBadge } from "@/components/shared";

type TenantProfile = {
  name: string;
  legalName?: string | null;
  tradingName?: string | null;
  businessEmail?: string | null;
  businessPhone?: string | null;
  website?: string | null;
  city?: string | null;
  postcode?: string | null;
  timeZone?: string | null;
  branches: Array<{ id: string; name: string }>;
  settings?: {
    quoteNumberPrefix?: string | null;
    invoiceNumberPrefix?: string | null;
    jobNumberPrefix?: string | null;
  } | null;
};

type AdminTile = {
  title: string;
  description: string;
  href?: string;
  status: "Live" | "Partial" | "Config gap";
  note: string;
};

const adminTiles: AdminTile[] = [
  {
    title: "Company profile",
    description: "Legal name, trading name, contact details, city, postcode, website, and time zone.",
    href: "/app/settings/business",
    status: "Live",
    note: "Backed by tenant settings API.",
  },
  {
    title: "Branches",
    description: "Operational branches and default workspace locations.",
    href: "/app/settings/branches",
    status: "Live",
    note: "Branch creation and branch-scoped access are backend enforced.",
  },
  {
    title: "Users and invitations",
    description: "Invite staff and review active tenant memberships.",
    href: "/app/settings/users",
    status: "Live",
    note: "Invitation flow uses existing tenant invitation APIs.",
  },
  {
    title: "Roles and permissions",
    description: "Review RBAC roles and permission coverage.",
    href: "/app/settings/roles",
    status: "Live",
    note: "Read-only in UI; role assignment remains API-backed elsewhere.",
  },
  {
    title: "Subscription",
    description: "Current plan and SaaS subscription state.",
    href: "/app/settings/subscription",
    status: "Partial",
    note: "Stripe integration exists; production checkout requires credentials.",
  },
  {
    title: "Document branding",
    description: "Logo, brand colours, document footers, payment instructions, and certificate wording.",
    href: "/app/documents",
    status: "Config gap",
    note: "PDF routes exist for invoices and PO print; full branding API is not present.",
  },
  {
    title: "Flooring defaults",
    description: "Waste defaults, room defaults, stair rules, labour defaults, and measurement preferences.",
    href: "/app/onboarding",
    status: "Config gap",
    note: "Current calculations are server-authoritative; editable defaults need backend support.",
  },
  {
    title: "Integrations",
    description: "Stripe, SMTP, SMS, cloud storage, calendar, accounting, and maps readiness.",
    status: "Partial",
    note: "Storage, Stripe, email, and SMS abstractions exist; credentials/config UI remains a launch gap.",
  },
  {
    title: "Audit and backup",
    description: "Audit logs, operational traceability, backup posture, and recovery notes.",
    status: "Partial",
    note: "Audit logging exists; backup/restore proof should be documented before first customer.",
  },
];

function statusColor(status: AdminTile["status"]) {
  if (status === "Live") return "green";
  if (status === "Partial") return "amber";
  return "slate";
}

export default async function SettingsCentrePage() {
  const [session, tenant] = await Promise.all([
    getSession(),
    apiFetch<TenantProfile>("/api/v1/tenants/current"),
  ]);

  const completionChecks = [
    Boolean(tenant.legalName || tenant.tradingName),
    Boolean(tenant.businessEmail),
    Boolean(tenant.businessPhone),
    tenant.branches.length > 0,
    Boolean(tenant.settings?.quoteNumberPrefix),
    Boolean(tenant.settings?.invoiceNumberPrefix),
    Boolean(tenant.settings?.jobNumberPrefix),
  ];
  const completed = completionChecks.filter(Boolean).length;
  const completion = Math.round((completed / completionChecks.length) * 100);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Dashboard", href: "/app/dashboard" }, { label: "Admin Centre" }]} />

      <section className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-stitch-overlay">
        <div className="grid gap-8 p-6 lg:grid-cols-[1.35fr_0.65fr] lg:p-8">
          <div>
            <p className="text-label-caps text-emerald-300">Commercial readiness</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">Administration Centre</h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300">
              Configure the operating backbone for {tenant.name}. Live settings link to existing APIs; unsupported
              production controls are labelled as launch gaps instead of fake forms.
            </p>
          </div>
          <Card className="border-white/10 bg-white/10 text-white">
            <div className="flex items-center justify-between">
              <Settings2 className="h-8 w-8 text-emerald-300" />
              <StatusBadge status={`${completion}% configured`} color={completion > 75 ? "green" : "amber"} />
            </div>
            <p className="mt-5 text-sm text-slate-300">Active user</p>
            <p className="text-lg font-black">{session?.user.firstName} {session?.user.lastName}</p>
            <p className="mt-3 text-sm text-slate-300">Branches visible</p>
            <p className="text-lg font-black">{tenant.branches.length}</p>
          </Card>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {adminTiles.map((tile) => (
          <Card key={tile.title} className="flex h-full flex-col border-slate-200 bg-white shadow-stitch">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-950">{tile.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{tile.description}</p>
              </div>
              <StatusBadge status={tile.status} color={statusColor(tile.status)} />
            </div>
            <p className="mt-4 flex gap-2 rounded-2xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
              {tile.status === "Live" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : tile.status === "Partial" ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /> : <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />}
              <span>{tile.note}</span>
            </p>
            {tile.href ? (
              <Link className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-bold text-emerald-700 hover:text-emerald-900" href={tile.href}>
                Open workspace <ExternalLink className="h-4 w-4" />
              </Link>
            ) : (
              <p className="mt-auto pt-5 text-sm font-semibold text-slate-400">Configuration UI pending backend support</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

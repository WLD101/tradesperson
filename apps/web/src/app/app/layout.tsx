import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@tradesperson/ui";
import { apiFetch, getSession } from "@/lib/api";

const nav = [
  { href: "/app/dashboard", label: "Dashboard" },
  { href: "/app/crm/leads", label: "Leads" },
  { href: "/app/crm/customers", label: "Customers" },
  { href: "/app/crm/sites", label: "Sites" },
  { href: "/app/crm/surveys", label: "Surveys" },
  { href: "/app/settings/business", label: "Business" },
  { href: "/app/settings/branches", label: "Branches" },
  { href: "/app/settings/users", label: "Users" },
  { href: "/app/settings/roles", label: "Roles & Permissions" },
  { href: "/app/settings/subscription", label: "Subscription" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.activeTenantId) {
    redirect("/select-tenant");
  }

  const tenant = await apiFetch<{
    name: string;
    branches: Array<{ id: string; name: string }>;
  }>("/api/v1/tenants/current");
  return (
    <div className="min-h-screen bg-transparent">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-4">
          <Card className="bg-slate-950 text-white">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-300">
              Tenant
            </p>
            <h1 className="mt-2 text-xl font-semibold">{tenant.name}</h1>
            <p className="mt-1 text-sm text-slate-300">
              {session.user.firstName} {session.user.lastName}
            </p>
          </Card>
          <nav className="space-y-2">
            {nav.map((item) => (
              <Link
                key={item.href}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-white/70"
                href={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Card>
            <p className="text-sm font-medium text-slate-900">Global search</p>
            <p className="mt-1 text-sm text-slate-500">
              Unavailable in Phase 1 foundation.
            </p>
          </Card>
        </aside>
        <section className="space-y-4">
          <Card className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Active branch</p>
              <p className="font-medium text-slate-900">
                {tenant.branches.find(
                  (branch) => branch.id === session.activeBranchId,
                )?.name ?? "No branch selected"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">Notifications</p>
              <p className="text-sm text-slate-400">Disabled in Phase 1</p>
            </div>
          </Card>
          {children}
        </section>
      </div>
    </div>
  );
}

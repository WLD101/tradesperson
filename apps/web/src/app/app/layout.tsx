import { Bell, UserCircle } from "lucide-react";
import { redirect } from "next/navigation";
import { apiFetch, getSession } from "@/lib/api";
import { getEstimatePermissions } from "@/lib/estimates";
import { getJobPermissions } from "@/lib/jobs";
import { getProcurementPermissions } from "@/lib/procurement";
import { getQuotePermissions } from "@/lib/quotes";
import { AppShellNav, BrandLockup, type ShellNavGroup } from "./app-shell-nav";
import { GlobalCommandPalette } from "./global-command-palette";

function navItem(item: ShellNavGroup["items"][number]) {
  return item;
}

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

  const activeBranch = tenant.branches.find((branch) => branch.id === session.activeBranchId);
  const procurementPerms = getProcurementPermissions(session);
  const estimatePerms = getEstimatePermissions(session);
  const quotePerms = getQuotePermissions(session);
  const jobPerms = getJobPermissions(session);

  const navGroups: ShellNavGroup[] = [
    {
      title: "Operations",
      items: [
        navItem({ href: "/app/dashboard", label: "Dashboard", icon: "dashboard" }),
        ...(jobPerms.canRead ? [navItem({ href: "/app/schedule", label: "Scheduler", icon: "scheduler" })] : []),
        ...(jobPerms.canRead ? [navItem({ href: "/app/field/today", label: "Field App", icon: "jobs" })] : []),
      ],
    },
    {
      title: "CRM",
      items: [
        navItem({ href: "/app/crm/leads", label: "Leads", icon: "crm" }),
        navItem({ href: "/app/crm/customers", label: "Customers", icon: "business" }),
        navItem({ href: "/app/crm/sites", label: "Sites", icon: "business" }),
        navItem({ href: "/app/crm/surveys", label: "Surveys", icon: "reports" }),
      ],
    },
    {
      title: "Sales",
      items: [
        ...(estimatePerms.canRead ? [navItem({ href: "/app/estimates", label: "Estimates", icon: "estimates" })] : []),
        ...(quotePerms.canRead ? [navItem({ href: "/app/quotes", label: "Quotes", icon: "quotes" })] : []),
        ...(jobPerms.canRead ? [navItem({ href: "/app/jobs", label: "Jobs", icon: "jobs" })] : []),
        ...(jobPerms.canRead ? [navItem({ href: "/app/finance", label: "Finance", icon: "finance" })] : []),
      ],
    },
    {
      title: "Supply",
      items: [
        navItem({ href: "/app/catalogue", label: "Catalogue", icon: "catalogue" }),
        navItem({ href: "/app/suppliers", label: "Suppliers", icon: "procurement" }),
        navItem({ href: "/app/inventory", label: "Inventory", icon: "inventory" }),
        navItem({ href: "/app/imports", label: "Imports", icon: "imports" }),
        ...(procurementPerms.canViewRequisition || procurementPerms.canViewPo
          ? [navItem({ href: "/app/procurement", label: "Procurement", icon: "inventory" })]
          : []),
        ...(procurementPerms.canViewPo
          ? [navItem({ href: "/app/procurement/purchase-orders", label: "Purchase Orders", icon: "procurement" })]
          : []),
      ],
    },
    {
      title: "Administration",
      items: [
        navItem({ href: "/app/settings", label: "Admin Centre", icon: "settings" }),
        navItem({ href: "/app/onboarding", label: "Onboarding", icon: "onboarding" }),
        navItem({ href: "/app/documents", label: "Documents", icon: "reports" }),
        navItem({ href: "/app/settings/business", label: "Business", icon: "settings" }),
        navItem({ href: "/app/settings/branches", label: "Branches", icon: "settings" }),
        navItem({ href: "/app/settings/users", label: "Users", icon: "settings" }),
        navItem({ href: "/app/settings/roles", label: "Roles & Permissions", icon: "settings" }),
      ],
    },
  ].filter((group) => group.items.length > 0);

  return (
    <div className="min-h-screen bg-stitch-background text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-sidebar-width border-r border-white/10 bg-stitch-nav lg:block">
        <div className="flex h-16 items-center border-b border-white/10 px-5">
          <BrandLockup />
        </div>
        <AppShellNav groups={navGroups} />
      </aside>

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur-xl lg:fixed lg:left-sidebar-width lg:right-0">
        <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
          <AppShellNav groups={navGroups} showDesktop={false} />
          <div className="lg:hidden">
            <BrandLockup compact />
          </div>

          <div className="hidden min-w-0 flex-1 items-center gap-3 md:flex">
            <GlobalCommandPalette />
            <div className="hidden items-center gap-2 text-sm text-slate-600 xl:flex">
              <span className="text-slate-400">/</span>
              <span className="font-medium text-slate-900">Workspace</span>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <div className="hidden rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-slate-600 shadow-sm md:block">
              {tenant.name}
            </div>
            <div className="hidden rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200 sm:block">
              {activeBranch?.name ?? "No branch"}
            </div>
            <button
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm"
              type="button"
              disabled
              title="Notifications are not wired to a notification centre yet."
            >
              <span className="sr-only">Notifications unavailable</span>
              <Bell className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-600" aria-hidden="true" />
            </button>
            <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
              <div className="hidden text-right leading-tight md:block">
                <p className="text-sm font-bold text-slate-950">{session.user.firstName} {session.user.lastName}</p>
                <p className="text-xs text-slate-500">ERP user</p>
              </div>
              <UserCircle className="h-9 w-9 text-slate-950" aria-hidden="true" />
            </div>
          </div>
        </div>
      </header>

      <main className="min-h-screen min-w-0 overflow-x-hidden bg-stitch-background pt-4 lg:pl-sidebar-width lg:pt-16">
        <div className="mx-auto w-full max-w-content-max min-w-0 px-4 py-5 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}

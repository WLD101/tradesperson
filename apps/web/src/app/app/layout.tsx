import Link from "next/link";
import { redirect } from "next/navigation";
import { apiFetch, getSession } from "@/lib/api";
import { getEstimatePermissions } from "@/lib/estimates";
import { getProcurementPermissions } from "@/lib/procurement";
import { getQuotePermissions } from "@/lib/quotes";

// Reusable components
function NavGroup({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="pt-4 pb-1">
      <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
        {title}
      </p>
      <div className="space-y-1">
        {children}
      </div>
    </div>
  );
}

function NavItem({ href, label }: { href: string, label: string }) {
  return (
    <Link
      href={href}
      className="block rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
    >
      {label}
    </Link>
  );
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

  const procurementPerms = getProcurementPermissions(session);
  const estimatePerms = getEstimatePermissions(session);
  const quotePerms = getQuotePermissions(session);

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Top Bar */}
      <header className="bg-slate-950 text-white border-b border-slate-800 sticky top-0 z-40 shadow-sm">
        <div className="flex h-14 items-center px-4 justify-between">
          <div className="flex items-center gap-4">
            <div className="font-bold text-lg tracking-tight">Tradesperson<span className="text-blue-400">.net</span></div>
            <div className="hidden md:flex ml-4 items-center">
              <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full uppercase tracking-widest">{tenant.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 hidden md:inline">Branch:</span>
              <span className="font-medium text-white bg-slate-800 px-2 py-1 rounded-md text-xs">
                {tenant.branches.find(b => b.id === session.activeBranchId)?.name ?? "None"}
              </span>
            </div>
            <div className="h-4 w-px bg-slate-700 hidden md:block"></div>
            <div className="font-medium text-white hidden md:block">
              {session.user.firstName} {session.user.lastName}
            </div>
          </div>
        </div>
      </header>
      
      <div className="flex min-h-[calc(100vh-3.5rem)]">
        {/* Sidebar */}
        <aside className="w-[240px] shrink-0 border-r border-slate-200 bg-white hidden md:block">
          <div className="flex flex-col h-full overflow-y-auto px-3 py-2">
            <nav className="flex-1 space-y-1">
              <NavGroup title="Workspace">
                <NavItem href="/app/dashboard" label="Dashboard" />
                <NavItem href="/app/design-system" label="Design System" />
              </NavGroup>
              
              <NavGroup title="CRM">
                <NavItem href="/app/crm/leads" label="Leads" />
                <NavItem href="/app/crm/customers" label="Customers" />
                <NavItem href="/app/crm/sites" label="Sites" />
                <NavItem href="/app/crm/surveys" label="Surveys" />
              </NavGroup>
              
              <NavGroup title="Catalogue">
                <NavItem href="/app/catalogue" label="Products" />
                <NavItem href="/app/suppliers" label="Suppliers" />
              </NavGroup>

              {(estimatePerms.canRead || quotePerms.canRead) && (
                <NavGroup title="Sales">
                  {estimatePerms.canRead && <NavItem href="/app/estimates" label="Estimates" />}
                  {quotePerms.canRead && <NavItem href="/app/quotes" label="Quotes" />}
                </NavGroup>
              )}

              {(procurementPerms.canViewRequisition || procurementPerms.canViewPo) && (
                <NavGroup title="Procurement">
                  <NavItem href="/app/procurement" label="Overview" />
                  {procurementPerms.canViewRequisition && <NavItem href="/app/procurement/requisitions" label="Requisitions" />}
                  {procurementPerms.canViewPo && <NavItem href="/app/procurement/purchase-orders" label="Purchase Orders" />}
                </NavGroup>
              )}

              <NavGroup title="Administration">
                <NavItem href="/app/settings/business" label="Business" />
                <NavItem href="/app/settings/branches" label="Branches" />
                <NavItem href="/app/settings/users" label="Users" />
                <NavItem href="/app/settings/roles" label="Roles & Permissions" />
              </NavGroup>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 bg-slate-50/50">
          <div className="p-6 md:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

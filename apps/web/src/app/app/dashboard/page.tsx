import { Card } from "@tradesperson/ui";
import { apiFetch, getSession } from "@/lib/api";

export default async function DashboardPage() {
  const session = await getSession();
  const tenant = await apiFetch<{
    name: string;
    branches: Array<{ id: string }>;
    subscriptions: Array<{ plan: { name: string } }>;
  }>("/api/v1/tenants/current");
  const members = await apiFetch<Array<unknown>>(
    `/api/v1/tenants/${session!.activeTenantId}/memberships`,
  );
  const audits =
    await apiFetch<Array<{ id: string; action: string; createdAt: string }>>(
      "/api/v1/audit-logs",
    );
  const leads = await apiFetch<Array<{ id: string }>>("/api/v1/leads");
  const customers = await apiFetch<Array<{ id: string }>>("/api/v1/customers");
  const properties = await apiFetch<Array<{ id: string }>>("/api/v1/properties");

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-sm text-slate-500">Tenant</p>
          <p className="mt-2 text-2xl font-semibold">{tenant.name}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Subscription</p>
          <p className="mt-2 text-2xl font-semibold">
            {tenant.subscriptions[0]?.plan.name ?? "None"}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Branches</p>
          <p className="mt-2 text-2xl font-semibold">
            {tenant.branches.length}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Members</p>
          <p className="mt-2 text-2xl font-semibold">{members.length}</p>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-500">Leads</p>
          <p className="mt-2 text-2xl font-semibold">{leads.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Customers</p>
          <p className="mt-2 text-2xl font-semibold">{customers.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Properties</p>
          <p className="mt-2 text-2xl font-semibold">{properties.length}</p>
        </Card>
      </div>
      <Card>
        <h2 className="text-lg font-semibold text-slate-900">
          Recent administrative activity
        </h2>
        <div className="mt-4 space-y-3">
          {audits.length ? (
            audits.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-slate-200 px-4 py-3"
              >
                <p className="font-medium text-slate-900">{item.action}</p>
                <p className="text-sm text-slate-500">
                  {new Date(item.createdAt).toLocaleString()}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">No audit activity yet.</p>
          )}
        </div>
      </Card>
    </div>
  );
}

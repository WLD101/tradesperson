import { Card } from "@tradesperson/ui";
import { apiFetch } from "@/lib/api";

export default async function RolesPage() {
  const roles = await apiFetch<
    Array<{
      id: string;
      name: string;
      key: string;
      permissions: Array<{ permission: { key: string } }>;
    }>
  >("/api/v1/roles");

  return (
    <Card>
      <h1 className="text-xl font-semibold text-slate-950">
        Roles & permissions
      </h1>
      <div className="mt-4 space-y-4">
        {roles.map((role) => (
          <div
            key={role.id}
            className="rounded-lg border border-slate-200 px-4 py-4"
          >
            <p className="font-medium text-slate-900">{role.name}</p>
            <p className="text-sm text-slate-500">{role.key}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {role.permissions.map((item) => (
                <span
                  key={item.permission.key}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                >
                  {item.permission.key}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

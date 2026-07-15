import { revalidatePath } from "next/cache";
import { Button, Card, Input } from "@tradesperson/ui";
import { apiFetch } from "@/lib/api";

async function createCustomer(formData: FormData) {
  "use server";

  await apiFetch("/api/v1/customers", {
    method: "POST",
    body: JSON.stringify({
      displayName: formData.get("displayName"),
      customerType: formData.get("customerType"),
      companyName: formData.get("companyName"),
      primaryEmail: formData.get("primaryEmail"),
      primaryPhone: formData.get("primaryPhone"),
      notes: formData.get("notes"),
    }),
  });

  revalidatePath("/app/crm/customers");
  revalidatePath("/app/dashboard");
}

export default async function CustomersPage() {
  const customers = await apiFetch<
    Array<{
      id: string;
      displayName: string;
      customerType: string;
      companyName: string | null;
      primaryEmail: string | null;
      primaryPhone: string | null;
      properties: Array<{ id: string; label: string; city: string | null }>;
    }>
  >("/api/v1/customers");

  return (
    <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-950">Customers</h1>
            <p className="mt-1 text-sm text-slate-500">
              Active tenant customers created directly or converted from leads.
            </p>
          </div>
          <p className="text-sm text-slate-500">{customers.length} total</p>
        </div>
        <div className="mt-4 space-y-3">
          {customers.map((customer) => (
            <div
              key={customer.id}
              className="rounded-xl border border-slate-200 px-4 py-4"
            >
              <p className="font-medium text-slate-900">
                {customer.displayName}
              </p>
              <p className="text-sm text-slate-500">
                {customer.customerType} • {customer.primaryEmail ?? "No email"}{" "}
                • {customer.primaryPhone ?? "No phone"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {customer.properties.length ? (
                  customer.properties.map((property) => (
                    <span
                      key={property.id}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                    >
                      {property.label}
                      {property.city ? ` • ${property.city}` : ""}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-400">
                    No properties linked yet.
                  </span>
                )}
              </div>
            </div>
          ))}
          {!customers.length ? (
            <p className="text-sm text-slate-500">No customers yet.</p>
          ) : null}
        </div>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold text-slate-950">Add customer</h2>
        <form action={createCustomer} className="mt-4 space-y-3">
          <Input name="displayName" placeholder="Display name" required />
          <select
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            defaultValue="RESIDENTIAL"
            name="customerType"
          >
            <option value="RESIDENTIAL">Residential</option>
            <option value="COMMERCIAL">Commercial</option>
          </select>
          <Input name="companyName" placeholder="Company name (optional)" />
          <Input name="primaryEmail" placeholder="Email" type="email" />
          <Input name="primaryPhone" placeholder="Phone" />
          <textarea
            className="min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500"
            name="notes"
            placeholder="Notes"
          />
          <Button type="submit">Create customer</Button>
        </form>
      </Card>
    </div>
  );
}

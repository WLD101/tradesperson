import { revalidatePath } from "next/cache";
import { Button, Card, Input } from "@tradesperson/ui";
import { apiFetch } from "@/lib/api";

async function createLead(formData: FormData) {
  "use server";

  await apiFetch("/api/v1/leads", {
    method: "POST",
    body: JSON.stringify({
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      companyName: formData.get("companyName"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      source: formData.get("source"),
      addressLine1: formData.get("addressLine1"),
      city: formData.get("city"),
      postcode: formData.get("postcode"),
      notes: formData.get("notes"),
    }),
  });

  revalidatePath("/app/crm/leads");
  revalidatePath("/app/dashboard");
}

async function convertLead(formData: FormData) {
  "use server";

  const leadId = String(formData.get("leadId"));
  await apiFetch(`/api/v1/leads/${leadId}/convert`, {
    method: "POST",
    body: JSON.stringify({}),
  });

  revalidatePath("/app/crm/leads");
  revalidatePath("/app/crm/customers");
  revalidatePath("/app/crm/properties");
  revalidatePath("/app/dashboard");
}

export default async function LeadsPage() {
  const leads = await apiFetch<
    Array<{
      id: string;
      firstName: string;
      lastName: string;
      companyName: string | null;
      email: string | null;
      phone: string | null;
      source: string | null;
      status: string;
      city: string | null;
      postcode: string | null;
      createdAt: string;
      convertedCustomer: { id: string; displayName: string } | null;
      convertedProperty: { id: string; label: string } | null;
    }>
  >("/api/v1/leads");

  return (
    <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-950">Leads</h1>
            <p className="mt-1 text-sm text-slate-500">
              CRM intake for enquiries, referrals, and showroom opportunities.
            </p>
          </div>
          <p className="text-sm text-slate-500">{leads.length} total</p>
        </div>
        <div className="mt-4 space-y-3">
          {leads.map((lead) => (
            <div
              key={lead.id}
              className="rounded-xl border border-slate-200 px-4 py-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">
                    {lead.companyName ?? `${lead.firstName} ${lead.lastName}`}
                  </p>
                  <p className="text-sm text-slate-500">
                    {lead.status} • {lead.source ?? "No source"}
                  </p>
                </div>
                <p className="text-sm text-slate-400">
                  {new Date(lead.createdAt).toLocaleDateString()}
                </p>
              </div>
              <p className="mt-3 text-sm text-slate-600">
                {lead.email ?? "No email"} • {lead.phone ?? "No phone"} •{" "}
                {[lead.city, lead.postcode].filter(Boolean).join(", ") ||
                  "No address yet"}
              </p>
              {lead.convertedCustomer ? (
                <p className="mt-3 text-sm text-emerald-700">
                  Converted to {lead.convertedCustomer.displayName} /{" "}
                  {lead.convertedProperty?.label ?? "property pending"}
                </p>
              ) : (
                <form action={convertLead} className="mt-4">
                  <input name="leadId" type="hidden" value={lead.id} />
                  <Button type="submit">Convert to customer</Button>
                </form>
              )}
            </div>
          ))}
          {!leads.length ? (
            <p className="text-sm text-slate-500">No leads yet.</p>
          ) : null}
        </div>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold text-slate-950">Add lead</h2>
        <form action={createLead} className="mt-4 space-y-3">
          <Input name="firstName" placeholder="First name" required />
          <Input name="lastName" placeholder="Last name" required />
          <Input name="companyName" placeholder="Company name (optional)" />
          <Input name="email" placeholder="Email" type="email" />
          <Input name="phone" placeholder="Phone" />
          <Input name="source" placeholder="Source" />
          <Input name="addressLine1" placeholder="Address line 1" />
          <Input name="city" placeholder="City" />
          <Input name="postcode" placeholder="Postcode" />
          <textarea
            className="min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500"
            name="notes"
            placeholder="Notes"
          />
          <Button type="submit">Create lead</Button>
        </form>
      </Card>
    </div>
  );
}

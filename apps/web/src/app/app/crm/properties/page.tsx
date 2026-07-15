import { revalidatePath } from "next/cache";
import { Button, Card, Input } from "@tradesperson/ui";
import { apiFetch } from "@/lib/api";

async function createProperty(formData: FormData) {
  "use server";

  await apiFetch("/api/v1/properties", {
    method: "POST",
    body: JSON.stringify({
      customerId: formData.get("customerId"),
      label: formData.get("label"),
      propertyType: formData.get("propertyType"),
      addressLine1: formData.get("addressLine1"),
      city: formData.get("city"),
      postcode: formData.get("postcode"),
      accessNotes: formData.get("accessNotes"),
    }),
  });

  revalidatePath("/app/crm/properties");
  revalidatePath("/app/crm/customers");
  revalidatePath("/app/dashboard");
}

export default async function PropertiesPage() {
  const [properties, customers] = await Promise.all([
    apiFetch<
      Array<{
        id: string;
        label: string;
        propertyType: string;
        addressLine1: string | null;
        city: string | null;
        postcode: string | null;
        customer: { id: string; displayName: string };
      }>
    >("/api/v1/properties"),
    apiFetch<Array<{ id: string; displayName: string }>>("/api/v1/customers"),
  ]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-950">
              Properties
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Customer locations that later surveys, quotes, and jobs will use.
            </p>
          </div>
          <p className="text-sm text-slate-500">{properties.length} total</p>
        </div>
        <div className="mt-4 space-y-3">
          {properties.map((property) => (
            <div
              key={property.id}
              className="rounded-xl border border-slate-200 px-4 py-4"
            >
              <p className="font-medium text-slate-900">{property.label}</p>
              <p className="text-sm text-slate-500">
                {property.customer.displayName} • {property.propertyType}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                {[property.addressLine1, property.city, property.postcode]
                  .filter(Boolean)
                  .join(", ") || "Address details still being collected"}
              </p>
            </div>
          ))}
          {!properties.length ? (
            <p className="text-sm text-slate-500">No properties yet.</p>
          ) : null}
        </div>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold text-slate-950">Add property</h2>
        <form action={createProperty} className="mt-4 space-y-3">
          <select
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            name="customerId"
            required
          >
            <option value="">Select customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.displayName}
              </option>
            ))}
          </select>
          <Input name="label" placeholder="Property label" required />
          <select
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            defaultValue="RESIDENTIAL"
            name="propertyType"
          >
            <option value="RESIDENTIAL">Residential</option>
            <option value="COMMERCIAL">Commercial</option>
            <option value="MIXED_USE">Mixed use</option>
            <option value="OTHER">Other</option>
          </select>
          <Input name="addressLine1" placeholder="Address line 1" />
          <Input name="city" placeholder="City" />
          <Input name="postcode" placeholder="Postcode" />
          <textarea
            className="min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500"
            name="accessNotes"
            placeholder="Access notes"
          />
          <Button disabled={!customers.length} type="submit">
            Create property
          </Button>
        </form>
      </Card>
    </div>
  );
}

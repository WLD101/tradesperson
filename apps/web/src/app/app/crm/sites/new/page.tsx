import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Button, Card, Input } from "@tradesperson/ui";
import { apiFetch } from "@/lib/api";

async function createSite(formData: FormData) {
  "use server";

  const site = await apiFetch<{ id: string }>("/api/v1/sites", {
    method: "POST",
    body: JSON.stringify({
      customerId: formData.get("customerId"),
      label: formData.get("label"),
      siteType: formData.get("siteType"),
      addressLine1: formData.get("addressLine1"),
      addressLine2: formData.get("addressLine2"),
      city: formData.get("city"),
      county: formData.get("county"),
      postcode: formData.get("postcode"),
      primaryContactName: formData.get("primaryContactName"),
      primaryContactPhone: formData.get("primaryContactPhone"),
      primaryContactEmail: formData.get("primaryContactEmail"),
      accessNotes: formData.get("accessNotes"),
      generalSiteNotes: formData.get("generalSiteNotes"),
    }),
  });

  revalidatePath("/app/crm/sites");
  revalidatePath("/app/crm/customers");
  redirect(`/app/crm/sites/${site.id}`);
}

export default async function NewSitePage() {
  const customers = await apiFetch<Array<{ id: string; displayName: string }>>(
    "/api/v1/customers",
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">New Site</h1>
          <p className="mt-1 text-sm text-slate-500">
            Capture the site details needed before surveying and measurement work begins.
          </p>
        </div>
        <Link href="/app/crm/sites" className="text-sm font-medium text-slate-500 hover:text-slate-900">
          Back to Sites
        </Link>
      </div>

      <Card>
        <form action={createSite} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Customer</label>
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
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Site label</label>
            <Input name="label" placeholder="Johnson Residence" required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Site type</label>
            <select
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
              defaultValue="RESIDENTIAL"
              name="siteType"
            >
              <option value="RESIDENTIAL">Residential</option>
              <option value="COMMERCIAL">Commercial</option>
              <option value="MIXED_USE">Mixed use</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Primary contact</label>
            <Input name="primaryContactName" placeholder="Amelia Johnson" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Address line 1</label>
            <Input name="addressLine1" placeholder="14 Birch Avenue" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Address line 2</label>
            <Input name="addressLine2" placeholder="Optional" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Town or city</label>
            <Input name="city" placeholder="Manchester" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">County</label>
            <Input name="county" placeholder="Greater Manchester" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Postcode</label>
            <Input name="postcode" placeholder="M20 2LT" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Primary phone</label>
            <Input name="primaryContactPhone" placeholder="+44 7700 900100" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Primary email</label>
            <Input name="primaryContactEmail" placeholder="contact@exampleflooring.local" type="email" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Access notes</label>
            <textarea
              className="min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500"
              name="accessNotes"
              placeholder="Parking, keys, pets, access windows, lift details"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">General site notes</label>
            <textarea
              className="min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500"
              name="generalSiteNotes"
              placeholder="Anything the surveyor should know before attending"
            />
          </div>
          <div className="md:col-span-2 flex justify-end gap-3 border-t border-slate-200 pt-4">
            <Link
              href="/app/crm/sites"
              className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Link>
            <Button disabled={!customers.length} type="submit">
              Save site
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

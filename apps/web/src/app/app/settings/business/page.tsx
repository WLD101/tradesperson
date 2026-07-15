import { revalidatePath } from "next/cache";
import { Button, Card, Input } from "@tradesperson/ui";
import { apiFetch } from "@/lib/api";

async function updateBusiness(formData: FormData) {
  "use server";

  const tenant = await apiFetch<{ id: string }>("/api/v1/tenants/current");
  await apiFetch(`/api/v1/tenants/${tenant.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      legalName: formData.get("legalName"),
      tradingName: formData.get("tradingName"),
      businessEmail: formData.get("businessEmail"),
      businessPhone: formData.get("businessPhone"),
      website: formData.get("website"),
      city: formData.get("city"),
      postcode: formData.get("postcode"),
      timeZone: formData.get("timeZone"),
    }),
  });

  revalidatePath("/app/settings/business");
}

export default async function BusinessSettingsPage() {
  const tenant = await apiFetch<{
    legalName?: string | null;
    tradingName?: string | null;
    businessEmail?: string | null;
    businessPhone?: string | null;
    website?: string | null;
    city?: string | null;
    postcode?: string | null;
    timeZone: string;
  }>("/api/v1/tenants/current");

  return (
    <Card>
      <h1 className="text-xl font-semibold text-slate-950">
        Business settings
      </h1>
      <form action={updateBusiness} className="mt-6 grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm">Legal name</label>
          <Input defaultValue={tenant.legalName ?? ""} name="legalName" />
        </div>
        <div>
          <label className="text-sm">Trading name</label>
          <Input defaultValue={tenant.tradingName ?? ""} name="tradingName" />
        </div>
        <div>
          <label className="text-sm">Email</label>
          <Input
            defaultValue={tenant.businessEmail ?? ""}
            name="businessEmail"
            type="email"
          />
        </div>
        <div>
          <label className="text-sm">Telephone</label>
          <Input
            defaultValue={tenant.businessPhone ?? ""}
            name="businessPhone"
          />
        </div>
        <div>
          <label className="text-sm">Website</label>
          <Input defaultValue={tenant.website ?? ""} name="website" />
        </div>
        <div>
          <label className="text-sm">Time zone</label>
          <Input defaultValue={tenant.timeZone} name="timeZone" />
        </div>
        <div>
          <label className="text-sm">City</label>
          <Input defaultValue={tenant.city ?? ""} name="city" />
        </div>
        <div>
          <label className="text-sm">Postcode</label>
          <Input defaultValue={tenant.postcode ?? ""} name="postcode" />
        </div>
        <div className="md:col-span-2">
          <Button type="submit">Save business profile</Button>
        </div>
      </form>
    </Card>
  );
}

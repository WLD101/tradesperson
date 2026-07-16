import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Button, Card, Input } from "@tradesperson/ui";
import { apiFetch } from "@/lib/api";

async function createSurvey(formData: FormData) {
  "use server";

  const siteId = String(formData.get("siteId") ?? "");
  const site = await apiFetch<{ id: string; customer: { id: string } }>(
    `/api/v1/sites/${siteId}`,
  );
  const survey = await apiFetch<{ id: string }>("/api/v1/surveys", {
    method: "POST",
    body: JSON.stringify({
      siteId,
      customerId: site.customer.id,
      reference: formData.get("reference"),
      purpose: formData.get("purpose") || "MEASUREMENT",
    }),
  });

  revalidatePath("/app/crm/surveys");
  revalidatePath(`/app/crm/sites/${siteId}`);
  redirect(`/app/crm/surveys/${survey.id}`);
}

export default async function NewSurveyPage({
  searchParams,
}: {
  searchParams: Promise<{ siteId?: string }>;
}) {
  const { siteId } = await searchParams;
  const sites = await apiFetch<
    Array<{
      id: string;
      label: string;
      customer: { displayName: string };
    }>
  >("/api/v1/sites");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">New Survey</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create a survey record before rooms, measurements, and waste calculations are captured.
          </p>
        </div>
        <Link href="/app/crm/surveys" className="text-sm font-medium text-slate-500 hover:text-slate-900">
          Back to Surveys
        </Link>
      </div>

      <Card>
        <form action={createSurvey} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Site</label>
            <select
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
              name="siteId"
              defaultValue={siteId ?? ""}
              required
            >
              <option value="">Select site</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.label} ({site.customer.displayName})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Reference</label>
            <Input name="reference" placeholder="SUR-1001" required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Purpose</label>
            <select
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
              name="purpose"
              defaultValue="MEASUREMENT"
            >
              <option value="ESTIMATE">Estimate</option>
              <option value="MEASUREMENT">Measurement</option>
              <option value="INSPECTION">Inspection</option>
              <option value="REMEDIAL">Remedial</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <Link
              href="/app/crm/surveys"
              className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Link>
            <Button disabled={!sites.length} type="submit">
              Create survey
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

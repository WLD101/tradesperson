import { revalidatePath } from "next/cache";
import Link from "next/link";
import { Button, Card, Input } from "@tradesperson/ui";
import { apiFetch } from "@/lib/api";
import { redirect } from "next/navigation";

async function createSurvey(formData: FormData) {
  "use server";

  const siteId = String(formData.get("siteId") ?? "");
  const site = await apiFetch<{ customer: { id: string } }>(`/api/v1/sites/${siteId}`);
  const survey = await apiFetch<any>("/api/v1/surveys", {
    method: "POST",
    body: JSON.stringify({
      siteId,
      customerId: site.customer.id,
      reference: formData.get("reference"),
      purpose: formData.get("purpose") || "MEASUREMENT",
    }),
  });

  revalidatePath("/app/crm/surveys");
  revalidatePath(`/app/crm/sites/${survey.siteId}`);
  redirect(`/app/crm/surveys/${survey.id}`);
}

export default async function SurveysPage({
  searchParams,
}: {
  searchParams: Promise<{ siteId?: string }>;
}) {
  const { siteId } = await searchParams;

  const [surveys, sites] = await Promise.all([
    apiFetch<any[]>("/api/v1/surveys"),
    apiFetch<any[]>("/api/v1/sites"),
  ]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-950">Surveys</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage site surveys, room measurements, and floor plans.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-sm text-slate-500">{surveys.length} total</p>
            <Link
              href="/app/crm/surveys/new"
              className="rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              New survey
            </Link>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {surveys.map((survey) => (
            <Link
              href={`/app/crm/surveys/${survey.id}`}
              key={survey.id}
              className="block rounded-xl border border-slate-200 px-4 py-4 hover:border-slate-300 hover:bg-slate-50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">{survey.reference}</p>
                  <p className="text-sm text-slate-500">
                    {survey.site?.label} • {survey.customer?.displayName}
                  </p>
                </div>
                <div>
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                    {survey.status}
                  </span>
                </div>
              </div>
            </Link>
          ))}
          {!surveys.length ? (
            <p className="text-sm text-slate-500">No surveys yet.</p>
          ) : null}
        </div>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold text-slate-950">New survey</h2>
        <form action={createSurvey} className="mt-4 space-y-3">
          <select
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500"
            name="siteId"
            defaultValue={siteId || ""}
            required
          >
            <option value="">Select site</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.label} ({site.customer.displayName})
              </option>
            ))}
          </select>
          <Input name="reference" placeholder="Survey reference (e.g. SUR-1234)" required />

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

          <Button disabled={!sites.length} type="submit">
            Create survey
          </Button>
        </form>
      </Card>
    </div>
  );
}

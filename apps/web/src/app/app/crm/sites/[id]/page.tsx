import { notFound } from "next/navigation";
import Link from "next/link";
import { Card } from "@tradesperson/ui";
import { apiFetch } from "@/lib/api";

export default async function SiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let site;
  try {
    site = await apiFetch<any>(`/api/v1/sites/${id}`);
  } catch (err: any) {
    if (err.status === 404) return notFound();
    throw err;
  }

  // Also fetch surveys for this site
  const allSurveys = await apiFetch<any[]>("/api/v1/surveys");
  const siteSurveys = allSurveys.filter((s) => s.site.id === id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/app/crm/sites"
          className="text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          &larr; Back to Sites
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <h1 className="text-2xl font-semibold text-slate-950">
              {site.label}
            </h1>
            <p className="mt-1 text-slate-500">
              {site.customer?.displayName} • {site.siteType}
            </p>
            <div className="mt-4 text-sm text-slate-700 space-y-1">
              <p><strong>Address:</strong> {[site.addressLine1, site.city, site.postcode].filter(Boolean).join(", ") || "N/A"}</p>
              <p><strong>Access Notes:</strong> {site.accessNotes || "None"}</p>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-950">Surveys</h2>
              <Link href={`/app/crm/surveys/new?siteId=${site.id}`}>
                <span className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
                  New Survey
                </span>
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {siteSurveys.map((survey) => (
                <Link
                  href={`/app/crm/surveys/${survey.id}`}
                  key={survey.id}
                  className="block rounded-xl border border-slate-200 px-4 py-3 hover:border-slate-300 hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{survey.reference}</p>
                      <p className="text-sm text-slate-500">
                        {survey.purpose} • {new Date(survey.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                        {survey.status}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
              {!siteSurveys.length && (
                <p className="text-sm text-slate-500">No surveys found for this site.</p>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <h3 className="text-sm font-medium text-slate-900">Site details</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-slate-500">Created At</dt>
                <dd className="font-medium text-slate-900">
                  {new Date(site.createdAt).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}

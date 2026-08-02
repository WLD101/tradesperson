import { notFound } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { Calculator, CheckCircle2, ClipboardList, Home, Layers3, Plus, Ruler } from "lucide-react";
import { Button, Card, Input } from "@tradesperson/ui";
import { apiFetch } from "@/lib/api";
import { StatusBadge } from "@/components/shared";

type MeasurementComponent = {
  id: string;
  type: string;
  operation: "ADD" | "DEDUCT";
  dimensions: Record<string, string | number | boolean | null>;
  calculatedArea: string;
};

type SurveyRoom = {
  id: string;
  name: string;
  floorLevel: string | null;
  netArea?: string | null;
  grossArea?: string | null;
  wasteAdjustedArea?: string | null;
  components?: MeasurementComponent[];
};

type SurveyDetail = {
  id: string;
  reference: string;
  purpose: string | null;
  status: string;
  customer: { id: string; displayName: string };
  site: { id: string; label: string };
  rooms?: SurveyRoom[];
};

async function updateSurveyStatus(formData: FormData) {
  "use server";
  const id = formData.get("surveyId") as string;
  const status = formData.get("status") as string;

  await apiFetch(`/api/v1/surveys/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

  revalidatePath(`/app/crm/surveys/${id}`);
}

async function addRoom(formData: FormData) {
  "use server";
  const surveyId = formData.get("surveyId") as string;

  await apiFetch(`/api/v1/surveys/${surveyId}/rooms`, {
    method: "POST",
    body: JSON.stringify({
      name: formData.get("name"),
      floorLevel: formData.get("floorLevel"),
    }),
  });

  revalidatePath(`/app/crm/surveys/${surveyId}`);
}

function statusColor(status: string) {
  if (["APPROVED", "COMPLETED", "REVIEWED"].includes(status)) return "green" as const;
  if (["SCHEDULED", "IN_PROGRESS"].includes(status)) return "blue" as const;
  if (["CANCELLED", "SUPERSEDED"].includes(status)) return "red" as const;
  return "slate" as const;
}

function roomArea(room: SurveyRoom) {
  if (room.netArea != null) return Number(room.netArea);
  return room.components?.reduce((sum, component) => {
    const area = Number(component.calculatedArea);
    return component.operation === "ADD" ? sum + area : sum - area;
  }, 0) ?? 0;
}

export default async function SurveyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let survey: SurveyDetail;
  try {
    survey = await apiFetch<SurveyDetail>(`/api/v1/surveys/${id}`);
  } catch (err: unknown) {
    const status = typeof err === "object" && err !== null && "status" in err ? (err as { status?: number }).status : undefined;
    if (status === 404) return notFound();
    throw err;
  }

  const rooms = survey.rooms ?? [];
  const isImmutable = ["APPROVED", "SUPERSEDED", "CANCELLED"].includes(survey.status);
  const totalArea = rooms.reduce((sum, room) => sum + roomArea(room), 0);
  const componentsCount = rooms.reduce((sum, room) => sum + (room.components?.length ?? 0), 0);
  const completionPercent = rooms.length ? Math.round((rooms.filter((room) => (room.components?.length ?? 0) > 0).length / rooms.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-stitch">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link href="/app/crm/surveys" className="text-sm font-semibold text-slate-500 hover:text-slate-950">Back to surveys</Link>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-600">{survey.reference}</span>
              <StatusBadge status={survey.status} color={statusColor(survey.status)} />
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold uppercase tracking-[0.08em] text-emerald-700">Live Sync</span>
            </div>
            <h1 className="mt-3 text-headline-lg text-slate-950">Site Measurement</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">{survey.purpose ?? "Survey workspace for room measurements, deductions, preparation notes, and estimate handoff."}</p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
              <Link className="inline-flex items-center gap-2 hover:text-slate-950" href={`/app/crm/customers/${survey.customer.id}`}><Home className="h-4 w-4" /> {survey.customer.displayName}</Link>
              <Link className="inline-flex items-center gap-2 hover:text-slate-950" href={`/app/crm/sites/${survey.site.id}`}><Layers3 className="h-4 w-4" /> {survey.site.label}</Link>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50" href={`/app/crm/surveys/${survey.id}/measurements`}>
              <Ruler className="h-4 w-4" /> Open measurements
            </Link>
            {survey.status === "APPROVED" ? (
              <Link className="inline-flex min-h-11 items-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800" href={`/app/estimates/new?customerId=${survey.customer.id}&siteId=${survey.site.id}&surveyId=${survey.id}`}>
                <Calculator className="h-4 w-4" /> Create estimate
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Total Area" value={`${totalArea.toFixed(2)} m2`} icon={Ruler} />
        <Metric label="Rooms" value={String(rooms.length)} icon={Home} />
        <Metric label="Components" value={String(componentsCount)} icon={ClipboardList} />
        <Metric label="Completion" value={`${completionPercent}%`} icon={CheckCircle2} tone={completionPercent === 100 ? "green" : "amber"} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-stitch">
          <div className="flex items-center justify-between">
            <h2 className="text-title-md text-slate-950">Rooms</h2>
            <Link className="text-sm font-semibold text-emerald-700" href={`/app/crm/surveys/${survey.id}/measurements`}>Detailed measurement editor</Link>
          </div>
          <div className="mt-4 grid gap-4">
            {rooms.map((room) => {
              const area = roomArea(room);
              return (
                <article key={room.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-slate-950">{room.name}</h3>
                      <p className="mt-1 text-sm text-slate-500">{room.floorLevel ?? "No floor level"} · {room.components?.length ?? 0} components</p>
                    </div>
                    <p className="font-mono text-xl font-semibold text-slate-950">{area.toFixed(2)} m2</p>
                  </div>
                  {room.components?.length ? (
                    <div className="mt-4 overflow-x-auto">
                      <table className="min-w-full text-table-data">
                        <thead className="bg-white/70 text-left text-label-caps uppercase text-slate-500">
                          <tr>
                            <th className="px-3 py-2">Type</th>
                            <th className="px-3 py-2">Operation</th>
                            <th className="px-3 py-2">Dimensions</th>
                            <th className="px-3 py-2 text-right">Area</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {room.components.map((component) => (
                            <tr key={component.id}>
                              <td className="px-3 py-2 font-semibold">{component.type}</td>
                              <td className="px-3 py-2"><StatusBadge status={component.operation} color={component.operation === "ADD" ? "green" : "red"} /></td>
                              <td className="px-3 py-2 text-slate-500">{Object.entries(component.dimensions).map(([key, value]) => `${key}: ${String(value)}`).join(", ")}</td>
                              <td className="px-3 py-2 text-right font-mono">{component.operation === "DEDUCT" ? "-" : ""}{Number(component.calculatedArea).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">No measurements added.</p>
                  )}
                </article>
              );
            })}
            {!rooms.length ? <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">No rooms added to this survey yet.</p> : null}
          </div>
        </section>

        <aside className="space-y-6">
          <Card>
            <h3 className="mb-4 text-title-md text-slate-950">Workflow Actions</h3>
            <form action={updateSurveyStatus} className="space-y-3">
              <input type="hidden" name="surveyId" value={survey.id} />
              <select name="status" defaultValue={survey.status} className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500" disabled={isImmutable}>
                <option value={survey.status}>{survey.status}</option>
                {survey.status === "DRAFT" && <><option value="SCHEDULED">Scheduled</option><option value="CANCELLED">Cancelled</option></>}
                {survey.status === "SCHEDULED" && <><option value="IN_PROGRESS">In Progress</option><option value="CANCELLED">Cancelled</option></>}
                {survey.status === "IN_PROGRESS" && <><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option></>}
                {survey.status === "COMPLETED" && <><option value="REVIEWED">Reviewed</option><option value="CANCELLED">Cancelled</option></>}
                {survey.status === "REVIEWED" && <><option value="APPROVED">Approved</option><option value="CANCELLED">Cancelled</option></>}
                {survey.status === "APPROVED" && <option value="SUPERSEDED">Superseded</option>}
              </select>
              <Button type="submit" className="w-full" disabled={isImmutable}>Update Status</Button>
            </form>
          </Card>

          <Card>
            <h3 className="mb-4 text-title-md text-slate-950">Add Room</h3>
            <form action={addRoom} className="space-y-3">
              <input type="hidden" name="surveyId" value={survey.id} />
              <Input name="name" placeholder="Room Name (e.g. Master Bedroom)" required disabled={isImmutable} />
              <Input name="floorLevel" placeholder="Floor Level (e.g. Ground, First)" disabled={isImmutable} />
              <Button type="submit" className="w-full gap-2" disabled={isImmutable}><Plus className="h-4 w-4" /> Add Room</Button>
            </form>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
  tone = "slate",
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "slate" | "green" | "amber";
}) {
  const toneClass = tone === "green" ? "text-emerald-700 bg-emerald-50" : tone === "amber" ? "text-amber-700 bg-amber-50" : "text-slate-700 bg-slate-50";
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-stitch">
      <div className="flex items-center justify-between gap-3">
        <p className="text-label-caps uppercase text-slate-500">{label}</p>
        <span className={`rounded-xl p-2 ${toneClass}`}><Icon className="h-5 w-5" /></span>
      </div>
      <p className="mt-3 font-mono text-2xl font-semibold text-slate-950">{value}</p>
    </article>
  );
}

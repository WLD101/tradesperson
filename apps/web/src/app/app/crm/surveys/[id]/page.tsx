import { notFound } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { Button, Card, Input } from "@tradesperson/ui";
import { apiFetch } from "@/lib/api";

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

export default async function SurveyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let survey;
  try {
    survey = await apiFetch<any>(`/api/v1/surveys/${id}`);
  } catch (err: any) {
    if (err.status === 404) return notFound();
    throw err;
  }

  const isImmutable = survey.status === "APPROVED" || survey.status === "SUPERSEDED" || survey.status === "CANCELLED";

  // Compute total area across all rooms
  const totalArea = survey.rooms?.reduce((sum: number, room: any) => {
    return sum + (room.components?.reduce((cSum: number, comp: any) => {
      const area = parseFloat(comp.calculatedArea);
      return comp.operation === "ADD" ? cSum + area : cSum - area;
    }, 0) || 0);
  }, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/app/crm/surveys"
          className="text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          &larr; Back to Surveys
        </Link>
        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-800">
          {survey.status}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-slate-950">
                  Survey {survey.reference}
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  {survey.purpose}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-slate-500">Total Area</p>
                <p className="text-2xl font-bold text-slate-900">{totalArea.toFixed(2)} m²</p>
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-950">Rooms</h2>
            {survey.rooms?.map((room: any) => {
              const roomArea = room.components?.reduce((sum: number, comp: any) => {
                const area = parseFloat(comp.calculatedArea);
                return comp.operation === "ADD" ? sum + area : sum - area;
              }, 0) || 0;

              return (
                <Card key={room.id} className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-900">{room.name}</h3>
                    <p className="text-sm font-medium text-slate-600">Net Area: {roomArea.toFixed(2)} m²</p>
                  </div>
                  
                  {room.components?.length > 0 ? (
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                        <tr>
                          <th className="px-4 py-2 rounded-l-md">Type</th>
                          <th className="px-4 py-2">Operation</th>
                          <th className="px-4 py-2">Dimensions</th>
                          <th className="px-4 py-2 text-right rounded-r-md">Area (m²)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {room.components.map((comp: any) => (
                          <tr key={comp.id} className="border-b last:border-0 border-slate-100">
                            <td className="px-4 py-2 font-medium">{comp.type}</td>
                            <td className="px-4 py-2">
                              <span className={`text-xs font-semibold ${comp.operation === 'ADD' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {comp.operation}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-slate-500">
                              {Object.entries(comp.dimensions)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(", ")}
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums">
                              {comp.operation === 'DEDUCT' ? '-' : ''}{parseFloat(comp.calculatedArea).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-sm text-slate-500 italic">No measurements added.</p>
                  )}
                  
                  {/* We would build a client-side component to add measurements here, but for MVP keeping it simple. */}
                </Card>
              );
            })}
            
            {survey.rooms?.length === 0 && (
              <p className="text-sm text-slate-500">No rooms added to this survey yet.</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <h3 className="font-semibold text-slate-950 mb-4">Actions</h3>
            <form action={updateSurveyStatus} className="space-y-3">
              <input type="hidden" name="surveyId" value={survey.id} />
              <select
                name="status"
                defaultValue={survey.status}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none"
                disabled={isImmutable}
              >
                <option value={survey.status}>{survey.status}</option>
                {survey.status === "DRAFT" && (
                  <>
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="CANCELLED">Cancelled</option>
                  </>
                )}
                {survey.status === "SCHEDULED" && (
                  <>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="CANCELLED">Cancelled</option>
                  </>
                )}
                {survey.status === "IN_PROGRESS" && (
                  <>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </>
                )}
                {survey.status === "COMPLETED" && (
                  <>
                    <option value="REVIEWED">Reviewed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </>
                )}
                {survey.status === "REVIEWED" && (
                  <>
                    <option value="APPROVED">Approved</option>
                    <option value="CANCELLED">Cancelled</option>
                  </>
                )}
                {survey.status === "APPROVED" && <option value="SUPERSEDED">Superseded</option>}
              </select>
              <Button type="submit" className="w-full" disabled={isImmutable}>Update Status</Button>
            </form>
          </Card>

          <Card>
            <h3 className="font-semibold text-slate-950 mb-4">Add Room</h3>
            <form action={addRoom} className="space-y-3">
              <input type="hidden" name="surveyId" value={survey.id} />
              <Input name="name" placeholder="Room Name (e.g. Master Bedroom)" required disabled={isImmutable} />
              <Input name="floorLevel" placeholder="Floor Level (e.g. Ground, First)" disabled={isImmutable} />
              <Button type="submit" className="w-full" disabled={isImmutable}>Add Room</Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}

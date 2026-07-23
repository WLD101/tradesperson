import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { EstimateActions } from "@/components/estimates/estimate-actions";
import {
  Breadcrumbs,
  DataTable,
  DateDisplay,
  Money,
  PageHeader,
  StatusBadge,
  SummaryStrip,
} from "@/components/shared";
import { getSession } from "@/lib/api";
import { getEstimate, getEstimatePermissions } from "@/lib/estimates";

function statusColor(status: string) {
  if (status === "DRAFT") return "slate" as const;
  if (["CALCULATED", "READY_FOR_QUOTE", "QUOTED"].includes(status)) return "blue" as const;
  if (status === "ACCEPTED") return "green" as const;
  if (["REJECTED", "CANCELLED"].includes(status)) return "red" as const;
  return "slate" as const;
}

export default async function EstimateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const perms = getEstimatePermissions(session);
  if (!perms.canRead) redirect("/app/dashboard");

  const { id } = await params;
  let estimate;
  try {
    estimate = await getEstimate(id);
  } catch (err: any) {
    if (err?.message?.includes("404") || err?.message?.includes("not found")) notFound();
    throw err;
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Estimates", href: "/app/estimates" }, { label: estimate.estimateNumber }]} />
      <PageHeader
        title={estimate.estimateNumber}
        description={estimate.title ?? `Created on ${new Date(estimate.createdAt).toLocaleDateString()}`}
        actions={
          <div className="flex items-center gap-3">
            <StatusBadge status={estimate.status} color={statusColor(estimate.status)} />
            <EstimateActions
              estimateId={estimate.id}
              status={estimate.status}
              canWrite={perms.canWrite}
              canCalculate={perms.canCalculate}
              canApprove={perms.canApprove}
            />
          </div>
        }
      />

      <SummaryStrip
        items={[
          { label: "Customer", value: estimate.customer?.displayName ?? "-" },
          { label: "Site", value: estimate.site?.label ?? "-" },
          { label: "Branch", value: estimate.branch?.name ?? "-" },
          { label: "Rooms", value: estimate.rooms.length },
          { label: "Lines", value: estimate.lines.length },
          { label: "Total", value: <Money amount={Number(estimate.grandTotal)} currency={estimate.currency} /> },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
              <h2 className="font-semibold text-slate-950">Rooms and Required Areas</h2>
            </div>
            <DataTable headers={["Room", "Net Area", "Waste", "Required Area", "Perimeter", "Notes"]}>
              {estimate.rooms.map((room) => (
                <tr key={room.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{room.roomName}</td>
                  <td className="px-4 py-3">{Number(room.netArea).toFixed(2)} m2</td>
                  <td className="px-4 py-3">{Number(room.wastePercent).toFixed(1)}%</td>
                  <td className="px-4 py-3 font-medium">{Number(room.requiredArea).toFixed(2)} m2</td>
                  <td className="px-4 py-3">{Number(room.perimeter).toFixed(2)} m</td>
                  <td className="px-4 py-3 text-slate-600">{room.notes ?? "-"}</td>
                </tr>
              ))}
            </DataTable>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
              <h2 className="font-semibold text-slate-950">Estimate Lines</h2>
            </div>
            <DataTable headers={["Type", "Description", "Qty", ...(perms.canViewCost ? ["Cost"] : []), "Sell", "VAT", "Line Total"]}>
              {estimate.lines.map((line) => (
                <tr key={line.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">{line.lineType}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{line.description}</p>
                    {line.product ? <p className="text-xs text-slate-500">{line.product.name} ({line.product.sku})</p> : null}
                  </td>
                  <td className="px-4 py-3">{Number(line.quantity).toFixed(2)} {line.unit}</td>
                  {perms.canViewCost ? (
                    <td className="px-4 py-3"><Money amount={line.costTotal == null ? null : Number(line.costTotal)} currency={estimate.currency} /></td>
                  ) : null}
                  <td className="px-4 py-3"><Money amount={Number(line.sellTotal)} currency={estimate.currency} /></td>
                  <td className="px-4 py-3"><Money amount={Number(line.vatAmount)} currency={estimate.currency} /></td>
                  <td className="px-4 py-3 font-medium"><Money amount={Number(line.lineTotal)} currency={estimate.currency} /></td>
                </tr>
              ))}
            </DataTable>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="border-b border-slate-100 pb-2 font-semibold text-slate-950">Totals</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd><Money amount={Number(estimate.subtotal)} currency={estimate.currency} /></dd></div>
              {perms.canViewCost ? (
                <>
                  <div className="flex justify-between"><dt>Material cost</dt><dd><Money amount={estimate.materialCost == null ? null : Number(estimate.materialCost)} currency={estimate.currency} /></dd></div>
                  <div className="flex justify-between"><dt>Labour cost</dt><dd><Money amount={estimate.labourCost == null ? null : Number(estimate.labourCost)} currency={estimate.currency} /></dd></div>
                  <div className="flex justify-between"><dt>Gross profit</dt><dd><Money amount={estimate.grossProfit == null ? null : Number(estimate.grossProfit)} currency={estimate.currency} /></dd></div>
                  <div className="flex justify-between"><dt>Margin</dt><dd>{estimate.grossMarginPercent ? `${Number(estimate.grossMarginPercent).toFixed(1)}%` : "-"}</dd></div>
                </>
              ) : null}
              <div className="flex justify-between"><dt>VAT</dt><dd><Money amount={Number(estimate.vatAmount)} currency={estimate.currency} /></dd></div>
              <div className="flex justify-between border-t border-slate-100 pt-3 text-base font-semibold"><dt>Grand total</dt><dd><Money amount={Number(estimate.grandTotal)} currency={estimate.currency} /></dd></div>
            </dl>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="border-b border-slate-100 pb-2 font-semibold text-slate-950">Versions</h2>
            <div className="mt-4 space-y-3">
              {estimate.versions.length ? estimate.versions.map((version) => (
                <div key={version.id} className="rounded-md border border-slate-200 p-3 text-sm">
                  <div className="flex justify-between font-medium">
                    <span>Version {version.versionNumber}</span>
                    <StatusBadge status={version.status} color={statusColor(version.status)} />
                  </div>
                  <p className="mt-2 text-slate-600"><Money amount={Number(version.grandTotal)} currency={estimate.currency} /></p>
                  <p className="text-xs text-slate-500"><DateDisplay date={version.createdAt} /></p>
                </div>
              )) : <p className="text-sm text-slate-500">No versions captured yet.</p>}
            </div>
          </section>

          {estimate.customerNotes ? (
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-slate-950">Customer Notes</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{estimate.customerNotes}</p>
            </section>
          ) : null}

          {estimate.survey ? (
            <Link className="block rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm font-medium text-blue-700 hover:bg-blue-100" href={`/app/crm/surveys/${estimate.survey.id}/measurements`}>
              View linked survey measurements: {estimate.survey.reference}
            </Link>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import type React from "react";
import { AlertTriangle, Boxes, CheckCircle2, ClipboardList, PackageSearch, ShoppingCart } from "lucide-react";
import { apiFetch, getSession } from "@/lib/api";
import type { ProductListResponse } from "@/lib/catalogue";
import { getJobs, getJobPermissions, type Job } from "@/lib/jobs";
import { Breadcrumbs, EmptyState, PageHeader, StatusBadge } from "@/components/shared";

type InventoryReconciliation = {
  mismatchCount: number;
  total: number;
  rows: Array<{
    stockBalanceId: string;
    productName?: string | null;
    warehouseName?: string | null;
    onHandQuantity: string;
    ledgerQuantity: string;
  }>;
};

function numberValue(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function materialReadiness(job: Job) {
  const requirements = job.materialRequirements ?? [];
  if (!requirements.length) return "No material lines";
  const issued = requirements.filter((line) => numberValue(line.issuedQuantity) >= numberValue(line.requiredQuantity)).length;
  const allocated = requirements.filter((line) => numberValue(line.allocatedQuantity) >= numberValue(line.requiredQuantity)).length;
  if (issued === requirements.length) return "Ready";
  if (allocated === requirements.length) return "Partially ready";
  return "Not ready";
}

export default async function InventoryPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const jobPerms = getJobPermissions(session);

  const [products, reconciliation, jobs] = await Promise.all([
    apiFetch<ProductListResponse>("/api/v1/catalogue/products?pageSize=100&sort=nameAsc").catch(() => ({ items: [], total: 0, page: 1, pageSize: 100, totalPages: 1 })),
    apiFetch<InventoryReconciliation>("/api/v1/inventory/reconciliation").catch(() => ({ mismatchCount: 0, total: 0, rows: [] })),
    jobPerms.canRead ? getJobs({ pageSize: 60 }).catch(() => ({ items: [], total: 0, page: 1, pageSize: 60, totalPages: 1 })) : { items: [], total: 0, page: 1, pageSize: 60, totalPages: 1 },
  ]);

  const lowStockRows = reconciliation.rows.filter((row) => numberValue(row.ledgerQuantity) <= 5);
  const notReadyJobs = jobs.items.filter((job) => materialReadiness(job) === "Not ready");
  const partialJobs = jobs.items.filter((job) => materialReadiness(job) === "Partially ready");
  const warehouses = new Set(reconciliation.rows.map((row) => row.warehouseName).filter(Boolean)).size;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Inventory", href: "/app/inventory" }, { label: "Warehouse Command Centre" }]} />
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-stitch">
        <PageHeader
          title="Warehouse Command Centre"
          description="Inventory visibility using existing catalogue, stock-balance reconciliation, and job material readiness data."
          actions={<Link className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800" href="/app/procurement">Procurement</Link>}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Metric label="Total SKUs" value={products.total} icon={Boxes} />
        <Metric label="Warehouses" value={warehouses} icon={PackageSearch} />
        <Metric label="Balance Rows" value={reconciliation.total} icon={ClipboardList} />
        <Metric label="Mismatches" value={reconciliation.mismatchCount} icon={AlertTriangle} tone={reconciliation.mismatchCount ? "red" : "green"} />
        <Metric label="Low Stock Signals" value={lowStockRows.length} icon={AlertTriangle} tone={lowStockRows.length ? "amber" : "green"} />
        <Metric label="Jobs Not Ready" value={notReadyJobs.length} icon={ShoppingCart} tone={notReadyJobs.length ? "red" : "green"} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-stitch">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-title-md text-slate-950">Inventory Reconciliation</h2>
            <p className="mt-1 text-sm text-slate-500">Ledger-backed stock-balance rows from the existing reconciliation endpoint.</p>
          </div>
          {reconciliation.rows.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-table-data">
                <thead className="bg-slate-50/90 text-left text-label-caps uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Warehouse</th>
                    <th className="px-4 py-3 text-right">On Hand</th>
                    <th className="px-4 py-3 text-right">Ledger</th>
                    <th className="px-4 py-3">State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reconciliation.rows.map((row) => {
                    const mismatch = numberValue(row.onHandQuantity) !== numberValue(row.ledgerQuantity);
                    return (
                      <tr key={row.stockBalanceId} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-950">{row.productName ?? "Stock item"}</td>
                        <td className="px-4 py-3 text-slate-600">{row.warehouseName ?? "Warehouse"}</td>
                        <td className="px-4 py-3 text-right font-mono">{row.onHandQuantity}</td>
                        <td className="px-4 py-3 text-right font-mono">{row.ledgerQuantity}</td>
                        <td className="px-4 py-3"><StatusBadge status={mismatch ? "Mismatch" : "Balanced"} color={mismatch ? "red" : "green"} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-5"><EmptyState title="No stock balance rows" description="Inventory rows will appear once goods receipts, reservations, issues, returns, or adjustments exist." /></div>
          )}
        </section>

        <aside className="space-y-6">
          <Panel title="Job Material Readiness">
            <div className="space-y-3">
              {[...notReadyJobs, ...partialJobs].slice(0, 8).map((job) => (
                <Link key={job.id} href={`/app/jobs/${job.id}`} className="block rounded-xl border border-slate-200 bg-slate-50 p-4 hover:border-emerald-200 hover:bg-emerald-50">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm font-semibold text-slate-950">{job.jobNumber}</p>
                      <p className="mt-1 text-sm text-slate-500">{job.customer?.displayName ?? "Customer"} · {job.site?.label ?? "Site"}</p>
                    </div>
                    <StatusBadge status={materialReadiness(job)} color={materialReadiness(job) === "Not ready" ? "red" : "amber"} />
                  </div>
                </Link>
              ))}
              {!notReadyJobs.length && !partialJobs.length ? <p className="text-sm text-slate-500">Visible jobs are materially ready or have no material requirements.</p> : null}
            </div>
          </Panel>
          <Panel title="Supported Stock Actions">
            <div className="space-y-2 text-sm text-slate-600">
              <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Reserve, issue, and return are available through job detail.</p>
              <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Receipts are available through purchase orders.</p>
              <p className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /> Transfers and manual adjustments are not exposed unless supported by existing APIs.</p>
            </div>
          </Panel>
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
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "slate" | "green" | "amber" | "red";
}) {
  const toneClass = tone === "green" ? "text-emerald-700 bg-emerald-50" : tone === "amber" ? "text-amber-700 bg-amber-50" : tone === "red" ? "text-red-700 bg-red-50" : "text-slate-700 bg-slate-50";
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-stitch">
      <div className="flex items-center justify-between gap-3">
        <p className="text-label-caps uppercase text-slate-500">{label}</p>
        <span className={`rounded-xl p-2 ${toneClass}`}><Icon className="h-5 w-5" /></span>
      </div>
      <p className="mt-3 font-mono text-3xl font-semibold text-slate-950">{value}</p>
    </article>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-stitch">
      <h2 className="text-title-md text-slate-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

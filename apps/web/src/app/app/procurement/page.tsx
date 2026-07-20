import Link from "next/link";
import { Card } from "@tradesperson/ui";
import { apiFetch, getSession } from "@/lib/api";

export default async function ProcurementPage() {
  const session = await getSession();
  const [requisitions, purchaseOrders] =
    await Promise.all([
      apiFetch<{ total: number }>("/api/v1/purchase-requisitions"),
      apiFetch<{ total: number }>("/api/v1/purchase-orders"),
    ]);

  const sections = [
    ["Requisitions", requisitions.total, "/app/procurement/requisitions"],
    ["Purchase Orders", purchaseOrders.total, "/app/procurement/purchase-orders"],
  ] as const;

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">
              Procurement
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage purchase requisitions and purchase orders.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {sections.map(([label, count, href]) => (
          <Link href={href} key={href}>
            <Card className="h-full hover:border-slate-300 hover:bg-slate-50">
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">
                {count}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

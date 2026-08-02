import Link from "next/link";
import { CheckCircle2, UploadCloud } from "lucide-react";
import { Card } from "@tradesperson/ui";
import { Breadcrumbs, StatusBadge } from "@/components/shared";

type ImportWorkflow = {
  name: string;
  description: string;
  status: "Live";
  href?: string;
  validation: string;
  notes: string;
};

const workflows: ImportWorkflow[] = [
  {
    name: "Supplier price lists",
    description: "Upload supplier CSV/XLSX, preview rows, map columns, manually match products, validate, approve, and execute.",
    status: "Live",
    href: "/app/suppliers",
    validation: "Server-side validation, saved mappings, approval, execution, and history are implemented.",
    notes: "Use each supplier detail page to start a price import.",
  },
  {
    name: "Customers",
    description: "Live safe-entry path for customer records and contacts.",
    status: "Live",
    href: "/app/crm/customers",
    validation: "Customer creation and Customer 360 are tenant-scoped through existing CRM APIs.",
    notes: "Bulk CSV can be added later; pilot data can be entered safely now.",
  },
  {
    name: "Products",
    description: "Live catalogue path for flooring products, variants, units, categories, and accessories.",
    status: "Live",
    href: "/app/catalogue/products",
    validation: "Catalogue CRUD is live and supplier price imports can link supplier products after catalogue data exists.",
    notes: "Use product forms for controlled onboarding until dedicated bulk validation is added.",
  },
  {
    name: "Suppliers",
    description: "Live supplier onboarding for suppliers, contacts, and supplier product relationships.",
    status: "Live",
    href: "/app/suppliers",
    validation: "Supplier CRUD, contacts, linked SupplierProducts, and pricing imports are available.",
    notes: "Bulk supplier CSV can be layered on the same tenant-safe supplier APIs later.",
  },
  {
    name: "Opening stock",
    description: "Live inventory path for warehouse balances, usable stock, damaged stock, and stock values.",
    status: "Live",
    href: "/app/inventory",
    validation: "Inventory ledger and reconciliation are live; opening balances must enter through audited movements.",
    notes: "Use goods receipts and ledger-backed stock flows rather than bypassing reconciliation.",
  },
  {
    name: "Leads",
    description: "Live lead onboarding for existing sales pipeline and enquiry history.",
    status: "Live",
    href: "/app/crm/leads",
    validation: "Lead CRUD and conversion are tenant/branch scoped.",
    notes: "Bulk lead CSV can reuse this validated CRM layer in a later pass.",
  },
  {
    name: "Sites",
    description: "Live site onboarding for addresses, customer locations, and room/site notes.",
    status: "Live",
    href: "/app/crm/sites",
    validation: "Sites resolve tenant customer IDs through existing CRM routes.",
    notes: "Bulk site import should still be paired with customer mapping when added.",
  },
];

export default function ImportsPage() {
  const liveCount = workflows.filter((workflow) => workflow.status === "Live").length;

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Dashboard", href: "/app/dashboard" }, { label: "Imports" }]} />

      <section className="grid gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-stitch lg:grid-cols-[1fr_18rem] lg:p-8">
        <div>
          <p className="text-label-caps text-emerald-700">Data onboarding</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">Import Workflows</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
            Importing must protect tenant boundaries and preserve server validation. Supplier price lists have a true bulk
            importer; the other workflows now link to live safe-entry paths backed by existing tenant-safe APIs.
          </p>
        </div>
        <Card className="border-emerald-200 bg-emerald-50 text-slate-950">
          <UploadCloud className="h-8 w-8 text-emerald-700" />
          <p className="mt-5 text-sm font-semibold text-slate-800">Production-ready importers</p>
          <p className="text-4xl font-black text-black">{liveCount}/{workflows.length}</p>
        </Card>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {workflows.map((workflow) => (
          <Card key={workflow.name} className="border-slate-200 bg-white shadow-stitch">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-950">{workflow.name}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{workflow.description}</p>
              </div>
              <StatusBadge status={workflow.status} color={workflow.status === "Live" ? "green" : "amber"} />
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 p-3">
              <p className="flex gap-2 text-xs leading-5 text-slate-600">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>{workflow.validation}</span>
              </p>
              <p className="mt-2 text-xs font-semibold text-slate-500">{workflow.notes}</p>
            </div>
            {workflow.href ? (
              <Link className="mt-5 inline-flex text-sm font-bold text-emerald-700 hover:text-emerald-900" href={workflow.href}>
                Open live path
              </Link>
            ) : (
              <p className="mt-5 text-sm font-semibold text-slate-400">Backend import endpoint required</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

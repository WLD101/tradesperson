import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ClipboardCheck, CreditCard, Layers3, Route, ShieldCheck, Truck } from "lucide-react";

const workflow = [
  "Lead capture",
  "Survey measurements",
  "Estimate builder",
  "Quote approval",
  "Job scheduling",
  "Stock reservation",
  "Invoice and payment",
];

const modules = [
  { title: "Flooring CRM", body: "Customers, sites, surveys, Customer 360, and lead conversion stay tenant-safe.", icon: ClipboardCheck },
  { title: "Operations dispatch", body: "Schedule installers, prevent clashes, issue materials, and complete jobs from one workspace.", icon: Route },
  { title: "Supplier control", body: "Purchase orders, goods receipts, supplier pricing imports, and inventory ledger visibility.", icon: Truck },
  { title: "Finance ready", body: "Invoices, payments, overdue visibility, customer portals, and Stripe-ready checkout plumbing.", icon: CreditCard },
];

export default function WebsiteHomePage() {
  const publishableKeyConfigured = Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

  return (
    <main className="min-h-screen overflow-hidden bg-[#eef3f0] text-slate-950">
      <section className="relative isolate px-6 py-6 lg:px-10">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.22),transparent_32%),linear-gradient(135deg,#f8fafc_0%,#e2efe8_48%,#d7e4df_100%)]" />
        <nav className="mx-auto flex max-w-7xl items-center justify-between rounded-3xl border border-white/70 bg-white/75 px-4 py-3 shadow-stitch backdrop-blur">
          <Link className="flex items-center gap-3" href="/website">
            <Image alt="Tradesperson ERP" className="rounded-2xl" height={44} src="/brand/tradesperson-erp-logo.png" width={44} />
            <div>
              <p className="font-black tracking-tight">Tradesperson ERP</p>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Flooring Edition</p>
            </div>
          </Link>
          <div className="hidden items-center gap-2 md:flex">
            <Link className="rounded-full px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100" href="/website/onboarding">Onboarding</Link>
            <Link className="rounded-full px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100" href="/website/pricing">Pricing</Link>
            <Link className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white" href="/sign-in">Open ERP</Link>
          </div>
        </nav>

        <div className="mx-auto grid max-w-7xl gap-8 py-16 lg:grid-cols-[1fr_430px] lg:items-center">
          <div>
            <p className="inline-flex rounded-full border border-emerald-200 bg-white/80 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-emerald-800">Lead to payment, built for flooring</p>
            <h1 className="mt-6 max-w-4xl text-5xl font-black tracking-[-0.06em] text-slate-950 md:text-7xl">
              Run every flooring job from first enquiry to final payment.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              A focused ERP for flooring teams: surveys, estimates, quotes, job scheduling, stock, purchasing, invoices,
              and payment workflows in one operational system.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="inline-flex min-h-12 items-center gap-2 rounded-full bg-slate-950 px-6 text-sm font-black text-white shadow-stitch-overlay" href="/website/onboarding">
                Start setup <ArrowRight className="h-4 w-4" />
              </Link>
              <Link className="inline-flex min-h-12 items-center rounded-full border border-slate-300 bg-white px-6 text-sm font-black text-slate-800" href="/app/dashboard">
                View live ERP
              </Link>
            </div>
          </div>

          <aside className="rounded-[2rem] border border-slate-950 bg-slate-950 p-6 text-white shadow-stitch-overlay">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-300">Commercial stack</p>
              <ShieldCheck className="h-6 w-6 text-emerald-300" />
            </div>
            <div className="mt-8 space-y-3">
              {workflow.map((item, index) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/8 p-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-300 font-mono text-sm font-black text-slate-950">{index + 1}</span>
                  <span className="font-bold">{item}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl bg-emerald-300 p-4 text-slate-950">
              <p className="text-xs font-black uppercase tracking-[0.12em]">Stripe readiness</p>
              <p className="mt-1 text-sm font-bold">{publishableKeyConfigured ? "Publishable key configured" : "Awaiting NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"}</p>
            </div>
          </aside>
        </div>
      </section>

      <section className="px-6 pb-16 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-2 xl:grid-cols-4">
          {modules.map(({ title, body, icon: Icon }) => (
            <article key={title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-stitch">
              <Icon className="h-8 w-8 text-emerald-700" />
              <h2 className="mt-5 text-xl font-black tracking-tight">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="px-6 pb-20 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-stitch lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-sm font-black text-emerald-700"><Layers3 className="h-4 w-4" /> Stitch UI applied</div>
            <h2 className="mt-2 text-3xl font-black tracking-tight">Website, onboarding, and ERP now share the same industrial precision brand.</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {["Responsive", "Stripe-ready", "Tenant-safe", "Pilot-ready"].map((item) => (
              <span key={item} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700">
                <CheckCircle2 className="h-4 w-4 text-emerald-700" /> {item}
              </span>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

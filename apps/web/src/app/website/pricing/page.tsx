import Link from "next/link";
import { CheckCircle2, CreditCard } from "lucide-react";

const features = [
  "CRM, sites, surveys, estimates, quotes, and jobs",
  "Procurement, supplier pricing, goods receipt, and inventory ledger",
  "Finance register, invoices, payments, and customer portal paths",
  "Installer field workspace and scheduling",
];

export default function WebsitePricingPage() {
  const publishableKeyConfigured = Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
  const priceIdConfigured = Boolean(process.env.NEXT_PUBLIC_STRIPE_PRICE_ID);

  return (
    <main className="min-h-screen bg-[#eef3f0] px-6 py-10 text-slate-950 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <Link className="text-sm font-bold text-emerald-800" href="/website">Back to website</Link>
        <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-stitch">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Stripe-ready pricing</p>
          <h1 className="mt-3 text-5xl font-black tracking-[-0.05em]">Flooring ERP Pro</h1>
          <p className="mt-4 max-w-2xl text-slate-600">Connect Stripe keys through environment variables and use the existing authenticated billing API when product prices are final.</p>
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="space-y-3">
              {features.map((feature) => (
                <p key={feature} className="flex gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-700">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" /> {feature}
                </p>
              ))}
            </div>
            <aside className="rounded-3xl bg-slate-950 p-6 text-white">
              <CreditCard className="h-8 w-8 text-emerald-300" />
              <p className="mt-5 text-sm text-slate-300">Launch pricing placeholder</p>
              <p className="mt-2 font-mono text-5xl font-black">£199</p>
              <p className="mt-1 text-sm text-slate-400">per branch / month</p>
              <Link className="mt-6 inline-flex w-full justify-center rounded-full bg-emerald-300 px-5 py-3 text-sm font-black text-slate-950" href="/website/onboarding">
                Start 30-day trial
              </Link>
              <p className="mt-4 text-xs leading-5 text-slate-400">
                Stripe config: {publishableKeyConfigured ? "publishable key present" : "publishable key missing"} · {priceIdConfigured ? "price id present" : "price id missing"}
              </p>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

"use client";

import type React from "react";
import { useMemo, useState } from "react";
import { ArrowRight, Building2, CheckCircle2, CreditCard, Loader2, Package, Ruler, ShieldCheck, Sparkles, UsersRound } from "lucide-react";

type PackageKey = "starter" | "pro" | "enterprise";
type TrialPackage = {
  key: PackageKey;
  name: string;
  price: string;
  strapline: string;
  bestFor: string;
  features: string[];
};

const packages: TrialPackage[] = [
  {
    key: "starter",
    name: "Starter",
    price: "GBP 99",
    strapline: "Small flooring teams",
    bestFor: "1 branch, owner-led operations",
    features: ["CRM and surveys", "Estimates and quotes", "Job scheduling", "Invoice/payment workflow"],
  },
  {
    key: "pro",
    name: "Pro",
    price: "GBP 199",
    strapline: "Growing installers",
    bestFor: "Multi-team flooring operations",
    features: ["Everything in Starter", "Inventory and procurement", "Supplier price imports", "Installer field app"],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    price: "Custom",
    strapline: "Multi-branch control",
    bestFor: "Branches, roles, approval controls",
    features: ["Everything in Pro", "Advanced permissions", "Branch isolation", "Implementation support"],
  },
];
const defaultPackage: TrialPackage = packages[1]!;

const setupAreas = [
  { title: "Company profile", body: "Company, branch count, contact, and launch owner.", icon: Building2 },
  { title: "Trade defaults", body: "Measurement habits, waste, margin, and VAT assumptions.", icon: Ruler },
  { title: "Catalogue setup", body: "Products, variants, labour lines, accessories, and suppliers.", icon: Package },
  { title: "Team launch", body: "Installers, scheduling, field app, and payment workflow.", icon: UsersRound },
];

const industries = [
  { name: "Flooring", status: "Live", description: "Surveys, rooms, measurements, products, suppliers, and installers." },
  { name: "Plumbing", status: "Coming soon", description: "Service jobs, parts, certificates, and maintenance workflows." },
  { name: "Electrical", status: "Coming soon", description: "Installations, compliance, inspections, and materials control." },
  { name: "HVAC", status: "Coming soon", description: "Scheduling, service visits, equipment, and recurring maintenance." },
  { name: "General building", status: "Coming soon", description: "Projects, teams, estimates, procurement, and customer billing." },
];

export function PublicOnboardingFlow() {
  const [packageKey, setPackageKey] = useState<PackageKey>("pro");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedPackage = useMemo<TrialPackage>(() => packages.find((item) => item.key === packageKey) ?? defaultPackage, [packageKey]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      packageKey,
      companyName: String(form.get("companyName") ?? ""),
      contactName: String(form.get("contactName") ?? ""),
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? ""),
      branchCount: Number(form.get("branchCount") ?? 1),
      installerCount: Number(form.get("installerCount") ?? 1),
      monthlyJobs: Number(form.get("monthlyJobs") ?? 0),
      primaryGoal: String(form.get("primaryGoal") ?? ""),
      successUrl: `${window.location.origin}/website/onboarding?trial=success`,
      cancelUrl: `${window.location.origin}/website/onboarding?trial=cancelled`,
    };

    try {
      const response = await fetch("/api/v1/public/billing/trial-checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json() as { data?: { url?: string }; error?: { message?: string } | null };
      if (!response.ok || result.error || !result.data?.url) {
        throw new Error(result.error?.message ?? "Unable to start Stripe checkout.");
      }
      window.location.href = result.data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start Stripe checkout.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="mt-6 grid gap-6 xl:grid-cols-[1fr_420px]" onSubmit={submit}>
      <section className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-stitch">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Choose industry</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight">Tradesperson ERP is expanding beyond flooring</h2>
            </div>
            <Sparkles className="h-6 w-6 text-emerald-700" />
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {industries.map((industry) => (
              <article
                key={industry.name}
                className={`rounded-2xl border p-4 ${
                  industry.status === "Live" ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-black text-slate-950">{industry.name}</h3>
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.1em] ${
                      industry.status === "Live" ? "bg-emerald-200 text-emerald-900" : "bg-white text-slate-500"
                    }`}
                  >
                    {industry.status}
                  </span>
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-600">{industry.description}</p>
              </article>
            ))}
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          {setupAreas.map(({ title, body, icon: Icon }, index) => (
            <article key={title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-stitch">
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><Icon className="h-6 w-6" /></span>
                <span className="font-mono text-sm font-black text-slate-300">0{index + 1}</span>
              </div>
              <h2 className="mt-6 text-2xl font-black tracking-tight">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
            </article>
          ))}
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-stitch">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Step 1 - Business details</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Company name" name="companyName" placeholder="Example Flooring Ltd" required />
            <Field label="Contact name" name="contactName" placeholder="Olivia Owner" required />
            <Field label="Work email" name="email" placeholder="owner@example.com" required type="email" />
            <Field label="Phone" name="phone" placeholder="+44..." />
            <Field label="Branches" name="branchCount" defaultValue="1" min="1" required type="number" />
            <Field label="Installers / tradespeople" name="installerCount" defaultValue="3" min="1" required type="number" />
            <Field label="Monthly jobs" name="monthlyJobs" defaultValue="25" min="0" required type="number" />
            <label className="space-y-1 text-sm font-bold text-slate-700">
              Main goal
              <select className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-medium text-slate-900" name="primaryGoal" defaultValue="lead-to-payment">
                <option value="lead-to-payment">Complete lead-to-payment workflow</option>
                <option value="stock-control">Improve stock and supplier control</option>
                <option value="scheduling">Fix installer scheduling</option>
                <option value="finance">Invoice faster and collect payments</option>
              </select>
            </label>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-stitch">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">Step 2 - Choose package</p>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {packages.map((plan) => (
              <button
                key={plan.key}
                className={`rounded-3xl border p-5 text-left transition ${
                  packageKey === plan.key ? "border-emerald-500 bg-emerald-50 shadow-stitch" : "border-slate-200 bg-white hover:border-emerald-200"
                }`}
                type="button"
                onClick={() => setPackageKey(plan.key)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-2xl font-black">{plan.name}</h3>
                    <p className="mt-1 text-sm font-semibold text-slate-500">{plan.strapline}</p>
                  </div>
                  {packageKey === plan.key ? <CheckCircle2 className="h-6 w-6 text-emerald-700" /> : null}
                </div>
                <p className="mt-5 font-mono text-4xl font-black">{plan.price}</p>
                <p className="mt-1 text-sm text-slate-500">per month after 30-day trial</p>
                <p className="mt-4 text-sm font-bold text-slate-700">{plan.bestFor}</p>
              </button>
            ))}
          </div>
        </section>
      </section>

      <aside className="space-y-5 xl:sticky xl:top-8 xl:self-start">
        <section className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-stitch-overlay">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-300">Step 3 - Trial checkout</p>
            <CreditCard className="h-6 w-6 text-emerald-300" />
          </div>
          <h2 className="mt-5 text-3xl font-black">{selectedPackage.name} package</h2>
          <p className="mt-2 text-slate-300">{selectedPackage.bestFor}</p>
          <p className="mt-6 font-mono text-5xl font-black text-emerald-300">{selectedPackage.price}</p>
          <p className="mt-1 text-sm text-slate-400">30 days free, then monthly billing.</p>
          <div className="mt-6 space-y-3">
            {selectedPackage.features.map((feature) => (
              <p key={feature} className="flex gap-2 text-sm text-slate-200"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" /> {feature}</p>
            ))}
          </div>
          {error ? <p className="mt-5 rounded-2xl bg-red-500/15 p-3 text-sm font-semibold text-red-100">{error}</p> : null}
          <button className="mt-6 inline-flex w-full min-h-12 items-center justify-center gap-2 rounded-full bg-emerald-300 px-5 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-60" disabled={submitting} type="submit">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            {submitting ? "Opening Stripe..." : "Start 30-day trial"}
          </button>
        </section>
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-stitch">
          <div className="flex gap-3">
            <ShieldCheck className="h-6 w-6 shrink-0 text-emerald-700" />
            <div>
              <h2 className="font-black">Secure payment info</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">Payment details are collected by Stripe Checkout. No card details are stored in this app.</p>
            </div>
          </div>
        </section>
      </aside>
    </form>
  );
}

function Field({
  label,
  name,
  ...props
}: {
  label: string;
  name: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="space-y-1 text-sm font-bold text-slate-700">
      {label}
      <input className="w-full rounded-xl border border-slate-300 px-3 py-3 text-sm font-medium text-slate-900" name={name} {...props} />
    </label>
  );
}

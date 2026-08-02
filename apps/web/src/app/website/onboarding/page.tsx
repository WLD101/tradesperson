import Link from "next/link";
import { PublicOnboardingFlow } from "./public-onboarding-flow";

export default function WebsiteOnboardingPage() {
  return (
    <main className="min-h-screen bg-[#eef3f0] px-6 py-10 text-slate-950 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <Link className="text-sm font-bold text-emerald-800" href="/website">Back to website</Link>
        <section className="mt-6 rounded-[2rem] bg-slate-950 p-8 text-white shadow-stitch-overlay">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-300">Guided setup</p>
          <h1 className="mt-3 max-w-4xl text-5xl font-black tracking-[-0.05em]">
            Start your 30-day Tradesperson ERP trial without logging in first.
          </h1>
          <p className="mt-5 max-w-2xl text-slate-300">
            Tell us about your trade business, choose a package, then add payment details securely through Stripe.
            Your trial starts with payment info collected, but billing begins after the 30-day trial.
          </p>
        </section>

        <PublicOnboardingFlow />
      </div>
    </main>
  );
}

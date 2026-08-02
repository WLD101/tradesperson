import Image from "next/image";
import Link from "next/link";
import {
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  Hammer,
  Layers3,
  LockKeyhole,
  PackageCheck,
  Ruler,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";

const productShots = [
  {
    title: "Dashboard",
    metric: "GBP 42.8k",
    detail: "Completed job value",
    icon: BarChart3,
  },
  {
    title: "Scheduler",
    metric: "18 jobs",
    detail: "Installer capacity today",
    icon: CalendarCheck,
  },
  {
    title: "Estimate Builder",
    metric: "12 rooms",
    detail: "Measured and costed",
    icon: Ruler,
  },
  {
    title: "Finance",
    metric: "96%",
    detail: "Payment capture readiness",
    icon: CreditCard,
  },
];

const trustStats = [
  ["Today's Jobs", "18"],
  ["Open Quotes", "GBP 31k"],
  ["Material Ready", "94%"],
  ["Installer Availability", "7 teams"],
];

const workflow = [
  "CRM",
  "Measurements",
  "Quotes",
  "Scheduling",
  "Stock",
  "Purchasing",
  "Invoices",
  "Profitability",
];

export function IndustrialAuthShell({
  children,
  eyebrow = "Operations Edition",
  headline = "Run your trade business from Lead to Payment.",
  subcopy = "CRM, measurements, quotes, scheduling, stock, purchasing, invoices, and profitability in one premium operating system.",
}: {
  children: ReactNode;
  eyebrow?: string;
  headline?: string;
  subcopy?: string;
}) {
  return (
    <main className="h-screen overflow-hidden bg-stitch-background text-slate-950">
      <section className="grid h-screen lg:grid-cols-[minmax(0,1.08fr)_minmax(480px,0.92fr)]">
        <aside className="relative isolate hidden h-screen overflow-hidden bg-stitch-nav px-8 py-7 text-white lg:flex lg:flex-col xl:px-10">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_15%,rgba(16,185,129,0.28),transparent_30%),radial-gradient(circle_at_80%_80%,rgba(110,231,183,0.16),transparent_26%),linear-gradient(135deg,#020617_0%,#0f172a_52%,#111827_100%)]" />
          <FlooringLineArt />
          <div className="flex items-center justify-between">
            <Link className="flex items-center gap-3" href="/website">
              <Image
                alt="Tradesperson ERP"
                className="rounded-2xl bg-white"
                height={48}
                priority
                src="/brand/tradesperson-erp-logo.png"
                width={48}
              />
              <div>
                <p className="text-lg font-black tracking-tight">Tradesperson ERP</p>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">{eyebrow}</p>
              </div>
            </Link>
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-emerald-100">
              Secure OS
            </span>
          </div>

          <div className="relative z-10 max-w-3xl pb-4 pt-16 xl:pt-20">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-emerald-200">
              <ShieldCheck className="h-4 w-4" />
              Industrial Precision access
            </div>
            <h1 className="mt-4 text-4xl font-black leading-[0.94] tracking-[-0.06em] xl:text-5xl 2xl:text-6xl">{headline}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 xl:text-base xl:leading-7">{subcopy}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {workflow.map((item) => (
                <span key={item} className="rounded-full border border-white/10 bg-white/8 px-3 py-2 text-xs font-bold text-slate-200">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="relative z-10 grid flex-1 min-h-0 gap-3 xl:grid-cols-[1fr_280px]">
            <div className="auth-shot-carousel overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/10 p-3 shadow-stitch-overlay backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-200">Live product surface</p>
                <Sparkles className="h-5 w-5 text-emerald-300" />
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {productShots.map(({ title, metric, detail, icon: Icon }, index) => (
                  <article
                    key={title}
                    className="auth-shot-card rounded-2xl border border-white/10 bg-slate-950/54 p-3"
                    style={{ animationDelay: `${index * 140}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <Icon className="h-5 w-5 text-emerald-300" />
                      <span className="font-mono text-xs font-black text-slate-500">0{index + 1}</span>
                    </div>
                    <h2 className="mt-3 text-xs font-black text-white xl:text-sm">{title}</h2>
                    <p className="mt-1 font-mono text-xl font-black text-emerald-300 xl:text-2xl">{metric}</p>
                    <p className="mt-1 line-clamp-1 text-xs leading-5 text-slate-400">{detail}</p>
                  </article>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              {trustStats.map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/8 p-3 backdrop-blur">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
                  <p className="mt-1 font-mono text-xl font-black text-white xl:text-2xl">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="relative flex h-screen items-center justify-center overflow-hidden px-5 py-5 sm:px-8 lg:px-10">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_10%,rgba(16,185,129,0.18),transparent_32%),linear-gradient(145deg,#f8fafc_0%,#eef3f0_48%,#e2e8f0_100%)]" />
          <div className="absolute left-6 top-6 flex items-center gap-3 lg:hidden">
            <Image alt="Tradesperson ERP" className="rounded-2xl bg-white shadow-stitch" height={44} src="/brand/tradesperson-erp-logo.png" width={44} />
            <div>
              <p className="font-black">Tradesperson ERP</p>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">Operations Edition</p>
            </div>
          </div>
          <div className="w-full max-w-[540px] pt-20 lg:pt-0">{children}</div>
        </section>
      </section>
    </main>
  );
}

export function AuthCard({
  children,
  eyebrow,
  title,
  subtitle,
}: {
  children: ReactNode;
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <section className="auth-glass-card rounded-[2rem] border border-white/80 bg-white/78 p-5 shadow-stitch-overlay backdrop-blur-xl sm:p-7">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">{eyebrow}</p>
        <h1 className="mt-2 text-4xl font-black tracking-[-0.05em] text-slate-950 sm:text-5xl">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function AuthPrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-black text-white shadow-stitch-overlay transition hover:-translate-y-0.5 hover:bg-black"
      href={href}
    >
      {children}
    </Link>
  );
}

export function StatusRail({ items }: { items: string[] }) {
  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <p key={item} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 text-sm font-bold text-slate-700">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" />
          {item}
        </p>
      ))}
    </div>
  );
}

export function AuthStateIllustration({ variant = "secure" }: { variant?: "secure" | "success" | "error" | "loading" }) {
  const Icon = variant === "success" ? CheckCircle2 : variant === "error" ? LockKeyhole : variant === "loading" ? Layers3 : ShieldCheck;
  return (
    <div className={`auth-state-orb mx-auto flex h-28 w-28 items-center justify-center rounded-full ${variant === "error" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
      <Icon className={`h-14 w-14 ${variant === "loading" ? "animate-spin" : ""}`} />
      {variant === "success" ? (
        <div className="pointer-events-none absolute inset-0">
          {[Ruler, Hammer, ClipboardCheck, PackageCheck].map((Doodle, index) => (
            <Doodle key={index} className="auth-doodle absolute h-5 w-5 text-emerald-500" style={{ animationDelay: `${index * 160}ms` }} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function FlooringLineArt() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden opacity-60">
      <svg className="absolute -right-20 top-20 h-[420px] w-[420px] text-emerald-300/20" fill="none" viewBox="0 0 420 420">
        <path d="M30 130h300M70 170h300M20 210h300M90 250h300M40 290h300" stroke="currentColor" strokeWidth="2" />
        <path d="M80 70l240 240M150 60l210 210M220 70l140 140" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <svg className="auth-blueprint-drift absolute bottom-20 left-8 h-64 w-64 text-white/14" fill="none" viewBox="0 0 260 260">
        <rect height="150" rx="18" stroke="currentColor" strokeWidth="2" width="190" x="32" y="48" />
        <path d="M72 48v150M32 104h190M136 104v94" stroke="currentColor" strokeWidth="2" />
        <circle cx="188" cy="76" r="16" stroke="currentColor" strokeWidth="2" />
      </svg>
      <div className="auth-floating-tool left-[12%] top-[28%]"><Ruler className="h-7 w-7" /></div>
      <div className="auth-floating-tool right-[18%] top-[36%]"><Hammer className="h-7 w-7" /></div>
      <div className="auth-floating-tool bottom-[32%] left-[36%]"><PackageCheck className="h-7 w-7" /></div>
    </div>
  );
}

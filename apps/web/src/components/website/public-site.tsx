import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  CircleEllipsis,
  CheckCircle2,
  Cpu,
  CreditCard,
  FileSearch,
  Globe2,
  HandCoins,
  Handshake,
  LayoutGrid,
  MessageSquareText,
  Orbit,
  Package,
  PanelTop,
  PlugZap,
  Route,
  ShieldCheck,
  Smartphone,
  UsersRound,
  Wrench,
} from "lucide-react";
import {
  academyCards,
  audienceCards,
  businessOutcomes,
  campaignRecords,
  communityCards,
  ecosystemLayers,
  erpModules,
  faqItems,
} from "./site-data";
import {
  footerColumns,
  industries,
  integrations,
  marketplaceCards,
  navItems,
  platformCapabilities,
  pricingComparisonHeaders,
  pricingComparisonRows,
  pricingPlans,
  productFamily,
  resourceCards,
  solutionRecords,
  trustCards,
  workflowSteps,
} from "./site-data";
import type {
  CampaignRecord,
  FeatureCard,
  IndustryRecord,
  NavItem,
  PricingPlan,
  SolutionRecord,
} from "./site-data";
import { PublicHeader } from "./public-header";
import { publicLinks } from "./site-links";

export type { FeatureCard, IndustryRecord, SolutionRecord, CampaignRecord, PricingPlan, NavItem };
export {
  academyCards,
  audienceCards,
  businessOutcomes,
  campaignRecords,
  communityCards,
  ecosystemLayers,
  erpModules,
  faqItems,
  footerColumns,
  industries,
  integrations,
  marketplaceCards,
  navItems,
  platformCapabilities,
  pricingComparisonHeaders,
  pricingComparisonRows,
  pricingPlans,
  productFamily,
  publicLinks,
  resourceCards,
  solutionRecords,
  trustCards,
  workflowSteps,
};

export function PublicSiteShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f7f9fb] text-slate-950">
      <AnnouncementBar />
      <PublicHeader />
      {children}
      <PublicFooter />
    </main>
  );
}

export function AnnouncementBar() {
  return (
    <div className="border-b border-emerald-200 bg-emerald-50/80 px-5 py-2 text-center text-xs font-semibold text-emerald-900 lg:px-8">
      Software, mobile, customers, suppliers, payments, learning, and community connected for the trades.
    </div>
  );
}

function logoBlock(showTagline = true) {
  return (
    <>
      <Image alt="Tradesperson Network logo" className="rounded-xl bg-white" height={42} src="/brand/tradesperson-erp-logo.png" width={42} />
      <div>
        <p className="text-base font-black tracking-tight">Tradesperson Network</p>
        {showTagline ? (
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300">The digital world for trades</p>
        ) : null}
      </div>
    </>
  );
}

export function PublicFooter() {
  return (
    <footer className="bg-[#0f172a] px-5 py-16 text-white lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <div className="flex items-center gap-3">
              {logoBlock(false)}
            </div>
            <p className="mt-5 max-w-md text-sm leading-6 text-slate-300">
              One connected network for every trade, every customer, and every job. Tradesperson Network connects operational software, field teams, customers, suppliers, payments, learning, and community.
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {footerColumns.map((column) => (
              <div key={column.title}>
                <h2 className="font-mono text-xs font-black uppercase tracking-[0.18em] text-white">{column.title}</h2>
                <ul className="mt-4 space-y-3">
                  {column.links.map(([label, href]) => (
                    <li key={href}>
                      <Link className="text-sm font-medium text-slate-300 hover:text-emerald-300" href={href}>{label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-8 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Tradesperson Network. Public positioning is universal across the wider trades sector.</p>
          <p>Privacy, terms, status, and security routes are available as public trust and support entry points.</p>
        </div>
      </div>
    </footer>
  );
}

export function SectionHeader({ eyebrow, title, body, align = "center" }: { eyebrow: string; title: string; body?: string; align?: "center" | "left" }) {
  return (
    <div className={`mb-10 ${align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl text-left"}`}>
      <p className="font-mono text-xs font-black uppercase tracking-[0.18em] text-emerald-700">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-slate-950 md:text-5xl">{title}</h2>
      {body ? <p className="mt-4 text-base leading-7 text-slate-600 md:text-lg">{body}</p> : null}
    </div>
  );
}

export function FeatureGrid({ cards, columns = "xl:grid-cols-4" }: { cards: FeatureCard[]; columns?: string }) {
  return (
    <div className={`grid gap-5 md:grid-cols-2 ${columns}`}>
      {cards.map((card) => (
        <FeatureArticle key={`${card.title}-${card.href ?? "card"}`} card={card} />
      ))}
    </div>
  );
}

export function FeatureArticle({ card }: { card: FeatureCard }) {
  const Icon = card.icon ?? CheckCircle2;
  const content = (
    <article className="group flex h-full flex-col rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-stitch transition hover:-translate-y-1 hover:border-emerald-300 hover:shadow-stitch-overlay">
      <div className="flex items-start justify-between gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-950 group-hover:bg-emerald-100 group-hover:text-emerald-800">
          <Icon className="h-6 w-6" />
        </span>
      </div>
      {card.eyebrow ? <p className="mt-6 font-mono text-xs font-black uppercase tracking-[0.14em] text-emerald-700">{card.eyebrow}</p> : null}
      <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-950">{card.title}</h3>
      <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{card.body}</p>
      {card.href ? (
        <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-emerald-800">
          {card.cta ?? "Learn more"} <ArrowRight className="h-4 w-4" />
        </span>
      ) : null}
    </article>
  );

  return card.href ? <Link href={card.href}>{content}</Link> : content;
}



export function UniversalHero() {
  return (
    <section className="relative overflow-hidden bg-[#0f172a] px-5 py-20 text-white lg:px-8 lg:py-28">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(16,185,129,0.28),transparent_32%),radial-gradient(circle_at_82%_12%,rgba(148,163,184,0.16),transparent_30%)]" />
      <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_560px] lg:items-center">
        <div>
          <p className="inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-2 font-mono text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
            One connected network for every trade, every customer, and every job
          </p>
          <h1 className="mt-6 max-w-4xl text-5xl font-black tracking-[-0.06em] text-white md:text-7xl">
            The digital world for trades.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Tradesperson Network connects business software, mobile tools, customers, suppliers, AI, payments, learning, and community helping trade businesses manage work from first enquiry to final payment.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-emerald-400 px-6 text-sm font-black text-slate-950 shadow-stitch-overlay" href="/platform">
              Explore the Platform <ArrowRight className="h-4 w-4" />
            </Link>
            <Link className="inline-flex min-h-12 items-center rounded-xl border border-white/20 bg-white/5 px-6 text-sm font-black text-white" href="/book-demo">
              Book a Demo
            </Link>
            <Link className="inline-flex min-h-12 items-center rounded-xl px-4 text-sm font-black text-emerald-300" href={publicLinks.signIn}>
              Sign In
            </Link>
          </div>
        </div>
        <EcosystemDiagram />
      </div>
    </section>
  );
}

export function EcosystemDiagram() {
  const nodes = [
    { title: "Trade Business", body: "CRM, scheduling, finance, and operational control.", icon: LayoutGrid, position: "left-12 top-12 sm:left-16" },
    { title: "Tradesperson", body: "Daily jobs, site notes, photos, and completion in the field.", icon: Wrench, position: "right-8 top-16 sm:right-14" },
    { title: "Customer", body: "Requests, approvals, documents, and payment touchpoints.", icon: UsersRound, position: "left-6 bottom-24 sm:left-10" },
    { title: "Supplier", body: "Pricing, product data, ordering, and delivery visibility.", icon: Handshake, position: "right-4 bottom-24 sm:right-10" },
    { title: "ERP", body: "Lead-to-payment command centre for the office team.", icon: PanelTop, position: "left-1/2 top-0 -translate-x-1/2" },
    { title: "Mobile and AI", body: "Execution, drafting, reminders, and operational insight support.", icon: Cpu, position: "left-1/2 bottom-0 -translate-x-1/2" },
  ] as const;

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.16),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-5 shadow-stitch-overlay">
      <div className="absolute inset-5 rounded-[1.5rem] bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:34px_34px] opacity-40" />
      <div className="relative min-h-[480px] rounded-[1.6rem] border border-white/10 bg-[#131b2e]/85 p-6 sm:min-h-[540px]">
        <div className="absolute left-1/2 top-1/2 h-[62%] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
        <div className="absolute left-1/2 top-1/2 h-[82%] w-[82%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/5" />
        <div className="absolute left-1/2 top-1/2 h-[2px] w-[55%] -translate-x-1/2 -translate-y-1/2 bg-white/10" />
        <div className="absolute left-1/2 top-1/2 h-[55%] w-[2px] -translate-x-1/2 -translate-y-1/2 bg-white/10" />
        <div className="absolute left-1/2 top-1/2 h-[60%] w-[60%] -translate-x-1/2 -translate-y-1/2">
          <div className="absolute left-0 top-0 h-px w-full origin-center rotate-45 bg-white/10" />
          <div className="absolute left-0 top-0 h-px w-full origin-center -rotate-45 bg-white/10" />
        </div>

        <div className="absolute left-1/2 top-1/2 w-[240px] -translate-x-1/2 -translate-y-1/2 rounded-[1.8rem] border border-white/12 bg-[#0f172a] p-7 text-center text-white shadow-stitch-overlay">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300">
            <Orbit className="h-7 w-7" />
          </div>
          <p className="mt-4 font-mono text-[11px] font-black uppercase tracking-[0.18em] text-emerald-300">Tradesperson Network</p>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.04em]">Connected platform for every side of trade work</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">Software, people, suppliers, payments, and community aligned in one digital network.</p>
        </div>

        {nodes.map((node) => {
          const Icon = node.icon;
          return (
            <div key={node.title} className={`absolute w-[180px] rounded-[1.4rem] border border-white/10 bg-white/95 p-4 text-slate-950 shadow-lg shadow-black/10 sm:w-[190px] ${node.position}`}>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-base font-black">{node.title}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">{node.body}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function WorkflowJourney() {
  return (
    <div className="grid gap-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-stitch lg:grid-cols-[1.15fr_0.85fr]">
      <div>
        <p className="font-mono text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Connected platform overview</p>
        <h3 className="mt-3 text-3xl font-black tracking-[-0.04em] text-slate-950">Every important relationship in trade work connected in one operating layer.</h3>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          Office teams, field teams, customers, suppliers, mobile workflows, payments, and automation share context instead of living in separate tools.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {ecosystemLayers.map((layer) => (
            <span key={layer} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
              <CircleEllipsis className="h-4 w-4 text-emerald-600" />
              {layer}
            </span>
          ))}
        </div>
      </div>
      <div className="rounded-[1.75rem] bg-[#0f172a] p-5 text-white">
        <p className="font-mono text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Network relationships</p>
        <div className="mt-5 grid gap-3">
          {[
            { icon: LayoutGrid, title: "Businesses", body: "Commercial control, scheduling, finance, and oversight." },
            { icon: Wrench, title: "Tradespeople", body: "Field execution, site context, notes, and completion." },
            { icon: MessageSquareText, title: "Customers", body: "Requests, approvals, documents, and payment touchpoints." },
            { icon: Package, title: "Suppliers", body: "Pricing, availability, ordering, and goods movement." },
            { icon: CreditCard, title: "Payments", body: "Invoice collection and billing pathways tied to real work." },
            { icon: ShieldCheck, title: "Community", body: "Trust, support, learning, and long-term trade relationships." },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-2xl border border-white/10 bg-white/6 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-black">{item.title}</p>
                    <p className="text-sm text-slate-300">{item.body}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function PageHero({ eyebrow, title, body, cta, secondaryCta }: { eyebrow: string; title: string; body: string; cta?: { label: string; href: string }; secondaryCta?: { label: string; href: string } }) {
  return (
    <section className="bg-[#f7f9fb] px-5 py-16 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <p className="font-mono text-xs font-black uppercase tracking-[0.18em] text-emerald-700">{eyebrow}</p>
        <h1 className="mt-4 max-w-5xl text-5xl font-black tracking-[-0.06em] text-slate-950 md:text-7xl">{title}</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">{body}</p>
        {cta || secondaryCta ? (
          <div className="mt-8 flex flex-wrap gap-3">
            {cta ? <Link className="rounded-xl bg-slate-950 px-6 py-3 text-sm font-black text-white" href={cta.href}>{cta.label}</Link> : null}
            {secondaryCta ? <Link className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-black text-slate-800" href={secondaryCta.href}>{secondaryCta.label}</Link> : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function LinkCardGrid({ items, basePath }: { items: IndustryRecord[] | SolutionRecord[]; basePath: string }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Link key={item.slug} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-stitch transition hover:-translate-y-1 hover:border-emerald-300 hover:shadow-stitch-overlay" href={`${basePath}/${item.slug}`}>
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-xl font-black">{"title" in item ? item.title : item.name}</h2>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">{"body" in item ? item.body : item.workflow}</p>
          <p className="mt-5 text-sm font-black text-emerald-800">View page</p>
        </Link>
      ))}
    </div>
  );
}

export function TrustGrid() {
  return <FeatureGrid cards={trustCards} columns="xl:grid-cols-3" />;
}

export function FaqGrid({ items = faqItems }: { items?: Array<[string, string]> }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {items.map(([question, answer]) => (
        <article key={question} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-stitch">
          <h3 className="font-black">{question}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{answer}</p>
        </article>
      ))}
    </div>
  );
}

export function PricingCards() {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      {pricingPlans.map((plan) => (
        <article key={plan.name} className="flex h-full flex-col rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-stitch">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-xs font-black uppercase tracking-[0.16em] text-emerald-700">{plan.name}</p>
              <h3 className="mt-3 text-2xl font-black">{plan.priceLabel}</h3>
              <p className="mt-2 text-sm text-slate-500">{plan.billingNote}</p>
            </div>
          </div>
          <p className="mt-5 text-sm font-semibold text-slate-700">{plan.idealFor}</p>
          <div className="mt-5 space-y-3">
            {plan.features.map((feature) => (
              <p key={feature} className="flex gap-2 text-sm text-slate-600">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                {feature}
              </p>
            ))}
          </div>
          <Link className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-black text-white" href={plan.cta === "Book demo" ? "/book-demo" : "/contact"}>
            {plan.cta}
          </Link>
        </article>
      ))}
    </div>
  );
}

export function ComparisonTable() {
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-stitch">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="bg-slate-50">
            <tr>
              {pricingComparisonHeaders.map((header) => (
                <th key={header} className="border-b border-slate-200 px-4 py-4 text-left text-sm font-black text-slate-950">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pricingComparisonRows.map((row) => (
              <tr key={row[0]} className="odd:bg-white even:bg-slate-50/50">
                {row.map((cell, index) => (
                  <td key={`${row[0]}-${index}`} className={`border-b border-slate-200 px-4 py-4 text-sm ${index === 0 ? "font-bold text-slate-950" : "text-slate-600"}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function FinalCta() {
  return (
    <section className="bg-white px-5 py-16 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-5xl rounded-[2rem] bg-[#0f172a] p-8 text-center text-white shadow-stitch-overlay md:p-12">
        <p className="font-mono text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Start connected operations</p>
        <h2 className="mt-3 text-4xl font-black tracking-[-0.04em] md:text-5xl">Run your trade business from first enquiry to final payment.</h2>
        <p className="mx-auto mt-4 max-w-2xl text-slate-300">Explore the platform, book a guided walkthrough, or start a workspace when your business is ready to move from scattered tools into one connected operating system.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link className="rounded-xl bg-emerald-400 px-6 py-3 text-sm font-black text-slate-950" href={publicLinks.startWorkspace}>Start Workspace</Link>
          <Link className="rounded-xl border border-white/20 px-6 py-3 text-sm font-black text-white" href="/book-demo">Book a Demo</Link>
        </div>
      </div>
    </section>
  );
}

export function ContactForm({ mode }: { mode: "contact" | "demo" }) {
  return (
    <section className="px-5 pb-20 lg:px-8">
      <form className="mx-auto grid max-w-5xl gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-stitch md:grid-cols-2" action={publicLinks.startWorkspace}>
        <label className="space-y-1 text-sm font-bold text-slate-700">
          Full name
          <input className="w-full rounded-xl border border-slate-300 px-3 py-3" name="fullName" placeholder="Your name" />
        </label>
        <label className="space-y-1 text-sm font-bold text-slate-700">
          Work email
          <input className="w-full rounded-xl border border-slate-300 px-3 py-3" name="email" placeholder="you@company.com" type="email" />
        </label>
        <label className="space-y-1 text-sm font-bold text-slate-700">
          Phone
          <input className="w-full rounded-xl border border-slate-300 px-3 py-3" name="phone" placeholder="+44..." />
        </label>
        <label className="space-y-1 text-sm font-bold text-slate-700">
          Business name
          <input className="w-full rounded-xl border border-slate-300 px-3 py-3" name="businessName" placeholder="Your business" />
        </label>
        <label className="space-y-1 text-sm font-bold text-slate-700">
          Industry
          <select className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3" name="industry">
            {industries.map((industry) => <option key={industry.slug}>{industry.name}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm font-bold text-slate-700">
          Company size
          <select className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3" name="companySize">
            <option>1-5 people</option>
            <option>6-25 people</option>
            <option>26-100 people</option>
            <option>100+ people</option>
          </select>
        </label>
        <label className="space-y-1 text-sm font-bold text-slate-700">
          Field-team size
          <select className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3" name="fieldTeamSize">
            <option>1-3</option>
            <option>4-10</option>
            <option>11-25</option>
            <option>26+</option>
          </select>
        </label>
        <label className="space-y-1 text-sm font-bold text-slate-700">
          Current software
          <input className="w-full rounded-xl border border-slate-300 px-3 py-3" name="currentSoftware" placeholder="Spreadsheets, job app, accounting tool..." />
        </label>
        <label className="space-y-1 text-sm font-bold text-slate-700">
          Preferred time
          <input className="w-full rounded-xl border border-slate-300 px-3 py-3" name="preferredTime" placeholder="Morning, afternoon, next week..." />
        </label>
        <label className="space-y-1 text-sm font-bold text-slate-700 md:col-span-2">
          Main challenge
          <textarea className="min-h-32 w-full rounded-xl border border-slate-300 px-3 py-3" name="challenge" placeholder="Tell us what you want to improve first." />
        </label>
        <label className="flex gap-3 text-sm font-medium text-slate-600 md:col-span-2">
          <input className="mt-1" name="consent" type="checkbox" />
          I agree to be contacted about Tradesperson Network products and understand this form routes me into onboarding or demo follow-up, not an instant production workspace.
        </label>
        <div className="md:col-span-2">
          <button className="rounded-xl bg-slate-950 px-6 py-3 text-sm font-black text-white" type="submit">
            {mode === "demo" ? "Request demo" : "Send enquiry"}
          </button>
        </div>
      </form>
    </section>
  );
}

export function IndustryTemplate({ industry }: { industry: IndustryRecord }) {
  const isConfigured = industry.slug === "flooring";
  const cards: FeatureCard[] = [
    { title: "Challenges", body: industry.challenges.join(" • "), icon: FileSearch },
    { title: "Workflow", body: industry.workflow, icon: Route },
    { title: "Modules", body: "CRM, customers, sites, estimates, quotes, jobs, scheduling, materials, purchasing, invoices, and reporting.", icon: LayoutGrid },
    { title: "Mobile", body: "Field schedules, site information, photos, notes, checklists, and completion actions support the wider mobile direction.", icon: Smartphone },
    { title: "Customer experience", body: "Requests, approvals, documents, and payment routes expand the customer side of the trade workflow.", icon: Globe2 },
    { title: "Materials or assets", body: isConfigured ? "Configured to support the industry’s product, supplier, and operational records." : "General material, asset, or supplier patterns apply while trade-specific templates are built in.", icon: Package },
    { title: "Automation", body: "AI-supported qualification, drafting, reminders, and summaries remain human-approved.", icon: Bot },
    { title: "Integrations", body: "Accounting, payments, calendar, maps, storage, and APIs connect the ecosystem.", icon: PlugZap },
    { title: "Outcomes", body: "Respond faster, reduce admin, organise work clearly, improve customer communication, and understand profitability.", icon: HandCoins },
  ];

  return (
    <>
      <PageHero
        eyebrow="Industry solution"
        title={`${industry.name} workflows on a connected trade platform.`}
        body={industry.workflow}
        cta={{ label: "Book a Demo", href: "/book-demo" }}
        secondaryCta={{ label: "Explore ERP", href: "/products/erp" }}
      />
      <section className="px-5 pb-8 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-stitch">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-semibold text-slate-600">
              {isConfigured
                ? `${industry.name} is the first deeply configured industry path available in the current ERP foundation.`
                : `${industry.name} is part of the universal trade roadmap. Core ERP workflows apply broadly while trade-specific templates should be validated before being sold as complete.`}
            </p>
          </div>
        </div>
      </section>
      <section className="px-5 pb-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Workflow template" title="Challenges, workflow, modules, mobile, customer experience, materials, automation, integrations, outcomes, and FAQ." align="left" />
          <FeatureGrid cards={cards} columns="xl:grid-cols-3" />
        </div>
      </section>
      <section className="bg-white px-5 py-16 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="FAQ" title={`${industry.name} route questions`} align="left" />
          <FaqGrid items={industry.faq} />
        </div>
      </section>
    </>
  );
}

export function SolutionTemplate({ solution }: { solution: SolutionRecord }) {
  return (
    <>
      <PageHero
        eyebrow={solution.eyebrow}
        title={solution.title}
        body={solution.body}
        cta={{ label: solution.cta, href: solution.slug === "trade-businesses" ? publicLinks.startWorkspace : "/book-demo" }}
        secondaryCta={{ label: "Explore platform", href: "/platform" }}
      />
      <section className="px-5 pb-8 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-stitch">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-semibold text-slate-600">{solution.audience}</p>
          </div>
        </div>
      </section>
      <section className="px-5 pb-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Audience workflow" title="Capabilities, journeys, and connected product layers." align="left" />
          <FeatureGrid cards={solution.cards} columns="xl:grid-cols-3" />
        </div>
      </section>
    </>
  );
}

export function CampaignTemplate({ campaign }: { campaign: CampaignRecord }) {
  const painCards = campaign.painPoints.map((point) => ({ title: point, body: "A connected trade workflow removes this pressure by keeping context attached to the job." }));
  const benefitCards = campaign.benefits.map((point) => ({ title: point, body: "This campaign route connects into the broader product story without inventing a separate system." }));

  return (
    <>
      <PageHero
        eyebrow={campaign.eyebrow}
        title={campaign.title}
        body={campaign.body}
        cta={{ label: "Book a Demo", href: "/book-demo" }}
        secondaryCta={{ label: "Explore related solution", href: campaign.relatedHref }}
      />
      <section className="px-5 pb-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Pain points" title="Why this campaign exists." align="left" />
          <FeatureGrid cards={painCards} columns="xl:grid-cols-4" />
        </div>
      </section>
      <section className="bg-white px-5 py-16 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Benefits" title="What a connected workflow improves." align="left" />
          <FeatureGrid cards={benefitCards} columns="xl:grid-cols-4" />
        </div>
      </section>
      <section className="px-5 pb-20 lg:px-8">
        <ContactForm mode="demo" />
      </section>
    </>
  );
}

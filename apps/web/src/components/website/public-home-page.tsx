import Link from "next/link";
import {
  publicLinks,
} from "./public-site";
import {
  FeatureGrid,
  FaqGrid,
  FinalCta,
  PricingCards,
  PublicSiteShell,
  SectionHeader,
  TrustGrid,
  UniversalHero,
  WorkflowJourney,
} from "./public-site";
import {
  academyCards,
  audienceCards,
  businessOutcomes,
  communityCards,
  industries,
  integrations,
  marketplaceCards,
  platformCapabilities,
  productFamily,
  resourceCards,
} from "./site-data";

const customerExperienceCards = [
  { title: "Find a tradesperson", body: "Discovery, recommendation, and trusted contact routes are part of the wider public network direction.", href: "/directory", status: "Planned" as const },
  { title: "Request work", body: "Share requirements, attachments, and site context through a cleaner intake path.", href: "/solutions/customers", status: "In Development" as const },
  { title: "Receive estimate", body: "See commercial clarity earlier in the customer journey.", href: "/solutions/customers", status: "In Development" as const },
  { title: "Approve quote", body: "Move accepted work into live scheduling with fewer handoffs.", href: "/solutions/customers", status: "In Development" as const },
  { title: "Track job", body: "Connect appointments, notes, documents, and updates back to the customer.", href: "/solutions/customers", status: "In Development" as const },
  { title: "View documents and pay", body: "Keep documents and payment actions tied to the work delivered.", href: "/solutions/customers", status: "Beta" as const },
];

const supplierNetworkCards = [
  { title: "Supplier profiles", body: "Create trusted supplier records and future public visibility routes.", href: "/solutions/suppliers", status: "Beta" as const },
  { title: "Product catalogues", body: "Structure product records, variants, categories, and attributes for operational use.", href: "/solutions/suppliers", status: "Available" as const },
  { title: "Price lists", body: "Manage versions, history, imports, and current supplier prices.", href: "/solutions/suppliers", status: "Available" as const },
  { title: "Purchase orders and deliveries", body: "Connect ordering, goods receipt, and job readiness more tightly.", href: "/solutions/suppliers", status: "Available" as const },
];

export function PublicHomePage() {
  return (
    <PublicSiteShell>
      <UniversalHero />

      <section className="px-5 py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Audience selector" title="Built for the whole trades ecosystem." body="Tradesperson Network is relevant to the people who win, plan, deliver, supply, approve, and pay for trade work." />
          <FeatureGrid cards={audienceCards} />
        </div>
      </section>

      <section className="bg-white px-5 py-16 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Connected ecosystem" title="Customer request to payment, connected in one trade operating layer." body="The ERP is the command centre, but the ecosystem stretches across customers, suppliers, payments, field teams, learning, and community." />
          <WorkflowJourney />
        </div>
      </section>

      <section className="px-5 py-16 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Product ecosystem" title="A connected product family, not a single narrow app." body="Every product is labelled honestly so visitors can separate what is live, what is beta, what is in development, and what is planned." />
          <FeatureGrid cards={productFamily} columns="xl:grid-cols-3" />
        </div>
      </section>

      <section className="bg-white px-5 py-16 lg:px-8 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_460px] lg:items-center">
          <div>
            <SectionHeader eyebrow="ERP spotlight" title="Run your trade business from first enquiry to final payment." body="Tradesperson ERP connects CRM, customers, sites, surveys, estimates, quotes, jobs, scheduling, teams, materials, purchasing, documents, invoices, payments, and profitability." align="left" />
            <div className="flex flex-wrap gap-3">
              <Link className="rounded-xl bg-slate-950 px-6 py-3 text-sm font-black text-white" href="/products/erp">Explore Tradesperson ERP</Link>
              <Link className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-black text-slate-800" href={publicLinks.signIn}>Sign In to ERP</Link>
            </div>
          </div>
          <div className="rounded-[2rem] bg-[#0f172a] p-6 text-white shadow-stitch-overlay">
            {["Lead", "Customer", "Site", "Survey", "Estimate", "Quote", "Job", "Schedule", "Team", "Materials", "Purchasing", "Completion", "Invoice", "Payment", "Profitability"].map((step, index) => (
              <div key={step} className="mb-3 flex items-center gap-3 rounded-2xl bg-white/8 p-3 last:mb-0">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-400 font-mono text-sm font-black text-slate-950">{index + 1}</span>
                <span className="font-black">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-16 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="AI and automation" title="Automation that supports people instead of pretending to replace them." body="Tradesperson Network uses honest availability labels so customers see which AI pathways are available, in development, beta, or planned." />
          <FeatureGrid cards={platformCapabilities.slice(2, 6)} columns="xl:grid-cols-4" />
        </div>
      </section>

      <section className="bg-white px-5 py-16 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Mobile experience" title="A field-ready workspace for the team on site." body="Daily jobs, schedules, site information, materials, notes, photos, checklists, signatures, completion, and office-to-field handoff sit inside the wider mobile route." />
          <FeatureGrid cards={platformCapabilities.filter((card) => card.title === "Mobile execution" || card.title === "Customer portal" || card.title === "Supplier network" || card.title === "Payments")} columns="xl:grid-cols-4" />
        </div>
      </section>

      <section className="px-5 py-16 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Customer experience" title="Request, approve, track, document, and pay." body="Customer journeys matter because the product should connect demand, delivery, trust, and payment, not just back-office admin." />
          <FeatureGrid cards={customerExperienceCards} columns="xl:grid-cols-3" />
        </div>
      </section>

      <section className="bg-white px-5 py-16 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Supplier network" title="Connect materials, pricing, orders, and delivery visibility to real jobs." body="Supplier-facing workflows already influence the ERP foundation and expand outward into marketplace and partner routes over time." />
          <FeatureGrid cards={supplierNetworkCards} columns="xl:grid-cols-4" />
        </div>
      </section>

      <section className="px-5 py-16 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Industry solutions" title="One platform, many trades." body="Flooring is one configured industry path inside a broader universal brand. Plumbing, electrical, HVAC, roofing, construction, maintenance, and more belong here too." />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {industries.map((industry) => (
              <Link key={industry.slug} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 transition hover:border-emerald-300 hover:shadow-stitch" href={`/industries/${industry.slug}`}>
                <p className="font-black">{industry.name}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{industry.workflow}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-16 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Integrations" title="Connect accounting, payments, communication, maps, storage, and automation." body="Integrations are described conservatively so the site stays credible while the product grows." />
          <FeatureGrid cards={integrations} columns="xl:grid-cols-4" />
        </div>
      </section>

      <section className="px-5 py-16 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Business outcomes" title="Grow without losing control." body="Operational clarity matters more than invented vanity metrics. The site focuses on believable trade-business outcomes instead of fake percentages." />
          <FeatureGrid cards={businessOutcomes} columns="xl:grid-cols-3" />
        </div>
      </section>

      <section className="bg-white px-5 py-16 lg:px-8 lg:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2">
          <div>
            <SectionHeader eyebrow="Community" title="Profiles, referrals, groups, events, and trade relationships." align="left" />
            <FeatureGrid cards={communityCards} columns="xl:grid-cols-2" />
          </div>
          <div>
            <SectionHeader eyebrow="Marketplace" title="Tools, materials, services, software, finance, and offers." align="left" />
            <FeatureGrid cards={marketplaceCards} columns="xl:grid-cols-2" />
          </div>
        </div>
      </section>

      <section className="px-5 py-16 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Academy and resources" title="Learning, templates, documentation, guides, and updates." body="The broader public site needs a clear knowledge layer, even when some learning products are still planned." />
          <FeatureGrid cards={[...academyCards.slice(0, 4), ...resourceCards.slice(0, 4)]} columns="xl:grid-cols-4" />
        </div>
      </section>

      <section className="bg-white px-5 py-16 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Trust and security" title="Public trust built on real operational controls." body="The public website calls out genuine isolation, roles, sessions, audit patterns, and deployment discipline without making unsupported certification claims." />
          <TrustGrid />
        </div>
      </section>

      <section className="px-5 py-16 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Pricing preview" title="Packages and onboarding pathways shaped for trade growth." body="Commercial guidance is available without publishing unapproved public price points. Visitors can compare commercial routes and book a tailored walkthrough." />
          <PricingCards />
        </div>
      </section>

      <section className="bg-white px-5 py-16 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-5xl">
          <SectionHeader eyebrow="FAQ" title="Straight answers for trade operators." />
          <FaqGrid />
        </div>
      </section>

      <FinalCta />
    </PublicSiteShell>
  );
}

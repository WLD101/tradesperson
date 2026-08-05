import Link from "next/link";
import {
  publicLinks,
} from "./public-site";
import {
  FeatureArticle,
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


const homeProductCards = [
  { title: "Tradesperson ERP", body: "Lead-to-payment operating system for office teams managing customers, jobs, materials, and finance.", href: "/products/erp", icon: productFamily[0]?.icon as any, eyebrow: "For trade businesses", cta: "Explore ERP" },
  { title: "Tradesperson CRM", body: "Lead capture, customer records, sites, surveys, and commercial progression connected to real work.", href: "/products/erp", icon: productFamily[1]?.icon as any, eyebrow: "For sales and office teams", cta: "See CRM workflows" },
  { title: "Tradesperson Mobile", body: "A practical field workspace for tradespeople, supervisors, and mobile delivery teams.", href: "/mobile", icon: productFamily[2]?.icon as any, eyebrow: "For field teams", cta: "View mobile experience" },
  { title: "Tradesperson AI", body: "Human-approved drafting, reminders, summaries, and operational assistance across the network.", href: "/ai", icon: productFamily[3]?.icon as any, eyebrow: "For productivity", cta: "Discover AI" },
  { title: "Tradesperson Payments", body: "Billing, invoice collection, and payment experiences connected back to work delivered.", href: "/pricing", icon: productFamily[5]?.icon as any, eyebrow: "For finance and customers", cta: "View commercial routes" },
  { title: "Tradesperson Directory", body: "Public discovery and trusted trade visibility for customers, businesses, and local demand.", href: "/directory", icon: productFamily[7]?.icon as any, eyebrow: "For discovery", cta: "Explore directory" },
  { title: "Tradesperson Marketplace", body: "Products, materials, services, offers, and suppliers gathered into one trade-focused layer.", href: "/marketplace", icon: productFamily[8]?.icon as any, eyebrow: "For buying and selling", cta: "Visit marketplace" },
  { title: "Tradesperson Community", body: "Relationships, referrals, learning, and network participation across the wider trades sector.", href: "/community", icon: productFamily[9]?.icon as any, eyebrow: "For connection", cta: "Join the community" },
  { title: "Tradesperson Academy", body: "Guides, templates, training, and capability building for the people behind the work.", href: "/academy", icon: productFamily[10]?.icon as any, eyebrow: "For learning", cta: "Explore academy" },
  { title: "Tradesperson Analytics", body: "Signals around receivables, job health, operational control, and business performance.", href: "/products", icon: productFamily[6]?.icon as any, eyebrow: "For decision-making", cta: "See the product family" },
  { title: "Tradesperson Voice", body: "Call handling and voice-led customer workflows positioned inside the broader network story.", href: "/ai", icon: productFamily[4]?.icon as any, eyebrow: "For communications", cta: "Explore AI and voice" },
  { title: "Tradesperson API", body: "Integration surfaces for trusted data exchange, automation, and partner-led connectivity.", href: "/integrations", icon: productFamily[11]?.icon as any, eyebrow: "For partners and developers", cta: "View integrations" },
];

const customerExperienceCards = [
  { title: "Find a tradesperson", body: "Discovery, recommendation, and trusted contact routes built into the wider network identity.", href: "/directory" },
  { title: "Request work", body: "Share requirements, attachments, and site context through a cleaner intake path.", href: "/solutions/customers" },
  { title: "Receive estimate", body: "See commercial clarity earlier in the customer journey.", href: "/solutions/customers" },
  { title: "Approve quote", body: "Move accepted work into live scheduling with fewer handoffs.", href: "/solutions/customers" },
  { title: "Track job", body: "Connect appointments, notes, documents, and updates back to the customer.", href: "/solutions/customers" },
  { title: "View documents and pay", body: "Keep documents and payment actions tied to the work delivered.", href: "/solutions/customers" },
];

const supplierNetworkCards = [
  { title: "Supplier profiles", body: "Create trusted supplier records and public-facing partnership routes.", href: "/solutions/suppliers" },
  { title: "Product catalogues", body: "Structure product records, variants, categories, and attributes for operational use.", href: "/solutions/suppliers" },
  { title: "Price lists", body: "Manage versions, history, imports, and current supplier prices.", href: "/solutions/suppliers" },
  { title: "Purchase orders and deliveries", body: "Connect ordering, goods receipt, and job readiness more tightly.", href: "/solutions/suppliers" },
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
          <SectionHeader eyebrow="Connected ecosystem" title="A universal network where every trade relationship stays connected." body="The ERP matters, but the public identity is broader: customers, suppliers, payments, field teams, learning, community, and business software all belong to one trade operating network." />
          <WorkflowJourney />
        </div>
      </section>

      <section className="px-5 py-16 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Product ecosystem" title="A connected product family, not a single narrow app." body="Tradesperson Network brings together software, mobile, AI, payments, discovery, community, and learning for every side of trade work." />
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {homeProductCards.map((card) => (
              <FeatureArticle key={card.title} card={card} />
            ))}
          </div>
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
            <p className="font-mono text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Commercial workflow</p>
            <div className="mt-5 flex flex-wrap gap-3">
              {["Lead", "Customer", "Survey", "Estimate", "Quote", "Job", "Schedule", "Completion", "Invoice", "Payment"].map((step, index, array) => (
                <div key={step} className="flex items-center gap-3">
                  <div className="rounded-full border border-white/10 bg-white/8 px-4 py-2 text-sm font-black text-white">{step}</div>
                  {index < array.length - 1 ? <span className="font-mono text-xs uppercase tracking-[0.18em] text-emerald-300">→</span> : null}
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/6 p-5">
              <p className="text-sm leading-7 text-slate-300">
                A continuous office-to-field workflow keeps customer context, materials, scheduling, completion, and invoicing connected instead of turning delivery into disconnected handoffs.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="AI and automation" title="Automation that supports people instead of pretending to replace them." body="AI belongs inside a wider ecosystem of office workflows, field execution, customer communication, and commercial follow-through." />
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {platformCapabilities.slice(2, 6).map((card) => (
              <FeatureArticle key={card.title} card={card} />
            ))}
          </div>
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
          <SectionHeader eyebrow="Industry solutions" title="One platform, many trades." body="Tradesperson Network serves multiple sectors across the wider trades economy, with flooring as one example inside a broader universal brand." />
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
          <SectionHeader eyebrow="Academy and resources" title="Learning, templates, documentation, guides, and updates." body="The broader public site needs a clear knowledge layer that helps visitors understand the network, improve operations, and trust the platform." />
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

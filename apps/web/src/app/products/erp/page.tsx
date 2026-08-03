import type { Metadata } from "next";
import { buildPageMetadata } from "@/components/website/site-metadata";
import { erpModules } from "@/components/website/site-data";
import { FeatureGrid, FinalCta, PageHero, PublicSiteShell, SectionHeader, WorkflowJourney } from "@/components/website/public-site";

export const metadata: Metadata = buildPageMetadata({
  path: "/products/erp",
  title: "Tradesperson ERP | Run your trade business from enquiry to payment",
  description: "Tradesperson ERP connects CRM, sites, surveys, estimates, quotes, jobs, scheduling, inventory, suppliers, procurement, invoices, payments, reporting, permissions, and audit logs.",
});

export default function ErpProductPage() {
  return (
    <PublicSiteShell>
      <PageHero
        eyebrow="Tradesperson ERP"
        title="Run your trade business from first enquiry to final payment."
        body="Tradesperson ERP is the operational workspace for trade businesses: CRM, sites, surveys, estimates, quotes, jobs, scheduling, teams, materials, inventory, suppliers, purchasing, invoices, payments, documents, permissions, and audit logs."
        cta={{ label: "Sign In to ERP", href: "/sign-in" }}
        secondaryCta={{ label: "Book a Demo", href: "/book-demo" }}
      />
      <section className="px-5 pb-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Workflow" title="From lead capture to payment and profitability." align="left" />
          <WorkflowJourney />
        </div>
      </section>
      <section className="bg-white px-5 py-16 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="ERP modules" title="Practical operating control without duplicate systems." align="left" />
          <FeatureGrid cards={erpModules} columns="xl:grid-cols-3" />
        </div>
      </section>
      <FinalCta />
    </PublicSiteShell>
  );
}

import type { Metadata } from "next";
import { buildPageMetadata } from "@/components/website/site-metadata";
import { platformCapabilities } from "@/components/website/site-data";
import { EcosystemDiagram, FeatureGrid, FinalCta, PageHero, PublicSiteShell, SectionHeader, WorkflowJourney } from "@/components/website/public-site";

export const metadata: Metadata = buildPageMetadata({
  path: "/platform",
  title: "Platform | One connected operating layer for trades",
  description: "See how Tradesperson Network connects ERP, mobile, customers, suppliers, AI, payments, integrations, community, marketplace, academy, and security.",
});

export default function PlatformPage() {
  return (
    <PublicSiteShell>
      <PageHero
        eyebrow="Platform"
        title="One connected operating layer for the trades industry."
        body="Tradesperson Network connects the people, systems, workflows, materials, documents, automation, and payments behind modern trade work. The ERP is the command centre inside a broader ecosystem."
        cta={{ label: "Explore products", href: "/products" }}
        secondaryCta={{ label: "Book a Demo", href: "/book-demo" }}
      />
      <section className="px-5 pb-16 lg:px-8" id="workflow">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Connected workflow" title="Customer request to payment in one connected path." align="left" />
          <WorkflowJourney />
        </div>
      </section>
      <section className="bg-white px-5 py-16 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Ecosystem diagram" title="ERP, field, customers, suppliers, payments, and AI in one model." align="left" />
          <EcosystemDiagram />
        </div>
      </section>
      <section className="px-5 py-16 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Platform layers" title="Operational workflows, control, and network expansion." align="left" />
          <FeatureGrid cards={platformCapabilities} columns="xl:grid-cols-4" />
        </div>
      </section>
      <FinalCta />
    </PublicSiteShell>
  );
}

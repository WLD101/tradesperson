import type { Metadata } from "next";
import { buildPageMetadata } from "@/components/website/site-metadata";
import { ComparisonTable, FaqGrid, FinalCta, PageHero, PricingCards, PublicSiteShell, SectionHeader } from "@/components/website/public-site";

export const metadata: Metadata = buildPageMetadata({
  path: "/pricing",
  title: "Pricing | Commercial routes for trade businesses",
  description: "Explore Starter, Growth, Multi-Branch, and Enterprise commercial routes for Tradesperson Network with honest availability and onboarding guidance.",
});

export default function PricingPage() {
  return (
    <PublicSiteShell>
      <PageHero
        eyebrow="Pricing"
        title="Commercial routes designed for growing trade businesses."
        body="Tradesperson Network shows package structure and implementation pathways without publishing unapproved public prices. Use this route to compare capabilities and choose the right onboarding conversation."
        cta={{ label: "Book a Demo", href: "/book-demo" }}
        secondaryCta={{ label: "Start Workspace", href: "/website/onboarding" }}
      />
      <section className="px-5 pb-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Plans" title="Starter, Growth, Multi-Branch, and Enterprise." align="left" />
          <PricingCards />
        </div>
      </section>
      <section className="bg-white px-5 py-16 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Comparison" title="Compare commercial pathways across the platform." align="left" />
          <ComparisonTable />
        </div>
      </section>
      <section className="px-5 py-16 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-5xl">
          <SectionHeader eyebrow="FAQ" title="Pricing and onboarding questions." />
          <FaqGrid items={[
            ["Do you publish final public pricing?", "No. This site uses commercial guidance, package structure, and contact routes without inventing unapproved final public prices."],
            ["Can we start with one branch?", "Yes. The commercial structure is designed to support smaller operations as well as larger multi-branch teams."],
            ["What about onboarding?", "Guided onboarding is part of the commercial conversation so rollout matches your team, branch, and workflow needs."],
            ["Are AI and integrations included?", "These are handled according to availability, plan fit, and implementation scope rather than overpromised blanket claims."],
          ]} />
        </div>
      </section>
      <FinalCta />
    </PublicSiteShell>
  );
}

import type { Metadata } from "next";
import { buildPageMetadata } from "@/components/website/site-metadata";
import { solutionRecords } from "@/components/website/site-data";
import { FeatureGrid, FinalCta, PageHero, PublicSiteShell, SectionHeader } from "@/components/website/public-site";

export const metadata: Metadata = buildPageMetadata({
  path: "/solutions",
  title: "Solutions | Audience-specific trade workflows",
  description: "Explore Tradesperson Network solutions for trade businesses, tradespeople, customers, suppliers, and partners.",
});

export default function SolutionsPage() {
  return (
    <PublicSiteShell>
      <PageHero
        eyebrow="Solutions"
        title="Audience-specific routes across the wider trade ecosystem."
        body="Tradesperson Network supports the business, the field, the customer, and the supplier side of trade work without splitting them into disconnected systems."
      />
      <section className="px-5 pb-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Audience routes" title="Choose the solution path that matches your role." align="left" />
          <FeatureGrid cards={solutionRecords.map((solution) => ({
            title: solution.eyebrow.replace("Solutions for ", ""),
            body: solution.body,
            href: `/solutions/${solution.slug}`,
            cta: "View solution",
          }))} columns="xl:grid-cols-4" />
        </div>
      </section>
      <FinalCta />
    </PublicSiteShell>
  );
}

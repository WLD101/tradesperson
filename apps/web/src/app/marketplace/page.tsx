import type { Metadata } from "next";
import { buildPageMetadata } from "@/components/website/site-metadata";
import { marketplaceCards } from "@/components/website/site-data";
import { FeatureGrid, FinalCta, PageHero, PublicSiteShell, SectionHeader } from "@/components/website/public-site";

export const metadata: Metadata = buildPageMetadata({
  path: "/marketplace",
  title: "Marketplace | Materials, services, software, and offers for trades",
  description: "Tradesperson Network Marketplace connects tools, materials, software, finance, insurance, training, and trade services.",
});

export default function MarketplacePage() {
  return (
    <PublicSiteShell>
      <PageHero eyebrow="Marketplace" title="A trade-focused marketplace for products, services, software, and offers." body="Marketplace extends the wider network beyond ERP into procurement visibility, partner offers, and ecosystem commerce." />
      <section className="px-5 pb-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Marketplace categories" title="Materials, services, software, finance, and more." align="left" />
          <FeatureGrid cards={marketplaceCards} columns="xl:grid-cols-3" />
        </div>
      </section>
      <FinalCta />
    </PublicSiteShell>
  );
}

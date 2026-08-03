import type { Metadata } from "next";
import { buildPageMetadata } from "@/components/website/site-metadata";
import { productFamily } from "@/components/website/site-data";
import { FeatureGrid, FinalCta, PageHero, PublicSiteShell, SectionHeader } from "@/components/website/public-site";

export const metadata: Metadata = buildPageMetadata({
  path: "/products",
  title: "Products | Explore the Tradesperson Network product family",
  description: "Explore Tradesperson ERP, CRM, Mobile, AI, Voice, Payments, Analytics, Directory, Marketplace, Community, Academy, and API routes with honest availability labels.",
});

export default function ProductsPage() {
  return (
    <PublicSiteShell>
      <PageHero
        eyebrow="Products"
        title="A product family for every side of trade work."
        body="Tradesperson Network is a connected ecosystem, not a one-industry application. Product routes show what is available today and what remains in development or planned."
      />
      <section className="px-5 pb-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Product family" title="ERP, mobile, AI, payments, marketplace, community, academy, and more." align="left" />
          <FeatureGrid cards={productFamily} columns="xl:grid-cols-3" />
        </div>
      </section>
      <FinalCta />
    </PublicSiteShell>
  );
}

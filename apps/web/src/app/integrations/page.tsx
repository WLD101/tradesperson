import type { Metadata } from "next";
import { buildPageMetadata } from "@/components/website/site-metadata";
import { integrations } from "@/components/website/site-data";
import { FeatureGrid, FinalCta, PageHero, PublicSiteShell, SectionHeader } from "@/components/website/public-site";

export const metadata: Metadata = buildPageMetadata({
  path: "/integrations",
  title: "Integrations | Accounting, payments, communication, maps, storage, and APIs",
  description: "Tradesperson Network integrations cover accounting, billing, communication, scheduling, maps, storage, automation, and future APIs.",
});

export default function IntegrationsPage() {
  return (
    <PublicSiteShell>
      <PageHero eyebrow="Integrations" title="Connect accounting, payments, communication, maps, storage, automation, and APIs." body="The integration surface is described conservatively so the public site stays credible while the connected platform grows over time." />
      <section className="px-5 pb-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Integration categories" title="Trusted categories with honest availability labels." align="left" />
          <FeatureGrid cards={integrations} columns="xl:grid-cols-4" />
        </div>
      </section>
      <FinalCta />
    </PublicSiteShell>
  );
}

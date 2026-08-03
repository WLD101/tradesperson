import type { Metadata } from "next";
import { buildPageMetadata } from "@/components/website/site-metadata";
import { resourceCards } from "@/components/website/site-data";
import { FeatureGrid, FinalCta, PageHero, PublicSiteShell, SectionHeader } from "@/components/website/public-site";

export const metadata: Metadata = buildPageMetadata({
  path: "/resources",
  title: "Resources | Guides, documentation, updates, and support",
  description: "Tradesperson Network resources include guides, templates, documentation, help, updates, roadmap communication, and public trust routes.",
});

export default function ResourcesPage() {
  return (
    <PublicSiteShell>
      <PageHero eyebrow="Resources" title="Guides, documentation, templates, updates, and support for modern trade operators." body="The public resource layer gives trade businesses a clearer place to learn, prepare, and stay informed about the platform." />
      <section className="px-5 pb-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Resource centre" title="Knowledge, documentation, updates, and help." align="left" />
          <FeatureGrid cards={resourceCards} columns="xl:grid-cols-3" />
        </div>
      </section>
      <FinalCta />
    </PublicSiteShell>
  );
}

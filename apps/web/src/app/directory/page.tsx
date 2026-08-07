import type { Metadata } from "next";
import { buildPageMetadata } from "@/components/website/site-metadata";
import { FeatureGrid, FinalCta, PageHero, PublicSiteShell, SectionHeader } from "@/components/website/public-site";

export const metadata: Metadata = buildPageMetadata({
  path: "/directory",
  title: "Directory | Find and be found in the trade network",
  description: "Tradesperson Network Directory is the future discovery layer for professional profiles, locations, quote requests, and trusted trade visibility.",
});

const cards = [
  { title: "Professional profiles", body: "Support verified identity, trade categories, service areas, and capability context." },
  { title: "Customer requests", body: "Connect demand generation with profile visibility and quote opportunity flow." },
  { title: "Reviews and trust", body: "Bring reputation and proof closer to the wider customer journey." },
  { title: "Local discovery", body: "Map regional supply and service availability across the wider trade network." },
];

export default function DirectoryPage() {
  return (
    <PublicSiteShell>
      <PageHero eyebrow="Directory" title="A future public discovery layer for the trade ecosystem." body="The directory route supports how customers find professionals and how trade businesses build trusted public visibility over time." />
      <section className="px-5 pb-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Directory roadmap" title="Profiles, discovery, trust, and demand." align="left" />
          <FeatureGrid cards={cards} columns="xl:grid-cols-4" />
        </div>
      </section>
      <FinalCta />
    </PublicSiteShell>
  );
}

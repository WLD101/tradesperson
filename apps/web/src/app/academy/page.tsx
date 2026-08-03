import type { Metadata } from "next";
import { buildPageMetadata } from "@/components/website/site-metadata";
import { academyCards } from "@/components/website/site-data";
import { FeatureGrid, FinalCta, PageHero, PublicSiteShell, SectionHeader } from "@/components/website/public-site";

export const metadata: Metadata = buildPageMetadata({
  path: "/academy",
  title: "Academy | Courses, templates, webinars, and trade learning",
  description: "Tradesperson Network Academy supports business courses, trade learning, product training, certifications, and templates.",
});

export default function AcademyPage() {
  return (
    <PublicSiteShell>
      <PageHero eyebrow="Academy" title="Learning, templates, training, and capability growth for the trade ecosystem." body="Academy brings business learning, practical trade resources, webinars, templates, and product guidance into the wider network direction." />
      <section className="px-5 pb-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Learning layers" title="Courses, templates, webinars, and certifications." align="left" />
          <FeatureGrid cards={academyCards} columns="xl:grid-cols-3" />
        </div>
      </section>
      <FinalCta />
    </PublicSiteShell>
  );
}

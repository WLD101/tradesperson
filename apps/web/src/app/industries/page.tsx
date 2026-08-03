import type { Metadata } from "next";
import { buildPageMetadata } from "@/components/website/site-metadata";
import { industries } from "@/components/website/site-data";
import { FinalCta, LinkCardGrid, PageHero, PublicSiteShell, SectionHeader } from "@/components/website/public-site";

export const metadata: Metadata = buildPageMetadata({
  path: "/industries",
  title: "Industries | Universal trade workflows across many sectors",
  description: "Explore Tradesperson Network industry pages for plumbing, electrical, HVAC, roofing, flooring, painting, maintenance, construction, facilities, and more.",
});

export default function IndustriesPage() {
  return (
    <PublicSiteShell>
      <PageHero
        eyebrow="Industries"
        title="Built for trades, configured by industry."
        body="Flooring is the first deeply configured workflow, but the public brand and wider platform direction are universal across many trades."
      />
      <section className="px-5 pb-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Industry solutions" title="Every trade has a workflow. The network gives each one a home." align="left" />
          <LinkCardGrid basePath="/industries" items={industries} />
        </div>
      </section>
      <FinalCta />
    </PublicSiteShell>
  );
}

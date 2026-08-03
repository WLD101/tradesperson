import type { Metadata } from "next";
import { buildPageMetadata } from "@/components/website/site-metadata";
import { communityCards } from "@/components/website/site-data";
import { FeatureGrid, FinalCta, PageHero, PublicSiteShell, SectionHeader } from "@/components/website/public-site";

export const metadata: Metadata = buildPageMetadata({
  path: "/community",
  title: "Community | Profiles, groups, referrals, and trade relationships",
  description: "Tradesperson Network community connects professional profiles, local groups, jobs boards, supplier offers, events, and knowledge sharing.",
});

export default function CommunityPage() {
  return (
    <PublicSiteShell>
      <PageHero eyebrow="Community" title="Profiles, groups, referrals, jobs, and trade relationships." body="Community is part of the broader network direction: connecting trade professionals, partners, events, and learning without creating a disconnected microsite." />
      <section className="px-5 pb-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Community pillars" title="How the trade network expands beyond software." align="left" />
          <FeatureGrid cards={communityCards} columns="xl:grid-cols-3" />
        </div>
      </section>
      <FinalCta />
    </PublicSiteShell>
  );
}

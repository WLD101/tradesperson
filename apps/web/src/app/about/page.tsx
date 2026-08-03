import type { Metadata } from "next";
import { buildPageMetadata } from "@/components/website/site-metadata";
import { FeatureGrid, FinalCta, PageHero, PublicSiteShell, SectionHeader } from "@/components/website/public-site";

export const metadata: Metadata = buildPageMetadata({
  path: "/about",
  title: "About | Why Tradesperson Network exists",
  description: "Learn the mission, vision, and product direction behind Tradesperson Network and the goal of connecting the wider trades ecosystem.",
});

const aboutCards = [
  { title: "Mission", body: "Connect trade businesses, tradespeople, customers, suppliers, partners, and learning into one digital world for trades." },
  { title: "Vision", body: "Replace fragmented trade-industry tooling with one connected ecosystem that supports the full customer-to-payment journey." },
  { title: "Why now", body: "Trade businesses still lose time and clarity across spreadsheets, messages, disconnected job apps, and weak handoffs." },
  { title: "Values", body: "Practicality, clarity, honesty, control, and trust matter more than hype." },
  { title: "Team and founder", body: "Public placeholders keep the route ready for real story and leadership detail without inventing bios." },
  { title: "Careers", body: "Growth in product, engineering, operations, and trade partnerships belongs in the long-term company story." },
];

export default function AboutPage() {
  return (
    <PublicSiteShell>
      <PageHero eyebrow="About" title="Why Tradesperson Network exists." body="The trades industry is full of fragmented systems, disconnected handoffs, and duplicated admin. Tradesperson Network exists to connect the wider trade ecosystem into one digital world." />
      <section className="px-5 pb-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Company story" title="Mission, vision, values, and the connected ecosystem problem." align="left" />
          <FeatureGrid cards={aboutCards} columns="xl:grid-cols-3" />
        </div>
      </section>
      <FinalCta />
    </PublicSiteShell>
  );
}

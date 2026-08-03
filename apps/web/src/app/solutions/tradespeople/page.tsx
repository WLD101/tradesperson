import type { Metadata } from "next";
import { buildPageMetadata } from "@/components/website/site-metadata";
import { solutionRecords } from "@/components/website/site-data";
import { FinalCta, PublicSiteShell, SolutionTemplate } from "@/components/website/public-site";

export const metadata: Metadata = buildPageMetadata({
  path: "/solutions/tradespeople",
  title: "Solutions for Tradespeople | Field-ready daily job workflows",
  description: "Tradesperson Network supports tradespeople with schedules, site details, notes, media capture, checklists, completion, and office sync.",
});

export default function TradespeopleSolutionPage() {
  const solution = solutionRecords.find((item) => item.slug === "tradespeople")!;
  return (
    <PublicSiteShell>
      <SolutionTemplate solution={solution} />
      <FinalCta />
    </PublicSiteShell>
  );
}

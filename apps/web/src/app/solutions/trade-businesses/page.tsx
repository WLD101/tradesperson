import type { Metadata } from "next";
import { buildPageMetadata } from "@/components/website/site-metadata";
import { solutionRecords } from "@/components/website/site-data";
import { FinalCta, PublicSiteShell, SolutionTemplate } from "@/components/website/public-site";

export const metadata: Metadata = buildPageMetadata({
  path: "/solutions/trade-businesses",
  title: "Solutions for Trade Businesses | Connected lead-to-payment operations",
  description: "Tradesperson Network helps trade businesses connect CRM, jobs, teams, materials, invoices, payments, and profitability.",
});

export default function TradeBusinessesSolutionPage() {
  const solution = solutionRecords.find((item) => item.slug === "trade-businesses")!;
  return (
    <PublicSiteShell>
      <SolutionTemplate solution={solution} />
      <FinalCta />
    </PublicSiteShell>
  );
}

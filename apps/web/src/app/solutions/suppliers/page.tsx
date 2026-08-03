import type { Metadata } from "next";
import { buildPageMetadata } from "@/components/website/site-metadata";
import { solutionRecords } from "@/components/website/site-data";
import { FinalCta, PublicSiteShell, SolutionTemplate } from "@/components/website/public-site";

export const metadata: Metadata = buildPageMetadata({
  path: "/solutions/suppliers",
  title: "Solutions for Suppliers and Partners | Connected supplier workflows",
  description: "Tradesperson Network supports product listings, price lists, purchase orders, deliveries, offers, and partnerships for suppliers and partners.",
});

export default function SuppliersSolutionPage() {
  const solution = solutionRecords.find((item) => item.slug === "suppliers")!;
  return (
    <PublicSiteShell>
      <SolutionTemplate solution={solution} />
      <FinalCta />
    </PublicSiteShell>
  );
}

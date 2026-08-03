import type { Metadata } from "next";
import { buildPageMetadata } from "@/components/website/site-metadata";
import { solutionRecords } from "@/components/website/site-data";
import { FinalCta, PublicSiteShell, SolutionTemplate } from "@/components/website/public-site";

export const metadata: Metadata = buildPageMetadata({
  path: "/solutions/customers",
  title: "Solutions for Customers | Request, approve, track, and pay",
  description: "Tradesperson Network supports cleaner customer journeys for requests, approvals, appointments, documents, invoices, and payments.",
});

export default function CustomersSolutionPage() {
  const solution = solutionRecords.find((item) => item.slug === "customers")!;
  return (
    <PublicSiteShell>
      <SolutionTemplate solution={solution} />
      <FinalCta />
    </PublicSiteShell>
  );
}

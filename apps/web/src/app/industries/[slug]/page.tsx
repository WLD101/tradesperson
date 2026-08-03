import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildPageMetadata } from "@/components/website/site-metadata";
import { industries } from "@/components/website/site-data";
import { FinalCta, IndustryTemplate, PublicSiteShell } from "@/components/website/public-site";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const industry = industries.find((item) => item.slug === slug);
  if (!industry) return {};
  return buildPageMetadata({
    path: `/industries/${slug}`,
    title: `${industry.name} trade workflows | Tradesperson Network`,
    description: `${industry.name} workflow page for Tradesperson Network with transparent availability, connected modules, mobile direction, customer experience, and operational outcomes.`,
  });
}

export function generateStaticParams() {
  return industries.map((industry) => ({ slug: industry.slug }));
}

export default async function IndustryDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const industry = industries.find((item) => item.slug === slug);
  if (!industry) notFound();
  return (
    <PublicSiteShell>
      <IndustryTemplate industry={industry} />
      <FinalCta />
    </PublicSiteShell>
  );
}

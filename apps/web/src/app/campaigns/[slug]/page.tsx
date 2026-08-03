import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { campaignRecords } from "@/components/website/site-data";
import { buildPageMetadata } from "@/components/website/site-metadata";
import { CampaignTemplate, FinalCta, PublicSiteShell } from "@/components/website/public-site";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const campaign = campaignRecords.find((item) => item.slug === slug);
  if (!campaign) return {};
  return buildPageMetadata({
    path: `/campaigns/${slug}`,
    title: `${campaign.title} | Tradesperson Network`,
    description: campaign.body,
  });
}

export function generateStaticParams() {
  return campaignRecords.map((campaign) => ({ slug: campaign.slug }));
}

export default async function CampaignPage({ params }: PageProps) {
  const { slug } = await params;
  const campaign = campaignRecords.find((item) => item.slug === slug);
  if (!campaign) notFound();
  return (
    <PublicSiteShell>
      <CampaignTemplate campaign={campaign} />
      <FinalCta />
    </PublicSiteShell>
  );
}

import type { Metadata } from "next";
import { buildPageMetadata } from "@/components/website/site-metadata";
import { FeatureGrid, FinalCta, PageHero, PublicSiteShell, SectionHeader } from "@/components/website/public-site";

export const metadata: Metadata = buildPageMetadata({
  path: "/ai",
  title: "Tradesperson AI | Human-approved automation for trade workflows",
  description: "Explore AI receptionist, lead qualification, drafting, reminders, scheduling support, job summaries, and operational insights for Tradesperson Network.",
});

const aiCards = [
  { title: "AI receptionist", body: "Missed-call support and front-door lead capture are part of the communications roadmap." },
  { title: "Lead qualification", body: "Support faster response and structured follow-up with human oversight." },
  { title: "Estimate assistance", body: "Help estimators draft structured commercial outputs faster." },
  { title: "Quote drafting", body: "Use AI to reduce repetitive writing while keeping approval in human hands." },
  { title: "Customer messaging", body: "Support reminders and clearer communication without losing control of tone and timing." },
  { title: "Scheduling support", body: "Assist planners with trade-off visibility and job coordination." },
  { title: "Job summaries", body: "Condense notes, activity, and handover information for better office visibility." },
  { title: "Invoice reminders", body: "Help collections and customer follow-up stay consistent." },
  { title: "Operational insights", body: "Surface patterns around workload, response speed, and performance." },
  { title: "Privacy and approval", body: "AI routes remain availability-labelled and human-approved rather than overstated as autonomous." },
];

export default function AiPage() {
  return (
    <PublicSiteShell>
      <PageHero
        eyebrow="Tradesperson AI"
        title="Automation and AI that support trade operators without pretending to replace them."
        body="The AI route focuses on receptionist support, drafting, reminders, summaries, and operational insight while keeping humans in control of customer experience and commercial decisions."
        cta={{ label: "Book a Demo", href: "/book-demo" }}
        secondaryCta={{ label: "Explore platform", href: "/platform" }}
      />
      <section className="px-5 pb-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="AI capabilities" title="Reception, drafting, reminders, summaries, and insights." align="left" />
          <FeatureGrid cards={aiCards} columns="xl:grid-cols-3" />
        </div>
      </section>
      <FinalCta />
    </PublicSiteShell>
  );
}

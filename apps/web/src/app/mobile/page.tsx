import type { Metadata } from "next";
import { buildPageMetadata } from "@/components/website/site-metadata";
import { FeatureGrid, FinalCta, PageHero, PublicSiteShell, SectionHeader } from "@/components/website/public-site";

export const metadata: Metadata = buildPageMetadata({
  path: "/mobile",
  title: "Tradesperson Mobile | Field-ready workflows for trade teams",
  description: "Explore daily jobs, schedules, site details, notes, photos, checklists, signatures, completion, and office sync in the Tradesperson mobile experience.",
});

const mobileCards = [
  { title: "Today’s jobs", body: "Open daily work quickly without chasing messages or calls.", status: "Beta" as const },
  { title: "Schedule", body: "Keep dates, appointments, and branch-aware job timing visible in the field.", status: "Beta" as const },
  { title: "Site details", body: "Carry addresses, contacts, notes, and access context to the point of work.", status: "Beta" as const },
  { title: "Navigation", body: "Map and travel patterns belong close to the schedule and site.", status: "Planned" as const },
  { title: "Materials", body: "Keep job materials, issues, and readiness visible to field teams.", status: "Beta" as const },
  { title: "Photos and notes", body: "Record progress, issues, and proof while the work is happening.", status: "Beta" as const },
  { title: "Voice notes", body: "Reduce friction for field updates and handovers.", status: "Planned" as const },
  { title: "Checklists", body: "Keep completion and compliance steps consistent across teams.", status: "Beta" as const },
  { title: "Signature and completion", body: "Capture sign-off and close-out with clearer handover records.", status: "Beta" as const },
  { title: "Office sync", body: "Move field context back into the wider ERP and customer journey.", status: "Beta" as const },
];

export default function MobilePage() {
  return (
    <PublicSiteShell>
      <PageHero
        eyebrow="Tradesperson Mobile"
        title="A practical field workspace for the team on site."
        body="Tradesperson Mobile connects the office and field with schedules, site details, media capture, notes, checklists, completion, and handover context."
        cta={{ label: "Book a Demo", href: "/book-demo" }}
        secondaryCta={{ label: "Explore ERP", href: "/products/erp" }}
      />
      <section className="px-5 pb-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Field workflows" title="Daily jobs, job context, capture, and completion." align="left" />
          <FeatureGrid cards={mobileCards} columns="xl:grid-cols-3" />
        </div>
      </section>
      <FinalCta />
    </PublicSiteShell>
  );
}

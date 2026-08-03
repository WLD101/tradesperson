import type { Metadata } from "next";
import { buildPageMetadata } from "@/components/website/site-metadata";
import { FaqGrid, FinalCta, PageHero, PublicSiteShell, SectionHeader, TrustGrid } from "@/components/website/public-site";

export const metadata: Metadata = buildPageMetadata({
  path: "/security",
  title: "Security | Isolation, sessions, permissions, and public trust",
  description: "Tradesperson Network security covers tenant isolation, branch controls, secure sessions, roles, audit logs, privacy, backups, and responsible operations.",
});

export default function SecurityPage() {
  return (
    <PublicSiteShell>
      <PageHero eyebrow="Security" title="Public trust built on real operational controls." body="Tradesperson Network highlights the security patterns that are actually part of the product and deployment discipline: isolation, branch controls, permissions, sessions, audit logging, and privacy-aware operations." />
      <section className="px-5 pb-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader eyebrow="Security pillars" title="Isolation, access, logging, backups, and response." align="left" />
          <TrustGrid />
        </div>
      </section>
      <section className="bg-white px-5 py-16 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-5xl">
          <SectionHeader eyebrow="FAQ" title="Security and privacy questions." />
          <FaqGrid items={[
            ["Do you claim unsupported certifications?", "No. This page avoids unverified certification claims and focuses on the security patterns actually represented in the product and deployment process."],
            ["What access controls exist?", "Tenant context, branch isolation, roles, permissions, and session controls are core architecture principles."],
            ["Are actions auditable?", "Yes. Audit logging is part of the wider control model and is represented honestly across the site."],
            ["How should incidents be reported?", "Responsible disclosure and support routes belong here as the public security contact surface."],
          ]} />
        </div>
      </section>
      <FinalCta />
    </PublicSiteShell>
  );
}

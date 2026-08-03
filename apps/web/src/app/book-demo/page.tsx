import type { Metadata } from "next";
import { buildPageMetadata } from "@/components/website/site-metadata";
import { ContactForm, PageHero, PublicSiteShell } from "@/components/website/public-site";

export const metadata: Metadata = buildPageMetadata({
  path: "/book-demo",
  title: "Book a Demo | See Tradesperson Network in action",
  description: "Book a guided demo of Tradesperson Network for your trade business, workflow, team size, and operational goals.",
});

export default function BookDemoPage() {
  return (
    <PublicSiteShell>
      <PageHero eyebrow="Book a Demo" title="See how the connected trade platform fits your business." body="Tell us about your industry, team size, current software, and main operational challenge so the walkthrough matches the way your trade business actually works." />
      <ContactForm mode="demo" />
    </PublicSiteShell>
  );
}

import type { Metadata } from "next";
import { buildPageMetadata } from "@/components/website/site-metadata";
import { ContactForm, PageHero, PublicSiteShell } from "@/components/website/public-site";

export const metadata: Metadata = buildPageMetadata({
  path: "/contact",
  title: "Contact | Talk to Tradesperson Network",
  description: "Contact Tradesperson Network about demos, onboarding, partnerships, product questions, and trade-industry workflows.",
});

export default function ContactPage() {
  return (
    <PublicSiteShell>
      <PageHero eyebrow="Contact" title="Talk to the team about your trade workflow." body="Use this route for product questions, partnerships, onboarding discussions, or broader trade-network conversations." />
      <ContactForm mode="contact" />
    </PublicSiteShell>
  );
}

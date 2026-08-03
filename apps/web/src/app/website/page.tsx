import type { Metadata } from "next";
import { PublicHomePage } from "@/components/website/public-home-page";
import { buildPageMetadata } from "@/components/website/site-metadata";

export const metadata: Metadata = buildPageMetadata({
  path: "/website",
  title: "Tradesperson Network Website | The digital world for trades",
  description: "Legacy website route that now renders the universal Tradesperson Network homepage inside the main Next.js application.",
});

export default function WebsiteHomePage() {
  return <PublicHomePage />;
}

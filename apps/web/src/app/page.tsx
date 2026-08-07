import type { Metadata } from "next";
import { PublicHomePage } from "@/components/website/public-home-page";
import { buildPageMetadata } from "@/components/website/site-metadata";

export const metadata: Metadata = buildPageMetadata({
  path: "/",
  title: "Tradesperson Network",
  description: "One connected network for every trade, every customer, and every job. Explore Tradesperson Network across ERP, mobile, suppliers, customers, AI, payments, and community.",
});

export default function HomePage() {
  return <PublicHomePage />;
}

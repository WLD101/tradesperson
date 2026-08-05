import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tradesperson.net";

const publicRoutes = [
  "/",
  "/platform",
  "/products",
  "/products/erp",
  "/ai",
  "/mobile",
  "/solutions",
  "/solutions/trade-businesses",
  "/solutions/tradespeople",
  "/solutions/customers",
  "/solutions/suppliers",
  "/industries",
  "/community",
  "/directory",
  "/marketplace",
  "/academy",
  "/integrations",
  "/pricing",
  "/resources",
  "/about",
  "/security",
  "/contact",
  "/book-demo",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return publicRoutes.map((route) => ({
    url: new URL(route, siteUrl).toString(),
    lastModified: now,
    changeFrequency: route === "/" ? "daily" : "weekly",
    priority: route === "/" ? 1 : route === "/pricing" || route === "/products/erp" ? 0.9 : 0.8,
  }));
}

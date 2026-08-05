import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tradesperson.net";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
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
        ],
        disallow: [
          "/app",
          "/app/",
          "/auth",
          "/auth/",
          "/portal",
          "/portal/",
          "/select-tenant",
          "/sign-in",
          "/sign-up",
          "/email-otp",
          "/forgot-password",
          "/reset-password",
          "/tenant-creation",
          "/verify-email",
          "/website/onboarding",
          "/invitations",
          "/invitations/",
          "/api",
          "/api/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

import { expect, test } from "@playwright/test";

const publicRoutes = [
  { href: "/", heading: "The digital world for trades." },
  { href: "/platform", heading: "One connected operating layer for the trades industry." },
  { href: "/products", heading: "A product family for every side of trade work." },
  { href: "/products/erp", heading: "Run your trade business from first enquiry to final payment." },
  { href: "/ai", heading: "Automation and AI that support trade operators without pretending to replace them." },
  { href: "/mobile", heading: "A practical field workspace for the team on site." },
  { href: "/solutions", heading: "Audience-specific routes across the wider trade ecosystem." },
  { href: "/solutions/trade-businesses", heading: "Run your trade business with one connected operating layer." },
  { href: "/solutions/tradespeople", heading: "Give every tradesperson a practical field workspace." },
  { href: "/solutions/customers", heading: "Create a cleaner customer journey from request to payment." },
  { href: "/solutions/suppliers", heading: "Connect suppliers and partners to real trade workflows." },
  { href: "/industries", heading: "Built for trades, configured by industry." },
  { href: "/industries/flooring", heading: "Flooring workflows on a connected trade platform." },
  { href: "/community", heading: "Profiles, groups, referrals, jobs, and trade relationships." },
  { href: "/directory", heading: "A future public discovery layer for the trade ecosystem." },
  { href: "/marketplace", heading: "A trade-focused marketplace for products, services, software, and offers." },
  { href: "/academy", heading: "Learning, templates, training, and capability growth for the trade ecosystem." },
  { href: "/integrations", heading: "Connect accounting, payments, communication, maps, storage, automation, and APIs." },
  { href: "/pricing", heading: "Commercial routes designed for growing trade businesses." },
  { href: "/resources", heading: "Guides, documentation, templates, updates, and support for modern trade operators." },
  { href: "/about", heading: "Why Tradesperson Network exists." },
  { href: "/security", heading: "Public trust built on real operational controls." },
  { href: "/contact", heading: "Talk to the team about your trade workflow." },
  { href: "/book-demo", heading: "See how the connected trade platform fits your business." },
  { href: "/campaigns/manage-your-trade-business", heading: "Manage your trade business with one connected operating layer." },
] as const;

function trackRuntimeIssues(page: import("@playwright/test").Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedResponses: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  page.on("response", (response) => {
    const url = response.url();
    if (response.status() >= 400 && !url.includes("/_next/")) {
      failedResponses.push(`${response.status()} ${url}`);
    }
  });

  return { consoleErrors, pageErrors, failedResponses };
}

test.describe("Public website", () => {
  test("renders the redesigned homepage, navigation, and primary public actions", async ({ page }) => {
    const runtimeIssues = trackRuntimeIssues(page);

    await page.goto("/");

    await expect(page.getByRole("heading", { name: "The digital world for trades." })).toBeVisible();
    await expect(page.getByText("Digital ecosystem for trades")).toBeVisible();
    await expect(page.getByText("A connected product family, not a single narrow app.")).toBeVisible();
    await expect(page.getByText("Every important relationship in trade work connected in one operating layer.")).toBeVisible();

    const publicNav = page.getByLabel("Public navigation");
    await expect(publicNav.getByRole("button", { name: "Platform" })).toBeVisible();
    await expect(publicNav.getByRole("button", { name: "Products" })).toBeVisible();
    await expect(publicNav.getByRole("button", { name: "Solutions" })).toBeVisible();
    await expect(publicNav.getByRole("link", { name: "Industries" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign In" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Book a Demo" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Start Workspace" }).first()).toBeVisible();

    await publicNav.getByRole("button", { name: "Platform" }).hover();
    await expect(page.getByRole("link", { name: "Platform Overview" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Automation" })).toBeVisible();

    await publicNav.getByRole("button", { name: "Products" }).hover();
    await expect(page.getByRole("link", { name: "Tradesperson ERP" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Tradesperson API" })).toBeVisible();

    await publicNav.getByRole("button", { name: "Solutions" }).hover();
    await expect(page.getByRole("link", { name: /Trade Businesses CRM to/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Customers Request work, approve, track, pay, review\./i })).toBeVisible();

    const desktopHeader = page.locator("header");

    await page.goto("/");
    await Promise.all([
      page.waitForURL(/\/book-demo$/),
      desktopHeader.getByRole("link", { name: "Book a Demo", exact: true }).click(),
    ]);

    await page.goto("/");
    await Promise.all([
      page.waitForURL(/\/sign-in$/),
      desktopHeader.getByRole("link", { name: "Sign In", exact: true }).click(),
    ]);

    await page.goto("/");
    await Promise.all([
      page.waitForURL(/\/website\/onboarding$/),
      desktopHeader.getByRole("link", { name: "Start Workspace", exact: true }).click(),
    ]);

    expect(runtimeIssues.consoleErrors, `Console errors found:\n${runtimeIssues.consoleErrors.join("\n")}`).toEqual([]);
    expect(runtimeIssues.pageErrors, `Page errors found:\n${runtimeIssues.pageErrors.join("\n")}`).toEqual([]);
    expect(runtimeIssues.failedResponses, `Failed responses found:\n${runtimeIssues.failedResponses.join("\n")}`).toEqual([]);
  });

  test("resolves the first half of the public route inventory without errors", async ({ page }) => {
    const runtimeIssues = trackRuntimeIssues(page);
    const firstHalf = publicRoutes.slice(0, 13);

    for (const route of firstHalf) {
      const response = await page.goto(route.href, { waitUntil: "domcontentloaded" });
      expect(response?.status(), `${route.href} returned an unexpected status`).toBeLessThan(400);
      const h1 = page.locator("h1");
      await expect(h1).toHaveCount(1);
      await expect(h1).toHaveText(route.heading);
      await expect(page.locator("footer")).toBeVisible();
      await expect(page.locator("body")).not.toContainText("This page could not be found");
    }

    expect(runtimeIssues.consoleErrors, `Console errors found:\n${runtimeIssues.consoleErrors.join("\n")}`).toEqual([]);
    expect(runtimeIssues.pageErrors, `Page errors found:\n${runtimeIssues.pageErrors.join("\n")}`).toEqual([]);
    expect(runtimeIssues.failedResponses, `Failed responses found:\n${runtimeIssues.failedResponses.join("\n")}`).toEqual([]);
  });

  test("resolves the second half of the public route inventory without errors", async ({ page }) => {
    const runtimeIssues = trackRuntimeIssues(page);
    const secondHalf = publicRoutes.slice(13);

    for (const route of secondHalf) {
      const response = await page.goto(route.href, { waitUntil: "domcontentloaded" });
      expect(response?.status(), `${route.href} returned an unexpected status`).toBeLessThan(400);
      const h1 = page.locator("h1");
      await expect(h1).toHaveCount(1);
      await expect(h1).toHaveText(route.heading);
      await expect(page.locator("footer")).toBeVisible();
      await expect(page.locator("body")).not.toContainText("This page could not be found");
    }

    expect(runtimeIssues.consoleErrors, `Console errors found:\n${runtimeIssues.consoleErrors.join("\n")}`).toEqual([]);
    expect(runtimeIssues.pageErrors, `Page errors found:\n${runtimeIssues.pageErrors.join("\n")}`).toEqual([]);
    expect(runtimeIssues.failedResponses, `Failed responses found:\n${runtimeIssues.failedResponses.join("\n")}`).toEqual([]);
  });

  test("keeps the mobile public site free of horizontal overflow", async ({ page }) => {
    const runtimeIssues = trackRuntimeIssues(page);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    await page.getByRole("button", { name: "Open menu" }).click();
    const mobileHeader = page.locator("header");
    await expect(mobileHeader.getByText("Explore the network across platform, products, industries, community, and commercial entry points.")).toBeVisible();
    await expect(mobileHeader.getByRole("link", { name: "Solutions Audience-specific journeys and use cases." })).toBeVisible();
    await expect(mobileHeader.getByRole("link", { name: "Start Workspace" })).toBeVisible();
    await Promise.all([
      page.waitForURL(/\/solutions$/),
      mobileHeader.getByRole("link", { name: "Solutions Audience-specific journeys and use cases." }).click(),
    ]);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    expect(runtimeIssues.consoleErrors, `Console errors found:\n${runtimeIssues.consoleErrors.join("\n")}`).toEqual([]);
    expect(runtimeIssues.pageErrors, `Page errors found:\n${runtimeIssues.pageErrors.join("\n")}`).toEqual([]);
  });
});

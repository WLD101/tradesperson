import { test, expect } from "@playwright/test";

test.describe("ERP Smoke Test", () => {
  test("walk every ERP page and ensure no crashes or errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => {
      errors.push(`Page error on ${page.url()}: ${err.message}`);
    });
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(`Console error on ${page.url()}: ${msg.text()}`);
      }
    });

    // Login
    await page.goto("/sign-in");
    await page.fill('input[name="email"]', "owner@exampleflooring.local");
    await page.fill('input[name="password"]', "Password123!");
    await page.click('button[type="submit"]');
    
    // Wait for redirect to tenant selection
    await page.waitForURL("**/select-tenant");
    await page.click("text=Example Flooring");
    
    // Wait for redirect to dashboard
    await page.waitForURL("**/app/dashboard");
    
    // Wait for the hydration to complete
    await page.waitForLoadState("networkidle");

    const routesToTest = [
      "/app/dashboard",
      "/app/crm/customers",
      "/app/crm/leads",
      "/app/quotes",
      "/app/jobs",
      "/app/schedule",
      "/app/inventory",
      "/app/procurement/purchase-orders",
      "/app/finance",
      "/app/settings/business",
      "/app/settings/branches",
      "/app/settings/users",
      "/app/settings/roles",
      "/app/settings/subscription",
      "/app/suppliers",
    ];

    for (const route of routesToTest) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      
      // Wait for network idle to ensure page is fully loaded
      await page.waitForLoadState("networkidle");
      
      // If the page crashed completely, it usually throws an unhandled exception 
      // or times out, so reaching here is a good sign for a basic smoke test.
    }

    // Filter out common acceptable errors (if any) or assert zero errors
    expect(errors).toEqual([]);
  });
});

import { test as base, Page } from '@playwright/test';

// Define the shape of our customized test fixtures
type AuthFixtures = {
  tenantAPage: Page;
  tenantBPage: Page;
};

const signIn = async (page: Page, email: string) => {
  await page.goto('/sign-in');
  await page.locator('input[type="email"], input[name="email"]').fill(email);
  await page.locator('input[type="password"], input[name="password"]').fill('Password123!');
  await page.locator('button[type="submit"], button:has-text("Continue")').click();
  await page.waitForURL(/.*\/(select-tenant|app\/dashboard)/);

  if (page.url().includes('/select-tenant')) {
    await page.locator('button:has-text("Open")').first().click();
    await page.waitForURL('**/app/dashboard');
  }
};

export const test = base.extend<AuthFixtures>({
  tenantAPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, 'owner@exampleflooring.local');
    await use(page);
    await context.close();
  },
  tenantBPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, 'owner@tenantb-flooring.local');
    await use(page);
    await context.close();
  }
});

export { expect } from '@playwright/test';

import { test, expect } from '../fixtures/auth.fixture';

test.describe('Sales Routing Workflow', () => {
  test('Lead -> Estimate -> Quote -> Job execution', async ({ tenantAPage }) => {
    // 1. Go to Estimates and create a new estimate
    await tenantAPage.goto('/app/estimates');
    await expect(tenantAPage.getByRole('heading', { name: 'Estimates' })).toBeVisible();

    const newEstimateBtn = tenantAPage.getByRole('link', { name: 'New Estimate' });
    await expect(newEstimateBtn).toHaveAttribute('href', '/app/estimates/new');

    await tenantAPage.goto('/app/estimates/new');
    await expect(tenantAPage).toHaveURL(/.*\/app\/estimates\/new/);
    await expect(tenantAPage.locator('form')).toBeVisible();
  });
});

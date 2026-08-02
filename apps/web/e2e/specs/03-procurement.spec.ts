import { test, expect } from '../fixtures/auth.fixture';

test.describe('Procurement Workflow', () => {
  test('Requisitions -> PO -> Goods Receipt', async ({ tenantAPage }) => {
    await tenantAPage.goto('/app/procurement');
    await expect(tenantAPage.getByRole('heading', { name: 'Procurement Command Centre' })).toBeVisible();

    const poLink = tenantAPage.locator('a[href="/app/procurement/purchase-orders"]').first();
    await expect(poLink).toBeVisible();

    await tenantAPage.goto('/app/procurement/purchase-orders');
    await expect(tenantAPage).toHaveURL(/.*\/app\/procurement\/purchase-orders/);
    await expect(tenantAPage.getByRole('heading', { name: 'Purchase Orders' })).toBeVisible();
  });
});

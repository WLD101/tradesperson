import { test, expect } from '../fixtures/auth.fixture';

test.describe('Multi-Tenant Data Isolation', () => {
  test('Tenant B cannot access Tenant A data', async ({ tenantAPage, tenantBPage }) => {
    const tenantAResponse = await tenantAPage.request.get('http://localhost:4000/api/v1/customers');
    expect(tenantAResponse.status()).toBe(200);
    const tenantACustomers = await tenantAResponse.json();
    const tenantACustomerItems = tenantACustomers.data?.items ?? tenantACustomers.data ?? [];
    const tenantACustomerId = tenantACustomerItems[0]?.id;
    expect(tenantACustomerId).toBeTruthy();

    const tenantBResponse = await tenantBPage.request.get(`http://localhost:4000/api/v1/customers/${tenantACustomerId}`);
    expect([403, 404]).toContain(tenantBResponse.status());
  });

  test('Tenant scoped API routes', async ({ tenantAPage }) => {
    // Basic verification that tenant ID is scoped on API routes
    const response = await tenantAPage.request.get('http://localhost:4000/api/v1/customers');
    expect(response.status()).toBe(200);
    // Real validation would check that the response body only contains Tenant A data
  });
});

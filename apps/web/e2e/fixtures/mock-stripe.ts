import { Page } from '@playwright/test';

/**
 * Utility to intercept Stripe network calls during E2E tests, ensuring isolation from
 * external network flakiness and avoiding hitting actual Stripe endpoints.
 */
export async function mockStripeCheckout(page: Page) {
  await page.route('**/v1/billing/**', async (route) => {
    const request = route.request();
    const url = request.url();

    // Intercept checkout session creation
    if (url.includes('/checkout')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'https://checkout.stripe.com/c/pay/test_session',
        }),
      });
      return;
    }

    // Intercept billing portal session creation
    if (url.includes('/portal')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'https://billing.stripe.com/p/session/test_session',
        }),
      });
      return;
    }

    await route.continue();
  });
}

# Tradesperson ERP Website

Location: `apps/web/src/app/website`

Routes:
- `/website`
- `/website/onboarding`
- `/website/pricing`

Stripe readiness:
- Set `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` for browser-safe Stripe publishable configuration.
- Set `NEXT_PUBLIC_STRIPE_PRICE_ID` when the subscription product price is created in Stripe.
- Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` only in server/runtime environment files, never in source code.

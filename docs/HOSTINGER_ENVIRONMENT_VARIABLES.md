# Hostinger Environment Variables

This file lists required deployment variables by application. Store real values only in Hostinger/Supabase/SMTP provider dashboards or a secure password manager. Do not commit real values.

## Shared

| Variable | Required | Description |
| --- | --- | --- |
| `NODE_ENV` | Yes | Use `production` for deployed apps. |
| `WEB_URL` | Yes | Public URL for the Next.js website/ERP app. |
| `API_URL` | Yes | Public URL for the NestJS API. |
| `INTERNAL_API_URL` | Yes | API URL used by server-side app code. Use the API app URL unless private networking exists. |
| `AUTH_SECRET` | Yes | Strong random signing secret, minimum 32 characters. |
| `AUTH_ISSUER` | Yes | JWT/session issuer identifier. |
| `AUTH_AUDIENCE` | Yes | JWT/session audience identifier. |
| `COOKIE_DOMAIN` | Yes | Cookie domain, for example `.tradesperson.net` when web and API share subdomains. |

## Web Application

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Yes | Browser-visible API base URL. Must not contain secrets. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | When billing is enabled | Stripe publishable key only. |
| `NEXT_PUBLIC_STRIPE_PRICE_ID` | When billing is enabled | Default public Stripe price ID. |

## API Application

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Runtime PostgreSQL URL. For Supabase, use the pooler/runtime connection when compatible with Prisma. |
| `DIRECT_URL` | Yes | Direct PostgreSQL URL for Prisma migrations and administrative jobs. |
| `REDIS_URL` | Until queue fallback exists | Redis URL for BullMQ, invitations, OTP/email queueing, and worker coordination. |
| `S3_ENDPOINT` | Yes for attachments | S3-compatible endpoint. Supabase Storage can be used through its S3 endpoint. |
| `S3_REGION` | Yes for attachments | Storage region. |
| `S3_BUCKET` | Yes for attachments | Private bucket name. |
| `S3_ACCESS_KEY_ID` | Yes for attachments | Server-only S3/Supabase Storage access key. |
| `S3_SECRET_ACCESS_KEY` | Yes for attachments | Server-only S3/Supabase Storage secret. |
| `SMTP_HOST` | Yes for email/OTP | Production SMTP hostname. |
| `SMTP_PORT` | Yes for email/OTP | Usually `587` for STARTTLS. |
| `SMTP_USER` | Provider-dependent | SMTP username. |
| `SMTP_PASSWORD` | Provider-dependent | SMTP password or API key. |
| `MAIL_FROM` | Yes for email/OTP | Verified sender address. |
| `STRIPE_SECRET_KEY` | When billing is enabled | Server-only Stripe secret key. |
| `STRIPE_WEBHOOK_SECRET` | When billing is enabled | Stripe webhook signing secret. |
| `STRIPE_STARTER_PRICE_ID` | When billing is enabled | Starter package price ID. |
| `STRIPE_PRO_PRICE_ID` | When billing is enabled | Pro package price ID. |
| `STRIPE_ENTERPRISE_PRICE_ID` | When billing is enabled | Enterprise package price ID. |

## Worker Application

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | If worker deployed | Same database runtime URL as API. |
| `DIRECT_URL` | If worker runs Prisma migrations or maintenance | Direct database URL. |
| `REDIS_URL` | If worker deployed | Redis URL for BullMQ. |
| `SMTP_HOST` | If worker sends email | Production SMTP hostname. |
| `SMTP_PORT` | If worker sends email | Production SMTP port. |
| `SMTP_USER` | If worker sends email | SMTP username. |
| `SMTP_PASSWORD` | If worker sends email | SMTP password/API key. |

## Hostinger Build Settings

### Web

| Setting | Value |
| --- | --- |
| Root directory | Repository root |
| Node.js version | `22.14.0` |
| Install command | `corepack enable && pnpm install --frozen-lockfile` |
| Build command | `pnpm db:generate && pnpm --filter @tradesperson/web build` |
| Start command | `pnpm --filter @tradesperson/web start` |
| Output directory | `apps/web/.next` |
| Health route | `/sign-in` or `/app/dashboard` after auth verification |

### API

| Setting | Value |
| --- | --- |
| Root directory | Repository root |
| Node.js version | `22.14.0` |
| Install command | `corepack enable && pnpm install --frozen-lockfile` |
| Build command | `pnpm db:generate && pnpm --filter @tradesperson/api build` |
| Start command | `pnpm --filter @tradesperson/api start` |
| Output directory | `apps/api/dist` |
| Health route | `/api/v1/health` |

## Cookie And CORS Checklist

- Use HTTPS-only production URLs.
- Set `COOKIE_DOMAIN` to the shared parent domain only when web/API are subdomains of the same domain.
- Keep cookies `HttpOnly` and `Secure` in production.
- Restrict CORS to exact `WEB_URL`.
- Never expose `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, SMTP credentials, S3 secrets, or Stripe secret keys through `NEXT_PUBLIC_` variables.

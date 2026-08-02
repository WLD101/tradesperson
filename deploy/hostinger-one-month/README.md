# One-Month Hostinger + Supabase Deployment

This runbook documents the approved temporary deployment:

- `tradesperson.net`: Hostinger Node.js Web App running the Next.js website and ERP frontend.
- `api.tradesperson.net`: second Hostinger Node.js Web App running the NestJS API.
- Supabase PostgreSQL: temporary database.
- Supabase Storage S3 interface: temporary private object storage.
- External managed Redis: BullMQ queue backend.
- Real SMTP/SendGrid provider: transactional email.
- VPS migration target after roughly one month.

Do not overwrite `tradesperson.net` until a manual hPanel backup is confirmed.

## Gate 1: Hostinger Backup

Before redeploying or overwriting the current Hostinger app:

1. Create a manual hPanel backup for `tradesperson.net`.
2. Record current Node build IDs:
   - `019ee475-5762-7230-a52e-1259c5ad9f9c`
   - `019ee438-8de1-715d-8b43-3389e5cbb5b2`
3. Record current app settings:
   - Node version: `22`
   - Entry file: `app.js`
   - Source type: Git
4. Record DNS rollback values:
   - `@` ALIAS to Hostinger CDN
   - `www` CNAME to Hostinger CDN
   - `ftp` A record to Hostinger FTP host
5. Keep the latest DNS snapshot ID from Hostinger before any DNS edit.

## Gate 2: Node Web App Slots

Hostinger public docs describe Business web hosting as supporting up to 5 Node.js web apps. API build history currently shows Node deployments for these domains:

- `wumify.com`
- `tradesperson.net`
- `whatsquery.com`
- `platinumedgegroup.com.my`

If these map one-to-one to active Node Web App slots, only one spare slot remains. The temporary deployment requires one spare slot for `api.tradesperson.net`; a separate worker app would require another slot.

Do not create `app.tradesperson.net` unless the route architecture later proves it is required.

## Hostinger App 1: Web

| Setting | Value |
| --- | --- |
| Domain | `tradesperson.net` |
| Purpose | Public website and ERP frontend |
| Framework | Next.js |
| Repository | `https://github.com/WLD101/tradesperson` |
| Branch | `codex/erp-foundation` |
| Expected commit | `49aa859e01d71b151e4f4b4a232bc82a62102c17` or newer approved commit |
| Root directory | Repository root |
| Node version | `22` |
| Package manager | `pnpm@10.14.0` via Corepack |
| Install command | `corepack enable && pnpm install --frozen-lockfile` |
| Build command | `pnpm db:generate && pnpm --filter @tradesperson/web build` |
| Start command | `pnpm --filter @tradesperson/web start` |
| Health route | `/sign-in` |
| SSR | Required; do not deploy as static export |

Web public environment:

```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.tradesperson.net
WEB_URL=https://tradesperson.net
API_URL=https://api.tradesperson.net
INTERNAL_API_URL=https://api.tradesperson.net
```

Only `NEXT_PUBLIC_*` values are browser-visible. Do not add database, Redis, SMTP, S3, auth, or Stripe secret values to web public variables.

## Hostinger App 2: API

| Setting | Value |
| --- | --- |
| Domain | `api.tradesperson.net` |
| Purpose | NestJS API |
| Framework | NestJS or Other Node.js server app |
| Repository | `https://github.com/WLD101/tradesperson` |
| Branch | `codex/erp-foundation` |
| Expected commit | `49aa859e01d71b151e4f4b4a232bc82a62102c17` or newer approved commit |
| Root directory | Repository root |
| Node version | `22` |
| Package manager | `pnpm@10.14.0` via Corepack |
| Install command | `corepack enable && pnpm install --frozen-lockfile` |
| Build command | `pnpm db:generate && pnpm --filter @tradesperson/api build` |
| Start command | `pnpm --filter @tradesperson/api start` |
| Health route | `/api/v1/health` |
| Readiness route | `/api/v1/ready` |
| Runtime port | Hostinger-provided `PORT` env, fallback `4000` locally |

API secret environment must be entered in Hostinger hPanel or an equivalent secure deployment setting, never committed.

Required categories:

- `DATABASE_URL`
- `DIRECT_URL` only if operationally required after migrations
- `REDIS_URL`
- `WEB_URL=https://tradesperson.net`
- `API_URL=https://api.tradesperson.net`
- `INTERNAL_API_URL=https://api.tradesperson.net`
- `AUTH_SECRET`
- `AUTH_ISSUER`
- `AUTH_AUDIENCE`
- `COOKIE_DOMAIN=.tradesperson.net`
- S3/Supabase Storage values
- SMTP/SendGrid values
- Stripe server values only if billing is enabled

## Supabase Database

Current validation:

- Prisma migrations: `24/24`
- Rollbacks: `0`
- Seed tenants: `Example Flooring Ltd`, `Tenant B Flooring Ltd`
- Stock reconciliation mismatches: `0`

Do not run:

- `prisma migrate reset`
- `prisma db push`
- destructive SQL
- isolation tests against Supabase

## Supabase Storage

Use the existing S3-compatible adapter. Configure server-side only:

```env
S3_ENDPOINT=https://<project-ref>.supabase.co/storage/v1/s3
S3_REGION=<project-region>
S3_BUCKET=<private-bucket>
S3_ACCESS_KEY_ID=<server-only access key>
S3_SECRET_ACCESS_KEY=<server-only secret>
```

The API already creates tenant-scoped storage keys and checks tenant/branch access before issuing signed upload/download URLs.

## Redis

Use an external managed Redis service compatible with BullMQ.

Requirements:

- TLS if the provider supports it
- authentication
- no unauthenticated public access
- low-latency region near Hostinger/Supabase
- stable connection string in `REDIS_URL`

## Worker Strategy

Current queue-backed feature map:

| Queue | Producer | Consumer | Classification | Impact if down |
| --- | --- | --- | --- | --- |
| `email` | tenant invitation endpoint | `apps/worker` | Important | Invitations enqueue but are not processed by the worker. |

The existing worker currently validates and logs `email` jobs; production email sending also exists through API-side notification providers. Because Hostinger slot availability is likely constrained, the smallest safe temporary strategy is:

1. Deploy the API app with Redis enabled.
2. Keep API-side direct SendGrid notification paths enabled for portal/payment messages.
3. Run the worker as a third Hostinger Node app only if another slot is confirmed.
4. If no third slot is available, use an external lightweight worker runtime or explicitly mark invitation queue processing as unavailable for the one-month demo.

Do not silently acknowledge or delete jobs without processing.

## SMTP and OTP

Mailpit is local only. Production requires a real provider.

Current code status:

- Sign-in is password-based.
- Email provider support exists through SendGrid.
- Public OTP/password reset flows must be verified before enabling public signup as production-ready.

Required DNS:

- SPF
- DKIM
- DMARC

## Deployment Order

1. Confirm hPanel backup for `tradesperson.net`.
2. Confirm at least two usable Hostinger Node app slots, or one spare slot for API plus an external worker runtime.
3. Configure external Redis.
4. Configure Supabase Storage S3 keys and private bucket.
5. Configure SMTP/SendGrid credentials and sender DNS.
6. Deploy API app first.
7. Verify `/api/v1/health` and `/api/v1/ready`.
8. Verify auth, Redis, storage, and email.
9. Deploy frontend app.
10. Verify frontend routes against live API.
11. Run UAT.
12. Rotate the exposed Supabase DB password only after stable deployment.

## Stop Conditions

Stop before:

- overwriting `tradesperson.net` without hPanel backup confirmation
- deploying with fewer than required Node app slots
- exposing secrets
- resetting Supabase
- disabling critical worker jobs
- changing auth architecture
- changing `@` or `www` DNS records irreversibly

# Tradesperson Split Runtime Deployment

This kit prepares the approved split architecture:

- Hostinger shared Node hosting serves `tradesperson.net` for the Next.js public website and ERP frontend only.
- A separate Node-capable runtime serves `api.tradesperson.net` for the NestJS API, BullMQ worker, and Redis connectivity.
- Supabase remains the temporary PostgreSQL database until the future VPS migration.

Do not deploy over `tradesperson.net` until a recoverable hPanel backup is confirmed.

## Runtime Target

Recommended minimum VPS/runtime:

- Ubuntu 24.04 LTS
- 2 vCPU
- 2 GB RAM minimum, 4 GB preferred
- 20 GB disk minimum
- Node.js 22
- pnpm via Corepack
- PM2 or systemd for process supervision
- Nginx or Caddy as reverse proxy
- Redis either managed externally or private on the runtime

## Ports

| Process | Internal Port | Public Exposure |
| --- | ---: | --- |
| API | `4000` | `https://api.tradesperson.net` through reverse proxy |
| Worker health | `4100` | private only, or protected admin health route |
| Redis | `6379` | private only, never public unauthenticated |

## Deployment Commands

```bash
corepack enable
git clone https://github.com/WLD101/tradesperson.git /opt/tradesperson
cd /opt/tradesperson
git checkout codex/erp-foundation
pnpm install --frozen-lockfile
pnpm db:generate
pnpm --filter @tradesperson/api build
pnpm --filter @tradesperson/worker build
```

Run migrations only after confirming `DATABASE_URL` and `DIRECT_URL` point to Supabase pooler/runtime values:

```bash
pnpm db:migrate:deploy
```

## Start Commands

API:

```bash
pnpm --filter @tradesperson/api start
```

Worker:

```bash
node apps/worker/dist/index.js
```

If the worker build output path differs on the target, run:

```bash
find apps/worker -maxdepth 3 -type f -name 'index.js'
```

and update the process manager command.

## Health Checks

```bash
curl -fsS http://127.0.0.1:4000/api/v1/health
curl -fsS http://127.0.0.1:4000/api/v1/ready
curl -fsS http://127.0.0.1:4100/health
curl -fsS http://127.0.0.1:4100/ready
```

Expected API public check after reverse proxy and DNS:

```bash
curl -fsS https://api.tradesperson.net/api/v1/health
```

## Queue Classification

| Queue | Producer | Consumer | Classification | Notes |
| --- | --- | --- | --- | --- |
| `email` | API invitation flow | Worker | Important | Required for invitations; public signup/OTP must not be enabled until production email is real and verified. |

Current notification modules also send portal/payment messages through API-side SendGrid/Twilio provider paths. If `SENDGRID_API_KEY` is absent, the provider enters mock mode, which is not production email delivery.

## Storage

The API uses the existing S3-compatible storage abstraction with tenant and branch checks before issuing presigned URLs.

For Supabase Storage S3, configure:

- `S3_ENDPOINT=https://<project-ref>.supabase.co/storage/v1/s3`
- `S3_REGION=<project-region>`
- `S3_BUCKET=<private-bucket>`
- `S3_ACCESS_KEY_ID=<server-only access key>`
- `S3_SECRET_ACCESS_KEY=<server-only secret>`

Create S3 access keys from the Supabase dashboard Storage S3 configuration page. Do not put S3 secrets in any `NEXT_PUBLIC_` variable.

## DNS Rollback Snapshot

Current read-only Hostinger DNS state captured during deployment discovery:

| Name | Type | Target |
| --- | --- | --- |
| `@` | `ALIAS` | Hostinger CDN |
| `www` | `CNAME` | Hostinger CDN |
| `ftp` | `A` | Hostinger FTP host |

Hostinger DNS snapshots are available through the DNS snapshot API. Record the snapshot ID immediately before adding `api.tradesperson.net`.

## Stop Conditions

Stop before:

- overwriting `tradesperson.net` without hPanel backup confirmation
- exposing database, Redis, SMTP, storage, Stripe, or auth secrets
- making irreversible DNS changes without recording rollback records
- enabling public signup before real email delivery is verified
- disabling Redis queues silently
- rotating the Supabase DB password before the API and frontend are stable

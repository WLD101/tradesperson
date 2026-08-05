# Tradesperson Network VPS Migration Guide

This document outlines the procedure for migrating the Tradesperson Network ERP from its temporary managed production architecture (Vercel + Supabase) to a self-hosted VPS (Virtual Private Server) environment. 

The application is fully portable by design. No business logic resides in Supabase-specific features (Edge Functions, proprietary triggers, etc.), and Vercel is only used as a standard Next.js build target. Authentication is custom cookie-based (handled via `SessionAuthService`), meaning there is no vendor lock-in to Supabase Auth.

## 1. Current Temporary Architecture
* **Frontend/Proxy**: Next.js hosted on Vercel. Vercel builds the public website and the ERP frontend, and proxies API requests (`/api/*`) via Next.js rewrites to the NestJS backend.
* **Backend API**: NestJS (running via `NEXT_PUBLIC_API_URL`).
* **Database**: Supabase PostgreSQL. Accessed natively via Prisma using `DATABASE_URL` and `DIRECT_URL`.
* **Storage**: Supabase Storage, abstracted through an S3-compatible adapter.
* **Authentication**: Custom cookie-based (`tp_session`) managed by NestJS.

## 2. Required Production Environment Variables
On the new VPS, you will need to map these environment variables:

```bash
NODE_ENV=production
# Database (Self-hosted PostgreSQL 16+)
DATABASE_URL=postgresql://user:password@localhost:5432/tradesperson_erp?schema=public
DIRECT_URL=postgresql://user:password@localhost:5432/tradesperson_erp?schema=public

# Networking
WEB_URL=https://tradesperson.net
API_URL=https://api.tradesperson.net
INTERNAL_API_URL=http://localhost:4000

# Redis (for BullMQ)
REDIS_URL=redis://localhost:6379

# Authentication
AUTH_SECRET=your-secure-random-secret
AUTH_ISSUER=tradesperson-net-erp
AUTH_AUDIENCE=tradesperson-erp-users
COOKIE_DOMAIN=.tradesperson.net

# MinIO / S3 Storage
S3_ENDPOINT=https://s3.tradesperson.net
S3_REGION=eu-west-2
S3_BUCKET=tradesperson-erp-prod
S3_ACCESS_KEY_ID=your-minio-key
S3_SECRET_ACCESS_KEY=your-minio-secret

# Email
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=user
SMTP_PASSWORD=password
MAIL_FROM=noreply@tradesperson.net
```

## 3. Database Migration (pg_dump / pg_restore)
Do not use `prisma db push` on production. Use the standard PostgreSQL utilities to export from Supabase and import to your VPS.

1. **Export from Supabase:**
   ```bash
   pg_dump "postgres://[db-user]:[db-password]@aws-0-[region].pooler.supabase.com:6543/postgres?options=-c%20statement_timeout=0" \
     -x -O -F c -f supabase_backup.dump
   ```
2. **Import to VPS PostgreSQL:**
   ```bash
   pg_restore -d "postgresql://user:password@localhost:5432/tradesperson_erp" -1 supabase_backup.dump
   ```
3. **Verify:**
   Run `npx prisma migrate status` to ensure all migrations are marked as applied.

## 4. Storage Migration (Supabase to MinIO)
Supabase Storage objects are ultimately stored in an S3-compatible backend.
1. Configure MinIO on your VPS.
2. Use a tool like `rclone` to sync buckets from Supabase to MinIO.
   ```bash
   rclone sync supabase-s3:tradesperson-erp-prod minio:tradesperson-erp-prod
   ```
3. Update `S3_*` environment variables in your `.env` file to point to the new MinIO endpoint.

## 5. Deployment Services
### Next.js VPS Build & Runtime
The Vercel build can be replaced with a standard Node server or Docker container.
```bash
pnpm --filter @tradesperson/web build
pnpm --filter @tradesperson/web start
```
*Run via systemd or PM2.*

### NestJS API Deployment
```bash
pnpm --filter @tradesperson/api build
node apps/api/dist/main.js
```
*Run via systemd or PM2. Ensure `INTERNAL_API_URL` is accessible by Next.js for SSR.*

### Redis and BullMQ Worker
Deploy Redis on the VPS (or use a managed Redis). Run the worker:
```bash
pnpm --filter @tradesperson/worker build
node apps/worker/dist/main.js
```

## 6. Nginx & SSL
Set up Nginx to route traffic:
* `tradesperson.net` -> Next.js (port 3000)
* `api.tradesperson.net` -> NestJS API (port 4000)
Use **Certbot / Let's Encrypt** to issue SSL certificates for both domains.

## 7. DNS Cutover & Credential Rotation
1. Lower TTL on `tradesperson.net` DNS records 24 hours prior.
2. Put Vercel Next.js site into maintenance mode (or block writes).
3. Perform final `pg_dump` and `rclone sync`.
4. Start VPS services (`web`, `api`, `worker`).
5. Update DNS A-records to point to VPS IP.
6. Rotate all credentials (AUTH_SECRET, API keys, DB passwords).

## 8. Smoke Testing
Once DNS propagates, verify:
* Login at `/sign-in`.
* Demo account access.
* Storage upload/download (e.g. site photos).
* Background jobs (e.g. email sending).
* Next.js routing and SSR.

## 9. Rollback Procedure
If the VPS migration fails:
1. Revert DNS records to point back to Vercel CNAMEs.
2. The Supabase database remains untouched and available as the source of truth.
3. Vercel deployment automatically resumes handling traffic.

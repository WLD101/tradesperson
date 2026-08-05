# Tradesperson Network VPS Migration Guide

This guide details the exact steps required to migrate the temporary Vercel + Supabase MVP architecture to a self-hosted VPS (Virtual Private Server). This migration is planned immediately after onboarding the first paying client.

## 1. Current Architecture (Temporary)

- **Frontend (Web):** Vercel Serverless (Next.js 15 App Router)
- **Backend (API):** Supabase PostgreSQL (Database) + Vercel Serverless proxying requests (or Render/VPS temporary deployment for the NestJS API if running out-of-band).
- **Authentication:** Custom session architecture (cookie-based 	p_session) verified against PostgreSQL users table via API.
- **Storage:** Supabase Storage (S3 compatible)
- **Queues/Workers:** Redis via BullMQ, running via temporary worker node.

## 2. Target Architecture (VPS)

- **Frontend:** Next.js Custom Server or standalone build via PM2/Docker on VPS.
- **Backend:** NestJS API via PM2/Docker on VPS.
- **Database:** PostgreSQL 16+ on VPS.
- **Storage:** MinIO / standard S3 on VPS.
- **Queues/Workers:** Redis instance on VPS + BullMQ NestJS Worker.
- **Gateway:** Nginx reverse proxy with SSL (Certbot/Let's Encrypt).

## 3. Required Production Environment Variables

Ensure these are prepared before migration.

`env
# Network
WEB_URL=https://tradesperson.net
API_URL=https://api.tradesperson.net
INTERNAL_API_URL=http://127.0.0.1:4000

# Database
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/tradesperson_production?schema=public
DIRECT_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/tradesperson_production?schema=public

# Queue
REDIS_URL=redis://localhost:6379

# Auth
AUTH_SECRET=YOUR_SECURE_RANDOM_STRING
AUTH_ISSUER=tradesperson-net-erp
AUTH_AUDIENCE=tradesperson-erp-users
COOKIE_DOMAIN=.tradesperson.net

# Storage (MinIO)
S3_ENDPOINT=https://storage.tradesperson.net
S3_REGION=eu-west-2
S3_BUCKET=tradesperson-erp-prod
S3_ACCESS_KEY_ID=YOUR_MINIO_USER
S3_SECRET_ACCESS_KEY=YOUR_MINIO_SECRET

# Email
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=YOUR_SMTP_USER
SMTP_PASSWORD=YOUR_SMTP_PASSWORD
MAIL_FROM=noreply@tradesperson.net
`

## 4. Supabase Database Export and Restore

To migrate data from Supabase to your local VPS PostgreSQL without data loss:

**Export from Supabase:**
`ash
# Export the public schema data
pg_dump "postgres://postgres.[YOUR_PROJECT_REF]:[YOUR_PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres" \
  -n public \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  -F c \
  -f tradesperson_backup.dump
`

**Import to VPS PostgreSQL:**
`ash
pg_restore -d "postgresql://postgres:[VPS_PASSWORD]@localhost:5432/tradesperson_production" \
  -1 tradesperson_backup.dump
`
> **Warning:** Ensure the VPS database has the exact same extensions (e.g. uuid-ossp) installed in the public schema prior to restore.

## 5. Supabase Storage Export to MinIO

1. Setup MinIO on the VPS and configure a public bucket (	radesperson-erp-prod).
2. Use clone or the AWS CLI to sync Supabase Storage to MinIO:
`ash
# Configure rclone for both endpoints, then sync:
rclone sync supabase_s3:tradesperson-erp-prod minio:tradesperson-erp-prod --progress
`

## 6. Next.js VPS Build and Runtime

Next.js will be built using the standalone output mode to reduce dependencies.

`ash
# 1. Build the web app
pnpm --filter @tradesperson/web build

# 2. Deploy the standalone server
cd apps/web/.next/standalone
PORT=3000 node server.js
`
*Note: Use a process manager like PM2 (pm2 start server.js --name "tp-web") to keep it running.*

## 7. NestJS API Deployment

Build and run the NestJS backend on the VPS.

`ash
# 1. Build the API
pnpm --filter @tradesperson/api build

# 2. Run with PM2
cd apps/api
pm2 start dist/main.js --name "tp-api"
`

## 8. Redis and BullMQ Worker Deployment

1. Install Redis on the VPS: sudo apt install redis-server.
2. Build and run the worker:
`ash
pnpm --filter @tradesperson/worker build
cd apps/worker
pm2 start dist/main.js --name "tp-worker"
`

## 9. Nginx and SSL Configuration

Configure Nginx to route traffic to the Web and API instances.

`
ginx
# /etc/nginx/sites-available/tradesperson.net

server {
    server_name tradesperson.net;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    server_name api.tradesperson.net;

    location / {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
`
Run sudo certbot --nginx -d tradesperson.net -d api.tradesperson.net to secure it.

## 10. DNS Cutover

1. Lower TTL on existing DNS records to 300 seconds (5 mins) 48 hours before the migration.
2. During the migration window, update the A records for @, www, and pi to point to the new VPS IP address.
3. Wait for DNS propagation.

## 11. Credential Rotation

After cutover:
1. Revoke the Supabase database password.
2. Generate new AUTH_SECRET for the new environment. *Note: Existing sessions will be invalidated and users will need to log in again.*
3. Rotate S3 credentials if applicable.

## 12. Smoke Testing

Run the Playwright smoke tests against the new production endpoint:
`ash
WEB_URL=https://tradesperson.net API_URL=https://api.tradesperson.net pnpm --filter @tradesperson/web exec playwright test e2e/specs/12-erp-smoke.spec.ts
`
Verify:
1. Users can log in.
2. Tenants can be selected.
3. Images/files upload and display correctly (MinIO).
4. No 404s or 500s on the dashboard.

## 13. Rollback Procedure

If the VPS migration fails:
1. Revert DNS records back to Vercel CNAMEs.
2. The Supabase database is still intact; no reverse-sync is required if the VPS instance was read-only or in maintenance mode during cutover.
3. Validate Vercel production deployment is operational.
4. Investigate logs, resolve the VPS issue, and schedule a new cutover.

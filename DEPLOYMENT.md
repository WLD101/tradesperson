# Deployment Guide

## Prerequisites
- **Node.js**: v20+ (v22 recommended)
- **pnpm**: v9+ (`npm install -g pnpm`)
- **Docker & Docker Compose**: For containerized orchestration and services.
- **Git**: For version control.

## Environment Variables
The application requires several configuration files depending on the environment. Duplicate the example files to initialize your configuration:
```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```
Ensure that `DATABASE_URL` and `REDIS_URL` point to the correct instances.

## Docker Deployment (Recommended)
You can deploy the backing services (PostgreSQL, Redis, MinIO, Mailpit) rapidly using Docker Compose:
```bash
docker compose up -d
```
Verify they are running successfully:
```bash
docker compose ps
```

## Manual Deployment (Local/Testing)
For local development or testing the built application manually:
1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Build the application:
   ```bash
   pnpm build
   ```
3. Start the application:
   ```bash
   pnpm start
   ```
*Note: Ensure the backing Docker services are running prior to executing the start script.*

## Database Management

### Database Migration
Apply schema updates to your database instance:
```bash
pnpm prisma migrate deploy
```

### Database Seeding
Seed the database with initial administrative accounts and foundational configuration (e.g., Tenants, Branches, Users, Roles):
```bash
pnpm db:seed
```

## Production Commands
When deploying strictly to a production environment (like Vercel, AWS, or GCP), use the following commands:
```bash
# Build
pnpm build

# Start Production Web Server (from apps/web)
pnpm --filter web start

# Start Production API Server (from apps/api)
pnpm --filter api start
```

## Rollback Procedure
If a deployment fails:
1. Revert to the previous stable commit using Git.
2. If database schemas were altered, restore from your provider's automated backup (or manually run `prisma migrate resolve` if addressing a specific failed migration).
3. Re-run `pnpm build && pnpm start`.

## Health Checks
To verify system health post-deployment:
- Frontend: Ensure `http://localhost:3000` (or your domain) resolves with a `200 OK`.
- API: Ensure `http://localhost:4000/api/v1/health` (if exposed) returns successful telemetry.
- Run the E2E Smoke Tests: `npx playwright test` to certify the environment is functional.

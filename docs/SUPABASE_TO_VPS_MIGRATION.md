# Supabase To VPS Migration Runbook

Tradesperson Network uses Prisma against standard PostgreSQL. Supabase is a temporary managed PostgreSQL and S3-compatible storage provider, not a permanent architecture dependency.

## Goals

- Preserve tenant isolation, branch isolation, RBAC, audit logs, and the Lead-to-Payment workflow.
- Move from Supabase PostgreSQL to PostgreSQL 16 on a VPS by changing environment variables and restoring data.
- Preserve portable object keys so Supabase Storage can later move to MinIO or another S3-compatible provider.

## Prerequisites

- PostgreSQL client tools installed: `pg_dump`, `pg_restore`, `psql`.
- Access to Supabase `DIRECT_URL`.
- Target VPS PostgreSQL 16 instance provisioned.
- Secure backup location outside Git, such as `C:\secure-backups\tradesperson` or `/secure-backups/tradesperson`.
- Maintenance window approved.
- Latest repository commit deployed and validated before freeze.

## Final Supabase Export

Windows:

```powershell
$env:DIRECT_URL = "<supabase-direct-url>"
.\scripts\db\export-supabase.ps1 -OutputRoot "C:\secure-backups\tradesperson"
```

Unix:

```bash
export DIRECT_URL="<supabase-direct-url>"
./scripts/db/export-supabase.sh /secure-backups/tradesperson
```

The export creates:

- `tradesperson-schema.sql`
- `tradesperson-data.sql`
- `tradesperson-full.dump`
- `manifest.sha256`

Do not commit these backup files.

## Restore To VPS PostgreSQL

Windows:

```powershell
$env:TARGET_DATABASE_URL = "<vps-postgres-url>"
.\scripts\db\restore-postgres.ps1 -BackupFile "C:\secure-backups\tradesperson\<timestamp>\tradesperson-full.dump"
.\scripts\db\verify-restore.ps1
```

Unix:

```bash
export TARGET_DATABASE_URL="<vps-postgres-url>"
./scripts/db/restore-postgres.sh /secure-backups/tradesperson/<timestamp>/tradesperson-full.dump
./scripts/db/verify-restore.sh
```

## Prisma Verification

After restore:

```bash
DATABASE_URL="<vps-postgres-url>" DIRECT_URL="<vps-postgres-url>" pnpm db:generate
DATABASE_URL="<vps-postgres-url>" DIRECT_URL="<vps-postgres-url>" pnpm db:migrate:deploy
```

`prisma migrate deploy` should report no unexpected pending migration when the dump came from the current deployed schema.

## Storage Migration

1. Keep database attachment records as bucket/key metadata.
2. List all Supabase Storage objects for the private bucket.
3. Download objects to encrypted temporary storage.
4. Generate checksums.
5. Upload objects to MinIO or the chosen S3-compatible provider using the same keys.
6. Verify object counts and checksums.
7. Change only `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY`.
8. Run attachment upload/download smoke tests.

## Cutover Order

1. Announce maintenance window.
2. Disable write access or pause public demo usage.
3. Export Supabase database.
4. Restore to VPS PostgreSQL.
5. Verify tables, migrations, counts, and core workflows.
6. Migrate storage objects.
7. Update Hostinger or VPS environment variables.
8. Deploy API, worker, and web.
9. Verify API health.
10. Verify authentication, dashboard, CRM, surveys, estimates, quotes, jobs, invoices, payments, attachments, and portal routes.
11. Switch DNS only after smoke tests pass.

## Rollback

- Keep Supabase project unchanged until the VPS deployment is fully accepted.
- If validation fails, point application environment variables back to Supabase.
- Re-enable the previous Hostinger deployment or redeploy the previous commit.
- Do not destroy Supabase backups or storage until the VPS run has passed a full demo cycle.

## Future VPS Checklist

- PostgreSQL 16 provisioned and backed up.
- Redis provisioned for BullMQ.
- MinIO or S3-compatible storage provisioned.
- SMTP configured with SPF, DKIM, and DMARC.
- Web, API, and worker deployed as separate processes.
- Environment variables switched from Supabase to VPS services.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and smoke tests passed.

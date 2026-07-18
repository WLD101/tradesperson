# Local Development

## Required Versions

- Node.js `22.14.0`
- `pnpm` `10.14.0`
- Docker Desktop with Linux containers

## Environment

Use the values from `.env.example`. Required variables are validated at startup through `@tradesperson/config`.

## Service Startup

Start infrastructure:

```bash
docker compose up -d postgres redis mailpit
```

Optional future service:

```bash
docker compose up -d minio
```

## Database Commands

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

## API Test Policy

DB-backed API suites share the dedicated test database `tradesperson_erp_isolation_test`, so only one of them may run at a time.

Additional Saturday, July 18, 2026 validation databases used for Phase C closure:
- `tradesperson_phasec_clean_migration_test`
- `tradesperson_phaseb_to_phasec_upgrade_test`
- `tradesperson_phasec_seed_validation_test`

Safe serial commands:

```bash
pnpm --filter @tradesperson/api test:db
pnpm --filter @tradesperson/api test:isolation
pnpm --filter @tradesperson/api test:full
```

Pure unit tests that do not touch PostgreSQL or Redis may still run in normal Vitest parallel mode:

```bash
pnpm --filter @tradesperson/api test:unit
```

Destructive test helpers refuse to run unless `DATABASE_URL` explicitly targets `tradesperson_erp_isolation_test` under `NODE_ENV=test`. This prevents accidental resets against development or production databases.

Authoritative API commands:
- `test:unit` runs pure tests only
- `test:db` runs DB-backed suites serially
- `test:isolation` runs the compiled tenant-isolation scenarios
- `test:full` is the authoritative chain because it runs unit tests, then DB-backed tests serially, then compiled isolation, and verifies teardown and port release between phases

Verified on Saturday, July 18, 2026:
- Prisma `format`, `validate`, `generate`, and migration status all passed
- clean migration passed on `tradesperson_phasec_clean_migration_test`
- Phase B to Phase C upgrade passed on `tradesperson_phaseb_to_phasec_upgrade_test`
- seed repeatability passed on `tradesperson_phasec_seed_validation_test`
- test DB guard coverage passed `7/7`
- API unit tests passed `60/60`
- API DB tests passed `4/4`
- compiled isolation passed `41 passed, 0 failed`
- `pnpm --filter @tradesperson/api test:full` passed cleanly with compiled API teardown and dynamic port release

## App Commands

```bash
pnpm --filter @tradesperson/api dev
pnpm --filter @tradesperson/web dev
pnpm --filter @tradesperson/worker dev
```

Or run all:

```bash
pnpm dev
```

## Troubleshooting

- If `pnpm` is missing, install it globally with `npm install -g pnpm@10.14.0`.
- If Prisma types are missing after install, run `pnpm db:generate`.
- If Docker reports it cannot connect to the engine, start Docker Desktop and retry `docker compose up`.

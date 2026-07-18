# Tradesperson.net ERP

Multi-tenant ERP SaaS platform for UK trades businesses, built flooring-first with an extensible modular foundation for future trade modules.

## Prerequisites

- Node.js `22.14.0`
- `pnpm` `10.14.0`
- Docker Desktop

## Workspace

```text
apps/
  api/        NestJS REST API
  web/        Next.js App Router frontend
  worker/     BullMQ worker and health server
packages/
  auth/               auth/session helpers
  config/             environment validation
  db/                 Prisma schema, client, and seed logic
  eslint-config/      shared lint presets
  test-utils/         test helpers
  types/              API and session types
  typescript-config/  shared tsconfig presets
  ui/                 shared UI primitives
docs/
docker/
tests/
```

## Setup

1. Install dependencies:
   `pnpm install`
2. Copy `.env.example` values into your local environment.
3. Start local services:
   `docker compose up -d postgres redis mailpit`
4. Generate Prisma Client:
   `pnpm db:generate`
5. Run the first migration:
   `pnpm db:migrate`
6. Seed the demo data:
   `pnpm db:seed`

## Development

- Run all apps:
  `pnpm dev`
- Run the API only:
  `pnpm --filter @tradesperson/api dev`
- Run the web app only:
  `pnpm --filter @tradesperson/web dev`
- Run the worker only:
  `pnpm --filter @tradesperson/worker dev`

## Quality Checks

- Format check:
  `pnpm format:check`
- Lint:
  `pnpm lint`
- Typecheck:
  `pnpm typecheck`
- Tests:
  `pnpm test`
- Full API test chain:
  `pnpm test:api:full`
- Playwright:
  `pnpm test:e2e`
- Production build:
  `pnpm build`

## Local Services

- PostgreSQL: `localhost:55432`
- API: `http://localhost:4000`
- Swagger: `http://localhost:4000/api/docs`
- Web: `http://localhost:3000`
- Worker health: `http://localhost:4100/health`
- Mailpit UI: `http://localhost:8025`

## Documentation

- [Flooring ERP Phase 0 Audit](./docs/16-flooring-erp-phase-0-audit.md)
- [Flooring ERP Site and Survey Domain](./docs/17-flooring-site-survey-domain.md)
- [Tenant Isolation & Security Model](./docs/17-tenant-isolation.md)
- [Open-Source Acceleration Register](./docs/18-open-source-acceleration-register.md)
- [Product Catalogue Phase A Proposal](./docs/19-product-catalogue-phase-a-proposal.md)
- [Flooring Product Catalogue Domain](./docs/20-flooring-product-catalogue-domain.md)
- [Flooring Supplier Domain Foundation](./docs/21-flooring-supplier-domain.md)
- [Flooring Supplier Pricing Domain](./docs/22-flooring-supplier-pricing-domain.md)
- [Local development guide](./docs/local-development.md)
- [Development credentials](./docs/development-access.md)

## Current Foundation

- Site and Survey foundation is complete through tenant-safe site detail/edit, survey lifecycle, room and measurement management, and server-authoritative area totals.
- Product Catalogue Phase A now includes:
  - tenant-owned catalogue models and migration
  - catalogue permissions and seed data
  - API CRUD for categories, manufacturers, brands, collections, units, products, and variants
  - functional catalogue management screens in the web app
  - tenant-isolation and category-rule validation coverage
- Supplier Domain Phase B now includes:
  - tenant-owned supplier, contact, and supplier-product models plus migration
  - supplier permissions and demo seed data
  - API CRUD for suppliers, contacts, supplier product links, and product-side supplier lookup
  - functional supplier list, create, edit, and detail pages in the web app
  - tenant-isolation coverage for supplier retrieval, creation, permissions, and cross-tenant product linking
- Supplier Pricing Phase C now includes:
  - tenant-owned supplier price lists, versions, price history, imports, and saved mappings
  - server-side CSV/XLSX parsing with 5 MB guardrails, worksheet selection, and header-row support
  - persisted import validation, approval, execution, rollback-safe saved-mapping application, and manual row matching
  - import row persistence with pagination, search, sorting, match filters, execution filters, duplicate-only filtering, and warning-only filtering
  - supplier pricing hub, price-list detail, import preview, import-detail workflows, and authorised product pricing visibility in the web app
  - sequential and concurrent idempotency proof, raw-cost permission proof, tenant-isolation proof, and serial DB-backed API validation policy using the dedicated `tradesperson_erp_isolation_test` database for destructive test helpers and compiled isolation runs
- Supplier Pricing Phase C closure was re-verified on Saturday, July 18, 2026 with:
  - Prisma `format`, `validate`, `generate`, and migration status all passing
  - clean migration proof on `tradesperson_phasec_clean_migration_test`
  - Phase B to Phase C upgrade proof on `tradesperson_phaseb_to_phasec_upgrade_test`
  - seed repeatability proof on `tradesperson_phasec_seed_validation_test`
  - API test DB guard coverage `7/7`
  - API unit tests `60/60`
  - API DB tests `4/4`
  - compiled isolation `41 passed, 0 failed`
  - authoritative `pnpm --filter @tradesperson/api test:full` passing with clean teardown and released dynamic port
- Final UI branding remains deferred. Current catalogue screens are intentionally functional and replaceable.

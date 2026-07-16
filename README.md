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
- Final UI branding remains deferred. Current catalogue screens are intentionally functional and replaceable.

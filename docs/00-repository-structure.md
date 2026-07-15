# Proposed Repository Structure

```text
tradesperson-net-erp/
  apps/
    api/                  NestJS modular monolith
    web/                  Next.js tenant ERP, admin, and portal
    worker/               BullMQ background workers
  packages/
    auth/                 auth, sessions, tenant resolution, guards
    config/               shared tooling and env config
    db/
      prisma/
        schema.prisma     canonical application schema
      src/                tenant-safe db helpers
    domain/               enums, workflow contracts, policies
    sdk/                  typed client and API contracts
    ui/                   shared UI component library
  docs/                   product, technical, data, security, roadmap
  infra/                  deployment, observability, backup assets
  tests/                  integration, isolation, and Playwright support
```

## Why This Shape

- `apps/api` isolates server-side business logic from UI concerns.
- `apps/web` keeps user-facing delivery in one frontend shell with route-level segmentation for tenant ERP, platform admin, and customer portal.
- `apps/worker` keeps async processing independently scalable without introducing microservices.
- `packages/db` centralizes Prisma schema, migrations, and tenant-aware query utilities.
- `packages/domain` prevents workflow enums and domain contracts from drifting between apps.
- `packages/auth` keeps tenancy and permission logic reusable and consistent.

## Future Expansion

Additional trade modules should be added under backend module boundaries and shared domain packages, not as separate apps.

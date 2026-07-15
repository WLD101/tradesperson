# Technical Requirements Document

## System Style

Modular monolith with a `Next.js` frontend, `NestJS` API, background workers, shared packages, and a single PostgreSQL database.

## Core Technical Decisions

- `NestJS` is preferred for clear module boundaries and serious long-term ERP maintainability.
- `Next.js` App Router will power the tenant ERP, customer portal, and platform admin shells.
- `PostgreSQL` with `Prisma` provides relational integrity, migrations, and strong domain modeling.
- `Redis` and `BullMQ` handle background processing and retry semantics.
- `S3-compatible` object storage handles documents, survey photos, PDFs, and job photos.

## Monorepo Structure

```text
apps/
  api/
  web/
  worker/
packages/
  auth/
  config/
  db/
  domain/
  sdk/
  ui/
infra/
tests/
```

## Backend Module Boundaries

- `auth`
- `platform-admin`
- `tenants`
- `subscriptions`
- `users`
- `roles`
- `permissions`
- `branches`
- `teams`
- `crm`
- `customers`
- `properties`
- `leads`
- `surveys`
- `flooring`
- `catalogue`
- `pricing`
- `quotes`
- `jobs`
- `scheduling`
- `inventory`
- `purchasing`
- `suppliers`
- `invoicing`
- `payments`
- `documents`
- `notifications`
- `reports`
- `audit`
- `integrations`
- `webhooks`
- `background-jobs`
- `settings`

## Module Contract

Each module contains:

- controller
- service
- repository or data-access layer
- DTOs
- validation
- policies
- events
- tests

## Multi-Tenancy Rules

- Shared database, shared tables, row-level tenant separation in application logic and selected database protections.
- Every tenant-owned table includes `tenant_id`.
- Tenant context is resolved from session membership, not from browser-supplied IDs.
- Cache keys, background jobs, storage paths, and exports must carry tenant context.

## Security Baseline

- Strong password hashing and MFA-ready architecture
- Session and device tracking
- RBAC plus fine-grained permissions
- Signed object storage URLs
- Webhook signature verification
- Correlation IDs and append-only audit logs
- GDPR-aware retention, export, and deletion handling

## Observability

- Structured logs
- Sentry for error capture
- OpenTelemetry traces
- Health checks for API, DB, Redis, queue, and storage

## Performance and Reliability

- Cursor or offset pagination depending on endpoint behavior
- Composite indexes on tenant-scoped identifiers
- Idempotency keys for payment and webhook operations
- Transactional stock and financial updates
- Dead-letter handling for failed jobs

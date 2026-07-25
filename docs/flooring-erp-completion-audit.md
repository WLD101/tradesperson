# Flooring ERP Completion Audit

Date: 2026-07-25
Branch: `codex/erp-foundation`
Audited HEAD at start of closure: `844065fd4f13e83db50a27b97210e8b03017d7e0`

## Executive Summary

The repository now contains a working local ERP foundation for the fastest flooring MVP route:

`Stock reservation -> Material issue to job -> Installation scheduling -> Job completion -> Invoice -> Payment`

The implemented route was live API smoke-tested on 2026-07-25 against the seeded tenant. The smoke test verified stock reservation, material issue, schedule update, completion, invoice generation with quote subtotal/VAT, duplicate invoice prevention, partial payment, duplicate payment idempotency, final payment, and excess-payment rejection.

Release decision remains `BLOCKED` for a controlled production pilot because the broader closure Definition of Done requires modules that do not exist yet: Goods Receipt, inventory movement ledger, stock return, damaged/rejected stock handling, installer/team assignment, job profitability reporting, attachments, quote/invoice PDFs, and complete tenant/permission/idempotency coverage.

Estimated controlled-pilot readiness: `62%`.

## Architecture Observed

| Layer | Current state | Notes |
| --- | --- | --- |
| Monorepo | Working | pnpm/Turborepo with `apps/api`, `apps/web`, `apps/worker`, and shared packages |
| API | Working | NestJS modular API with `/api/v1`, auth guard, permissions guard, tenant context, audit service, and Prisma |
| Web | Working with limitation | Next.js app router pages cover CRM, surveys, catalogue, suppliers, pricing, procurement, estimates, quotes, and jobs |
| Worker | Foundation | BullMQ email worker exposes health/readiness; production notification workflows are minimal |
| Database | Working | PostgreSQL/Prisma migrations apply through finance idempotency and VAT hardening |
| Cache/queue | Working | Redis is healthy and worker readiness returns `PONG` |
| Object storage | Foundation | MinIO container is healthy; application attachment domain is not implemented |
| Auth | Working | Cookie-backed sessions; development credentials documented in `docs/development-access.md` |
| Tenancy | Working with limitation | Application-enforced tenant/branch scoping; no database RLS |

## Module Completion Snapshot

| Module | Status | Evidence | Controlled-pilot gap |
| --- | --- | --- | --- |
| Authentication and tenant selection | Working | Seeded owner login succeeds through API | Production auth hardening and rate limiting need review |
| Roles and permissions | Working with limitation | Guards exist on major routes | Permission taxonomy is incomplete for finance/inventory-specific roles |
| Audit logging | Working with limitation | Lead, survey, supplier, procurement, job, stock, completion, invoice, and payment actions record audit entries | Coverage is not complete for every closure event |
| CRM leads/customers/sites | Working with limitation | Lead create/update/convert, customer/site CRUD routes exist | Assignment/follow-up workflow is thin |
| Surveys and measurements | Working | Server-side measurement calculations exist | Full revision/approval workflow needs deeper tests |
| Catalogue/suppliers/pricing | Working | Product, supplier, price-list/import pages and services exist | No production document import hardening |
| Estimates | Working with limitation | Estimate rooms, lines, recalculation, ready-for-quote exist | Advanced takeoff/waste rules are still basic |
| Quotes | Working with limitation | Estimate-to-quote and status actions exist | Customer acceptance/PDF/signature evidence is incomplete |
| Jobs | Working with limitation | Quote-to-job, requirements, stock reservation/issue, scheduling, completion, invoice/payment exist | Installer assignment, job start, returns, snags, attachments absent |
| Requisitions and purchase orders | Working | Requisition/PO workflow, approvals, acknowledgements, delivery plans, print view exist | No goods receipt |
| Goods Receipt | Broken | No schema models or API routes found | Blocks procure-to-stock pilot readiness |
| Inventory ledger | Broken | Stock balances/reservations exist, but no immutable movement ledger found | Blocks stock auditability |
| Stock return/damaged stock | Broken | No return models/routes found | Blocks field closeout and damaged-material accounting |
| Invoices/payments | Working with limitation | Live smoke verified quote VAT, partial/full payment, idempotency, excess rejection | No invoice PDF, void/reversal, or finance role split |
| Job profitability | Broken | Estimate gross profit exists, but no job profitability endpoint/report found | Blocks final profitability requirement |
| Attachments/documents | Broken | No attachment models/routes found | Blocks signed evidence, photos, PDFs |
| Notifications | Working with limitation | Worker health/readiness works | Business notification jobs are mostly not implemented |
| Dashboard/reports | Working with limitation | Dashboard route exists | Required operational/financial reports are incomplete |

## Live Smoke Evidence

Executed against `http://localhost:4000/api/v1` on 2026-07-25 with `owner@exampleflooring.local`.

| Stage | Result |
| --- | --- |
| Login | Working |
| Seeded job lookup | Working, `JOB-2026-000001` |
| Material requirements | Working, 2 requirements |
| Reserve stock | Working, `30.781` total allocated |
| Duplicate reserve | Rejected with HTTP 400 |
| Issue stock | Working, `30.781` total issued |
| Schedule | Working, status `SCHEDULED` |
| Complete job | Working, status `COMPLETED` |
| Create invoice | Working, invoice `INV-2026-000001` |
| Invoice VAT | Working, subtotal `1593.6015`, VAT `318.7203`, total `1912.3218` |
| Duplicate invoice | Prevented, active invoice count stayed `1` |
| Partial payment | Working, invoice status `PARTIALLY_PAID` |
| Duplicate partial payment | Idempotent, payment count stayed `1` |
| Final payment | Working, invoice status `PAID`, balance `0` |
| Excess payment | Rejected with HTTP 400 |

## Production Blockers

| Blocker | Severity | Why it blocks readiness |
| --- | --- | --- |
| Goods Receipt absent | Critical | Issued purchase orders cannot be received into stock |
| Inventory movement ledger absent | Critical | Stock changes are not audit-grade from receipt through issue/return |
| Stock returns absent | Critical | Unused and damaged material cannot be returned after installation |
| Job profitability absent | Critical | Required final profitability cannot be verified server-side |
| Attachments and PDFs absent | Critical | Quote PDFs, invoice PDFs, signed completion, and photos are not available |
| Installer/team assignment absent | High | Installation scheduling lacks resource assignment and double-booking checks |
| Tenant B seed absent | High | Closure requires at least two seeded tenants for live cross-tenant validation |
| Full workflow automated test absent | High | No automated test executes Lead -> Payment -> Profitability -> cross-tenant denial |
| Permission role matrix incomplete | High | Finance/inventory/installer role separation is not fully enforced |

## Validation Status

| Command or check | Result |
| --- | --- |
| `pnpm db:validate` | Passed |
| `pnpm db:generate` | Passed after serial retry due transient Windows Prisma DLL lock |
| `pnpm db:migrate:deploy` | Passed |
| `pnpm db:seed` | Passed |
| `pnpm --filter @tradesperson/api test:migration:clean` | Passed, 17 migrations counted on clean database |
| API health | Passed at `http://localhost:4000/api/v1/health` |
| API readiness | Passed at `http://localhost:4000/api/v1/ready` |
| Worker health | Passed at `http://localhost:4100/health` |
| Worker readiness | Passed at `http://localhost:4100/ready` |
| Browser automation | Blocked: Browser plugin reported no controllable browser available |

## Release Decision

`BLOCKED`

The branch is suitable for local preview and continued internal development. It is not ready for controlled production pilot until the production blockers above are implemented and verified.

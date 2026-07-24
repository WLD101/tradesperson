# Flooring ERP Completion Audit

Date: 2026-07-24
Branch: `codex/erp-foundation`
Audited HEAD: `09cfa2642956ed5774ee5ae63062ab0684a81992`

## Executive Summary

The repository is a real multi-tenant flooring ERP foundation, not a shell. It now contains working platform, CRM, site survey, catalogue, supplier, supplier pricing, procurement, estimate, quote, and initial job conversion slices. The strongest completed area is procurement Phase D: requisitions, purchase orders, versions, approvals, supplier acknowledgements, delivery plans, supplier cost snapshots, and print views are implemented and regression-tested.

The system is not production-complete. The current critical gap is everything after issued purchase orders and converted jobs: material requirements, goods receipt, inventory ledger, stock reservation/allocation, installation scheduling, fitter work packs, completion sign-off, invoicing, payments, accounting controls, documents, notifications, and operational reporting. Release decision remains `BLOCKED` for production MVP until those workflows exist and pass end-to-end tests.

Estimated current production MVP readiness: `45%`.

## Architecture Observed

| Layer | Current state | Notes |
| --- | --- | --- |
| Monorepo | Working | `apps/api`, `apps/web`, `apps/worker`, `packages/*`, Turborepo, pnpm workspace |
| API | Working | NestJS modular monolith with versioned `/api/v1` routes, guards, tenant context, audit service, Prisma |
| Web | Working | Next.js app router with server pages/actions and client forms for dense ERP screens |
| Worker | Foundation | BullMQ worker exists, but business queues beyond foundation are limited |
| Database | Working | Prisma/PostgreSQL with additive migrations through jobs foundation |
| Cache/queue | Foundation | Redis/BullMQ configured; not yet used for large supplier imports, notifications, documents, or automation-heavy flows |
| Auth | Working | Cookie-backed server sessions, seeded development users, tenant selection |
| Tenancy | Working with limitation | Application-enforced tenant/branch scoping with tests; no database RLS yet |

## Module Completion Snapshot

| Module | Backend | Web UI | Tests | Status | Notes |
| --- | ---: | ---: | ---: | --- | --- |
| Authentication and tenant selection | 90% | 85% | 70% | Working | Seeded development login documented in `docs/development-access.md` |
| Roles and permissions | 75% | 45% | 45% | Working with limitation | Permission key styles are inconsistent across older and newer modules |
| Audit logging | 65% | 55% | 45% | Working with limitation | Good foundation, but event coverage is not complete for every sales/job action |
| Dashboard | 65% | 70% | 20% | Working with limitation | Loads operational summaries, but not yet true KPI/reporting |
| CRM leads | 65% | 55% | 25% | Working with limitation | Lead list/create/convert exists; tasks, activities, duplicate detection, follow-up workflow missing |
| Customers | 65% | 55% | 25% | Working with limitation | Core customer records exist; contacts, balances, consent, timeline missing |
| Sites | 78% | 78% | 40% | Working | Site CRUD and detail screens exist; still mapped over legacy `Property` table |
| Surveys and measurements | 82% | 78% | 50% | Working | Rooms, measurement components, and server area calculations exist |
| Product catalogue | 88% | 84% | 55% | Working | Products, variants, references, archive rules, and flooring validation exist |
| Suppliers | 90% | 88% | 55% | Working | Supplier master, contacts, and supplier-product links exist |
| Supplier pricing | 92% | 88% | 70% | Working | Price lists, versions, imports, mappings, validation, execution, current prices, and history exist |
| Procurement | 100% | 100% | 100% | Working | Phase D closed for requisitions/POs/versions/approval/ack/delivery planning/print |
| Estimates | 60% | 55% | 35% | Working with limitation | Foundation exists with rooms, lines, totals, versions, survey-room import |
| Quotes | 55% | 50% | 30% | Working with limitation | Foundation exists with estimate-to-quote, status actions, versions |
| Jobs | 35% | 30% | 20% | Working with limitation | Approved quote can convert into first job record; no operational delivery workflow yet |
| Material requirements | 0% | 0% | 0% | Broken | Missing; blocks job-to-procurement continuity |
| Goods receipt | 0% | 0% | 0% | Broken | Missing; blocks PO fulfillment and inventory |
| Inventory and stock ledger | 0% | 0% | 0% | Broken | Missing; blocks reservations, roll/remnant handling, valuation |
| Scheduling and fitters | 0% | 0% | 0% | Broken | Missing; blocks installation operations |
| Installation completion and snagging | 0% | 0% | 0% | Broken | Missing; blocks job closeout |
| Invoicing | 0% | 0% | 0% | Broken | Missing; blocks commercial closeout |
| Payments | 0% | 0% | 0% | Broken | Missing; blocks balances and cash reporting |
| Documents and attachments | 0% | 0% | 0% | Broken | Missing; blocks quote PDFs, signed acceptance, job packs, supplier docs |
| Notifications | 5% | 0% | 0% | Broken | Worker foundation exists but no production notification domain |
| Reporting | 20% | 10% | 5% | Working with limitation | Dashboard exists; real operational/financial reporting missing |

## Complete Or Closure-Verified Workflows

| Workflow | Status | Evidence |
| --- | --- | --- |
| Sign in and tenant selection | Working | Seeded accounts documented and app routes exist |
| Lead/customer/site foundation | Working with limitation | API and UI routes exist; CRM workflow depth is still thin |
| Site survey measurements | Working | Server-side measurement and room area calculations exist |
| Catalogue management | Working | Product/reference/variant routes and pages exist |
| Supplier master data | Working | Supplier, contact, supplier-product routes and pages exist |
| Supplier price imports | Working | Server persisted imports, mapping, validation, approval, execution, price history |
| Purchase requisition to purchase order | Working | Phase D closure documented with full API, web, DB, isolation, lint, typecheck, build validation |
| Survey/estimate/quote/job first sales chain | Working with limitation | Estimate, Quote, and Job foundation commits are present; downstream operations missing |

## Partial Or UI-Limited Workflows

| Workflow | Current limitation | Production impact |
| --- | --- | --- |
| Estimate calculation | Lines and totals exist, but material takeoff rules are basic and not yet tied deeply to supplier price selection or stock availability | Medium-high |
| Quote issuance | Status actions exist, but no PDF/email/customer portal/signature evidence | High |
| Quote acceptance and deposit | Internal approval-like actions exist; payment/deposit capture is not integrated | High |
| Job conversion | Job record is created from an approved quote, but the job does not drive requirements, scheduling, installation, completion, or billing | Critical |
| Delivery plans | Procurement delivery plans exist, but they do not create receipts, stock, or fulfillment status | High |
| Dashboard | Shows current ERP surface, but not enough metrics for management decisions | Medium |
| Permission management | Backend permissions exist, UI remains lightweight and key naming is inconsistent | Medium |

## Missing Critical Workflows

1. Material requirements generated from approved quotes or jobs.
2. Requirement-to-requisition conversion with traceable remaining quantities.
3. Goods receipt against issued purchase-order versions.
4. Inventory ledger, warehouses, stock on hand, reservations, allocations, adjustments, roll cuts, and remnants.
5. Job scheduling, installer/fitter assignment, work orders, and mobile job packs.
6. Job completion, snagging, customer sign-off, warranty/aftercare.
7. Invoice generation from deposits, milestones, completion, and variations.
8. Payment recording, allocation, refunds, statements, and debtor reporting.
9. Supplier invoices, accounts payable, three-way matching, and payment status.
10. Document storage, quote PDFs, signed evidence, photos, attachments, malware scanning, signed URLs.
11. Notifications and communication history.
12. Production observability, backups, deployment hardening, and incident runbooks.

## Security And Isolation Risks

| Risk | Severity | Notes | Required mitigation |
| --- | --- | --- | --- |
| Application-only tenant isolation | Critical | Tenant scoping is implemented in services/tests, but no database RLS or equivalent constraint layer exists | Add RLS or compound tenant-safe FK strategy with regression tests |
| Permission key inconsistency | High | Some modules use dot keys such as `sites.view`; newer procurement/sales modules use colon keys such as `estimate:read` | Standardise permission registry and add automated permission route coverage |
| Missing idempotency for new sales conversions | High | Estimate-to-quote and quote-to-job actions can race without explicit idempotency keys | Add idempotency table/service for conversion and document/payment actions |
| Incomplete audit coverage | Medium-high | New sales status actions are not all as deeply audited as procurement/pricing | Add audit tests for estimate, quote, job, future stock, finance |
| No document/upload security domain | High | Upload workflows are deferred, so no signed URL/malware scanning/private storage controls exist | Build document service before exposing file upload |
| Supplier cost privacy | Medium | Pricing/procurement have explicit permissions, but future estimate/quote views must avoid leaking cost | Add response shaping tests for customer-facing and sales views |

## Data-Integrity Risks

| Risk | Severity | Notes |
| --- | --- | --- |
| No inventory ledger | Critical | POs and jobs cannot prove stock availability or fulfillment |
| No goods receipt | Critical | Issued POs cannot change fulfillment state or stock balances |
| No accounting ledger | Critical | Deposits, invoices, supplier invoices, and payments are not auditable end-to-end |
| No stock concurrency rules | High | Future reservations/cuts must protect against double allocation |
| No immutable customer-facing document versions | High | Quotes have versions, but PDF/rendered evidence and acceptance snapshot are missing |
| Limited common ownership fields | Medium | Created/updated/deleted-by strategy is not consistent across all tenant-owned records |

## Build And Test Status

Latest known validation after the Job foundation milestone:

| Command | Result |
| --- | --- |
| `pnpm db:validate` | Passed |
| `pnpm db:seed` | Passed |
| `pnpm --filter @tradesperson/api typecheck` | Passed |
| `pnpm --filter @tradesperson/web typecheck` | Passed |
| `pnpm --filter @tradesperson/api lint` | Passed |
| `pnpm --filter @tradesperson/web lint` | Passed |
| `pnpm --filter @tradesperson/api test:unit` | Passed, 98 tests |
| `pnpm --filter @tradesperson/api build` | Passed |
| `pnpm --filter @tradesperson/web build` | Passed with known Next.js workspace-root and ESLint-plugin warnings |
| `git diff --check` | Passed with CRLF warnings only |

Current runtime note: Docker Desktop was not reachable during this audit continuation on 2026-07-24, so PostgreSQL/Redis health and browser preview need to be re-verified after Docker Desktop is started.

## Deployment Blockers

| Blocker | Severity | Why it blocks production |
| --- | --- | --- |
| Missing inventory/goods receipt | Critical | Cannot run procurement-to-stock operations |
| Missing scheduling/installations | Critical | Cannot deliver jobs operationally |
| Missing finance/payments | Critical | Cannot complete commercial lifecycle |
| Missing documents/signatures | Critical | Cannot issue evidence-grade quotes, job packs, or completion packs |
| Missing production tenant isolation hardening | Critical | SaaS data separation risk remains too high |
| Missing observability/backups/runbooks | High | Production support and recovery are not ready |
| Incomplete e2e suite | High | Full lead-to-cash regression is not protected |

## Prioritized Completion Plan

| Priority | Slice | Goal | Acceptance gate |
| --- | --- | --- | --- |
| 1 | Material requirements | Generate job requirements from quote/estimate lines and expose shortages | Job detail shows required, ordered, received, allocated quantities |
| 2 | Requirement-to-procurement bridge | Convert material requirements into purchase requisitions without duplicate allocation | Requirement lines link to requisition lines and remaining quantities update |
| 3 | Goods receipt | Receive issued PO lines with discrepancy handling | PO fulfillment status and receipt records update transactionally |
| 4 | Inventory ledger | Warehouses, stock movements, reservations, allocations, roll/remnant support | Ledger balance tests and reservation concurrency tests pass |
| 5 | Scheduling and work orders | Create installation schedule, fitter/team assignments, job packs | Calendar/list/detail UI and branch-safe assignment tests pass |
| 6 | Completion and snagging | Capture completion checklist, photos, sign-off, snags | Completed jobs can trigger final invoice readiness |
| 7 | Finance | Deposits, invoices, payments, credit notes, AP/supplier invoices | Lead-to-cash and procure-to-pay tests pass |
| 8 | Documents and notifications | Quote PDFs, acceptance, emails, attachments, audit evidence | Signed document and notification audit tests pass |
| 9 | Hardening | RLS/tenant-safe FKs, observability, backup/restore, CI e2e | Production readiness checklist passes |

## Updated MVP Readiness

| Area | Readiness |
| --- | ---: |
| Platform foundation | 80% |
| CRM and surveys | 70% |
| Catalogue/suppliers/pricing | 88% |
| Procurement through issued PO | 95% |
| Sales estimate/quote/job foundation | 50% |
| Job operations | 10% |
| Inventory | 0% |
| Finance | 0% |
| Documents/notifications | 5% |
| Production hardening | 25% |

Overall production MVP readiness: `45%`.

## Release Decision

`BLOCKED`.

The current branch is suitable for continued internal development and controlled local preview. It is not ready for production customer use because the lead-to-cash, procure-to-pay, stock, document, and installation workflows are incomplete.

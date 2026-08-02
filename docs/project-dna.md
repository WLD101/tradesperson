# Tradesperson Network Flooring ERP - Project DNA

Date: 2026-07-30
Branch inspected: `codex/erp-foundation`
HEAD inspected: `fe540f9df0fc44701afb6794924ed5b5604ff97f`
Repository: `C:\Users\WLD10\Documents\tradesperson netwok`

## 1. What This Project Is

Tradesperson Network is a multi-tenant ERP SaaS platform for trades businesses, currently built flooring-first. It is not just a CRM or job tracker. Its intended product shape is an operating system for a flooring contractor:

1. Capture leads and customer/site details.
2. Survey rooms and calculate measured areas.
3. Build estimates from measurements and catalogue/supplier cost data.
4. Convert approved estimates into quotes.
5. Convert accepted quotes into installation jobs.
6. Reserve stock, issue materials, receive purchased goods, and return unused/damaged stock.
7. Schedule installation work.
8. Complete jobs with evidence.
9. Invoice and record payments.
10. Report operational health, stock, margin, and profitability.

The product is designed as a SaaS foundation, not a single-company internal tool. Almost every core table is tenant-owned and most operational surfaces are branch-aware.

## 2. Product DNA

### Core Identity

| DNA strand | Meaning |
| --- | --- |
| Industry | Flooring-first trades ERP |
| Business model | Multi-tenant SaaS |
| Primary users | Business owners, branch managers, procurement staff, estimators, installers, finance/admin users |
| Primary customer | Small to mid-size flooring contractors with stock, suppliers, site surveys, installation teams, and invoices |
| Workflow centre | Lead-to-payment with stock movement control |
| Data philosophy | Tenant-scoped, branch-aware, audited, transactional, server-authoritative calculations |
| Current maturity | Strong internal preview/MVP foundation; not yet a finished production ERP |

### Fastest Usable MVP Route

The shortest route to a usable flooring MVP remains:

`Stock reservation -> Material issue to job -> Installation scheduling -> Job completion -> Invoice/payment`

This route now exists in code at a basic working level. The next biggest product jump is not adding more modules randomly; it is making this route reliable, visible, tested, and easy to use end-to-end.

## 3. Technical Architecture

### Monorepo Layout

| Area | Purpose |
| --- | --- |
| `apps/api` | NestJS REST API, auth, permissions, business transactions, Prisma access |
| `apps/web` | Next.js App Router tenant web app and public portal pages |
| `apps/worker` | BullMQ worker foundation and health server |
| `packages/db` | Prisma schema, migrations, generated client, seeds |
| `packages/auth` | Auth/session helpers |
| `packages/config` | Environment validation |
| `packages/types` | Shared API/session types |
| `packages/ui` | Shared UI primitives |
| `docs` | Product, domain, architecture, roadmap, and audit documents |
| `e2e` and `apps/web/e2e` | Playwright smoke/UAT-style tests |

### Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 15, React 19, Tailwind CSS |
| Backend | NestJS 11 modular API |
| Database | PostgreSQL with Prisma ORM |
| Queue/cache | Redis and BullMQ |
| Storage | S3-compatible storage/MinIO via presigned URLs |
| Email/SMS foundations | SendGrid and Twilio providers |
| Billing foundation | Stripe checkout, portal, and webhook handling |
| Tests | Vitest, compiled isolation runner, Playwright |
| Local infra | Docker Compose: PostgreSQL, Redis, Mailpit, MinIO |

### Runtime URLs

Typical local services from the repository docs:

| Service | URL |
| --- | --- |
| Web | `http://localhost:3000` |
| API | `http://localhost:4000` |
| API health | `http://localhost:4000/api/v1/health` |
| API readiness | `http://localhost:4000/api/v1/ready` |
| Worker health | `http://localhost:4100/health` |
| Mailpit | `http://localhost:8025` |
| MinIO API | `http://localhost:9000` |
| MinIO console | `http://localhost:9001` |

## 4. Current Application Surface

### Implemented API Modules

The API currently imports these major modules:

| Module | Current role |
| --- | --- |
| Health | Health/readiness endpoints |
| Auth | Development sign-in, session, logout |
| Users | Current user endpoint |
| Tenants | Tenant list, current tenant, create/update/select |
| Memberships/Roles/Permissions | RBAC foundation |
| Branches | Branch list/detail/create/update |
| Audit | Audit log listing and write service |
| Settings | Tenant business settings |
| Invitations | User invitation flow |
| Subscriptions | Subscription/current-plan foundation |
| CRM | Leads, customers, sites/properties |
| Surveys | Surveys, rooms, measurement components, status |
| Catalogue | Product categories, manufacturers, brands, collections, units, products, variants |
| Suppliers | Suppliers, contacts, supplier-product links |
| Supplier pricing | Price lists, versions, product prices, history, imports, saved mappings |
| Procurement | Requisitions, POs, approvals, acknowledgements, delivery plans, goods receipts |
| Estimates | Estimate create/detail/edit, rooms, lines, recalculation, ready-for-quote |
| Quotes | Quote list/detail, create from estimate, send, approve, reject |
| Jobs | Job list/detail, create from quote, material requirements, stock reserve/issue/return, schedule, complete, invoice/payment |
| Inventory | Stock-balance reconciliation from movement ledger |
| Storage | Presigned upload/download URL foundation for file attachments |
| Flooring | Flooring-specific estimate calculation and roll-cut operations |
| Billing | Stripe checkout/portal/webhook foundation |
| Portal | Public estimate/invoice portal token access |
| Events/Notifications | Realtime and notification foundations |

### Implemented Web Areas

| Web area | Current surface |
| --- | --- |
| Auth | Sign-in and tenant selection |
| Dashboard | Tenant dashboard and recent activity |
| CRM | Leads, customers, properties, sites, site detail/edit |
| Surveys | Survey list/new/detail/measurements |
| Catalogue | Products, product detail/edit/new, categories, manufacturers, brands, collections, units |
| Suppliers | Supplier list/new/detail/edit, pricing hub, price-list detail, price-import workflows |
| Procurement | Hub, requisitions list/new/detail/edit, purchase orders list/new/detail/edit/print, goods receipts |
| Estimates | List/new/detail/edit |
| Quotes | List/detail |
| Jobs | List/detail with material, scheduling, completion, invoice/payment actions |
| Settings | Business, branches, users, roles, subscription |
| Portal | Public estimate and invoice pages |
| Billing components | Subscription plans, billing portal, invoice payment action |
| Shared UI | File dropzone, realtime toaster, design-system page |

## 5. Database DNA

The Prisma schema is broad and represents a real ERP data model. Important model families include:

| Family | Models |
| --- | --- |
| Identity and tenancy | `User`, `AuthSession`, `Tenant`, `TenantMembership`, `Role`, `Permission`, `RolePermission`, `MembershipRole` |
| Branch/admin | `Branch`, `TenantSetting`, `NumberSequence`, `Invitation`, `AuditLog` |
| Subscription/features | `Feature`, `SubscriptionPlan`, `PlanFeature`, `TenantSubscription`, `TenantFeatureOverride`, `StripeSubscription` |
| CRM | `Lead`, `Customer`, `Site` |
| Surveys | `Survey`, `SurveyRoom`, `MeasurementComponent` |
| Catalogue | `ProductCategory`, `Manufacturer`, `Brand`, `ProductCollection`, `UnitOfMeasure`, `Product`, `ProductVariant`, `ProductAttributeDefinition`, `ProductAttributeValue`, `ProductDocument`, `ProductImage` |
| Suppliers/pricing | `Supplier`, `SupplierContact`, `SupplierProduct`, `SupplierPriceList`, `SupplierPriceListVersion`, `SupplierProductPrice`, `SupplierProductPriceHistory`, `SupplierPriceImport`, `SupplierPriceImportRow`, `SupplierPriceImportMapping` |
| Procurement | `PurchaseRequisition`, `PurchaseRequisitionLine`, `PurchaseOrder`, `PurchaseOrderVersion`, `PurchaseOrderLine`, `SupplierAcknowledgement`, `PurchaseOrderDeliveryPlan` |
| Goods receipt/inventory | `GoodsReceipt`, `GoodsReceiptLine`, `InventoryWarehouse`, `StockBalance`, `StockReservation`, `InventoryMovement` |
| Commercial workflow | `Estimate`, `EstimateRoom`, `EstimateLine`, `EstimateVersion`, `Quote`, `QuoteLine`, `QuoteVersion`, `Job`, `MaterialRequirement`, `Invoice`, `Payment` |
| Attachments | `FileAttachment` |
| Flooring-specific | `InventoryRoll`, `RollCut`, `ShowroomSample` |
| Notifications | `NotificationLog` |

## 6. Completion Estimate

This is a practical engineering estimate based on code presence, transaction depth, UI availability, seed coverage, and tests. It is not a sales-ready claim.

### Overall Completion

| Target | Estimated completion | Meaning |
| --- | ---: | --- |
| Local technical foundation | 80% | Repo, infra, schema, core modules, seed, and local preview are substantially present |
| Internal demo / clickable MVP | 70% | Most screens and workflow pieces exist, but some flows are shallow or brittle |
| Usable flooring MVP for a friendly pilot | 58% | Core stock-to-payment route exists, but scheduling/resource assignment, profitability, PDFs, and UAT depth need work |
| Production-grade SaaS ERP | 38% | Needs security hardening, tenant/branch proof, billing maturity, reporting, observability, migration discipline, support operations |

### Module Completion Matrix

| Module | API | UI | Data model | Tests | Overall | Notes |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Auth and tenant selection | 80 | 75 | 85 | 55 | 74 | Development login works; production auth hardening still needed |
| Tenant/branch/RBAC | 78 | 55 | 85 | 60 | 70 | Good foundation; role editor and permission matrix need polish |
| Audit logs | 70 | 50 | 80 | 45 | 61 | Many core actions audited, not all lifecycle events proven |
| Dashboard | 55 | 65 | 50 | 20 | 48 | Loads but is not yet a deep operational command centre |
| CRM leads/customers/sites | 75 | 70 | 80 | 45 | 68 | Functional, but sales pipeline depth is limited |
| Surveys/measurements | 82 | 75 | 85 | 60 | 76 | Strong flooring measurement foundation |
| Catalogue | 88 | 82 | 90 | 65 | 81 | One of the strongest product areas |
| Suppliers | 88 | 82 | 90 | 65 | 81 | Supplier/contact/product linking is well-shaped |
| Supplier pricing/imports | 90 | 85 | 92 | 75 | 86 | Strong import workflow with versions/history/mappings |
| Requisitions and POs | 88 | 82 | 90 | 75 | 84 | Approval/version/ack/delivery-plan workflow exists |
| Goods receipt | 75 | 65 | 85 | 60 | 71 | Schema/API/UI/tests exist; needs broader UAT and operational polish |
| Inventory ledger/reconciliation | 70 | 25 | 80 | 55 | 58 | Ledger and reconciliation API exist; inventory UI/reporting still thin |
| Stock reservation/issue/return | 75 | 65 | 80 | 60 | 70 | MVP flow exists; damaged-stock operational handling needs stronger UX |
| Estimates | 72 | 65 | 82 | 50 | 67 | Estimate math exists; productized estimator UX needs work |
| Quotes | 65 | 55 | 75 | 40 | 59 | Basic quote lifecycle; PDF/acceptance evidence still incomplete |
| Jobs | 70 | 65 | 75 | 55 | 66 | Job conversion/material/schedule/complete/invoice actions exist |
| Installer/team scheduling | 15 | 5 | 10 | 0 | 8 | Major remaining blocker |
| Double-booking prevention | 10 | 0 | 5 | 0 | 4 | Major remaining blocker |
| Invoices/payments | 70 | 55 | 75 | 55 | 64 | Invoice/payment data flow exists; invoice PDF is missing |
| Job profitability | 20 | 10 | 30 | 0 | 15 | Estimate gross profit exists, but no full job profitability endpoint/report |
| Attachments/MinIO | 55 | 30 | 70 | 35 | 48 | Presigned URLs and attachment records exist; permission/entity validation must mature |
| Public portal | 45 | 40 | 55 | 25 | 41 | Estimate/invoice token pages exist, but acceptance/payment workflows need hardening |
| Billing/Stripe | 45 | 35 | 55 | 30 | 41 | Foundation exists; production billing lifecycle needs more work |
| Notifications/realtime | 40 | 25 | 50 | 20 | 34 | Providers/logging exist; business notifications are early |
| Playwright/UAT | 35 | 35 | 0 | 35 | 35 | Specs exist but are still smoke-level rather than full proof |

## 7. What Is Already Strong

### Strongest product areas

| Area | Why it is strong |
| --- | --- |
| Multi-tenant foundation | Most important records carry `tenantId`; services commonly enforce tenant context |
| Supplier pricing | Price lists, versions, current prices, history, imports, rows, validation, approval, execution, saved mappings |
| Catalogue and suppliers | Good domain shape for flooring products, variants, suppliers, supplier products |
| Procurement | Requisition-to-PO workflow is broad and includes approvals, versions, acknowledgements, delivery plans, and receipts |
| Survey calculations | Server-authoritative area/measurement foundation |
| Stock-to-job MVP path | Reservation, issue, return, schedule, complete, invoice, and payment exist |

### Good engineering choices

| Choice | Benefit |
| --- | --- |
| Modular NestJS API | Keeps domains separable and easier to mature |
| Prisma migrations | Gives a clear database evolution path |
| Tenant/branch access services | Central place for isolation enforcement |
| Permission guard/decorators | Route-level RBAC is visible and testable |
| Audit service | Enables compliance and operational traceability |
| Idempotency keys on critical flows | Protects against duplicate receipt/payment/import effects |
| Dedicated isolation runner | Correct instinct for cross-tenant and branch safety |
| Docker local infra | Makes preview and testing reproducible |

## 8. What Is Still Weak Or Risky

### Main product gaps

| Gap | Impact |
| --- | --- |
| Installer/team assignment is not real yet | Scheduling cannot answer who is doing the work |
| Double-booking prevention is missing | Calendar can accept conflicting jobs |
| Job profitability is not server-authoritative | Owner cannot trust margin/profit after materials, returns, invoices, and payments |
| Invoice PDF generation is missing | Cannot send a professional invoice artifact |
| Attachment security is partial | Presigned URLs exist, but entity-level permission checks and lifecycle policies need hardening |
| Inventory UI is thin | Ledger/reconciliation exists mostly server-side |
| Full Lead-to-Payment proof is missing | No single automated test proves the whole ERP route through all modules |
| Playwright UAT is shallow | Tests mostly prove page access/smoke interactions, not business correctness |
| Tenant isolation suite is currently expensive/slow | Runner hardening is in progress, but the suite must become reliable and fast enough for CI |

### Engineering risks

| Risk | Why it matters |
| --- | --- |
| Dirty working tree | Many current changes are uncommitted, so the exact product state is not fully captured by HEAD |
| Duplicate/conflicting docs | Some docs say beta-ready while others say blocked; this file should become the source of truth |
| `schema.prisma_new` exists | A stray schema copy can confuse future migration work |
| Some newer modules look scaffold-level | Billing, storage, portal, notifications, and flooring-specific roll inventory need deeper integration |
| No database RLS | Tenant isolation is application-enforced; safe if disciplined, risky if new queries bypass helpers |
| Test runtime issues | Long isolation runs can hide real failures unless timeout/progress logging is maintained |

## 9. Remaining Work By Priority

### Priority 1 - Finish The Usable Flooring MVP Path

| Work item | Current state | Remaining work |
| --- | --- | --- |
| Goods receipt | Implemented partially/mostly | Broaden UAT, verify damaged/rejected stock UX, confirm receipt edit/cancel rules |
| Partial/final PO receipts | Implemented partially/mostly | Prove with browser and full integration test |
| Inventory movement ledger | Implemented partially | Make ledger read UI, prevent manual mutation paths, add reporting |
| Stock-balance reconciliation | API exists | Add UI/admin workflow, isolate by branch, test mismatches |
| Job material returns | Implemented partially | Improve damaged stock visibility and downstream profitability treatment |
| Installation scheduling | Basic date scheduling exists | Add installer/team assignment |
| Double-booking prevention | Missing | Add installer/team calendar conflict checks |
| Job completion | Basic completion exists | Add photos/signoff/checklist/attachments |
| Invoice/payment | Basic flow exists | Add invoice PDF and customer-facing payment workflow |
| Job profitability | Missing/partial | Add server endpoint calculating revenue, material cost, returns, labour, gross profit, margin |

### Priority 2 - Prove It With Tests

| Test | Current state | Remaining work |
| --- | --- | --- |
| Tenant isolation | Exists but slow/hanging risk | Repair runner and complete cross-tenant/branch cases |
| API DB integration | Exists for procurement/jobs pieces | Add full Lead-to-Payment test |
| Playwright UAT | Smoke-level specs exist | Add browser journey from login to invoice/payment |
| Seed repeatability | Script exists | Keep updated with Tenant B and new modules |
| Migration proof | Scripts exist | Keep mandatory before release |

### Priority 3 - Production Hardening

| Area | Remaining work |
| --- | --- |
| Security | Attachment entity authorization, stricter portal token expiry, rate-limit review, secret hygiene |
| Observability | Structured logs, error tracking, audit coverage dashboard |
| Billing | Real Stripe product/price config, webhook idempotency, subscription gates |
| Notifications | Real templates, retries, event-driven send rules |
| Backups/ops | Database backup/restore process, storage lifecycle, deployment runbooks |
| Performance | Pagination everywhere, query indexes reviewed against real usage, import worker offloading |

## 10. Suggested Next Sprint Order

The fastest path from here should be:

1. Stabilize tenant-isolation runner and commit it.
2. Finish installer/team assignment models, API, UI, permissions, audit logs, and tests.
3. Add double-booking prevention around installer/team schedules.
4. Add server-side job profitability endpoint and job detail UI panel.
5. Add invoice PDF generation and secure download.
6. Harden attachments with entity-level permissions.
7. Add full DB-backed Lead-to-Payment test.
8. Add Playwright UAT for the same route.
9. Run full validation: `pnpm db:validate`, `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:seed`, `pnpm typecheck`, `pnpm lint`, API tests, isolation tests, Playwright.

## 11. Definition Of Done For A Real MVP

The product should not be called usable MVP until all of these are true:

| Requirement | Done? |
| --- | --- |
| Seeded user can login and select tenant | Mostly yes |
| Dashboard loads with tenant context | Mostly yes |
| Lead/customer/site/survey/catalogue/supplier data can be managed | Mostly yes |
| Estimate can be created from survey/product data | Partially |
| Quote can be created, sent/approved, and converted to job | Partially |
| Job material requirements can reserve stock | Mostly yes |
| Stock can be issued to job and recorded in ledger | Mostly yes |
| Purchased goods can be received into stock | Mostly yes |
| Unused/damaged stock can be returned from job | Partially/mostly |
| Installer/team can be assigned to job | No |
| Double-booking is prevented | No |
| Job can be completed with signoff/evidence | Partially |
| Invoice can be generated as data and PDF | Data yes, PDF no |
| Payment can be recorded and balances update | Mostly yes |
| Job profitability is calculated server-side | No/partial |
| Tenant A cannot access Tenant B data | Partially proven, needs runner stability |
| Branch-limited users cannot access other branches | Partially proven, needs full coverage |
| Full Lead-to-Payment automated test passes | No |
| Browser UAT passes headlessly | Smoke only |

## 12. Current Truth In One Paragraph

This is a serious ERP foundation, not a toy app. The project already has a broad database model, modular API, many functional web screens, seeded demo data, permissions, audit logging, procurement, supplier pricing, estimates, quotes, jobs, stock reservation/issue/return, goods receipt, and invoice/payment foundations. The gap is not imagination; the gap is closure. To become a usable flooring MVP, the project needs the remaining operational chain hardened around installer/team scheduling, booking conflicts, invoice PDFs, job profitability, secure attachments, and full end-to-end proof. As of this inspection, it is roughly 70% of a clickable internal MVP, about 58% of a friendly-pilot flooring MVP, and about 38% of a production-grade SaaS ERP.


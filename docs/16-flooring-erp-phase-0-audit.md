# Flooring ERP Phase 0 Audit

Date: 2026-07-15

Scope: repository audit and gap analysis for the UK multi-tenant Tradesperson Network Flooring ERP.

Status labels used in this document:

- `Existing and verified`
- `Existing but incomplete`
- `Missing`
- `Proposed`
- `Blocked`
- `Requires UK legal/accounting review`

## 1. Existing Repository Audit

### Existing and verified

- Monorepo foundation exists with `apps/api`, `apps/web`, `apps/worker`, `packages/*`, Docker, Turborepo, and Prisma.
- API foundation exists in NestJS with versioned routes, response envelope, Swagger bootstrap, helmet, throttling, and cookie-based session flow.
- Shared tenancy foundation exists:
  - users
  - tenants
  - memberships
  - roles
  - permissions
  - branches
  - invitations
  - subscriptions
  - audit logs
- Prisma migrations exist for:
  - `20260711175620_phase_1_foundation`
  - `20260715120000_phase_2_crm_foundation`
- Web application exists for:
  - sign-in
  - tenant selection
  - dashboard
  - business settings
  - branches
  - users
  - roles
  - subscription
  - CRM foundation pages for leads, customers, and properties
- Seed data exists for demo tenant, memberships, invitations, and baseline CRM data.
- Workspace validation currently passes:
  - `pnpm db:generate`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm lint`

### Existing but incomplete

- CRM exists only as a foundation:
  - leads
  - customers
  - properties
  - simple lead conversion
- Audit exists, but not yet at the full operational event depth required by flooring, finance, stock, and compliance.
- Permissions exist, but they are not yet threshold-aware, branch-policy-rich, or finance-sensitive.
- API modules are functional, but current implementation is controller-heavy and does not yet follow the target repository pattern of domain services, repositories, policies, and explicit workflow services.
- Web UX is functional for admin and basic CRM entry, but not yet aligned to the full task-focused flooring workflow.
- Tests exist, but are limited to a few unit tests and do not yet cover:
  - CRM transitions
  - financial rules
  - stock concurrency
  - end-to-end flooring journeys
- Survey domain (Survey, Rooms, Measurements) exists, but missing photos, signatures, and mobile/offline capabilities.

### Missing

- Customer contacts and communication history
- Tasks, reminders, activity log, duplicate detection, saved filters
- Flooring product catalogue and price history
- Estimation engine and quantity strategies by flooring type
- Quote versions, acceptance evidence, deposit handling
- Contracts, sales orders, jobs, scheduling, fitters, subcontractors
- Suppliers, purchasing, warehouses, inventory, roll cutting, remnants
- Invoicing, payments, VAT decision records, CIS workflows
- Document service, storage workflows, malware scanning, signature evidence
- Customer, supplier, and subcontractor portals
- Reporting module
- CI workflow in `.github`
- RLS or equivalent database-level tenant enforcement

## 2. Gap Analysis

### Current completion by phase

- Phase 0 Repository and requirements audit: `Existing but incomplete`
- Phase 1 Platform foundation: `Existing but incomplete`
- Phase 2 Flooring CRM and surveys: `Existing and verified`
- Phase 3 Catalogue, estimating and quotations: `Missing`
- Phase 4 Procurement and stock: `Missing`
- Phase 5 Jobs and fitting: `Missing`
- Phase 6 Finance and compliance: `Missing`
- Phase 7 Portals and automation: `Missing`
- Phase 8 Production hardening: `Missing`

### Major architectural gaps

- Current API logic is still concentrated in module/controller files instead of domain services and repositories.
- Current schema does not yet carry `createdBy`, `updatedBy`, `deletedAt`, or optimistic locking consistently across tenant-owned tables.
- Current CRM model is generic compared with the flooring-specific brief. It needs site separation, richer lead fields, pipeline audit, and task/reminder workflows.
- No storage abstraction or document domain exists yet for surveys, product sheets, quote PDFs, RAMS, or completion packs.
- No explicit workflow engine or state transition tables exist for leads, surveys, quotes, jobs, or finance.

### Delivery risk

- The repo is ahead on foundation compared with original docs, but requirements traceability is behind.
- Recent CRM work is useful, but it is still below the flooring-specific definition of done from the brief.
- Without tenant-isolation tests and stronger domain boundaries, continuing feature work will increase rework later.

## 3. Final Module Map

### Shared platform core

| Module | Status | Notes |
| --- | --- | --- |
| Identity | Existing and verified | Session auth present |
| Tenancy | Existing and verified | Active tenant selection present |
| Organisations | Existing but incomplete | Tenant settings present, legal/financial org model incomplete |
| Branches | Existing and verified | Admin branch CRUD present |
| Permissions | Existing but incomplete | CRUD-level and simple view/manage permissions only |
| Audit | Existing but incomplete | Foundation present, event coverage incomplete |
| Notifications | Missing | Worker exists, notification domain not implemented |
| Documents | Missing | No document service yet |
| Communications | Missing | No email/SMS/WhatsApp log domain yet |
| Reporting | Missing | Dashboard is summary-only |

### Flooring business modules

| Module | Status | Notes |
| --- | --- | --- |
| CRM | Existing but incomplete | Leads/customers/properties only |
| Customers | Existing but incomplete | No contacts, balances, consent, history |
| Sites | Missing | Properties exist, but full site model does not |
| Surveys | Missing | No appointment or measurement workflow |
| Measurements | Missing | No room or area model |
| Product catalogue | Missing | No product domain yet |
| Pricing | Missing | No price history or rules |
| Estimates | Missing | No estimate model or engine |
| Quotations | Missing | No quote versions or acceptance |
| Contracts | Missing | No contract model |
| Sales orders | Missing | No conversion workflow |
| Purchasing | Missing | No requisitions, POs, receipts |
| Suppliers | Missing | No supplier domain |
| Inventory | Missing | No warehouses, stock items, rolls, remnants |
| Jobs | Missing | No job lifecycle |
| Scheduling | Missing | No calendar or assignments |
| Fitters | Missing | No fitter or team model |
| Subcontractors | Missing | No subcontractor or CIS verification |
| Variations | Missing | No variation workflow |
| Quality and snagging | Missing | No snag/inspection domain |
| Finance | Missing | No invoices, payments, credit notes |
| Payments | Missing | No payment provider or allocation model |
| Portals | Missing | None of customer/supplier/subcontractor portals exist |
| Integrations | Missing | None beyond future-oriented architecture notes |

## 4. User-Role Matrix

| Role | Current status | Expected scope |
| --- | --- | --- |
| Platform super administrator | Missing | Platform admin, tenant support, integrations |
| Tenant owner | Existing and verified | Full tenant control |
| Business administrator | Missing | Broader operational admin without full ownership |
| Branch manager | Existing and verified | Branch operational access |
| Salesperson | Missing | CRM, quotes, follow-up |
| Surveyor/estimator | Missing | Survey capture, measures, estimates |
| Project manager | Missing | Job oversight and blockers |
| Scheduler | Missing | Scheduling, assignments |
| Warehouse manager | Missing | Stock, transfers, cut approvals |
| Warehouse operative | Missing | Receipts, picking, adjustments |
| Accounts administrator | Missing | Invoicing, payments, VAT, credit notes |
| Employed fitter | Missing | Mobile job pack, completion |
| Subcontracted fitter | Missing | Portal, compliance, CIS |
| Customer | Missing | Portal user only |
| Supplier user | Missing | Supplier portal user |
| Accountant/read-only auditor | Missing | Read-only finance and audit reporting |

## 5. Permission Matrix

### Existing and verified

- `branches.manage`
- `branches.view`
- `settings.manage`
- `users.invite`
- `users.view`
- `roles.manage`
- `roles.view`
- `subscriptions.view`
- `audit.view`
- `leads.view`
- `leads.manage`
- `customers.view`
- `customers.manage`
- `properties.view`
- `properties.manage`

### Proposed next permission groups

- CRM:
  - `lead.assign`
  - `lead.export`
  - `lead.import`
  - `task.manage`
  - `survey.book`
- Surveys:
  - `survey.create`
  - `survey.complete`
  - `measurement.manage`
  - `survey.signoff`
- Products and pricing:
  - `product.manage`
  - `price.import`
  - `price.override`
  - `margin.view`
- Stock and purchasing:
  - `supplier.manage`
  - `purchase.approve`
  - `stock.adjust`
  - `stock.reserve`
  - `roll.cut`
  - `batch.override`
- Finance:
  - `invoice.issue`
  - `creditnote.issue`
  - `payment.record`
  - `refund.approve`
  - `tax.override`
  - `bank.view`
- Compliance:
  - `cis.verify`
  - `gdpr.export`
  - `gdpr.erase`

## 6. End-to-End Workflow Diagrams

```mermaid
flowchart LR
  A["Enquiry"] --> B["Lead Qualification"]
  B --> C["Survey Booking"]
  C --> D["Site Survey"]
  D --> E["Room Measurements"]
  E --> F["Estimate"]
  F --> G["Quote Version"]
  G --> H["Customer Review and Acceptance"]
  H --> I["Deposit"]
  I --> J["Sales Order and Job"]
  J --> K["Stock Reservation or Procurement"]
  K --> L["Scheduling"]
  L --> M["Installation"]
  M --> N["Completion and Sign-off"]
  N --> O["Final Invoice"]
  O --> P["Payment Allocation"]
  P --> Q["Warranty and Aftercare"]
```

### Current verified coverage

- `Enquiry`
- `Lead Qualification`
- partial `Customer` creation
- partial `Property` creation

### Missing workflow coverage

- every step from survey onward

## 7. State-Transition Tables

### Lead pipeline

| State | Current status | Notes |
| --- | --- | --- |
| New | Existing but incomplete | Present as `NEW` |
| Contact attempted | Missing | |
| Contacted | Missing | |
| Qualified | Existing but incomplete | Present as `QUALIFIED` |
| Survey required | Missing | |
| Survey booked | Missing | |
| Survey completed | Missing | |
| Estimating | Missing | |
| Quote sent | Missing | |
| Follow-up | Missing | |
| Negotiation | Missing | |
| Won | Existing but incomplete | Present on conversion |
| Lost | Existing but incomplete | Present as enum, no workflow rules |
| Deferred | Missing | |
| Cancelled | Missing | |

### Job lifecycle

| State | Current status |
| --- | --- |
| Draft | Missing |
| Awaiting deposit | Missing |
| Awaiting product confirmation | Missing |
| Awaiting procurement | Missing |
| Materials ordered | Missing |
| Partially received | Missing |
| Ready to schedule | Missing |
| Scheduled | Missing |
| Preparation in progress | Missing |
| Ready for fitting | Missing |
| Installation in progress | Missing |
| Awaiting inspection | Missing |
| Snagging | Missing |
| Completed | Missing |
| Signed off | Missing |
| Final invoice issued | Missing |
| Paid | Missing |
| Closed | Missing |
| On hold | Missing |
| Cancelled | Missing |

## 8. Entity-Relationship Design

### Existing and verified

- Tenant
- Branch
- User
- Membership
- Role
- Permission
- Invitation
- SubscriptionPlan
- TenantSubscription
- TenantSetting
- NumberSequence
- AuditLog
- Lead
- Customer
- Property

### Existing but incomplete

- `Property` is acting as a temporary site record, but the brief requires a richer `Site` model with multiple parties and invoice relationships.

### Proposed next ERD slice

- CRM:
  - Customer
  - CustomerContact
  - Site
  - Lead
  - LeadActivity
  - Task
  - Consent
- Surveys:
  - Survey
  - SurveyAppointment
  - SurveyRoom
  - Measurement
  - MoistureReading
  - SurveyPhoto
  - Signature
- Shared support:
  - Document
  - Communication
  - Notification

### ERD design rules

- Every tenant-owned record must include:
  - `tenantId`
  - `branchId` where applicable
  - `createdAt`
  - `updatedAt`
  - `createdBy`
  - `updatedBy`
  - `deletedAt` where soft deletion applies
- Financial amounts must use fixed-precision decimal or integer minor units.
- Quantity fields for flooring must use decimal precision suitable for:
  - area
  - linear metres
  - roll lengths
  - coverage rates
  - percentages

## 9. API Plan

### Existing and verified

- `/api/v1/auth/*`
- `/api/v1/tenants/*`
- `/api/v1/memberships/*`
- `/api/v1/branches/*`
- `/api/v1/roles/*`
- `/api/v1/permissions`
- `/api/v1/settings`
- `/api/v1/subscriptions/current`
- `/api/v1/invitations/*`
- `/api/v1/audit-logs`
- `/api/v1/leads`
- `/api/v1/customers`
- `/api/v1/properties`

### Proposed next endpoints

- CRM:
  - `GET /api/v1/leads/:id`
  - `POST /api/v1/leads/:id/activities`
  - `POST /api/v1/leads/:id/tasks`
  - `GET /api/v1/sites`
  - `POST /api/v1/sites`
- Surveys:
  - `GET /api/v1/surveys`
  - `POST /api/v1/surveys`
  - `GET /api/v1/surveys/:id`
  - `POST /api/v1/surveys/:id/rooms`
  - `POST /api/v1/surveys/:id/photos`
  - `POST /api/v1/surveys/:id/complete`
- Cross-cutting:
  - pagination
  - sorting allowlists
  - saved filters
  - idempotency keys for conversion and document generation

## 10. Flooring Calculation Specification

Status: `Missing`

### Proposed design

- Strategy-based calculation engine keyed by flooring method:
  - carpet roll
  - sheet vinyl roll
  - carpet tile
  - LVT plank/tile
  - laminate
  - wood
  - safety flooring
  - stairs
- Inputs:
  - measured room geometry
  - product dimensions
  - coverage
  - pattern repeat
  - direction
  - seam rules
  - waste rules
  - pack rounding
  - accessory coverage
  - labour templates
- Outputs:
  - order quantity
  - accessory quantity
  - labour estimate
  - cost
  - margin
  - VAT basis
- Calculation implementation must be server-side with deterministic test fixtures.

## 11. VAT/CIS Decision-Model Specification

Status: `Missing`

### Requires UK legal/accounting review

- domestic VAT reverse charge scenarios
- end-user and intermediary tests
- CIS verification and deduction rules
- retention handling
- deposit tax-point behaviour
- cancellation and cooling-off wording

### Proposed design

- Tax decision record captured at invoice creation with:
  - customer type
  - VAT status
  - CIS relevance
  - reverse-charge decision
  - chosen rule version
  - manual override and approver
- Decision service must be separate from invoice presentation logic.

## 12. Security Threat Model

### Existing and verified

- Cookie-based session model
- Helmet headers
- input validation
- request correlation context
- audit logging
- permission guard

### Existing but incomplete

- tenant isolation is application-enforced but not yet proven by integration tests
- no malware scanning flow for uploads
- no secrets rotation or production security documentation
- no branch-restricted policy matrix tests

### Primary threats

- tenant data exposure through missing tenant predicates
- branch leakage through insufficient branch filters
- quote/invoice mutation without immutable versioning
- stock race conditions
- financial override without approval trail
- unsafe uploads once documents are added
- replay of payment or integration webhooks

## 13. Implementation Roadmap

### Revised roadmap

1. Phase 0 closeout
   - commit this audit
   - align docs and acceptance criteria
   - add traceability from brief to modules
2. Phase 1 hardening
   - add `createdBy`, `updatedBy`, `deletedAt` strategy
   - add tenant-isolation integration tests
   - add branch policy enforcement patterns
   - add CI workflow
3. Phase 2 flooring CRM and surveys
   - enrich lead model to flooring brief
   - add sites, contacts, tasks, reminders
   - add survey appointments, rooms, measurements, photos, signatures
4. Phase 3 catalogue, estimating, quotations
   - product and supplier catalogue
   - pricing history
   - estimation engine
   - quote versioning and acceptance
5. Phase 4 procurement and stock
   - suppliers, POs, goods receipt, warehouses
   - roll and remnant inventory
6. Phase 5 jobs and fitting
   - jobs, scheduling, fitters, completion, snagging
7. Phase 6 finance and compliance
   - invoices, payments, VAT/CIS, costing
8. Phase 7 portals and automation
9. Phase 8 hardening

## 14. Acceptance Criteria

### Current tested functional scope

- users can sign in
- users can select a tenant
- tenant settings and branches can be managed
- invitations and roles are present
- audit logs are visible
- leads can be created
- leads can be converted into customers and properties

### Missing before flooring MVP can be claimed

- survey lifecycle
- room measurement
- flooring quantity calculations
- quote issue and acceptance
- deposit collection
- stock reservation or procurement
- scheduling and job pack delivery
- completion sign-off
- invoicing and payment
- profitability review
- snagging and warranty flow

## 15. Test Strategy

### Existing and verified

- unit tests for auth, config, audit sanitisation, and tenant access

### Missing

- API contract tests
- CRM integration tests
- tenant isolation tests
- permission matrix tests
- flooring calculation tests
- VAT and reverse-charge tests
- CIS tests
- stock concurrency tests
- Playwright e2e coverage

### Proposed next test sequence

1. tenant-isolation integration tests
2. CRM lead/site/task integration tests
3. survey workflow tests
4. flooring calculation fixtures
5. quote acceptance and conversion transaction tests

## 16. Risks and Assumptions

### Risks

- Current schema may need non-trivial migration refactors to add missing common audit fields consistently.
- Current CRM naming uses `Property`; this should likely evolve toward a proper `Site` model to match the brief.
- Controller-heavy module implementations will become harder to maintain as stock and finance workflows arrive.
- Financial and compliance modules must not proceed on assumptions without explicit UK review points.

### Assumptions

- Flooring remains the first production vertical and should shape shared module design.
- Existing NestJS, Next.js, Prisma, BullMQ, and Docker foundations remain the target stack.
- The branch `codex/erp-foundation` remains the ERP integration branch.

### Blocked

- None technically for documentation.
- Compliance-sensitive modules are functionally blocked on later legal/accounting review before “done” claims.

## Recommended Immediate Next Tasks

1. Add tenant-isolation integration tests to prove the current foundation is safe.
2. Refactor CRM toward `Site`, `Task`, and richer lead lifecycle support from the flooring brief.
3. Add survey domain models and APIs before moving deeper into generic CRM.
4. Introduce shared service and repository patterns so future stock and finance logic does not accumulate in controllers.

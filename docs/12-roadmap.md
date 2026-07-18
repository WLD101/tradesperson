# Implementation Roadmap

## Phase 1 Foundation

- monorepo setup
- docs
- docker and local infra
- Prisma baseline
- auth and session model
- tenant resolution
- memberships, roles, permissions
- branches
- audit framework

## Phase 2 CRM

- leads
- customers
- contacts
- properties
- tasks
- activities
- appointments

## Phase 3 Flooring Survey

- surveys
- rooms
- sections
- photos
- signatures
- measurement engine

## Phase 4 Catalogue And Pricing

- products
- services
- suppliers
- price lists
- waste rules
- installation rates

### Phase 4 progress checkpoint

- Phase A catalogue foundation is implemented
- Phase B supplier foundation is implemented
- Phase C supplier pricing is implemented and closure-verified on Saturday, July 18, 2026 with:
  - supplier price lists, versions, supplier product pricing, and price history
  - persisted CSV/XLSX supplier imports with 5 MB enforcement, worksheet selection, header-row selection, and BOM-safe parsing
  - saved mappings, manual row matching, validation, approval, execution, rollback safety, and sequential/concurrent idempotency
  - import row persistence with pagination, search, sorting, match filters, execution filters, duplicate-only filtering, and warning-only filtering
  - pricing hub, price-list detail, import management, and authorised product pricing visibility
- Phase D is the next phase and starts with purchase requisitions and purchase orders

## Phase 5 Quotes

- quote builder
- versions
- calculations
- approval
- PDF generation
- sending
- portal acceptance

## Phase 6 Jobs And Scheduling

- job conversion
- work orders
- assignments
- calendar
- checklists
- completion

## Phase 7 Inventory And Purchasing

- stock locations
- movements
- reservations
- purchase orders
- goods receipt
- supplier returns

## Phase 8 Finance

- deposit invoices
- final invoices
- payments
- credit notes
- profitability

## Phase 9 Reporting And Admin

- dashboards
- reports
- tenant settings
- platform admin
- subscriptions
- feature flags
- integrations

## Phase 10 Hardening

- security review
- tenant isolation coverage
- performance
- accessibility
- backup verification
- monitoring

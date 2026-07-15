# Product Requirements Document

## Problem Statement

UK trades businesses often operate from fragmented tools: spreadsheets, messaging apps, quoting software, accounting tools, and manual job scheduling. Flooring businesses have extra complexity around room measurement, waste rules, roll widths, pack quantities, stock reservations, and installer coordination.

Tradesperson.net needs an ERP that helps tenants run their businesses and also creates future integration points with the public marketplace.

## Goals

- Provide a flooring-first ERP that handles sales, operations, stock, purchasing, and finance.
- Support multi-tenant SaaS operations with strong data isolation.
- Enable branch-aware operations for showrooms, warehouses, and mobile fitting teams.
- Support employees and subcontractors.
- Provide auditable quote, stock, invoice, and payment workflows.
- Establish extension points for future trade modules.

## Non-Goals

- Native mobile apps in MVP
- Full general ledger accounting
- AI floorplan extraction
- Advanced route optimization
- Microservices or Kubernetes

## Personas

### Business Owner

Wants dashboards, profitability, staffing visibility, and reliable operational control.

### Salesperson

Needs fast lead handling, follow-ups, quote generation, and customer communications.

### Surveyor

Needs mobile-friendly survey capture, room measurement, photos, and signatures.

### Scheduler

Needs visibility into deposits, material readiness, installer availability, and job status.

### Warehouse Manager

Needs stock visibility, reservations, goods receipt, transfers, and low-stock alerts.

### Accountant

Needs invoices, deposits, allocations, overdue balances, VAT-ready outputs, and audit history.

### Platform Support Agent

Needs tenant status, onboarding visibility, integration health, and audited support access.

## User Journeys

### Lead to Quote

1. Lead arrives from marketplace or manual entry.
2. Salesperson qualifies lead and books survey.
3. Surveyor measures rooms and captures constraints.
4. Salesperson builds quote using products, services, waste rules, and labour.
5. Quote is reviewed, versioned, and sent.

### Quote to Completion

1. Customer approves quote and pays deposit.
2. Job is created from accepted quote version.
3. Materials are reserved or ordered.
4. Scheduler assigns installers.
5. Job is completed with photos, checklist, and sign-off.
6. Final invoice is issued and payment is recorded.

### Purchasing and Inventory

1. Job material requirements create reservation demand.
2. Stock is reserved where available.
3. Purchase orders cover shortages.
4. Goods receipt updates stock and reservation fulfillment.

## Functional Requirements

- Multi-tenant auth, membership, branch context, and permission checks
- Leads, customers, contacts, properties, activities, tasks, and appointments
- Flooring surveys with rooms, sections, waste-aware calculations, signatures, and photos
- Product catalogue, services, suppliers, pricing, and VAT rules
- Quote builder with versions, options, approvals, PDF generation, and digital acceptance
- Jobs, work orders, scheduling, assignments, checklists, and completion
- Inventory, reservations, transfers, adjustments, and goods receipt
- Purchasing, supplier returns, and approval flow
- Invoices, payments, credit notes, and overdue tracking
- Documents, notifications, audit logs, dashboard reporting, and platform admin

## Success Metrics

- Tenant can complete the full MVP workflow without spreadsheet fallback
- Quote acceptance to job conversion requires zero duplicate entry
- Tenant isolation tests pass for all tenant-owned entities
- Critical e2e workflow passes under Playwright
- Demo seed data convincingly showcases the product

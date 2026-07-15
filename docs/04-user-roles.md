# Roles And Permissions Matrix

## Role Model

Users belong to one or more tenants through `tenant_memberships`. Roles are assigned to memberships, not directly to users.

## Platform Roles

| Role                      | Key Access                                                        |
| ------------------------- | ----------------------------------------------------------------- |
| Platform Super Admin      | tenant lifecycle, plans, features, support access, audits         |
| Platform Support Agent    | onboarding, support tools, limited support impersonation requests |
| Platform Finance Admin    | subscription billing, invoices, refunds, usage billing            |
| Platform Compliance Admin | audit review, access review, GDPR workflows                       |

## Tenant Roles

| Role                   | Typical Access                                                    |
| ---------------------- | ----------------------------------------------------------------- |
| Business Owner         | full tenant management including settings, reports, margin, users |
| Director               | broad read/write with financial visibility                        |
| Branch Manager         | branch operations, jobs, quotes, staff scheduling                 |
| Salesperson            | leads, customers, properties, quotes, follow-ups                  |
| Estimator              | surveys, product selection, pricing, quote preparation            |
| Surveyor               | survey scheduling, measurements, signatures, photos               |
| Scheduler              | job scheduling, installer assignments, work orders                |
| Warehouse Manager      | stock, reservations, goods receipt, transfers, adjustments        |
| Warehouse Assistant    | stock handling without approval permissions                       |
| Installer/Fitter       | assigned jobs, checklists, completion, snagging                   |
| Subcontractor          | limited assigned work orders and completion actions               |
| Accountant             | invoices, payments, credit notes, finance reports                 |
| Customer Service Agent | customer communications, documents, portal support                |
| Read-Only Auditor      | read-only operational and audit visibility                        |

## Sensitive Permission Set

- `pricing.view_cost`
- `pricing.view_margin`
- `quotes.apply_discount`
- `quotes.approve`
- `purchase_orders.approve`
- `inventory.adjust`
- `payments.refund`
- `data.export`
- `users.manage`
- `audit.view`
- `support_access.grant`

## Permission Groups

### CRM

- `leads.view`
- `leads.create`
- `leads.update`
- `leads.assign`
- `customers.view`
- `customers.create`
- `customers.update`
- `properties.manage`
- `tasks.manage`
- `appointments.manage`

### Surveys

- `surveys.view`
- `surveys.create`
- `surveys.complete`
- `surveys.revisit`
- `surveys.upload_documents`

### Quotes

- `quotes.view`
- `quotes.create`
- `quotes.update_draft`
- `quotes.send`
- `quotes.approve`
- `quotes.convert_to_job`

### Operations

- `jobs.view`
- `jobs.schedule`
- `jobs.assign_installers`
- `jobs.complete`
- `work_orders.manage`

### Inventory And Purchasing

- `products.manage`
- `inventory.view`
- `inventory.adjust`
- `inventory.reserve`
- `purchase_orders.create`
- `purchase_orders.approve`
- `goods_receipts.record`

### Finance

- `invoices.create`
- `payments.record`
- `credit_notes.issue`
- `expenses.manage`
- `reports.view_finance`

### Administration

- `settings.manage`
- `branches.manage`
- `users.invite`
- `roles.manage`
- `integrations.manage`

## Permission Rules

- Branch restrictions can further narrow tenant role access.
- Platform users do not automatically gain tenant data access.
- Support access must be explicitly granted, time-bound, and audited.

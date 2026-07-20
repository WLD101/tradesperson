# Flooring Procurement Domain

Prepared: July 18, 2026

## Scope
Phase D introduces the first production procurement slice for the flooring ERP. This slice adds tenant-safe purchase requisitions, purchase orders, purchase-order versioning, approval controls, supplier acknowledgement capture, delivery planning, and a functional internal web UI. The phase builds directly on the completed supplier, supplier-product, and supplier-pricing foundations from Phases B and C.

Closure target for this slice:
- purchase requisitions and requisition lines
- purchase orders, versions, and lines
- approval and issue workflow
- supplier price resolution with immutable snapshots
- supplier acknowledgement and delivery plans
- tenant isolation, branch ownership, permissions, and audit events
- browser-print purchase-order view

Still out of scope for this first Phase D slice:
- goods receipt
- warehouse stock
- stock movements
- supplier invoices
- accounts payable
- full inventory valuation
- automated PDF generation beyond browser print

## Authoritative Domain Principles
- Every procurement record is tenant-owned.
- Requisitions and purchase orders are branch-owned operationally, even when branch access is broader for some users.
- The server derives tenant context from the authenticated membership and never trusts client-supplied tenant ownership.
- Supplier pricing is resolved server-side from Phase C price data and then snapshotted into purchase-order versions.
- Approved and issued purchase-order versions are immutable history.
- Procurement totals are server-authoritative and use decimals, never floating point.
- UI visibility follows permissions, but permission enforcement lives in the API.

## Data Model
- `PurchaseRequisition`
- `PurchaseRequisitionLine`
- `PurchaseOrder`
- `PurchaseOrderVersion`
- `PurchaseOrderLine`
- `SupplierAcknowledgement`
- `PurchaseOrderDeliveryPlan`

### PurchaseRequisition
- tenant-owned
- branch-owned
- numbered by `requisitionNumber`
- lifecycle fields:
  - `status`
  - `submittedAt`
  - `approvedAt`
  - `rejectedAt`
  - `cancelledAt`
- actor fields:
  - `requestedById`
  - `approvedById`
- workflow data:
  - `requiredDate`
  - `purpose`
  - `internalNotes`

Suggested status set:
- `DRAFT`
- `SUBMITTED`
- `APPROVED`
- `REJECTED`
- `PARTIALLY_ORDERED`
- `ORDERED`
- `CANCELLED`

### PurchaseRequisitionLine
- tenant-owned
- belongs to one requisition
- references a product and optional product variant
- may reference a `SupplierProduct`
- stores requested quantity, unit, required date, preferred supplier, estimated unit cost, estimated total, and notes
- tracks ordered allocation so partial conversion remains auditable

### PurchaseOrder
- tenant-owned
- branch-owned
- belongs to one supplier
- may link back to a source requisition
- numbered by `purchaseOrderNumber`
- stores current lifecycle and points to the current version
- stores commercial rollups:
  - `currency`
  - `subtotal`
  - `taxAmount`
  - `deliveryAmount`
  - `total`
- stores commercial dates and supplier-facing fields:
  - `requiredDate`
  - `expectedDate`
  - `deliveryAddress`
  - `supplierReference`
  - `internalNotes`

Suggested status set:
- `DRAFT`
- `PENDING_APPROVAL`
- `APPROVED`
- `ISSUED`
- `ACKNOWLEDGED`
- `PARTIALLY_FULFILLED`
- `FULFILLED`
- `CANCELLED`
- `REJECTED`

For this slice, `PARTIALLY_FULFILLED` and `FULFILLED` are modelled but not driven from the UI. They are reserved for later goods-receipt integration.

### PurchaseOrderVersion
- tenant-owned
- belongs to one purchase order
- versioned by integer `versionNumber`
- snapshots commercial header fields and totals
- immutable once approved or issued
- stores approver and issuer metadata
- owns all `PurchaseOrderLine` rows for that version

Suggested version status set:
- `DRAFT`
- `PENDING_APPROVAL`
- `APPROVED`
- `ISSUED`
- `REJECTED`
- `CANCELLED`

### PurchaseOrderLine
- tenant-owned
- belongs to one purchase-order version
- may reference source requisition line
- stores product, optional variant, supplier product, supplier SKU, description, unit, quantity, unit cost, tax, totals, required date, expected date, notes, and display order
- stores immutable price snapshot data rather than depending on live supplier prices later

### SupplierAcknowledgement
- tenant-owned
- belongs to one purchase order and optionally a specific version
- captures supplier response, supplier reference, expected delivery date, and notes

Suggested statuses:
- `PENDING`
- `ACCEPTED`
- `ACCEPTED_WITH_CHANGES`
- `REJECTED`

### PurchaseOrderDeliveryPlan
- tenant-owned
- belongs to one purchase order and optionally a specific version
- captures expected date, delivery address, supplier reference, notes, and a simple planning status

Suggested statuses:
- `PLANNED`
- `CONFIRMED`
- `DELAYED`
- `CANCELLED`
- `COMPLETED`

`COMPLETED` remains informational in this slice and must not create stock movements.

## Ownership And Tenancy Rules
- Every procurement table includes `tenantId`.
- Requisitions and purchase orders include `branchId`.
- Suppliers, products, variants, and supplier products must resolve within the same tenant.
- A referenced `ProductVariant` must belong to the chosen `Product`.
- A referenced `SupplierProduct` must belong to the selected supplier.
- A requisition or purchase order may only be created inside the caller's active tenant context.
- Platform-level or cross-tenant administrative access is not inferred automatically; it must continue to use explicit supported access paths.

## Branch Rules
- A requisition belongs to exactly one branch.
- A purchase order belongs to exactly one branch.
- Branch defaults can be inferred from the active membership or source record, but final ownership remains server-authoritative.
- Branch filters are available in lists for authorized users.
- Cross-branch reads and writes follow the existing tenant membership and role model. This phase does not introduce a new branch ACL layer, but it preserves branch ownership in all records.

## Numbering
The repository already contains tenant-scoped `NumberSequence`, which will be extended for procurement.

Required procurement sequences:
- `purchase-requisition`
- `purchase-order`

Display format:
- requisition: `PR-2026-000001`
- purchase order: `PO-2026-000001`

Rules:
- generated server-side only
- unique per tenant and sequence key
- monotonic under concurrency
- stable after create
- retry-safe within transactions
- never replaced by client values

## Requisition Lifecycle
Allowed path:
1. `DRAFT` -> editable
2. `SUBMITTED` -> locked pending decision
3. `APPROVED` -> eligible for PO conversion
4. `REJECTED` -> terminal unless future reopen support is introduced
5. `PARTIALLY_ORDERED` -> some approved quantity converted
6. `ORDERED` -> all approved quantity converted
7. `CANCELLED` -> terminal if lifecycle permits

Rules:
- drafts can add, edit, and remove lines
- submitted requisitions cannot silently change approved commercial intent
- rejected or cancelled requisitions cannot create purchase orders
- PO conversion is transactional
- conversion cannot exceed remaining approved quantity without an explicit override permission
- ordered-allocation must be derived from linked PO lines, not browser counters

## Purchase-Order Lifecycle
Allowed path:
1. `DRAFT`
2. `PENDING_APPROVAL`
3. `APPROVED`
4. `ISSUED`
5. `ACKNOWLEDGED`
6. `CANCELLED`
7. reserved downstream states for receipt integration

Rules:
- only draft versions are editable
- submitting a draft locks that version from line edits
- approval records actor and timestamp
- issue records actor and timestamp
- material post-approval or post-issue changes create a new draft version
- issued purchase orders are never deleted
- cancelled purchase orders remain visible in audit and history

## Approval And Permission Model
Permissions introduced for Phase D:

| Permission | Purpose |
| --- | --- |
| `procurement.requisition.view` | Read requisitions and requisition lines |
| `procurement.requisition.create` | Create requisitions |
| `procurement.requisition.manage` | Edit draft requisitions and draft lines |
| `procurement.requisition.submit` | Submit requisitions |
| `procurement.requisition.approve` | Approve or reject submitted requisitions |
| `procurement.order.view` | Read purchase orders and versions |
| `procurement.order.create` | Create purchase orders |
| `procurement.order.manage` | Edit draft purchase orders and draft versions |
| `procurement.order.submit` | Submit purchase orders for approval |
| `procurement.order.approve` | Approve or reject purchase orders |
| `procurement.order.issue` | Issue approved purchase orders |
| `procurement.order.cancel` | Cancel purchase orders where allowed |
| `procurement.acknowledgement.manage` | Record supplier acknowledgements |
| `procurement.delivery-plan.manage` | Record delivery plans |
| `procurement.cost.view` | View internal supplier cost data on procurement routes |
| `procurement.cost.override` | Override resolved supplier cost with reason and audit trail |

Rules:
- creator and approver are separate responsibilities
- no approval permission is implied by create or manage
- cost visibility is explicit
- cost override is stricter than cost viewing

## Price Resolution And Snapshotting
Phase D consumes Phase C supplier pricing:
- current valid price is resolved server-side
- effective dates and active list/version state are respected
- the selected source price is recorded in audit and linkage fields
- unit cost, basis, currency, and tax treatment are snapshotted into the PO version line

Override policy:
- only users with `procurement.cost.override` may override the resolved cost
- override requires a reason
- actor and timestamp are persisted
- override does not mutate the source supplier price record

## Totals And Money Policy
- use Prisma `Decimal`
- line subtotal = quantity x unit cost
- tax amount is derived server-side from the configured tax rate or treatment
- line total = line subtotal + line tax
- order subtotal, tax, delivery, and total are derived from version lines plus delivery charge

Initial rounding policy:
- currency precision: 2 decimal places for displayed order totals
- line extensions and tax calculations retain more precision internally where needed
- rounding happens server-side using a consistent decimal helper

## Audit Events
The shared `AuditService` remains authoritative for procurement audit logging.

Minimum events:
- requisition create, update, submit, approve, reject, cancel
- requisition line add, update, remove
- requisition convert to PO
- purchase order create, update, submit, approve, reject, issue, cancel
- purchase-order version create
- supplier price resolve
- supplier cost override
- supplier acknowledgement create and update
- delivery plan create and update

Lifecycle events should include previous and new status values where relevant.

## API Surface
Planned routes:

### Requisitions
- `GET /api/v1/purchase-requisitions`
- `POST /api/v1/purchase-requisitions`
- `GET /api/v1/purchase-requisitions/:id`
- `PATCH /api/v1/purchase-requisitions/:id`
- `POST /api/v1/purchase-requisitions/:id/submit`
- `POST /api/v1/purchase-requisitions/:id/approve`
- `POST /api/v1/purchase-requisitions/:id/reject`
- `POST /api/v1/purchase-requisitions/:id/cancel`
- `POST /api/v1/purchase-requisitions/:id/create-purchase-order`

### Purchase orders
- `GET /api/v1/purchase-orders`
- `POST /api/v1/purchase-orders`
- `GET /api/v1/purchase-orders/:id`
- `PATCH /api/v1/purchase-orders/:id`
- `POST /api/v1/purchase-orders/:id/submit`
- `POST /api/v1/purchase-orders/:id/approve`
- `POST /api/v1/purchase-orders/:id/reject`
- `POST /api/v1/purchase-orders/:id/issue`
- `POST /api/v1/purchase-orders/:id/cancel`
- `POST /api/v1/purchase-orders/:id/new-version`

### Acknowledgements and delivery plans
- `POST /api/v1/purchase-orders/:id/acknowledgements`
- `PATCH /api/v1/purchase-orders/:id/acknowledgements/:acknowledgementId`
- `GET /api/v1/purchase-orders/:id/delivery-plans`
- `POST /api/v1/purchase-orders/:id/delivery-plans`
- `PATCH /api/v1/purchase-orders/:id/delivery-plans/:deliveryPlanId`

List endpoints must support pagination, search, sorting, and status filters.

## Web Routes
Required internal routes:
- `/app/procurement/requisitions`
- `/app/procurement/requisitions/new`
- `/app/procurement/requisitions/[id]`
- `/app/procurement/requisitions/[id]/edit`
- `/app/procurement/purchase-orders`
- `/app/procurement/purchase-orders/new`
- `/app/procurement/purchase-orders/[id]`
- `/app/procurement/purchase-orders/[id]/edit`
- `/app/procurement/purchase-orders/[id]/print`

The initial UI should remain neutral and operational, following the current suppliers and catalogue page patterns rather than introducing a visual redesign.

## Migration Strategy
- one additive Phase D migration
- no destructive changes to supplier, catalogue, or pricing structures
- new indexes for tenant ownership, status filtering, sequence uniqueness, source linkage, and line lookup
- seed remains deterministic and repeatable

## Risks And Dependencies
- price resolution must not regress Phase C isolation or cost privacy
- concurrency-safe numbering requires careful transaction boundaries
- requisition conversion must not double-allocate line quantities
- version immutability must be enforced in both API and DB-backed logic
- future goods receipt and AP will depend on stable PO and version identifiers introduced here

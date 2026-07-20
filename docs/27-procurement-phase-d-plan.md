# Procurement Phase D Plan

Prepared: July 18, 2026

## Scope
Deliver the first procurement slice with:
- purchase requisitions
- purchase requisition lines
- purchase orders
- purchase-order versions
- purchase-order lines
- approval workflow
- supplier acknowledgement
- delivery planning
- tenant isolation
- branch ownership
- permissions
- audit events
- functional web UI
- printable supplier-facing purchase-order page

## Out Of Scope
- goods receipt
- warehouse location logic
- stock movements
- inventory on-hand updates
- supplier invoices
- accounts payable
- finance posting integration
- automated vendor email dispatch
- advanced PDF pipeline beyond browser print

## Models
- `PurchaseRequisition`
- `PurchaseRequisitionLine`
- `PurchaseOrder`
- `PurchaseOrderVersion`
- `PurchaseOrderLine`
- `SupplierAcknowledgement`
- `PurchaseOrderDeliveryPlan`

## Statuses

### Purchase requisition
- `DRAFT`
- `SUBMITTED`
- `APPROVED`
- `REJECTED`
- `PARTIALLY_ORDERED`
- `ORDERED`
- `CANCELLED`

### Purchase order
- `DRAFT`
- `PENDING_APPROVAL`
- `APPROVED`
- `ISSUED`
- `ACKNOWLEDGED`
- `PARTIALLY_FULFILLED`
- `FULFILLED`
- `CANCELLED`
- `REJECTED`

### Purchase-order version
- `DRAFT`
- `PENDING_APPROVAL`
- `APPROVED`
- `ISSUED`
- `REJECTED`
- `CANCELLED`

### Supplier acknowledgement
- `PENDING`
- `ACCEPTED`
- `ACCEPTED_WITH_CHANGES`
- `REJECTED`

### Delivery plan
- `PLANNED`
- `CONFIRMED`
- `DELAYED`
- `CANCELLED`
- `COMPLETED`

## State Transitions

### Requisition
- `DRAFT -> SUBMITTED`
- `SUBMITTED -> APPROVED`
- `SUBMITTED -> REJECTED`
- `DRAFT -> CANCELLED`
- `SUBMITTED -> CANCELLED`
- `APPROVED -> PARTIALLY_ORDERED`
- `APPROVED -> ORDERED`
- `PARTIALLY_ORDERED -> ORDERED`

### Purchase order
- `DRAFT -> PENDING_APPROVAL`
- `PENDING_APPROVAL -> APPROVED`
- `PENDING_APPROVAL -> REJECTED`
- `APPROVED -> ISSUED`
- `ISSUED -> ACKNOWLEDGED`
- `DRAFT -> CANCELLED`
- `PENDING_APPROVAL -> CANCELLED`
- `APPROVED -> CANCELLED`
- `ISSUED -> CANCELLED` only when business rules allow and receipt integration has not started

### Purchase-order version
- `DRAFT -> PENDING_APPROVAL`
- `PENDING_APPROVAL -> APPROVED`
- `PENDING_APPROVAL -> REJECTED`
- `APPROVED -> ISSUED`
- approved or issued versions never re-enter mutable draft state

## Permissions

| Permission | Required for |
| --- | --- |
| `procurement.requisition.view` | read requisitions |
| `procurement.requisition.create` | create requisitions |
| `procurement.requisition.manage` | edit draft requisitions and lines |
| `procurement.requisition.submit` | submit requisitions |
| `procurement.requisition.approve` | approve or reject requisitions |
| `procurement.order.view` | read purchase orders and versions |
| `procurement.order.create` | create purchase orders |
| `procurement.order.manage` | edit draft purchase orders and lines |
| `procurement.order.submit` | submit purchase orders |
| `procurement.order.approve` | approve or reject purchase orders |
| `procurement.order.issue` | issue approved purchase orders |
| `procurement.order.cancel` | cancel allowed purchase orders |
| `procurement.acknowledgement.manage` | record supplier acknowledgement |
| `procurement.delivery-plan.manage` | record delivery plans |
| `procurement.cost.view` | view internal cost details |
| `procurement.cost.override` | override resolved cost with justification |

## Tenant Rules
- tenant ID is always derived server-side from authenticated membership
- cross-tenant foreign keys are rejected
- supplier, supplier product, product, product variant, and price selection all remain tenant-bound
- list routes only return active-tenant records

## Branch Rules
- requisitions and purchase orders each store one branch
- branch ID can default from active membership or source record but is validated server-side
- branch filters are optional and authorization-aware

## Numbering
- use `NumberSequence` per tenant and key
- separate keys for requisitions and purchase orders
- format:
  - `PR-YYYY-NNNNNN`
  - `PO-YYYY-NNNNNN`
- lock sequence allocation transactionally
- keep numbers stable on retries once the owning record is created

## Approval Workflow
- submit actions capture submitter and timestamp
- approve and reject actions require explicit approval permission
- approval is recorded on the owning requisition or purchase order and, for POs, also on the current version
- creator and approver are not treated as equivalent roles

## Supplier-Price Snapshots
- resolve current supplier price from Phase C price engine at draft line creation time when possible
- snapshot unit cost, basis, currency, supplier SKU, description, and tax-related fields into PO version lines
- issued PO versions never refresh from live price lists

## Versioning
- purchase orders have one mutable current draft version at a time
- material edits after approval or issue create a new version record and cloned lines
- version history is visible from the PO detail page

## Supplier Acknowledgement
- create acknowledgement records against a PO and optionally the current version
- keep acknowledgement history instead of mutating away supplier responses
- first slice supports manual internal capture of supplier reply

## Delivery Planning
- create and update delivery-plan records against a PO
- allow multiple planned deliveries over time
- do not create receipts or stock movements from this phase

## Cancellation
- requisitions may cancel before they are fully ordered
- purchase orders may cancel only when the lifecycle permits and downstream goods receipt has not started
- cancellation always leaves audit and commercial history intact

## Audit Events
- requisition created, updated, line added, line updated, line removed
- requisition submitted, approved, rejected, cancelled, converted
- purchase order created, updated, submitted, approved, rejected, issued, cancelled
- purchase-order version created
- supplier price resolved
- supplier cost overridden
- supplier acknowledgement created or updated
- delivery plan created or updated

## API Routes

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

## UI Routes
- `/app/procurement/requisitions`
- `/app/procurement/requisitions/new`
- `/app/procurement/requisitions/[id]`
- `/app/procurement/requisitions/[id]/edit`
- `/app/procurement/purchase-orders`
- `/app/procurement/purchase-orders/new`
- `/app/procurement/purchase-orders/[id]`
- `/app/procurement/purchase-orders/[id]/edit`
- `/app/procurement/purchase-orders/[id]/print`

## Tests
- unit tests for lifecycle, totals, price snapshot, override permission, versioning, and conversion rules
- DB tests for number uniqueness, concurrency, conversion rollback, snapshot persistence, and immutable issued versions
- isolation tests for tenant boundaries and cross-tenant references
- permission tests for approval, issue, cancellation, and cost visibility

## Migration Strategy
- additive Prisma migration only
- preserve all Phase C catalogue, supplier, and pricing data
- add indexes for tenant, branch, status, numbering, supplier/date filters, and requisition conversion lookup
- verify clean migration, Phase C upgrade, repeatable seed, and representative reads

## Open-Source References
- ERPNext for workflow and test reference only
- OCA purchase-workflow for state and delivery-planning ideas only
- OpenBoxes for broader supply-chain comparison only
- MIT-licensed PO demo apps for screen and print grouping only

## Risks
- sequence allocation races under concurrency
- leaking supplier cost to users without `procurement.cost.view`
- over-conversion from requisition lines to PO lines
- mutating approved versions accidentally through shared update paths
- future goods receipt expectations forcing model changes if PO versions are underspecified

## Dependencies On Inventory And Finance

### Inventory dependency deferred
- receipt quantities and fulfillment status should later derive from goods receipts
- delivery plans in this phase are informational only

### Finance dependency deferred
- supplier invoice matching and AP posting will later consume the issued purchase-order version snapshot
- tax and total structures created here must remain stable enough for finance integration in later phases

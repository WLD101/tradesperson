# Workflows And State Transitions

## Primary Workflow

`Lead -> Customer -> Property -> Survey -> Quote -> Acceptance -> Deposit -> Job -> Stock -> PO -> Completion -> Invoice -> Payment`

## Lead Workflow

States:

- `NEW`
- `CONTACTED`
- `QUALIFIED`
- `SURVEY_BOOKED`
- `SURVEY_COMPLETED`
- `QUOTE_PREPARING`
- `QUOTE_SENT`
- `NEGOTIATING`
- `WON`
- `LOST`
- `CANCELLED`

Rules:

- Only qualified leads may book surveys.
- Lost and cancelled leads require a reason.
- Winning a lead requires a linked customer and property.

## Survey Workflow

States:

- `DRAFT`
- `SCHEDULED`
- `IN_PROGRESS`
- `COMPLETED`
- `CANCELLED`
- `REQUIRES_REVISIT`

Rules:

- A completed survey must contain at least one room.
- Measurement inputs are immutable after completion unless reopened with an audit reason.
- Survey signatures are optional in draft and required by tenant settings before final completion.

## Quote Workflow

States:

- `DRAFT`
- `INTERNAL_REVIEW`
- `APPROVED`
- `SENT`
- `VIEWED`
- `ACCEPTED`
- `PARTIALLY_ACCEPTED`
- `REJECTED`
- `EXPIRED`
- `REVISED`
- `CONVERTED_TO_JOB`
- `CANCELLED`

Rules:

- Sent quote versions become immutable.
- Acceptance stores timestamp, IP, device, selected options, and signature.
- Conversion to job can only occur from `ACCEPTED` or approved partial acceptance paths.

## Job Workflow

States:

- `DRAFT`
- `AWAITING_DEPOSIT`
- `AWAITING_MATERIALS`
- `READY_TO_SCHEDULE`
- `SCHEDULED`
- `IN_PROGRESS`
- `ON_HOLD`
- `PARTIALLY_COMPLETED`
- `COMPLETED`
- `SNAGGING`
- `CUSTOMER_SIGN_OFF_PENDING`
- `INVOICED`
- `CLOSED`
- `CANCELLED`

Rules:

- Jobs created from accepted quotes inherit products, services, rooms, and notes.
- Scheduling requires assigned branch and installer/resource allocation.
- Completion requires checklist status and completion evidence per tenant settings.

## Inventory Workflow

States:

- stock on hand
- reserved
- allocated to job
- ordered
- received
- returned
- adjusted

Rules:

- Every stock quantity change creates a stock movement.
- Reservations must reference demand source, usually quote or job.
- Goods receipt updates both stock and purchase order fulfillment state.

## Invoice Workflow

States:

- `DRAFT`
- `ISSUED`
- `PARTIALLY_PAID`
- `PAID`
- `OVERDUE`
- `VOID`
- `CREDITED`

Rules:

- Deposit invoices may precede final invoice.
- Payment allocation supports partial and multi-invoice allocation.
- Credit notes reference original invoice lines or totals.

## Measurement And Calculation Rules

- Net area equals sum of room sections.
- Orderable area equals net area plus waste percentage.
- Pack quantity equals ceiling of orderable area divided by pack coverage.
- Money calculations use decimal-safe arithmetic only.
- Cost, sale, tax, and margin are calculated server-side and stored per version.

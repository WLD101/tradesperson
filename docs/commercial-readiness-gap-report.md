# Commercial Readiness Gap Report

## Scope

This report reviews Tradesperson ERP after the Stitch UI commercial-readiness sprint. The backend architecture remains the source of truth; this report does not propose duplicate services or speculative database models.

## Implemented In This Sprint

- Procurement command centre with purchase-order operational metrics, recent POs, recent requisitions, committed spend, supplier count, and recent receipt visibility.
- Warehouse command centre at `/app/inventory` using existing catalogue, inventory reconciliation, and job material readiness data.
- Finance workspace at `/app/finance` using existing job invoice, payment, and server profitability data.
- Customer-facing portal visual migration for estimate and invoice token pages.
- Installer field job detail at `/app/field/jobs/[id]`, linked from `/app/field/today`.

## Document And Export Status

| Document | Current support | Route or API | Notes |
| --- | --- | --- | --- |
| Estimate portal | Supported | `/portal/estimates/[token]`, `/api/v1/public/portal/estimates/:token` | Customer can view and accept supported estimate links. |
| Invoice portal | Supported for viewing | `/portal/invoices/[token]`, `/api/v1/public/portal/invoices/:token` | Online payment action is intentionally disabled because no portal payment endpoint is exposed. |
| Invoice PDF | Supported through job/invoice link | `/api/v1/invoices/:id/pdf` | Internal job page links to generated invoice PDF. |
| Purchase order print | Supported | `/app/procurement/purchase-orders/[id]/print`, `getPurchaseOrderPrint` | Internal print route exists. |
| Quote PDF | Gap | Not confirmed | Needs explicit route/API confirmation before pilot. |
| Estimate PDF | Gap | Not confirmed | Portal view exists, but a PDF export route was not confirmed. |
| Job sheet | Gap | Not confirmed | Field job view exists; printable job sheet route was not confirmed. |
| Survey document | Gap | Not confirmed | Survey measurement UI exists; survey PDF/export route was not confirmed. |
| Customer statement | Gap | Not supported | Finance aggregates receivables, but no customer statement document route was confirmed. |

## Critical Before Pilot

- Confirm backup/restore and operational recovery process outside the codebase.
- Confirm quote, estimate, survey, job sheet, and customer statement document requirements.
- Add customer portal payment workflow only if a secure existing payment API is available or approved.
- Add focused Playwright coverage for new `/app/inventory`, `/app/finance`, `/app/field/jobs/[id]`, and portal visual states.
- Verify tenant and branch isolation with the full isolation suite after this major UI checkpoint.

## Important During Pilot

- Add server-backed finance dashboard endpoint if finance aggregation needs pagination, branch comparison, or authoritative aged receivables.
- Add inventory list/detail APIs if warehouse users need searchable stock ledgers beyond reconciliation rows.
- Add attachment/photo upload to field mobile only through the existing secure storage API.
- Add notification-driven supplier and invoice reminders once notification workflows are verified.
- Add mobile UAT for installer one-hand workflows.

## Later Stage

- Offline field mode.
- Native mobile app wrapper.
- GPS, route optimisation, and travel-time planning.
- Advanced analytics and forecasting.
- Accounting integrations.
- Supplier EDI/catalog integrations.

## Readiness Estimate

- Internal demo: 85%
- Controlled pilot: 68%
- First paying customers: 52%
- General commercial launch: 38%
- Enterprise readiness: 25%


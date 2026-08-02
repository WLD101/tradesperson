# Stitch UI Migration Map

This document captures how the official Stitch export should be merged into the existing Tradesperson ERP without redesigning the product or duplicating backend systems.

## Source Of Truth

- Stitch export: `C:\Users\WLD10\Documents\tradesperson-preview\stitch_export\stitch_tradesperson_operations_erp`
- Design system: `industrial_precision/DESIGN.md`
- Product direction: stable flooring ERP MVP, presentation-layer migration only.
- Architecture rule: reuse existing routes, APIs, services, permissions, audit logging, tenant isolation, and branch isolation.

## Design DNA

The official visual language is `Industrial Precision`: a modern, high-density trade operations cockpit for flooring teams.

- Layout: fixed left navigation on desktop, fixed top command/search header, max-width operational canvas, 12-column dashboard grids, two-column workspaces for builder/detail pages, full-screen or stacked drawers on mobile.
- Navigation: icon-first sidebar, 260px desktop width, active section uses emerald highlight with soft active background.
- Surfaces: pale gray app background, white cards, subtle borders, restrained shadows, dense tables and panels.
- Color anchors: deep slate/nav `#0F172A`, emerald accent `#10B981`, light background `#f7f9fb`, white cards, black/dark summary panels for finance or estimate totals.
- Typography: Inter for UI, JetBrains Mono for prices, totals, SKUs, dates, and compact operational metrics.
- Components: KPI cards, sticky-header tables, hover row actions, timeline feeds, status pills, dark summary cards, right-side context panels, compact filters, command-search affordance.
- Mobile: field-worker screens use mobile-first cards, dark operational hero panels, bottom navigation, large tap targets, and quick camera/action buttons.

## Page Mapping

| Stitch screen | Existing ERP route target | Existing backend/data source | Migration approach |
| --- | --- | --- | --- |
| `executive_dashboard` | `/app/dashboard` | Existing dashboard page data and summary API calls | Replace dashboard presentation with Stitch cockpit cards, attention lists, schedule panel, quote pipeline, activity, inventory alerts, and satisfaction card. Keep current data fetches and permission gates. |
| `lead_pipeline` | `/app/crm/leads` | Existing leads API and lead workflow actions | Restyle existing lead list/pipeline using Stitch density, filters, stale indicators, survey badges, and action affordances. Do not create a second lead pipeline service. |
| `customer_360_detail_view` | `/app/crm/customers/[id]` | Existing customer detail and customer 360 data | Use Stitch customer hero, KPI cards, contact/site side panels, tabs, critical jobs, invoices, quotes, and activity timeline. Reuse the current customer route and 360 endpoint. |
| `site_measurement` | `/app/crm/surveys/[id]/measurements` and `/app/crm/surveys/[id]` | Existing survey, room, measurement component, and area calculations | Restyle the measurement workspace around Stitch room selector, measurement canvas/panels, live sync badge, and calculated areas. Preserve calculation logic. |
| `estimate_builder` | `/app/estimates/new`, `/app/estimates/[id]`, `/app/estimates/[id]/edit` | Existing estimate form, estimate lines, product lookup, pricing, margin calculations, quote conversion | Preserve estimate business logic and validation while replacing the UI with Stitch room/area cards, material lookup panel, dark estimate summary, margin panel, and send/save actions. |
| `job_details` | `/app/jobs/[id]` | Existing jobs API, material reservation/issue/return, schedule, completion, invoice/payment links | Adopt Stitch job header, timeline, job facts, material/status sections, and quick actions. Keep existing workflow transitions and permission checks. |
| `job_details_evergreen_property` | `/app/jobs/[id]` | Same job detail APIs | Use as the richer reference for property/job detail density, work order printing, gate notes, completion action, and location context. |
| `dispatch_scheduler` | `/app/schedule` | Existing schedule API, installer/team data, job schedule/unschedule actions | Restyle scheduling into Stitch dispatcher view with filters, workload context, unscheduled queue, and schedule grid. Preserve double-booking prevention logic. |
| `today_s_schedule` | `/app/schedule` responsive/mobile view first; possible future `/app/mobile/today` only if current routing cannot support it | Existing job schedule and installer assignment data | Use as mobile installer reference: dark hero, daily cards, navigation/resume actions, material notes, bottom nav, and camera shortcut. Do not add a new mobile system unless route reuse cannot satisfy UAT. |
| `purchase_orders` | `/app/procurement/purchase-orders` | Existing procurement and purchase order APIs | Restyle PO list/detail surfaces with Stitch supply-chain management table, filters, status chips, and action layout. Preserve approval/receipt workflows. |
| `warehouse_dashboard` | `/app/procurement` initially; later inventory dashboard route if one exists | Existing procurement, stock balance, goods receipt, and inventory movement data | Use as procurement/warehouse overview: inventory value, low-stock items, pending receipts, movement-ledger summaries. Reuse ledger-backed balances. |
| `finance_overview` | Existing invoice/payment surfaces; create `/app/finance` only if no route exists and current APIs already support it | Existing invoices, payments, receivables, job profitability APIs | Build a finance overview from current invoice/payment APIs. No new accounting subsystem. |
| `project_completion` | `/app/jobs/[id]` completion section or modal | Existing job completion, returns, invoice creation, and audit events | Implement as a job completion panel/checklist presentation. Preserve completion transaction semantics. |
| `tradesperson_erp_logo` | Shared app shell branding | Static visual reference only | Use as logo/brand treatment reference. Do not add screenshots to source unless converted into a proper tracked asset intentionally. |

## Shared Component Targets

The migration should introduce or extend shared presentation components only where reuse is clear.

- App shell: sidebar, top search/header, tenant/branch/user context, command palette trigger.
- Cards: KPI card, dark summary card, alert card, metric trend card.
- Data display: dense table, status pill, mono metric, empty state, loading skeleton.
- Workflow panels: timeline, activity feed, right-side detail panel, quick-action bar.
- Mobile field UI: schedule card, bottom navigation, job action buttons.

Existing modules should keep their current data fetching and mutation helpers. Shared components should receive data through props rather than reaching into backend services directly.

## Migration Order

1. Shared design tokens and app shell: import Stitch colors, typography, spacing, radius, navigation proportions, and header/search affordance while preserving auth, tenant, branch, and permission behavior.
2. Dashboard: migrate `/app/dashboard` because it establishes the cockpit pattern used by the rest of the ERP.
3. CRM list/detail: migrate leads, customers, and customer detail after shell/dashboard are stable.
4. Survey measurement: migrate measurement workspace while preserving existing room/component calculations.
5. Estimate builder: migrate estimate creation/edit/detail after survey data presentation is stable.
6. Job detail and completion: migrate job operational surfaces, material status, completion checklist, invoice/payment links.
7. Scheduler and mobile schedule: migrate dispatcher view and responsive installer view.
8. Procurement and warehouse: migrate purchase orders and warehouse dashboard using existing PO, goods receipt, and stock ledger data.
9. Finance overview: add or restyle finance overview only after invoice/payment APIs are confirmed stable.

## Guardrails

- Do not rewrite backend services, Prisma models, permissions, audit logging, auth, tenant isolation, or branch isolation for UI-only migration.
- Do not introduce duplicate routes when an existing route already owns the workflow.
- Do not copy static Stitch sample data into production UI except as explicitly documented empty/mock development states.
- Do not weaken existing server-side validation, transactional logic, idempotency, or isolation tests.
- Do not hide broken data by replacing live calls with hardcoded HTML.
- Do not add generated screenshots to git.
- Keep the existing MVP workflow intact: Lead -> Survey -> Estimate -> Quote -> Job -> Invoice -> Payment.

## Per-Page Checklist

Each migrated page must pass this checklist before moving to the next page.

- Existing route is reused or the reason for a new route is documented.
- Existing API/service/client helper is reused.
- Tenant and branch context remain visible where relevant.
- Permission-gated actions remain permission-gated.
- Loading, empty, error, and success states exist.
- Forms keep current validation and submit behavior.
- Tables preserve server-side pagination/search/sort/filter where already implemented.
- Mutations keep audit logging and idempotency behavior where supported by the API.
- Desktop and mobile layouts match Stitch intent.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` are run after a stable page milestone.

## Current Readiness Notes

- The Stitch export is a complete visual reference, not a complete application implementation.
- Current ERP routes already cover most Stitch screens, including dashboard, CRM, surveys, estimates, jobs, schedule, procurement, suppliers, catalogue, and portal invoice/estimate surfaces.
- The current app shell uses a different visual structure: slate top bar, grouped sidebar, and simple route links. This should be migrated carefully because every page depends on it.
- The repo currently has many uncommitted modifications from previous MVP work. Those changes must not be reset or overwritten during UI migration.


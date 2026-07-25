# Flooring ERP Production Readiness

Date: 2026-07-25
Branch: `codex/erp-foundation`
Decision: `BLOCKED`

## Final Architecture

The current system is a pnpm/Turborepo monorepo:

| Component | Runtime | Purpose |
| --- | --- | --- |
| `apps/web` | Next.js | ERP browser UI |
| `apps/api` | NestJS | Versioned API at `/api/v1` |
| `apps/worker` | Node/BullMQ | Email queue worker and queue health |
| `packages/db` | Prisma/PostgreSQL | Schema, migrations, seed, Prisma client |
| `packages/auth` | JOSE/bcrypt | Session token and password helpers |
| `packages/config` | Zod env loader | Runtime configuration validation |
| Docker Compose | PostgreSQL, Redis, MinIO, Mailpit | Local infrastructure |

## Running Services

| Service | Local URL or port | Closure result |
| --- | --- | --- |
| Web | `http://localhost:3000` | Starts; `/sign-in` returned 200 during polling |
| API health | `http://localhost:4000/api/v1/health` | Passed |
| API readiness | `http://localhost:4000/api/v1/ready` | Passed |
| Worker health | `http://localhost:4100/health` | Passed |
| Worker readiness | `http://localhost:4100/ready` | Passed |
| PostgreSQL | `localhost:55432` | Docker healthy |
| Redis | `localhost:6379` | Docker healthy and worker readiness returned `PONG` |
| MinIO | `localhost:9000`, `localhost:9001` | Docker healthy |
| Mailpit | `localhost:1025`, `localhost:8025` | Docker healthy |

## Implemented Modules

Implemented and usable for local preview:

- Authentication, sessions, tenant selection.
- Tenant settings, branches, roles, permissions.
- CRM leads, customers, and sites.
- Surveys, rooms, measurement components, and server-side area calculations.
- Product catalogue, variants, reference data, suppliers, supplier contacts, supplier products.
- Supplier pricing lists, versions, imports, mappings, validation, execution, current prices, and price history.
- Estimates, estimate rooms, estimate lines, recalculation, and ready-for-quote transition.
- Quotes, quote versions, approval/rejection/send transitions, and quote-to-job conversion.
- Jobs, material requirements, requirement-to-requisition bridge, stock reservation, material issue, scheduling, completion, invoice creation, and payment recording.
- Purchase requisitions, purchase orders, versions, approvals, acknowledgements, delivery plans, and print view.

Not implemented at production-pilot level:

- Goods Receipt.
- Immutable inventory movement ledger.
- Stock returns and damaged/rejected stock buckets.
- Installer/team assignment and double-booking prevention.
- Completion photos, snagging, and attachments.
- Quote and invoice PDF generation.
- Job profitability report.
- Full notification workflows.

## End-To-End Workflow Status

| Stage | Status | Evidence |
| --- | --- | --- |
| Lead | Working with limitation | API create/update/convert routes exist |
| Customer | Working | API and pages exist |
| Site | Working | API and pages exist |
| Survey | Working | Survey/room/component routes exist |
| Measurement | Working | Server calculates component/room area |
| Estimate | Working with limitation | Recalculation and ready-for-quote exist |
| Quote | Working with limitation | Create/send/approve/reject/version actions exist |
| Quote acceptance | Working with limitation | Internal acceptance/conversion path exists; external signed acceptance absent |
| Job | Working | Quote-to-job and job detail exist |
| Material Requirements | Working | Generated from quote material/accessory lines |
| Requisition | Working | Job requirements can create requisitions |
| Purchase Order | Working | Requisitions can create POs |
| Goods Receipt | Broken | No module found |
| Inventory | Working with limitation | Stock balance/reservation/issue only; no ledger/receipt/return |
| Reservation | Working | Live smoke verified |
| Material Issue | Working | Live smoke verified |
| Installation | Working with limitation | Schedule/complete only; no installer assignment/start/snagging/photos |
| Invoice | Working with limitation | Live smoke verified quote subtotal/VAT/total |
| Payment | Working with limitation | Live smoke verified partial/final/idempotent/excess rejection |
| Job Profitability | Broken | No server endpoint/report found |

## Formulas

Inventory currently uses:

`available stock = onHandQuantity - reservedQuantity`

Known limitation: this is based on `StockBalance` rows only. It is not backed by an immutable inventory movement ledger, Goods Receipt posting, damaged-stock buckets, or return movements.

Invoice creation currently uses server-side quote values when a job is linked to a quote:

`invoice subtotal = quote.subtotal`

`invoice VAT = quote.vatAmount`

`invoice total = quote.grandTotal`

`paid amount = min(job.depositPaid, invoice total)`

`balance due = invoice total - paid amount`

Payment allocation currently uses Prisma Decimal and rejects payments above current balance.

## Idempotency And Transactions

Verified or implemented:

- Invoice creation is service-idempotent and database-constrained to one invoice per tenant/job.
- Payment recording accepts an optional `idempotencyKey`; duplicate requests for the same tenant/invoice/key return the existing job state.
- Reservation, issue, invoice creation, and payment recording use transactions.

Known gaps:

- No general idempotency service/table exists.
- Quote conversion, requisition/PO creation, receipt posting, return posting, and document generation need explicit idempotency coverage.

## Tenant And Branch Isolation

The current API uses session-derived tenant context and branch scoping helpers. Tenant and branch IDs are generally resolved server-side rather than trusted directly from clients.

Known gaps:

- Seed currently provides one main demo tenant only; the closure prompt requires at least two seeded tenants for live Tenant A/Tenant B verification.
- No database Row Level Security.
- No compound tenant-safe foreign-key strategy across every tenant-owned relation.
- Route-level isolation tests do not cover every newly added finance/inventory/job operation.

## Audit Logging

Audit service exists and important actions record audit entries, including lead conversion, survey changes, supplier/pricing changes, procurement actions, stock reservation, material issue, scheduling, completion, invoice creation, and payment recording.

Known gaps:

- Audit coverage is not yet proven by automated tests for every closure event.
- Attachments, returns, receipt posting, invoice void, payment reversal, and installer actions are absent.

## Document Storage

Docker includes MinIO and it reports healthy. The application does not yet contain a production attachment/document domain for site/survey/quote/job/receipt/completion/invoice files.

Production document readiness is blocked until the app implements private object keys, tenant ownership, signed downloads, MIME/size validation, deletion audit, and PDF generation.

## Worker Behaviour

The worker exposes:

- `GET /health`
- `GET /ready`

It connects to Redis and processes email queue jobs by logging template payloads. This is acceptable for local development but not enough for production notification workflows.

## Validation Evidence

Closure validation performed:

- `pnpm db:validate`: passed.
- `pnpm db:generate`: passed after serial retry because a Windows Prisma DLL file was temporarily locked.
- `pnpm db:migrate:deploy`: passed.
- `pnpm db:seed`: passed.
- `pnpm --filter @tradesperson/api test:migration:clean`: passed.
- API/web typecheck and lint after finance hardening: passed.
- Live API smoke through implemented job-to-payment route: passed.

Browser automation was attempted through the Browser plugin, but no controllable browser was available in this session. Visual browser UAT remains unverified.

## Deployment Instructions

Controlled local preview:

1. Start Docker Desktop.
2. Run `docker compose up -d`.
3. Run `pnpm install --frozen-lockfile`.
4. Run `pnpm db:validate`.
5. Run `pnpm db:generate`.
6. Run `pnpm db:migrate:deploy`.
7. Run `pnpm db:seed`.
8. Run `pnpm dev`.
9. Open `http://localhost:3000`.

Production deployment must use managed PostgreSQL, managed Redis, private S3-compatible object storage, TLS, secure cookies, production secrets, health checks, monitoring, and backups.

## Rollback Instructions

Prisma migrations do not provide automatic safe rollback for production data.

Safe rollback process:

1. Take a PostgreSQL backup before migration deployment.
2. Deploy migrations before application code only when backward compatible.
3. If deployment fails before data writes, roll application services back to the previous image/commit.
4. If a migration corrupts or blocks data, stop writers, preserve logs, restore the pre-migration database backup into a new database, point services to the restored database, and investigate offline.
5. Do not run destructive reset commands against production.
6. Treat seed scripts as development/demo only unless a production seed step is explicitly reviewed.

## Backup And Restore

Minimum pilot backup requirements:

- Daily PostgreSQL logical backups with off-server storage.
- Pre-migration PostgreSQL backup.
- Restore drill before pilot launch.
- Object-storage backup/versioning once attachments are implemented.
- Documented owner for backup monitoring and restore approval.

## Known Limitations

- No Goods Receipt.
- No immutable inventory movement ledger.
- No stock returns.
- No job profitability endpoint/report.
- No attachments or PDFs.
- No two-tenant seed for live cross-tenant validation.
- No full Lead -> Payment -> Profitability automated workflow test.
- Browser visual validation was unavailable in this Codex session.

## Production Blockers

The project is blocked from controlled production pilot by the limitations above. The current branch is acceptable for local preview and continued internal development only.

## Post-MVP Backlog

- Native mobile apps.
- AI estimating.
- Advanced carpet-roll optimization.
- Full general ledger.
- Payroll and HR.
- Customer portal.
- Supplier portal.
- Route optimization.
- Advanced offline sync.
- Real-time chat.
- Making Tax Digital submission.
- Supplier EDI.
- Advanced BI dashboards.

## Pilot Checklist

- Implement Goods Receipt.
- Implement inventory movement ledger.
- Implement stock returns.
- Implement job profitability.
- Implement document/PDF domain.
- Add Tenant B seed and isolation tests for all major entities.
- Add full workflow automated test.
- Re-run all validation commands.
- Perform visual browser UAT.


# Flooring Supplier Pricing Domain

Prepared: July 18, 2026

## Scope
Phase C adds tenant-safe supplier pricing, persisted supplier import workflows, price-list versions, price history, and internal-only supplier-cost retrieval. This phase is intentionally limited to supplier-side commercial data. It does not yet include purchase requisitions, purchase orders, goods receipt, inventory balances, warehouse stock movements, customer-visible pricing, or estimate margin consumption.

Closure status on Saturday, July 18, 2026:
- complete for the implemented supplier pricing scope below
- validation-complete for migration, seed, unit, DB, isolation, and authoritative API chain checks
- still intentionally deferred for large-file/background import processing, procurement, goods receipt, warehouse stock, supplier invoices, accounts payable, and full estimation integration

## Data Model
- `SupplierPriceList`
- `SupplierPriceListVersion`
- `SupplierProductPrice`
- `SupplierProductPriceHistory`
- `SupplierPriceImport`
- `SupplierPriceImportRow`
- `SupplierPriceImportMapping`

### Ownership rules
- Every record is tenant-owned.
- Price lists, versions, imports, import rows, and history records are also supplier-owned.
- `SupplierPriceImportRow` can reference:
  - an existing `SupplierProduct`
  - a matched `Product`
  - a matched `ProductVariant`
- `SupplierPriceListVersion.sourceImportId` is unique so one persisted import cannot create multiple versions during successful execution.

## Permission Table
Phase C uses:

| Permission | Purpose |
| --- | --- |
| `supplier_pricing.view` | Read price lists, versions, supplier prices, and internal current-cost routes |
| `supplier_pricing.manage` | Create and edit draft price lists and prices |
| `supplier_pricing.approve` | Approve and execute imports, approve and activate price lists |
| `supplier_pricing.import` | Upload imports, query rows, apply mappings, save mappings, cancel imports, manually match rows |
| `supplier_pricing.archive` | Archive or supersede price lists |
| `supplier_pricing.history.view` | Read supplier product price history |

The API remains authoritative. UI controls are permission-aware but not trusted for enforcement.

## Route Table

### Price lists and versions
- `GET /api/v1/suppliers/:supplierId/price-lists`
- `POST /api/v1/suppliers/:supplierId/price-lists`
- `GET /api/v1/suppliers/:supplierId/price-lists/:priceListId`
- `PATCH /api/v1/suppliers/:supplierId/price-lists/:priceListId`
- `POST /api/v1/suppliers/:supplierId/price-lists/:priceListId/validate`
- `POST /api/v1/suppliers/:supplierId/price-lists/:priceListId/approve`
- `POST /api/v1/suppliers/:supplierId/price-lists/:priceListId/activate`
- `POST /api/v1/suppliers/:supplierId/price-lists/:priceListId/supersede`
- `POST /api/v1/suppliers/:supplierId/price-lists/:priceListId/archive`
- `GET /api/v1/suppliers/:supplierId/price-lists/:priceListId/versions`
- `POST /api/v1/suppliers/:supplierId/price-lists/:priceListId/versions`
- `GET /api/v1/suppliers/:supplierId/price-lists/:priceListId/versions/:versionId`

### Supplier product prices and history
- `GET /api/v1/suppliers/:supplierId/products/:supplierProductId/prices`
- `POST /api/v1/suppliers/:supplierId/products/:supplierProductId/prices`
- `PATCH /api/v1/suppliers/:supplierId/products/:supplierProductId/prices/:priceId`
- `GET /api/v1/suppliers/:supplierId/products/:supplierProductId/price-history`
- `GET /api/v1/catalogue/products/:productId/supplier-prices`
- `GET /api/v1/catalogue/products/:productId/current-supplier-prices`

### Imports and mappings
- `POST /api/v1/suppliers/:supplierId/price-imports`
- `GET /api/v1/suppliers/:supplierId/price-imports`
- `GET /api/v1/suppliers/:supplierId/price-imports/:importId`
- `GET /api/v1/suppliers/:supplierId/price-imports/:importId/rows`
- `PATCH /api/v1/suppliers/:supplierId/price-imports/:importId/mapping`
- `PATCH /api/v1/suppliers/:supplierId/price-imports/:importId/rows/:rowId/match`
- `POST /api/v1/suppliers/:supplierId/price-imports/:importId/validate`
- `POST /api/v1/suppliers/:supplierId/price-imports/:importId/approve`
- `POST /api/v1/suppliers/:supplierId/price-imports/:importId/execute`
- `POST /api/v1/suppliers/:supplierId/price-imports/:importId/cancel`
- `GET /api/v1/suppliers/:supplierId/price-import-mappings`
- `POST /api/v1/suppliers/:supplierId/price-import-mappings`
- `PATCH /api/v1/suppliers/:supplierId/price-import-mappings/:mappingId`

## Price-list Lifecycle
- `DRAFT`
- `VALIDATED`
- `APPROVED`
- `ACTIVE`
- `SUPERSEDED`
- `EXPIRED`
- `REJECTED`
- `ARCHIVED`

Rules:
- draft lists are mutable
- approved versions are treated as immutable history
- activating one list supersedes other active lists for the same supplier
- corrections should create a new version instead of rewriting approved history

## Import Lifecycle
- `DRAFT`
- `VALIDATED`
- `APPROVED`
- `EXECUTING`
- `EXECUTED`
- `FAILED`
- `REJECTED`
- `ARCHIVED`

Rules:
- only editable states can be remapped or manually matched
- only approved imports can execute
- an already executed import returns the existing completed result
- an executing import is locked from concurrent re-entry
- cancelled or rejected imports cannot execute

## File Limits
- maximum file size: `5 MB`
- maximum rows: `5,000`
- maximum columns: `100`
- maximum cell length: `10,000` characters
- maximum worksheets: `5`
- supported formats: `CSV` and `XLSX`
- supported MIME types:
  - `text/csv`
  - `application/csv`
  - `application/vnd.ms-excel`
  - `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

Large-file background processing through BullMQ is intentionally deferred.

## CSV/XLSX Handling
- CSV and XLSX parsing both happen server-side before persistence.
- `worksheetName` is server-authoritative for XLSX selection.
- `headerRowNumber` is accepted and drives correct row numbering for persisted rows.
- CSV UTF-8 BOM is stripped safely before header detection.
- duplicate header names are rejected.
- missing required pricing headers are rejected.
- empty uploads and empty XLSX worksheets are rejected.

## Worksheet and Header Selection
- CSV header selection defaults to detected commercial headers unless an explicit header row is supplied.
- XLSX selection defaults to the first worksheet unless an explicit `worksheetName` is supplied.
- if the requested worksheet is absent, the upload is rejected
- if the requested header row is invalid, parsing fails before persistence

## Formula Policy
- formula-like values are treated as plain text during parsing
- no spreadsheet formula evaluation is performed
- browser preview and server parsing both preserve raw values instead of executing them

## Mapping
`mappingSnapshot` stores:
- detected headers
- mapped source columns
- optional row overrides

Applying a mapping:
- is tenant- and supplier-scoped
- is only allowed while the import is editable
- re-normalizes all persisted raw rows server-side
- recalculates valid, invalid, unmatched, and duplicate counts
- records an audit event

## Saved Mappings
- saved mappings are tenant-owned and supplier-owned
- a mapping cannot be reused across suppliers because uniqueness is `tenantId + supplierId + name`
- save and update actions are audited
- applying a saved mapping triggers the same server validation path as a direct mapping update
- approved imports are server-locked from mapping changes

## Matching Order
Automatic matching priority:
1. `supplierProductId`
2. `supplierSku`
3. `productSku`
4. `variantSku`
5. unmatched

Manual matching can override unresolved rows by choosing:
- an existing supplier product
- an existing product
- an optional variant that belongs to the selected product

## Manual Matching
Server checks enforce:
- tenant owns the supplier
- tenant owns the import
- row belongs to the import
- supplier product belongs to the same supplier
- product belongs to the tenant
- variant belongs to the tenant
- variant belongs to the selected product
- import lifecycle is still editable

After a manual match:
- verified references are stored on the row
- `matchMethod` becomes `MANUAL`
- unmatched warnings are removed when appropriate
- row status is recalculated to `VALID` or `INVALID`
- the action is audited

## Duplicate Detection
Duplicate keys are derived from:
- matched supplier product or supplier SKU
- price basis
- currency
- effective date
- quantity range

When duplicate keys repeat inside the same import:
- rows are marked `DUPLICATE`
- a warning message is attached
- duplicates block execution until resolved

## Validation
Row validation currently covers:
- required price basis
- required currency
- required base cost
- required effective date
- expiry date after effective date
- promotion end after promotion start
- unsupported price basis normalization
- unmatched rows
- duplicate rows

Import validation recalculates row counts and moves the import into `VALIDATED` when allowed.

## Approval and Execution
- validation must happen before approval
- approval must happen before execution
- execution uses transactional status claiming with `EXECUTING`
- rows must all be executable before prices are created
- imports can create a price list automatically when none is linked
- one successful import creates one `SupplierPriceListVersion`

## Sequential and Concurrent Idempotency
- sequential re-execution of a completed import returns the existing completed import
- execution attempts first claim the import by moving `APPROVED -> EXECUTING`
- unique `sourceImportId` on versions prevents duplicate successful version creation

Verified on July 18, 2026:
- sequential idempotency returns the existing executed import
- concurrent execution proof passed in DB-backed tests without duplicate version, price, or history creation

## Rollback Policy
If execution fails:
- the transaction rolls back the created version
- created supplier prices roll back
- created price-history records roll back
- row execution markers roll back
- the import is marked `FAILED` with an error summary after the transaction aborts

Rollback safety was DB-backed and re-proven on July 18, 2026. Failed execution leaves no partial price list, version, price, history, or row execution marker behind, and the import is marked `FAILED`.

## Versioning and Price History
- price lists own many versions
- versions own many supplier product prices
- every create or update of supplier pricing records history with:
  - currency
  - price basis
  - old and new cost values where applicable
  - effective date
  - approval status
  - actor
  - source type and source label

## Raw-cost Protection
- supplier-cost routes require explicit pricing-view permissions
- customer/public routes must not expose supplier cost data
- product-side current-cost routes are internal-only

## UI Routes
- `/app/suppliers/[id]/pricing`
- `/app/suppliers/[id]/pricing/[priceListId]`
- `/app/suppliers/[id]/price-imports/new`
- `/app/suppliers/[id]/price-imports/[importId]`

Current UI capabilities:
- local preview for CSV/XLSX uploads
- persisted server import creation
- import detail with server-side row search, filters, and pagination
- saved mapping apply/save
- editable unmatched-row manual matching
- price-list detail and version history navigation
- authorised product pricing visibility for internal users

## Audit Events
Current pricing-domain audit events include:
- `supplier.pricing.price-list.create`
- `supplier.pricing.price-list.update`
- `supplier.pricing.price-list.validate`
- `supplier.pricing.price-list.approve`
- `supplier.pricing.price-list.activate`
- `supplier.pricing.price-list.supersede`
- `supplier.pricing.price-list.archive`
- `supplier.pricing.version.create`
- `supplier.pricing.price.create`
- `supplier.pricing.price.update`
- `supplier.pricing.import.create`
- `supplier.pricing.import.mapping.update`
- `supplier.pricing.import.row.match`
- `supplier.pricing.import.validate`
- `supplier.pricing.import.approve`
- `supplier.pricing.import.execute`
- `supplier.pricing.import.cancel`
- `supplier.pricing.import-mapping.create`
- `supplier.pricing.import-mapping.update`

## Current Tests
Verified in the current local environment on Saturday, July 18, 2026:
- parser tests: `14/14`
- pricing-rule tests: `8/8`
- pricing DB tests: `4/4`
- test DB guard coverage: `7/7`
- API unit tests: `60/60`
- compiled isolation suite: `41 passed, 0 failed`
- authoritative `pnpm --filter @tradesperson/api test:full`: passed cleanly
- Prisma `format`: passing
- Prisma validate: passing
- Prisma `generate`: passing
- Prisma migration status: clean
- clean migration proof: passed on `tradesperson_phasec_clean_migration_test`
- Phase B to Phase C upgrade proof: passed on `tradesperson_phaseb_to_phasec_upgrade_test`
- seed repeatability proof: passed on `tradesperson_phasec_seed_validation_test`
- API typecheck: passing
- web typecheck: passing
- DB typecheck: passing
- API build: passing
- web build: passing

## DB-backed Test Policy
All DB-backed API suites share the dedicated PostgreSQL database `tradesperson_erp_isolation_test`.

Required policy:
- only one DB-backed suite may run at a time
- destructive helpers must receive an explicit `DATABASE_URL`
- destructive helpers refuse any database name other than `tradesperson_erp_isolation_test`
- compiled isolation runs must wait for API health and verify teardown before the next suite starts
- pure parser and pricing-rule tests may still run in parallel because they do not touch PostgreSQL or Redis

Current DB-backed commands:
- `pnpm --filter @tradesperson/api test:db`
- `pnpm --filter @tradesperson/api test:isolation`
- `pnpm --filter @tradesperson/api test:full`

Named validation databases used during closure:
- `tradesperson_erp_isolation_test`
- `tradesperson_phasec_clean_migration_test`
- `tradesperson_phaseb_to_phasec_upgrade_test`
- `tradesperson_phasec_seed_validation_test`

Authoritative execution policy:
- pure unit tests may run independently
- shared PostgreSQL-backed suites must run serially
- `test:unit` runs pure tests
- `test:db` runs DB-backed tests serially
- `test:isolation` runs compiled tenant-isolation scenarios
- `test:full` is the authoritative chain
- destructive helpers require an explicit test database URL
- non-test database URLs are rejected

## Adopted Open-source Packages
- `papaparse@5.5.4`
  - licence: MIT
  - current files using it:
    - `apps/api/src/services/supplier-price-imports.ts`
    - `apps/api/src/services/supplier-price-imports.spec.ts`
    - `apps/web/src/components/suppliers/price-import-preview.tsx`
- `read-excel-file@9.3.2`
  - licence: MIT
  - current files using it:
    - `apps/api/src/services/supplier-price-imports.ts`
    - `apps/api/src/services/supplier-price-imports.spec.ts`
    - `apps/web/src/components/suppliers/price-import-preview.tsx`

## Deferred BullMQ Boundary
Large-file and background import processing remain out of scope for Phase C. BullMQ should become the execution boundary later for:
- files above conservative synchronous limits
- scheduled supplier feed ingestion
- retryable supplier import jobs
- long-running validation and import reconciliation

## Procurement Boundary
Phase C stops at supplier pricing and supplier-cost history. It does not yet include:
- purchase requisitions
- purchase orders
- purchase order versions
- purchase order lines
- supplier acknowledgements
- delivery schedules
- goods receipt
- supplier returns
- stock movements

Those belong to Phase D.

## Estimation Dependency
The estimate and quotation engine should consume approved supplier pricing and price history later, but estimation is not implemented in Phase C. Supplier pricing remains internal-only groundwork for:
- future flooring cost rollups
- quote cost baselines
- margin analysis
- procurement price snapshots on purchase orders

## Known Limitations
- no browser-side mapping editor yet beyond saved mapping application
- no inline row editing for raw values
- no bulk row resolution workflow
- no document upload or supplier spreadsheet archive
- no BullMQ background import path yet
- no procurement, goods receipt, warehouse, supplier invoice, or accounts-payable workflows yet

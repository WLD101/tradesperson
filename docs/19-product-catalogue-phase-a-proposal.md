# Product Catalogue Phase A Proposal

Prepared: July 16, 2026

## 1. Existing Project Capabilities To Reuse
- Multi-tenant session handling, tenant selection, and active-branch context are already implemented and must remain authoritative.
- Role and permission enforcement already exists in NestJS guards and authorization services.
- Audit logging already exists and should be extended to catalogue mutations.
- Prisma, PostgreSQL, Redis, and BullMQ are already the approved persistence and background-job stack.
- The monorepo already has the correct application split:
  - `apps/api` for NestJS APIs
  - `apps/web` for Next.js UI
  - `packages/db` for Prisma schema and migrations
  - shared packages for auth, config, types, and UI
- The existing web stack already includes:
  - `react-hook-form`
  - `zod`
  - `@tanstack/react-query`
  - shared UI primitives in `@tradesperson/ui`
- Open-source packages adopted in this phase must provide infrastructure only. Tenant isolation, branch permissions, product pricing rules, flooring calculations, and supplier pricing history remain custom application behavior.
- Existing API conventions already cover:
  - versioned routes under `/api/v1`
  - response envelopes
  - tenant-safe validation
  - deterministic tests
- Existing docs already define the intended catalogue domain direction in high-level form, so Phase A should refine that rather than reset it.

## 2. Missing Capabilities
- No product catalogue domain models exist in the live Prisma schema.
- No product or catalogue routes exist in `apps/api`.
- No supplier or product import preview workflow exists.
- No signed upload workflow exists yet for product images or documents.
- No reusable data-table abstraction exists for dense ERP lists.
- No CSV or XLSX import preview capability exists in the current UI.
- No product document or image metadata persistence exists.

## 3. External Packages Or Repositories Proposed
| Capability | Package | Source | Licence | Why this option | Integration approach |
| ---------- | ------- | ------ | ------- | ---------------- | -------------------- |
| Server-friendly headless tables | [`@tanstack/react-table`](https://www.npmjs.com/package/@tanstack/react-table) | [npm](https://www.npmjs.com/package/@tanstack/react-table), [docs](https://tanstack.com/table/latest/docs/installation), [GitHub](https://github.com/tanstack/table) | MIT | Lowest-friction table option for React 19 and existing UI components | Build local table wrappers in `apps/web/src/components` rather than importing a full admin table system |
| Simple drag-and-drop file selection | [`react-dropzone`](https://www.npmjs.com/package/react-dropzone) | [npm](https://www.npmjs.com/package/react-dropzone), [GitHub](https://github.com/react-dropzone/react-dropzone) | MIT | Lightweight, accessible, and does not force a backend upload stack | Use only as a file picker. Signed URLs, metadata persistence, and ownership checks remain custom |
| CSV import preview | [`papaparse`](https://www.npmjs.com/package/papaparse) | [npm](https://www.npmjs.com/package/papaparse), [project site](https://www.papaparse.com/) | MIT | Mature browser parsing, worker support, and good UX for preview/mapping | Use in the web app for preview only. Validate and persist on the API |
| XLSX import preview | [`read-excel-file`](https://www.npmjs.com/package/read-excel-file) | [npm](https://www.npmjs.com/package/read-excel-file), [GitHub](https://github.com/catamphetamine/read-excel-file) | MIT | Schema-friendly XLSX parsing in browser and Node | Use in import preview flow and worker-side validation |
| Future XLSX export support | [`write-excel-file`](https://www.npmjs.com/package/write-excel-file) | [npm](https://www.npmjs.com/package/write-excel-file), [GitHub](https://github.com/catamphetamine/write-excel-file) | MIT | Good low-weight export companion for later catalogue exports | Defer actual install until export scope is active |

## 4. Licence For Each
- `@tanstack/react-table`: MIT
- `react-dropzone`: MIT
- `papaparse`: MIT
- `read-excel-file`: MIT
- `write-excel-file`: MIT

## 5. Integration Approach
- Keep catalogue logic inside the existing NestJS and Prisma architecture.
- Add a dedicated catalogue module in `apps/api/src/modules`.
- Add service-layer business rules in `apps/api/src/services`.
- Extend `packages/db/prisma/schema.prisma` and create narrow migrations.
- Build simple list/detail/create/edit pages in the existing Next.js app shell.
- Keep UI functional and replaceable in this phase. Final branding and visual refinement are intentionally deferred until later.
- Keep import preview logic in the web app, but perform authoritative validation and persistence on the API.
- Keep upload security and storage ownership custom.
- Avoid introducing:
  - a new auth system
  - a new state management library
  - a separate uploader service
  - a generic ecommerce catalogue product model copied from another repo

## 6. Security Considerations
- Every catalogue record must remain tenant-owned.
- Branch ownership should be added only where there is a real operational need. For Phase A, tenant ownership is primary and branch filtering can stay out unless a concrete branch-specific catalogue requirement emerges.
- Product import preview must never bypass server-side validation.
- Uploaded files must use signed URL issuance with tenant-scoped metadata persistence.
- Product images and documents must never be directly trusted from the browser.
- Audit logging should capture:
  - manufacturer create/update/archive
  - product create/update/archive
  - import preview commit actions
  - document and image metadata changes
- Search, filtering, and import preview endpoints must still obey role permissions.
- No third-party package should enforce permissions. Packages are presentation or parsing helpers only.

## 7. Files Expected To Change
- [packages/db/prisma/schema.prisma](C:/Users/WLD10/Documents/tradesperson%20netwok/packages/db/prisma/schema.prisma)
- `packages/db/prisma/migrations/...`
- `packages/types/src/index.ts`
- `apps/api/src/modules/catalogue.module.ts`
- `apps/api/src/services/catalogue.service.ts`
- `apps/api/src/services/upload.service.ts` or equivalent if the upload abstraction is introduced in this phase
- `apps/api/src/modules/permissions.module.ts` or seed-related permission definitions if new permission keys are required
- `packages/db/prisma/seed.ts`
- `apps/web/src/app/app/catalogue/...`
- `apps/web/src/components/catalogue/...`
- `apps/web/src/lib/...` for import preview helpers and upload clients
- `docs/07-api-specification.md`
- `docs/06-database-design.md`
- `docs/12-roadmap.md`

## 8. Database Models Required
- `Manufacturer`
- `Brand`
- `Collection`
- `ProductCategory`
- `UnitOfMeasure`
- `Product`
- `ProductVariant`
- `ProductImage`
- `ProductDocument`
- `TechnicalAttributeDefinition`
- `ProductAttributeValue`

Recommended field direction:
- Every catalogue business record should include:
  - `id`
  - `tenantId`
  - `createdAt`
  - `updatedAt`
  - `createdById` where supported
  - `updatedById` where supported
  - `isActive` or `status`
- `Product` should carry:
  - display name
  - internal SKU
  - product category
  - manufacturer, brand, collection links
  - sales unit and stock unit
  - discontinued flag or status
- `ProductVariant` should carry:
  - variant SKU
  - colour or pattern
  - size or pack coverage
  - technical attributes relevant to flooring
- `ProductDocument` and `ProductImage` should store metadata and object references, not file binaries

## 9. API Routes Required
- `GET /api/v1/catalogue/manufacturers`
- `POST /api/v1/catalogue/manufacturers`
- `PATCH /api/v1/catalogue/manufacturers/:id`
- `GET /api/v1/catalogue/brands`
- `POST /api/v1/catalogue/brands`
- `PATCH /api/v1/catalogue/brands/:id`
- `GET /api/v1/catalogue/collections`
- `POST /api/v1/catalogue/collections`
- `PATCH /api/v1/catalogue/collections/:id`
- `GET /api/v1/catalogue/categories`
- `POST /api/v1/catalogue/categories`
- `PATCH /api/v1/catalogue/categories/:id`
- `GET /api/v1/catalogue/units`
- `POST /api/v1/catalogue/units`
- `PATCH /api/v1/catalogue/units/:id`
- `GET /api/v1/catalogue/products`
- `POST /api/v1/catalogue/products`
- `GET /api/v1/catalogue/products/:id`
- `PATCH /api/v1/catalogue/products/:id`
- `GET /api/v1/catalogue/products/:id/variants`
- `POST /api/v1/catalogue/products/:id/variants`
- `PATCH /api/v1/catalogue/products/:id/variants/:variantId`
- `POST /api/v1/catalogue/imports/csv/preview`
- `POST /api/v1/catalogue/imports/xlsx/preview`
- `POST /api/v1/catalogue/imports/commit`
- `POST /api/v1/catalogue/uploads/presign`
- `POST /api/v1/catalogue/products/:id/images`
- `POST /api/v1/catalogue/products/:id/documents`

## 10. Functional UI Pages Required
- `/app/catalogue`
- `/app/catalogue/products`
- `/app/catalogue/products/new`
- `/app/catalogue/products/[id]`
- `/app/catalogue/products/[id]/edit`
- `/app/catalogue/manufacturers`
- `/app/catalogue/brands`
- `/app/catalogue/collections`
- `/app/catalogue/categories`
- `/app/catalogue/units`
- `/app/catalogue/imports/products`

Page behavior should remain simple for this phase:
- functional tables
- filter bars
- create and edit forms
- upload and import preview states
- validation and error messages
- empty states
- no major visual redesign

## 11. Tests Required
- Prisma migration validation for new catalogue models
- API service tests for tenant-safe CRUD
- permission tests for `products.view` and `products.manage`
- import preview validation tests
- import commit tests with duplicate handling
- upload metadata permission tests
- web form validation tests where practical
- browser or e2e smoke tests for:
  - product create
  - product edit
  - import preview
  - image metadata attach

## 12. Estimated Risk
- Overall risk: Medium

Main risk areas:
- model scope creep if Phase A tries to solve supplier pricing too early
- import flows creating duplicate or partially valid products
- file upload security if signed URL ownership is not designed carefully
- overbuilding table and filtering abstractions before real usage patterns emerge

Risk controls:
- ship Manufacturers, Brands, Collections, Categories, Units, Products, and Variants first
- keep imports as preview plus explicit commit
- defer advanced pricing and stock behavior to later phases
- keep each new route behind existing permission and tenant checks

## 13. Rejected Alternatives
- `react-table` v7 was rejected because the maintained TanStack v8 path is a better fit for the current stack.
- `ag-grid-react` was rejected for Phase A because it is heavier than necessary and easier to drift into Enterprise-only patterns.
- `@uppy/core` was rejected for the first catalogue phase because it introduces more workflow surface than is needed before the project even has a signed-upload abstraction.
- `xlsx` was rejected because its current npm summary shows older release cadence and less clear licence messaging than the lighter MIT alternatives selected above.
- `exceljs` was rejected for initial import preview because it is better suited to richer workbook manipulation than the narrow Phase A need.
- `fuse.js` or another client-side search package is not proposed for the first phase because server-side query filtering in NestJS and Prisma is the lower-risk fit for tenant-safe ERP data.

## Recommended Delivery Sequence
1. Add catalogue Prisma models and migration.
2. Add permission keys and seed updates.
3. Add API CRUD for Manufacturers, Brands, Collections, Categories, Units.
4. Add Product and ProductVariant CRUD.
5. Add simple catalogue pages and tables.
6. Add import preview for CSV, then XLSX.
7. Add signed upload metadata flow for images and documents.
8. Add focused tests and seed data.

## Recommendation
Proceed with a custom catalogue domain implemented inside the current monorepo, accelerated by a small set of isolated MIT-licensed building blocks:
- `@tanstack/react-table`
- `react-dropzone`
- `papaparse`
- `read-excel-file`

Do not install all of them immediately. Adopt them only when the specific capability is being implemented, starting with catalogue tables and import preview.

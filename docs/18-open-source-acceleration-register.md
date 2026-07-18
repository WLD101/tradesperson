# Open-Source Acceleration Register

Last reviewed: July 18, 2026

## Purpose
This register tracks the external packages and repositories evaluated for accelerating development without replacing the existing Tradesperson Network ERP architecture.

The current repository remains the source of truth for tenant isolation, branch restrictions, permissions, audit logging, flooring survey logic, product pricing rules, flooring calculations, supplier pricing history, and all other domain-specific business rules.

Open-source packages listed here provide infrastructure only. They do not replace the platform's custom tenancy model, branch permission model, pricing model, supplier price history rules, or flooring-specific calculations. Final UI branding and visual refinement are also intentionally deferred.

## Selected or Proposed Capabilities
| Capability | Project/package | Source | Licence | Version | Reason selected | Files adapted | Security review | Update strategy |
| ---------- | --------------- | ------ | ------- | ------- | --------------- | ------------- | --------------- | --------------- |
| Headless data tables for catalogue, suppliers, and pricing screens | [`@tanstack/react-table`](https://www.npmjs.com/package/@tanstack/react-table) | [npm](https://www.npmjs.com/package/@tanstack/react-table), [TanStack docs](https://tanstack.com/table/latest/docs/installation), [GitHub](https://github.com/tanstack/table) | MIT | 8.21.3 | Headless, TypeScript-first, server-side friendly, fits the existing UI layer, and TanStack documents React 19 support | Adopted in `apps/web/package.json`, `apps/web/src/components/catalogue/products-table.tsx`, and catalogue product pages | Installed on July 16, 2026 after schema/API review. No tenant or auth assumptions introduced. Package remains presentation-only and does not alter permission or tenancy enforcement. | Pinned exactly at `8.21.3`. Re-review quarterly and before major React or Next.js upgrades. |
| Lightweight drag-and-drop file selection for product images and documents | [`react-dropzone`](https://www.npmjs.com/package/react-dropzone) | [npm](https://www.npmjs.com/package/react-dropzone), [GitHub](https://github.com/react-dropzone/react-dropzone) | MIT | 17.0.0 | Minimal, accessible, React-native fit for existing forms, and does not try to own storage, auth, or server workflows | Not yet adapted | Quick review on July 16, 2026 found no tenant logic, no backend assumptions, and no competing auth model. Server-side signed upload enforcement must stay custom. | Pin exact version on adoption. Re-review when signed-upload infrastructure is introduced. |
| Browser-side CSV import preview and mapping | [`papaparse`](https://www.npmjs.com/package/papaparse) | [npm](https://www.npmjs.com/package/papaparse), [project site](https://www.papaparse.com/), [GitHub](https://github.com/mholt/PapaParse), [Snyk](https://security.snyk.io/package/npm/papaparse) | MIT | 5.5.4 | Mature CSV parsing for preview and server-side normalization without replacing custom tenancy or pricing rules | Adopted in `apps/api/package.json`, `apps/web/package.json`, `apps/api/src/services/supplier-price-imports.ts`, `apps/api/src/services/supplier-price-imports.spec.ts`, and `apps/web/src/components/suppliers/price-import-preview.tsx` | Reviewed again on July 18, 2026 against local package metadata. Formula-like values remain plain text, file size stays capped at `5 MB`, and import validation, lifecycle enforcement, and tenant-safe persistence remain custom. No direct new security concern was introduced in this closure pass. | Pin exactly at `5.5.4`, keep formula evaluation disabled, keep synchronous imports within the current `5 MB` ceiling, and re-review during dependency security sweeps and before BullMQ-backed large-file ingestion work. |
| Browser and Node XLSX import parsing with schema mapping | [`read-excel-file`](https://www.npmjs.com/package/read-excel-file) | [npm](https://www.npmjs.com/package/read-excel-file), [GitHub](https://github.com/catamphetamine/read-excel-file) | MIT | 9.3.2 | Good fit for worksheet-aware XLSX parsing in browser preview and server import flows without imposing storage, auth, or workflow opinions | Adopted in `apps/api/package.json`, `apps/web/package.json`, `apps/api/src/services/supplier-price-imports.ts`, `apps/api/src/services/supplier-price-imports.spec.ts`, and `apps/web/src/components/suppliers/price-import-preview.tsx` | Reviewed again on July 18, 2026 against local package metadata. Worksheet selection, file-size limits, uploaded file ownership, import validation, and execution safety remain custom. No direct new security concern was introduced in this closure pass. | Pin exactly at `9.3.2`, keep imports within the current `5 MB` synchronous limit, preserve the no-formula-evaluation rule, and re-review before BullMQ/background import adoption. |
| Simple XLSX export for future price lists or quote exports | [`write-excel-file`](https://www.npmjs.com/package/write-excel-file) | [npm](https://www.npmjs.com/package/write-excel-file), [GitHub](https://github.com/catamphetamine/write-excel-file), [Snyk](https://security.snyk.io/package/npm/write-excel-file) | MIT | 4.1.1 | Lightweight companion to `read-excel-file`, simple Node/browser writer, and lower integration weight than full spreadsheet frameworks | Not yet adapted | Quick review on July 16, 2026 surfaced no direct vulnerability on the latest version. Export data selection and permissions must remain custom. | Keep optional until export requirements are concrete. Pin exact version if adopted. |

## Rejected Options
| Capability | Project/package | Source | Licence | Version reviewed | Reason rejected |
| ---------- | --------------- | ------ | ------- | ---------------- | --------------- |
| Tables | [`react-table`](https://www.npmjs.com/package/react-table) | [npm](https://www.npmjs.com/package/react-table) | MIT | 7.8.0 | Outdated release cadence for the current stack. TanStack Table v8 is the maintained path. |
| Tables | [`ag-grid-react`](https://www.npmjs.com/package/ag-grid-react) | [npm](https://www.npmjs.com/package/ag-grid-react), [licensing docs](https://www.ag-grid.com/javascript-data-grid/community-vs-enterprise/) | MIT for Community, commercial for Enterprise | 36.0.1 | Powerful, but heavier than needed for the current phase and easier to drift into Enterprise-only patterns that the project does not need yet. |
| File upload UI and orchestration | [`@uppy/core`](https://www.npmjs.com/package/@uppy/core) plus Companion | [npm](https://www.npmjs.com/package/@uppy/core), [docs](https://uppy.io/docs/uppy/), [Companion npm](https://www.npmjs.com/package/@uppy/companion) | MIT | 5.2.0 | High-quality but more invasive than necessary right now. Companion and remote-source workflows add extra moving parts before signed S3 uploads are even in place. |
| XLSX parsing and writing | [`xlsx`](https://www.npmjs.com/package/xlsx) | [npm](https://www.npmjs.com/package/xlsx) | Licence messaging unclear in npm summary | 0.18.5 | Older release cadence and less clear licensing presentation than the selected alternatives. Not the least invasive choice for this repository. |
| XLSX parsing and writing | [`exceljs`](https://www.npmjs.com/package/exceljs) | [npm](https://www.npmjs.com/package/exceljs), [GitHub](https://github.com/exceljs/exceljs) | MIT | 4.4.0 | Useful for richer workbook generation later, but heavier than required for initial catalogue import preview work. |

## Working Notes
- Existing project dependencies already cover forms and validation through `react-hook-form` and `zod`, so no competing form stack should be introduced.
- Existing project dependencies already cover React data fetching through `@tanstack/react-query`.
- Search for the first catalogue phase should stay server-side through existing NestJS and Prisma patterns rather than introducing a client-only search dependency.
- `@tanstack/react-table` is adopted for catalogue tables.
- `papaparse@5.5.4` and `read-excel-file@9.3.2` are now adopted for supplier pricing import preview and server parsing.
- Both package licences were re-checked from local package metadata on July 18, 2026 and remain `MIT`.
- Before any package is installed, the integration must still pass:
  - tenant isolation review
  - branch restriction review
  - permission review
  - bundle-size sanity check
  - `pnpm lint`
  - `pnpm typecheck`
  - targeted tests

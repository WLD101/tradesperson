# Open-Source Acceleration Register

Last reviewed: July 16, 2026

## Purpose
This register tracks the external packages and repositories evaluated for accelerating development without replacing the existing Tradesperson Network ERP architecture.

The current repository remains the source of truth for tenant isolation, branch restrictions, permissions, audit logging, flooring survey logic, product pricing rules, flooring calculations, supplier pricing history, and all other domain-specific business rules.

Open-source packages listed here provide infrastructure only. They do not replace the platform's custom tenancy model, branch permission model, pricing model, supplier price history rules, or flooring-specific calculations. Final UI branding and visual refinement are also intentionally deferred.

## Selected or Proposed Capabilities
| Capability | Project/package | Source | Licence | Version | Reason selected | Files adapted | Security review | Update strategy |
| ---------- | --------------- | ------ | ------- | ------- | --------------- | ------------- | --------------- | --------------- |
| Headless data tables for catalogue, suppliers, and pricing screens | [`@tanstack/react-table`](https://www.npmjs.com/package/@tanstack/react-table) | [npm](https://www.npmjs.com/package/@tanstack/react-table), [TanStack docs](https://tanstack.com/table/latest/docs/installation), [GitHub](https://github.com/tanstack/table) | MIT | 8.21.3 | Headless, TypeScript-first, server-side friendly, fits the existing UI layer, and TanStack documents React 19 support | Not yet adapted | Quick review on July 16, 2026 found no tenant or auth assumptions. Still requires lockfile audit before install. | Pin exact version on adoption. Re-review quarterly and before major React or Next.js upgrades. |
| Lightweight drag-and-drop file selection for product images and documents | [`react-dropzone`](https://www.npmjs.com/package/react-dropzone) | [npm](https://www.npmjs.com/package/react-dropzone), [GitHub](https://github.com/react-dropzone/react-dropzone) | MIT | 17.0.0 | Minimal, accessible, React-native fit for existing forms, and does not try to own storage, auth, or server workflows | Not yet adapted | Quick review on July 16, 2026 found no tenant logic, no backend assumptions, and no competing auth model. Server-side signed upload enforcement must stay custom. | Pin exact version on adoption. Re-review when signed-upload infrastructure is introduced. |
| Browser-side CSV import preview and mapping | [`papaparse`](https://www.npmjs.com/package/papaparse) | [npm](https://www.npmjs.com/package/papaparse), [project site](https://www.papaparse.com/), [GitHub](https://github.com/mholt/PapaParse), [Snyk](https://security.snyk.io/package/npm/papaparse) | MIT | 5.5.4 | Mature browser CSV parsing, worker support, import preview fit, and good separation from backend persistence | Not yet adapted | Quick review on July 16, 2026 surfaced no current direct vulnerability on the latest version. Import validation and tenant-safe persistence must remain custom. | Pin exact version on adoption. Re-review on import module work and during dependency security sweeps. |
| Browser and Node XLSX import parsing with schema mapping | [`read-excel-file`](https://www.npmjs.com/package/read-excel-file) | [npm](https://www.npmjs.com/package/read-excel-file), [GitHub](https://github.com/catamphetamine/read-excel-file) | MIT | 9.3.1 | Good fit for import preview flows, schema-aware parsing, browser and Node entry points, and no imposed storage or auth model | Not yet adapted | Quick review on July 16, 2026 found no tenant assumptions or conflicting runtime model. Uploaded file ownership and validation still need custom enforcement. | Pin exact version on adoption. Re-review before import jobs move into BullMQ workers. |
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
- Before any package is installed, the integration must still pass:
  - tenant isolation review
  - branch restriction review
  - permission review
  - bundle-size sanity check
  - `pnpm lint`
  - `pnpm typecheck`
  - targeted tests

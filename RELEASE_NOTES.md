# Release Notes

## Tradesperson Network - MVP Release

### 🚀 New Features
* **Core ERP Foundation**: Established scalable Turborepo architecture featuring Next.js frontend and NestJS backend.
* **Authentication & Authorization**: Role-based access control, secure cookie-based session management, and multi-tenant isolation.
* **Dashboard & Metrics**: Overview of administrative activities, leads, customers, properties, and tenant status.
* **CRM Module**: End-to-end customer management including direct inline creation, organization of properties, leads, sites, and surveys.
* **Procurement Workflows**: Fully integrated Procurement Command Centre for Purchase Orders, Requisitions, and Goods Receipts (streamlined inventory workflow).
* **Application Shell**: Responsive sidebar navigation, seamless application shell, and global UX error boundaries (`loading`, `error`, `not-found`).

### 🛠 Improvements
* Comprehensive Playwright E2E smoke testing covering core authentication and business logic.
* Production-grade Docker Compose setup including PostgreSQL, Redis, and Mailpit for robust backend services.
* Hardened Prisma schema definitions for complex inventory and warehouse mapping.

### 🐛 Bug Fixes
* Resolved Prisma validation failures related to `slug` uniqueness for Tenants and Products.
* Corrected branch initialization and Enum types in database seeds.
* Fixed navigation bugs relating to Procurement and Customers dashboard components.
* Addressed `ECONNREFUSED` backend failures during cold starts by synchronizing Docker container boots.
* Fixed session teardown issues ensuring true authentication wiping upon logout.

### ⚠️ Breaking Changes
* N/A (Initial MVP release).

### 🚧 Known Limitations
* Complete regression coverage for edge cases across all CRUD operations is pending.
* Generic inventory adjustments, stock transfers, and advanced warehouse movements have been intentionally deferred to focus purely on the Goods Receipt workflow.
* Certain complex placeholder UI elements have been temporarily hidden for a streamlined presentation.

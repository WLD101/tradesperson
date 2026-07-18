# Flooring Supplier Domain Foundation

Prepared: July 18, 2026

## Scope
Phase B delivers the first supplier-domain foundation for the flooring ERP inside the existing Tradesperson Network monorepo. It adds tenant-owned supplier master data, supplier contacts, supplier-product links, archive support, product-side supplier visibility, demo seed data, and functional supplier management screens.

This phase intentionally stops before commercial pricing, purchase orders, goods receipt, or stock handling. The goal is to make supplier relationships first-class and tenant-safe so procurement workflows can build on top of them without reworking the data model.

## Entities
- `Supplier`
- `SupplierContact`
- `SupplierProduct`

## Relationships
- Every supplier-domain record is tenant-owned.
- A supplier can optionally be associated with a branch for operational ownership.
- A supplier can have many contacts.
- A supplier can link to many products.
- A supplier-product link can optionally target a specific product variant.
- A supplier-product link can optionally store a supplier unit of measure.

## Supplier Strategy
- Suppliers are operational trading partners, not yet finance ledger accounts.
- The model stores practical flooring-procurement fields first:
  - supplier code
  - legal and trading names
  - account and registration references
  - VAT registration reference
  - telephone, email, website
  - address and postcode
  - default currency
  - payment terms text
  - credit limit
  - typical lead time
  - minimum order notes
  - delivery notes
  - return policy notes
  - preferred supplier flag
  - lifecycle status
- A supplier can be archived instead of deleted.

## Contact Strategy
- Contacts are nested under suppliers rather than treated as shared CRM people.
- Contact roles support common procurement scenarios:
  - primary contact
  - ordering contact
  - accounts contact
  - technical contact
- API rules enforce a single primary contact per supplier at a time.

## Supplier-Product Strategy
- Supplier-product links bridge the Phase A catalogue into later purchasing and pricing workflows.
- Each link can store:
  - supplier SKU
  - supplier description
  - pack quantity
  - pack coverage
  - roll width
  - standard roll length
  - minimum order quantity
  - lead time days
  - preferred-supplier flag
  - last confirmed date
  - free-form notes
- The API validates that:
  - supplier, product, variant, and unit references belong to the active tenant
  - a variant belongs to the chosen product
  - archived suppliers cannot receive new links

## Permissions
Phase B adds:
- `suppliers.view`
- `suppliers.manage`
- `suppliers.archive`
- `suppliers.contacts.manage`
- `suppliers.products.manage`

The API remains the security boundary. UI affordances are permission-aware but not trusted for enforcement.

## API Routes
Implemented in this phase:
- `GET /api/v1/suppliers`
- `GET /api/v1/suppliers/:supplierId`
- `POST /api/v1/suppliers`
- `PATCH /api/v1/suppliers/:supplierId`
- `PATCH /api/v1/suppliers/:supplierId/archive`
- `PATCH /api/v1/suppliers/:supplierId/restore`
- `GET /api/v1/suppliers/:supplierId/contacts`
- `POST /api/v1/suppliers/:supplierId/contacts`
- `PATCH /api/v1/suppliers/:supplierId/contacts/:contactId`
- `PATCH /api/v1/suppliers/:supplierId/contacts/:contactId/archive`
- `PATCH /api/v1/suppliers/:supplierId/contacts/:contactId/restore`
- `GET /api/v1/suppliers/:supplierId/products`
- `GET /api/v1/suppliers/:supplierId/products/:supplierProductId`
- `POST /api/v1/suppliers/:supplierId/products`
- `PATCH /api/v1/suppliers/:supplierId/products/:supplierProductId`
- `PATCH /api/v1/suppliers/:supplierId/products/:supplierProductId/archive`
- `PATCH /api/v1/suppliers/:supplierId/products/:supplierProductId/restore`
- `GET /api/v1/catalogue/products/:productId/suppliers`

## UI Routes
Implemented in this phase:
- `/app/suppliers`
- `/app/suppliers/new`
- `/app/suppliers/[id]`
- `/app/suppliers/[id]/edit`

The product detail route also now shows linked suppliers:
- `/app/catalogue/products/[id]`

## Seed Data
The demo seed now includes fictional UK flooring suppliers and linked product examples across:
- carpet distribution
- adhesives and preparation
- profiles and accessories
- laminate and LVT supply

This gives the local environment realistic supplier-product examples without introducing live commercial pricing.

## Verification
Verified on July 18, 2026 with:
- Prisma schema format and client generation
- API typecheck
- web typecheck
- DB typecheck
- tenant-isolation integration suite

The tenant-isolation suite now runs 41 cases in the authoritative compiled suite and includes supplier-domain coverage for:
- cross-tenant supplier retrieval
- cross-tenant branch references
- cross-tenant supplier-product linking
- supplier permission enforcement
- supplier pricing import, mapping, approval, execution, and price visibility isolation

## Known Limitations
- Phase C pricing now exists separately in `docs/22-flooring-supplier-pricing-domain.md`
- Phase B itself still does not own purchase orders, goods receipt, or stock movement workflows
- No supplier documents or certificates workflow yet
- No purchase orders, receipts, or stock movement integration yet
- No AP ledger or invoice reconciliation yet

## Next Dependencies
The next procurement path should build in this order:
1. Begin Phase D procurement foundation with purchase requisitions and purchase orders
2. Add goods receipt and discrepancy handling
3. Add warehouse, roll, remnant, and stock movement models

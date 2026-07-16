# Flooring Product Catalogue Domain

Prepared: July 16, 2026

## Scope
Phase A delivers a tenant-owned flooring product catalogue foundation inside the existing Tradesperson Network monorepo. It adds categories, manufacturers, brands, collections, units of measure, products, variants, archive support, tenant-safe search/filter/pagination, seed data, and simple management pages.

Final visual design is deferred. The screens in this phase are intentionally functional, replaceable, and aligned to the current shared UI primitives.

## Entities
- `ProductCategory`
- `Manufacturer`
- `Brand`
- `ProductCollection`
- `UnitOfMeasure`
- `Product`
- `ProductVariant`
- `ProductAttributeDefinition`
- `ProductAttributeValue`
- `ProductDocument`
- `ProductImage`

## Relationships
- A tenant owns every catalogue record in Phase A.
- A product belongs to one category and one primary unit of measure.
- A product can optionally belong to one manufacturer, brand, and collection.
- A product can have many variants.
- A brand can optionally belong to one manufacturer.
- A collection can optionally belong to one manufacturer and one brand.
- Attribute definitions can optionally target a category.
- Attribute values can attach to a product or product variant.

## Tenant Model
- Tenant isolation remains custom and authoritative in the API.
- Catalogue records are tenant-owned, not platform-public.
- Phase A intentionally avoids unsafe patterns such as `tenantId = null` meaning shared/public.
- Branch ownership is not added to catalogue records in this cycle because the initial catalogue is tenant-wide rather than branch-specific.

## Category Strategy
Seed data currently covers:
- Carpet
- Luxury vinyl tile
- Sheet vinyl
- Laminate
- Underlay
- Adhesive
- Smoothing compound
- Door profile

Additional flooring categories from the roadmap can be added through the same category administration flow without changing the tenancy model.

## Product And Variant Strategy
- Product records carry shared business information such as SKU, category, manufacturer/brand/collection links, warranty, adhesive guidance, and lifecycle state.
- Product variants carry operational flooring measurements such as pack coverage, roll width, standard roll length, tile dimensions, and wear layer.
- Archive support is handled through lifecycle state instead of deletion.
- Category-specific rules currently enforce the first useful flooring distinctions:
  - roll categories require roll width and roll length
  - pack categories require pack quantity and pack coverage
  - LVT and laminate categories also require tile/plank dimensions

## Flooring Attributes
Explicit fields are used first for operationally important flooring properties:
- SKU
- Supplier SKU placeholder
- Colour
- Shade
- Pattern
- Material
- Thickness
- Wear layer
- Roll width
- Standard roll length
- Tile/plank dimensions
- Pack quantity
- Pack coverage
- Fire rating
- Slip rating
- Acoustic rating
- Underfloor-heating compatibility
- Domestic/commercial classification
- Warranty
- Recommended adhesive
- Recommended underlay

Flexible attribute definitions remain available for secondary, category-specific metadata.

## Units
Phase A supports tenant-owned units of measure, including:
- Roll
- Pack
- Square metre
- Linear metre
- Bag
- Tub

## Basic Price Boundaries
- Supplier price lists are not implemented in this phase.
- Price history is not implemented in this phase.
- Quote/estimate pricing logic is not implemented in this phase.
- Floating-point financial logic is intentionally avoided.
- Product pricing rules remain custom application behavior and are still deferred to later phases.

## Permissions
Phase A adds:
- `catalogue.view`
- `catalogue.manage`
- `catalogue.archive`
- `catalogue.import`
- `catalogue.documents.manage`

The API remains the enforcement point. UI controls are permission-aware, but they are not the security boundary.

## API Routes
Implemented in this phase:
- `GET/POST/PATCH` for categories, manufacturers, brands, collections, and units
- archive/restore endpoints for those reference records
- `GET/POST/PATCH` for products
- archive/restore for products
- `GET/POST/PATCH` for variants
- archive/restore for variants
- `GET/POST` for attribute definitions

Deferred:
- import preview/commit routes
- signed upload routes
- product image/document metadata write flows

## UI Routes
Implemented in this phase:
- `/app/catalogue`
- `/app/catalogue/products`
- `/app/catalogue/products/new`
- `/app/catalogue/products/[id]`
- `/app/catalogue/products/[id]/edit`
- `/app/catalogue/categories`
- `/app/catalogue/manufacturers`
- `/app/catalogue/brands`
- `/app/catalogue/collections`
- `/app/catalogue/units`

## Open-Source Package Adoption
- Adopted:
  - `@tanstack/react-table@8.21.3`
- Still proposed, not yet installed:
  - `react-dropzone`
  - `papaparse`
  - `read-excel-file`
  - `write-excel-file`

Open-source packages provide infrastructure only. Tenant isolation, branch permissions, pricing logic, supplier pricing history, and flooring calculations remain custom.

## Test Strategy
- Prisma schema validation and migration checks
- Unit tests for flooring category variant rules
- Tenant-isolation integration tests for cross-tenant catalogue access
- Permission tests for read-only vs manage access
- API and web typechecks/builds

## Known Limitations
- No signed upload workflow yet
- No document/image metadata UI yet
- No CSV/XLSX import preview yet
- No supplier pricing, stock, or quotation logic yet
- No public/shared platform catalogue model yet

## Supplier-Pricing Dependency
The next catalogue-related data phase is:
Suppliers -> supplier products -> price lists -> price history -> CSV/XLSX import preview and validation.

## Estimation Dependency
Estimate and quotation pricing must consume the catalogue only after supplier pricing and price history are implemented safely. Phase A intentionally stops short of estimate pricing logic.

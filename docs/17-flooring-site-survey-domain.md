# Flooring ERP: Site and Survey Domain

## Overview
This document captures the current Site and Survey foundation for the flooring ERP as of July 16, 2026. It covers the Site CRM records, survey lifecycle, room-level measurement capture, and the API and UI surface that now exists in the repository.

## 1. Property Dependency Map and Site Mapping Approach
The legacy CRM mapped leads to customers and properties.
- The physical PostgreSQL table remains `Property`.
- Prisma maps that table to the `Site` model via `@@map("Property")` to avoid a destructive rename in this phase.
- Lead conversion uses `convertedSiteId` in code while preserving legacy compatibility where needed.
- `/api/v1/properties` remains a compatibility alias over the newer Site controller behavior.

## 2. Models
- `Site`: A physical customer location where surveys, quotations, and jobs take place.
- `Survey`: A visit, estimate, or inspection record attached to a Site and Customer.
- `SurveyRoom`: A named room or measured area inside a Survey.
- `MeasurementComponent`: A geometric additive or deductive component used to calculate room area.

## 3. Precision and Units
- Authoritative measurements use metric units in meters.
- Area calculations run on the server with `Prisma.Decimal`.
- Persisted totals use `DECIMAL(10,4)` precision for `grossArea`, `netArea`, and `wasteAdjustedArea`.

## 4. Supported Geometry and Totals
- `RECTANGLE`: `length * width`
- `TRIANGLE`: `0.5 * base * height`
- `CIRCLE`: `pi * radius^2`
- `SEMICIRCLE`: `(pi * radius^2) / 2`
- `ALCOVE`: `length * width`
- `COLUMN`: `length * width`
- `LANDING`: `length * width`
- `CORRIDOR`: `length * width`
- `STAIR`: `width * (tread + riser) * count`
- `CUSTOM` exists in the database enum but is deliberately rejected by the API in this phase

Terminology:
- `grossArea`: Sum of additive components before deductions.
- `netArea`: Additions minus deductions.
- `wasteAdjustedArea`: `netArea * (1 + wastePercentage / 100)`.
- `calculatedArea`: The authoritative server-computed area for a single measurement component.

## 5. Survey Transitions and Immutability
Valid transitions:
- `DRAFT` -> `SCHEDULED` or `CANCELLED`
- `SCHEDULED` -> `IN_PROGRESS` or `CANCELLED`
- `IN_PROGRESS` -> `COMPLETED`
- `COMPLETED` -> `REVIEWED`
- `REVIEWED` -> `APPROVED`
- `APPROVED` -> `SUPERSEDED`

Immutable states:
- `COMPLETED`
- `REVIEWED`
- `APPROVED`
- `SUPERSEDED`
- `CANCELLED`

When a survey is immutable:
- Rooms cannot be created, edited, or deleted.
- Measurement components cannot be created, edited, or deleted.
- The UI remains viewable, but all mutation controls should be disabled.

## 6. Room Metadata Surface
`SurveyRoom` now supports the following operational fields through the service and HTTP API:
- `name`
- `floorLevel`
- `existingCovering`
- `subfloorType`
- `subfloorCondition`
- `underfloorHeating`
- `upliftRequired`
- `wastePercentage`
- `preparationNotes`
- `installationNotes`

Supported `subfloorType` values:
- `CONCRETE`
- `SAND_CEMENT_SCREED`
- `ANHYDRITE_SCREED`
- `TIMBER_BOARDS`
- `PLYWOOD`
- `CHIPBOARD`
- `EXISTING_TILE`
- `EXISTING_RESILIENT`
- `RAISED_ACCESS`
- `OTHER`
- `UNKNOWN`

## 7. API Route Table
| Method | Route | Permission | Tenant scoped | Branch scoped | Tested |
| ------ | ----- | ---------- | ------------- | ------------- | ------ |
| GET | `/api/v1/sites` | `sites.view` | Yes | Yes | Yes |
| POST | `/api/v1/sites` | `sites.manage` | Yes | Yes | Yes |
| GET | `/api/v1/sites/:siteId` | `sites.view` | Yes | Yes | Yes |
| PATCH | `/api/v1/sites/:siteId` | `sites.manage` | Yes | Yes | Yes |
| GET | `/api/v1/properties` | `sites.view` | Yes | Yes | Yes |
| POST | `/api/v1/properties` | `sites.manage` | Yes | Yes | Yes |
| GET | `/api/v1/surveys` | `sites.view` | Yes | Yes | Yes |
| POST | `/api/v1/surveys` | `sites.manage` | Yes | Yes | Yes |
| GET | `/api/v1/surveys/:id` | `sites.view` | Yes | Yes | Yes |
| PATCH | `/api/v1/surveys/:id` | `sites.manage` | Yes | Yes | Yes |
| PATCH | `/api/v1/surveys/:id/status` | `sites.manage` | Yes | Yes | Yes |
| GET | `/api/v1/surveys/:id/rooms` | `sites.view` | Yes | Yes | Yes |
| POST | `/api/v1/surveys/:id/rooms` | `sites.manage` | Yes | Yes | Yes |
| GET | `/api/v1/surveys/:id/rooms/:roomId` | `sites.view` | Yes | Yes | Yes |
| PATCH | `/api/v1/surveys/:id/rooms/:roomId` | `sites.manage` | Yes | Yes | Yes |
| DELETE | `/api/v1/surveys/:id/rooms/:roomId` | `sites.manage` | Yes | Yes | Yes |
| POST | `/api/v1/surveys/:id/rooms/:roomId/components` | `sites.manage` | Yes | Yes | Yes |
| PATCH | `/api/v1/surveys/:id/rooms/:roomId/components/:componentId` | `sites.manage` | Yes | Yes | Yes |
| DELETE | `/api/v1/surveys/:id/rooms/:roomId/components/:componentId` | `sites.manage` | Yes | Yes | Yes |

## 8. Permissions
- `sites.view` is required for Site, Survey, Room, and measurement read access.
- `sites.manage` is required for Site edits, Survey creation, status changes, Room CRUD, and measurement mutations.

## 9. Tenant and Branch Isolation
All Site and Survey operations enforce:
1. Active tenant membership from the authenticated session.
2. Parent-record tenant checks for Site, Customer, Lead, Survey, and Room relationships.
3. Branch-based filtering through `BranchAccessService`, including business-owner bypass behavior where appropriate.

## 10. Current Frontend Coverage
| Route | Rendering | API surface used | Verified |
| ----- | --------- | ---------------- | -------- |
| `/app/crm/sites` | Server + actions | Site list and Site create | Yes |
| `/app/crm/sites/new` | Server + action | Site create | Yes |
| `/app/crm/sites/[id]` | Server | Site detail | Yes |
| `/app/crm/sites/[id]/edit` | Client | Site detail and Site update | Yes |
| `/app/crm/surveys` | Server + actions | Survey list and Survey create | Yes |
| `/app/crm/surveys/new` | Server + action | Survey create | Yes |
| `/app/crm/surveys/[id]` | Server + actions | Survey detail, status change, room create | Yes |
| `/app/crm/surveys/[id]/measurements` | Client | Survey detail, room CRUD, measurement create/update/delete | Yes |

## 11. Test and Verification Status
Verified locally on July 16, 2026:
- `pnpm --filter @tradesperson/api build`
- `pnpm --filter @tradesperson/web typecheck`
- `pnpm --filter @tradesperson/api test`
- `pnpm test:isolation`
- full workspace lint, typecheck, and build had already been green earlier in the active branch state before this continuation

Current focused test counts:
- API unit tests: 25 passing
- Area calculator scenarios: 22 passing
- Tenant-isolation runner scenarios: 12 passing

## 12. Known Limitations
- No surveyor assignment workflow yet.
- No standalone component read endpoint beyond survey and room aggregate reads.
- No offline survey capture, photos, signatures, or mobile sync.
- No historical survey revisions beyond lifecycle status and replacement through `SUPERSEDED`.
- `wasteAdjustedArea` is room-local and does not yet incorporate product-specific waste rules from estimating.

## 13. Next Phase Dependency
This foundation is now suitable for the next estimating and quotation phase, where approved survey measurements will feed material takeoff, pricing, and waste-aware product calculations.

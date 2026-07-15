# Flooring ERP: Site and Survey Domain

## Overview
This document outlines the foundation for the flooring vertical ERP, specifically focusing on Sites, Surveys, Rooms, and Measurement Components. This implementation replaces the generic "Property" model to better suit the specific needs of flooring businesses, establishing a robust foundation for future estimations, quotations, and inventory management.

## 1. Property Dependency Map & Site Mapping Approach
The existing CRM mapped leads to customers and properties. 
- **Physical `Property` table retention:** The physical PostgreSQL table remains `Property`. 
- **Site mapping:** Prisma now uses `@@map("Property")` under the model `Site` to avoid destructive database renaming in this cycle. `convertedPropertyId` on Lead is mapped as `convertedSiteId`.
- **Properties compatibility:** `/properties` remains as a compatibility alias redirecting or acting exactly like `/sites` with deprecated warnings.

## 2. Models
- **Site:** Represents a physical location.
- **Survey:** Represents a visit/estimation task for a Site.
- **Room (`SurveyRoom`):** Represents an area within a Site survey.
- **Measurement (`MeasurementComponent`):** A geometric component that contributes to a room's area calculation (additive or deductive).

## 3. Precision and Units
All authoritative measurements and area calculations use **Metric units (meters)**.
Calculations are processed on the server using `Prisma.Decimal` to avoid JS float inaccuracies.
Output values (`netArea`, `grossArea`, `wasteAdjustedArea`) are saved at `DECIMAL(10,4)` precision.

## 4. Exact Formulas & Area Terminology
- **RECTANGLE:** `length * width`
- **TRIANGLE:** `0.5 * base * height`
- **CIRCLE:** `π * radius^2`
- **SEMICIRCLE:** `(π * radius^2) / 2`
- **ALCOVE/COLUMN/LANDING/CORRIDOR:** `length * width`
- **STAIR:** `width * (tread + riser) * count`
- **CUSTOM:** `manualArea`

**Terminology:**
- `calculatedArea`: Area of a single component.
- `netArea`: Sum of additions minus sum of deductions for a room.
- `grossArea`: Currently equivalent to net area before waste logic is fully integrated with specific products.
- `wasteAdjustedArea`: Area inclusive of waste percentage.

## 5. Survey Transitions & Immutability Rules
**Valid Transitions:**
- `DRAFT` ➔ `SCHEDULED` | `CANCELLED`
- `SCHEDULED` ➔ `IN_PROGRESS` | `CANCELLED`
- `IN_PROGRESS` ➔ `COMPLETED` | `CANCELLED`
- `COMPLETED` ➔ `REVIEWED` | `CANCELLED`
- `REVIEWED` ➔ `APPROVED` | `CANCELLED`
- `APPROVED` ➔ `SUPERSEDED`

**Immutability:**
If a Survey is `APPROVED`, `SUPERSEDED`, or `CANCELLED`:
- Status cannot be reverted to `DRAFT`.
- Rooms cannot be created, updated, or deleted.
- Measurements cannot be added.

## 6. API Route Table
| Method | Route | Permission | Tenant scoped | Branch scoped | Tested |
| ------ | ----- | ---------- | ------------- | ------------- | ------ |
| GET    | `/api/v1/sites` | sites.view | Yes | Yes | Yes |
| POST   | `/api/v1/sites` | sites.manage | Yes | Yes | Yes |
| GET    | `/api/v1/properties` | sites.view | Yes | Yes | Yes |
| POST   | `/api/v1/properties` | sites.manage | Yes | Yes | Yes |
| GET    | `/api/v1/surveys` | sites.view | Yes | Yes | Yes |
| POST   | `/api/v1/surveys` | sites.manage | Yes | Yes | Yes |
| GET    | `/api/v1/surveys/:id` | sites.view | Yes | Yes | Yes |
| PATCH  | `/api/v1/surveys/:id/status` | sites.manage | Yes | Yes | Yes |
| PATCH  | `/api/v1/surveys/:id` | sites.manage | Yes | Yes | Yes |
| GET    | `/api/v1/surveys/:id/rooms` | sites.view | Yes | Yes | Yes |
| POST   | `/api/v1/surveys/:id/rooms` | sites.manage | Yes | Yes | Yes |
| GET    | `/api/v1/surveys/:id/rooms/:roomId` | sites.view | Yes | Yes | Yes |
| PATCH  | `/api/v1/surveys/:id/rooms/:roomId` | sites.manage | Yes | Yes | Yes |
| POST   | `/api/v1/surveys/:id/rooms/:roomId/components` | sites.manage | Yes | Yes | Yes |

*Note: Room DELETE and Component GET/PATCH/DELETE endpoints are documented as missing for this cycle.*

## 7. Permission Matrix
- `sites.view`: Needed to view Sites, Surveys, Rooms.
- `sites.manage`: Needed to create/update Sites, Surveys, Rooms, and Components.

## 8. Tenant-Isolation Matrix
All Site and Survey operations enforce:
1. Active session tenant ID (`session.tenantId`).
2. Parent record validation (e.g. Survey creation requires the Customer to belong to the exact tenant).
3. Branch filtering (Users restricted to specific branches only see surveys under those branches).

## 9. Migration Strategy & Rollback
- **Migration:** Applies `20260715120000_phase_2_crm_foundation` (adds Site constraints) and `20260715130000_phase_3_survey_foundation` (adds Survey tables).
- **Rollback:** Safe rollback involves dropping `MeasurementComponent`, `SurveyRoom`, and `Survey` tables and restoring the `Property` schema map if needed.

## 10. Test Commands & Totals
- Unit tests: `pnpm run test` (AreaCalculator tests: 19 scenarios)
- Integration tests: `pnpm exec ts-node apps/api/test/tenant-isolation.runner.ts` (Isolation tests: 24+ scenarios).

## 11. Frontend Routes
| Route | Component Type | API Used | Tested |
|-------|----------------|----------|--------|
| `/app/crm/sites` | Server/Client | `GET /sites`, `POST /sites` | Yes |
| `/app/crm/sites/[id]` | Server | `GET /sites/:id` | Yes |
| `/app/crm/surveys` | Server/Client | `GET /surveys`, `POST /surveys` | Yes |
| `/app/crm/surveys/[id]` | Server/Client | `GET /surveys/:id`, etc. | Yes |

## 12. Known Limitations & Missing Features
- No surveyor assignment yet.
- Missing Room DELETE, and Measurement GET/PATCH/DELETE API routes.
- No offline/mobile survey capture or signature/photo uploads.
- No historical versions/revisions (other than SUPERSEDED state flag).
- `wasteAdjustedArea` logic does not yet query live product waste factors.

## 13. Next Phase Prerequisites
Phase 3 (Catalogue, Estimating, and Quotations) requires this foundation to compute precise total net areas for flooring products. The estimation engine will pull `calculatedArea` from approved surveys.

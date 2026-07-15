# Tenant Isolation

Date verified: 2026-07-15

## Purpose

This document describes how tenant and branch context are resolved in the current application, which routes are covered by real isolation tests, and which safe query patterns must be followed.

## Tenant Context Lifecycle

1. A user signs in through `POST /api/v1/auth/sign-in`.
2. The server verifies credentials and creates an `AuthSession` row.
3. The session stores:
   - `userId`
   - `activeTenantId`
   - `activeBranchId`
4. The signed cookie `tp_session` contains only a signed token handle, not trusted business ownership data.
5. On authenticated requests, `AuthGuard` resolves the cookie to a server-side session using `SessionAuthService`.
6. `TenantAccessService.ensureTenant()` validates that the authenticated user has an active membership for the resolved tenant.

## Branch Resolution

- Tenant administrators are users whose membership is an owner membership or includes the `BUSINESS_OWNER` role key.
- Branch-restricted users inherit branch scope from:
  - `session.activeBranchId`, or
  - `membership.defaultBranchId`
- `BranchAccessService` is now the shared enforcement point for:
  - list scoping
  - branch selection during create
  - branch reassignment protection
  - branch-specific record visibility

## Authorisation Flow

1. `AuthGuard` authenticates the request and attaches `session`.
2. `PermissionsGuard` enforces permission checks against the active tenant membership.
3. `TenantAccessService` confirms tenant membership.
4. `BranchAccessService` constrains branch-owned access where applicable.

## Tenant-Owned Model Conventions

Currently routed tenant-owned models:

- `Tenant`
- `TenantMembership`
- `Branch`
- `TenantSetting`
- `Invitation`
- `TenantSubscription`
- `AuditLog`
- `Lead`
- `Customer`
- `Property`

Current conventions:

- derive `tenantId` from authenticated session context, not request bodies
- never trust browser-supplied `branchId`
- scope list and lookup queries by tenant
- scope branch-owned reads and writes through `BranchAccessService`

## Safe Query Patterns

- `findFirst` or `findFirstOrThrow` with tenant scope
- branch-owned list filters using `BranchAccessService.branchWhere(...)`
- branch validation using `BranchAccessService.ensureAuthorizedBranch(...)`
- branch defaulting during create using `BranchAccessService.resolveCreateBranchId(...)`

## Prohibited Query Patterns

- unscoped `findUnique` or `update` on tenant-owned models using only global IDs
- accepting `tenantId` from request bodies for tenant-owned data
- writing branch-owned records using unvalidated `branchId`
- assuming frontend filtering is sufficient isolation

## Test Fixture Architecture

The tenant-isolation runner uses deterministic fixtures for:

- Tenant A
- Tenant B
- Branch A1
- Branch A2
- Branch B1
- Owner for Tenant A
- Owner for Tenant B
- Branch-restricted user for Tenant A branch A1
- Tenant-owned CRM records for both tenants

The runner:

- recreates a dedicated PostgreSQL test database
- applies real Prisma migrations
- truncates business tables deterministically between cases
- starts the compiled API server
- exercises real HTTP routes

## Running Locally

Prerequisites:

- Docker Desktop running
- `postgres` and `redis` services available through `docker compose`

Commands:

- `docker compose up -d postgres redis`
- `pnpm test:isolation`

## Running In CI

The CI workflow should provide:

- PostgreSQL service
- Redis service
- `pnpm install`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:isolation`

## Coverage Matrix

| Resource | List | Read | Create Reference | Update | Delete | Branch | Export |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Tenant current | Tested | Not applicable | Not applicable | Not implemented | Not implemented | Tested | Not implemented |
| Tenant memberships | Tested | Not applicable | Not applicable | Not applicable | Not applicable | Not applicable | Not implemented |
| Branch | Tested | Tested | Not applicable | Not applicable | Not implemented | Tested | Not implemented |
| Membership roles | Not applicable | Tested | Not applicable | Tested | Not applicable | Not applicable | Not implemented |
| Invitation | Tested | Not applicable | Tested | Not applicable | Not applicable | Not applicable | Not implemented |
| Audit log | Tested | Not applicable | Not applicable | Not applicable | Not applicable | Not applicable | Not implemented |
| Subscription current | Not implemented | Not applicable | Not applicable | Not applicable | Not applicable | Not applicable | Not implemented |
| Lead | Tested | Not implemented | Tested | Tested | Not implemented | Tested | Not implemented |
| Customer | Tested | Not implemented | Tested | Not implemented | Not implemented | Tested | Not implemented |
| Property | Tested | Not implemented | Tested | Not implemented | Not implemented | Tested | Not implemented |

## Known Remaining Gaps

- No export endpoints currently exist, so export isolation remains unimplemented.
- No delete or restore endpoints currently exist for tenant-owned CRM entities.
- Database-level tenant-safe compound foreign keys are still incomplete and should be added in a controlled migration.
- Membership and invitation branch assignment is still shallow because those records do not yet carry full branch policy metadata.

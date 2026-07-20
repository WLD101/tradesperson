# Parallel Development Map

Prepared: July 18, 2026

## Goal
Phase D is broad enough that work should be decomposed into clean streams, even when executed mostly by one contributor. This map identifies boundaries that can be developed and validated with minimal merge friction.

## Stream A: Domain And Migration Foundation
Primary outputs:
- Prisma enums and models
- migration SQL
- seed extensions
- tenant, branch, and index rules

Dependencies:
- none beyond Phase C baseline

Feeds:
- API services
- DB tests
- UI typing

## Stream B: Numbering, Money, And Lifecycle Rules
Primary outputs:
- procurement numbering service on top of `NumberSequence`
- decimal helpers for totals
- lifecycle transition rules
- immutable-version checks
- requisition conversion rules

Dependencies:
- Stream A model shapes

Feeds:
- API controllers and services
- unit tests
- DB-backed concurrency tests

## Stream C: API Surface
Primary outputs:
- Nest procurement module
- requisition endpoints
- purchase-order endpoints
- acknowledgement and delivery-plan endpoints
- pagination, sorting, search, and filter contracts

Dependencies:
- Streams A and B

Feeds:
- web app
- isolation tests
- permission tests

## Stream D: Permissions And Audit
Primary outputs:
- new permission registrations
- role defaults
- procurement audit event coverage
- sensitive cost-field response shaping

Dependencies:
- Streams A and C

Feeds:
- API enforcement
- UI action visibility
- validation matrix

## Stream E: Web Administration UI
Primary outputs:
- procurement list pages
- create/edit/detail routes
- supplier product and pricing selection flows
- version history and audit history sections
- print route

Dependencies:
- Stream C contracts
- Stream D permission semantics

Feeds:
- manual functional validation
- browser-print review

## Stream F: Test And Validation Infrastructure
Primary outputs:
- procurement unit tests
- DB serial suites
- tenant isolation expansions
- permission tests
- script updates for serial DB policy

Dependencies:
- Streams A through D at minimum

Feeds:
- release confidence
- regression protection for future Phase D2 work

## Suggested Sequencing
1. Stream A
2. Stream B
3. Stream C and Stream D in close succession
4. Stream F for backend confidence while Stream E starts consuming stable endpoints
5. Stream E
6. full validation and self-review

## Merge-Risk Hotspots
- schema and migration files
- shared permission seed definitions
- isolation test fixture helpers
- shared money and numbering utilities
- web data-lib typing for procurement responses

## Interfaces To Keep Stable
- procurement status enums
- response envelope format
- numbering format contract
- cost-visibility response shape
- version immutability guarantees
- requisition conversion payload and result contract

## Definition Of Ready For Phase D2
Phase D2 can start when these Phase D contracts are stable:
- purchase-order IDs and version linkage
- supplier acknowledgement persistence
- delivery-plan persistence
- immutable commercial snapshots
- audit trail semantics
- requisition-to-order traceability

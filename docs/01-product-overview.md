# Product Overview

## Vision

Tradesperson.net ERP is a multi-tenant SaaS operating system for UK trade businesses. The first live vertical is flooring, but the platform core must remain reusable across additional trades such as plumbing, electrical, roofing, kitchens, bathrooms, and general building.

## Core Outcome

The product must let a tenant business run an end-to-end job lifecycle without duplicate data entry:

`Lead -> Customer -> Property -> Survey -> Quote -> Acceptance -> Deposit -> Job -> Purchasing -> Installation -> Invoice -> Payment -> Warranty`

## Product Principles

- One shared ERP core, not separate trade-specific applications.
- Flooring is the first complete trade module.
- Shared data model with strict tenant isolation.
- Operational workflows take priority over visually isolated screens.
- Every important action is permission-aware, auditable, and tenant-scoped.
- API and domain boundaries must be integration-ready for the future public marketplace.

## User Groups

- Sole traders
- Small flooring installers
- Flooring showrooms
- Supply-only retailers
- Supply-and-fit businesses
- Multi-branch trade groups
- Internal Tradesperson.net platform staff
- End customers accessing a customer portal

## Surfaces

### Tenant ERP

Operational system for CRM, surveys, quotes, jobs, inventory, purchasing, finance, documents, and reporting.

### Platform Admin

Internal control plane for tenant management, plans, features, support access, lead operations, and integration health.

### Customer Portal

Secure quote acceptance, deposits, project tracking, documents, and messaging.

## MVP Focus

The MVP is complete only when the flooring workflow is fully operational, tested, and runnable through Docker Compose with realistic seed data.

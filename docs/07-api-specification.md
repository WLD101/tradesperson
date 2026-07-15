# API Specification

## API Principles

- Versioned REST endpoints under `/api/v1`
- Tenant resolution from authenticated context
- Consistent response envelope
- Permission checks before handler execution
- Correlation ID on every request
- OpenAPI-generated documentation

## Standard Response Shape

```json
{
  "data": {},
  "meta": {},
  "error": null
}
```

## Core Routes

### Auth And Tenancy

- `POST /api/v1/auth/sign-in`
- `POST /api/v1/auth/passwordless/request`
- `POST /api/v1/auth/passwordless/verify`
- `POST /api/v1/auth/invitations/accept`
- `GET /api/v1/auth/session`
- `POST /api/v1/auth/switch-tenant`

### Tenant Setup

- `GET /api/v1/tenants/current`
- `PATCH /api/v1/tenants/current`
- `GET /api/v1/branches`
- `POST /api/v1/branches`
- `PATCH /api/v1/branches/:id`

### CRM

- `GET /api/v1/leads`
- `POST /api/v1/leads`
- `PATCH /api/v1/leads/:id`
- `POST /api/v1/leads/:id/convert`
- `GET /api/v1/customers`
- `POST /api/v1/customers`
- `GET /api/v1/properties`
- `POST /api/v1/properties`

### Surveys

- `GET /api/v1/surveys`
- `POST /api/v1/surveys`
- `GET /api/v1/surveys/:id`
- `POST /api/v1/surveys/:id/rooms`
- `POST /api/v1/surveys/:id/complete`

### Catalogue And Pricing

- `GET /api/v1/products`
- `POST /api/v1/products`
- `GET /api/v1/services`
- `GET /api/v1/suppliers`
- `POST /api/v1/price-lists`

### Quotes

- `GET /api/v1/quotes`
- `POST /api/v1/quotes`
- `POST /api/v1/quotes/:id/versions`
- `POST /api/v1/quotes/:id/send`
- `POST /api/v1/quotes/:id/accept`
- `POST /api/v1/quotes/:id/convert-to-job`

### Jobs

- `GET /api/v1/jobs`
- `POST /api/v1/jobs`
- `PATCH /api/v1/jobs/:id`
- `POST /api/v1/jobs/:id/work-orders`
- `POST /api/v1/jobs/:id/assignments`
- `POST /api/v1/jobs/:id/complete`

### Inventory And Purchasing

- `GET /api/v1/inventory/stock-items`
- `POST /api/v1/inventory/reservations`
- `POST /api/v1/purchase-orders`
- `POST /api/v1/goods-receipts`

### Finance

- `GET /api/v1/invoices`
- `POST /api/v1/invoices`
- `POST /api/v1/payments`
- `POST /api/v1/credit-notes`

### Admin And Audit

- `GET /api/v1/reports/dashboard`
- `GET /api/v1/audit-logs`
- `GET /api/v1/settings`
- `PATCH /api/v1/settings`

## Cross-Cutting Behavior

- Pagination: `page`, `pageSize`, or cursor where needed
- Filtering: status, branch, date range, assigned user, supplier, customer
- Sorting: explicit allowlist per endpoint
- Idempotency: payments, webhook replays, imports, sends
- Rate limiting: auth and public-facing endpoints

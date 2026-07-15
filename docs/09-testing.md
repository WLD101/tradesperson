# Testing Strategy

## Test Layers

### Unit Tests

- quote calculation services
- measurement and waste calculation
- stock movement generation
- permission evaluation
- state transition guards

### Integration Tests

- module services against real database transactions
- tenant membership resolution
- background job handlers
- document and notification orchestration

### API Tests

- auth and session flows
- tenant-scoped CRUD
- validation and error shapes
- permission denial paths

### Database Tests

- migrations apply cleanly
- seed data integrity
- unique constraints
- audit append-only expectations

### Multi-Tenancy Isolation Tests

- cross-tenant reads blocked
- cross-tenant mutations blocked
- cache and storage keys scoped
- background jobs scoped

### End-to-End Tests

Playwright flow:

1. Create tenant
2. Invite salesperson
3. Create lead
4. Convert lead to customer and property
5. Book survey
6. Add rooms and measurements
7. Create quote
8. Send and accept quote
9. Record deposit
10. Convert to job
11. Reserve stock
12. Create purchase order
13. Receive goods
14. Schedule installer
15. Complete job
16. Issue final invoice
17. Record payment
18. Close job

## Quality Gates

- lint passes
- typecheck passes
- unit and integration tests pass
- Playwright critical workflow passes
- production build passes

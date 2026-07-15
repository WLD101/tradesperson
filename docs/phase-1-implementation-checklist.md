# Phase 1 Implementation Checklist

## Review And Planning

- [x] Read existing docs and scaffold files.
- [x] Compare scaffold against PRD, TRD, architecture, security, roles, roadmap, and MVP criteria.
- [ ] Keep this checklist updated as implementation progresses.

## Workspace Tooling

- [ ] Upgrade root workspace scripts and package metadata.
- [ ] Add shared TypeScript config packages.
- [ ] Add shared ESLint config package.
- [ ] Add shared formatting and ignore files.
- [ ] Add centralized environment validation package.

## Shared Packages

- [ ] Create `@tradesperson/types`.
- [ ] Create `@tradesperson/auth`.
- [ ] Create `@tradesperson/ui`.
- [ ] Create `@tradesperson/test-utils`.
- [ ] Expand `@tradesperson/db`.

## Database Foundation

- [ ] Finalize Phase 1 Prisma schema.
- [ ] Add first migration baseline.
- [ ] Add Prisma client singleton and helper utilities.
- [ ] Add deterministic seed data.
- [ ] Add development access documentation.

## API Foundation

- [ ] Scaffold NestJS API app.
- [ ] Add health and readiness endpoints.
- [ ] Add auth/session endpoints.
- [ ] Add tenant, membership, role, permission, branch, subscription, invitation, settings, and audit modules.
- [ ] Add tenant context and permission guards.
- [ ] Add consistent response and error formatting.

## Worker Foundation

- [ ] Scaffold BullMQ worker app.
- [ ] Add invitation email queue and processor.
- [ ] Add worker health handling and structured logs.

## Web Foundation

- [ ] Scaffold Next.js app.
- [ ] Add sign-in, invitation acceptance, tenant selection, and app shell routes.
- [ ] Add dashboard, business settings, branches, users, roles, and subscription pages.
- [ ] Connect UI to real API data and auth/session flow.

## Testing And Delivery

- [ ] Add unit, integration, tenant-isolation, and Playwright tests.
- [ ] Add Dockerfiles and improve Docker Compose.
- [ ] Add GitHub Actions CI workflow.
- [ ] Update README and Phase 1 summary docs.
- [ ] Run install, format, lint, typecheck, Prisma, build, unit/integration, and e2e validation commands.

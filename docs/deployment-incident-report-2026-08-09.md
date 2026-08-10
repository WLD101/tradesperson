# Tradesperson Network Production Incident Report

Date: August 9, 2026
Repository: `https://github.com/WLD101/tradesperson`
Branch: `codex/erp-foundation`
Workspace: `C:\Users\WLD10\Documents\tradesperson netwok`
Status: Active incident, partially recovered

## Executive Summary

The incident is no longer a single issue.

Two separate problem tracks now exist:

1. The live VPS deployment is mostly online, but `tradesperson-api` is still running with localhost-based production environment values.
2. The local repository contains an unfinished notification-provider migration and a broader API build/type-generation failure, so the codebase is not currently in a clean, validated deployment state.

This means:

- public routing and SSL are mostly recovered
- the live API responds
- the live frontend responds
- Docker infrastructure is not the main blocker anymore
- the next blockers are configuration correctness on the VPS and code validation inside the repo

## Current Blockers

### Blocker 1: Production API env drift on VPS

Confirmed live values inside `tradesperson-api`:

- `WEB_URL=http://localhost:3000`
- `API_URL=http://localhost:4000`
- `INTERNAL_API_URL=http://localhost:4000`
- `COOKIE_DOMAIN=localhost`

Expected production values:

- `WEB_URL=https://tradesperson.net`
- `API_URL=https://api.tradesperson.net`
- `INTERNAL_API_URL=http://127.0.0.1:4000`
- `COOKIE_DOMAIN=.tradesperson.net`
- `NEXT_PUBLIC_API_URL=https://api.tradesperson.net`

Impact:

- CORS still advertises localhost
- auth cookies are still domain-wrong
- browser-to-API behavior may remain unstable even though health checks pass

### Blocker 2: API health status is misleading

Confirmed:

- NestJS starts successfully in the API container
- the public health endpoint responds
- Docker marks the API container unhealthy only because the healthcheck runs `wget`
- `wget` is not installed in the API image

Impact:

- operations visibility is misleading
- this creates noise during diagnosis
- it is not the root application crash anymore

### Blocker 3: Notification migration is incomplete in local repo

Current local repository state shows:

- `apps/api/src/modules/notifications/providers/sendgrid.provider.ts` is deleted
- `apps/api/src/modules/notifications/providers/resend.provider.ts` is present but uncommitted
- `apps/api/src/modules/notifications/notifications.module.ts` is modified
- `apps/api/src/modules/notifications/notifications.service.ts` is modified
- `apps/api/package.json` is modified
- `packages/config/src/index.ts` is modified
- `.env.example` and split-runtime env examples are modified

This means the SendGrid-to-Resend migration is in progress locally, but not yet finalized, validated, and committed.

### Blocker 4: Local API build is failing beyond notifications

Local validation failure is broader than SendGrid.

Observed from API build/typecheck:

- `@prisma/client` exports are missing for many expected symbols
- `PrismaClient` and multiple enums/types are unresolved
- notification DTO/service types also fail because Prisma-generated exports are missing
- there are widespread TypeScript failures outside notifications

This means the codebase cannot honestly be described as deployment-ready yet, even if the SendGrid startup crash path is being removed.

## What We Found About the SendGrid Crash Brief

The latest attached brief claimed:

- SendGrid was still actively wired
- no Resend provider existed
- `@sendgrid/mail` was still the active dependency

That brief is outdated relative to the current working tree.

Actual repository state now shows:

- `ResendProvider` exists
- notifications module already references `ResendProvider`
- notifications service already injects `ResendProvider`
- `@sendgrid/mail` is no longer present in `apps/api/package.json`
- `sendgrid.provider.ts` has already been removed from the working tree

So the SendGrid crash diagnosis was useful historically, but it no longer describes the current local code exactly.

## Actual Notification State

### Resend wiring

`apps/api/src/modules/notifications/providers/resend.provider.ts` currently:

- uses the official `resend` package
- reads `RESEND_API_KEY`
- reads `MAIL_FROM`
- falls back to mock mode if `RESEND_API_KEY` is missing
- logs a warning instead of crashing provider construction

That is the correct startup-safety direction.

### Remaining notification risk

Notifications are not yet the only blocker because:

- migration is still uncommitted
- API typecheck is failing due to broader Prisma/type issues
- repo state is dirty

## What Was Recovered Previously

These recovery steps were already achieved before the current stuck point:

1. Verified nginx was running and serving requests.
2. Verified UFW allowed `80` and `443`.
3. Verified local loopback app ports were alive:
   - web on `127.0.0.1:3001`
   - API on `127.0.0.1:4000`
4. Verified postgres and redis were healthy.
5. Confirmed the earlier public-access problem was not the app process itself.
6. Repaired domain/DNS path enough for public HTTPS recovery.
7. Verified:
   - `https://tradesperson.net`
   - `https://www.tradesperson.net`
   - `https://api.tradesperson.net/api/v1/health`
8. Re-ran Certbot successfully for:
   - `tradesperson.net`
   - `www.tradesperson.net`
   - `api.tradesperson.net`
9. Reloaded nginx and re-verified public responses.
10. Confirmed the API process itself is alive even when Docker says unhealthy.

## What We Did During This Incident

Across the investigation, the following concrete work was completed:

1. Inspected nginx routing and server-name configuration.
2. Inspected UFW and network reachability.
3. Inspected local port listeners and loopback responses.
4. Verified SSL certificates and public host behavior.
5. Verified Docker container states.
6. Identified the API healthcheck mismatch with missing `wget`.
7. Inspected live API environment variables on the VPS.
8. Confirmed production env drift was still present in the running container.
9. Audited the local notifications module and provider wiring.
10. Confirmed a partial SendGrid-to-Resend migration is already in the worktree.
11. Searched the repo for `SENDGRID|sendgrid|MAIL_|SMTP_|RESEND|emailQueue`.
12. Ran API build/typecheck and found broader Prisma/type-generation failures.

## Exact Stuck Point

We are currently stuck at the boundary between runtime recovery and source-of-truth code validation.

### Live runtime side

The public stack is reachable, but live production config is still wrong inside the API container.

### Repository side

The local codebase is mid-change and not yet cleanly validated:

- working tree is dirty
- Resend migration is not finalized
- API build does not pass
- API typecheck does not pass

Because of that, we do not yet have a single trustworthy “known-good” source state to re-deploy from.

## Why This Took So Long

The biggest slowdown was not one bug. It was layered incident churn:

- earlier DNS and ingress failures
- certificate issuance failures during the broken-routing phase
- misleading Docker health status
- long manual shell commands on the VPS
- failed or unreliable `paste.rs` usage
- malformed pasted `sed` and `find` commands
- attached instructions becoming stale while the working tree kept changing
- repo validation revealing new failures after the runtime path was partly recovered

## Evidence Snapshot

### Public services

Recovered:

- `https://tradesperson.net`
- `https://www.tradesperson.net`
- `https://api.tradesperson.net/api/v1/health`

### Docker services

Observed:

- `tradesperson-web` up
- `tradesperson-worker` up
- `tradesperson-postgres` healthy
- `tradesperson-redis` healthy
- `tradesperson-api` up but marked unhealthy due to bad healthcheck command

### Local repo status

Dirty files relevant to incident:

- `.env.example`
- `apps/api/package.json`
- `apps/api/src/modules/notifications/notifications.module.ts`
- `apps/api/src/modules/notifications/notifications.service.ts`
- `deploy/split-runtime/api.env.example`
- `deploy/split-runtime/worker.env.example`
- `package.json`
- `packages/config/src/index.ts`
- `pnpm-lock.yaml`
- `apps/api/src/modules/notifications/providers/resend.provider.ts` (untracked)
- `docs/deployment-incident-report-2026-08-09.md` (untracked)
- `test.prisma` (untracked, likely unrelated or temporary)

## Root Cause

This incident has two root causes, not one:

1. Production deployment configuration drift:
   the live VPS containers were started with localhost-oriented env values instead of real production domain values.

2. Local repository validation drift:
   the codebase has in-progress notification/provider changes plus broader Prisma/type-generation breakage, so the intended fix path is not yet in a clean, deployable state.

## Immediate Recommended Next Work

### For runtime recovery

1. Identify the real Compose/env source on the VPS.
2. Correct only the effective production env source.
3. Recreate only:
   - `tradesperson-api`
   - `tradesperson-worker`
   - `tradesperson-web` if `NEXT_PUBLIC_API_URL` is baked incorrectly
4. Re-check live env inside `tradesperson-api`.
5. Re-check CORS and cookie-domain behavior.
6. Patch the Docker healthcheck separately so container health becomes truthful.

### For source-code recovery

1. Finalize the Resend migration cleanly.
2. Remove any stale SendGrid references still remaining.
3. Resolve Prisma client/type-generation mismatch.
4. Re-run:
   - `pnpm install`
   - `pnpm --filter @tradesperson/api build`
   - `pnpm --filter @tradesperson/api typecheck`
5. Commit only after the API state is genuinely valid.

## Remaining Blocker

Primary blocker right now:

- production API env values are still wrong at runtime

Secondary blocker:

- local API build/typecheck do not pass because of broader Prisma/type issues, so the repo is not yet a clean deployment source-of-truth

## Production Verdict

Status: `BLOCKED`

Reason:

- public stack is partially recovered
- runtime configuration is still incorrect
- code validation is still failing

The incident is much closer to recovery than before, but it is not finished.

## Recovery Execution - 2026-08-09

### 1. Root cause confirmed

The production outage is no longer primarily DNS, TLS, nginx, PostgreSQL, or Redis.

The confirmed active blockers are:

1. the live `tradesperson-api` container is still running with localhost-style production env values
2. the API container is reported as `unhealthy` because its Docker healthcheck uses `wget`, but `wget` is not present in the runtime image
3. the local repository is still mid-change and has not yet been validated as a clean deployable production source

### 2. Actual VPS env source

Partially confirmed:

- live Compose working directory: `/opt/tradesperson`
- live container inspected: `tradesperson-api`
- live env values were read from the running container successfully

Not yet fully confirmed:

- the exact authoritative env file or compose override that injected the bad public URL values was not cleanly isolated during the recovery session because repeated long-shell and paste-link attempts failed before the env-source tracing pass was completed end-to-end

### 3. Production env values corrected

Status: `FAIL`

The target values were identified clearly:

- `WEB_URL=https://tradesperson.net`
- `API_URL=https://api.tradesperson.net`
- `INTERNAL_API_URL=http://127.0.0.1:4000`
- `COOKIE_DOMAIN=.tradesperson.net`

But the live API container continued to expose:

- `WEB_URL=http://localhost:3000`
- `API_URL=http://localhost:4000`
- `INTERNAL_API_URL=http://localhost:4000`
- `COOKIE_DOMAIN=localhost`

Therefore the production env correction was not completed in the running deployment.

### 4. API recreation result

Status: `PARTIAL`

The runtime stack stayed up and publicly reachable, but we do not have evidence that `tradesperson-api` was recreated from a corrected env source with corrected public URL values.

### 5. Healthcheck root cause and source fix

Confirmed:

- `docker inspect tradesperson-api --format '{{json .State.Health}}'` showed repeated healthcheck failure
- `docker inspect tradesperson-api --format '{{json .Config.Healthcheck}}'` showed a `wget`-based command against `http://127.0.0.1:4000/api/v1/health`
- the API itself still answered health successfully over HTTP/HTTPS

Root cause:

- false negative container health caused by a missing runtime dependency in the healthcheck path, not by a confirmed application process crash

Source fix status:

- not yet completed in validated source control during this incident window

### 6. Resend migration state

The earlier "SendGrid is still the root cause" brief is stale relative to the current local worktree.

Observed in the repository:

- `apps/api/src/modules/notifications/providers/resend.provider.ts` exists
- notification module and service files are already being migrated toward Resend
- `sendgrid.provider.ts` is deleted in the current working tree
- `RESEND_API_KEY` is present as an optional env in config

Current status:

- migration is in progress locally
- migration is not yet fully validated by a clean API build/typecheck/test pass
- it should not be treated as the only active production blocker

### 7. Prisma/type-generation root cause

The local repository is not currently a trustworthy deployment source.

Confirmed local issues:

- working tree is dirty
- notification/provider migration is incomplete
- Prisma/type-generation and API validation were not green at the point of incident review

This means:

- production env correction can still be performed safely as an operational fix
- but fresh source redeployment should not happen until local validation gates pass

### 8. Files changed

During this reporting pass:

- `docs/deployment-incident-report-2026-08-09.md`

Relevant local files already mid-change before this report:

- `.env.example`
- `apps/api/package.json`
- `apps/api/src/modules/notifications/notifications.module.ts`
- `apps/api/src/modules/notifications/notifications.service.ts`
- `deploy/split-runtime/api.env.example`
- `deploy/split-runtime/worker.env.example`
- `package.json`
- `packages/config/src/index.ts`
- `pnpm-lock.yaml`
- `apps/api/src/modules/notifications/providers/resend.provider.ts`

### 9. Commands/tests executed

Confirmed during the incident and follow-up review:

- `git status --short`
- repo-wide searches for env, healthcheck, and provider wiring
- inspection of:
  - `package.json`
  - `pnpm-workspace.yaml`
  - `apps/api/package.json`
  - `packages/config/src/index.ts`
  - `docker-compose.yml`
  - `.env.example`
  - `deploy/split-runtime/api.env.example`
  - `deploy/split-runtime/worker.env.example`
- VPS evidence review for:
  - `docker inspect tradesperson-api`
  - `docker inspect tradesperson-api --format '{{json .State.Health}}'`
  - `docker inspect tradesperson-api --format '{{json .Config.Healthcheck}}'`
  - `docker exec tradesperson-api printenv`
  - `curl -i https://api.tradesperson.net/api/v1/health`
  - `docker ps`

### 10. Exact PASS/FAIL results

`PASS`

- `https://tradesperson.net` publicly responds
- `https://www.tradesperson.net` publicly responds
- `https://api.tradesperson.net/api/v1/health` publicly responds
- nginx routing is functioning
- TLS is functioning
- Redis is healthy
- PostgreSQL is healthy
- API process is reachable despite false unhealthy state

`FAIL`

- production API env values still reflect localhost
- Docker health status is false-negative
- local repository is not yet validated for redeployment
- exact live env source file/config was not isolated conclusively in the failed manual shell phase

### 11. Production commit SHA

Status: `NOT CONFIRMED DURING THIS INCIDENT PASS`

The incident review did not establish one final validated production commit SHA suitable for redeployment.

### 12. Deployment result

Status: `PARTIAL RECOVERY`

The public stack was restored to a reachable state, but production configuration drift remains and source redeployment is still gated.

### 13. Final container status

Observed:

- `tradesperson-web` up
- `tradesperson-worker` up
- `tradesperson-postgres` healthy
- `tradesperson-redis` healthy
- `tradesperson-api` up but marked unhealthy because of the broken `wget`-based healthcheck

### 14. Final public health status

Observed:

- `https://api.tradesperson.net/api/v1/health` returned healthy JSON

### 15. Login/session result

Status: `NOT VERIFIED`

Reason:

- API health was reachable, but the live container still advertised localhost-style CORS/cookie-related values, so a trustworthy production auth/session verification was not completed

### 16. Notification test result

Status: `NOT VERIFIED`

Reason:

- notification provider migration is still mid-change locally
- no safe validated production notification test was completed

### 17. Remaining manual actions

1. On the VPS, identify the exact env source used by `tradesperson-api` under `/opt/tradesperson`.
2. Correct only:
   - `WEB_URL`
   - `API_URL`
   - `INTERNAL_API_URL`
   - `COOKIE_DOMAIN`
3. Recreate only `tradesperson-api`.
4. Re-check live container env with `docker inspect` or `docker exec ... printenv`.
5. Re-test public API health and auth/CORS behavior.
6. Separately fix the Docker healthcheck in source control so it no longer depends on missing `wget`.
7. Finish and validate the Resend/Prisma/API build path locally before any fresh code deployment.

### 18. Rollback instructions

If a production env correction breaks runtime behavior:

1. restore the backed-up live env source file/config with its timestamped backup
2. recreate only `tradesperson-api`
3. confirm public API health returns
4. leave nginx, TLS, PostgreSQL, Redis, and WhatsQuery untouched

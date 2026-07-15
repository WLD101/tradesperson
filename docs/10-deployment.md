# Deployment Strategy

## Local Development

Services:

- web
- api
- worker
- postgres
- redis
- object storage

## Production Topology

- `web` deployed behind Cloudflare
- `api` as stateless service
- `worker` as separate process sharing codebase
- managed PostgreSQL
- managed Redis
- S3-compatible object storage
- Sentry + OpenTelemetry + uptime monitoring

## CI/CD

- install dependencies
- lint
- typecheck
- test
- build
- migration validation
- deploy with environment promotion

## Backup And Recovery

- automated off-server PostgreSQL backups
- object storage versioning where practical
- restore runbook with scheduled verification
- documented migration rollback plan

## Required Artifacts

- Dockerfile per app where needed
- Docker Compose for local stack
- `.env.example`
- health checks
- seed command
- migration command

# Local Development

## Required Versions

- Node.js `22.14.0`
- `pnpm` `10.14.0`
- Docker Desktop with Linux containers

## Environment

Use the values from `.env.example`. Required variables are validated at startup through `@tradesperson/config`.

## Service Startup

Start infrastructure:

```bash
docker compose up -d postgres redis mailpit
```

Optional future service:

```bash
docker compose up -d minio
```

## Database Commands

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

## App Commands

```bash
pnpm --filter @tradesperson/api dev
pnpm --filter @tradesperson/web dev
pnpm --filter @tradesperson/worker dev
```

Or run all:

```bash
pnpm dev
```

## Troubleshooting

- If `pnpm` is missing, install it globally with `npm install -g pnpm@10.14.0`.
- If Prisma types are missing after install, run `pnpm db:generate`.
- If Docker reports it cannot connect to the engine, start Docker Desktop and retry `docker compose up`.

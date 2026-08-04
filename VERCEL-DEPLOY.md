# Vercel Frontend Deployment

Deploy the frontend as a dedicated Vercel project pointed at this repository.

## Recommended project settings

- Repository: `WLD101/tradesperson`
- Branch: `codex/erp-foundation`
- Framework preset: `Next.js`
- Root Directory: `apps/web`
- Node.js version: `22.x`
- Install Command: `pnpm install --frozen-lockfile`
- Build Command: `pnpm --dir ../.. vercel:web:build`
- Output Directory: leave empty

## Required environment variables

Set these in the Vercel project before the first production deploy:

- `NEXT_PUBLIC_API_URL=https://api.tradesperson.net`

If the web app needs any additional public environment variables later, add them in Vercel rather than committing secrets.

## Notes

- The root workspace keeps the Vercel-specific script `vercel:web:build`.
- The web app depends on shared workspace packages, so the Vercel project must target `apps/web` inside the monorepo and run the build from the repository root via `pnpm --dir ../..`.

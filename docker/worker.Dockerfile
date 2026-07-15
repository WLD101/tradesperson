FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/worker/package.json apps/worker/package.json
COPY packages ./packages
RUN corepack enable && pnpm install --frozen-lockfile=false

FROM deps AS builder
COPY . .
RUN corepack enable && pnpm --filter @tradesperson/worker build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S worker && adduser -S worker -G worker
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder /app/node_modules ./node_modules
USER worker
EXPOSE 4100
CMD ["node", "apps/worker/dist/index.js"]

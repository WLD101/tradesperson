FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/api/package.json apps/api/package.json
COPY packages ./packages
RUN corepack enable && pnpm install --frozen-lockfile=false

FROM deps AS builder
COPY . .
RUN corepack enable && pnpm --filter @tradesperson/db prisma:generate && pnpm --filter @tradesperson/types build && pnpm --filter @tradesperson/auth build && pnpm --filter @tradesperson/config build && pnpm --filter @tradesperson/db build && pnpm --filter @tradesperson/api build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S nestjs && adduser -S nestjs -G nestjs
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/node_modules ./node_modules
USER nestjs
EXPOSE 4000
CMD ["node", "apps/api/dist/apps/api/src/main.js"]

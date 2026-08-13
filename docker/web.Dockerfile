FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS builder
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/ apps/
COPY packages/ packages/

# Fix ERR_PNPM_BUILD_NOT_ALLOWED by ignoring scripts during install
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY . .

# Temporarily inject DATABASE_URL so prisma generate succeeds
RUN sed -i 's/provider  = "postgresql"/provider  = "postgresql"\n  url = env("DATABASE_URL")/' packages/db/prisma/schema.prisma

# We must provide NEXT_PUBLIC_API_URL and NEXT_PUBLIC_SITE_URL during build
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

# Build order
# Install prisma globally to ensure we have the CLI
RUN npm install -g prisma@6.11.1
RUN cd packages/db && prisma generate
RUN pnpm --filter @tradesperson/types build
RUN pnpm --filter @tradesperson/ui build
RUN pnpm --filter @tradesperson/web build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3001
CMD ["node", "apps/web/server.js"]

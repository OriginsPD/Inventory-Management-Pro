FROM oven/bun:1.3-alpine AS base
WORKDIR /app

COPY package.json bun.lock bunfig.toml ./
COPY packages/auth/package.json ./packages/auth/
COPY packages/config/package.json ./packages/config/
COPY packages/db/package.json ./packages/db/
COPY packages/env/package.json ./packages/env/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ui/package.json ./packages/ui/
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/

RUN bun install

COPY packages ./packages
COPY apps/server ./apps/server

WORKDIR /app/apps/server

FROM base AS dev
EXPOSE 3002
WORKDIR /app
CMD ["sh", "-c", "bun install && bun run --filter server dev"]

FROM base AS production
ENV NODE_ENV=production
EXPOSE 3002
CMD ["bun", "run", "src/index.ts"]

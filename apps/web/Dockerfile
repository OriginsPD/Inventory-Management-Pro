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
COPY apps/web ./apps/web

WORKDIR /app/apps/web

FROM base AS dev
EXPOSE 3001
WORKDIR /app
CMD ["sh", "-c", "bun install && bun run --filter web dev"]

FROM base AS build
WORKDIR /app/apps/web
RUN bun run build

FROM oven/bun:1.3-alpine AS production
WORKDIR /app
COPY --from=build /app/apps/web/.output ./.output
EXPOSE 3001
CMD ["bun", "run", ".output/server/index.mjs"]

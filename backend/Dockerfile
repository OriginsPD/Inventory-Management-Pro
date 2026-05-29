# Base image
FROM oven/bun:1.2-alpine AS base
WORKDIR /app

# Copy root workspace configurations
COPY package.json bun.lock ./
COPY packages/shared/package.json ./packages/shared/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install dependencies (workspaces will be linked)
RUN bun install --frozen-lockfile

# Copy shared package code
COPY packages/shared ./packages/shared/

# Copy backend code
COPY backend ./backend/

# Set working directory to backend
WORKDIR /app/backend

# Development stage
FROM base AS dev
EXPOSE 3002
CMD ["bun", "run", "dev"]

# Production stage
FROM base AS production
ENV NODE_ENV=production
EXPOSE 3002
CMD ["bun", "run", "src/index.ts"]

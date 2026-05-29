# Base image
FROM oven/bun:1.2-alpine AS base
WORKDIR /app

# Copy root workspace configurations
COPY package.json bun.lock ./
COPY packages/shared/package.json ./packages/shared/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy shared package and frontend code
COPY packages/shared ./packages/shared/
COPY frontend ./frontend/

# Set working directory to frontend
WORKDIR /app/frontend

# Development stage
FROM base AS dev
EXPOSE 5173
CMD ["bun", "run", "dev", "--host", "0.0.0.0"]

# Production build stage
FROM base AS build
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN bun run build

# Production server stage (Nginx)
FROM nginx:1.25-alpine AS production
COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

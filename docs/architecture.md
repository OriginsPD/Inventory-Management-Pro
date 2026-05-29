# IMS Pro Architecture

This document describes the application architecture in the repository's current state. It is intentionally descriptive rather than aspirational: when code and older documentation disagree, this document follows the code.

## System Context

IMS Pro is a Bun workspace application for inventory, device lifecycle, customer dispatch, quality control, hardware swaps, and audit history. The system is split into three workspace packages:

- `frontend`: React and Vite single page application.
- `backend`: Bun and Elysia HTTP API.
- `packages/shared`: shared domain enums, Zod schemas, validation helpers, and business logic used by the app packages.

The runtime deployment shape is a browser-based frontend calling a JSON API. The API persists to PostgreSQL through Drizzle ORM when `DATABASE_URL` is configured. In non-production development without a database, selected flows can fall back to in-memory mock data when explicitly enabled.

## High-Level Runtime Flow

```text
Browser
  |
  | React routes, auth context, apiClient with credentials: include
  v
Frontend Vite SPA (:5173)
  |
  | JSON HTTP requests to VITE_API_URL
  v
Backend Elysia API (:3002)
  |
  | auth middleware, route modules, Drizzle queries
  v
PostgreSQL / Neon
```

In Docker Compose, the same frontend/backend split is used, with a local PostgreSQL service on the internal `ims-net` network. In local non-Docker development, the backend can also connect to Neon or a local Postgres instance depending on `DATABASE_URL`.

## Repository Layout

```text
backend/
  drizzle/                 Drizzle SQL migration files and metadata
  src/
    db/                    Drizzle client and schema
    lib/                   DB init, middleware, mock data, utility logic
    routes/                Elysia route modules by domain
    auth-service.ts        Better Auth configuration and dev mock auth state
    index.ts               API bootstrap and route composition
    update-db.ts           Idempotent schema repair/update helper

frontend/
  src/
    components/
      layout/              App shell and navigation
      routing/             Role-aware route guard components
      screens/             Route-level screens
      ui/                  Shared UI and auth context
    lib/                   API client, audio, small utilities

packages/shared/
  src/domain/              Shared enums, Zod contracts, and domain logic
```

## Backend Architecture

The backend entry point is `backend/src/index.ts`. Startup follows this sequence:

1. `initDbConnection()` initializes the database boundary.
2. The Elysia app is created.
3. Swagger is enabled outside production, or when `ENABLE_SWAGGER=true`.
4. CORS is configured from `TRUSTED_ORIGINS` or `CORS_ORIGIN`, with a development default of `http://localhost:5173`.
5. `authMiddleware` is applied before domain routes.
6. Route modules are registered.
7. The server listens on `PORT`, defaulting to `3002`.

Route modules are organized by domain:

- `auth-routes.ts`: sign-in, get-session, sign-out.
- `user-routes.ts`: profile, password, personal audit history, admin user management.
- `model-routes.ts`: device model/template management.
- `device-routes.ts`: inventory, ingest, delete, status changes, dispatch-related device operations, audit logs, telemetry checks.
- `link-routes.ts`: parent/child hardware relationship operations.
- `customer-routes.ts`: customer CRUD and customer return history.
- `analytics-routes.ts`: dashboard and analytics data.
- `system-routes.ts`: system-level audit log access.

The backend uses route-local validation through Elysia `t.*` schemas and shared Zod/domain helpers where present. Data persistence is implemented directly inside route modules using Drizzle queries and transactions. Shared utility functions in `backend/src/lib/utils.ts` handle audit writing, asset type inference, relationship traversal, cascade status updates, and request adaptation for Better Auth.

## Database Boundary

The Drizzle client lives in `backend/src/db/index.ts`. The connection string is resolved from `DATABASE_URL`, with a local Postgres fallback string for development.

`backend/src/lib/db-init.ts` owns startup database behavior:

- Runs Drizzle migrations when `DATABASE_URL` is configured.
- Handles duplicate-object migration errors caused by missing migration history but existing schema objects.
- Validates that required schema objects exist before allowing a configured database-backed server to continue.
- Seeds a bootstrap admin only when both `IMS_BOOTSTRAP_ADMIN_EMAIL` and `IMS_BOOTSTRAP_ADMIN_PASSWORD` are configured and that email does not already exist.
- Crashes the server when a configured database fails, preventing silent fallback and data loss.
- Falls back to in-memory data only when no database is configured and the environment allows it.

The current persistent model includes:

- Inventory tables: `device_models`, `devices`, `device_relationships`, `device_audit_logs`, `qc_reports`.
- Customer table: `customers`.
- Better Auth tables: `users`, `sessions`, `accounts`, `verifications`.
- Enums: `asset_type`, `device_status`, `customer_type`.

Auth table IDs are `text` with `gen_random_uuid()::text` defaults. Inventory/customer IDs use UUID columns. Audit rows can reference a user by text ID and devices/customers by UUID.

`backend/src/update-db.ts` is an idempotent operational repair script. It currently ensures additive schema changes and auth table ID defaults exist in live databases. It is not a substitute for a disciplined migration process, but it is part of the current operational architecture.

## Authentication And Authorization

Authentication is handled by Better Auth in `backend/src/auth-service.ts` with the Drizzle adapter and the auth tables from `schema.ts`.

The backend exposes app-specific auth endpoints under `/api/auth`:

- `POST /api/auth/sign-in/email`
- `GET /api/auth/get-session`
- `POST /api/auth/sign-out`

These endpoints forward or adapt requests to Better Auth and normalize the response envelope for the frontend. Session cookies are HTTP-only and sent cross-origin using `credentials: include`.

Authorization is enforced in two layers:

- Backend: `authMiddleware` blocks unauthenticated `/api/*` routes except `/api/auth/*`. Mutating requests require appropriate roles:
  - `SUPER_USER` for device model management and user administration.
  - `SUPER_USER` or `TECHNICIAN` for most other mutating operational routes.
  - `REVIEWER` is primarily read-only.
- Frontend: `ProtectedRoute` requires a session for application routes, and `AuthorizedRoute` restricts the `/users` screen to `SUPER_USER`.

The backend also has a development-only in-memory auth mode controlled by `IMS_ENABLE_DEV_AUTH=true`. It is disabled in production and only applies when the database path is not active.

## Frontend Architecture

The frontend is a React SPA bootstrapped with Vite. Routing is implemented with `react-router-dom` in `frontend/src/App.tsx`.

Primary routes and screens:

- `/`: landing screen.
- `/login`: login screen.
- `/dashboard`: dashboard.
- `/inventory`: device inventory.
- `/dispatch`: customer dispatch.
- `/qc`: quality control bench.
- `/models`: device model/template management.
- `/swaps`: hardware swaps.
- `/customers`: customer management.
- `/reports`: reports.
- `/settings`: settings.
- `/users`: user management, restricted to `SUPER_USER`.
- `/profile`: operator profile and personal audit history.
- `/403`, `/500`, `/offline`, `*`: error screens.

Screens are lazy-loaded through `React.lazy` and wrapped in `Suspense`. Auth state is provided by `frontend/src/components/ui/auth-context.tsx`. It initializes by calling `/api/auth/get-session`, stores user/session state in React state, and clears state when the API client emits `auth-session-expired`.

API access is centralized in `frontend/src/lib/api-client.ts`:

- Base URL comes from `VITE_API_URL`, defaulting to `http://localhost:3002`.
- Requests include cookies with `credentials: include`.
- Non-GET requests clear the small in-memory GET cache.
- HTTP errors are normalized into `ApiError`.
- A `401` response dispatches `auth-session-expired` unless suppressed by the caller.

## Shared Package

`packages/shared` is the contract and domain utility package. It exports:

- Domain enums.
- Device, device model, QC, customer, and auth schemas.
- Domain logic helpers and tests.

The backend imports shared domain values for schema alignment and validation logic. The frontend uses the package for typed domain behavior where integrated.

## Data And Domain Model

The core inventory model is relationship-based:

- `device_models` describe hardware templates, asset type, allowed children, max stock, and optional identifier pattern.
- `devices` represent physical assets with identifier, model, status, optional customer assignment, and JSON metadata.
- `device_relationships` form parent/child links between devices, such as trackers with SIMs or accessories.
- `device_audit_logs` record operational history and can associate actions with a user, device, identifier, and customer.
- `qc_reports` record quality-control outcomes.
- `customers` represent deployment targets and ownership context.

Relationship traversal and cascade updates are implemented in `backend/src/lib/utils.ts` for both database and in-memory execution paths. Database traversal uses recursive SQL for ancestor/descendant checks.

## Deployment And Runtime Configuration

The current Docker Compose setup defines:

- `db`: PostgreSQL 15 Alpine, exposed on host port `5433`.
- `backend`: Bun/Elysia dev target, exposed on `3002`.
- `frontend`: Vite dev target, exposed on `5173`.

Important configuration variables:

- `DATABASE_URL`: enables database-backed operation.
- `BETTER_AUTH_SECRET`: required in production.
- `BETTER_AUTH_URL`: backend auth base URL, normally `http://localhost:3002` in local development.
- `TRUSTED_ORIGINS` / `CORS_ORIGIN`: frontend origins allowed by CORS and Better Auth.
- `IMS_BOOTSTRAP_ADMIN_EMAIL` and `IMS_BOOTSTRAP_ADMIN_PASSWORD`: first-run admin bootstrap only.
- `IMS_ENABLE_DEV_AUTH`, `IMS_DEV_ADMIN_EMAIL`, `IMS_DEV_ADMIN_PASSWORD`: development-only mock auth path.
- `VITE_API_URL`: frontend API base URL.

Secrets must remain in local environment files or deployment secret stores. They should not be committed or copied into documentation.

## Security Boundaries

Current security-relevant boundaries:

- API authentication uses HTTP-only Better Auth session cookies.
- CORS is restricted to configured trusted origins.
- Backend middleware enforces route authentication and role checks.
- Bootstrap admin seeding is opt-in and does not overwrite existing users.
- Startup avoids silently falling back to in-memory storage when a database is configured but broken.
- The frontend treats API `401` responses as session expiration and clears local auth state.

Known architectural risks to keep visible:

- Some route modules perform validation locally rather than through a single contract layer.
- `backend/src/update-db.ts` is an operational repair script and should be replaced or supplemented by forward-only migrations for production-grade schema evolution.
- Older README claims about TanStack Router, PWA/offline mode, and sample credentials do not fully match the current implementation.

## Testing And Verification

Current verification commands used for architecture-sensitive changes:

```powershell
backend\node_modules\.bin\tsc.exe --noEmit -p backend\tsconfig.json
frontend\node_modules\.bin\tsc.exe --noEmit -p frontend\tsconfig.json
```

Domain logic tests exist under `packages/shared/src/domain/logic.test.ts`. The repository does not currently expose a comprehensive root test script for all packages.

## Change Guidance

Use these constraints when changing the architecture:

- Preserve the workspace split unless a structural change is explicitly approved.
- Keep shared domain contracts in `packages/shared` when data shapes cross frontend/backend boundaries.
- Treat database, auth, authorization, and deployment changes as approval-gated work.
- Prefer forward-only Drizzle migrations for new schema changes.
- Keep startup failure behavior strict when `DATABASE_URL` is configured.
- Do not add frontend routes that rely only on client-side authorization; enforce matching backend role checks.

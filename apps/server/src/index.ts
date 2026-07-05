import { swagger } from "@elysiajs/swagger";
import { cors } from "@elysiajs/cors";
import { getAuth } from "@ims_pro/auth";
import { env, getTrustedOrigins } from "@ims_pro/env/server";
import { Elysia } from "elysia";
import { initLogger } from "evlog";
import { createAuthMiddleware, type BetterAuthInstance } from "evlog/better-auth";
import { evlog } from "evlog/elysia";
import { initDbConnection, useDb } from "./lib/db-init";
import { authMiddleware } from "./lib/middleware";
import { analyticsRoutes } from "./routes/analytics-routes";
import { authRoutes } from "./routes/auth-routes";
import { configRoutes } from "./routes/config-routes";
import { customerRoutes } from "./routes/customer-routes";
import { dashboardRoutes, qcRoutes } from "./routes/dashboard-routes";
import { deviceRoutes } from "./routes/device-routes";
import { linkRoutes } from "./routes/link-routes";
import { modelRoutes } from "./routes/model-routes";
import { systemRoutes } from "./routes/system-routes";
import { userRoutes } from "./routes/user-routes";

initLogger({
  env: { service: "ims_pro-server" },
});

await initDbConnection();

const auth = getAuth();
const trustedOrigins = getTrustedOrigins();

const identifyUser = auth
  ? createAuthMiddleware(auth as BetterAuthInstance, {
      exclude: ["/api/auth/**"],
      maskEmail: true,
    })
  : null;

const baseApp = new Elysia();

const app = (
  env.NODE_ENV !== "production" || process.env.ENABLE_SWAGGER === "true"
    ? baseApp.use(swagger())
    : baseApp
)
  .use(evlog())
  .derive(async ({ request, log }) => {
    if (identifyUser) {
      await identifyUser(log, request.headers, new URL(request.url).pathname);
    }
    return {};
  })
  .use(
    cors({
      credentials: true,
      origin: (request) => {
        const origin = request.headers.get("origin");
        if (!origin) return true;
        return trustedOrigins.includes(origin);
      },
    }),
  )
  .all("/api/auth/*", async (context) => {
    const { request, status } = context;

    if (!["POST", "GET"].includes(request.method)) {
      return status(405);
    }

    if (auth) {
      return auth.handler(request);
    }

    return status(503);
  })
  .get("/", () => ({
    status: "online",
    engine: useDb ? "Neon PostgreSQL" : "Local In-Memory Engine",
    version: "3.0.0 (Modular)",
  }))
  .use(authMiddleware)
  .use(authRoutes)
  .use(userRoutes)
  .use(modelRoutes)
  .use(deviceRoutes)
  .use(linkRoutes)
  .use(customerRoutes)
  .use(analyticsRoutes)
  .use(dashboardRoutes)
  .use(qcRoutes)
  .use(configRoutes)
  .use(systemRoutes)
  .listen({
    port: env.PORT,
    hostname: process.env.HOSTNAME || "0.0.0.0",
  });

console.log(`🦊 Elysia API is running at ${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;

import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { cors } from "@elysiajs/cors";
import { initDbConnection, useDb } from "./lib/db-init.js";
import { authMiddleware } from "./lib/middleware.js";
import { authRoutes } from "./routes/auth-routes.js";
import { userRoutes } from "./routes/user-routes.js";
import { modelRoutes } from "./routes/model-routes.js";
import { deviceRoutes } from "./routes/device-routes.js";
import { linkRoutes } from "./routes/link-routes.js";
import { customerRoutes } from "./routes/customer-routes.js";
import { analyticsRoutes } from "./routes/analytics-routes.js";
import { systemRoutes } from "./routes/system-routes.js";

// Initialize DB Connection and Seeding
await initDbConnection();

const configuredOrigins = (process.env.TRUSTED_ORIGINS || process.env.CORS_ORIGIN || "")
  .split(",")
  .map(origin => origin.trim())
  .filter(Boolean);
const trustedOrigins = configuredOrigins.length > 0
  ? configuredOrigins
  : process.env.NODE_ENV === "production"
    ? []
    : ["http://localhost:5173"];

const baseApp = new Elysia()
  .onRequest(({ request }) => {
    console.log(`[${new Date().toISOString()}] ${request.method} ${new URL(request.url).pathname}`);
  });

const app = (process.env.NODE_ENV !== "production" || process.env.ENABLE_SWAGGER === "true"
  ? baseApp.use(swagger())
  : baseApp)
  .use(cors({
    credentials: true,
    origin: (request) => {
      const origin = request.headers.get("origin");
      if (!origin) return true;
      return trustedOrigins.includes(origin);
    }
  }))
  
  // Base Status Route
  .get("/", () => ({
    status: "online",
    engine: useDb ? "Neon PostgreSQL" : "Local In-Memory Engine",
    version: "3.0.0 (Modular)"
  }))

  // Apply Auth Middleware (Derives user/session and handles RBAC)
  .use(authMiddleware)

  // Register Modular Routes
  .use(authRoutes)
  .use(userRoutes)
  .use(modelRoutes)
  .use(deviceRoutes)
  .use(linkRoutes)
  .use(customerRoutes)
  .use(analyticsRoutes)
  .use(systemRoutes)

  .listen({
    port: process.env.PORT ? parseInt(process.env.PORT) : 3002,
    hostname: process.env.HOSTNAME || "0.0.0.0"
  });

console.log(`🦊 Elysia API is running at ${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;

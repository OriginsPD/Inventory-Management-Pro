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
initDbConnection();

const app = new Elysia()
  .use(swagger())
  .use(cors({
    credentials: true,
    origin: (request) => {
      const origin = request.headers.get("origin");
      if (!origin) return true;
      try {
        const url = new URL(origin);
        if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
          return true;
        }
      } catch (_) {
        // ignore
      }
      const allowedOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";
      return origin === allowedOrigin;
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

  .listen(3002);

console.log(`🦊 Elysia API is running at ${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;

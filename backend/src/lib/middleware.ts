import { Elysia } from "elysia";
import { eq } from "drizzle-orm";
import { getBetterAuth, mockUsers, mockSessions } from "../auth-service.js";
import { useDb } from "./db-init.js";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";

const canUseMockAuth = () => !useDb && process.env.NODE_ENV !== "production" && process.env.IMS_ENABLE_DEV_AUTH === "true";

export const authMiddleware = new Elysia({ name: 'auth-middleware' })
  .derive({ as: 'global' }, async ({ request }: { request: Request }) => {
    console.log("[AUTH-MW] DERIVE Hook Triggered for:", request.method, request.url);
    let user: any = null;
    let session: any = null;

    const cookies = request.headers.get("cookie") || "";
    let token = "";
    const match = cookies.match(/(?:^|; )better-auth\.session[-_]token=([^;]*)/);
    if (match && match[1]) {
      token = decodeURIComponent(match[1]);
    }
    if (!token) {
      const authHeader = request.headers.get("authorization") || "";
      if (authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }

    if (useDb) {
      if (token) {
        try {
          console.log("[AUTH-MW] Running DB check. Token:", token.substring(0, 10) + "...");
          // Primary path: try Better Auth's getSession
          const auth = getBetterAuth(useDb);
          if (auth) {
            const authSession = await auth.api.getSession({ headers: request.headers });
            console.log("[AUTH-MW] Better Auth session result:", authSession ? "FOUND" : "NOT FOUND");
            if (authSession) {
              user = authSession.user;
              session = authSession.session;
              console.log("[AUTH-MW] Better Auth user role:", user?.role);
            }
          }

          // If Better Auth didn't resolve a user (e.g. expired session, race condition),
          // OR if the user object is missing the 'role' field, fall back to a direct 
          // database lookup using the session token.
          if (!user || !user.role) {
            const dbToken = token.split(".")[0];
            console.log("[AUTH-MW] Falling back to DB lookup with token:", dbToken.substring(0, 10) + "...");
            const [dbResult] = await db
              .select({
                sessionId: schema.sessions.id,
                sessionToken: schema.sessions.token,
                expiresAt: schema.sessions.expiresAt,
                userId: schema.users.id,
                userName: schema.users.name,
                userEmail: schema.users.email,
                userRole: schema.users.role,
                userImage: schema.users.image,
              })
              .from(schema.sessions)
              .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
              .where(eq(schema.sessions.token, dbToken))
              .limit(1);

            if (dbResult && dbResult.expiresAt && new Date(dbResult.expiresAt) > new Date()) {
              console.log("[AUTH-MW] DB lookup resolved user role:", dbResult.userRole);
              // Valid, non-expired session found in DB
              user = {
                id: dbResult.userId,
                name: dbResult.userName,
                email: dbResult.userEmail,
                role: dbResult.userRole,
                image: dbResult.userImage,
              };
              session = {
                id: dbResult.sessionId,
                token: dbResult.sessionToken,
                expiresAt: dbResult.expiresAt,
              };
            } else if (dbResult && user && !user.role) {
              console.log("[AUTH-MW] DB lookup resolved role for existing user:", dbResult.userRole);
              // Session exists (maybe expired in BA but user object came through),
              // at least resolve the role
              user.role = dbResult.userRole;
            } else {
              console.log("[AUTH-MW] DB lookup resolved nothing or session expired");
            }
          }
        } catch (e) {
          console.warn("[AUTH-MW] Session validation failed:", e instanceof Error ? e.message : String(e));
        }
      } else {
        console.log("[AUTH-MW] Skipping DB check: token is empty");
      }
    } else if (canUseMockAuth()) {
      if (token) {
        const mockSession = mockSessions.get(token);
        if (mockSession && mockSession.expiresAt > Date.now()) {
          const mockUser = Array.from(mockUsers.values()).find(u => u.id === mockSession.userId);
          if (mockUser) {
            user = {
              id: mockUser.id,
              name: mockUser.name,
              email: mockUser.email,
              role: mockUser.role
            };
            session = {
              id: token,
              userId: mockUser.id,
              expiresAt: mockSession.expiresAt,
              token
            };
          }
        }
      }
    }

    return { user, session } as { user: any; session: any };
  })
  .onBeforeHandle({ as: 'global' }, ({ request, user, set }: { request: Request; user: any; set: any }) => {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (path.startsWith("/api") && !path.startsWith("/api/auth")) {
      if (!user) {
        set.status = 401;
        return { error: "Unauthorized: Session expired or invalid" };
      }

      if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
        if (path.startsWith("/api/device-models")) {
          if (user.role !== "SUPER_USER") {
            set.status = 403;
            return { error: "Forbidden: Super User access required to manage device models" };
          }
        } else if (path.startsWith("/api/users")) {
          // Allow users to update their own profile and password
          if (!path.startsWith("/api/users/me") && user.role !== "SUPER_USER") {
            set.status = 403;
            return { error: "Forbidden: Super User access required to manage users" };
          }
        } else {
          if (user.role !== "SUPER_USER" && user.role !== "TECHNICIAN") {
            set.status = 403;
            return { error: "Forbidden: Authorized Technician or Super User access required" };
          }
        }
      }
    }
  });

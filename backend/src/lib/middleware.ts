import { Elysia } from "elysia";
import { getBetterAuth, mockUsers, mockSessions } from "../auth-service.js";
import { useDb } from "./db-init.js";

export const authMiddleware = new Elysia({ name: 'auth-middleware' })
  .derive(async ({ request }: { request: Request }) => {
    let user: any = null;
    let session: any = null;

    const cookies = request.headers.get("cookie") || "";
    let token = "";
    const match = cookies.match(/(?:^|; )better-auth\.session-token=([^;]*)/);
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
      try {
        const auth = getBetterAuth(useDb);
        if (auth) {
          const authSession = await auth.api.getSession({ headers: request.headers });
          if (authSession) {
            user = authSession.user;
            session = authSession.session;
          }
        }
      } catch (e) {
        // ignore
      }
    } else {
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
  .onBeforeHandle(({ request, user, set }: { request: Request; user: any; set: any }) => {
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

import { Elysia, t } from "elysia";
import { randomUUID } from "crypto";
import { getBetterAuth, mockUsers, mockSessions } from "../lib/mock-auth.js";
import { useDb } from "../lib/db-init.js";
import { toBetterAuthRequest } from "../lib/utils.js";

const canUseMockAuth = () => !useDb && process.env.NODE_ENV !== "production" && process.env.IMS_ENABLE_DEV_AUTH === "true";

function publicSession(session: any) {
  if (!session) return session;
  const { token: _token, ...safeSession } = session;
  return safeSession;
}

function publicAuthEnvelope(data: any) {
  if (!data) return data;
  return {
    ...data,
    session: publicSession(data.session),
  };
}

export const authRoutes = new Elysia({ prefix: '/api/auth' })
  .post("/sign-in/email", async ({ body, set, request }) => {
    const { email, password } = body;
    
    if (useDb) {
      try {
        const auth = getBetterAuth(useDb);
        if (auth) {
          const baseURL = process.env.BETTER_AUTH_URL || "http://localhost:3002";
          const targetUrl = new URL("/api/auth/sign-in/email", baseURL);
          
          // Forward relevant headers to Better Auth
          const headers = new Headers();
          headers.set("Content-Type", "application/json");
          headers.set("host", targetUrl.host);
          
          const origin = request.headers.get("origin");
          if (origin) headers.set("origin", origin);
          
          const referer = request.headers.get("referer");
          if (referer) headers.set("referer", referer);
          
          const cookie = request.headers.get("cookie");
          if (cookie) headers.set("cookie", cookie);
          
          const ua = request.headers.get("user-agent");
          if (ua) headers.set("user-agent", ua);

          const rawResponse = await auth.handler(new Request(targetUrl.toString(), {
            method: "POST",
            headers,
            body: JSON.stringify({ email, password })
          }));
          const setCookie = rawResponse.headers.get("set-cookie");
          if (setCookie) {
            set.headers["set-cookie"] = setCookie;
          }
          const data = (await rawResponse.json()) as {
            message?: string;
            data?: Record<string, unknown>;
            user?: Record<string, unknown>;
            session?: Record<string, unknown>;
            token?: string;
          };
          
          if (rawResponse.status >= 400) {
            set.status = rawResponse.status;
            return { error: data.message || "Invalid credentials" };
          }
          
          // Better Auth sometimes returns { user, session } and sometimes { user, token }
          // We normalize this so the frontend always sees non-secret session metadata.
          const unwrapped = (data.data ?? data) as Record<string, unknown>;
          
          if (unwrapped.user && !unwrapped.session && unwrapped.token) {
            const user = unwrapped.user as Record<string, unknown>;
            unwrapped.session = {
              id: unwrapped.token,
              userId: user.id,
              expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString()
            };
          }

          delete unwrapped.token;
          return publicAuthEnvelope(unwrapped);
        }
      } catch (e: any) {
        set.status = 400;
        return { error: "Invalid credentials" };
      }

      set.status = 500;
      return { error: "Authentication service unavailable" };
    }
    
    // Fallback Mock Sign-In
    if (!canUseMockAuth()) {
      set.status = 503;
      return { error: "Development authentication is disabled" };
    }

    const user = mockUsers.get(email);
    if (!user || user.passwordHash !== password) {
      set.status = 400;
      return { error: "Invalid email or password" };
    }
    
    const token = randomUUID();
    const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7; // 7 days
    mockSessions.set(token, {
      id: token,
      userId: user.id,
      token: token,
      expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    const secureCookie = process.env.NODE_ENV === "production" ? "; Secure" : "";
    set.headers["set-cookie"] = `better-auth.session-token=${token}; Path=/; HttpOnly; SameSite=Lax${secureCookie}; Max-Age=${60 * 60 * 24 * 7}`;
    return {
      session: {
        id: token,
        userId: user.id,
        expiresAt: new Date(expiresAt).toISOString(),
      },
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    };
  }, {
    body: t.Object({
      email: t.String(),
      password: t.String()
    })
  })

  .get("/get-session", async ({ request, set }) => {
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
      const auth = getBetterAuth(useDb);
      if (auth) {
        try {
          const rawResponse = await auth.handler(toBetterAuthRequest(request));
          const setCookie = rawResponse.headers.get("set-cookie");
          if (setCookie) {
            set.headers["set-cookie"] = setCookie;
          }
          if (rawResponse.status >= 400) {
            set.status = 401;
            return { session: null, user: null };
          }
          const data = await rawResponse.json();
          return publicAuthEnvelope(data);
        } catch (e) {
          set.status = 401;
          return { session: null, user: null };
        }
      }

      set.status = 500;
      return { session: null, user: null };
    }

    // Fallback Mock session
    if (!canUseMockAuth()) {
      set.status = 401;
      return { session: null, user: null };
    }

    if (!token) {
      set.status = 401;
      return { session: null, user: null };
    }

    const mockSession = mockSessions.get(token);
    if (!mockSession || mockSession.expiresAt < Date.now()) {
      set.status = 401;
      return { session: null, user: null };
    }

    const mockUser = Array.from(mockUsers.values()).find(u => u.id === mockSession.userId);
    if (!mockUser) {
      set.status = 401;
      return { session: null, user: null };
    }

    return {
      session: {
        id: token,
        userId: mockUser.id,
        expiresAt: new Date(mockSession.expiresAt).toISOString(),
      },
      user: {
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        role: mockUser.role
      }
    };
  })

  .post("/sign-out", async ({ request, set }) => {
    if (useDb) {
      const auth = getBetterAuth(useDb);
      if (auth) {
        try {
          const rawResponse = await auth.handler(toBetterAuthRequest(request));
          const setCookie = rawResponse.headers.get("set-cookie");
          if (setCookie) {
            set.headers["set-cookie"] = setCookie;
          }
        } catch (e) {
          // swallow errors on sign-out
        }
        // Always clear the cookie even if Better Auth call fails
        const secureCookie = process.env.NODE_ENV === "production" ? "; Secure" : "";
        set.headers["set-cookie"] = `better-auth.session-token=; Path=/; HttpOnly; SameSite=Lax${secureCookie}; Max-Age=0`;
        return { success: true };
      }

      set.status = 500;
      return { error: "Authentication service unavailable" };
    }

    if (!canUseMockAuth()) {
      return { success: true };
    }

    const cookies = request.headers.get("cookie") || "";
    let token = "";
    const match = cookies.match(/(?:^|; )better-auth\.session[-_]token=([^;]*)/);
    if (match && match[1]) {
      token = decodeURIComponent(match[1]);
    }

    if (token) {
      mockSessions.delete(token);
    }

    const secureCookie = process.env.NODE_ENV === "production" ? "; Secure" : "";
    set.headers["set-cookie"] = `better-auth.session-token=; Path=/; HttpOnly; SameSite=Lax${secureCookie}; Max-Age=0`;
    return { success: true };
  });

import { Elysia, t } from "elysia";
import { randomUUID } from "crypto";
import { getBetterAuth, mockUsers, mockSessions } from "../auth-service.js";
import { useDb } from "../lib/db-init.js";
import { toBetterAuthRequest } from "../lib/utils.js";

export const authRoutes = new Elysia({ prefix: '/api/auth' })
  .post("/sign-in/email", async ({ body, set }) => {
    const { email, password } = body;
    
    if (useDb) {
      try {
        const auth = getBetterAuth(useDb);
        if (auth) {
          const baseURL = process.env.BETTER_AUTH_URL || "http://localhost:3002";
          const targetUrl = new URL("/api/auth/sign-in/email", baseURL);
          const rawResponse = await auth.handler(new Request(targetUrl.toString(), {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "host": targetUrl.host
            },
            body: JSON.stringify({ email, password })
          }));
          const setCookie = rawResponse.headers.get("set-cookie");
          if (setCookie) {
            set.headers["set-cookie"] = setCookie;
          }
          const data = await rawResponse.json();
          if (rawResponse.status >= 400) {
            set.status = rawResponse.status;
            return { error: data.message || "Invalid credentials" };
          }
          return data;
        }
      } catch (e: any) {
        set.status = 400;
        return { error: e.message || "Invalid credentials" };
      }
    }
    
    // Fallback Mock Sign-In
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
    
    set.headers["set-cookie"] = `better-auth.session-token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`;
    return {
      session: {
        id: token,
        userId: user.id,
        expiresAt: new Date(expiresAt).toISOString(),
        token
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
          return data;
        } catch (e) {
          set.status = 401;
          return { session: null, user: null };
        }
      }
    }

    // Fallback Mock session
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
        token
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
        set.headers["set-cookie"] = `better-auth.session-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
        return { success: true };
      }
    }

    const cookies = request.headers.get("cookie") || "";
    let token = "";
    const match = cookies.match(/(?:^|; )better-auth\.session-token=([^;]*)/);
    if (match && match[1]) {
      token = decodeURIComponent(match[1]);
    }

    if (token) {
      mockSessions.delete(token);
    }

    set.headers["set-cookie"] = `better-auth.session-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
    return { success: true };
  });

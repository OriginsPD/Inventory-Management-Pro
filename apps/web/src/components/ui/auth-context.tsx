import React, { createContext, useContext, useCallback, useEffect } from "react";

import { authClient } from "@/lib/auth-client";
import { apiClient } from "@/lib/api-client";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "SUPER_USER" | "TECHNICIAN" | "REVIEWER";
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ user: User; session: Session }>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  setSession: React.Dispatch<React.SetStateAction<Session | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapUser(raw: Record<string, unknown> | null | undefined): User | null {
  if (!raw?.id || !raw.email) return null;
  return {
    id: String(raw.id),
    name: String(raw.name ?? ""),
    email: String(raw.email),
    role: (raw.role as User["role"]) ?? "REVIEWER",
  };
}

function mapSession(raw: Record<string, unknown> | null | undefined): Session | null {
  if (!raw?.id) return null;
  const expiresAt = raw.expiresAt;
  return {
    id: String(raw.id),
    userId: String(raw.userId ?? ""),
    expiresAt:
      expiresAt instanceof Date
        ? expiresAt.toISOString()
        : String(expiresAt ?? ""),
  };
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { data, isPending, refetch } = authClient.useSession();
  const [userOverride, setUser] = React.useState<User | null | undefined>(undefined);
  const [sessionOverride, setSession] = React.useState<Session | null | undefined>(undefined);

  const user = userOverride !== undefined ? userOverride : mapUser(data?.user as Record<string, unknown>);
  const session =
    sessionOverride !== undefined
      ? sessionOverride
      : mapSession(data?.session as Record<string, unknown>);

  useEffect(() => {
    const handleExpired = () => {
      setUser(null);
      setSession(null);
      void refetch();
    };
    window.addEventListener("auth-session-expired", handleExpired);
    return () => window.removeEventListener("auth-session-expired", handleExpired);
  }, [refetch]);

  const checkSession = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const login = async (email: string, password: string) => {
    const result = await authClient.signIn.email({ email, password });
    if (result.error) {
      throw new Error(result.error.message || "Login failed");
    }

    const sessionRes = await authClient.getSession();
    const mappedUser = mapUser(sessionRes.data?.user as Record<string, unknown>);
    const mappedSession = mapSession(sessionRes.data?.session as Record<string, unknown>);

    if (!mappedUser || !mappedSession) {
      const data = await apiClient.post<{ user: User; session: Session }>(
        "/api/auth/sign-in/email",
        { email, password },
      );
      if (data?.user && data?.session) {
        setUser(data.user);
        setSession(data.session);
        return data;
      }
      throw new Error("Invalid response envelope from server");
    }

    setUser(mappedUser);
    setSession(mappedSession);
    return { user: mappedUser, session: mappedSession };
  };

  const logout = async () => {
    try {
      await authClient.signOut();
    } catch (e) {
      console.error("Sign-out request failed", e);
    } finally {
      setUser(null);
      setSession(null);
      await refetch();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading: isPending,
        login,
        logout,
        checkSession,
        setUser,
        setSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

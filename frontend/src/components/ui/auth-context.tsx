import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../lib/api-client';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_USER' | 'TECHNICIAN' | 'REVIEWER';
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: string;
  token: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ user: User; session: Session }>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch(
        `${(import.meta.env.VITE_API_URL as string) || 'http://localhost:3002'}/api/auth/get-session`,
        { credentials: 'include' }
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.session && data.user) {
          setSession(data.session);
          setUser(data.user);
        } else {
          setSession(null);
          setUser(null);
        }
      }
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      try {
        const res = await fetch(
          `${(import.meta.env.VITE_API_URL as string) || 'http://localhost:3002'}/api/auth/get-session`,
          { credentials: 'include' }
        );
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            if (data && data.session && data.user) {
              setSession(data.session);
              setUser(data.user);
            } else {
              setSession(null);
              setUser(null);
            }
          }
        } else if (isMounted) {
          setSession(null);
          setUser(null);
        }
      } catch {
        if (isMounted) {
          setSession(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initializeAuth();

    const handleExpired = () => {
      setUser(null);
      setSession(null);
    };

    window.addEventListener('auth-session-expired', handleExpired);
    return () => {
      isMounted = false;
      window.removeEventListener('auth-session-expired', handleExpired);
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const data = await apiClient.post<{ user: User; session: Session }>('/api/auth/sign-in/email', {
        email,
        password,
      });
      if (data && data.user && data.session) {
        setUser(data.user);
        setSession(data.session);
        return data;
      }
      throw new Error('Invalid response envelope from server');
    } catch (e: unknown) {
      const error = e as Error;
      throw new Error(error.message || 'Login failed', { cause: error });
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/api/auth/sign-out');
    } catch (e) {
      console.error('Sign-out request failed', e);
    } finally {
      setUser(null);
      setSession(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, login, logout, checkSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

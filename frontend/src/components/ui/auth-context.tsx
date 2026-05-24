import React, { createContext, useContext, useState, useEffect } from 'react';
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

  const checkSession = async () => {
    try {
      // Use raw fetch here to avoid the apiClient dispatching auth-session-expired
      // on an initial 401 (no active session on first load is normal).
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
      } else {
        // No active session is normal — do NOT fire auth-session-expired here
        setSession(null);
        setUser(null);
      }
    } catch (e) {
      setSession(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkSession();

    const handleExpired = () => {
      setUser(null);
      setSession(null);
    };

    window.addEventListener('auth-session-expired', handleExpired);
    return () => {
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
    } catch (e: any) {
      throw new Error(e.message || 'Login failed');
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

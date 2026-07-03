/**
 * AuthContext.tsx — Global auth state for CreativeIQ.
 * Supports both authenticated users and guests (no token).
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { UserProfile } from '../types';
import { login as apiLogin, register as apiRegister, logout as apiLogout, getToken, refreshTokens } from '../api';

interface AuthState {
  user: UserProfile | null;
  isLoggedIn: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoggedIn: false,
    isLoading: true,
  });

  // ── On mount: restore session from localStorage ──────────────────────────

  useEffect(() => {
    const restore = async () => {
      const token = getToken();
      if (!token) {
        setState({ user: null, isLoggedIn: false, isLoading: false });
        return;
      }
      // Try to restore user from localStorage
      const stored = localStorage.getItem('ciq_user');
      if (stored) {
        try {
          const user: UserProfile = JSON.parse(stored);
          setState({ user, isLoggedIn: true, isLoading: false });
          return;
        } catch { /* fall through */ }
      }
      // Refresh tokens as fallback
      const resp = await refreshTokens();
      if (resp) {
        setState({ user: resp.user, isLoggedIn: true, isLoading: false });
      } else {
        setState({ user: null, isLoggedIn: false, isLoading: false });
      }
    };
    restore();
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────

  const login = useCallback(async (email: string, password: string) => {
    const resp = await apiLogin(email, password);
    setState({ user: resp.user, isLoggedIn: true, isLoading: false });
  }, []);

  const register = useCallback(async (email: string, username: string, password: string) => {
    const resp = await apiRegister(email, username, password);
    setState({ user: resp.user, isLoggedIn: true, isLoading: false });
  }, []);

  const logout = useCallback(() => {
    apiLogout();
    setState({ user: null, isLoggedIn: false, isLoading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiLogin, apiLogout, apiMe, apiPermissions } from "../api/auth";
import type { AuthUser, PermissionEntry } from "../api/auth";

const TOKEN_KEY = "dc_auth_token";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  permissions: PermissionEntry[];
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  canView: (pageKey: string) => boolean;
  canEdit: (pageKey: string) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  });
  const [permissions, setPermissions] = useState<PermissionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // On mount or token change: validate session + load permissions
  useEffect(() => {
    if (!token) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const [meRes, perms] = await Promise.all([apiMe(token), apiPermissions(token)]);
        if (cancelled) return;
        if (meRes.ok && meRes.userId) {
          setUser({ userId: meRes.userId, email: meRes.email ?? "", role: meRes.role ?? "", name: "" });
          setPermissions(perms);
        } else {
          // Token expired or invalid
          setToken(null);
          setUser(null);
          setPermissions([]);
          try { localStorage.removeItem(TOKEN_KEY); } catch {}
        }
      } catch {
        if (!cancelled) {
          setToken(null); setUser(null); setPermissions([]);
          try { localStorage.removeItem(TOKEN_KEY); } catch {}
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setError(null);
    setLoading(true);
    try {
      const res = await apiLogin(email, password);
      if (res.ok && res.token) {
        try { localStorage.setItem(TOKEN_KEY, res.token); } catch {}
        setToken(res.token);
        setUser({ userId: "", email: res.email ?? email, role: res.role ?? "", name: res.name ?? "" });
        // Permissions will load via the useEffect above
        return true;
      } else {
        setError(res.error ?? "Login failed");
        setLoading(false);
        return false;
      }
    } catch (e) {
      setError("Network error");
      setLoading(false);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    if (token) {
      try { await apiLogout(token); } catch {}
    }
    setToken(null);
    setUser(null);
    setPermissions([]);
    try { localStorage.removeItem(TOKEN_KEY); } catch {}
  }, [token]);

  const canView = useCallback((pageKey: string): boolean => {
    if (!user) return false;
    if (user.role === "ADMIN") return true;
    return permissions.some((p) => p.page_key === pageKey && p.can_view);
  }, [user, permissions]);

  const canEdit = useCallback((pageKey: string): boolean => {
    if (!user) return false;
    if (user.role === "ADMIN") return true;
    return permissions.some((p) => p.page_key === pageKey && p.can_edit);
  }, [user, permissions]);

  return (
    <AuthContext.Provider value={{ user, token, permissions, loading, error, login, logout, canView, canEdit }}>
      {children}
    </AuthContext.Provider>
  );
}

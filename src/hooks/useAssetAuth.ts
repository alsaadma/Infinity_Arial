import { useState, useCallback } from "react";

export interface AssetSession {
  token: string;
  role: string;
  email: string;
  name: string;
}

export function useAssetAuth() {
  const [session, setSession] = useState<AssetSession | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.ok) {
        setSession({ token: data.token, role: data.role,
                     email: data.email, name: data.name });
        return { ok: true as const };
      }
      return { ok: false as const, error: (data.error as string) ?? "Login failed" };
    } catch {
      return { ok: false as const, error: "Server unreachable — is the backend running?" };
    }
  }, []);

  const logout = useCallback(() => setSession(null), []);

  return { session, login, logout };
}


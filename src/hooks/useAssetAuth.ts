import { useAuth } from "../contexts/AuthContext";

export interface AssetSession {
  token: string;
  role: string;
  email: string;
  name: string;
}

// Bridge hook: delegates entirely to the global AuthContext.
// Pages that use useAssetAuth() will now share the app-level session —
// no separate login prompt needed.
export function useAssetAuth() {
  const { user, token, login: ctxLogin, logout: ctxLogout } = useAuth();

  const session: AssetSession | null = (user && token)
    ? { token, role: user.role, email: user.email, name: user.name ?? "" }
    : null;

  const login = async (email: string, password: string) => {
    const ok = await ctxLogin(email, password);
    if (ok) return { ok: true as const };
    return { ok: false as const, error: "Login failed" };
  };

  const logout = () => ctxLogout();

  return { session, login, logout };
}

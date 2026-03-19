const API_BASE = "/api";

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
  name: string;
}

export interface LoginResponse {
  ok: boolean;
  token?: string;
  role?: string;
  email?: string;
  name?: string;
  error?: string;
}

export interface MeResponse {
  ok: boolean;
  userId?: string;
  role?: string;
  email?: string;
  error?: string;
}

export interface PermissionEntry {
  page_key: string;
  can_view: boolean;
  can_edit: boolean;
}

export async function apiLogin(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

export async function apiLogout(token: string): Promise<void> {
  await fetch(`${API_BASE}/auth/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function apiMe(token: string): Promise<MeResponse> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

export async function apiPermissions(token: string): Promise<PermissionEntry[]> {
  const res = await fetch(`${API_BASE}/auth/permissions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return data.ok ? data.items : [];
}

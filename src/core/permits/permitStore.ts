export type PermitDomain = "GACA" | "Municipality" | "RCU" | "Other";
export type PermitStatus = "MISSING" | "IN_PROGRESS" | "READY" | "EXPIRED";

export type PermitRecord = {
  id: string;
  title: string;
  domain: PermitDomain;
  location: string;

  status: PermitStatus;
  validFrom?: string; // ISO date
  validTo?: string;   // ISO date
};

const KEY = "drones_calc.permits_v1";

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

function load(): PermitRecord[] {
  const arr = safeParse<PermitRecord[]>(localStorage.getItem(KEY));
  return Array.isArray(arr) ? arr : [];
}

function save(rows: PermitRecord[]) {
  localStorage.setItem(KEY, JSON.stringify(rows));
}

let _permits: PermitRecord[] = load();

export function listPermits(): PermitRecord[] {
  return _permits.slice();
}

export function listPermitsForLocation(location: string): PermitRecord[] {
  const loc = (location || "").trim().toLowerCase();
  return _permits.filter(p => (p.location || "").trim().toLowerCase() === loc);
}

export function upsertPermit(next: PermitRecord): PermitRecord {
  const idx = _permits.findIndex(p => p.id === next.id);
  if (idx >= 0) _permits[idx] = next;
  else _permits = [next, ..._permits];
  save(_permits);
  return next;
}

export function setPermitStatus(id: string, status: PermitStatus): PermitRecord | null {
  const p = _permits.find(x => x.id === id);
  if (!p) return null;
  return upsertPermit({ ...p, status });
}

export function seedPermitsIfEmpty() {
  if (_permits.length) return;

  const seeded: PermitRecord[] = [
    { id: "p_gaca_riyadh", title: "GACA Flight Authorization", domain: "GACA", location: "Riyadh", status: "IN_PROGRESS" },
    { id: "p_mun_riyadh", title: "Municipality Event Permit", domain: "Municipality", location: "Riyadh", status: "MISSING" },

    { id: "p_gaca_jeddah", title: "GACA Flight Authorization", domain: "GACA", location: "Jeddah", status: "READY" },
    { id: "p_mun_jeddah", title: "Municipality Event Permit", domain: "Municipality", location: "Jeddah", status: "READY" },

    { id: "p_gaca_alula", title: "GACA Flight Authorization", domain: "GACA", location: "AlUla", status: "READY" },
    { id: "p_rcu_alula", title: "RCU Event Approval", domain: "RCU", location: "AlUla", status: "IN_PROGRESS" },
  ];

  _permits = seeded;
  save(_permits);
}
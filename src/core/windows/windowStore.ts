export type WindowStatus = "DRAFT" | "HOLD" | "CONFIRMED" | "REJECTED";

export type WindowRecord = {
  id: string;
  name: string;
  location: string;
  startDate: string; // ISO yyyy-mm-dd
  endDate: string;   // ISO yyyy-mm-dd

  requiredDrones: number;
  assignedDrones: number;

  status: WindowStatus;
};

const KEY = "drones_calc.windows_v1";

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

function load(): WindowRecord[] {
  const arr = safeParse<WindowRecord[]>(localStorage.getItem(KEY));
  return Array.isArray(arr) ? arr : [];
}

function save(rows: WindowRecord[]) {
  localStorage.setItem(KEY, JSON.stringify(rows));
}

let _windows: WindowRecord[] = load();

export function listWindows(): WindowRecord[] {
  return _windows.slice();
}

export function getWindow(id: string): WindowRecord | null {
  return _windows.find(w => w.id === id) ?? null;
}

export function upsertWindow(next: WindowRecord): WindowRecord {
  const idx = _windows.findIndex(w => w.id === next.id);
  if (idx >= 0) _windows[idx] = next;
  else _windows = [next, ..._windows];
  save(_windows);
  return next;
}

export function setWindowAssignedDrones(id: string, assignedDrones: number): WindowRecord | null {
  const w = getWindow(id);
  if (!w) return null;
  const next: WindowRecord = { ...w, assignedDrones: Math.max(0, Math.floor(assignedDrones || 0)) };
  return upsertWindow(next);
}

export function seedWindowsIfEmpty() {
  if (_windows.length) return;

  const seeded: WindowRecord[] = [
    {
      id: "win_riyadh_season",
      name: "Riyadh Season (Oct–Mar)",
      location: "Riyadh",
      startDate: "2025-10-01",
      endDate: "2026-03-31",
      requiredDrones: 1000,
      assignedDrones: 0,
      status: "DRAFT",
    },
    {
      id: "win_jeddah_season",
      name: "Jeddah Season (May–Jun)",
      location: "Jeddah",
      startDate: "2026-05-01",
      endDate: "2026-06-30",
      requiredDrones: 800,
      assignedDrones: 0,
      status: "DRAFT",
    },
    {
      id: "win_alula_winter",
      name: "AlUla Winter (Dec–Feb)",
      location: "AlUla",
      startDate: "2025-12-01",
      endDate: "2026-02-28",
      requiredDrones: 1000,
      assignedDrones: 0,
      status: "DRAFT",
    },
  ];

  _windows = seeded;
  save(_windows);
}
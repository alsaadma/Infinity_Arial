import type { HardGateFailure, PermitState, ReadinessPolicy, Window } from "./readinessTypes";

function isoToday(): string {
  // Use local machine time (Level 3 backend will standardize later)
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function isExpired(p: PermitState, todayIso: string): boolean {
  if (p.status === "EXPIRED") return true;
  if (!p.validTo) return false;
  return p.validTo < todayIso;
}

function normalizeKey(s: string): string {
  return (s ?? "").trim().toLowerCase();
}

function requiredTitlesForWindow(window: Window, policy: ReadinessPolicy): string[] {
  if (window.domain) {
    return policy.hardGates.requiredPermitTitlesByDomain[window.domain] ?? [];
  }

  // Fallback: location mapping (best-effort)
  const locMap = policy.hardGates.requiredPermitTitlesByLocation ?? {};
  const key = window.location;
  return locMap[key] ?? [];
}

export function evaluateHardGates(args: {
  window: Window;
  permits: PermitState[];
  policy: ReadinessPolicy;
}): { failures: HardGateFailure[]; requiredTitles: string[]; matchedPermits: PermitState[] } {
  const { window, permits, policy } = args;
  const todayIso = isoToday();

  const requiredTitles = requiredTitlesForWindow(window, policy);
  const failures: HardGateFailure[] = [];

  const permitsByTitle = new Map<string, PermitState[]>();
  for (const p of permits) {
    const k = normalizeKey(p.title);
    const arr = permitsByTitle.get(k) ?? [];
    arr.push(p);
    permitsByTitle.set(k, arr);
  }

  const matchedPermits: PermitState[] = [];

  for (const title of requiredTitles) {
    const key = normalizeKey(title);
    const candidates = permitsByTitle.get(key) ?? [];

    // Filter by location match if possible (best-effort)
    const locCandidates = candidates.filter(c => normalizeKey(c.location) === normalizeKey(window.location));
    const pool = locCandidates.length ? locCandidates : candidates;

    if (!pool.length) {
      failures.push({ code: "PERMIT_MISSING", message: `Missing required permit: "${title}" for location "${window.location}".` });
      continue;
    }

    // Prefer READY permits
    const ready = pool.find(p => p.status === "READY" && !isExpired(p, todayIso));
    if (ready) {
      matchedPermits.push(ready);
      continue;
    }

    // If we found something but not READY
    const anyExpired = pool.some(p => isExpired(p, todayIso));
    if (anyExpired) {
      failures.push({ code: "PERMIT_EXPIRED", message: `Required permit expired: "${title}" (${window.location}).` });
      continue;
    }

    failures.push({ code: "PERMIT_NOT_READY", message: `Required permit not READY: "${title}" (${window.location}).` });
  }

  return { failures, requiredTitles, matchedPermits };
}
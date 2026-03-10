import type { PermitDomain, PermitState, ReadinessPolicy, ShowReadinessInput, Window } from "../readinessTypes";

/**
 * Adapter Boundary:
 * - Accepts raw windows/permits from upstream (Command read model / domain objects)
 * - Produces readiness-engine stable contracts.
 *
 * IMPORTANT: Keep this file thin. Do not implement readiness logic here.
 */

export type RawWindow = any;
export type RawPermit = any;

function asIsoDate(x: any): string {
  // Best-effort: accept ISO already, or Date, or yyyy-mm-dd.
  if (!x) return "";
  if (typeof x === "string") return x;
  if (x instanceof Date) return x.toISOString().slice(0, 10);
  return String(x);
}

function inferDomainFromPermitTitle(title: string): PermitDomain {
  const t = (title || "").toLowerCase();
  if (t.includes("gaca")) return "GACA";
  if (t.includes("municip")) return "Municipality";
  if (t.includes("rcu")) return "RCU";
  return "Other";
}

export function mapPermit(raw: RawPermit): PermitState {
  const title = String(raw?.title ?? raw?.name ?? "Unknown Permit");
  const domain: PermitDomain =
    (raw?.domain as PermitDomain) ??
    inferDomainFromPermitTitle(title);

  return {
    permitId: String(raw?.permitId ?? raw?.id ?? cryptoFallbackId("permit")),
    title,
    domain,
    location: String(raw?.location ?? raw?.city ?? "Unknown"),
    status: (raw?.status ?? "MISSING"),
    validFrom: raw?.validFrom ? asIsoDate(raw.validFrom) : undefined,
    validTo: raw?.validTo ? asIsoDate(raw.validTo) : undefined,
  };
}

export function mapWindow(raw: RawWindow): Window {
  // Map common fields but remain tolerant to upstream changes.
  // You will refine these mappings once we inspect your real window structure.
  return {
    windowId: String(raw?.windowId ?? raw?.id ?? cryptoFallbackId("win")),
    name: String(raw?.name ?? raw?.title ?? "Untitled Window"),
    startDate: asIsoDate(raw?.startDate ?? raw?.start ?? raw?.from),
    endDate: asIsoDate(raw?.endDate ?? raw?.end ?? raw?.to),
    location: String(raw?.location ?? raw?.city ?? "Unknown"),
    requiredDrones: Number(raw?.requiredDrones ?? raw?.required ?? raw?.req ?? 0),
    assignedDrones: Number(raw?.assignedDrones ?? raw?.assigned ?? 0),
    status: (raw?.status ?? "DRAFT"),
    domain: raw?.domain,
  };
}

function cryptoFallbackId(prefix: string): string {
  // Avoid importing uuid libs in core. This is only for non-authoritative raw objects.
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

export function buildShowReadinessInput(args: {
  showId: string;
  rawTargetWindow: RawWindow;
  rawAllWindows: RawWindow[];
  rawPermits: RawPermit[];
  fleetTotalOperational: number;
  policy: ReadinessPolicy;
}): ShowReadinessInput {
  const window = mapWindow(args.rawTargetWindow);
  const allWindows = (args.rawAllWindows ?? []).map(mapWindow);
  const permits = (args.rawPermits ?? []).map(mapPermit);

  return {
    showId: args.showId,
    window,
    allWindows,
    permits,
    fleet: { totalDronesOperational: args.fleetTotalOperational },
    policy: args.policy,
  };
}
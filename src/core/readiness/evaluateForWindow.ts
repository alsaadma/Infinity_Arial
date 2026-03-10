import type { ReadinessVerdict, ShowReadinessInput } from "./readinessTypes";
import { evaluateReadiness } from "./readinessEngine";
import { readinessPolicyDefault } from "./policyDefault";

import { listWindows, getWindow, seedWindowsIfEmpty } from "../windows/windowStore";
import { listPermitsForLocation, seedPermitsIfEmpty } from "../permits/permitStore";

function toReadinessWindow(w: any) {
  return {
    windowId: String(w.id),
    name: String(w.name),
    location: String(w.location),
    startDate: String(w.startDate),
    endDate: String(w.endDate),
    requiredDrones: Number(w.requiredDrones || 0),
    assignedDrones: Number(w.assignedDrones || 0),
    status: (w.status ?? "DRAFT"),
  };
}

export function evaluateReadinessForWindow(args: {
  windowId: string;
  fleetTotalOperational: number;
  policyOverride?: any;
}): ReadinessVerdict {
  seedWindowsIfEmpty();
  seedPermitsIfEmpty();

  const w = getWindow(args.windowId);
  if (!w) {
    return {
      status: "NOT_READY",
      engine: { version: "readiness-v1", evaluatedAt: new Date().toISOString() },
      hardGateFailures: [{ code: "WINDOW_NOT_FOUND", message: `Window not found: ${args.windowId}` }],
      capacity: { available: 0, effectiveAvailable: 0, required: 0, gap: 0, overlapDeductions: [], reserveUsed: 0 },
      scoring: { stressScore: 100, confidenceIndex: 0, drivers: [{ key: "missingWindow", value: 1, note: "No window" }] },
      explanation: ["Cannot evaluate readiness: window not found."],
    };
  }

  const policy = args.policyOverride ?? readinessPolicyDefault;

  const all = listWindows().map(toReadinessWindow);
  const target = toReadinessWindow(w);
  const permits = listPermitsForLocation(w.location).map((p: any) => ({
    permitId: String(p.id),
    title: String(p.title),
    domain: p.domain,
    location: String(p.location),
    status: p.status,
    validFrom: p.validFrom,
    validTo: p.validTo,
  }));

  const input: ShowReadinessInput = {
    showId: `show_${target.windowId}`,
    window: target,
    allWindows: all,
    permits,
    fleet: { totalDronesOperational: Math.max(0, Math.floor(args.fleetTotalOperational || 0)) },
    policy,
  };

  return evaluateReadiness(input);
}
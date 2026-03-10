import type { ReadinessVerdict } from "./readiness/readinessTypes";
import { evaluateReadinessForWindow } from "./readiness/evaluateForWindow";
import { listWindows, seedWindowsIfEmpty } from "./windows/windowStore";

export type OpsReadModel = {
  meta: { version: "v1"; computedAtISO: string };
  fleet: { totalOperational: number };
  windows: Array<{
    id: string;
    name: string;
    location: string;
    startDate: string;
    endDate: string;
    requiredDrones: number;
    assignedDrones: number;
    status: string;
    readiness: ReadinessVerdict;
  }>;
  summary: {
    totalWindows: number;
    ready: number;
    atRisk: number;
    notReady: number;
  };
};

export function buildOpsReadModel(args: { fleetTotalOperational: number }): OpsReadModel {
  seedWindowsIfEmpty();

  const fleetTotalOperational = Math.max(0, Math.floor(args.fleetTotalOperational || 0));
  const ws = listWindows();

  const windows = ws.map(w => {
    const readiness = evaluateReadinessForWindow({
      windowId: w.id,
      fleetTotalOperational,
    });

    return {
      id: w.id,
      name: w.name,
      location: w.location,
      startDate: w.startDate,
      endDate: w.endDate,
      requiredDrones: w.requiredDrones,
      assignedDrones: w.assignedDrones,
      status: w.status,
      readiness,
    };
  });

  const counts = { READY: 0, AT_RISK: 0, NOT_READY: 0 } as any;
  for (const w of windows) counts[w.readiness.status] = (counts[w.readiness.status] ?? 0) + 1;

  return {
    meta: { version: "v1", computedAtISO: new Date().toISOString() },
    fleet: { totalOperational: fleetTotalOperational },
    windows,
    summary: {
      totalWindows: windows.length,
      ready: counts.READY ?? 0,
      atRisk: counts.AT_RISK ?? 0,
      notReady: counts.NOT_READY ?? 0,
    },
  };
}
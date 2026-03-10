import type { CapacityResult, FleetSnapshot, ReadinessPolicy, Window } from "./readinessTypes";

function overlaps(a: Window, b: Window): boolean {
  // inclusive overlap check: a.start <= b.end && b.start <= a.end
  return a.startDate <= b.endDate && b.startDate <= a.endDate;
}

export function evaluateCapacity(args: {
  window: Window;
  allWindows: Window[];
  fleet: FleetSnapshot;
  policy: ReadinessPolicy;
}): CapacityResult {
  const { window, allWindows, fleet, policy } = args;

  const totalOp = Math.max(0, fleet.totalDronesOperational || 0);
  const required = Math.max(0, window.requiredDrones || 0);

  const overlapDeductions: { windowId: string; deducted: number }[] = [];
  let assignedDuringOverlap = 0;

  for (const w of allWindows) {
    if (w.windowId === window.windowId) continue;
    if (w.status === "REJECTED") continue;
    if (!overlaps(window, w)) continue;

    const deducted = Math.max(0, w.assignedDrones || 0);
    if (deducted > 0) {
      overlapDeductions.push({ windowId: w.windowId, deducted });
      assignedDuringOverlap += deducted;
    }
  }

  const available = Math.max(0, totalOp - assignedDuringOverlap);

  const reservePct =
    fleet.reservePolicy?.minReservePct ?? policy.capacity.reservePctDefault;

  const reserveCount =
    fleet.reservePolicy?.minReserveCount ?? policy.capacity.reserveCountDefault;

  const reserveUsed = Math.max(reserveCount, Math.ceil(totalOp * reservePct));
  const effectiveAvailable = Math.max(0, available - reserveUsed);

  const gap = Math.max(0, required - effectiveAvailable);

  return {
    available,
    effectiveAvailable,
    required,
    gap,
    overlapDeductions,
    reserveUsed,
  };
}
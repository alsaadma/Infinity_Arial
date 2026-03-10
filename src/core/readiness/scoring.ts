import type { CapacityResult, PermitState, ReadinessPolicy, ScoringResult } from "./readinessTypes";

function clamp01(x: number): number {
  if (Number.isNaN(x) || !Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

export function evaluateScoring(args: {
  totalOperational: number;
  capacity: CapacityResult;
  permits: PermitState[];
  policy: ReadinessPolicy;
}): ScoringResult {
  const { totalOperational, capacity, permits, policy } = args;
  const w = policy.scoring.stressWeights;

  const denom = Math.max(1, totalOperational);

  // compute overlap load from overlap deductions directly:
  const overlapSum = capacity.overlapDeductions.reduce((s, x) => s + x.deducted, 0);

  const overlapLoad = clamp01(overlapSum / denom);
  const utilizationRatio = clamp01(capacity.required / denom);

  const totalPermits = Math.max(1, permits.length);
  const readyPermits = permits.filter(p => p.status === "READY").length;
  const permitMaturity = clamp01(readyPermits / totalPermits);

  const stress =
    100 *
    (w.overlapLoad * overlapLoad +
      w.utilizationRatio * utilizationRatio +
      w.permitMaturity * (1 - permitMaturity));

  const stressScore = Math.max(0, Math.min(100, Math.round(stress)));
  const confidenceIndex = Math.max(0, Math.min(100, 100 - stressScore));

  return {
    stressScore,
    confidenceIndex,
    drivers: [
      { key: "overlapLoad", value: overlapLoad, note: "Overlap assigned / total operational" },
      { key: "utilizationRatio", value: utilizationRatio, note: "Required / total operational" },
      { key: "permitMaturity", value: permitMaturity, note: "READY permits / total permits" },
    ],
  };
}
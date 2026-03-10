import type {
  ReadinessVerdict,
  ShowReadinessInput,
} from "./readinessTypes";

import { evaluateHardGates } from "./hardGates";
import { evaluateCapacity } from "./capacity";
import { evaluateScoring } from "./scoring";

export function evaluateReadiness(input: ShowReadinessInput): ReadinessVerdict {
  const evaluatedAt = new Date().toISOString();

  const hard = evaluateHardGates({
    window: input.window,
    permits: input.permits,
    policy: input.policy,
  });

  // Default capacity/scoring placeholders (always present for audit shape)
  const capacity = evaluateCapacity({
    window: input.window,
    allWindows: input.allWindows,
    fleet: input.fleet,
    policy: input.policy,
  });

  // HARD GATE OVERRIDE
  if (hard.failures.length) {
    return {
      status: "NOT_READY",
      engine: { version: "readiness-v1", evaluatedAt },
      hardGateFailures: hard.failures,
      capacity,
      scoring: {
        stressScore: 100,
        confidenceIndex: 0,
        drivers: [{ key: "hardGate", value: 1, note: "Hard gate failure forces NOT_READY" }],
      },
      explanation: [
        "Hard gates failed. Readiness evaluation stopped at compliance layer.",
        ...hard.failures.map(f => `${f.code}: ${f.message}`),
      ],
    };
  }

  // CAPACITY OVERRIDE
  if (capacity.gap > 0) {
    const scoring = evaluateScoring({
      totalOperational: input.fleet.totalDronesOperational,
      capacity,
      permits: input.permits,
      policy: input.policy,
    });

    return {
      status: "NOT_READY",
      engine: { version: "readiness-v1", evaluatedAt },
      hardGateFailures: [],
      capacity,
      scoring,
      explanation: [
        "Capacity feasibility failed. Not enough effective drones after overlap deductions and reserve buffer.",
        `Required=${capacity.required}, EffectiveAvailable=${capacity.effectiveAvailable}, Gap=${capacity.gap}`,
      ],
    };
  }

  const scoring = evaluateScoring({
    totalOperational: input.fleet.totalDronesOperational,
    capacity,
    permits: input.permits,
    policy: input.policy,
  });

  const t = input.policy.scoring.thresholds;
  const status =
    scoring.stressScore <= t.readyMax
      ? "READY"
      : scoring.stressScore <= t.mitigateMax
      ? "READY_WITH_MITIGATION"
      : "NOT_READY";

  return {
    status,
    engine: { version: "readiness-v1", evaluatedAt },
    hardGateFailures: [],
    capacity,
    scoring,
    explanation: [
      "Hard gates passed.",
      "Capacity feasibility passed.",
      `StressScore=${scoring.stressScore} (thresholds: READY<=${t.readyMax}, MITIGATE<=${t.mitigateMax})`,
    ],
  };
}
import type { QuoteInputs, QuoteOutputs } from "./types";
import { validateInputs } from "./validate";

export type CalcYear = 1 | 2 | 3 | 4 | 5;

export function rampForYear(x: QuoteInputs, year: CalcYear): number {
  if (year === 1) return x.rampY1;
  if (year === 2) return x.rampY2;
  return x.rampY3Plus;
}

export function computeYear1(x: QuoteInputs): QuoteOutputs {
  const errs = validateInputs(x);
  if (errs.length) {
    // pure module: throw with deterministic message
    throw new Error(`Invalid inputs: ${errs.join("; ")}`);
  }

  const ramp = x.rampY1;

  const plannedShows = x.showsPerYear * ramp;
  const executedShows = plannedShows * (1 - x.cancellationRate);

  const grossRevenue =
    executedShows * x.pricePerShow + (x.manualRevenueAdjustment ?? 0);

  const variableOpex = executedShows * x.opexPerShow;
  const totalOpex =
    variableOpex + x.fixedOpexPerYear + (x.manualCostAdjustment ?? 0);

  const contribution = grossRevenue - totalOpex;
  const marginPct = grossRevenue > 0 ? contribution / grossRevenue : 0;

  return {
    executedShows,
    grossRevenue,
    totalOpex,
    contribution,
    marginPct,
  };
}

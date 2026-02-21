export type Currency = "SAR";

export interface QuoteInputs {
  currency: Currency;

  // Show assumptions
  dronesPerShow: number;          // e.g., 1000
  showsPerYear: number;           // e.g., 12
  pricePerShow: number;           // sell price
  cancellationRate: number;       // 0..1

  // Cost assumptions (Year 1 baseline)
  opexPerShow: number;            // operating cost per executed show
  fixedOpexPerYear: number;       // overhead (salaries, rent, insurance, etc.)

  // Growth assumptions
  priceUpliftRate: number;        // 0..1 (annual)
  costInflationRate: number;      // 0..1 (annual)

  // Ramp-up
  rampY1: number;                 // 0..1
  rampY2: number;                 // 0..1
  rampY3Plus: number;             // 0..1

  // Optional manual adjustment
  manualRevenueAdjustment?: number; // +/- amount
  manualCostAdjustment?: number;    // +/- amount
}

export interface QuoteOutputs {
  executedShows: number;        // after ramp + cancellation
  grossRevenue: number;         // executedShows * price
  totalOpex: number;            // executedShows * opexPerShow + fixedOpex
  contribution: number;         // grossRevenue - totalOpex
  marginPct: number;            // contribution / grossRevenue (0..1)
}

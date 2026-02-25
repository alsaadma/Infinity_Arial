export type RiskLevel = "LOW" | "MED" | "HIGH";
export type Readiness = "READY" | "READY_WITH_GAPS" | "NOT_READY";

export interface FleetBaseline {
  fleet_size: number;
  capex_sar: number;
  useful_life_years: number;
  expected_shows_per_year: number;
  residual_value_pct?: number; // optional for future

  holds: { maintenance: number; reserved: number; damaged: number };
  spare_ratio_target_pct: number;

  charging: { capacity_drones_per_day: number; default_prep_days: number };

  ground: {
    rtk_available: number;
    ap_available: number;
    ap_per_drones: number; // e.g., 800
    rtk_min: number;       // e.g., 1
  };

  compliance: { permits_min_lead_days: number };

  risk_buffers_pct: Record<RiskLevel, number>;
}

export interface ShowQuoteInput {
  quote_id: string;
  version: number;

  event: {
    client_name: string;
    event_name: string;
    city_type: "URBAN" | "COASTAL" | "DESERT" | "OPEN";
    show_date: string; // ISO date
  };

  requirements: {
    required_drones: number;
    duration_min: number;
    prep_days?: number;
    permits_days_remaining: number;
    risk_level: RiskLevel;
  };

  cost_inputs_sar: {
    variable_base: number;
    transport: number;
    crew: number;
    site_ops: number;
    other: number;
  };

  manual_override: { enabled: boolean; notes: string };

  proposed_price_ex_vat_sar?: number;
}

export type GapCategory =
  | "DRONES_AVAILABILITY"
  | "SPARE_RATIO"
  | "CHARGING_CAPACITY"
  | "PERMITS_LEAD_TIME"
  | "GROUND_RTK"
  | "GROUND_AP";

export interface Gap {
  id: string;
  category: GapCategory;
  blocker: boolean;
  trigger: string;
  value: number;

  impact: 1 | 2 | 3 | 4 | 5;
  likelihood: 1 | 2 | 3 | 4 | 5;
  lead_time_risk: 1 | 2 | 3 | 4 | 5;
  severity: number;

  default_fix: string;
}

export interface QuoteBreakdown {
  available_drones: number;
  required_with_spare: number;
  drone_shortage: number;

  lifetime_shows: number;
  asset_burn_per_show: number;

  variable_opex: number;
  risk_buffer_pct: number;
  risk_buffer_value: number;

  true_cost: number;
  msq_sar: number;
}

export interface QuoteResult {
  quote_id: string;
  version: number;
  readiness: Readiness;
  msq_sar: number;

  gaps_ranked: Gap[];
  top_weaknesses: Gap[];

  breakdown: QuoteBreakdown;

  flags: {
    final_below_msq?: boolean;
    manual_override_without_notes?: boolean;
  };
}

function clampInt(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
}

function ceilDiv(a: number, b: number): number {
  return Math.ceil(a / b);
}

function defaultGapScoring(category: GapCategory): Pick<Gap, "impact" | "likelihood" | "lead_time_risk" | "default_fix"> {
  switch (category) {
    case "DRONES_AVAILABILITY":
      return { impact: 5, likelihood: 4, lead_time_risk: 4, default_fix: "Lease/partner or reduce scope (drones count)." };
    case "SPARE_RATIO":
      return { impact: 4, likelihood: 3, lead_time_risk: 3, default_fix: "Increase spare ratio or hold buffer drones." };
    case "CHARGING_CAPACITY":
      return { impact: 4, likelihood: 3, lead_time_risk: 4, default_fix: "Add charging capacity or increase prep days." };
    case "PERMITS_LEAD_TIME":
      return { impact: 5, likelihood: 3, lead_time_risk: 5, default_fix: "Fast-track permits, partner licensed operator, or reschedule." };
    case "GROUND_RTK":
      return { impact: 5, likelihood: 2, lead_time_risk: 4, default_fix: "Rent/buy RTK kit or vendor support." };
    case "GROUND_AP":
      return { impact: 5, likelihood: 2, lead_time_risk: 4, default_fix: "Add/rent AP units or reduce required drones." };
  }
}

export function computeQuote(fleet: FleetBaseline, input: ShowQuoteInput): QuoteResult {
  const available_drones =
    clampInt(fleet.fleet_size) -
    clampInt(fleet.holds.maintenance) -
    clampInt(fleet.holds.reserved) -
    clampInt(fleet.holds.damaged);

  const required = clampInt(input.requirements.required_drones);
  const required_with_spare = Math.ceil(required * (1 + fleet.spare_ratio_target_pct));
  const drone_shortage = Math.max(0, required_with_spare - available_drones);

  const lifetime_shows = Math.max(1, clampInt(fleet.useful_life_years) * clampInt(fleet.expected_shows_per_year));
  const asset_burn_per_show = fleet.capex_sar / lifetime_shows;

  const variable_opex =
    input.cost_inputs_sar.variable_base +
    input.cost_inputs_sar.transport +
    input.cost_inputs_sar.crew +
    input.cost_inputs_sar.site_ops +
    input.cost_inputs_sar.other;

  const risk_buffer_pct = fleet.risk_buffers_pct[input.requirements.risk_level] ?? 0;
  const risk_buffer_value = (variable_opex + asset_burn_per_show) * risk_buffer_pct;

  const true_cost = variable_opex + asset_burn_per_show + risk_buffer_value;
  const msq_sar = true_cost;

  const gaps: Gap[] = [];

  if (drone_shortage > 0) {
    const base = defaultGapScoring("DRONES_AVAILABILITY");
    gaps.push({
      id: "GAP-DRONES-AVAIL",
      category: "DRONES_AVAILABILITY",
      blocker: true,
      trigger: "DroneShortage > 0",
      value: drone_shortage,
      ...base,
      severity: base.impact * base.likelihood * base.lead_time_risk,
    });
  }

  const spares_available = Math.max(0, available_drones - required);
  const spares_required = Math.max(0, required_with_spare - required);
  const spare_gap = Math.max(0, spares_required - spares_available);
  if (spare_gap > 0 && drone_shortage === 0) {
    const base = defaultGapScoring("SPARE_RATIO");
    gaps.push({
      id: "GAP-SPARE-RATIO",
      category: "SPARE_RATIO",
      blocker: false,
      trigger: "SpareGap > 0",
      value: spare_gap,
      ...base,
      severity: base.impact * base.likelihood * base.lead_time_risk,
    });
  }

  const prep_days = clampInt(input.requirements.prep_days ?? fleet.charging.default_prep_days);
  const charging_possible = clampInt(fleet.charging.capacity_drones_per_day) * Math.max(0, prep_days);
  const charge_gap = Math.max(0, required - charging_possible);
  if (charge_gap > 0) {
    const base = defaultGapScoring("CHARGING_CAPACITY");
    gaps.push({
      id: "GAP-CHARGING",
      category: "CHARGING_CAPACITY",
      blocker: true,
      trigger: "ChargeGap > 0",
      value: charge_gap,
      ...base,
      severity: base.impact * base.likelihood * base.lead_time_risk,
    });
  }

  const permits_gap = Math.max(0, clampInt(fleet.compliance.permits_min_lead_days) - clampInt(input.requirements.permits_days_remaining));
  if (permits_gap > 0) {
    const base = defaultGapScoring("PERMITS_LEAD_TIME");
    gaps.push({
      id: "GAP-PERMITS",
      category: "PERMITS_LEAD_TIME",
      blocker: true,
      trigger: "PermitsDaysRemaining < MinLeadDays",
      value: permits_gap,
      ...base,
      severity: base.impact * base.likelihood * base.lead_time_risk,
    });
  }

  const rtk_gap = Math.max(0, clampInt(fleet.ground.rtk_min) - clampInt(fleet.ground.rtk_available));
  if (rtk_gap > 0) {
    const base = defaultGapScoring("GROUND_RTK");
    gaps.push({
      id: "GAP-GROUND-RTK",
      category: "GROUND_RTK",
      blocker: true,
      trigger: "RTK_Available < RTK_Min",
      value: rtk_gap,
      ...base,
      severity: base.impact * base.likelihood * base.lead_time_risk,
    });
  }

  const ap_min = Math.max(1, ceilDiv(required, Math.max(1, clampInt(fleet.ground.ap_per_drones))));
  const ap_gap = Math.max(0, ap_min - clampInt(fleet.ground.ap_available));
  if (ap_gap > 0) {
    const base = defaultGapScoring("GROUND_AP");
    gaps.push({
      id: "GAP-GROUND-AP",
      category: "GROUND_AP",
      blocker: true,
      trigger: "AP_Available < AP_Min",
      value: ap_gap,
      ...base,
      severity: base.impact * base.likelihood * base.lead_time_risk,
    });
  }

  const gaps_ranked = gaps.sort((a, b) => {
    if (a.blocker !== b.blocker) return a.blocker ? -1 : 1;
    if (b.severity !== a.severity) return b.severity - a.severity;
    return b.value - a.value;
  });

  const readiness: Readiness =
    gaps_ranked.some(g => g.blocker) ? "NOT_READY" :
    gaps_ranked.length > 0 ? "READY_WITH_GAPS" :
    "READY";

  const breakdown: QuoteBreakdown = {
    available_drones,
    required_with_spare,
    drone_shortage,
    lifetime_shows,
    asset_burn_per_show,
    variable_opex,
    risk_buffer_pct,
    risk_buffer_value,
    true_cost,
    msq_sar,
  };

  const flags: QuoteResult["flags"] = {};
  if (input.manual_override.enabled && !input.manual_override.notes?.trim()) {
    flags.manual_override_without_notes = true;
  }
  if (typeof input.proposed_price_ex_vat_sar === "number") {
    flags.final_below_msq = input.proposed_price_ex_vat_sar < msq_sar;
  }

  return {
    quote_id: input.quote_id,
    version: input.version,
    readiness,
    msq_sar,
    gaps_ranked,
    top_weaknesses: gaps_ranked.slice(0, 3),
    breakdown,
    flags,
  };
}
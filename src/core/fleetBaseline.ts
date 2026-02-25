import type { FleetBaseline } from "./quoteEngine";

export const fleetBaseline: FleetBaseline = {
  fleet_size: 1000,
  capex_sar: 3991657,
  useful_life_years: 3,
  expected_shows_per_year: 45,
  residual_value_pct: 0.15,

  holds: { maintenance: 30, reserved: 0, damaged: 10 },
  spare_ratio_target_pct: 0.15,

  charging: { capacity_drones_per_day: 250, default_prep_days: 4 },

  ground: {
    rtk_available: 1,
    ap_available: 2,
    ap_per_drones: 800,
    rtk_min: 1
  },

  compliance: { permits_min_lead_days: 14 },

  risk_buffers_pct: { LOW: 0.05, MED: 0.10, HIGH: 0.20 }
};

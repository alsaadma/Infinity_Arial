import type { ReadinessPolicy } from "./readinessTypes";

export const readinessPolicyDefault: ReadinessPolicy = {
  hardGates: {
    requiredPermitTitlesByDomain: {
      GACA: ["GACA Flight Authorization"],
      Municipality: ["Municipality Event Permit"],
      RCU: ["RCU Event Approval"],
      Other: [],
    },

    // Optional fallback (only used if window.domain is missing)
    requiredPermitTitlesByLocation: {
      Riyadh: ["GACA Flight Authorization", "Municipality Event Permit"],
      Jeddah: ["GACA Flight Authorization", "Municipality Event Permit"],
      AlUla: ["GACA Flight Authorization", "RCU Event Approval"],
      Dammam: ["GACA Flight Authorization", "Municipality Event Permit"],
    },
  },

  capacity: {
    reservePctDefault: 0.10,
    reserveCountDefault: 50,
  },

  scoring: {
    stressWeights: {
      overlapLoad: 0.35,
      utilizationRatio: 0.45,
      permitMaturity: 0.20,
    },
    thresholds: {
      readyMax: 35,
      mitigateMax: 65,
    },
  },
};
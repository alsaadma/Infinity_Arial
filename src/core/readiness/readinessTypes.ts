export type PermitDomain = "GACA" | "Municipality" | "RCU" | "Other";

export type PermitStatus = "MISSING" | "IN_PROGRESS" | "READY" | "EXPIRED";

export type PermitState = {
  permitId: string;
  title: string;
  domain: PermitDomain;
  location: string;
  status: PermitStatus;
  validFrom?: string; // ISO date
  validTo?: string;   // ISO date
};

export type FleetSnapshot = {
  totalDronesOperational: number;

  reservePolicy?: {
    minReservePct?: number;   // e.g. 0.10
    minReserveCount?: number; // e.g. 50
  };
};

export type WindowStatus = "DRAFT" | "HOLD" | "CONFIRMED" | "REJECTED";

export type Window = {
  windowId: string;
  name: string;
  startDate: string; // ISO date
  endDate: string;   // ISO date
  location: string;

  requiredDrones: number;
  assignedDrones: number;

  status: WindowStatus;

  // Optional: may not exist yet in your model. Engine supports both.
  domain?: PermitDomain;
};

export type ReadinessPolicy = {
  hardGates: {
    requiredPermitTitlesByDomain: Record<string, string[]>; // keys: PermitDomain
    requiredPermitTitlesByLocation?: Record<string, string[]>; // optional fallback
  };

  capacity: {
    reservePctDefault: number;
    reserveCountDefault: number;
  };

  scoring: {
    stressWeights: {
      overlapLoad: number;
      utilizationRatio: number;
      permitMaturity: number;
    };
    thresholds: {
      readyMax: number;     // <= => READY
      mitigateMax: number;  // <= => READY_WITH_MITIGATION
    };
  };
};

export type ShowReadinessInput = {
  showId: string;
  window: Window;
  fleet: FleetSnapshot;
  permits: PermitState[];
  allWindows: Window[];
  policy: ReadinessPolicy;
};

export type HardGateFailure = { code: string; message: string };

export type CapacityResult = {
  available: number;
  effectiveAvailable: number;
  required: number;
  gap: number;
  overlapDeductions: { windowId: string; deducted: number }[];
  reserveUsed: number;
};

export type ScoringResult = {
  stressScore: number;      // 0..100
  confidenceIndex: number;  // 0..100
  drivers: { key: string; value: number; note: string }[];
};

export type ReadinessVerdict = {
  status: "READY" | "READY_WITH_MITIGATION" | "NOT_READY";

  engine: { version: string; evaluatedAt: string };

  hardGateFailures: HardGateFailure[];

  capacity: CapacityResult;

  scoring: ScoringResult;

  explanation: string[];
};
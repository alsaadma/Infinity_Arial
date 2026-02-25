import { useSyncExternalStore } from "react";

/**
 * Minimal shared "last computed result" snapshot.
 * - In-memory only (per browser session)
 * - Keeps TS strict: safe nulls + typed shape
 */

export type Readiness = "READY" | "NOT_READY" | "UNKNOWN";

export type GapRanked = {
  id?: string;
  title?: string;
  domain?: string;
  severity?: number;
  risk?: number;
  owner_suggestion?: string;
  evidence?: string;
};

export type QuoteResult = {
  readiness?: Readiness | string;
  msq_sar?: number;
  gaps_ranked?: GapRanked[];
  // Fleet info can be added later when the engine returns it consistently
  fleet?: {
    fleet_size?: number;
    capex_sar?: number;
    useful_life_years?: number;
    expected_shows_per_year?: number;
    residual_value_pct?: number;
  };
};

export type EngineSnapshot = {
  computedAtISO: string;
  result: QuoteResult;
};

type Listener = () => void;

let _snapshot: EngineSnapshot | null = null;
const _listeners = new Set<Listener>();

export function setEngineSnapshot(next: EngineSnapshot) {
  _snapshot = next;
  for (const l of _listeners) l();
}

export function getEngineSnapshot(): EngineSnapshot | null {
  return _snapshot;
}

function subscribe(listener: Listener) {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

export function useEngineSnapshot(): EngineSnapshot | null {
  return useSyncExternalStore(subscribe, getEngineSnapshot, getEngineSnapshot);
}
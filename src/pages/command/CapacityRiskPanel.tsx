import React from "react";
import { normalizeUiText } from "../../core/text/normalizeUiText";

type CapacityRiskLevel = "NONE" | "LOW" | "MED" | "HIGH" | "CRITICAL";

type CapacityRisk = {
  required: number;
  available: number;
  shortage: number;
  shortageRatio: number; // 0..1
  level: CapacityRiskLevel;
};

type WindowCapacityRisk = CapacityRisk & {
  windowId: string;
  windowLabel: string;
};

function asNum(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// If label is mojibake/corrupted, replace with a standard dash.
function cleanLabel(s: any): string {
  return normalizeUiText(s, "Ã¢â‚¬â€");
}

function classifyCapacity(requiredN: number, availableN: number): CapacityRisk {
  const required = Math.max(0, Number(requiredN || 0));
  const available = Math.max(0, Number(availableN || 0));
  const shortage = Math.max(0, required - available);
  const shortageRatio = required <= 0 ? 0 : (shortage / Math.max(1, required));

  const level: CapacityRiskLevel =
    shortageRatio === 0 ? "NONE" :
    shortageRatio <= 0.10 ? "LOW" :
    shortageRatio <= 0.30 ? "MED" :
    shortageRatio <= 0.60 ? "HIGH" : "CRITICAL";

  return { required, available, shortage, shortageRatio, level };
}

function findWindowsAny(result: any): any[] {
  const r: any = result ?? {};
  return (
    (Array.isArray(r?.windows) ? r.windows :
     Array.isArray(r?.computed?.windows) ? r.computed.windows :
     Array.isArray(r?.calendar?.windows) ? r.calendar.windows :
     Array.isArray(r?.summary?.windowsList) ? r.summary.windowsList :
     [])
  );
}

function windowReq(w: any): number | null {
  const v =
    asNum(w?.required) ??
    asNum(w?.req) ??
    asNum(w?.drones) ??
    asNum(w?.droneCount) ??
    asNum(w?.drone_count);
  return (v == null || !isFinite(v)) ? null : v;
}

function findAllocTotals(result: any): { totalRequired: number | null; totalAssigned: number | null } {
  const r: any = result ?? {};
  const a =
    r?.allocationSimulation ??
    r?.allocation ??
    r?.computed?.allocationSimulation ??
    r?.computed?.allocation ??
    r?.summary?.allocationSimulation ??
    r?.summary?.allocation ??
    null;

  const totalRequired =
    asNum(a?.totalRequired) ??
    asNum(a?.requiredTotal) ??
    asNum(a?.reqTotal) ??
    asNum(a?.required) ??
    null;

  const totalAssigned =
    asNum(a?.totalAssigned) ??
    asNum(a?.assignedTotal) ??
    asNum(a?.assigned) ??
    null;

  return { totalRequired, totalAssigned };
}

export default function CapacityRiskPanel(props: { result: any }) {
  const result = props.result;

  const [liveFleet, setLiveFleet] = React.useState<number | null>(null);
  React.useEffect(() => {
    fetch("/api/fleet/drones/summary")
      .then(r => r.ok ? r.json() : null)
      .then((d: any) => {
        const v = d?.available_for_planning;
        if (typeof v === "number") setLiveFleet(v);
      })
      .catch(() => {});
  }, []);

  const [liveShowsRequired, setLiveShowsRequired] = React.useState<number | null>(null);
  React.useEffect(() => {
    fetch("/api/shows/summary")
      .then(r => r.ok ? r.json() : null)
      .then((d: any) => {
        const v = d?.summary?.upcoming_drones_required;
        if (typeof v === "number") setLiveShowsRequired(v);
      })
      .catch(() => {});
  }, []);

  const summary: any = (result as any)?.summary ?? (result as any)?.computed?.summary ?? null;

  const fleetAvailable =
    liveFleet ??
    asNum(summary?.fleetAvailable) ??
    asNum((result as any)?.fleetAvailable) ??
    asNum((result as any)?.computed?.fleetAvailable) ??
    0;

  const windowsAny = React.useMemo(() => findWindowsAny(result), [result]);
  const alloc = React.useMemo(() => findAllocTotals(result), [result]);
const windowCapacity: WindowCapacityRisk[] = React.useMemo(() => {
    const av = Number(fleetAvailable || 0);
    const out: WindowCapacityRisk[] = [];
    for (const w of (windowsAny || [])) {
      const req = windowReq(w);
      if (req == null) continue;

      const id = String(w?.id ?? w?.key ?? w?.windowId ?? w?.name ?? "window").trim() || "window";
      const rawLabel = w?.label ?? w?.title ?? w?.name ?? id;
      const label = cleanLabel(rawLabel) || id;

      const c = classifyCapacity(req, av);
      out.push({ windowId: id, windowLabel: label, ...c });
    }
    return out;
  }, [fleetAvailable, windowsAny]);

  const portfolioRequiredSum = React.useMemo(() => {
    return windowCapacity.reduce((sum, w) => sum + (w.required || 0), 0);
  }, [windowCapacity]);

  // Option A: overlap-scope totals win if present.
  const requiredBasis = (alloc.totalRequired != null) ? alloc.totalRequired : (liveShowsRequired ?? portfolioRequiredSum);
  const availableBasis = (alloc.totalAssigned != null) ? alloc.totalAssigned : Number(fleetAvailable || 0);

  const portfolioRisk: CapacityRisk = React.useMemo(() => {
    return classifyCapacity(requiredBasis, availableBasis);
  }, [requiredBasis, availableBasis]);

  const worstWindowRisk: WindowCapacityRisk | null = React.useMemo(() => {
    if (!windowCapacity.length) return null;
    const rank = (lvl: CapacityRiskLevel) =>
      lvl === "CRITICAL" ? 5 :
      lvl === "HIGH" ? 4 :
      lvl === "MED" ? 3 :
      lvl === "LOW" ? 2 : 1;

    let best = windowCapacity[0];
    for (const w of windowCapacity) {
      if (rank(w.level) > rank(best.level)) best = w;
      else if (rank(w.level) === rank(best.level) && w.shortageRatio > best.shortageRatio) best = w;
    }
    return best;
  }, [windowCapacity]);

  return (
    <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, marginBottom: 12 }}>
      <div style={{ fontSize: 16, opacity: 0.85, marginBottom: 10 }}>Capacity Risk (Ops)</div>

      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 16 }}>
        <div>Portfolio required: <b>{portfolioRisk.required}</b></div>
        <div>Fleet available: <b>{portfolioRisk.available}</b></div>
        <div>Shortage: <b>{portfolioRisk.shortage}</b></div>
        <div>Ratio: <b>{Math.round(portfolioRisk.shortageRatio * 100)}%</b></div>
        <div>Level: <b>{portfolioRisk.level}</b></div>
      </div>

      {worstWindowRisk ? (
        <div style={{ marginTop: 8, fontSize: 16, opacity: 0.85 }}>
          Worst window: <b>{worstWindowRisk.windowLabel}</b>{" "}
          (req <b>{worstWindowRisk.required}</b>, shortage <b>{worstWindowRisk.shortage}</b>, ratio{" "}
          <b>{Math.round(worstWindowRisk.shortageRatio * 100)}%</b>, level <b>{worstWindowRisk.level}</b>)
        </div>
      ) : (
        <div style={{ marginTop: 8, fontSize: 16, opacity: 0.7 }}>No window requirements found (yet).</div>
      )}

      {(alloc.totalRequired != null || alloc.totalAssigned != null) ? (
        <div style={{ marginTop: 8, fontSize: 16, opacity: 0.6 }}>
          Using Allocation Simulation totals: required={alloc.totalRequired ?? "Ã¢â‚¬â€"}, assigned={alloc.totalAssigned ?? "Ã¢â‚¬â€"}.
        </div>
      ) : null}
    </div>
  );
}














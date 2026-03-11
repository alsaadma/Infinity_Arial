import React from "react";
import { normalizeUiText } from "../core/text/normalizeUiText";
// Link import removed - unused in current Command view
import CapacityRiskPanel from "./command/CapacityRiskPanel";
import ActionPlanPanel from "./command/ActionPlanPanel";
/** ----------------------------
 * Safe sorting: Status -> Severity -> Due (stable)
 * Module-scope helpers (must stay top-level)
 * ----------------------------- */
type _SortRowLike = {
  status?: any;
  severity?: any;
  due?: any;
  dueDate?: any;
  due_at?: any;
  dueAt?: any;
};

function _rankStatus(v: any): number {
  const s = String(v ?? "").trim();
  const rank: Record<string, number> = {
    "Blocked": 0,
    "In Progress": 1,
    "Open": 2,
    "Done": 9,
  };
  return (s in rank) ? rank[s] : 50;
}

function _rankSeverity(v: any): number {
  const s = String(v ?? "").trim();
  const rank: Record<string, number> = {
    "Critical": 0,
    "High": 1,
    "Med": 2,
    "Medium": 2,
    "Low": 3,
  };
  return (s in rank) ? rank[s] : 50;
}

function _parseDue(row: _SortRowLike): number {
  const raw = (row?.due ?? row?.dueDate ?? row?.due_at ?? row?.dueAt);
  if (raw == null || raw === "") return Number.POSITIVE_INFINITY;
  const t =
    raw instanceof Date ? raw.getTime() :
    (typeof raw === "number" ? raw : Date.parse(String(raw)));
  return Number.isFinite(t) ? t : Number.POSITIVE_INFINITY;
}

function _sortActionPlanRowsStable<T extends _SortRowLike>(rows: T[]): T[] {
  const decorated = rows.map((r, i) => ({ r, i }));
  decorated.sort((a, b) => {
    const as = _rankStatus(a.r.status);
    const bs = _rankStatus(b.r.status);
    if (as !== bs) return as - bs;

    const av = _rankSeverity(a.r.severity);
    const bv = _rankSeverity(b.r.severity);
    if (av !== bv) return av - bv;

    const ad = _parseDue(a.r);
    const bd = _parseDue(b.r);
    if (ad !== bd) return ad - bd;

    return a.i - b.i;
  });
  return decorated.map(x => x.r);
}

type Severity = "Critical" | "High" | "Med" | "Low";
type ActionPlanRow = {
  id: string;
  title: string;
  severity?: Severity;
  owner?: string;
  due?: string;
  status?: "Open" | "In Progress" | "Blocked" | "Done";
};

type CommandResult = {
  updatedAt: string;
  summary: {
    windows: number;
    fleetAvailable: number;
    permitsTotal: number;
    permitsReady: number;
  };

  windows?: Array<{ id: string; label: string; required: number; start?: string; end?: string }>;
  actionPlan: ActionPlanRow[];
  notes?: string[];
  maintenanceOverdue?: number;
};

const LS_KEY = "drones_calc.command.result.v1";

function riskBadgeStyle(
  sev: Severity | undefined,
  status: ActionPlanRow["status"] | undefined
): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 999,
    fontSize: 18,
    lineHeight: "18px",
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.85)",
    whiteSpace: "nowrap",
  };

  // Severity baseline
  let border = "1px solid rgba(255,255,255,0.18)";
  let bg = "rgba(255,255,255,0.06)";

  if (sev === "High") {
    border = "1px solid rgba(255,80,80,0.55)";
    bg = "rgba(255,80,80,0.14)";
  } else if (sev === "Med") {
    border = "1px solid rgba(255,200,80,0.55)";
    bg = "rgba(255,200,80,0.14)";
  } else if (sev === "Low") {
    border = "1px solid rgba(120,220,160,0.55)";
    bg = "rgba(120,220,160,0.12)";
  }

  // Status modifier (severity + status).
  // Done should be quiet. Blocked should be loud.
  if (status === "Done") {
    return {
      ...base,
      border: "1px solid rgba(255,255,255,0.12)",
      background: "rgba(255,255,255,0.04)",
      color: "rgba(255,255,255,0.55)",
      opacity: 0.8,
    };
  }

  if (status === "Blocked") {
    // Escalate: even Med/Low becomes attention-worthy
    return {
      ...base,
      border: "1px solid rgba(255,80,80,0.75)",
      background: "rgba(255,80,80,0.22)",
      color: "rgba(255,255,255,0.92)",
      boxShadow: "0 0 0 2px rgba(255,80,80,0.10)",
    };
  }

  if (status === "In Progress") {
    // Slightly stronger than Open
    return {
      ...base,
      border,
      background: bg,
      boxShadow: "0 0 0 1px rgba(255,255,255,0.06)",
    };
  }

  // Open / default
  return { ...base, border, background: bg };
}
function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function loadResult(): CommandResult | null {
  return safeParse<CommandResult>(localStorage.getItem(LS_KEY));
}

function saveResult(result: CommandResult): void {
  localStorage.setItem(LS_KEY, JSON.stringify(result));
}

function clearResult(): void {
  localStorage.removeItem(LS_KEY);
}

function seedSample(): CommandResult {
  const now = new Date().toISOString();
  return {
    updatedAt: now,
    summary: {
      windows: 3,
      fleetAvailable: 1000,
      permitsTotal: 6,
      permitsReady: 2,
    },
    windows: [
      {
        id: "win-riyadh-season",
        label: "Riyadh Season (Oct-Mar)",
        required: 1000,
        start: "2025-10-01",
        end: "2026-03-31",
      },
      {
        id: "win-alula-winter",
        label: "AlUla Winter (Dec-Feb)",
        required: 1000,
        start: "2025-12-01",
        end: "2026-02-28",
      },
      {
        id: "win-jeddah-season",
        label: "Jeddah Season (May-Jun)",
        required: 800,
        start: "2026-05-01",
        end: "2026-06-30",
      },
    ],
    actionPlan: [
      {
        id: "AP-001",
        title: "Confirm winter window sponsor & scope",
        severity: "High",
        owner: "BD",
        due: "2026-03-15",
        status: "Open",
      },
      {
        id: "AP-002",
        title: "Create permit checklist baseline for Riyadh",
        severity: "Med",
        owner: "Ops",
        due: "2026-03-20",
        status: "In Progress",
      },
      {
        id: "AP-003",
        title: "Draft mitigation plan for Riyadh permit delays",
        severity: "Low",
        owner: "Ops",
        due: "2026-03-25",
        status: "Blocked",
      },
      {
        id: "AP-004",
        title: "Escalate sponsor confirmation to executive level",
        severity: "High",
        owner: "BD",
        due: "2026-03-28",
        status: "Blocked",
      },
      {
        id: "AP-005",
        title: "Kick off temperature & wind envelope validation",
        severity: "High",
        owner: "Ops",
        due: "2026-03-10",
        status: "In Progress",
      },
      {
        id: "AP-006",
        title: "Collect vendor quotes for backup batteries",
        severity: "Med",
        owner: "Procurement",
        status: "Open",
      },    ],
    notes: ["Seeded demo data. Replace with Command read model later."],
  };
}

function NoState(props: { onSeed: () => void }) {
  return (
    <div
      style={{
        marginTop: 16,
        padding: 14,
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 12,
      }}
    >
      <div style={{ fontSize: 18, opacity: 0.9, marginBottom: 10 }}>
        No Command state yet.
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={props.onSeed} style={{ padding: "8px 10px", borderRadius: 10 }}>
          Seed sample state
        </button>
      </div>
    </div>
  );
}

function ElseBranch(props: {
  result: CommandResult;
  onReseed: () => void;
  onClear: () => void;
}) {
  const { result } = props;
          
  const __dcHardResetLocal = () => {
    try { localStorage.removeItem(LS_KEY); } catch {}
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        if (k === LS_KEY || k.startsWith("dc:apB:")) keys.push(k);
      }
      for (const k of keys) {
        try { localStorage.removeItem(k); } catch {}
      }
    } catch {}
    try { window.location.reload(); } catch {}
  };
//## APB_CLEAN_DEFS2_BEGIN
        // Action Plan (B) Clean, semi-manual (component-scope, BEFORE JSX)
        type ActionPlanStatus = "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE";
        type ActionPlanRow = {
          id: string;
          title: string;
          detail?: string;
          severity?: string;
          owner?: string;
          due?: string;
          status?: ActionPlanStatus;
          dismissed?: boolean;
        };

        const __dcApKey = (id: string, field: "owner" | "due" | "status" | "dismissed") =>
          "dc:apB:" + field + ":" + id;

        const __dcApRead = (k: string): string | null => {
          try { return localStorage.getItem(k); } catch { return null; }
        };

                const __dcApWrite = (k: string, v: string | null) => {
          try {
            if (v == null || String(v).trim() === "") localStorage.removeItem(k);
            else localStorage.setItem(k, normalizeUiText(v, ""));
          } catch {}
        };

        const __dcApReadBool = (k: string): boolean => {
          const v = __dcApRead(k);
          return v === "1" || v === "true";
        };

        const [__apBumpN, __setApBumpN] = React.useState(0);
        const __dcApBump = () => __setApBumpN(n => n + 1);
        // Live fleet from SQLite backend (falls back to stored value if server offline)
        const [__liveFleet, __setLiveFleet] = React.useState<number | null>(null);
        React.useEffect(() => {
          fetch("/api/fleet/drones/summary")
            .then(r => r.ok ? r.json() : null)
            .then((d: any) => {
              const v = d?.available_for_planning;
              if (typeof v === "number") __setLiveFleet(v);
            })
            .catch(() => { /* server offline - stored value used */ });
        }, []);
        const asNum = (v: any): number | null => {
          const n = Number(v);
          return Number.isFinite(n) ? n : null;
        };

        // Try multiple shapes (seed vs future read model)
        const summary: any = (result as any)?.summary ?? (result as any)?.computed?.summary ?? null;

        const fleetAvailable =
          __liveFleet ??                                      // live SQLite (Module 2)
          asNum(summary?.fleetAvailable) ??                  // stored snapshot fallback
          asNum((result as any)?.fleetAvailable) ??
          asNum((result as any)?.computed?.fleetAvailable) ??
          null;

        //## CAPACITY_RISK_C_BEGIN (window + portfolio)
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
const __classifyCapacity = (requiredN: number, availableN: number): CapacityRisk => {
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
        };

        // Window list discovery (robust). We accept multiple possible shapes until L3 read model exists.
        const windowsAny: any[] = (() => {
          const r: any = result as any;

          const candidates =
            r?.windows ??
            r?.summary?.windows ??
            r?.summary?.windowsList ??
            r?.computed?.windows ??
            r?.calendar?.windows ??
            r?.data?.windows ??
            [];

          if (Array.isArray(candidates)) return candidates;

          return [];
        })();

        // Allocation Simulation (overlap scope)
        const allocSim: any = (() => {
          const r: any = result as any;
          return (
            r?.allocationSimulation ??
            r?.computed?.allocationSimulation ??
            r?.computed?.allocation?.simulation ??
            r?.projection?.allocationSimulation ??
            r?.calendar?.allocationSimulation ??
            r?.summary?.allocationSimulation ??
            null
          );
        })();

        const allocRows: any[] = (() => {
          const s: any = allocSim;
          const c =
            s?.rows ??
            s?.table ??
            s?.windows ??
            s?.items ??
            s?.data ??
            [];
          return Array.isArray(c) ? c : [];
        })();

        const allocTotalRequired =
          asNum(allocSim?.totalRequired) ??
          asNum(allocSim?.total_required) ??
          asNum(allocSim?.requiredTotal) ??
          asNum(allocSim?.required_total) ??
          asNum(allocSim?.totals?.required) ??
          null;

        const allocTotalAssigned =
          asNum(allocSim?.totalAssigned) ??
          asNum(allocSim?.total_assigned) ??
          asNum(allocSim?.assignedTotal) ??
          asNum(allocSim?.assigned_total) ??
          asNum(allocSim?.totals?.assigned) ??
          null;

        const __asAssigned = (w: any): number | null => {
          const v =
            asNum(w?.assigned) ??
            asNum(w?.allocated) ??
            asNum(w?.alloc) ??
            asNum(w?.used) ??
            asNum(w?.capacityUsed) ??
            asNum(w?.dronesAssigned);
          return (v == null || !isFinite(v)) ? null : v;
        };
const __asReq = (w: any): number | null => {
          const v =
            asNum(w?.required) ??
            asNum(w?.req) ??
            asNum(w?.drones) ??
            asNum(w?.droneCount) ??
            asNum(w?.drone_count);
          return (v == null || !isFinite(v)) ? null : v;
        };

        const windowCapacity: WindowCapacityRisk[] = React.useMemo(() => {
          const av = Number(fleetAvailable || 0);
          const out: WindowCapacityRisk[] = [];
          for (const w of (windowsAny || [])) {
            const req = __asReq(w);
            if (req == null) continue;
            const id = String(w?.id ?? w?.key ?? w?.windowId ?? w?.name ?? "window").trim() || "window";
                        const label = normalizeUiText(w?.label ?? w?.title ?? w?.name ?? id) || id;
            const c = __classifyCapacity(req, av);
            out.push({ windowId: id, windowLabel: label, ...c });
          }
          return out;
        }, [fleetAvailable, result]);
        const __asTime = (x: any): number | null => {
          if (x == null || x === "") return null;
          const t = Date.parse(String(x));
          return Number.isFinite(t) ? t : null;
        };

        const __peakOverlapRequired = (rows: any[]): number => {
          // Sweep line: +required at start, -required at end. End is exclusive.
          // If dates are missing, fallback to SUM (conservative).
          if (!Array.isArray(rows) || rows.length === 0) return 0;

          type Ev = { t: number; d: number };
          const evs: Ev[] = [];
          let fallbackSum = 0;
          let hasAnyTime = false;

          for (const w of rows) {
            const req = __asReq(w) ?? 0;
            if (req <= 0) continue;
            fallbackSum += req;

            const s = __asTime(w?.start ?? w?.from ?? w?.startDate);
            const e = __asTime(w?.end ?? w?.to ?? w?.endDate);
            if (s == null || e == null) continue;
            hasAnyTime = true;

            // Ensure start <= end
            const a = Math.min(s, e);
            const b = Math.max(s, e);
            evs.push({ t: a, d: +req });
            evs.push({ t: b, d: -req });
          }

          if (!hasAnyTime || evs.length === 0) return fallbackSum;

          // Sort by time, with removals before additions at same timestamp (end exclusive)
          evs.sort((x, y) => (x.t - y.t) || (x.d - y.d));

          let cur = 0;
          let peak = 0;
          for (const ev of evs) {
            cur += ev.d;
            if (cur > peak) peak = cur;
          }
          return peak;
        };

        const portfolioRequired = React.useMemo(() => {
          // Option A: If Allocation Simulation totals exist, they represent overlap-scope demand (primary truth).
          const r = allocTotalRequired;


        // DC_UNUSED_ALLOC_VARS_BEGIN (keeps build clean; safe no-op reads)

        void allocRows;

        void allocTotalAssigned;

        void __asAssigned;

        void windowCapacity;

        void portfolioRequired;

        // DC_UNUSED_ALLOC_VARS_END

          if (r != null) return r;

          // Fallback (until alloc sim exists): peak concurrent demand across overlapping windows.
          return __peakOverlapRequired(windowsAny || []);
        }, [allocTotalRequired, result]);
//## CAPACITY_RISK_C_END

        const __apSuggested: ActionPlanRow[] = React.useMemo(() => {
  const out: ActionPlanRow[] = [];

  const push = (r: Partial<ActionPlanRow>) => {
    const id = String(r.id ?? "").trim();
    if (!id) return;
    out.push({
      id,
      title: String(r.title ?? "Action").trim(),
      detail: r.detail != null ? String(r.detail) : undefined,
      severity: r.severity != null ? String(r.severity) : undefined,
    });
  };
  const permitsTotal =
    asNum(summary?.permitsTotal) ??
    asNum((result as any)?.permitsTotal) ??
    asNum((result as any)?.computed?.permitsTotal) ??
    null;

  const permitsReady =
    asNum(summary?.permitsReady) ??
    asNum((result as any)?.permitsReady) ??
    asNum((result as any)?.computed?.permitsReady) ??
    null;

  // Permit actions (only if counts exist and indicate missing)
  if (permitsTotal != null && permitsReady != null && permitsTotal > permitsReady) {
    const missing = Math.max(0, permitsTotal - permitsReady);
    push({
      id: "permits:missing",
      title: "Close permit readiness gaps",
      detail: `Permits ready: ${permitsReady}/${permitsTotal} (missing: ${missing}). Review permit pipeline and assign owners.`,
      severity: missing >= 3 ? "HIGH" : "MED",
    });
  }

  // Shortage actions if we can infer "required"
  /* DC_CAPRISK_C_AP_DISABLED_BEGIN

  if (portfolioRisk.level === "MED" || portfolioRisk.level === "HIGH" || portfolioRisk.level === "CRITICAL") {
    const sev = (portfolioRisk.level === "CRITICAL" || portfolioRisk.level === "HIGH") ? "HIGH" :
                (portfolioRisk.level === "MED") ? "MED" : "LOW";
    push({
      id: "fleet:portfolio",
      title: "Resolve fleet capacity shortage (portfolio)",
      detail: `Portfolio required: ${portfolioRisk.required}, available: ${portfolioRisk.available} (shortage: ${portfolioRisk.shortage}, ratio: ${Math.round(portfolioRisk.shortageRatio * 100)}%).`,
      severity: sev,
    });
  }

  DC_CAPRISK_C_AP_DISABLED_END */
  /* DC_CAPRISK_C_AP_DISABLED_BEGIN


  if (worstWindowRisk && (worstWindowRisk.level === "HIGH" || worstWindowRisk.level === "CRITICAL")) {
    push({
      id: "fleet:window:" + worstWindowRisk.windowId,
      title: `Resolve shortage: ${worstWindowRisk.windowLabel}`,
      detail: `Window required: ${worstWindowRisk.required}, available: ${worstWindowRisk.available} (shortage: ${worstWindowRisk.shortage}, ratio: ${Math.round(worstWindowRisk.shortageRatio * 100)}%).`,
      severity: "HIGH",
    });
  }

  DC_CAPRISK_C_AP_DISABLED_END */

  // Look for risk-like arrays
  const risks: any[] =
    (summary?.risks ?? (result as any)?.risks ?? (result as any)?.computed?.risks ?? []) as any[];

  for (const r of risks) {
    const rid = String(r?.id ?? r?.riskId ?? "").trim();
    if (!rid) continue;
    const sev = String(r?.severity ?? r?.sev ?? r?.level ?? "").trim();
    push({
      id: "risk:" + rid,
      title: String(r?.title ?? r?.name ?? "Risk item"),
      detail: r?.detail ?? r?.description ?? "",
      severity: sev || undefined,
    });
  }

  // Look for gap-like arrays
  const gaps: any[] =
    (summary?.gaps ?? (result as any)?.gaps ?? (result as any)?.computed?.gaps ?? []) as any[];

  for (const g of gaps) {
    const gid = String(g?.id ?? g?.gapId ?? "").trim();
    if (!gid) continue;
    const sev = String(g?.severity ?? g?.sev ?? g?.level ?? "").trim();
    push({
      id: "gap:" + gid,
      title: String(g?.title ?? g?.name ?? "Gap item"),
      detail: g?.detail ?? g?.description ?? "",
      severity: sev || undefined,
    });
  }

  // Dedupe
  const seen = new Set<string>();
  return out.filter(x => (seen.has(x.id) ? false : (seen.add(x.id), true)));
}, [result]);

const actionPlanMerged: ActionPlanRow[] = React.useMemo(() => {
          void __apBumpN;

          const merged = __apSuggested.map(r => {
            const owner = __dcApRead(__dcApKey(r.id, "owner")) ?? "";
            const due = __dcApRead(__dcApKey(r.id, "due")) ?? "";
            const statusRaw = (__dcApRead(__dcApKey(r.id, "status")) ?? "TODO").toUpperCase();
            const status: ActionPlanStatus =
              statusRaw === "IN_PROGRESS" ? "IN_PROGRESS" :
              statusRaw === "BLOCKED" ? "BLOCKED" :
              statusRaw === "DONE" ? "DONE" : "TODO";

            const dismissed = __dcApReadBool(__dcApKey(r.id, "dismissed"));

            return { ...r, owner: owner || undefined, due: due || undefined, status, dismissed };
          });

          return merged.filter(x => !x.dismissed);
        }, [__apSuggested, __apBumpN]);
        const [apView, setApView] = React.useState<"OPS" | "EXEC">("OPS");

        const apSorted: ActionPlanRow[] = React.useMemo(() => {
          return _sortActionPlanRowsStable((actionPlanMerged ?? []) as any) as any;
        }, [actionPlanMerged]);

        const apExecTop: ActionPlanRow[] = React.useMemo(() => {
          return (apSorted ?? []).slice(0, 3);
        }, [apSorted]);
        //## APB_CLEAN_DEFS2_END
return (
    <div style={{ marginTop: 16 }}>
      <div
        style={{
          padding: 14,
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 12,
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 18, opacity: 0.85 }}>Command snapshot</div>
            <div style={{ fontSize: 18, opacity: 0.7, marginTop: 4 }}>
              Updated: <b>{result.updatedAt}</b>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={props.onReseed} style={{ padding: "8px 10px", borderRadius: 10 }}>
              Reseed sample
            </button>
            <button onClick={props.onClear} style={{ padding: "8px 10px", borderRadius: 10 }}>
              Clear state
            </button>
            <button onClick={() => __dcHardResetLocal()} style={{ padding: "8px 10px", borderRadius: 10 }}>
              Hard reset local
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          padding: 14,
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 12,
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 18, opacity: 0.85, marginBottom: 10 }}>Summary</div>

        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 18 }}>
          <div>
            Windows: <b>{result.summary.windows}</b>
          </div>
          <div>
            Fleet available: <b>{fleetAvailable ?? result.summary.fleetAvailable}</b>
          </div>
          <div>
            Permits:{" "}
            <b>
              {result.summary.permitsReady}/{result.summary.permitsTotal}
            </b>
          </div>
          {((result as any).maintenanceOverdue ?? 0) > 0 && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 12px", borderRadius: 8, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.40)", color: "#ef4444", fontSize: 13, fontWeight: 700, marginLeft: 8 }}>
              ⚠ {(result as any).maintenanceOverdue} overdue service{(result as any).maintenanceOverdue !== 1 ? "s" : ""}
            </div>
          )}

      {/* DC_CAPRISK_PANEL_BEGIN */}
<CapacityRiskPanel result={result} />
{/* DC_CAPRISK_PANEL_END */}

        </div>
      </div>

      <div
        style={{
          padding: 14,
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 12,
          marginBottom: 12,
        }}
      >
      {/* //## ACTION_PLAN_UI_BEGIN */}
      <ActionPlanPanel ctx={{ apView, setApView, __apSuggested, actionPlanMerged, apSorted, apExecTop, __dcApWrite, __dcApKey, __dcApBump, riskBadgeStyle }} />
{/* //## ACTION_PLAN_UI_END */}


      {result.notes && result.notes.length > 0 ? (
        <div
          style={{
            padding: 14,
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 12,
          }}
        >
          <div style={{ fontSize: 18, opacity: 0.85, marginBottom: 10 }}>Notes</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {result.notes.map((n, idx) => (
              <li key={idx} style={{ fontSize: 18, opacity: 0.85, marginBottom: 6 }}>
                {n}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div />
      )}
    </div>
  
      </div>
    );
}

export default function Command() {
  const [result, setResult] = React.useState<CommandResult | null>(() => loadResult());

  const onSeed = React.useCallback(() => {
    const r = seedSample();
    saveResult(r);
    setResult(r);
  }, []);

  const onClear = React.useCallback(() => {
    clearResult();
    setResult(null);
  }, []);

  // Live fetch: shows + permits -> real permit readiness counts.
  // Runs on mount and refreshes every 60 seconds.
  // Falls back gracefully if server is offline.
  React.useEffect(() => {
    function fetchLiveData() {
      Promise.all([
        fetch("/api/shows").then(r => r.ok ? r.json() : null),
        fetch("/api/permits").then(r => r.ok ? r.json() : null),
        fetch("/api/maintenance/alerts").then(r => r.ok ? r.json() : null),
      ])
        .then(([showsData, permitsData, alertsData]: [any, any, any]) => {
          // -- Shows -> windows ----------------------------
          const showItems: any[] = Array.isArray(showsData?.items) ? showsData.items : [];
          const upcoming = showItems.filter((s: any) =>
            s.status !== "COMPLETED" && s.status !== "CANCELLED"
          );
          const windows = upcoming.map((s: any) => ({
            id:       String(s.id),
            label:    String(s.name) + (s.venue ? ` \u2014 ${s.venue}` : "") + ` (${s.date})`,
            required: Number(s.drones_required) || 0,
            start:    String(s.date),
          }));

          // -- Permits -> readiness counts ------------------
          const permitItems: any[] = Array.isArray(permitsData?.items) ? permitsData.items : [];
          const permitsTotal = permitItems.filter((p: any) =>
            p.status !== "EXPIRED" && p.status !== "REJECTED"
          ).length;
          const permitsReady = permitItems.filter((p: any) =>
            p.status === "APPROVED"
          ).length;

          const overdueCount: number = (alertsData?.alerts ?? []).length;
          const synthetic: CommandResult = {
            updatedAt: new Date().toISOString(),
            summary: {
              windows:        upcoming.length,
              fleetAvailable: 0,   // overridden live by __liveFleet in ElseBranch
              permitsTotal,
              permitsReady,
            },
            windows,
            maintenanceOverdue: overdueCount,
            actionPlan: [],
            notes: upcoming.length > 0
              ? [`Live data \u2014 ${upcoming.length} show(s), ${permitsReady}/${permitsTotal} permits approved.`]
              : ["No upcoming shows found. Add shows via the Shows page."],
          };
          setResult(synthetic);
        })
        .catch(() => { /* server offline \u2014 stored state retained */ });
    }

    fetchLiveData();                              // immediate on mount
    const timer = setInterval(fetchLiveData, 60_000); // then every 60s
    return () => clearInterval(timer);            // cleanup on unmount
  }, []);

  return (
    <div style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>Command</div>
          <div style={{ fontSize: 18, opacity: 0.7, marginTop: 2 }}>
            Read-only projection (safe placeholder)
          </div>
        </div>


      </div>

      <div style={{ marginTop: 16 }}>
        {!result ? (
          <NoState onSeed={onSeed} />
        ) : (
          <ElseBranch result={result} onReseed={onSeed} onClear={onClear} />
        )}
      </div>
    </div>
  );
}


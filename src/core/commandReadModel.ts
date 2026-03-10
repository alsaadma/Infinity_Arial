export type CommandGroupMode = "DOMINANCE" | "NONE";
export type CommandGapStatus = "Open" | "In Progress" | "Mitigated";

export type EngineSnapshotLike = {
  computedAtISO?: string | null;
  result?: any;
} | null;

export type CommandActionRow = {
  gapId: string;
  gapLabel: string;
  domainKey: string;
  domainLabel: string;
  ownerSuggested: string;
  dominanceKey: number;
  raw: any;
};

export type CommandActionGroup = {
  key: number;
  title: string;
  severity: "CRITICAL" | "HIGH" | "OTHER";
  offset: number;
  rows: CommandActionRow[];
};

export type CommandReadModel = {
  meta: { version: "v1"; computedAtISO: string | null };
  headline: { readiness: string; gapsCount: number; reliabilityIndex: number };
  actionPlan: { groupMode: CommandGroupMode; groups: CommandActionGroup[] };
};

// ---- pure helpers (no localStorage, no React) ----
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function computeReliabilityIndex(readiness: string | undefined, gapsCount: number) {
  const r = (readiness || "UNKNOWN").toUpperCase();
  const base = r === "READY" ? 90 : r === "NOT_READY" ? 55 : 65;
  const penalty = gapsCount * 4;
  return clamp(Math.round(base - penalty), 0, 100);
}

export function labelDomain(raw: any): string {
  const k = String(raw ?? "").trim();
  if (!k) return "-";
  const map: Record<string, string> = {
    DRONES_AVAILABILITY: "Drone availability (fleet capacity vs required)",
    CHARGING_CAPACITY: "Charging capacity (turnaround bottleneck)",
  };
  return map[k] ?? k;
}

export function labelGap(raw: any): string {
  const k = String(raw ?? "").trim();
  if (!k) return "-";
  const map: Record<string, string> = {
    "GAP-DRONES-AVAIL": "Insufficient drones available for window",
    "GAP-CHARGING": "Charging capacity limits turnaround",
  };
  return map[k] ?? k;
}

export function gapId(g: any, idx: number) {
  return String(g?.id ?? g?.gap_id ?? g?.code ?? ("gap_" + idx));
}

export function dominanceKeyFor(g: any): number {
  const dk = String(g?.domain ?? g?.category ?? g?.type ?? "").trim();
  if (dk === "DRONES_AVAILABILITY") return 0; // P0
  if (dk === "CHARGING_CAPACITY") return 2;   // P1
  return 6;
}

export function dominanceTitle(k: number): string {
  if (k === 0) return "P0 · Blocker";
  if (k === 2) return "P1 · Blocker";
  return "Other";
}

export function dominanceSeverity(title: string): "CRITICAL" | "HIGH" | "OTHER" {
  return title.startsWith("P0") ? "CRITICAL" : title.startsWith("P1") ? "HIGH" : "OTHER";
}

export function suggestOwner(domainLabel: string, rawOwner: any): string {
  const o = String(rawOwner ?? "").trim();
  if (o.length && o !== "-") return o;
  const defaults: Record<string, string> = {
    "Drone availability (fleet capacity vs required)": "Fleet/Ops",
    "Charging capacity (turnaround bottleneck)": "Ops",
  };
  return defaults[domainLabel] ?? "-";
}

export function buildCommandReadModel(snap: EngineSnapshotLike, groupMode: CommandGroupMode): CommandReadModel {
  const result = snap?.result;
  const gaps = (result?.gaps_ranked ?? []).slice(0, 20);

  const readiness = String((result?.readiness as any) ?? "UNKNOWN");
  const gapsCount = gaps.length;
  const reliabilityIndex = computeReliabilityIndex(readiness, gapsCount);

  // normalize rows once
  const rows: CommandActionRow[] = gaps.map((g: any, idx: number) => {
    const dKey = String(g?.domain ?? g?.category ?? g?.type ?? "").trim() || "-";
    const dLabel = labelDomain(dKey);
    const gLabel = labelGap(g?.title ?? g?.name ?? g?.label ?? (g?.id ?? g?.category ?? "-"));
    return {
      gapId: gapId(g, idx),
      gapLabel: gLabel,
      domainKey: dKey,
      domainLabel: dLabel,
      ownerSuggested: suggestOwner(dLabel, g?.owner_suggestion ?? g?.owner ?? g?.team),
      dominanceKey: dominanceKeyFor(g),
      raw: g,
    };
  });

  let groups: CommandActionGroup[] = [];

  if (groupMode === "NONE") {
    groups = [{
      key: 999,
      title: "All actions",
      severity: "OTHER",
      offset: 0,
      rows,
    }];
  } else {
    const map = new Map<number, CommandActionRow[]>();
    for (const r of rows) {
      if (!map.has(r.dominanceKey)) map.set(r.dominanceKey, []);
      map.get(r.dominanceKey)!.push(r);
    }
    const keys = Array.from(map.keys()).sort((a, b) => a - b);
    let off = 0;
    groups = keys.map((k) => {
      const title = dominanceTitle(k);
      const rs = map.get(k)!;
      const out: CommandActionGroup = {
        key: k,
        title,
        severity: dominanceSeverity(title),
        offset: off,
        rows: rs,
      };
      off += rs.length;
      return out;
    });
  }

  return {
    meta: { version: "v1", computedAtISO: snap?.computedAtISO ?? null },
    headline: { readiness, gapsCount, reliabilityIndex },
    actionPlan: { groupMode, groups },
  };
}
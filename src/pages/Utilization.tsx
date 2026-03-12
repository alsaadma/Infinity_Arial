import { useEffect, useState } from "react";

type UtilSummary = {
  computed_at: string;
  fleet: { total: number; active: number; maintenance: number; retired: number; idle: number };
  shows: { upcoming: number; total_drones_needed: number; overbooked: number };
  utilization: { drone_utilization_pct: number; battery_stress_pct: number | null; critical_batteries: number };
  schema_coverage: { drone_status: boolean; battery_cycles: boolean; show_demand: boolean };
};
type MonthRow = { month: string; show_count: number; drones_allocated: number; peak_show_size: number; utilization_pct: number; overbooked: boolean };
type MonthData = { capacity_per_month: number; months: MonthRow[]; note?: string };


function KpiCard({ label, value, unit, sub, color, warn }: {
  label: string; value: string | number; unit?: string; sub?: string; color?: string; warn?: boolean;
}) {
  return (
    <div style={{ background: warn ? "rgba(255,100,80,0.10)" : "rgba(255,255,255,0.05)", border: "1px solid " + (warn ? "rgba(255,100,80,0.40)" : "rgba(255,255,255,0.10)"), borderRadius: 12, padding: "18px 22px", minWidth: 160, flex: "1 1 160px" }}>
      <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 900, color: color ?? (warn ? "#ff6450" : "inherit"), lineHeight: 1 }}>
        {value}{unit && <span style={{ fontSize: 14, fontWeight: 400, opacity: 0.7, marginLeft: 4 }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize: 11, opacity: 0.55, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function UtilBar({ pct, overbooked }: { pct: number; overbooked: boolean }) {
  const bg = overbooked ? "#ff6450" : pct >= 80 ? "#f0a500" : "#4caf82";
  return (
    <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 4, height: 8, width: "100%", overflow: "hidden" }}>
      <div style={{ width: Math.min(pct, 100) + "%", height: "100%", background: bg, borderRadius: 4 }} />
    </div>
  );
}

export default function Utilization() {
  const [summary, setSummary] = useState<UtilSummary | null>(null);
  const [monthly, setMonthly] = useState<MonthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/utilization/summary").then(r => r.json()) as Promise<UtilSummary>,
      fetch("/api/utilization/monthly").then(r => r.json()) as Promise<MonthData>,
    ])
      .then(([s, m]) => { setSummary(s); setMonthly(m); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  const s = summary;
  const pill = (text: string, color: string, bg: string, bd: string) => (
    <span style={{ background: bg, border: "1px solid " + bd, borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 800, color }}>{text}</span>
  );

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1100, margin: "0 auto" }}>
      <h2 style={{ margin: "0 0 4px", fontWeight: 900, fontSize: 22 }}>Utilization &amp; Capacity Planning</h2>
      <p style={{ margin: "0 0 24px", opacity: 0.55, fontSize: 13 }}>Module 7 - Fleet load, battery stress, monthly demand heatmap</p>

      {loading && <p style={{ opacity: 0.6 }}>Loading...</p>}
      {error && <div style={{ background: "rgba(255,60,60,0.12)", border: "1px solid rgba(255,60,60,0.35)", borderRadius: 8, padding: "12px 16px", color: "#ff7b7b", fontSize: 13 }}>{error}</div>}

      {s && (
        <>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 28 }}>
            <KpiCard label="Fleet Utilization"  value={s.utilization.drone_utilization_pct} unit="%" sub={s.shows.total_drones_needed + " needed / " + s.fleet.active + " active"} warn={s.utilization.drone_utilization_pct > 90} />
            <KpiCard label="Active Drones"      value={s.fleet.active}      sub={s.fleet.maintenance + " maintenance - " + s.fleet.retired + " retired"} color="#4caf82" />
            <KpiCard label="Idle Drones"         value={s.fleet.idle}        sub="Active not committed to upcoming shows" color="#7eb8f7" />
            <KpiCard label="Overbooked Shows"   value={s.shows.overbooked}  sub={"of " + s.shows.upcoming + " upcoming"} warn={s.shows.overbooked > 0} />
            {s.utilization.battery_stress_pct !== null && (
              <KpiCard label="Avg Battery Stress" value={s.utilization.battery_stress_pct ?? "—"} unit="%" sub={s.utilization.critical_batteries + " batteries >=80% life used"} warn={(s.utilization.battery_stress_pct ?? 0) > 70} />
            )}
          </div>

          {(!s.schema_coverage.show_demand || !s.schema_coverage.battery_cycles) && (
            <div style={{ background: "rgba(240,165,0,0.08)", border: "1px solid rgba(240,165,0,0.30)", borderRadius: 8, padding: "10px 14px", fontSize: 12, marginBottom: 20 }}>
              ⚠️  Partial data:{" "}
              {!s.schema_coverage.show_demand    && "show_event.drones_required not found. "}
              {!s.schema_coverage.battery_cycles && "battery_unit.cycle_count/max_cycles not found."}
            </div>
          )}

          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 12, padding: "18px 22px", marginBottom: 24 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>Fleet Status Breakdown</h3>
            {([["Active", s.fleet.active, "#4caf82"], ["Maintenance", s.fleet.maintenance, "#f0a500"], ["Retired/Damaged", s.fleet.retired, "#888"]] as [string, number, string][]).map(([lbl, val, clr]) => (
              <div key={lbl} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
                <div style={{ width: 140, fontSize: 13, opacity: 0.8 }}>{lbl}</div>
                <div style={{ flex: 1, background: "rgba(255,255,255,0.08)", borderRadius: 4, height: 10, overflow: "hidden" }}>
                  <div style={{ width: s.fleet.total > 0 ? (val / s.fleet.total * 100) + "%" : "0%", height: "100%", background: clr, borderRadius: 4 }} />
                </div>
                <div style={{ width: 60, textAlign: "right", fontSize: 13, fontWeight: 700 }}>{val}</div>
              </div>
            ))}
            <div style={{ fontSize: 12, opacity: 0.45, marginTop: 6 }}>Total fleet: {s.fleet.total} drones</div>
          </div>
        </>
      )}

      {monthly && (
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 12, padding: "18px 22px" }}>
          <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700 }}>6-Month Capacity Heatmap</h3>
          <p style={{ margin: "0 0 16px", fontSize: 12, opacity: 0.5 }}>Fleet capacity: {monthly.capacity_per_month} active drones per month</p>
          {monthly.note && <p style={{ fontSize: 12, opacity: 0.55, fontStyle: "italic" }}>{monthly.note}</p>}
          {monthly.months.length === 0 && !monthly.note && <p style={{ fontSize: 13, opacity: 0.5 }}>No scheduled shows in the next 6 months.</p>}
          {monthly.months.length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ opacity: 0.55, fontSize: 11 }}>
                  {["Month","Shows","Drones","Peak","Utilization","Status"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "6px 10px", borderBottom: "1px solid rgba(255,255,255,0.08)", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthly.months.map(m => (
                  <tr key={m.month} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "10px 10px", fontWeight: 700 }}>{m.month}</td>
                    <td style={{ padding: "10px 10px", opacity: 0.8 }}>{m.show_count}</td>
                    <td style={{ padding: "10px 10px", opacity: 0.8 }}>{m.drones_allocated}</td>
                    <td style={{ padding: "10px 10px", opacity: 0.8 }}>{m.peak_show_size}</td>
                    <td style={{ padding: "10px 10px", minWidth: 180 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <UtilBar pct={m.utilization_pct} overbooked={m.overbooked} />
                        <span style={{ width: 40, fontSize: 12, fontWeight: 700 }}>{m.utilization_pct}%</span>
                      </div>
                    </td>
                    <td style={{ padding: "10px 10px" }}>
                      {m.overbooked
                        ? pill("OVERBOOKED", "#ff8070", "rgba(255,100,80,0.18)", "rgba(255,100,80,0.45)")
                        : m.utilization_pct >= 80
                          ? pill("HIGH",       "#f0c040", "rgba(240,165,0,0.15)",  "rgba(240,165,0,0.40)")
                          : pill("OK",          "#4caf82", "rgba(76,175,130,0.12)", "rgba(76,175,130,0.35)")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div style={{ marginTop: 12, fontSize: 11, opacity: 0.4 }}>
            Computed: {summary?.computed_at ? new Date(summary.computed_at).toLocaleString() : "—"}
          </div>
        </div>
      )}
    </div>
  );
}
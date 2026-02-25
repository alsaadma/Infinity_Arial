import { Link } from "react-router-dom";
import { useEngineSnapshot } from "../state/engineSnapshot";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function computeReliabilityIndex(readiness: string | undefined, gapsCount: number) {
  const r = (readiness || "UNKNOWN").toUpperCase();
  const base = r === "READY" ? 90 : r === "NOT_READY" ? 55 : 65;
  const penalty = gapsCount * 4;
  return clamp(Math.round(base - penalty), 0, 100);
}

export default function Command() {
  const snap = useEngineSnapshot();
  const result = snap?.result;
  const gapsCount = result?.gaps_ranked?.length ?? 0;
  const readiness = (result?.readiness as string | undefined) ?? "UNKNOWN";
  const reliabilityIndex = computeReliabilityIndex(readiness, gapsCount);

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>Command</h1>
          <div style={{ opacity: 0.75, marginTop: 6 }}>
            Read-only operational view (no JSON input)
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to="/quote-builder">Quote Builder</Link>
          <span style={{ opacity: 0.4 }}>|</span>
          <Link to="/fleet">Fleet</Link>
          <Link to="/calendar">Calendar</Link>
          <Link to="/reports">Reports</Link>
        </div>
      </div>

      {!result ? (
        <div style={{ marginTop: 18, padding: 14, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10 }}>
          <div style={{ fontWeight: 600 }}>No computed state yet</div>
          <div style={{ opacity: 0.8, marginTop: 6 }}>
            Go to <Link to="/quote-builder">Quote Builder</Link>, run Compute, then return here.
          </div>
        </div>
      ) : (
        <>
          <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
            <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10 }}>
              <div style={{ fontWeight: 700 }}>Fleet Summary (mock)</div>
              <div style={{ marginTop: 10, lineHeight: 1.7, opacity: 0.9 }}>
                <div>Fleet size: {result.fleet?.fleet_size ?? "-"}</div>
                <div>Expected shows/year: {result.fleet?.expected_shows_per_year ?? "-"}</div>
                <div>CAPEX (SAR): {result.fleet?.capex_sar ?? "-"}</div>
              </div>
              <div style={{ marginTop: 10, opacity: 0.7, fontSize: 12 }}>
                (Will be replaced by real engine fleet outputs)
              </div>
            </div>

            <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10 }}>
              <div style={{ fontWeight: 700 }}>Reliability Index</div>
              <div style={{ marginTop: 10, fontSize: 34, fontWeight: 800 }}>
                {reliabilityIndex}
                <span style={{ fontSize: 14, opacity: 0.7, marginLeft: 8 }}>/ 100</span>
              </div>
              <div style={{ marginTop: 6, opacity: 0.85 }}>
                Readiness: <b>{readiness}</b> · Gaps: <b>{gapsCount}</b>
              </div>
            </div>

            <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10 }}>
              <div style={{ fontWeight: 700 }}>Permits (placeholder)</div>
              <div style={{ marginTop: 10, opacity: 0.85 }}>
                GACA / city permits panel placeholder
              </div>
            </div>

            <div style={{ padding: 14, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10 }}>
              <div style={{ fontWeight: 700 }}>Calendar (placeholder)</div>
              <div style={{ marginTop: 10, opacity: 0.85 }}>
                Ops calendar placeholder (shows + mobilization)
              </div>
            </div>
          </div>

          <div style={{ marginTop: 18, padding: 14, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10 }}>
            <div style={{ fontWeight: 800, marginBottom: 10 }}>Action Plan (basic list)</div>

            {gapsCount === 0 ? (
              <div style={{ opacity: 0.8 }}>No gaps in the last computed result.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ textAlign: "left", opacity: 0.9 }}>
                      <th style={{ padding: "8px 6px" }}>#</th>
                      <th style={{ padding: "8px 6px" }}>Gap</th>
                      <th style={{ padding: "8px 6px" }}>Domain</th>
                      <th style={{ padding: "8px 6px" }}>Owner (suggested)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(result.gaps_ranked ?? []).slice(0, 20).map((g, idx) => (
                      <tr key={(g.id ?? "gap") + "_" + idx} style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                        <td style={{ padding: "8px 6px", opacity: 0.85 }}>{idx + 1}</td>
                        <td style={{ padding: "8px 6px" }}>{g.title ?? "-"}</td>
                        <td style={{ padding: "8px 6px", opacity: 0.85 }}>{g.domain ?? "-"}</td>
                        <td style={{ padding: "8px 6px", opacity: 0.85 }}>{g.owner_suggestion ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ marginTop: 8, opacity: 0.65, fontSize: 12 }}>
                  Note: Risk dominance grouping will be wired in Step 2+ by reusing your existing ActionPlanTable styling.
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 10, opacity: 0.6, fontSize: 12 }}>
            Last computed: {snap?.computedAtISO ?? "-"}
          </div>
        </>
      )}
    </div>
  );
}
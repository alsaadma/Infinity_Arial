import { useState, useEffect, useCallback } from "react";
import { useAssetAuth, type AssetSession } from "../hooks/useAssetAuth";

interface CostingSummary {
  ok: boolean;
  config: { useful_life_years: number; expected_shows_per_year: number; residual_value_pct: number };
  fleet: { active_drones_with_price: number; active_batteries_with_price: number };
  depreciation: {
    drone_avg_cost_sar: number; drone_dep_per_show_sar: number;
    battery_avg_cost_sar: number; battery_dep_per_show_sar: number;
  };
  maintenance: { total_last_12m_sar: number; per_show_sar: number };
  cost_floor_per_show_sar: number;
}
interface MaintItem {
  id: string; asset_type: string; asset_id: string;
  cost_sar: number; event_date: string;
  description: string | null; created_by: string | null;
}

const CARD   = "#111E35";
const BDR    = "rgba(255,255,255,0.08)";
const ACCENT = "#4A9EFF";
const TEXT   = "#F0F4FF";
const MUTED  = "#8FA3C0";
const RED    = "#E53935";
const GREEN  = "#43A047";
const ORANGE = "#FB8C00";
const GOLD   = "#F9A825";

const inp: React.CSSProperties = {
  background: "#1A2A44", border: `1px solid ${BDR}`, borderRadius: 8,
  color: TEXT, padding: "9px 14px", fontSize: 14, outline: "none",
  width: "100%", boxSizing: "border-box",
};
const th: React.CSSProperties = {
  textAlign: "left", padding: "10px 14px", color: MUTED, fontWeight: 600,
  fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5,
  borderBottom: `1px solid ${BDR}`,
};
const td: React.CSSProperties = { padding: "10px 14px", verticalAlign: "middle" };
const tbl: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 14, color: TEXT };

function Btn({ onClick, disabled, danger, small, children }: {
  onClick: () => void; disabled?: boolean; danger?: boolean;
  small?: boolean; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: disabled ? "#1A2A44"
        : danger ? "rgba(229,57,53,0.15)"
        : "linear-gradient(135deg,#1B4FD8,#4A9EFF)",
      border: danger ? "1px solid rgba(229,57,53,0.35)" : "none",
      borderRadius: 8, color: disabled ? MUTED : danger ? RED : "#fff",
      padding: small ? "5px 12px" : "8px 18px",
      fontSize: small ? 12 : 13, fontWeight: 600,
      cursor: disabled ? "not-allowed" : "pointer", whiteSpace: "nowrap" as const,
    }}>{children}</button>
  );
}

function LoginGate({ onLogin }: {
  onLogin: (e: string, p: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [email, setEmail]       = useState("admin@infinity.local");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [busy, setBusy]         = useState(false);
  async function submit() {
    setBusy(true); setError("");
    const r = await onLogin(email, password);
    if (!r.ok) setError(r.error ?? "Login failed");
    setBusy(false);
  }
  return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
      <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 14,
                    padding: 40, width: 380, boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, margin: "0 auto 14px",
                        background: "linear-gradient(135deg,#1B4FD8,#7C4DFF)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 24 }}>💰</div>
          <h2 style={{ margin: 0, color: TEXT, fontWeight: 700, fontSize: 20 }}>Costing & Depreciation</h2>
          <p style={{ margin: "8px 0 0", color: MUTED, fontSize: 13 }}>Authentication required</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Email" style={inp} onKeyDown={e => e.key === "Enter" && submit()} />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Password" style={inp} onKeyDown={e => e.key === "Enter" && submit()} />
          {error && <p style={{ margin: 0, color: RED, fontSize: 13 }}>{error}</p>}
          <Btn onClick={submit} disabled={busy}>{busy ? "Verifying..." : "Login"}</Btn>
        </div>
      </div>
    </div>
  );
}

function CostingPanel({ session, onLogout }: { session: AssetSession; onLogout: () => void }) {
  const [summary,  setSummary]  = useState<CostingSummary | null>(null);
  const [maint,    setMaint]    = useState<MaintItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [cfgBusy,  setCfgBusy]  = useState<string | null>(null);
  const [cfgVals,  setCfgVals]  = useState<Record<string, string>>({});
  const [cfgEdit,  setCfgEdit]  = useState<string | null>(null);

  // Maintenance form
  const [mAssetType, setMAssetType] = useState("DRONE");
  const [mAssetId,   setMAssetId]   = useState("");
  const [mCost,      setMCost]      = useState("");
  const [mDate,      setMDate]      = useState(new Date().toISOString().slice(0, 10));
  const [mDesc,      setMDesc]      = useState("");
  const [mBusy,      setMBusy]      = useState(false);
  const [mErr,       setMErr]       = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sr, mr] = await Promise.all([
        fetch("/api/costing/summary").then(r => r.json()),
        fetch("/api/costing/maintenance?limit=50").then(r => r.json()),
      ]);
      setSummary(sr);
      setMaint(mr.items ?? []);
      if (sr.config) {
        setCfgVals({
          useful_life_years:       String(sr.config.useful_life_years),
          expected_shows_per_year: String(sr.config.expected_shows_per_year),
          residual_value_pct:      String(sr.config.residual_value_pct),
        });
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveConfig(key: string) {
    setCfgBusy(key);
    const r = await fetch(`/api/costing/config/${key}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
      body: JSON.stringify({ value: cfgVals[key] }),
    });
    const d = await r.json();
    if (!d.ok) window.alert(d.error ?? "Failed to save");
    else { setCfgEdit(null); load(); }
    setCfgBusy(null);
  }

  async function addMaint() {
    setMBusy(true); setMErr("");
    const r = await fetch("/api/costing/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
      body: JSON.stringify({
        asset_type:  mAssetType,
        asset_id:    mAssetId.trim(),
        cost_sar:    parseFloat(mCost),
        event_date:  mDate,
        description: mDesc.trim() || null,
        created_by:  session.email,
      }),
    });
    const d = await r.json();
    if (!d.ok) setMErr(d.error ?? "Failed");
    else { setMAssetId(""); setMCost(""); setMDesc(""); load(); }
    setMBusy(false);
  }

  const cfgLabels: Record<string, string> = {
    useful_life_years:       "Useful Life (years)",
    expected_shows_per_year: "Expected Shows / Year",
    residual_value_pct:      "Residual Value %",
  };

  const s = summary;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, color: TEXT, fontWeight: 700, fontSize: 22 }}>
            Costing & Depreciation
          </h1>
          <p style={{ margin: "4px 0 0", color: MUTED, fontSize: 13 }}>
            Signed in as <strong style={{ color: TEXT }}>{session.email}</strong>
            {" · "}<span style={{ color: ACCENT }}>{session.role}</span>
          </p>
        </div>
        <button onClick={onLogout} style={{
          background: "rgba(229,57,53,0.1)", border: "1px solid rgba(229,57,53,0.3)",
          color: RED, borderRadius: 8, padding: "7px 16px", fontSize: 13,
          cursor: "pointer", fontWeight: 500,
        }}>Lock</button>
      </div>

      {loading && <p style={{ color: MUTED }}>Loading...</p>}

      {s && (
        <>
          {/* KPI Cards */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" as const, marginBottom: 24 }}>
            {[
              { label: "Drone Dep / Show",    value: `SAR ${s.depreciation.drone_dep_per_show_sar.toLocaleString()}`,    sub: `Avg cost SAR ${s.depreciation.drone_avg_cost_sar.toLocaleString()} · ${s.fleet.active_drones_with_price} priced`,   color: ACCENT },
              { label: "Battery Dep / Show",  value: `SAR ${s.depreciation.battery_dep_per_show_sar.toLocaleString()}`,  sub: `Avg cost SAR ${s.depreciation.battery_avg_cost_sar.toLocaleString()} · ${s.fleet.active_batteries_with_price} priced`, color: ORANGE },
              { label: "Maintenance / Show",  value: `SAR ${s.maintenance.per_show_sar.toLocaleString()}`,               sub: `Total last 12m: SAR ${s.maintenance.total_last_12m_sar.toLocaleString()}`,                                             color: RED    },
              { label: "Cost Floor / Show",   value: `SAR ${s.cost_floor_per_show_sar.toLocaleString()}`,                sub: "Drone dep + Battery dep + Maintenance",                                                                               color: GOLD   },
            ].map(k => (
              <div key={k.label} style={{ background: CARD, border: `1px solid ${BDR}`,
                          borderRadius: 12, padding: "18px 22px", flex: 1, minWidth: 180 }}>
                <div style={{ color: MUTED, fontSize: 11, fontWeight: 600,
                              textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
                  {k.label}
                </div>
                <div style={{ color: k.color, fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
                  {k.value}
                </div>
                <div style={{ color: MUTED, fontSize: 11 }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* Config Panel */}
          <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 12,
                        padding: "20px 24px", marginBottom: 24 }}>
            <h3 style={{ margin: "0 0 16px", color: TEXT, fontSize: 15, fontWeight: 600 }}>
              Depreciation Config
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              {Object.keys(cfgLabels).map(key => (
                <div key={key}>
                  <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 6 }}>
                    {cfgLabels[key]}
                  </label>
                  {cfgEdit === key ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      <input value={cfgVals[key] ?? ""}
                        onChange={e => setCfgVals(p => ({ ...p, [key]: e.target.value }))}
                        style={{ ...inp }} type="number" step="any" />
                      <Btn small onClick={() => saveConfig(key)} disabled={cfgBusy === key}>
                        {cfgBusy === key ? "..." : "Save"}
                      </Btn>
                      <Btn small danger onClick={() => setCfgEdit(null)}>X</Btn>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ color: TEXT, fontSize: 16, fontWeight: 600 }}>
                        {cfgVals[key] ?? "—"}
                      </span>
                      <button onClick={() => setCfgEdit(key)} style={{
                        background: "rgba(74,158,255,0.12)", border: "none",
                        borderRadius: 6, color: ACCENT, padding: "3px 10px",
                        fontSize: 12, cursor: "pointer", fontWeight: 600,
                      }}>Edit</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Add Maintenance Event */}
      <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 12,
                    padding: "20px 24px", marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 16px", color: TEXT, fontSize: 15, fontWeight: 600 }}>
          Log Maintenance Event
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 5 }}>Asset Type</label>
            <select value={mAssetType} onChange={e => setMAssetType(e.target.value)} style={{ ...inp }}>
              <option value="DRONE">DRONE</option>
              <option value="BATTERY">BATTERY</option>
            </select>
          </div>
          <div>
            <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 5 }}>Asset ID / Serial *</label>
            <input value={mAssetId} onChange={e => setMAssetId(e.target.value)}
              placeholder="e.g. DR-001 or BAT-D-101" style={inp} />
          </div>
          <div>
            <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 5 }}>Cost (SAR) *</label>
            <input value={mCost} onChange={e => setMCost(e.target.value)}
              placeholder="e.g. 450" style={inp} type="number" min="0" step="any" />
          </div>
          <div>
            <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 5 }}>Date *</label>
            <input value={mDate} onChange={e => setMDate(e.target.value)}
              style={inp} type="date" />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 5 }}>Description</label>
          <input value={mDesc} onChange={e => setMDesc(e.target.value)}
            placeholder="e.g. Motor replacement, propeller swap..." style={inp} />
        </div>
        {mErr && <p style={{ margin: "0 0 10px", color: RED, fontSize: 13 }}>{mErr}</p>}
        <Btn onClick={addMaint} disabled={mBusy || !mAssetId.trim() || !mCost}>
          {mBusy ? "Saving..." : "Log Event"}
        </Btn>
      </div>

      {/* Maintenance Log Table */}
      <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 12,
                    padding: "20px 24px" }}>
        <h3 style={{ margin: "0 0 16px", color: TEXT, fontSize: 15, fontWeight: 600 }}>
          Maintenance Log
          <span style={{ color: MUTED, fontWeight: 400, fontSize: 13, marginLeft: 10 }}>
            last 50 events
          </span>
        </h3>
        {maint.length === 0 ? (
          <p style={{ color: MUTED, margin: 0 }}>No maintenance events logged yet.</p>
        ) : (
          <div style={{ overflowX: "auto" as const }}>
            <table style={tbl}>
              <thead><tr>
                {["Date","Type","Asset ID","Cost (SAR)","Description","Logged By"].map(h =>
                  <th key={h} style={th}>{h}</th>)}
              </tr></thead>
              <tbody>
                {maint.map(m => (
                  <tr key={m.id} style={{ borderBottom: `1px solid ${BDR}` }}>
                    <td style={{ ...td, color: MUTED, fontSize: 12, whiteSpace: "nowrap" as const }}>
                      {m.event_date}
                    </td>
                    <td style={td}>
                      <span style={{ background: m.asset_type === "DRONE"
                                       ? "rgba(74,158,255,0.15)" : "rgba(251,140,0,0.15)",
                                     color: m.asset_type === "DRONE" ? ACCENT : ORANGE,
                                     borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 600 }}>
                        {m.asset_type}
                      </span>
                    </td>
                    <td style={{ ...td, fontWeight: 600 }}>{m.asset_id}</td>
                    <td style={{ ...td, color: m.cost_sar > 1000 ? RED : GREEN, fontWeight: 600 }}>
                      {m.cost_sar.toLocaleString()}
                    </td>
                    <td style={{ ...td, color: MUTED, fontSize: 12, maxWidth: 220,
                                  overflow: "hidden", textOverflow: "ellipsis",
                                  whiteSpace: "nowrap" as const }}>
                      {m.description ?? "—"}
                    </td>
                    <td style={{ ...td, color: MUTED, fontSize: 12 }}>{m.created_by ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Costing() {
  const { session, login, logout } = useAssetAuth();
  if (!session) return <LoginGate onLogin={login} />;
  return <CostingPanel session={session} onLogout={logout} />;
}

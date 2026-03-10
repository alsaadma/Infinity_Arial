import { useState, useEffect, useCallback } from "react";
import { useAssetAuth, type AssetSession } from "../hooks/useAssetAuth";

const API = "";

// ── Types ─────────────────────────────────────────────────────────────────────
type DroneStatus  = "ACTIVE" | "MAINTENANCE" | "QUARANTINED" | "RETIRED";
type BatteryType  = "ON_DRONE" | "TRAY" | "STATION";
type BatteryStatus = "ACTIVE" | "DEGRADED" | "RETIRED";

interface DroneUnit {
  id: string; serial_number: string | null; model_id: string | null;
  status: DroneStatus; created_at: string;
}
interface DroneLog {
  id: string; from_status: string | null; to_status: string;
  reason: string | null; changed_by: string | null; changed_at: string;
}
interface BatteryUnit {
  id: string; serial_number: string | null; battery_type: BatteryType;
  cycle_count: number; cycle_max: number; health_pct: number;
  capacity_mah: number | null; voltage_nominal: number | null;
  status: BatteryStatus; created_at: string;
}
interface BatteryLog {
  id: string; from_status: string | null; to_status: string;
  reason: string | null; changed_by: string | null; changed_at: string;
}

// ── Theme constants ───────────────────────────────────────────────────────────
// const BG = "#0B1628"; // removed: unused
const CARD  = "#111E35";
const BDR   = "rgba(255,255,255,0.08)";
const ACCENT = "#4A9EFF";
const TEXT  = "#F0F4FF";
const MUTED = "#8FA3C0";
const RED   = "#E53935";
const GREEN = "#43A047";
const ORANGE = "#FB8C00";

function statusColor(s: string) {
  if (s === "ACTIVE")      return GREEN;
  if (s === "MAINTENANCE") return ORANGE;
  if (s === "QUARANTINED" || s === "RETIRED") return RED;
  if (s === "DEGRADED")    return ORANGE;
  return TEXT;
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  background: "#1A2A44", border: `1px solid ${BDR}`, borderRadius: 8,
  color: TEXT, padding: "9px 14px", fontSize: 14, outline: "none", width: "100%",
  boxSizing: "border-box",
};
const th: React.CSSProperties = {
  textAlign: "left", padding: "10px 12px", color: MUTED, fontWeight: 600,
  fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5,
  borderBottom: `1px solid ${BDR}`,
};
const td: React.CSSProperties = { padding: "10px 12px", verticalAlign: "middle" };
const tbl: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 14, color: TEXT };

function Btn({ onClick, disabled, danger, children }: {
  onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: disabled ? "#1A2A44"
        : danger ? "rgba(229,57,53,0.18)"
        : "linear-gradient(135deg,#1B4FD8,#4A9EFF)",
      border: danger ? "1px solid rgba(229,57,53,0.4)" : "none",
      borderRadius: 8, color: disabled ? MUTED : danger ? RED : "#fff",
      padding: "8px 18px", fontSize: 13, fontWeight: 600,
      cursor: disabled ? "not-allowed" : "pointer", whiteSpace: "nowrap" as const,
    }}>{children}</button>
  );
}

// ── Login Gate ────────────────────────────────────────────────────────────────
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
                        background: "linear-gradient(135deg,#1B4FD8,#4A9EFF)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 24 }}>🔒</div>
          <h2 style={{ margin: 0, color: TEXT, fontWeight: 700, fontSize: 20 }}>Asset Registry</h2>
          <p style={{ margin: "8px 0 0", color: MUTED, fontSize: 13 }}>
            Authentication required to manage assets
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Email" style={inp}
            onKeyDown={e => e.key === "Enter" && submit()} />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Password" style={inp}
            onKeyDown={e => e.key === "Enter" && submit()} />
          {error && <p style={{ margin: 0, color: RED, fontSize: 13 }}>{error}</p>}
          <Btn onClick={submit} disabled={busy}>{busy ? "Verifying…" : "Login"}</Btn>
        </div>
        <p style={{ margin: "20px 0 0", color: MUTED, fontSize: 11, textAlign: "center" }}>
          Default: admin@infinity.local / Admin@1234
          <br />Session clears on page refresh.
        </p>
      </div>
    </div>
  );
}

// ── Drones Panel ──────────────────────────────────────────────────────────────
function DronesPanel({ token }: { token: string }) {
  const [drones, setDrones]   = useState<DroneUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [serial, setSerial]   = useState("");
  const [model,  setModel]    = useState("");
  const [busy,   setBusy]     = useState(false);
  const [err,    setErr]      = useState("");
  const [logOpen, setLogOpen] = useState<Record<string, boolean>>({});
  const [logData, setLogData] = useState<Record<string, DroneLog[]>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/fleet/drones`);
      const d = await r.json();
      setDrones(d.items ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addDrone() {
    setBusy(true); setErr("");
    const r = await fetch(`${API}/api/fleet/drones`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ serial_number: serial.trim() || null, model_id: model.trim() || null }),
    });
    const d = await r.json();
    if (!d.ok) setErr(d.error ?? "Failed");
    else { setSerial(""); setModel(""); load(); }
    setBusy(false);
  }

  async function deleteDrone(id: string, label: string | null) {
    if (!confirm(`Delete drone ${label ?? id}?\n\nThis is permanent and cannot be undone.`)) return;
    await fetch(`${API}/api/fleet/drones/${id}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` },
    });
    load();
  }

  async function changeStatus(id: string, newStatus: DroneStatus, currentStatus: DroneStatus) {
    if (newStatus === currentStatus) return;
    const reason = window.prompt(`Reason for status change to ${newStatus} (optional):`) ?? "";
    const r = await fetch(`${API}/api/fleet/drones/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus, reason: reason.trim() || null }),
    });
    const resp = await r.json();
    if (!resp.ok) { window.alert(resp.error ?? "Status change failed"); return; }
    load();
    if (logOpen[id]) fetchLog(id);
  }

  async function fetchLog(id: string) {
    const r = await fetch(`${API}/api/fleet/drones/${id}/log`);
    const d = await r.json();
    setLogData(prev => ({ ...prev, [id]: d.items ?? [] }));
  }

  return (
    <div>
      <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 10,
                    padding: 20, marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 14px", color: TEXT, fontSize: 14, fontWeight: 600 }}>
          Register New Drone
        </h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <input value={serial} onChange={e => setSerial(e.target.value)}
              placeholder="Serial number (optional)" style={inp} />
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <input value={model} onChange={e => setModel(e.target.value)}
              placeholder="Model ID (optional)" style={inp} />
          </div>
          <Btn onClick={addDrone} disabled={busy}>{busy ? "Adding…" : "+ Register"}</Btn>
        </div>
        {err && <p style={{ margin: "8px 0 0", color: RED, fontSize: 13 }}>{err}</p>}
      </div>

      {loading ? <p style={{ color: MUTED }}>Loading…</p>
       : drones.length === 0 ? <p style={{ color: MUTED }}>No drones registered yet.</p>
       : (
        <div style={{ overflowX: "auto" as const }}>
          <table style={tbl}>
            <thead><tr>
              {["Serial", "Model", "Status", "Registered", "Action"].map(h =>
                <th key={h} style={th}>{h}</th>)}
            </tr></thead>
            <tbody>
              {drones.map(d => (
                <>
                  <tr key={d.id} style={{ borderBottom: `1px solid ${BDR}` }}>
                    <td style={td}>{d.serial_number ?? <span style={{ color: MUTED }}>—</span>}</td>
                    <td style={td}>{d.model_id      ?? <span style={{ color: MUTED }}>—</span>}</td>
                    <td style={td}>
                      <select value={d.status}
                        onChange={e => changeStatus(d.id, e.target.value as DroneStatus, d.status)}
                        style={{ background: "#1A2A44", border: `1px solid ${BDR}`, borderRadius: 6,
                                 color: statusColor(d.status), padding: "4px 8px", fontSize: 13 }}>
                        {["ACTIVE","MAINTENANCE","QUARANTINED","RETIRED"].map(s =>
                          <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{ ...td, color: MUTED, fontSize: 12 }}>{d.created_at.slice(0,10)}</td>
                    <td style={td}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                        <Btn onClick={() => deleteDrone(d.id, d.serial_number)} danger>Delete</Btn>
                        <Btn onClick={() => {
                          const next = !logOpen[d.id];
                          setLogOpen(prev => ({ ...prev, [d.id]: next }));
                          if (next && !logData[d.id]) fetchLog(d.id);
                        }}>{logOpen[d.id] ? "Hide log" : "History"}</Btn>
                      </div>
                    </td>
                  </tr>
                  {logOpen[d.id] && (
                    <tr style={{ borderBottom: `1px solid ${BDR}`, background: "rgba(255,255,255,0.02)" }}>
                      <td colSpan={5} style={{ ...td, padding: "8px 12px 14px" }}>
                        {(logData[d.id] ?? []).length === 0
                          ? <span style={{ color: MUTED, fontSize: 12 }}>No history yet.</span>
                          : <table style={{ ...tbl, fontSize: 12, marginTop: 4 }}>
                              <thead><tr>
                                {["From", "To", "Reason", "When"].map(h =>
                                  <th key={h} style={{ ...th, fontSize: 11, padding: "6px 10px" }}>{h}</th>)}
                              </tr></thead>
                              <tbody>
                                {(logData[d.id] ?? []).map(l => (
                                  <tr key={l.id}>
                                    <td style={{ ...td, color: statusColor(l.from_status ?? ""), padding: "6px 10px" }}>{l.from_status ?? "—"}</td>
                                    <td style={{ ...td, color: statusColor(l.to_status), padding: "6px 10px" }}>{l.to_status}</td>
                                    <td style={{ ...td, color: MUTED, padding: "6px 10px" }}>{l.reason ?? <span style={{ opacity: 0.5 }}>—</span>}</td>
                                    <td style={{ ...td, color: MUTED, padding: "6px 10px" }}>{l.changed_at.slice(0, 16).replace("T", " ")}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                        }
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
          <p style={{ color: MUTED, fontSize: 12, marginTop: 8 }}>{drones.length} drone(s)</p>
        </div>
      )}
    </div>
  );
}

// ── Batteries Panel ───────────────────────────────────────────────────────────
function BatteriesPanel({ token }: { token: string }) {
  const [bats, setBats]       = useState<BatteryUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [serial,   setSerial]   = useState("");
  const [type,     setType]     = useState<BatteryType>("TRAY");
  const [cycles,   setCycles]   = useState("0");
  const [cycleMax, setCycleMax] = useState("300");
  const [capMah,   setCapMah]   = useState("3000");
  const [voltage,  setVoltage]  = useState("14.8");
  const [busy,     setBusy]     = useState(false);
  const [err,      setErr]      = useState("");
  const [logOpen,  setLogOpen]  = useState<Record<string, boolean>>({});
  const [logData,  setLogData]  = useState<Record<string, BatteryLog[]>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/fleet/batteries`);
      const d = await r.json();
      setBats(d.items ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addBattery() {
    setBusy(true); setErr("");
    const r = await fetch(`${API}/api/fleet/batteries`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        serial_number:   serial.trim() || null,
        battery_type:    type,
        cycle_count:     parseInt(cycles)   || 0,
        cycle_max:       parseInt(cycleMax) || 300,
        capacity_mah:    parseFloat(capMah)   || null,
        voltage_nominal: parseFloat(voltage)  || null,
      }),
    });
    const d = await r.json();
    if (!d.ok) setErr(d.error ?? "Failed");
    else { setSerial(""); setCycles("0"); load(); }
    setBusy(false);
  }

  async function deleteBattery(id: string, label: string | null) {
    if (!confirm(`Delete battery ${label ?? id}?\n\nThis is permanent.`)) return;
    await fetch(`${API}/api/fleet/batteries/${id}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` },
    });
    load();
  }

  async function changeStatus(id: string, newStatus: BatteryStatus, currentStatus: BatteryStatus) {
    if (newStatus === currentStatus) return;
    const reason = window.prompt(`Reason for status change to ${newStatus} (optional):`) ?? "";
    const r = await fetch(`${API}/api/fleet/batteries/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus, reason: reason.trim() || null }),
    });
    const resp = await r.json();
    if (!resp.ok) { window.alert(resp.error ?? "Status change failed"); return; }
    load();
    if (logOpen[id]) fetchLog(id);
  }

  async function fetchLog(id: string) {
    const r = await fetch(`${API}/api/fleet/batteries/${id}/log`);
    const d = await r.json();
    setLogData(prev => ({ ...prev, [id]: d.items ?? [] }));
  }

  return (
    <div>
      <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 10,
                    padding: 20, marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 14px", color: TEXT, fontSize: 14, fontWeight: 600 }}>
          Register New Battery
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <label style={{ color: MUTED, fontSize: 11, display: "block", marginBottom: 4 }}>Serial No.</label>
            <input value={serial} onChange={e => setSerial(e.target.value)}
              placeholder="e.g. BAT-001" style={inp} />
          </div>
          <div>
            <label style={{ color: MUTED, fontSize: 11, display: "block", marginBottom: 4 }}>Type</label>
            <select value={type} onChange={e => setType(e.target.value as BatteryType)}
              style={{ ...inp }}>
              <option value="ON_DRONE">ON_DRONE</option>
              <option value="TRAY">TRAY</option>
              <option value="STATION">STATION</option>
            </select>
          </div>
          <div>
            <label style={{ color: MUTED, fontSize: 11, display: "block", marginBottom: 4 }}>Capacity (mAh)</label>
            <input value={capMah} onChange={e => setCapMah(e.target.value)}
              placeholder="3000" style={inp} />
          </div>
          <div>
            <label style={{ color: MUTED, fontSize: 11, display: "block", marginBottom: 4 }}>Voltage (V)</label>
            <input value={voltage} onChange={e => setVoltage(e.target.value)}
              placeholder="14.8" style={inp} />
          </div>
          <div>
            <label style={{ color: MUTED, fontSize: 11, display: "block", marginBottom: 4 }}>Current Cycles</label>
            <input value={cycles} onChange={e => setCycles(e.target.value)}
              placeholder="0" style={inp} />
          </div>
          <div>
            <label style={{ color: MUTED, fontSize: 11, display: "block", marginBottom: 4 }}>Max Cycles</label>
            <input value={cycleMax} onChange={e => setCycleMax(e.target.value)}
              placeholder="300" style={inp} />
          </div>
        </div>
        <Btn onClick={addBattery} disabled={busy}>{busy ? "Adding…" : "+ Register Battery"}</Btn>
        {err && <p style={{ margin: "8px 0 0", color: RED, fontSize: 13 }}>{err}</p>}
      </div>

      {loading ? <p style={{ color: MUTED }}>Loading…</p>
       : bats.length === 0 ? <p style={{ color: MUTED }}>No batteries registered yet.</p>
       : (
        <div style={{ overflowX: "auto" as const }}>
          <table style={tbl}>
            <thead><tr>
              {["Serial", "Type", "Capacity", "Voltage", "Status", "Health", "Cycles", "Registered", "Actions"].map(h =>
                <th key={h} style={th}>{h}</th>)}
            </tr></thead>
            <tbody>
              {bats.map(b => (
                <>
                  <tr key={b.id} style={{ borderBottom: logOpen[b.id] ? "none" : `1px solid ${BDR}` }}>
                    <td style={td}>{b.serial_number ?? <span style={{ color: MUTED }}>—</span>}</td>
                    <td style={td}>
                      <span style={{ fontSize: 12, background: "rgba(74,158,255,0.15)",
                        padding: "2px 8px", borderRadius: 4, color: ACCENT }}>{b.battery_type}</span>
                    </td>
                    <td style={{ ...td, color: MUTED, fontSize: 12 }}>
                      {b.capacity_mah != null ? `${b.capacity_mah} mAh` : "—"}
                    </td>
                    <td style={{ ...td, color: MUTED, fontSize: 12 }}>
                      {b.voltage_nominal != null ? `${b.voltage_nominal} V` : "—"}
                    </td>
                    <td style={td}>
                      <select
                        value={b.status}
                        onChange={e => changeStatus(b.id, e.target.value as BatteryStatus, b.status)}
                        style={{ background: "transparent", border: `1px solid ${BDR}`,
                                 borderRadius: 6, color: statusColor(b.status),
                                 padding: "4px 8px", fontSize: 13, fontWeight: 600 }}>
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="DEGRADED">DEGRADED</option>
                        <option value="RETIRED">RETIRED</option>
                      </select>
                    </td>
                    <td style={td}>
                      <span style={{ color: b.health_pct >= 80 ? GREEN : b.health_pct >= 50 ? ORANGE : RED }}>
                        {b.health_pct.toFixed(0)}%
                      </span>
                    </td>
                    <td style={td}>{b.cycle_count} / {b.cycle_max}</td>
                    <td style={{ ...td, color: MUTED, fontSize: 12 }}>{b.created_at.slice(0,10)}</td>
                    <td style={td}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => {
                            setLogOpen(prev => ({ ...prev, [b.id]: !prev[b.id] }));
                            if (!logOpen[b.id]) fetchLog(b.id);
                          }}
                          style={{ background: "rgba(74,158,255,0.12)", border: "none",
                                   borderRadius: 6, color: ACCENT, padding: "5px 10px",
                                   fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                          {logOpen[b.id] ? "▲ Log" : "▼ Log"}
                        </button>
                        <Btn onClick={() => deleteBattery(b.id, b.serial_number)} danger>Delete</Btn>
                      </div>
                    </td>
                  </tr>
                  {logOpen[b.id] && (
                    <tr key={`${b.id}-log`} style={{ borderBottom: `1px solid ${BDR}` }}>
                      <td colSpan={9} style={{ ...td, background: "rgba(0,0,0,0.15)", paddingTop: 6, paddingBottom: 10 }}>
                        {(logData[b.id] ?? []).length === 0
                          ? <span style={{ color: MUTED, fontSize: 12 }}>No status changes recorded yet.</span>
                          : <table style={{ ...tbl, fontSize: 12, marginTop: 4 }}>
                              <thead><tr>
                                {["From", "To", "Reason", "When"].map(h =>
                                  <th key={h} style={{ ...th, fontSize: 11, padding: "6px 10px" }}>{h}</th>)}
                              </tr></thead>
                              <tbody>
                                {(logData[b.id] ?? []).map(l => (
                                  <tr key={l.id}>
                                    <td style={{ ...td, color: statusColor(l.from_status ?? ""), padding: "6px 10px" }}>{l.from_status ?? "—"}</td>
                                    <td style={{ ...td, color: statusColor(l.to_status), padding: "6px 10px" }}>{l.to_status}</td>
                                    <td style={{ ...td, color: MUTED, padding: "6px 10px" }}>{l.reason ?? <span style={{ opacity: 0.5 }}>—</span>}</td>
                                    <td style={{ ...td, color: MUTED, padding: "6px 10px" }}>{l.changed_at.slice(0,16).replace("T"," ")}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                        }
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
          <p style={{ color: MUTED, fontSize: 12, marginTop: 8 }}>{bats.length} battery unit(s)</p>
        </div>
      )}
    </div>
  );
}

// ── Asset Panel (post-login) ──────────────────────────────────────────────────
function AssetPanel({ session, onLogout }: { session: AssetSession; onLogout: () => void }) {
  const [tab, setTab] = useState<"drones" | "batteries">("drones");

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, color: TEXT, fontWeight: 700, fontSize: 22 }}>Asset Registry</h1>
          <p style={{ margin: "4px 0 0", color: MUTED, fontSize: 13 }}>
            Signed in as <strong style={{ color: TEXT }}>{session.email}</strong>
            {" · "}<span style={{ color: ACCENT }}>{session.role}</span>
          </p>
        </div>
        <button onClick={onLogout} style={{
          background: "rgba(229,57,53,0.1)", border: "1px solid rgba(229,57,53,0.3)",
          color: RED, borderRadius: 8, padding: "7px 16px", fontSize: 13,
          cursor: "pointer", fontWeight: 500,
        }}>🔒 Lock Panel</button>
      </div>

      <div style={{ background: "rgba(229,57,53,0.07)", border: "1px solid rgba(229,57,53,0.22)",
                    borderRadius: 8, padding: "10px 16px", marginBottom: 24,
                    display: "flex", alignItems: "center", gap: 10 }}>
        <span>⚠️</span>
        <span style={{ color: "#FF8A80", fontSize: 13 }}>
          This panel writes to the live asset database. Deletions are permanent and cannot be undone.
        </span>
      </div>

      <div style={{ display: "flex", gap: 2, borderBottom: `1px solid ${BDR}`, marginBottom: 24 }}>
        {(["drones", "batteries"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: tab === t ? "rgba(74,158,255,0.12)" : "transparent",
            border: "none", borderBottom: tab === t ? `2px solid ${ACCENT}` : "2px solid transparent",
            color: tab === t ? ACCENT : MUTED, padding: "9px 22px", fontSize: 14,
            fontWeight: tab === t ? 600 : 400, cursor: "pointer",
            borderRadius: "8px 8px 0 0", marginBottom: -1,
          }}>
            {t === "drones" ? "🚁 Drones" : "🔋 Batteries"}
          </button>
        ))}
      </div>

      {tab === "drones"    && <DronesPanel    token={session.token} />}
      {tab === "batteries" && <BatteriesPanel token={session.token} />}
    </div>
  );
}

// ── Page entry point ──────────────────────────────────────────────────────────
export default function Assets() {
  const { session, login, logout } = useAssetAuth();
  if (!session) return <LoginGate onLogin={login} />;
  return <AssetPanel session={session} onLogout={logout} />;
}


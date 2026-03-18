import { useEffect, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────
type DroneStatus = "ACTIVE" | "MAINTENANCE" | "QUARANTINED" | "RETIRED";
type BatteryType = "ON_DRONE" | "TRAY" | "STATION";

interface DroneUnit {
  id: string;
  serial_number: string | null;
  model_id: string | null;
  status: DroneStatus;
  status_reason: string | null;
  updated_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

interface BatteryUnit {
  id: string;
  serial_number: string | null;
  battery_type: BatteryType;
  drone_id: string | null;
  cycle_count: number;
  cycle_max: number;
  health_pct: number;
  status: string;
  purchase_price_sar: number | null;
  created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────
const STATUS_COLORS: Record<DroneStatus, string> = {
  ACTIVE:      "#4caf50",
  MAINTENANCE: "#ff9800",
  QUARANTINED: "#f44336",
  RETIRED:     "#9e9e9e",
};

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status as DroneStatus] ?? "#9e9e9e";
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 999,
      fontSize: 13, fontWeight: 600, letterSpacing: 0.5,
      background: color + "22", color, border: `1px solid ${color}66`,
    }}>
      {status}
    </span>
  );
}

async function apiFetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const r = await fetch(url, opts);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json() as Promise<T>;
}

// ── Drones Tab ────────────────────────────────────────────────────
function DronesTab() {
  const [drones, setDrones]   = useState<DroneUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // Add-drone form state
  const [serial, setSerial]   = useState("");
  const [model, setModel]     = useState("");
  const [status, setStatus]   = useState<DroneStatus>("ACTIVE");
  const [adding, setAdding]   = useState(false);

  async function load() {
    setLoading(true); setError(null);
    try {
      const d = await apiFetch<{ ok: boolean; items: DroneUnit[] }>("/api/fleet/drones");
      setDrones(d.items);
    } catch { setError("Could not reach server. Is it running?"); }
    finally { setLoading(false); }
  }

  async function addDrone() {
    if (adding) return;
    setAdding(true);
    try {
      await apiFetch("/api/fleet/drones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serial_number: serial.trim() || null,
          model_id:      model.trim()  || null,
          status,
        }),
      });
      setSerial(""); setModel(""); setStatus("ACTIVE");
      await load();
    } catch { setError("Failed to add drone."); }
    finally { setAdding(false); }
  }

  async function updateStatus(id: string, newStatus: DroneStatus) {
    try {
      await apiFetch(`/api/fleet/drones/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      await load();
    } catch { setError("Failed to update status."); }
  }

  useEffect(() => { void load(); }, []);

  const cell: React.CSSProperties = {
    padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.07)", fontSize: 14,
  };
  const th: React.CSSProperties = {
    ...cell, fontWeight: 600, opacity: 0.6, fontSize: 13, textTransform: "uppercase",
    letterSpacing: 0.5,
  };

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, opacity: 0.7 }}>Add New Drone</div>
      <div style={{
        display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end",
        marginBottom: 16, padding: 12,
        border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10,
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 13, opacity: 0.6 }}>Serial</label>
          <input value={serial} onChange={e => setSerial(e.target.value)}
            placeholder="DR-002" style={inputStyle} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 13, opacity: 0.6 }}>Model</label>
          <input value={model} onChange={e => setModel(e.target.value)}
            placeholder="L3" style={inputStyle} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 13, opacity: 0.6 }}>Status</label>
          <select value={status} onChange={e => setStatus(e.target.value as DroneStatus)}
            style={{ ...inputStyle, color: "#fff", backgroundColor: "#1a2744" }}>
            <option style={{ color: "#22c55e" }}>ACTIVE</option>
            <option style={{ color: "#f97316" }}>MAINTENANCE</option>
            <option style={{ color: "#ef4444" }}>QUARANTINED</option>
            <option style={{ color: "#666" }}>RETIRED</option>
          </select>
        </div>
        <button onClick={addDrone} disabled={adding} style={btnStyle}>
          {adding ? "Adding…" : "+ Add Drone"}
        </button>
        <button onClick={load} style={{ ...btnStyle, background: "rgba(255,255,255,0.06)" }}>
          Refresh
        </button>
      </div>

      {error && <div style={{ color: "#f44336", marginBottom: 10, fontSize: 14 }}>{error}</div>}

      {loading ? (
        <div style={{ opacity: 0.5, fontSize: 14 }}>Loading…</div>
      ) : drones.length === 0 ? (
        <div style={{ opacity: 0.5, fontSize: 14 }}>No drones registered yet.</div>
      ) : (
        <div style={{ overflowX: "auto", border: "2px solid rgba(0,0,0,0.12)", borderRadius: 10, padding: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                <th style={th}>Serial</th>
                <th style={th}>Model</th>
                <th style={th}>Status</th>
                <th style={th}>Created</th>
                <th style={th}>Change Status</th>
              </tr>
            </thead>
            <tbody>
              {drones.map(d => (
                <tr key={d.id} style={{ 
                  transition: "background 0.15s",
                  background: d.status === "RETIRED" ? "rgba(120,120,120,0.2)" 
                            : d.status === "MAINTENANCE" ? "rgba(255,152,0,0.15)" 
                            : "transparent",
                  opacity: d.status === "RETIRED" ? 0.6 : 1
                }}>
                  <td style={cell}>{d.serial_number ?? <span style={{ opacity: 0.4 }}>—</span>}</td>
                  <td style={cell}>{d.model_id ?? <span style={{ opacity: 0.4 }}>—</span>}</td>
                  <td style={cell}><StatusBadge status={d.status} /></td>
                  <td style={cell}>{new Date(d.created_at).toLocaleDateString()}</td>
                  <td style={cell}>
                    <select
                      value={d.status}
                      onChange={e => updateStatus(d.id, e.target.value as DroneStatus)}
                      style={{ ...inputStyle, fontSize: 13, padding: "3px 6px" }}
                    >
                      <option>ACTIVE</option>
                      <option>MAINTENANCE</option>
                      <option>QUARANTINED</option>
                      <option>RETIRED</option>
                    </select>
                  </td>
                  <td style={cell}>
                    <button
                      onClick={() => {
                        const label = d.serial_number ?? d.id.slice(0, 8);
                        if (!window.confirm(`Delete drone ${label}? This cannot be undone.`)) return;
                        fetch(`/api/fleet/drones/${d.id}`, { method: "DELETE" })
                          .then(() => load())
                          .catch(() => setError("Failed to delete drone."));
                      }}
                      style={{
                        padding: "4px 14px", borderRadius: 8, fontSize: 13, cursor: "pointer",
                        border: "1px solid rgba(244,67,54,0.4)",
                        background: "rgba(244,67,54,0.12)", color: "inherit",
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Batteries Tab ─────────────────────────────────────────────────
function BatteriesTab() {
  const [batteries, setBatteries] = useState<BatteryUnit[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  const [serial, setSerial]       = useState("");
  const [type, setType]           = useState<BatteryType>("TRAY");
  const [droneId, setDroneId]     = useState("");
  const [cycleMax, setCycleMax]   = useState("300");
  const [batPrice, setBatPrice]   = useState("");
  const [adding, setAdding]       = useState(false);

  async function load() {
    setLoading(true); setError(null);
    try {
      const d = await apiFetch<{ ok: boolean; items: BatteryUnit[] }>("/api/fleet/batteries");
      setBatteries(d.items);
    } catch { setError("Could not reach server."); }
    finally { setLoading(false); }
  }

  async function addBattery() {
    if (adding) return;
    setAdding(true);
    try {
      await apiFetch("/api/fleet/batteries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serial_number:      serial.trim() || null,
          battery_type:       type,
          drone_id:           droneId.trim() || null,
          cycle_max:          Number(cycleMax) || 300,
          purchase_price_sar: batPrice !== "" ? parseFloat(batPrice) : null,
        }),
      });
      setSerial(""); setDroneId(""); setCycleMax("300"); setType("TRAY"); setBatPrice("");
      await load();
    } catch { setError("Failed to add battery."); }
    finally { setAdding(false); }
  }

  useEffect(() => { void load(); }, []);

  const cell: React.CSSProperties = {
    padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.07)", fontSize: 14,
  };
  const th: React.CSSProperties = {
    ...cell, fontWeight: 600, opacity: 0.6, fontSize: 13, textTransform: "uppercase",
    letterSpacing: 0.5,
  };

  return (
    <div>
      <div style={{
        display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end",
        marginBottom: 16, padding: 12,
        border: "1px solid rgba(255,255,255,0.10)", borderRadius: 10,
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 13, opacity: 0.6 }}>Serial</label>
          <input value={serial} onChange={e => setSerial(e.target.value)}
            placeholder="BAT-001" style={inputStyle} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 13, opacity: 0.6 }}>Type</label>
          <select value={type} onChange={e => setType(e.target.value as BatteryType)}
            style={inputStyle}>
            <option value="ON_DRONE">ON_DRONE</option>
            <option value="TRAY">TRAY</option>
            <option value="STATION">STATION</option>
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 13, opacity: 0.6 }}>Drone ID (optional)</label>
          <input value={droneId} onChange={e => setDroneId(e.target.value)}
            placeholder="paste drone UUID" style={{ ...inputStyle, width: 180 }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 13, opacity: 0.6 }}>Max Cycles</label>
          <input value={cycleMax} onChange={e => setCycleMax(e.target.value)}
            type="number" style={{ ...inputStyle, width: 80 }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 13, opacity: 0.6 }}>Price (SAR)</label>
          <input value={batPrice} onChange={e => setBatPrice(e.target.value)}
            placeholder="320" type="number" min="0" style={{ ...inputStyle, width: 100 }} />
        </div>
        <button onClick={addBattery} disabled={adding} style={btnStyle}>
          {adding ? "Adding…" : "+ Add Battery"}
        </button>
        <button onClick={load} style={{ ...btnStyle, background: "rgba(255,255,255,0.06)" }}>
          Refresh
        </button>
      </div>

      {error && <div style={{ color: "#f44336", marginBottom: 10, fontSize: 14 }}>{error}</div>}

      {loading ? (
        <div style={{ opacity: 0.5, fontSize: 14 }}>Loading…</div>
      ) : batteries.length === 0 ? (
        <div style={{ opacity: 0.5, fontSize: 14 }}>No batteries registered yet.</div>
      ) : (
        <div style={{ overflowX: "auto", border: "2px solid rgba(0,0,0,0.12)", borderRadius: 10, padding: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                <th style={th}>Serial</th>
                <th style={th}>Type</th>
                <th style={th}>Cycles</th>
                <th style={th}>Health %</th>
                <th style={th}>Status</th>
                <th style={th}>Drone ID</th>
              </tr>
            </thead>
            <tbody>
              {batteries.map(b => (
                <tr key={b.id}>
                  <td style={cell}>{b.serial_number ?? <span style={{ opacity: 0.4 }}>—</span>}</td>
                  <td style={cell}>{b.battery_type}</td>
                  <td style={cell}>{b.cycle_count} / {b.cycle_max}</td>
                  <td style={cell}>{b.health_pct.toFixed(1)}%</td>
                  <td style={cell}><StatusBadge status={b.status} /></td>
                  <td style={{ ...cell, fontSize: 13, opacity: 0.6 }}>
                    {b.drone_id ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  padding: "6px 10px", borderRadius: 8, fontSize: 14,
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.05)", color: "inherit", outline: "none",
};
const btnStyle: React.CSSProperties = {
  padding: "7px 14px", borderRadius: 8, fontSize: 14, cursor: "pointer",
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(99,179,237,0.18)", color: "inherit",
};

// ── Page ──────────────────────────────────────────────────────────
type Tab = "drones" | "batteries";

export default function Fleet() {
  const [tab, setTab] = useState<Tab>("drones");

  const tabBtn = (t: Tab): React.CSSProperties => ({
    padding: "6px 18px", borderRadius: 8, fontSize: 14, cursor: "pointer",
    border: "1px solid rgba(255,255,255,0.15)",
    background: tab === t ? "rgba(99,179,237,0.22)" : "rgba(255,255,255,0.04)",
    color: "inherit", fontWeight: tab === t ? 600 : 400,
  });

  return (
    <div style={{ padding: 8 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Fleet</div>
        <div style={{ fontSize: 13, opacity: 0.5 }}>Asset Registry — Module 2</div>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button style={tabBtn("drones")}    onClick={() => setTab("drones")}>Drones</button>
        <button style={tabBtn("batteries")} onClick={() => setTab("batteries")}>Batteries</button>
      </div>

      <div style={{ border: "2px solid rgba(0,0,0,0.10)", borderRadius: 12, padding: 16 }}>
        {tab === "drones"    && <DronesTab />}
        {tab === "batteries" && <BatteriesTab />}
      </div>
    </div>
  );
}

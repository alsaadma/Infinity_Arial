import { useEffect, useState } from "react";

interface DroneAlert {
  asset_type: "drone";
  asset_id: string;
  serial_number: string;
  last_maintenance_date: string | null;
  days_since_service: number | null;
  next_show_date: string | null;
  days_to_next_show: number | null;
  severity: "HIGH" | "MEDIUM";
}
interface BatteryAlert {
  asset_type: "battery";
  asset_id: string;
  serial_number: string;
  cycle_count: number;
  cycle_max: number;
  health_pct: number;
  severity: "HIGH" | "MEDIUM";
}
type ServiceAlert = DroneAlert | BatteryAlert;

interface UpcomingShow {
  id: number;
  name: string | null;
  date: string;
  drones_required: number;
}
interface MaintenanceEntry {
  id: string;
  asset_type: string;
  asset_id: string;
  event_date: string;
  description: string;
  cost_sar: number;
  status: string;
  asset_serial: string | null;
}
interface AssetOption {
  id: string;
  serial_number: string;
  status: string;
}

const SEV = {
  HIGH:   { bg: "rgba(239,68,68,0.13)",  border: "rgba(239,68,68,0.40)",  badge: "#ef4444" },
  MEDIUM: { bg: "rgba(251,146,60,0.10)", border: "rgba(251,146,60,0.35)", badge: "#fb923c" },
};

export default function Maintenance() {
  const [alerts, setAlerts]             = useState<ServiceAlert[]>([]);
  const [upcomingShows, setUpcomingShows] = useState<UpcomingShow[]>([]);
  const [schedule, setSchedule]         = useState<MaintenanceEntry[]>([]);
  const [drones, setDrones]             = useState<AssetOption[]>([]);
  const [batteries, setBatteries]       = useState<AssetOption[]>([]);
  const [loading, setLoading]           = useState(true);
  const [formOpen, setFormOpen]         = useState(false);
  const [saving, setSaving]             = useState(false);
  const [successMsg, setSuccessMsg]     = useState("");
  const [form, setForm] = useState({
    asset_type: "drone", asset_id: "", event_date: "", description: "", cost_sar: "",
  });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [aRes, sRes, dRes, bRes] = await Promise.all([
        fetch("/api/maintenance/alerts"),
        fetch("/api/maintenance/upcoming"),
        fetch("/api/drones"),
        fetch("/api/batteries"),
      ]);
      const aData = await aRes.json();
      setAlerts(aData.alerts ?? []);
      setUpcomingShows(aData.upcoming_shows ?? []);
      setSchedule(await sRes.json());
      setDrones(await dRes.json());
      setBatteries(await bRes.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const assetOptions = form.asset_type === "drone" ? drones : batteries;

  const handleSubmit = async () => {
    if (!form.asset_id || !form.event_date) return;
    setSaving(true);
    try {
      await fetch("/api/maintenance/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset_type:  form.asset_type,
          asset_id:    form.asset_id,
          event_date:  form.event_date,
          description: form.description,
          cost_sar:    form.cost_sar ? Number(form.cost_sar) : 0,
        }),
      });
      setSuccessMsg("Maintenance entry scheduled.");
      setForm({ asset_type: "drone", asset_id: "", event_date: "", description: "", cost_sar: "" });
      setFormOpen(false);
      fetchAll();
      setTimeout(() => setSuccessMsg(""), 3500);
    } finally { setSaving(false); }
  };

  const handleMarkDone = async (id: string) => {
    await fetch(`/api/maintenance/schedule/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "COMPLETED" }),
    });
    fetchAll();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this scheduled entry?")) return;
    await fetch(`/api/maintenance/schedule/${id}`, { method: "DELETE" });
    fetchAll();
  };

  const highCount   = alerts.filter(a => a.severity === "HIGH").length;
  const mediumCount = alerts.filter(a => a.severity === "MEDIUM").length;

  const inp: React.CSSProperties = {
    display: "block", width: "100%", marginTop: 5, padding: "8px 10px",
    borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)",
    background: "#0B1628", color: "inherit", boxSizing: "border-box",
  };

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Maintenance Scheduling</h1>
          <p style={{ margin: "4px 0 0", opacity: 0.5, fontSize: 13 }}>
            Service alerts · Upcoming windows · Schedule new entries
          </p>
        </div>
        <button onClick={() => setFormOpen(f => !f)} style={{
          padding: "8px 18px", borderRadius: 8, border: "none",
          background: "#3b82f6", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 14,
        }}>
          {formOpen ? "✕ Cancel" : "+ Schedule Maintenance"}
        </button>
      </div>

      {/* Summary badges */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        {[
          { label: "HIGH alerts",    value: highCount,           color: "#ef4444" },
          { label: "MEDIUM alerts",  value: mediumCount,         color: "#fb923c" },
          { label: "Scheduled",      value: schedule.length,     color: "#60a5fa" },
          { label: "Upcoming shows", value: upcomingShows.length, color: "#a78bfa" },
        ].map(b => (
          <div key={b.label} style={{
            padding: "10px 18px", borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.04)", minWidth: 110,
          }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: b.color }}>{b.value}</div>
            <div style={{ fontSize: 11, opacity: 0.55, marginTop: 2 }}>{b.label}</div>
          </div>
        ))}
      </div>

      {/* Success banner */}
      {successMsg && (
        <div style={{
          marginBottom: 16, padding: "10px 16px", borderRadius: 8,
          background: "rgba(34,197,94,0.13)", border: "1px solid rgba(34,197,94,0.38)",
          color: "#4ade80", fontSize: 13,
        }}>{successMsg}</div>
      )}

      {/* Schedule form */}
      {formOpen && (
        <div style={{
          marginBottom: 28, padding: 20, borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.03)",
        }}>
          <h2 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>New Maintenance Entry</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, opacity: 0.6 }}>Asset Type</label>
              <select value={form.asset_type}
                onChange={e => setForm(f => ({ ...f, asset_type: e.target.value, asset_id: "" }))}
                style={inp}>
                <option value="drone">Drone</option>
                <option value="battery">Battery</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, opacity: 0.6 }}>Asset</label>
              <select value={form.asset_id}
                onChange={e => setForm(f => ({ ...f, asset_id: e.target.value }))}
                style={inp}>
                <option value="">Select…</option>
                {assetOptions.map((a: AssetOption) => (
                  <option key={a.id} value={a.id}>{a.serial_number} ({a.status})</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, opacity: 0.6 }}>Scheduled Date</label>
              <input type="date" value={form.event_date}
                onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))}
                style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 11, opacity: 0.6 }}>Cost (SAR)</label>
              <input type="number" min="0" value={form.cost_sar} placeholder="0"
                onChange={e => setForm(f => ({ ...f, cost_sar: e.target.value }))}
                style={inp} />
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ fontSize: 11, opacity: 0.6 }}>Description</label>
              <input type="text" value={form.description}
                placeholder="e.g. Propeller check, motor inspection…"
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                style={inp} />
            </div>
          </div>
          <button onClick={handleSubmit}
            disabled={saving || !form.asset_id || !form.event_date}
            style={{
              marginTop: 16, padding: "9px 22px", borderRadius: 8, border: "none",
              background: saving || !form.asset_id || !form.event_date ? "#334155" : "#3b82f6",
              color: "#fff", fontWeight: 600,
              cursor: saving || !form.asset_id || !form.event_date ? "default" : "pointer",
            }}>
            {saving ? "Saving…" : "Save Entry"}
          </button>
        </div>
      )}

      {loading ? <p style={{ opacity: 0.4, fontSize: 14 }}>Loading…</p> : (<>

        {/* Service Alerts */}
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px" }}>
            ⚠ Service Alerts
            <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 400, opacity: 0.5 }}>
              {alerts.length === 0 ? "All assets within service window" : `${alerts.length} asset${alerts.length !== 1 ? "s" : ""} flagged`}
            </span>
          </h2>
          {alerts.length === 0
            ? <p style={{ opacity: 0.4, fontSize: 13, margin: 0 }}>✓ No overdue assets detected.</p>
            : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
                {alerts.map((a, i) => {
                  const s = SEV[a.severity];
                  return (
                    <div key={i} style={{ padding: 14, borderRadius: 10, background: s.bg, border: `1px solid ${s.border}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>
                          {a.asset_type === "drone" ? "🚁" : "🔋"} {a.serial_number}
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 800, background: s.badge, color: "#fff", padding: "2px 8px", borderRadius: 6 }}>
                          {a.severity}
                        </span>
                      </div>
                      <div style={{ marginTop: 10, fontSize: 12, lineHeight: 1.9, opacity: 0.88 }}>
                        {a.asset_type === "drone" ? (<>
                          <div>Last service: <b>{(a as DroneAlert).last_maintenance_date ?? "Never"}</b></div>
                          {(a as DroneAlert).days_since_service !== null &&
                            <div>Days since service: <b>{(a as DroneAlert).days_since_service}</b></div>}
                          {(a as DroneAlert).next_show_date &&
                            <div style={{ marginTop: 4, opacity: 0.7 }}>
                              Next show: {(a as DroneAlert).next_show_date} ({(a as DroneAlert).days_to_next_show}d away)
                            </div>}
                        </>) : (<>
                          <div>Cycles: <b>{(a as BatteryAlert).cycle_count}</b> / {(a as BatteryAlert).cycle_max}</div>
                          <div>Health: <b>{(a as BatteryAlert).health_pct}%</b></div>
                          <div style={{ marginTop: 4, opacity: 0.7 }}>Near cycle limit — review replacement</div>
                        </>)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </section>

        {/* Upcoming Shows */}
        {upcomingShows.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 10px" }}>📅 Upcoming Shows (next 60 days)</h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {upcomingShows.map(s => (
                <div key={s.id} style={{
                  padding: "7px 14px", borderRadius: 8,
                  border: "1px solid rgba(167,139,250,0.25)",
                  background: "rgba(167,139,250,0.08)", fontSize: 12,
                }}>
                  <span style={{ fontWeight: 600 }}>{s.name ?? `Show #${s.id}`}</span>
                  <span style={{ opacity: 0.55, margin: "0 8px" }}>{s.date}</span>
                  <span style={{ opacity: 0.8 }}>{s.drones_required} drones</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Scheduled Timeline */}
        <section>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px" }}>
            🗓 Scheduled Maintenance
            <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 400, opacity: 0.5 }}>
              {schedule.length} entr{schedule.length === 1 ? "y" : "ies"}
            </span>
          </h2>
          {schedule.length === 0
            ? <p style={{ opacity: 0.4, fontSize: 13, margin: 0 }}>No upcoming entries. Use "+ Schedule Maintenance" to add one.</p>
            : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {schedule.map(entry => {
                  const done = entry.status === "COMPLETED";
                  return (
                    <div key={entry.id} style={{
                      display: "flex", alignItems: "center", gap: 14,
                      padding: "11px 16px", borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: done ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)",
                    }}>
                      <div style={{ minWidth: 90, fontSize: 12, fontFamily: "monospace", opacity: 0.55 }}>
                        {entry.event_date}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>
                          {entry.asset_type === "DRONE" ? "🚁" : "🔋"} {entry.asset_serial ?? entry.asset_id}
                        </span>
                        {entry.description && (
                          <span style={{ marginLeft: 10, opacity: 0.55, fontSize: 12 }}>{entry.description}</span>
                        )}
                      </div>
                      {entry.cost_sar > 0 && (
                        <div style={{ fontSize: 12, opacity: 0.55, whiteSpace: "nowrap" }}>
                          SAR {entry.cost_sar.toLocaleString()}
                        </div>
                      )}
                      <div style={{
                        fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 6, whiteSpace: "nowrap",
                        background: done ? "rgba(34,197,94,0.15)" : "rgba(59,130,246,0.15)",
                        color: done ? "#4ade80" : "#60a5fa",
                      }}>
                        {entry.status}
                      </div>
                      {!done && (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => handleMarkDone(entry.id)} style={{
                            padding: "4px 10px", borderRadius: 6,
                            border: "1px solid rgba(34,197,94,0.35)",
                            background: "transparent", color: "#4ade80", cursor: "pointer", fontSize: 11,
                          }}>✓ Done</button>
                          <button onClick={() => handleDelete(entry.id)} style={{
                            padding: "4px 10px", borderRadius: 6,
                            border: "1px solid rgba(239,68,68,0.35)",
                            background: "transparent", color: "#ef4444", cursor: "pointer", fontSize: 11,
                          }}>✕</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
        </section>

      </>)}
    </div>
  );
}

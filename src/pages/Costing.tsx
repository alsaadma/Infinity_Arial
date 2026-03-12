import { useState, useEffect, useCallback } from "react";
import { useAssetAuth, type AssetSession } from "../hooks/useAssetAuth";

// ── Types ────────────────────────────────────────────────────────────────────

interface ShowOption { id: string; name: string; date: string }

interface CostItem {
  id: string; show_id: string; category: string;
  description: string | null; quantity: number; unit_cost: number;
  hours_flown: number | null; notes: string | null;
  created_at: string; created_by: string | null;
}
interface ShowCostData {
  ok: boolean; show: ShowOption;
  items: CostItem[];
  subtotals: Record<string, number>;
  grand_total: number;
}
interface SummaryData {
  ok: boolean;
  period: { from: string | null; to: string | null };
  by_category: { category: string; total: number; total_hours: number | null }[];
  by_show: { id: string; name: string; date: string; total_cost: number }[];
  grand_total: number;
}
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

// ── Theme ────────────────────────────────────────────────────────────────────

const CARD   = "#111E35";
const BDR    = "rgba(255,255,255,0.08)";
const ACCENT = "#4A9EFF";
const TEXT   = "#F0F4FF";
const MUTED  = "#8FA3C0";
const RED    = "#E53935";
const GREEN  = "#43A047";
const ORANGE = "#FB8C00";
const GOLD   = "#F9A825";
const PURPLE = "#9C27B0";

const CATS: { value: string; label: string; color: string }[] = [
  { value: "drone_deployment",  label: "Drone Deployment",  color: ACCENT  },
  { value: "technician_labor",  label: "Technician Labor",  color: GREEN   },
  { value: "travel_logistics",  label: "Travel & Logistics", color: ORANGE  },
  { value: "equipment_wear",    label: "Equipment Wear",    color: GOLD    },
  { value: "permits",           label: "Permits",           color: PURPLE  },
];

function catColor(c: string) { return CATS.find(x => x.value === c)?.color ?? MUTED; }
function catLabel(c: string) { return CATS.find(x => x.value === c)?.label ?? c; }

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

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      background: color + "22", color, borderRadius: 6,
      padding: "2px 8px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" as const,
    }}>{label}</span>
  );
}

// ── Login Gate ───────────────────────────────────────────────────────────────

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

// ── Per-Show Cost Panel ───────────────────────────────────────────────────────

function ShowCostPanel({ session, shows }: { session: AssetSession; shows: ShowOption[] }) {
  const [showId,    setShowId]    = useState<string>("");
  const [data,      setData]      = useState<ShowCostData | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [editId,    setEditId]    = useState<string | null>(null);

  // form state
  const [fCat,   setFCat]   = useState("drone_deployment");
  const [fDesc,  setFDesc]  = useState("");
  const [fQty,   setFQty]   = useState("1");
  const [fCost,  setFCost]  = useState("");
  const [fHours, setFHours] = useState("");
  const [fNotes, setFNotes] = useState("");
  const [fBusy,  setFBusy]  = useState(false);
  const [fErr,   setFErr]   = useState("");

  const loadShow = useCallback(async (id: string) => {
    if (!id) { setData(null); return; }
    setLoading(true);
    try {
      const r = await fetch(`/api/costs/show/${id}`).then(x => x.json());
      setData(r.ok ? r : null);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadShow(showId); }, [showId, loadShow]);

  function resetForm() {
    setFCat("drone_deployment"); setFDesc(""); setFQty("1");
    setFCost(""); setFHours(""); setFNotes(""); setFErr(""); setEditId(null);
  }

  function startEdit(item: CostItem) {
    setEditId(item.id);
    setFCat(item.category);
    setFDesc(item.description ?? "");
    setFQty(String(item.quantity));
    setFCost(String(item.unit_cost));
    setFHours(item.hours_flown != null ? String(item.hours_flown) : "");
    setFNotes(item.notes ?? "");
    setFErr("");
  }

  async function saveEntry() {
    setFBusy(true); setFErr("");
    const body: Record<string, unknown> = {
      show_id: showId, category: fCat,
      description: fDesc.trim() || null,
      quantity: parseFloat(fQty),
      unit_cost: parseFloat(fCost),
      hours_flown: fHours.trim() ? parseFloat(fHours) : null,
      notes: fNotes.trim() || null,
      created_by: session.email,
    };
    const url    = editId ? `/api/costs/${editId}` : "/api/costs";
    const method = editId ? "PUT" : "POST";
    const r = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!d.ok) { setFErr(d.error ?? "Failed"); }
    else { resetForm(); loadShow(showId); }
    setFBusy(false);
  }

  async function deleteEntry(id: string) {
    if (!window.confirm("Delete this cost entry?")) return;
    await fetch(`/api/costs/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.token}` },
    });
    loadShow(showId);
  }

  const totalRow = (cat: string) => (data?.subtotals[cat] ?? 0);
  const grandTotal = data?.grand_total ?? 0;

  return (
    <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 12,
                  padding: "20px 24px", marginBottom: 24 }}>
      <h3 style={{ margin: "0 0 16px", color: TEXT, fontSize: 15, fontWeight: 600 }}>
        Per-Show Cost Breakdown
      </h3>

      {/* Show selector */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 5 }}>Select Show</label>
        <select value={showId} onChange={e => { setShowId(e.target.value); resetForm(); }}
          style={{ ...inp, maxWidth: 360 }}>
          <option value="">-- choose a show --</option>
          {shows.map(s => (
            <option key={s.id} value={s.id}>{s.name} ({s.date})</option>
          ))}
        </select>
      </div>

      {loading && <p style={{ color: MUTED }}>Loading...</p>}

      {data && (
        <>
          {/* Category subtotal pills */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const, marginBottom: 18 }}>
            {CATS.map(c => (
              <div key={c.value} style={{ background: c.color + "18", border: `1px solid ${c.color}44`,
                                          borderRadius: 8, padding: "8px 14px", minWidth: 130 }}>
                <div style={{ color: MUTED, fontSize: 10, fontWeight: 600,
                              textTransform: "uppercase", letterSpacing: 0.4 }}>{c.label}</div>
                <div style={{ color: c.color, fontWeight: 700, fontSize: 15, marginTop: 3 }}>
                  SAR {(totalRow(c.value)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            ))}
            <div style={{ background: "rgba(249,168,37,0.12)", border: `1px solid ${GOLD}44`,
                          borderRadius: 8, padding: "8px 14px", minWidth: 130 }}>
              <div style={{ color: MUTED, fontSize: 10, fontWeight: 600,
                            textTransform: "uppercase", letterSpacing: 0.4 }}>Grand Total</div>
              <div style={{ color: GOLD, fontWeight: 700, fontSize: 15, marginTop: 3 }}>
                SAR {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Add / Edit form */}
          <div style={{ background: "#0B1628", border: `1px solid ${BDR}`, borderRadius: 10,
                        padding: "16px 18px", marginBottom: 18 }}>
            <div style={{ color: TEXT, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
              {editId ? "Edit Entry" : "Add Cost Entry"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ color: MUTED, fontSize: 11, display: "block", marginBottom: 4 }}>Category *</label>
                <select value={fCat} onChange={e => setFCat(e.target.value)} style={inp}>
                  {CATS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: MUTED, fontSize: 11, display: "block", marginBottom: 4 }}>Description</label>
                <input value={fDesc} onChange={e => setFDesc(e.target.value)}
                  placeholder="e.g. Night flight crew" style={inp} />
              </div>
              <div>
                <label style={{ color: MUTED, fontSize: 11, display: "block", marginBottom: 4 }}>Qty</label>
                <input value={fQty} onChange={e => setFQty(e.target.value)}
                  type="number" min="0.01" step="any" style={inp} />
              </div>
              <div>
                <label style={{ color: MUTED, fontSize: 11, display: "block", marginBottom: 4 }}>Unit Cost (SAR) *</label>
                <input value={fCost} onChange={e => setFCost(e.target.value)}
                  type="number" min="0" step="any" placeholder="0.00" style={inp} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ color: MUTED, fontSize: 11, display: "block", marginBottom: 4 }}>
                  Flight Hours {fCat === "drone_deployment" ? "(log)" : "(optional)"}
                </label>
                <input value={fHours} onChange={e => setFHours(e.target.value)}
                  type="number" min="0" step="0.1" placeholder="e.g. 4.5" style={inp} />
              </div>
              <div>
                <label style={{ color: MUTED, fontSize: 11, display: "block", marginBottom: 4 }}>Notes</label>
                <input value={fNotes} onChange={e => setFNotes(e.target.value)}
                  placeholder="Optional notes" style={inp} />
              </div>
            </div>
            {fErr && <p style={{ margin: "0 0 8px", color: RED, fontSize: 13 }}>{fErr}</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <Btn onClick={saveEntry} disabled={fBusy || !fCost}>
                {fBusy ? "Saving..." : editId ? "Update" : "Add Entry"}
              </Btn>
              {editId && <Btn danger small onClick={resetForm}>Cancel</Btn>}
            </div>
          </div>

          {/* Entries table */}
          {data.items.length === 0 ? (
            <p style={{ color: MUTED, margin: 0, fontSize: 13 }}>No cost entries yet for this show.</p>
          ) : (
            <div style={{ overflowX: "auto" as const }}>
              <table style={tbl}>
                <thead><tr>
                  {["Category","Description","Qty","Unit Cost","Total","Hours","Notes",""].map(h =>
                    <th key={h} style={th}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {data.items.map(item => {
                    const total = item.quantity * item.unit_cost;
                    return (
                      <tr key={item.id} style={{ borderBottom: `1px solid ${BDR}` }}>
                        <td style={td}><Badge label={catLabel(item.category)} color={catColor(item.category)} /></td>
                        <td style={{ ...td, color: MUTED, fontSize: 12 }}>{item.description ?? "—"}</td>
                        <td style={{ ...td, textAlign: "right" as const }}>{item.quantity}</td>
                        <td style={{ ...td, textAlign: "right" as const }}>
                          {item.unit_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ ...td, textAlign: "right" as const, fontWeight: 700, color: ACCENT }}>
                          {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td style={{ ...td, textAlign: "right" as const, color: MUTED, fontSize: 12 }}>
                          {item.hours_flown != null ? item.hours_flown + " h" : "—"}
                        </td>
                        <td style={{ ...td, color: MUTED, fontSize: 12, maxWidth: 160,
                                      overflow: "hidden", textOverflow: "ellipsis",
                                      whiteSpace: "nowrap" as const }}>
                          {item.notes ?? "—"}
                        </td>
                        <td style={{ ...td }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <Btn small onClick={() => startEdit(item)}>Edit</Btn>
                            <Btn small danger onClick={() => deleteEntry(item.id)}>Del</Btn>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {!showId && (
        <p style={{ color: MUTED, fontSize: 13, margin: 0 }}>Select a show above to view or log costs.</p>
      )}
    </div>
  );
}

// ── Period Summary Panel ──────────────────────────────────────────────────────

function PeriodSummaryPanel() {
  const today = new Date().toISOString().slice(0, 10);
  const firstOfYear = today.slice(0, 4) + "-01-01";
  const [from,    setFrom]    = useState(firstOfYear);
  const [to,      setTo]      = useState(today);
  const [data,    setData]    = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (from) qs.set("from", from);
      if (to)   qs.set("to",   to);
      const r = await fetch(`/api/costs/summary?${qs}`).then(x => x.json());
      setData(r.ok ? r : null);
    } finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 12,
                  padding: "20px 24px", marginBottom: 24 }}>
      <h3 style={{ margin: "0 0 16px", color: TEXT, fontSize: 15, fontWeight: 600 }}>
        Period Cost Summary
      </h3>

      {/* Date range */}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 20 }}>
        <div>
          <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 4 }}>From</label>
          <input value={from} onChange={e => setFrom(e.target.value)} type="date" style={{ ...inp, width: 160 }} />
        </div>
        <div>
          <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 4 }}>To</label>
          <input value={to} onChange={e => setTo(e.target.value)} type="date" style={{ ...inp, width: 160 }} />
        </div>
        {loading && <span style={{ color: MUTED, fontSize: 12, paddingBottom: 10 }}>Loading...</span>}
      </div>

      {data && (
        <>
          {/* Category totals */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const, marginBottom: 20 }}>
            {CATS.map(c => {
              const row = data.by_category.find(x => x.category === c.value);
              return (
                <div key={c.value} style={{ background: c.color + "18", border: `1px solid ${c.color}44`,
                                            borderRadius: 8, padding: "10px 16px", minWidth: 150 }}>
                  <div style={{ color: MUTED, fontSize: 10, fontWeight: 600,
                                textTransform: "uppercase", letterSpacing: 0.4 }}>{c.label}</div>
                  <div style={{ color: c.color, fontWeight: 700, fontSize: 16, marginTop: 4 }}>
                    SAR {(row?.total ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  {c.value === "drone_deployment" && row?.total_hours != null && (
                    <div style={{ color: MUTED, fontSize: 11, marginTop: 2 }}>
                      {row.total_hours} hrs logged
                    </div>
                  )}
                </div>
              );
            })}
            <div style={{ background: "rgba(249,168,37,0.12)", border: `1px solid ${GOLD}44`,
                          borderRadius: 8, padding: "10px 16px", minWidth: 150 }}>
              <div style={{ color: MUTED, fontSize: 10, fontWeight: 600,
                            textTransform: "uppercase", letterSpacing: 0.4 }}>Period Total</div>
              <div style={{ color: GOLD, fontWeight: 700, fontSize: 16, marginTop: 4 }}>
                SAR {data.grand_total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* By show table */}
          {data.by_show.length === 0 ? (
            <p style={{ color: MUTED, fontSize: 13, margin: 0 }}>No cost data for this period.</p>
          ) : (
            <>
              <div style={{ color: MUTED, fontSize: 12, marginBottom: 8 }}>
                Shows by total cost (highest first)
              </div>
              <div style={{ overflowX: "auto" as const }}>
                <table style={tbl}>
                  <thead><tr>
                    {["Show","Date","Total Cost (SAR)"].map(h => <th key={h} style={th}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {data.by_show.map(s => (
                      <tr key={s.id} style={{ borderBottom: `1px solid ${BDR}` }}>
                        <td style={{ ...td, fontWeight: 600 }}>{s.name}</td>
                        <td style={{ ...td, color: MUTED, fontSize: 12 }}>{s.date}</td>
                        <td style={{ ...td, color: GOLD, fontWeight: 700, textAlign: "right" as const }}>
                          {s.total_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── Main Costing Panel ────────────────────────────────────────────────────────

function CostingPanel({ session, onLogout }: { session: AssetSession; onLogout: () => void }) {
  const [shows,    setShows]    = useState<ShowOption[]>([]);
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
      const [sr, mr, showr] = await Promise.all([
        fetch("/api/costing/summary").then(r => r.json()),
        fetch("/api/costing/maintenance?limit=50").then(r => r.json()),
        fetch("/api/shows").then(r => r.json()),
      ]);
      setSummary(sr);
      setMaint(mr.items ?? []);
      setShows((showr.items ?? []).sort((a: ShowOption, b: ShowOption) =>
        a.date > b.date ? -1 : 1));
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

      {/* ── NEW: Per-Show Cost Breakdown ── */}
      <ShowCostPanel session={session} shows={shows} />

      {/* ── NEW: Period Summary ── */}
      <PeriodSummaryPanel />

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

// ── Export ────────────────────────────────────────────────────────────────────

export default function Costing() {
  const { session, login, logout } = useAssetAuth();
  if (!session) return <LoginGate onLogin={login} />;
  return <CostingPanel session={session} onLogout={logout} />;
}
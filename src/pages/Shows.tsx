import { useState, useEffect, useCallback } from "react";
import { useAssetAuth, type AssetSession } from "../hooks/useAssetAuth";

type ShowStatus = "PLANNED" | "CONFIRMED" | "ACTIVE" | "COMPLETED" | "CANCELLED";

interface ShowEvent {
  id: string;
  name: string;
  date: string;
  venue: string | null;
  drones_required: number;
  status: ShowStatus;
  notes: string | null;
  created_at: string;
}

const CARD  = "#111E35";
const BDR   = "rgba(255,255,255,0.08)";
const ACCENT = "#4A9EFF";
const TEXT  = "#F0F4FF";
const MUTED = "#8FA3C0";
const RED   = "#E53935";
const GREEN = "#43A047";
const ORANGE = "#FB8C00";
const PURPLE = "#7C4DFF";

function statusColor(s: string) {
  if (s === "CONFIRMED") return GREEN;
  if (s === "ACTIVE")    return ACCENT;
  if (s === "PLANNED")   return ORANGE;
  if (s === "COMPLETED") return MUTED;
  if (s === "CANCELLED") return RED;
  return TEXT;
}

function statusBg(s: string) {
  if (s === "CONFIRMED") return "rgba(67,160,71,0.15)";
  if (s === "ACTIVE")    return "rgba(74,158,255,0.15)";
  if (s === "PLANNED")   return "rgba(251,140,0,0.15)";
  if (s === "COMPLETED") return "rgba(143,163,192,0.12)";
  if (s === "CANCELLED") return "rgba(229,57,53,0.12)";
  return "transparent";
}

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
const td: React.CSSProperties = { padding: "11px 14px", verticalAlign: "middle" };
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

function KpiCard({ label, value, sub, color }: {
  label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 12,
                  padding: "18px 22px", flex: 1, minWidth: 130 }}>
      <div style={{ color: MUTED, fontSize: 12, fontWeight: 600,
                    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{label}</div>
      <div style={{ color: color ?? TEXT, fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ color: MUTED, fontSize: 12, marginTop: 6 }}>{sub}</div>}
    </div>
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
                        background: "linear-gradient(135deg,#7C4DFF,#4A9EFF)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 24 }}>📅</div>
          <h2 style={{ margin: 0, color: TEXT, fontWeight: 700, fontSize: 20 }}>Show Engine</h2>
          <p style={{ margin: "8px 0 0", color: MUTED, fontSize: 13 }}>
            Authentication required to manage shows
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
      </div>
    </div>
  );
}

function ShowForm({ token, initial, onDone, onCancel }: {
  token: string;
  initial?: ShowEvent;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name,   setName]   = useState(initial?.name   ?? "");
  const [date,   setDate]   = useState(initial?.date   ?? "");
  const [venue,  setVenue]  = useState(initial?.venue  ?? "");
  const [drones, setDrones] = useState(String(initial?.drones_required ?? ""));
  const [status, setStatus] = useState<ShowStatus>(initial?.status ?? "PLANNED");
  const [notes,  setNotes]  = useState(initial?.notes  ?? "");
  const [busy,   setBusy]   = useState(false);
  const [err,    setErr]    = useState("");

  async function save() {
    setBusy(true); setErr("");
    const body = {
      name: name.trim(), date: date.trim(),
      venue: venue.trim() || null,
      drones_required: parseInt(drones) || 0,
      status, notes: notes.trim() || null,
    };
    const url    = initial ? `/api/shows/${initial.id}` : "/api/shows";
    const method = initial ? "PATCH" : "POST";
    const r = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!d.ok) setErr(d.error ?? "Failed");
    else onDone();
    setBusy(false);
  }

  return (
    <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 12,
                  padding: 24, marginBottom: 20 }}>
      <h3 style={{ margin: "0 0 18px", color: TEXT, fontSize: 15, fontWeight: 600 }}>
        {initial ? "Edit Show" : "Plan New Show"}
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 5 }}>Show Name *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Riyadh Season Night 1" style={inp} />
        </div>
        <div>
          <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 5 }}>Date *</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inp} />
        </div>
        <div>
          <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 5 }}>Drones Required *</label>
          <input type="number" value={drones} onChange={e => setDrones(e.target.value)}
            placeholder="0" min={0} style={inp} />
        </div>
        <div>
          <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 5 }}>Venue</label>
          <input value={venue} onChange={e => setVenue(e.target.value)} placeholder="Location" style={inp} />
        </div>
        <div>
          <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 5 }}>Status</label>
          <select value={status} onChange={e => setStatus(e.target.value as ShowStatus)}
            style={{ ...inp, color: statusColor(status) }}>
            {["PLANNED","CONFIRMED","ACTIVE","COMPLETED","CANCELLED"].map(s =>
              <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 5 }}>Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Optional notes" rows={2}
            style={{ ...inp, resize: "vertical" as const, fontFamily: "inherit" }} />
        </div>
      </div>
      {err && <p style={{ margin: "10px 0 0", color: RED, fontSize: 13 }}>{err}</p>}
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <Btn onClick={save} disabled={busy}>{busy ? "Saving…" : initial ? "Save Changes" : "Plan Show"}</Btn>
        <Btn onClick={onCancel} danger>Cancel</Btn>
      </div>
    </div>
  );
}


// ── Inter-Show Dependency Timeline ─────────────────────────────────────────
const DEP_DEFAULTS = [
  { key: "logistics", icon: "🚛", label: "Logistics",      hours: 24 },
  { key: "battery",   icon: "🔋", label: "Battery Charge", hours: 6  },
  { key: "crew",      icon: "👥", label: "Crew Rest",      hours: 12 },
];

function addHours(dateStr: string, endTime: string, hours: number): Date {
  const base = new Date(dateStr + "T" + endTime + ":00");
  return new Date(base.getTime() + hours * 3600 * 1000);
}

function fmtDt(d: Date): string {
  return d.toLocaleDateString("en-GB", { weekday:"short", day:"2-digit", month:"short" })
       + " " + d.toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit" });
}

function fmtDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + pad(d.getMonth()+1) + "-" + pad(d.getDate())
       + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
}

function DependencyTimeline({ shows }: { shows: ShowEvent[] }) {
  const eligible = shows.filter(s => s.status !== "CANCELLED");
  const [showA,    setShowA]    = useState<string>("");
  const [showB,    setShowB]    = useState<string>("");
  const [endTime,  setEndTime]  = useState("22:00");
  const [overrides, setOverrides] = useState<Record<string, { active: boolean; value: string }>>({});

  const sA = eligible.find(s => s.id === showA) ?? null;
  const sB = eligible.find(s => s.id === showB) ?? null;

  function getOverride(key: string) {
    return overrides[key] ?? { active: false, value: "" };
  }
  function setOverride(key: string, patch: Partial<{ active: boolean; value: string }>) {
    setOverrides(prev => ({ ...prev, [key]: { ...getOverride(key), ...patch } }));
  }

  const depRows = DEP_DEFAULTS.map(dep => {
    const auto = sA ? addHours(sA.date, endTime, dep.hours) : null;
    const ov   = getOverride(dep.key);
    const ready: Date | null = ov.active && ov.value
      ? new Date(ov.value)
      : auto;
    return { ...dep, auto, ready };
  });

  const nextOk: Date | null = depRows.reduce<Date | null>((mx, r) => {
    if (!r.ready) return mx;
    return mx == null || r.ready > mx ? r.ready : mx;
  }, null);

  const bottleneck = nextOk
    ? depRows.find(r => r.ready && r.ready.getTime() === nextOk!.getTime())?.label ?? ""
    : "";

  const showBDate = sB ? new Date(sB.date + "T00:00:00") : null;
  const gapMs     = nextOk && showBDate ? showBDate.getTime() - nextOk.getTime() : null;
  const gapHours  = gapMs != null ? Math.round(gapMs / 3600000) : null;
  const gapOk     = gapHours != null && gapHours >= 0;

  const selStyle: React.CSSProperties = {
    background: "#1A2A44", border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 8, color: "#F0F4FF", padding: "9px 14px",
    fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box",
  };

  return (
    <div style={{ background: "#111E35", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12, padding: "20px 24px", marginTop: 28 }}>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 4px", color: "#F0F4FF", fontSize: 15, fontWeight: 600 }}>
          Inter-Show Dependency Timeline
        </h3>
        <p style={{ margin: 0, color: "#8FA3C0", fontSize: 12 }}>
          Calculate earliest possible start for the next show after dependencies are cleared.
        </p>
      </div>

      {/* Show selectors + end time */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 140px", gap: 12, marginBottom: 20 }}>
        <div>
          <label style={{ color: "#8FA3C0", fontSize: 12, display: "block", marginBottom: 5 }}>
            Show A (just completed)
          </label>
          <select value={showA} onChange={e => setShowA(e.target.value)} style={selStyle}>
            <option value="">— select show —</option>
            {eligible.map(s => (
              <option key={s.id} value={s.id}>{s.date} · {s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ color: "#8FA3C0", fontSize: 12, display: "block", marginBottom: 5 }}>
            Show B (next show)
          </label>
          <select value={showB} onChange={e => setShowB(e.target.value)} style={selStyle}>
            <option value="">— select show —</option>
            {eligible.filter(s => s.id !== showA).map(s => (
              <option key={s.id} value={s.id}>{s.date} · {s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ color: "#8FA3C0", fontSize: 12, display: "block", marginBottom: 5 }}>
            Show A End Time
          </label>
          <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
            style={selStyle} />
        </div>
      </div>

      {/* Dependency rows */}
      {sA ? (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
            {depRows.map(dep => {
              const ov = getOverride(dep.key);
              return (
                <div key={dep.key} style={{
                  background: "#0D1828", border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 10, padding: "12px 16px",
                  display: "grid", gridTemplateColumns: "28px 140px 1fr auto", alignItems: "center", gap: 12,
                }}>
                  <span style={{ fontSize: 18 }}>{dep.icon}</span>
                  <div>
                    <div style={{ color: "#F0F4FF", fontSize: 13, fontWeight: 600 }}>{dep.label}</div>
                    <div style={{ color: "#8FA3C0", fontSize: 11 }}>default {dep.hours}h after show end</div>
                  </div>
                  <div>
                    {ov.active ? (
                      <input type="datetime-local" value={ov.value}
                        onChange={e => setOverride(dep.key, { value: e.target.value })}
                        style={{ ...selStyle, width: "auto", fontSize: 13, padding: "5px 10px" }} />
                    ) : (
                      <span style={{ color: "#4A9EFF", fontSize: 13, fontWeight: 600 }}>
                        {dep.auto ? "Ready by " + fmtDt(dep.auto) : "—"}
                      </span>
                    )}
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 6,
                                   color: "#8FA3C0", fontSize: 12, cursor: "pointer",
                                   whiteSpace: "nowrap" as const }}>
                    <input type="checkbox" checked={ov.active}
                      onChange={e => {
                        const active = e.target.checked;
                        const val = dep.auto ? fmtDatetimeLocal(dep.auto) : "";
                        setOverride(dep.key, { active, value: ov.value || val });
                      }} />
                    Override
                  </label>
                </div>
              );
            })}
          </div>

          {/* Next OK result */}
          {nextOk && (
            <div style={{ background: "#0D1828", borderRadius: 10,
                          border: "1px solid rgba(74,158,255,0.25)", padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                            flexWrap: "wrap" as const, gap: 12 }}>
                <div>
                  <div style={{ color: "#8FA3C0", fontSize: 11, textTransform: "uppercase",
                                letterSpacing: 0.5, marginBottom: 6 }}>
                    Next OK Calculation · Earliest Possible Start
                  </div>
                  <div style={{ color: "#4A9EFF", fontSize: 22, fontWeight: 700 }}>
                    {fmtDt(nextOk)}
                  </div>
                  <div style={{ color: "#8FA3C0", fontSize: 12, marginTop: 4 }}>
                    Bottleneck: <span style={{ color: "#F0F4FF" }}>{bottleneck}</span>
                  </div>
                </div>
                {sB && gapHours != null && (
                  <div style={{ textAlign: "right" as const }}>
                    <div style={{ color: "#8FA3C0", fontSize: 11, textTransform: "uppercase",
                                  letterSpacing: 0.5, marginBottom: 6 }}>
                      Gap to Show B
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700,
                                  color: gapOk ? "#43A047" : "#E53935" }}>
                      {gapOk ? "+" : ""}{gapHours}h
                    </div>
                    <div style={{ fontSize: 12, color: gapOk ? "#43A047" : "#E53935",
                                  marginTop: 4, fontWeight: 600 }}>
                      {gapOk ? "✓ Schedule is feasible" : "✗ Insufficient gap — reschedule Show B"}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <p style={{ color: "#8FA3C0", fontSize: 13, margin: 0 }}>
          Select Show A to calculate dependency ready times.
        </p>
      )}
    </div>
  );
}

function ShowsPanel({ session, onLogout }: { session: AssetSession; onLogout: () => void }) {
  const [shows,    setShows]   = useState<ShowEvent[]>([]);
  const [summary,  setSummary] = useState<any>(null);
  const [fleet,    setFleet]   = useState<number | null>(null);
  const [loading,  setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing,  setEditing]  = useState<ShowEvent | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sr, ss, sf] = await Promise.all([
        fetch("/api/shows").then(r => r.json()),
        fetch("/api/shows/summary").then(r => r.json()),
        fetch("/api/fleet/drones/summary").then(r => r.json()),
      ]);
      setShows(sr.items ?? []);
      setSummary(ss.summary ?? null);
      const av = sf?.available_for_planning;
      if (typeof av === "number") setFleet(av);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function deleteShow(id: string, name: string) {
    if (!confirm(`Delete "${name}"?\n\nThis is permanent.`)) return;
    await fetch(`/api/shows/${id}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${session.token}` },
    });
    load();
  }

  const upcoming = shows.filter(s =>
    s.date >= new Date().toISOString().slice(0, 10) && s.status !== "CANCELLED"
  );
  const fleetDemand = upcoming.reduce((sum, s) => sum + s.drones_required, 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, color: TEXT, fontWeight: 700, fontSize: 22 }}>Show / Event Engine</h1>
          <p style={{ margin: "4px 0 0", color: MUTED, fontSize: 13 }}>
            Signed in as <strong style={{ color: TEXT }}>{session.email}</strong>
            {" · "}<span style={{ color: PURPLE }}>{session.role}</span>
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn onClick={() => { setEditing(null); setCreating(true); }}>+ Plan Show</Btn>
          <button onClick={onLogout} style={{
            background: "rgba(229,57,53,0.1)", border: "1px solid rgba(229,57,53,0.3)",
            color: RED, borderRadius: 8, padding: "7px 16px", fontSize: 13,
            cursor: "pointer", fontWeight: 500,
          }}>🔒 Lock</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" as const, marginBottom: 24 }}>
        <KpiCard label="Total Shows"     value={summary?.total_shows ?? "—"} />
        <KpiCard label="Upcoming"        value={summary?.upcoming_count ?? "—"}
                 sub="not cancelled" color={ACCENT} />
        <KpiCard label="Peak Demand"     value={summary?.peak_drones_required ?? "—"}
                 sub="single show max" color={ORANGE} />
        <KpiCard label="Total Demand"    value={fleetDemand || "—"}
                 sub="sum of upcoming" color={PURPLE} />
        <KpiCard label="Fleet Available" value={fleet ?? "—"}
                 sub="ACTIVE drones"
                 color={fleet != null && fleetDemand > fleet ? RED : GREEN} />
      </div>

      {creating && !editing && (
        <ShowForm token={session.token}
          onDone={() => { setCreating(false); load(); }}
          onCancel={() => setCreating(false)} />
      )}
      {editing && (
        <ShowForm token={session.token} initial={editing}
          onDone={() => { setEditing(null); load(); }}
          onCancel={() => setEditing(null)} />
      )}

      {loading ? <p style={{ color: MUTED }}>Loading…</p>
       : shows.length === 0
       ? (
        <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 12,
                      padding: 40, textAlign: "center" as const }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📅</div>
          <p style={{ color: MUTED, margin: 0 }}>No shows planned yet. Click "+ Plan Show" to start.</p>
        </div>
       ) : (
        <div style={{ overflowX: "auto" as const }}>
          <table style={tbl}>
            <thead><tr>
              {["Show Name","Date","Venue","Drones","Capacity","Status","Notes","Actions"].map(h =>
                <th key={h} style={th}>{h}</th>)}
            </tr></thead>
            <tbody>
              {shows.map(s => {
                const isActive = s.status !== "CANCELLED" && s.status !== "COMPLETED";
                return (
                  <tr key={s.id} style={{ borderBottom: `1px solid ${BDR}` }}>
                    <td style={{ ...td, fontWeight: 600 }}>{s.name}</td>
                    <td style={{ ...td, color: MUTED, whiteSpace: "nowrap" as const }}>{s.date}</td>
                    <td style={{ ...td, color: MUTED }}>{s.venue ?? "—"}</td>
                    <td style={td}>
                      <span style={{ fontWeight: 700,
                        color: fleet != null && s.drones_required > fleet ? RED
                             : s.drones_required > 500 ? ORANGE : TEXT }}>
                        {s.drones_required.toLocaleString()}
                      </span>
                    </td>
                    <td style={td}>
                      {(() => {
                        if (fleet == null || !isActive)
                          return <span style={{ color: MUTED, fontSize: 12 }}>—</span>;
                        const surplus  = fleet - s.drones_required;
                        const buffer   = fleet > 0 ? surplus / fleet : 0;
                        if (surplus < 0)
                          return (
                            <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 20,
                              background: "rgba(229,57,53,0.15)", color: RED, fontWeight: 600,
                              whiteSpace: "nowrap" as const }}>
                              🔴 -{Math.abs(surplus).toLocaleString()} short
                            </span>
                          );
                        if (buffer < 0.10)
                          return (
                            <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 20,
                              background: "rgba(251,140,0,0.15)", color: ORANGE, fontWeight: 600,
                              whiteSpace: "nowrap" as const }}>
                              🟡 +{surplus.toLocaleString()} thin
                            </span>
                          );
                        return (
                          <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 20,
                            background: "rgba(67,160,71,0.15)", color: GREEN, fontWeight: 600,
                            whiteSpace: "nowrap" as const }}>
                            🟢 +{surplus.toLocaleString()} ok
                          </span>
                        );
                      })()}
                    </td>
                    <td style={td}>
                      <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 20,
                                     background: statusBg(s.status),
                                     color: statusColor(s.status), fontWeight: 600 }}>
                        {s.status}
                      </span>
                    </td>
                    <td style={{ ...td, color: MUTED, fontSize: 12, maxWidth: 200,
                                  overflow: "hidden", textOverflow: "ellipsis",
                                  whiteSpace: "nowrap" as const }}>
                      {s.notes ?? "—"}
                    </td>
                    <td style={td}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Btn small onClick={() => { setCreating(false); setEditing(s); }}>Edit</Btn>
                        <Btn small danger onClick={() => deleteShow(s.id, s.name)}>Delete</Btn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p style={{ color: MUTED, fontSize: 12, marginTop: 8 }}>{shows.length} show(s)</p>
        </div>
      )}
      <DependencyTimeline shows={shows} />
    </div>
  );
}

export default function Shows() {
  const { session, login, logout } = useAssetAuth();
  if (!session) return <LoginGate onLogin={login} />;
  return <ShowsPanel session={session} onLogout={logout} />;
}

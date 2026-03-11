import { useState, useEffect, useCallback } from "react";
import { useAssetAuth, type AssetSession } from "../hooks/useAssetAuth";
import { evaluateReadiness } from "../core/readiness/readinessEngine";
import { readinessPolicyDefault } from "../core/readiness/policyDefault";
import type { ReadinessVerdict } from "../core/readiness/readinessTypes";

// ── Types ─────────────────────────────────────────────────
interface ShowEvent {
  id: string; name: string; date: string; venue: string | null;
  drones_required: number; status: string;
}
interface RawPermit {
  id: string; show_id: string; permit_type: string; authority: string;
  status: string; reference_number: string | null;
  submitted_at: string | null; approved_at: string | null; expires_at: string | null;
}
type CheckStatus = "OPEN" | "IN_PROGRESS" | "DONE" | "BLOCKED";
interface CheckItem {
  id: string; show_id: string; title: string; owner: string | null;
  due_date: string | null; status: CheckStatus; notes: string | null;
}

// ── Theme ─────────────────────────────────────────────────
const CARD   = "#111E35";
const BDR    = "rgba(255,255,255,0.08)";
const ACCENT = "#4A9EFF";
const TEXT   = "#F0F4FF";
const MUTED  = "#8FA3C0";
const RED    = "#E53935";
const GREEN  = "#43A047";
const ORANGE = "#FB8C00";
const PURPLE = "#7C4DFF";

const inp: React.CSSProperties = {
  background: "#1A2A44", border: `1px solid ${BDR}`, borderRadius: 8,
  color: TEXT, padding: "8px 12px", fontSize: 13, outline: "none",
  width: "100%", boxSizing: "border-box",
};
const th: React.CSSProperties = {
  textAlign: "left", padding: "8px 12px", color: MUTED, fontWeight: 600,
  fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5,
  borderBottom: `1px solid ${BDR}`,
};
const td: React.CSSProperties = { padding: "9px 12px", verticalAlign: "middle" };
const tbl: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 13, color: TEXT };

function verdictColor(v: string) {
  if (v === "READY")                 return GREEN;
  if (v === "READY_WITH_MITIGATION") return ORANGE;
  return RED;
}
function verdictBg(v: string) {
  if (v === "READY")                 return "rgba(67,160,71,0.15)";
  if (v === "READY_WITH_MITIGATION") return "rgba(251,140,0,0.15)";
  return "rgba(229,57,53,0.14)";
}
function verdictLabel(v: string) {
  if (v === "READY")                 return "✅ READY";
  if (v === "READY_WITH_MITIGATION") return "⚠️ READY WITH MITIGATION";
  return "🔴 NOT READY";
}
function checkColor(s: string) {
  if (s === "DONE")        return GREEN;
  if (s === "IN_PROGRESS") return ACCENT;
  if (s === "BLOCKED")     return RED;
  return MUTED;
}

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
      padding: small ? "5px 10px" : "8px 18px",
      fontSize: small ? 12 : 13, fontWeight: 600,
      cursor: disabled ? "not-allowed" : "pointer", whiteSpace: "nowrap" as const,
    }}>{children}</button>
  );
}

// ── Permit mapper: DB permit → engine PermitState ─────────
function mapDbPermitToState(p: RawPermit) {
  const statusMap: Record<string, string> = {
    APPROVED: "READY", SUBMITTED: "IN_PROGRESS",
    DRAFT: "MISSING", REJECTED: "MISSING", EXPIRED: "EXPIRED",
  };
  function inferDomain(authority: string) {
    const a = authority.toLowerCase();
    if (a.includes("gaca")) return "GACA";
    if (a.includes("municip") || a.includes("governorate")) return "Municipality";
    if (a.includes("rcu")) return "RCU";
    return "Other";
  }
  return {
    permitId:  p.id,
    title:     p.permit_type,
    domain:    inferDomain(p.authority) as any,
    location:  "Unknown",
    status:    (statusMap[p.status] ?? "MISSING") as any,
    validFrom: p.approved_at  ?? undefined,
    validTo:   p.expires_at   ?? undefined,
  };
}

// ── Show → Window mapper ───────────────────────────────────
function mapShowToWindow(s: ShowEvent) {
  const statusMap: Record<string, string> = {
    PLANNED: "DRAFT", CONFIRMED: "CONFIRMED",
    ACTIVE: "CONFIRMED", COMPLETED: "REJECTED", CANCELLED: "REJECTED",
  };
  return {
    windowId:       s.id,
    name:           s.name,
    startDate:      s.date,
    endDate:        s.date,
    location:       s.venue ?? "Unknown",
    requiredDrones: s.drones_required,
    assignedDrones: 0,
    status:         (statusMap[s.status] ?? "DRAFT") as any,
  };
}

// ── Login Gate ────────────────────────────────────────────
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
                        background: "linear-gradient(135deg,#43A047,#4A9EFF)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 24 }}>🎯</div>
          <h2 style={{ margin: 0, color: TEXT, fontWeight: 700, fontSize: 20 }}>Readiness Engine</h2>
          <p style={{ margin: "8px 0 0", color: MUTED, fontSize: 13 }}>Authentication required</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input value={email} onChange={e => setEmail(e.target.value)} style={inp}
            onKeyDown={e => e.key === "Enter" && submit()} />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            style={inp} onKeyDown={e => e.key === "Enter" && submit()} />
          {error && <p style={{ margin: 0, color: RED, fontSize: 13 }}>{error}</p>}
          <Btn onClick={submit} disabled={busy}>{busy ? "Verifying…" : "Login"}</Btn>
        </div>
      </div>
    </div>
  );
}

// ── Add Checklist Item Form ────────────────────────────────
function AddItemForm({ token, showId, onDone, onCancel }: {
  token: string; showId: string; onDone: () => void; onCancel: () => void;
}) {
  const [title,  setTitle]  = useState("");
  const [owner,  setOwner]  = useState("");
  const [due,    setDue]    = useState("");
  const [status, setStatus] = useState<CheckStatus>("OPEN");
  const [notes,  setNotes]  = useState("");
  const [busy,   setBusy]   = useState(false);
  const [err,    setErr]    = useState("");

  async function save() {
    setBusy(true); setErr("");
    const r = await fetch("/api/readiness/items", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        show_id: showId, title: title.trim(),
        owner: owner.trim() || null, due_date: due || null,
        status, notes: notes.trim() || null,
      }),
    });
    const d = await r.json();
    if (!d.ok) setErr(d.error ?? "Failed");
    else onDone();
    setBusy(false);
  }

  return (
    <div style={{ background: "rgba(74,158,255,0.05)", border: `1px solid ${BDR}`,
                  borderRadius: 10, padding: 16, marginTop: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div>
          <label style={{ color: MUTED, fontSize: 11, display: "block", marginBottom: 4 }}>Task *</label>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Confirm crew briefing" style={inp} />
        </div>
        <div>
          <label style={{ color: MUTED, fontSize: 11, display: "block", marginBottom: 4 }}>Owner</label>
          <input value={owner} onChange={e => setOwner(e.target.value)}
            placeholder="e.g. Ops" style={inp} />
        </div>
        <div>
          <label style={{ color: MUTED, fontSize: 11, display: "block", marginBottom: 4 }}>Due Date</label>
          <input type="date" value={due} onChange={e => setDue(e.target.value)} style={inp} />
        </div>
        <div>
          <label style={{ color: MUTED, fontSize: 11, display: "block", marginBottom: 4 }}>Status</label>
          <select value={status} onChange={e => setStatus(e.target.value as CheckStatus)} style={inp}>
            {["OPEN","IN_PROGRESS","DONE","BLOCKED"].map(s =>
              <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ color: MUTED, fontSize: 11, display: "block", marginBottom: 4 }}>Notes</label>
          <input value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Optional notes" style={inp} />
        </div>
      </div>
      {err && <p style={{ margin: "0 0 8px", color: RED, fontSize: 12 }}>{err}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <Btn small onClick={save} disabled={busy}>{busy ? "Saving…" : "Add Task"}</Btn>
        <Btn small danger onClick={onCancel}>Cancel</Btn>
      </div>
    </div>
  );
}

// ── Show Readiness Card ────────────────────────────────────
function ShowCard({ show, allShows, permits, fleet, items, token, onReload }: {
  show: ShowEvent; allShows: ShowEvent[]; permits: RawPermit[];
  fleet: number; items: CheckItem[]; token: string;
  onReload: () => void;
}) {
  const [open,    setOpen]    = useState(false);
  const [adding,  setAdding]  = useState(false);

  // ── Automated verdict ──────────────────────────────────
  const verdict: ReadinessVerdict = (() => {
    const showPermits = permits.filter(p => p.show_id === show.id);
    const allWindows  = allShows.map(mapShowToWindow);
    return evaluateReadiness({
      showId: show.id,
      window: mapShowToWindow(show),
      allWindows,
      permits: showPermits.map(mapDbPermitToState),
      fleet:   { totalDronesOperational: fleet },
      policy:  readinessPolicyDefault,
    });
  })();

  // ── Checklist stats ────────────────────────────────────
  const showItems = items.filter(i => i.show_id === show.id);
  const done  = showItems.filter(i => i.status === "DONE").length;
  const total = showItems.length;
  const blocked = showItems.filter(i => i.status === "BLOCKED").length;

  async function quickStatus(item: CheckItem, newStatus: CheckStatus) {
    await fetch(`/api/readiness/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus }),
    });
    onReload();
  }

  async function deleteItem(id: string) {
    if (!confirm("Delete this checklist item?")) return;
    await fetch(`/api/readiness/items/${id}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` },
    });
    onReload();
  }

  const isActive = show.status !== "CANCELLED" && show.status !== "COMPLETED";

  return (
    <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 12,
                  marginBottom: 14, overflow: "hidden" }}>
      {/* ── Header row ── */}
      <div onClick={() => setOpen(o => !o)}
        style={{ padding: "14px 20px", cursor: "pointer", display: "flex",
                 alignItems: "center", gap: 16, flexWrap: "wrap" as const,
                 borderBottom: open ? `1px solid ${BDR}` : "none" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: TEXT }}>{show.name}</div>
          <div style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>
            {show.date} {show.venue ? `· ${show.venue}` : ""}
          </div>
        </div>
        {/* Automated verdict badge */}
        {isActive && (
          <span style={{ fontSize: 12, padding: "4px 12px", borderRadius: 20, fontWeight: 700,
                         background: verdictBg(verdict.status), color: verdictColor(verdict.status) }}>
            {verdictLabel(verdict.status)}
          </span>
        )}
        {/* Checklist progress */}
        <span style={{ fontSize: 12, color: MUTED }}>
          Checklist: <b style={{ color: done === total && total > 0 ? GREEN : TEXT }}>
            {done}/{total}
          </b>
          {blocked > 0 && <span style={{ color: RED }}> · {blocked} blocked</span>}
        </span>
        <span style={{ color: MUTED, fontSize: 14 }}>{open ? "▲" : "▼"}</span>
      </div>

      {open && (
        <div style={{ padding: "16px 20px" }}>

          {/* ── Section A: Automated Readiness ── */}
          {isActive && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: ACCENT,
                            marginBottom: 10, textTransform: "uppercase" as const,
                            letterSpacing: 0.5 }}>
                Automated Readiness Gates
              </div>

              {/* Capacity row */}
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" as const,
                            fontSize: 13, marginBottom: 10 }}>
                <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: "8px 14px" }}>
                  <span style={{ color: MUTED }}>Required: </span>
                  <b style={{ color: TEXT }}>{verdict.capacity.required}</b>
                </div>
                <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: "8px 14px" }}>
                  <span style={{ color: MUTED }}>Fleet: </span>
                  <b style={{ color: TEXT }}>{verdict.capacity.available}</b>
                </div>
                <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: "8px 14px" }}>
                  <span style={{ color: MUTED }}>Gap: </span>
                  <b style={{ color: verdict.capacity.gap > 0 ? RED : GREEN }}>
                    {verdict.capacity.gap > 0 ? `+${verdict.capacity.gap} short` : "None"}
                  </b>
                </div>
                <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: "8px 14px" }}>
                  <span style={{ color: MUTED }}>Stress: </span>
                  <b style={{ color: verdict.scoring.stressScore <= 35 ? GREEN
                                     : verdict.scoring.stressScore <= 65 ? ORANGE : RED }}>
                    {verdict.scoring.stressScore}/100
                  </b>
                </div>
              </div>

              {/* Hard gate failures */}
              {verdict.hardGateFailures.length > 0 && (
                <div style={{ background: "rgba(229,57,53,0.08)", border: `1px solid rgba(229,57,53,0.25)`,
                              borderRadius: 8, padding: "10px 14px", marginBottom: 8 }}>
                  <div style={{ color: RED, fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                    Hard Gate Failures
                  </div>
                  {verdict.hardGateFailures.map((f, i) => (
                    <div key={i} style={{ color: "#FF8A80", fontSize: 12, marginBottom: 2 }}>
                      [{f.code}] {f.message}
                    </div>
                  ))}
                </div>
              )}

              {/* Explanation */}
              <div style={{ fontSize: 12, color: MUTED }}>
                {verdict.explanation.map((e, i) => (
                  <div key={i} style={{ marginBottom: 2 }}>• {e}</div>
                ))}
              </div>
            </div>
          )}

          {/* ── Section B: Manual Checklist ── */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between",
                          alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: PURPLE,
                            textTransform: "uppercase" as const, letterSpacing: 0.5 }}>
                Checklist ({done}/{total} done)
              </div>
              {!adding && (
                <Btn small onClick={() => setAdding(true)}>+ Add Task</Btn>
              )}
            </div>

            {adding && (
              <AddItemForm token={token} showId={show.id}
                onDone={() => { setAdding(false); onReload(); }}
                onCancel={() => setAdding(false)} />
            )}

            {showItems.length === 0 && !adding ? (
              <p style={{ color: MUTED, fontSize: 13, margin: "8px 0" }}>
                No checklist items yet. Click "+ Add Task" to start.
              </p>
            ) : showItems.length > 0 && (
              <table style={tbl}>
                <thead><tr>
                  {["Task", "Owner", "Due", "Status", "Notes", ""].map(h =>
                    <th key={h} style={th}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {showItems.map(item => (
                    <tr key={item.id} style={{ borderBottom: `1px solid ${BDR}` }}>
                      <td style={{ ...td, fontWeight: item.status === "DONE" ? 400 : 600,
                                   opacity: item.status === "DONE" ? 0.6 : 1 }}>
                        {item.title}
                      </td>
                      <td style={{ ...td, color: MUTED }}>{item.owner ?? "—"}</td>
                      <td style={{ ...td, color: MUTED, whiteSpace: "nowrap" as const }}>
                        {item.due_date ?? "—"}
                      </td>
                      <td style={td}>
                        <select
                          value={item.status}
                          onChange={e => quickStatus(item, e.target.value as CheckStatus)}
                          style={{ background: "transparent", border: `1px solid ${BDR}`,
                                   borderRadius: 6, color: checkColor(item.status),
                                   padding: "4px 8px", fontSize: 12, fontWeight: 600 }}>
                          {["OPEN","IN_PROGRESS","DONE","BLOCKED"].map(s =>
                            <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td style={{ ...td, color: MUTED, fontSize: 12, maxWidth: 200,
                                   overflow: "hidden", textOverflow: "ellipsis",
                                   whiteSpace: "nowrap" as const }}>
                        {item.notes ?? "—"}
                      </td>
                      <td style={td}>
                        <Btn small danger onClick={() => deleteItem(item.id)}>✕</Btn>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────
function ReadinessPanel({ session, onLogout }: { session: AssetSession; onLogout: () => void }) {
  const [shows,   setShows]   = useState<ShowEvent[]>([]);
  const [permits, setPermits] = useState<RawPermit[]>([]);
  const [fleet,   setFleet]   = useState<number>(0);
  const [items,   setItems]   = useState<CheckItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sr, pr, fr, ir] = await Promise.all([
        fetch("/api/shows").then(r => r.json()),
        fetch("/api/permits").then(r => r.json()),
        fetch("/api/fleet/drones/summary").then(r => r.json()),
        fetch("/api/readiness/items").then(r => r.json()),
      ]);
      setShows(sr.items ?? []);
      setPermits(pr.items ?? []);
      setFleet(fr?.available_for_planning ?? 0);
      setItems(ir.items ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeShows  = shows.filter(s => s.status !== "CANCELLED" && s.status !== "COMPLETED");
  const readyCount   = activeShows.filter(s => {
    const v = evaluateReadiness({
      showId: s.id, window: mapShowToWindow(s),
      allWindows: activeShows.map(mapShowToWindow),
      permits: permits.filter(p => p.show_id === s.id).map(mapDbPermitToState),
      fleet: { totalDronesOperational: fleet },
      policy: readinessPolicyDefault,
    });
    return v.status === "READY";
  }).length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, color: TEXT, fontWeight: 700, fontSize: 22 }}>
            Operational Readiness
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
        }}>🔒 Lock</button>
      </div>

      {/* KPI row */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" as const, marginBottom: 24 }}>
        {[
          { label: "Active Shows",    value: activeShows.length,                color: TEXT   },
          { label: "Fleet Available", value: fleet,                              color: ACCENT },
          { label: "Ready",           value: readyCount,                         color: GREEN  },
          { label: "Not Ready",       value: activeShows.length - readyCount,    color: RED    },
          { label: "Checklist Items", value: items.length,                       color: PURPLE },
          { label: "Completed Tasks", value: items.filter(i => i.status === "DONE").length, color: GREEN },
        ].map(k => (
          <div key={k.label} style={{ background: CARD, border: `1px solid ${BDR}`,
                            borderRadius: 12, padding: "14px 20px", flex: 1, minWidth: 110 }}>
            <div style={{ color: MUTED, fontSize: 11, fontWeight: 600, textTransform: "uppercase",
                          letterSpacing: 0.5, marginBottom: 6 }}>{k.label}</div>
            <div style={{ color: k.color, fontSize: 24, fontWeight: 700 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {loading ? <p style={{ color: MUTED }}>Loading…</p>
       : shows.length === 0
       ? (
        <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 12,
                      padding: 40, textAlign: "center" as const }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🎯</div>
          <p style={{ color: MUTED, margin: 0 }}>No shows found. Add shows via the Shows page first.</p>
        </div>
       ) : (
        <div>
          {shows.map(s => (
            <ShowCard key={s.id} show={s} allShows={shows} permits={permits}
              fleet={fleet} items={items} token={session.token}
              onReload={load} />
          ))}
        </div>
       )}
    </div>
  );
}

// ── Entry point ───────────────────────────────────────────
export default function Readiness() {
  const { session, login, logout } = useAssetAuth();
  if (!session) return <LoginGate onLogin={login} />;
  return <ReadinessPanel session={session} onLogout={logout} />;
}
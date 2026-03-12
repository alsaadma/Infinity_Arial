import { useState, useEffect, useCallback } from "react";
import { useAssetAuth, type AssetSession } from "../hooks/useAssetAuth";

type PermitStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "EXPIRED";

interface ShowOption { id: string; name: string; date: string; }
interface Permit {
  id: string; show_id: string; permit_type: string; authority: string;
  status: PermitStatus; reference_number: string | null;
  submitted_at: string | null; approved_at: string | null;
  expires_at: string | null; notes: string | null;
  created_at: string; updated_at: string;
}

const CARD  = "#111E35";
const BDR   = "rgba(255,255,255,0.08)";
const ACCENT = "#4A9EFF";
const TEXT  = "#F0F4FF";
const MUTED = "#8FA3C0";
const RED   = "#E53935";
const GREEN = "#43A047";
const ORANGE = "#FB8C00";

function permitStatusColor(s: string) {
  if (s === "APPROVED")  return GREEN;
  if (s === "SUBMITTED") return ACCENT;
  if (s === "DRAFT")     return MUTED;
  if (s === "REJECTED")  return RED;
  if (s === "EXPIRED")   return ORANGE;
  return TEXT;
}
function permitStatusBg(s: string) {
  if (s === "APPROVED")  return "rgba(67,160,71,0.15)";
  if (s === "SUBMITTED") return "rgba(74,158,255,0.15)";
  if (s === "DRAFT")     return "rgba(143,163,192,0.10)";
  if (s === "REJECTED")  return "rgba(229,57,53,0.14)";
  if (s === "EXPIRED")   return "rgba(251,140,0,0.14)";
  return "transparent";
}

const PERMIT_TYPES = [
  {
    type:      "Airspace Authorization",
    authority: "GACA",
    timing:    "21+ days before show",
    note:      "Core permit — required for every show. Covers altitude ceiling and coordinates.",
  },
  {
    type:      "NOTAM",
    authority: "GACA / ANSP",
    timing:    "72 hours before show",
    note:      "Notifies other aircraft of temporary airspace restriction.",
  },
  {
    type:      "Event / Public Gathering Permit",
    authority: "Ministry of Interior / Municipality",
    timing:    "14–30 days before show",
    note:      "Required when a public audience is present.",
  },
  {
    type:      "Venue / Site Access Permit",
    authority: "Site owner / Municipality / Royal Commission",
    timing:    "Varies by venue",
    note:      "Permission to use the specific location for drone operations.",
  },
  {
    type:      "Insurance Certificate",
    authority: "Insurance provider",
    timing:    "Before show date",
    note:      "Liability coverage — often required by venue and GACA.",
  },
  {
    type:      "RF Frequency Clearance",
    authority: "CITC",
    timing:    "14+ days before show",
    note:      "Required for drone control frequencies in Saudi airspace.",
  },
  {
    type:      "Commercial Activity License",
    authority: "Ministry of Commerce / Baladia",
    timing:    "One-time or annual",
    note:      "Business licence to operate commercially in KSA.",
  },
  {
    type:      "No-Objection Letter (NOC)",
    authority: "Police / Venue owner / Royal Court",
    timing:    "7–21 days before show",
    note:      "Often required for high-profile or government events.",
  },
] as const;

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
                        fontSize: 24 }}>📋</div>
          <h2 style={{ margin: 0, color: TEXT, fontWeight: 700, fontSize: 20 }}>Permit Registry</h2>
          <p style={{ margin: "8px 0 0", color: MUTED, fontSize: 13 }}>
            Authentication required to manage permits
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Email" style={inp} onKeyDown={e => e.key === "Enter" && submit()} />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Password" style={inp} onKeyDown={e => e.key === "Enter" && submit()} />
          {error && <p style={{ margin: 0, color: RED, fontSize: 13 }}>{error}</p>}
          <Btn onClick={submit} disabled={busy}>{busy ? "Verifying…" : "Login"}</Btn>
        </div>
      </div>
    </div>
  );
}

function PermitForm({ token, shows, initial, onDone, onCancel }: {
  token: string; shows: ShowOption[];
  initial?: Permit; onDone: () => void; onCancel: () => void;
}) {
  const [showId,  setShowId]  = useState(initial?.show_id      ?? (shows[0]?.id ?? ""));
  const [type,    setType]    = useState(initial?.permit_type   ?? "");
  const [auth,    setAuth]    = useState(initial?.authority     ?? "");
  const [status,  setStatus]  = useState<PermitStatus>(initial?.status ?? "DRAFT");
  const [ref,     setRef]     = useState(initial?.reference_number ?? "");
  const [subAt,   setSubAt]   = useState(initial?.submitted_at  ?? "");
  const [appAt,   setAppAt]   = useState(initial?.approved_at   ?? "");
  const [expAt,   setExpAt]   = useState(initial?.expires_at    ?? "");
  const [notes,   setNotes]   = useState(initial?.notes         ?? "");
  const [busy,    setBusy]    = useState(false);
  const [err,     setErr]     = useState("");

  async function save() {
    setBusy(true); setErr("");
    const body = {
      show_id: showId, permit_type: type.trim(), authority: auth.trim(),
      status, reference_number: ref.trim() || null,
      submitted_at: subAt.trim() || null, approved_at: appAt.trim() || null,
      expires_at: expAt.trim() || null, notes: notes.trim() || null,
    };
    const url    = initial ? `/api/permits/${initial.id}` : "/api/permits";
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
        {initial ? "Edit Permit" : "Add Permit"}
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 5 }}>Show *</label>
          <select value={showId} onChange={e => setShowId(e.target.value)} style={{ ...inp }}>
            {shows.map(s => <option key={s.id} value={s.id}>{s.name} ({s.date})</option>)}
          </select>
        </div>
        <div>
          <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 5 }}>Status</label>
          <select value={status} onChange={e => setStatus(e.target.value as PermitStatus)} style={{ ...inp }}>
            {["DRAFT","SUBMITTED","APPROVED","REJECTED","EXPIRED"].map(s =>
              <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 5 }}>Permit Type *</label>
          <input value={type} onChange={e => setType(e.target.value)}
            placeholder="e.g. CAA Airspace, Municipality, GACA" style={inp} />
        </div>
        <div>
          <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 5 }}>Authority *</label>
          <input value={auth} onChange={e => setAuth(e.target.value)}
            placeholder="e.g. GACA, Riyadh Municipality" style={inp} />
        </div>
        <div>
          <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 5 }}>Reference No.</label>
          <input value={ref} onChange={e => setRef(e.target.value)}
            placeholder="Official reference number" style={inp} />
        </div>
        <div>
          <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 5 }}>Expires</label>
          <input type="date" value={expAt} onChange={e => setExpAt(e.target.value)} style={inp} />
        </div>
        <div>
          <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 5 }}>Submitted</label>
          <input type="date" value={subAt} onChange={e => setSubAt(e.target.value)} style={inp} />
        </div>
        <div>
          <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 5 }}>Approved</label>
          <input type="date" value={appAt} onChange={e => setAppAt(e.target.value)} style={inp} />
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
        <Btn onClick={save} disabled={busy}>{busy ? "Saving…" : initial ? "Save Changes" : "Add Permit"}</Btn>
        <Btn onClick={onCancel} danger>Cancel</Btn>
      </div>
    </div>
  );
}

function PermitChecklist({
  session, shows, permits, onCreated,
}: {
  session: AssetSession;
  shows: ShowOption[];
  permits: Permit[];
  onCreated: () => void;
}) {
  const CARD2  = "#0D1B2E";
  const BDR2   = "rgba(255,255,255,0.08)";
  const ACCENT = "#4A9EFF";
  const TEXT   = "#F0F4FF";
  const MUTED  = "#8FA3C0";
  const GREEN  = "#43A047";
  const GOLD   = "#F9A825";

  const [selectedShow, setSelectedShow] = useState<string>("");
  const [creating,     setCreating]     = useState<string | null>(null);
  const [open,         setOpen]         = useState(false);

  // permits already created for this show
  const existingTypes = permits
    .filter(p => p.show_id === selectedShow)
    .map(p => p.permit_type);

  async function toggle(type: string, authority: string, checked: boolean) {
    if (!checked) return; // uncheck does nothing
    if (!selectedShow) { alert("Select a show first."); return; }
    setCreating(type);
    await fetch("/api/permits", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
      body: JSON.stringify({
        show_id:      selectedShow,
        permit_type:  type,
        authority,
        status:       "DRAFT",
        notes:        null,
        reference_number: null,
        submitted_at: null,
        approved_at:  null,
        expires_at:   null,
      }),
    });
    setCreating(null);
    onCreated();
  }

  return (
    <div style={{ background: CARD2, border: `1px solid ${BDR2}`, borderRadius: 12,
                  marginBottom: 20, overflow: "hidden" }}>
      {/* Header row — always visible */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "14px 20px", cursor: "pointer",
                  borderBottom: open ? `1px solid ${BDR2}` : "none" }}>
        <div>
          <span style={{ color: TEXT, fontWeight: 700, fontSize: 14 }}>
            ✅ Permit Checklist
          </span>
          <span style={{ color: MUTED, fontSize: 12, marginLeft: 10 }}>
            Auto-create DRAFT permits per show
          </span>
        </div>
        <span style={{ color: MUTED, fontSize: 13 }}>{open ? "▲ Hide" : "▼ Expand"}</span>
      </div>

      {open && (
        <div style={{ padding: "16px 20px" }}>
          {/* Show selector */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
            <label style={{ color: MUTED, fontSize: 13, whiteSpace: "nowrap" as const }}>
              Select Show:
            </label>
            <select
              value={selectedShow}
              onChange={e => setSelectedShow(e.target.value)}
              style={{ ...inp, width: "auto", minWidth: 240 }}>
              <option value="">— choose a show —</option>
              {shows.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.date ? s.date.slice(0, 10) : "no date"})
                </option>
              ))}
            </select>
            {selectedShow && (
              <span style={{ color: MUTED, fontSize: 12 }}>
                {existingTypes.length} of {PERMIT_TYPES.length} permits created
              </span>
            )}
          </div>

          {/* Checklist */}
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
            {PERMIT_TYPES.map(pt => {
              const done    = existingTypes.includes(pt.type);
              const busy    = creating === pt.type;
              return (
                <div key={pt.type} style={{
                  display: "flex", alignItems: "flex-start", gap: 14,
                  background: done ? "rgba(67,160,71,0.07)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${done ? "rgba(67,160,71,0.25)" : BDR2}`,
                  borderRadius: 8, padding: "10px 14px",
                  opacity: busy ? 0.6 : 1,
                }}>
                  <input
                    type="checkbox"
                    checked={done}
                    disabled={done || busy || !selectedShow}
                    onChange={e => toggle(pt.type, pt.authority, e.target.checked)}
                    style={{ marginTop: 3, accentColor: ACCENT, width: 16, height: 16,
                              cursor: done || !selectedShow ? "default" : "pointer" }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between",
                                  alignItems: "center", flexWrap: "wrap" as const, gap: 6 }}>
                      <span style={{ color: done ? GREEN : TEXT, fontWeight: 600, fontSize: 13 }}>
                        {pt.type}
                        {done && <span style={{ color: GREEN, fontSize: 11, marginLeft: 8 }}>✓ DRAFT created</span>}
                        {busy && <span style={{ color: ACCENT, fontSize: 11, marginLeft: 8 }}>Creating…</span>}
                      </span>
                      <span style={{ background: "rgba(249,168,37,0.12)",
                                      border: "1px solid rgba(249,168,37,0.25)",
                                      borderRadius: 4, color: GOLD,
                                      padding: "2px 8px", fontSize: 11 }}>
                        {pt.timing}
                      </span>
                    </div>
                    <div style={{ color: MUTED, fontSize: 12, marginTop: 3 }}>
                      <strong style={{ color: MUTED }}>Authority:</strong> {pt.authority}
                      {" · "}{pt.note}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {!selectedShow && (
            <p style={{ color: MUTED, fontSize: 12, margin: "12px 0 0", fontStyle: "italic" }}>
              Select a show above to enable the checklist.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function PermitsPanel({ session, onLogout }: { session: AssetSession; onLogout: () => void }) {
  const [shows,    setShows]    = useState<ShowOption[]>([]);
  const [permits,  setPermits]  = useState<Permit[]>([]);
  const [filterShow, setFilterShow] = useState<string>("ALL");
  const [loading,  setLoading]  = useState(true);
  const [creating, setCreating] = useState(false);
  const [editing,  setEditing]  = useState<Permit | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sr, pr] = await Promise.all([
        fetch("/api/shows").then(r => r.json()),
        fetch("/api/permits").then(r => r.json()),
      ]);
      setShows(sr.items ?? []);
      setPermits(pr.items ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function deletePermit(id: string, type: string) {
    if (!confirm(`Delete permit "${type}"?\n\nThis is permanent.`)) return;
    await fetch(`/api/permits/${id}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${session.token}` },
    });
    load();
  }

  async function quickStatus(permit: Permit, newStatus: PermitStatus) {
    await fetch(`/api/permits/${permit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
      body: JSON.stringify({ status: newStatus }),
    });
    load();
  }

  const showName = (id: string) => shows.find(s => s.id === id)?.name ?? id.slice(0, 8);

  const filtered = filterShow === "ALL"
    ? permits
    : permits.filter(p => p.show_id === filterShow);

  const totalPermits  = permits.length;
  const approved      = permits.filter(p => p.status === "APPROVED").length;
  const pending       = permits.filter(p => p.status === "SUBMITTED").length;
  const draft         = permits.filter(p => p.status === "DRAFT").length;
  const now            = new Date();
  const in30           = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const expiringSoon   = permits.filter(p =>
    p.expires_at && p.status === "APPROVED" &&
    new Date(p.expires_at) > now && new Date(p.expires_at) <= in30
  ).length;
  const expiredCount   = permits.filter(p =>
    p.expires_at && new Date(p.expires_at) < now
  ).length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, color: TEXT, fontWeight: 700, fontSize: 22 }}>Permit Registry</h1>
          <p style={{ margin: "4px 0 0", color: MUTED, fontSize: 13 }}>
            Signed in as <strong style={{ color: TEXT }}>{session.email}</strong>
            {" · "}<span style={{ color: ACCENT }}>{session.role}</span>
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn onClick={() => { setEditing(null); setCreating(true); }}>+ Add Permit</Btn>
          <button onClick={onLogout} style={{
            background: "rgba(229,57,53,0.1)", border: "1px solid rgba(229,57,53,0.3)",
            color: RED, borderRadius: 8, padding: "7px 16px", fontSize: 13,
            cursor: "pointer", fontWeight: 500,
          }}>🔒 Lock</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" as const, marginBottom: 24 }}>
        {[
          { label: "Total Permits", value: totalPermits, color: TEXT },
          { label: "Approved",      value: approved,     color: GREEN  },
          { label: "Submitted",     value: pending,      color: ACCENT },
          { label: "Draft",         value: draft,        color: MUTED  },
          { label: "Expiring \u226430d", value: expiringSoon, color: ORANGE },
          { label: "Expired",        value: expiredCount, color: RED   },
        ].map(k => (
          <div key={k.label} style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 12,
                        padding: "16px 22px", flex: 1, minWidth: 120 }}>
            <div style={{ color: MUTED, fontSize: 11, fontWeight: 600, textTransform: "uppercase",
                          letterSpacing: 0.5, marginBottom: 6 }}>{k.label}</div>
            <div style={{ color: k.color, fontSize: 26, fontWeight: 700 }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <label style={{ color: MUTED, fontSize: 13 }}>Filter by show:</label>
        <select value={filterShow} onChange={e => setFilterShow(e.target.value)}
          style={{ ...inp, width: "auto", minWidth: 200 }}>
          <option value="ALL">All Shows</option>
          {shows.map(s => <option key={s.id} value={s.id}>{s.name} ({s.date})</option>)}
        </select>
        <span style={{ color: MUTED, fontSize: 13 }}>{filtered.length} permit(s)</span>
      </div>

      <PermitChecklist
        session={session}
        shows={shows}
        permits={permits}
        onCreated={load}
      />

      {creating && !editing && (
        <PermitForm token={session.token} shows={shows}
          onDone={() => { setCreating(false); load(); }}
          onCancel={() => setCreating(false)} />
      )}
      {editing && (
        <PermitForm token={session.token} shows={shows} initial={editing}
          onDone={() => { setEditing(null); load(); }}
          onCancel={() => setEditing(null)} />
      )}

      {loading ? <p style={{ color: MUTED }}>Loading…</p>
       : filtered.length === 0 ? (
        <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 12,
                      padding: 40, textAlign: "center" as const }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
          <p style={{ color: MUTED, margin: 0 }}>
            {filterShow === "ALL"
              ? "No permits yet. Click \"+ Add Permit\" to start."
              : "No permits for this show yet."}
          </p>
        </div>
       ) : (
        <div style={{ overflowX: "auto" as const }}>
          <table style={tbl}>
            <thead><tr>
              {["Show","Permit Type","Authority","Status","Reference","Expires","Notes","Actions"].map(h =>
                <th key={h} style={th}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.map(p => {
                const isExpired  = !!(p.expires_at && new Date(p.expires_at) < now);
                const isExpiring = !!(p.expires_at && p.status === "APPROVED" &&
                  new Date(p.expires_at) > now && new Date(p.expires_at) <= in30);
                const rowStyle = isExpired
                  ? { borderBottom: `1px solid ${BDR}`, borderLeft: "3px solid " + RED }
                  : isExpiring
                    ? { borderBottom: `1px solid ${BDR}`, borderLeft: "3px solid " + ORANGE }
                    : { borderBottom: `1px solid ${BDR}` };
                return (
                <tr key={p.id} style={rowStyle}>
                  <td style={{ ...td, fontWeight: 600, whiteSpace: "nowrap" as const }}>
                    {showName(p.show_id)}
                  </td>
                  <td style={td}>{p.permit_type}</td>
                  <td style={{ ...td, color: MUTED }}>{p.authority}</td>
                  <td style={td}>
                    <select
                      value={p.status}
                      onChange={e => quickStatus(p, e.target.value as PermitStatus)}
                      style={{ background: permitStatusBg(p.status),
                               border: `1px solid ${BDR}`, borderRadius: 6,
                               color: permitStatusColor(p.status),
                               padding: "4px 8px", fontSize: 13, fontWeight: 600 }}>
                      {["DRAFT","SUBMITTED","APPROVED","REJECTED","EXPIRED"].map(s =>
                        <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td style={{ ...td, color: MUTED, fontSize: 12 }}>
                    {p.reference_number ?? "—"}
                  </td>
                  <td style={{ ...td, color: MUTED, fontSize: 12, whiteSpace: "nowrap" as const }}>
                    {p.expires_at ?? "—"}
                  </td>
                  <td style={{ ...td, color: MUTED, fontSize: 12, maxWidth: 180,
                                overflow: "hidden", textOverflow: "ellipsis",
                                whiteSpace: "nowrap" as const }}>
                    {p.notes ?? "—"}
                  </td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Btn small onClick={() => { setCreating(false); setEditing(p); }}>Edit</Btn>
                      <Btn small danger onClick={() => deletePermit(p.id, p.permit_type)}>Delete</Btn>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
       )}
    </div>
  );
}

export default function Permits() {
  const { session, login, logout } = useAssetAuth();
  if (!session) return <LoginGate onLogin={login} />;
  return <PermitsPanel session={session} onLogout={logout} />;
}
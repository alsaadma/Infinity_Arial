import { useState, useEffect, useCallback } from "react";
import { useAssetAuth, type AssetSession } from "../hooks/useAssetAuth";

interface ShowOption  { id: string; name: string; date: string; drones_required: number; }
interface AllocRow    { id: string; show_id: string; drone_id: string; serial_number: string; model_id: string; drone_status: string; assigned_at: string; notes: string | null; }
interface DroneOption { id: string; serial_number: string; model_id: string; status: string; }

const CARD   = "#111E35";
const BDR    = "rgba(255,255,255,0.08)";
const ACCENT = "#4A9EFF";
const TEXT   = "#F0F4FF";
const MUTED  = "#8FA3C0";
const RED    = "#E53935";
const GREEN  = "#43A047";
const ORANGE = "#FB8C00";

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
                        fontSize: 24 }}>🔗</div>
          <h2 style={{ margin: 0, color: TEXT, fontWeight: 700, fontSize: 20 }}>Show Allocations</h2>
          <p style={{ margin: "8px 0 0", color: MUTED, fontSize: 13 }}>
            Authentication required to manage allocations
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

function AllocationsPanel({ session, onLogout }: { session: AssetSession; onLogout: () => void }) {
  const [shows,     setShows]     = useState<ShowOption[]>([]);
  const [showId,    setShowId]    = useState<string>("");
  const [allocs,    setAllocs]    = useState<AllocRow[]>([]);
  const [available, setAvailable] = useState<DroneOption[]>([]);
  const [droneId,   setDroneId]   = useState<string>("");
  const [notes,     setNotes]     = useState<string>("");
  const [loading,   setLoading]   = useState(false);
  const [adding,    setAdding]    = useState(false);
  const [err,       setErr]       = useState("");

  // Load shows once
  useEffect(() => {
    fetch("/api/shows").then(r => r.json()).then(d => {
      const list: ShowOption[] = d.items ?? [];
      setShows(list);
      if (list.length > 0) setShowId(list[0].id);
    });
  }, []);

  // Load allocations + available drones when show changes
  const loadAllocs = useCallback(async (sid: string) => {
    if (!sid) return;
    setLoading(true);
    try {
      const [ar, dr] = await Promise.all([
        fetch(`/api/allocations?show_id=${sid}`).then(r => r.json()),
        fetch(`/api/allocations/available?show_id=${sid}`).then(r => r.json()),
      ]);
      setAllocs(ar.items ?? []);
      setAvailable(dr.items ?? []);
      setDroneId(dr.items?.[0]?.id ?? "");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (showId) loadAllocs(showId); }, [showId, loadAllocs]);

  async function addAlloc() {
    if (!droneId) return;
    setAdding(true); setErr("");
    const r = await fetch("/api/allocations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
      body: JSON.stringify({ show_id: showId, drone_id: droneId, notes: notes.trim() || null, assigned_by: session.email }),
    });
    const d = await r.json();
    if (!d.ok) setErr(d.error ?? "Failed");
    else { setNotes(""); loadAllocs(showId); }
    setAdding(false);
  }

  async function removeAlloc(id: string, serial: string) {
    if (!confirm(`Remove drone ${serial} from this show?`)) return;
    await fetch(`/api/allocations/${id}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${session.token}` },
    });
    loadAllocs(showId);
  }

  const selectedShow = shows.find(s => s.id === showId);
  const allocated    = allocs.length;
  const required     = selectedShow?.drones_required ?? 0;
  const surplus      = required - allocated;
  const capacityColor = allocated >= required ? RED : allocated >= required * 0.8 ? ORANGE : GREEN;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, color: TEXT, fontWeight: 700, fontSize: 22 }}>Show Allocations</h1>
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

      {/* Show selector */}
      <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 12,
                    padding: "18px 22px", marginBottom: 20 }}>
        <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 8 }}>SELECT SHOW</label>
        <select value={showId} onChange={e => setShowId(e.target.value)}
          style={{ ...inp, maxWidth: 480 }}>
          {shows.map(s => (
            <option key={s.id} value={s.id}>
              {s.name} — {s.date} ({s.drones_required} drones required)
            </option>
          ))}
        </select>
      </div>

      {/* Capacity bar */}
      {selectedShow && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" as const, marginBottom: 20 }}>
          {[
            { label: "Required",  value: required,  color: TEXT   },
            { label: "Allocated", value: allocated,  color: capacityColor },
            { label: "Remaining", value: Math.max(surplus, 0), color: surplus > 0 ? ORANGE : GREEN },
            { label: "Available Drones", value: available.length, color: ACCENT },
          ].map(k => (
            <div key={k.label} style={{ background: CARD, border: `1px solid ${BDR}`,
                        borderRadius: 12, padding: "16px 22px", flex: 1, minWidth: 120 }}>
              <div style={{ color: MUTED, fontSize: 11, fontWeight: 600,
                            textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                {k.label}
              </div>
              <div style={{ color: k.color, fontSize: 26, fontWeight: 700 }}>{k.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Add drone form */}
      {selectedShow && available.length > 0 && (
        <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 12,
                      padding: "18px 22px", marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 14px", color: TEXT, fontSize: 14, fontWeight: 600 }}>
            Assign Drone
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 12, alignItems: "end" }}>
            <div>
              <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 5 }}>Drone</label>
              <select value={droneId} onChange={e => setDroneId(e.target.value)} style={{ ...inp }}>
                {available.map(d => (
                  <option key={d.id} value={d.id}>{d.serial_number} — {d.model_id}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 5 }}>Notes (optional)</label>
              <input value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Primary position 1" style={inp} />
            </div>
            <Btn onClick={addAlloc} disabled={adding || allocated >= required}>
              {adding ? "Assigning…" : "Assign"}
            </Btn>
          </div>
          {allocated >= required && (
            <p style={{ margin: "10px 0 0", color: ORANGE, fontSize: 12 }}>
              Show is at full capacity ({required} drones). Remove an allocation to add another.
            </p>
          )}
          {err && <p style={{ margin: "10px 0 0", color: RED, fontSize: 12 }}>{err}</p>}
        </div>
      )}

      {selectedShow && available.length === 0 && allocated < required && (
        <div style={{ background: "rgba(229,57,53,0.08)", border: "1px solid rgba(229,57,53,0.25)",
                      borderRadius: 10, padding: "14px 18px", marginBottom: 20 }}>
          <p style={{ margin: 0, color: RED, fontSize: 13 }}>
            No ACTIVE drones available to assign. Check the Assets page for drone status.
          </p>
        </div>
      )}

      {/* Allocations table */}
      {loading ? <p style={{ color: MUTED }}>Loading…</p>
       : allocs.length === 0 ? (
        <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 12,
                      padding: 40, textAlign: "center" as const }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔗</div>
          <p style={{ color: MUTED, margin: 0 }}>No drones allocated to this show yet.</p>
        </div>
       ) : (
        <div style={{ overflowX: "auto" as const }}>
          <table style={tbl}>
            <thead><tr>
              {["#","Serial Number","Model","Status","Assigned At","Notes","Actions"].map(h =>
                <th key={h} style={th}>{h}</th>)}
            </tr></thead>
            <tbody>
              {allocs.map((a, idx) => (
                <tr key={a.id} style={{ borderBottom: `1px solid ${BDR}` }}>
                  <td style={{ ...td, color: MUTED }}>{idx + 1}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{a.serial_number}</td>
                  <td style={{ ...td, color: MUTED }}>{a.model_id}</td>
                  <td style={td}>
                    <span style={{ background: "rgba(67,160,71,0.15)", color: GREEN,
                                   borderRadius: 6, padding: "3px 8px", fontSize: 12, fontWeight: 600 }}>
                      {a.drone_status}
                    </span>
                  </td>
                  <td style={{ ...td, color: MUTED, fontSize: 12 }}>
                    {new Date(a.assigned_at).toLocaleString()}
                  </td>
                  <td style={{ ...td, color: MUTED, fontSize: 12 }}>{a.notes ?? "—"}</td>
                  <td style={td}>
                    <Btn small danger onClick={() => removeAlloc(a.id, a.serial_number)}>Remove</Btn>
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

export default function Allocations() {
  const { session, login, logout } = useAssetAuth();
  if (!session) return <LoginGate onLogin={login} />;
  return <AllocationsPanel session={session} onLogout={logout} />;
}

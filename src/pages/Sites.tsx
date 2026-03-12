import { useState, useEffect, useCallback } from "react";
import { useAssetAuth, type AssetSession } from "../hooks/useAssetAuth";

type SiteStatus = "ACTIVE" | "INACTIVE" | "RESTRICTED";
type SiteType   = "OUTDOOR" | "INDOOR" | "BEACH" | "URBAN" | "DESERT" | "STADIUM";

interface Site {
  id: string; name: string; city: string; country: string;
  site_type: SiteType; status: SiteStatus;
  gps_lat: number | null; gps_lng: number | null;
  notes: string | null; created_at: string; updated_at: string;
}

const CARD   = "#111E35";
const BDR    = "rgba(255,255,255,0.08)";
const ACCENT = "#4A9EFF";
const TEXT   = "#F0F4FF";
const MUTED  = "#8FA3C0";
const RED    = "#E53935";
const GREEN  = "#43A047";
const ORANGE = "#FB8C00";

function statusColor(s: string) {
  if (s === "ACTIVE")     return GREEN;
  if (s === "INACTIVE")   return MUTED;
  if (s === "RESTRICTED") return ORANGE;
  return TEXT;
}
function statusBg(s: string) {
  if (s === "ACTIVE")     return "rgba(67,160,71,0.15)";
  if (s === "INACTIVE")   return "rgba(143,163,192,0.10)";
  if (s === "RESTRICTED") return "rgba(251,140,0,0.14)";
  return "transparent";
}
function typeIcon(t: string) {
  const map: Record<string,string> = {
    OUTDOOR:"🌿", INDOOR:"🏢", BEACH:"🏖️",
    URBAN:"🏙️", DESERT:"🏜️", STADIUM:"🏟️",
  };
  return map[t] ?? "📍";
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
                        fontSize: 24 }}>📍</div>
          <h2 style={{ margin: 0, color: TEXT, fontWeight: 700, fontSize: 20 }}>Site Registry</h2>
          <p style={{ margin: "8px 0 0", color: MUTED, fontSize: 13 }}>
            Authentication required to manage sites
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

function SiteForm({ token, initial, onDone, onCancel }: {
  token: string; initial?: Site; onDone: () => void; onCancel: () => void;
}) {
  const [name,     setName]    = useState(initial?.name      ?? "");
  const [city,     setCity]    = useState(initial?.city      ?? "");
  const [country,  setCountry] = useState(initial?.country   ?? "SA");
  const [siteType, setSiteType]= useState<SiteType>(initial?.site_type ?? "OUTDOOR");
  const [status,   setStatus]  = useState<SiteStatus>(initial?.status  ?? "ACTIVE");
  const [gpsLat,   setGpsLat]  = useState(initial?.gps_lat?.toString()  ?? "");
  const [gpsLng,   setGpsLng]  = useState(initial?.gps_lng?.toString()  ?? "");
  const [notes,    setNotes]   = useState(initial?.notes     ?? "");
  const [busy,     setBusy]    = useState(false);
  const [err,      setErr]     = useState("");

  async function save() {
    setBusy(true); setErr("");
    const body = {
      name: name.trim(), city: city.trim(), country: country.trim(),
      site_type: siteType, status,
      gps_lat: gpsLat.trim() ? parseFloat(gpsLat) : null,
      gps_lng: gpsLng.trim() ? parseFloat(gpsLng) : null,
      notes: notes.trim() || null,
    };
    const url    = initial ? `/api/sites/${initial.id}` : "/api/sites";
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
        {initial ? "Edit Site" : "Add Site"}
      </h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 5 }}>Site Name *</label>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. King Fahd Corniche, Riyadh Park" style={inp} />
        </div>
        <div>
          <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 5 }}>City *</label>
          <input value={city} onChange={e => setCity(e.target.value)}
            placeholder="e.g. Dammam" style={inp} />
        </div>
        <div>
          <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 5 }}>Country</label>
          <input value={country} onChange={e => setCountry(e.target.value)}
            placeholder="SA" style={inp} />
        </div>
        <div>
          <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 5 }}>Site Type</label>
          <select value={siteType} onChange={e => setSiteType(e.target.value as SiteType)} style={{ ...inp }}>
            {(["OUTDOOR","INDOOR","BEACH","URBAN","DESERT","STADIUM"] as SiteType[]).map(t =>
              <option key={t} value={t}>{typeIcon(t)} {t}</option>)}
          </select>
        </div>
        <div>
          <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 5 }}>Status</label>
          <select value={status} onChange={e => setStatus(e.target.value as SiteStatus)} style={{ ...inp }}>
            {(["ACTIVE","INACTIVE","RESTRICTED"] as SiteStatus[]).map(s =>
              <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 5 }}>GPS Latitude</label>
          <input value={gpsLat} onChange={e => setGpsLat(e.target.value)}
            placeholder="e.g. 26.4207" style={inp} type="number" step="any" />
        </div>
        <div>
          <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 5 }}>GPS Longitude</label>
          <input value={gpsLng} onChange={e => setGpsLng(e.target.value)}
            placeholder="e.g. 50.0888" style={inp} type="number" step="any" />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ color: MUTED, fontSize: 12, display: "block", marginBottom: 5 }}>Notes</label>
          <input value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Access notes, restrictions, contact info…" style={inp} />
        </div>
      </div>
      {err && <p style={{ margin: "12px 0 0", color: RED, fontSize: 13 }}>{err}</p>}
      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <Btn onClick={save} disabled={busy}>{busy ? "Saving…" : initial ? "Save Changes" : "Add Site"}</Btn>
        <Btn onClick={onCancel} disabled={busy} danger>Cancel</Btn>
      </div>
    </div>
  );
}

function SitesPanel({ session, onLogout }: { session: AssetSession; onLogout: () => void }) {
  const [sites,    setSites]   = useState<Site[]>([]);
  const [loading,  setLoading] = useState(true);
  const [creating, setCreating]= useState(false);
  const [editing,  setEditing] = useState<Site | null>(null);
  const [filter,   setFilter]  = useState<string>("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/sites");
      const d = await r.json();
      setSites(d.items ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function deleteSite(id: string, name: string) {
    if (!confirm(`Delete site "${name}"?\n\nThis is permanent.`)) return;
    await fetch(`/api/sites/${id}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${session.token}` },
    });
    load();
  }

  async function quickStatus(site: Site, newStatus: SiteStatus) {
    await fetch(`/api/sites/${site.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
      body: JSON.stringify({ status: newStatus }),
    });
    load();
  }

  const filtered = filter === "ALL" ? sites : sites.filter(s => s.status === filter);
  const total      = sites.length;
  const active     = sites.filter(s => s.status === "ACTIVE").length;
  const inactive   = sites.filter(s => s.status === "INACTIVE").length;
  const restricted = sites.filter(s => s.status === "RESTRICTED").length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, color: TEXT, fontWeight: 700, fontSize: 22 }}>Site Registry</h1>
          <p style={{ margin: "4px 0 0", color: MUTED, fontSize: 13 }}>
            Signed in as <strong style={{ color: TEXT }}>{session.email}</strong>
            {" · "}<span style={{ color: ACCENT }}>{session.role}</span>
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn onClick={() => { setEditing(null); setCreating(true); }}>+ Add Site</Btn>
          <button onClick={onLogout} style={{
            background: "rgba(229,57,53,0.1)", border: "1px solid rgba(229,57,53,0.3)",
            color: RED, borderRadius: 8, padding: "7px 16px", fontSize: 13,
            cursor: "pointer", fontWeight: 500,
          }}>🔒 Lock</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" as const, marginBottom: 24 }}>
        {[
          { label: "Total Sites",  value: total,      color: TEXT   },
          { label: "Active",       value: active,      color: GREEN  },
          { label: "Inactive",     value: inactive,    color: MUTED  },
          { label: "Restricted",   value: restricted,  color: ORANGE },
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

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <label style={{ color: MUTED, fontSize: 13 }}>Filter by status:</label>
        <select value={filter} onChange={e => setFilter(e.target.value)}
          style={{ ...inp, width: "auto", minWidth: 160 }}>
          <option value="ALL">All Sites</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="RESTRICTED">Restricted</option>
        </select>
        <span style={{ color: MUTED, fontSize: 13 }}>{filtered.length} site(s)</span>
      </div>

      {creating && !editing && (
        <SiteForm token={session.token}
          onDone={() => { setCreating(false); load(); }}
          onCancel={() => setCreating(false)} />
      )}
      {editing && (
        <SiteForm token={session.token} initial={editing}
          onDone={() => { setEditing(null); load(); }}
          onCancel={() => setEditing(null)} />
      )}

      {loading ? <p style={{ color: MUTED }}>Loading…</p>
       : filtered.length === 0 ? (
        <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 12,
                      padding: 40, textAlign: "center" as const }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📍</div>
          <p style={{ color: MUTED, margin: 0 }}>
            {filter === "ALL"
              ? "No sites yet. Click \"+ Add Site\" to register your first site."
              : `No ${filter.toLowerCase()} sites.`}
          </p>
        </div>
       ) : (
        <div style={{ overflowX: "auto" as const }}>
          <table style={tbl}>
            <thead><tr>
              {["Site Name","City","Type","Status","GPS","Notes","Actions"].map(h =>
                <th key={h} style={th}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} style={{ borderBottom: `1px solid ${BDR}` }}>
                  <td style={{ ...td, fontWeight: 600, whiteSpace: "nowrap" as const }}>
                    {s.name}
                  </td>
                  <td style={{ ...td, color: MUTED }}>
                    {s.city}{s.country !== "SA" ? `, ${s.country}` : ""}
                  </td>
                  <td style={td}>
                    <span style={{ fontSize: 13 }}>{typeIcon(s.site_type)} {s.site_type}</span>
                  </td>
                  <td style={td}>
                    <select
                      value={s.status}
                      onChange={e => quickStatus(s, e.target.value as SiteStatus)}
                      style={{ background: statusBg(s.status),
                               border: `1px solid ${BDR}`, borderRadius: 6,
                               color: statusColor(s.status),
                               padding: "4px 8px", fontSize: 13, fontWeight: 600 }}>
                      {(["ACTIVE","INACTIVE","RESTRICTED"] as SiteStatus[]).map(st =>
                        <option key={st} value={st}>{st}</option>)}
                    </select>
                  </td>
                  <td style={{ ...td, color: MUTED, fontSize: 12 }}>
                    {s.gps_lat != null && s.gps_lng != null
                      ? `${s.gps_lat.toFixed(4)}, ${s.gps_lng.toFixed(4)}`
                      : "—"}
                  </td>
                  <td style={{ ...td, color: MUTED, fontSize: 12, maxWidth: 200,
                                overflow: "hidden", textOverflow: "ellipsis",
                                whiteSpace: "nowrap" as const }}>
                    {s.notes ?? "—"}
                  </td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Btn small onClick={() => { setCreating(false); setEditing(s); }}>Edit</Btn>
                      <Btn small danger onClick={() => deleteSite(s.id, s.name)}>Delete</Btn>
                    </div>
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

export default function Sites() {
  const { session, login, logout } = useAssetAuth();
  if (!session) return <LoginGate onLogin={login} />;
  return <SitesPanel session={session} onLogout={logout} />;
}

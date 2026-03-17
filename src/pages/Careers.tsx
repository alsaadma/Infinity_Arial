import { useState, useEffect, useCallback } from "react";
import { useAssetAuth } from "../hooks/useAssetAuth";

const API = "";

interface Applicant {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  city: string | null;
  nationality: string | null;
  positions: string | null;
  availability: string | null;
  comp_technical: string | null;
  comp_regulatory: string | null;
  comp_physical: string | null;
  comp_experience: string | null;
  comp_english: string | null;
  training_required: number;
  training_notes: string | null;
  status: "NEW" | "REVIEWING" | "INTERVIEW" | "HIRED" | "REJECTED";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const CARD = "#111E35";
const BDR = "rgba(255,255,255,0.08)";
const ACCENT = "#4A9EFF";
const TEXT = "#F0F4FF";
const MUTED = "#8FA3C0";
const GREEN = "#43A047";
const ORANGE = "#FB8C00";
const RED = "#E53935";

const STATUS_COLORS: Record<string, string> = {
  NEW: ACCENT,
  REVIEWING: ORANGE,
  INTERVIEW: "#9C27B0",
  HIRED: GREEN,
  REJECTED: RED,
};

export default function Careers() {
  const { session, login, logout } = useAssetAuth();
  const [email, setEmail] = useState("admin@infinity.local");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editTrainingNotes, setEditTrainingNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Fetch applicants
  const fetchApplicants = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(API + "/api/careers", {
        headers: { Authorization: "Bearer " + session.token },
      });
      const data = await res.json();
      if (data.ok) {
        setApplicants(data.applicants || []);
      } else {
        setError(data.error || "Failed to fetch applicants");
      }
    } catch {
      setError("Server unreachable");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session && session.role === "ADMIN") {
      fetchApplicants();
    }
  }, [session, fetchApplicants]);

  // Handle login
  const handleLogin = async () => {
    setLoggingIn(true);
    setLoginError("");
    const result = await login(email, password);
    if (!result.ok) {
      setLoginError(result.error);
    }
    setLoggingIn(false);
  };

  // Update applicant
  const handleUpdate = async () => {
    if (!session || !selectedApplicant) return;
    setSaving(true);
    try {
      const res = await fetch(API + "/api/careers/" + selectedApplicant.id, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + session.token,
        },
        body: JSON.stringify({
          status: editStatus,
          notes: editNotes,
          training_notes: editTrainingNotes,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setSelectedApplicant(null);
        fetchApplicants();
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  // Delete applicant
  const handleDelete = async (id: string) => {
    if (!session) return;
    if (!confirm("Delete this applicant?")) return;
    try {
      await fetch(API + "/api/careers/" + id, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + session.token },
      });
      fetchApplicants();
    } catch {
      // ignore
    }
  };

  // Parse competency JSON safely
  const parseComp = (json: string | null): Record<string, string> => {
    if (!json) return {};
    try { return JSON.parse(json); } catch { return {}; }
  };

  const countYes = (json: string | null): number => {
    const obj = parseComp(json);
    return Object.values(obj).filter((v) => v === "yes").length;
  };

  const countTotal = (json: string | null): number => {
    const obj = parseComp(json);
    return Object.keys(obj).length;
  };

  // ── Login Screen ──
  if (!session) {
    return (
      <div style={{ maxWidth: 400, margin: "80px auto", padding: 32, background: CARD, borderRadius: 12, border: "1px solid " + BDR }}>
        <h2 style={{ margin: 0, marginBottom: 8, color: TEXT }}>Careers Admin</h2>
        <p style={{ color: MUTED, marginBottom: 24 }}>Login required to view applicants</p>
        
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4, color: MUTED, fontSize: 13 }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", background: "#0B1628", border: "1px solid " + BDR, borderRadius: 6, color: TEXT, fontSize: 14 }}
          />
        </div>
        
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", marginBottom: 4, color: MUTED, fontSize: 13 }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            style={{ width: "100%", padding: "10px 12px", background: "#0B1628", border: "1px solid " + BDR, borderRadius: 6, color: TEXT, fontSize: 14 }}
          />
        </div>

        {loginError && <p style={{ color: RED, marginBottom: 16, fontSize: 13 }}>{loginError}</p>}

        <button
          onClick={handleLogin}
          disabled={loggingIn}
          style={{ width: "100%", padding: "12px 20px", background: ACCENT, color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: loggingIn ? "wait" : "pointer" }}
        >
          {loggingIn ? "Logging in..." : "Login"}
        </button>
      </div>
    );
  }

  // ── Access Denied (non-admin) ──
  if (session.role !== "ADMIN") {
    return (
      <div style={{ maxWidth: 400, margin: "80px auto", padding: 32, background: CARD, borderRadius: 12, border: "1px solid " + BDR, textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2 style={{ margin: 0, marginBottom: 8, color: TEXT }}>Access Denied</h2>
        <p style={{ color: MUTED, marginBottom: 24 }}>Admin privileges required to view this page.</p>
        <button onClick={logout} style={{ padding: "10px 24px", background: "transparent", border: "1px solid " + BDR, borderRadius: 6, color: MUTED, cursor: "pointer" }}>
          Logout
        </button>
      </div>
    );
  }

  // ── Main Admin View ──
  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, color: TEXT }}>Careers</h1>
          <p style={{ margin: 0, marginTop: 4, color: MUTED, fontSize: 14 }}>
            Applicant tracking &bull; {applicants.length} total
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ color: MUTED, fontSize: 13 }}>{session.email}</span>
          <button onClick={logout} style={{ padding: "8px 16px", background: "transparent", border: "1px solid " + BDR, borderRadius: 6, color: MUTED, fontSize: 13, cursor: "pointer" }}>
            Logout
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        {["NEW", "REVIEWING", "INTERVIEW", "HIRED", "REJECTED"].map((s) => {
          const count = applicants.filter((a) => a.status === s).length;
          return (
            <div key={s} style={{ flex: 1, padding: 16, background: CARD, borderRadius: 10, border: "1px solid " + BDR }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: STATUS_COLORS[s] }}>{count}</div>
              <div style={{ fontSize: 12, color: MUTED, textTransform: "uppercase" }}>{s}</div>
            </div>
          );
        })}
      </div>

      {/* Error/Loading */}
      {loading && <p style={{ color: MUTED }}>Loading...</p>}
      {error && <p style={{ color: RED }}>{error}</p>}

      {/* Applicants Table */}
      <div style={{ background: CARD, borderRadius: 12, border: "1px solid " + BDR, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "rgba(0,0,0,0.2)" }}>
              <th style={{ padding: "12px 16px", textAlign: "left", color: MUTED, fontWeight: 500 }}>Name</th>
              <th style={{ padding: "12px 16px", textAlign: "left", color: MUTED, fontWeight: 500 }}>Contact</th>
              <th style={{ padding: "12px 16px", textAlign: "center", color: MUTED, fontWeight: 500 }}>Competencies</th>
              <th style={{ padding: "12px 16px", textAlign: "center", color: MUTED, fontWeight: 500 }}>Training</th>
              <th style={{ padding: "12px 16px", textAlign: "center", color: MUTED, fontWeight: 500 }}>Status</th>
              <th style={{ padding: "12px 16px", textAlign: "center", color: MUTED, fontWeight: 500 }}>Applied</th>
              <th style={{ padding: "12px 16px", textAlign: "center", color: MUTED, fontWeight: 500 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {applicants.map((a) => (
              <tr key={a.id} style={{ borderTop: "1px solid " + BDR }}>
                <td style={{ padding: "12px 16px", color: TEXT }}>
                  <div style={{ fontWeight: 500 }}>{a.full_name}</div>
                  <div style={{ fontSize: 12, color: MUTED }}>{a.city || "—"}, {a.nationality || "—"}</div>
                </td>
                <td style={{ padding: "12px 16px", color: MUTED }}>
                  <div>{a.email}</div>
                  <div style={{ fontSize: 12 }}>{a.phone || "—"}</div>
                </td>
                <td style={{ padding: "12px 16px", textAlign: "center" }}>
                  <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap" }}>
                    <span title="Technical" style={{ padding: "2px 6px", background: "rgba(74,158,255,0.15)", borderRadius: 4, fontSize: 11, color: ACCENT }}>
                      T:{countYes(a.comp_technical)}/{countTotal(a.comp_technical)}
                    </span>
                    <span title="Regulatory" style={{ padding: "2px 6px", background: "rgba(255,152,0,0.15)", borderRadius: 4, fontSize: 11, color: ORANGE }}>
                      R:{countYes(a.comp_regulatory)}/{countTotal(a.comp_regulatory)}
                    </span>
                    <span title="Physical" style={{ padding: "2px 6px", background: "rgba(76,175,80,0.15)", borderRadius: 4, fontSize: 11, color: GREEN }}>
                      P:{countYes(a.comp_physical)}/{countTotal(a.comp_physical)}
                    </span>
                  </div>
                </td>
                <td style={{ padding: "12px 16px", textAlign: "center" }}>
                  {a.training_required ? (
                    <span style={{ padding: "4px 8px", background: "rgba(255,152,0,0.15)", borderRadius: 4, fontSize: 11, color: ORANGE }}>
                      Required
                    </span>
                  ) : (
                    <span style={{ color: MUTED, fontSize: 12 }}>—</span>
                  )}
                </td>
                <td style={{ padding: "12px 16px", textAlign: "center" }}>
                  <span style={{ padding: "4px 10px", background: STATUS_COLORS[a.status] + "22", color: STATUS_COLORS[a.status], borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                    {a.status}
                  </span>
                </td>
                <td style={{ padding: "12px 16px", textAlign: "center", color: MUTED, fontSize: 12 }}>
                  {new Date(a.created_at).toLocaleDateString()}
                </td>
                <td style={{ padding: "12px 16px", textAlign: "center" }}>
                  <button
                    onClick={() => {
                      setSelectedApplicant(a);
                      setEditStatus(a.status);
                      setEditNotes(a.notes || "");
                      setEditTrainingNotes(a.training_notes || "");
                    }}
                    style={{ padding: "6px 12px", background: "rgba(74,158,255,0.1)", border: "none", borderRadius: 4, color: ACCENT, fontSize: 12, cursor: "pointer", marginRight: 8 }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(a.id)}
                    style={{ padding: "6px 12px", background: "rgba(229,57,53,0.1)", border: "none", borderRadius: 4, color: RED, fontSize: 12, cursor: "pointer" }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {applicants.length === 0 && !loading && (
              <tr>
                <td colSpan={7} style={{ padding: 32, textAlign: "center", color: MUTED }}>
                  No applicants yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {selectedApplicant && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: CARD, borderRadius: 12, padding: 24, width: 500, maxHeight: "80vh", overflow: "auto", border: "1px solid " + BDR }}>
            <h3 style={{ margin: 0, marginBottom: 16, color: TEXT }}>{selectedApplicant.full_name}</h3>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 4, color: MUTED, fontSize: 13 }}>Status</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", background: "#0B1628", border: "1px solid " + BDR, borderRadius: 6, color: TEXT, fontSize: 14 }}
              >
                <option value="NEW">NEW</option>
                <option value="REVIEWING">REVIEWING</option>
                <option value="INTERVIEW">INTERVIEW</option>
                <option value="HIRED">HIRED</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 4, color: MUTED, fontSize: 13 }}>Notes</label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
                style={{ width: "100%", padding: "10px 12px", background: "#0B1628", border: "1px solid " + BDR, borderRadius: 6, color: TEXT, fontSize: 14, resize: "vertical" }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", marginBottom: 4, color: MUTED, fontSize: 13 }}>Training Notes (Internal)</label>
              <textarea
                value={editTrainingNotes}
                onChange={(e) => setEditTrainingNotes(e.target.value)}
                rows={2}
                placeholder="e.g., Needs GACA license training"
                style={{ width: "100%", padding: "10px 12px", background: "#0B1628", border: "1px solid " + BDR, borderRadius: 6, color: TEXT, fontSize: 14, resize: "vertical" }}
              />
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                onClick={() => setSelectedApplicant(null)}
                style={{ padding: "10px 20px", background: "transparent", border: "1px solid " + BDR, borderRadius: 6, color: MUTED, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={saving}
                style={{ padding: "10px 20px", background: ACCENT, border: "none", borderRadius: 6, color: "#fff", fontWeight: 600, cursor: saving ? "wait" : "pointer" }}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

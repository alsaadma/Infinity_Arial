import { useEffect, useState } from "react";
import { useAssetAuth } from "../hooks/useAssetAuth";

interface ShowEvent {
  id: number;
  name: string;
  date: string;
  venue: string;
  drones_required: number;
  status: "planned" | "confirmed" | "completed" | "cancelled";
  notes: string;
}

const STATUS_COLOR: Record<string, string> = {
  planned:   "#4a9eff",
  confirmed: "#22c55e",
  completed: "#a78bfa",
  cancelled: "#ef4444",
};

const EMPTY = { name: "", date: "", venue: "", drones_required: "", status: "planned", notes: "" };

export default function Calendar() {
  const { session } = useAssetAuth();
  const [shows,   setShows]   = useState<ShowEvent[]>([]);
  const [form,    setForm]    = useState({ ...EMPTY });
  const [adding,  setAdding]  = useState(false);
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(true);

  const fetchShows = () =>
    fetch("/api/shows")
      .then(r => r.json())
      .then(d => { setShows(d.shows ?? []); setLoading(false); })
      .catch(() => { setError("Cannot reach server"); setLoading(false); });

  useEffect(() => { fetchShows(); }, []);

  const handleSave = async () => {
    if (!form.name || !form.date || !form.drones_required) {
      setError("Name, date and drone count are required."); return;
    }
    setError("");
    const res = await fetch("/api/shows", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + (session?.token ?? "") },
      body: JSON.stringify({ ...form, drones_required: Number(form.drones_required) }),
    });
    if (res.ok) { setForm({ ...EMPTY }); setAdding(false); fetchShows(); }
    else        { const e = await res.json(); setError(e.error ?? "Failed to save"); }
  };

  const upcoming = shows.filter(s => s.status !== "cancelled" && new Date(s.date) >= new Date());
  const past     = shows.filter(s => s.status === "cancelled"  || new Date(s.date) <  new Date());
  const totalCommitted = upcoming.reduce((a, s) => a + s.drones_required, 0);

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", color: "#e2e8f0" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "#f1f5f9" }}>Show Calendar</h1>
          <p style={{ margin: "0.25rem 0 0", color: "#64748b", fontSize: "0.875rem" }}>
            {upcoming.length} upcoming — {totalCommitted} drones committed
          </p>
        </div>
        <button
          onClick={() => { setAdding(a => !a); setError(""); }}
          style={{ background: adding ? "#334155" : "#1B4FD8", color: "#fff", border: "none",
            borderRadius: 8, padding: "0.55rem 1.25rem", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem" }}>
          {adding ? "? Cancel" : "+ New Show"}
        </button>
      </div>

      {/* Add Form */}
      {adding && (
        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12,
          padding: "1.25rem", marginBottom: "1.5rem" }}>
          <p style={{ margin: "0 0 1rem", fontWeight: 600, color: "#94a3b8", fontSize: "0.85rem",
            textTransform: "uppercase", letterSpacing: "0.06em" }}>New Show</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>
            {([
              { label: "Show Name",       key: "name",            type: "text"   },
              { label: "Date",            key: "date",            type: "date"   },
              { label: "Venue",           key: "venue",           type: "text"   },
              { label: "Drones Required", key: "drones_required", type: "number" },
            ] as const).map(({ label, key, type }) => (
              <div key={key}>
                <label style={{ display: "block", fontSize: "0.78rem", color: "#64748b", marginBottom: 4 }}>{label}</label>
                <input type={type} value={(form as any)[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  style={{ width: "100%", background: "#0f172a", border: "1px solid #334155",
                    borderRadius: 6, padding: "0.45rem 0.7rem", color: "#e2e8f0",
                    fontSize: "0.9rem", boxSizing: "border-box" }} />
              </div>
            ))}
            <div>
              <label style={{ display: "block", fontSize: "0.78rem", color: "#64748b", marginBottom: 4 }}>Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                style={{ width: "100%", background: "#0f172a", border: "1px solid #334155",
                  borderRadius: 6, padding: "0.45rem 0.7rem", color: "#e2e8f0", fontSize: "0.9rem" }}>
                {["planned","confirmed","completed","cancelled"].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.78rem", color: "#64748b", marginBottom: 4 }}>Notes</label>
              <input type="text" value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                style={{ width: "100%", background: "#0f172a", border: "1px solid #334155",
                  borderRadius: 6, padding: "0.45rem 0.7rem", color: "#e2e8f0",
                  fontSize: "0.9rem", boxSizing: "border-box" }} />
            </div>
          </div>
          {error && <p style={{ color: "#ef4444", fontSize: "0.82rem", margin: "0.75rem 0 0" }}>{error}</p>}
          <button onClick={handleSave}
            style={{ marginTop: "1rem", background: "#22c55e", color: "#fff", border: "none",
              borderRadius: 8, padding: "0.55rem 1.5rem", cursor: "pointer", fontWeight: 600 }}>
            Save Show
          </button>
        </div>
      )}

      {loading && <p style={{ color: "#64748b" }}>Loading…</p>}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <section style={{ marginBottom: "2rem" }}>
          <p style={{ margin: "0 0 0.6rem", fontSize: "0.75rem", textTransform: "uppercase",
            letterSpacing: "0.08em", color: "#475569" }}>Upcoming</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {upcoming.map(s => <ShowCard key={s.id} show={s} />)}
          </div>
        </section>
      )}

      {/* Past */}
      {past.length > 0 && (
        <section>
          <p style={{ margin: "0 0 0.6rem", fontSize: "0.75rem", textTransform: "uppercase",
            letterSpacing: "0.08em", color: "#334155" }}>Past / Cancelled</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", opacity: 0.55 }}>
            {past.map(s => <ShowCard key={s.id} show={s} />)}
          </div>
        </section>
      )}

      {!loading && shows.length === 0 && (
        <div style={{ textAlign: "center", padding: "5rem 0", color: "#334155" }}>
          <p style={{ fontSize: "1.1rem", margin: 0 }}>No shows scheduled yet.</p>
          <p style={{ fontSize: "0.85rem", marginTop: "0.4rem" }}>Click "+ New Show" to add your first event.</p>
        </div>
      )}
    </div>
  );
}

function ShowCard({ show }: { show: ShowEvent }) {
  const color = STATUS_COLOR[show.status] ?? "#64748b";
  const d     = new Date(show.date + "T00:00:00");
  return (
    <div style={{ background: "#1e293b", border: "1px solid #1e293b", borderRadius: 10,
      padding: "0.9rem 1.1rem", display: "flex", alignItems: "center", gap: "1.25rem" }}>
      {/* Date badge */}
      <div style={{ minWidth: 52, textAlign: "center", background: "#0f172a",
        borderRadius: 8, padding: "0.4rem 0.5rem" }}>
        <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#f1f5f9", lineHeight: 1 }}>{d.getDate()}</div>
        <div style={{ fontSize: "0.65rem", color: "#64748b", textTransform: "uppercase", marginTop: 2 }}>
          {d.toLocaleDateString("en-GB", { month: "short" })} {d.getFullYear()}
        </div>
      </div>
      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "#f1f5f9",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{show.name}</div>
        <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 2 }}>{show.venue || "—"}</div>
      </div>
      {/* Drone count */}
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#4a9eff" }}>{show.drones_required}</div>
        <div style={{ fontSize: "0.65rem", color: "#475569" }}>drones</div>
      </div>
      {/* Status pill */}
      <div style={{ background: color + "22", color, borderRadius: 6,
        padding: "0.2rem 0.65rem", fontSize: "0.72rem", fontWeight: 600,
        textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
        {show.status}
      </div>
    </div>
  );
}


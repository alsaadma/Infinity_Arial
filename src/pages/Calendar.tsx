import { useEffect, useState } from "react";

interface ShowEvent { id: string; name: string; date: string; venue: string; drones_required: number; status: string; notes: string; }
interface PermitItem { id: string; status: string; show_id: string | null; }
interface ReadinessItem { id: string; show_id: string | null; status: "OPEN"|"IN_PROGRESS"|"BLOCKED"|"DONE"; }

const MONTHS     = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function capColor(req: number, avail: number) {
  if (!avail || !req) return { bg:"rgba(255,255,255,0.02)", border:"rgba(255,255,255,0.07)", tag:"" };
  const r = req / avail;
  if (r <= 0.75) return { bg:"rgba(34,197,94,0.08)",  border:"rgba(34,197,94,0.30)",  tag:"OK" };
  if (r <= 1.00) return { bg:"rgba(251,146,60,0.10)", border:"rgba(251,146,60,0.38)", tag:"TIGHT" };
  return           { bg:"rgba(239,68,68,0.12)",  border:"rgba(239,68,68,0.42)",  tag:"OVER" };
}
function readyScore(items: ReadinessItem[]) {
  if (!items.length) return 100;
  return Math.round(items.filter(i => i.status === "DONE").length / items.length * 100);
}
function permitBadge(items: PermitItem[]) {
  if (!items.length) return { label:"No Permit", color:"#64748b" };
  if (items.some(p => p.status === "APPROVED"))  return { label:"Approved",  color:"#22c55e" };
  if (items.some(p => p.status === "SUBMITTED")) return { label:"Submitted", color:"#4a9eff" };
  if (items.some(p => p.status === "DRAFT"))     return { label:"Draft",     color:"#fb923c" };
  return { label:"Rejected", color:"#ef4444" };
}

export default function Calendar() {
  const [shows,     setShows]     = useState<ShowEvent[]>([]);
  const [permits,   setPermits]   = useState<PermitItem[]>([]);
  const [readiness, setReadiness] = useState<ReadinessItem[]>([]);
  const [fleet,     setFleet]     = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [year,      setYear]      = useState(new Date().getFullYear());
  const [expanded,  setExpanded]  = useState<number|null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/shows").then(r => r.json()),
      fetch("/api/permits").then(r => r.json()),
      fetch("/api/readiness/items").then(r => r.json()),
      fetch("/api/fleet/drones/summary").then(r => r.json()),
    ]).then(([s,p,rd,fl]) => {
      setShows(s.shows ?? s.items ?? []);
      setPermits(p.items ?? []);
      setReadiness(rd.items ?? []);
      setFleet(fl.available_for_planning ?? fl.counts?.active ?? 0);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const showsIn = (m: number) => shows.filter(s => {
    const d = new Date(s.date + "T00:00:00");
    return d.getFullYear() === year && d.getMonth() === m;
  });
  const demand = (list: ShowEvent[]) => list.reduce((a,s) => a + s.drones_required, 0);
  const now = new Date();

  return (
    <div style={{ maxWidth:1100, margin:"0 auto", color:"#e2e8f0" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div>
          <h1 style={{ margin:0, fontSize:22, fontWeight:700, color:"#f1f5f9" }}>Operations Calendar</h1>
          <p style={{ margin:"4px 0 0", color:"#64748b", fontSize:13 }}>Fleet capacity · Permit status · Team readiness — {year}</p>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <button onClick={() => setYear(y => y-1)} style={{ padding:"6px 14px", borderRadius:8, border:"1px solid rgba(255,255,255,0.12)", background:"transparent", color:"#94a3b8", cursor:"pointer", fontSize:13 }}>
            {"< "}{year-1}
          </button>
          <span style={{ fontWeight:700, fontSize:15, color:"#f1f5f9", minWidth:48, textAlign:"center" }}>{year}</span>
          <button onClick={() => setYear(y => y+1)} style={{ padding:"6px 14px", borderRadius:8, border:"1px solid rgba(255,255,255,0.12)", background:"transparent", color:"#94a3b8", cursor:"pointer", fontSize:13 }}>
            {year+1}{" >"}
          </button>
        </div>
      </div>

      <div style={{ display:"flex", gap:16, marginBottom:20, flexWrap:"wrap", fontSize:11, opacity:0.7 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}><div style={{ width:12, height:12, borderRadius:3, border:"1px solid rgba(34,197,94,0.30)", background:"rgba(34,197,94,0.10)" }} /><span>OK (up to 75%)</span></div>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}><div style={{ width:12, height:12, borderRadius:3, border:"1px solid rgba(251,146,60,0.38)", background:"rgba(251,146,60,0.10)" }} /><span>Tight (75-100%)</span></div>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}><div style={{ width:12, height:12, borderRadius:3, border:"1px solid rgba(239,68,68,0.42)", background:"rgba(239,68,68,0.10)" }} /><span>Overbooked</span></div>
        <span>Fleet: <b style={{ color:"#4a9eff" }}>{fleet}</b> available</span>
      </div>

      {loading ? <p style={{ opacity:0.4 }}>Loading...</p> : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:12 }}>
          {MONTHS.map((_,m) => {
            const ms    = showsIn(m);
            const dem   = demand(ms);
            const cap   = capColor(dem, fleet);
            const isCur = m === now.getMonth() && year === now.getFullYear();
            const isExp = expanded === m;
            return (
              <div key={m} onClick={() => setExpanded(isExp ? null : m)}
                style={{ borderRadius:12, padding:14, cursor:"pointer",
                  background: ms.length ? cap.bg : "rgba(255,255,255,0.02)",
                  border:"1px solid "+(ms.length ? cap.border : isCur ? "rgba(74,158,255,0.45)" : "rgba(255,255,255,0.07)"),
                  boxShadow: isCur ? "0 0 0 1px rgba(74,158,255,0.18)" : "none" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <span style={{ fontWeight:700, fontSize:14, color: isCur ? "#4a9eff" : "#f1f5f9" }}>
                    {MONTH_FULL[m]}{isCur && <span style={{ marginLeft:6, fontSize:9, fontWeight:800, color:"#4a9eff" }}>NOW</span>}
                  </span>
                  {ms.length > 0 && cap.tag && (
                    <span style={{ fontSize:9, fontWeight:800, padding:"2px 7px", borderRadius:5,
                      color: cap.tag==="OK" ? "#4ade80" : cap.tag==="TIGHT" ? "#fb923c" : "#ef4444",
                      background: cap.tag==="OK" ? "rgba(74,222,128,0.12)" : cap.tag==="TIGHT" ? "rgba(251,146,60,0.14)" : "rgba(239,68,68,0.14)" }}>
                      {cap.tag}
                    </span>
                  )}
                </div>
                {!ms.length && <div style={{ fontSize:11, color:"#334155" }}>No shows</div>}
                {ms.length > 0 && (
                  <div style={{ display:"flex", gap:10, fontSize:11, marginBottom:8 }}>
                    <span style={{ color:"#94a3b8" }}>{ms.length} show{ms.length!==1?"s":""}</span>
                    <span style={{ color:"#4a9eff", fontWeight:700 }}>{dem.toLocaleString()} drones</span>
                  </div>
                )}
                {!isExp && ms.slice(0,2).map(s => (
                  <div key={s.id} style={{ fontSize:11, padding:"3px 7px", borderRadius:6, marginBottom:4, background:"rgba(255,255,255,0.05)", color:"#cbd5e1", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{s.name}</div>
                ))}
                {!isExp && ms.length > 2 && <div style={{ fontSize:10, color:"#475569", marginTop:2 }}>+{ms.length-2} more</div>}
                {isExp && ms.map(s => {
                  const sp = permits.filter(p => p.show_id === String(s.id));
                  const sr = readiness.filter(r => r.show_id === String(s.id));
                  const pb = permitBadge(sp);
                  const rs = readyScore(sr);
                  const rc = rs >= 80 ? "#4ade80" : rs >= 50 ? "#fb923c" : "#ef4444";
                  return (
                    <div key={s.id} onClick={e => e.stopPropagation()}
                      style={{ marginBottom:8, padding:"8px 10px", borderRadius:8, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)" }}>
                      <div style={{ fontWeight:600, fontSize:12, color:"#f1f5f9", marginBottom:4 }}>{s.name}</div>
                      <div style={{ fontSize:10, color:"#64748b", marginBottom:6 }}>
                        {new Date(s.date+"T00:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short"})}{s.venue ? " · "+s.venue : ""}
                      </div>
                      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                        <span style={{ fontSize:10, fontWeight:700, color:"#4a9eff" }}>{s.drones_required.toLocaleString()} drones</span>
                        <span style={{ fontSize:10, padding:"1px 6px", borderRadius:4, fontWeight:600, background:pb.color+"22", color:pb.color }}>{pb.label}</span>
                        <span style={{ fontSize:10, padding:"1px 6px", borderRadius:4, fontWeight:600, background:rc+"22", color:rc }}>Ready {rs}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

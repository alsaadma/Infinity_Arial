// src/pages/Help.tsx — Info Center
import { useState } from "react";

const CARD   = "#111E35";
const CARD2  = "#0D1B2E";
const BDR    = "rgba(255,255,255,0.08)";
const ACCENT = "#4A9EFF";
const TEXT   = "#F0F4FF";
const MUTED  = "#8FA3C0";
const GREEN  = "#43A047";
const GOLD   = "#F9A825";

const MODULES = [
  { icon:"🏠", name:"Command", what:"Live operational overview of the entire fleet and upcoming shows.", goal:"Give the operations director a single read-only dashboard to assess fleet health, permit status, show countdown, and cost KPIs at a glance.", enter:"Nothing to enter — all data is pulled automatically from other modules. Refreshes every 60 seconds.", produces:"Fleet health %, active drone count, upcoming show countdown, permit readiness, cost floor per show." },
  { icon:"🚁", name:"Fleet — Drones", what:"Registry of every drone unit owned or operated.", goal:"Track the operational status, purchase price, and history of each drone across its lifecycle.", enter:"Serial number, model, purchase price (SAR), status (ACTIVE / MAINTENANCE / RETIRED), and reason for status changes.", produces:"Active fleet count, retired history, per-drone cost data used by the Costing module." },
  { icon:"🔋", name:"Fleet — Batteries", what:"Registry of every battery unit with cycle tracking and health scoring.", goal:"Prevent battery-related failures by monitoring cycle count, health percentage, and retirement thresholds.", enter:"Serial number, battery type, linked drone, capacity (mAh), nominal voltage, max cycles, purchase price, and current health %.", produces:"Battery health %, cycle warnings, status history log, retirement alerts." },
  { icon:"📅", name:"Shows", what:"Registry of all upcoming and past drone shows.", goal:"Capture every confirmed or prospective show so the system can calculate capacity, readiness, and scheduling conflicts.", enter:"Show name, date, venue city, number of drones required, show duration, status (PROSPECT / CONFIRMED / COMPLETED / CANCELLED), and notes.", produces:"Calendar view, capacity risk panel, inter-show dependency timeline, readiness engine input." },
  { icon:"🔗", name:"Allocations", what:"Drone-to-show assignment tracking.", goal:"Record which specific drones are committed to which show, preventing double-booking.", enter:"Select a show, then assign individual drone units from the active fleet.", produces:"Committed drone list per show, allocation gaps vs drones required." },
  { icon:"📋", name:"Permits", what:"Legal permit and approval tracking for every show.", goal:"Ensure all required authorizations are obtained on time — GACA, municipality, insurance, NOC, and others.", enter:"Use the Permit Checklist at the top: select a show, tick each permit type needed — DRAFT records are created automatically. Then open each permit to fill in authority, reference number, submission date, and expiry.", produces:"Permit status per show, expiry alerts, approved count for Command dashboard." },
  { icon:"📍", name:"Sites", what:"Venue and location registry.", goal:"Maintain a database of all sites where shows have been or may be performed, including GPS coordinates and surface type.", enter:"Site name, city, country, site type (OUTDOOR / BEACH / STADIUM / etc.), GPS coordinates, status, and access notes.", produces:"Site list for show planning, Launch Area Calculator (drones x 0.25 m2 + fixed zones = permit area estimate)." },
  { icon:"✅", name:"Readiness", what:"Go / No-Go assessment for each upcoming show.", goal:"Run an automated gate check (fleet count, battery health, permits, capacity) plus a manual checklist before committing to a show.", enter:"Manual checklist items per show (e.g. weather confirmed, ground team briefed, generator checked). Automated gates read from other modules.", produces:"Gate pass/fail per show, stress score, hard blockers list, readiness status (READY / CONDITIONAL / NOT READY)." },
  { icon:"💰", name:"Costing", what:"Depreciation calculation and maintenance cost tracking.", goal:"Know the true cost floor per show so quotes are never set below break-even.", enter:"Config: useful life (years), expected shows per year, residual value %. Maintenance log: asset, cost (SAR), date, description.", produces:"Depreciation per show, maintenance cost per show, cost floor per show — feeds into Quote Builder." },
  { icon:"🧮", name:"Quote Builder", what:"Show price estimation tool.", goal:"Generate a recommended sell price based on drone tier, team costs, travel, and target margin — with a printable quote.", enter:"Client name, show name, duration, team size, trip days, nights away, drone tier, cost per drone, travel zone, permit fee, accommodation rate, ticket rate, food rate, margin %.", produces:"Recommended sell price, cost breakdown with formulas, margin KPIs, printable quote with quote ID." },
  { icon:"📊", name:"Utilization", what:"Fleet usage and idle analysis.", goal:"Understand how efficiently the fleet is being deployed across shows and identify underutilised periods.", enter:"Nothing to enter — reads from Fleet and Shows data automatically.", produces:"Utilization %, idle drone periods, show frequency analysis." },
  { icon:"📈", name:"Reporting", what:"Executive KPI summary and analytics.", goal:"Give leadership a high-level view of operational performance, financial health, and fleet status.", enter:"Nothing to enter — read-only aggregation of all modules.", produces:"KPI snapshot: active fleet, approved permits, shows this month, battery health avg, cost floor, maintenance events." },
  { icon:"🛠️", name:"Assets", what:"General equipment inventory beyond drones and batteries.", goal:"Track ground support equipment, control stations, generators, and other operational assets.", enter:"Asset name, type, serial number, status, purchase date, notes.", produces:"Full asset registry for operational planning." },
  { icon:"🗓️", name:"Calendar", what:"Visual monthly timeline of all shows.", goal:"See at a glance how shows are distributed across the year and spot scheduling conflicts.", enter:"Nothing — reads from Shows module.", produces:"Month-by-month show calendar with status colour coding." },
];

const INTAKE_STEPS = [
  { step:1, icon:"📅", title:"Capture Show Basics", where:"Shows page", actions:["Create a new show event","Enter: show name, occasion / event type, proposed date and time","Enter: venue city, estimated show duration (minutes)","Enter: number of drones the client is requesting","Set status to PROSPECT until confirmed"] },
  { step:2, icon:"📍", title:"Confirm the Venue", where:"Sites page", actions:["Search for the venue in the site registry","If not found: add new site with city, GPS coordinates, surface type","Note any access restrictions or surface leveling issues","Use the Launch Area Calculator: enter drone count to get minimum permit area (m2)"] },
  { step:3, icon:"🚁", title:"Check Fleet Availability", where:"Fleet page", actions:["Verify active drone count is >= drones requested by client","Check battery health — ensure sufficient healthy batteries for the show","Note any drones under maintenance that may be ready by show date","Go to Allocations to confirm no conflicting shows on the same date"] },
  { step:4, icon:"🧮", title:"Estimate the Price", where:"Quote Builder page", actions:["Enter client name and show name","Select drone tier (300 / 500 / 1000) and cost per drone","Enter team size, trip days, nights away","Select travel zone — override cost if you have a specific figure","Fill in permit fee, accommodation, tickets, food per diem rates","Select target margin (25% / 27.5% / 30%)","Record the recommended sell price — click Print Quote to generate a document"] },
  { step:5, icon:"✅", title:"Assess Feasibility", where:"Readiness page", actions:["Find the show in the readiness list","Review automated gate results: fleet count, battery health, permits, capacity","Check the stress score — high stress means the show is close to fleet limits","Note any hard blockers that must be resolved before confirming"] },
  { step:6, icon:"📋", title:"Open Permit Drafts", where:"Permits page", actions:["Go to the Permit Checklist panel at the top","Select the show from the dropdown","Tick all permit types relevant to this show","DRAFT records are created automatically — open each to add authority contact and deadline","Minimum lead times: Airspace Auth 21+ days, NOTAM 72 hrs, Gathering Permit 14-30 days"] },
];

const QUICK_FIELDS = [
  { field:"Client / Organisation Name",       where:"Quote Builder",          required:true  },
  { field:"Show Name / Occasion",             where:"Shows + Quote Builder",  required:true  },
  { field:"Proposed Show Date and Time",      where:"Shows",                  required:true  },
  { field:"Venue City and Country",           where:"Sites",                  required:true  },
  { field:"Show Duration (minutes)",          where:"Quote Builder",          required:true  },
  { field:"Drone Count Requested",            where:"Shows — Drones Required",required:true  },
  { field:"Travel Zone / Distance",           where:"Quote Builder",          required:true  },
  { field:"Team Size Traveling",              where:"Quote Builder",          required:true  },
  { field:"Nights Away",                      where:"Quote Builder",          required:true  },
  { field:"Permit Authority (GACA / local)",  where:"Permits",                required:false },
  { field:"Budget Expectation (if shared)",   where:"Quote Builder — notes",  required:false },
  { field:"Special Requirements / Notes",     where:"Shows + Quote Builder",  required:false },
];

const PERMIT_REF = [
  { type:"Airspace Authorization",          authority:"GACA",                                  timing:"21+ days before" },
  { type:"NOTAM",                           authority:"GACA / ANSP",                           timing:"72 hrs before"   },
  { type:"Event / Public Gathering Permit", authority:"Ministry of Interior / Municipality",   timing:"14-30 days"      },
  { type:"Venue / Site Access Permit",      authority:"Site owner / Royal Commission",         timing:"Varies"          },
  { type:"Insurance Certificate",           authority:"Insurance provider",                    timing:"Before show"     },
  { type:"RF Frequency Clearance",          authority:"CITC",                                  timing:"14+ days before" },
  { type:"Commercial Activity License",     authority:"Ministry of Commerce / Baladia",        timing:"Annual"          },
  { type:"No-Objection Letter (NOC)",       authority:"Police / Venue owner / Royal Court",    timing:"7-21 days"       },
];

type Tab = "modules" | "intake" | "quickref";

export default function Help() {
  const [tab,      setTab]      = useState<Tab>("modules");
  const [expanded, setExpanded] = useState<string | null>(null);

  function TabBtn({ id, label }: { id: Tab; label: string }) {
    return (
      <button onClick={() => setTab(id)} style={{
        padding:"8px 20px", borderRadius:8, fontWeight:600, fontSize:13,
        cursor:"pointer", border:"none",
        background: tab === id ? "linear-gradient(135deg,#1B4FD8,#4A9EFF)" : CARD2,
        color: tab === id ? "#fff" : MUTED,
      }}>{label}</button>
    );
  }

  return (
    <div style={{ maxWidth:900, margin:"0 auto" }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ margin:0, color:TEXT, fontWeight:700, fontSize:22 }}>Info Center</h1>
        <p style={{ margin:"4px 0 0", color:MUTED, fontSize:13 }}>
          Reference guide for team members — how to use the system and capture client information
        </p>
      </div>

      <div style={{ display:"flex", gap:10, marginBottom:24 }}>
        <TabBtn id="modules"  label="Module Reference" />
        <TabBtn id="intake"   label="Client Intake Guide" />
        <TabBtn id="quickref" label="Quick Reference Card" />
      </div>

      {tab === "modules" && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <p style={{ color:MUTED, fontSize:13, margin:"0 0 8px" }}>
            Click any module to see what it tracks, its goal, what to enter, and what it produces.
          </p>
          {MODULES.map(m => (
            <div key={m.name} style={{ background:CARD, border:"1px solid "+BDR, borderRadius:12, overflow:"hidden" }}>
              <div onClick={() => setExpanded(expanded === m.name ? null : m.name)}
                style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                          padding:"14px 20px", cursor:"pointer" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <span style={{ fontSize:20 }}>{m.icon}</span>
                  <span style={{ color:TEXT, fontWeight:700, fontSize:14 }}>{m.name}</span>
                </div>
                <span style={{ color:MUTED, fontSize:12 }}>{expanded === m.name ? "Hide" : "Expand"}</span>
              </div>
              {expanded === m.name && (
                <div style={{ padding:"0 20px 18px", borderTop:"1px solid "+BDR }}>
                  {([
                    { label:"What it is",    value:m.what,     color:TEXT   },
                    { label:"Goal",          value:m.goal,     color:MUTED  },
                    { label:"What to enter", value:m.enter,    color:ACCENT },
                    { label:"Produces",      value:m.produces, color:GREEN  },
                  ]).map(row => (
                    <div key={row.label} style={{ display:"grid", gridTemplateColumns:"130px 1fr",
                          gap:10, padding:"10px 0", borderBottom:"1px solid "+BDR }}>
                      <span style={{ color:MUTED, fontSize:11, fontWeight:600,
                                      textTransform:"uppercase", letterSpacing:0.4, paddingTop:2 }}>
                        {row.label}
                      </span>
                      <span style={{ color:row.color, fontSize:13, lineHeight:1.6 }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === "intake" && (
        <div>
          <div style={{ background:"rgba(74,158,255,0.08)", border:"1px solid rgba(74,158,255,0.2)",
                        borderRadius:10, padding:"14px 18px", marginBottom:20 }}>
            <p style={{ color:TEXT, fontSize:13, margin:0, lineHeight:1.7 }}>
              When a client contacts you requesting a show, follow these 6 steps in order.
              Each step tells you which page to go to and exactly what to capture.
              Complete all 6 before confirming a price or committing to a date.
            </p>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {INTAKE_STEPS.map(s => (
              <div key={s.step} style={{ background:CARD, border:"1px solid "+BDR,
                    borderRadius:12, padding:"18px 22px", display:"flex", gap:18 }}>
                <div style={{ flexShrink:0, width:40, height:40, borderRadius:10,
                               background:"linear-gradient(135deg,#1B4FD8,#4A9EFF)",
                               display:"flex", alignItems:"center", justifyContent:"center",
                               fontWeight:800, fontSize:16, color:"#fff" }}>{s.step}</div>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center",
                                 justifyContent:"space-between", marginBottom:8 }}>
                    <span style={{ color:TEXT, fontWeight:700, fontSize:15 }}>
                      {s.icon} {s.title}
                    </span>
                    <span style={{ background:"rgba(74,158,255,0.12)",
                                    border:"1px solid rgba(74,158,255,0.25)",
                                    borderRadius:6, color:ACCENT,
                                    padding:"3px 10px", fontSize:11, fontWeight:600 }}>
                      {s.where}
                    </span>
                  </div>
                  <ul style={{ margin:0, paddingLeft:18, display:"flex",
                                flexDirection:"column", gap:5 }}>
                    {s.actions.map((a,i) => (
                      <li key={i} style={{ color:MUTED, fontSize:13, lineHeight:1.5 }}>{a}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "quickref" && (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between",
                        alignItems:"center", marginBottom:16 }}>
            <p style={{ color:MUTED, fontSize:13, margin:0 }}>
              Use this card when a client calls. Capture every required field before ending the call.
            </p>
            <button onClick={() => window.print()} style={{
              background:"rgba(74,158,255,0.12)", border:"1px solid rgba(74,158,255,0.3)",
              borderRadius:8, color:ACCENT, padding:"7px 16px",
              fontSize:12, fontWeight:600, cursor:"pointer",
            }}>Print Card</button>
          </div>

          <div style={{ background:CARD, border:"1px solid "+BDR, borderRadius:12,
                        overflow:"hidden", marginBottom:16 }}>
            <div style={{ padding:"12px 18px", borderBottom:"1px solid "+BDR,
                           background:"rgba(74,158,255,0.08)" }}>
              <span style={{ color:ACCENT, fontWeight:700, fontSize:13 }}>Client Intake Fields</span>
            </div>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ borderBottom:"1px solid "+BDR }}>
                  {["Field","Where to enter in app","Required"].map(h => (
                    <th key={h} style={{ padding:"9px 16px", color:MUTED, fontWeight:600,
                                          fontSize:11, textTransform:"uppercase",
                                          textAlign:"left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {QUICK_FIELDS.map((f,i) => (
                  <tr key={f.field} style={{ borderBottom:"1px solid "+BDR,
                        background: i%2===0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                    <td style={{ padding:"10px 16px", color:TEXT, fontWeight:600 }}>{f.field}</td>
                    <td style={{ padding:"10px 16px", color:MUTED }}>{f.where}</td>
                    <td style={{ padding:"10px 16px", textAlign:"center" }}>
                      {f.required
                        ? <span style={{ color:GREEN, fontWeight:700 }}>Yes</span>
                        : <span style={{ color:MUTED }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ background:CARD, border:"1px solid "+BDR, borderRadius:12,
                        overflow:"hidden", marginBottom:16 }}>
            <div style={{ padding:"12px 18px", borderBottom:"1px solid "+BDR,
                           background:"rgba(249,168,37,0.08)" }}>
              <span style={{ color:GOLD, fontWeight:700, fontSize:13 }}>
                Permit Types Reference — Saudi Operations
              </span>
            </div>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ borderBottom:"1px solid "+BDR }}>
                  {["Permit Type","Authority","Lead Time"].map(h => (
                    <th key={h} style={{ padding:"9px 16px", color:MUTED, fontWeight:600,
                                          fontSize:11, textTransform:"uppercase",
                                          textAlign:"left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMIT_REF.map((p,i) => (
                  <tr key={p.type} style={{ borderBottom:"1px solid "+BDR,
                        background: i%2===0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                    <td style={{ padding:"10px 16px", color:TEXT, fontWeight:600 }}>{p.type}</td>
                    <td style={{ padding:"10px 16px", color:MUTED }}>{p.authority}</td>
                    <td style={{ padding:"10px 16px" }}>
                      <span style={{ background:"rgba(249,168,37,0.12)",
                                      border:"1px solid rgba(249,168,37,0.25)",
                                      borderRadius:4, color:GOLD, padding:"2px 8px", fontSize:11 }}>
                        {p.timing}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ background:CARD, border:"1px solid "+BDR, borderRadius:12, overflow:"hidden" }}>
            <div style={{ padding:"12px 18px", borderBottom:"1px solid "+BDR,
                           background:"rgba(67,160,71,0.08)" }}>
              <span style={{ color:GREEN, fontWeight:700, fontSize:13 }}>
                Launch Area Quick Reference (DAMODA Formula)
              </span>
            </div>
            <div style={{ padding:"16px 18px" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ borderBottom:"1px solid "+BDR }}>
                    {["Drone Count","Launch Grid","Fixed Zones","Permit Area (min)"].map(h => (
                      <th key={h} style={{ padding:"8px 14px", color:MUTED, fontWeight:600,
                                            fontSize:11, textTransform:"uppercase",
                                            textAlign:"left" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[300,500,1000,2000].map((d,i) => {
                    const grid  = d * 0.25;
                    const total = Math.ceil((grid + 115) / 50) * 50;
                    return (
                      <tr key={d} style={{ borderBottom:"1px solid "+BDR,
                            background: i%2===0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                        <td style={{ padding:"9px 14px", color:TEXT, fontWeight:700 }}>{d.toLocaleString()}</td>
                        <td style={{ padding:"9px 14px", color:MUTED }}>{grid.toLocaleString()} m2</td>
                        <td style={{ padding:"9px 14px", color:MUTED }}>+115 m2</td>
                        <td style={{ padding:"9px 14px" }}>
                          <span style={{ color:GREEN, fontWeight:700 }}>{total.toLocaleString()} m2</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p style={{ color:MUTED, fontSize:11, margin:"12px 0 0", fontStyle:"italic" }}>
                Fixed zones: 100 m2 control station + 15 m2 battery zone.
                Safety buffer per local authority — not included. Use Sites page for custom counts.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

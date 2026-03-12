// src/pages/QuoteCalc.tsx — Module: Quote Builder
import { useState, useMemo } from "react";

const CARD  = "#111E35";
const BDR   = "rgba(255,255,255,0.08)";
const ACCENT = "#4A9EFF";
const TEXT  = "#F0F4FF";
const MUTED = "#8FA3C0";
const GREEN = "#43A047";
const ORANGE = "#FB8C00";
const GOLD  = "#F9A825";

const TIERS = [300, 500, 1000] as const;
type Tier = typeof TIERS[number];

const TRAVEL_ZONES: Record<string, { label: string; base: number; daily: number }> = {
  LOCAL:         { label: "Local — same city",          base: 0,      daily: 0     },
  REGIONAL:      { label: "Regional — up to 300 km",    base: 5000,   daily: 800   },
  NATIONAL:      { label: "National — 300 km+",         base: 12000,  daily: 1500  },
  INTERNATIONAL: { label: "International",              base: 40000,  daily: 4000  },
};

const MARGIN_OPTIONS = [
  { label: "25%",   value: 0.25  },
  { label: "27.5%", value: 0.275 },
  { label: "30%",   value: 0.30  },
];

const inp: React.CSSProperties = {
  background: "#1A2A44", border: `1px solid ${BDR}`, borderRadius: 8,
  color: TEXT, padding: "9px 14px", fontSize: 14, outline: "none",
  width: "100%", boxSizing: "border-box",
};
const tdS: React.CSSProperties = { padding: "11px 14px", verticalAlign: "middle", fontSize: 14 };

function sar(n: number) {
  return "SAR " + Math.round(n).toLocaleString("en-US");
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ margin: "0 0 16px", color: TEXT, fontSize: 15, fontWeight: 600,
                 borderBottom: `1px solid ${BDR}`, paddingBottom: 10 }}>{children}</h3>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", alignItems: "center",
                  gap: 12, marginBottom: 12 }}>
      <label style={{ color: MUTED, fontSize: 13 }}>{label}</label>
      <div>{children}</div>
    </div>
  );
}

function TierBtn({ value, active, onClick }: { value: number; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: "8px 22px", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: "pointer",
      border: active ? "none" : `1px solid ${BDR}`,
      background: active ? "linear-gradient(135deg,#1B4FD8,#4A9EFF)" : "#1A2A44",
      color: active ? "#fff" : MUTED,
    }}>{value.toLocaleString()}</button>
  );
}

function MarginBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: "7px 18px", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer",
      border: active ? "none" : `1px solid ${BDR}`,
      background: active ? "rgba(74,158,255,0.2)" : "#1A2A44",
      color: active ? ACCENT : MUTED,
    }}>{label}</button>
  );
}

interface LineItem { label: string; cost: number; note?: string }
interface QuoteResult {
  lines: LineItem[];
  totalCost: number;
  recommendedPrice: number;
  profit: number;
  marginPct: number;
  pricePerDrone: number;
}

export default function QuoteCalc() {
  const [tier,          setTier]          = useState<Tier>(1000);
  const [costPerDrone,  setCostPerDrone]  = useState("450");
  const [durationMin,   setDurationMin]   = useState("15");
  const [tripDays,      setTripDays]      = useState("3");
  const [travelZone,    setTravelZone]    = useState("LOCAL");
  const [travelOverride,setTravelOverride]= useState("");
  const [margin,        setMargin]        = useState(0.25);
  const [permitFee,     setPermitFee]     = useState("5000");
  const [accommodation, setAccommodation] = useState("3000");
  const [tickets,       setTickets]       = useState("2000");
  const [transport,     setTransport]     = useState("1500");
  const [food,          setFood]          = useState("1000");
  const [clientName,    setClientName]    = useState("");
  const [showName,      setShowName]      = useState("");
  const [quoteNotes,    setQuoteNotes]    = useState("");

  const travelCost = useMemo(() => {
    const days = Math.max(1, parseInt(tripDays) || 1);
    if (travelOverride.trim() !== "") {
      const n = parseFloat(travelOverride);
      return Number.isFinite(n) ? n : TRAVEL_ZONES[travelZone].base + TRAVEL_ZONES[travelZone].daily * days;
    }
    return TRAVEL_ZONES[travelZone].base + TRAVEL_ZONES[travelZone].daily * days;
  }, [travelZone, travelOverride, tripDays]);

  const quote = useMemo((): QuoteResult => {
    const cpd  = parseFloat(costPerDrone)  || 0;
    const perm = parseFloat(permitFee)     || 0;
    const acc  = parseFloat(accommodation) || 0;
    const tix  = parseFloat(tickets)       || 0;
    const trns = parseFloat(transport)     || 0;
    const fd   = parseFloat(food)          || 0;

    const days = Math.max(1, parseInt(tripDays) || 1);
    const lines: LineItem[] = [
      { label: "Drone Fleet Operation",   cost: tier * cpd,    note: `${tier.toLocaleString()} drones x SAR ${cpd.toLocaleString()} per unit` },
      { label: "Travel & Mobilization",   cost: travelCost,    note: `${TRAVEL_ZONES[travelZone].label} · base + ${days}d` },
      { label: "Permits & Regulatory",    cost: perm * days,   note: `SAR ${perm.toLocaleString()}/day x ${days} days` },
      { label: "Accommodation",           cost: acc  * days,   note: `SAR ${acc.toLocaleString()}/day x ${days} days` },
      { label: "Tickets & Entry",         cost: tix  * days,   note: `SAR ${tix.toLocaleString()}/day x ${days} days` },
      { label: "Ground Transportation",   cost: trns * days,   note: `SAR ${trns.toLocaleString()}/day x ${days} days` },
      { label: "Food & Per Diem",         cost: fd   * days,   note: `SAR ${fd.toLocaleString()}/day x ${days} days` },
    ].filter(l => l.cost > 0);

    const totalCost        = lines.reduce((s, l) => s + l.cost, 0);
    const recommendedPrice = totalCost / (1 - margin);
    const profit           = recommendedPrice - totalCost;
    const marginPct        = profit / recommendedPrice;
    const pricePerDrone    = tier > 0 ? recommendedPrice / tier : 0;

    return { lines, totalCost, recommendedPrice, profit, marginPct, pricePerDrone };
  }, [tier, costPerDrone, travelCost, travelZone, margin, permitFee, accommodation, tickets, transport, food, tripDays]);

  function handlePrint() {
    const win = window.open("", "_blank");
    if (!win) return;
    const today = new Date().toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" });
    const qid   = "Q-" + Date.now().toString(36).toUpperCase().slice(-6);
    const rows  = quote.lines.map(l =>
      `<tr><td>${l.label}</td><td style="color:#555;font-size:12px">${l.note ?? ""}</td><td style="text-align:right;font-weight:600">SAR ${Math.round(l.cost).toLocaleString()}</td></tr>`
    ).join("");
    win.document.write(`<html><head><title>Quote</title>
    <style>body{font-family:Arial,sans-serif;padding:40px;color:#111;font-size:14px}
    h1{font-size:20px;margin-bottom:4px}.meta{color:#555;font-size:13px;margin-bottom:28px}
    table{width:100%;border-collapse:collapse;margin-bottom:24px}
    th{background:#1e2535;color:#fff;padding:9px 12px;text-align:left;font-size:12px;text-transform:uppercase}
    td{padding:9px 12px;border-bottom:1px solid #e5e7eb}
    .total-row td{font-weight:700;border-top:2px solid #111;border-bottom:none;font-size:15px}
    .summary{display:flex;gap:24px;margin-top:20px;flex-wrap:wrap}
    .box{border:2px solid #1e2535;border-radius:8px;padding:16px 20px;min-width:140px}
    .box-label{font-size:11px;text-transform:uppercase;color:#555;letter-spacing:.5px;margin-bottom:6px}
    .box-value{font-size:22px;font-weight:700}
    .notes{margin-top:32px;font-size:13px;color:#555;border-top:1px solid #ddd;padding-top:16px}
    </style></head><body>
    <h1>Drone Show Quote ${showName ? "-- " + showName : ""}</h1>
    <div class="meta">
      ${clientName ? "<b>Client:</b> " + clientName + " &nbsp;&middot;&nbsp;" : ""}
      <b>Quote ID:</b> ${qid} &nbsp;&middot;&nbsp;
      <b>Date:</b> ${today} &nbsp;&middot;&nbsp;
      <b>Tier:</b> ${tier.toLocaleString()} drones &nbsp;&middot;&nbsp;
      <b>Duration:</b> ${durationMin} min
    </div>
    <table>
      <thead><tr><th>Item</th><th>Notes</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${rows}
        <tr class="total-row"><td colspan="2">Total Cost</td><td style="text-align:right">SAR ${Math.round(quote.totalCost).toLocaleString()}</td></tr>
      </tbody>
    </table>
    <div class="summary">
      <div class="box"><div class="box-label">Recommended Price</div><div class="box-value" style="color:#1B4FD8">SAR ${Math.round(quote.recommendedPrice).toLocaleString()}</div></div>
      <div class="box"><div class="box-label">Gross Profit</div><div class="box-value" style="color:#16a34a">SAR ${Math.round(quote.profit).toLocaleString()}</div></div>
      <div class="box"><div class="box-label">Margin</div><div class="box-value">${Math.round(quote.marginPct*100)}%</div></div>
      <div class="box"><div class="box-label">Price / Drone</div><div class="box-value">SAR ${Math.round(quote.pricePerDrone).toLocaleString()}</div></div>
    </div>
    ${quoteNotes ? `<div class="notes"><b>Notes:</b> ${quoteNotes}</div>` : ""}
    </body></html>`);
    win.document.close(); win.print();
  }

  const COLORS = [ACCENT, ORANGE, GOLD, GREEN, "#A78BFA", "#F472B6", "#34D399"];

  return (
    <div style={{ maxWidth: 920, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, color: TEXT, fontWeight: 700, fontSize: 22 }}>Quote Builder</h1>
          <p style={{ margin: "4px 0 0", color: MUTED, fontSize: 13 }}>
            Estimate show price based on drone tier, costs, and target margin
          </p>
        </div>
        <button onClick={handlePrint} style={{
          background: "rgba(74,158,255,0.12)", border: "1px solid rgba(74,158,255,0.3)",
          borderRadius: 8, color: ACCENT, padding: "8px 18px",
          fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>Print Quote</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 12, padding: "20px 24px" }}>
            <SectionTitle>Quote Info</SectionTitle>
            <Row label="Client Name">
              <input value={clientName} onChange={e => setClientName(e.target.value)}
                placeholder="e.g. Riyadh Municipality" style={inp} />
            </Row>
            <Row label="Show Name">
              <input value={showName} onChange={e => setShowName(e.target.value)}
                placeholder="e.g. National Day Show 2026" style={inp} />
            </Row>
            <Row label="Duration (minutes)">
              <input type="number" value={durationMin} onChange={e => setDurationMin(e.target.value)}
                style={{ ...inp, width: 120 }} min="1" max="120" />
            </Row>
            <Row label="Trip Days">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="number" value={tripDays} onChange={e => setTripDays(e.target.value)}
                  style={{ ...inp, width: 100 }} min="1" max="30" />
                <span style={{ color: MUTED, fontSize: 12 }}>days on-site (drives travel + daily costs)</span>
              </div>
            </Row>
          </div>

          <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 12, padding: "20px 24px" }}>
            <SectionTitle>Drone Tier</SectionTitle>
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              {TIERS.map(t => (
                <TierBtn key={t} value={t} active={tier === t} onClick={() => setTier(t as Tier)} />
              ))}
            </div>
            <Row label="Cost per Drone (SAR)">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="number" value={costPerDrone} onChange={e => setCostPerDrone(e.target.value)}
                  style={{ ...inp, width: 140 }} min="0" step="10" />
                <span style={{ color: MUTED, fontSize: 12 }}>
                  = {sar(tier * (parseFloat(costPerDrone) || 0))} total
                </span>
              </div>
            </Row>
          </div>

          <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 12, padding: "20px 24px" }}>
            <SectionTitle>Travel & Mobilization</SectionTitle>
            <Row label="Travel Zone">
              <div>
                <select value={travelZone}
                  onChange={e => { setTravelZone(e.target.value); setTravelOverride(""); }}
                  style={inp}>
                  {Object.entries(TRAVEL_ZONES).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
                <div style={{ color: MUTED, fontSize: 11, marginTop: 5 }}>
                  Base: SAR {TRAVEL_ZONES[travelZone].base.toLocaleString()}
                  {" + "}
                  SAR {TRAVEL_ZONES[travelZone].daily.toLocaleString()}/day
                  {" x "}{Math.max(1, parseInt(tripDays)||1)} days
                  {" = SAR "}{travelCost.toLocaleString()}
                </div>
              </div>
            </Row>
            <Row label="Travel Cost (SAR)">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="number"
                  value={travelOverride !== "" ? travelOverride : travelCost}
                  onChange={e => setTravelOverride(e.target.value)}
                  style={{ ...inp, width: 140 }} min="0" step="500" />
                {travelOverride !== "" ? (
                  <button onClick={() => setTravelOverride("")} style={{
                    background: "none", border: `1px solid ${BDR}`, borderRadius: 6,
                    color: MUTED, padding: "4px 10px", fontSize: 12, cursor: "pointer",
                  }}>Reset</button>
                ) : (
                  <span style={{ color: MUTED, fontSize: 12 }}>default</span>
                )}
              </div>
            </Row>
          </div>

          <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 12, padding: "20px 24px" }}>
            <SectionTitle>Daily Costs (SAR / day)</SectionTitle>
            <p style={{ color: MUTED, fontSize: 12, margin: "-8px 0 14px" }}>
              Each rate x {Math.max(1, parseInt(tripDays)||1)} trip days = total per item
            </p>
            {([
              { label: "Permits & Regulatory", value: permitFee,     setter: setPermitFee     },
              { label: "Accommodation",         value: accommodation, setter: setAccommodation },
              { label: "Tickets & Entry",       value: tickets,       setter: setTickets       },
              { label: "Ground Transportation", value: transport,     setter: setTransport     },
              { label: "Food & Per Diem",       value: food,          setter: setFood          },
            ] as { label: string; value: string; setter: (v: string) => void }[]).map(item => (
              <Row key={item.label} label={item.label}>
                <input type="number" value={item.value}
                  onChange={e => item.setter(e.target.value)}
                  style={{ ...inp, width: 140 }} min="0" step="500" />
              </Row>
            ))}
          </div>

          <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 12, padding: "20px 24px" }}>
            <SectionTitle>Notes</SectionTitle>
            <textarea value={quoteNotes} onChange={e => setQuoteNotes(e.target.value)}
              placeholder="Additional terms, assumptions, or scope notes..."
              style={{ ...inp, height: 80, resize: "vertical" as const }} />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 16 }}>

          <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 12, padding: "16px 20px" }}>
            <div style={{ color: MUTED, fontSize: 12, fontWeight: 600, textTransform: "uppercase",
                          letterSpacing: 0.5, marginBottom: 10 }}>Target Margin</div>
            <div style={{ display: "flex", gap: 8 }}>
              {MARGIN_OPTIONS.map(m => (
                <MarginBtn key={m.value} label={m.label} active={margin === m.value}
                  onClick={() => setMargin(m.value)} />
              ))}
            </div>
          </div>

          <div style={{ background: "linear-gradient(135deg,#0D2347,#1B4FD8)",
                        border: "1px solid rgba(74,158,255,0.3)", borderRadius: 12,
                        padding: "20px 22px", textAlign: "center" as const }}>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, textTransform: "uppercase",
                          letterSpacing: 0.8, marginBottom: 8 }}>Recommended Sell Price</div>
            <div style={{ color: "#fff", fontSize: 28, fontWeight: 800, marginBottom: 4 }}>
              {sar(quote.recommendedPrice)}
            </div>
            <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12 }}>
              at {Math.round(margin * 100)}% margin
            </div>
          </div>

          <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 12, padding: "16px 20px" }}>
            {[
              { label: "Total Cost",    value: sar(quote.totalCost),                    color: TEXT  },
              { label: "Gross Profit",  value: sar(quote.profit),                       color: GREEN },
              { label: "Margin",        value: Math.round(quote.marginPct * 100) + "%", color: ACCENT },
              { label: "Price / Drone", value: sar(quote.pricePerDrone),                color: GOLD  },
            ].map(k => (
              <div key={k.label} style={{ display: "flex", justifyContent: "space-between",
                                          alignItems: "center", padding: "8px 0",
                                          borderBottom: `1px solid ${BDR}` }}>
                <span style={{ color: MUTED, fontSize: 13 }}>{k.label}</span>
                <span style={{ color: k.color, fontWeight: 700, fontSize: 15 }}>{k.value}</span>
              </div>
            ))}
          </div>

          <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 12, padding: "16px 20px" }}>
            <div style={{ color: MUTED, fontSize: 12, fontWeight: 600, textTransform: "uppercase",
                          letterSpacing: 0.5, marginBottom: 12 }}>Cost Breakdown</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, color: TEXT }}>
              <tbody>
                {quote.lines.map(l => (
                  <tr key={l.label} style={{ borderBottom: `1px solid ${BDR}` }}>
                    <td style={{ ...tdS, padding: "7px 0", color: TEXT }}>{l.label}</td>
                    <td style={{ ...tdS, padding: "7px 0", textAlign: "right" as const,
                                  fontWeight: 600, color: ACCENT, whiteSpace: "nowrap" as const }}>
                      {sar(l.cost)}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td style={{ padding: "10px 0", fontWeight: 700, color: TEXT, fontSize: 14 }}>Total</td>
                  <td style={{ padding: "10px 0", textAlign: "right" as const,
                                fontWeight: 800, color: TEXT, fontSize: 14 }}>
                    {sar(quote.totalCost)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {quote.totalCost > 0 && (
            <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 12, padding: "16px 20px" }}>
              <div style={{ color: MUTED, fontSize: 12, fontWeight: 600, textTransform: "uppercase",
                            letterSpacing: 0.5, marginBottom: 10 }}>Cost Split</div>
              <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", height: 10, marginBottom: 10 }}>
                {quote.lines.map((l, i) => (
                  <div key={l.label} style={{
                    width: ((l.cost / quote.totalCost) * 100) + "%",
                    background: COLORS[i % COLORS.length],
                  }} />
                ))}
              </div>
              {quote.lines.map((l, i) => (
                <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, flexShrink: 0,
                                background: COLORS[i % COLORS.length] }} />
                  <span style={{ color: MUTED, fontSize: 11, flex: 1 }}>{l.label}</span>
                  <span style={{ color: TEXT, fontSize: 11, fontWeight: 600 }}>
                    {Math.round((l.cost / quote.totalCost) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

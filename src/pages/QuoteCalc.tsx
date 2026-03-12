// src/pages/QuoteCalc.tsx — Module: Quote Builder
import { useState, useMemo } from "react";

const CARD   = "#111E35";
const BDR    = "rgba(255,255,255,0.08)";
const ACCENT = "#4A9EFF";
const TEXT   = "#F0F4FF";
const MUTED  = "#8FA3C0";
const GREEN  = "#43A047";
const ORANGE = "#FB8C00";
const GOLD   = "#F9A825";
const PURPLE = "#A78BFA";
const PINK   = "#F472B6";
const TEAL   = "#34D399";

const TIERS = [300, 500, 1000] as const;
type Tier = typeof TIERS[number];

const TRAVEL_ZONES: Record<string, { label: string; base: number }> = {
  LOCAL:         { label: "Local — same city",        base: 0      },
  REGIONAL:      { label: "Regional — up to 300 km",  base: 8000   },
  NATIONAL:      { label: "National — 300 km+",       base: 20000  },
  INTERNATIONAL: { label: "International",            base: 60000  },
};

const MARGIN_OPTIONS = [
  { label: "25%",   value: 0.25  },
  { label: "27.5%", value: 0.275 },
  { label: "30%",   value: 0.30  },
];

const COLORS = [ACCENT, ORANGE, GOLD, GREEN, PURPLE, PINK, TEAL];

const inp: React.CSSProperties = {
  background: "#1A2A44", border: `1px solid ${BDR}`, borderRadius: 8,
  color: TEXT, padding: "9px 14px", fontSize: 14, outline: "none",
  width: "100%", boxSizing: "border-box",
};

function sar(n: number) {
  return "SAR " + Math.round(n).toLocaleString("en-US");
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ margin: "0 0 16px", color: TEXT, fontSize: 15, fontWeight: 600,
                 borderBottom: `1px solid ${BDR}`, paddingBottom: 10 }}>{children}</h3>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <label style={{ color: MUTED, fontSize: 13 }}>{label}</label>
        {hint && <span style={{ color: MUTED, fontSize: 11, fontStyle: "italic" }}>{hint}</span>}
      </div>
      {children}
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

function CalcHint({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ color: ACCENT, fontSize: 11, marginTop: 5, fontWeight: 500 }}>{children}</div>
  );
}

interface LineItem { label: string; cost: number; formula: string }

export default function QuoteCalc() {
  // ── Quote Info ──────────────────────────────────────────────────────────
  const [clientName,  setClientName]  = useState("");
  const [showName,    setShowName]    = useState("");
  const [durationMin, setDurationMin] = useState("15");
  const [teamSize,    setTeamSize]    = useState("5");
  const [tripDays,    setTripDays]    = useState("3");
  const [nightsAway,  setNightsAway]  = useState("2");

  // ── Drone Tier ──────────────────────────────────────────────────────────
  const [tier,         setTier]         = useState<Tier>(1000);
  const [costPerDrone, setCostPerDrone] = useState("450");

  // ── Travel ──────────────────────────────────────────────────────────────
  const [travelZone,     setTravelZone]     = useState("LOCAL");
  const [travelOverride, setTravelOverride] = useState("");

  // ── Cost Items ──────────────────────────────────────────────────────────
  const [permitFee,     setPermitFee]     = useState("5000");
  const [accomPerPN,    setAccomPerPN]    = useState("300");
  const [ticketPerP,    setTicketPerP]    = useState("200");
  const [foodPerPD,     setFoodPerPD]     = useState("150");

  // ── Margin ──────────────────────────────────────────────────────────────
  const [margin, setMargin] = useState(0.25);

  // ── Notes ───────────────────────────────────────────────────────────────
  const [quoteNotes, setQuoteNotes] = useState("");

  // ── Derived values ──────────────────────────────────────────────────────
  const pTeam   = Math.max(1, parseInt(teamSize)    || 1);
  const pDays   = Math.max(1, parseInt(tripDays)    || 1);
  const pNights = Math.max(0, parseInt(nightsAway)  || 0);

  const travelCost = useMemo(() => {
    if (travelOverride.trim() !== "") {
      const n = parseFloat(travelOverride);
      return Number.isFinite(n) ? n : TRAVEL_ZONES[travelZone].base;
    }
    return TRAVEL_ZONES[travelZone].base;
  }, [travelZone, travelOverride]);

  const quote = useMemo(() => {
    const cpd   = parseFloat(costPerDrone) || 0;
    const perm  = parseFloat(permitFee)    || 0;
    const aPPN  = parseFloat(accomPerPN)   || 0;
    const tPP   = parseFloat(ticketPerP)   || 0;
    const fPPD  = parseFloat(foodPerPD)    || 0;

    const accomTotal  = aPPN  * pTeam * pNights;
    const ticketTotal = tPP   * pTeam;
    const foodTotal   = fPPD  * pTeam * pDays;

    const lines: LineItem[] = [
      {
        label:   "Drone Fleet Operation",
        cost:    tier * cpd,
        formula: `${tier.toLocaleString()} drones × SAR ${cpd.toLocaleString()} / unit`,
      },
      {
        label:   "Equipment Transport",
        cost:    travelCost,
        formula: `${TRAVEL_ZONES[travelZone].label} — flat`,
      },
      {
        label:   "Permits & Regulatory",
        cost:    perm,
        formula: `One-time flat`,
      },
      {
        label:   "Accommodation",
        cost:    accomTotal,
        formula: `SAR ${aPPN}/person/night × ${pTeam} ppl × ${pNights} nights`,
      },
      {
        label:   "Tickets & Entry",
        cost:    ticketTotal,
        formula: `SAR ${tPP}/person × ${pTeam} ppl (one-time)`,
      },
      {
        label:   "Food & Per Diem",
        cost:    foodTotal,
        formula: `SAR ${fPPD}/person/day × ${pTeam} ppl × ${pDays} days`,
      },
    ].filter(l => l.cost > 0);

    const totalCost        = lines.reduce((s, l) => s + l.cost, 0);
    const recommendedPrice = totalCost / (1 - margin);
    const profit           = recommendedPrice - totalCost;
    const marginPct        = profit / recommendedPrice;
    const pricePerDrone    = tier > 0 ? recommendedPrice / tier : 0;

    return { lines, totalCost, recommendedPrice, profit, marginPct, pricePerDrone };
  }, [tier, costPerDrone, travelCost, travelZone, margin,
      permitFee, accomPerPN, ticketPerP, foodPerPD,
      pTeam, pDays, pNights]);

  function handlePrint() {
    const win = window.open("", "_blank");
    if (!win) return;
    const today = new Date().toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" });
    const qid   = "Q-" + Date.now().toString(36).toUpperCase().slice(-6);
    const rows  = quote.lines.map(l =>
      `<tr>
        <td>${l.label}</td>
        <td style="color:#555;font-size:12px">${l.formula}</td>
        <td style="text-align:right;font-weight:600">SAR ${Math.round(l.cost).toLocaleString()}</td>
      </tr>`
    ).join("");
    win.document.write(`<html><head><title>Quote — ${showName || "Drone Show"}</title>
    <style>
      body{font-family:Arial,sans-serif;padding:40px;color:#111;font-size:14px}
      h1{font-size:20px;margin-bottom:4px}
      .meta{color:#555;font-size:12px;margin-bottom:28px;line-height:1.8}
      table{width:100%;border-collapse:collapse;margin-bottom:24px}
      th{background:#1e2535;color:#fff;padding:9px 12px;text-align:left;font-size:12px;text-transform:uppercase}
      td{padding:9px 12px;border-bottom:1px solid #e5e7eb}
      .total-row td{font-weight:700;border-top:2px solid #111;border-bottom:none;font-size:15px}
      .summary{display:flex;gap:20px;margin-top:20px;flex-wrap:wrap}
      .box{border:2px solid #1e2535;border-radius:8px;padding:14px 18px;min-width:130px}
      .box-label{font-size:11px;text-transform:uppercase;color:#555;letter-spacing:.5px;margin-bottom:6px}
      .box-value{font-size:20px;font-weight:700}
      .notes{margin-top:32px;font-size:13px;color:#555;border-top:1px solid #ddd;padding-top:16px}
    </style></head><body>
    <h1>Drone Show Quote${showName ? " — " + showName : ""}</h1>
    <div class="meta">
      ${clientName ? "<b>Client:</b> " + clientName + "<br>" : ""}
      <b>Quote ID:</b> ${qid} &nbsp;·&nbsp; <b>Date:</b> ${today}<br>
      <b>Tier:</b> ${tier.toLocaleString()} drones &nbsp;·&nbsp;
      <b>Duration:</b> ${durationMin} min &nbsp;·&nbsp;
      <b>Team:</b> ${pTeam} people &nbsp;·&nbsp;
      <b>Trip:</b> ${pDays} days / ${pNights} nights
    </div>
    <table>
      <thead><tr><th>Item</th><th>Formula</th><th style="text-align:right">Amount (SAR)</th></tr></thead>
      <tbody>
        ${rows}
        <tr class="total-row">
          <td colspan="2">Total Cost</td>
          <td style="text-align:right">SAR ${Math.round(quote.totalCost).toLocaleString()}</td>
        </tr>
      </tbody>
    </table>
    <div class="summary">
      <div class="box"><div class="box-label">Recommended Price</div>
        <div class="box-value" style="color:#1B4FD8">SAR ${Math.round(quote.recommendedPrice).toLocaleString()}</div></div>
      <div class="box"><div class="box-label">Gross Profit</div>
        <div class="box-value" style="color:#16a34a">SAR ${Math.round(quote.profit).toLocaleString()}</div></div>
      <div class="box"><div class="box-label">Margin</div>
        <div class="box-value">${(quote.marginPct * 100).toFixed(1)}%</div></div>
      <div class="box"><div class="box-label">Price / Drone</div>
        <div class="box-value">SAR ${Math.round(quote.pricePerDrone).toLocaleString()}</div></div>
    </div>
    ${quoteNotes ? `<div class="notes"><b>Notes:</b> ${quoteNotes}</div>` : ""}
    </body></html>`);
    win.document.close(); win.print();
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, color: TEXT, fontWeight: 700, fontSize: 22 }}>Quote Builder</h1>
          <p style={{ margin: "4px 0 0", color: MUTED, fontSize: 13 }}>
            Estimate show price · all costs calculated transparently
          </p>
        </div>
        <button onClick={handlePrint} style={{
          background: "rgba(74,158,255,0.12)", border: "1px solid rgba(74,158,255,0.3)",
          borderRadius: 8, color: ACCENT, padding: "8px 18px",
          fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>Print Quote</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, alignItems: "start" }}>

        {/* ── LEFT ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Show & Team Info */}
          <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 12, padding: "20px 24px" }}>
            <SectionTitle>Show & Team Info</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Row label="Client Name">
                <input value={clientName} onChange={e => setClientName(e.target.value)}
                  placeholder="e.g. Riyadh Municipality" style={inp} />
              </Row>
              <Row label="Show Name">
                <input value={showName} onChange={e => setShowName(e.target.value)}
                  placeholder="e.g. National Day 2026" style={inp} />
              </Row>
              <Row label="Show Duration" hint="minutes">
                <input type="number" value={durationMin} onChange={e => setDurationMin(e.target.value)}
                  style={{ ...inp }} min="1" max="120" />
              </Row>
              <Row label="Team Size" hint="headcount traveling">
                <input type="number" value={teamSize} onChange={e => setTeamSize(e.target.value)}
                  style={{ ...inp }} min="1" />
              </Row>
              <Row label="Trip Days" hint="days on site (drives food)">
                <input type="number" value={tripDays} onChange={e => setTripDays(e.target.value)}
                  style={{ ...inp }} min="1" max="30" />
              </Row>
              <Row label="Nights Away" hint="nights (drives accommodation)">
                <input type="number" value={nightsAway} onChange={e => setNightsAway(e.target.value)}
                  style={{ ...inp }} min="0" max="30" />
              </Row>
            </div>
          </div>

          {/* Drone Tier */}
          <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 12, padding: "20px 24px" }}>
            <SectionTitle>Drone Tier</SectionTitle>
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              {TIERS.map(t => (
                <TierBtn key={t} value={t} active={tier === t} onClick={() => setTier(t as Tier)} />
              ))}
            </div>
            <Row label="Cost per Drone (SAR)" hint="per unit / per flight cycle">
              <input type="number" value={costPerDrone} onChange={e => setCostPerDrone(e.target.value)}
                style={{ ...inp }} min="0" step="10" />
              <CalcHint>
                {tier.toLocaleString()} drones × SAR {(parseFloat(costPerDrone)||0).toLocaleString()} = {sar(tier * (parseFloat(costPerDrone)||0))}
              </CalcHint>
            </Row>
          </div>

          {/* Travel & Equipment Transport */}
          <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 12, padding: "20px 24px" }}>
            <SectionTitle>Equipment Transport</SectionTitle>
            <p style={{ color: MUTED, fontSize: 12, margin: "-8px 0 14px" }}>
              Cost to move drones + gear to location. One-time flat per zone.
            </p>
            <Row label="Travel Zone">
              <select value={travelZone}
                onChange={e => { setTravelZone(e.target.value); setTravelOverride(""); }}
                style={inp}>
                {Object.entries(TRAVEL_ZONES).map(([k, v]) => (
                  <option key={k} value={k}>{v.label} — SAR {v.base.toLocaleString()}</option>
                ))}
              </select>
            </Row>
            <Row label="Transport Cost (SAR)" hint="override zone default if needed">
              <input type="number"
                value={travelOverride !== "" ? travelOverride : TRAVEL_ZONES[travelZone].base}
                onChange={e => setTravelOverride(e.target.value)}
                style={{ ...inp }} min="0" step="500" />
              {travelOverride !== "" && (
                <button onClick={() => setTravelOverride("")} style={{
                  background: "none", border: `1px solid ${BDR}`, borderRadius: 6,
                  color: MUTED, padding: "4px 10px", fontSize: 11, cursor: "pointer", marginTop: 6,
                }}>Reset to zone default</button>
              )}
            </Row>
          </div>

          {/* Cost Items */}
          <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 12, padding: "20px 24px" }}>
            <SectionTitle>Team Cost Items</SectionTitle>

            {/* Permits */}
            <Row label="Permits & Regulatory" hint="one-time flat">
              <input type="number" value={permitFee} onChange={e => setPermitFee(e.target.value)}
                style={{ ...inp }} min="0" step="500" />
              <CalcHint>One-time = {sar(parseFloat(permitFee)||0)}</CalcHint>
            </Row>

            {/* Accommodation */}
            <Row label="Accommodation" hint="SAR / person / night">
              <input type="number" value={accomPerPN} onChange={e => setAccomPerPN(e.target.value)}
                style={{ ...inp }} min="0" step="50" />
              <CalcHint>
                SAR {(parseFloat(accomPerPN)||0).toLocaleString()} × {pTeam} ppl × {pNights} nights = {sar((parseFloat(accomPerPN)||0) * pTeam * pNights)}
              </CalcHint>
            </Row>

            {/* Tickets */}
            <Row label="Tickets & Entry" hint="SAR / person — one-time">
              <input type="number" value={ticketPerP} onChange={e => setTicketPerP(e.target.value)}
                style={{ ...inp }} min="0" step="50" />
              <CalcHint>
                SAR {(parseFloat(ticketPerP)||0).toLocaleString()} × {pTeam} ppl = {sar((parseFloat(ticketPerP)||0) * pTeam)}
              </CalcHint>
            </Row>

            {/* Food */}
            <Row label="Food & Per Diem" hint="SAR / person / day">
              <input type="number" value={foodPerPD} onChange={e => setFoodPerPD(e.target.value)}
                style={{ ...inp }} min="0" step="25" />
              <CalcHint>
                SAR {(parseFloat(foodPerPD)||0).toLocaleString()} × {pTeam} ppl × {pDays} days = {sar((parseFloat(foodPerPD)||0) * pTeam * pDays)}
              </CalcHint>
            </Row>
          </div>

          {/* Notes */}
          <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 12, padding: "20px 24px" }}>
            <SectionTitle>Notes</SectionTitle>
            <textarea value={quoteNotes} onChange={e => setQuoteNotes(e.target.value)}
              placeholder="Additional terms, assumptions, or scope notes..."
              style={{ ...inp, height: 80, resize: "vertical" as const }} />
          </div>
        </div>

        {/* ── RIGHT (sticky) ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 16 }}>

          {/* Margin */}
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

          {/* Recommended Price hero */}
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

          {/* Summary KPIs */}
          <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 12, padding: "16px 20px" }}>
            {[
              { label: "Total Cost",    value: sar(quote.totalCost),                         color: TEXT   },
              { label: "Gross Profit",  value: sar(quote.profit),                            color: GREEN  },
              { label: "Margin",        value: (quote.marginPct * 100).toFixed(2) + "%",     color: ACCENT },
              { label: "Price / Drone", value: sar(quote.pricePerDrone),                     color: GOLD   },
            ].map(k => (
              <div key={k.label} style={{ display: "flex", justifyContent: "space-between",
                                          alignItems: "center", padding: "8px 0",
                                          borderBottom: `1px solid ${BDR}` }}>
                <span style={{ color: MUTED, fontSize: 13 }}>{k.label}</span>
                <span style={{ color: k.color, fontWeight: 700, fontSize: 15 }}>{k.value}</span>
              </div>
            ))}
          </div>

          {/* Cost Breakdown */}
          <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 12, padding: "16px 20px" }}>
            <div style={{ color: MUTED, fontSize: 12, fontWeight: 600, textTransform: "uppercase",
                          letterSpacing: 0.5, marginBottom: 12 }}>Cost Breakdown</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, color: TEXT }}>
              <tbody>
                {quote.lines.map(l => (
                  <tr key={l.label} style={{ borderBottom: `1px solid ${BDR}` }}>
                    <td style={{ padding: "7px 0 3px", color: TEXT, fontWeight: 600 }}>{l.label}</td>
                    <td style={{ padding: "7px 0 3px", textAlign: "right" as const,
                                  color: ACCENT, fontWeight: 700, whiteSpace: "nowrap" as const }}>
                      {sar(l.cost)}
                    </td>
                  </tr>
                ))}
                {quote.lines.map(l => (
                  <tr key={l.label + "_hint"}>
                    <td colSpan={2} style={{ padding: "0 0 8px", color: MUTED, fontSize: 10 }}>
                      {l.formula}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td style={{ padding: "10px 0 0", fontWeight: 700, color: TEXT, fontSize: 14 }}>Total</td>
                  <td style={{ padding: "10px 0 0", textAlign: "right" as const,
                                fontWeight: 800, color: TEXT, fontSize: 14 }}>
                    {sar(quote.totalCost)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Cost Split bar */}
          {quote.totalCost > 0 && (
            <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 12, padding: "16px 20px" }}>
              <div style={{ color: MUTED, fontSize: 12, fontWeight: 600, textTransform: "uppercase",
                            letterSpacing: 0.5, marginBottom: 10 }}>Cost Split</div>
              <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", height: 10, marginBottom: 10 }}>
                {quote.lines.map((l, i) => (
                  <div key={l.label} style={{
                    width: ((l.cost / quote.totalCost) * 100).toFixed(2) + "%",
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
                    {((l.cost / quote.totalCost) * 100).toFixed(2)}%
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

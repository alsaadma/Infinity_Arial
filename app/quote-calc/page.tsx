"use client";

import React, { useMemo, useState } from "react";
import type { FleetBaseline, ShowQuoteInput, QuoteResult } from "../../../core/quoteEngine";
import { computeQuote } from "../../../core/quoteEngine";

function formatSAR(n: number) {
  if (!Number.isFinite(n)) return "-";
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function Badge({ tone, children }: { tone: "green" | "amber" | "red" | "slate"; children: React.ReactNode }) {
  const cls =
    tone === "green" ? "bg-green-100 text-green-800 border-green-200" :
    tone === "amber" ? "bg-amber-100 text-amber-800 border-amber-200" :
    tone === "red" ? "bg-red-100 text-red-800 border-red-200" :
    "bg-slate-100 text-slate-800 border-slate-200";
  return <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${cls}`}>{children}</span>;
}

export default function QuoteCalcPage() {
  const [fleet] = useState<FleetBaseline>({
    fleet_size: 1000,
    capex_sar: 3991657,
    useful_life_years: 3,
    expected_shows_per_year: 45,
    residual_value_pct: 0.15,
    holds: { maintenance: 30, reserved: 0, damaged: 10 },
    spare_ratio_target_pct: 0.05,
    charging: { capacity_drones_per_day: 600, default_prep_days: 2 },
    ground: { rtk_available: 2, ap_available: 3, ap_per_drones: 800, rtk_min: 1 },
    compliance: { permits_min_lead_days: 21 },
    risk_buffers_pct: { LOW: 0.05, MED: 0.10, HIGH: 0.15 },
  });

  const [input, setInput] = useState<ShowQuoteInput>({
    quote_id: "Q-TEST-001",
    version: 1,
    event: { client_name: "Client", event_name: "Event", city_type: "URBAN", show_date: "2026-03-15" },
    requirements: { required_drones: 1000, duration_min: 18, prep_days: 2, permits_days_remaining: 12, risk_level: "HIGH" },
    cost_inputs_sar: { variable_base: 60000, transport: 25000, crew: 35000, site_ops: 10000, other: 0 },
    manual_override: { enabled: false, notes: "" },
    proposed_price_ex_vat_sar: 350000,
  });

  const result: QuoteResult | null = useMemo(() => {
    try { return computeQuote(fleet, input); } catch { return null; }
  }, [fleet, input]);

  const readinessTone =
    result?.readiness === "READY" ? "green" :
    result?.readiness === "READY_WITH_GAPS" ? "amber" :
    result?.readiness === "NOT_READY" ? "red" : "slate";

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Quote Calculator</h1>
          <p className="text-sm text-slate-600 mt-1">Operational MSQ + Gap Finder (beta)</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge tone={readinessTone}>{result?.readiness ?? "NO_RESULT"}</Badge>
          <div className="text-right">
            <div className="text-xs text-slate-500">Minimum Safe Quote (MSQ)</div>
            <div className="text-2xl font-bold">{result ? `SAR ${formatSAR(result.msq_sar)}` : "-"}</div>
          </div>
        </div>
      </div>

      {/* Inputs (tight) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-xl border bg-white p-4">
        <div>
          <label className="text-xs text-slate-600">Required drones</label>
          <input className="mt-1 w-full rounded-lg border px-3 py-2"
            type="number" value={input.requirements.required_drones}
            onChange={(e) => setInput({ ...input, requirements: { ...input.requirements, required_drones: Number(e.target.value) } })}
          />
        </div>

        <div>
          <label className="text-xs text-slate-600">Permits days remaining</label>
          <input className="mt-1 w-full rounded-lg border px-3 py-2"
            type="number" value={input.requirements.permits_days_remaining}
            onChange={(e) => setInput({ ...input, requirements: { ...input.requirements, permits_days_remaining: Number(e.target.value) } })}
          />
        </div>

        <div>
          <label className="text-xs text-slate-600">Risk level</label>
          <select className="mt-1 w-full rounded-lg border px-3 py-2"
            value={input.requirements.risk_level}
            onChange={(e) => setInput({ ...input, requirements: { ...input.requirements, risk_level: e.target.value as unknown } })}
          >
            <option value="LOW">LOW</option>
            <option value="MED">MED</option>
            <option value="HIGH">HIGH</option>
          </select>
        </div>
      </div>

      {/* Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-white p-4">
          <div className="font-semibold">Top Weaknesses</div>
          <div className="text-xs text-slate-500 mt-1">Blockers first, then severity</div>
          <div className="mt-3 space-y-2">
            {(result?.top_weaknesses ?? []).length === 0 && <div className="text-sm text-slate-600">No gaps detected.</div>}
            {(result?.top_weaknesses ?? []).map((g) => (
              <div key={g.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">{g.category}</div>
                  <Badge tone={g.blocker ? "red" : "amber"}>{g.blocker ? "BLOCKER" : "RISK"}</Badge>
                </div>
                <div className="text-sm text-slate-700 mt-1">Value: {g.value} • Severity: {g.severity}</div>
                <div className="text-xs text-slate-500 mt-2">{g.default_fix}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="font-semibold">Cost Breakdown</div>
          <div className="mt-3 text-sm">
            <div className="flex justify-between"><span>Variable OPEX</span><span>SAR {result ? formatSAR(result.breakdown.variable_opex) : "-"}</span></div>
            <div className="flex justify-between"><span>Asset burn / show</span><span>SAR {result ? formatSAR(result.breakdown.asset_burn_per_show) : "-"}</span></div>
            <div className="flex justify-between"><span>Risk buffer</span><span>SAR {result ? formatSAR(result.breakdown.risk_buffer_value) : "-"}</span></div>
            <div className="border-t my-2"></div>
            <div className="flex justify-between font-semibold"><span>MSQ</span><span>SAR {result ? formatSAR(result.msq_sar) : "-"}</span></div>
          </div>
        </div>
      </div>

      {/* Full gaps */}
      <div className="rounded-xl border bg-white p-4">
        <div className="font-semibold">All Gaps</div>
        <div className="text-xs text-slate-500 mt-1">Ranked list (blockers first)</div>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-xs text-slate-500">
              <tr>
                <th className="py-2 pr-3">Category</th>
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Value</th>
                <th className="py-2 pr-3">Severity</th>
                <th className="py-2 pr-3">Fix</th>
              </tr>
            </thead>
            <tbody>
              {(result?.gaps_ranked ?? []).map((g) => (
                <tr key={g.id} className="border-t">
                  <td className="py-2 pr-3 font-medium">{g.category}</td>
                  <td className="py-2 pr-3">{g.blocker ? "BLOCKER" : "RISK"}</td>
                  <td className="py-2 pr-3">{g.value}</td>
                  <td className="py-2 pr-3">{g.severity}</td>
                  <td className="py-2 pr-3 text-slate-600">{g.default_fix}</td>
                </tr>
              ))}
              {(result?.gaps_ranked ?? []).length === 0 && (
                <tr className="border-t"><td className="py-3 text-slate-600" colSpan={5}>No gaps.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Flags */}
      <div className="rounded-xl border bg-white p-4">
        <div className="font-semibold">Flags</div>
        <div className="mt-2 text-sm text-slate-700">
          <div>Final below MSQ: <span className="font-semibold">{result?.flags.final_below_msq ? "YES" : "NO"}</span></div>
          <div>Manual override without notes: <span className="font-semibold">{result?.flags.manual_override_without_notes ? "YES" : "NO"}</span></div>
        </div>
      </div>
    </div>
  );
}


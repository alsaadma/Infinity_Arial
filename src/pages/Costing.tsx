import { useMemo, useState } from "react";
import {
  Box, Card, CardContent, MenuItem, Select, Typography,
} from "@mui/material";
import Breadcrumb from "../components/Breadcrumb";

// ── Stub data ──────────────────────────────────────────────────────────────
const SHOWS = [
  { id: "ALL",    name: "Total Fleet Overview" },
  { id: "SH-001", name: "National Day Riyadh 2024" },
  { id: "SH-002", name: "City Festival Dammam" },
  { id: "SH-003", name: "Formula E Diriyah" },
];

const COSTS: Record<string, { labour: number; transport: number; depreciation: number; permit: number; misc: number }> = {
  ALL:    { labour: 180000, transport: 42000, depreciation: 95000, permit: 12000, misc: 8500 },
  "SH-001": { labour: 45000, transport: 9500, depreciation: 22000, permit: 3200, misc: 1800 },
  "SH-002": { labour: 28000, transport: 6200, depreciation: 14000, permit: 2100, misc: 1100 },
  "SH-003": { labour: 62000, transport: 14000, depreciation: 31000, permit: 4800, misc: 2400 },
};

type CostKey = keyof typeof COSTS["ALL"];
const COST_LABELS: Record<CostKey, string> = {
  labour:       "Labour",
  transport:    "Transport",
  depreciation: "Depreciation",
  permit:       "Permits & Fees",
  misc:         "Miscellaneous",
};
const COST_COLORS: Record<CostKey, string> = {
  labour:       "#4A9EFF",
  transport:    "#22c55e",
  depreciation: "#f59e0b",
  permit:       "#a78bfa",
  misc:         "#f87171",
};

function fmt(n: number) {
  return "SAR " + n.toLocaleString("en-SA");
}

export default function Costing() {
  const [showId, setShowId] = useState("ALL");

  // Reactive: recomputes every time showId changes
  const costs = useMemo(() => COSTS[showId] ?? COSTS["ALL"], [showId]);
  const total  = useMemo(() => Object.values(costs).reduce((a, b) => a + b, 0), [costs]);
  const selectedShow = SHOWS.find(s => s.id === showId) ?? SHOWS[0];

  return (
    <Box sx={{ maxWidth: 1000 }}>
      <Breadcrumb />
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={800} mb={0.5}>Costing</Typography>
          <Typography variant="body2" sx={{ opacity: 0.6 }}>
            Show-level cost breakdown and fleet-wide financial summary.
          </Typography>
        </Box>
        <Select
          size="small"
          value={showId}
          onChange={e => setShowId(e.target.value)}
          sx={{ minWidth: 240 }}
        >
          {SHOWS.map(s => (
            <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
          ))}
        </Select>
      </Box>

      <Typography variant="overline" sx={{ opacity: 0.5, letterSpacing: 1.5 }}>
        {selectedShow.name}
      </Typography>

      {/* ── KPI cards (reactive) ───────────────────────────────────────── */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 2, mt: 1 }}>
        {(Object.keys(costs) as CostKey[]).map(k => (
          <Card
            key={k}
            variant="outlined"
            sx={{
              borderColor: COST_COLORS[k] + "44",
              background: COST_COLORS[k] + "0a",
              transition: "all 0.2s",
            }}
          >
            <CardContent sx={{ pb: "12px !important" }}>
              <Typography variant="caption" sx={{ opacity: 0.6, textTransform: "uppercase", letterSpacing: 1, fontSize: 10 }}>
                {COST_LABELS[k]}
              </Typography>
              <Typography variant="h6" fontWeight={800} sx={{ color: COST_COLORS[k], mt: 0.5, fontSize: 18 }}>
                {fmt(costs[k])}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.45 }}>
                {Math.round((costs[k] / total) * 100)}% of total
              </Typography>
            </CardContent>
          </Card>
        ))}

        {/* Total card */}
        <Card
          variant="outlined"
          sx={{
            borderColor: "rgba(74,158,255,0.35)",
            background: "rgba(74,158,255,0.07)",
          }}
        >
          <CardContent sx={{ pb: "12px !important" }}>
            <Typography variant="caption" sx={{ opacity: 0.6, textTransform: "uppercase", letterSpacing: 1, fontSize: 10 }}>
              Total Cost
            </Typography>
            <Typography variant="h6" fontWeight={800} sx={{ color: "#4A9EFF", mt: 0.5, fontSize: 18 }}>
              {fmt(total)}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.45 }}>All categories</Typography>
          </CardContent>
        </Card>
      </Box>

      <Typography variant="caption" sx={{ display: "block", mt: 3, opacity: 0.4 }}>
        Stub data only. Will be hydrated from /api/costing (Module 6 endpoint).
        Selecting a show immediately updates all metric cards (reactive).
      </Typography>
    </Box>
  );
}

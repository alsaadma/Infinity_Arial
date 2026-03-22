import { useMemo, useState } from "react";
import {
  Box, Chip, Divider, InputAdornment, MenuItem, Paper,
  Select, Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import Breadcrumb from "../components/Breadcrumb";

// ── Stub data (replace with API call when backend ready) ───────────────────
const DRONE_STUBS = [
  { id: "DR-001", model: "DAMODA L3", status: "ACTIVE",      flights: 42,  battery_pct: 87 },
  { id: "DR-002", model: "DAMODA L3", status: "ACTIVE",      flights: 38,  battery_pct: 92 },
  { id: "DR-003", model: "DAMODA L3", status: "MAINTENANCE",  flights: 110, battery_pct: 55 },
  { id: "DR-004", model: "DAMODA L3", status: "ACTIVE",      flights: 27,  battery_pct: 78 },
  { id: "DR-005", model: "DAMODA L3", status: "RETIRED",     flights: 200, battery_pct: 12 },
  { id: "DR-006", model: "DAMODA L3", status: "ACTIVE",      flights: 15,  battery_pct: 95 },
];

const BATTERY_STUBS = [
  { id: "BAT-001", drone_id: "DR-001", cycles: 42,  cycle_max: 300, status: "ACTIVE" },
  { id: "BAT-002", drone_id: "DR-002", cycles: 38,  cycle_max: 300, status: "ACTIVE" },
  { id: "BAT-003", drone_id: "DR-003", cycles: 110, cycle_max: 300, status: "MAINTENANCE" },
  { id: "BAT-004", drone_id: "DR-004", cycles: 27,  cycle_max: 300, status: "ACTIVE" },
  { id: "BAT-005", drone_id: "DR-005", cycles: 200, cycle_max: 300, status: "RETIRED" },
];

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:      "#22c55e",
  MAINTENANCE: "#f59e0b",
  RETIRED:     "#ef4444",
};
const STATUS_BG: Record<string, string> = {
  ACTIVE:      "rgba(34,197,94,0.12)",
  MAINTENANCE: "rgba(245,158,11,0.12)",
  RETIRED:     "rgba(239,68,68,0.12)",
};

function StatusChip({ status }: { status: string }) {
  return (
    <Chip
      label={status}
      size="small"
      sx={{
        color: STATUS_COLORS[status] ?? "#aaa",
        background: STATUS_BG[status] ?? "rgba(255,255,255,0.06)",
        fontWeight: 700,
        fontSize: 11,
        letterSpacing: 0.5,
      }}
    />
  );
}

export default function Fleet() {
  const [droneQ,  setDroneQ]  = useState("");
  const [statusF, setStatusF] = useState<string>("ALL");

  const filteredDrones = useMemo(() =>
    DRONE_STUBS.filter(d => {
      const matchQ = droneQ.trim() === "" ||
        d.id.toLowerCase().includes(droneQ.toLowerCase()) ||
        d.model.toLowerCase().includes(droneQ.toLowerCase());
      const matchS = statusF === "ALL" || d.status === statusF;
      return matchQ && matchS;
    }),
    [droneQ, statusF]
  );

  const filteredBatteries = useMemo(() =>
    BATTERY_STUBS.filter(b => {
      const matchQ = droneQ.trim() === "" ||
        b.id.toLowerCase().includes(droneQ.toLowerCase()) ||
        b.drone_id.toLowerCase().includes(droneQ.toLowerCase());
      const matchS = statusF === "ALL" || b.status === statusF;
      return matchQ && matchS;
    }),
    [droneQ, statusF]
  );

  return (
    <Box sx={{ maxWidth: 1100 }}>
      <Breadcrumb />
      <Typography variant="h5" fontWeight={800} mb={0.5}>Fleet Registry</Typography>
      <Typography variant="body2" sx={{ opacity: 0.6, mb: 3 }}>
        Asset inventory for drones and batteries. Data sourced from Module 2 Asset Registry.
      </Typography>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <TextField
          size="small"
          placeholder="Search Drone ID or Battery ID…"
          value={droneQ}
          onChange={e => setDroneQ(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18, opacity: 0.5 }} />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 280 }}
        />
        <Select
          size="small"
          value={statusF}
          onChange={e => setStatusF(e.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="ALL">All Statuses</MenuItem>
          <MenuItem value="ACTIVE">Active</MenuItem>
          <MenuItem value="MAINTENANCE">Maintenance</MenuItem>
          <MenuItem value="RETIRED">Retired</MenuItem>
        </Select>
      </Box>

      {/* ── Drones table ─────────────────────────────────────────────────── */}
      <Typography variant="overline" sx={{ opacity: 0.5, letterSpacing: 1.5 }}>
        Drones ({filteredDrones.length})
      </Typography>
      <Paper variant="outlined" sx={{ mt: 1, mb: 4, borderColor: "rgba(74,158,255,0.15)" }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ "& th": { fontWeight: 700, opacity: 0.75, fontSize: 12 } }}>
              <TableCell>Drone ID</TableCell>
              <TableCell>Model</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Flights</TableCell>
              <TableCell align="right">Battery %</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredDrones.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} sx={{ opacity: 0.5, py: 3, textAlign: "center" }}>
                  No drones match current filters.
                </TableCell>
              </TableRow>
            ) : filteredDrones.map(d => (
              <TableRow key={d.id} hover>
                <TableCell sx={{ fontFamily: "monospace", fontWeight: 700, color: "#4A9EFF" }}>{d.id}</TableCell>
                <TableCell>{d.model}</TableCell>
                <TableCell><StatusChip status={d.status} /></TableCell>
                <TableCell align="right">{d.flights}</TableCell>
                <TableCell align="right">{d.battery_pct}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.06)", mb: 3 }} />

      {/* ── Batteries table ───────────────────────────────────────────────── */}
      <Typography variant="overline" sx={{ opacity: 0.5, letterSpacing: 1.5 }}>
        Batteries ({filteredBatteries.length})
      </Typography>
      <Paper variant="outlined" sx={{ mt: 1, borderColor: "rgba(74,158,255,0.15)" }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ "& th": { fontWeight: 700, opacity: 0.75, fontSize: 12 } }}>
              <TableCell>Battery ID</TableCell>
              <TableCell>Drone ID</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Cycles Used</TableCell>
              <TableCell align="right">Cycle Max</TableCell>
              <TableCell align="right">% Used</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredBatteries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} sx={{ opacity: 0.5, py: 3, textAlign: "center" }}>
                  No batteries match current filters.
                </TableCell>
              </TableRow>
            ) : filteredBatteries.map(b => (
              <TableRow key={b.id} hover>
                <TableCell sx={{ fontFamily: "monospace", fontWeight: 700, color: "#4A9EFF" }}>{b.id}</TableCell>
                <TableCell sx={{ fontFamily: "monospace" }}>{b.drone_id}</TableCell>
                <TableCell><StatusChip status={b.status} /></TableCell>
                <TableCell align="right">{b.cycles}</TableCell>
                <TableCell align="right">{b.cycle_max}</TableCell>
                <TableCell align="right">{Math.round((b.cycles / b.cycle_max) * 100)}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Typography variant="caption" sx={{ display: "block", mt: 2, opacity: 0.4 }}>
        Stub data only. Will be hydrated from /api/drones and /api/batteries (Module 2 endpoints).
      </Typography>
    </Box>
  );
}

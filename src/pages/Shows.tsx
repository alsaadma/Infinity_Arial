import { useState } from "react";
import {
  Box, Button, ButtonGroup, Chip, Paper, Table, TableBody,
  TableCell, TableHead, TableRow, Tooltip, Typography,
} from "@mui/material";
import MapIcon from "@mui/icons-material/Map";
import ViewListIcon from "@mui/icons-material/ViewList";
import DownloadIcon from "@mui/icons-material/Download";
import Breadcrumb from "../components/Breadcrumb";

const SHOW_STUBS = [
  { id: "SH-001", name: "National Day Riyadh 2024", date: "2024-09-23", drones: 500, status: "CONFIRMED", location: "Riyadh, SA" },
  { id: "SH-002", name: "City Festival Dammam",    date: "2024-11-10", drones: 300, status: "PLANNING",   location: "Dammam, SA" },
  { id: "SH-003", name: "Formula E Diriyah",       date: "2025-01-25", drones: 750, status: "CONFIRMED",  location: "Diriyah, SA" },
  { id: "SH-004", name: "NEOM Launch Event",        date: "2025-03-05", drones: 1000, status: "HOLD",    location: "NEOM, SA" },
];

const STATUS_CHIP: Record<string, { label: string; color: string; bg: string }> = {
  CONFIRMED: { label: "Confirmed", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  PLANNING:  { label: "Planning",  color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  HOLD:      { label: "Hold",      color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
};

export default function Shows() {
  const [view, setView] = useState<"list" | "map">("list");

  const handleExport = () => {
    // Stub: will be wired to a real CSV/PDF export endpoint later
    alert("Export stub: CSV/PDF manifest generation will be wired to the backend in a future sprint.");
  };

  return (
    <Box sx={{ maxWidth: 1100 }}>
      <Breadcrumb />
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={800} mb={0.5}>Shows</Typography>
          <Typography variant="body2" sx={{ opacity: 0.6 }}>
            Show / event registry. Schedule, drone allocation, and permit linkage.
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
          {/* View toggle */}
          <ButtonGroup size="small" variant="outlined">
            <Tooltip title="List view">
              <Button
                onClick={() => setView("list")}
                variant={view === "list" ? "contained" : "outlined"}
                startIcon={<ViewListIcon />}
              >
                List
              </Button>
            </Tooltip>
            <Tooltip title="Map view (coming soon — will plot show locations on a Saudi Arabia map)">
              <Button
                onClick={() => setView("map")}
                variant={view === "map" ? "contained" : "outlined"}
                startIcon={<MapIcon />}
              >
                Map
              </Button>
            </Tooltip>
          </ButtonGroup>

          {/* Export */}
          <Tooltip title="Export show manifest as CSV or PDF (backend wire-up pending)">
            <Button
              size="small"
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExport}
            >
              Export
            </Button>
          </Tooltip>
        </Box>
      </Box>

      {view === "list" ? (
        <Paper variant="outlined" sx={{ borderColor: "rgba(74,158,255,0.15)" }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ "& th": { fontWeight: 700, opacity: 0.75, fontSize: 12 } }}>
                <TableCell>Show ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Location</TableCell>
                <TableCell align="right">Drones</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {SHOW_STUBS.map(s => {
                const st = STATUS_CHIP[s.status] ?? { label: s.status, color: "#aaa", bg: "rgba(255,255,255,0.06)" };
                return (
                  <TableRow key={s.id} hover>
                    <TableCell sx={{ fontFamily: "monospace", fontWeight: 700, color: "#4A9EFF" }}>{s.id}</TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{s.name}</TableCell>
                    <TableCell>{s.date}</TableCell>
                    <TableCell sx={{ opacity: 0.75 }}>{s.location}</TableCell>
                    <TableCell align="right">{s.drones.toLocaleString()}</TableCell>
                    <TableCell>
                      <Chip
                        label={st.label}
                        size="small"
                        sx={{ color: st.color, background: st.bg, fontWeight: 700, fontSize: 11 }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      ) : (
        /* Map view placeholder */
        <Paper
          variant="outlined"
          sx={{
            borderColor: "rgba(74,158,255,0.15)",
            height: 420,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            background: "rgba(74,158,255,0.03)",
          }}
        >
          <MapIcon sx={{ fontSize: 48, opacity: 0.2 }} />
          <Typography variant="body1" sx={{ opacity: 0.55 }}>Map View</Typography>
          <Typography variant="caption" sx={{ opacity: 0.4, maxWidth: 340, textAlign: "center" }}>
            Will render an interactive Saudi Arabia map plotting confirmed show locations.
            Ready to wire up a Leaflet or Google Maps embed once the backend provides coordinates.
          </Typography>
        </Paper>
      )}

      <Typography variant="caption" sx={{ display: "block", mt: 2, opacity: 0.4 }}>
        Stub data only. Will be hydrated from /api/shows (Module 3 endpoint).
      </Typography>
    </Box>
  );
}

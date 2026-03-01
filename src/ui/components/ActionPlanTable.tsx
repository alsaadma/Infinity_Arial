import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Chip,
} from "@mui/material";

export type ActionPlanRow = {
  id: string;
  title: string;
  severity: number; // 1..5
  blocker: boolean;
  owner: string;
  due_days: number;
  priority: "P0" | "P1" | "P2" | "P3";
  status: "Open" | "In Progress" | "Done";
  evidence_needed: string;
};
type RiskTone = "HIGH" | "MED" | "LOW";

function riskTone(r: ActionPlanRow): RiskTone {
  // Dominance logic: blocker + priority drive tone; severity refines.
  if (r.blocker) return "HIGH";
  if (r.priority === "P0") return "HIGH";
  if (r.priority === "P1") return "MED";
  if (r.severity >= 4) return "MED";
  return "LOW";
}

function sevChip(sev: number) {
  const label = "S" + sev;
  return <Chip size="small" label={label} variant="outlined" />;
}

function prioChip(p: ActionPlanRow["priority"]) {
  const tone: RiskTone = p === "P0" ? "HIGH" : p === "P1" ? "MED" : "LOW";
  const sx =
    tone === "HIGH"
      ? { bgcolor: "rgba(220, 38, 38, 0.12)", borderColor: "rgba(220, 38, 38, 0.35)", fontWeight: 800 }
      : tone === "MED"
        ? { bgcolor: "rgba(245, 158, 11, 0.12)", borderColor: "rgba(245, 158, 11, 0.35)", fontWeight: 800 }
        : { bgcolor: "rgba(16, 185, 129, 0.10)", borderColor: "rgba(16, 185, 129, 0.25)", fontWeight: 800 };

  return <Chip size="small" label={p} variant="outlined" sx={sx} />;
}

export default function ActionPlanTable(props: { rows: ActionPlanRow[] }) {
  const { rows } = props;

  return (
    <Paper variant="outlined" sx={{ mt: 2 }}>
      <Box sx={{ px: 2, py: 1.2 }}>
        <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
          Action Plan (Owner-ready)
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.75 }}>
          Operational tasks derived from gaps. Assign owners + due dates and track status.
        </Typography>
      </Box>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell style={{ width: 44, opacity: 0.7 }}>#</TableCell><TableCell sx={{ width: 90 }}>Priority</TableCell>
            <TableCell sx={{ width: 80 }}>Sev</TableCell>
            <TableCell sx={{ width: 90 }}>Blocker</TableCell>
            <TableCell>Action</TableCell>
            <TableCell sx={{ width: 180 }}>Owner</TableCell>
            <TableCell sx={{ width: 110 }}>Due (days)</TableCell>
            <TableCell sx={{ width: 140 }}>Status</TableCell>
            <TableCell>Evidence needed</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8}>
                <Typography variant="body2" sx={{ opacity: 0.75 }}>
                  No action items match current filters.
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r) => (
              <TableRow
                key={r.id}
                hover
                sx={{
                  position: "relative",
                  ...(riskTone(r) === "HIGH"
                    ? { bgcolor: "rgba(220, 38, 38, 0.045)" }
                    : riskTone(r) === "MED"
                      ? { bgcolor: "rgba(245, 158, 11, 0.045)" }
                      : {}),
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 4,
                    background:
                      riskTone(r) === "HIGH"
                        ? "rgba(220, 38, 38, 0.55)"
                        : riskTone(r) === "MED"
                          ? "rgba(245, 158, 11, 0.55)"
                          : "transparent",
                  },
                }}
              >
                <TableCell>{prioChip(r.priority)}</TableCell>
                <TableCell>{sevChip(r.severity)}</TableCell>
                <TableCell>
                  {r.blocker ? (
                    <Chip size="small" label="Yes" sx={{ fontWeight: 800 }} />
                  ) : (
                    <Chip size="small" label="No" variant="outlined" sx={{ opacity: 0.8 }} />
                  )}
                </TableCell>
                <TableCell>{r.title}</TableCell>
                <TableCell>{r.owner}</TableCell>
                <TableCell>{r.due_days}</TableCell>
                <TableCell>{r.status}</TableCell>
                <TableCell>{r.evidence_needed}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Paper>
  );
}


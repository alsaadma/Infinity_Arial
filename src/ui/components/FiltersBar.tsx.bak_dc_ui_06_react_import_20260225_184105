import React from "react";
import { Box, FormControlLabel, Switch, TextField, Typography } from "@mui/material";

export default function FiltersBar(props: {
  showBlockersOnly: boolean;
  onToggleBlockersOnly: (v: boolean) => void;
  minSeverity: number;
  onMinSeverity: (v: number) => void;
}) {
  const { showBlockersOnly, onToggleBlockersOnly, minSeverity, onMinSeverity } = props;

  return (
    <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
      <Typography variant="subtitle2" sx={{ opacity: 0.85 }}>Filters</Typography>

      <FormControlLabel
        control={
          <Switch
            checked={showBlockersOnly}
            onChange={(e) => onToggleBlockersOnly(Boolean(e.target.checked))}
          />
        }
        label="Blockers only"
      />

      <TextField
        size="small"
        label="Min severity (1–5)"
        type="number"
        inputProps={{ min: 1, max: 5, step: 1 }}
        value={minSeverity}
        onChange={(e) => {
          const n = Number(e.target.value);
          const v = Number.isFinite(n) ? Math.max(1, Math.min(5, Math.round(n))) : 1;
          onMinSeverity(v);
        }}
        sx={{ width: 170 }}
      />
    </Box>
  );
}

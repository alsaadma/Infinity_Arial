import React from "react";
import { Box, Paper, Typography, Divider } from "@mui/material";

type KpiItem = {
  label: string;
  value: string;
  hint?: string;
};

function KpiCell({ item }: { item: KpiItem }) {
  return (
    <Box sx={{ px: 2, py: 1.2, minWidth: 160 }}>
      <Typography variant="caption" sx={{ opacity: 0.8 }}>
        {item.label}
      </Typography>
      <Typography variant="h6" sx={{ lineHeight: 1.2, mt: 0.3 }}>
        {item.value}
      </Typography>
      {item.hint ? (
        <Typography variant="caption" sx={{ opacity: 0.7 }}>
          {item.hint}
        </Typography>
      ) : null}
    </Box>
  );
}

export default function KpiStrip(props: {
  readiness?: string;
  msqSar?: number;
  proposedPriceSar?: number;
  marginGapSar?: number;
  formatSar: (n: number | undefined) => string;
}) {
  const { readiness, msqSar, proposedPriceSar, marginGapSar, formatSar } = props;

  const items: KpiItem[] = [
    { label: "Readiness", value: readiness ?? "—", hint: "Operational readiness state" },
    { label: "MSQ (SAR)", value: formatSar(msqSar), hint: "Minimum sustainable quote" },
    { label: "Proposed Price (SAR)", value: formatSar(proposedPriceSar), hint: "Your commercial offer" },
    { label: "Margin Gap (SAR)", value: formatSar(marginGapSar), hint: "Price − MSQ" },
  ];

  return (
    <Paper variant="outlined" sx={{ display: "flex", alignItems: "stretch", overflowX: "auto" }}>
      {items.map((it, idx) => (
        <React.Fragment key={it.label}>
          <KpiCell item={it} />
          {idx < items.length - 1 ? <Divider orientation="vertical" flexItem /> : null}
        </React.Fragment>
      ))}
    </Paper>
  );
}

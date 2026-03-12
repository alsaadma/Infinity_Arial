/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import { Alert, Paper, Stack, Typography } from "@mui/material";
import { computeYear1, type QuoteInputs } from "../../domain/calc";

export default function QuoteBuilder() {
  const [inputs] = useState<QuoteInputs>({
    currency: "SAR",
    dronesPerShow: 1000,
    showsPerYear: 12,
    pricePerShow: 250000,
    cancellationRate: 0.1,
    opexPerShow: 65000,
    fixedOpexPerYear: 600000,
    priceUpliftRate: 0.1,
    costInflationRate: 0.1,
    rampY1: 0.6,
    rampY2: 0.8,
    rampY3Plus: 1.0,
    manualRevenueAdjustment: 0,
    manualCostAdjustment: 0,
  });

  const result = useMemo(() => {
    try {
      return { ok: true as const, data: computeYear1(inputs) };
    } catch (e: any) {
      return { ok: false as const, error: String(e?.message ?? e) };
    }
  }, [inputs]);

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Quote Builder</Typography>

      {!result.ok ? (
        <Alert severity="error">{result.error}</Alert>
      ) : (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6">Year 1 Snapshot</Typography>
          <Typography>Executed Shows: {result.data.executedShows.toFixed(2)}</Typography>
          <Typography>Revenue: {result.data.grossRevenue.toFixed(0)} {inputs.currency}</Typography>
          <Typography>OPEX: {result.data.totalOpex.toFixed(0)} {inputs.currency}</Typography>
          <Typography>Contribution: {result.data.contribution.toFixed(0)} {inputs.currency}</Typography>
          <Typography>Margin: {(result.data.marginPct * 100).toFixed(1)}%</Typography>
        </Paper>
      )}

      <Typography variant="body2" color="text.secondary">
        Next: we replace these constants with controlled inputs + save to IndexedDB.
      </Typography>
    </Stack>
  );
}


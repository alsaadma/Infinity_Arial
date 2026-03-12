import { useEffect, useState } from "react";
import { Typography, Button, Stack } from "@mui/material";
import { createQuote, listQuotes } from "../../db/quotesRepo";

export default function Dashboard() {
  const [count, setCount] = useState(0);

  async function refresh() {
    const q = await listQuotes();
    setCount(q.length);
  }

  async function addDummy() {
    await createQuote({
      name: "Test Quote",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      inputs: {},
      outputs: {},
    });
    refresh();
  }

  useEffect(() => {
    const t = setTimeout(() => refresh(), 0);
    return () => clearTimeout(t);
  }, []);

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Dashboard</Typography>
      <Typography>Total Quotes: {count}</Typography>
      <Button variant="contained" onClick={addDummy}>
        Add Test Quote
      </Button>
    </Stack>
  );
}

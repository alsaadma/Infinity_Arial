import { useEffect, useState } from "react";
import {
  Typography,
  Stack,
  Paper,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Button,
  Divider,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";
import { deleteQuote, listQuotes } from "../../db/quotesRepo";
import type { Quote } from "../../db/db";

export default function Library() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    const q = await listQuotes();
    setQuotes(q);
    setLoading(false);
  }

  async function remove(id?: number) {
    if (!id) return;
    await deleteQuote(id);
    await refresh();
  }

  useEffect(() => {
    const t = setTimeout(() => refresh(), 0);
    return () => clearTimeout(t);
  }, []);

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h4">Library</Typography>
        <Button startIcon={<RefreshIcon />} variant="outlined" onClick={refresh}>
          Refresh
        </Button>
      </Stack>

      <Paper variant="outlined">
        {loading ? (
          <Typography sx={{ p: 2 }}>Loading…</Typography>
        ) : quotes.length === 0 ? (
          <Typography sx={{ p: 2 }}>No quotes yet. Add one from Dashboard.</Typography>
        ) : (
          <List>
            {quotes.map((q, idx) => (
              <div key={q.id ?? idx}>
                <ListItem
                  secondaryAction={
                    <IconButton edge="end" aria-label="delete" onClick={() => remove(q.id)}>
                      <DeleteIcon />
                    </IconButton>
                  }
                >
                  <ListItemText
                    primary={`${q.name}${q.id ? ` (#${q.id})` : ""}`}
                    secondary={`Created: ${new Date(q.createdAt).toLocaleString()}`}
                  />
                </ListItem>
                {idx < quotes.length - 1 && <Divider />}
              </div>
            ))}
          </List>
        )}
      </Paper>
    </Stack>
  );
}


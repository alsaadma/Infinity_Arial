import React, { useMemo, useState } from "react";
import { Box, Button, MenuItem, Select, TextField, Typography } from "@mui/material";

export type SnapshotRecord = {
  id: string;
  name: string;
  created_at: string;
  payload: any;
};

function nowIso() {
  return new Date().toISOString();
}

function makeId() {
  const s = Math.random().toString(16).slice(2);
  return "S-" + new Date().toISOString().slice(0,10).replace(/-/g,"") + "-" + s.slice(0,6).toUpperCase();
}

export default function SnapshotBar(props: {
  snapshots: SnapshotRecord[];
  activeId: string | null;
  onSave: (name: string) => void;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { snapshots, activeId, onSave, onLoad, onDelete } = props;

  const [name, setName] = useState("");
  const active = useMemo(() => snapshots.find(s => s.id === activeId) ?? null, [snapshots, activeId]);

  return (
    <Box sx={{ display: "flex", gap: 1.2, alignItems: "center", flexWrap: "wrap" }}>
      <Typography variant="subtitle2" sx={{ opacity: 0.85 }}>Snapshots</Typography>

      <Select
        size="small"
        value={activeId ?? ""}
        displayEmpty
        sx={{ minWidth: 280 }}
        onChange={(e) => {
          const v = String(e.target.value || "");
          if (!v) return;
          onLoad(v);
        }}
      >
        <MenuItem value=""><em>Select snapshot…</em></MenuItem>
        {snapshots
          .slice()
          .sort((a,b) => (a.created_at < b.created_at ? 1 : -1))
          .map(s => (
            <MenuItem key={s.id} value={s.id}>
              {s.name} — {s.created_at.slice(0,19).replace("T"," ")}
            </MenuItem>
          ))}
      </Select>

      <TextField
        size="small"
        label="New snapshot name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        sx={{ minWidth: 260 }}
      />

      <Button
        variant="contained"
        size="small"
        onClick={() => {
          const n = (name || "").trim();
          if (!n) return;
          onSave(n);
          setName("");
        }}
      >
        Save
      </Button>

      <Button
        variant="outlined"
        size="small"
        disabled={!active}
        onClick={() => {
          if (!active) return;
          onDelete(active.id);
        }}
      >
        Delete
      </Button>
    </Box>
  );
}

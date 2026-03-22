import React, { useState } from "react";
import {
  Box, Button, Chip, Collapse, Divider, IconButton, List,
  ListItem, ListItemIcon, ListItemText, Paper, Table, TableBody,
  TableCell, TableHead, TableRow, Tooltip, Typography,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import Breadcrumb from "../components/Breadcrumb";

const PERMIT_STUBS = [
  {
    id: "PRM-001",
    show: "National Day Riyadh 2024",
    authority: "GACA",
    status: "APPROVED",
    issued: "2024-08-15",
    expires: "2024-09-30",
    locked: true,
    docs: [
      { name: "GACA_Approval_NatDay2024.pdf", size: "1.2 MB", date: "2024-08-15" },
    ],
  },
  {
    id: "PRM-002",
    show: "City Festival Dammam",
    authority: "Dammam Municipality",
    status: "SUBMITTED",
    issued: "-",
    expires: "-",
    locked: false,
    docs: [],
  },
  {
    id: "PRM-003",
    show: "Formula E Diriyah",
    authority: "GACA",
    status: "DRAFT",
    issued: "-",
    expires: "-",
    locked: false,
    docs: [],
  },
];

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  APPROVED:  { color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  SUBMITTED: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  DRAFT:     { color: "#94a3b8", bg: "rgba(148,163,184,0.10)" },
  REJECTED:  { color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  EXPIRED:   { color: "#f87171", bg: "rgba(248,113,113,0.10)" },
};

export default function Permits() {
  const [expanded, setExpanded] = useState<string | null>(null);
  // Simulated attachment state (UI-only; replace with API calls)
  const [attachments, setAttachments] = useState<Record<string, { name: string; size: string; date: string }[]>>(
    Object.fromEntries(PERMIT_STUBS.map(p => [p.id, p.docs]))
  );

  const toggleExpand = (id: string) =>
    setExpanded(prev => (prev === id ? null : id));

  const handleAttachStub = (permitId: string) => {
    // Stub: in production, open a file picker and POST to /api/permits/:id/docs
    const fakeName = "Document_" + (attachments[permitId].length + 1) + ".pdf";
    setAttachments(prev => ({
      ...prev,
      [permitId]: [
        ...prev[permitId],
        { name: fakeName, size: "0.8 MB", date: new Date().toISOString().slice(0, 10) },
      ],
    }));
  };

  return (
    <Box sx={{ maxWidth: 1100 }}>
      <Breadcrumb />
      <Typography variant="h5" fontWeight={800} mb={0.5}>Permits</Typography>
      <Typography variant="body2" sx={{ opacity: 0.6, mb: 3 }}>
        Regulatory permit registry. Track status, linked shows, issuing authority, and digital document copies.
      </Typography>

      <Paper variant="outlined" sx={{ borderColor: "rgba(74,158,255,0.15)" }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ "& th": { fontWeight: 700, opacity: 0.75, fontSize: 12 } }}>
              <TableCell>Permit ID</TableCell>
              <TableCell>Show</TableCell>
              <TableCell>Authority</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Issued</TableCell>
              <TableCell>Expires</TableCell>
              <TableCell align="center">Lock</TableCell>
              <TableCell align="center">Docs</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {PERMIT_STUBS.map(p => {
              const st = STATUS_STYLE[p.status] ?? { color: "#aaa", bg: "rgba(255,255,255,0.06)" };
              const docCount = attachments[p.id]?.length ?? 0;
              const isExpanded = expanded === p.id;
              return (
                <React.Fragment key={p.id}>
                  <TableRow hover>
                    <TableCell sx={{ fontFamily: "monospace", fontWeight: 700, color: "#4A9EFF" }}>{p.id}</TableCell>
                    <TableCell sx={{ maxWidth: 200 }}>{p.show}</TableCell>
                    <TableCell>{p.authority}</TableCell>
                    <TableCell>
                      <Chip label={p.status} size="small" sx={{ color: st.color, background: st.bg, fontWeight: 700, fontSize: 11 }} />
                    </TableCell>
                    <TableCell>{p.issued}</TableCell>
                    <TableCell>{p.expires}</TableCell>
                    <TableCell align="center">
                      <Tooltip
                        title={p.locked
                          ? "Permit is locked (APPROVED status). Unlock requires admin override to prevent accidental edits to a live approved permit."
                          : "Permit is editable. It will auto-lock when moved to APPROVED status."}
                        arrow
                      >
                        <span>
                          <IconButton size="small" disabled={!p.locked}>
                            {p.locked
                              ? <LockIcon sx={{ fontSize: 16, color: "#4A9EFF" }} />
                              : <LockOpenIcon sx={{ fontSize: 16, opacity: 0.4 }} />
                            }
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={docCount > 0 ? docCount + " file" + (docCount > 1 ? "s" : "") : "No docs"}
                        size="small"
                        variant={docCount > 0 ? "filled" : "outlined"}
                        sx={{ fontSize: 11, opacity: docCount > 0 ? 1 : 0.45 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Expand document attachment panel">
                        <IconButton size="small" onClick={() => toggleExpand(p.id)}>
                          {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>

                  {/* Document attachment panel */}
                  <TableRow>
                    <TableCell colSpan={9} sx={{ py: 0, borderBottom: isExpanded ? undefined : "none" }}>
                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Box sx={{ px: 3, py: 2, background: "rgba(74,158,255,0.03)", borderTop: "1px solid rgba(74,158,255,0.08)" }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, opacity: 0.6, textTransform: "uppercase", letterSpacing: 1 }}>
                            Document Attachments — {p.id}
                          </Typography>
                          {attachments[p.id]?.length > 0 ? (
                            <List dense disablePadding sx={{ mt: 1 }}>
                              {attachments[p.id].map((doc, i) => (
                                <ListItem key={i} disablePadding sx={{ py: 0.5 }}>
                                  <ListItemIcon sx={{ minWidth: 28 }}>
                                    <InsertDriveFileIcon sx={{ fontSize: 16, color: "#4A9EFF" }} />
                                  </ListItemIcon>
                                  <ListItemText
                                    primary={doc.name}
                                    secondary={doc.size + " · " + doc.date}
                                    primaryTypographyProps={{ fontSize: 13 }}
                                    secondaryTypographyProps={{ fontSize: 11 }}
                                  />
                                </ListItem>
                              ))}
                            </List>
                          ) : (
                            <Typography variant="body2" sx={{ mt: 1, opacity: 0.45 }}>
                              No documents attached. Upload the signed permit PDF here once approved.
                            </Typography>
                          )}
                          <Divider sx={{ my: 1.5, borderColor: "rgba(255,255,255,0.06)" }} />
                          <Tooltip title="Attach a digital copy of this permit document (PDF, JPG). Will be stored via /api/permits/:id/docs in a future sprint.">
                            <Button
                              size="small"
                              startIcon={<AttachFileIcon />}
                              variant="outlined"
                              onClick={() => handleAttachStub(p.id)}
                            >
                              Attach Document
                            </Button>
                          </Tooltip>
                          <Typography variant="caption" sx={{ display: "block", mt: 1, opacity: 0.35 }}>
                            Stub: simulates file attachment. Backend endpoint /api/permits/{p.id}/docs wired up in a future sprint.
                          </Typography>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </Paper>

      <Typography variant="caption" sx={{ display: "block", mt: 2, opacity: 0.4 }}>
        Stub data only. Will be hydrated from /api/permits (Module 4 endpoint).
      </Typography>
    </Box>
  );
}

import React, { useState } from "react";
import {
  AppBar, Box, Collapse, Drawer, InputBase,
  List, ListItemButton, ListItemIcon, ListItemText,
  Toolbar, Typography,
} from "@mui/material";
import {
  Flight as FlightIcon,
  Event as EventIcon,
  CalendarMonth as CalendarIcon,
  Build as BuildIcon,
  VerifiedUser as PermitIcon,
  LocationOn as SiteIcon,
  CheckCircle as ReadinessIcon,
  AttachMoney as CostIcon,
  BarChart as UtilIcon,
  Assessment as ReportIcon,
  Dashboard as DashIcon,
  ExpandLess,
  ExpandMore,
  Search as SearchIcon,
} from "@mui/icons-material";
import { Link, useLocation, useNavigate } from "react-router-dom";

const DRAWER_W = 252;
const BG       = "#0B1628";
const PRIMARY  = "#4A9EFF";

type NavItem = { label: string; to: string; icon: React.ReactElement };
type NavGroup = { group: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    group: "Planning",
    items: [
      { label: "Shows",       to: "/shows",       icon: <EventIcon fontSize="small" /> },
      { label: "Calendar",    to: "/calendar",    icon: <CalendarIcon fontSize="small" /> },
    ],
  },
  {
    group: "Assets",
    items: [
      { label: "Fleet",       to: "/fleet",       icon: <FlightIcon fontSize="small" /> },
      { label: "Maintenance", to: "/maintenance", icon: <BuildIcon fontSize="small" /> },
    ],
  },
  {
    group: "Compliance",
    items: [
      { label: "Permits",     to: "/permits",     icon: <PermitIcon fontSize="small" /> },
      { label: "Sites",       to: "/sites",       icon: <SiteIcon fontSize="small" /> },
      { label: "Readiness",   to: "/readiness",   icon: <ReadinessIcon fontSize="small" /> },
    ],
  },
  {
    group: "Finance / Analytics",
    items: [
      { label: "Costing",     to: "/costing",     icon: <CostIcon fontSize="small" /> },
      { label: "Utilization", to: "/utilization", icon: <UtilIcon fontSize="small" /> },
      { label: "Reports",     to: "/reports",     icon: <ReportIcon fontSize="small" /> },
    ],
  },
];


// Fix: import AttachMoneyIcon properly at top
// We re-export a mini search index built from NAV + top-level items
function buildIndex(): NavItem[] {
  return [
    { label: "Command",       to: "/command",       icon: <DashIcon fontSize="small" /> },
    { label: "Quote Builder", to: "/quote-builder", icon: <CostIcon fontSize="small" /> },
    ...NAV.flatMap(g => g.items),
  ];
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const loc      = useLocation();
  const navigate = useNavigate();

  // open/close state per group
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NAV.map(g => [g.group, true]))
  );
  const toggleGroup = (g: string) =>
    setOpenGroups(prev => ({ ...prev, [g]: !prev[g] }));

  // Global search
  const [searchQ, setSearchQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const idx = buildIndex();
  const searchResults = searchQ.trim().length > 0
    ? idx.filter(r => r.label.toLowerCase().includes(searchQ.toLowerCase()))
    : [];

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", background: BG }}>
      {/* ── AppBar ─────────────────────────────────────────────────────── */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: 1201,
          background: "rgba(11,22,40,0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(74,158,255,0.12)",
        }}
      >
        <Toolbar sx={{ gap: 2 }}>
          <Typography
            variant="h6"
            sx={{
              fontFamily: "'Orbitron', 'Rajdhani', monospace",
              fontWeight: 800,
              letterSpacing: 2,
              color: PRIMARY,
              flexShrink: 0,
            }}
          >
            INFINITY
          </Typography>
          <Typography
            variant="caption"
            sx={{ opacity: 0.45, letterSpacing: 1, flexShrink: 0 }}
          >
            CommandOps
          </Typography>

          <Box sx={{ flexGrow: 1 }} />

          {/* Global search */}
          <Box sx={{ position: "relative" }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                background: "rgba(255,255,255,0.06)",
                border: searchOpen
                  ? `1px solid ${PRIMARY}`
                  : "1px solid rgba(255,255,255,0.10)",
                borderRadius: 2,
                px: 1.5,
                py: 0.5,
                transition: "all 0.2s",
                minWidth: searchOpen ? 260 : 180,
              }}
            >
              <SearchIcon sx={{ fontSize: 16, opacity: 0.6 }} />
              <InputBase
                placeholder="Search pages…"
                value={searchQ}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => setTimeout(() => setSearchOpen(false), 180)}
                onChange={e => setSearchQ(e.target.value)}
                sx={{ fontSize: 13, color: "white", flex: 1 }}
              />
            </Box>
            {searchOpen && searchResults.length > 0 && (
              <Box
                sx={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  right: 0,
                  minWidth: 220,
                  background: "#0f1f38",
                  border: "1px solid rgba(74,158,255,0.25)",
                  borderRadius: 2,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                  zIndex: 9999,
                  overflow: "hidden",
                }}
              >
                {searchResults.map(r => (
                  <Box
                    key={r.to}
                    onMouseDown={() => { navigate(r.to); setSearchQ(""); }}
                    sx={{
                      px: 2,
                      py: 1.2,
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      cursor: "pointer",
                      fontSize: 13,
                      "&:hover": { background: "rgba(74,158,255,0.12)" },
                    }}
                  >
                    {r.icon}
                    {r.label}
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_W,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: DRAWER_W,
            boxSizing: "border-box",
            background: "rgba(11,22,40,0.98)",
            borderRight: "1px solid rgba(74,158,255,0.10)",
          },
        }}
      >
        <Toolbar />

        {/* Command (always visible at top) */}
        <List dense disablePadding sx={{ px: 1, pt: 1 }}>
          <ListItemButton
            component={Link}
            to="/command"
            selected={loc.pathname === "/command"}
            sx={navItemSx(loc.pathname === "/command")}
          >
            <ListItemIcon sx={{ minWidth: 30, color: "inherit" }}>
              <DashIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Command" primaryTypographyProps={{ fontSize: 13, fontWeight: 600 }} />
          </ListItemButton>
        </List>

        {/* Grouped nav */}
        {NAV.map(grp => (
          <React.Fragment key={grp.group}>
            <Box
              onClick={() => toggleGroup(grp.group)}
              sx={{
                display: "flex",
                alignItems: "center",
                px: 2,
                pt: 2,
                pb: 0.5,
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  flex: 1,
                  opacity: 0.45,
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                {grp.group}
              </Typography>
              {openGroups[grp.group] ? (
                <ExpandLess sx={{ fontSize: 14, opacity: 0.4 }} />
              ) : (
                <ExpandMore sx={{ fontSize: 14, opacity: 0.4 }} />
              )}
            </Box>
            <Collapse in={openGroups[grp.group]}>
              <List dense disablePadding sx={{ px: 1 }}>
                {grp.items.map(item => {
                  const active = loc.pathname === item.to;
                  return (
                    <ListItemButton
                      key={item.to}
                      component={Link}
                      to={item.to}
                      selected={active}
                      sx={navItemSx(active)}
                    >
                      <ListItemIcon sx={{ minWidth: 30, color: active ? PRIMARY : "inherit" }}>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{ fontSize: 13 }}
                      />
                    </ListItemButton>
                  );
                })}
              </List>
            </Collapse>
          </React.Fragment>
        ))}
      </Drawer>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <Box
        component="main"
        sx={{ flexGrow: 1, p: 3, background: BG, minHeight: "100vh" }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}

function navItemSx(active: boolean) {
  return {
    borderRadius: 1.5,
    mb: 0.25,
    color: active ? "#fff" : "rgba(255,255,255,0.65)",
    background: active ? "rgba(74,158,255,0.15)" : "transparent",
    borderLeft: active ? `3px solid #4A9EFF` : "3px solid transparent",
    "&:hover": { background: "rgba(74,158,255,0.09)", color: "#fff" },
    transition: "all 0.15s",
  };
}

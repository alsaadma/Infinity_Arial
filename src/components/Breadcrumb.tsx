import { Breadcrumbs, Link as MuiLink, Typography } from "@mui/material";
import { Link, useLocation } from "react-router-dom";

const LABELS: Record<string, string> = {
  command:     "Command",
  fleet:       "Fleet",
  shows:       "Shows",
  calendar:    "Calendar",
  maintenance: "Maintenance",
  permits:     "Permits",
  sites:       "Sites",
  readiness:   "Readiness",
  costing:     "Costing",
  utilization: "Utilization",
  reports:     "Reports",
  "quote-builder": "Quote Builder",
};

export default function Breadcrumb() {
  const loc    = useLocation();
  const parts  = loc.pathname.split("/").filter(Boolean);

  if (parts.length === 0) return null;

  return (
    <Breadcrumbs
      aria-label="breadcrumb"
      sx={{ mb: 2, fontSize: 12, opacity: 0.7 }}
      separator="›"
    >
      <MuiLink component={Link} to="/command" underline="hover" color="inherit" sx={{ fontSize: 12 }}>
        Home
      </MuiLink>
      {parts.map((seg, i) => {
        const to      = "/" + parts.slice(0, i + 1).join("/");
        const label   = LABELS[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1);
        const isLast  = i === parts.length - 1;
        return isLast ? (
          <Typography key={to} sx={{ fontSize: 12, color: "#4A9EFF" }}>
            {label}
          </Typography>
        ) : (
          <MuiLink key={to} component={Link} to={to} underline="hover" color="inherit" sx={{ fontSize: 12 }}>
            {label}
          </MuiLink>
        );
      })}
    </Breadcrumbs>
  );
}

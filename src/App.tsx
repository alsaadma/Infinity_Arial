import React from "react";
import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import Placeholder from "./pages/Placeholder";
import Utilization from "./pages/Utilization";
const Reporting   = React.lazy(() => import("./pages/Reporting"));
const Maintenance = React.lazy(() => import("./pages/Maintenance"));
const Command    = React.lazy(() => import("./pages/Command"));
const QuoteCalc  = React.lazy(() => import("./pages/QuoteCalc"));
const Fleet      = React.lazy(() => import("./pages/Fleet"));
const Calendar   = React.lazy(() => import("./pages/Calendar"));
const Assets     = React.lazy(() => import("./pages/Assets"));
const Shows      = React.lazy(() => import("./pages/Shows"));
const Permits    = React.lazy(() => import("./pages/Permits"));
const Sites      = React.lazy(() => import("./pages/Sites"));
const Allocations = React.lazy(() => import("./pages/Allocations"));
const Costing    = React.lazy(() => import("./pages/Costing"));
const Readiness  = React.lazy(() => import("./pages/Readiness"));
const Help       = React.lazy(() => import("./pages/Help"));
const Careers  = React.lazy(() => import("./pages/Careers"));

const NAV = [
  { to: "/command",       label: "Command"       },
  { to: "/quote-builder", label: "Quote Builder" },
  { to: "/fleet",         label: "Fleet"         },
  { to: "/calendar",      label: "Calendar"      },
  { to: "/assets",        label: "Assets"        },
  { to: "/shows",         label: "Shows"         },
  { to: "/permits",       label: "Permits"       },
  { to: "/sites",         label: "Sites"         },
  { to: "/allocations",   label: "Allocations"   },
  { to: "/costing",       label: "Costing"       },
  { to: "/readiness",     label: "Readiness"     },
  { to: "/utilization",   label: "Utilization"   },
  { to: "/reports",       label: "Reports"       },
  { to: "/maintenance",  label: "Maintenance"  },
  { to: "/careers",     label: "Careers"      },
  { to: "/help",          label: "Info Center"  },
];

const SIDEBAR_W = 200;

function NavLink({ to, label }: { to: string; label: string }) {
  const loc    = useLocation();
  const active = loc.pathname === to || loc.pathname.startsWith(to + "/");
  return (
    <Link to={to} style={{
      display: "flex", alignItems: "center",
      padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
      color: active ? "#4A9EFF" : "#8FA3C0",
      background: active ? "rgba(74,158,255,0.12)" : "transparent",
      textDecoration: "none", transition: "background 0.15s, color 0.15s",
      borderLeft: active ? "3px solid #4A9EFF" : "3px solid transparent",
    }}
    onMouseEnter={e => {
      if (!active) {
        (e.currentTarget as HTMLAnchorElement).style.background = "rgba(74,158,255,0.08)";
        (e.currentTarget as HTMLAnchorElement).style.color = "#4A9EFF";
      }
    }}
    onMouseLeave={e => {
      if (!active) {
        (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
        (e.currentTarget as HTMLAnchorElement).style.color = "#8FA3C0";
      }
    }}
    >{label}</Link>
  );
}

export default function App() {
  return (
    <div style={{ minHeight: "100vh", background: "#0B1628", color: "#F0F4FF", display: "flex" }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: SIDEBAR_W, minWidth: SIDEBAR_W, minHeight: "100vh",
        background: "#111E35", borderRight: "1px solid rgba(255,255,255,0.08)",
        display: "flex", flexDirection: "column",
        position: "sticky", top: 0, alignSelf: "flex-start", height: "100vh",
        overflowY: "auto",
      }}>
        {/* Logo */}
        <div style={{
          padding: "18px 16px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: "linear-gradient(135deg,#1B4FD8,#4A9EFF)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 800, color: "#fff", flexShrink: 0,
          }}>D</div>
          <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: 0.3, color: "#F0F4FF" }}>
            DRONES CALC
          </span>
        </div>
        {/* Nav links */}
        <nav style={{ display: "flex", flexDirection: "column", gap: 2, padding: "12px 8px", flex: 1 }}>
          {NAV.map(n => <NavLink key={n.to} to={n.to} label={n.label} />)}
        </nav>
      </aside>

      {/* ── Main content ── */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <main style={{ padding: "24px 28px", flex: 1 }}>
        <React.Suspense fallback={<div style={{ padding: 16, opacity: 0.6 }}>Loading...</div>}>
          <Routes>
            <Route path="/"              element={<Navigate to="/command" replace />} />
            <Route path="/command"       element={<Command />} />
            <Route path="/quote-builder" element={<QuoteCalc />} />
            <Route path="/quote-calc"    element={<Navigate to="/quote-builder" replace />} />
            <Route path="/fleet"         element={<Fleet />} />
            <Route path="/calendar"      element={<Calendar />} />
            <Route path="/assets"        element={<Assets />} />
            <Route path="/shows"         element={<Shows />} />
            <Route path="/permits"       element={<Permits />} />
            <Route path="/sites"         element={<Sites />} />
            <Route path="/allocations" element={<Allocations />} />
            <Route path="/costing"     element={<Costing />} />
            <Route path="/readiness"     element={<Readiness />} />
            <Route path="/utilization"   element={<Utilization />} />
            <Route path="/careers"     element={<Careers />} />
            <Route path="/help"         element={<React.Suspense fallback={null}><Help /></React.Suspense>} />
          <Route path="/reports"       element={<Reporting />} />
            <Route path="/maintenance"   element={<Maintenance />} />
            <Route path="*"              element={<Placeholder title="Not Found" note="Route does not exist." />} />
          </Routes>
        </React.Suspense>
        </main>
      </div>
    </div>
  );
}

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
const Readiness  = React.lazy(() => import("./pages/Readiness"));

const NAV = [
  { to: "/command",       label: "Command"       },
  { to: "/quote-builder", label: "Quote Builder" },
  { to: "/fleet",         label: "Fleet"         },
  { to: "/calendar",      label: "Calendar"      },
  { to: "/assets",        label: "Assets"        },
  { to: "/shows",         label: "Shows"         },
  { to: "/permits",       label: "Permits"       },
  { to: "/readiness",     label: "Readiness"     },
  { to: "/utilization",   label: "Utilization"   },
  { to: "/reports",       label: "Reports"       },
  { to: "/maintenance",  label: "Maintenance"  },
];

function NavLink({ to, label }: { to: string; label: string }) {
  const loc     = useLocation();
  const active  = loc.pathname === to || loc.pathname.startsWith(to + "/");
  return (
    <Link
      to={to}
      style={{
        padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500,
        color: active ? "#4A9EFF" : "#8FA3C0",
        background: active ? "rgba(74,158,255,0.12)" : "transparent",
        textDecoration: "none", transition: "background 0.15s, color 0.15s",
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
    <div style={{ minHeight: "100vh", background: "#0B1628", color: "#F0F4FF" }}>
      <header style={{
        padding: "0 24px", height: 56, display: "flex", alignItems: "center",
        justifyContent: "space-between", background: "#111E35",
        borderBottom: "1px solid rgba(255,255,255,0.08)", position: "sticky",
        top: 0, zIndex: 100, boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: "linear-gradient(135deg, #1B4FD8, #4A9EFF)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 800, color: "#fff",
          }}>D</div>
          <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: 0.3, color: "#F0F4FF" }}>
            DRONES CALC
          </span>
        </div>
        <nav style={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          {NAV.map(n => <NavLink key={n.to} to={n.to} label={n.label} />)}
        </nav>
      </header>

      <main style={{ padding: "24px 28px" }}>
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
            <Route path="/readiness"     element={<Readiness />} />
            <Route path="/utilization"   element={<Utilization />} />
            <Route path="/reports"       element={<Reporting />} />
            <Route path="/maintenance"   element={<Maintenance />} />
            <Route path="*"              element={<Placeholder title="Not Found" note="Route does not exist." />} />
          </Routes>
        </React.Suspense>
      </main>
    </div>
  );
}

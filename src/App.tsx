import React from "react";
import { Routes, Route, Navigate, Link } from "react-router-dom";
import Placeholder from "./pages/Placeholder";
const Command  = React.lazy(() => import("./pages/Command"));
const QuoteCalc = React.lazy(() => import("./pages/QuoteCalc"));
const Fleet    = React.lazy(() => import("./pages/Fleet"));
const Calendar = React.lazy(() => import("./pages/Calendar"));
const Assets   = React.lazy(() => import("./pages/Assets"));
const Shows    = React.lazy(() => import("./pages/Shows"));
const Permits  = React.lazy(() => import("./pages/Permits"));

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

        <nav style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {[
            { to: "/command",       label: "Command"       },
            { to: "/quote-builder", label: "Quote Builder" },
            { to: "/fleet",         label: "Fleet"         },
            { to: "/calendar",      label: "Calendar"      },
            { to: "/reports",       label: "Reports"       },
            { to: "/assets",        label: "🔒 Assets"     },
            { to: "/shows",         label: "📅 Shows"      },
            { to: "/permits",       label: "📋 Permits"    },
          ].map(({ to, label }) => (
            <Link key={to} to={to} style={{
              padding: "6px 14px", borderRadius: 8, fontSize: 14, fontWeight: 500,
              color: "#8FA3C0", textDecoration: "none", transition: "background 0.15s, color 0.15s",
            }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLAnchorElement).style.background = "rgba(74,158,255,0.12)";
                (e.currentTarget as HTMLAnchorElement).style.color = "#4A9EFF";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                (e.currentTarget as HTMLAnchorElement).style.color = "#8FA3C0";
              }}
            >{label}</Link>
          ))}
        </nav>
      </header>

      <main style={{ padding: "24px 28px" }}>
        <React.Suspense fallback={<div style={{ padding: 16 }}>Loading...</div>}>
          <Routes>
            <Route path="/"             element={<Navigate to="/command" replace />} />
            <Route path="/command"      element={<Command />} />
            <Route path="/quote-builder" element={<QuoteCalc />} />
            <Route path="/quote-calc"   element={<Navigate to="/quote-builder" replace />} />
            <Route path="/fleet"        element={<Fleet />} />
            <Route path="/calendar"     element={<Calendar />} />
            <Route path="/assets"       element={<Assets />} />`n            <Route path="/shows"        element={<Shows />} />
            <Route path="/permits"      element={<Permits />} />
            <Route path="/reports"      element={<Placeholder title="Reports" note="Placeholder route (OPS-ARCH later)." />} />
            <Route path="*"             element={<Placeholder title="Not Found" note="Route does not exist." />} />
          </Routes>
        </React.Suspense>
      </main>
    </div>
  );
}


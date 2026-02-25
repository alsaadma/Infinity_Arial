import { Routes, Route, Navigate, Link } from "react-router-dom";
import QuoteCalc from "./pages/QuoteCalc";
import Command from "./pages/Command";
import Placeholder from "./pages/Placeholder";

export default function App() {
  return (
    <div style={{ minHeight: "100vh" }}>
      <header style={{ padding: 12, borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
        <nav style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <Link to="/command">/command</Link>
          <Link to="/quote-builder">/quote-builder</Link>
          <Link to="/fleet">/fleet</Link>
          <Link to="/calendar">/calendar</Link>
          <Link to="/reports">/reports</Link>
        </nav>
      </header>

      <main style={{ padding: 12 }}>
        <Routes>
          <Route path="/" element={<Navigate to="/command" replace />} />

          <Route path="/command" element={<Command />} />

          {/* Quote Builder (existing QuoteCalc) */}
          <Route path="/quote-builder" element={<QuoteCalc />} />
          {/* Legacy alias */}
          <Route path="/quote-calc" element={<Navigate to="/quote-builder" replace />} />

          {/* Placeholders */}
          <Route path="/fleet" element={<Placeholder title="Fleet" note="Placeholder route (OPS-ARCH later)." />} />
          <Route path="/calendar" element={<Placeholder title="Calendar" note="Placeholder route (OPS-ARCH later)." />} />
          <Route path="/reports" element={<Placeholder title="Reports" note="Placeholder route (OPS-ARCH later)." />} />

          <Route path="*" element={<Placeholder title="Not Found" note="Route does not exist." />} />
        </Routes>
      </main>
    </div>
  );
}
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./ui/Layout";
import Command from "./pages/Command";
import QuoteCalc from "./pages/QuoteCalc";
import Fleet from "./pages/Fleet";
import Shows from "./pages/Shows";
import Costing from "./pages/Costing";
import Permits from "./pages/Permits";
import Placeholder from "./pages/Placeholder";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/"               element={<Navigate to="/command" replace />} />
        <Route path="/command"        element={<Command />} />
        <Route path="/quote-builder"  element={<QuoteCalc />} />
        <Route path="/quote-calc"     element={<Navigate to="/quote-builder" replace />} />
        <Route path="/fleet"          element={<Fleet />} />
        <Route path="/shows"          element={<Shows />} />
        <Route path="/costing"        element={<Costing />} />
        <Route path="/permits"        element={<Permits />} />
        <Route path="/calendar"       element={<Placeholder title="Calendar" note="Ops calendar coming in Module 7." />} />
        <Route path="/maintenance"    element={<Placeholder title="Maintenance" note="Maintenance log coming soon." />} />
        <Route path="/sites"          element={<Placeholder title="Sites" note="Sites registry coming soon." />} />
        <Route path="/readiness"      element={<Placeholder title="Readiness" note="Operational readiness engine in Module 5." />} />
        <Route path="/utilization"    element={<Placeholder title="Utilization" note="Utilization & Capacity planning in Module 7." />} />
        <Route path="/reports"        element={<Placeholder title="Reports" note="Executive reports dashboard coming soon." />} />
        <Route path="*"               element={<Placeholder title="Not Found" note="Route does not exist." />} />
      </Routes>
    </Layout>
  );
}

import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Navigate } from "react-router-dom";

export default function Login() {
  const { user, loading, error, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return <div style={{ padding: 32, opacity: 0.6 }}>Loading...</div>;
  }

  if (user) {
    return <Navigate to="/command" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await login(email.trim(), password);
    setSubmitting(false);
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#0B1628", color: "#F0F4FF",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        width: 380, background: "#111E35", borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.08)", padding: "40px 32px",
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            fontWeight: 600, fontSize: 11, letterSpacing: 1.5,
            color: "#4A9EFF", textTransform: "uppercase", marginBottom: 8,
          }}>
            INFINITY Command Ops
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>Sign In</h1>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, opacity: 0.7, marginBottom: 4, display: "block" }}>Email</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              required autoFocus autoComplete="email"
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.05)", color: "#F0F4FF", fontSize: 14,
                outline: "none", boxSizing: "border-box",
              }}
              placeholder="admin@infinity.local"
            />
          </div>
          <div>
            <label style={{ fontSize: 12, opacity: 0.7, marginBottom: 4, display: "block" }}>Password</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              required autoComplete="current-password"
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.05)", color: "#F0F4FF", fontSize: 14,
                outline: "none", boxSizing: "border-box",
              }}
              placeholder="Enter password"
            />
          </div>

          {error && (
            <div style={{
              background: "rgba(255,80,80,0.12)", border: "1px solid rgba(255,80,80,0.3)",
              borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#FF6B6B",
            }}>
              {error}
            </div>
          )}

          <button
            type="submit" disabled={submitting || !email || !password}
            style={{
              padding: "12px 0", borderRadius: 8, border: "none", fontSize: 14, fontWeight: 600,
              background: submitting ? "rgba(74,158,255,0.4)" : "#4A9EFF", color: "#fff",
              cursor: submitting ? "wait" : "pointer", marginTop: 8,
            }}
          >
            {submitting ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

import React from "react";
import { useNavigate } from "react-router-dom";

/**
 * Home page for Drones Calc (INFINITY)
 * Features a premium drone show hero image and a call to action.
 */
export default function Home() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: "calc(100vh - 48px)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      overflow: "hidden",
      borderRadius: 16,
      background: "#0B1628",
      color: "#F0F4FF",
    }}>
      {/* Hero Background Image */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: "url('/hero-drone-show.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        opacity: 0.4,
        zIndex: 0,
      }} />

      {/* Gradient Overlay */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "linear-gradient(180deg, rgba(11, 22, 40, 0.2) 0%, rgba(11, 22, 40, 0.8) 100%)",
        zIndex: 1,
      }} />

      {/* Content */}
      <div style={{
        position: "relative",
        zIndex: 2,
        textAlign: "center",
        padding: "0 24px",
        maxWidth: 800,
      }}>
        <h1 style={{
          fontSize: "clamp(2.5rem, 8vw, 4.5rem)",
          fontWeight: 800,
          marginBottom: 16,
          letterSpacing: "-0.02em",
          background: "linear-gradient(90deg, #FFFFFF 0%, #4A9EFF 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          lineHeight: 1.1,
        }}>
          INFINITY
        </h1>
        <p style={{
          fontSize: "clamp(1rem, 4vw, 1.25rem)",
          opacity: 0.9,
          marginBottom: 32,
          color: "#8FA3C0",
          maxWidth: 600,
          margin: "0 auto 40px",
          lineHeight: 1.6,
        }}>
          Advanced Drone Show Command & Operational Calculator. 
          Manage fleet logistics, permit readiness, and show costing with precision.
        </p>

        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <button 
            onClick={() => navigate("/command")}
            style={{
              padding: "16px 32px",
              fontSize: 16,
              fontWeight: 600,
              borderRadius: 12,
              border: "none",
              background: "#4A9EFF",
              color: "#FFFFFF",
              cursor: "pointer",
              transition: "transform 0.2s, background 0.2s, box-shadow 0.2s",
              boxShadow: "0 4px 20px rgba(74, 158, 255, 0.3)",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.background = "#5BA9FF";
              e.currentTarget.style.boxShadow = "0 6px 24px rgba(74, 158, 255, 0.4)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.background = "#4A9EFF";
              e.currentTarget.style.boxShadow = "0 4px 20px rgba(74, 158, 255, 0.3)";
            }}
          >
            Launch Dashboard
          </button>
          
          <button 
            onClick={() => navigate("/help")}
            style={{
              padding: "16px 32px",
              fontSize: 16,
              fontWeight: 600,
              borderRadius: 12,
              border: "1px solid rgba(255, 255, 255, 0.1)",
              background: "rgba(255, 255, 255, 0.05)",
              color: "#FFFFFF",
              cursor: "pointer",
              backdropFilter: "blur(8px)",
              transition: "transform 0.2s, background 0.2s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
            }}
          >
            Documentation
          </button>
        </div>
      </div>

      {/* Decorative Elements */}
      <div style={{
        position: "absolute",
        bottom: 40,
        left: "50%",
        transform: "translateX(-50%)",
        fontSize: 12,
        letterSpacing: 2,
        textTransform: "uppercase",
        opacity: 0.4,
        zIndex: 2,
      }}>
        Powering the Skies
      </div>
    </div>
  );
}

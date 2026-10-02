"use client";

import "./globals.css";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard", shortLabel: "Dashboard" },
  { href: "/predict", label: "Predict Cash-out Zone", shortLabel: "Prediction Engine" },
  { href: "/map", label: "Live Risk Map", shortLabel: "Risk Map" },
  { href: "/network", label: "Criminal Network Graph", shortLabel: "Network Graph" },
  { href: "/complaints", label: "Cyber Complaints & FIRs", shortLabel: "Complaints" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <title>CrimeShield AI — National Cybercrime Prediction Portal</title>
        <meta name="description" content="Predictive Analytics to Forecast Cybercrime Cash Withdrawal Locations — Ministry of Home Affairs — Team CTRL Z" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
          
          {/* ═════════════════════════════════════════════════════════════ */}
          {/* 1. TOP UTILITY STRIP (Official Gov Sky-Blue Bar)              */}
          {/* ═════════════════════════════════════════════════════════════ */}
          <div style={{
            background: "#0080ea",
            color: "#ffffff",
            fontSize: "11px",
            fontWeight: 600,
            padding: "5px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid rgba(255,255,255,0.2)",
            fontFamily: "'Inter', sans-serif",
          }}>
            {/* Gov Ministry Titles */}
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
                <span style={{ fontSize: "11px", fontWeight: 700 }}>भारत सरकार</span>
                <span style={{ fontSize: "9.5px", opacity: 0.95, letterSpacing: "0.2px" }}>GOVERNMENT OF INDIA</span>
              </div>
              <div style={{ width: "1px", height: "22px", background: "rgba(255,255,255,0.4)" }} />
              <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
                <span style={{ fontSize: "11px", fontWeight: 700 }}>गृह मंत्रालय</span>
                <span style={{ fontSize: "9.5px", opacity: 0.95, letterSpacing: "0.2px" }}>MINISTRY OF HOME AFFAIRS</span>
              </div>
              <div style={{ width: "1px", height: "22px", background: "rgba(255,255,255,0.4)" }} />
              <span style={{ fontSize: "10px", opacity: 0.9, background: "rgba(255,255,255,0.15)", padding: "2px 8px", borderRadius: 4 }}>
                SIH 2026 • Problem Statement: SIH26184
              </span>
            </div>

            {/* Quick Actions / Help Desk */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(0,0,0,0.18)", padding: "3px 10px", borderRadius: 4 }}>
                <span style={{ fontSize: "12px" }}>📞</span>
                <span style={{ fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.5px" }}>NATIONAL HELPLINE: 1930</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "11px", cursor: "pointer" }}>
                <span>Language:</span>
                <span style={{ fontWeight: 700, textDecoration: "underline" }}>English / हिन्दी</span>
              </div>
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════════ */}
          {/* 2. MAIN HEADER SECTION (Clean White Government Style)          */}
          {/* ═════════════════════════════════════════════════════════════ */}
          <header style={{
            background: "#ffffff",
            borderBottom: "1px solid #e2e8f0",
            padding: "12px 28px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
          }}>
            {/* Left cluster: Emblem + I4C/CrimeShield Logo + Official Portal Name */}
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              {/* Satyamev Jayate Government of India Emblem */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/emblem.jpg"
                  alt="State Emblem of India - Satyamev Jayate"
                  style={{
                    height: "64px",
                    width: "auto",
                    objectFit: "contain",
                    display: "block",
                  }}
                />
              </div>

              {/* Vertical Divider */}
              <div style={{ width: "1px", height: "54px", background: "#cbd5e1" }} />

              {/* CrimeShield / I4C Cyber Crime Coordination Emblem */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <div style={{ position: "relative", width: "48px", height: "48px" }}>
                  <svg viewBox="0 0 100 100" width="48" height="48" fill="none">
                    {/* Stylized I */}
                    <rect x="14" y="16" width="12" height="68" rx="3" fill="#0066cc" />
                    {/* Concentric Tricolor Arcs */}
                    <path d="M 38 22 A 38 38 0 0 1 84 50" stroke="#ff9933" strokeWidth="8" strokeLinecap="round" />
                    <path d="M 40 36 A 24 24 0 0 1 72 50" stroke="#0077cc" strokeWidth="6" strokeLinecap="round" />
                    <path d="M 40 50 A 24 24 0 0 1 72 64" stroke="#138808" strokeWidth="6" strokeLinecap="round" />
                    <path d="M 38 78 A 38 38 0 0 0 84 50" stroke="#138808" strokeWidth="8" strokeLinecap="round" />
                    {/* Center Cyber Node */}
                    <circle cx="56" cy="50" r="6" fill="#0066cc" />
                    <circle cx="56" cy="50" r="3" fill="#ffffff" />
                  </svg>
                </div>
                <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
                  <span style={{ fontSize: "16px", fontWeight: 900, color: "#004c99", letterSpacing: "-0.3px", fontFamily: "'Inter', sans-serif" }}>
                    CrimeShield
                  </span>
                  <span style={{ fontSize: "10px", fontWeight: 700, color: "#1e3a8a", textTransform: "uppercase", letterSpacing: "0.2px" }}>
                    Cyber Coordination Centre
                  </span>
                  <span style={{ fontSize: "8.5px", color: "#64748b", fontStyle: "italic", marginTop: 2 }}>
                    सहवीर्यं करवावहै • Team CTRL Z
                  </span>
                </div>
              </div>

              {/* Vertical Divider */}
              <div style={{ width: "1px", height: "54px", background: "#cbd5e1" }} />

              {/* Official Bilingual Portal Name */}
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <span style={{
                  fontSize: "17px",
                  fontWeight: 800,
                  color: "#0f172a",
                  lineHeight: 1.25,
                  letterSpacing: "-0.2px",
                  fontFamily: "'Inter', sans-serif"
                }}>
                  राष्ट्रीय साइबर अपराध पूर्वानुमान एवं रोकथाम पोर्टल
                </span>
                <span style={{
                  fontSize: "19px",
                  fontWeight: 900,
                  color: "#000000",
                  lineHeight: 1.25,
                  letterSpacing: "-0.4px",
                  fontFamily: "'Inter', sans-serif"
                }}>
                  National Cyber Crime Prediction Portal (CrimeShield AI)
                </span>
                <span style={{ fontSize: "10.5px", color: "#475569", fontWeight: 500, marginTop: 2 }}>
                  Automated Forecasting of Cybercrime Cash Withdrawal Locations & Rapid Interception
                </span>
              </div>
            </div>

            {/* Right cluster: Azadi Ka Amrit Mahotsav / National Flag Emblem */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 14px",
                borderRadius: 8,
                background: "linear-gradient(135deg, rgba(255,153,51,0.08), rgba(19,136,8,0.08))",
                border: "1px solid #e2e8f0",
              }}>
                <svg width="44" height="44" viewBox="0 0 100 100" fill="none">
                  {/* Stylized 75 with Ashoka Chakra and Tricolor Wave */}
                  <text x="6" y="58" fontSize="48" fontWeight="900" fill="#ff9933" fontFamily="'Inter', sans-serif">7</text>
                  <text x="44" y="58" fontSize="48" fontWeight="900" fill="#138808" fontFamily="'Inter', sans-serif">5</text>
                  {/* Ashoka Chakra */}
                  <circle cx="48" cy="34" r="8" stroke="#000080" strokeWidth="2" fill="none" />
                  <path d="M 48 26 L 48 42 M 40 34 L 56 34 M 42 28 L 54 40 M 42 40 L 54 28" stroke="#000080" strokeWidth="1" />
                  {/* Wave */}
                  <path d="M 6 74 Q 45 64 90 74" stroke="#ff9933" strokeWidth="4" fill="none" />
                  <path d="M 6 80 Q 45 70 90 80" stroke="#ffffff" strokeWidth="4" fill="none" />
                  <path d="M 6 86 Q 45 76 90 86" stroke="#138808" strokeWidth="4" fill="none" />
                </svg>
                <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
                  <span style={{ fontSize: "12px", fontWeight: 800, color: "#1e293b" }}>आज़ादी का अमृत महोत्सव</span>
                  <span style={{ fontSize: "9.5px", fontWeight: 700, color: "#64748b" }}>75 Years of Independence</span>
                  <span style={{ fontSize: "9px", fontWeight: 700, color: "#0066cc", marginTop: 2 }}>SMART INDIA HACKATHON 2026</span>
                </div>
              </div>
            </div>
          </header>

          {/* ═════════════════════════════════════════════════════════════ */}
          {/* 3. HORIZONTAL NAVIGATION BAR (Official Government Blue Bar)   */}
          {/* ═════════════════════════════════════════════════════════════ */}
          <nav style={{
            background: "linear-gradient(90deg, #0b7adc 0%, #0060c2 100%)",
            borderBottom: "2px solid #004c99",
            display: "flex",
            alignItems: "stretch",
            justifyContent: "space-between",
            padding: "0 24px",
            minHeight: "46px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            position: "sticky",
            top: 0,
            zIndex: 40,
          }}>
            {/* Left Nav Menu with Home Icon & Tabs */}
            <div style={{ display: "flex", alignItems: "stretch" }}>
              {/* Home Icon Button */}
              <Link
                href="/"
                title="Home Dashboard"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 18px",
                  background: pathname === "/" ? "#004c99" : "transparent",
                  color: "#ffffff",
                  textDecoration: "none",
                  borderRight: "1px solid rgba(255,255,255,0.2)",
                  transition: "background 0.2s ease",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
                </svg>
              </Link>

              {/* Horizontal Tabs */}
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "0 18px",
                      color: "#ffffff",
                      textDecoration: "none",
                      fontSize: "12.5px",
                      fontWeight: isActive ? 700 : 600,
                      letterSpacing: "0.2px",
                      background: isActive ? "#004c99" : "transparent",
                      borderRight: "1px solid rgba(255,255,255,0.18)",
                      borderBottom: isActive ? "3px solid #ffde59" : "3px solid transparent",
                      transition: "all 0.2s ease",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Right Status & Emergency Dispatch Badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(0,0,0,0.25)",
                padding: "5px 12px",
                borderRadius: 4,
                fontSize: "11px",
                fontWeight: 700,
                color: "#a7f3d0",
                fontFamily: "'JetBrains Mono', monospace",
                border: "1px solid rgba(167,243,208,0.25)",
              }}>
                <span style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: "#10b981",
                  boxShadow: "0 0 8px #10b981",
                  display: "inline-block"
                }} />
                <span>MHA RADAR: 12,000 ATMS ACTIVE</span>
              </div>

              <Link
                href="/predict"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 14px",
                  background: "#dc2626",
                  color: "#ffffff",
                  borderRadius: 4,
                  fontSize: "11px",
                  fontWeight: 700,
                  textDecoration: "none",
                  letterSpacing: "0.5px",
                  boxShadow: "0 2px 6px rgba(220,38,38,0.4)",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                <span>RAPID DISPATCH</span>
              </Link>
            </div>
          </nav>

          {/* ═════════════════════════════════════════════════════════════ */}
          {/* 4. MAIN OPERATIONS CENTER BODY                                */}
          {/* ═════════════════════════════════════════════════════════════ */}
          <main style={{
            flex: 1,
            width: "100%",
            maxWidth: "1680px",
            margin: "0 auto",
            padding: "24px 28px",
          }}>
            {children}
          </main>

          {/* ═════════════════════════════════════════════════════════════ */}
          {/* 5. OFFICIAL GOVERNMENT FOOTER                                 */}
          {/* ═════════════════════════════════════════════════════════════ */}
          <footer style={{
            background: "#080c14",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            padding: "16px 28px",
            marginTop: "auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "11px",
            color: "var(--text-muted)",
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            <div>
              <span>CrimeShield AI © 2026 • Ministry of Home Affairs • Smart India Hackathon (Team CTRL Z)</span>
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              <span>CFCFRMS / NPCI Integrated</span>
              <span>•</span>
              <span>XGBoost Cashout Forecast Engine v2.0</span>
            </div>
          </footer>

        </div>
      </body>
    </html>
  );
}

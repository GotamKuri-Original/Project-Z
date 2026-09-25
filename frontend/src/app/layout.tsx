"use client";

import "./globals.css";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { href: "/predict", label: "Predict", icon: "M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" },
  { href: "/map", label: "Risk Map", icon: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" },
  { href: "/network", label: "Network", icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" },
  { href: "/complaints", label: "Cases", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
];

function NavIcon({ path, active }: { path: string; active: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke={active ? "var(--purple)" : "var(--text-muted)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transition: "stroke 0.3s ease" }}>
      <path d={path} />
    </svg>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <title>CrimeShield AI — Cyber Operations Center</title>
        <meta name="description" content="Predictive Analytics for Cybercrime — Team CTRL Z — SIH 2026" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div style={{ display: "flex", minHeight: "100vh", position: "relative", zIndex: 1 }}>
          {/* Ultra-Slim Icon Dock */}
          <aside style={{
            width: 68, flexShrink: 0, position: "fixed", height: "100vh", zIndex: 50,
            display: "flex", flexDirection: "column", alignItems: "center",
            background: "var(--bg-secondary)", borderRight: "1px solid var(--border-color)",
          }}>
            {/* Logo Mark */}
            <div style={{
              width: 38, height: 38, borderRadius: 10, marginTop: 16, marginBottom: 20,
              background: "linear-gradient(135deg, var(--violet), var(--blue))",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 15, fontWeight: 900, color: "#fff", letterSpacing: -0.5,
              boxShadow: "0 2px 10px rgba(109, 40, 217, 0.4)"
            }}>
              CS
            </div>

            {/* Nav Icons */}
            <nav style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href} title={item.label} style={{
                    width: 44, height: 44, borderRadius: 12,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: isActive ? "rgba(139, 92, 246, 0.15)" : "transparent",
                    border: isActive ? "1px solid rgba(139, 92, 246, 0.3)" : "1px solid transparent",
                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    textDecoration: "none",
                    boxShadow: isActive ? "0 4px 12px rgba(139, 92, 246, 0.1)" : "none",
                  }}>
                    <NavIcon path={item.icon} active={isActive} />
                  </Link>
                );
              })}
            </nav>

            {/* Bottom Status */}
            <div style={{
              marginBottom: 16, width: 8, height: 8, borderRadius: "50%",
              background: "var(--green)", boxShadow: "0 0 10px rgba(16,185,129,0.6)",
            }} title="System Online" />
          </aside>

          {/* Main Content */}
          <main style={{ marginLeft: 68, flex: 1, padding: "24px 32px", minHeight: "100vh" }}>
            {/* Top Bar */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              marginBottom: 24, paddingBottom: 16,
              borderBottom: "1px solid var(--border-color)",
            }}>
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.5, color: "var(--text-primary)" }}>
                  CrimeShield AI
                </h1>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>
                  SIH26184 • Ministry of Home Affairs • Team CTRL Z
                </p>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{
                  padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                  fontFamily: "'JetBrains Mono', monospace",
                  background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)",
                  color: "var(--green)", textTransform: "uppercase", letterSpacing: "1px",
                  boxShadow: "0 2px 8px rgba(16,185,129,0.15)"
                }}>
                  ● LIVE
                </span>
              </div>
            </div>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

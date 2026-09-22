"use client";

import "./globals.css";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { href: "/predict", label: "Threat Predict", icon: "M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" },
  { href: "/map", label: "Risk Map", icon: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" },
  { href: "/network", label: "Network Intel", icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" },
  { href: "/complaints", label: "Case Files", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
];

function NavIcon({ path, active }: { path: string; active: boolean }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke={active ? "#06d6a0" : "#64748b"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <html lang="en">
      <head>
        <title>CrimeShield AI — Command Center</title>
        <meta name="description" content="Predictive Analytics for Cybercrime — Team CTRL Z — SIH 2026" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div style={{ display: "flex", minHeight: "100vh", position: "relative", zIndex: 1 }}>
          {/* Sidebar */}
          <aside className="sidebar" style={{ width: 260, flexShrink: 0, position: "fixed", height: "100vh", zIndex: 50, display: "flex", flexDirection: "column" }}>
            {/* Logo */}
            <div style={{ padding: "24px 20px", borderBottom: "1px solid rgba(56,189,248,0.08)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: "linear-gradient(135deg, #06d6a0, #38bdf8)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, fontWeight: 900, color: "#060918"
                }}>
                  CS
                </div>
                <div>
                  <h1 style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.5 }} className="gradient-text">
                    CrimeShield AI
                  </h1>
                  <p style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>COMMAND CENTER v1.0</p>
                </div>
              </div>
            </div>

            {/* Nav Links */}
            <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-link ${pathname === item.href ? "active" : ""}`}
                >
                  <NavIcon path={item.icon} active={pathname === item.href} />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>

            {/* Bottom Section */}
            <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(56,189,248,0.08)" }}>
              <div className="live-pulse" style={{ fontSize: 12, color: "#0be881", marginBottom: 8 }}>
                System Online
              </div>
              <div style={{ fontSize: 10, color: "#334155", lineHeight: 1.6 }}>
                <p>SIH 2026 • SIH26184</p>
                <p>Ministry of Home Affairs</p>
                <p style={{ marginTop: 4, color: "#475569" }}>Team CTRL Z</p>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main style={{ marginLeft: 260, flex: 1, padding: "28px 32px", minHeight: "100vh" }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

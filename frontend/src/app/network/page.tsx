"use client";

import { useEffect, useRef, useState } from "react";
import { getNetwork, getGangs } from "@/lib/api";

interface Gang {
  gang_id: string;
  mastermind: string;
  member_count: number;
  total_cases: number;
}

interface NetworkStats {
  total_nodes: number;
  total_edges: number;
  top_kingpin: string;
}

export default function NetworkPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [gangs, setGangs] = useState<Gang[]>([]);
  const [selectedGang, setSelectedGang] = useState("");
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGangs().then((d) => setGangs(d.gangs || [])).catch(console.error);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    setLoading(true);

    getNetwork(selectedGang || undefined)
      .then(async (data) => {
        setStats(data.stats);
        const { Network } = await import("vis-network");
        const { DataSet } = await import("vis-data");

        const roleColors: Record<string, string> = {
          mastermind: "#ff4757", caller: "#ff9f43",
          mule_recruiter: "#ffd32a", cash_puller: "#38bdf8", mule_account: "#06d6a0",
        };

        const nodes = new DataSet(data.nodes.map((n: Record<string, unknown>) => ({
          id: n.id, label: n.label,
          color: {
            background: roleColors[n.role as string] || "#06d6a0",
            border: roleColors[n.role as string] || "#06d6a0",
            highlight: { background: "#fff", border: roleColors[n.role as string] || "#06d6a0" },
          },
          shadow: { enabled: true, color: roleColors[n.role as string] || "#06d6a0", size: 15, x: 0, y: 0 },
          size: n.size,
          font: { color: "#cbd5e1", size: 10, face: "Inter", strokeWidth: 2, strokeColor: "#0a0a0a" },
          title: `${String(n.role).toUpperCase()} | ${n.city} | Risk: ${n.risk}`,
        })));

        const edges = new DataSet(data.edges.map((e: Record<string, unknown>, i: number) => ({
          id: i, from: e.from, to: e.to,
          color: { color: "rgba(255,255,255,0.15)", highlight: "#06d6a0", hover: "#fff" },
          width: e.relation === "commands" ? 2.5 : 1,
          dashes: e.relation === "controls",
          smooth: { type: "continuous" },
        })));

        if (!containerRef.current) return;
        new Network(containerRef.current, { nodes: nodes as unknown as import("vis-network").Node[], edges: edges as unknown as import("vis-network").Edge[] }, {
          physics: { 
            solver: "forceAtlas2Based",
            forceAtlas2Based: { gravitationalConstant: -120, centralGravity: 0.015, springLength: 100, springConstant: 0.08 },
            stabilization: { iterations: 150, fit: true },
          },
          interaction: { hover: true, tooltipDelay: 100, zoomSpeed: 0.5 },
          nodes: { shape: "dot", borderWidth: 2 },
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedGang]);

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>Criminal Network Intelligence</h1>
          <p style={{ color: "#475569", marginTop: 4, fontSize: 14 }}>
            Graph analysis powered by PageRank — identifying kingpins and mule networks
          </p>
        </div>
        <select value={selectedGang} onChange={(e) => setSelectedGang(e.target.value)} className="input-field" style={{ width: 300 }}>
          <option value="">Full Network View</option>
          {gangs.slice(0, 20).map((g: Gang) => (
            <option key={g.gang_id} value={g.gang_id}>{g.gang_id} — {g.mastermind} ({g.member_count} members, {g.total_cases} cases)</option>
          ))}
        </select>
      </div>

      {/* Graph Container */}
      <div className="glass-card" style={{ position: "relative", height: "75vh", overflow: "hidden", borderRadius: 16, border: "1px solid rgba(255,255,255,0.05)" }}>
        
        {/* Floating Stats Overlay */}
        {stats && (
          <div style={{ position: "absolute", top: 20, left: 20, zIndex: 5, display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="glass-card" style={{ padding: "12px 20px", background: "rgba(10,10,15,0.85)", backdropFilter: "blur(12px)", borderLeft: "3px solid #06d6a0" }}>
              <p style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, fontFamily: "'JetBrains Mono', monospace" }}>Nodes</p>
              <p style={{ fontSize: 24, fontWeight: 800, color: "#06d6a0", fontFamily: "'JetBrains Mono', monospace" }}>{stats.total_nodes}</p>
            </div>
            <div className="glass-card" style={{ padding: "12px 20px", background: "rgba(10,10,15,0.85)", backdropFilter: "blur(12px)", borderLeft: "3px solid #38bdf8" }}>
              <p style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, fontFamily: "'JetBrains Mono', monospace" }}>Connections</p>
              <p style={{ fontSize: 24, fontWeight: 800, color: "#38bdf8", fontFamily: "'JetBrains Mono', monospace" }}>{stats.total_edges}</p>
            </div>
            <div className="glass-card" style={{ padding: "12px 20px", background: "rgba(10,10,15,0.85)", backdropFilter: "blur(12px)", borderLeft: "3px solid #ff4757" }}>
              <p style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, fontFamily: "'JetBrains Mono', monospace" }}>Top Kingpin</p>
              <p style={{ fontSize: 16, fontWeight: 800, color: "#ff4757", fontFamily: "'JetBrains Mono', monospace" }}>{stats.top_kingpin || "N/A"}</p>
            </div>
          </div>
        )}

        {/* Floating Legend Overlay */}
        <div className="glass-card" style={{ 
          position: "absolute", bottom: 20, left: 20, zIndex: 5, 
          background: "rgba(10,10,15,0.85)", backdropFilter: "blur(12px)", 
          padding: "16px 20px", borderRadius: 12, display: "flex", gap: 20, 
          fontSize: 12, color: "#94a3b8", fontFamily: "'JetBrains Mono', monospace" 
        }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff4757", boxShadow: "0 0 8px #ff4757" }} /> Mastermind</span>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff9f43", boxShadow: "0 0 8px #ff9f43" }} /> Caller</span>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ffd32a", boxShadow: "0 0 8px #ffd32a" }} /> Mule Recruiter</span>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#38bdf8", boxShadow: "0 0 8px #38bdf8" }} /> Cash Puller</span>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#06d6a0", boxShadow: "0 0 8px #06d6a0" }} /> Mule Account</span>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(6,9,24,0.7)", zIndex: 10, backdropFilter: "blur(4px)" }}>
            <div className="spinner" />
          </div>
        )}
        
        {/* Vis.js Canvas */}
        <div ref={containerRef} style={{ height: "100%", width: "100%", background: "radial-gradient(circle at center, rgba(30,41,59,0.4) 0%, rgba(15,23,42,0) 70%)" }} />
      </div>
    </div>
  );
}

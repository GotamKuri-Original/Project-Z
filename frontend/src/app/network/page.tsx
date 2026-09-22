"use client";

import { useEffect, useRef, useState } from "react";
import { getNetwork, getGangs } from "@/lib/api";

export default function NetworkPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [gangs, setGangs] = useState<any[]>([]);
  const [selectedGang, setSelectedGang] = useState("");
  const [stats, setStats] = useState<any>(null);
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

        const nodes = new DataSet<any, any>(data.nodes.map((n: any) => ({
          id: n.id, label: n.label,
          color: {
            background: roleColors[n.role] || "#06d6a0",
            border: roleColors[n.role] || "#06d6a0",
            highlight: { background: "#fff", border: roleColors[n.role] || "#06d6a0" },
          },
          size: n.size,
          font: { color: "#cbd5e1", size: 9, face: "Inter" },
          title: `${n.role.toUpperCase()} | ${n.city} | Risk: ${n.risk}`,
        })));

        const edges = new DataSet<any, any>(data.edges.map((e: any, i: number) => ({
          id: i, from: e.from, to: e.to,
          color: { color: "rgba(56,189,248,0.12)", highlight: "#06d6a0" },
          width: e.relation === "commands" ? 2.5 : 1,
          dashes: e.relation === "controls",
          smooth: { type: "continuous" },
        })));

        new Network(containerRef.current!, { nodes: nodes as any, edges: edges as any }, {
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
          {gangs.slice(0, 20).map((g: any) => (
            <option key={g.gang_id} value={g.gang_id}>{g.gang_id} — {g.mastermind} ({g.member_count} members, {g.total_cases} cases)</option>
          ))}
        </select>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
          <div className="glass-card stat-card cyan" style={{ padding: "14px 18px", textAlign: "center" }}>
            <p style={{ fontSize: 28, fontWeight: 800, color: "#06d6a0" }}>{stats.total_nodes}</p>
            <p style={{ fontSize: 11, color: "#64748b" }}>Nodes</p>
          </div>
          <div className="glass-card stat-card blue" style={{ padding: "14px 18px", textAlign: "center" }}>
            <p style={{ fontSize: 28, fontWeight: 800, color: "#38bdf8" }}>{stats.total_edges}</p>
            <p style={{ fontSize: 11, color: "#64748b" }}>Connections</p>
          </div>
          <div className="glass-card stat-card red" style={{ padding: "14px 18px", textAlign: "center" }}>
            <p style={{ fontSize: 18, fontWeight: 800, color: "#ff4757" }}>{stats.top_kingpin || "N/A"}</p>
            <p style={{ fontSize: 11, color: "#64748b" }}>Top Kingpin (PageRank)</p>
          </div>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginBottom: 12, fontSize: 12, color: "#64748b", flexWrap: "wrap" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff4757", display: "inline-block" }} /> Mastermind</span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff9f43", display: "inline-block" }} /> Caller</span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ffd32a", display: "inline-block" }} /> Mule Recruiter</span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: "#38bdf8", display: "inline-block" }} /> Cash Puller</span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: "#06d6a0", display: "inline-block" }} /> Mule Account</span>
      </div>

      {/* Graph */}
      <div className="glass-card" style={{ overflow: "hidden", height: "60vh", position: "relative" }}>
        {loading && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(6,9,24,0.8)", zIndex: 10 }}>
            <div className="spinner" />
          </div>
        )}
        <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
      </div>
    </div>
  );
}

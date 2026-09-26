"use client";

import { useEffect, useRef, useState } from "react";
import type { Data, Edge, Network as VisNetwork, Node, Options } from "vis-network";
import type { DataSet as VisDataSet } from "vis-data";
import { getNetwork, getGangs } from "@/lib/api";
import { usePolling, keepIfEqual } from "@/hooks/usePolling";

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

interface ApiNode {
  id: string;
  label: string;
  role: string;
  city: string;
  risk: number | string;
  size: number;
}

interface ApiEdge {
  from: string;
  to: string;
  relation: string;
}

interface NetworkResponse {
  nodes: ApiNode[];
  edges: ApiEdge[];
  stats: NetworkStats;
}

type VisNode = Node & { id: string };
type VisEdge = Edge & { id: string };

const ROLE_COLORS: Record<string, string> = {
  mastermind: "#ff4757",
  caller: "#ff9f43",
  mule_recruiter: "#ffd32a",
  cash_puller: "#38bdf8",
  mule_account: "#06d6a0",
};

const NETWORK_OPTIONS: Options = {
  physics: {
    solver: "forceAtlas2Based",
    forceAtlas2Based: { gravitationalConstant: -120, centralGravity: 0.015, springLength: 100, springConstant: 0.08 },
    stabilization: { iterations: 150, fit: true },
  },
  interaction: { hover: true, tooltipDelay: 100, zoomSpeed: 0.5 },
  nodes: { shape: "dot", borderWidth: 2 },
};

function toVisNode(n: ApiNode): VisNode {
  const color = ROLE_COLORS[n.role] || "#06d6a0";
  return {
    id: n.id,
    label: n.label,
    color: {
      background: color,
      border: color,
      highlight: { background: "#fff", border: color }
    },
    shadow: { enabled: true, color, size: 15, x: 0, y: 0 },
    size: n.size,
    font: { color: "#cbd5e1", size: 10, face: "Inter", strokeWidth: 2, strokeColor: "#0a0a0a" },
    title: `${String(n.role).toUpperCase()} | ${n.city} | Risk: ${n.risk}`,
  };
}

function toVisEdges(edges: ApiEdge[]): VisEdge[] {
  const seen = new Map<string, number>();
  return edges.map((e) => {
    const base = `${e.from}->${e.to}:${e.relation}`;
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return {
      id: n ? `${base}#${n}` : base,
      from: e.from,
      to: e.to,
      color: { color: "rgba(255,255,255,0.15)", highlight: "#06d6a0", hover: "#fff" },
      width: e.relation === "commands" ? 2.5 : 1,
      dashes: e.relation === "controls",
      smooth: { enabled: true, type: "continuous", roundness: 0.5 },
    };
  });
}

function syncDataSet<T extends { id: string }>(dataSet: VisDataSet<T>, next: T[]) {
  const nextIds = new Set(next.map((item) => item.id));
  const staleIds = dataSet.getIds().filter((id) => !nextIds.has(String(id)));
  if (staleIds.length > 0) dataSet.remove(staleIds);
  dataSet.update(next as any);
}

export default function NetworkPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<VisNetwork | null>(null);
  const nodesRef = useRef<VisDataSet<VisNode> | null>(null);
  const edgesRef = useRef<VisDataSet<VisEdge> | null>(null);
  const signatureRef = useRef("");
  const renderedGangRef = useRef<string | null>(null);

  const [gangs, setGangs] = useState<Gang[]>([]);
  const [selectedGang, setSelectedGang] = useState("");
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [renderedGang, setRenderedGang] = useState<string | null>(null);

  const loading = renderedGang !== selectedGang;

  useEffect(() => {
    return () => {
      networkRef.current?.destroy();
      networkRef.current = null;
    };
  }, []);

  usePolling(async (isActive) => {
    const d = await getGangs();
    if (isActive()) setGangs((prev) => keepIfEqual(prev, d.gangs || []));
  });

  usePolling(
    async (isActive) => {
      const gang = selectedGang;
      const data: NetworkResponse = await getNetwork(gang || undefined);
      if (!isActive()) return;

      setStats((prev) => keepIfEqual(prev, data.stats));

      const container = containerRef.current;
      if (!container) return;

      const isNewView = renderedGangRef.current !== gang;
      const signature = JSON.stringify([data.nodes, data.edges]);

      if (!isNewView && signature === signatureRef.current) return;

      const nodes = data.nodes.map(toVisNode);
      const edges = toVisEdges(data.edges);

      const [{ Network }, { DataSet }] = await Promise.all([import("vis-network"), import("vis-data")]);

      if (!isActive()) return;

      if (!networkRef.current || isNewView || !nodesRef.current || !edgesRef.current) {
        nodesRef.current = new DataSet<VisNode>(nodes);
        edgesRef.current = new DataSet<VisEdge>(edges);

        const graph = { nodes: nodesRef.current, edges: edgesRef.current } as unknown as Data;
        if (networkRef.current) networkRef.current.setData(graph);
        else networkRef.current = new Network(container, graph, NETWORK_OPTIONS);
      } else {
        syncDataSet(nodesRef.current, nodes);
        syncDataSet(edgesRef.current, edges);
      }

      signatureRef.current = signature;
      renderedGangRef.current = gang;
      setRenderedGang(gang);
    },
    { intervalMs: 5000, resetKey: selectedGang },
  );

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

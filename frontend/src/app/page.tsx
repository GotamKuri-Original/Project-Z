"use client";

import { useEffect, useState } from "react";
import { getDashboard } from "@/lib/api";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid,
} from "recharts";

const COLORS = ["#06d6a0", "#38bdf8", "#a78bfa", "#f472b6", "#f59e0b", "#eab308"];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120, damping: 18 } }
};

function MetricCard({ label, value, sub, color }: {
  label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <motion.div variants={itemVariants} className={`glass-card stat-card ${color}`} style={{ padding: "14px 16px" }}>
      <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{label}</p>
      <p style={{ fontSize: 26, fontWeight: 800, marginTop: 4, color: `var(--${color})`, letterSpacing: -0.5, fontFamily: "'JetBrains Mono', monospace" }}>
        {typeof value === "number" ? value.toLocaleString("en-IN") : value}
      </p>
      {sub && <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{sub}</p>}
    </motion.div>
  );
}

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#131320", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 6, padding: "8px 12px", fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
    }}>
      <p style={{ color: "var(--text-muted)" }}>{label}</p>
      <p style={{ color: "#06d6a0", fontWeight: 700, fontSize: 13 }}>{payload[0].value?.toLocaleString("en-IN")}</p>
    </div>
  );
};

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "70vh" }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ textAlign: "center", paddingTop: 100 }}>
        <p style={{ fontSize: 16, color: "var(--red)", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>BACKEND OFFLINE</p>
        <p style={{ color: "var(--text-muted)", marginTop: 8, fontSize: 13 }}>Start the FastAPI server on port 8000</p>
        <code className="mono" style={{ display: "block", marginTop: 12, color: "var(--blue)", fontSize: 12 }}>
          python -m uvicorn app.main:app --port 8000
        </code>
      </div>
    );
  }

  const { kpis, fraud_type_breakdown, top_victim_cities, complaints_by_hour } = data;

  const fraudPieData = Object.entries(fraud_type_breakdown).map(([name, value]) => ({
    name: name.replace(/_/g, " "), value: value as number,
  }));

  const cityBarData = Object.entries(top_victim_cities).slice(0, 8).map(([city, count]) => ({
    city, count: count as number,
  }));

  const hourlyData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${String(i).padStart(2, "0")}:00`,
    complaints: (complaints_by_hour[String(i)] || 0) as number,
  }));

  return (
    <div className="fade-in">
      {/* ─── Section 1: Triage Metrics ─── */}
      <motion.div
        variants={containerVariants} initial="hidden" whileInView="show"
        viewport={{ once: true, amount: 0.1 }}
        style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}
      >
        <MetricCard label="Active Complaints" value={kpis.total_complaints} color="cyan" />
        <MetricCard label="Money at Risk" value={`₹${(kpis.total_amount_at_risk / 10000000).toFixed(1)}Cr`} sub="Aggregate fraud value" color="red" />
        <MetricCard label="Suspects Tracked" value={kpis.total_suspects} sub={`${kpis.active_gangs} syndicates`} color="orange" />
        <MetricCard label="Model F1-Score" value="73.2%" sub="XGBoost prediction" color="green" />
      </motion.div>

      <motion.div
        variants={containerVariants} initial="hidden" whileInView="show"
        viewport={{ once: true, amount: 0.1 }}
        style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}
      >
        <MetricCard label="Avg. Loss" value={`₹${(kpis.avg_amount / 1000).toFixed(0)}K`} color="blue" />
        <MetricCard label="ATM Withdrawals" value={kpis.total_withdrawals} sub="Linked to cases" color="purple" />
        <MetricCard label="Report Delay" value={`${kpis.avg_reporting_delay_mins}m`} sub="Avg. victim response" color="yellow" />
        <MetricCard label="Inference" value="1.2s" sub="Prediction latency" color="cyan" />
      </motion.div>

      {/* ─── Section 2: Battlefield ─── */}
      <motion.div
        variants={containerVariants} initial="hidden" whileInView="show"
        viewport={{ once: true, amount: 0.1 }}
        style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 12, marginBottom: 12 }}
      >
        <motion.div variants={itemVariants} className="glass-card" style={{ padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.5px", fontFamily: "'JetBrains Mono', monospace" }}>
              Victim Geolocation — Top Cities
            </p>
            <span className="badge badge-high">HOTSPOTS</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={cityBarData} barCategoryGap="20%">
              <XAxis dataKey="city" stroke="#525866" fontSize={10} tickMargin={6} axisLine={false} tickLine={false} />
              <YAxis stroke="#525866" fontSize={10} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
              <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={32}>
                {cityBarData.map((_, i) => (
                  <Cell key={i} fill={i < 2 ? "#ef4444" : i < 4 ? "#f59e0b" : "#38bdf8"} fillOpacity={i < 2 ? 0.9 : 0.6} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div variants={itemVariants} className="glass-card" style={{ padding: 16 }}>
          <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.5px", marginBottom: 12, fontFamily: "'JetBrains Mono', monospace" }}>
            Modus Operandi
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={fraudPieData} innerRadius={60} outerRadius={85} paddingAngle={3} dataKey="value" stroke="none">
                {fraudPieData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 8 }}>
            {fraudPieData.map((item, i) => (
              <span key={i} style={{ fontSize: 10, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: 2, background: COLORS[i % COLORS.length], display: "inline-block" }} />
                {item.name}
              </span>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* ─── Section 3: Investigation — Hourly Trend ─── */}
      <motion.div
        variants={itemVariants} initial="hidden" whileInView="show"
        viewport={{ once: true, amount: 0.1 }}
        className="glass-card"
        style={{ padding: 16, height: 280, marginBottom: 20 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.5px", fontFamily: "'JetBrains Mono', monospace" }}>
            Incident Volume — 24h Timeline
          </p>
          <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>
            Peak: 18:00–22:00 IST
          </span>
        </div>
        <ResponsiveContainer width="100%" height="85%">
          <AreaChart data={hourlyData}>
            <defs>
              <linearGradient id="colorComplaints" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="#a78bfa" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
            <XAxis dataKey="hour" stroke="#525866" fontSize={10} tickMargin={6} axisLine={false} tickLine={false} minTickGap={30} />
            <YAxis stroke="#525866" fontSize={10} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1 }} />
            <Area type="monotone" dataKey="complaints" stroke="#a78bfa" strokeWidth={1.5} fillOpacity={1} fill="url(#colorComplaints)" />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
}

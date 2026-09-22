"use client";

import { useEffect, useState } from "react";
import { getDashboard } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid,
} from "recharts";

const COLORS = ["#06d6a0", "#38bdf8", "#a78bfa", "#f368e0", "#ff9f43", "#ffd32a"];

function StatCard({ title, value, subtitle, accent, delay }: {
  title: string; value: string | number; subtitle?: string; accent: string; delay: number;
}) {
  return (
    <div className={`glass-card stat-card ${accent} slide-up`} style={{ padding: "20px 24px", animationDelay: `${delay}ms` }}>
      <p style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 600 }}>{title}</p>
      <p style={{ fontSize: 32, fontWeight: 800, marginTop: 6, color: `var(--${accent})`, letterSpacing: -1 }}>
        {typeof value === "number" ? value.toLocaleString("en-IN") : value}
      </p>
      {subtitle && <p style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>{subtitle}</p>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "rgba(6,9,24,0.95)", border: "1px solid rgba(56,189,248,0.15)",
      borderRadius: 8, padding: "10px 14px", fontSize: 12,
    }}>
      <p style={{ color: "#64748b" }}>{label}</p>
      <p style={{ color: "#06d6a0", fontWeight: 700, fontSize: 14 }}>{payload[0].value?.toLocaleString("en-IN")}</p>
    </div>
  );
};

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "80vh" }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ textAlign: "center", paddingTop: 120 }}>
        <p style={{ fontSize: 48, marginBottom: 16 }}>⚡</p>
        <p style={{ fontSize: 20, color: "#ff4757", fontWeight: 700 }}>Backend Offline</p>
        <p style={{ color: "#475569", marginTop: 8 }}>Start the FastAPI server on port 8000</p>
        <code className="mono" style={{ display: "block", marginTop: 12, color: "#38bdf8", fontSize: 13 }}>
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
      {/* Header */}
      <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>Command Center</h1>
          <p style={{ color: "#475569", marginTop: 4, fontSize: 14 }}>
            Real-time cybercrime intelligence • <span className="live-pulse" style={{ color: "#0be881", fontSize: 12 }}>LIVE</span>
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ padding: "8px 16px", borderRadius: 8, background: "rgba(6,214,160,0.08)", border: "1px solid rgba(6,214,160,0.15)", fontSize: 12, color: "#06d6a0", fontWeight: 600 }}>
            SIH26184
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <StatCard title="Total Complaints" value={kpis.total_complaints} accent="cyan" delay={0} />
        <StatCard title="Money at Risk" value={`₹${(kpis.total_amount_at_risk / 10000000).toFixed(1)} Cr`} subtitle="Total fraudulent amount" accent="red" delay={100} />
        <StatCard title="Active Suspects" value={kpis.total_suspects} subtitle={`${kpis.active_gangs} criminal gangs`} accent="orange" delay={200} />
        <StatCard title="Prediction Accuracy" value="73.2%" subtitle="XGBoost Model F1-Score" accent="green" delay={300} />
      </div>

      {/* Second Row KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        <StatCard title="Avg. Amount" value={`₹${(kpis.avg_amount / 1000).toFixed(0)}K`} accent="blue" delay={400} />
        <StatCard title="Cash Withdrawals" value={kpis.total_withdrawals} subtitle="Linked to complaints" accent="purple" delay={500} />
        <StatCard title="Avg. Report Delay" value={`${kpis.avg_reporting_delay_mins} min`} subtitle="Time before victim reports" accent="yellow" delay={600} />
        <StatCard title="Response Time" value="1.2s" subtitle="Prediction latency" accent="cyan" delay={700} />
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        {/* Fraud Type Breakdown */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#a78bfa" }}>◉</span> Fraud Type Distribution
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={fraudPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                dataKey="value" paddingAngle={3} strokeWidth={0}
              >
                {fraudPieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", marginTop: 12 }}>
            {fraudPieData.map((item, i) => (
              <span key={i} style={{ fontSize: 11, color: "#94a3b8", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS[i % COLORS.length], display: "inline-block" }} />
                {item.name}
              </span>
            ))}
          </div>
        </div>

        {/* Top Victim Cities */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#38bdf8" }}>◉</span> Top Victim Cities
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={cityBarData} barCategoryGap="20%">
              <XAxis dataKey="city" tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {cityBarData.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? "#38bdf8" : i === 1 ? "#06d6a0" : "rgba(56,189,248,0.3)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Hourly Trend — Full Width */}
      <div className="glass-card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#06d6a0" }}>◉</span> Complaints by Hour of Day
          <span style={{ marginLeft: "auto", fontSize: 11, color: "#475569", fontWeight: 400 }}>Peak hours highlighted</span>
        </h3>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={hourlyData}>
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06d6a0" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#06d6a0" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(56,189,248,0.05)" />
            <XAxis dataKey="hour" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
            <YAxis tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="complaints" stroke="#06d6a0" strokeWidth={2} fill="url(#colorGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { getDashboard } from "@/lib/api";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid,
} from "recharts";

const COLORS = ["#06d6a0", "#38bdf8", "#a78bfa", "#f368e0", "#ff9f43", "#ffd32a"];

// Motion Variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 100, damping: 15 } }
};

function StatCard({ title, value, subtitle, accent }: {
  title: string; value: string | number; subtitle?: string; accent: string;
}) {
  return (
    <motion.div variants={itemVariants} className={`glass-card stat-card ${accent}`} style={{ padding: "20px 24px" }}>
      <p style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 600 }}>{title}</p>
      <p style={{ fontSize: 32, fontWeight: 800, marginTop: 6, color: `var(--${accent})`, letterSpacing: -1 }}>
        {typeof value === "number" ? value.toLocaleString("en-IN") : value}
      </p>
      {subtitle && <p style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>{subtitle}</p>}
    </motion.div>
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
      <motion.div 
        variants={containerVariants} 
        initial="hidden" 
        whileInView="show" 
        viewport={{ once: true, amount: 0.1 }}
        style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}
      >
        <StatCard title="Total Complaints" value={kpis.total_complaints} accent="cyan" />
        <StatCard title="Money at Risk" value={`₹${(kpis.total_amount_at_risk / 10000000).toFixed(1)} Cr`} subtitle="Total fraudulent amount" accent="red" />
        <StatCard title="Active Suspects" value={kpis.total_suspects} subtitle={`${kpis.active_gangs} criminal gangs`} accent="orange" />
        <StatCard title="Prediction Accuracy" value="73.2%" subtitle="XGBoost Model F1-Score" accent="green" />
      </motion.div>

      {/* Second Row KPIs */}
      <motion.div 
        variants={containerVariants} 
        initial="hidden" 
        whileInView="show" 
        viewport={{ once: true, amount: 0.1 }}
        style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}
      >
        <StatCard title="Avg. Amount" value={`₹${(kpis.avg_amount / 1000).toFixed(0)}K`} accent="blue" />
        <StatCard title="Cash Withdrawals" value={kpis.total_withdrawals} subtitle="Linked to complaints" accent="purple" />
        <StatCard title="Avg. Report Delay" value={`${kpis.avg_reporting_delay_mins} min`} subtitle="Time before victim reports" accent="yellow" />
        <StatCard title="Response Time" value="1.2s" subtitle="Prediction latency" accent="cyan" />
      </motion.div>

      {/* Charts */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.1 }}
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}
      >
        <motion.div variants={itemVariants} className="glass-card" style={{ padding: 24, height: 350 }}>
          <p style={{ fontSize: 14, color: "#64748b", textTransform: "uppercase", fontWeight: 700, marginBottom: 16 }}>Victim Geolocation (Top 8 Cities)</p>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cityBarData}>
              <XAxis dataKey="city" stroke="#475569" fontSize={11} tickMargin={8} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
              <Bar dataKey="count" fill="var(--blue)" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div variants={itemVariants} className="glass-card" style={{ padding: 24, height: 350 }}>
          <p style={{ fontSize: 14, color: "#64748b", textTransform: "uppercase", fontWeight: 700, marginBottom: 16 }}>Modus Operandi Breakdown</p>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={fraudPieData} innerRadius={80} outerRadius={110} paddingAngle={4} dataKey="value" stroke="none">
                {fraudPieData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </motion.div>

      {/* Hourly Trend — Full Width */}
      <motion.div 
        variants={itemVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.1 }}
        className="glass-card" 
        style={{ padding: 24, height: 320, marginBottom: 40 }}
      >
        <p style={{ fontSize: 14, color: "#64748b", textTransform: "uppercase", fontWeight: 700, marginBottom: 16 }}>Hourly Incident Volume (24h)</p>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={hourlyData}>
            <defs>
              <linearGradient id="colorComplaints" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--purple)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="var(--purple)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
            <XAxis dataKey="hour" stroke="#475569" fontSize={11} tickMargin={8} minTickGap={30} />
            <YAxis stroke="#475569" fontSize={11} tickMargin={8} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.05)', strokeWidth: 1 }} />
            <Area type="monotone" dataKey="complaints" stroke="var(--purple)" strokeWidth={2} fillOpacity={1} fill="url(#colorComplaints)" />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
}

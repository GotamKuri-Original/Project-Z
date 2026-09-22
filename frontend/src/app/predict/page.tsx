"use client";

import { useState } from "react";
import { predict } from "@/lib/api";

const FRAUD_TYPES = [
  { value: "UPI_FRAUD", label: "UPI Fraud", icon: "📱" },
  { value: "OTP_PHISHING", label: "OTP Phishing", icon: "🔑" },
  { value: "KYC_FRAUD", label: "KYC Fraud", icon: "🪪" },
  { value: "INVESTMENT_SCAM", label: "Investment Scam", icon: "📈" },
  { value: "SEXTORTION", label: "Sextortion", icon: "🔒" },
  { value: "COURIER_SCAM", label: "Courier Scam", icon: "📦" },
];

const CITIES = [
  { city: "Delhi", state: "Delhi" }, { city: "Mumbai", state: "Maharashtra" },
  { city: "Bangalore", state: "Karnataka" }, { city: "Hyderabad", state: "Telangana" },
  { city: "Chennai", state: "Tamil Nadu" }, { city: "Kolkata", state: "West Bengal" },
  { city: "Pune", state: "Maharashtra" }, { city: "Ahmedabad", state: "Gujarat" },
  { city: "Jaipur", state: "Rajasthan" }, { city: "Lucknow", state: "Uttar Pradesh" },
  { city: "Chandigarh", state: "Chandigarh" }, { city: "Patna", state: "Bihar" },
  { city: "Surat", state: "Gujarat" }, { city: "Indore", state: "Madhya Pradesh" },
  { city: "Kochi", state: "Kerala" },
];

export default function PredictPage() {
  const [form, setForm] = useState({
    fraud_type: "UPI_FRAUD", amount: 150000, victim_city: "Delhi",
    hour_of_day: 20, day_of_week: 3, reporting_delay_mins: 25,
  });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setShowResult(false);
    try {
      const cityData = CITIES.find((c) => c.city === form.victim_city);
      const res = await predict({ ...form, victim_state: cityData?.state || "Delhi" });
      setResult(res);
      setTimeout(() => setShowResult(true), 100);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const riskConfig: Record<string, { bg: string; border: string; color: string; glow: string }> = {
    CRITICAL: { bg: "rgba(255,71,87,0.08)", border: "rgba(255,71,87,0.3)", color: "#ff4757", glow: "0 0 30px rgba(255,71,87,0.15)" },
    HIGH: { bg: "rgba(255,159,67,0.08)", border: "rgba(255,159,67,0.3)", color: "#ff9f43", glow: "0 0 30px rgba(255,159,67,0.15)" },
    MEDIUM: { bg: "rgba(255,211,42,0.08)", border: "rgba(255,211,42,0.3)", color: "#ffd32a", glow: "0 0 30px rgba(255,211,42,0.15)" },
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>Threat Prediction Engine</h1>
        <p style={{ color: "#475569", marginTop: 4, fontSize: 14 }}>
          Enter complaint details → AI predicts cash withdrawal locations in real-time
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 24, alignItems: "start" }}>
        {/* Input Form */}
        <div className="glass-card" style={{ padding: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(56,189,248,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
              📝
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700 }}>Complaint Details</h3>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginBottom: 6, display: "block", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Fraud Type
              </label>
              <select value={form.fraud_type} onChange={(e) => setForm({ ...form, fraud_type: e.target.value })} className="input-field">
                {FRAUD_TYPES.map((ft) => (
                  <option key={ft.value} value={ft.value}>{ft.icon} {ft.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginBottom: 6, display: "block", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Amount Stolen (₹)
              </label>
              <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} className="input-field" />
            </div>

            <div>
              <label style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginBottom: 6, display: "block", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Victim City
              </label>
              <select value={form.victim_city} onChange={(e) => setForm({ ...form, victim_city: e.target.value })} className="input-field">
                {CITIES.map((c) => (
                  <option key={c.city} value={c.city}>{c.city}, {c.state}</option>
                ))}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginBottom: 6, display: "block", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Hour of Fraud
                </label>
                <input type="number" min={0} max={23} value={form.hour_of_day} onChange={(e) => setForm({ ...form, hour_of_day: Number(e.target.value) })} className="input-field" />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#64748b", fontWeight: 600, marginBottom: 6, display: "block", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Report Delay (min)
                </label>
                <input type="number" value={form.reporting_delay_mins} onChange={(e) => setForm({ ...form, reporting_delay_mins: Number(e.target.value) })} className="input-field" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: 8 }}>
              {loading ? "⏳ ANALYZING..." : "🔍 ANALYZE THREAT"}
            </button>
          </form>
        </div>

        {/* Results */}
        <div>
          {result && showResult ? (
            <div className="slide-up" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Risk Level Hero Card */}
              {(() => {
                const risk = riskConfig[result.prediction.risk_level] || riskConfig.MEDIUM;
                return (
                  <div style={{
                    background: risk.bg, border: `1px solid ${risk.border}`,
                    borderRadius: 16, padding: "28px 32px", boxShadow: risk.glow,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <p style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600 }}>
                          Threat Assessment
                        </p>
                        <p style={{ fontSize: 42, fontWeight: 900, color: risk.color, letterSpacing: -1, marginTop: 4 }}>
                          {result.prediction.risk_level}
                        </p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontSize: 12, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600 }}>
                          Confidence
                        </p>
                        <p style={{ fontSize: 42, fontWeight: 900, color: risk.color, letterSpacing: -1, marginTop: 4 }}>
                          {result.prediction.overall_confidence}%
                        </p>
                      </div>
                    </div>
                    <div style={{ marginTop: 16, padding: "10px 14px", background: "rgba(0,0,0,0.2)", borderRadius: 8, fontSize: 13, color: "#94a3b8" }}>
                      ⏱️ Estimated withdrawal window: <span style={{ color: "#e2e8f0", fontWeight: 600 }}>{result.prediction.estimated_withdrawal_window}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Action Card */}
              <div className="glass-card" style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 20 }}>🚨</span>
                  <div>
                    <p style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Recommended Action</p>
                    <p style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 500, marginTop: 2 }}>{result.recommended_action}</p>
                  </div>
                </div>
                <button
                  type="button"
                  style={{
                    background: "linear-gradient(135deg, #ff4757, #ff6b81)",
                    color: "white", padding: "10px 18px", borderRadius: 8, fontSize: 12,
                    fontWeight: 700, border: "none", cursor: "pointer",
                    boxShadow: "0 4px 15px rgba(255, 71, 87, 0.4)",
                    whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.5px"
                  }}
                  onClick={() => alert("✅ ALERT SUCCESSFULLY DISPATCHED TO CCTNS!\n\nNearest police patrol teams in predicted zones have been notified to monitor high-risk ATMs.")}
                >
                  📡 Dispatch Alert
                </button>
              </div>

              {/* Predicted Zones */}
              <div className="glass-card" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: "#ff4757" }}>◉</span> Predicted Withdrawal Zones
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {result.prediction.zones.map((zone: any, i: number) => {
                    const medals = ["🥇", "🥈", "🥉", "📍", "📍"];
                    const barWidth = `${zone.confidence}%`;
                    return (
                      <div key={i} style={{
                        background: "rgba(6,9,24,0.6)", borderRadius: 10, padding: "14px 16px",
                        border: i === 0 ? "1px solid rgba(255,71,87,0.2)" : "1px solid rgba(56,189,248,0.05)",
                        position: "relative", overflow: "hidden",
                      }}>
                        {/* Progress bar background */}
                        <div style={{
                          position: "absolute", top: 0, left: 0, bottom: 0,
                          width: barWidth,
                          background: i === 0 ? "rgba(255,71,87,0.06)" : "rgba(56,189,248,0.04)",
                          transition: "width 0.8s ease",
                        }} />
                        <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <p style={{ fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                              {medals[i]} {zone.city}, {zone.state}
                            </p>
                            <p style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{zone.num_high_risk_atms} high-risk ATMs identified</p>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <p style={{
                              fontSize: 20, fontWeight: 800,
                              color: zone.risk_level === "CRITICAL" ? "#ff4757" : zone.risk_level === "HIGH" ? "#ff9f43" : "#ffd32a",
                            }}>
                              {zone.confidence}%
                            </p>
                            <span className={`badge badge-${zone.risk_level.toLowerCase()}`}>{zone.risk_level}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card" style={{ padding: "80px 40px", textAlign: "center" }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>🎯</div>
              <p style={{ fontSize: 20, fontWeight: 700, color: "#e2e8f0" }}>Awaiting Threat Data</p>
              <p style={{ fontSize: 14, color: "#475569", marginTop: 8 }}>
                Fill in complaint details and click <span className="gradient-text" style={{ fontWeight: 700 }}>&quot;Analyze Threat&quot;</span>
              </p>
              <p style={{ fontSize: 12, color: "#334155", marginTop: 16 }}>
                AI will predict the most likely ATM zones where criminals will withdraw stolen funds
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

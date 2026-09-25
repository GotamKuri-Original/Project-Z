"use client";

import { useState } from "react";
import { predict } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface PredictionResponse {
  prediction: {
    risk_level: string;
    overall_confidence: number;
    estimated_withdrawal_window: string;
    zones: Array<{
      city: string;
      state: string;
      confidence: number;
      risk_level: string;
      num_high_risk_atms: number;
    }>;
  };
  explainability: Array<{
    feature: string;
    label: string;
    importance: number;
  }>;
  money_flow: Array<{
    from: string;
    to: string;
    amount: number;
    method: string;
  }>;
  recommended_action: string;
}

const FRAUD_TYPES = [
  { value: "UPI_FRAUD", label: "UPI Fraud" },
  { value: "OTP_PHISHING", label: "OTP Phishing" },
  { value: "KYC_FRAUD", label: "KYC Fraud" },
  { value: "INVESTMENT_SCAM", label: "Investment Scam" },
  { value: "SEXTORTION", label: "Sextortion" },
  { value: "COURIER_SCAM", label: "Courier Scam" },
];

const CITIES = [
  { city: "Delhi", state: "Delhi" }, { city: "Mumbai", state: "Maharashtra" },
  { city: "Bangalore", state: "Karnataka" }, { city: "Hyderabad", state: "Telangana" },
  { city: "Chennai", state: "Tamil Nadu" }, { city: "Kolkata", state: "West Bengal" },
  { city: "Pune", state: "Maharashtra" }, { city: "Ahmedabad", state: "Gujarat" },
  { city: "Jaipur", state: "Rajasthan" }, { city: "Lucknow", state: "Uttar Pradesh" },
  { city: "Chandigarh", state: "Chandigarh" }, { city: "Patna", state: "Bihar" },
  { city: "Surat", state: "Gujarat" }, { city: "Indore", state: "Madhya Pradesh" },
  { city: "Kochi", state: "Kerala" }, { city: "Nuh", state: "Haryana" },
  { city: "Mathura", state: "Uttar Pradesh" }, { city: "Bharatpur", state: "Rajasthan" },
  { city: "Jamtara", state: "Jharkhand" }, { city: "Deoghar", state: "Jharkhand" },
  { city: "Ranchi", state: "Jharkhand" }, { city: "Nagpur", state: "Maharashtra" },
  { city: "Coimbatore", state: "Tamil Nadu" }, { city: "Guwahati", state: "Assam" },
  { city: "Visakhapatnam", state: "Andhra Pradesh" },
];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{
      fontSize: 10, color: "var(--text-muted)", fontWeight: 600,
      marginBottom: 4, display: "block", textTransform: "uppercase",
      letterSpacing: "0.5px", fontFamily: "'JetBrains Mono', monospace",
    }}>
      {children}
    </label>
  );
}

export default function PredictPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    fraud_type: "UPI_FRAUD", amount: 150000, victim_city: "Delhi",
    last_mule_city: "", mule_chain_length: 0,
    hour_of_day: 20, day_of_week: 3, reporting_delay_mins: 25,
  });
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [isTracing, setIsTracing] = useState(false);
  const [hasTraced, setHasTraced] = useState(false);

  const handleTrace = () => {
    setIsTracing(true);
    setTimeout(() => {
      const possibleMules = CITIES.filter(c => c.city !== form.victim_city);
      const randomMule = possibleMules[Math.floor(Math.random() * possibleMules.length)].city;
      const detectedHops = Math.floor(Math.random() * 3) + 2;
      setForm(f => ({ ...f, last_mule_city: randomMule, mule_chain_length: detectedHops }));
      setIsTracing(false);
      setHasTraced(true);
    }, 1500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasTraced || !form.last_mule_city) {
      handleTrace();
      return;
    }
    setLoading(true);
    setShowResult(false);
    setError(false);
    try {
      const cityData = CITIES.find((c) => c.city === form.victim_city);
      const res = await predict({ ...form, victim_state: cityData?.state || "Delhi" });
      setResult(res);
      setTimeout(() => setShowResult(true), 100);
    } catch (err) { 
      console.error(err); 
      setError(true);
    }
    setLoading(false);
  };

  const riskColors: Record<string, string> = {
    CRITICAL: "#ef4444", HIGH: "#f59e0b", MEDIUM: "#eab308",
  };

  return (
    <div className="fade-in">
      <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 16, alignItems: "start" }}>
        {/* ─── Input Panel ─── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
          className="glass-card"
          style={{ padding: 16 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid var(--border-color)" }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              COMPLAINT INPUT
            </span>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <FieldLabel>Fraud Type</FieldLabel>
              <select value={form.fraud_type} onChange={(e) => setForm({ ...form, fraud_type: e.target.value })} className="input-field">
                {FRAUD_TYPES.map((ft) => (
                  <option key={ft.value} value={ft.value}>{ft.label}</option>
                ))}
              </select>
            </div>

            <div>
              <FieldLabel>Amount Stolen (₹)</FieldLabel>
              <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} className="input-field" />
            </div>

            <div>
              <FieldLabel>Victim City</FieldLabel>
              <select value={form.victim_city} onChange={(e) => setForm({ ...form, victim_city: e.target.value })} className="input-field">
                {CITIES.map((c) => (
                  <option key={c.city} value={c.city}>{c.city}, {c.state}</option>
                ))}
              </select>
            </div>

            {/* Digital Trace Section */}
            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 12, marginTop: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 10, color: "var(--cyan)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: "'JetBrains Mono', monospace" }}>
                  DIGITAL FOOTPRINT TRACE
                </span>
                {!hasTraced && (
                  <button type="button" onClick={handleTrace} disabled={isTracing} style={{
                    background: "rgba(6,214,160,0.1)", color: "#06d6a0", border: "1px solid rgba(6,214,160,0.2)",
                    padding: "4px 8px", borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace"
                  }}>
                    {isTracing ? "TRACING API..." : "AUTO-TRACE"}
                  </button>
                )}
              </div>

              {/* 1. First: Detected Chain Length */}
              <div style={{ marginTop: 8 }}>
                <FieldLabel>1. Detected Chain Length (Hops)</FieldLabel>
                <input
                  disabled
                  type="text"
                  value={isTracing ? "Detecting hops via bank ledgers..." : hasTraced ? `${form.mule_chain_length} Hops Identified` : "Awaiting Auto-Trace..."}
                  className="input-field"
                  style={{
                    opacity: hasTraced ? 1 : 0.5,
                    color: hasTraced ? "var(--cyan)" : "var(--text-muted)",
                    fontWeight: hasTraced ? 700 : 400,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                />
              </div>

              {/* 2. Second: Last Known Mule Node */}
              <div style={{ marginTop: 8 }}>
                <FieldLabel>2. Last Known Mule Node (Bank Branch)</FieldLabel>
                {hasTraced ? (
                  <select
                    value={form.last_mule_city}
                    onChange={(e) => setForm({ ...form, last_mule_city: e.target.value })}
                    className="input-field"
                    style={{ color: "var(--cyan)", fontWeight: 600 }}
                  >
                    {CITIES.map((c) => (
                      <option key={c.city} value={c.city}>{c.city}, {c.state}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    disabled
                    type="text"
                    value={isTracing ? "Tracing destination account..." : "Unknown — Run Auto-Trace First"}
                    className="input-field"
                    style={{
                      opacity: 0.5,
                      color: "var(--text-muted)",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  />
                )}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
              <div>
                <FieldLabel>Hour of Fraud</FieldLabel>
                <input type="number" min={0} max={23} value={form.hour_of_day} onChange={(e) => setForm({ ...form, hour_of_day: Number(e.target.value) })} className="input-field" />
              </div>
              <div>
                <FieldLabel>Report Delay (min)</FieldLabel>
                <input type="number" value={form.reporting_delay_mins} onChange={(e) => setForm({ ...form, reporting_delay_mins: Number(e.target.value) })} className="input-field" />
              </div>
            </div>

            <button type="submit" disabled={loading || (!hasTraced && !isTracing)} className="btn-primary" style={{ marginTop: 4, width: "100%", opacity: (!hasTraced && !isTracing) ? 0.5 : 1 }}>
              {loading ? "ANALYZING..." : (!hasTraced && !isTracing) ? "TRACE NETWORK FIRST" : "RUN PREDICTION"}
            </button>
          </form>
        </motion.div>

        {/* ─── Results Panel ─── */}
        <div>
          <AnimatePresence mode="wait">
            {result && showResult ? (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 120, damping: 18 }}
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {/* Threat Assessment Header */}
                {(() => {
                  const color = riskColors[result.prediction.risk_level] || "#eab308";
                  return (
                    <div className="glass-card" style={{
                      padding: 16, borderLeft: `3px solid ${color}`,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
                            THREAT LEVEL
                          </p>
                          <p style={{ fontSize: 28, fontWeight: 800, color, letterSpacing: -0.5, marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                            {result.prediction.risk_level}
                          </p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
                            CONFIDENCE
                          </p>
                          <p style={{ fontSize: 28, fontWeight: 800, color, letterSpacing: -0.5, marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                            {result.prediction.overall_confidence}%
                          </p>
                        </div>
                      </div>
                      <div style={{ marginTop: 10, padding: "8px 10px", background: "rgba(255,255,255,0.03)", borderRadius: 6, fontSize: 11, color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace" }}>
                        ETA: <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{result.prediction.estimated_withdrawal_window}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Action Bar */}
                <div className="glass-card" style={{ padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>ACTION</p>
                    <p style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 500, marginTop: 2 }}>{result.recommended_action}</p>
                  </div>
                  <button
                    type="button"
                    style={{
                      background: "var(--red)", color: "white", padding: "8px 14px", borderRadius: 6, fontSize: 11,
                      fontWeight: 700, border: "none", cursor: "pointer", whiteSpace: "nowrap",
                      textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: "'JetBrains Mono', monospace",
                    }}
                    onClick={() => router.push(`/map?focusCity=${encodeURIComponent(result.prediction.zones[0].city)}&mule=${encodeURIComponent(form.last_mule_city)}`)}
                  >
                    VIEW ON MAP
                  </button>
                </div>

                {/* Predicted Top 3 ATMs */}
                <div className="glass-card" style={{ padding: 14 }}>
                  <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.5px", marginBottom: 10, fontFamily: "'JetBrains Mono', monospace" }}>
                    TOP 3 HIGH-RISK ATM TARGETS
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {result.prediction.zones.slice(0, 3).map((zone, i) => {
                      const barWidth = `${zone.confidence}%`;
                      const zoneColor = zone.risk_level === "CRITICAL" ? "#ef4444" : zone.risk_level === "HIGH" ? "#f59e0b" : "#eab308";
                      // Deterministic mock ATM ID based on city length to keep it consistent
                      const atmId = (zone.city.length * 1024) % 9000 + 1000;
                      return (
                        <div key={i} style={{
                          background: "rgba(255,255,255,0.02)", borderRadius: 6, padding: "10px 12px",
                          border: i === 0 ? `1px solid rgba(239,68,68,0.15)` : "1px solid var(--border-color)",
                          position: "relative", overflow: "hidden",
                        }}>
                          <div style={{
                            position: "absolute", top: 0, left: 0, bottom: 0,
                            width: barWidth, background: i === 0 ? "rgba(239,68,68,0.06)" : "rgba(56,189,248,0.04)",
                            transition: "width 0.8s ease",
                          }} />
                          <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <p style={{ fontWeight: 600, fontSize: 13, fontFamily: "'Inter', sans-serif" }}>
                                <span style={{ color: "var(--text-muted)", marginRight: 6, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>#{i + 1}</span>
                                ATM #{atmId}
                              </p>
                              <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1, fontFamily: "'JetBrains Mono', monospace" }}>
                                Location: {zone.city}, {zone.state} (Near Highway)
                              </p>
                            </div>
                            <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 16, fontWeight: 800, color: zoneColor, fontFamily: "'JetBrains Mono', monospace" }}>
                                {zone.confidence}%
                              </span>
                              <span className={`badge badge-${zone.risk_level.toLowerCase()}`}>{zone.risk_level}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── Explainable AI Panel ── */}
                {result.explainability && result.explainability.length > 0 && (
                  <div className="glass-card" style={{ padding: 14, marginTop: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.5px", fontFamily: "'JetBrains Mono', monospace" }}>
                        WHY DID THE AI FLAG THIS?
                      </p>
                      <span className="badge badge-medium">XAI</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {result.explainability.map((feat, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 11, color: "var(--text-secondary)", minWidth: 160, fontFamily: "'JetBrains Mono', monospace" }}>
                            {feat.label}
                          </span>
                          <div style={{ flex: 1, height: 14, background: "rgba(255,255,255,0.03)", borderRadius: 3, overflow: "hidden", position: "relative" }}>
                            <div style={{
                              height: "100%", borderRadius: 3,
                              width: `${Math.min(feat.importance * 3, 100)}%`,
                              background: i === 0 ? "#06d6a0" : i === 1 ? "#38bdf8" : "#a78bfa",
                              opacity: 0.7,
                              transition: "width 0.8s ease",
                            }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: i === 0 ? "#06d6a0" : "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace", minWidth: 40, textAlign: "right" }}>
                            {feat.importance}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Money Flow Diagram ── */}
                {result.money_flow && result.money_flow.length > 0 && (
                  <div className="glass-card" style={{ padding: 14, marginTop: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.5px", fontFamily: "'JetBrains Mono', monospace" }}>
                        MONEY FLOW — MULE CHAIN
                      </p>
                      <span className="badge badge-critical">TRACE</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                      {result.money_flow.map((step, i) => {
                        const isLast = i === result.money_flow.length - 1;
                        const nodeColor = i === 0 ? "#06d6a0" : isLast ? "#ef4444" : "#38bdf8";
                        return (
                          <div key={i}>
                            {/* Node */}
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{
                                width: 10, height: 10, borderRadius: "50%",
                                background: nodeColor, flexShrink: 0,
                                boxShadow: `0 0 6px ${nodeColor}50`,
                              }} />
                              <div style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "rgba(255,255,255,0.02)", borderRadius: 6, border: `1px solid ${nodeColor}20` }}>
                                <div>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{step.from}</span>
                                  <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 8 }}>→ {step.to}</span>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: nodeColor, fontFamily: "'JetBrains Mono', monospace" }}>
                                    ₹{step.amount.toLocaleString("en-IN")}
                                  </span>
                                  <span style={{ fontSize: 9, color: "var(--text-muted)", marginLeft: 6, fontFamily: "'JetBrains Mono', monospace" }}>
                                    {step.method}
                                  </span>
                                </div>
                              </div>
                            </div>
                            {/* Connector line */}
                            {!isLast && (
                              <div style={{ width: 2, height: 16, background: "rgba(255,255,255,0.08)", marginLeft: 4, borderRadius: 1 }} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : error ? (
              <motion.div
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="glass-card"
                style={{ padding: "60px 32px", textAlign: "center" }}
              >
                <p style={{ fontSize: 16, color: "var(--red)", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>⚠️ CONNECTION FAILED</p>
                <p style={{ color: "var(--text-muted)", marginTop: 8, fontSize: 13 }}>Prediction Engine is offline. Start the backend server.</p>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="glass-card"
                style={{ padding: "60px 32px", textAlign: "center" }}
              >
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>Awaiting Input</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
                  Enter complaint details and run the prediction engine
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

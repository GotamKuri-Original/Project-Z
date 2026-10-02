"use client";

import { useState, useEffect } from "react";
import { predict, getTrace, type TraceResponse } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface PredictionResponse {
  prediction: {
    phase: string;
    phase_note?: string;
    risk_level: string;
    overall_confidence: number;
    estimated_withdrawal_window: string;
    zones: Array<{
      city: string;
      state: string;
      confidence: number;
      risk_level: string;
      num_high_risk_atms: number;
      top_atms?: Array<{
        atm_id: string;
        bank: string;
        lat: number;
        lng: number;
        confidence: number;
        atm_risk: number;
        final_score: number;
        risk_level: string;
        reasons: string[];
      }>;
    }>;
  };
  explainability: Array<{ feature: string; label: string; importance: number; }>;
  money_flow: Array<{ from: string; to: string; amount: number; method: string; }>;
  recommended_action: string;
  action_allowed?: boolean;
  complaint?: any;
}

function buildTopTargetsMapHref(result: PredictionResponse, muleCity: string) {
  const zones = result.prediction.zones.slice(0, 3);
  const params = new URLSearchParams();
  
  if (zones[0]) params.set("focusCity", zones[0].city);
  if (muleCity) params.set("mule", muleCity);
  
  for (const zone of zones) {
    const topAtms = zone.top_atms?.slice(0, 3) || [];
    for (const atm of topAtms) {
      params.append("atmId", atm.atm_id);
      params.append("lat", String(atm.lat));
      params.append("lng", String(atm.lng));
      params.append("atmBank", atm.bank);
      params.append("atmCity", zone.city);
    }
  }
  
  return `/map?${params.toString()}`;
}

const RISK_FACTORS = [
  { id: 'highway', label: 'Highway Corridor' },
  { id: 'border', label: 'State Border' },
  { id: 'velocity', label: 'Transaction Velocity' },
  { id: 'cctv_gap', label: 'CCTV Blindspot' }
];

const FRAUD_TYPES = [
  { value: "UPI_FRAUD", label: "UPI Fraud" },
  { value: "OTP_PHISHING", label: "OTP Phishing" },
  { value: "KYC_FRAUD", label: "KYC Fraud" },
  { value: "INVESTMENT_SCAM", label: "Investment Scam" },
  { value: "SEXTORTION", label: "Sextortion" },
  { value: "COURIER_SCAM", label: "Courier Scam" },
];

const CITIES = [
  { city: "Delhi", state: "Delhi" },
  { city: "Mumbai", state: "Maharashtra" },
  { city: "Bangalore", state: "Karnataka" },
  { city: "Hyderabad", state: "Telangana" },
  { city: "Chennai", state: "Tamil Nadu" },
  { city: "Kolkata", state: "West Bengal" },
  { city: "Pune", state: "Maharashtra" },
  { city: "Ahmedabad", state: "Gujarat" },
  { city: "Jaipur", state: "Rajasthan" },
  { city: "Lucknow", state: "Uttar Pradesh" },
  { city: "Chandigarh", state: "Chandigarh" },
  { city: "Patna", state: "Bihar" },
  { city: "Surat", state: "Gujarat" },
  { city: "Indore", state: "Madhya Pradesh" },
  { city: "Kochi", state: "Kerala" },
  { city: "Nuh", state: "Haryana" },
  { city: "Mathura", state: "Uttar Pradesh" },
  { city: "Bharatpur", state: "Rajasthan" },
  { city: "Jamtara", state: "Jharkhand" },
  { city: "Deoghar", state: "Jharkhand" },
  { city: "Ranchi", state: "Jharkhand" },
  { city: "Nagpur", state: "Maharashtra" },
  { city: "Coimbatore", state: "Tamil Nadu" },
  { city: "Guwahati", state: "Assam" },
  { city: "Visakhapatnam", state: "Andhra Pradesh" },
  { city: "Bhopal", state: "Madhya Pradesh" }, { city: "Vadodara", state: "Gujarat" },
  { city: "Dehradun", state: "Uttarakhand" }, { city: "Raipur", state: "Chhattisgarh" },
  { city: "Thiruvananthapuram", state: "Kerala" },
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
    fraud_type: "UPI_FRAUD",
    amount: 20000,
    victim_city: "Delhi",
    last_mule_city: "",
    mule_chain_length: 0,
    hour_of_day: 20,
    day_of_week: 3,
    reporting_delay_mins: 10,
  });

  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | false>(false);
  const [showResult, setShowResult] = useState(false);
  const [isTracing, setIsTracing] = useState(false);
  const [hasTraced, setHasTraced] = useState(false);
  const [complaintId, setComplaintId] = useState("CYB0000001");
  const [trace, setTrace] = useState<TraceResponse | null>(null);
  const [traceError, setTraceError] = useState<string | null>(null);

  const [predictionPhase, setPredictionPhase] = useState<"PHASE_1" | "PHASE_2">("PHASE_1");
  const [actionStatus, setActionStatus] = useState<any | null>(null);
  const [isAcknowledged, setIsAcknowledged] = useState(false);
  const [showBrief, setShowBrief] = useState(false);
  const [officerDecision, setOfficerDecision] = useState<string | null>(null);
  const [currentCaseId, setCurrentCaseId] = useState<string | null>(null);
  const [auditTrail, setAuditTrail] = useState<any[]>([]);
  const [showAudit, setShowAudit] = useState(false);

  const [isInitialized, setIsInitialized] = useState(false);

  // Sync global badge with trace status
  useEffect(() => {
    const badge = document.getElementById("global-live-badge");
    if (badge) {
      if (hasTraced && trace) {
        const isLive = trace.trace_timestamp && (new Date().getTime() - new Date(trace.trace_timestamp.replace(" ", "T")).getTime()) < 24 * 60 * 60 * 1000;
        if (isLive) {
          badge.style.color = "var(--green)";
          badge.style.background = "rgba(16,185,129,0.1)";
          badge.style.borderColor = "rgba(16,185,129,0.25)";
          badge.innerText = "● LIVE";
        } else {
          badge.style.color = "var(--red)";
          badge.style.background = "rgba(239,68,68,0.1)";
          badge.style.borderColor = "rgba(239,68,68,0.25)";
          badge.innerText = "● HISTORICAL";
        }
      } else {
        // Default state
        badge.style.color = "var(--green)";
        badge.style.background = "rgba(16,185,129,0.1)";
        badge.style.borderColor = "rgba(16,185,129,0.25)";
        badge.innerText = "● LIVE";
      }
    }
  }, [hasTraced, trace]);

  // Load from session storage on mount
  useEffect(() => {
    const savedForm = sessionStorage.getItem("predict_form");
    if (savedForm) {
      try {
        setForm(JSON.parse(savedForm));
      } catch (e) {}
    }

    const savedResult = sessionStorage.getItem("predict_result");
    if (savedResult) {
      try {
        setResult(JSON.parse(savedResult));
        setShowResult(true);
      } catch (e) {}
    }

    const savedHasTraced = sessionStorage.getItem("predict_hasTraced");
    if (savedHasTraced === "true") {
      setHasTraced(true);
    }

    const savedPhase = sessionStorage.getItem("predict_phase");
    if (savedPhase === "PHASE_1" || savedPhase === "PHASE_2") {
      setPredictionPhase(savedPhase);
    }

    setIsInitialized(true);
  }, []);

  // Save to session storage when things change, BUT ONLY after initial load
  useEffect(() => {
    if (!isInitialized) return;
    sessionStorage.setItem("predict_form", JSON.stringify(form));
    sessionStorage.setItem("predict_phase", predictionPhase);
  }, [form, predictionPhase, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    if (result) {
      sessionStorage.setItem("predict_result", JSON.stringify(result));
    } else {
      sessionStorage.removeItem("predict_result");
    }
  }, [result, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    sessionStorage.setItem("predict_hasTraced", hasTraced.toString());
  }, [hasTraced, isInitialized]);

  if (!isInitialized) {
    return null;
  }

  const resetTrace = () => {
    setHasTraced(false);
    setTrace(null);
    setTraceError(null);
    setForm(f => ({ ...f, last_mule_city: "", mule_chain_length: 0 }));
  };
  const loadDemoCase = async () => {
    setIsTracing(true);
    setTraceError(null);
    try {
      const res = await fetch("http://localhost:8000/api/trace/demo/random");
      const data = await res.json();
      if (data && data.complaint_id) {
        setComplaintId(data.complaint_id);
        resetTrace();
        setTimeout(() => {
          handleTrace(data.complaint_id);
        }, 100);
      }
    } catch (err) {
      setTraceError("Failed to load demo case.");
      setIsTracing(false);
    }
  };
  const handleTrace = async (overrideId?: string) => {
    const id = (typeof overrideId === 'string' ? overrideId : complaintId).trim().toUpperCase();
    if (!id) {
      setTraceError("Enter a complaint ID to trace.");
      return;
    }
    setIsTracing(true);
    setTraceError(null);
    try {
      const data = await getTrace(id);
      setTrace(data);
      if (data.status !== "SIMULATED_TRACE" || !data.last_known_city) {
        setHasTraced(false);
        setTraceError(`No linked transactions found for ${data.complaint_id}.`);
        return;
      }
      const c = data.complaint;
      const lastKnownCity = data.last_known_city;
      setForm(f => ({
        ...f,
        fraud_type: c.fraud_type,
        amount: c.amount,
        victim_city: c.victim_city,
        hour_of_day: c.hour_of_day,
        day_of_week: c.day_of_week,
        reporting_delay_mins: c.reporting_delay_mins,
        last_mule_city: lastKnownCity,
        mule_chain_length: data.hop_count,
      }));
      setHasTraced(true);
    } catch (err) {
      const status = (err as { response?: { status?: number } }).response?.status;
      setTrace(null);
      setHasTraced(false);
      setTraceError(status === 404 ? `Complaint ${id} not found.` : "Trace service unavailable.");
    } finally {
      setIsTracing(false);
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (predictionPhase === "PHASE_2" && (!hasTraced || !trace || !form.last_mule_city)) {
      await handleTrace();
      return;
    }
    setLoading(true);
    setShowResult(false);
    setError(false);
    setActionStatus(null);
    setShowBrief(false);
    try {
      const cityData = CITIES.find((c) => c.city === form.victim_city);
      let res;
      if (predictionPhase === "PHASE_1") {
        const { predictPhase1 } = await import("@/lib/api");
        res = await predictPhase1({ ...form, victim_state: cityData?.state || "Delhi" });
      } else {
        const { predict } = await import("@/lib/api");
        res = await predict({
          ...form,
          complaint_id: trace?.complaint_id,
          victim_state: cityData?.state || trace?.complaint.victim_state || "Delhi",
        });
      }
      if (res.error) {
        throw new Error(res.error);
      }
      setResult(res);
      setOfficerDecision(null);
      
      // Generate a case ID and auto-log this prediction to audit trail
      const caseId = `CS-${Date.now().toString(36).toUpperCase()}`;
      setCurrentCaseId(caseId);
      try {
        const { logPrediction } = await import("@/lib/api");
        await logPrediction({
          case_id: caseId,
          complaint_id: trace?.complaint_id || complaintId || "",
          fraud_type: form.fraud_type,
          amount: form.amount,
          victim_city: form.victim_city,
          predicted_city: res.prediction?.zones?.[0]?.city || "",
          risk_level: res.prediction?.risk_level || "",
          confidence: res.prediction?.overall_confidence || 0,
          estimated_window: res.prediction?.estimated_withdrawal_window || "",
          phase: res.prediction?.phase || "PHASE_1",
          top_atms: res.prediction?.zones?.[0]?.top_atms?.slice(0, 3).map((a: any) => a.atm_id) || [],
          shap_top_features: res.explainability?.slice(0, 3).map((f: any) => f.label) || [],
        });
      } catch (_) { /* audit log is best-effort */ }

      setTimeout(() => setShowResult(true), 100);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "CONNECTION FAILED");
    }
    setLoading(false);
  };

  const handleAction = async (type: "dispatch" | "cms" | "freeze") => {
    if (!result) return;
    const { triggerDispatch, triggerCMS, triggerFreeze } = await import("@/lib/api");
    const payload = {
        city: result.prediction.zones[0]?.city || form.victim_city,
        atm_ids: result.prediction.zones[0]?.top_atms?.map((a: any) => a.atm_id) || ["ATM-001"],
        risk_level: result.prediction.risk_level,
        complaint_id: `CMP-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`,
        amount_at_risk: form.amount,
        fraud_type: form.fraud_type,
        withdrawal_window: result.prediction.estimated_withdrawal_window,
        officer_id: "INSP-CYBER-042",
        prediction_phase: result.prediction.phase,
        confidence: result.prediction.overall_confidence,
        estimated_window_minutes: 120,
        mule_city: form.last_mule_city || "Unknown",
        predicted_withdrawal_city: result.prediction.zones[0]?.city,
        bank_name: result.prediction.zones[0]?.top_atms?.[0]?.bank || "SBI",
        reason: "Operational fallback"
    };

    try {
        let res;
        if (type === "dispatch") res = await triggerDispatch(payload);
        else if (type === "cms") res = await triggerCMS(payload);
        else if (type === "freeze") res = await triggerFreeze(payload);
        setActionStatus(res);
        setIsAcknowledged(false);
    } catch (err) {
        console.error(err);
        alert("Action failed to trigger.");
    }
  };

  const riskColors: Record<string, string> = {
    CRITICAL: "#ef4444",
    HIGH: "#f59e0b",
    MEDIUM: "#eab308",
  };

  return (
    <div className="fade-in">
      <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 16, alignItems: "start" }}>

        {/* ─── Input Panel ─── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ type: "spring", stiffness: 120, damping: 18 }}
          className="glass-card" style={{ padding: 16 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid var(--border-color)" }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              COMPLAINT INPUT
            </span>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <FieldLabel>Prediction Phase</FieldLabel>
              <select value={predictionPhase} onChange={(e) => setPredictionPhase(e.target.value as any)} className="input-field" style={{ background: "rgba(56, 189, 248, 0.05)", border: "1px solid rgba(56, 189, 248, 0.2)", color: "var(--cyan)" }}>
                <option value="PHASE_1">Phase 1: Zero-Hour (T+0 min) - No NPCI Data</option>
                <option value="PHASE_2">Phase 2: Enriched (T+2 sec) - NPCI Webhook</option>
              </select>
            </div>
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
                {trace && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", padding: "2px 6px", borderRadius: 4,
                    color: trace.status === "SIMULATED_TRACE" ? "#06d6a0" : "#f59e0b",
                    background: trace.status === "SIMULATED_TRACE" ? "rgba(6,214,160,0.1)" : "rgba(245,158,11,0.1)",
                  }}>
                    TRACE STATUS: {trace.status === "SIMULATED_TRACE" ? "SIMULATED" : "NO LINKED TXNS"}
                  </span>
                )}
              </div>
              {/* 0. Complaint ID */}
              <div style={{ marginTop: 8 }}>
                <FieldLabel>Complaint ID</FieldLabel>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    type="text"
                    aria-label="Complaint ID"
                    value={complaintId}
                    onChange={(e) => {
                      setComplaintId(e.target.value);
                      if (trace || hasTraced || traceError) resetTrace();
                    }}
                    placeholder="e.g. CYB0000001"
                    spellCheck={false}
                    autoComplete="off"
                    className="input-field"
                    style={{ flex: 1, fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase" }}
                  />
                  <button type="button" onClick={() => void handleTrace()} disabled={isTracing} style={{
                    background: "rgba(6,214,160,0.1)", color: "#06d6a0", border: "1px solid rgba(6,214,160,0.2)",
                    padding: "4px 10px", borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: isTracing ? "wait" : "pointer",
                    fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap",
                  }}>
                    {isTracing ? "QUERYING NPCI..." : hasTraced ? "RE-TRACE" : "AUTO-TRACE"}
                  </button>
                  <button type="button" onClick={loadDemoCase} disabled={isTracing} title="Load a random working Phase 2 case" style={{
                    background: "rgba(168, 85, 247, 0.15)", color: "#c084fc", border: "1px solid rgba(168, 85, 247, 0.3)",
                    padding: "4px 8px", borderRadius: 4, fontSize: 9, fontWeight: 800, cursor: isTracing ? "wait" : "pointer",
                    fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap",
                  }}>
                    ✨ DEMO
                  </button>
                </div>
                {traceError && (
                  <p role="alert" style={{ fontSize: 10, color: "#ef4444", marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>
                    {traceError}
                  </p>
                )}
              </div>
              {/* 1. Detected Chain Length */}
              <div style={{ marginTop: 8 }}>
                <FieldLabel>1. Detected Chain Length (Hops)</FieldLabel>
                <input
                  disabled
                  type="text"
                  aria-label="Detected chain length"
                  value={isTracing ? "Querying NPCI Switch API..." : hasTraced && trace ? `${trace.hop_count} Hops Identified` : "Awaiting Auto-Trace..."}
                  className="input-field"
                  style={{
                    opacity: hasTraced ? 1 : 0.5,
                    color: hasTraced ? "var(--cyan)" : "var(--text-muted)",
                    fontWeight: hasTraced ? 700 : 400,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                />
              </div>
              {/* 2. Last Known Mule Node */}
              <div style={{ marginTop: 8 }}>
                <FieldLabel>2. Last Known Mule Node (Bank Branch)</FieldLabel>
                <input
                  disabled
                  type="text"
                  aria-label="Last known mule node"
                  value={
                    isTracing ? "Tracing destination account..."
                      : hasTraced && trace ? `${trace.last_known_node} · ${trace.last_known_city}`
                      : "Unknown — Run Auto-Trace First"
                  }
                  className="input-field"
                  style={{
                    opacity: hasTraced ? 1 : 0.5,
                    color: hasTraced ? "var(--cyan)" : "var(--text-muted)",
                    fontWeight: hasTraced ? 600 : 400,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                />
              </div>
              {/* 3. Node hops from backend */}
              {hasTraced && trace && (
                <div style={{ marginTop: 8 }}>
                  <FieldLabel>3. Traced Node Hops</FieldLabel>
                  <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                    {trace.nodes.map((node, i) => {
                      const isLast = i === trace.nodes.length - 1;
                      const accent = node.type === "victim" ? "#f59e0b" : isLast ? "#ef4444" : "var(--cyan)";
                      return (
                        <li key={node.id} style={{
                          display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 4,
                          background: "#f8fafc", border: "1px solid var(--border-color)",
                          fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
                        }}>
                          <span style={{ color: accent, fontWeight: 700, whiteSpace: "nowrap" }}>
                            {node.type === "victim" ? "VICTIM" : `HOP ${node.hop} · L${node.layer ?? "?"}`}
                          </span>
                          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {node.id} · {node.city ?? "Unknown"}
                          </span>
                          <span style={{ color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                            ₹{node.amount.toLocaleString("en-IN")}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                  <p style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 6, fontFamily: "'JetBrains Mono', monospace" }}>
                    <span>{trace.linked_transactions} LINKED TXNS · DATASET {trace.dataset_version} · {trace.trace_timestamp}</span>
                    {(() => {
                      const isLive = trace.trace_timestamp && (new Date().getTime() - new Date(trace.trace_timestamp.replace(" ", "T")).getTime()) < 24 * 60 * 60 * 1000;
                      return (
                        <span style={{
                          color: isLive ? "#06d6a0" : "#f59e0b",
                          background: isLive ? "rgba(6,214,160,0.1)" : "rgba(245,158,11,0.1)",
                          padding: "2px 6px", borderRadius: 4, fontWeight: 700, marginLeft: 6
                        }}>
                          {isLive ? "LIVE ACTIVE TRACE" : "HISTORICAL REPLAY"}
                        </span>
                      );
                    })()}
                  </p>
                </div>
              )}
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

            <button type="submit" disabled={loading || (predictionPhase === "PHASE_2" && !hasTraced && !isTracing)} className="btn-primary" style={{ marginTop: 4, width: "100%", opacity: (predictionPhase === "PHASE_2" && !hasTraced && !isTracing) ? 0.5 : 1 }}>
              {loading ? "ANALYZING..." : (predictionPhase === "PHASE_2" && !hasTraced && !isTracing) ? "TRACE NPCI NETWORK FIRST" : "RUN PREDICTION"}
            </button>
          </form>
        </motion.div>

        {/* ─── Results Panel ─── */}
        <div>
          <AnimatePresence mode="wait">
            {result && showResult ? (
              <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ type: "spring", stiffness: 120, damping: 18 }} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                
                {/* Reset Button */}
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: -4 }}>
                  <button onClick={() => { setResult(null); setShowResult(false); resetTrace(); setComplaintId(""); setForm({ fraud_type: "UPI_FRAUD", amount: 20000, victim_city: "Delhi", last_mule_city: "", mule_chain_length: 0, hour_of_day: 20, day_of_week: 3, reporting_delay_mins: 10 }); }} style={{
                    background: "#f1f5f9", border: "1px solid var(--border-color)",
                    color: "var(--text-secondary)", padding: "4px 12px", borderRadius: 4,
                    fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                    cursor: "pointer", transition: "all 0.2s"
                  }}>
                    + NEW COMPLAINT REPORT
                  </button>
                </div>

                {/* Threat Assessment Header */}
                {(() => {
                  const color = riskColors[result.prediction.risk_level] || "#eab308";
                  return (
                    <div className="glass-card" style={{ padding: 16, borderLeft: `3px solid ${color}`, }}>
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
                      <div style={{ marginTop: 10, padding: "8px 10px", background: "#f1f5f9", borderRadius: 6, fontSize: 11, color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace" }}>
                        ETA: <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{result.prediction.estimated_withdrawal_window}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Action Bar - PRIORITY CASCADE */}
                <div className="glass-card" style={{ padding: "14px", display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
                        OPERATIONAL RESPONSE PRIORITY CASCADE
                      </p>
                      <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: "rgba(56,189,248,0.1)", color: "var(--cyan)", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                        {result.prediction.phase}
                      </span>
                    </div>
                    <p style={{ fontSize: 11, color: "var(--text-secondary)", fontStyle: "italic", marginBottom: 8 }}>
                      {result.prediction.phase_note || "Data enriched."}
                    </p>
                    <p style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 500, borderLeft: "2px solid var(--border-color)", paddingLeft: 8 }}>
                      {result.recommended_action}
                    </p>
                  </div>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <button type="button" disabled={!result.action_allowed} onClick={() => handleAction("dispatch")} style={{ background: result.action_allowed ? "rgba(6,214,160,0.15)" : "#f1f5f9", color: result.action_allowed ? "#06d6a0" : "var(--text-muted)", border: result.action_allowed ? "1px solid rgba(6,214,160,0.3)" : "1px solid var(--border-color)", padding: "12px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: result.action_allowed ? "pointer" : "not-allowed", opacity: result.action_allowed ? 1 : 0.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "'JetBrains Mono', monospace", transition: "all 0.2s" }}>
                      <span style={{ fontSize: 14 }}>🚓</span>
                      <span>1. DISPATCH POLICE</span>
                    </button>
                    <button type="button" disabled={!result.action_allowed} onClick={() => handleAction("freeze")} style={{ background: result.action_allowed ? "rgba(239,68,68,0.1)" : "#f1f5f9", color: result.action_allowed ? "#ef4444" : "var(--text-muted)", border: result.action_allowed ? "1px dashed rgba(239,68,68,0.3)" : "1px dashed var(--border-color)", padding: "12px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: result.action_allowed ? "pointer" : "not-allowed", opacity: result.action_allowed ? 1 : 0.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "'JetBrains Mono', monospace", transition: "all 0.2s" }}>
                      <span>2. FREEZE (FALLBACK)</span>
                    </button>
                  </div>
                  <button type="button"
                    onClick={() => router.push(buildTopTargetsMapHref(result, form.last_mule_city))}
                    style={{ width: "100%", background: "rgba(56,189,248,0.12)", color: "#38bdf8", border: "1px solid rgba(56,189,248,0.25)", padding: "10px", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "'JetBrains Mono', monospace" }}>
                    <span>VIEW ON MAP — ACCESS CCTV & GEOFENCE LOCK</span>
                  </button>

                  <button type="button"
                    onClick={() => setShowBrief(!showBrief)}
                    style={{ width: "100%", background: "#f1f5f9", color: "var(--text-secondary)", border: "1px solid var(--border-color)", padding: "10px", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "'JetBrains Mono', monospace", marginTop: "-4px" }}>
                    <span style={{ fontSize: 14 }}>📄</span>
                    <span>{showBrief ? "HIDE INVESTIGATION BRIEF" : "3. GENERATE INVESTIGATION BRIEF"}</span>
                  </button>

                  <AnimatePresence>
                    {showBrief && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="glass-card" style={{ marginTop: 4, padding: 16, background: "#f8fafc", borderLeft: "2px solid var(--text-muted)", overflow: "hidden" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, borderBottom: "1px solid var(--border-color)", paddingBottom: 8 }}>
                          <div>
                            <p style={{ fontSize: 12, fontWeight: 800, color: "var(--text-primary)", fontFamily: "'JetBrains Mono', monospace" }}>📄 OFFICIAL INVESTIGATION BRIEF</p>
                            <p style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>CONFIDENTIAL - FOR AUTHORIZED CYBER CELL PERSONNEL ONLY</p>
                          </div>
                          <button onClick={() => { navigator.clipboard.writeText(`INVESTIGATION BRIEF [${result.complaint.complaint_id}]\n...\n`); alert("Copied to clipboard!"); }} style={{ fontSize: 10, background: "transparent", border: "1px solid var(--border-color)", color: "var(--text-secondary)", padding: "4px 8px", borderRadius: 4, cursor: "pointer" }}>📋 COPY</button>
                        </div>
                        
                        <div style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.6 }}>
                          <p><strong style={{ color: "var(--text-primary)" }}>CASE ID:</strong> {result.complaint.complaint_id || "PENDING_REPORT"}</p>
                          <p><strong style={{ color: "var(--text-primary)" }}>TIMESTAMP:</strong> {new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC</p>
                          <p><strong style={{ color: "var(--text-primary)" }}>OFFICER:</strong> AUTO-GENERATED (CrimeShield AI Agent)</p>
                          <br />
                          
                          <p style={{ color: "var(--cyan)", fontWeight: 700, borderBottom: "1px dashed rgba(56,189,248,0.3)", paddingBottom: 4, marginBottom: 4 }}>1. INCIDENT SUMMARY</p>
                          <p>Victim located in <strong>{result.complaint.victim_city}</strong> reported <strong>{result.complaint.fraud_type.replace('_', ' ')}</strong> involving loss of <strong>₹{result.complaint.amount.toLocaleString()}</strong>.</p>
                          <p>Report delay: {result.complaint.reporting_delay_mins} minutes. Incident occurred at roughly {result.complaint.hour_of_day}:00 hrs.</p>
                          <br />

                          <p style={{ color: "var(--cyan)", fontWeight: 700, borderBottom: "1px dashed rgba(56,189,248,0.3)", paddingBottom: 4, marginBottom: 4 }}>2. DIGITAL FOOTPRINT (NPCI TRACE)</p>
                          {result.prediction.phase === "PHASE_2" ? (
                            <>
                              <p>Funds successfully traced through <strong>{result.complaint.mule_chain_length} mule hops</strong>.</p>
                              <p>Final identified staging account located in: <strong>{result.complaint.last_mule_city}</strong>.</p>
                            </>
                          ) : (
                            <p style={{ color: "#ef4444" }}>Pending Phase 2 NPCI verification. Mule chain currently assumed via NCRB statistical priors.</p>
                          )}
                          <br />

                          <p style={{ color: "var(--cyan)", fontWeight: 700, borderBottom: "1px dashed rgba(56,189,248,0.3)", paddingBottom: 4, marginBottom: 4 }}>3. AI PREDICTIVE INTELLIGENCE</p>
                          <p><strong>Primary Target Zone:</strong> {result.prediction.zones[0]?.city || "Unknown"}, {result.prediction.zones[0]?.state || "Unknown"}</p>
                          <p><strong>Threat Level:</strong> {result.prediction.risk_level} (Confidence: {result.prediction.overall_confidence}%)</p>
                          <p><strong>Estimated Cash-out ETA:</strong> {result.prediction.estimated_withdrawal_window}</p>
                          <p><strong>Key Drivers (SHAP Explainer):</strong></p>
                          <ul style={{ paddingLeft: 16, margin: "4px 0 0 0" }}>
                            {result.explainability.slice(0, 3).map(f => (
                              <li key={f.feature}>{f.label} contributed {f.importance}% to this prediction.</li>
                            ))}
                          </ul>
                          <br />

                          <p style={{ color: "var(--cyan)", fontWeight: 700, borderBottom: "1px dashed rgba(56,189,248,0.3)", paddingBottom: 4, marginBottom: 4 }}>4. RECOMMENDED ACTION</p>
                          <p style={{ color: result.action_allowed ? "#06d6a0" : "#ef4444", fontWeight: 700 }}>
                            {result.recommended_action}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {actionStatus && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="glass-card" style={{ marginTop: 8, padding: 12, background: "#f8fafc", borderLeft: "2px solid #06d6a0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: "#06d6a0", fontFamily: "'JetBrains Mono', monospace" }}>✅ {actionStatus.action}</p>
                        <p style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>REF: {actionStatus.reference_id}</p>
                      </div>

                      {/* Simulated SMS Alert */}
                      {actionStatus.action === "POLICE_DISPATCH_ISSUED" && (
                         <div style={{ background: "rgba(37, 211, 102, 0.1)", border: "1px solid rgba(37, 211, 102, 0.3)", borderRadius: 8, padding: 12, marginBottom: 12, display: "flex", gap: 12 }}>
                           <div style={{ fontSize: 24 }}>📱</div>
                           <div>
                             <p style={{ fontSize: 10, color: "#25d366", fontWeight: 700, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" }}>PUSH NOTIFICATION SENT TO BEAT OFFICER</p>
                             <p style={{ fontSize: 12, color: "var(--text-primary)", fontStyle: "italic", lineHeight: 1.4 }}>
                               "CRITICAL: {actionStatus.alert?.fraud_type?.replace('_', ' ')} suspect. 
                               Deploy immediately to {actionStatus.alert?.atms_to_surveil?.[0]} at {actionStatus.alert?.target_city}. 
                               Do NOT freeze. Wait for cash withdrawal. Arrest on sight."
                             </p>
                           </div>
                         </div>
                      )}

                      {/* Simulated Bank Alert */}
                      {actionStatus.action === "CFCFRMS_FREEZE_REQUESTED" && (
                         <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: 8, padding: 12, marginBottom: 12, display: "flex", gap: 12 }}>
                           <div style={{ fontSize: 24 }}>🏦</div>
                           <div style={{ flex: 1 }}>
                             <p style={{ fontSize: 10, color: "#ef4444", fontWeight: 700, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" }}>API AUTOMATION TO BANK NODAL OFFICER</p>
                             <p style={{ fontSize: 12, color: "var(--text-primary)", fontStyle: "italic", lineHeight: 1.4 }}>
                               "URGENT: Freeze all accounts linked to {actionStatus.freeze_details?.mule_city} mule associated with case {actionStatus.freeze_details?.complaint_id}. 
                               Action required within 60 mins (RBI mandate)."
                             </p>
                             <a href="https://webhook.site/#!/845e952f-2d87-4646-8f46-6b2ce15ea9d5" target="_blank" rel="noreferrer" style={{ 
                               display: "inline-block", marginTop: 8, padding: "4px 8px", background: "rgba(239, 68, 68, 0.2)", 
                               border: "1px solid rgba(239, 68, 68, 0.4)", borderRadius: 4, color: "#f87171", 
                               fontSize: 10, fontWeight: 600, textDecoration: "none", fontFamily: "'JetBrains Mono', monospace" 
                             }}>
                               ▶ VIEW LIVE WEBHOOK PAYLOAD
                             </a>
                           </div>
                         </div>
                      )}

                      {/* CMS Camera Alert */}
                      {actionStatus.action === "CMS_CAMERAS_ACTIVATED" && (
                         <div style={{ background: "rgba(56, 189, 248, 0.1)", border: "1px solid rgba(56, 189, 248, 0.3)", borderRadius: 8, padding: 12, marginBottom: 12, display: "flex", gap: 12 }}>
                           <div style={{ fontSize: 24 }}>📹</div>
                           <div>
                             <p style={{ fontSize: 10, color: "#38bdf8", fontWeight: 700, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" }}>ATM CAMERAS ACTIVATED — EVIDENCE RECORDING</p>
                             <p style={{ fontSize: 12, color: "var(--text-primary)", fontStyle: "italic", lineHeight: 1.4 }}>
                               "{actionStatus.cms_integration?.total_atms_watched} ATM cameras activated in 1080p evidence-grade mode. 
                               STQC-compliant. Court-admissible under IT Act Section 65B."
                             </p>
                           </div>
                         </div>
                      )}

                      {/* Email Notification Card */}
                      <div style={{ background: "rgba(168, 85, 247, 0.1)", border: "1px solid rgba(168, 85, 247, 0.3)", borderRadius: 8, padding: 12, marginBottom: 12, display: "flex", gap: 12 }}>
                        <div style={{ fontSize: 24 }}>📧</div>
                        <div>
                          <p style={{ fontSize: 10, color: "#c084fc", fontWeight: 700, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" }}>EMAIL ALERT DISPATCHED</p>
                          <p style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                            <strong>To:</strong> cyber.cell@police.gov.in, nodal.officer@{actionStatus.alert?.target_city?.toLowerCase() || "bank"}.co.in
                          </p>
                          <p style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                            <strong>Subject:</strong> [CRIMESHIELD] {actionStatus.action === "POLICE_DISPATCH_ISSUED" ? "CRITICAL" : "HIGH"} — Case {actionStatus.reference_id}
                          </p>
                          <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
                            Full investigation brief attached as PDF. SMTP via gov.in secure relay.
                          </p>
                        </div>
                      </div>

                      {/* I4C Dashboard Feed Card */}
                      <div style={{ background: "rgba(56, 189, 248, 0.08)", border: "1px solid rgba(56, 189, 248, 0.2)", borderRadius: 8, padding: 12, marginBottom: 12, display: "flex", gap: 12 }}>
                        <div style={{ fontSize: 24 }}>🛡️</div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 10, color: "#38bdf8", fontWeight: 700, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" }}>I4C DASHBOARD — WEBHOOK DELIVERED</p>
                          <p style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                            Case pushed to I4C National Cybercrime Coordination Centre dashboard via secure REST API.
                          </p>
                          <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                            Endpoint: POST /api/v2/alerts • Auth: MHA-issued OAuth2 bearer token
                          </p>
                          <a href="https://webhook.site/#!/845e952f-2d87-4646-8f46-6b2ce15ea9d5" target="_blank" rel="noreferrer" style={{ 
                            display: "inline-block", marginTop: 8, padding: "4px 8px", background: "rgba(56, 189, 248, 0.2)", 
                            border: "1px solid rgba(56, 189, 248, 0.4)", borderRadius: 4, color: "#38bdf8", 
                            fontSize: 10, fontWeight: 600, textDecoration: "none", fontFamily: "'JetBrains Mono', monospace" 
                          }}>
                            ▶ VIEW LIVE WEBHOOK PAYLOAD
                          </a>
                        </div>
                      </div>

                      {/* ── ACKNOWLEDGEMENT TRACKING PIPELINE ── */}
                      <div style={{ background: "#f8fafc", border: "1px solid var(--border-color)", borderRadius: 8, padding: 12, marginBottom: 12 }}>
                        <p style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, marginBottom: 10, fontFamily: "'JetBrains Mono', monospace" }}>NOTIFICATION DELIVERY STATUS</p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 4 }}>
                          {[
                            { channel: "Dashboard", icon: "🖥️", status: "✓ Delivered" },
                            { channel: "Push/SMS", icon: "📱", status: "✓ Delivered" },
                            { channel: "Email", icon: "📧", status: "✓ Sent" },
                            { channel: "I4C API", icon: "🛡️", status: "✓ Delivered" },
                          ].map((ch) => (
                            <div key={ch.channel} style={{ textAlign: "center", padding: 6 }}>
                              <div style={{ fontSize: 18 }}>{ch.icon}</div>
                              <p style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>{ch.channel}</p>
                              <p style={{ fontSize: 9, color: "#06d6a0", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>{ch.status}</p>
                            </div>
                          ))}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 10, padding: "6px 0", borderTop: "1px solid var(--border-color)" }}>
                          {["Generated", "Dispatched", "Delivered", "Acknowledged"].map((step, i) => (
                            <div key={step} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <div style={{
                                width: 8, height: 8, borderRadius: "50%",
                                background: i < 3 || (i === 3 && isAcknowledged) ? "#06d6a0" : "#cbd5e1",
                              }} />
                              {i === 3 && !isAcknowledged ? (
                                <button type="button" onClick={() => setIsAcknowledged(true)} style={{ 
                                  background: "rgba(6,214,160,0.1)", border: "1px solid rgba(6,214,160,0.3)", 
                                  color: "#06d6a0", fontSize: 9, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", 
                                  padding: "2px 8px", borderRadius: 4, cursor: "pointer" 
                                }}>
                                  SIMULATE ACKNOWLEDGEMENT
                                </button>
                              ) : (
                                <span style={{ fontSize: 9, color: i < 3 || (i === 3 && isAcknowledged) ? "#06d6a0" : "var(--text-muted)", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{step}</span>
                              )}
                              {i < 3 && <span style={{ color: i <= 1 || (i === 2 && isAcknowledged) ? "#06d6a0" : "var(--text-muted)", fontSize: 10 }}>→</span>}
                            </div>
                          ))}
                        </div>
                      </div>

                      <pre style={{ fontSize: 10, color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace", whiteSpace: "pre-wrap", margin: 0, background: "#f1f5f9", border: "1px solid var(--border-color)", padding: 8, borderRadius: 4 }}>
                        {JSON.stringify(actionStatus.alert || actionStatus.cms_integration || actionStatus.freeze_details, null, 2)}
                      </pre>
                      {actionStatus.priority_warning && (
                        <p style={{ fontSize: 10, color: "#ef4444", marginTop: 8, fontWeight: 600 }}>⚠️ {actionStatus.priority_warning}</p>
                      )}
                    </motion.div>
                  )}
                </div>

                {/* ── STEP 8: OFFICER VERIFICATION ── */}
                <div className="glass-card" style={{ padding: 14 }}>
                  <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.5px", marginBottom: 8, fontFamily: "'JetBrains Mono', monospace" }}>
                    👮 OFFICER VERIFICATION — HUMAN IN THE LOOP
                  </p>
                  {currentCaseId && (
                    <p style={{ fontSize: 9, color: "var(--text-muted)", marginBottom: 8, fontFamily: "'JetBrains Mono', monospace" }}>
                      CASE ID: {currentCaseId}
                    </p>
                  )}

                  {!officerDecision ? (
                    <div>
                      <p style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 10, lineHeight: 1.5 }}>
                        AI has generated a prediction. As the reviewing officer, do you approve this recommendation for operational action?
                      </p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                        <button type="button" onClick={async () => {
                          setOfficerDecision("APPROVE");
                          try {
                            const { submitOfficerDecision } = await import("@/lib/api");
                            await submitOfficerDecision({ case_id: currentCaseId || "", decision: "APPROVE", remarks: "Prediction verified. Proceed with dispatch." });
                          } catch(_) {}
                        }} style={{
                          background: "rgba(6,214,160,0.15)", color: "#06d6a0", border: "1px solid rgba(6,214,160,0.3)",
                          padding: "10px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer",
                          fontFamily: "'JetBrains Mono', monospace",
                        }}>
                          ✅ APPROVE
                        </button>
                        <button type="button" onClick={async () => {
                          setOfficerDecision("REJECT");
                          try {
                            const { submitOfficerDecision } = await import("@/lib/api");
                            await submitOfficerDecision({ case_id: currentCaseId || "", decision: "REJECT", remarks: "Insufficient confidence. Requesting additional data." });
                          } catch(_) {}
                        }} style={{
                          background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)",
                          padding: "10px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer",
                          fontFamily: "'JetBrains Mono', monospace",
                        }}>
                          ❌ REJECT
                        </button>
                        <button type="button" onClick={async () => {
                          setOfficerDecision("ESCALATE");
                          try {
                            const { submitOfficerDecision } = await import("@/lib/api");
                            await submitOfficerDecision({ case_id: currentCaseId || "", decision: "ESCALATE", remarks: "Escalated to Senior Superintendent for review." });
                          } catch(_) {}
                        }} style={{
                          background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)",
                          padding: "10px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: "pointer",
                          fontFamily: "'JetBrains Mono', monospace",
                        }}>
                          ⬆️ ESCALATE
                        </button>
                      </div>
                    </div>
                  ) : (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{
                      padding: 12, borderRadius: 6,
                      background: officerDecision === "APPROVE" ? "rgba(6,214,160,0.1)" : officerDecision === "REJECT" ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)",
                      borderLeft: `3px solid ${officerDecision === "APPROVE" ? "#06d6a0" : officerDecision === "REJECT" ? "#ef4444" : "#f59e0b"}`,
                    }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: officerDecision === "APPROVE" ? "#06d6a0" : officerDecision === "REJECT" ? "#ef4444" : "#f59e0b", fontFamily: "'JetBrains Mono', monospace" }}>
                        {officerDecision === "APPROVE" ? "✅ APPROVED BY OFFICER" : officerDecision === "REJECT" ? "❌ REJECTED BY OFFICER" : "⬆️ ESCALATED TO SENIOR"}
                      </p>
                      <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>
                        Officer: INSP-CYBER-042 (Inspector Sharma) • {new Date().toLocaleTimeString()}
                      </p>
                    </motion.div>
                  )}
                </div>

                {/* ── AUDIT TRAIL VIEWER ── */}
                <div className="glass-card" style={{ padding: 14 }}>
                  <button type="button" onClick={async () => {
                    setShowAudit(!showAudit);
                    if (!showAudit) {
                      try {
                        const { getAuditTrail } = await import("@/lib/api");
                        const data = await getAuditTrail(20);
                        setAuditTrail(data.records || []);
                      } catch(_) {}
                    }
                  }} style={{
                    width: "100%", background: "transparent", border: "none", cursor: "pointer",
                    display: "flex", justifyContent: "space-between", alignItems: "center", padding: 0,
                  }}>
                    <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.5px", fontFamily: "'JetBrains Mono', monospace" }}>
                      📋 PREDICTION AUDIT TRAIL ({auditTrail.length} records)
                    </p>
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{showAudit ? "▲" : "▼"}</span>
                  </button>

                  <AnimatePresence>
                    {showAudit && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden", marginTop: 10 }}>
                        {auditTrail.length === 0 ? (
                          <p style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>No predictions logged yet.</p>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 300, overflowY: "auto" }}>
                            {auditTrail.map((rec, i) => (
                              <div key={i} style={{
                                padding: "8px 10px", borderRadius: 6, background: "#f8fafc", border: "1px solid var(--border-color)",
                                borderLeft: `3px solid ${rec.status === "APPROVED" ? "#06d6a0" : rec.status === "REJECTED" ? "#ef4444" : rec.status === "ESCALATED" ? "#f59e0b" : "var(--text-muted)"}`,
                                fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
                              }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                  <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>{rec.case_id}</span>
                                  <span style={{
                                    padding: "1px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700,
                                    background: rec.status === "APPROVED" ? "rgba(6,214,160,0.1)" : rec.status === "REJECTED" ? "rgba(239,68,68,0.1)" : rec.status === "ESCALATED" ? "rgba(245,158,11,0.1)" : "#f1f5f9",
                                    color: rec.status === "APPROVED" ? "#06d6a0" : rec.status === "REJECTED" ? "#ef4444" : rec.status === "ESCALATED" ? "#f59e0b" : "var(--text-muted)",
                                  }}>
                                    {rec.status}
                                  </span>
                                </div>
                                <p style={{ color: "var(--text-secondary)" }}>
                                  {rec.fraud_type?.replace('_',' ')} • ₹{rec.amount?.toLocaleString()} • {rec.victim_city} → {rec.predicted_city}
                                </p>
                                <p style={{ color: "var(--text-muted)", fontSize: 9 }}>
                                  {rec.risk_level} ({rec.confidence}%) • {rec.phase} • {rec.prediction_timestamp?.substring(11, 19)}
                                </p>
                                {rec.officer_decision && (
                                  <p style={{ color: "var(--text-muted)", fontSize: 9, marginTop: 2 }}>
                                    Officer: {rec.officer_name} • {rec.officer_decision} at {rec.decision_timestamp?.substring(11, 19)}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="glass-card" style={{ padding: 14 }}>
                  <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.5px", marginBottom: 10, fontFamily: "'JetBrains Mono', monospace" }}>
                    XGBOOST PREDICTED CITIES & SPATIAL ATM TARGETS
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {result.prediction.zones.slice(0, 3).map((zone, i) => {
                      const barWidth = `${zone.confidence}%`;
                      const zoneColor = zone.risk_level === "CRITICAL" ? "#ef4444" : zone.risk_level === "HIGH" ? "#f59e0b" : "#eab308";
                      const topAtms = zone.top_atms ? zone.top_atms.slice(0, 3) : [];
                      
                      const mapParams = new URLSearchParams({
                        focusCity: zone.city,
                        mule: form.last_mule_city
                      });
                      
                      for (const atm of topAtms) {
                        mapParams.append("atmId", atm.atm_id);
                        mapParams.append("lat", String(atm.lat));
                        mapParams.append("lng", String(atm.lng));
                        mapParams.append("atmBank", atm.bank);
                        mapParams.append("atmCity", zone.city);
                      }
                      
                      const mapHref = `/map?${mapParams.toString()}`;

                      return (
                        <div key={i} style={{
                          background: "#f8fafc", borderRadius: 6, padding: "10px 12px",
                          border: i === 0 ? `1px solid rgba(239,68,68,0.15)` : "1px solid var(--border-color)",
                          position: "relative", overflow: "hidden",
                        }}>
                          <div style={{
                            position: "absolute", top: 0, left: 0, bottom: 0,
                            width: barWidth, background: i === 0 ? "rgba(239,68,68,0.06)" : "rgba(56,189,248,0.04)",
                            transition: "width 0.8s ease",
                          }} />
                          <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                              <p style={{ fontWeight: 600, fontSize: 13, fontFamily: "'Inter', sans-serif" }}>
                                <span style={{ color: "var(--text-muted)", marginRight: 6, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>#{i + 1} Predicted City:</span>
                                {zone.city}, {zone.state}
                              </p>
                              <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 6 }}>
                                {topAtms.length > 0 ? topAtms.map((atm, j) => (
                                  <div key={atm.atm_id} style={{ display: "flex", flexDirection: "column", gap: 2, background: "#f8fafc", padding: "4px 8px", borderRadius: 4, borderLeft: `2px solid ${atm.risk_level === 'CRITICAL' ? '#ef4444' : atm.risk_level === 'HIGH' ? '#f59e0b' : '#38bdf8'}` }}>
                                    <p style={{ fontSize: 11, color: "var(--text-primary)", fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: 6 }}>
                                      <span>{j+1}. {atm.bank}</span> 
                                      <span style={{ color: "var(--text-muted)", fontSize: 9 }}>#{atm.atm_id}</span>
                                      <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--cyan)" }}>Score: {atm.final_score?.toFixed(3) || "N/A"}</span>
                                    </p>
                                    <p style={{ fontSize: 9, color: "var(--text-secondary)", fontStyle: "italic" }}>
                                      {atm.reasons?.join(" • ") || "Elevated static risk"}
                                    </p>
                                  </div>
                                )) : (
                                  <p style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>No high-risk ATMs found</p>
                                )}
                              </div>
                            </div>
                            <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 16, fontWeight: 800, color: zoneColor, fontFamily: "'JetBrains Mono', monospace" }}>
                                  {zone.confidence}%
                                </span>
                                <span className={`badge badge-${zone.risk_level.toLowerCase()}`}>{zone.risk_level}</span>
                              </div>
                              <button
                                type="button"
                                className="map-action-btn"
                                onClick={() => router.push(mapHref)}
                                aria-label={`View ATMs in ${zone.city} on map`}
                              >
                                View on Map
                              </button>
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
                          <div style={{ flex: 1, height: 14, background: "#f1f5f9", borderRadius: 3, overflow: "hidden", position: "relative" }}>
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
                              <div style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: isLast ? "rgba(239,68,68,0.05)" : "#f8fafc", borderRadius: 6, border: isLast ? `1px dashed ${nodeColor}60` : `1px solid ${nodeColor}20` }}>
                                <div>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{step.from}</span>
                                  <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 8 }}>→ {isLast ? "[PENDING CASH-OUT AT ATM]" : step.to}</span>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: nodeColor, fontFamily: "'JetBrains Mono', monospace" }}>
                                    ₹{step.amount.toLocaleString("en-IN")}
                                  </span>
                                  <span style={{ fontSize: 9, color: "var(--text-muted)", marginLeft: 6, fontFamily: "'JetBrains Mono', monospace" }}>
                                    {isLast ? "PENDING WITHDRAWAL" : step.method}
                                  </span>
                                </div>
                              </div>
                            </div>
                            {/* Connector line */}
                            {!isLast && (
                              <div style={{ width: 2, height: 16, background: "#cbd5e1", marginLeft: 4, borderRadius: 1 }} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : error ? (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass-card" style={{ padding: "60px 32px", textAlign: "center" }}>
                <p style={{ fontSize: 16, color: "var(--red)", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                  ⚠️ {error === "CONNECTION FAILED" ? "CONNECTION FAILED" : "PREDICTION ERROR"}
                </p>
                <p style={{ color: "var(--text-muted)", marginTop: 8, fontSize: 13 }}>
                  {error === "CONNECTION FAILED" ? "Prediction Engine is offline. Start the backend server." : error}
                </p>
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass-card" style={{ padding: "60px 32px", textAlign: "center" }}>
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

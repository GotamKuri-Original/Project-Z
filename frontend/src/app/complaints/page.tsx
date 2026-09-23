"use client";

import { useEffect, useState } from "react";
import { getComplaints, getComplaint } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";

const fraudBadge: Record<string, { bg: string; color: string }> = {
  UPI_FRAUD: { bg: "rgba(6,214,160,0.12)", color: "#06d6a0" },
  OTP_PHISHING: { bg: "rgba(255,159,67,0.12)", color: "#ff9f43" },
  KYC_FRAUD: { bg: "rgba(255,71,87,0.12)", color: "#ff4757" },
  INVESTMENT_SCAM: { bg: "rgba(167,139,250,0.12)", color: "#a78bfa" },
  SEXTORTION: { bg: "rgba(243,104,224,0.12)", color: "#f368e0" },
  COURIER_SCAM: { bg: "rgba(255,211,42,0.12)", color: "#ffd32a" },
};

export default function ComplaintsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState("");
  
  // Investigation Panel State
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [loadingCase, setLoadingCase] = useState(false);

  useEffect(() => {
    setLoading(true);
    getComplaints({ limit: 20, offset: page * 20, fraud_type: filter || undefined })
      .then(setData).catch(console.error).finally(() => setLoading(false));
  }, [page, filter]);

  const openInvestigation = async (id: string) => {
    setLoadingCase(true);
    setSelectedCase({ complaint_id: id }); // Optimistic open
    try {
      const fullCase = await getComplaint(id);
      setSelectedCase(fullCase);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCase(false);
    }
  };

  return (
    <div className="fade-in" style={{ display: "flex", gap: 20 }}>
      <div style={{ flex: 1, minWidth: 0, transition: "flex 0.3s" }}>
        <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800 }}>Case Files</h1>
            <p style={{ color: "#475569", marginTop: 4, fontSize: 14 }}>
              {data ? `${data.total.toLocaleString()} complaints in database` : "Loading..."}
            </p>
          </div>
          <select value={filter} onChange={(e) => { setFilter(e.target.value); setPage(0); }} className="input-field" style={{ width: 200 }}>
            <option value="">All Fraud Types</option>
            <option value="UPI_FRAUD">UPI Fraud</option>
            <option value="OTP_PHISHING">OTP Phishing</option>
            <option value="KYC_FRAUD">KYC Fraud</option>
            <option value="INVESTMENT_SCAM">Investment Scam</option>
            <option value="SEXTORTION">Sextortion</option>
            <option value="COURIER_SCAM">Courier Scam</option>
          </select>
        </div>

        <div className="glass-card" style={{ overflow: "hidden" }}>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
              <div className="spinner" />
            </div>
          ) : data ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Case ID</th>
                  <th>Timestamp</th>
                  <th>Fraud Type</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                  <th>Victim City</th>
                  <th style={{ textAlign: "right" }}>Report Delay</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((c: any) => {
                  const badge = fraudBadge[c.fraud_type] || { bg: "rgba(100,116,139,0.1)", color: "#64748b" };
                  const isSelected = selectedCase?.complaint_id === c.complaint_id;
                  return (
                    <tr 
                      key={c.complaint_id} 
                      onClick={() => openInvestigation(c.complaint_id)}
                      style={{ 
                        cursor: "pointer", 
                        background: isSelected ? "rgba(255,255,255,0.05)" : undefined,
                        borderLeft: isSelected ? "2px solid var(--cyan)" : "2px solid transparent"
                      }}
                    >
                      <td className="mono" style={{ color: "#64748b" }}>{c.complaint_id}</td>
                      <td style={{ color: "#94a3b8" }}>{c.timestamp}</td>
                      <td>
                        <span style={{
                          display: "inline-block", padding: "4px 12px", borderRadius: 20,
                          fontSize: 11, fontWeight: 600, background: badge.bg, color: badge.color,
                        }}>
                          {c.fraud_type.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: "#e2e8f0" }}>
                        ₹{c.amount.toLocaleString("en-IN")}
                      </td>
                      <td style={{ color: "#94a3b8" }}>{c.victim_city}</td>
                      <td style={{ textAlign: "right", color: "#64748b" }}>{c.reporting_delay_mins} min</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : null}
        </div>

        {/* Pagination */}
        {data && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
            <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
              className="btn-primary" style={{ padding: "8px 20px", fontSize: 12, opacity: page === 0 ? 0.3 : 1 }}>
              ← Previous
            </button>
            <span style={{ fontSize: 13, color: "#64748b" }}>
              Page {page + 1} of {Math.ceil(data.total / 20).toLocaleString()}
            </span>
            <button onClick={() => setPage(page + 1)} disabled={(page + 1) * 20 >= data.total}
              className="btn-primary" style={{ padding: "8px 20px", fontSize: 12, opacity: (page + 1) * 20 >= data.total ? 0.3 : 1 }}>
              Next →
            </button>
          </div>
        )}
      </div>

      {/* ─── Case Investigation Drill-Down Panel ─── */}
      <AnimatePresence>
        {selectedCase && (
          <motion.div
            initial={{ width: 0, opacity: 0, marginLeft: 0 }}
            animate={{ width: 400, opacity: 1, marginLeft: 20 }}
            exit={{ width: 0, opacity: 0, marginLeft: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{ overflow: "hidden", flexShrink: 0 }}
          >
            <div className="glass-card" style={{ width: 400, height: "calc(100vh - 120px)", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{selectedCase.complaint_id}</h3>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Active Investigation</span>
                </div>
                <button onClick={() => setSelectedCase(null)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 20 }}>×</button>
              </div>

              <div style={{ padding: 20, flex: 1, overflowY: "auto" }}>
                {loadingCase || !selectedCase.timestamp ? (
                  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 100 }}>
                    <div className="spinner" />
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                    
                    {/* Basic Info */}
                    <div>
                      <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8, fontWeight: 600 }}>Case Details</p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div>
                          <p style={{ fontSize: 11, color: "var(--text-secondary)" }}>Amount Stolen</p>
                          <p style={{ fontSize: 16, fontWeight: 700, color: "var(--red)", fontFamily: "'JetBrains Mono', monospace" }}>₹{selectedCase.amount.toLocaleString("en-IN")}</p>
                        </div>
                        <div>
                          <p style={{ fontSize: 11, color: "var(--text-secondary)" }}>Fraud Type</p>
                          <p style={{ fontSize: 13, fontWeight: 600, color: fraudBadge[selectedCase.fraud_type]?.color || "#fff" }}>
                            {selectedCase.fraud_type.replace(/_/g, " ")}
                          </p>
                        </div>
                        <div>
                          <p style={{ fontSize: 11, color: "var(--text-secondary)" }}>Victim Location</p>
                          <p style={{ fontSize: 13, color: "var(--text-primary)" }}>{selectedCase.victim_city}, {selectedCase.victim_state}</p>
                        </div>
                        <div>
                          <p style={{ fontSize: 11, color: "var(--text-secondary)" }}>Reporting Delay</p>
                          <p style={{ fontSize: 13, color: "var(--text-primary)" }}>{selectedCase.reporting_delay_mins} mins</p>
                        </div>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div>
                      <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12, fontWeight: 600 }}>Event Timeline</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 12, position: "relative" }}>
                        <div style={{ position: "absolute", left: 5, top: 8, bottom: 8, width: 2, background: "rgba(255,255,255,0.05)" }} />
                        
                        <div style={{ display: "flex", gap: 12, position: "relative" }}>
                          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--red)", border: "3px solid #131320", zIndex: 1 }} />
                          <div>
                            <p style={{ fontSize: 12, fontWeight: 600 }}>Fraud Incident</p>
                            <p style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>
                              {new Date(new Date(selectedCase.timestamp).getTime() - selectedCase.reporting_delay_mins * 60000).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 12, position: "relative" }}>
                          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--orange)", border: "3px solid #131320", zIndex: 1 }} />
                          <div>
                            <p style={{ fontSize: 12, fontWeight: 600 }}>Complaint Registered</p>
                            <p style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>{new Date(selectedCase.timestamp).toLocaleString()}</p>
                          </div>
                        </div>
                        
                        <div style={{ display: "flex", gap: 12, position: "relative" }}>
                          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--cyan)", border: "3px solid #131320", zIndex: 1 }} />
                          <div>
                            <p style={{ fontSize: 12, fontWeight: 600 }}>Automated Triage</p>
                            <p style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>AI Model assigned severity</p>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ padding: 20, borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 10 }}>
                <button className="btn-primary" style={{ flex: 1, padding: "10px", display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>⚡</span> Predict Mule Flow
                </button>
                <button className="btn-primary" style={{ background: "rgba(239,68,68,0.1)", color: "var(--red)", border: "1px solid rgba(239,68,68,0.2)", padding: "10px 16px" }}>
                  Escalate
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

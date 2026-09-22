"use client";

import { useEffect, useState } from "react";
import { getComplaints } from "@/lib/api";

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

  useEffect(() => {
    setLoading(true);
    getComplaints({ limit: 20, offset: page * 20, fraud_type: filter || undefined })
      .then(setData).catch(console.error).finally(() => setLoading(false));
  }, [page, filter]);

  return (
    <div className="fade-in">
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
                return (
                  <tr key={c.complaint_id}>
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
  );
}

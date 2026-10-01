import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const api = axios.create({ baseURL: API_BASE });

export async function getComplaints(params?: {
  limit?: number;
  offset?: number;
  fraud_type?: string;
  city?: string;
}) {
  const res = await api.get("/complaints", { params });
  return res.data;
}

export async function getComplaint(id: string) {
  const res = await api.get(`/complaints/${id}`);
  return res.data;
}

export async function getRecentComplaints(limit = 10) {
  const res = await api.get("/complaints-recent", { params: { limit } });
  return res.data;
}

export async function getATMs(city?: string) {
  const res = await api.get("/atms", { params: { city, limit: 12000 } });
  return res.data;
}

export async function getCities() {
  const res = await api.get("/cities");
  return res.data;
}

export async function predict(complaint: {
  fraud_type: string;
  amount: number;
  victim_city: string;
  victim_state: string;
  last_mule_city: string;
  mule_chain_length: number;
  hour_of_day: number;
  day_of_week: number;
  reporting_delay_mins: number;
  complaint_id?: string;
}) {
  const res = await api.post("/predict", complaint);
  return res.data;
}

export async function predictPhase1(complaint: {
  fraud_type: string;
  amount: number;
  victim_city: string;
  victim_state: string;
  hour_of_day: number;
  day_of_week: number;
  reporting_delay_mins: number;
}) {
  const res = await api.post("/predict/phase1", complaint);
  return res.data;
}

export async function triggerDispatch(data: any) {
  const res = await api.post("/actions/dispatch", data);
  return res.data;
}

export async function triggerCMS(data: any) {
  const res = await api.post("/actions/cms-alert", data);
  return res.data;
}

export async function triggerFreeze(data: any) {
  const res = await api.post("/actions/freeze-account", data);
  return res.data;
}

export async function getNetwork(gangId?: string) {
  const res = await api.get("/network", { params: { gang_id: gangId, limit: 150 } });
  return res.data;
}

export async function getGangs() {
  const res = await api.get("/network/gangs");
  return res.data;
}

export async function getDashboard() {
  const res = await api.get("/analytics/dashboard");
  return res.data;
}

export async function getHeatmap() {
  const res = await api.get("/analytics/heatmap");
  return res.data;
}

export interface TraceNode {
  type: "victim" | "mule";
  id: string;
  hop: number;
  city: string | null;
  state: string | null;
  amount: number;
  timestamp: string;
  resolved: boolean;
  bank?: string | null;
  layer?: number | null;
  controlled_by?: string | null;
  gang_id?: string | null;
  is_active?: boolean | null;
}
export interface TraceEdge {
  hop: number;
  from: string;
  to: string;
  amount: number;
  method: string;
  timestamp: string;
}
export interface TraceResponse {
  complaint_id: string;
  status: "SIMULATED_TRACE" | "NO_LINKED_TRANSACTIONS";
  dataset_version: string;
  complaint: {
    fraud_type: string;
    amount: number;
    victim_city: string;
    victim_state: string;
    timestamp: string;
    hour_of_day: number;
    day_of_week: number;
    reporting_delay_mins: number;
  };
  linked_transactions: number;
  hop_count: number;
  nodes: TraceNode[];
  edges: TraceEdge[];
  last_known_city: string | null;
  last_known_node: string | null;
  trace_timestamp: string | null;
}
export async function getTrace(complaintId: string): Promise<TraceResponse> {
  const res = await api.get<TraceResponse>(`/trace/${encodeURIComponent(complaintId)}`);
  return res.data;
}

// ── Audit Trail API ──
export async function logPrediction(entry: any) {
  const res = await api.post("/audit/log", entry);
  return res.data;
}

export async function submitOfficerDecision(decision: {
  case_id: string;
  decision: string;
  officer_id?: string;
  officer_name?: string;
  remarks?: string;
}) {
  const res = await api.post("/audit/decide", decision);
  return res.data;
}

export async function getAuditTrail(limit = 50) {
  const res = await api.get("/audit/trail", { params: { limit } });
  return res.data;
}

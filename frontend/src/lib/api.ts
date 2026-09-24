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
  const res = await api.get("/atms", { params: { city, limit: 5000 } });
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
}) {
  const res = await api.post("/predict", complaint);
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

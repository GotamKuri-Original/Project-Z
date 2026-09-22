"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { getATMs } from "@/lib/api";

const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import("react-leaflet").then((m) => m.CircleMarker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), { ssr: false });

const FILTER_CITIES = ["", "Delhi", "Mumbai", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Pune", "Jaipur", "Lucknow", "Jamtara", "Nuh"];

export default function MapPage() {
  const [atms, setAtms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState("");
  const [stats, setStats] = useState({ total: 0, highRisk: 0, medRisk: 0 });

  useEffect(() => {
    import("leaflet/dist/leaflet.css");
    setLoading(true);
    getATMs(selectedCity || undefined)
      .then((data) => {
        const list = data.data || [];
        setAtms(list);
        setStats({
          total: list.length,
          highRisk: list.filter((a: any) => a.near_state_border && a.near_highway).length,
          medRisk: list.filter((a: any) => a.near_highway || a.near_bus_station).length,
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedCity]);

  const getRiskColor = (atm: any) => {
    if (atm.near_state_border && atm.near_highway) return "#ff4757";
    if (atm.near_highway || atm.near_bus_station) return "#ff9f43";
    return "#06d6a0";
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>ATM Risk Map</h1>
          <p style={{ color: "#475569", marginTop: 4, fontSize: 14 }}>
            Live visualization of {stats.total.toLocaleString()} ATMs across India
          </p>
        </div>
        <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} className="input-field" style={{ width: 200 }}>
          <option value="">All Cities</option>
          {FILTER_CITIES.filter(Boolean).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
        <div className="glass-card stat-card cyan" style={{ padding: "14px 18px", textAlign: "center" }}>
          <p style={{ fontSize: 24, fontWeight: 800, color: "#06d6a0" }}>{stats.total.toLocaleString()}</p>
          <p style={{ fontSize: 11, color: "#64748b" }}>Total ATMs</p>
        </div>
        <div className="glass-card stat-card red" style={{ padding: "14px 18px", textAlign: "center" }}>
          <p style={{ fontSize: 24, fontWeight: 800, color: "#ff4757" }}>{stats.highRisk}</p>
          <p style={{ fontSize: 11, color: "#64748b" }}>High Risk (Border + Highway)</p>
        </div>
        <div className="glass-card stat-card orange" style={{ padding: "14px 18px", textAlign: "center" }}>
          <p style={{ fontSize: 24, fontWeight: 800, color: "#ff9f43" }}>{stats.medRisk}</p>
          <p style={{ fontSize: 11, color: "#64748b" }}>Medium Risk</p>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 20, marginBottom: 12, fontSize: 12, color: "#64748b" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff4757", display: "inline-block" }} /> Critical</span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff9f43", display: "inline-block" }} /> High</span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: "#06d6a0", display: "inline-block" }} /> Normal</span>
      </div>

      {/* Map */}
      <div className="glass-card" style={{ overflow: "hidden", height: "65vh" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
            <div className="spinner" />
          </div>
        ) : (
          <MapContainer center={[22.5, 78.9]} zoom={5} style={{ height: "100%", width: "100%" }} scrollWheelZoom={true}>
            <TileLayer
              attribution='&copy; CARTO'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            {atms.slice(0, 2000).map((atm: any) => (
              <CircleMarker key={atm.atm_id} center={[atm.lat, atm.lng]} radius={4}
                pathOptions={{ color: getRiskColor(atm), fillColor: getRiskColor(atm), fillOpacity: 0.7, weight: 1 }}>
                <Popup>
                  <div style={{ color: "#000", fontSize: 12, lineHeight: 1.6 }}>
                    <strong>{atm.atm_id}</strong><br />{atm.bank}<br />{atm.city}, {atm.state}<br />Type: {atm.area_type}
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        )}
      </div>
    </div>
  );
}

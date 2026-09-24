"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { getATMs } from "@/lib/api";

const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import("react-leaflet").then((m) => m.CircleMarker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), { ssr: false });
const MarkerClusterGroup = dynamic(() => import("react-leaflet-cluster"), { ssr: false });

const FILTER_CITIES = ["", "Delhi", "Mumbai", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Pune", "Jaipur", "Lucknow", "Jamtara", "Nuh"];

export default function MapPage() {
  const [atms, setAtms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState("");
  const [muleTracker, setMuleTracker] = useState("");
  const [stats, setStats] = useState({ total: 0, highRisk: 0, medRisk: 0 });
  const [error, setError] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const focus = params.get("focusCity");
      const mule = params.get("mule");
      if (focus && FILTER_CITIES.includes(focus)) setSelectedCity(focus);
      if (mule) setMuleTracker(mule);
    }
  }, []);

  useEffect(() => {
    import("leaflet/dist/leaflet.css");
    setLoading(true);
    setError(false);
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
      .catch((err) => {
        console.error(err);
        setError(true);
      })
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

      {/* Live Threat Banner */}
      {muleTracker && selectedCity && (
        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid var(--red)", borderRadius: 8, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 11, color: "var(--red)", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.5px" }}>🔴 ACTIVE THREAT TRACKING</p>
            <p style={{ fontSize: 14, color: "var(--text-primary)", marginTop: 4 }}>
              Tracing mule accounts originating from <strong>{muleTracker}</strong>. High likelihood of cashout at ATMs in <strong>{selectedCity}</strong>.
            </p>
          </div>
          <button className="btn-primary" onClick={() => { setMuleTracker(""); setSelectedCity(""); }} style={{ background: "transparent", border: "1px solid var(--border-color)", padding: "6px 12px", fontSize: 11 }}>
            CLEAR TRACKER
          </button>
        </div>
      )}

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
      <div className="glass-card" style={{ overflow: "hidden", height: "85vh" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
            <div className="spinner" />
          </div>
        ) : error ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center" }}>
            <p style={{ fontSize: 16, color: "var(--red)", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>⚠️ SERVER DISCONNECTED</p>
            <p style={{ color: "var(--text-muted)", marginTop: 8, fontSize: 13 }}>Failed to load live ATM risk data.</p>
            <code className="mono" style={{ display: "block", marginTop: 12, color: "var(--blue)", fontSize: 12 }}>
              python -m app.main
            </code>
          </div>
        ) : (
          <MapContainer
            key={`${selectedCity}-${atms.length > 0 ? atms[0].lat : 'default'}`}
            center={selectedCity && atms.length > 0 ? [atms[0].lat, atms[0].lng] : [22.5, 78.9]}
            zoom={selectedCity ? 11 : 5}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom={true}
            maxBounds={[[6.46, 68.1], [35.5, 97.4]]}
            maxBoundsViscosity={1.0}
            minZoom={4}
          >
            <TileLayer
              attribution='&copy; CARTO'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            <MarkerClusterGroup chunkedLoading>
              {atms.slice(0, 2000).map((atm: any) => (
                <CircleMarker key={atm.atm_id} center={[atm.lat, atm.lng]} radius={10}
                  pathOptions={{ color: getRiskColor(atm), fillColor: getRiskColor(atm), fillOpacity: 0.7, weight: 1 }}>
                  <Popup>
                    <div style={{ color: "#000", fontSize: 12, lineHeight: 1.6 }}>
                      <strong>{atm.atm_id}</strong><br />{atm.bank}<br />{atm.city}, {atm.state}<br />Type: {atm.area_type}
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MarkerClusterGroup>
          </MapContainer>
        )}
      </div>
    </div>
  );
}

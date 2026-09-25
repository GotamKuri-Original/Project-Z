"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { getATMs } from "@/lib/api";

interface ATM {
  atm_id: string;
  bank: string;
  city: string;
  state: string;
  area_type: string;
  lat: number;
  lng: number;
  near_state_border: boolean;
  near_highway: boolean;
  near_bus_station: boolean;
}


const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import("react-leaflet").then((m) => m.CircleMarker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), { ssr: false });

const FILTER_CITIES = [
  "", "Delhi", "Mumbai", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Pune", 
  "Ahmedabad", "Jaipur", "Lucknow", "Chandigarh", "Patna", "Surat", "Indore", 
  "Kochi", "Nuh", "Mathura", "Bharatpur", "Jamtara", "Deoghar", "Ranchi", 
  "Nagpur", "Coimbatore", "Guwahati", "Visakhapatnam"
];

export default function MapPage() {
  const [atms, setAtms] = useState<ATM[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState("");
  const [muleTracker, setMuleTracker] = useState("");
  const [stats, setStats] = useState({ total: 0, highRisk: 0, medRisk: 0 });
  const [error, setError] = useState(false);
  const [cctvModal, setCctvModal] = useState<ATM | null>(null);
  const [lockModal, setLockModal] = useState<ATM | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (cctvModal && videoElement) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          if (videoElement) {
             videoElement.srcObject = stream;
          }
        })
        .catch(err => console.error("Webcam error:", err));
    }
    
    return () => {
       if (videoElement && videoElement.srcObject) {
         const tracks = (videoElement.srcObject as MediaStream).getTracks();
         tracks.forEach(t => t.stop());
       }
    };
  }, [cctvModal]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const focus = params.get("focusCity");
      const mule = params.get("mule");
      setTimeout(() => {
        if (focus && FILTER_CITIES.includes(focus)) setSelectedCity(focus);
        if (mule) setMuleTracker(mule);
      }, 0);
    }
  }, []);

  useEffect(() => {
    import("leaflet/dist/leaflet.css");
    getATMs(selectedCity || undefined)
      .then((data) => {
        const list = data.data || [];
        setAtms(list);
        setStats({
          total: list.length,
          highRisk: list.filter((a: ATM) => a.near_state_border && a.near_highway).length,
          medRisk: list.filter((a: ATM) => a.near_highway || a.near_bus_station).length,
        });
      })
      .catch((err) => {
        console.error(err);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [selectedCity]);

  const getRiskColor = (atm: ATM) => {
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
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              className="dark-map-tiles"
            />
              {atms.slice(0, 2000).map((atm: ATM) => (
                <CircleMarker key={atm.atm_id} center={[atm.lat, atm.lng]} radius={10}
                  pathOptions={{ color: getRiskColor(atm), fillColor: getRiskColor(atm), fillOpacity: 0.7, weight: 1 }}>
                  <Popup>
                    <div style={{ color: "#000", fontSize: 12, lineHeight: 1.6 }}>
                      <strong>{atm.atm_id}</strong><br />{atm.bank}<br />{atm.city}, {atm.state}<br />Type: {atm.area_type}
                      <div style={{ marginTop: 8, display: 'flex', gap: 6, flexDirection: 'column' }}>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setCctvModal(atm); }}
                          style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '6px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 'bold' }}>
                          📷 ACCESS CCTV
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setLockModal(atm); }}
                          style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 'bold' }}>
                          🔒 INITIATE GEOFENCE LOCK
                        </button>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
          </MapContainer>
        )}
      </div>

      {/* CCTV Modal */}
      {cctvModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, width: 500, overflow: 'hidden' }}>
            <div style={{ padding: 12, background: '#1e293b', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #334155' }}>
              <span style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>📷 LIVE CCTV FEED — ATM #{cctvModal.atm_id}</span>
              <button onClick={() => setCctvModal(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>✖</button>
            </div>
            <div style={{ padding: 20, textAlign: 'center' }}>
              <div style={{ width: '100%', height: 300, background: '#000', borderRadius: 4, position: 'relative', overflow: 'hidden', border: '2px solid #334155', marginBottom: 12 }}>
                <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(100%) contrast(1.2)' }} />
                <div style={{ position: 'absolute', top: '10%', left: '30%', width: '40%', height: '50%', border: '2px dashed rgba(34, 197, 94, 0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', color: 'rgba(34, 197, 94, 0.5)', fontSize: 10, paddingTop: 4 }}>FACE DETECTED</div>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '100%', background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 4px)', pointerEvents: 'none' }}></div>
                <div style={{ position: 'absolute', bottom: 8, left: 8, color: '#ef4444', fontSize: 12, fontFamily: 'monospace', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }}></span> REC
                </div>
              </div>
              <p style={{ color: '#22c55e', fontWeight: 'bold', fontSize: 14 }}>✅ SUSPECT MATCH IDENTIFIED</p>
              <p style={{ color: '#cbd5e1', fontSize: 12, marginTop: 4 }}>Live feed verifying presence at ATM Location</p>
            </div>
          </div>
        </div>
      )}

      {/* Geofence Lock Modal */}
      {lockModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#0f172a', border: '1px solid #ef4444', borderRadius: 8, width: 400, padding: 24, textAlign: 'center' }}>
             <h2 style={{ color: '#ef4444', marginBottom: 12 }}>🔒 HARDWARE OVERRIDE</h2>
             <p style={{ color: '#cbd5e1', fontSize: 14, marginBottom: 20 }}>
               Transmitting Geofence Lock protocol to Bank Server for <strong>ATM #{lockModal.atm_id}</strong>. 
               Cash dispenser will be disabled for 30 minutes.
             </p>
             <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
               <button onClick={() => {
                 const btn = document.getElementById('lock-confirm-btn');
                 if (btn) {
                   btn.textContent = '✅ LOCK ACTIVE';
                   btn.style.background = '#10b981';
                   btn.style.pointerEvents = 'none';
                 }
                 setTimeout(() => setLockModal(null), 2000);
               }} id="lock-confirm-btn" style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.3s ease' }}>CONFIRM LOCK</button>
               <button onClick={() => setLockModal(null)} style={{ background: 'transparent', color: '#94a3b8', border: '1px solid #334155', padding: '8px 16px', borderRadius: 4, cursor: 'pointer' }}>CANCEL</button>
             </div>
          </div>
        </div>
      )}

    </div>
  );
}

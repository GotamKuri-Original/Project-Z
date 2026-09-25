"use client";

import "leaflet/dist/leaflet.css";

import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import type { LatLngTuple, Marker as LeafletMarker } from "leaflet";
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

type TargetAtm = Pick<ATM, "atm_id" | "lat" | "lng"> & Partial<Omit<ATM, "atm_id" | "lat" | "lng">>;

type LockStatus = "idle" | "transmitting" | "active";

interface AtmResult {
  city: string;
  atms: ATM[];
  failed: boolean;
}

interface MapViewControllerProps {
  target: TargetAtm | null;
  /** null = hold the current view (data still loading); [] = national view */
  focusPoints: LatLngTuple[] | null;
  popupContent: ReactNode;
}

const INDIA_CENTER: LatLngTuple = [22.5, 78.9];
const INDIA_ZOOM = 5;
const TARGET_ZOOM = 16;
const MAX_RENDERED_ATMS = 2000;
const EMPTY_ATMS: ATM[] = [];
const NATIONAL_VIEW: LatLngTuple[] = [];

const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import("react-leaflet").then((m) => m.CircleMarker), { ssr: false });

// useMap() must run inside MapContainer, and leaflet touches `window` on import,
// so the controller is built inside the client-only dynamic loader.
const MapViewController = dynamic<MapViewControllerProps>(
  async () => {
    const [{ useMap, Marker, Popup }, { divIcon, latLngBounds }] = await Promise.all([
      import("react-leaflet"),
      import("leaflet"),
    ]);

    const targetIcon = divIcon({
      className: "target-lock-icon",
      html: '<span class="target-lock"><span class="target-lock__ring"></span><span class="target-lock__ring target-lock__ring--delayed"></span><span class="target-lock__core"></span></span>',
      iconSize: [48, 48],
      iconAnchor: [24, 24],
      popupAnchor: [0, -20],
    });

    function Controller({ target, focusPoints, popupContent }: MapViewControllerProps) {
      const map = useMap();
      const markerRef = useRef<LeafletMarker | null>(null);

      const targetId = target?.atm_id;
      const targetLat = target?.lat;
      const targetLng = target?.lng;
      const hasTarget = targetId !== undefined;

      useEffect(() => {
        if (targetId === undefined || targetLat === undefined || targetLng === undefined) return;
        
        const openPopup = () => markerRef.current?.openPopup();
        map.once("moveend", openPopup);
        map.flyTo([targetLat, targetLng], TARGET_ZOOM, { duration: 1.6 });

        return () => {
          map.off("moveend", openPopup);
        };
      }, [map, targetId, targetLat, targetLng]);

      useEffect(() => {
        if (hasTarget || focusPoints === null) return;
        
        if (focusPoints.length === 0) {
          map.flyTo(INDIA_CENTER, INDIA_ZOOM, { duration: 1 });
          return;
        }

        map.flyToBounds(latLngBounds(focusPoints), { padding: [40, 40], maxZoom: 13, duration: 1.2 });
      }, [map, hasTarget, focusPoints]);

      if (!target) return null;

      return (
        <Marker ref={markerRef} position={[target.lat, target.lng]} icon={targetIcon} zIndexOffset={1000}>
          <Popup>{popupContent}</Popup>
        </Marker>
      );
    }

    return Controller;
  },
  { ssr: false },
);

const FILTER_CITIES = [
  "", "Delhi", "Mumbai", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Pune", 
  "Ahmedabad", "Jaipur", "Lucknow", "Chandigarh", "Patna", "Surat", "Indore", 
  "Kochi", "Nuh", "Mathura", "Bharatpur", "Jamtara", "Deoghar", "Ranchi", 
  "Nagpur", "Coimbatore", "Guwahati", "Visakhapatnam"
];

function parseTargetFromParams(params: URLSearchParams): TargetAtm | null {
  const atmId = params.get("atmId");
  const lat = Number.parseFloat(params.get("lat") ?? "");
  const lng = Number.parseFloat(params.get("lng") ?? "");

  if (!atmId || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { atm_id: atmId, lat, lng, city: params.get("focusCity") ?? undefined };
}

const getRiskColor = (atm: ATM) => {
  if (atm.near_state_border && atm.near_highway) return "#ff4757";
  if (atm.near_highway || atm.near_bus_station) return "#ff9f43";
  return "#06d6a0";
};

export default function MapPage() {
  return (
    <Suspense
      fallback={
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
          <div className="spinner" />
        </div>
      }
    >
      <MapPageContent />
    </Suspense>
  );
}

function MapPageContent() {
  const searchParams = useSearchParams();

  // Seed state straight from the URL so the first fetch is already city-scoped 
  // (no "" -> focusCity double-load of 5,000 ATMs).
  const [selectedCity, setSelectedCity] = useState(() => searchParams.get("focusCity") ?? "");
  const [muleTracker, setMuleTracker] = useState(() => searchParams.get("mule") ?? "");
  const [target, setTarget] = useState<TargetAtm | null>(() => parseTargetFromParams(searchParams));

  const [atmResult, setAtmResult] = useState<AtmResult | null>(null);
  
  const [cctvModal, setCctvModal] = useState<TargetAtm | null>(null);
  const [lockModal, setLockModal] = useState<TargetAtm | null>(null);
  const [lockStatus, setLockStatus] = useState<LockStatus>("idle");
  const [lockedAtmIds, setLockedAtmIds] = useState<ReadonlySet<string>>(() => new Set());
  const videoRef = useRef<HTMLVideoElement>(null);

  const loading = atmResult?.city !== selectedCity;
  const atms = atmResult?.atms ?? EMPTY_ATMS;
  const error = !loading && atmResult?.failed === true;

  const stats = useMemo(() => ({
    total: atms.length,
    highRisk: atms.filter((a) => a.near_state_border && a.near_highway).length,
    medRisk: atms.filter((a) => a.near_highway || a.near_bus_station).length,
  }), [atms]);

  const focusPoints = useMemo<LatLngTuple[] | null>(() => {
    if (loading) return null;
    if (!selectedCity || atms.length === 0) return NATIONAL_VIEW;
    return atms.map((a) => [a.lat, a.lng]);
  }, [loading, selectedCity, atms]);

  const targetAtm = useMemo<TargetAtm | null>(() => {
    if (!target) return null;
    return atms.find((a) => a.atm_id === target.atm_id) ?? target;
  }, [atms, target]);

  const cityOptions = useMemo(
    () => (selectedCity && !FILTER_CITIES.includes(selectedCity) ? [...FILTER_CITIES, selectedCity] : FILTER_CITIES),
    [selectedCity],
  );

  useEffect(() => {
    let cancelled = false;

    getATMs(selectedCity || undefined)
      .then((data) => {
        if (!cancelled) setAtmResult({ city: selectedCity, atms: data.data || [], failed: false });
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setAtmResult({ city: selectedCity, atms: [], failed: true });
      });

    return () => {
      cancelled = true;
    };
  }, [selectedCity]);

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
    if (!lockModal) return;

    if (lockStatus === "transmitting") {
      const timer = setTimeout(() => {
        setLockStatus("active");
        setLockedAtmIds((prev) => new Set(prev).add(lockModal.atm_id));
      }, 1200);
      return () => clearTimeout(timer);
    }

    if (lockStatus === "active") {
      const timer = setTimeout(() => {
        setLockModal(null);
        setLockStatus("idle");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [lockStatus, lockModal]);

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    setTarget(null);
  };

  const clearTracker = () => {
    setMuleTracker("");
    setSelectedCity("");
    setTarget(null);
  };

  const openLockModal = (atm: TargetAtm) => {
    setLockStatus("idle");
    setLockModal(atm);
  };

  const closeLockModal = () => {
    setLockModal(null);
    setLockStatus("idle");
  };

  const renderAtmPopup = (atm: TargetAtm) => {
    const isLocked = lockedAtmIds.has(atm.atm_id);

    return (
      <div style={{ color: "#000", fontSize: 12, lineHeight: 1.6, minWidth: 180 }}>
        <p style={{ fontSize: 10, fontWeight: 800, color: "#ef4444", letterSpacing: "0.6px", fontFamily: "'JetBrains Mono', monospace" }}>
          ◎ TARGET LOCKED
        </p>
        <strong>{atm.atm_id}</strong>
        {atm.bank && <><br />{atm.bank}</>}
        {atm.city && <><br />{atm.city}{atm.state ? `, ${atm.state}` : ""}</>}
        {atm.area_type && <><br />Type: {atm.area_type}</>}
        <br />
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#475569" }}>
          {atm.lat.toFixed(5)}, {atm.lng.toFixed(5)}
        </span>
        
        <div style={{ marginTop: 8, display: "flex", gap: 6, flexDirection: "column" }}>
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); setCctvModal(atm); }}
            style={{ background: "#3b82f6", color: "white", border: "none", padding: "6px 10px", borderRadius: 4, cursor: "pointer", fontSize: 11, fontWeight: "bold" }}>
            📷 ACCESS CCTV
          </button>
          <button 
            type="button"
            disabled={isLocked}
            onClick={(e) => { e.stopPropagation(); openLockModal(atm); }}
            style={{ 
              background: isLocked ? "#10b981" : "#ef4444", 
              color: "white", border: "none", padding: "6px 10px", 
              borderRadius: 4, cursor: isLocked ? "default" : "pointer", 
              fontSize: 11, fontWeight: "bold",
            }}>
            {isLocked ? "✅ GEOFENCE LOCK ACTIVE" : "🔒 INITIATE GEOFENCE LOCK"}
          </button>
        </div>
      </div>
    );
  };

  const lockButtonLabel = lockStatus === "transmitting" ? "TRANSMITTING…" : lockStatus === "active" ? "✅ LOCK ACTIVE" : "CONFIRM LOCK";
  const lockButtonColor = lockStatus === "active" ? "#10b981" : lockStatus === "transmitting" ? "#f59e0b" : "#ef4444";

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>ATM Risk Map</h1>
          <p style={{ color: "#475569", marginTop: 4, fontSize: 14 }}>
            Live visualization of {stats.total.toLocaleString()} ATMs across India
          </p>
        </div>
        <select 
          aria-label="Filter ATMs by city"
          value={selectedCity} 
          onChange={(e) => handleCityChange(e.target.value)} 
          className="input-field" 
          style={{ width: 200 }}
        >
          <option value="">All Cities</option>
          {cityOptions.filter(Boolean).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Live Threat Banner */}
      {muleTracker && selectedCity && (
        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid var(--red)", borderRadius: 8, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div>
            <p style={{ fontSize: 11, color: "var(--red)", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.5px" }}>🔴 ACTIVE THREAT TRACKING</p>
            <p style={{ fontSize: 14, color: "var(--text-primary)", marginTop: 4 }}>
              Tracing mule accounts originating from <strong>{muleTracker}</strong>. High likelihood of cashout at ATMs in <strong>{selectedCity}</strong>.
            </p>
            {targetAtm && (
              <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>
                PREDICTED TARGET: {targetAtm.bank ? `${targetAtm.bank} ` : ""}ATM #{targetAtm.atm_id} @ {targetAtm.lat.toFixed(4)}, {targetAtm.lng.toFixed(4)}
              </p>
            )}
          </div>
          <button type="button" className="btn-primary" onClick={clearTracker} style={{ background: "transparent", color: "var(--text-primary)", border: "1px solid var(--border-color)", padding: "6px 12px", fontSize: 11, whiteSpace: "nowrap" }}>
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
        {targetAtm && (
          <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--red)" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", border: "2px solid var(--red)", boxShadow: "0 0 6px rgba(239,68,68,0.8)", display: "inline-block" }} /> Predicted Target
          </span>
        )}
      </div>

      {/* Map */}
      <div className="glass-card" style={{ overflow: "hidden", height: "85vh", position: "relative" }}>
        {error ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center" }}>
            <p style={{ fontSize: 16, color: "var(--red)", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>⚠️ SERVER DISCONNECTED</p>
            <p style={{ color: "var(--text-muted)", marginTop: 8, fontSize: 13 }}>Failed to load live ATM risk data.</p>
            <code className="mono" style={{ display: "block", marginTop: 12, color: "var(--blue)", fontSize: 12 }}>
              python -m app.main
            </code>
          </div>
        ) : (
          <>
            <MapContainer
              center={target ? [target.lat, target.lng] : INDIA_CENTER}
              zoom={target ? 11 : INDIA_ZOOM}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom={true}
              maxBounds={[[6.46, 68.1], [35.5, 97.4]]}
              maxBoundsViscosity={1.0}
              minZoom={4}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19}
              />
              {atms.slice(0, MAX_RENDERED_ATMS).map((atm) => (
                <CircleMarker 
                  key={atm.atm_id} 
                  center={[atm.lat, atm.lng]} 
                  radius={10}
                  pathOptions={{ color: getRiskColor(atm), fillColor: getRiskColor(atm), fillOpacity: 0.7, weight: 1 }}
                  eventHandlers={{ click: () => setTarget(atm) }}
                />
              ))}
              
              <MapViewController 
                target={targetAtm} 
                focusPoints={focusPoints} 
                popupContent={targetAtm ? renderAtmPopup(targetAtm) : null}
              />
            </MapContainer>
            
            {loading && (
              <div 
                role="status" 
                aria-live="polite"
                style={{ 
                  position: "absolute", inset: 0, zIndex: 1000, 
                  display: "flex", alignItems: "center", justifyContent: "center", 
                  background: "rgba(10,10,15,0.55)", pointerEvents: "none" 
                }}
              >
                <div className="spinner" />
                <span className="sr-only">Loading ATM data</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* CCTV Modal */}
      {cctvModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div role="dialog" aria-modal="true" aria-labelledby="cctv-modal-title" style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, width: 500, overflow: 'hidden' }}>
            <div style={{ padding: 12, background: '#1e293b', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #334155' }}>
              <span id="cctv-modal-title" style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>📷 LIVE CCTV FEED — ATM #{cctvModal.atm_id}</span>
              <button type="button" aria-label="Close CCTV feed" onClick={() => setCctvModal(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>✖</button>
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
          <div role="dialog" aria-modal="true" aria-labelledby="lock-modal-title" style={{ background: '#0f172a', border: `1px solid ${lockButtonColor}`, borderRadius: 8, width: 400, padding: 24, textAlign: 'center', transition: 'border-color 0.3s ease' }}>
             <h2 id="lock-modal-title" style={{ color: '#ef4444', marginBottom: 12 }}>🔒 HARDWARE OVERRIDE</h2>
             <p style={{ color: '#cbd5e1', fontSize: 14, marginBottom: 20 }}>
               Transmitting Geofence Lock protocol to Bank Server for <strong>ATM #{lockModal.atm_id}</strong>. 
               Cash dispenser will be disabled for 30 minutes.
             </p>
             
             <p role="status" aria-live="polite" className="sr-only">{lockStatus === "idle" ? "" : lockButtonLabel}</p>
             
             <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
               <button 
                 type="button"
                 disabled={lockStatus !== "idle"}
                 onClick={() => setLockStatus("transmitting")} 
                 style={{ 
                   background: lockButtonColor, color: 'white', border: 'none', 
                   padding: '8px 16px', borderRadius: 4, 
                   cursor: lockStatus === "idle" ? 'pointer' : 'default', 
                   fontWeight: 'bold', transition: 'all 0.3s ease' 
                 }}
               >
                 {lockButtonLabel}
               </button>
               {lockStatus === "idle" && (
                 <button type="button" onClick={closeLockModal} style={{ background: 'transparent', color: '#94a3b8', border: '1px solid #334155', padding: '8px 16px', borderRadius: 4, cursor: 'pointer' }}>CANCEL</button>
               )}
             </div>
          </div>
        </div>
      )}

    </div>
  );
}

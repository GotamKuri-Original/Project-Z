"use client";

import "leaflet/dist/leaflet.css";

import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import type { DivIcon, LatLngTuple, Marker as LeafletMarker } from "leaflet";
import { getATMs } from "@/lib/api";
import { LiveCctvModal } from "@/components/LiveCctvModal";

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

type TargetAtm = Pick<ATM, "atm_id" | "lat" | "lng"> & Partial<Omit<ATM, "atm_id" | "lat" | "lng">> & { rank?: number };

type LockStatus = "idle" | "transmitting" | "active";

interface AtmResult {
  city: string;
  atms: ATM[];
  failed: boolean;
}

interface MapViewControllerProps {
  targets: TargetAtm[];
  /** null = hold the current view (data still loading); [] = national view */
  focusPoints: LatLngTuple[] | null;
  renderPopup: (atm: TargetAtm) => ReactNode;
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

    const RINGS_HTML =
      '<span class="target-lock__ring"></span><span class="target-lock__ring target-lock__ring--delayed"></span><span class="target-lock__core"></span>';

    const iconCache = new Map<number, DivIcon>();
    const getTargetIcon = (rank: number) => {
      let icon = iconCache.get(rank);
      if (!icon) {
        const badge = rank > 0 ? `<span class="target-lock__rank">${rank}</span>` : "";
        icon = divIcon({
          className: "target-lock-icon",
          html: `<span class="target-lock">${RINGS_HTML}${badge}</span>`,
          iconSize: [48, 48],
          iconAnchor: [24, 24],
          popupAnchor: [0, -20],
        });
        iconCache.set(rank, icon);
      }
      return icon;
    };

    function Controller({ targets, focusPoints, renderPopup }: MapViewControllerProps) {
      const map = useMap();
      const markerRefs = useRef(new Map<string, LeafletMarker>());

      const hasTargets = targets.length > 0;
      const targetsKey = targets.map((t) => `${t.atm_id}@${t.lat},${t.lng}`).join("|");

      useEffect(() => {
        if (targets.length === 0) return;

        if (targets.length === 1) {
          const [only] = targets;
          const openPopup = () => markerRefs.current.get(only.atm_id)?.openPopup();
          map.once("moveend", openPopup);
          map.flyTo([only.lat, only.lng], TARGET_ZOOM, { duration: 1.6 });

          return () => {
            map.off("moveend", openPopup);
          };
        }

        const bounds = latLngBounds(targets.map((t): LatLngTuple => [t.lat, t.lng]));
        map.flyToBounds(bounds, { padding: [60, 60], maxZoom: 14, duration: 1.6 });
        // eslint-disable-next-line react-hooks/exhaustive-deps -- targetsKey covers every field read; re-flying when ATM details load would be jarring
      }, [map, targetsKey]);

      useEffect(() => {
        if (hasTargets || focusPoints === null) return;
        
        if (focusPoints.length === 0) {
          map.flyTo(INDIA_CENTER, INDIA_ZOOM, { duration: 1 });
          return;
        }

        map.flyToBounds(latLngBounds(focusPoints), { padding: [40, 40], maxZoom: 13, duration: 1.2 });
      }, [map, hasTargets, focusPoints]);

      const showRanks = targets.length > 1;

      return (
        <>
          {targets.map((t, i) => (
            <Marker
              key={t.atm_id}
              ref={(marker) => {
                if (marker) markerRefs.current.set(t.atm_id, marker);
                else markerRefs.current.delete(t.atm_id);
              }}
              position={[t.lat, t.lng]}
              icon={getTargetIcon(showRanks ? t.rank ?? i + 1 : 0)}
              zIndexOffset={1000 - i}
            >
              <Popup>{renderPopup(t)}</Popup>
            </Marker>
          ))}
        </>
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

function parseTargetsFromParams(params: URLSearchParams): TargetAtm[] {
  const ids = params.getAll("atmId");
  const lats = params.getAll("lat");
  const lngs = params.getAll("lng");
  const banks = params.getAll("atmBank");
  const cities = params.getAll("atmCity");
  const fallbackCity = params.get("focusCity") ?? undefined;

  const seen = new Set<string>();
  const targets: TargetAtm[] = [];

  ids.forEach((atmId, i) => {
    const lat = Number.parseFloat(lats[i] ?? "");
    const lng = Number.parseFloat(lngs[i] ?? "");

    if (!atmId || seen.has(atmId) || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    seen.add(atmId);

    targets.push({
      atm_id: atmId,
      lat,
      lng,
      bank: banks[i] || undefined,
      city: cities[i] || fallbackCity,
      rank: targets.length + 1,
    });
  });

  return targets;
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
  
  const [targets, setTargets] = useState<TargetAtm[]>(() => parseTargetsFromParams(searchParams));

  const [atmResult, setAtmResult] = useState<AtmResult | null>(null);
  
  const [cctvModal, setCctvModal] = useState<TargetAtm | null>(null);
  const [lockModal, setLockModal] = useState<TargetAtm | null>(null);
  const [lockStatus, setLockStatus] = useState<LockStatus>("idle");
  const [lockedAtmIds, setLockedAtmIds] = useState<ReadonlySet<string>>(() => new Set());

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

  const resolvedTargets = useMemo<TargetAtm[]>(
    () =>
      targets.map((t) => {
        const match = atms.find((a) => a.atm_id === t.atm_id);
        return match ? { ...match, rank: t.rank } : t;
      }),
    [atms, targets],
  );

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
    setTargets([]);
  };

  const clearTracker = () => {
    setMuleTracker("");
    setSelectedCity("");
    setTargets([]);
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
          ◎ {atm.rank ? `PREDICTED TARGET #${atm.rank}` : "TARGET LOCKED"}
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
            CONNECT TO LIVE CCTV
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
            {resolvedTargets.length > 0 && (
              <ul style={{ listStyle: "none", padding: 0, margin: "4px 0 0", display: "flex", flexDirection: "column", gap: 2 }}>
                {resolvedTargets.map((t) => (
                  <li key={t.atm_id} style={{ fontSize: 11, color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace" }}>
                    PREDICTED TARGET{t.rank ? ` #${t.rank}` : ""}: {t.bank ? `${t.bank} ` : ""}ATM #{t.atm_id} {t.city ? ` (${t.city})` : ""} @ {t.lat.toFixed(4)}, {t.lng.toFixed(4)}
                  </li>
                ))}
              </ul>
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
        {resolvedTargets.length > 0 && (
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
              center={targets[0] ? [targets[0].lat, targets[0].lng] : INDIA_CENTER}
              zoom={targets[0] ? 11 : INDIA_ZOOM}
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
                  eventHandlers={{ click: () => setTargets([atm]) }}
                />
              ))}
              
              <MapViewController 
                targets={resolvedTargets} 
                focusPoints={focusPoints} 
                renderPopup={renderAtmPopup}
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
      {cctvModal && <LiveCctvModal atm={cctvModal} onClose={() => setCctvModal(null)} />}

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

"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export interface CctvTarget {
  atm_id: string;
  bank?: string;
  city?: string;
}

interface EvidenceSnapshot {
  id: number;
  url: string;
  fileName: string;
  takenAt: Date;
  trigger: "motion" | "manual";
}

type FeedStatus = "connecting" | "live" | "error";

const MAX_SNAPSHOTS = 12;
const MONO = "'JetBrains Mono', monospace";

function describeCameraError(err: unknown) {
  const name = err instanceof DOMException ? err.name : "";
  switch (name) {
    case "NotAllowedError":
      return "Camera permission was denied. Allow camera access from the browser address bar, then retry.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No matching camera was found. Make sure your phone webcam app is connected.";
    case "NotReadableError":
      return "The camera is busy in another application. Close it there, then retry.";
    default:
      return "Could not start the camera feed.";
  }
}

export function LiveCctvModal({ atm, onClose }: { atm: CctvTarget; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<FeedStatus>("connecting");
  const [errorMessage, setErrorMessage] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [requestedDeviceId, setRequestedDeviceId] = useState("");
  const [activeDeviceId, setActiveDeviceId] = useState("");
  const [aspectRatio, setAspectRatio] = useState(16 / 9);
  const [snapshots, setSnapshots] = useState<EvidenceSnapshot[]>([]);

  const snapshotIdRef = useRef(0);
  const objectUrlsRef = useRef(new Set<string>());

  useEffect(() => {
    const urls = objectUrlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setErrorMessage("Camera access needs a secure context. Open the app on http://localhost or https://.");
      return;
    }
    let cancelled = false;
    let stream: MediaStream | null = null;
    setStatus("connecting");
    navigator.mediaDevices
      .getUserMedia({
        audio: false,
        video: {
          ...(requestedDeviceId ? { deviceId: { exact: requestedDeviceId } } : {}),
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })
      .then(async (mediaStream) => {
        if (cancelled) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = mediaStream;
        video.srcObject = mediaStream;
        await video.play();
        if (cancelled) return;
        setActiveDeviceId(mediaStream.getVideoTracks()[0]?.getSettings().deviceId ?? "");
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (cancelled) return;
        setCameras(devices.filter((d) => d.kind === "videoinput"));
        setStatus("live");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error("CCTV camera error:", err);
        setErrorMessage(describeCameraError(err));
        setStatus("error");
      });
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    };
  }, [requestedDeviceId, retryCount]);

  const captureSnapshot = useCallback(
    (trigger: EvidenceSnapshot["trigger"]) => {
      const video = videoRef.current;
      if (!video || video.videoWidth === 0) return;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0);
      const takenAt = new Date();
      const barHeight = Math.max(28, Math.round(canvas.height * 0.05));
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);
      ctx.fillStyle = trigger === "motion" ? "#ef4444" : "#e2e8f0";
      ctx.font = `bold ${Math.round(barHeight * 0.5)}px monospace`;
      ctx.textBaseline = "middle";
      ctx.fillText(
        `ATM #${atm.atm_id} | ${trigger.toUpperCase()} | ${takenAt.toLocaleString()}`,
        12,
        canvas.height - barHeight / 2,
      );
      canvas.toBlob(
        (blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          objectUrlsRef.current.add(url);
          const snapshot: EvidenceSnapshot = {
            id: ++snapshotIdRef.current,
            url,
            takenAt,
            trigger,
            fileName: `evidence_ATM-${atm.atm_id}_${takenAt.toISOString().replace(/[:.]/g, "-")}.jpg`,
          };
          setSnapshots((prev) => [snapshot, ...prev].slice(0, MAX_SNAPSHOTS));
        },
        "image/jpeg",
        0.92,
      );
    },
    [atm.atm_id],
  );

  const clearSnapshots = () => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current.clear();
    setSnapshots([]);
  };

  const feedBorder = "#334155";
  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.8)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cctv-modal-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#0f172a",
          border: "1px solid #334155",
          borderRadius: 8,
          width: "min(760px, 100%)",
          maxHeight: "92vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            padding: "10px 14px",
            background: "#1e293b",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid #334155",
          }}
        >
          <div>
            <h2 id="cctv-modal-title" style={{ color: "white", fontWeight: 700, fontSize: 14, fontFamily: MONO }}>
              LIVE CCTV — ATM #{atm.atm_id}
            </h2>
            {(atm.bank || atm.city) && (
              <p style={{ color: "#94a3b8", fontSize: 11, marginTop: 2 }}>
                {[atm.bank, atm.city].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <button
            type="button"
            autoFocus
            aria-label="Close CCTV feed"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1px solid #334155",
              color: "#cbd5e1",
              cursor: "pointer",
              borderRadius: 4,
              padding: "4px 10px",
              fontSize: 12,
            }}
          >
            Close
          </button>
        </div>
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              position: "relative",
              width: "100%",
              aspectRatio,
              background: "#000",
              borderRadius: 6,
              overflow: "hidden",
              border: `3px solid ${feedBorder}`,
              boxShadow: "none",
              transition: "border-color 150ms, box-shadow 150ms",
            }}
          >
            <video
              ref={videoRef}
              muted
              autoPlay
              playsInline
              onLoadedMetadata={(e) => {
                const { videoWidth, videoHeight } = e.currentTarget;
                if (videoWidth && videoHeight) setAspectRatio(videoWidth / videoHeight);
              }}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "fill",
                filter: "grayscale(100%) contrast(1.15)",
              }}
            />
            <span
              style={{
                position: "absolute",
                top: 8,
                left: 8,
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: "#ef4444",
                fontSize: 11,
                fontWeight: 700,
                fontFamily: MONO,
                background: "rgba(0,0,0,0.55)",
                padding: "2px 8px",
                borderRadius: 4,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: status === "live" ? "#ef4444" : "#64748b",
                }}
              />
              {status === "live" ? "REC" : status === "connecting" ? "CONNECTING" : "OFFLINE"}
            </span>
            {status !== "live" && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  padding: 24,
                  textAlign: "center",
                  background: "rgba(2,6,23,0.85)",
                }}
              >
                {status === "connecting" ? (
                  <p style={{ color: "#cbd5e1", fontSize: 13 }}>Requesting camera access…</p>
                ) : (
                  <>
                    <p style={{ color: "#fca5a5", fontSize: 13, maxWidth: 420 }}>{errorMessage}</p>
                    <button
                      type="button"
                      onClick={() => setRetryCount((c) => c + 1)}
                      style={{
                        background: "#3b82f6",
                        color: "white",
                        border: "none",
                        padding: "6px 14px",
                        borderRadius: 4,
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      Retry
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", color: "#cbd5e1", fontSize: 12 }}>
            {cameras.length > 1 && (
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                Camera
                <select
                  value={activeDeviceId}
                  onChange={(e) => setRequestedDeviceId(e.target.value)}
                  className="input-field"
                  style={{ width: 200, padding: "4px 8px", fontSize: 12 }}
                >
                  {cameras.map((cam, i) => (
                    <option key={cam.deviceId} value={cam.deviceId}>
                      {cam.label || `Camera ${i + 1}`}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button
              type="button"
              disabled={status !== "live"}
              onClick={() => captureSnapshot("manual")}
              style={{
                marginLeft: "auto",
                background: "#1e293b",
                color: "white",
                border: "1px solid #334155",
                padding: "6px 12px",
                borderRadius: 4,
                cursor: status === "live" ? "pointer" : "not-allowed",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              Capture now
            </button>
          </div>
          <section aria-labelledby="evidence-heading">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <h3
                id="evidence-heading"
                style={{ color: "#94a3b8", fontSize: 11, fontWeight: 700, letterSpacing: "0.5px", fontFamily: MONO }}
              >
                EVIDENCE CAPTURES ({snapshots.length})
              </h3>
              {snapshots.length > 0 && (
                <button
                  type="button"
                  onClick={clearSnapshots}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                    fontSize: 11,
                    textDecoration: "underline",
                  }}
                >
                  Clear
                </button>
              )}
            </div>
            {snapshots.length === 0 ? (
              <p style={{ color: "#64748b", fontSize: 12 }}>
                No captures yet. Click "Capture now" to take a snapshot.
              </p>
            ) : (
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                  gap: 8,
                }}
              >
                {snapshots.map((snap) => (
                  <li
                    key={snap.id}
                    style={{
                      background: "#020617",
                      border: `1px solid ${snap.trigger === "motion" ? "#7f1d1d" : "#334155"}`,
                      borderRadius: 4,
                      overflow: "hidden",
                    }}
                  >
                    <img
                      src={snap.url}
                      alt={`${snap.trigger} capture at ${snap.takenAt.toLocaleTimeString()}`}
                      style={{ display: "block", width: "100%", aspectRatio: "4 / 3", objectFit: "cover" }}
                    />
                    <div style={{ padding: "4px 6px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4 }}>
                      <span style={{ color: snap.trigger === "motion" ? "#f87171" : "#94a3b8", fontSize: 10, fontFamily: MONO }}>
                        {snap.takenAt.toLocaleTimeString()}
                      </span>
                      <a href={snap.url} download={snap.fileName} style={{ color: "#60a5fa", fontSize: 11, fontWeight: 700 }}>
                        Download
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

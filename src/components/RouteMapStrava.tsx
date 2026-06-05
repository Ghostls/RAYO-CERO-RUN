/**
 * RAYOCERO — ROUTE MAP STRAVA V3.2
 * Build: VALKYRON ATLAS — REAL TILES
 * CEO: Lualdo Sciscioli | Valkyron Group
 *
 * CHANGELOG V3.2:
 * ─ FIX CRÍTICO V3.1: import * as L → import L from 'leaflet' con workaround Vite
 * ─ FIX: L.divIcon / L.map / L.polyline etc. no disponibles con import * as L en Vite
 * ─ SOLUCIÓN: import Leaflet directamente y re-exportar como L para compatibilidad total
 * ─ FIX: import 'leaflet/dist/leaflet.css' mantenido
 * ─ Todo lo demás de V3.0 intacto (Regla de Oro)
 */

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import Leaflet from 'leaflet';
import type { Map, Polyline, Marker } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Alias L para compatibilidad con el resto del código
const L = Leaflet;

/* ─── Types ─────────────────────────────────────────────────── */
export interface GeoPoint {
  lat: number;
  lng: number;
  timestamp: number;
  accuracy?: number;
  speed?: number;
}

interface Props {
  points: GeoPoint[];
  athleteName?: string;
  eventName?: string;
  showShareCard?: boolean;
  live?: boolean;
}

/* ─── Helpers ───────────────────────────────────────────────── */
const calcDist = (pts: GeoPoint[]): number =>
  pts.reduce((acc, p, i) => {
    if (i === 0) return 0;
    const prev = pts[i - 1];
    const R = 6371;
    const dLat = ((p.lat - prev.lat) * Math.PI) / 180;
    const dLng = ((p.lng - prev.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((prev.lat * Math.PI) / 180) *
        Math.cos((p.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return acc + R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, 0);

const calcPace = (distKm: number, pts: GeoPoint[]): string => {
  if (distKm < 0.01 || pts.length < 2) return '--:--';
  const totalSec = (pts[pts.length - 1].timestamp - pts[0].timestamp) / 1000;
  const paceSecPerKm = totalSec / distKm;
  const m = Math.floor(paceSecPerKm / 60);
  const s = Math.floor(paceSecPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

const formatDuration = (ms: number): string => {
  const totalSec = Math.abs(ms) / 1000;
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.floor(totalSec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const speedToColor = (ratio: number): string => {
  if (ratio < 0.33) {
    const t = ratio / 0.33;
    return `hsl(${120 - t * 30}, 100%, 50%)`;
  } else if (ratio < 0.66) {
    const t = (ratio - 0.33) / 0.33;
    return `hsl(${90 - t * 50}, 100%, 50%)`;
  } else {
    const t = (ratio - 0.66) / 0.34;
    return `hsl(${40 - t * 30}, 100%, 50%)`;
  }
};

/* ─── CSS ───────────────────────────────────────────────────── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@1,700;1,800;1,900&family=Barlow:wght@400;500;600&display=swap');

  .rm3-root {
    font-family: 'Barlow', sans-serif;
    background: #050d16;
    border-radius: 20px;
    overflow: hidden;
    border: 1px solid rgba(0,242,255,0.12);
    margin-top: 16px;
    position: relative;
  }

  .rm3-hud {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 9px 14px;
    background: rgba(0,0,0,0.6);
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }

  .rm3-hud-left {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    color: #00f2ff;
  }

  .rm3-live-dot {
    width: 5px; height: 5px;
    border-radius: 50%;
    background: #00f2ff;
    animation: rm3-blink 1.5s ease infinite;
  }

  @keyframes rm3-blink {
    0%,100% { opacity:1; } 50% { opacity:0.15; }
  }

  .rm3-hud-right { display:flex; align-items:center; gap:10px; }
  .rm3-legend { display:flex; align-items:center; gap:5px; }

  .rm3-legend-bar {
    width: 36px; height: 3px;
    border-radius: 2px;
    background: linear-gradient(90deg, #00ff88, #ffdd00, #ff4400);
  }

  .rm3-legend-lbl { font-size:8px; color:rgba(255,255,255,0.25); letter-spacing:0.1em; }
  .rm3-pts { font-size:9px; color:rgba(255,255,255,0.25); letter-spacing:0.08em; }

  .rm3-map { height: 320px; width: 100%; position: relative; z-index: 0; }
  .rm3-map .leaflet-tile { filter: brightness(0.85) saturate(0.7); }

  .rm3-map .leaflet-control-attribution {
    font-size: 7px !important;
    background: rgba(0,0,0,0.5) !important;
    color: rgba(255,255,255,0.3) !important;
  }
  .rm3-map .leaflet-control-attribution a { color: rgba(255,255,255,0.4) !important; }

  .rm3-map .leaflet-control-zoom {
    border: 1px solid rgba(0,242,255,0.2) !important;
    border-radius: 8px !important;
    overflow: hidden;
  }
  .rm3-map .leaflet-control-zoom a {
    background: rgba(5,13,22,0.9) !important;
    color: #00f2ff !important;
    border-bottom: 1px solid rgba(0,242,255,0.15) !important;
    font-size: 14px !important;
    line-height: 26px !important;
    width: 26px !important;
    height: 26px !important;
  }
  .rm3-map .leaflet-control-zoom a:hover { background: rgba(0,242,255,0.15) !important; }

  .rm3-stats-overlay {
    position: absolute;
    bottom: 12px; left: 12px;
    display: flex; gap: 6px;
    z-index: 1000;
    pointer-events: none;
  }

  .rm3-stat-chip {
    background: rgba(5,13,22,0.88);
    border: 1px solid rgba(0,242,255,0.2);
    border-radius: 8px;
    padding: 5px 10px;
    backdrop-filter: blur(8px);
  }

  .rm3-chip-val {
    font-family: 'Barlow Condensed', sans-serif;
    font-style: italic; font-weight: 900; font-size: 18px;
    color: #fff; line-height: 1; display: block;
  }

  .rm3-chip-lbl {
    font-size: 8px; color: rgba(0,242,255,0.6);
    letter-spacing: 0.1em; text-transform: uppercase;
    display: block; margin-top: 1px;
  }

  .rm3-replay-badge {
    position: absolute; top: 10px; right: 10px;
    background: rgba(5,13,22,0.88);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px; padding: 5px 10px;
    z-index: 1000; pointer-events: none; text-align: right;
  }

  .rm3-replay-time {
    font-family: 'Barlow Condensed', sans-serif;
    font-style: italic; font-weight: 900; font-size: 13px;
    color: #22c55e; line-height: 1;
  }

  .rm3-replay-lbl {
    font-size: 8px; color: rgba(255,255,255,0.3);
    letter-spacing: 0.12em; text-transform: uppercase;
  }

  .rm3-pace-wrap {
    padding: 4px 14px 6px;
    background: rgba(0,0,0,0.35);
    border-top: 1px solid rgba(255,255,255,0.04);
  }

  .rm3-pace-lbl {
    font-size: 8px; letter-spacing: 0.2em;
    color: rgba(255,255,255,0.2); text-transform: uppercase;
    padding: 6px 0 3px;
  }

  .rm3-scrubber-wrap {
    padding: 10px 14px 12px;
    background: rgba(0,0,0,0.45);
    border-top: 1px solid rgba(255,255,255,0.05);
  }

  .rm3-scrubber-row { display:flex; align-items:center; gap:10px; }

  .rm3-play-btn {
    width: 40px; height: 40px; border-radius: 4px;
    background: rgba(0,242,255,0.08);
    border: 1px solid rgba(0,242,255,0.25);
    color: #00f2ff; display:flex; align-items:center; justify-content:center;
    cursor:pointer; flex-shrink:0; transition:all 0.15s; padding:0;
    font-family: 'Barlow Condensed', sans-serif;
  }
  .rm3-play-btn:hover { background:rgba(0,242,255,0.18); border-color:rgba(0,242,255,0.5); }
  .rm3-play-btn:active { transform: scale(0.96); }

  .rm3-reset-btn {
    width: 40px; height: 40px; border-radius: 4px;
    background: transparent;
    border: 1px solid rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.3);
    display:flex; align-items:center; justify-content:center;
    cursor:pointer; flex-shrink:0; transition:all 0.15s; padding:0;
  }
  .rm3-reset-btn:hover { border-color:rgba(255,255,255,0.2); color:rgba(255,255,255,0.6); }

  .rm3-track {
    flex:1; height:3px; background:rgba(255,255,255,0.1);
    border-radius:2px; cursor:pointer; position:relative;
  }

  .rm3-fill {
    height:100%;
    background: linear-gradient(90deg, #00b4cc, #00f2ff);
    border-radius:2px; position:relative; transition:width 0.08s linear;
  }

  .rm3-fill::after {
    content:''; position:absolute; right:-5px; top:-4px;
    width:11px; height:11px; border-radius:50%;
    background:#00f2ff; border:2px solid #050d16;
    box-shadow: 0 0 8px rgba(0,242,255,0.7);
  }

  .rm3-total-time {
    font-family:'Barlow Condensed',sans-serif;
    font-style:italic; font-weight:700; font-size:11px;
    color:rgba(255,255,255,0.35); min-width:38px; text-align:right;
  }

  .rm3-stats-bar {
    display:grid; grid-template-columns:repeat(3,1fr);
    border-top: 1px solid rgba(255,255,255,0.05);
  }

  @media (max-width: 400px) {
    .rm3-stats-bar { grid-template-columns: repeat(3, 1fr); }
    .rm3-stat-val { font-size: 15px !important; }
    .rm3-map { height: 240px; }
  }

  .rm3-stat-cell {
    padding:12px 8px; text-align:center;
    border-right: 1px solid rgba(255,255,255,0.05);
  }
  .rm3-stat-cell:last-child { border-right:none; }

  .rm3-stat-lbl {
    font-size:8px; letter-spacing:0.2em;
    color:rgba(255,255,255,0.22); text-transform:uppercase; margin-bottom:3px;
  }

  .rm3-stat-val {
    font-family:'Barlow Condensed',sans-serif;
    font-style:italic; font-weight:900; font-size:19px;
    color:#00f2ff; line-height:1;
  }

  .rm3-stat-unit { font-size:9px; color:rgba(255,255,255,0.25); margin-top:1px; }

  .rm3-share {
    margin: 0 14px 12px;
    background: rgba(0,242,255,0.04);
    border: 1px solid rgba(0,242,255,0.1);
    border-radius:10px; padding:9px 14px;
    display:flex; align-items:center; justify-content:space-between;
  }

  .rm3-share-title {
    font-family:'Barlow Condensed',sans-serif;
    font-style:italic; font-weight:800; font-size:13px;
    color:rgba(255,255,255,0.65);
  }

  .rm3-share-sub {
    font-size:9px; color:rgba(0,242,255,0.45);
    letter-spacing:0.08em; text-transform:uppercase; margin-top:2px;
  }

  .rm3-powered {
    font-size:8px; color:rgba(255,255,255,0.12);
    letter-spacing:0.1em; text-transform:uppercase; text-align:right;
  }
`;

/* ─── Iconos Leaflet personalizados ─────────────────────────── */
const makeIcon = (color: string, label: string) =>
  L.divIcon({
    className: '',
    html: `<div style="background:${color};color:#03070b;font-family:'Barlow Condensed',sans-serif;font-style:italic;font-weight:900;font-size:10px;padding:3px 7px;border-radius:5px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.5);letter-spacing:0.05em;">${label}</div>`,
    iconAnchor: [0, 10],
  });

const replayIcon = L.divIcon({
  className: '',
  html: `<div style="width:14px;height:14px;background:#fff;border-radius:50%;border:3px solid #00f2ff;box-shadow:0 0 10px rgba(0,242,255,0.8);"></div>`,
  iconAnchor: [7, 7],
});

/* ─── Component ─────────────────────────────────────────────── */
export default function RouteMapStrava({
  points,
  athleteName,
  eventName = 'WE RUN 10K NIGHT FEST',
  showShareCard = false,
  live = false,
}: Props) {
  const mapRef = useRef<Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const polylinesRef = useRef<Polyline[]>([]);
  const startMarkerRef = useRef<Marker | null>(null);
  const endMarkerRef = useRef<Marker | null>(null);
  const replayMarkerRef = useRef<Marker | null>(null);
  const prevPointsLenRef = useRef(0);
  const ghostLinesRef = useRef<Polyline[]>([]);
  const activeLinesRef = useRef<Polyline[]>([]);

  const [replayProgress, setReplayProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const REPLAY_DURATION = 9000;

  const hasPoints = points && points.length >= 2;

  /* ── Stats ── */
  const stats = useMemo(() => {
    if (!hasPoints) return null;
    const dist = calcDist(points);
    const pace = calcPace(dist, points);
    const duration = points[points.length - 1].timestamp - points[0].timestamp;
    const speeds = points.map(p => (p.speed ?? 0) * 3.6);
    const hasSpeed = speeds.some(s => s > 0.1);
    const maxSpd = Math.max(...speeds, 1);
    const avgSpeed = hasSpeed
      ? speeds.filter(s => s > 0).reduce((a, b) => a + b, 0) / speeds.filter(s => s > 0).length
      : dist / (duration / 3600000);
    return { dist, pace, duration, avgSpeed, hasSpeed, maxSpd, speeds };
  }, [points]);

  /* ── Pace chart ── */
  const paceChart = useMemo(() => {
    if (!hasPoints) return null;
    const W = 760, H = 46, PAD = 4;
    const segCount = Math.min(12, Math.floor(points.length / 4));
    if (segCount < 2) return null;
    const step = Math.floor(points.length / segCount);
    const barW = (W - PAD * 2) / segCount - 3;
    const bars = Array.from({ length: segCount }, (_, i) => {
      const s = points.slice(i * step, Math.min((i + 1) * step + 1, points.length));
      const d = calcDist(s);
      const t = (s[s.length - 1].timestamp - s[0].timestamp) / 1000;
      const paceVal = d > 0 ? t / d / 60 : 10;
      const ratio = 1 - Math.min(paceVal / 12, 1);
      return {
        x: PAD + i * ((W - PAD * 2) / segCount),
        h: Math.min(Math.max((paceVal / 12) * (H - PAD * 2), 4), H - PAD * 2),
        color: speedToColor(ratio),
      };
    });
    return { W, H, PAD, barW, bars };
  }, [points]);

  /* ── Init mapa ── */
  useEffect(() => {
    if (!mapContainerRef.current || !hasPoints) return;
    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false,
      dragging: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;
    return () => { mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  /* ── Dibujar ruta ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !hasPoints || !stats) return;

    if (live && prevPointsLenRef.current > 0 && points.length > prevPointsLenRef.current) {
      const newPoints = points.slice(prevPointsLenRef.current - 1);
      for (let i = 1; i < newPoints.length; i++) {
        const prev = newPoints[i - 1];
        const curr = newPoints[i];
        const ratio = stats.hasSpeed ? Math.min((curr.speed ?? 0) * 3.6 / stats.maxSpd, 1) : 0.6;
        const seg = L.polyline([[prev.lat, prev.lng], [curr.lat, curr.lng]], {
          color: speedToColor(ratio), weight: 4, opacity: 0.9,
          lineCap: 'round', lineJoin: 'round',
        }).addTo(map);
        polylinesRef.current.push(seg);
      }
      endMarkerRef.current?.setLatLng([points[points.length - 1].lat, points[points.length - 1].lng]);
      prevPointsLenRef.current = points.length;
      return;
    }

    polylinesRef.current.forEach(p => map.removeLayer(p));
    polylinesRef.current = [];
    startMarkerRef.current && map.removeLayer(startMarkerRef.current);
    endMarkerRef.current && map.removeLayer(endMarkerRef.current);

    const latlngs: [number, number][] = points.map(p => [p.lat, p.lng]);

    polylinesRef.current.push(
      L.polyline(latlngs, { color: 'rgba(0,200,255,0.06)', weight: 16, lineCap: 'round' }).addTo(map)
    );

    ghostLinesRef.current.forEach(l => map.removeLayer(l));
    ghostLinesRef.current = [];
    for (let i = 1; i < points.length; i++) {
      const ratio = stats.hasSpeed ? Math.min((points[i].speed ?? 0) * 3.6 / stats.maxSpd, 1) : 0.6;
      const ghost = L.polyline([[points[i-1].lat, points[i-1].lng], [points[i].lat, points[i].lng]], {
        color: speedToColor(ratio), weight: 3, opacity: 0.18,
        lineCap: 'round', lineJoin: 'round',
      }).addTo(map);
      ghostLinesRef.current.push(ghost);
    }

    activeLinesRef.current.forEach(l => map.removeLayer(l));
    activeLinesRef.current = [];

    startMarkerRef.current = L.marker([points[0].lat, points[0].lng], {
      icon: makeIcon('#22c55e', '⚡ SALIDA'),
    }).addTo(map);

    endMarkerRef.current = L.marker([points[points.length-1].lat, points[points.length-1].lng], {
      icon: makeIcon('#00f2ff', '🏁 META'),
    }).addTo(map);

    if (!replayMarkerRef.current) {
      replayMarkerRef.current = L.marker([points[0].lat, points[0].lng], {
        icon: replayIcon, zIndexOffset: 1000,
      }).addTo(map);
      replayMarkerRef.current.setOpacity(0);
    }

    map.fitBounds(L.latLngBounds(latlngs), { padding: [32, 32] });
    prevPointsLenRef.current = points.length;
  }, [points, stats, live]);

  /* ── Replay ── */
  const startReplay = useCallback(() => {
    if (!hasPoints) return;
    setIsPlaying(true);
    const startP = replayProgress >= 0.99 ? 0 : replayProgress;
    setReplayProgress(startP);
    startTimeRef.current = performance.now() - startP * REPLAY_DURATION;

    activeLinesRef.current.forEach(l => mapRef.current?.removeLayer(l));
    activeLinesRef.current = [];
    let lastActiveIdx = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - (startTimeRef.current ?? now)) / REPLAY_DURATION, 1);
      setReplayProgress(progress);
      const idx = Math.min(Math.floor(progress * (points.length - 1)), points.length - 1);

      if (mapRef.current && idx > lastActiveIdx) {
        for (let i = lastActiveIdx + 1; i <= idx; i++) {
          if (i >= points.length) break;
          const ratio = stats?.hasSpeed ? Math.min((points[i].speed ?? 0) * 3.6 / (stats.maxSpd || 1), 1) : 0.6;
          const activeLine = L.polyline(
            [[points[i-1].lat, points[i-1].lng], [points[i].lat, points[i].lng]],
            { color: speedToColor(ratio), weight: 5, opacity: 1, lineCap: 'round', lineJoin: 'round' }
          ).addTo(mapRef.current);
          activeLinesRef.current.push(activeLine);
        }
        lastActiveIdx = idx;
      }

      if (replayMarkerRef.current && mapRef.current) {
        replayMarkerRef.current.setOpacity(1);
        replayMarkerRef.current.setLatLng([points[idx].lat, points[idx].lng]);
        if (progress > 0.02 && progress < 0.98) {
          mapRef.current.panTo([points[idx].lat, points[idx].lng], { animate: false });
        }
      }

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setIsPlaying(false);
        replayMarkerRef.current?.setOpacity(0);
        if (mapRef.current && hasPoints) {
          mapRef.current.fitBounds(
            L.latLngBounds(points.map(p => [p.lat, p.lng] as [number, number])),
            { padding: [32, 32], animate: true }
          );
        }
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [replayProgress, points, hasPoints]);

  const pauseReplay = useCallback(() => {
    setIsPlaying(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  const resetReplay = useCallback(() => {
    pauseReplay();
    setReplayProgress(0);
    activeLinesRef.current.forEach(l => mapRef.current?.removeLayer(l));
    activeLinesRef.current = [];
    replayMarkerRef.current?.setOpacity(0);
    if (mapRef.current && hasPoints) {
      mapRef.current.fitBounds(
        L.latLngBounds(points.map(p => [p.lat, p.lng] as [number, number])),
        { padding: [32, 32], animate: true }
      );
    }
  }, [pauseReplay, hasPoints, points]);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  if (!hasPoints || !stats) return null;

  const totalTime = formatDuration(stats.duration);
  const replayTime = formatDuration(stats.duration * replayProgress);

  return (
    <>
      <style>{CSS}</style>
      <div className="rm3-root">

        <div className="rm3-hud">
          <div className="rm3-hud-left">
            <span className="rm3-live-dot" />
            {live ? 'GPS Live · Kalman' : 'Ruta GPS · Kalman'}
          </div>
          <div className="rm3-hud-right">
            {stats.hasSpeed && (
              <div className="rm3-legend">
                <span className="rm3-legend-lbl">Lento</span>
                <div className="rm3-legend-bar" />
                <span className="rm3-legend-lbl">Rápido</span>
              </div>
            )}
            <span className="rm3-pts">{points.length} pts</span>
          </div>
        </div>

        <div style={{ position: 'relative' }}>
          <div ref={mapContainerRef} className="rm3-map" />

          <div className="rm3-stats-overlay">
            <div className="rm3-stat-chip">
              <span className="rm3-chip-val">{stats.dist.toFixed(2)}</span>
              <span className="rm3-chip-lbl">km</span>
            </div>
            {stats.avgSpeed > 0 && (
              <div className="rm3-stat-chip">
                <span className="rm3-chip-val">{stats.avgSpeed.toFixed(1)}</span>
                <span className="rm3-chip-lbl">km/h</span>
              </div>
            )}
          </div>

          {replayProgress > 0.01 && replayProgress < 0.99 && (
            <div className="rm3-replay-badge">
              <div className="rm3-replay-time">{replayTime}</div>
              <div className="rm3-replay-lbl">en ruta</div>
            </div>
          )}
        </div>

        {paceChart && (
          <div className="rm3-pace-wrap">
            <div className="rm3-pace-lbl">Ritmo por segmento</div>
            <svg viewBox={`0 0 ${paceChart.W} ${paceChart.H}`} style={{ width:'100%', height:paceChart.H, display:'block' }}>
              {paceChart.bars.map((bar, i) => (
                <rect key={i}
                  x={bar.x + 1} y={paceChart.H - paceChart.PAD - bar.h}
                  width={paceChart.barW} height={bar.h} rx={2}
                  fill={bar.color} opacity={0.85}
                />
              ))}
              <line x1={4} y1={paceChart.H - 4} x2={paceChart.W - 4} y2={paceChart.H - 4}
                stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
            </svg>
          </div>
        )}

        <div className="rm3-scrubber-wrap">
          <div className="rm3-scrubber-row">
            <button className="rm3-play-btn"
              onClick={() => isPlaying ? pauseReplay() : startReplay()}
              aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
            >
              {isPlaying ? (
                <svg width="11" height="13" viewBox="0 0 10 12" fill="none">
                  <rect x="0" y="0" width="3.5" height="12" rx="1" fill="currentColor"/>
                  <rect x="6.5" y="0" width="3.5" height="12" rx="1" fill="currentColor"/>
                </svg>
              ) : (
                <svg width="11" height="13" viewBox="0 0 10 12" fill="none">
                  <path d="M0 0L10 6L0 12V0Z" fill="currentColor"/>
                </svg>
              )}
            </button>

            <button className="rm3-reset-btn" onClick={resetReplay} aria-label="Reiniciar">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 6A5 5 0 1 0 6 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M1 1V6H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            <div className="rm3-track"
              onClick={e => {
                const rect = e.currentTarget.getBoundingClientRect();
                const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                setReplayProgress(p);
                pauseReplay();
                activeLinesRef.current.forEach(l => mapRef.current?.removeLayer(l));
                activeLinesRef.current = [];
                const targetIdx = Math.min(Math.floor(p * (points.length - 1)), points.length - 1);
                if (mapRef.current) {
                  for (let i = 1; i <= targetIdx; i++) {
                    const ratio = stats?.hasSpeed ? Math.min((points[i].speed ?? 0) * 3.6 / (stats.maxSpd || 1), 1) : 0.6;
                    activeLinesRef.current.push(
                      L.polyline([[points[i-1].lat, points[i-1].lng], [points[i].lat, points[i].lng]], {
                        color: speedToColor(ratio), weight: 5, opacity: 1, lineCap: 'round',
                      }).addTo(mapRef.current!)
                    );
                  }
                  replayMarkerRef.current?.setLatLng([points[targetIdx].lat, points[targetIdx].lng]);
                  replayMarkerRef.current?.setOpacity(p > 0.01 ? 1 : 0);
                }
              }}
            >
              <div className="rm3-fill" style={{ width: `${replayProgress * 100}%` }} />
            </div>

            <span className="rm3-total-time">
              {replayProgress > 0.01 ? `${replayTime} / ${totalTime}` : totalTime}
            </span>
          </div>

          {!isPlaying && replayProgress < 0.01 && (
            <div style={{
              textAlign: 'center', marginTop: 6, fontSize: 8,
              letterSpacing: '0.2em', color: 'rgba(0,242,255,0.4)',
              textTransform: 'uppercase',
              fontFamily: "'Barlow Condensed', sans-serif", fontStyle: 'italic',
            }}>
              ▶ REPRODUCIR RUTA GPS
            </div>
          )}
        </div>

        <div className="rm3-stats-bar">
          <div className="rm3-stat-cell">
            <div className="rm3-stat-lbl">Distancia</div>
            <div className="rm3-stat-val">{stats.dist.toFixed(2)}</div>
            <div className="rm3-stat-unit">km</div>
          </div>
          <div className="rm3-stat-cell">
            <div className="rm3-stat-lbl">Ritmo</div>
            <div className="rm3-stat-val">{stats.pace}</div>
            <div className="rm3-stat-unit">min/km</div>
          </div>
          <div className="rm3-stat-cell">
            <div className="rm3-stat-lbl">Tiempo GPS</div>
            <div className="rm3-stat-val">{totalTime}</div>
            <div className="rm3-stat-unit">total</div>
          </div>
        </div>

        {showShareCard && (
          <div className="rm3-share">
            <div>
              <div className="rm3-share-title">{eventName}</div>
              {athleteName && (
                <div className="rm3-share-sub">{athleteName} · {stats.dist.toFixed(2)} KM</div>
              )}
            </div>
            <div className="rm3-powered">VALKYRON<br/>ATLAS</div>
          </div>
        )}

      </div>
    </>
  );
}
/**
 * RAYO CERO — STRAVA ROUTE MAP
 * Mapa de ruta estilo Strava para TrackerLanding
 * Reemplaza el RouteMap inline en TrackerLanding.tsx
 */

import { useMemo } from 'react';

interface GeoPoint {
  lat: number;
  lng: number;
  timestamp: number;
  accuracy?: number;
  speed?: number;
}

interface Props {
  points: GeoPoint[];
}

const calcDist = (pts: GeoPoint[]): number => pts.reduce((acc, p, i) => {
  if (i === 0) return 0;
  const prev = pts[i - 1];
  const R = 6371;
  const dLat = ((p.lat - prev.lat) * Math.PI) / 180;
  const dLng = ((p.lng - prev.lng) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((prev.lat * Math.PI) / 180) * Math.cos((p.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
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

export default function RouteMapStrava({ points }: Props) {
  if (points.length < 2) return null;

  const W = 800, H = 400, PAD = 48;

  const { path, segments, startPt, endPt, dist, pace, maxSpeed, elevationPoints } = useMemo(() => {
    const lats = points.map(p => p.lat);
    const lngs = points.map(p => p.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const rLat = maxLat - minLat || 0.0001;
    const rLng = maxLng - minLng || 0.0001;

    // Preserve aspect ratio
    const mapW = W - PAD * 2;
    const mapH = H - PAD * 2 - 60; // leave room for bottom stats
    const scaleX = mapW / rLng;
    const scaleY = mapH / rLat;
    const scale = Math.min(scaleX, scaleY);
    const offX = (mapW - rLng * scale) / 2;
    const offY = (mapH - rLat * scale) / 2;

    const toXY = (lat: number, lng: number) => ({
      x: PAD + offX + (lng - minLng) * scale,
      y: PAD + offY + mapH - (lat - minLat) * scale,
    });

    // Speed segments for color coding
    const speeds = points.map(p => (p.speed ?? 0) * 3.6);
    const maxSpd = Math.max(...speeds, 1);
    const hasSpeed = speeds.some(s => s > 0.1);

    const pathStr = points.map((p, i) => {
      const { x, y } = toXY(p.lat, p.lng);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    // Color segments by speed
    const segs = points.slice(1).map((p, i) => {
      const prev = points[i];
      const { x: x1, y: y1 } = toXY(prev.lat, prev.lng);
      const { x: x2, y: y2 } = toXY(p.lat, p.lng);
      const spd = hasSpeed ? (p.speed ?? 0) * 3.6 : 0;
      const ratio = Math.min(spd / maxSpd, 1);
      // Strava palette: slow=blue → mid=yellow → fast=red
      let color = '#00f2ff';
      if (hasSpeed) {
        if (ratio < 0.33) color = `hsl(${200 + ratio * 60 * 3},80%,55%)`;
        else if (ratio < 0.66) color = `hsl(${60 - (ratio - 0.33) * 3 * 30},80%,55%)`;
        else color = `hsl(${10},80%,55%)`;
      }
      return { x1, y1, x2, y2, color };
    });

    const s = toXY(points[0].lat, points[0].lng);
    const e = toXY(points[points.length - 1].lat, points[points.length - 1].lng);
    const d = calcDist(points);
    const p = calcPace(d, points);

    return {
      path: pathStr,
      segments: segs,
      startPt: s,
      endPt: e,
      dist: d,
      pace: p,
      maxSpeed: maxSpd,
      elevationPoints: [],
    };
  }, [points]);

  const durationSec = (points[points.length - 1].timestamp - points[0].timestamp) / 1000;
  const durationStr = durationSec > 3600
    ? `${Math.floor(durationSec / 3600)}h ${Math.floor((durationSec % 3600) / 60)}m`
    : `${Math.floor(durationSec / 60)}m ${Math.floor(durationSec % 60)}s`;

  const hasSpeed = points.some(p => (p.speed ?? 0) > 0.1);

  return (
    <div style={{
      borderRadius: 20,
      overflow: 'hidden',
      background: '#050d14',
      border: '1px solid rgba(0,242,255,0.12)',
      marginTop: 20,
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: '#00f2ff', fontWeight: 900, letterSpacing: '0.3em', textTransform: 'uppercase' }}>
            Tu Ruta GPS
          </span>
          {hasSpeed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 8 }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'linear-gradient(90deg, #4a9eff, #ffdd44, #ff4444)' }} />
              <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em' }}>LENTO → RÁPIDO</span>
            </div>
          )}
        </div>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>
          {points.length} pts
        </span>
      </div>

      {/* Map SVG */}
      <div style={{ position: 'relative', background: '#070f18' }}>
        {/* Grid lines subtle */}
        <svg viewBox={`0 0 ${W} ${H - 60}`} style={{ width: '100%', display: 'block' }}>
          <defs>
            <filter id="sm-glow">
              <feGaussianBlur stdDeviation="2" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="lg-glow">
              <feGaussianBlur stdDeviation="5" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Subtle grid */}
          {[0.25, 0.5, 0.75].map(t => (
            <g key={t}>
              <line x1={PAD} y1={PAD + t * (H - PAD * 2 - 60)} x2={W - PAD} y2={PAD + t * (H - PAD * 2 - 60)}
                stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="4,8" />
              <line x1={PAD + t * (W - PAD * 2)} y1={PAD} x2={PAD + t * (W - PAD * 2)} y2={H - PAD - 60}
                stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="4,8" />
            </g>
          ))}

          {/* Halo/glow under route */}
          <path d={path} fill="none" stroke="rgba(0,242,255,0.06)" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />

          {/* Colored speed segments or uniform cyan */}
          {hasSpeed ? (
            segments.map((seg, i) => (
              <line key={i}
                x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2}
                stroke={seg.color} strokeWidth="3" strokeLinecap="round"
                filter="url(#sm-glow)"
              />
            ))
          ) : (
            <path d={path} fill="none" stroke="#00f2ff" strokeWidth="3"
              strokeLinecap="round" strokeLinejoin="round" filter="url(#sm-glow)" />
          )}

          {/* Start marker */}
          <circle cx={startPt.x} cy={startPt.y} r={10} fill="rgba(34,197,94,0.15)" filter="url(#lg-glow)" />
          <circle cx={startPt.x} cy={startPt.y} r={6} fill="#22c55e" />
          <circle cx={startPt.x} cy={startPt.y} r={2.5} fill="white" />
          <rect x={startPt.x + 10} y={startPt.y - 9} width={48} height={16} rx={4} fill="rgba(34,197,94,0.85)" />
          <text x={startPt.x + 34} y={startPt.y + 3} fill="white" fontSize="9" fontFamily="monospace" fontWeight="bold" textAnchor="middle">SALIDA</text>

          {/* Finish marker */}
          <circle cx={endPt.x} cy={endPt.y} r={10} fill="rgba(0,242,255,0.15)" filter="url(#lg-glow)" />
          <circle cx={endPt.x} cy={endPt.y} r={6} fill="#00f2ff" />
          <circle cx={endPt.x} cy={endPt.y} r={2.5} fill="white" />
          <rect x={endPt.x + 10} y={endPt.y - 9} width={40} height={16} rx={4} fill="rgba(0,242,255,0.85)" />
          <text x={endPt.x + 30} y={endPt.y + 3} fill="#03070b" fontSize="9" fontFamily="monospace" fontWeight="bold" textAnchor="middle">META</text>
        </svg>
      </div>

      {/* Stats bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        {[
          { label: 'Distancia', value: `${dist.toFixed(2)} km` },
          { label: 'Ritmo', value: `${pace} /km` },
          { label: 'Tiempo GPS', value: durationStr },
        ].map((stat, i) => (
          <div key={i} style={{
            padding: '12px 8px',
            textAlign: 'center',
            borderRight: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none',
          }}>
            <div style={{ fontSize: 8, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginBottom: 4 }}>
              {stat.label}
            </div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, fontWeight: 900, fontStyle: 'italic', color: '#00f2ff' }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
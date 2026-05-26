/**
 * RAYO CERO — TRACKER LANDING V1
 * Mini PWA para corredores: BIB → GPS → Timer en vivo → Mapa resultado
 * Valkyron Group — 2026
 *
 * FLUJO:
 * 1. Corredor abre rayocero-run.vercel.app/tracker
 * 2. Ingresa su BIB number
 * 3. App pide permiso GPS inmediatamente
 * 4. Pantalla de espera hasta que el chip cruce la salida
 * 5. Timer arranca en vivo via Supabase Realtime
 * 6. Al cruzar la meta: tiempo oficial + mapa de ruta
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { GeoKalmanFilter, GeoPoint } from './KalmanFilter';

/* ─── Types ──────────────────────────────────────────────────── */
type RaceStatus = 'waiting' | 'in_progress' | 'completed';
type AppStep = 'bib_input' | 'gps_request' | 'waiting' | 'running' | 'finished';

interface Runner {
  bib_number: number;
  nombre: string;
  apellido: string;
  categoria: string;
  race_status: RaceStatus;
  start_time: string | null;
  finish_time: string | null;
  finish_time_seconds: number | null;
  gps_track?: GeoPoint[] | null;
}

/* ─── Helpers ────────────────────────────────────────────────── */
const formatElapsed = (startIso: string): string => {
  const s = (Date.now() - new Date(startIso).getTime()) / 1000;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
};

const formatFinal = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = (seconds % 60).toFixed(2);
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(parseFloat(s)).padStart(5,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(parseFloat(s)).padStart(5,'0')}`;
};

const calcDist = (pts: GeoPoint[]): number => pts.reduce((acc, p, i) => {
  if (i === 0) return 0;
  const prev = pts[i-1];
  const R = 6371;
  const dLat = ((p.lat - prev.lat) * Math.PI) / 180;
  const dLng = ((p.lng - prev.lng) * Math.PI) / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos((prev.lat*Math.PI)/180)*Math.cos((p.lat*Math.PI)/180)*Math.sin(dLng/2)**2;
  return acc + R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}, 0);

/* ─── Route Map ──────────────────────────────────────────────── */
const RouteMap = ({ points }: { points: GeoPoint[] }) => {
  if (points.length < 2) return null;
  const PAD = 32, W = 600, H = 260;
  const lats = points.map(p => p.lat);
  const lngs = points.map(p => p.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const rLat = maxLat - minLat || 0.001;
  const rLng = maxLng - minLng || 0.001;
  const xy = (lat: number, lng: number) => ({
    x: PAD + ((lng - minLng) / rLng) * (W - PAD * 2),
    y: H - PAD - ((lat - minLat) / rLat) * (H - PAD * 2),
  });
  const path = points.map((p, i) => { const {x,y} = xy(p.lat,p.lng); return `${i===0?'M':'L'}${x.toFixed(1)},${y.toFixed(1)}`; }).join(' ');
  const s = xy(points[0].lat, points[0].lng);
  const e = xy(points[points.length-1].lat, points[points.length-1].lng);
  const dist = calcDist(points);

  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(0,242,255,0.15)', background: '#000', marginTop: 20 }}>
      <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,242,255,0.08)' }}>
        <span style={{ fontSize: 9, letterSpacing: '0.3em', color: 'rgba(0,242,255,0.6)', fontWeight: 900, textTransform: 'uppercase' }}>📍 Tu ruta GPS</span>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>{dist.toFixed(2)} km · {points.length} pts</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
        <defs>
          <linearGradient id="tl-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00f2ff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#00f2ff" stopOpacity="1" />
          </linearGradient>
          <filter id="tl-glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <filter id="tl-glow2"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <path d={path} fill="none" stroke="rgba(0,242,255,0.08)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/>
        <path d={path} fill="none" stroke="url(#tl-grad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#tl-glow)"/>
        <circle cx={s.x} cy={s.y} r={7} fill="rgba(34,197,94,0.2)" filter="url(#tl-glow2)"/>
        <circle cx={s.x} cy={s.y} r={4} fill="#22c55e"/>
        <circle cx={s.x} cy={s.y} r={2} fill="white"/>
        <text x={s.x+10} y={s.y+4} fill="#22c55e" fontSize="9" fontFamily="monospace" fontWeight="bold">SALIDA</text>
        <circle cx={e.x} cy={e.y} r={7} fill="rgba(0,242,255,0.2)" filter="url(#tl-glow2)"/>
        <circle cx={e.x} cy={e.y} r={4} fill="#00f2ff"/>
        <circle cx={e.x} cy={e.y} r={2} fill="white"/>
        <text x={e.x+10} y={e.y+4} fill="#00f2ff" fontSize="9" fontFamily="monospace" fontWeight="bold">META</text>
      </svg>
    </div>
  );
};

/* ─── Main Component ─────────────────────────────────────────── */
export default function TrackerLanding() {
  const [step, setStep] = useState<AppStep>('bib_input');
  const [bibInput, setBibInput] = useState('');
  const [runner, setRunner] = useState<Runner | null>(null);
  const [gpsPoints, setGpsPoints] = useState<GeoPoint[]>([]);
  const [elapsed, setElapsed] = useState('00:00');
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'active' | 'error'>('idle');
  const [gpsError, setGpsError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const kalmanRef = useRef(new GeoKalmanFilter());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelRef = useRef<any>(null);

  /* ── GPS ─────────────────────────────────────────────────── */
  const startGPS = useCallback(() => {
    if (!navigator.geolocation) { setGpsStatus('error'); setGpsError('GPS no disponible en este dispositivo'); return; }
    kalmanRef.current.reset();
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsStatus('active');
        const raw: GeoPoint = { lat: pos.coords.latitude, lng: pos.coords.longitude, timestamp: pos.timestamp, accuracy: pos.coords.accuracy, speed: pos.coords.speed ?? undefined };
        const filtered = kalmanRef.current.filter(raw);
        setGpsPoints(prev => [...prev, filtered]);
      },
      (err) => { setGpsStatus('error'); setGpsError(err.message); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  const stopGPS = useCallback(async (points: GeoPoint[], bib: number) => {
    if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
    if (points.length > 0) {
      await supabase.from('runners').update({ gps_track: points }).eq('bib_number', bib);
    }
  }, []);

  /* ── Buscar corredor ────────────────────────────────────── */
  const handleBibSubmit = async () => {
    const bib = parseInt(bibInput.trim());
    if (!bib || isNaN(bib)) { setError('Ingresa un número de dorsal válido'); return; }
    setLoading(true); setError('');
    const { data, error: err } = await supabase.from('runners')
      .select('bib_number,nombre,apellido,categoria,race_status,start_time,finish_time,finish_time_seconds,gps_track')
      .eq('bib_number', bib).single();
    setLoading(false);
    if (err || !data) { setError(`Dorsal #${bib} no encontrado. Verifica tu número.`); return; }
    const r = { ...data, race_status: data.race_status ?? 'waiting' } as Runner;
    setRunner(r);

    if (r.race_status === 'completed') {
      if (r.gps_track && r.gps_track.length > 0) setGpsPoints(r.gps_track);
      setStep('finished');
      return;
    }

    if (r.race_status === 'in_progress' && r.start_time) {
      setStep('running');
      startGPS();
      timerRef.current = setInterval(() => setElapsed(formatElapsed(r.start_time!)), 1000);
      subscribeToRunner(bib, r);
      return;
    }

    setStep('gps_request');
  };

  /* ── Activar GPS ────────────────────────────────────────── */
  const handleActivateGPS = () => {
    startGPS();
    setStep('waiting');
    if (runner) subscribeToRunner(runner.bib_number, runner);
  };

  /* ── Realtime ───────────────────────────────────────────── */
  const subscribeToRunner = useCallback((bib: number, currentRunner: Runner) => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    channelRef.current = supabase.channel(`tracker-${bib}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'runners', filter: `bib_number=eq.${bib}` }, async (payload) => {
        const updated = payload.new as Runner;
        setRunner(updated);

        if (updated.race_status === 'in_progress' && updated.start_time) {
          setStep('running');
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = setInterval(() => setElapsed(formatElapsed(updated.start_time!)), 1000);
        }

        if (updated.race_status === 'completed') {
          if (timerRef.current) clearInterval(timerRef.current);
          setGpsPoints(prev => { stopGPS(prev, bib); return prev; });
          setStep('finished');
        }
      }).subscribe();
  }, [stopGPS]);

  useEffect(() => () => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  /* ─── Render ─────────────────────────────────────────────── */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,400;0,700;0,900;1,400;1,700;1,900&family=JetBrains+Mono:wght@400;700&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }

        .tl-root {
          min-height: 100vh;
          min-height: 100dvh;
          background: #03070b;
          font-family: 'JetBrains Mono', monospace;
          color: white;
          display: flex;
          flex-direction: column;
          overflow-x: hidden;
        }

        .tl-header {
          background: rgba(0,0,0,0.8);
          border-bottom: 1px solid rgba(0,242,255,0.1);
          backdrop-filter: blur(20px);
          padding: 16px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }

        .tl-brand {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 20px;
          font-weight: 900;
          font-style: italic;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .tl-brand span { color: #00f2ff; }

        .tl-step-indicator {
          font-size: 8px;
          letter-spacing: 0.3em;
          color: rgba(0,242,255,0.4);
          text-transform: uppercase;
          font-weight: 700;
        }

        .tl-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: 24px 20px;
          max-width: 440px;
          margin: 0 auto;
          width: 100%;
        }

        /* ── BIB INPUT ── */
        .tl-bib-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 32px;
        }

        .tl-bib-title {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: clamp(32px, 10vw, 48px);
          font-weight: 900;
          font-style: italic;
          text-transform: uppercase;
          line-height: 1;
          color: white;
        }

        .tl-bib-title span { color: #00f2ff; }

        .tl-bib-sub {
          font-size: 10px;
          letter-spacing: 0.2em;
          color: rgba(255,255,255,0.3);
          text-transform: uppercase;
          margin-top: 8px;
        }

        .tl-input-wrap { position: relative; }

        .tl-input {
          width: 100%;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(0,242,255,0.2);
          border-radius: 16px;
          padding: 20px 24px;
          color: white;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 48px;
          font-weight: 900;
          font-style: italic;
          text-align: center;
          letter-spacing: 0.05em;
          outline: none;
          transition: all 0.2s;
          -webkit-appearance: none;
        }

        .tl-input:focus {
          border-color: rgba(0,242,255,0.5);
          background: rgba(0,242,255,0.03);
          box-shadow: 0 0 0 3px rgba(0,242,255,0.08);
        }

        .tl-input::placeholder { color: rgba(255,255,255,0.1); }

        .tl-btn-main {
          width: 100%;
          padding: 20px;
          background: #00f2ff;
          border: none;
          border-radius: 16px;
          color: black;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 18px;
          font-weight: 900;
          font-style: italic;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.15s;
          -webkit-appearance: none;
        }

        .tl-btn-main:active { transform: scale(0.98); }
        .tl-btn-main:disabled { opacity: 0.3; cursor: not-allowed; }

        .tl-btn-main.green {
          background: #22c55e;
        }

        .tl-error {
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 12px;
          padding: 12px 16px;
          color: #f87171;
          font-size: 10px;
          letter-spacing: 0.1em;
          text-align: center;
        }

        /* ── GPS REQUEST ── */
        .tl-gps-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 24px;
        }

        .tl-runner-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(0,242,255,0.1);
          border-radius: 20px;
          padding: 24px;
          position: relative;
          overflow: hidden;
        }

        .tl-runner-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(0,242,255,0.3), transparent);
        }

        .tl-runner-hello {
          font-size: 10px;
          letter-spacing: 0.3em;
          color: rgba(0,242,255,0.5);
          text-transform: uppercase;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .tl-runner-name {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: clamp(28px, 8vw, 40px);
          font-weight: 900;
          font-style: italic;
          text-transform: uppercase;
          color: white;
          line-height: 1;
          margin-bottom: 12px;
        }

        .tl-runner-tags {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .tl-tag {
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          padding: 3px 10px;
          border-radius: 20px;
          background: rgba(0,242,255,0.08);
          border: 1px solid rgba(0,242,255,0.2);
          color: rgba(0,242,255,0.8);
        }

        .tl-gps-info {
          background: rgba(0,242,255,0.04);
          border: 1px solid rgba(0,242,255,0.1);
          border-radius: 16px;
          padding: 20px;
          text-align: center;
        }

        .tl-gps-icon { font-size: 32px; margin-bottom: 12px; }

        .tl-gps-title {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 20px;
          font-weight: 900;
          font-style: italic;
          text-transform: uppercase;
          color: white;
          margin-bottom: 8px;
        }

        .tl-gps-desc {
          font-size: 10px;
          letter-spacing: 0.1em;
          color: rgba(255,255,255,0.4);
          line-height: 1.6;
        }

        /* ── WAITING ── */
        .tl-waiting-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 32px;
          text-align: center;
        }

        .tl-pulse-ring {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          border: 2px solid rgba(0,242,255,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          animation: tl-ring-pulse 2s infinite;
        }

        .tl-pulse-ring::before {
          content: '';
          position: absolute;
          width: 140px; height: 140px;
          border-radius: 50%;
          border: 1px solid rgba(0,242,255,0.1);
          animation: tl-ring-pulse 2s infinite 0.3s;
        }

        .tl-pulse-ring::after {
          content: '';
          position: absolute;
          width: 160px; height: 160px;
          border-radius: 50%;
          border: 1px solid rgba(0,242,255,0.05);
          animation: tl-ring-pulse 2s infinite 0.6s;
        }

        @keyframes tl-ring-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.7; }
        }

        .tl-pulse-icon { font-size: 40px; }

        .tl-waiting-title {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 28px;
          font-weight: 900;
          font-style: italic;
          text-transform: uppercase;
          color: white;
        }

        .tl-waiting-sub {
          font-size: 9px;
          letter-spacing: 0.3em;
          color: rgba(255,255,255,0.3);
          text-transform: uppercase;
        }

        .tl-gps-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 20px;
          background: rgba(34,197,94,0.08);
          border: 1px solid rgba(34,197,94,0.2);
        }

        .tl-gps-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 6px #22c55e;
          animation: tl-gps-blink 1s infinite;
        }

        @keyframes tl-gps-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        .tl-gps-indicator-text {
          font-size: 9px;
          letter-spacing: 0.2em;
          color: #22c55e;
          font-weight: 700;
          text-transform: uppercase;
        }

        /* ── RUNNING ── */
        .tl-running-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          text-align: center;
        }

        .tl-runner-mini {
          font-size: 10px;
          letter-spacing: 0.2em;
          color: rgba(255,255,255,0.3);
          text-transform: uppercase;
          font-weight: 700;
        }

        .tl-live-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.3);
          border-radius: 20px;
          margin-bottom: 8px;
        }

        .tl-live-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #ef4444;
          box-shadow: 0 0 6px #ef4444;
          animation: tl-gps-blink 0.8s infinite;
        }

        .tl-live-text {
          font-size: 9px;
          letter-spacing: 0.3em;
          color: #ef4444;
          font-weight: 900;
          text-transform: uppercase;
        }

        .tl-big-timer {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: clamp(64px, 22vw, 96px);
          font-weight: 900;
          font-style: italic;
          letter-spacing: -0.02em;
          color: #22c55e;
          text-shadow: 0 0 40px rgba(34,197,94,0.3);
          line-height: 1;
        }

        .tl-gps-pts {
          font-size: 9px;
          letter-spacing: 0.2em;
          color: rgba(34,197,94,0.4);
          text-transform: uppercase;
        }

        /* ── FINISHED ── */
        .tl-finished-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding-bottom: 24px;
        }

        .tl-finish-header {
          text-align: center;
          padding: 24px 0 16px;
        }

        .tl-finish-medal { font-size: 48px; margin-bottom: 8px; }

        .tl-finish-title {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 28px;
          font-weight: 900;
          font-style: italic;
          text-transform: uppercase;
          color: #00f2ff;
          text-shadow: 0 0 20px rgba(0,242,255,0.3);
        }

        .tl-result-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(0,242,255,0.12);
          border-radius: 20px;
          padding: 28px 24px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .tl-result-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(0,242,255,0.4), transparent);
        }

        .tl-result-name {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: clamp(20px, 6vw, 28px);
          font-weight: 900;
          font-style: italic;
          text-transform: uppercase;
          color: white;
          margin-bottom: 4px;
        }

        .tl-result-cat {
          font-size: 9px;
          letter-spacing: 0.25em;
          color: rgba(0,242,255,0.5);
          text-transform: uppercase;
          margin-bottom: 24px;
        }

        .tl-result-time-label {
          font-size: 8px;
          letter-spacing: 0.4em;
          color: rgba(255,255,255,0.2);
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .tl-result-time {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: clamp(56px, 18vw, 80px);
          font-weight: 900;
          font-style: italic;
          color: #00f2ff;
          text-shadow: 0 0 30px rgba(0,242,255,0.4);
          letter-spacing: -0.02em;
          line-height: 1;
        }

        .tl-stats-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 20px;
        }

        .tl-stat-box {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 12px;
          padding: 12px;
          text-align: center;
        }

        .tl-stat-label {
          font-size: 7px;
          letter-spacing: 0.25em;
          color: rgba(255,255,255,0.2);
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .tl-stat-value {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 20px;
          font-weight: 900;
          font-style: italic;
          color: white;
        }

        .tl-share-btn {
          width: 100%;
          padding: 16px;
          background: rgba(0,242,255,0.08);
          border: 1px solid rgba(0,242,255,0.2);
          border-radius: 14px;
          color: #00f2ff;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 15px;
          font-weight: 900;
          font-style: italic;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s;
        }

        .tl-share-btn:active { background: rgba(0,242,255,0.15); }

        .tl-back-btn {
          width: 100%;
          padding: 14px;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          color: rgba(255,255,255,0.3);
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
        }
      `}</style>

      <div className="tl-root">
        {/* Header */}
        <div className="tl-header">
          <div className="tl-brand">RAYO<span>CERO</span></div>
          <div className="tl-step-indicator">
            {step === 'bib_input' && 'Identificación'}
            {step === 'gps_request' && 'Activar GPS'}
            {step === 'waiting' && 'En espera'}
            {step === 'running' && '⚡ En carrera'}
            {step === 'finished' && '🏁 Finalizado'}
          </div>
        </div>

        <div className="tl-body">

          {/* ── PASO 1: BIB INPUT ── */}
          {step === 'bib_input' && (
            <div className="tl-bib-section">
              <div>
                <div className="tl-bib-title">
                  Ingresa tu<br /><span>Dorsal</span>
                </div>
                <div className="tl-bib-sub">RayoCero We Run · Telemetría GPS</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input
                  className="tl-input"
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="000"
                  value={bibInput}
                  onChange={e => { setBibInput(e.target.value); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleBibSubmit()}
                  autoFocus
                />
                {error && <div className="tl-error">{error}</div>}
                <button className="tl-btn-main" onClick={handleBibSubmit} disabled={loading || !bibInput}>
                  {loading ? 'Buscando...' : 'Entrar →'}
                </button>
              </div>

              <div style={{ textAlign: 'center', fontSize: 9, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.1)', textTransform: 'uppercase' }}>
                El número está impreso en tu dorsal
              </div>
            </div>
          )}

          {/* ── PASO 2: GPS REQUEST ── */}
          {step === 'gps_request' && runner && (
            <div className="tl-gps-section">
              <div className="tl-runner-card">
                <div className="tl-runner-hello">Hola,</div>
                <div className="tl-runner-name">{runner.nombre} {runner.apellido}</div>
                <div className="tl-runner-tags">
                  <span className="tl-tag">BIB #{runner.bib_number}</span>
                  <span className="tl-tag">{runner.categoria}</span>
                </div>
              </div>

              <div className="tl-gps-info">
                <div className="tl-gps-icon">📍</div>
                <div className="tl-gps-title">Activar seguimiento GPS</div>
                <div className="tl-gps-desc">
                  Tu teléfono registrará tu ruta durante la carrera.<br />
                  Al terminar verás tu recorrido completo estilo Strava.<br /><br />
                  <strong style={{ color: 'rgba(0,242,255,0.6)' }}>Acepta el permiso de ubicación cuando aparezca.</strong>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button className="tl-btn-main green" onClick={handleActivateGPS}>
                  ✓ Activar GPS y esperar salida
                </button>
                <button className="tl-back-btn" onClick={() => setStep('bib_input')}>
                  ← Cambiar dorsal
                </button>
              </div>
            </div>
          )}

          {/* ── PASO 3: ESPERANDO SALIDA ── */}
          {step === 'waiting' && runner && (
            <div className="tl-waiting-section">
              <div className="tl-pulse-ring">
                <div className="tl-pulse-icon">⚡</div>
              </div>

              <div>
                <div style={{ fontSize: 9, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', marginBottom: 8, textAlign: 'center' }}>
                  {runner.nombre} · BIB #{runner.bib_number}
                </div>
                <div className="tl-waiting-title">Esperando</div>
                <div className="tl-waiting-title" style={{ color: '#00f2ff' }}>Pistola de salida</div>
                <div className="tl-waiting-sub" style={{ marginTop: 12 }}>
                  El timer arrancará automáticamente
                </div>
              </div>

              {gpsStatus === 'active' && (
                <div className="tl-gps-indicator">
                  <div className="tl-gps-dot" />
                  <span className="tl-gps-indicator-text">GPS activo · {gpsPoints.length} pts</span>
                </div>
              )}

              {gpsStatus === 'error' && (
                <div className="tl-error" style={{ fontSize: 9 }}>
                  GPS: {gpsError}. El tiempo se registrará igual.
                </div>
              )}

              <div style={{ fontSize: 8, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.1)', textTransform: 'uppercase', textAlign: 'center' }}>
                Mantén esta pantalla abierta
              </div>
            </div>
          )}

          {/* ── PASO 4: EN CARRERA ── */}
          {step === 'running' && runner && (
            <div className="tl-running-section">
              <div className="tl-live-badge">
                <div className="tl-live-dot" />
                <span className="tl-live-text">En vivo</span>
              </div>

              <div className="tl-runner-mini">
                {runner.nombre} {runner.apellido} · BIB #{runner.bib_number}
              </div>

              <div className="tl-big-timer">{elapsed}</div>

              {gpsStatus === 'active' && (
                <div className="tl-gps-indicator">
                  <div className="tl-gps-dot" />
                  <span className="tl-gps-indicator-text">GPS · {gpsPoints.length} pts</span>
                </div>
              )}

              <div style={{ fontSize: 8, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.1)', textTransform: 'uppercase' }}>
                No cierres esta pantalla
              </div>
            </div>
          )}

          {/* ── PASO 5: FINALIZADO ── */}
          {step === 'finished' && runner && (
            <div className="tl-finished-section">
              <div className="tl-finish-header">
                <div className="tl-finish-medal">🏅</div>
                <div className="tl-finish-title">¡Carrera completada!</div>
              </div>

              <div className="tl-result-card">
                <div className="tl-result-name">{runner.nombre} {runner.apellido}</div>
                <div className="tl-result-cat">BIB #{runner.bib_number} · {runner.categoria}</div>
                <div className="tl-result-time-label">Tiempo oficial</div>
                <div className="tl-result-time">
                  {runner.finish_time_seconds ? formatFinal(runner.finish_time_seconds) : '--:--'}
                </div>

                {gpsPoints.length > 0 && (
                  <div className="tl-stats-row">
                    <div className="tl-stat-box">
                      <div className="tl-stat-label">Distancia GPS</div>
                      <div className="tl-stat-value">{calcDist(gpsPoints).toFixed(2)} km</div>
                    </div>
                    <div className="tl-stat-box">
                      <div className="tl-stat-label">Puntos GPS</div>
                      <div className="tl-stat-value">{gpsPoints.length}</div>
                    </div>
                  </div>
                )}
              </div>

              {gpsPoints.length >= 2 && <RouteMap points={gpsPoints} />}

              <button className="tl-share-btn" onClick={async () => {
                const text = `⚡ RayoCero We Run\n🏃 ${runner.nombre} ${runner.apellido} — BIB #${runner.bib_number}\n⏱️ ${runner.finish_time_seconds ? formatFinal(runner.finish_time_seconds) : '--'}\n📍 ${calcDist(gpsPoints).toFixed(2)} km\n\nrayocero-run.vercel.app`;
                if (navigator.share) { await navigator.share({ title: 'Mi resultado RayoCero', text }); }
                else { await navigator.clipboard.writeText(text); alert('Resultado copiado'); }
              }}>
                🔗 Compartir mi resultado
              </button>

              <button className="tl-back-btn" onClick={() => {
                setStep('bib_input'); setRunner(null); setBibInput(''); setGpsPoints([]);
              }}>
                Ver otro corredor
              </button>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
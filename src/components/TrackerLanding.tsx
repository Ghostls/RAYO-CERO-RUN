/**
 * RAYO CERO — TRACKER LANDING V2.1
 * Mini PWA para corredores: BIB → GPS → Timer en vivo → Mapa resultado
 * Diseño: Liquid Glass Morph + RouteMapStrava V3 (Leaflet tiles reales)
 * Valkyron Group — 2026
 *
 * EVOLUCIÓN V2.1: StravaMap SVG inline reemplazado por RouteMapStrava V3
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { GeoKalmanFilter, GeoPoint } from './KalmanFilter';
import LazyRouteMapStrava from './LazyRouteMapStrava';

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
  const prev = pts[i - 1];
  const R = 6371;
  const dLat = ((p.lat - prev.lat) * Math.PI) / 180;
  const dLng = ((p.lng - prev.lng) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((prev.lat * Math.PI) / 180) * Math.cos((p.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return acc + R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}, 0);

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
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const startGPS = useCallback(() => {
    if (!navigator.geolocation) { setGpsStatus('error'); setGpsError('GPS no disponible'); return; }
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

  const handleBibSubmit = async () => {
    const bib = parseInt(bibInput.trim());
    if (!bib || isNaN(bib)) { setError('Ingresa un número de dorsal válido'); return; }
    setLoading(true); setError('');
    const { data, error: err } = await supabase.from('runners')
      .select('bib_number,nombre,apellido,categoria,race_status,start_time,finish_time,finish_time_seconds,gps_track')
      .eq('bib_number', bib).single();
    setLoading(false);
    if (err || !data) { setError(`Dorsal #${bib} no encontrado`); return; }
    const r = { ...data, race_status: data.race_status ?? 'waiting' } as Runner;
    setRunner(r);
    if (r.race_status === 'completed') {
      if (r.gps_track && r.gps_track.length > 0) setGpsPoints(r.gps_track);
      setStep('finished'); return;
    }
    if (r.race_status === 'in_progress' && r.start_time) {
      setStep('running'); startGPS();
      timerRef.current = setInterval(() => setElapsed(formatElapsed(r.start_time!)), 1000);
      subscribeToRunner(bib, r); return;
    }
    setStep('gps_request');
  };

  const handleActivateGPS = () => {
    startGPS(); setStep('waiting');
    if (runner) subscribeToRunner(runner.bib_number, runner);
  };

  const subscribeToRunner = useCallback((bib: number, _currentRunner: Runner) => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    channelRef.current = supabase.channel(`tracker-${bib}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'runners', filter: `bib_number=eq.${bib}` }, (payload) => {
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

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,400;0,700;0,900;1,400;1,700;1,900&family=JetBrains+Mono:wght@400;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }

        .tl-root {
          min-height: 100vh; min-height: 100dvh;
          background: #03070b;
          background-image:
            radial-gradient(ellipse at 20% 10%, rgba(0,242,255,0.06) 0%, transparent 40%),
            radial-gradient(ellipse at 80% 90%, rgba(0,100,180,0.04) 0%, transparent 40%);
          font-family: 'JetBrains Mono', monospace;
          color: white;
          display: flex; flex-direction: column;
          overflow-x: hidden;
        }

        .glass {
          background: rgba(255,255,255,0.03);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border: 1px solid rgba(255,255,255,0.07);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.3);
        }

        .glass-cyan {
          background: rgba(0,242,255,0.04);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(0,242,255,0.15);
          box-shadow: inset 0 1px 0 rgba(0,242,255,0.08), 0 0 30px rgba(0,242,255,0.05);
        }

        .glass-top-line::before {
          content: '';
          position: absolute;
          top: 0; left: 10%; right: 10%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(0,242,255,0.4), transparent);
        }

        .tl-header {
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(30px);
          -webkit-backdrop-filter: blur(30px);
          border-bottom: 1px solid rgba(0,242,255,0.08);
          padding: 16px 20px;
          display: flex; align-items: center; justify-content: space-between;
          flex-shrink: 0;
          position: sticky; top: 0; z-index: 10;
        }

        .tl-brand {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 22px; font-weight: 900; font-style: italic;
          text-transform: uppercase; letter-spacing: 0.05em;
        }
        .tl-brand span { color: #00f2ff; }

        .tl-step-pill {
          font-size: 8px; font-weight: 700;
          letter-spacing: 0.25em; text-transform: uppercase;
          padding: 5px 12px; border-radius: 20px;
          background: rgba(0,242,255,0.06);
          border: 1px solid rgba(0,242,255,0.15);
          color: rgba(0,242,255,0.6);
        }

        .tl-body {
          flex: 1; display: flex; flex-direction: column;
          padding: 28px 20px; max-width: 460px; margin: 0 auto; width: 100%;
        }

        .tl-bib-section {
          flex: 1; display: flex; flex-direction: column;
          justify-content: center; gap: 28px;
        }

        .tl-hero-title {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: clamp(40px, 12vw, 64px);
          font-weight: 900; font-style: italic;
          text-transform: uppercase; line-height: 0.9;
          letter-spacing: -0.01em;
        }
        .tl-hero-title .cyan { color: #00f2ff; }

        .tl-hero-sub {
          font-size: 9px; letter-spacing: 0.3em;
          color: rgba(255,255,255,0.2); text-transform: uppercase;
          margin-top: 10px;
        }

        .tl-input-group { display: flex; flex-direction: column; gap: 12px; }

        .tl-bib-input {
          width: 100%;
          background: rgba(0,242,255,0.03);
          border: 1px solid rgba(0,242,255,0.2);
          border-radius: 18px;
          padding: 22px 24px;
          color: white;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 56px; font-weight: 900; font-style: italic;
          text-align: center; letter-spacing: 0.03em;
          outline: none;
          transition: all 0.2s;
          -webkit-appearance: none;
          backdrop-filter: blur(10px);
        }
        .tl-bib-input:focus {
          border-color: rgba(0,242,255,0.5);
          background: rgba(0,242,255,0.05);
          box-shadow: 0 0 0 4px rgba(0,242,255,0.06), inset 0 0 20px rgba(0,242,255,0.03);
        }
        .tl-bib-input::placeholder { color: rgba(255,255,255,0.07); }

        .tl-btn-cyan {
          width: 100%; padding: 20px;
          background: #00f2ff; border: none; border-radius: 16px;
          color: #03070b;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 18px; font-weight: 900; font-style: italic;
          letter-spacing: 0.2em; text-transform: uppercase;
          cursor: pointer; transition: all 0.15s;
          -webkit-appearance: none;
          box-shadow: 0 0 20px rgba(0,242,255,0.2);
        }
        .tl-btn-cyan:active { transform: scale(0.98); }
        .tl-btn-cyan:disabled { opacity: 0.3; cursor: not-allowed; }

        .tl-btn-green {
          width: 100%; padding: 20px;
          background: #22c55e; border: none; border-radius: 16px;
          color: white;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 18px; font-weight: 900; font-style: italic;
          letter-spacing: 0.15em; text-transform: uppercase;
          cursor: pointer; transition: all 0.15s;
          box-shadow: 0 0 20px rgba(34,197,94,0.2);
        }
        .tl-btn-green:active { transform: scale(0.98); }

        .tl-btn-ghost {
          width: 100%; padding: 15px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          color: rgba(255,255,255,0.3);
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 13px; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          cursor: pointer;
        }

        .tl-error {
          background: rgba(239,68,68,0.07);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 12px; padding: 12px 16px;
          color: #f87171; font-size: 10px;
          letter-spacing: 0.1em; text-align: center;
        }

        .tl-gps-section {
          flex: 1; display: flex; flex-direction: column;
          justify-content: center; gap: 20px;
        }

        .tl-runner-card {
          border-radius: 22px; padding: 24px;
          position: relative; overflow: hidden;
        }

        .tl-runner-hello {
          font-size: 9px; letter-spacing: 0.35em;
          color: rgba(0,242,255,0.5); text-transform: uppercase;
          font-weight: 700; margin-bottom: 6px;
        }

        .tl-runner-name {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: clamp(26px, 8vw, 38px);
          font-weight: 900; font-style: italic;
          text-transform: uppercase; color: white;
          line-height: 1; margin-bottom: 12px;
        }

        .tl-tags { display: flex; gap: 8px; flex-wrap: wrap; }

        .tl-tag {
          font-size: 8px; font-weight: 900;
          letter-spacing: 0.2em; text-transform: uppercase;
          padding: 4px 11px; border-radius: 20px;
          background: rgba(0,242,255,0.06);
          border: 1px solid rgba(0,242,255,0.18);
          color: rgba(0,242,255,0.8);
        }

        .tl-gps-card {
          border-radius: 18px; padding: 20px; text-align: center;
        }

        .tl-gps-icon { font-size: 28px; margin-bottom: 10px; }

        .tl-gps-card-title {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 18px; font-weight: 900; font-style: italic;
          text-transform: uppercase; color: white; margin-bottom: 8px;
        }

        .tl-gps-card-desc {
          font-size: 10px; letter-spacing: 0.08em;
          color: rgba(255,255,255,0.35); line-height: 1.7;
        }

        .tl-waiting-section {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 28px; text-align: center;
        }

        .tl-radar {
          width: 130px; height: 130px;
          border-radius: 50%;
          border: 1.5px solid rgba(0,242,255,0.25);
          display: flex; align-items: center; justify-content: center;
          position: relative;
        }

        .tl-radar::before {
          content: '';
          position: absolute;
          width: 156px; height: 156px; border-radius: 50%;
          border: 1px solid rgba(0,242,255,0.1);
          animation: tl-radar-expand 2.5s infinite;
        }

        .tl-radar::after {
          content: '';
          position: absolute;
          width: 182px; height: 182px; border-radius: 50%;
          border: 1px solid rgba(0,242,255,0.05);
          animation: tl-radar-expand 2.5s infinite 0.5s;
        }

        @keyframes tl-radar-expand {
          0% { transform: scale(0.9); opacity: 0.8; }
          100% { transform: scale(1.1); opacity: 0; }
        }

        .tl-radar-icon { font-size: 44px; }

        .tl-waiting-label {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 30px; font-weight: 900; font-style: italic;
          text-transform: uppercase; line-height: 1;
        }
        .tl-waiting-label .cyan { color: #00f2ff; }

        .tl-waiting-sub {
          font-size: 8px; letter-spacing: 0.3em;
          color: rgba(255,255,255,0.2); text-transform: uppercase;
          margin-top: 4px;
        }

        .tl-gps-pill {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 16px; border-radius: 20px;
          background: rgba(34,197,94,0.07);
          border: 1px solid rgba(34,197,94,0.2);
        }

        .tl-gps-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 6px #22c55e;
          animation: tl-blink 1s infinite;
        }

        @keyframes tl-blink {
          0%, 100% { opacity: 1; } 50% { opacity: 0.25; }
        }

        .tl-gps-pill-text {
          font-size: 9px; letter-spacing: 0.2em;
          color: #22c55e; font-weight: 700; text-transform: uppercase;
        }

        .tl-running-section {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 16px; text-align: center;
        }

        .tl-live-pill {
          display: flex; align-items: center; gap: 6px;
          padding: 6px 14px; border-radius: 20px;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.25);
        }

        .tl-live-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #ef4444; box-shadow: 0 0 5px #ef4444;
          animation: tl-blink 0.8s infinite;
        }

        .tl-live-text {
          font-size: 9px; letter-spacing: 0.3em;
          color: #ef4444; font-weight: 900; text-transform: uppercase;
        }

        .tl-runner-mini {
          font-size: 10px; letter-spacing: 0.2em;
          color: rgba(255,255,255,0.25); text-transform: uppercase;
        }

        .tl-big-timer {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: clamp(72px, 24vw, 104px);
          font-weight: 900; font-style: italic;
          letter-spacing: -0.02em; color: #22c55e;
          text-shadow: 0 0 50px rgba(34,197,94,0.25);
          line-height: 1;
        }

        .tl-screen-on {
          font-size: 8px; letter-spacing: 0.25em;
          color: rgba(255,255,255,0.08); text-transform: uppercase;
        }

        .tl-finished-section {
          flex: 1; display: flex; flex-direction: column;
          gap: 14px; padding-bottom: 24px;
        }

        .tl-finish-hero { text-align: center; padding: 20px 0 8px; }
        .tl-finish-medal { font-size: 52px; margin-bottom: 6px; }

        .tl-finish-title {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 30px; font-weight: 900; font-style: italic;
          text-transform: uppercase; color: #00f2ff;
          text-shadow: 0 0 25px rgba(0,242,255,0.25);
        }

        .tl-result-glass {
          border-radius: 22px; padding: 28px 22px;
          text-align: center; position: relative; overflow: hidden;
        }

        .tl-res-name {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: clamp(22px, 6vw, 30px);
          font-weight: 900; font-style: italic;
          text-transform: uppercase; color: white;
          line-height: 1; margin-bottom: 4px;
        }

        .tl-res-meta {
          font-size: 9px; letter-spacing: 0.25em;
          color: rgba(0,242,255,0.4); text-transform: uppercase;
          margin-bottom: 22px;
        }

        .tl-res-time-label {
          font-size: 8px; letter-spacing: 0.45em;
          color: rgba(255,255,255,0.18); text-transform: uppercase;
          margin-bottom: 6px;
        }

        .tl-res-time {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: clamp(60px, 20vw, 84px);
          font-weight: 900; font-style: italic;
          color: #00f2ff;
          text-shadow: 0 0 35px rgba(0,242,255,0.35);
          letter-spacing: -0.02em; line-height: 1;
        }

        .tl-stats-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 10px; margin-top: 18px;
        }

        .tl-stat-box {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 14px; padding: 12px;
          text-align: center;
        }

        .tl-stat-label {
          font-size: 7px; letter-spacing: 0.25em;
          color: rgba(255,255,255,0.18); text-transform: uppercase;
          margin-bottom: 4px;
        }

        .tl-stat-value {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 22px; font-weight: 900; font-style: italic; color: white;
        }

        .tl-btn-share {
          width: 100%; padding: 17px;
          background: rgba(0,242,255,0.07);
          border: 1px solid rgba(0,242,255,0.2);
          border-radius: 15px; color: #00f2ff;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 15px; font-weight: 900; font-style: italic;
          letter-spacing: 0.12em; text-transform: uppercase;
          cursor: pointer; transition: all 0.2s;
          backdrop-filter: blur(10px);
        }
        .tl-btn-share:active { background: rgba(0,242,255,0.12); }
      `}</style>

      <div className="tl-root">
        <div className="tl-header">
          <div className="tl-brand">RAYO<span>CERO</span></div>
          <div className="tl-step-pill">
            {step === 'bib_input' && 'Identificación'}
            {step === 'gps_request' && 'Activar GPS'}
            {step === 'waiting' && 'En espera'}
            {step === 'running' && '⚡ En carrera'}
            {step === 'finished' && '🏁 Finalizado'}
          </div>
        </div>

        <div className="tl-body">

          {/* PASO 1: BIB */}
          {step === 'bib_input' && (
            <div className="tl-bib-section">
              <div>
                <div className="tl-hero-title">Ingresa tu<br /><span className="cyan">Dorsal</span></div>
                <div className="tl-hero-sub">RayoCero We Run · Telemetría GPS</div>
              </div>
              <div className="tl-input-group">
                <input
                  className="tl-bib-input"
                  type="number" inputMode="numeric" pattern="[0-9]*"
                  placeholder="000"
                  value={bibInput}
                  onChange={e => { setBibInput(e.target.value); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleBibSubmit()}
                  autoFocus
                />
                {error && <div className="tl-error">{error}</div>}
                <button className="tl-btn-cyan" onClick={handleBibSubmit} disabled={loading || !bibInput}>
                  {loading ? 'Buscando...' : 'Entrar →'}
                </button>
              </div>
              <div style={{ textAlign: 'center', fontSize: 8, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.08)', textTransform: 'uppercase' }}>
                El número está impreso en tu dorsal
              </div>
            </div>
          )}

          {/* PASO 2: GPS REQUEST */}
          {step === 'gps_request' && runner && (
            <div className="tl-gps-section">
              <div className="tl-runner-card glass glass-top-line">
                <div className="tl-runner-hello">Hola,</div>
                <div className="tl-runner-name">{runner.nombre} {runner.apellido}</div>
                <div className="tl-tags">
                  <span className="tl-tag">BIB #{runner.bib_number}</span>
                  <span className="tl-tag">{runner.categoria}</span>
                </div>
              </div>
              <div className="tl-gps-card glass-cyan" style={{ borderRadius: 18 }}>
                <div className="tl-gps-icon">📍</div>
                <div className="tl-gps-card-title">Activar Seguimiento GPS</div>
                <div className="tl-gps-card-desc">
                  Tu teléfono registrará tu ruta durante la carrera.<br />
                  Al terminar verás tu recorrido completo estilo Strava.<br /><br />
                  <span style={{ color: 'rgba(0,242,255,0.6)', fontWeight: 700 }}>Acepta el permiso de ubicación cuando aparezca.</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button className="tl-btn-green" onClick={handleActivateGPS}>✓ Activar GPS y esperar salida</button>
                <button className="tl-btn-ghost" onClick={() => setStep('bib_input')}>← Cambiar dorsal</button>
              </div>
            </div>
          )}

          {/* PASO 3: WAITING */}
          {step === 'waiting' && runner && (
            <div className="tl-waiting-section">
              <div className="tl-radar"><div className="tl-radar-icon">⚡</div></div>
              <div>
                <div style={{ fontSize: 9, letterSpacing: '0.3em', color: 'rgba(255,255,255,0.15)', textTransform: 'uppercase', marginBottom: 10, textAlign: 'center' }}>
                  {runner.nombre} · BIB #{runner.bib_number}
                </div>
                <div className="tl-waiting-label">Esperando</div>
                <div className="tl-waiting-label"><span className="cyan">pistola de salida</span></div>
                <div className="tl-waiting-sub" style={{ marginTop: 10 }}>El timer arrancará automáticamente</div>
              </div>
              {gpsStatus === 'active' && (
                <div className="tl-gps-pill">
                  <div className="tl-gps-dot" />
                  <span className="tl-gps-pill-text">GPS activo · {gpsPoints.length} pts</span>
                </div>
              )}
              {gpsStatus === 'error' && (
                <div className="tl-error" style={{ fontSize: 9 }}>GPS: {gpsError}. El tiempo se registrará igual.</div>
              )}
              <div style={{ fontSize: 8, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.07)', textTransform: 'uppercase' }}>
                Mantén esta pantalla abierta
              </div>
            </div>
          )}

          {/* PASO 4: RUNNING */}
          {step === 'running' && runner && (
            <div className="tl-running-section">
              <div className="tl-live-pill">
                <div className="tl-live-dot" />
                <span className="tl-live-text">En vivo</span>
              </div>
              <div className="tl-runner-mini">{runner.nombre} {runner.apellido} · BIB #{runner.bib_number}</div>
              <div className="tl-big-timer">{elapsed}</div>
              {gpsStatus === 'active' && (
                <div className="tl-gps-pill">
                  <div className="tl-gps-dot" />
                  <span className="tl-gps-pill-text">GPS · {gpsPoints.length} pts</span>
                </div>
              )}
              <div className="tl-screen-on">No cierres esta pantalla</div>
            </div>
          )}

          {/* PASO 5: FINISHED */}
          {step === 'finished' && runner && (
            <div className="tl-finished-section">
              <div className="tl-finish-hero">
                <div className="tl-finish-medal">🏅</div>
                <div className="tl-finish-title">¡Carrera completada!</div>
              </div>

              <div className="tl-result-glass glass glass-top-line">
                <div className="tl-res-name">{runner.nombre} {runner.apellido}</div>
                <div className="tl-res-meta">BIB #{runner.bib_number} · {runner.categoria}</div>
                <div className="tl-res-time-label">Tiempo oficial</div>
                <div className="tl-res-time">
                  {runner.finish_time_seconds ? formatFinal(runner.finish_time_seconds) : '--:--'}
                </div>
                {gpsPoints.length > 0 && (
                  <div className="tl-stats-grid">
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

              {/* MAPA REAL — RouteMapStrava V3 con Leaflet tiles */}
              {gpsPoints.length >= 2 && (
                <LazyRouteMapStrava
                  points={gpsPoints}
                  athleteName={`${runner.nombre} ${runner.apellido}`}
                  eventName="WE RUN 10K NIGHT FEST 2026"
                  showShareCard={true}
                />
              )}

              <button className="tl-btn-share" onClick={async () => {
                const text = `⚡ RayoCero We Run\n🏃 ${runner.nombre} ${runner.apellido} — BIB #${runner.bib_number}\n⏱️ ${runner.finish_time_seconds ? formatFinal(runner.finish_time_seconds) : '--'}\n📍 ${calcDist(gpsPoints).toFixed(2)} km\n\nrayocero-run.vercel.app/tracker`;
                if (navigator.share) await navigator.share({ title: 'Mi resultado RayoCero', text });
                else { await navigator.clipboard.writeText(text); alert('Resultado copiado'); }
              }}>
                🔗 Compartir mi resultado
              </button>

              <button className="tl-btn-ghost" onClick={() => {
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
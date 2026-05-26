/**
 * RAYO CERO — RACE TRACKER V2
 * Telemetría GPS en tiempo real con Filtro de Kalman + Supabase Realtime
 * Diseño: consistente con rayocero-run.vercel.app
 * Stack visual: #03070b fondo, cyan #00f2ff acento, tipografía militar italic
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { GeoKalmanFilter, GeoPoint } from './KalmanFilter';

type RaceStatus = 'waiting' | 'in_progress' | 'completed';

interface RunnerState {
  bib_number: number;
  nombre: string;
  apellido: string;
  categoria: string;
  race_status: RaceStatus;
  start_time: string | null;
  finish_time: string | null;
  finish_time_seconds: number | null;
  gps_track?: GeoPoint[];
}

interface Props {
  bibNumber?: number;
}

const formatElapsed = (startIso: string): string => {
  const elapsed = (Date.now() - new Date(startIso).getTime()) / 1000;
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = Math.floor(elapsed % 60);
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
};

const formatFinal = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = (seconds % 60).toFixed(2);
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(parseFloat(s)).padStart(5,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(parseFloat(s)).padStart(5,'0')}`;
};

const RouteMap = ({ points }: { points: GeoPoint[] }) => {
  if (points.length < 2) return null;
  const PAD = 40, W = 600, H = 280;
  const lats = points.map(p => p.lat);
  const lngs = points.map(p => p.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const rLat = maxLat - minLat || 0.001;
  const rLng = maxLng - minLng || 0.001;
  const toXY = (lat: number, lng: number) => ({
    x: PAD + ((lng - minLng) / rLng) * (W - PAD * 2),
    y: H - PAD - ((lat - minLat) / rLat) * (H - PAD * 2),
  });
  const path = points.map((p, i) => {
    const { x, y } = toXY(p.lat, p.lng);
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const start = toXY(points[0].lat, points[0].lng);
  const end = toXY(points[points.length - 1].lat, points[points.length - 1].lng);
  const dist = points.reduce((acc, p, i) => {
    if (i === 0) return 0;
    const prev = points[i - 1];
    const R = 6371;
    const dLat = ((p.lat - prev.lat) * Math.PI) / 180;
    const dLng = ((p.lng - prev.lng) * Math.PI) / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos((prev.lat*Math.PI)/180)*Math.cos((p.lat*Math.PI)/180)*Math.sin(dLng/2)**2;
    return acc + R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }, 0);

  return (
    <div style={{ marginTop: 24, borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(0,242,255,0.15)', background: 'rgba(0,0,0,0.4)' }}>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(0,242,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 9, letterSpacing: '0.3em', color: 'rgba(0,242,255,0.6)', fontWeight: 900, textTransform: 'uppercase' }}>📍 Ruta GPS · Kalman</span>
        <span style={{ fontSize: 9, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>{dist.toFixed(2)} KM · {points.length} PTS</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <defs>
          <linearGradient id="rtGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00f2ff" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#00f2ff" stopOpacity="1" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.7" />
          </linearGradient>
          <filter id="rtGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="rtGlow2">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <path d={path} fill="none" stroke="rgba(0,242,255,0.1)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
        <path d={path} fill="none" stroke="url(#rtGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#rtGlow)" />
        <circle cx={start.x} cy={start.y} r={8} fill="rgba(34,197,94,0.2)" filter="url(#rtGlow2)" />
        <circle cx={start.x} cy={start.y} r={5} fill="#22c55e" />
        <circle cx={start.x} cy={start.y} r={2.5} fill="white" />
        <text x={start.x + 12} y={start.y + 4} fill="#22c55e" fontSize="9" fontFamily="monospace" fontWeight="bold">START</text>
        <circle cx={end.x} cy={end.y} r={8} fill="rgba(0,242,255,0.2)" filter="url(#rtGlow2)" />
        <circle cx={end.x} cy={end.y} r={5} fill="#00f2ff" />
        <circle cx={end.x} cy={end.y} r={2.5} fill="white" />
        <text x={end.x + 12} y={end.y + 4} fill="#00f2ff" fontSize="9" fontFamily="monospace" fontWeight="bold">META</text>
      </svg>
    </div>
  );
};

export default function RaceTracker({ bibNumber }: Props) {
  const [bib, setBib] = useState<string>(bibNumber?.toString() ?? '');
  const [runner, setRunner] = useState<RunnerState | null>(null);
  const [gpsPoints, setGpsPoints] = useState<GeoPoint[]>([]);
  const [elapsed, setElapsed] = useState<string>('00:00');
  const [gpsActive, setGpsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const kalmanRef = useRef(new GeoKalmanFilter());
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelRef = useRef<any>(null);

  const startGPS = useCallback(() => {
    if (!navigator.geolocation) { setError('GPS no disponible'); return; }
    kalmanRef.current.reset();
    setGpsActive(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const raw: GeoPoint = { lat: pos.coords.latitude, lng: pos.coords.longitude, timestamp: pos.timestamp, accuracy: pos.coords.accuracy, speed: pos.coords.speed ?? undefined };
        const filtered = kalmanRef.current.filter(raw);
        setGpsPoints(prev => [...prev, filtered]);
      },
      (err) => setError(`GPS: ${err.message}`),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  const stopGPS = useCallback(async (points: GeoPoint[], runnerData: RunnerState) => {
    if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
    setGpsActive(false);
    if (points.length > 0) {
      await supabase.from('runners').update({ gps_track: points }).eq('bib_number', runnerData.bib_number);
    }
  }, []);

  const subscribeToRunner = useCallback((bibNum: number) => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    channelRef.current = supabase.channel(`runner-${bibNum}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'runners', filter: `bib_number=eq.${bibNum}` }, (payload) => {
        const updated = payload.new as RunnerState;
        setRunner(updated);
        if (updated.race_status === 'in_progress') {
          startGPS();
          elapsedRef.current = setInterval(() => { if (updated.start_time) setElapsed(formatElapsed(updated.start_time)); }, 1000);
        }
        if (updated.race_status === 'completed') {
          setGpsPoints(prev => { stopGPS(prev, updated); return prev; });
          if (elapsedRef.current) clearInterval(elapsedRef.current);
        }
      }).subscribe();
  }, [startGPS, stopGPS]);

  const loadRunner = async (bibNum: number) => {
    setLoading(true); setError(null);
    const { data, error: err } = await supabase.from('runners')
      .select('bib_number,nombre,apellido,categoria,race_status,start_time,finish_time,finish_time_seconds,gps_track')
      .eq('bib_number', bibNum).single();
    setLoading(false);
    if (err || !data) { setError(`BIB #${bibNum} no encontrado`); return; }
    const runnerData = { ...data, race_status: data.race_status ?? 'waiting' } as RunnerState;
    setRunner(runnerData);
    if (runnerData.gps_track && runnerData.race_status === 'completed') setGpsPoints(runnerData.gps_track);
    subscribeToRunner(bibNum);
    if (runnerData.race_status === 'in_progress' && runnerData.start_time) {
      startGPS();
      elapsedRef.current = setInterval(() => setElapsed(formatElapsed(runnerData.start_time!)), 1000);
    }
  };

  useEffect(() => {
    if (bibNumber) loadRunner(bibNumber);
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (elapsedRef.current) clearInterval(elapsedRef.current);
    };
  }, [bibNumber]);

  const forceStart = async () => {
    if (!runner) return;
    await supabase.from('runners').update({ race_status: 'in_progress', start_time: new Date().toISOString() }).eq('bib_number', runner.bib_number);
  };

  const forceFinish = async () => {
    if (!runner || !runner.start_time) return;
    const secs = (Date.now() - new Date(runner.start_time).getTime()) / 1000;
    await supabase.from('runners').update({ race_status: 'completed', finish_time: new Date().toISOString(), finish_time_seconds: Math.round(secs * 100) / 100 }).eq('bib_number', runner.bib_number);
  };

  const statusLabel = { waiting: 'EN ESPERA', in_progress: 'EN CARRERA', completed: 'FINALIZADO' };
  const statusColor = { waiting: 'rgba(255,255,255,0.2)', in_progress: '#22c55e', completed: '#00f2ff' };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,400;0,700;0,900;1,400;1,700;1,900&family=JetBrains+Mono:wght@400;700&display=swap');

        .rt-root {
          min-height: 100vh;
          background: #03070b;
          background-image:
            radial-gradient(ellipse at 10% 10%, rgba(0,242,255,0.04) 0%, transparent 50%),
            radial-gradient(ellipse at 90% 90%, rgba(0,242,255,0.03) 0%, transparent 50%);
          font-family: 'JetBrains Mono', monospace;
          color: #e8e8f0;
          padding: 0;
          overflow-x: hidden;
        }

        .rt-header {
          background: rgba(0,0,0,0.6);
          border-bottom: 1px solid rgba(0,242,255,0.1);
          backdrop-filter: blur(20px);
          padding: 20px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .rt-brand {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 22px;
          font-weight: 900;
          font-style: italic;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: white;
        }

        .rt-brand span { color: #00f2ff; }

        .rt-badge {
          font-size: 8px;
          letter-spacing: 0.3em;
          color: rgba(0,242,255,0.5);
          text-transform: uppercase;
          font-weight: 700;
          border: 1px solid rgba(0,242,255,0.15);
          padding: 4px 10px;
          border-radius: 20px;
        }

        .rt-body { padding: 24px; max-width: 480px; margin: 0 auto; }

        .rt-search {
          display: flex;
          gap: 10px;
          margin-bottom: 24px;
        }

        .rt-input {
          flex: 1;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(0,242,255,0.2);
          border-radius: 14px;
          padding: 14px 20px;
          color: white;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 24px;
          font-weight: 900;
          font-style: italic;
          text-align: center;
          letter-spacing: 0.1em;
          outline: none;
          transition: all 0.2s;
        }

        .rt-input:focus {
          border-color: rgba(0,242,255,0.5);
          background: rgba(0,242,255,0.03);
          box-shadow: 0 0 0 3px rgba(0,242,255,0.08);
        }

        .rt-input::placeholder { color: rgba(255,255,255,0.15); }

        .rt-btn {
          padding: 14px 20px;
          background: #00f2ff;
          border: none;
          border-radius: 14px;
          color: black;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 13px;
          font-weight: 900;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }

        .rt-btn:hover { background: white; transform: translateY(-1px); }
        .rt-btn:active { transform: translateY(0); }
        .rt-btn:disabled { opacity: 0.3; cursor: not-allowed; transform: none; }

        .rt-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
          padding: 24px;
          margin-bottom: 16px;
          position: relative;
          overflow: hidden;
        }

        .rt-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(0,242,255,0.3), transparent);
        }

        .rt-runner-name {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: clamp(24px, 7vw, 36px);
          font-weight: 900;
          font-style: italic;
          text-transform: uppercase;
          color: white;
          letter-spacing: 0.02em;
          line-height: 1;
          margin-bottom: 8px;
        }

        .rt-tags {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }

        .rt-tag {
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          padding: 3px 10px;
          border-radius: 20px;
          background: rgba(0,242,255,0.08);
          border: 1px solid rgba(0,242,255,0.2);
          color: rgba(0,242,255,0.8);
        }

        .rt-status-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .rt-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .rt-dot.in_progress {
          background: #22c55e;
          box-shadow: 0 0 6px #22c55e;
          animation: rt-pulse 1.5s infinite;
        }

        .rt-dot.completed { background: #00f2ff; box-shadow: 0 0 6px #00f2ff; }
        .rt-dot.waiting { background: rgba(255,255,255,0.2); }

        @keyframes rt-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.4); }
        }

        .rt-status-text {
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.4);
        }

        .rt-timer-wrap {
          text-align: center;
          padding: 32px 0;
          border-top: 1px solid rgba(255,255,255,0.05);
          border-bottom: 1px solid rgba(255,255,255,0.05);
          margin: 20px 0;
        }

        .rt-timer-label {
          font-size: 8px;
          letter-spacing: 0.5em;
          color: rgba(255,255,255,0.2);
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        .rt-timer {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: clamp(52px, 18vw, 88px);
          font-weight: 900;
          font-style: italic;
          letter-spacing: -0.02em;
          line-height: 1;
          color: white;
        }

        .rt-timer.running {
          color: #22c55e;
          text-shadow: 0 0 40px rgba(34,197,94,0.3);
        }

        .rt-timer.finished {
          color: #00f2ff;
          text-shadow: 0 0 40px rgba(0,242,255,0.3);
        }

        .rt-gps-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 16px;
          background: rgba(34,197,94,0.05);
          border: 1px solid rgba(34,197,94,0.15);
          border-radius: 12px;
          margin-bottom: 16px;
        }

        .rt-gps-dot {
          width: 5px; height: 5px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 5px #22c55e;
          animation: rt-pulse 1s infinite;
          margin-right: 8px;
          display: inline-block;
        }

        .rt-gps-text {
          font-size: 9px;
          letter-spacing: 0.2em;
          color: #22c55e;
          font-weight: 700;
          display: flex;
          align-items: center;
        }

        .rt-gps-count {
          font-size: 9px;
          color: rgba(34,197,94,0.5);
          letter-spacing: 0.1em;
        }

        .rt-sim {
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid rgba(255,255,255,0.04);
        }

        .rt-sim-label {
          font-size: 7px;
          letter-spacing: 0.5em;
          color: rgba(255,255,255,0.12);
          text-transform: uppercase;
          text-align: center;
          margin-bottom: 12px;
        }

        .rt-sim-btns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .rt-btn-start {
          padding: 12px;
          background: rgba(34,197,94,0.08);
          border: 1px solid rgba(34,197,94,0.25);
          border-radius: 12px;
          color: #22c55e;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 12px;
          font-weight: 900;
          font-style: italic;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s;
        }

        .rt-btn-start:hover { background: rgba(34,197,94,0.15); }
        .rt-btn-start:disabled { opacity: 0.3; cursor: not-allowed; }

        .rt-btn-finish {
          padding: 12px;
          background: rgba(0,242,255,0.08);
          border: 1px solid rgba(0,242,255,0.25);
          border-radius: 12px;
          color: #00f2ff;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 12px;
          font-weight: 900;
          font-style: italic;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s;
        }

        .rt-btn-finish:hover { background: rgba(0,242,255,0.15); }
        .rt-btn-finish:disabled { opacity: 0.3; cursor: not-allowed; }

        .rt-error {
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 12px;
          padding: 12px 16px;
          color: #f87171;
          font-size: 10px;
          letter-spacing: 0.1em;
          margin-bottom: 16px;
          text-align: center;
        }

        .rt-empty {
          text-align: center;
          padding: 48px 0;
          color: rgba(0,242,255,0.2);
        }

        .rt-empty-icon { font-size: 36px; margin-bottom: 12px; }

        .rt-empty-text {
          font-size: 9px;
          letter-spacing: 0.35em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.15);
        }
      `}</style>

      <div className="rt-root">
        {/* Header */}
        <div className="rt-header">
          <div className="rt-brand">RAYO<span>CERO</span></div>
          <div className="rt-badge">⚡ Telemetría Live</div>
        </div>

        <div className="rt-body">
          {/* BIB input */}
          {!bibNumber && (
            <div className="rt-search">
              <input
                className="rt-input"
                type="number"
                placeholder="BIB #"
                value={bib}
                onChange={e => setBib(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && bib && loadRunner(parseInt(bib))}
              />
              <button className="rt-btn" onClick={() => bib && loadRunner(parseInt(bib))} disabled={loading || !bib}>
                {loading ? '...' : 'Cargar'}
              </button>
            </div>
          )}

          {error && <div className="rt-error">{error}</div>}

          {runner ? (
            <div className="rt-card">
              {/* Runner info */}
              <div className="rt-runner-name">{runner.nombre} {runner.apellido}</div>
              <div className="rt-tags">
                <span className="rt-tag">BIB #{runner.bib_number}</span>
                <span className="rt-tag">{runner.categoria}</span>
              </div>
              <div className="rt-status-row">
                <span className={`rt-dot ${runner.race_status}`} />
                <span className="rt-status-text" style={{ color: statusColor[runner.race_status] }}>
                  {statusLabel[runner.race_status]}
                </span>
              </div>

              {/* GPS bar */}
              {gpsActive && (
                <div className="rt-gps-bar" style={{ marginTop: 16 }}>
                  <div className="rt-gps-text"><span className="rt-gps-dot" />GPS Kalman activo</div>
                  <span className="rt-gps-count">{gpsPoints.length} pts</span>
                </div>
              )}

              {/* Timer */}
              <div className="rt-timer-wrap">
                <div className="rt-timer-label">
                  {runner.race_status === 'waiting' && 'Esperando salida'}
                  {runner.race_status === 'in_progress' && '— en curso —'}
                  {runner.race_status === 'completed' && 'Tiempo oficial'}
                </div>
                <div className={`rt-timer ${runner.race_status === 'in_progress' ? 'running' : runner.race_status === 'completed' ? 'finished' : ''}`}>
                  {runner.race_status === 'waiting' && '--:--'}
                  {runner.race_status === 'in_progress' && elapsed}
                  {runner.race_status === 'completed' && (runner.finish_time_seconds ? formatFinal(runner.finish_time_seconds) : elapsed)}
                </div>
              </div>

              {/* Route map */}
              {gpsPoints.length >= 2 && <RouteMap points={gpsPoints} />}

              {/* Simulators */}
              <div className="rt-sim">
                <div className="rt-sim-label">[ modo prueba ]</div>
                <div className="rt-sim-btns">
                  <button className="rt-btn-start" onClick={forceStart}
                    disabled={runner.race_status === 'in_progress' || runner.race_status === 'completed'}>
                    🚀 Forzar Salida
                  </button>
                  <button className="rt-btn-finish" onClick={forceFinish}
                    disabled={runner.race_status !== 'in_progress'}>
                    🏁 Forzar Llegada
                  </button>
                </div>
              </div>
            </div>
          ) : !loading && !error && (
            <div className="rt-card">
              <div className="rt-empty">
                <div className="rt-empty-icon">📡</div>
                <div className="rt-empty-text">Ingresa tu número de dorsal</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
/**
 * RAYO CERO — RACE TRACKER V3.1
 * Telemetría GPS en tiempo real con Filtro de Kalman + Supabase Realtime
 *
 * CHANGELOG V3.1:
 * — PreRaceOverlay integrado: se activa via Supabase Broadcast desde AdminDashboard
 * — Canal 'race-control' escucha evento type:'prerace' con countdown_seconds
 * — Overlay fullscreen con cuenta regresiva + glow + barra de urgencia
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { GeoPoint } from './KalmanFilter';
import RouteMapStrava from './RouteMapStrava';
import { useGpsBackground, GpsBackgroundBanner } from './useGpsBackground';

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

/* ────────────────────────────────────────────────────────────── */
/* PRE-RACE OVERLAY                                               */
/* ────────────────────────────────────────────────────────────── */

const PreRaceOverlay: React.FC<{ totalSeconds: number; onClose: () => void }> = ({ totalSeconds, onClose }) => {
  const [seconds, setSeconds] = useState(totalSeconds);
  const [fired, setFired] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setFired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  // Color: verde → amarillo → rojo
  const pct = seconds / totalSeconds;
  const r = pct > 0.5 ? Math.round((1 - pct) * 2 * 255) : 255;
  const g = pct > 0.5 ? 255 : Math.round(pct * 2 * 255);
  const color = `rgb(${r},${g},0)`;
  const glowColor = `rgba(${r},${g},0,0.3)`;

  // Arco SVG
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - seconds / totalSeconds);

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: fired ? 'rgba(0,40,10,0.97)' : 'rgba(3,7,11,0.97)',
        backdropFilter: 'blur(6px)',
        transition: 'background 0.5s',
        fontFamily: "'Barlow Condensed', sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@1,900&display=swap');
        @keyframes prerace-glow-pulse { 0%,100%{opacity:0.5} 50%{opacity:1} }
        @keyframes fired-in { 0%{transform:scale(0.6);opacity:0} 60%{transform:scale(1.06)} 100%{transform:scale(1);opacity:1} }
        @keyframes bar-flash { 0%,100%{opacity:0.7} 50%{opacity:1} }
      `}</style>

      {/* Glow ambiental */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse at center, ${glowColor} 0%, transparent 65%)`,
        animation: seconds <= 10 && !fired ? 'prerace-glow-pulse 0.5s ease infinite' : undefined,
      }} />

      {!fired ? (
        <>
          <p style={{
            color: 'rgba(255,255,255,0.3)', fontSize: 10,
            fontWeight: 900, letterSpacing: '0.45em',
            textTransform: 'uppercase', marginBottom: 40,
            position: 'relative', zIndex: 1,
          }}>
            PRE-CARRERA · ALERTA
          </p>

          {/* Círculo countdown */}
          <div style={{ position: 'relative', width: 280, height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="280" height="280" style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
              <circle cx="140" cy="140" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
              <circle
                cx="140" cy="140" r={radius}
                fill="none" stroke={color} strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                style={{
                  transition: 'stroke-dashoffset 0.9s linear, stroke 0.4s ease',
                  filter: `drop-shadow(0 0 10px ${color})`,
                }}
              />
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1 }}>
              <span style={{
                fontSize: 96, fontWeight: 900, fontStyle: 'italic',
                lineHeight: 1, color,
                textShadow: `0 0 40px ${color}, 0 0 80px ${glowColor}`,
                transition: 'color 0.4s',
              }}>
                {seconds}
              </span>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.4em', fontWeight: 900, textTransform: 'uppercase', marginTop: 4 }}>
                SEGUNDOS
              </span>
            </div>
          </div>

          {/* Barras de urgencia ≤10s */}
          {seconds <= 10 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 32, position: 'relative', zIndex: 1 }}>
              {Array.from({ length: seconds }).map((_, i) => (
                <div key={i} style={{
                  width: 10, height: 32, borderRadius: 3,
                  background: color, opacity: 0.7 + i * 0.03,
                  boxShadow: `0 0 8px ${color}`,
                  animation: 'bar-flash 0.5s ease infinite',
                }} />
              ))}
            </div>
          )}

          <p style={{
            color: 'rgba(255,255,255,0.15)', fontSize: 9,
            fontWeight: 900, letterSpacing: '0.3em',
            textTransform: 'uppercase', marginTop: 40,
            position: 'relative', zIndex: 1,
          }}>
            WE RUN 10K NIGHT FEST · 2026
          </p>
        </>
      ) : (
        /* Estado FIRED */
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
          animation: 'fired-in 0.6s cubic-bezier(0.16,1,0.3,1) forwards',
        }}>
          <span style={{ fontSize: 80, lineHeight: 1 }}>🏁</span>
          <p style={{
            fontSize: 40, fontWeight: 900, fontStyle: 'italic',
            color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.05em',
            textShadow: '0 0 30px rgba(34,197,94,0.5)', margin: 0,
          }}>
            ¡A CORRER!
          </p>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.4em', textTransform: 'uppercase' }}>
            Pistola disparada
          </p>
          <button onClick={onClose} style={{
            marginTop: 24, padding: '12px 32px', borderRadius: 12,
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
            color: 'white', fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 13, fontWeight: 900, letterSpacing: '0.2em',
            textTransform: 'uppercase', cursor: 'pointer',
          }}>
            Cerrar
          </button>
        </div>
      )}
    </div>,
    document.body
  );
};

/* ────────────────────────────────────────────────────────────── */
/* RACE TRACKER                                                   */
/* ────────────────────────────────────────────────────────────── */

export default function RaceTracker({ bibNumber }: Props) {
  const [bib, setBib] = useState<string>(bibNumber?.toString() ?? '');
  const [runner, setRunner] = useState<RunnerState | null>(null);
  const [elapsed, setElapsed] = useState<string>('00:00');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /* ── Pre-race overlay state ── */
  const [showPreRace, setShowPreRace] = useState(false);
  const [preRaceSeconds, setPreRaceSeconds] = useState(60);

  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const raceControlRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const runnerRef = useRef<RunnerState | null>(null);

  const {
    points: gpsPoints,
    gpsActive,
    wakeActive,
    iosWarning,
    start: startGPS,
    stop: stopGPS,
  } = useGpsBackground({ bibNumber: runner?.bib_number ?? null });

  /* ── Suscripción al canal race-control para recibir prerace ── */
  useEffect(() => {
    raceControlRef.current = supabase
      .channel('race-control')
      .on('broadcast', { event: 'prerace' }, (payload) => {
        const seconds = payload?.payload?.countdown_seconds ?? 60;
        setPreRaceSeconds(seconds);
        setShowPreRace(true);
      })
      .on('broadcast', { event: 'race_start' }, () => {
        // La pistola se disparó — cerrar overlay si sigue abierto
        setShowPreRace(false);
      })
      .subscribe();

    return () => {
      if (raceControlRef.current) supabase.removeChannel(raceControlRef.current);
    };
  }, []);

  const subscribeToRunner = useCallback((bibNum: number) => {
    if (channelRef.current) supabase.removeChannel(channelRef.current);
    channelRef.current = supabase.channel(`runner-${bibNum}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'runners',
        filter: `bib_number=eq.${bibNum}`,
      }, (payload) => {
        const updated = payload.new as RunnerState;
        runnerRef.current = updated;
        setRunner(updated);
        if (updated.race_status === 'in_progress') {
          startGPS();
          elapsedRef.current = setInterval(() => {
            if (updated.start_time) setElapsed(formatElapsed(updated.start_time));
          }, 1000);
        }
        if (updated.race_status === 'completed') {
          stopGPS();
          if (elapsedRef.current) clearInterval(elapsedRef.current);
        }
      }).subscribe();
  }, [startGPS, stopGPS]);

  const loadRunner = async (bibNum: number) => {
    setLoading(true); setError(null);
    const { data, error: err } = await supabase
      .from('runners')
      .select('bib_number,nombre,apellido,categoria,race_status,start_time,finish_time,finish_time_seconds,gps_track')
      .eq('bib_number', bibNum)
      .single();
    setLoading(false);
    if (err || !data) { setError(`BIB #${bibNum} no encontrado`); return; }
    const runnerData = { ...data, race_status: data.race_status ?? 'waiting' } as RunnerState;
    runnerRef.current = runnerData;
    setRunner(runnerData);
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
      if (elapsedRef.current) clearInterval(elapsedRef.current);
      stopGPS();
    };
  }, [bibNumber]);

  const forceStart = async () => {
    if (!runner) return;
    await supabase.from('runners')
      .update({ race_status: 'in_progress', start_time: new Date().toISOString() })
      .eq('bib_number', runner.bib_number);
  };

  const forceFinish = async () => {
    if (!runner || !runner.start_time) return;
    const secs = (Date.now() - new Date(runner.start_time).getTime()) / 1000;
    await supabase.from('runners')
      .update({
        race_status: 'completed',
        finish_time: new Date().toISOString(),
        finish_time_seconds: Math.round(secs * 100) / 100,
      })
      .eq('bib_number', runner.bib_number);
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

        .rt-search { display: flex; gap: 10px; margin-bottom: 24px; }

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

        .rt-tags { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }

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

        .rt-status-row { display: flex; align-items: center; gap: 8px; }

        .rt-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
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

        .rt-timer.running { color: #22c55e; text-shadow: 0 0 40px rgba(34,197,94,0.3); }
        .rt-timer.finished { color: #00f2ff; text-shadow: 0 0 40px rgba(0,242,255,0.3); }

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

        .rt-gps-count { font-size: 9px; color: rgba(34,197,94,0.5); letter-spacing: 0.1em; }

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

        .rt-sim-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

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

        .rt-empty { text-align: center; padding: 48px 0; color: rgba(0,242,255,0.2); }
        .rt-empty-icon { font-size: 36px; margin-bottom: 12px; }
        .rt-empty-text {
          font-size: 9px;
          letter-spacing: 0.35em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.15);
        }
      `}</style>

      {/* Pre-race overlay — se activa via broadcast desde admin */}
      {showPreRace && (
        <PreRaceOverlay
          totalSeconds={preRaceSeconds}
          onClose={() => setShowPreRace(false)}
        />
      )}

      <div className="rt-root">
        <div className="rt-header">
          <div className="rt-brand">RAYO<span>CERO</span></div>
          <div className="rt-badge">⚡ Telemetría Live</div>
        </div>

        <div className="rt-body">
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
              <button
                className="rt-btn"
                onClick={() => bib && loadRunner(parseInt(bib))}
                disabled={loading || !bib}
              >
                {loading ? '...' : 'Cargar'}
              </button>
            </div>
          )}

          {error && <div className="rt-error">{error}</div>}

          {runner ? (
            <div className="rt-card">
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

              {gpsActive && (
                <div style={{ marginTop: 12 }}>
                  <GpsBackgroundBanner
                    gpsActive={gpsActive}
                    wakeActive={wakeActive}
                    iosWarning={iosWarning}
                  />
                </div>
              )}

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

              {gpsPoints.length >= 2 && <RouteMapStrava points={gpsPoints} live={true} />}

              <div className="rt-sim">
                <div className="rt-sim-label">[ modo prueba ]</div>
                <div className="rt-sim-btns">
                  <button
                    className="rt-btn-start"
                    onClick={forceStart}
                    disabled={runner.race_status === 'in_progress' || runner.race_status === 'completed'}
                  >
                    🚀 Forzar Salida
                  </button>
                  <button
                    className="rt-btn-finish"
                    onClick={forceFinish}
                    disabled={runner.race_status !== 'in_progress'}
                  >
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
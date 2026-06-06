/**
 * RAYOCERO — RACE COUNTDOWN MODULE
 * Build: V1.1 — VALKYRON LAUNCH
 * CEO: Lualdo Sciscioli | Valkyron Group
 *
 * CHANGELOG V1.1:
 * ─ useRaceSignal: polling cada 4s como fallback para atletas sin Supabase Auth
 * ─ Doble canal: postgres_changes (Realtime) + polling SELECT (sin auth)
 * ─ Deduplicación por id para evitar doble disparo
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/* ─── Types ─────────────────────────────────────────────────── */
export type SignalType = 'pre_race_warning' | 'race_start' | 'race_finish';

export interface RaceSignal {
  id: string;
  type: SignalType;
  message?: string;
  created_at: string;
}

/* ─── Hook: useRaceSignal ────────────────────────────────────── */
interface UseRaceSignalOptions {
  onSignal?: (signal: RaceSignal) => void;
}

export function useRaceSignal({ onSignal }: UseRaceSignalOptions = {}) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    let lastId: string | null = null;
    let lastChecked = new Date().toISOString();

    // ── Canal 1: Realtime postgres_changes (para clientes con auth) ──
    channelRef.current = supabase
      .channel('race_signals_broadcast')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'race_signals' },
        (payload) => {
          const signal = payload.new as RaceSignal;
          if (signal.id === lastId) return; // deduplicar
          lastId = signal.id;
          onSignal?.(signal);
        }
      )
      .subscribe();

    // ── Canal 2: Polling cada 4s (para atletas sin Supabase Auth) ──
    const poll = setInterval(async () => {
      const { data } = await supabase
        .from('race_signals')
        .select('*')
        .gt('created_at', lastChecked)
        .order('created_at', { ascending: true });

      if (data && data.length > 0) {
        lastChecked = data[data.length - 1].created_at;
        data.forEach(signal => {
          if (signal.id === lastId) return; // deduplicar
          lastId = signal.id;
          onSignal?.(signal as RaceSignal);
        });
      }
    }, 4000);

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      clearInterval(poll);
    };
  }, [onSignal]);
}

/* ─── CSS ───────────────────────────────────────────────────── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@1,700;1,800;1,900&family=Barlow:wght@400;600&display=swap');

  @keyframes rc-flash {
    0%, 100% { background: #03070b; }
    50% { background: rgba(0,242,255,0.12); }
  }

  @keyframes rc-flash-red {
    0%, 100% { background: #03070b; }
    50% { background: rgba(255,50,50,0.15); }
  }

  @keyframes rc-pulse-ring {
    0% { transform: scale(0.8); opacity: 0.8; }
    100% { transform: scale(2.2); opacity: 0; }
  }

  @keyframes rc-logo-beat {
    0%, 100% { transform: scale(1); filter: drop-shadow(0 0 12px rgba(0,242,255,0.6)); }
    50% { transform: scale(1.08); filter: drop-shadow(0 0 28px rgba(0,242,255,1)); }
  }

  @keyframes rc-number-in {
    0% { transform: scale(1.6); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
  }

  @keyframes rc-go-explode {
    0% { transform: scale(0.5); opacity: 0; letter-spacing: 0.1em; }
    60% { transform: scale(1.15); opacity: 1; letter-spacing: 0.3em; }
    100% { transform: scale(1); opacity: 1; letter-spacing: 0.2em; }
  }

  @keyframes rc-fade-out {
    0% { opacity: 1; }
    100% { opacity: 0; pointer-events: none; }
  }

  @keyframes rc-scan {
    0% { transform: translateY(-100%); }
    100% { transform: translateY(100vh); }
  }

  .rc-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: 'Barlow Condensed', sans-serif;
    overflow: hidden;
    background: #03070b;
  }

  .rc-overlay.flashing {
    animation: rc-flash 0.6s ease infinite;
  }

  .rc-overlay.flashing-red {
    animation: rc-flash-red 0.3s ease infinite;
  }

  .rc-overlay.closing {
    animation: rc-fade-out 0.8s ease forwards;
  }

  .rc-scan-line {
    position: absolute;
    left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(0,242,255,0.4), transparent);
    animation: rc-scan 3s linear infinite;
    pointer-events: none;
  }

  .rc-grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(0,242,255,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,242,255,0.03) 1px, transparent 1px);
    background-size: 40px 40px;
    pointer-events: none;
  }

  .rc-logo-wrap {
    position: relative;
    margin-bottom: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .rc-pulse-ring {
    position: absolute;
    width: 120px; height: 120px;
    border-radius: 50%;
    border: 2px solid rgba(0,242,255,0.5);
    animation: rc-pulse-ring 1.5s ease-out infinite;
  }

  .rc-pulse-ring:nth-child(2) { animation-delay: 0.5s; }
  .rc-pulse-ring:nth-child(3) { animation-delay: 1s; }

  .rc-logo-circle {
    width: 96px; height: 96px;
    border-radius: 50%;
    background: rgba(0,242,255,0.08);
    border: 2px solid rgba(0,242,255,0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: rc-logo-beat 1s ease infinite;
    position: relative;
    z-index: 1;
  }

  .rc-logo-text {
    font-style: italic;
    font-weight: 900;
    font-size: 2rem;
    color: #00f2ff;
    line-height: 1;
    letter-spacing: -0.02em;
  }

  .rc-brand {
    font-style: italic;
    font-weight: 900;
    font-size: 1.6rem;
    color: #fff;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 0.25rem;
    text-align: center;
  }

  .rc-brand span { color: #00f2ff; }

  .rc-event-name {
    font-size: 0.8rem;
    color: rgba(0,242,255,0.5);
    letter-spacing: 0.25em;
    text-transform: uppercase;
    margin-bottom: 2.5rem;
    text-align: center;
  }

  .rc-countdown-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .rc-label {
    font-size: 0.75rem;
    letter-spacing: 0.3em;
    color: rgba(255,255,255,0.4);
    text-transform: uppercase;
  }

  .rc-number {
    font-style: italic;
    font-weight: 900;
    line-height: 1;
    color: #fff;
    animation: rc-number-in 0.25s ease;
  }

  .rc-number.large  { font-size: clamp(7rem, 28vw, 10rem); }
  .rc-number.medium { font-size: clamp(8rem, 32vw, 12rem); color: #fbbf24; }
  .rc-number.small  { font-size: clamp(9rem, 36vw, 14rem); color: #f87171; }

  .rc-seconds-label {
    font-size: 0.8rem;
    letter-spacing: 0.2em;
    color: rgba(255,255,255,0.3);
    text-transform: uppercase;
    margin-top: -0.5rem;
  }

  .rc-arc-wrap {
    position: relative;
    margin: 0.5rem 0 1rem;
  }

  .rc-arc {
    transform: rotate(-90deg);
    transform-origin: center;
  }

  .rc-go {
    font-style: italic;
    font-weight: 900;
    font-size: clamp(6rem, 30vw, 11rem);
    color: #22c55e;
    letter-spacing: 0.2em;
    text-shadow: 0 0 60px rgba(34,197,94,0.8);
    animation: rc-go-explode 0.6s cubic-bezier(0.23,1,0.32,1) forwards;
    text-align: center;
  }

  .rc-go-sub {
    font-style: italic;
    font-weight: 700;
    font-size: 1rem;
    color: rgba(34,197,94,0.7);
    letter-spacing: 0.4em;
    text-transform: uppercase;
    text-align: center;
    margin-top: 0.5rem;
    animation: rc-go-explode 0.6s 0.15s ease forwards;
    opacity: 0;
  }

  .rc-bottom {
    position: absolute;
    bottom: 2rem;
    left: 0; right: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .rc-dismiss {
    background: transparent;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 20px;
    padding: 0.4rem 1.2rem;
    color: rgba(255,255,255,0.25);
    font-size: 0.7rem;
    letter-spacing: 0.1em;
    cursor: pointer;
    font-family: 'Barlow', sans-serif;
    transition: all 0.2s;
  }

  .rc-dismiss:hover {
    border-color: rgba(255,255,255,0.25);
    color: rgba(255,255,255,0.5);
  }

  .rc-powered {
    font-size: 0.65rem;
    color: rgba(255,255,255,0.1);
    letter-spacing: 0.15em;
    text-transform: uppercase;
  }
`;

/* ─── Arc Progress ───────────────────────────────────────────── */
function ArcProgress({ seconds, total = 60 }: { seconds: number; total?: number }) {
  const r = 56;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - seconds / total);
  const color = seconds > 20 ? '#00f2ff' : seconds > 10 ? '#fbbf24' : '#f87171';

  return (
    <div className="rc-arc-wrap">
      <svg width="140" height="140" className="rc-arc">
        <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
        <circle
          cx="70" cy="70" r={r}
          fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s ease' }}
        />
      </svg>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────── */
interface RaceCountdownProps {
  onDismiss?: () => void;
  eventName?: string;
  totalSeconds?: number;
}

export default function RaceCountdown({
  onDismiss,
  eventName = 'WE RUN 10K NIGHT FEST',
  totalSeconds = 60,
}: RaceCountdownProps) {
  const [seconds, setSeconds] = useState(totalSeconds);
  const [phase, setPhase] = useState<'countdown' | 'go' | 'closing'>('countdown');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const vibrate = useCallback((pattern: number[]) => {
    if ('vibrate' in navigator) navigator.vibrate(pattern);
  }, []);

  useEffect(() => {
    vibrate([100, 50, 100, 50, 100]);

    intervalRef.current = setInterval(() => {
      setSeconds(prev => {
        const next = prev - 1;
        if (next === 30) vibrate([200, 100, 200]);
        if (next === 10) vibrate([300, 100, 300, 100, 300]);
        if (next <= 5 && next > 0) vibrate([150]);
        if (next === 0) vibrate([500, 200, 500, 200, 1000]);
        if (next <= 0) {
          clearInterval(intervalRef.current!);
          setPhase('go');
          setTimeout(() => {
            setPhase('closing');
            setTimeout(() => onDismiss?.(), 800);
          }, 3000);
        }
        return Math.max(next, 0);
      });
    }, 1000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [vibrate, onDismiss]);

  const flashClass = phase === 'countdown'
    ? seconds <= 10 ? 'flashing-red' : seconds <= 30 ? 'flashing' : ''
    : phase === 'closing' ? 'closing' : '';

  const numClass = seconds > 20 ? 'large' : seconds > 10 ? 'medium' : 'small';

  return (
    <>
      <style>{CSS}</style>
      <div className={`rc-overlay ${flashClass}`}>
        <div className="rc-grid" />
        <div className="rc-scan-line" />

        {phase === 'countdown' ? (
          <>
            <div className="rc-logo-wrap">
              <div className="rc-pulse-ring" />
              <div className="rc-pulse-ring" />
              <div className="rc-pulse-ring" />
              <div className="rc-logo-circle">
                <span className="rc-logo-text">⚡</span>
              </div>
            </div>
            <div className="rc-brand">RAYO<span>CERO</span></div>
            <div className="rc-event-name">{eventName}</div>
            <div className="rc-countdown-wrap">
              <div className="rc-label">La carrera inicia en</div>
              <ArcProgress seconds={seconds} total={totalSeconds} />
              <div className={`rc-number ${numClass}`} key={seconds}>{seconds}</div>
              <div className="rc-seconds-label">{seconds === 1 ? 'segundo' : 'segundos'}</div>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="rc-go">¡ARRANCA!</div>
            <div className="rc-go-sub">Da todo — es tu momento</div>
          </div>
        )}

        <div className="rc-bottom">
          {phase === 'countdown' && (
            <button className="rc-dismiss" onClick={() => {
              if (intervalRef.current) clearInterval(intervalRef.current);
              onDismiss?.();
            }}>
              cerrar
            </button>
          )}
          <span className="rc-powered">VALKYRON GROUP · TECNOLOGÍA DE CARRERA</span>
        </div>
      </div>
    </>
  );
}
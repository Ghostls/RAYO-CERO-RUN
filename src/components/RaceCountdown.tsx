/**
 * RAYOCERO — RACE COUNTDOWN MODULE V2.0
 * Realtime principal + polling de respaldo adaptativo.
 * Evita solapamientos, deduplica eventos y respeta la hora original del aviso.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export type SignalType = 'pre_race_warning' | 'race_start' | 'race_finish';

export interface RaceSignal {
  id: string;
  type: SignalType;
  message?: string | null;
  created_at: string;
}

interface UseRaceSignalOptions {
  onSignal?: (signal: RaceSignal) => void;
  /** Uso de la pantalla de una carrera o ventana operativa de salida. */
  highPriority?: boolean;
  enabled?: boolean;
}

const SIGNAL_TTL_MS = 10 * 60 * 1000;
const MAX_SEEN_IDS = 256;
const OVERLAP_MS = 2000;

/**
 * Mantiene un único canal y una única solicitud de polling pendiente por montaje.
 * Con Realtime conectado, el sondeo se usa para reconciliación eventual.
 * Si Realtime falla, el respaldo continúa con backoff para no saturar Supabase.
 */
export function useRaceSignal({
  onSignal,
  highPriority = false,
  enabled = true,
}: UseRaceSignalOptions = {}) {
  const callbackRef = useRef(onSignal);

  useEffect(() => {
    callbackRef.current = onSignal;
  }, [onSignal]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let requestInFlight = false;
    let connected = false;
    let failures = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let controller: AbortController | null = null;
    let newestMs = Date.now() - 5000;
    const seenIds = new Set<string>();
    const idQueue: string[] = [];

    const remember = (id: string) => {
      if (seenIds.has(id)) return false;
      seenIds.add(id);
      idQueue.push(id);
      if (idQueue.length > MAX_SEEN_IDS) {
        const oldest = idQueue.shift();
        if (oldest) seenIds.delete(oldest);
      }
      return true;
    };

    const acceptSignal = (input: unknown) => {
      if (cancelled || !input || typeof input !== 'object') return;
      const record = input as Partial<RaceSignal>;
      if (
        (typeof record.id !== 'string' && typeof record.id !== 'number') ||
        typeof record.created_at !== 'string' ||
        (record.type !== 'pre_race_warning' &&
          record.type !== 'race_start' &&
          record.type !== 'race_finish')
      ) return;

      const eventMs = Date.parse(record.created_at);
      if (!Number.isFinite(eventMs)) return;
      newestMs = Math.max(newestMs, eventMs);
      const signalId = String(record.id);
      if (!remember(signalId)) return;
      if (eventMs < Date.now() - SIGNAL_TTL_MS) return;
      callbackRef.current?.({ ...record, id: signalId } as RaceSignal);
    };

    const nextDelay = () => {
      if (failures > 0) {
        const base = highPriority ? 8000 : 20000;
        return Math.min(120000, base * Math.pow(2, Math.min(failures - 1, 4)));
      }
      if (connected) return highPriority ? 4000 : 30000;
      return highPriority ? 4000 : 30000;
    };

    const schedule = (delay: number) => {
      if (cancelled) return;
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => { void poll(); }, delay);
    };

    const poll = async () => {
      if (cancelled) return;
      if (document.visibilityState === 'hidden') {
        schedule(90000);
        return;
      }
      if (requestInFlight) return;
      requestInFlight = true;
      controller = new AbortController();
      let fetchMore = false;
      try {
        const since = new Date(Math.max(0, newestMs - OVERLAP_MS)).toISOString();
        const { data, error } = await supabase
          .from('race_signals')
          .select('id,type,message,created_at')
          .gte('created_at', since)
          .order('created_at', { ascending: true })
          .limit(100)
          .abortSignal(controller.signal);

        if (cancelled) return;
        if (error) throw error;
        failures = 0;
        const before = newestMs;
        for (const signal of data ?? []) acceptSignal(signal);
        // Continuar inmediatamente si hay más eventos, sin bucles sobre el mismo cursor.
        fetchMore = (data?.length ?? 0) === 100 && newestMs > before;
      } catch (error) {
        if (!cancelled) {
          failures += 1;
          if (import.meta.env.DEV) console.warn('[RaceSignal] Poll fallido:', error);
        }
      } finally {
        requestInFlight = false;
        controller = null;
        if (!cancelled) schedule(fetchMore ? 100 : nextDelay());
      }
    };

    const channel = supabase
      .channel('rayocero-race-signals-v2')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'race_signals',
      }, (payload) => acceptSignal(payload.new))
      .subscribe((status) => {
        if (cancelled) return;
        const wasConnected = connected;
        connected = status === 'SUBSCRIBED';
        if (connected && !wasConnected) {
          // Reconciliar posibles eventos que llegaron durante la reconexión.
          schedule(1000);
        } else if (!connected && wasConnected) {
          schedule(nextDelay());
        }
      });

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') schedule(0);
    };
    const onOnline = () => schedule(0);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('online', onOnline);
    schedule(1000);

    return () => {
      cancelled = true;
      if (timer !== null) clearTimeout(timer);
      controller?.abort();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('online', onOnline);
      void supabase.removeChannel(channel);
    };
  }, [enabled, highPriority]);
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
  const progress = Math.min(1, Math.max(0, seconds / Math.max(1, total)));
  const dashOffset = circumference * (1 - progress);
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
  /** Instante UNIX (ms) de finalización del aviso. Evita drift por suspensión. */
  endsAt?: number;
}

export default function RaceCountdown({
  onDismiss,
  eventName = 'WE RUN 10K NIGHT FEST',
  totalSeconds = 60,
  endsAt,
}: RaceCountdownProps) {
  const [targetTime] = useState(() => endsAt ?? Date.now() + Math.max(1, totalSeconds) * 1000);
  const [seconds, setSeconds] = useState(() =>
    Math.max(0, Math.ceil((targetTime - Date.now()) / 1000))
  );
  const [phase, setPhase] = useState<'countdown' | 'go' | 'closing'>('countdown');
  const onDismissRef = useRef(onDismiss);
  useEffect(() => { onDismissRef.current = onDismiss; }, [onDismiss]);

  const vibrate = useCallback((pattern: number[]) => {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  }, []);

  useEffect(() => {
    vibrate([100, 50, 100, 50, 100]);
    const clock = setInterval(() => {
      setSeconds(Math.max(0, Math.ceil((targetTime - Date.now()) / 1000)));
    }, 250);
    return () => clearInterval(clock);
  }, [targetTime, vibrate]);

  useEffect(() => {
    if (seconds === 30) vibrate([200, 100, 200]);
    if (seconds === 10) vibrate([300, 100, 300, 100, 300]);
    if (seconds <= 5 && seconds > 0) vibrate([150]);
    if (seconds === 0 && phase === 'countdown') {
      vibrate([500, 200, 500, 200, 1000]);
      setPhase('go');
    }
  }, [seconds, phase, vibrate]);

  useEffect(() => {
    if (phase !== 'go') return;
    const transition = setTimeout(() => setPhase('closing'), 3000);
    return () => clearTimeout(transition);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'closing') return;
    const dismissal = setTimeout(() => onDismissRef.current?.(), 800);
    return () => clearTimeout(dismissal);
  }, [phase]);

  const flashClass = phase === 'countdown'
    ? seconds <= 10 ? 'flashing-red' : seconds <= 30 ? 'flashing' : ''
    : phase === 'closing' ? 'closing' : '';

  const numClass = seconds > 20 ? 'large' : seconds > 10 ? 'medium' : 'small';

  return (
    <>
      <style>{CSS}</style>
      <div className={`rc-overlay ${flashClass}`} role="dialog" aria-modal="true" aria-label="Cuenta regresiva de salida">
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
            <button className="rc-dismiss" onClick={() => onDismissRef.current?.()}>
              cerrar
            </button>
          )}
          <span className="rc-powered">VALKYRON GROUP · TECNOLOGÍA DE CARRERA</span>
        </div>
      </div>
    </>
  );
}

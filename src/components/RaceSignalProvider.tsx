/**
 * RAYOCERO — RACE SIGNAL PROVIDER V2.0
 * Mantiene el countdown global sin iniciar un polling de 4s en todas las rutas.
 * La prioridad de evento puede activarse mediante VITE_RACE_SIGNALS_LIVE_MODE=true.
 */
import { useCallback, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import RaceCountdown, { useRaceSignal, type RaceSignal } from './RaceCountdown';

interface Props {
  children: ReactNode;
  eventName?: string;
}

interface CountdownState {
  signalId: string;
  totalSeconds: number;
  endsAt: number;
}

export default function RaceSignalProvider({ children, eventName }: Props) {
  const { pathname } = useLocation();
  const [countdown, setCountdown] = useState<CountdownState | null>(null);

  // La ruta de una carrera tiene una recuperación más frecuente. Fuera de ella,
  // Realtime continúa activo pero el sondeo de respaldo es mucho más espaciado.
  const liveMode = import.meta.env.VITE_RACE_SIGNALS_LIVE_MODE === 'true';
  const highPriority = liveMode || /^\/carrera\/[^/]+\/?$/.test(pathname);

  const handleSignal = useCallback((signal: RaceSignal) => {
    if (signal.type === 'race_start' || signal.type === 'race_finish') {
      setCountdown(null);
      return;
    }

    if (signal.type !== 'pre_race_warning') return;

    const parsed = Number.parseInt(signal.message ?? '', 10);
    const duration = Number.isFinite(parsed) && parsed > 0
      ? Math.min(parsed, 600)
      : 60;

    const now = Date.now();
    const created = Date.parse(signal.created_at);
    // El aviso tiene una duración real desde su timestamp; no se reinicia al reconectar.
    const started = Number.isFinite(created) && created <= now ? created : now;
    const endsAt = started + duration * 1000;
    if (endsAt <= now) return; // aviso ya vencido

    setCountdown({ signalId: signal.id, totalSeconds: duration, endsAt });
  }, []);

  useRaceSignal({ onSignal: handleSignal, highPriority });

  const dismissCountdown = useCallback(() => setCountdown(null), []);

  return (
    <>
      {children}
      {countdown && (
        <RaceCountdown
          key={countdown.signalId}
          totalSeconds={countdown.totalSeconds}
          endsAt={countdown.endsAt}
          eventName={eventName}
          onDismiss={dismissCountdown}
        />
      )}
    </>
  );
}

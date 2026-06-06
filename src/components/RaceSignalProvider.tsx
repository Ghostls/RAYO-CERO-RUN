/**
 * RAYOCERO — RACE SIGNAL PROVIDER
 * Build: V1.1 — VALKYRON LAUNCH
 *
 * Provider global que escucha señales de Supabase y muestra
 * RaceCountdown cuando llega 'pre_race_warning'.
 *
 * USO: envolver App.tsx con <RaceSignalProvider>
 *   <RaceSignalProvider eventName="WE RUN 10K NIGHT FEST">
 *     <AppContent />
 *   </RaceSignalProvider>
 */

import { useState, useCallback } from 'react';
import RaceCountdown, { useRaceSignal, type RaceSignal } from './RaceCountdown';

interface Props {
  children: React.ReactNode;
  eventName?: string;
}

export default function RaceSignalProvider({ children, eventName }: Props) {
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(60);

  const handleSignal = useCallback((signal: RaceSignal) => {
    if (signal.type === 'pre_race_warning') {
      const secs = signal.message ? parseInt(signal.message) || 60 : 60;
      setCountdownSeconds(secs);
      setShowCountdown(true);
    }
    if (signal.type === 'race_start') {
      // Pistola disparada — cerrar countdown si sigue abierto
      setShowCountdown(false);
    }
  }, []);

  useRaceSignal({ onSignal: handleSignal });

  return (
    <>
      {children}
      {showCountdown && (
        <RaceCountdown
          totalSeconds={countdownSeconds}
          eventName={eventName}
          onDismiss={() => setShowCountdown(false)}
        />
      )}
    </>
  );
}

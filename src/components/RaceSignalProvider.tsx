/**
 * RAYOCERO — RACE SIGNAL PROVIDER
 * Build: V1.0 — VALKYRON LAUNCH
 *
 * Provider global que escucha señales de Supabase y muestra
 * RaceCountdown cuando llega 'pre_race_warning'.
 *
 * USO: envolver App.tsx con <RaceSignalProvider>
 *   <RaceSignalProvider>
 *     <App />
 *   </RaceSignalProvider>
 *
 * El countdown aparece encima de cualquier pantalla de la PWA.
 */

import { useState, useCallback } from 'react';
import RaceCountdown, { useRaceSignal, type RaceSignal } from './Racecountdown';

interface Props {
  children: React.ReactNode;
  eventName?: string;
}

export default function RaceSignalProvider({ children, eventName }: Props) {
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(60);

  const handleSignal = useCallback((signal: RaceSignal) => {
    if (signal.type === 'pre_race_warning') {
      // Parsear segundos del mensaje si viene, default 60
      const secs = signal.message ? parseInt(signal.message) || 60 : 60;
      setCountdownSeconds(secs);
      setShowCountdown(true);
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
/**
 * RAYOCERO — GPS BACKGROUND HOOK
 * Build: VALKYRON GPS
 * CEO: Lualdo Sciscioli | Valkyron Group
 *
 * GPS en segundo plano para PWA (Chrome/Safari):
 * ─ Wake Lock API: mantiene pantalla activa en Android Chrome
 * ─ visibilitychange: re-adquiere Wake Lock si la pantalla vuelve
 * ─ Aviso en iOS: Safari no permite GPS con pantalla apagada
 * ─ Kalman filter integrado
 * ─ Supabase sync periódico del track
 *
 * USO en RaceTracker:
 *   const { points, gpsActive, wakeActive, iosWarning, start, stop } = useGpsBackground(bibNumber)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { GeoKalmanFilter, type GeoPoint } from './KalmanFilter';

interface UseGpsBackgroundOptions {
  bibNumber: number | null;
  onPoint?: (point: GeoPoint) => void;
  syncIntervalMs?: number; // cada cuántos ms subir track a Supabase (default 15s)
}

interface UseGpsBackgroundReturn {
  points: GeoPoint[];
  gpsActive: boolean;
  wakeActive: boolean;      // Wake Lock activo (pantalla bloqueada)
  iosWarning: boolean;      // iOS detectado → mostrar aviso
  permissionDenied: boolean;
  error: string | null;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  clearPoints: () => void;
}

const isIOS = (): boolean =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function useGpsBackground({
  bibNumber,
  onPoint,
  syncIntervalMs = 15000,
}: UseGpsBackgroundOptions): UseGpsBackgroundReturn {
  const [points, setPoints] = useState<GeoPoint[]>([]);
  const [gpsActive, setGpsActive] = useState(false);
  const [wakeActive, setWakeActive] = useState(false);
  const [iosWarning, setIosWarning] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const kalmanRef = useRef(new GeoKalmanFilter());
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pointsRef = useRef<GeoPoint[]>([]); // ref para acceso sin stale closure

  /* ── Wake Lock ── */
  const acquireWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) return;
    try {
      wakeLockRef.current = await (navigator as Navigator & { wakeLock: { request: (type: string) => Promise<WakeLockSentinel> } }).wakeLock.request('screen');
      setWakeActive(true);
      wakeLockRef.current.addEventListener('release', () => setWakeActive(false));
    } catch {
      // Wake Lock denegado — no es crítico
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
      setWakeActive(false);
    }
  }, []);

  // Re-adquirir Wake Lock cuando la página vuelve al frente
  useEffect(() => {
    const handleVisibility = async () => {
      if (document.visibilityState === 'visible' && gpsActive && !wakeLockRef.current) {
        await acquireWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [gpsActive, acquireWakeLock]);

  /* ── Sync a Supabase ── */
  const syncToSupabase = useCallback(async () => {
    if (!bibNumber || pointsRef.current.length === 0) return;
    await supabase
      .from('runners')
      .update({ gps_track: pointsRef.current })
      .eq('bib_number', bibNumber);
  }, [bibNumber]);

  /* ── Start GPS ── */
  const start = useCallback(async () => {
    if (!navigator.geolocation) {
      setError('GPS no disponible en este dispositivo.');
      return;
    }

    setError(null);
    setPermissionDenied(false);

    // Detectar iOS y mostrar aviso
    if (isIOS()) setIosWarning(true);

    // Pedir Wake Lock antes de iniciar GPS
    await acquireWakeLock();

    kalmanRef.current.reset();
    setGpsActive(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const raw: GeoPoint = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          timestamp: pos.timestamp,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed ?? undefined,
        };
        const filtered = kalmanRef.current.filter(raw);
        pointsRef.current = [...pointsRef.current, filtered];
        setPoints(prev => [...prev, filtered]);
        onPoint?.(filtered);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionDenied(true);
          setError('Permiso de GPS denegado. Actívalo en Configuración → Safari/Chrome → Ubicación.');
        } else if (err.code === err.TIMEOUT) {
          setError('GPS tardando — asegúrate de estar al aire libre.');
        } else {
          setError(`GPS: ${err.message}`);
        }
        setGpsActive(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );

    // Sync periódico a Supabase
    syncTimerRef.current = setInterval(syncToSupabase, syncIntervalMs);
  }, [acquireWakeLock, onPoint, syncToSupabase, syncIntervalMs]);

  /* ── Stop GPS ── */
  const stop = useCallback(async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (syncTimerRef.current) {
      clearInterval(syncTimerRef.current);
      syncTimerRef.current = null;
    }
    setGpsActive(false);
    await releaseWakeLock();

    // Sync final
    await syncToSupabase();
  }, [releaseWakeLock, syncToSupabase]);

  const clearPoints = useCallback(() => {
    pointsRef.current = [];
    setPoints([]);
  }, []);

  /* ── Cleanup ── */
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (syncTimerRef.current) clearInterval(syncTimerRef.current);
      releaseWakeLock();
    };
  }, [releaseWakeLock]);

  return {
    points, gpsActive, wakeActive,
    iosWarning, permissionDenied, error,
    start, stop, clearPoints,
  };
}

/* ─── Componente de aviso Wake Lock / iOS ──────────────────── */
export function GpsBackgroundBanner({
  wakeActive,
  iosWarning,
  gpsActive,
}: {
  wakeActive: boolean;
  iosWarning: boolean;
  gpsActive: boolean;
}) {
  if (!gpsActive) return null;

  return (
    <div style={{
      margin: '8px 0',
      padding: '8px 14px',
      borderRadius: 10,
      background: wakeActive
        ? 'rgba(34,197,94,0.08)'
        : 'rgba(251,191,36,0.08)',
      border: `1px solid ${wakeActive ? 'rgba(34,197,94,0.25)' : 'rgba(251,191,36,0.3)'}`,
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
    }}>
      <span style={{ fontSize: 16, flexShrink: 0 }}>
        {wakeActive ? '🔒' : '⚠️'}
      </span>
      <div>
        {wakeActive ? (
          <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 700, letterSpacing: '0.05em' }}>
            PANTALLA ACTIVA — GPS registrando en segundo plano
          </div>
        ) : (
          <div style={{ fontSize: 11, color: '#fbbf24', fontWeight: 700, letterSpacing: '0.05em' }}>
            MANTÉN LA PANTALLA ENCENDIDA
          </div>
        )}
        {iosWarning && (
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 3, lineHeight: 1.4 }}>
            iOS Safari: no cierres Safari ni bloquees la pantalla durante la carrera para mantener el GPS activo.
          </div>
        )}
        {!wakeActive && !iosWarning && (
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>
            Tu navegador no soporta Wake Lock. No apagues la pantalla.
          </div>
        )}
      </div>
    </div>
  );
}
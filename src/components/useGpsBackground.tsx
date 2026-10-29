/**
 * RAYOCERO — GPS BACKGROUND V3.0 (VALKYRON GROUP)
 * Protección contra observers duplicados, escrituras superpuestas, reinicios de
 * sesión, GPS impreciso y sincronizaciones innecesarias.
 *
 * La PWA NO puede garantizar seguimiento GPS con la pantalla apagada en iOS.
 * El historial permanece en memoria si falla Supabase y se reintenta al volver.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { GeoKalmanFilter, type GeoPoint } from './KalmanFilter';

interface UseGpsBackgroundOptions {
  bibNumber: number | null;
  onPoint?: (point: GeoPoint) => void;
  syncIntervalMs?: number;
}

interface UseGpsBackgroundReturn {
  points: GeoPoint[];
  gpsActive: boolean;
  wakeActive: boolean;
  iosWarning: boolean;
  permissionDenied: boolean;
  error: string | null;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  clearPoints: () => void;
  restorePoints: (bib: number, history: GeoPoint[] | null | undefined) => boolean;
}

const isIOS = (): boolean =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const MIN_POINT_MS = 5000;
const MAX_SILENCE_MS = 25000;
const MIN_MOVE_METERS = 5;
const MAX_ACCURACY_METERS = 100;
const MAX_RETRY_MS = 120000;

function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}

export function useGpsBackground({
  bibNumber,
  onPoint,
  syncIntervalMs = 30000,
}: UseGpsBackgroundOptions): UseGpsBackgroundReturn {
  const [points, setPoints] = useState<GeoPoint[]>([]);
  const [gpsActive, setGpsActive] = useState(false);
  const [wakeActive, setWakeActive] = useState(false);
  const [iosWarning, setIosWarning] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(false);
  const bibRef = useRef<number | null>(bibNumber);
  bibRef.current = bibNumber;
  const onPointRef = useRef(onPoint);
  onPointRef.current = onPoint;
  const pointsRef = useRef<GeoPoint[]>([]);
  const activeBibRef = useRef<number | null>(null);
  const lastPointRef = useRef<GeoPoint | null>(null);
  const filterRef = useRef(new GeoKalmanFilter());
  const watchIdRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const generationRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wakeRef = useRef<WakeLockSentinel | null>(null);
  const wakePendingRef = useRef(false);
  const versionRef = useRef(0);
  const syncedVersionRef = useRef(0);
  const syncInFlightRef = useRef<Promise<void> | null>(null);
  const nextAttemptRef = useRef(0);
  const errorsRef = useRef(0);

  const releaseWake = useCallback(async () => {
    const lock = wakeRef.current;
    wakeRef.current = null;
    if (mountedRef.current) setWakeActive(false);
    if (lock) {
      try { await lock.release(); } catch { /* Browser might have released it */ }
    }
  }, []);

  const acquireWake = useCallback(async () => {
    if (!runningRef.current || document.visibilityState !== 'visible' ||
        !('wakeLock' in navigator) || wakeRef.current || wakePendingRef.current) return;
    wakePendingRef.current = true;
    const generation = generationRef.current;
    try {
      const lock = await navigator.wakeLock.request('screen');
      if (!runningRef.current || generation !== generationRef.current ||
          document.visibilityState !== 'visible') {
        await lock.release().catch(() => undefined);
        return;
      }
      wakeRef.current = lock;
      if (mountedRef.current) setWakeActive(true);
      lock.addEventListener('release', () => {
        if (wakeRef.current === lock) wakeRef.current = null;
        if (mountedRef.current) setWakeActive(false);
      }, { once: true });
    } catch {
      // GPS can work without Wake Lock; the banner warns the athlete.
    } finally {
      wakePendingRef.current = false;
    }
  }, []);

  /** Un solo UPDATE a la vez; no enviar track si no hay puntos nuevos. */
  const sync = useCallback(async (force = false): Promise<void> => {
    if (syncInFlightRef.current) {
      try { await syncInFlightRef.current; } catch { /* retry below */ }
    }
    const bib = activeBibRef.current;
    if (!bib || versionRef.current === syncedVersionRef.current ||
        (!force && Date.now() < nextAttemptRef.current) ||
        !navigator.onLine) return;

    const version = versionRef.current;
    const snapshot = pointsRef.current.slice();
    const operation = (async () => {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 12000);
      try {
        const { error: dbError } = await supabase
          .from('runners')
          .update({ gps_track: snapshot })
          .eq('bib_number', bib)
          .abortSignal(controller.signal);
        if (dbError) throw dbError;
      } finally {
        clearTimeout(timeout);
      }
      // Si cambian los puntos durante el envío, se transmiten en el siguiente ciclo.
      if (activeBibRef.current === bib) {
        syncedVersionRef.current = version;
        errorsRef.current = 0;
        nextAttemptRef.current = 0;
        if (mountedRef.current) setError(null);
      }
    })();
    syncInFlightRef.current = operation;
    try {
      await operation;
    } catch {
      errorsRef.current += 1;
      nextAttemptRef.current = Date.now() + Math.min(MAX_RETRY_MS, 5000 * 2 ** Math.min(errorsRef.current, 5));
      if (mountedRef.current) setError('Recorrido pendiente de sincronización. Reintentaremos cuando Supabase responda.');
    } finally {
      if (syncInFlightRef.current === operation) syncInFlightRef.current = null;
    }
  }, []);

  const stop = useCallback(async (): Promise<void> => {
    generationRef.current += 1;
    runningRef.current = false;
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mountedRef.current) setGpsActive(false);
    await releaseWake();
    // La escritura final se intenta una vez. Si falla, conserva memoria + error.
    await sync(true);
  }, [releaseWake, sync]);

  const start = useCallback(async (): Promise<void> => {
    if (runningRef.current) return; // idempotente: Realtime no crea otro watcher
    const bib = bibRef.current;
    if (!bib || !Number.isInteger(bib) || bib <= 0) {
      setError('Selecciona un dorsal válido antes de activar GPS.');
      return;
    }
    if (!navigator.geolocation) {
      setError('Este navegador no permite acceso al GPS.');
      return;
    }
    if (activeBibRef.current !== null && activeBibRef.current !== bib &&
        versionRef.current !== syncedVersionRef.current) {
      setError('Hay puntos GPS del dorsal anterior sin sincronizar. No es seguro cambiar de dorsal.');
      return;
    }
    runningRef.current = true;
    activeBibRef.current = bib;
    const generation = ++generationRef.current;
    setError(null);
    setPermissionDenied(false);
    if (isIOS()) setIosWarning(true);
    // No bloquear watchPosition esperando un permiso de Wake Lock.
    try {
      const watchId = navigator.geolocation.watchPosition(
        position => {
          if (!runningRef.current || generation !== generationRef.current) return;
          const { latitude, longitude, accuracy, speed } = position.coords;
          if (![latitude, longitude, accuracy].every(Number.isFinite) ||
              accuracy > MAX_ACCURACY_METERS || accuracy < 0) return;
          const raw: GeoPoint = {
            lat: latitude, lng: longitude, timestamp: position.timestamp,
            accuracy, speed: speed ?? undefined,
          };
          const previous = lastPointRef.current;
          if (previous) {
            if (raw.timestamp <= previous.timestamp) return;
            const delta = raw.timestamp - previous.timestamp;
            if (delta < MIN_POINT_MS) return;
            if (delta < MAX_SILENCE_MS && distanceMeters(raw, previous) < MIN_MOVE_METERS) return;
          }
          const filtered = filterRef.current.filter(raw);
          lastPointRef.current = raw;
          // Evitar reconstruir un gran array una vez por cada fix descartado.
          pointsRef.current.push(filtered);
          versionRef.current++;
          if (mountedRef.current) setPoints([...pointsRef.current]);
          onPointRef.current?.(filtered);
        },
        geoError => {
          if (generation !== generationRef.current) return;
          if (geoError.code === geoError.PERMISSION_DENIED) {
            setPermissionDenied(true);
            setError('Permiso GPS denegado. Autoriza Ubicación en el navegador.');
            if (watchIdRef.current !== null) {
              navigator.geolocation.clearWatch(watchIdRef.current);
              watchIdRef.current = null;
            }
            if (timerRef.current !== null) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            runningRef.current = false;
            setGpsActive(false);
            void releaseWake();
            void sync(true);
          } else if (geoError.code === geoError.TIMEOUT) {
            setError('GPS sin respuesta: busca una zona despejada.');
          } else {
            setError(`Error de GPS: ${geoError.message}`);
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
      watchIdRef.current = watchId;
      setGpsActive(true);
      const interval = Math.max(30000, syncIntervalMs);
      timerRef.current = setInterval(() => { void sync(); }, interval);
      void acquireWake();
    } catch (cause) {
      runningRef.current = false;
      setGpsActive(false);
      setError(cause instanceof Error ? cause.message : 'No se pudo iniciar GPS.');
    }
  }, [acquireWake, releaseWake, sync, syncIntervalMs]);

  /** Hidratar una ruta persistida antes de iniciar otro dorsal (sin crear UPDATE). */
  const restorePoints = useCallback((bib: number, history: GeoPoint[] | null | undefined) => {
    if (runningRef.current || syncInFlightRef.current) return false;
    if (activeBibRef.current === bib && pointsRef.current.length > 0) return true;
    if (activeBibRef.current !== null && activeBibRef.current !== bib &&
        versionRef.current !== syncedVersionRef.current) return false;
    const clean = Array.isArray(history)
      ? history.filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng) && Number.isFinite(p.timestamp))
      : [];
    activeBibRef.current = bib;
    pointsRef.current = [...clean];
    lastPointRef.current = clean.length ? clean[clean.length - 1] : null;
    filterRef.current.reset();
    versionRef.current += 1;
    syncedVersionRef.current = versionRef.current; // existe ya en PostgreSQL
    errorsRef.current = 0;
    nextAttemptRef.current = 0;
    if (mountedRef.current) setPoints([...clean]);
    return true;
  }, []);

  const clearPoints = useCallback(() => {
    if (runningRef.current || syncInFlightRef.current ||
        versionRef.current !== syncedVersionRef.current) {
      if (mountedRef.current) setError('Detén y sincroniza el GPS antes de borrar el recorrido.');
      return;
    }
    pointsRef.current = [];
    lastPointRef.current = null;
    filterRef.current.reset();
    versionRef.current++;
    // No sobrescribe la pista en servidor: limpiar la visualización no equivale a eliminar datos.
    syncedVersionRef.current = versionRef.current;
    if (mountedRef.current) setPoints([]);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const visibility = () => {
      if (document.visibilityState === 'visible') {
        void acquireWake();
        if (runningRef.current) void sync();
      }
    };
    const online = () => { if (runningRef.current) void sync(); };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('online', online);
    return () => {
      mountedRef.current = false;
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('online', online);
      generationRef.current++;
      runningRef.current = false;
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (timerRef.current !== null) clearInterval(timerRef.current);
      watchIdRef.current = null;
      timerRef.current = null;
      void releaseWake();
      // best effort: navegador puede cancelar peticiones cuando se cierra la pestaña
      void sync(true);
    };
  }, [acquireWake, releaseWake, sync]);

  return {
    points, gpsActive, wakeActive, iosWarning, permissionDenied, error,
    start, stop, clearPoints, restorePoints,
  };
}

export function GpsBackgroundBanner({
  wakeActive, iosWarning, gpsActive,
}: { wakeActive: boolean; iosWarning: boolean; gpsActive: boolean }) {
  if (!gpsActive) return null;
  return (
    <div style={{
      margin: '8px 0', padding: '8px 14px', borderRadius: 10,
      background: wakeActive ? 'rgba(34,197,94,0.08)' : 'rgba(251,191,36,0.08)',
      border: `1px solid ${wakeActive ? 'rgba(34,197,94,0.25)' : 'rgba(251,191,36,0.3)'}`,
      display: 'flex', alignItems: 'flex-start', gap: 10,
    }}>
      <span style={{ fontSize: 16, flexShrink: 0 }}>{wakeActive ? '🔒' : '⚠️'}</span>
      <div>
        <div style={{ fontSize: 11, color: wakeActive ? '#22c55e' : '#fbbf24', fontWeight: 700, letterSpacing: '0.05em' }}>
          {wakeActive ? 'PANTALLA ACTIVA — GPS registrando' : 'MANTÉN LA PANTALLA ENCENDIDA'}
        </div>
        {iosWarning ? (
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 3, lineHeight: 1.4 }}>
            iOS Safari no garantiza GPS con pantalla bloqueada. Mantén Safari y la pantalla activos.
          </div>
        ) : !wakeActive ? (
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>
            Wake Lock no disponible. Evita bloquear la pantalla durante la carrera.
          </div>
        ) : null}
      </div>
    </div>
  );
}

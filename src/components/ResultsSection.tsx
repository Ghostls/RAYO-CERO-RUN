/**
 * RAYOCERO — RESULTS SECTION V1.1
 * Módulo de consulta de tiempos para corredores
 * CEO: Lualdo Sciscioli | Valkyron Group
 *
 * CHANGELOG V1.1:
 * ─ Integración RouteMapStrava — mapa GPS del corredor si tiene gps_track
 * ─ gps_track agregado al query de runners
 * ─ Sección de mapa con lazy load
 */

import { useState, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import type { GeoPoint } from '@/components/RouteMapStrava';

const RouteMapStrava = lazy(() => import('@/components/RouteMapStrava'));

/* ─── Types ─────────────────────────────────────────────────── */
interface RunnerResult {
  bib_number: number;
  nombre: string;
  apellido: string;
  categoria: string;
  genero: string;
  race_status: string;
  finish_time_seconds: number | null;
  start_time: string | null;
  finish_time: string | null;
  split_time_seconds: number | null;
  gps_track: string | null;
}

interface RaceResult {
  ranking_general: number | null;
  ranking_categoria: number | null;
  velocidad_kmh: number | null;
}

/* ─── Helpers ───────────────────────────────────────────────── */
const formatTime = (secs: number): string => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  const cs = Math.floor((secs % 1) * 100);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
};

const formatPace = (secs: number, distKm = 10): string => {
  const paceSecPerKm = secs / distKm;
  const m = Math.floor(paceSecPerKm / 60);
  const s = Math.floor(paceSecPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

const statusLabel = (status: string) => {
  switch (status) {
    case 'completed':   return { text: 'CLASIFICADO', cls: 'finished' };
    case 'in_progress': return { text: 'EN CARRERA',  cls: 'pending'  };
    case 'waiting':     return { text: 'EN LARGADA',  cls: 'pending'  };
    default:            return { text: status.toUpperCase(), cls: 'pending' };
  }
};

const parseGpsTrack = (raw: string | null): GeoPoint[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as GeoPoint[];
  } catch { /* noop */ }
  return [];
};

/* ─── CSS ───────────────────────────────────────────────────── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,300;0,400;1,400;1,700;1,800;1,900&family=Barlow:wght@300;400;500&display=swap');

  .rs-root {
    min-height: 100vh;
    background: #03070b;
    font-family: 'Barlow', sans-serif;
    color: #fff;
    overflow: hidden;
    position: relative;
  }

  .rs-glow-1 {
    position: absolute; top: -200px; left: 50%;
    transform: translateX(-50%);
    width: 900px; height: 600px;
    background: radial-gradient(ellipse, rgba(0,242,255,0.04) 0%, transparent 70%);
    pointer-events: none;
  }

  .rs-glow-2 {
    position: absolute; bottom: 0; right: -200px;
    width: 600px; height: 600px;
    background: radial-gradient(ellipse, rgba(0,100,255,0.03) 0%, transparent 70%);
    pointer-events: none;
  }

  .rs-header {
    padding: 7rem 2rem 4rem;
    max-width: 1100px;
    margin: 0 auto;
    position: relative;
  }

  .rs-eyebrow {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 6px 14px; border-radius: 100px;
    background: rgba(0,242,255,0.04);
    border: 1px solid rgba(0,242,255,0.12);
    margin-bottom: 2rem;
  }

  .rs-eyebrow-dot {
    width: 5px; height: 5px; border-radius: 50%;
    background: #00f2ff;
    animation: rs-blink 2s ease infinite;
  }

  @keyframes rs-blink { 0%,100%{opacity:1} 50%{opacity:0.2} }

  .rs-eyebrow-text {
    font-size: 8px; font-weight: 700;
    letter-spacing: 0.4em; color: rgba(0,242,255,0.6);
    text-transform: uppercase;
  }

  .rs-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-style: italic; font-weight: 900;
    font-size: clamp(72px, 12vw, 130px);
    line-height: 0.85; letter-spacing: -0.02em;
    text-transform: uppercase; color: #fff; margin: 0;
  }

  .rs-title-line2 {
    color: transparent;
    -webkit-text-stroke: 1.5px rgba(255,255,255,0.25);
  }

  .rs-search-wrap {
    max-width: 700px; margin: 0 auto;
    padding: 0 2rem 5rem; position: relative;
  }

  .rs-search-box {
    display: flex; align-items: center;
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 4px; overflow: hidden;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .rs-search-box:focus-within {
    border-color: rgba(0,242,255,0.3);
    box-shadow: 0 0 0 1px rgba(0,242,255,0.1);
  }

  .rs-search-input {
    flex: 1; background: transparent; border: none; outline: none;
    padding: 20px 28px; color: #fff;
    font-family: 'Barlow Condensed', sans-serif;
    font-style: italic; font-weight: 900;
    font-size: 2.5rem; letter-spacing: 0.1em; text-align: center;
  }

  .rs-search-input::placeholder { color: rgba(255,255,255,0.1); letter-spacing: 0.3em; }

  .rs-search-btn {
    padding: 20px 32px; background: #00f2ff; border: none;
    color: #03070b; font-family: 'Barlow Condensed', sans-serif;
    font-style: italic; font-weight: 900; font-size: 0.9rem;
    letter-spacing: 0.2em; text-transform: uppercase; cursor: pointer;
    transition: all 0.15s; display: flex; align-items: center; gap: 8px;
    white-space: nowrap; flex-shrink: 0;
  }

  .rs-search-btn:hover { background: #fff; letter-spacing: 0.25em; }
  .rs-search-btn:active { transform: scaleX(0.98); }
  .rs-search-btn:disabled { opacity: 0.4; cursor: not-allowed; letter-spacing: 0.2em; }

  .rs-card { max-width: 1100px; margin: 0 auto; padding: 0 2rem 6rem; position: relative; }

  .rs-card-inner {
    position: relative;
    border-top: 1px solid rgba(255,255,255,0.08);
    border-bottom: 1px solid rgba(255,255,255,0.08);
    padding: 4rem 0;
  }

  .rs-bib-watermark {
    position: absolute; top: 50%; right: -2rem;
    transform: translateY(-50%);
    font-family: 'Barlow Condensed', sans-serif;
    font-style: italic; font-weight: 900;
    font-size: clamp(160px, 25vw, 300px);
    color: transparent;
    -webkit-text-stroke: 1px rgba(0,242,255,0.06);
    line-height: 1; pointer-events: none; user-select: none;
    letter-spacing: -0.04em;
  }

  .rs-athlete-row {
    display: grid; grid-template-columns: 1fr auto;
    gap: 3rem; align-items: start;
    margin-bottom: 3rem; position: relative;
  }

  .rs-athlete-meta {
    font-size: 9px; font-weight: 700; letter-spacing: 0.35em;
    color: rgba(0,242,255,0.5); text-transform: uppercase;
    margin-bottom: 1rem; display: flex; align-items: center; gap: 8px;
  }

  .rs-athlete-meta-dot { width: 3px; height: 3px; border-radius: 50%; background: rgba(0,242,255,0.3); }

  .rs-athlete-name-first {
    font-family: 'Barlow Condensed', sans-serif;
    font-style: italic; font-weight: 900;
    font-size: clamp(3rem, 8vw, 6rem);
    line-height: 0.85; text-transform: uppercase; color: #fff;
    letter-spacing: -0.02em;
  }

  .rs-athlete-name-last {
    font-family: 'Barlow Condensed', sans-serif;
    font-style: italic; font-weight: 300;
    font-size: clamp(3rem, 8vw, 6rem);
    line-height: 0.85; text-transform: uppercase;
    color: rgba(255,255,255,0.4); letter-spacing: -0.02em;
  }

  .rs-status-col {
    display: flex; flex-direction: column;
    align-items: flex-end; gap: 0.75rem; padding-top: 1rem;
  }

  .rs-status-badge {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 10px 20px; border-radius: 3px;
    font-family: 'Barlow Condensed', sans-serif;
    font-style: italic; font-size: 10px; font-weight: 900;
    letter-spacing: 0.2em; text-transform: uppercase; white-space: nowrap;
  }

  .rs-status-badge.finished {
    background: rgba(34,197,94,0.08);
    border: 1px solid rgba(34,197,94,0.25);
    color: #22c55e;
  }

  .rs-status-badge.pending {
    background: rgba(0,242,255,0.06);
    border: 1px solid rgba(0,242,255,0.2);
    color: rgba(0,242,255,0.8);
    animation: rs-pending-pulse 2s ease infinite;
  }

  @keyframes rs-pending-pulse {
    0%,100% { box-shadow: 0 0 0 rgba(0,242,255,0); }
    50% { box-shadow: 0 0 16px rgba(0,242,255,0.15); }
  }

  .rs-share-btn {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 10px 20px; background: transparent;
    border: 1px solid rgba(255,255,255,0.1); border-radius: 3px;
    color: rgba(255,255,255,0.4);
    font-family: 'Barlow Condensed', sans-serif;
    font-style: italic; font-size: 10px; font-weight: 900;
    letter-spacing: 0.2em; text-transform: uppercase;
    cursor: pointer; transition: all 0.2s;
  }

  .rs-share-btn:hover { border-color: rgba(0,242,255,0.25); color: #00f2ff; background: rgba(0,242,255,0.04); }
  .rs-share-btn:active { transform: scale(0.97); }

  .rs-time-hero {
    padding: 3rem 0;
    border-top: 1px solid rgba(255,255,255,0.05);
    border-bottom: 1px solid rgba(255,255,255,0.05);
    margin-bottom: 3rem;
    display: grid; grid-template-columns: 1fr auto;
    align-items: center; gap: 2rem;
  }

  .rs-time-label {
    font-size: 8px; font-weight: 700; letter-spacing: 0.4em;
    color: rgba(255,255,255,0.2); text-transform: uppercase; margin-bottom: 0.75rem;
  }

  .rs-time-value {
    font-family: 'Barlow Condensed', sans-serif;
    font-style: italic; font-weight: 900;
    font-size: clamp(4rem, 12vw, 8rem);
    line-height: 1; color: #fff; letter-spacing: -0.02em;
  }

  .rs-time-value.has-time { color: #00f2ff; }

  .rs-stats-grid {
    display: grid; grid-template-columns: repeat(4, 1fr);
    gap: 0; margin-bottom: 3rem;
  }

  .rs-stat {
    padding: 1.5rem 0; border-right: 1px solid rgba(255,255,255,0.05);
    padding-right: 1.5rem; margin-right: 1.5rem;
  }

  .rs-stat:last-child { border-right: none; padding-right: 0; margin-right: 0; }

  .rs-stat-label {
    font-size: 7px; font-weight: 700; letter-spacing: 0.3em;
    color: rgba(255,255,255,0.2); text-transform: uppercase; margin-bottom: 0.5rem;
  }

  .rs-stat-value {
    font-family: 'Barlow Condensed', sans-serif;
    font-style: italic; font-weight: 900;
    font-size: 2rem; color: #fff; line-height: 1; letter-spacing: -0.01em;
  }

  .rs-stat-value.accent { color: #00f2ff; }
  .rs-stat-unit { font-size: 0.7rem; color: rgba(255,255,255,0.25); font-style: italic; margin-left: 4px; }

  .rs-map-section {
    border-top: 1px solid rgba(255,255,255,0.05);
    padding-top: 2rem; margin-bottom: 2rem;
  }

  .rs-map-label {
    display: flex; align-items: center; gap: 8px; margin-bottom: 0.5rem;
    font-size: 8px; font-weight: 700; letter-spacing: 0.3em;
    color: rgba(255,255,255,0.2); text-transform: uppercase;
  }

  .rs-map-skeleton {
    height: 320px; border-radius: 20px;
    background: linear-gradient(90deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0.02) 100%);
    background-size: 200% 100%;
    animation: rs-shimmer 1.5s infinite;
    border: 1px solid rgba(0,242,255,0.08);
  }

  @keyframes rs-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

  .rs-error {
    max-width: 500px; margin: 0 auto; padding: 2rem;
    border: 1px solid rgba(239,68,68,0.15); border-radius: 2px;
    text-align: center; display: flex; flex-direction: column;
    align-items: center; gap: 1rem;
  }

  .rs-error-text {
    font-size: 9px; font-weight: 700; letter-spacing: 0.2em;
    color: rgba(239,68,68,0.7); text-transform: uppercase;
  }

  @media (max-width: 768px) {
    .rs-header { padding: 4rem 1.25rem 2rem; }
    .rs-title { font-size: clamp(52px, 16vw, 90px); }
    .rs-search-wrap { padding: 0 1.25rem 3rem; }
    .rs-card { padding: 0 1.25rem 4rem; }
    .rs-stats-grid { grid-template-columns: repeat(2, 1fr); }
    .rs-athlete-row { grid-template-columns: 1fr; gap: 1.5rem; }
    .rs-status-col { align-items: flex-start; flex-direction: row; flex-wrap: wrap; }
    .rs-time-hero { grid-template-columns: 1fr; gap: 1.5rem; }
    .rs-bib-watermark { display: none; }
    .rs-card-inner { padding: 2rem 0; }
    .rs-athlete-name-first, .rs-athlete-name-last { font-size: clamp(2.5rem, 11vw, 4rem); }
    .rs-time-value { font-size: clamp(3rem, 15vw, 6rem); }
    .rs-search-input { font-size: 2rem; padding: 16px 20px; }
    .rs-search-btn { padding: 16px 20px; font-size: 0.75rem; }
  }
`;

/* ─── Component ─────────────────────────────────────────────── */
export default function ResultsSection() {
  const [bib, setBib] = useState('');
  const [loading, setLoading] = useState(false);
  const [runner, setRunner] = useState<RunnerResult | null>(null);
  const [raceResult, setRaceResult] = useState<RaceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSearch = useCallback(async () => {
    const bibNum = parseInt(bib.trim());
    if (!bibNum || isNaN(bibNum)) return;

    setLoading(true);
    setError(null);
    setRunner(null);
    setRaceResult(null);
    setSearched(true);

    try {
      const { data: runnerData, error: runnerErr } = await supabase
        .from('runners')
        .select('bib_number, nombre, apellido, categoria, genero, race_status, finish_time_seconds, start_time, finish_time, split_time_seconds, gps_track')
        .eq('bib_number', bibNum)
        .single();

      if (runnerErr || !runnerData) {
        setError(`DORSAL #${bibNum} NO ENCONTRADO`);
        setLoading(false);
        return;
      }

      setRunner(runnerData as RunnerResult);

      const { data: raceData } = await supabase
        .from('race_results')
        .select('ranking_general, ranking_categoria, velocidad_kmh')
        .eq('bib_number', bibNum)
        .single();

      if (raceData) setRaceResult(raceData as RaceResult);

    } catch {
      setError('ERROR DE CONEXIÓN — INTENTA NUEVAMENTE');
    } finally {
      setLoading(false);
    }
  }, [bib]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleShare = () => {
    const url = `${window.location.origin}/resultados?bib=${runner?.bib_number}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const status    = runner ? statusLabel(runner.race_status) : null;
  const hasTime   = runner?.finish_time_seconds != null;
  const pace      = hasTime ? formatPace(runner!.finish_time_seconds!) : null;
  const gpsPoints = runner ? parseGpsTrack(runner.gps_track) : [];

  return (
    <>
      <style>{CSS}</style>
      <div className="rs-root">
        <div className="rs-glow-1" />
        <div className="rs-glow-2" />

        {/* ── Header ── */}
        <div className="rs-header">
          <div className="rs-eyebrow">
            <span className="rs-eyebrow-dot" />
            <span className="rs-eyebrow-text">WE RUN 10K NIGHT FEST · 2026</span>
          </div>
          <h1 className="rs-title">
            <span style={{ display: 'block' }}>MIS</span>
            <span className="rs-title-line2" style={{ display: 'block' }}>TIEMPOS</span>
          </h1>
        </div>

        {/* ── Search ── */}
        <div className="rs-search-wrap">
          <div className="rs-search-box">
            <input
              className="rs-search-input"
              type="number"
              inputMode="numeric"
              placeholder="# DORSAL"
              value={bib}
              onChange={e => setBib(e.target.value)}
              onKeyDown={handleKeyDown}
              min={1} max={9999}
            />
            <button
              className="rs-search-btn"
              onClick={handleSearch}
              disabled={loading || !bib.trim()}
            >
              {loading ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
              )}
              {loading ? 'BUSCANDO' : 'CONSULTAR'}
            </button>
          </div>
        </div>

        {/* ── Result ── */}
        <AnimatePresence mode="wait">

          {/* Error */}
          {searched && !loading && error && (
            <motion.div key="error" className="rs-card"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
            >
              <div className="rs-error">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(239,68,68,0.5)" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                <p className="rs-error-text">{error}</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em' }}>
                  Verifica el número de dorsal e intenta nuevamente
                </p>
              </div>
            </motion.div>
          )}

          {/* Runner card */}
          {runner && !loading && (
            <motion.div key={`runner-${runner.bib_number}`} className="rs-card"
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="rs-card-inner">

                <div className="rs-bib-watermark">{runner.bib_number}</div>

                {/* Atleta + estado */}
                <div className="rs-athlete-row">
                  <div>
                    <div className="rs-athlete-meta">
                      <span>DORSAL #{runner.bib_number}</span>
                      <span className="rs-athlete-meta-dot" />
                      <span>{runner.categoria}</span>
                      <span className="rs-athlete-meta-dot" />
                      <span>{runner.genero === 'M' ? 'MASCULINO' : 'FEMENINO'}</span>
                    </div>
                    <div className="rs-athlete-name-first">{runner.nombre}</div>
                    <div className="rs-athlete-name-last">{runner.apellido}</div>
                  </div>

                  <div className="rs-status-col">
                    <div className={`rs-status-badge ${status?.cls}`}>
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: status?.cls === 'finished' ? '#22c55e' : '#00f2ff',
                        display: 'inline-block',
                        animation: status?.cls === 'pending' ? 'rs-blink 1.5s infinite' : 'none',
                      }} />
                      {status?.text}
                    </div>
                    <button className="rs-share-btn" onClick={handleShare}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                        <polyline points="16,6 12,2 8,6"/>
                        <line x1="12" y1="2" x2="12" y2="15"/>
                      </svg>
                      {copied ? 'COPIADO ✓' : 'COMPARTIR'}
                    </button>
                  </div>
                </div>

                {/* Tiempo hero */}
                <div className="rs-time-hero">
                  <div>
                    <div className="rs-time-label">TIEMPO OFICIAL · WE RUN 10K</div>
                    <div className={`rs-time-value ${hasTime ? 'has-time' : ''}`}>
                      {hasTime ? formatTime(runner.finish_time_seconds!) : '--:--:--'}
                    </div>
                  </div>
                  {runner.split_time_seconds != null && (
                    <div style={{ textAlign: 'right' }}>
                      <div className="rs-time-label">CONTROL 5K</div>
                      <div style={{
                        fontFamily: "'Barlow Condensed', sans-serif",
                        fontStyle: 'italic', fontWeight: 900,
                        fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                        color: 'rgba(255,255,255,0.5)', lineHeight: 1,
                      }}>
                        {formatTime(runner.split_time_seconds)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="rs-stats-grid">
                  <div className="rs-stat">
                    <div className="rs-stat-label">POS. GENERAL</div>
                    <div className={`rs-stat-value ${raceResult?.ranking_general ? 'accent' : ''}`}>
                      {raceResult?.ranking_general ?? '---'}
                      {raceResult?.ranking_general && <span className="rs-stat-unit">°</span>}
                    </div>
                  </div>
                  <div className="rs-stat">
                    <div className="rs-stat-label">POS. CATEGORÍA</div>
                    <div className={`rs-stat-value ${raceResult?.ranking_categoria ? 'accent' : ''}`}>
                      {raceResult?.ranking_categoria ?? '---'}
                      {raceResult?.ranking_categoria && <span className="rs-stat-unit">°</span>}
                    </div>
                  </div>
                  <div className="rs-stat">
                    <div className="rs-stat-label">RITMO MEDIO</div>
                    <div className="rs-stat-value">
                      {hasTime ? pace : '---'}
                      {hasTime && <span className="rs-stat-unit">min/km</span>}
                    </div>
                  </div>
                  <div className="rs-stat">
                    <div className="rs-stat-label">VELOCIDAD</div>
                    <div className="rs-stat-value">
                      {raceResult?.velocidad_kmh
                        ? raceResult.velocidad_kmh.toFixed(1)
                        : hasTime
                          ? (36000 / runner.finish_time_seconds!).toFixed(1)
                          : '---'}
                      {(raceResult?.velocidad_kmh || hasTime) && <span className="rs-stat-unit">km/h</span>}
                    </div>
                  </div>
                </div>

                {/* ── Mapa GPS ── */}
                {gpsPoints.length >= 2 && (
                  <div className="rs-map-section">
                    <div className="rs-map-label">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                        <circle cx="12" cy="9" r="2.5"/>
                      </svg>
                      RUTA GPS · KALMAN FILTERED
                    </div>
                    <Suspense fallback={<div className="rs-map-skeleton" />}>
                      <RouteMapStrava
                        points={gpsPoints}
                        athleteName={`${runner.nombre} ${runner.apellido}`}
                        eventName="WE RUN 10K NIGHT FEST"
                        showShareCard={true}
                      />
                    </Suspense>
                  </div>
                )}

              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </>
  );
}
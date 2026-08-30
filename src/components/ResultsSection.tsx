/**
 * RAYOCERO — RESULTS SECTION V4.0 · 499 RUN CORO · TACTICAL CERTIFICATE ENGINE
 * CEO: Lualdo Sciscioli | Valkyron Group
 *
 * CHANGELOG V4.0 (sobre V3.1 funcional — base preservada íntegra):
 * ─ EVENTO: 499 RUN CORO, FALCÓN 2026 (RACE_ID_CORO). Búsqueda scoped por race_id:
 *   un dorsal de Lara/Barquisimeto NO resuelve en esta consulta.
 * ─ SPONSORS ELIMINADOS de la consulta web (bloque .rs-sponsors-center, imports 15/22/12,
 *   SPONSORS_WEB) y del certificado PNG. Header del cert: logo + tag del evento.
 *   Footer: "POWERED BY VALKYRON GROUP" en tipografía, sin dependencia de assets.
 * ─ DATA POST-CARRERA: se lee de src/data/resultados_499_coro_2026.json.
 *   El archivo puede existir vacío ([]) antes de la carrera: RESULTS_PUBLISHED conmuta
 *   el estado "resultados en procesamiento" sin romper el render ni el fallback a Supabase.
 * ─ MODALIDAD DUAL 10K / 4K: distancia dinámica (DIST_KM) alimentando ritmo y velocidad.
 *   TOTAL_FINISHERS y CATEGORY_COUNTS se calculan POR MODALIDAD (no globales).
 * ─ Tabla general con segmentación 10K · 4K y contadores independientes.
 * ─ Dorsales a 4 dígitos (reinicio por carrera, 0001…).
 * ─ Todo el resto del V3.1 (engine html-to-image warm-up, cert 1080×1920, mapa GPS,
 *   scroll infinito, responsive ≤380px) preservado intacto.
 *
 * ASSETS REQUERIDOS (ya presentes en el repo, sustituibles por los de Coro):
 *   CERT_BG_IMG  → @/assets/IMG_4003.jpg   (cambiar por mapa aéreo de Coro cuando esté)
 *   CERT_LOGO_IMG→ @/assets/logo.png       (cambiar por logo-499.png cuando esté)
 */

import { useState, useCallback, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { toPng } from 'html-to-image';
import type { GeoPoint } from '@/components/RouteMapStrava';

import mapImg  from '@/assets/IMG_4003.jpg';
import logoImg from '@/assets/logo.png';
import RESULTADOS_JSON from '@/data/resultados_499_coro_2026.json';

const RouteMapStrava = lazy(() => import('@/components/RouteMapStrava'));

/* ────────────────────────────────────────────────────────────── */
/* CONFIGURACIÓN DE CARRERA — 499 RUN CORO                        */
/* ────────────────────────────────────────────────────────────── */

/** UUID de la carrera en la tabla `races`. Sustituir por el valor real de Supabase. */
const RACE_ID_CORO = import.meta.env.VITE_RACE_ID_CORO ?? '499-coro-2026';

const RACE_NAME_LONG  = '499 RUN · CORO, FALCÓN';
const RACE_NAME_SHORT = '499 RUN CORO';
const RACE_DATE       = '2026';
const RACE_CITY       = 'CORO, FALCÓN';

/** Assets del certificado — punto único de cambio. */
const CERT_BG_IMG   = mapImg;
const CERT_LOGO_IMG = logoImg;

type Modalidad = '10K' | '4K';

/** Distancia oficial por modalidad [km]. Alimenta ritmo y velocidad media. */
const DIST_KM: Record<Modalidad, number> = { '10K': 10, '4K': 4 };

const MODALIDADES: Modalidad[] = ['10K', '4K'];

const MODALIDAD_LABEL: Record<Modalidad, string> = {
  '10K': '10K COMPETITIVA',
  '4K':  '4K CAMINATA RECREATIVA',
};

/* ────────────────────────────────────────────────────────────── */
/* TYPES                                                          */
/* ────────────────────────────────────────────────────────────── */

interface RunnerResult {
  bib_number: number;
  nombre: string;
  apellido: string;
  categoria: string;
  genero: string;
  modalidad: Modalidad;
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

interface JsonAtleta {
  dorsal: number;
  nombre_completo: string;
  categoria: string;
  genero: string;
  modalidad: Modalidad;          // V4.0 — segmentación 10K / 4K
  tiempo_oficial: string;
  tiempo_chip: string;
  tiempo_bruto: string;
  tiempo_neto: string;
  posicion_general: number;      // ranking dentro de su modalidad
  posicion_genero: number;
  posicion_categoria: number;
  pace: string;
  velocidad_kmh: number;
  sin_tiempo: boolean;
  total_categoria: number;       // total inscritos en la categoría (misma modalidad)
}

/* ────────────────────────────────────────────────────────────── */
/* ÍNDICE Y CONTEOS — POR MODALIDAD                               */
/* ────────────────────────────────────────────────────────────── */

/** Normaliza modalidad ausente en JSON legacy → '10K'. */
const normModalidad = (m: unknown): Modalidad => (m === '4K' ? '4K' : '10K');

const RESULTADOS: JsonAtleta[] = (RESULTADOS_JSON as JsonAtleta[]).map(r => ({
  ...r,
  modalidad: normModalidad(r.modalidad),
}));

/** true cuando el JSON post-carrera ya fue publicado en el repo. */
const RESULTS_PUBLISHED = RESULTADOS.length > 0;

const RESULTADOS_INDEX = new Map<number, JsonAtleta>(
  RESULTADOS.map(r => [r.dorsal, r])
);

/** Finishers por modalidad — denominador de "POS. GENERAL". */
const TOTAL_FINISHERS: Record<Modalidad, number> = {
  '10K': RESULTADOS.filter(r => r.modalidad === '10K' && !r.sin_tiempo).length,
  '4K':  RESULTADOS.filter(r => r.modalidad === '4K'  && !r.sin_tiempo).length,
};

const catKey = (mod: Modalidad, cat: string) => `${mod}::${cat}`;

/**
 * CATEGORY_COUNTS = total inscritos por (modalidad, categoría).
 * Prioriza `total_categoria` del JSON; si viene en 0/ausente, cae al conteo real.
 */
const CATEGORY_COUNTS: Record<string, number> = (() => {
  const declared: Record<string, number> = {};
  const counted:  Record<string, number> = {};
  for (const r of RESULTADOS) {
    const k = catKey(r.modalidad, r.categoria);
    counted[k] = (counted[k] ?? 0) + 1;
    if (!declared[k] && r.total_categoria) declared[k] = r.total_categoria;
  }
  const out: Record<string, number> = {};
  for (const k of Object.keys(counted)) out[k] = declared[k] || counted[k];
  return out;
})();

const getCatTotal = (mod: Modalidad, cat: string): number =>
  CATEGORY_COUNTS[catKey(mod, cat)] ?? 0;

/* ────────────────────────────────────────────────────────────── */
/* HELPERS                                                        */
/* ────────────────────────────────────────────────────────────── */

const formatTime = (secs: number): string => {
  const h  = Math.floor(secs / 3600);
  const m  = Math.floor((secs % 3600) / 60);
  const s  = Math.floor(secs % 60);
  const cs = Math.floor((secs % 1) * 100);
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;
};

/** Ritmo medio = t / d. distKm ahora es obligatorio y depende de la modalidad. */
const formatPace = (secs: number, distKm: number): string => {
  const paceSecPerKm = secs / distKm;
  const m = Math.floor(paceSecPerKm / 60);
  const s = Math.floor(paceSecPerKm % 60);
  return `${m}'${String(s).padStart(2,'0')}"`;
};

const normalizePace = (p: string | null): string | null => {
  if (!p) return null;
  if (/^\d+'\d{2}"$/.test(p)) return p;
  const m = p.match(/^(\d+):(\d{2})$/);
  if (m) return `${m[1]}'${m[2]}"`;
  return p;
};

/** v [km/h] = 3600 · d / t */
const speedKmh = (secs: number, distKm: number): number => (3600 * distKm) / secs;

/** "HH:MM:SS" | "MM:SS.cc" → segundos. Null si no parsea. */
const parseTimeToSeconds = (t: string | null | undefined): number | null => {
  if (!t) return null;
  const p = t.split(':');
  if (p.length === 3) {
    const [h, m, s] = p;
    const v = parseInt(h) * 3600 + parseInt(m) * 60 + parseFloat(s);
    return isNaN(v) ? null : v;
  }
  if (p.length === 2) {
    const [m, s] = p;
    const v = parseInt(m) * 60 + parseFloat(s);
    return isNaN(v) ? null : v;
  }
  return null;
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
    const p = JSON.parse(raw);
    if (Array.isArray(p)) return p as GeoPoint[];
  } catch { /* noop */ }
  return [];
};

const catColor = (cat: string): string => {
  const c = cat.toLowerCase();
  if (c.includes('juvenil'))   return '#34d399';
  if (c.includes('libre'))     return '#00f2ff';
  if (c.includes('30-34') || c.includes('sub master a')) return '#60a5fa';
  if (c.includes('35-39') || c.includes('sub master b')) return '#38bdf8';
  if (c.includes('master a') || c.includes('40-49'))     return '#fb923c';
  if (c.includes('master b') || c.includes('50-59'))     return '#f87171';
  if (c.includes('master c') || c.includes('60-69'))     return '#e879f9';
  if (c.includes('master d'))  return '#c084fc';
  if (c.includes('absoluto'))  return '#fbbf24';
  if (c.includes('movilidad')) return '#a78bfa';
  if (c.includes('caminata'))  return '#facc15';
  return '#00f2ff';
};

const medalEmoji = (pos: number) =>
  pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : null;

const bib4 = (n: number) => String(n).padStart(4, '0');

/* ────────────────────────────────────────────────────────────── */
/* CSS — base V3.1 preservada · bloque sponsors retirado          */
/* ────────────────────────────────────────────────────────────── */

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,300;0,400;1,400;1,700;1,800;1,900&family=Barlow:wght@300;400;500&display=swap');

  .rs-root { min-height: 100vh; background: #03070b; font-family: 'Barlow', sans-serif; color: #fff; overflow-x: hidden; position: relative; }
  .rs-glow-1 { position: absolute; top: -200px; left: 50%; transform: translateX(-50%); width: 900px; height: 600px; background: radial-gradient(ellipse, rgba(0,242,255,0.04) 0%, transparent 70%); pointer-events: none; }
  .rs-glow-2 { position: absolute; bottom: 0; right: -200px; width: 600px; height: 600px; background: radial-gradient(ellipse, rgba(0,100,255,0.03) 0%, transparent 70%); pointer-events: none; }

  .rs-header { padding: 7rem 2rem 4rem; max-width: 1100px; margin: 0 auto; position: relative; }
  .rs-eyebrow { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 100px; background: rgba(0,242,255,0.04); border: 1px solid rgba(0,242,255,0.12); margin-bottom: 2rem; }
  .rs-eyebrow-dot { width: 5px; height: 5px; border-radius: 50%; background: #00f2ff; animation: rs-blink 2s ease infinite; }
  @keyframes rs-blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
  .rs-eyebrow-text { font-size: 8px; font-weight: 700; letter-spacing: 0.4em; color: rgba(0,242,255,0.6); text-transform: uppercase; }
  .rs-title { font-family: 'Barlow Condensed', sans-serif; font-style: italic; font-weight: 900; font-size: clamp(72px, 12vw, 130px); line-height: 0.85; letter-spacing: -0.02em; text-transform: uppercase; color: #fff; margin: 0; }
  .rs-title-line2 { color: transparent; -webkit-text-stroke: 1.5px rgba(255,255,255,0.25); }

  .rs-tabs-wrap { max-width: 700px; margin: 0 auto; padding: 0 2rem 2.5rem; }
  .rs-tabs { display: flex; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 4px; overflow: hidden; }
  .rs-tab { flex: 1; padding: 14px 20px; background: transparent; border: none; color: rgba(255,255,255,0.3); font-family: 'Barlow Condensed', sans-serif; font-style: italic; font-weight: 900; font-size: 0.85rem; letter-spacing: 0.15em; text-transform: uppercase; cursor: pointer; transition: all 0.2s; border-bottom: 2px solid transparent; }
  .rs-tab.active { background: rgba(0,242,255,0.05); color: #00f2ff; border-bottom-color: #00f2ff; }
  .rs-tab:hover:not(.active) { color: rgba(255,255,255,0.55); background: rgba(255,255,255,0.02); }

  .rs-search-wrap { max-width: 700px; margin: 0 auto; padding: 0 2rem 5rem; }
  .rs-search-box { display: flex; align-items: center; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden; transition: border-color 0.2s, box-shadow 0.2s; }
  .rs-search-box:focus-within { border-color: rgba(0,242,255,0.3); box-shadow: 0 0 0 1px rgba(0,242,255,0.1); }
  .rs-search-input { flex: 1; background: transparent; border: none; outline: none; padding: 20px 28px; color: #fff; font-family: 'Barlow Condensed', sans-serif; font-style: italic; font-weight: 900; font-size: 2.5rem; letter-spacing: 0.1em; text-align: center; }
  .rs-search-input::placeholder { color: rgba(255,255,255,0.1); letter-spacing: 0.3em; }
  .rs-search-btn { padding: 20px 32px; background: #00f2ff; border: none; color: #03070b; font-family: 'Barlow Condensed', sans-serif; font-style: italic; font-weight: 900; font-size: 0.9rem; letter-spacing: 0.2em; text-transform: uppercase; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; gap: 8px; white-space: nowrap; flex-shrink: 0; }
  .rs-search-btn:hover:not(:disabled) { background: #fff; letter-spacing: 0.25em; }
  .rs-search-btn:active:not(:disabled) { transform: scaleX(0.98); }
  .rs-search-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .rs-notice { max-width: 700px; margin: 0 auto 2.5rem; padding: 14px 20px; border: 1px solid rgba(0,242,255,0.14); background: rgba(0,242,255,0.03); border-radius: 4px; display: flex; align-items: center; gap: 12px; }
  .rs-notice-text { font-size: 9px; font-weight: 700; letter-spacing: 0.22em; color: rgba(0,242,255,0.65); text-transform: uppercase; line-height: 1.7; }

  .rs-card { max-width: 1100px; margin: 0 auto; padding: 0 2rem 6rem; }
  .rs-card-inner { position: relative; border-top: 1px solid rgba(255,255,255,0.08); border-bottom: 1px solid rgba(255,255,255,0.08); padding: 4rem 0; }
  .rs-bib-watermark { position: absolute; top: 50%; right: -2rem; transform: translateY(-50%); font-family: 'Barlow Condensed', sans-serif; font-style: italic; font-weight: 900; font-size: clamp(160px, 25vw, 300px); color: transparent; -webkit-text-stroke: 1px rgba(0,242,255,0.06); line-height: 1; pointer-events: none; user-select: none; letter-spacing: -0.04em; }

  /* V4.0 — 2 columnas: atleta | estado. La columna central de sponsors fue retirada. */
  .rs-athlete-row { display: grid; grid-template-columns: 1fr auto; gap: 2.5rem; align-items: center; margin-bottom: 3rem; position: relative; }

  .rs-athlete-meta { font-size: 9px; font-weight: 700; letter-spacing: 0.35em; color: rgba(0,242,255,0.5); text-transform: uppercase; margin-bottom: 1rem; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .rs-athlete-meta-dot { width: 3px; height: 3px; border-radius: 50%; background: rgba(0,242,255,0.3); }
  .rs-athlete-name-first { font-family: 'Barlow Condensed', sans-serif; font-style: italic; font-weight: 900; font-size: clamp(3rem, 8vw, 6rem); line-height: 0.85; text-transform: uppercase; color: #fff; letter-spacing: -0.02em; }
  .rs-athlete-name-last { font-family: 'Barlow Condensed', sans-serif; font-style: italic; font-weight: 300; font-size: clamp(3rem, 8vw, 6rem); line-height: 0.85; text-transform: uppercase; color: rgba(255,255,255,0.4); letter-spacing: -0.02em; }

  .rs-mod-chip { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 2px; font-size: 8px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; border: 1px solid; }

  .rs-status-col { display: flex; flex-direction: column; align-items: flex-end; gap: 0.75rem; padding-top: 1rem; }
  .rs-status-badge { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 3px; font-family: 'Barlow Condensed', sans-serif; font-style: italic; font-size: 10px; font-weight: 900; letter-spacing: 0.2em; text-transform: uppercase; white-space: nowrap; }
  .rs-status-badge.finished { background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.25); color: #22c55e; }
  .rs-status-badge.pending { background: rgba(0,242,255,0.06); border: 1px solid rgba(0,242,255,0.2); color: rgba(0,242,255,0.8); animation: rs-pending-pulse 2s ease infinite; }
  @keyframes rs-pending-pulse { 0%,100%{box-shadow:0 0 0 rgba(0,242,255,0)} 50%{box-shadow:0 0 16px rgba(0,242,255,0.15)} }

  .rs-action-btns { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; margin-top: 8px; }
  .rs-share-btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 18px; background: transparent; border: 1px solid rgba(255,255,255,0.1); border-radius: 3px; color: rgba(255,255,255,0.4); font-family: 'Barlow Condensed', sans-serif; font-style: italic; font-size: 9px; font-weight: 900; letter-spacing: 0.18em; text-transform: uppercase; cursor: pointer; transition: all 0.2s; }
  .rs-share-btn:hover:not(:disabled) { border-color: rgba(0,242,255,0.3); color: #00f2ff; background: rgba(0,242,255,0.04); }
  .rs-share-btn:active:not(:disabled) { transform: scale(0.97); }
  .rs-share-btn:disabled { opacity: 0.45; cursor: wait; }
  .rs-share-btn.primary { background: rgba(0,242,255,0.08); border-color: rgba(0,242,255,0.3); color: #00f2ff; }
  .rs-share-btn.primary:hover:not(:disabled) { background: rgba(0,242,255,0.18); }

  .rs-time-hero { padding: 3rem 0; border-top: 1px solid rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.05); margin-bottom: 3rem; display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 2rem; }
  .rs-time-label { font-size: 8px; font-weight: 700; letter-spacing: 0.4em; color: rgba(255,255,255,0.2); text-transform: uppercase; margin-bottom: 0.75rem; }
  .rs-time-value { font-family: 'Barlow Condensed', sans-serif; font-style: italic; font-weight: 900; font-size: clamp(4rem, 12vw, 8rem); line-height: 1; color: #fff; letter-spacing: -0.02em; }
  .rs-time-value.has-time { color: #00f2ff; }

  .rs-stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0; margin-bottom: 3rem; }
  .rs-stat { padding: 1.5rem 0; border-right: 1px solid rgba(255,255,255,0.05); padding-right: 1.5rem; margin-right: 1.5rem; }
  .rs-stat:last-child { border-right: none; padding-right: 0; margin-right: 0; }
  .rs-stat-label { font-size: 7px; font-weight: 700; letter-spacing: 0.3em; color: rgba(255,255,255,0.2); text-transform: uppercase; margin-bottom: 0.5rem; }
  .rs-stat-value { font-family: 'Barlow Condensed', sans-serif; font-style: italic; font-weight: 900; font-size: 2rem; color: #fff; line-height: 1; }
  .rs-stat-value.accent { color: #00f2ff; }
  .rs-stat-unit { font-size: 0.7rem; color: rgba(255,255,255,0.25); font-style: italic; margin-left: 4px; }

  .rs-map-section { border-top: 1px solid rgba(255,255,255,0.05); padding-top: 2rem; margin-bottom: 2rem; }
  .rs-map-label { display: flex; align-items: center; gap: 8px; margin-bottom: 0.5rem; font-size: 8px; font-weight: 700; letter-spacing: 0.3em; color: rgba(255,255,255,0.2); text-transform: uppercase; }
  .rs-map-skeleton { height: 320px; border-radius: 20px; background: linear-gradient(90deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0.02) 100%); background-size: 200% 100%; animation: rs-shimmer 1.5s infinite; border: 1px solid rgba(0,242,255,0.08); }
  @keyframes rs-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

  .rs-error { max-width: 500px; margin: 0 auto; padding: 2rem; border: 1px solid rgba(239,68,68,0.15); border-radius: 2px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 1rem; }
  .rs-error-text { font-size: 9px; font-weight: 700; letter-spacing: 0.2em; color: rgba(239,68,68,0.7); text-transform: uppercase; }

  /* ── CERTIFICADO OFF-SCREEN ── */
  .rs-cert-offscreen-wrapper {
    position: absolute;
    left: -9999px;
    top: -9999px;
    width: 0;
    height: 0;
    overflow: visible;
    pointer-events: none;
    z-index: -1;
  }

  .rs-cert-canvas {
    width: 1080px;
    height: 1920px;
    background-color: #03070b;
    position: relative;
    overflow: hidden;
    font-family: 'Barlow Condensed', sans-serif;
    color: #fff;
    flex-shrink: 0;
  }

  .rs-cert-map-bg {
    position: absolute; inset: 0;
    background-size: cover; background-position: center;
    opacity: 0.25; mix-blend-mode: luminosity;
    filter: sepia(100%) hue-rotate(140deg) saturate(300%) contrast(1.5) brightness(0.7);
  }

  .rs-cert-overlay {
    position: absolute; inset: 0;
    background: linear-gradient(180deg, rgba(3,7,11,0.5) 0%, #03070b 82%);
  }

  .rs-cert-content {
    position: absolute; inset: 0; padding: 100px;
    display: flex; flex-direction: column; justify-content: space-between;
  }

  .rs-cert-header { display: flex; justify-content: space-between; align-items: flex-start; }
  .rs-cert-logo img { width: 350px; height: auto; object-fit: contain; }

  /* V4.0 — el bloque de sponsors del header fue sustituido por el tag del evento */
  .rs-cert-eventtag { text-align: right; padding-top: 10px; }
  .rs-cert-eventtag-line1 { font-style: italic; font-weight: 900; font-size: 46px; letter-spacing: -0.01em; color: #00f2ff; line-height: 1; }
  .rs-cert-eventtag-line2 { font-size: 20px; font-weight: 700; letter-spacing: 0.32em; color: rgba(255,255,255,0.35); text-transform: uppercase; margin-top: 12px; }

  .rs-cert-athlete { margin-top: auto; margin-bottom: 60px; }
  .rs-cert-athlete-meta { font-size: 24px; font-weight: 700; letter-spacing: 0.4em; color: #00f2ff; text-transform: uppercase; margin-bottom: 20px; display: flex; align-items: center; gap: 15px; }
  .rs-cert-name { font-style: italic; font-weight: 900; font-size: 110px; line-height: 0.85; text-transform: uppercase; letter-spacing: -0.02em; }
  .rs-cert-surname { font-style: italic; font-weight: 300; font-size: 110px; line-height: 0.85; text-transform: uppercase; color: rgba(255,255,255,0.5); letter-spacing: -0.02em; margin-top: 10px; }

  .rs-cert-metrics {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 25px;
    border-top: 2px solid rgba(255,255,255,0.1);
    padding-top: 40px;
  }

  .rs-cert-metric-box {
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.08);
    padding: 30px;
    border-radius: 12px;
    backdrop-filter: blur(20px);
  }

  .rs-cert-metric-lbl {
    font-size: 18px; font-weight: 700;
    letter-spacing: 0.3em; color: rgba(255,255,255,0.4);
    text-transform: uppercase; margin-bottom: 5px;
  }

  .rs-cert-metric-val {
    font-style: italic; font-weight: 900;
    font-size: 70px; color: #00f2ff; line-height: 1;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  .rs-cert-footer {
    display: flex; justify-content: space-between; align-items: flex-end;
    margin-top: 60px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 40px;
  }

  .rs-cert-watermark {
    font-size: 18px; font-weight: 700;
    letter-spacing: 0.5em; color: rgba(255,255,255,0.2); text-transform: uppercase;
  }

  .rs-cert-powered { display: flex; align-items: baseline; gap: 12px; }
  .rs-cert-powered-lbl { font-size: 16px; font-weight: 700; letter-spacing: 0.25em; color: rgba(255,255,255,0.18); text-transform: uppercase; }
  .rs-cert-powered-val { font-style: italic; font-weight: 900; font-size: 24px; letter-spacing: 0.06em; color: rgba(255,255,255,0.45); text-transform: uppercase; }

  /* ── TABLA GENERAL ── */
  .rs-tabla-section { max-width: 1100px; margin: 0 auto; padding: 0 2rem 6rem; }
  .rs-mod-tabs { display: flex; gap: 6px; margin-bottom: 1.25rem; }
  .rs-mod-tab { padding: 9px 18px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07); border-radius: 3px; color: rgba(255,255,255,0.3); font-family: 'Barlow Condensed', sans-serif; font-style: italic; font-weight: 900; font-size: 0.78rem; letter-spacing: 0.16em; text-transform: uppercase; cursor: pointer; transition: all 0.18s; }
  .rs-mod-tab.active { background: rgba(0,242,255,0.07); border-color: rgba(0,242,255,0.28); color: #00f2ff; }
  .rs-mod-tab:hover:not(.active) { color: rgba(255,255,255,0.55); }
  .rs-tabla-search-wrap { margin-bottom: 1.5rem; }
  .rs-tabla-search-box { display: flex; align-items: center; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden; }
  .rs-tabla-search-box:focus-within { border-color: rgba(0,242,255,0.3); box-shadow: 0 0 0 1px rgba(0,242,255,0.1); }
  .rs-tabla-search-icon { padding: 0 1.25rem; color: rgba(255,255,255,0.2); display: flex; align-items: center; flex-shrink: 0; }
  .rs-tabla-search-input { flex: 1; background: transparent; border: none; outline: none; padding: 1rem 0; color: #fff; font-family: 'Barlow Condensed', sans-serif; font-style: italic; font-weight: 700; font-size: 1.1rem; letter-spacing: 0.08em; }
  .rs-tabla-search-input::placeholder { color: rgba(255,255,255,0.15); }
  .rs-tabla-search-clear { padding: 0 1.25rem; background: none; border: none; color: rgba(255,255,255,0.2); cursor: pointer; display: flex; align-items: center; }
  .rs-tabla-search-clear:hover { color: #00f2ff; }
  .rs-tabla-stats { display: flex; gap: 2rem; flex-wrap: wrap; padding-bottom: 1.25rem; border-bottom: 1px solid rgba(255,255,255,0.05); margin-bottom: 1.25rem; }
  .rs-tabla-stat-val { font-family: 'Barlow Condensed', sans-serif; font-style: italic; font-weight: 900; font-size: 1.8rem; color: #00f2ff; line-height: 1; }
  .rs-tabla-stat-lbl { font-size: 7px; font-weight: 700; letter-spacing: 0.3em; color: rgba(255,255,255,0.2); text-transform: uppercase; margin-top: 2px; }
  .rs-tabla-stat-div { width: 1px; background: rgba(255,255,255,0.06); align-self: stretch; }
  .rs-tabla-count { font-size: 8px; font-weight: 700; letter-spacing: 0.25em; color: rgba(255,255,255,0.2); text-transform: uppercase; margin-bottom: 0.75rem; }
  .rs-tbl-head { display: grid; grid-template-columns: 52px 1fr 150px 155px 90px 90px; padding: 0 1rem 0.6rem; border-bottom: 1px solid rgba(255,255,255,0.06); margin-bottom: 3px; }
  .rs-th { font-size: 7px; font-weight: 700; letter-spacing: 0.3em; color: rgba(255,255,255,0.2); text-transform: uppercase; }
  .rs-th.r { text-align: right; }
  .rs-tbl-row { display: grid; grid-template-columns: 52px 1fr 150px 155px 90px 90px; padding: 0.75rem 1rem; border-radius: 3px; border: 1px solid transparent; transition: background 0.12s, border-color 0.12s; align-items: center; margin-bottom: 2px; position: relative; }
  .rs-tbl-row::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 2px; background: transparent; transition: background 0.2s; border-radius: 2px 0 0 2px; }
  .rs-tbl-row:hover { background: rgba(255,255,255,0.025); border-color: rgba(255,255,255,0.06); }
  .rs-tbl-row:hover::before { background: #00f2ff; }
  .rs-tbl-row.podio { background: rgba(0,242,255,0.02); }
  .rs-tbl-row.podio::before { background: #00f2ff; }
  .rs-tbl-pos { font-family: 'Barlow Condensed', sans-serif; font-style: italic; font-weight: 900; font-size: 1rem; color: rgba(255,255,255,0.3); display: flex; align-items: center; }
  .rs-tbl-atleta { min-width: 0; }
  .rs-tbl-nombre { font-family: 'Barlow Condensed', sans-serif; font-style: italic; font-weight: 700; font-size: 1rem; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .rs-tbl-dorsal-lbl { font-size: 8px; letter-spacing: 0.15em; color: rgba(255,255,255,0.25); margin-top: 1px; }
  .rs-tbl-cat-badge { display: inline-flex; align-items: center; padding: 2px 7px; border-radius: 2px; font-size: 7px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; border: 1px solid; white-space: nowrap; width: fit-content; }
  .rs-tbl-time { font-family: 'Barlow Condensed', sans-serif; font-style: italic; font-weight: 900; font-size: 1rem; color: #00f2ff; text-align: right; }
  .rs-tbl-pace { font-size: 0.78rem; color: rgba(255,255,255,0.28); text-align: right; }
  .rs-tbl-catpos { font-size: 0.78rem; color: rgba(255,255,255,0.28); text-align: right; }
  .rs-loader-bar { width: 200px; height: 2px; background: rgba(255,255,255,0.05); border-radius: 2px; overflow: hidden; margin: 0 auto; }
  .rs-loader-fill { height: 100%; background: linear-gradient(90deg, transparent, #00f2ff, transparent); animation: rs-sweep 1.4s ease infinite; }
  @keyframes rs-sweep { 0%{transform:translateX(-100%);width:60%} 100%{transform:translateX(250%);width:60%} }
  .rs-tabla-empty { padding: 4rem 0; text-align: center; font-family: 'Barlow Condensed', sans-serif; font-style: italic; font-weight: 900; font-size: 1.4rem; color: rgba(255,255,255,0.12); letter-spacing: 0.05em; text-transform: uppercase; }

  @media (max-width: 768px) {
    .rs-header { padding: 4rem 1.25rem 2rem; }
    .rs-title { font-size: clamp(52px, 16vw, 90px); }
    .rs-tabs-wrap { padding: 0 1.25rem 2rem; }
    .rs-search-wrap { padding: 0 1.25rem 3rem; }
    .rs-notice { margin: 0 1.25rem 2rem; }
    .rs-card { padding: 0 1.25rem 4rem; }
    .rs-tabla-section { padding: 0 1.25rem 4rem; }

    .rs-stats-grid { grid-template-columns: repeat(2, 1fr); gap: 0; }
    .rs-stat { padding: 1rem 0; padding-right: 1rem; margin-right: 1rem; }

    .rs-athlete-row { grid-template-columns: 1fr; gap: 1.25rem; }

    .rs-status-col { align-items: flex-start; flex-direction: column; gap: 0.6rem; padding-top: 0; }
    .rs-action-btns { justify-content: flex-start; flex-wrap: wrap; gap: 6px; }
    .rs-share-btn { padding: 9px 14px; font-size: 8px; letter-spacing: 0.12em; }

    .rs-time-hero { grid-template-columns: 1fr; gap: 1.25rem; }
    .rs-time-value { font-size: clamp(3rem, 15vw, 6rem); }
    .rs-bib-watermark { display: none; }
    .rs-card-inner { padding: 2rem 0; }

    .rs-athlete-name-first, .rs-athlete-name-last { font-size: clamp(2.2rem, 10vw, 3.5rem); }

    .rs-search-input { font-size: 1.8rem; padding: 14px 16px; }
    .rs-search-btn { padding: 14px 18px; font-size: 0.72rem; }

    .rs-tbl-head { display: none; }
    .rs-tbl-row { grid-template-columns: 40px 1fr; grid-template-rows: auto auto; gap: 0.3rem 0.6rem; padding: 0.85rem 1rem; border-radius: 0; }
    .rs-tbl-cat-col, .rs-tbl-pace, .rs-tbl-catpos { display: none; }
    .rs-tbl-time { text-align: left; grid-column: 2; grid-row: 2; font-size: 0.9rem; }
    .rs-tbl-pos { grid-row: 1 / span 2; align-self: center; }
    .rs-tabla-stats { gap: 1rem; }
  }

  @media (max-width: 380px) {
    .rs-title { font-size: clamp(44px, 15vw, 72px); }
    .rs-search-input { font-size: 1.5rem; padding: 12px 14px; }
    .rs-search-btn { padding: 12px 14px; font-size: 0.65rem; letter-spacing: 0.1em; }
    .rs-athlete-name-first, .rs-athlete-name-last { font-size: clamp(1.9rem, 9vw, 3rem); }
    .rs-stats-grid { grid-template-columns: repeat(2, 1fr); }
    .rs-stat-value { font-size: 1.6rem; }
    .rs-share-btn { padding: 8px 12px; font-size: 7.5px; }
    .rs-action-btns { gap: 4px; }
    .rs-time-value { font-size: clamp(2.5rem, 14vw, 5rem); }
  }
`;

/* ────────────────────────────────────────────────────────────── */
/* TABLA ROW                                                      */
/* ────────────────────────────────────────────────────────────── */

const TablaRow = ({ r }: { r: JsonAtleta }) => {
  const accent   = catColor(r.categoria);
  const medal    = medalEmoji(r.posicion_general);
  const totalCat = getCatTotal(r.modalidad, r.categoria) || '?';
  return (
    <div className={`rs-tbl-row ${r.posicion_general <= 3 ? 'podio' : ''}`}>
      <div className="rs-tbl-pos">
        {medal ? <span>{medal}</span> : <span>{r.posicion_general || '—'}</span>}
      </div>
      <div className="rs-tbl-atleta">
        <div className="rs-tbl-nombre">{r.nombre_completo}</div>
        <div className="rs-tbl-dorsal-lbl">#{bib4(r.dorsal)} · {r.modalidad}</div>
      </div>
      <div className="rs-tbl-cat-col" style={{ display:'flex', alignItems:'center' }}>
        <span className="rs-tbl-cat-badge" style={{ color:accent, borderColor:`${accent}30`, background:`${accent}0d` }}>
          {r.categoria}
        </span>
      </div>
      <div className="rs-tbl-time">{r.sin_tiempo ? 'Sin tiempo' : (r.tiempo_chip || r.tiempo_neto || r.tiempo_bruto)}</div>
      <div className="rs-tbl-pace">{normalizePace(r.pace) || '—'}</div>
      <div className="rs-tbl-catpos">
        {r.posicion_categoria ? `${r.posicion_categoria}/${totalCat}` : '—'}
      </div>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────── */
/* TABLA GENERAL — segmentada por modalidad                       */
/* ────────────────────────────────────────────────────────────── */

const TablaGeneral = () => {
  const [modalidad, setModalidad] = useState<Modalidad>('10K');
  const [query, setQuery]         = useState('');
  const [visible, setVisible]     = useState(80);
  const loaderRef                 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) setVisible(v => v + 80);
    }, { threshold: 0.1 });
    if (loaderRef.current) obs.observe(loaderRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => { setVisible(80); }, [query, modalidad]);

  const base = useMemo(
    () => RESULTADOS.filter(r => r.modalidad === modalidad),
    [modalidad]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter(r =>
      String(r.dorsal).includes(q) ||
      r.nombre_completo.toLowerCase().includes(q) ||
      r.categoria.toLowerCase().includes(q)
    );
  }, [query, base]);

  const shown = useMemo(() => filtered.slice(0, visible), [filtered, visible]);

  const stats = useMemo(() => ({
    total: base.filter(r => !r.sin_tiempo).length,
    masc:  base.filter(r => r.genero === 'M' && !r.sin_tiempo).length,
    fem:   base.filter(r => r.genero === 'F' && !r.sin_tiempo).length,
    cats:  [...new Set(base.map(r => r.categoria))].length,
  }), [base]);

  if (!RESULTS_PUBLISHED) {
    return (
      <div className="rs-tabla-empty">
        Resultados en procesamiento — la tabla se publica al cierre de la carrera
      </div>
    );
  }

  return (
    <>
      <div className="rs-mod-tabs">
        {MODALIDADES.map(m => (
          <button
            key={m}
            className={`rs-mod-tab ${modalidad === m ? 'active' : ''}`}
            onClick={() => setModalidad(m)}
          >
            {MODALIDAD_LABEL[m]}
          </button>
        ))}
      </div>

      <div className="rs-tabla-search-wrap">
        <div className="rs-tabla-search-box">
          <div className="rs-tabla-search-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
          <input className="rs-tabla-search-input" type="text" placeholder="Dorsal, nombre o categoría..."
            value={query} onChange={e => setQuery(e.target.value)} autoComplete="off"/>
          {query && (
            <button className="rs-tabla-search-clear" onClick={() => setQuery('')}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="rs-tabla-stats">
        <div><div className="rs-tabla-stat-val">{stats.total}</div><div className="rs-tabla-stat-lbl">Finishers</div></div>
        <div className="rs-tabla-stat-div"/>
        <div><div className="rs-tabla-stat-val">{stats.masc}</div><div className="rs-tabla-stat-lbl">Masculino</div></div>
        <div className="rs-tabla-stat-div"/>
        <div><div className="rs-tabla-stat-val">{stats.fem}</div><div className="rs-tabla-stat-lbl">Femenino</div></div>
        <div className="rs-tabla-stat-div"/>
        <div><div className="rs-tabla-stat-val">{stats.cats}</div><div className="rs-tabla-stat-lbl">Categorías</div></div>
      </div>

      <div className="rs-tabla-count">
        {query
          ? `${filtered.length} resultado${filtered.length !== 1 ? 's' : ''} para "${query}" · ${modalidad}`
          : `${filtered.length} atletas · ${RACE_NAME_SHORT} · ${MODALIDAD_LABEL[modalidad]} · ${RACE_DATE}`
        }
      </div>

      <div className="rs-tbl-head">
        <span className="rs-th">Pos</span>
        <span className="rs-th">Atleta</span>
        <span className="rs-th">Categoría</span>
        <span className="rs-th r">Tiempo chip</span>
        <span className="rs-th r">Ritmo</span>
        <span className="rs-th r">Pos / Total</span>
      </div>

      {shown.length === 0
        ? <div className="rs-tabla-empty">Sin resultados para "{query}"</div>
        : shown.map(r => <TablaRow key={`${r.modalidad}-${r.dorsal}`} r={r}/>)
      }

      {shown.length < filtered.length && (
        <div ref={loaderRef} style={{ padding:'2rem 0', display:'flex', justifyContent:'center' }}>
          <div className="rs-loader-bar"><div className="rs-loader-fill"/></div>
        </div>
      )}
    </>
  );
};

/* ────────────────────────────────────────────────────────────── */
/* MAIN                                                           */
/* ────────────────────────────────────────────────────────────── */

export default function ResultsSectionCoro() {
  const [tab, setTab]               = useState<'individual' | 'tabla'>('individual');
  const [bib, setBib]               = useState('');
  const [loading, setLoading]       = useState(false);
  const [runner, setRunner]         = useState<RunnerResult | null>(null);
  const [raceResult, setRaceResult] = useState<RaceResult | null>(null);
  const [jsonAtleta, setJsonAtleta] = useState<JsonAtleta | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [searched, setSearched]     = useState(false);
  const [copied, setCopied]         = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const certRef = useRef<HTMLDivElement>(null);

  /**
   * Búsqueda de dorsal — SCOPED A CORO.
   * 1) JSON publicado (fuente oficial post-carrera).
   * 2) Fallback Supabase con .eq('race_id', RACE_ID_CORO) → un dorsal de Lara nunca resuelve.
   */
  const handleSearch = useCallback(async () => {
    const bibNum = parseInt(bib.trim());
    if (!bibNum || isNaN(bibNum)) return;
    setLoading(true); setError(null); setRunner(null);
    setRaceResult(null); setJsonAtleta(null); setSearched(true);

    const jsonData = RESULTADOS_INDEX.get(bibNum) ?? null;
    setJsonAtleta(jsonData);

    try {
      const { data: runnerData, error: runnerErr } = await supabase
        .from('runners')
        .select('bib_number, nombre, apellido, categoria, genero, modalidad, race_status, finish_time_seconds, start_time, finish_time, split_time_seconds, gps_track')
        .eq('bib_number', bibNum)
        .eq('race_id', RACE_ID_CORO)
        .maybeSingle();

      if (runnerErr || !runnerData) {
        // Sin registro vivo en Supabase → se reconstruye el atleta desde el JSON oficial.
        if (jsonData) {
          const parts = jsonData.nombre_completo.trim().split(/\s+/);
          const tRef  = jsonData.tiempo_chip || jsonData.tiempo_neto || jsonData.tiempo_oficial;
          const finish_time_seconds = jsonData.sin_tiempo ? null : parseTimeToSeconds(tRef);

          setRunner({
            bib_number: bibNum,
            nombre: parts[0] ?? '',
            apellido: parts.slice(1).join(' '),
            categoria: jsonData.categoria,
            genero: jsonData.genero,
            modalidad: jsonData.modalidad,
            race_status: jsonData.sin_tiempo ? 'waiting' : 'completed',
            finish_time_seconds,
            start_time: null, finish_time: null,
            split_time_seconds: null, gps_track: null,
          });
          setRaceResult({
            ranking_general: jsonData.posicion_general || null,
            ranking_categoria: jsonData.posicion_categoria || null,
            velocidad_kmh: jsonData.velocidad_kmh || null,
          });
          setLoading(false); return;
        }
        setError(`DORSAL #${bib4(bibNum)} NO ENCONTRADO EN ${RACE_NAME_SHORT}`);
        setLoading(false); return;
      }

      const rd = runnerData as Record<string, unknown>;
      setRunner({
        ...(rd as unknown as RunnerResult),
        modalidad: normModalidad(rd.modalidad),
      });

      if (jsonData) {
        setRaceResult({
          ranking_general: jsonData.posicion_general || null,
          ranking_categoria: jsonData.posicion_categoria || null,
          velocidad_kmh: jsonData.velocidad_kmh || null,
        });
      } else {
        const { data: raceData } = await supabase
          .from('race_results')
          .select('ranking_general, ranking_categoria, velocidad_kmh')
          .eq('bib_number', bibNum)
          .eq('race_id', RACE_ID_CORO)
          .maybeSingle();
        if (raceData) setRaceResult(raceData as RaceResult);
      }
    } catch {
      setError('ERROR DE CONEXIÓN — INTENTA NUEVAMENTE');
    } finally {
      setLoading(false);
    }
  }, [bib]);

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleSearch(); };

  const handleShare = () => {
    const url = `${window.location.origin}/resultados?bib=${runner?.bib_number}`;
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  /* ── Engine certificado — grado militar (preservado de V3.1) ── */
  const renderCert = useCallback(async (): Promise<string | null> => {
    if (!certRef.current) return null;
    try {
      await document.fonts.ready;
      // Warm-up pass — evita canvas negro en mobile/safari
      await toPng(certRef.current, { pixelRatio: 1, backgroundColor: '#03070b' });
      await new Promise(r => setTimeout(r, 300));
      // Captura final 2x
      return await toPng(certRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#03070b',
        quality: 1.0,
      });
    } catch (err) {
      console.error('[RAYOCERO CERT] Error en render:', err);
      return null;
    }
  }, []);

  const handleDownloadCert = useCallback(async () => {
    if (!runner) return;
    setIsExporting(true);
    try {
      const dataUrl = await renderCert();
      if (dataUrl) {
        const a = document.createElement('a');
        a.download = `499CORO_${bib4(runner.bib_number)}_${runner.apellido.replace(/\s/g,'_').toUpperCase()}.png`;
        a.href = dataUrl; a.click();
      }
    } finally { setIsExporting(false); }
  }, [runner, renderCert]);

  const handlePrintCert = useCallback(async () => {
    if (!runner) return;
    setIsExporting(true);
    try {
      const dataUrl = await renderCert();
      if (dataUrl) {
        const pw = window.open('', '_blank');
        if (pw) {
          pw.document.write(`<!DOCTYPE html><html><head><title>CERTIFICADO ${RACE_NAME_SHORT} #${bib4(runner.bib_number)}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#000;display:flex;justify-content:center;align-items:center;min-height:100vh}img{max-width:100%;max-height:100vh;object-fit:contain}@media print{@page{margin:0;size:portrait}body{background:#fff}img{width:100%;height:100vh;object-fit:contain}}</style></head><body><img src="${dataUrl}" onload="window.print();window.close();"/></body></html>`);
          pw.document.close();
        }
      }
    } finally { setIsExporting(false); }
  }, [runner, renderCert]);

  /* ── Derivados ── */
  const modalidad = runner?.modalidad ?? jsonAtleta?.modalidad ?? '10K';
  const distKm    = DIST_KM[modalidad];
  const modColor  = modalidad === '4K' ? '#facc15' : '#00f2ff';

  const status    = runner ? statusLabel(runner.race_status) : null;
  const hasTime   = runner?.finish_time_seconds != null;
  const pace      = hasTime ? formatPace(runner!.finish_time_seconds!, distKm) : null;
  const gpsPoints = runner ? parseGpsTrack(runner.gps_track) : [];
  const paceDisplay = pace ? normalizePace(pace) : normalizePace(jsonAtleta?.pace ?? null);

  const gunTime  = jsonAtleta?.tiempo_oficial && !jsonAtleta.sin_tiempo
    ? jsonAtleta.tiempo_oficial
    : hasTime ? formatTime(runner!.finish_time_seconds!) : '--:--:--';

  const chipTime = jsonAtleta?.tiempo_chip && !jsonAtleta.sin_tiempo
    ? jsonAtleta.tiempo_chip
    : runner?.split_time_seconds != null
      ? formatTime(runner.split_time_seconds)
      : '--:--:--';

  const totalCat = jsonAtleta?.total_categoria
    || (runner ? getCatTotal(modalidad, runner.categoria) : 0);
  const posCat   = raceResult?.ranking_categoria ?? jsonAtleta?.posicion_categoria ?? null;

  const velocidad = raceResult?.velocidad_kmh
    ? raceResult.velocidad_kmh.toFixed(1)
    : hasTime ? speedKmh(runner!.finish_time_seconds!, distKm).toFixed(1)
    : jsonAtleta?.velocidad_kmh ? jsonAtleta.velocidad_kmh.toFixed(1)
    : null;

  return (
    <>
      <style>{CSS}</style>
      <div className="rs-root">
        <div className="rs-glow-1"/><div className="rs-glow-2"/>

        {/* Header */}
        <div className="rs-header">
          <div className="rs-eyebrow">
            <span className="rs-eyebrow-dot"/>
            <span className="rs-eyebrow-text">{RACE_NAME_LONG} · 10K & 4K · {RACE_DATE}</span>
          </div>
          <h1 className="rs-title">
            <span style={{ display:'block' }}>MIS</span>
            <span className="rs-title-line2" style={{ display:'block' }}>TIEMPOS</span>
          </h1>
        </div>

        {/* Tabs */}
        <div className="rs-tabs-wrap">
          <div className="rs-tabs">
            <button className={`rs-tab ${tab === 'individual' ? 'active' : ''}`} onClick={() => setTab('individual')}>🔍 Buscar mi tiempo</button>
            <button className={`rs-tab ${tab === 'tabla' ? 'active' : ''}`} onClick={() => setTab('tabla')}>🏁 Tabla general</button>
          </div>
        </div>

        <AnimatePresence mode="wait">

          {/* TAB INDIVIDUAL */}
          {tab === 'individual' && (
            <motion.div key="individual" initial={{ opacity:0,y:12 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-8 }} transition={{ duration:0.22 }}>

              {!RESULTS_PUBLISHED && (
                <div className="rs-notice">
                  <span className="rs-eyebrow-dot"/>
                  <span className="rs-notice-text">
                    Resultados oficiales en procesamiento. Consulta tu dorsal de {RACE_NAME_SHORT} para ver tu estado en vivo.
                  </span>
                </div>
              )}

              <div className="rs-search-wrap">
                <div className="rs-search-box">
                  <input className="rs-search-input" type="number" inputMode="numeric" placeholder="# DORSAL"
                    value={bib} onChange={e => setBib(e.target.value)} onKeyDown={handleKeyDown} min={1} max={9999}/>
                  <button className="rs-search-btn" onClick={handleSearch} disabled={loading || !bib.trim()}>
                    {loading
                      ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                      : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                    }
                    {loading ? 'BUSCANDO' : 'CONSULTAR'}
                  </button>
                </div>
              </div>

              <AnimatePresence mode="wait">

                {searched && !loading && error && (
                  <motion.div key="error" className="rs-card" initial={{ opacity:0,y:20 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }}>
                    <div className="rs-error">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(239,68,68,0.5)" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                      </svg>
                      <p className="rs-error-text">{error}</p>
                      <p style={{ fontSize:'11px', color:'rgba(255,255,255,0.2)', letterSpacing:'0.1em' }}>
                        Esta consulta solo cubre dorsales de {RACE_NAME_LONG}. Verifica el número e intenta de nuevo.
                      </p>
                    </div>
                  </motion.div>
                )}

                {runner && !loading && (
                  <motion.div key={`runner-${runner.bib_number}`} className="rs-card"
                    initial={{ opacity:0,y:30 }} animate={{ opacity:1,y:0 }}
                    exit={{ opacity:0,y:-20 }} transition={{ duration:0.4, ease:[0.16,1,0.3,1] }}>
                    <div className="rs-card-inner">
                      <div className="rs-bib-watermark">{bib4(runner.bib_number)}</div>

                      {/* V4.0 — fila de atleta sin columna de sponsors */}
                      <div className="rs-athlete-row">
                        <div>
                          <div className="rs-athlete-meta">
                            <span>DORSAL #{bib4(runner.bib_number)}</span>
                            <span className="rs-athlete-meta-dot"/>
                            <span>{runner.categoria}</span>
                            <span className="rs-athlete-meta-dot"/>
                            <span>{runner.genero === 'M' ? 'MASCULINO' : 'FEMENINO'}</span>
                            <span className="rs-mod-chip" style={{ color:modColor, borderColor:`${modColor}40`, background:`${modColor}12` }}>
                              {MODALIDAD_LABEL[modalidad]}
                            </span>
                          </div>
                          <div className="rs-athlete-name-first">{runner.nombre}</div>
                          <div className="rs-athlete-name-last">{runner.apellido}</div>
                        </div>

                        <div className="rs-status-col">
                          <div className={`rs-status-badge ${status?.cls}`}>
                            <span style={{ width:6, height:6, borderRadius:'50%', background: status?.cls === 'finished' ? '#22c55e' : '#00f2ff', display:'inline-block', animation: status?.cls === 'pending' ? 'rs-blink 1.5s infinite' : 'none' }}/>
                            {status?.text}
                          </div>
                          <div className="rs-action-btns">
                            <button className="rs-share-btn" onClick={handleShare}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                                <polyline points="16,6 12,2 8,6"/><line x1="12" y1="2" x2="12" y2="15"/>
                              </svg>
                              {copied ? 'COPIADO ✓' : 'COMPARTIR'}
                            </button>
                            <button className="rs-share-btn primary" onClick={handleDownloadCert} disabled={isExporting}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/>
                              </svg>
                              {isExporting ? 'GENERANDO...' : 'CERTIFICADO'}
                            </button>
                            <button className="rs-share-btn" onClick={handlePrintCert} disabled={isExporting}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="6,9 6,2 18,2 18,9"/>
                                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                                <rect x="6" y="14" width="12" height="8"/>
                              </svg>
                              IMPRIMIR
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Tiempos hero */}
                      <div className="rs-time-hero">
                        <div>
                          <div className="rs-time-label">TIEMPO PISTOLA · {RACE_NAME_SHORT} {modalidad}</div>
                          <div className={`rs-time-value ${(jsonAtleta?.tiempo_oficial || hasTime) ? 'has-time' : ''}`}>
                            {gunTime}
                          </div>
                        </div>
                        <div style={{ textAlign:'right' }}>
                          <div className="rs-time-label">TIEMPO CHIP</div>
                          <div style={{ fontFamily:"'Barlow Condensed',sans-serif", fontStyle:'italic', fontWeight:900, fontSize:'clamp(2rem,5vw,3.5rem)', color:'#00f2ff', lineHeight:1, textShadow:'0 0 20px rgba(0,242,255,0.3)' }}>
                            {chipTime}
                          </div>
                          <div style={{ fontSize:'7px', color:'rgba(255,255,255,0.2)', letterSpacing:'0.3em', textTransform:'uppercase', marginTop:4 }}>
                            tiempo neto oficial
                          </div>
                        </div>
                      </div>

                      {/* Stats grid V4.2 — solo ritmo y velocidad */}
                      <div className="rs-stats-grid">
                        {/* V4.2 — POS. GENERAL y POS. CATEGORÍA retiradas de la consulta web (siguen en el certificado PNG) */}
                        <div className="rs-stat">
                          <div className="rs-stat-label">RITMO MEDIO</div>
                          <div className="rs-stat-value">
                            {paceDisplay ?? '---'}
                            {paceDisplay && <span className="rs-stat-unit">min/km</span>}
                          </div>
                        </div>
                        <div className="rs-stat">
                          <div className="rs-stat-label">VELOCIDAD</div>
                          <div className="rs-stat-value">
                            {velocidad ?? '---'}
                            {velocidad && <span className="rs-stat-unit">km/h</span>}
                          </div>
                        </div>
                      </div>

                      {/* Mapa GPS */}
                      {gpsPoints.length >= 2 && (
                        <div className="rs-map-section">
                          <div className="rs-map-label">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                              <circle cx="12" cy="9" r="2.5"/>
                            </svg>
                            RUTA GPS · KALMAN FILTERED
                          </div>
                          <Suspense fallback={<div className="rs-map-skeleton"/>}>
                            <RouteMapStrava
                              points={gpsPoints}
                              athleteName={`${runner.nombre} ${runner.apellido}`}
                              eventName={`${RACE_NAME_LONG} · ${modalidad}`}
                              showShareCard={true}
                            />
                          </Suspense>
                        </div>
                      )}

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* TAB TABLA */}
          {tab === 'tabla' && (
            <motion.div key="tabla" initial={{ opacity:0,y:12 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:-8 }} transition={{ duration:0.22 }}>
              <div className="rs-tabla-section"><TablaGeneral/></div>
            </motion.div>
          )}

        </AnimatePresence>

        {/* ═══════════════════════════════════════════════════════ */}
        {/* CERTIFICADO OFF-SCREEN — portrait 1080×1920            */}
        {/* V4.0: sin logos de sponsors, header con tag del evento  */}
        {/* ═══════════════════════════════════════════════════════ */}
        {runner && (
          <div className="rs-cert-offscreen-wrapper">
            <div ref={certRef} className="rs-cert-canvas">

              {/* Fondo mapa con filtro táctico */}
              <div className="rs-cert-map-bg" style={{ backgroundImage: `url(${CERT_BG_IMG})` }}/>
              <div className="rs-cert-overlay"/>

              <div className="rs-cert-content">

                {/* Header — logo + tag del evento (sponsors retirados) */}
                <div className="rs-cert-header">
                  <div className="rs-cert-logo">
                    <img src={CERT_LOGO_IMG} alt="RAYOCERO"/>
                  </div>
                  <div className="rs-cert-eventtag">
                    <div className="rs-cert-eventtag-line1">{modalidad}</div>
                    <div className="rs-cert-eventtag-line2">{RACE_CITY} · {RACE_DATE}</div>
                  </div>
                </div>

                {/* Atleta */}
                <div className="rs-cert-athlete">
                  <div className="rs-cert-athlete-meta">
                    <span style={{ display:'inline-block', width:12, height:12, background:'#00f2ff', borderRadius:'50%' }}/>
                    {RACE_NAME_SHORT} · DORSAL #{bib4(runner.bib_number)}
                  </div>
                  <div className="rs-cert-name">{runner.nombre}</div>
                  <div className="rs-cert-surname">{runner.apellido}</div>
                </div>

                {/* Métricas — 6 bloques */}
                <div className="rs-cert-metrics">

                  <div className="rs-cert-metric-box">
                    <div className="rs-cert-metric-lbl">TIEMPO PISTOLA (OFICIAL)</div>
                    <div className="rs-cert-metric-val">{gunTime}</div>
                  </div>

                  <div className="rs-cert-metric-box">
                    <div className="rs-cert-metric-lbl">TIEMPO CHIP (NETO)</div>
                    <div className="rs-cert-metric-val">{chipTime}</div>
                  </div>

                  <div className="rs-cert-metric-box">
                    <div className="rs-cert-metric-lbl">RITMO MEDIO</div>
                    <div className="rs-cert-metric-val">
                      {paceDisplay ?? '--\'--"'}
                      <span style={{ fontSize:22, color:'rgba(255,255,255,0.3)', marginLeft:10 }}>MIN/KM</span>
                    </div>
                  </div>

                  <div className="rs-cert-metric-box">
                    <div className="rs-cert-metric-lbl">CATEGORÍA</div>
                    <div className="rs-cert-metric-val" style={{ fontSize:48, color:'#fff' }}>
                      {runner.categoria}
                    </div>
                  </div>

                  <div className="rs-cert-metric-box">
                    <div className="rs-cert-metric-lbl">POSICIÓN EN CATEGORÍA</div>
                    <div style={{ display:'flex', alignItems:'baseline', gap:12 }}>
                      <div className="rs-cert-metric-val" style={{ fontSize:80 }}>
                        {posCat ?? '---'}
                      </div>
                      {!!posCat && totalCat > 0 && (
                        <>
                          <div style={{ fontStyle:'italic', fontWeight:900, fontSize:44, color:'rgba(0,242,255,0.45)', lineHeight:1 }}>
                            / {totalCat}
                          </div>
                          <div style={{ marginLeft:8, display:'flex', flexDirection:'column', justifyContent:'flex-end', paddingBottom:6 }}>
                            <div style={{ fontSize:16, fontWeight:700, letterSpacing:'0.18em', color:'rgba(255,255,255,0.22)', textTransform:'uppercase' }}>
                              en {runner.categoria}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="rs-cert-metric-box">
                    <div className="rs-cert-metric-lbl">POSICIÓN GENERAL {modalidad}</div>
                    <div className="rs-cert-metric-val" style={{ fontSize:80 }}>
                      {raceResult?.ranking_general ?? jsonAtleta?.posicion_general ?? '---'}
                    </div>
                  </div>

                </div>

                {/* Footer */}
                <div className="rs-cert-footer">
                  <div className="rs-cert-watermark">RAYOCERO · 499 RUN · {RACE_CITY} {RACE_DATE}</div>
                  <div className="rs-cert-powered">
                    <span className="rs-cert-powered-lbl">POWERED BY</span>
                    <span className="rs-cert-powered-val">VALKYRON GROUP</span>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
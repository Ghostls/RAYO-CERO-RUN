/**
 * RAYOCERO — RESULTS SECTION V2.1
 * CEO: Lualdo Sciscioli | Valkyron Group
 *
 * CHANGELOG V2.1:
 * ─ Modo dual: Tab "MIS TIEMPOS" (dorsal → Supabase + JSON enriquecido)
 *              Tab "TABLA GENERAL" (608 atletas del PDF oficial)
 * ─ Búsqueda individual enriquecida: si Supabase tiene datos los usa,
 *   si no, cae al JSON oficial por dorsal
 * ─ Tabla general cargada desde JSON local — sin fetch, sin PapaParse
 * ─ Diseño 100% original preservado: #03070b, #00f2ff, Barlow Condensed
 * ─ Sponsors 15.png y 22.png preservados en posición exacta
 * ─ Todos los estados originales preservados
 */

import { useState, useCallback, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import type { GeoPoint } from '@/components/RouteMapStrava';
import sponsor15 from '@/assets/15.png';
import sponsor22 from '@/assets/22.png';

// JSON oficial post-evento — 608 atletas extraídos del PDF de resultados
import RESULTADOS_JSON from '@/data/resultados_werun10k_2026.json';

const RouteMapStrava = lazy(() => import('@/components/RouteMapStrava'));

/* ────────────────────────────────────────────────────────────── */
/* TYPES                                                          */
/* ────────────────────────────────────────────────────────────── */

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

interface JsonAtleta {
  dorsal: number;
  nombre_completo: string;
  categoria: string;
  genero: string;
  tiempo_oficial: string;   // tiempo pistola
  tiempo_chip: string;      // tiempo chip (neto)
  tiempo_bruto: string;
  tiempo_neto: string;
  posicion_general: number;
  posicion_genero: number;
  posicion_categoria: number;
  pace: string;
  velocidad_kmh: number;
  sin_tiempo: boolean;
}

/* ────────────────────────────────────────────────────────────── */
/* ÍNDICE POR DORSAL — O(1) lookup                               */
/* ────────────────────────────────────────────────────────────── */

const RESULTADOS = RESULTADOS_JSON as JsonAtleta[];
const RESULTADOS_INDEX = new Map<number, JsonAtleta>(
  RESULTADOS.map(r => [r.dorsal, r])
);

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

const formatPace = (secs: number, distKm = 10): string => {
  const paceSecPerKm = secs / distKm;
  const m = Math.floor(paceSecPerKm / 60);
  const s = Math.floor(paceSecPerKm % 60);
  return `${m}'${String(s).padStart(2,'0')}"`;
};

// Normaliza el pace del JSON ("3'13"" o "3:13") a formato uniforme min'ss"
const normalizePace = (p: string | null): string | null => {
  if (!p) return null;
  // Ya tiene formato correcto min'ss"
  if (/^\d+'\d{2}"$/.test(p)) return p;
  // Formato MM:SS → convertir
  const m = p.match(/^(\d+):(\d{2})$/);
  if (m) return `${m[1]}'${m[2]}"`;
  return p;
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
  return '#00f2ff';
};

const medalEmoji = (pos: number) =>
  pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : null;

/* ────────────────────────────────────────────────────────────── */
/* SPONSORS                                                       */
/* ────────────────────────────────────────────────────────────── */

const SPONSORS = [
  { src: sponsor15, alt: 'Sponsor 15' },
  { src: sponsor22, alt: 'Sponsor 22' },
];

/* ────────────────────────────────────────────────────────────── */
/* CSS — 100% original + extensiones para tabla                  */
/* ────────────────────────────────────────────────────────────── */

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,300;0,400;1,400;1,700;1,800;1,900&family=Barlow:wght@300;400;500&display=swap');

  .rs-root {
    min-height: 100vh;
    background: #03070b;
    font-family: 'Barlow', sans-serif;
    color: #fff;
    overflow-x: hidden;
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

  /* ── Tabs ── */
  .rs-tabs-wrap {
    max-width: 700px; margin: 0 auto 0;
    padding: 0 2rem 2.5rem;
  }

  .rs-tabs {
    display: flex;
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 4px;
    overflow: hidden;
  }

  .rs-tab {
    flex: 1; padding: 14px 20px;
    background: transparent; border: none;
    color: rgba(255,255,255,0.3);
    font-family: 'Barlow Condensed', sans-serif;
    font-style: italic; font-weight: 900;
    font-size: 0.85rem; letter-spacing: 0.15em;
    text-transform: uppercase; cursor: pointer;
    transition: all 0.2s; border-bottom: 2px solid transparent;
  }

  .rs-tab.active {
    background: rgba(0,242,255,0.05);
    color: #00f2ff;
    border-bottom-color: #00f2ff;
  }

  .rs-tab:hover:not(.active) {
    color: rgba(255,255,255,0.55);
    background: rgba(255,255,255,0.02);
  }

  /* ── Search ── */
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

  /* ── Card individual ── */
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
    display: grid; grid-template-columns: auto auto 1fr;
    gap: 2.5rem; align-items: center;
    margin-bottom: 3rem; position: relative;
  }

  .rs-sponsors-center {
    display: flex; flex-direction: column;
    align-items: stretch; justify-content: center;
    gap: 8px; align-self: stretch;
  }

  .rs-sponsor-pill-sm {
    display: flex; align-items: center; justify-content: center;
    padding: 12px 22px;
    background: rgba(255,255,255,0.055);
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 6px; backdrop-filter: blur(10px);
    transition: border-color 0.2s, background 0.2s, transform 0.2s;
    flex: 1;
  }

  .rs-sponsor-pill-sm:hover {
    border-color: rgba(0,242,255,0.2);
    background: rgba(255,255,255,0.09);
    transform: translateY(-2px);
  }

  .rs-sponsor-pill-sm img {
    height: 60px; width: auto; max-width: 180px;
    object-fit: contain;
    filter: brightness(1.1) contrast(1.05);
    display: block;
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

  /* ── Sponsors legacy strip (preservado) ── */
  .rs-sponsors-strip {
    border-top: 1px solid rgba(255,255,255,0.05);
    padding: 2rem 0; margin-bottom: 2rem;
    display: flex; flex-direction: column; gap: 1.25rem;
  }

  .rs-sponsor-pill {
    display: flex; align-items: center; justify-content: center;
    padding: 14px 32px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 6px; backdrop-filter: blur(8px);
    transition: border-color 0.2s, background 0.2s, transform 0.2s;
    min-width: 140px;
  }

  .rs-sponsor-pill img {
    height: 44px; width: auto; max-width: 160px;
    object-fit: contain; filter: brightness(1.1) contrast(1.05); display: block;
  }

  /* ── TABLA GENERAL ── */
  .rs-tabla-section {
    max-width: 1100px; margin: 0 auto;
    padding: 0 2rem 6rem;
  }

  /* Barra de búsqueda tabla */
  .rs-tabla-search-wrap { margin-bottom: 1.5rem; }

  .rs-tabla-search-box {
    display: flex; align-items: center;
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 4px; overflow: hidden;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .rs-tabla-search-box:focus-within {
    border-color: rgba(0,242,255,0.3);
    box-shadow: 0 0 0 1px rgba(0,242,255,0.1);
  }

  .rs-tabla-search-icon {
    padding: 0 1.25rem; color: rgba(255,255,255,0.2);
    display: flex; align-items: center; flex-shrink: 0;
  }

  .rs-tabla-search-input {
    flex: 1; background: transparent; border: none; outline: none;
    padding: 1rem 0; color: #fff;
    font-family: 'Barlow Condensed', sans-serif;
    font-style: italic; font-weight: 700;
    font-size: 1.1rem; letter-spacing: 0.08em;
  }

  .rs-tabla-search-input::placeholder { color: rgba(255,255,255,0.15); }

  .rs-tabla-search-clear {
    padding: 0 1.25rem; background: none; border: none;
    color: rgba(255,255,255,0.2); cursor: pointer;
    display: flex; align-items: center; transition: color 0.15s;
  }

  .rs-tabla-search-clear:hover { color: #00f2ff; }

  /* Stats bar tabla */
  .rs-tabla-stats {
    display: flex; gap: 2rem; flex-wrap: wrap;
    padding-bottom: 1.25rem;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    margin-bottom: 1.25rem;
  }

  .rs-tabla-stat-val {
    font-family: 'Barlow Condensed', sans-serif;
    font-style: italic; font-weight: 900;
    font-size: 1.8rem; color: #00f2ff; line-height: 1;
  }

  .rs-tabla-stat-lbl {
    font-size: 7px; font-weight: 700; letter-spacing: 0.3em;
    color: rgba(255,255,255,0.2); text-transform: uppercase; margin-top: 2px;
  }

  .rs-tabla-stat-div { width: 1px; background: rgba(255,255,255,0.06); align-self: stretch; }

  /* Contador */
  .rs-tabla-count {
    font-size: 8px; font-weight: 700; letter-spacing: 0.25em;
    color: rgba(255,255,255,0.2); text-transform: uppercase;
    margin-bottom: 0.75rem;
  }

  /* Header tabla */
  .rs-tbl-head {
    display: grid;
    grid-template-columns: 52px 1fr 150px 155px 90px 80px;
    padding: 0 1rem 0.6rem;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    margin-bottom: 3px;
  }

  .rs-th {
    font-size: 7px; font-weight: 700; letter-spacing: 0.3em;
    color: rgba(255,255,255,0.2); text-transform: uppercase;
  }

  .rs-th.r { text-align: right; }

  /* Fila tabla */
  .rs-tbl-row {
    display: grid;
    grid-template-columns: 52px 1fr 150px 155px 90px 80px;
    padding: 0.75rem 1rem;
    border-radius: 3px;
    border: 1px solid transparent;
    transition: background 0.12s, border-color 0.12s;
    align-items: center;
    margin-bottom: 2px;
    position: relative;
  }

  .rs-tbl-row::before {
    content: ''; position: absolute;
    left: 0; top: 0; bottom: 0; width: 2px;
    background: transparent; transition: background 0.2s;
    border-radius: 2px 0 0 2px;
  }

  .rs-tbl-row:hover { background: rgba(255,255,255,0.025); border-color: rgba(255,255,255,0.06); }
  .rs-tbl-row:hover::before { background: #00f2ff; }
  .rs-tbl-row.podio { background: rgba(0,242,255,0.02); }
  .rs-tbl-row.podio::before { background: #00f2ff; }

  .rs-tbl-pos {
    font-family: 'Barlow Condensed', sans-serif;
    font-style: italic; font-weight: 900;
    font-size: 1rem; color: rgba(255,255,255,0.3);
    display: flex; align-items: center;
  }

  .rs-tbl-atleta { min-width: 0; }

  .rs-tbl-nombre {
    font-family: 'Barlow Condensed', sans-serif;
    font-style: italic; font-weight: 700;
    font-size: 1rem; color: #fff;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  .rs-tbl-dorsal-lbl {
    font-size: 8px; letter-spacing: 0.15em;
    color: rgba(255,255,255,0.25); margin-top: 1px;
  }

  .rs-tbl-cat-badge {
    display: inline-flex; align-items: center;
    padding: 2px 7px; border-radius: 2px;
    font-size: 7px; font-weight: 700;
    letter-spacing: 0.12em; text-transform: uppercase;
    border: 1px solid; white-space: nowrap; width: fit-content;
  }

  .rs-tbl-time {
    font-family: 'Barlow Condensed', sans-serif;
    font-style: italic; font-weight: 900;
    font-size: 1rem; color: #00f2ff;
    text-align: right; letter-spacing: 0.02em;
  }

  .rs-tbl-pace {
    font-size: 0.78rem; color: rgba(255,255,255,0.28);
    text-align: right;
  }

  .rs-tbl-catpos {
    font-size: 0.78rem; color: rgba(255,255,255,0.28);
    text-align: right;
  }

  /* Loading sweep */
  .rs-loader-bar {
    width: 200px; height: 2px;
    background: rgba(255,255,255,0.05); border-radius: 2px;
    overflow: hidden; margin: 0 auto;
  }

  .rs-loader-fill {
    height: 100%;
    background: linear-gradient(90deg, transparent, #00f2ff, transparent);
    animation: rs-sweep 1.4s ease infinite;
  }

  @keyframes rs-sweep {
    0%   { transform: translateX(-100%); width: 60%; }
    100% { transform: translateX(250%);  width: 60%; }
  }

  .rs-tabla-empty {
    padding: 4rem 0; text-align: center;
    font-family: 'Barlow Condensed', sans-serif;
    font-style: italic; font-weight: 900;
    font-size: 1.4rem; color: rgba(255,255,255,0.12);
    letter-spacing: 0.05em; text-transform: uppercase;
  }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .rs-header { padding: 4rem 1.25rem 2rem; }
    .rs-title { font-size: clamp(52px, 16vw, 90px); }
    .rs-tabs-wrap { padding: 0 1.25rem 2rem; }
    .rs-search-wrap { padding: 0 1.25rem 3rem; }
    .rs-card { padding: 0 1.25rem 4rem; }
    .rs-tabla-section { padding: 0 1.25rem 4rem; }
    .rs-stats-grid { grid-template-columns: repeat(2, 1fr); }
    .rs-athlete-row { grid-template-columns: 1fr; gap: 1.5rem; }
    .rs-sponsors-center { flex-direction: row; align-items: center; justify-content: flex-start; gap: 1rem; align-self: auto; }
    .rs-sponsor-pill-sm { flex: unset; padding: 10px 18px; }
    .rs-sponsor-pill-sm img { height: 36px; }
    .rs-status-col { align-items: flex-start; flex-direction: row; flex-wrap: wrap; }
    .rs-time-hero { grid-template-columns: 1fr; gap: 1.5rem; }
    .rs-bib-watermark { display: none; }
    .rs-card-inner { padding: 2rem 0; }
    .rs-athlete-name-first, .rs-athlete-name-last { font-size: clamp(2.5rem, 11vw, 4rem); }
    .rs-time-value { font-size: clamp(3rem, 15vw, 6rem); }
    .rs-search-input { font-size: 2rem; padding: 16px 20px; }
    .rs-search-btn { padding: 16px 20px; font-size: 0.75rem; }
    .rs-tbl-head { display: none; }
    .rs-tbl-row {
      grid-template-columns: 40px 1fr;
      grid-template-rows: auto auto;
      gap: 0.3rem 0.6rem;
      padding: 0.85rem 1rem;
      border-radius: 0;
    }
    .rs-tbl-cat-col, .rs-tbl-pace, .rs-tbl-catpos { display: none; }
    .rs-tbl-time { text-align: left; grid-column: 2; grid-row: 2; font-size: 0.9rem; }
    .rs-tbl-pos { grid-row: 1 / span 2; align-self: center; }
  }
`;

/* ────────────────────────────────────────────────────────────── */
/* TABLA ROW (memoized)                                           */
/* ────────────────────────────────────────────────────────────── */

const TablaRow = ({ r }: { r: JsonAtleta }) => {
  const accent = catColor(r.categoria);
  const medal  = medalEmoji(r.posicion_general);
  return (
    <div className={`rs-tbl-row ${r.posicion_general <= 3 ? 'podio' : ''}`}>
      <div className="rs-tbl-pos">
        {medal
          ? <span style={{ fontSize: '1rem' }}>{medal}</span>
          : <span>{r.posicion_general || '—'}</span>
        }
      </div>
      <div className="rs-tbl-atleta">
        <div className="rs-tbl-nombre">{r.nombre_completo}</div>
        <div className="rs-tbl-dorsal-lbl">#{String(r.dorsal).padStart(3,'0')}</div>
      </div>
      <div className="rs-tbl-cat-col" style={{ display: 'flex', alignItems: 'center' }}>
        <span className="rs-tbl-cat-badge"
          style={{ color: accent, borderColor: `${accent}30`, background: `${accent}0d` }}>
          {r.categoria}
        </span>
      </div>
      <div className="rs-tbl-time">{r.sin_tiempo ? 'Sin tiempo' : (r.tiempo_neto || r.tiempo_bruto)}</div>
      <div className="rs-tbl-pace">{r.pace || '—'}</div>
      <div className="rs-tbl-catpos">{r.posicion_categoria ? `#${r.posicion_categoria}` : '—'}</div>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────── */
/* TABLA GENERAL COMPONENT                                        */
/* ────────────────────────────────────────────────────────────── */

const TablaGeneral = () => {
  const [query, setQuery]       = useState('');
  const [visible, setVisible]   = useState(80);
  const loaderRef               = useRef<HTMLDivElement>(null);

  // Infinite scroll
  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) setVisible(v => v + 80);
    }, { threshold: 0.1 });
    if (loaderRef.current) obs.observe(loaderRef.current);
    return () => obs.disconnect();
  }, []);

  // Reset visible al cambiar búsqueda
  useEffect(() => { setVisible(80); }, [query]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return RESULTADOS;
    return RESULTADOS.filter(r =>
      String(r.dorsal).includes(q) ||
      r.nombre_completo.toLowerCase().includes(q) ||
      r.categoria.toLowerCase().includes(q)
    );
  }, [query]);

  const shown = useMemo(() => filtered.slice(0, visible), [filtered, visible]);

  const stats = useMemo(() => ({
    total: RESULTADOS.filter(r => !r.sin_tiempo).length,
    masc:  RESULTADOS.filter(r => r.genero === 'M' && !r.sin_tiempo).length,
    fem:   RESULTADOS.filter(r => r.genero === 'F' && !r.sin_tiempo).length,
    cats:  [...new Set(RESULTADOS.map(r => r.categoria))].length,
  }), []);

  return (
    <>
      {/* Búsqueda */}
      <div className="rs-tabla-search-wrap">
        <div className="rs-tabla-search-box">
          <div className="rs-tabla-search-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
          <input
            className="rs-tabla-search-input"
            type="text"
            placeholder="Dorsal, nombre o categoría..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoComplete="off"
          />
          {query && (
            <button className="rs-tabla-search-clear" onClick={() => setQuery('')}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="rs-tabla-stats">
        <div>
          <div className="rs-tabla-stat-val">{stats.total}</div>
          <div className="rs-tabla-stat-lbl">Finishers</div>
        </div>
        <div className="rs-tabla-stat-div" />
        <div>
          <div className="rs-tabla-stat-val">{stats.masc}</div>
          <div className="rs-tabla-stat-lbl">Masculino</div>
        </div>
        <div className="rs-tabla-stat-div" />
        <div>
          <div className="rs-tabla-stat-val">{stats.fem}</div>
          <div className="rs-tabla-stat-lbl">Femenino</div>
        </div>
        <div className="rs-tabla-stat-div" />
        <div>
          <div className="rs-tabla-stat-val">{stats.cats}</div>
          <div className="rs-tabla-stat-lbl">Categorías</div>
        </div>
      </div>

      {/* Contador */}
      <div className="rs-tabla-count">
        {query
          ? `${filtered.length} resultado${filtered.length !== 1 ? 's' : ''} para "${query}"`
          : `${filtered.length} corredores · WE RUN RAYOCERO 10K · 06 JUN 2026`
        }
      </div>

      {/* Header */}
      <div className="rs-tbl-head">
        <span className="rs-th">Pos</span>
        <span className="rs-th">Atleta</span>
        <span className="rs-th">Categoría</span>
        <span className="rs-th r">Tiempo</span>
        <span className="rs-th r">Ritmo</span>
        <span className="rs-th r">Pos Cat</span>
      </div>

      {/* Filas */}
      {shown.length === 0
        ? <div className="rs-tabla-empty">Sin resultados para "{query}"</div>
        : shown.map(r => <TablaRow key={r.dorsal} r={r} />)
      }

      {/* Trigger infinite scroll */}
      {shown.length < filtered.length && (
        <div ref={loaderRef} style={{ padding: '2rem 0', display: 'flex', justifyContent: 'center' }}>
          <div className="rs-loader-bar"><div className="rs-loader-fill" /></div>
        </div>
      )}
    </>
  );
};

/* ────────────────────────────────────────────────────────────── */
/* MAIN COMPONENT                                                 */
/* ────────────────────────────────────────────────────────────── */

export default function ResultsSection() {
  const [tab, setTab]             = useState<'individual' | 'tabla'>('individual');
  const [bib, setBib]             = useState('');
  const [loading, setLoading]     = useState(false);
  const [runner, setRunner]       = useState<RunnerResult | null>(null);
  const [raceResult, setRaceResult] = useState<RaceResult | null>(null);
  const [jsonAtleta, setJsonAtleta] = useState<JsonAtleta | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [searched, setSearched]   = useState(false);
  const [copied, setCopied]       = useState(false);

  const handleSearch = useCallback(async () => {
    const bibNum = parseInt(bib.trim());
    if (!bibNum || isNaN(bibNum)) return;

    setLoading(true);
    setError(null);
    setRunner(null);
    setRaceResult(null);
    setJsonAtleta(null);
    setSearched(true);

    // Buscar en JSON oficial primero (disponible siempre)
    const jsonData = RESULTADOS_INDEX.get(bibNum) ?? null;
    setJsonAtleta(jsonData);

    try {
      const { data: runnerData, error: runnerErr } = await supabase
        .from('runners')
        .select('bib_number, nombre, apellido, categoria, genero, race_status, finish_time_seconds, start_time, finish_time, split_time_seconds, gps_track')
        .eq('bib_number', bibNum)
        .single();

      if (runnerErr || !runnerData) {
        // Si no está en Supabase pero sí en JSON, mostrar desde JSON
        if (jsonData) {
          // Construir RunnerResult sintético desde JSON
          const parts = jsonData.nombre_completo.split(' ');
          const nombre   = parts[0];
          const apellido = parts.slice(1).join(' ');
          // Convertir tiempo "HH:MM:SS" → segundos
          let finish_time_seconds: number | null = null;
          // Preferir tiempo_chip para finish_time_seconds, fallback a tiempo_neto/oficial
          const tRef = jsonData.tiempo_chip || jsonData.tiempo_neto || jsonData.tiempo_oficial;
          if (tRef && !jsonData.sin_tiempo) {
            const tp = tRef.split(':');
            if (tp.length === 3) {
              finish_time_seconds = parseInt(tp[0])*3600 + parseInt(tp[1])*60 + parseFloat(tp[2]);
            } else if (tp.length === 2) {
              finish_time_seconds = parseInt(tp[0])*60 + parseFloat(tp[1]);
            }
          }
          setRunner({
            bib_number: bibNum,
            nombre, apellido,
            categoria: jsonData.categoria,
            genero: jsonData.genero,
            race_status: jsonData.sin_tiempo ? 'waiting' : 'completed',
            finish_time_seconds,
            start_time: null,
            finish_time: null,
            split_time_seconds: null,
            gps_track: null,
          });
          setRaceResult({
            ranking_general: jsonData.posicion_general || null,
            ranking_categoria: jsonData.posicion_categoria || null,
            velocidad_kmh: jsonData.velocidad_kmh || null,
          });
          setLoading(false);
          return;
        }
        setError(`DORSAL #${bibNum} NO ENCONTRADO`);
        setLoading(false);
        return;
      }

      setRunner(runnerData as RunnerResult);

      // Enriquecer con datos del JSON si están disponibles
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
          .single();
        if (raceData) setRaceResult(raceData as RaceResult);
      }

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

  // Pace — siempre en formato min'ss" (min/km)
  const paceDisplay = pace ? normalizePace(pace) : normalizePace(jsonAtleta?.pace ?? null);

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
            <span className="rs-eyebrow-text">WE RUN RAYOCERO · 10K NIGHT FEST · 2026</span>
          </div>
          <h1 className="rs-title">
            <span style={{ display: 'block' }}>MIS</span>
            <span className="rs-title-line2" style={{ display: 'block' }}>TIEMPOS</span>
          </h1>
        </div>

        {/* ── Tabs ── */}
        <div className="rs-tabs-wrap">
          <div className="rs-tabs">
            <button
              className={`rs-tab ${tab === 'individual' ? 'active' : ''}`}
              onClick={() => setTab('individual')}
            >
              🔍 Buscar mi tiempo
            </button>
            <button
              className={`rs-tab ${tab === 'tabla' ? 'active' : ''}`}
              onClick={() => setTab('tabla')}
            >
              🏁 Tabla general
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">

          {/* ══════════════════════════════════════════════════ */}
          {/* TAB: BUSCAR MI TIEMPO                             */}
          {/* ══════════════════════════════════════════════════ */}
          {tab === 'individual' && (
            <motion.div key="individual"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>

              {/* Search */}
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

              {/* Results */}
              <AnimatePresence mode="wait">

                {/* Error */}
                {searched && !loading && error && (
                  <motion.div key="error" className="rs-card"
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                    <div className="rs-error">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(239,68,68,0.5)" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="15" y1="9" x2="9" y2="15"/>
                        <line x1="9" y1="9" x2="15" y2="15"/>
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
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
                    <div className="rs-card-inner">

                      <div className="rs-bib-watermark">{runner.bib_number}</div>

                      {/* Atleta + sponsors + estado */}
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

                        {/* Sponsors centro */}
                        <div className="rs-sponsors-center">
                          {SPONSORS.map((sp) => (
                            <div key={sp.src} className="rs-sponsor-pill-sm">
                              <img src={sp.src} alt={sp.alt} />
                            </div>
                          ))}
                        </div>

                        {/* Status + compartir */}
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

                      {/* Tiempo hero — pistola + chip */}
                      <div className="rs-time-hero">
                        <div>
                          <div className="rs-time-label">TIEMPO PISTOLA · WE RUN RAYOCERO 10K</div>
                          <div className={`rs-time-value ${(jsonAtleta?.tiempo_oficial || hasTime) ? 'has-time' : ''}`}>
                            {jsonAtleta?.tiempo_oficial && !jsonAtleta.sin_tiempo
                              ? jsonAtleta.tiempo_oficial
                              : hasTime
                                ? formatTime(runner.finish_time_seconds!)
                                : '--:--:--'
                            }
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className="rs-time-label">TIEMPO CHIP</div>
                          <div style={{
                            fontFamily: "'Barlow Condensed', sans-serif",
                            fontStyle: 'italic', fontWeight: 900,
                            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                            color: '#00f2ff', lineHeight: 1,
                            textShadow: '0 0 20px rgba(0,242,255,0.3)',
                          }}>
                            {jsonAtleta?.tiempo_chip && !jsonAtleta.sin_tiempo
                              ? jsonAtleta.tiempo_chip
                              : runner.split_time_seconds != null
                                ? formatTime(runner.split_time_seconds)
                                : '--:--:--'
                            }
                          </div>
                          <div style={{ fontSize: '7px', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.3em', textTransform: 'uppercase', marginTop: '4px' }}>
                            tiempo neto oficial
                          </div>
                        </div>
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
                            {paceDisplay ?? '---'}
                            {paceDisplay && <span className="rs-stat-unit">min/km</span>}
                          </div>
                        </div>
                        <div className="rs-stat">
                          <div className="rs-stat-label">VELOCIDAD</div>
                          <div className="rs-stat-value">
                            {raceResult?.velocidad_kmh
                              ? raceResult.velocidad_kmh.toFixed(1)
                              : hasTime
                                ? (36000 / runner.finish_time_seconds!).toFixed(1)
                                : jsonAtleta?.velocidad_kmh
                                  ? jsonAtleta.velocidad_kmh.toFixed(1)
                                  : '---'}
                            {(raceResult?.velocidad_kmh || hasTime || jsonAtleta?.velocidad_kmh)
                              && <span className="rs-stat-unit">km/h</span>}
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
                          <Suspense fallback={<div className="rs-map-skeleton" />}>
                            <RouteMapStrava
                              points={gpsPoints}
                              athleteName={`${runner.nombre} ${runner.apellido}`}
                              eventName="WE RUN RAYOCERO 10K NIGHT FEST"
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

          {/* ══════════════════════════════════════════════════ */}
          {/* TAB: TABLA GENERAL                                */}
          {/* ══════════════════════════════════════════════════ */}
          {tab === 'tabla' && (
            <motion.div key="tabla"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
              <div className="rs-tabla-section">
                <TablaGeneral />
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </>
  );
}
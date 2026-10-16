/**
 * RAYOCERO — RESULTS SECTION V4.8 · MULTI-EVENTO · TACTICAL CERTIFICATE ENGINE
 * CEO: Lualdo Sciscioli | Valkyron Group
 *
 * EVOLUCIÓN V4.8: Selector inicial "¿Qué carrera quieres consultar?" + evento WE RUN RAYOCERO.
 * EVOLUCIÓN V4.7: Selector de evento Coro / Caninata. Coro V4.6 íntegro.
 * AJUSTE V4.7.1: Posición y responsive del selector, sin tocar navegación global.
 * Caninata usa RPC de cronometraje publicada, certificado 5K / 10K.
 *
 * CHANGELOG V4.8:
 * ─ Al abrir el módulo sin `?evento=` en la URL se muestra el selector de carrera
 *   (WE RUN RAYOCERO · 499 RUN CORO · CANINATA). La elección se escribe en la URL
 *   (`?evento=werun|coro|caninata`) con history.replaceState, preservando history.state
 *   para no desincronizar el router. Enlaces existentes con `?evento=` siguen funcionando.
 * ─ El motor 499 RUN Coro V4.6 pasa a ser MULTI-EVENTO vía `RaceConfig` + `RaceCtx`.
 *   Coro conserva exactamente su comportamiento: mismos datos, mismo orden por chip,
 *   mismos textos, mismo certificado. Sus constantes originales alimentan CORO_CONFIG.
 * ─ WE RUN RAYOCERO 10K (Barquisimeto) desde src/data/resultados_werun10k_barquisimeto_2026.json.
 *   Clasificación OFICIAL (tiempo pistola, posiciones del cronometraje): la tabla y el
 *   podio absoluto respetan `posicion_general` / `posicion_genero` del JSON y muestran
 *   tiempo oficial. Evita que una lectura de chip anómala altere el podio.
 * ─ Carrera cerrada (WE RUN): dorsal sin tiempo → estado "SIN TIEMPO" (no "EN LARGADA")
 *   y no se emite certificado. Sin VITE_RACE_ID_WERUN no hay llamadas a Supabase.
 * ─ Enlace "Compartir" incluye `evento` para abrir directamente la carrera correcta.
 *
 * CHANGELOG V4.6:
 * ─ Fuera la franja de estadísticas (finishers / masculino / femenino / categorías)
 *   y la línea de conteo sobre la tabla. Quedan podio + buscador + tabla.
 * ─ El useMemo `stats` y su CSS (.rs-tabla-stat*, .rs-tabla-count) se eliminan por
 *   quedar sin consumidores.
 *
 * CHANGELOG V4.5:
 * ─ Hoja de estilos reescrita MOBILE FIRST: la base es el teléfono pequeño y los
 *   breakpoints amplían con min-width (381 / 481 / 769). Cero cambio visual.
 * ─ Breakpoint intermedio 481px: el podio pasa a dos columnas antes que la tabla.
 * ─ Spinners nativos del input numérico suprimidos (webkit + firefox).
 * ─ Hover states confinados a ≥769px: en táctil no existen y ensucian el :active.
 * ─ prefers-reduced-motion: se desactivan animaciones y transiciones.
 *
 * CHANGELOG V4.4:
 * ─ Bloque PODIO ABSOLUTO sobre la tabla: dos columnas lado a lado — 1·2·3
 *   masculino y 1·2·3 femenino — alimentadas por PODIO_M / PODIO_F (tiempo neto).
 * ─ La tabla inferior queda como listado limpio de tiempos, sin medallas ni
 *   resaltado: el podio ya vive arriba.
 *
 * CHANGELOG V4.3:
 * ─ Tabla general unificada: se retiran las pestañas 10K / 4K. Una sola tabla de
 *   tiempos ordenada por tiempo neto ascendente (DNF/DNS al final).
 * ─ Se elimina la columna de posición numérica y la columna Pos/Total. Solo se
 *   marcan los podios ABSOLUTOS: 1-2-3 masculino y 1-2-3 femenino,
 *   calculados por tiempo neto sobre el total de finishers.
 * ─ TOTAL_FINISHERS y MODALIDADES eliminados: sin consumidores tras V4.2/V4.3.
 *
 * CHANGELOG V4.2:
 * ─ Consulta web: stats grid reducido a RITMO MEDIO + VELOCIDAD. POS. GENERAL y
 *   POS. CATEGORÍA retiradas de la sección de resultados (el certificado las conserva).
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
 *
 * DATA REQUERIDA V4.8:
 *   @/data/resultados_werun10k_barquisimeto_2026.json  (608 registros, 604 con tiempo)
 */

import { useState, useCallback, useEffect, useMemo, useRef, lazy, Suspense, createContext, useContext } from 'react'; // V4.8: + createContext, useContext
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { toPng } from 'html-to-image';
import type { GeoPoint } from '@/components/RouteMapStrava';

import mapImg  from '@/assets/IMG_4003.jpg';
import logoImg from '@/assets/logo.png';
import RESULTADOS_JSON from '@/data/resultados_499_coro_2026.json';
import RESULTADOS_WERUN_JSON from '@/data/resultados_werun10k_barquisimeto_2026.json'; // V4.8
import caninataCert5K from '@/assets/caninata-cert-5k.png';
import caninataCert10K from '@/assets/caninata-cert-10k.png';

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

/* ────────────────────────────────────────────────────────────── */
/* V4.8 — CONFIGURACIÓN DE CARRERA — WE RUN RAYOCERO 10K          */
/* ────────────────────────────────────────────────────────────── */

/**
 * @brief race_id de WE RUN en la tabla `races` de Supabase.
 * @note  Si VITE_RACE_ID_WERUN no está definido (o viene vacío), la consulta resuelve
 *        SOLO desde el JSON oficial: carrera cerrada, cero llamadas de red por dorsal.
 */
const RACE_ID_WERUN: string | null = import.meta.env.VITE_RACE_ID_WERUN || null;

const WERUN_NAME_LONG  = 'WE RUN RAYOCERO · BARQUISIMETO, LARA';
const WERUN_NAME_SHORT = 'WE RUN RAYOCERO';
const WERUN_DATE       = '2026';
const WERUN_CITY       = 'BARQUISIMETO, LARA';

/** Assets del certificado WE RUN — mapa aéreo de Barquisimeto y logo Rayocero. */
const WERUN_CERT_BG_IMG   = mapImg;
const WERUN_CERT_LOGO_IMG = logoImg;

type Modalidad = '10K' | '4K';

/** Distancia oficial por modalidad [km]. Alimenta ritmo y velocidad media. */
const DIST_KM: Record<Modalidad, number> = { '10K': 10, '4K': 4 };

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

/**
 * @brief V4.8 — Criterio de clasificación del evento.
 *  - 'chip'    → orden y podio por tiempo neto (Coro, comportamiento V4.3–V4.6).
 *  - 'oficial' → orden y podio por las posiciones oficiales del cronometraje (tiempo
 *                pistola). Es el criterio reglamentario y el que publica WE RUN.
 */
type ClasificacionModo = 'chip' | 'oficial';

/** @brief V4.8 — Eventos servidos por el motor JSON (Caninata usa RPC propia). */
type EventoJsonId = 'coro' | 'werun';

/**
 * @brief V4.8 — Dataset precalculado de un evento. Se construye UNA vez al cargar el
 *        módulo (O(n log n)), nunca durante el render.
 */
interface RaceDataset {
  resultados: JsonAtleta[];
  published: boolean;
  index: Map<number, JsonAtleta>;
  categoryCounts: Record<string, number>;
  podioM: JsonAtleta[];
  podioF: JsonAtleta[];
  ordenados: JsonAtleta[];
}

/** @brief V4.8 — Configuración completa de un evento para el motor de resultados. */
interface RaceConfig {
  id: EventoJsonId;
  /** race_id en Supabase. null → sin consulta de red, el JSON es la única fuente. */
  raceId: string | null;
  nameLong: string;
  nameShort: string;
  date: string;
  city: string;
  /** Texto de distancias del eyebrow ('10K & 4K', '10K'). */
  distanciasLabel: string;
  certBg: string;
  certLogo: string;
  /** Prefijo del watermark del certificado (antes "RAYOCERO · 499 RUN" fijo). */
  certWatermark: string;
  /** Prefijo del archivo PNG descargado (antes "499CORO" fijo). */
  filePrefix: string;
  clasificacion: ClasificacionModo;
  /** true → un dorsal sin tiempo es "SIN TIEMPO" y no recibe certificado. */
  carreraCerrada: boolean;
  data: RaceDataset;
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

/**
 * @brief Total de la categoría dentro de su modalidad.
 * @param counts V4.8 — tabla de conteos del evento activo. Por defecto Coro (firma V4.0 intacta).
 */
const getCatTotal = (mod: Modalidad, cat: string, counts: Record<string, number> = CATEGORY_COUNTS): number =>
  counts[catKey(mod, cat)] ?? 0;

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
    case 'no_time':     return { text: 'SIN TIEMPO',  cls: 'notime'   }; // V4.8 — carrera cerrada sin marca de meta
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

/* ────────────────────────────────────────────────────────────── */
/* CSS V4.5 — MOBILE FIRST                                        */
/* Estrategia: la base es el teléfono pequeño (≤380px). Los       */
/* breakpoints AMPLÍAN con min-width, nunca corrigen hacia abajo.  */
/*   base            → ≤380px  (iPhone SE / 13 mini)              */
/*   min-width 381px → teléfonos actuales                          */
/*   min-width 481px → phablet / landscape                         */
/*   min-width 769px → tablet horizontal y escritorio              */
/* El certificado (.rs-cert-*) es un canvas fijo de 1080×1920:     */
/* vive fuera del flujo responsive y NO se toca en ningún query.   */
/* ────────────────────────────────────────────────────────────── */

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,300;0,400;1,400;1,700;1,800;1,900&family=Barlow:wght@300;400;500&display=swap');

  /* ══════════════════════════════════════════════════════════════
     BASE — MOBILE (≤380px)
     ══════════════════════════════════════════════════════════════ */

  .rs-root { min-height: 100vh; background: #03070b; font-family: 'Barlow', sans-serif; color: #fff; overflow-x: hidden; position: relative; }
  .rs-glow-1 { position: absolute; top: -200px; left: 50%; transform: translateX(-50%); width: 900px; height: 600px; background: radial-gradient(ellipse, rgba(0,242,255,0.04) 0%, transparent 70%); pointer-events: none; }
  .rs-glow-2 { position: absolute; bottom: 0; right: -200px; width: 600px; height: 600px; background: radial-gradient(ellipse, rgba(0,100,255,0.03) 0%, transparent 70%); pointer-events: none; }

  .rs-header { padding: 4rem 1.25rem 2rem; max-width: 1100px; margin: 0 auto; position: relative; }
  .rs-eyebrow { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 100px; background: rgba(0,242,255,0.04); border: 1px solid rgba(0,242,255,0.12); margin-bottom: 2rem; }
  .rs-eyebrow-dot { width: 5px; height: 5px; border-radius: 50%; background: #00f2ff; animation: rs-blink 2s ease infinite; flex-shrink: 0; }
  @keyframes rs-blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
  .rs-eyebrow-text { font-size: 8px; font-weight: 700; letter-spacing: 0.4em; color: rgba(0,242,255,0.6); text-transform: uppercase; }
  .rs-title { font-family: 'Barlow Condensed', sans-serif; font-style: italic; font-weight: 900; font-size: clamp(44px, 15vw, 72px); line-height: 0.85; letter-spacing: -0.02em; text-transform: uppercase; color: #fff; margin: 0; }
  .rs-title-line2 { color: transparent; -webkit-text-stroke: 1.5px rgba(255,255,255,0.25); }

  .rs-tabs-wrap { max-width: 700px; margin: 0 auto; padding: 0 1.25rem 2rem; }
  .rs-tabs { display: flex; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 4px; overflow: hidden; }
  .rs-tab { flex: 1; padding: 13px 12px; background: transparent; border: none; color: rgba(255,255,255,0.3); font-family: 'Barlow Condensed', sans-serif; font-style: italic; font-weight: 900; font-size: 0.75rem; letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer; transition: color 0.2s, background 0.2s, border-color 0.2s; border-bottom: 2px solid transparent; }
  .rs-tab.active { background: rgba(0,242,255,0.05); color: #00f2ff; border-bottom-color: #00f2ff; }

  .rs-search-wrap { max-width: 700px; margin: 0 auto; padding: 0 1.25rem 3rem; }
  .rs-search-box { display: flex; align-items: center; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden; transition: border-color 0.2s, box-shadow 0.2s; }
  .rs-search-box:focus-within { border-color: rgba(0,242,255,0.3); box-shadow: 0 0 0 1px rgba(0,242,255,0.1); }
  .rs-search-input { flex: 1; min-width: 0; background: transparent; border: none; outline: none; padding: 12px 14px; color: #fff; font-family: 'Barlow Condensed', sans-serif; font-style: italic; font-weight: 900; font-size: 1.5rem; letter-spacing: 0.1em; text-align: center; }
  .rs-search-input::placeholder { color: rgba(255,255,255,0.1); letter-spacing: 0.3em; }
  /* Sin spinners nativos: el dorsal se teclea, no se incrementa */
  .rs-search-input::-webkit-outer-spin-button,
  .rs-search-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  .rs-search-input[type=number] { -moz-appearance: textfield; appearance: textfield; }
  .rs-search-btn { padding: 12px 14px; background: #00f2ff; border: none; color: #03070b; font-family: 'Barlow Condensed', sans-serif; font-style: italic; font-weight: 900; font-size: 0.65rem; letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer; transition: background 0.15s, letter-spacing 0.15s, transform 0.15s; display: flex; align-items: center; gap: 8px; white-space: nowrap; flex-shrink: 0; }
  .rs-search-btn:active:not(:disabled) { transform: scaleX(0.98); }
  .rs-search-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .rs-notice { max-width: 700px; margin: 0 1.25rem 2rem; padding: 14px 20px; border: 1px solid rgba(0,242,255,0.14); background: rgba(0,242,255,0.03); border-radius: 4px; display: flex; align-items: center; gap: 12px; }
  .rs-notice-text { font-size: 9px; font-weight: 700; letter-spacing: 0.22em; color: rgba(0,242,255,0.65); text-transform: uppercase; line-height: 1.7; }

  .rs-card { max-width: 1100px; margin: 0 auto; padding: 0 1.25rem 4rem; }
  .rs-card-inner { position: relative; border-top: 1px solid rgba(255,255,255,0.08); border-bottom: 1px solid rgba(255,255,255,0.08); padding: 2rem 0; }
  /* La marca de agua del dorsal solo aparece cuando hay ancho que la sostenga */
  .rs-bib-watermark { display: none; }

  .rs-athlete-row { display: grid; grid-template-columns: 1fr; gap: 1.25rem; align-items: center; margin-bottom: 3rem; position: relative; }
  .rs-athlete-meta { font-size: 9px; font-weight: 700; letter-spacing: 0.35em; color: rgba(0,242,255,0.5); text-transform: uppercase; margin-bottom: 1rem; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .rs-athlete-meta-dot { width: 3px; height: 3px; border-radius: 50%; background: rgba(0,242,255,0.3); }
  .rs-athlete-name-first { font-family: 'Barlow Condensed', sans-serif; font-style: italic; font-weight: 900; font-size: clamp(1.9rem, 9vw, 3rem); line-height: 0.85; text-transform: uppercase; color: #fff; letter-spacing: -0.02em; }
  .rs-athlete-name-last { font-family: 'Barlow Condensed', sans-serif; font-style: italic; font-weight: 300; font-size: clamp(1.9rem, 9vw, 3rem); line-height: 0.85; text-transform: uppercase; color: rgba(255,255,255,0.4); letter-spacing: -0.02em; }

  .rs-mod-chip { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 2px; font-size: 8px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; border: 1px solid; }

  .rs-status-col { display: flex; flex-direction: column; align-items: flex-start; gap: 0.6rem; padding-top: 0; }
  .rs-status-badge { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 3px; font-family: 'Barlow Condensed', sans-serif; font-style: italic; font-size: 10px; font-weight: 900; letter-spacing: 0.2em; text-transform: uppercase; white-space: nowrap; }
  .rs-status-badge.finished { background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.25); color: #22c55e; }
  .rs-status-badge.pending { background: rgba(0,242,255,0.06); border: 1px solid rgba(0,242,255,0.2); color: rgba(0,242,255,0.8); animation: rs-pending-pulse 2s ease infinite; }
  @keyframes rs-pending-pulse { 0%,100%{box-shadow:0 0 0 rgba(0,242,255,0)} 50%{box-shadow:0 0 16px rgba(0,242,255,0.15)} }
  /* V4.8 — dorsal sin marca de meta en carrera cerrada: estado neutro, sin pulso */
  .rs-status-badge.notime { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.14); color: rgba(255,255,255,0.5); }
  .rs-notime-note { font-size: 9px; font-weight: 700; letter-spacing: 0.18em; color: rgba(255,255,255,0.3); text-transform: uppercase; line-height: 1.6; max-width: 32ch; }

  .rs-action-btns { display: flex; gap: 4px; flex-wrap: wrap; justify-content: flex-start; margin-top: 8px; }
  .rs-share-btn { display: inline-flex; align-items: center; gap: 7px; padding: 8px 12px; background: transparent; border: 1px solid rgba(255,255,255,0.1); border-radius: 3px; color: rgba(255,255,255,0.4); font-family: 'Barlow Condensed', sans-serif; font-style: italic; font-size: 7.5px; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase; cursor: pointer; transition: border-color 0.2s, color 0.2s, background 0.2s, transform 0.2s; }
  .rs-share-btn:active:not(:disabled) { transform: scale(0.97); }
  .rs-share-btn:disabled { opacity: 0.45; cursor: wait; }
  .rs-share-btn.primary { background: rgba(0,242,255,0.08); border-color: rgba(0,242,255,0.3); color: #00f2ff; }

  .rs-time-hero { padding: 3rem 0; border-top: 1px solid rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.05); margin-bottom: 3rem; display: grid; grid-template-columns: 1fr; align-items: center; gap: 1.25rem; }
  .rs-time-label { font-size: 8px; font-weight: 700; letter-spacing: 0.4em; color: rgba(255,255,255,0.2); text-transform: uppercase; margin-bottom: 0.75rem; }
  .rs-time-value { font-family: 'Barlow Condensed', sans-serif; font-style: italic; font-weight: 900; font-size: clamp(2.5rem, 14vw, 5rem); line-height: 1; color: #fff; letter-spacing: -0.02em; }
  .rs-time-value.has-time { color: #00f2ff; }

  .rs-stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0; margin-bottom: 3rem; }
  .rs-stat { padding: 1rem 0; border-right: 1px solid rgba(255,255,255,0.05); padding-right: 1rem; margin-right: 1rem; }
  .rs-stat:last-child { border-right: none; padding-right: 0; margin-right: 0; }
  .rs-stat-label { font-size: 7px; font-weight: 700; letter-spacing: 0.3em; color: rgba(255,255,255,0.2); text-transform: uppercase; margin-bottom: 0.5rem; }
  .rs-stat-value { font-family: 'Barlow Condensed', sans-serif; font-style: italic; font-weight: 900; font-size: 1.6rem; color: #fff; line-height: 1; }
  .rs-stat-value.accent { color: #00f2ff; }
  .rs-stat-unit { font-size: 0.7rem; color: rgba(255,255,255,0.25); font-style: italic; margin-left: 4px; }

  .rs-map-section { border-top: 1px solid rgba(255,255,255,0.05); padding-top: 2rem; margin-bottom: 2rem; }
  .rs-map-label { display: flex; align-items: center; gap: 8px; margin-bottom: 0.5rem; font-size: 8px; font-weight: 700; letter-spacing: 0.3em; color: rgba(255,255,255,0.2); text-transform: uppercase; }
  .rs-map-skeleton { height: 320px; border-radius: 20px; background: linear-gradient(90deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0.02) 100%); background-size: 200% 100%; animation: rs-shimmer 1.5s infinite; border: 1px solid rgba(0,242,255,0.08); }
  @keyframes rs-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

  .rs-error { max-width: 500px; margin: 0 auto; padding: 2rem; border: 1px solid rgba(239,68,68,0.15); border-radius: 2px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 1rem; }
  .rs-error-text { font-size: 9px; font-weight: 700; letter-spacing: 0.2em; color: rgba(239,68,68,0.7); text-transform: uppercase; }

  /* ── PODIO ABSOLUTO ── */
  .rs-podio { display: grid; grid-template-columns: 1fr; gap: 1.75rem; margin-bottom: 2rem; padding-bottom: 1.75rem; border-bottom: 1px solid rgba(255,255,255,0.06); }
  .rs-podio-col { min-width: 0; }
  .rs-podio-head { display: flex; align-items: center; gap: 10px; margin-bottom: 1.1rem; }
  .rs-podio-head-line { flex: 1; height: 1px; background: rgba(255,255,255,0.07); }
  .rs-podio-title { font-size: 8px; font-weight: 700; letter-spacing: 0.4em; text-transform: uppercase; white-space: nowrap; }
  .rs-podio-card { display: grid; grid-template-columns: 34px 1fr auto; gap: 0 1rem; align-items: center; padding: 0.75rem 0.85rem; margin-bottom: 4px; border: 1px solid rgba(255,255,255,0.05); border-radius: 3px; background: rgba(255,255,255,0.015); position: relative; overflow: hidden; }
  .rs-podio-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 2px; }
  .rs-podio-card.p1::before { background: #fbbf24; }
  .rs-podio-card.p2::before { background: rgba(255,255,255,0.45); }
  .rs-podio-card.p3::before { background: #d97706; }
  .rs-podio-card.p1 { background: rgba(251,191,36,0.035); border-color: rgba(251,191,36,0.16); }
  .rs-podio-medal { font-size: 1.25rem; line-height: 1; text-align: center; }
  .rs-podio-nombre { font-family: 'Barlow Condensed', sans-serif; font-style: italic; font-weight: 900; font-size: 0.95rem; color: #fff; text-transform: uppercase; letter-spacing: -0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .rs-podio-meta { font-size: 8px; letter-spacing: 0.18em; color: rgba(255,255,255,0.28); text-transform: uppercase; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .rs-podio-time { font-family: 'Barlow Condensed', sans-serif; font-style: italic; font-weight: 900; font-size: 1.25rem; color: #00f2ff; line-height: 1; text-align: right; }
  .rs-podio-pace { font-size: 8px; letter-spacing: 0.15em; color: rgba(255,255,255,0.25); text-align: right; margin-top: 3px; }
  .rs-podio-empty { padding: 1.5rem 0; font-size: 9px; letter-spacing: 0.2em; color: rgba(255,255,255,0.15); text-transform: uppercase; }

  /* ── TABLA GENERAL ── */
  .rs-tabla-section { max-width: 1100px; margin: 0 auto; padding: 0 1.25rem 4rem; }
  .rs-tabla-search-wrap { margin-bottom: 1.75rem; }
  .rs-tabla-search-box { display: flex; align-items: center; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden; }
  .rs-tabla-search-box:focus-within { border-color: rgba(0,242,255,0.3); box-shadow: 0 0 0 1px rgba(0,242,255,0.1); }
  .rs-tabla-search-icon { padding: 0 1.25rem; color: rgba(255,255,255,0.2); display: flex; align-items: center; flex-shrink: 0; }
  .rs-tabla-search-input { flex: 1; min-width: 0; background: transparent; border: none; outline: none; padding: 1rem 0; color: #fff; font-family: 'Barlow Condensed', sans-serif; font-style: italic; font-weight: 700; font-size: 1.1rem; letter-spacing: 0.08em; }
  .rs-tabla-search-input::placeholder { color: rgba(255,255,255,0.15); }
  .rs-tabla-search-clear { padding: 0 1.25rem; background: none; border: none; color: rgba(255,255,255,0.2); cursor: pointer; display: flex; align-items: center; }

  /* V4.6 — la tabla arranca directo tras el buscador: sin franja de estadísticas.
     En móvil es una lista apilada: sin cabecera, sin categoría ni ritmo */
  .rs-tbl-head { display: none; }
  .rs-th { font-size: 7px; font-weight: 700; letter-spacing: 0.3em; color: rgba(255,255,255,0.2); text-transform: uppercase; }
  .rs-th.r { text-align: right; }
  .rs-tbl-row { display: grid; grid-template-columns: 1fr; grid-template-rows: auto auto; gap: 0.3rem; padding: 0.85rem 1rem; border-radius: 0; border: 1px solid transparent; align-items: center; margin-bottom: 2px; position: relative; transition: background 0.12s, border-color 0.12s; }
  .rs-tbl-row::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 2px; background: transparent; transition: background 0.2s; border-radius: 2px 0 0 2px; }
  .rs-tbl-atleta { min-width: 0; }
  .rs-tbl-nombre { font-family: 'Barlow Condensed', sans-serif; font-style: italic; font-weight: 700; font-size: 1rem; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .rs-tbl-dorsal-lbl { font-size: 8px; letter-spacing: 0.15em; color: rgba(255,255,255,0.25); margin-top: 1px; }
  .rs-tbl-cat-badge { display: inline-flex; align-items: center; padding: 2px 7px; border-radius: 2px; font-size: 7px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; border: 1px solid; white-space: nowrap; width: fit-content; }
  .rs-tbl-cat-col, .rs-tbl-pace { display: none; }
  .rs-tbl-time { font-family: 'Barlow Condensed', sans-serif; font-style: italic; font-weight: 900; font-size: 0.9rem; color: #00f2ff; text-align: left; grid-row: 2; }
  .rs-loader-bar { width: 200px; height: 2px; background: rgba(255,255,255,0.05); border-radius: 2px; overflow: hidden; margin: 0 auto; }
  .rs-loader-fill { height: 100%; background: linear-gradient(90deg, transparent, #00f2ff, transparent); animation: rs-sweep 1.4s ease infinite; }
  @keyframes rs-sweep { 0%{transform:translateX(-100%);width:60%} 100%{transform:translateX(250%);width:60%} }
  .rs-tabla-empty { padding: 4rem 0; text-align: center; font-family: 'Barlow Condensed', sans-serif; font-style: italic; font-weight: 900; font-size: 1.4rem; color: rgba(255,255,255,0.12); letter-spacing: 0.05em; text-transform: uppercase; }

  /* ══════════════════════════════════════════════════════════════
     ≥ 381px — teléfonos actuales
     ══════════════════════════════════════════════════════════════ */
  @media (min-width: 381px) {
    .rs-title { font-size: clamp(52px, 16vw, 90px); }
    .rs-tab { padding: 14px 20px; font-size: 0.85rem; letter-spacing: 0.15em; }
    .rs-search-input { font-size: 1.8rem; padding: 14px 16px; }
    .rs-search-btn { padding: 14px 18px; font-size: 0.72rem; letter-spacing: 0.2em; }
    .rs-athlete-name-first, .rs-athlete-name-last { font-size: clamp(2.2rem, 10vw, 3.5rem); }
    .rs-stat-value { font-size: 2rem; }
    .rs-share-btn { padding: 9px 14px; font-size: 8px; letter-spacing: 0.12em; }
    .rs-action-btns { gap: 6px; }
    .rs-time-value { font-size: clamp(3rem, 15vw, 6rem); }
    }

  /* ══════════════════════════════════════════════════════════════
     ≥ 481px — phablet / landscape: el podio ya cabe en dos columnas
     ══════════════════════════════════════════════════════════════ */
  @media (min-width: 481px) {
    .rs-podio { grid-template-columns: 1fr 1fr; gap: 1.5rem; }
    .rs-podio-card { grid-template-columns: 38px 1fr auto; }
    .rs-time-hero { grid-template-columns: 1fr auto; gap: 2rem; }
  }

  /* ══════════════════════════════════════════════════════════════
     ≥ 769px — tablet horizontal y escritorio: tabla en rejilla,
     hover states y marca de agua del dorsal
     ══════════════════════════════════════════════════════════════ */
  @media (min-width: 769px) {
    .rs-header { padding: 7rem 2rem 4rem; }
    .rs-title { font-size: clamp(72px, 12vw, 130px); }
    .rs-tabs-wrap { padding: 0 2rem 2.5rem; }
    .rs-tab:hover:not(.active) { color: rgba(255,255,255,0.55); background: rgba(255,255,255,0.02); }

    .rs-search-wrap { padding: 0 2rem 5rem; }
    .rs-search-input { padding: 20px 28px; font-size: 2.5rem; }
    .rs-search-btn { padding: 20px 32px; font-size: 0.9rem; }
    .rs-search-btn:hover:not(:disabled) { background: #fff; letter-spacing: 0.25em; }

    .rs-notice { margin: 0 auto 2.5rem; }
    .rs-card { padding: 0 2rem 6rem; }
    .rs-card-inner { padding: 4rem 0; }
    .rs-bib-watermark { display: block; position: absolute; top: 50%; right: -2rem; transform: translateY(-50%); font-family: 'Barlow Condensed', sans-serif; font-style: italic; font-weight: 900; font-size: clamp(160px, 25vw, 300px); color: transparent; -webkit-text-stroke: 1px rgba(0,242,255,0.06); line-height: 1; pointer-events: none; user-select: none; letter-spacing: -0.04em; }

    .rs-athlete-row { grid-template-columns: 1fr auto; gap: 2.5rem; }
    .rs-athlete-name-first, .rs-athlete-name-last { font-size: clamp(3rem, 8vw, 6rem); }
    .rs-status-col { align-items: flex-end; gap: 0.75rem; padding-top: 1rem; }
    .rs-notime-note { text-align: right; }
    .rs-action-btns { justify-content: flex-end; gap: 8px; }
    .rs-share-btn { padding: 10px 18px; font-size: 9px; letter-spacing: 0.18em; }
    .rs-share-btn:hover:not(:disabled) { border-color: rgba(0,242,255,0.3); color: #00f2ff; background: rgba(0,242,255,0.04); }
    .rs-share-btn.primary:hover:not(:disabled) { background: rgba(0,242,255,0.18); }

    .rs-time-value { font-size: clamp(4rem, 12vw, 8rem); }
    .rs-stat { padding: 1.5rem 0; padding-right: 1.5rem; margin-right: 1.5rem; }

    .rs-podio { gap: 2.5rem; margin-bottom: 3rem; padding-bottom: 2.5rem; }
    .rs-podio-card { grid-template-columns: 42px 1fr auto; padding: 0.85rem 1rem; }
    .rs-podio-medal { font-size: 1.5rem; }
    .rs-podio-nombre { font-size: 1.05rem; }

    .rs-tabla-section { padding: 0 2rem 6rem; }
    .rs-tabla-search-clear:hover { color: #00f2ff; }
  
    .rs-tbl-head { display: grid; grid-template-columns: 1fr 180px 165px 100px; padding: 0 1rem 0.6rem; border-bottom: 1px solid rgba(255,255,255,0.06); margin-bottom: 3px; }
    .rs-tbl-row { grid-template-columns: 1fr 180px 165px 100px; grid-template-rows: auto; gap: 0; padding: 0.75rem 1rem; border-radius: 3px; }
    .rs-tbl-row:hover { background: rgba(255,255,255,0.025); border-color: rgba(255,255,255,0.06); }
    .rs-tbl-row:hover::before { background: #00f2ff; }
    .rs-tbl-cat-col { display: flex; }
    .rs-tbl-pace { display: block; font-size: 0.78rem; color: rgba(255,255,255,0.28); text-align: right; }
    .rs-tbl-time { grid-row: auto; text-align: right; font-size: 1rem; }
  }

  /* ══════════════════════════════════════════════════════════════
     CERTIFICADO OFF-SCREEN — canvas fijo 1080×1920.
     Fuera del flujo responsive: medidas absolutas en px para que el
     PNG exportado sea idéntico en cualquier dispositivo.
     ══════════════════════════════════════════════════════════════ */
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

  /* Accesibilidad: respeta la preferencia de movimiento reducido */
  @media (prefers-reduced-motion: reduce) {
    .rs-eyebrow-dot, .rs-status-badge.pending, .rs-loader-fill, .rs-map-skeleton { animation: none; }
    .rs-tab, .rs-share-btn, .rs-tbl-row, .rs-search-btn { transition: none; }
  }
`;

/* ────────────────────────────────────────────────────────────── */
/* TABLA ROW                                                      */
/* ────────────────────────────────────────────────────────────── */

/**
 * Podio ABSOLUTO — 1·2·3 masculino y 1·2·3 femenino sobre el total de finishers,
 * ordenados por tiempo neto. Es el único ranking que la tabla expone.
 */
const timeOf = (r: JsonAtleta): number | null =>
  r.sin_tiempo ? null : parseTimeToSeconds(r.tiempo_chip || r.tiempo_neto || r.tiempo_bruto);

const podioDe = (gen: string): JsonAtleta[] =>
  RESULTADOS
    .filter(r => r.genero === gen && timeOf(r) !== null)
    .sort((a, b) => timeOf(a)! - timeOf(b)!)
    .slice(0, 3);

const PODIO_M = podioDe('M');
const PODIO_F = podioDe('F');

/** Lista maestra: tiempo neto ascendente, DNF/DNS al final. */
const RESULTADOS_ORDENADOS: JsonAtleta[] = [...RESULTADOS].sort((a, b) => {
  const ta = timeOf(a), tb = timeOf(b);
  if (ta === null && tb === null) return a.dorsal - b.dorsal;
  if (ta === null) return 1;
  if (tb === null) return -1;
  return ta - tb;
});

/** Ritmo mostrado: usa el del JSON y, si viene vacío, lo deriva del tiempo neto. */
const rowPace = (r: JsonAtleta): string => {
  const p = normalizePace(r.pace);
  if (p) return p;
  const t = timeOf(r);
  return t ? formatPace(t, DIST_KM[r.modalidad]) : '—';
};

/* ────────────────────────────────────────────────────────────── */
/* V4.8 — MOTOR MULTI-EVENTO                                      */
/* Coro conserva sus constantes V4.6 tal cual; WE RUN se construye */
/* con los mismos criterios parametrizados por ClasificacionModo.  */
/* ────────────────────────────────────────────────────────────── */

/**
 * @brief V4.8 — Tiempo oficial (pistola) en segundos. null si el atleta no tiene marca.
 */
const timeOfOficial = (r: JsonAtleta): number | null =>
  r.sin_tiempo ? null : parseTimeToSeconds(r.tiempo_oficial || r.tiempo_bruto || r.tiempo_chip);

/**
 * @brief V4.8 — Tiempo que se muestra en podio y tabla según el criterio del evento.
 *  - 'chip'    → neto (idéntico a V4.6).
 *  - 'oficial' → pistola: la clasificación reglamentaria se hace por tiempo de pistola.
 */
const tiempoMostrado = (r: JsonAtleta, modo: ClasificacionModo): string =>
  modo === 'oficial'
    ? (r.tiempo_oficial || r.tiempo_bruto || r.tiempo_chip)
    : (r.tiempo_chip || r.tiempo_neto || r.tiempo_bruto);

/**
 * @brief V4.8 — Conteo por (modalidad, categoría). Misma regla que CATEGORY_COUNTS:
 *        prioriza `total_categoria` declarado; si viene en 0, cae al conteo real.
 */
const contarCategorias = (lista: JsonAtleta[]): Record<string, number> => {
  const declared: Record<string, number> = {};
  const counted:  Record<string, number> = {};
  for (const r of lista) {
    const k = catKey(r.modalidad, r.categoria);
    counted[k] = (counted[k] ?? 0) + 1;
    if (!declared[k] && r.total_categoria) declared[k] = r.total_categoria;
  }
  const out: Record<string, number> = {};
  for (const k of Object.keys(counted)) out[k] = declared[k] || counted[k];
  return out;
};

/**
 * @brief V4.8 — Podio absoluto 1·2·3 por género.
 *  - 'chip'    → los 3 mejores tiempos netos (regla V4.4).
 *  - 'oficial' → posiciones 1..3 de género publicadas por el cronometraje. Una lectura
 *                de chip anómala no puede colarse en el podio.
 */
const podioLista = (lista: JsonAtleta[], gen: string, modo: ClasificacionModo): JsonAtleta[] => {
  if (modo === 'oficial') {
    return lista
      .filter(r => r.genero === gen && !r.sin_tiempo && r.posicion_genero >= 1 && r.posicion_genero <= 3)
      .sort((a, b) => a.posicion_genero - b.posicion_genero || a.dorsal - b.dorsal)
      .slice(0, 3);
  }
  return lista
    .filter(r => r.genero === gen && timeOf(r) !== null)
    .sort((a, b) => timeOf(a)! - timeOf(b)!)
    .slice(0, 3);
};

/**
 * @brief V4.8 — Lista maestra ordenada. Sin tiempo al final, por dorsal.
 *  - 'chip'    → tiempo neto ascendente (regla V4.3).
 *  - 'oficial' → posición general oficial; desempate por tiempo pistola y dorsal.
 */
const ordenarLista = (lista: JsonAtleta[], modo: ClasificacionModo): JsonAtleta[] => {
  const t = modo === 'oficial' ? timeOfOficial : timeOf;
  return [...lista].sort((a, b) => {
    const ta = t(a), tb = t(b);
    if (ta === null && tb === null) return a.dorsal - b.dorsal;
    if (ta === null) return 1;
    if (tb === null) return -1;
    if (modo === 'oficial') {
      const pa = a.posicion_general > 0 ? a.posicion_general : Number.MAX_SAFE_INTEGER;
      const pb = b.posicion_general > 0 ? b.posicion_general : Number.MAX_SAFE_INTEGER;
      if (pa !== pb) return pa - pb;
    }
    return ta - tb || a.dorsal - b.dorsal;
  });
};

/**
 * @brief V4.8 — Construye el dataset de un evento a partir de su JSON publicado.
 * @param raw  Contenido del JSON (array de JsonAtleta). Cualquier otra cosa → dataset vacío.
 * @param modo Criterio de clasificación del evento.
 */
const construirDataset = (raw: unknown, modo: ClasificacionModo): RaceDataset => {
  const resultados: JsonAtleta[] = (Array.isArray(raw) ? (raw as JsonAtleta[]) : []).map(r => ({
    ...r,
    modalidad: normModalidad(r.modalidad),
  }));
  return {
    resultados,
    published: resultados.length > 0,
    index: new Map<number, JsonAtleta>(resultados.map(r => [r.dorsal, r])),
    categoryCounts: contarCategorias(resultados),
    podioM: podioLista(resultados, 'M', modo),
    podioF: podioLista(resultados, 'F', modo),
    ordenados: ordenarLista(resultados, modo),
  };
};

/** @brief V4.8 — Dataset Coro: referencia directa a las constantes V4.6 (cero recálculo). */
const CORO_DATASET: RaceDataset = {
  resultados: RESULTADOS,
  published: RESULTS_PUBLISHED,
  index: RESULTADOS_INDEX,
  categoryCounts: CATEGORY_COUNTS,
  podioM: PODIO_M,
  podioF: PODIO_F,
  ordenados: RESULTADOS_ORDENADOS,
};

/** @brief V4.8 — Dataset WE RUN RAYOCERO: clasificación oficial del cronometraje. */
const WERUN_DATASET: RaceDataset = construirDataset(RESULTADOS_WERUN_JSON, 'oficial');

/** @brief V4.8 — 499 RUN Coro: todos los valores son los literales V4.6. */
const CORO_CONFIG: RaceConfig = {
  id: 'coro',
  raceId: RACE_ID_CORO,
  nameLong: RACE_NAME_LONG,
  nameShort: RACE_NAME_SHORT,
  date: RACE_DATE,
  city: RACE_CITY,
  distanciasLabel: '10K & 4K',
  certBg: CERT_BG_IMG,
  certLogo: CERT_LOGO_IMG,
  certWatermark: 'RAYOCERO · 499 RUN',
  filePrefix: '499CORO',
  clasificacion: 'chip',
  carreraCerrada: false,
  data: CORO_DATASET,
};

/** @brief V4.8 — WE RUN RAYOCERO 10K · Barquisimeto, Lara. */
const WERUN_CONFIG: RaceConfig = {
  id: 'werun',
  raceId: RACE_ID_WERUN,
  nameLong: WERUN_NAME_LONG,
  nameShort: WERUN_NAME_SHORT,
  date: WERUN_DATE,
  city: WERUN_CITY,
  distanciasLabel: '10K',
  certBg: WERUN_CERT_BG_IMG,
  certLogo: WERUN_CERT_LOGO_IMG,
  certWatermark: 'RAYOCERO · WE RUN',
  filePrefix: 'WERUN10K',
  clasificacion: 'oficial',
  carreraCerrada: true,
  data: WERUN_DATASET,
};

/** @brief V4.8 — Registro de eventos del motor JSON. */
const RACE_CONFIGS: Record<EventoJsonId, RaceConfig> = {
  coro: CORO_CONFIG,
  werun: WERUN_CONFIG,
};

/**
 * @brief V4.8 — Contexto del evento activo. Default = Coro, de modo que cualquier
 *        consumidor montado fuera del provider se comporta exactamente como V4.6.
 */
const RaceCtx = createContext<RaceConfig>(CORO_CONFIG);
const useRace = (): RaceConfig => useContext(RaceCtx);

/** Tarjeta de podio — posición 1..3 dentro de su género. */
const PodioCard = ({ r, pos }: { r: JsonAtleta; pos: number }) => {
  const race = useRace(); // V4.8
  return (
    <div className={`rs-podio-card p${pos}`}>
      <div className="rs-podio-medal">{medalEmoji(pos)}</div>
      <div style={{ minWidth: 0 }}>
        <div className="rs-podio-nombre">{r.nombre_completo}</div>
        <div className="rs-podio-meta">#{bib4(r.dorsal)} · {r.categoria}</div>
      </div>
      <div>
        <div className="rs-podio-time">{tiempoMostrado(r, race.clasificacion)}</div>{/* V4.8 */}
        <div className="rs-podio-pace">{rowPace(r)} MIN/KM</div>
      </div>
    </div>
  );
};

/** Columna de podio por género. */
const PodioCol = ({ titulo, color, atletas }: { titulo: string; color: string; atletas: JsonAtleta[] }) => (
  <div className="rs-podio-col">
    <div className="rs-podio-head">
      <span className="rs-podio-title" style={{ color }}>{titulo}</span>
      <span className="rs-podio-head-line"/>
    </div>
    {atletas.length === 0
      ? <div className="rs-podio-empty">Sin datos</div>
      : atletas.map((r, i) => <PodioCard key={r.dorsal} r={r} pos={i + 1}/>)
    }
  </div>
);

/** Bloque completo: masculino y femenino lado a lado. */
const PodioAbsoluto = () => {
  const race = useRace(); // V4.8 — podio del evento activo
  return (
    <div className="rs-podio">
      <PodioCol titulo="Absoluto masculino" color="rgba(0,242,255,0.55)"  atletas={race.data.podioM}/>
      <PodioCol titulo="Absoluto femenino"  color="rgba(232,121,249,0.6)" atletas={race.data.podioF}/>
    </div>
  );
};

const TablaRow = ({ r }: { r: JsonAtleta }) => {
  const race   = useRace(); // V4.8
  const accent = catColor(r.categoria);
  return (
    <div className="rs-tbl-row">
      <div className="rs-tbl-atleta">
        <div className="rs-tbl-nombre">{r.nombre_completo}</div>
        <div className="rs-tbl-dorsal-lbl">#{bib4(r.dorsal)} · {r.modalidad}</div>
      </div>
      <div className="rs-tbl-cat-col" style={{ display:'flex', alignItems:'center' }}>
        <span className="rs-tbl-cat-badge" style={{ color:accent, borderColor:`${accent}30`, background:`${accent}0d` }}>
          {r.categoria}
        </span>
      </div>
      <div className="rs-tbl-time">{r.sin_tiempo ? 'Sin tiempo' : tiempoMostrado(r, race.clasificacion)}</div>{/* V4.8 */}
      <div className="rs-tbl-pace">{rowPace(r)}</div>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────── */
/* TABLA GENERAL — unificada, sin ranking numérico                */
/* ────────────────────────────────────────────────────────────── */

const TablaGeneral = () => {
  const race                  = useRace(); // V4.8 — evento activo
  const [query, setQuery]     = useState('');
  const [visible, setVisible] = useState(80);
  const loaderRef             = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) setVisible(v => v + 80);
    }, { threshold: 0.1 });
    if (loaderRef.current) obs.observe(loaderRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => { setVisible(80); }, [query]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return race.data.ordenados;                       // V4.8
    return race.data.ordenados.filter(r =>                    // V4.8
      String(r.dorsal).includes(q) ||
      r.nombre_completo.toLowerCase().includes(q) ||
      r.categoria.toLowerCase().includes(q)
    );
  }, [query, race]);

  const shown = useMemo(() => filtered.slice(0, visible), [filtered, visible]);

  if (!race.data.published) {                                 // V4.8
    return (
      <div className="rs-tabla-empty">
        Resultados en procesamiento — la tabla se publica al cierre de la carrera
      </div>
    );
  }

  return (
    <>
      <PodioAbsoluto/>

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

      <div className="rs-tbl-head">
        <span className="rs-th">Atleta</span>
        <span className="rs-th">Categoría</span>
        <span className="rs-th r">{race.clasificacion === 'oficial' ? 'Tiempo oficial' : 'Tiempo chip'}</span>{/* V4.8 */}
        <span className="rs-th r">Ritmo</span>
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

/**
 * @brief Motor de resultados JSON (V4.6 Coro). V4.8: multi-evento vía `config`.
 * @param config Evento a renderizar. Sin prop → 499 RUN Coro, idéntico a V4.7.
 * @note  Montar con `key` distinto por evento para reiniciar todo el estado local.
 */
function ResultsSectionCoroOriginal({ config = CORO_CONFIG }: { config?: RaceConfig }) {
  const race = config;                                        // V4.8 — evento activo
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
   * Búsqueda de dorsal — SCOPED AL EVENTO ACTIVO.
   * 1) JSON publicado (fuente oficial post-carrera).
   * 2) Fallback Supabase con .eq('race_id', race.raceId) → un dorsal de otra carrera nunca resuelve.
   * V4.8: si el evento no tiene race_id (carrera cerrada) no hay llamada de red.
   */
  const handleSearch = useCallback(async () => {
    const bibNum = parseInt(bib.trim());
    if (!bibNum || isNaN(bibNum)) return;
    setLoading(true); setError(null); setRunner(null);
    setRaceResult(null); setJsonAtleta(null); setSearched(true);

    const jsonData = race.data.index.get(bibNum) ?? null;    // V4.8
    setJsonAtleta(jsonData);
    const raceId = race.raceId;                               // V4.8

    try {
      // V4.8 — sin race_id configurado se omite Supabase: el JSON oficial es la única fuente.
      const { data: runnerData, error: runnerErr } = raceId
        ? await supabase
            .from('runners')
            .select('bib_number, nombre, apellido, categoria, genero, modalidad, race_status, finish_time_seconds, start_time, finish_time, split_time_seconds, gps_track')
            .eq('bib_number', bibNum)
            .eq('race_id', raceId)
            .maybeSingle()
        : { data: null, error: null };

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
            // V4.8 — en carrera cerrada, sin tiempo = SIN TIEMPO (no "EN LARGADA")
            race_status: jsonData.sin_tiempo ? (race.carreraCerrada ? 'no_time' : 'waiting') : 'completed',
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
        setError(`DORSAL #${bib4(bibNum)} NO ENCONTRADO EN ${race.nameShort}`); // V4.8
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
      } else if (raceId) {                                    // V4.8 — guard de tipo y de red
        const { data: raceData } = await supabase
          .from('race_results')
          .select('ranking_general, ranking_categoria, velocidad_kmh')
          .eq('bib_number', bibNum)
          .eq('race_id', raceId)
          .maybeSingle();
        if (raceData) setRaceResult(raceData as RaceResult);
      }
    } catch {
      setError('ERROR DE CONEXIÓN — INTENTA NUEVAMENTE');
    } finally {
      setLoading(false);
    }
  }, [bib, race]);

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleSearch(); };

  const handleShare = () => {
    // V4.8 — el enlace incluye el evento para abrir directamente la carrera correcta
    const url = `${window.location.origin}/resultados?evento=${race.id}&bib=${runner?.bib_number}`;
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
        a.download = `${race.filePrefix}_${bib4(runner.bib_number)}_${runner.apellido.replace(/\s/g,'_').toUpperCase()}.png`; // V4.8
        a.href = dataUrl; a.click();
      }
    } finally { setIsExporting(false); }
  }, [runner, renderCert, race]);

  const handlePrintCert = useCallback(async () => {
    if (!runner) return;
    setIsExporting(true);
    try {
      const dataUrl = await renderCert();
      if (dataUrl) {
        const pw = window.open('', '_blank');
        if (pw) {
          pw.document.write(`<!DOCTYPE html><html><head><title>CERTIFICADO ${race.nameShort} #${bib4(runner.bib_number)}</title><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#000;display:flex;justify-content:center;align-items:center;min-height:100vh}img{max-width:100%;max-height:100vh;object-fit:contain}@media print{@page{margin:0;size:portrait}body{background:#fff}img{width:100%;height:100vh;object-fit:contain}}</style></head><body><img src="${dataUrl}" onload="window.print();window.close();"/></body></html>`);
          pw.document.close();
        }
      }
    } finally { setIsExporting(false); }
  }, [runner, renderCert, race]);

  /* ── Derivados ── */
  const modalidad = runner?.modalidad ?? jsonAtleta?.modalidad ?? '10K';
  const distKm    = DIST_KM[modalidad];
  const modColor  = modalidad === '4K' ? '#facc15' : '#00f2ff';

  const status    = runner ? statusLabel(runner.race_status) : null;
  const hasTime   = runner?.finish_time_seconds != null;
  const pace      = hasTime ? formatPace(runner!.finish_time_seconds!, distKm) : null;
  const gpsPoints = runner ? parseGpsTrack(runner.gps_track) : [];
  const paceDisplay = pace ? normalizePace(pace) : normalizePace(jsonAtleta?.pace ?? null);

  /** V4.8 — sin marca de meta en carrera cerrada no se emite certificado. */
  const certDisponible = runner?.race_status !== 'no_time';

  const gunTime  = jsonAtleta?.tiempo_oficial && !jsonAtleta.sin_tiempo
    ? jsonAtleta.tiempo_oficial
    : hasTime ? formatTime(runner!.finish_time_seconds!) : '--:--:--';

  const chipTime = jsonAtleta?.tiempo_chip && !jsonAtleta.sin_tiempo
    ? jsonAtleta.tiempo_chip
    : runner?.split_time_seconds != null
      ? formatTime(runner.split_time_seconds)
      : '--:--:--';

  const totalCat = jsonAtleta?.total_categoria
    || (runner ? getCatTotal(modalidad, runner.categoria, race.data.categoryCounts) : 0); // V4.8
  const posCat   = raceResult?.ranking_categoria ?? jsonAtleta?.posicion_categoria ?? null;

  const velocidad = raceResult?.velocidad_kmh
    ? raceResult.velocidad_kmh.toFixed(1)
    : hasTime ? speedKmh(runner!.finish_time_seconds!, distKm).toFixed(1)
    : jsonAtleta?.velocidad_kmh ? jsonAtleta.velocidad_kmh.toFixed(1)
    : null;

  return (
    <RaceCtx.Provider value={race}>{/* V4.8 — podio y tabla leen el evento activo */}
      <style>{CSS}</style>
      <div className="rs-root">
        <div className="rs-glow-1"/><div className="rs-glow-2"/>

        {/* Header */}
        <div className="rs-header">
          <div className="rs-eyebrow">
            <span className="rs-eyebrow-dot"/>
            <span className="rs-eyebrow-text">{race.nameLong} · {race.distanciasLabel} · {race.date}</span>{/* V4.8 */}
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

              {!race.data.published && (
                <div className="rs-notice">
                  <span className="rs-eyebrow-dot"/>
                  <span className="rs-notice-text">
                    Resultados oficiales en procesamiento. Consulta tu dorsal de {race.nameShort} para ver tu estado en vivo.
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
                        Esta consulta solo cubre dorsales de {race.nameLong}. Verifica el número e intenta de nuevo.
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
                            <span style={{ width:6, height:6, borderRadius:'50%', background: status?.cls === 'finished' ? '#22c55e' : status?.cls === 'notime' ? 'rgba(255,255,255,0.35)' : '#00f2ff', display:'inline-block', animation: status?.cls === 'pending' ? 'rs-blink 1.5s infinite' : 'none' }}/>{/* V4.8: + notime */}
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
                            {certDisponible && (/* V4.8 — certificado solo con marca de meta */
                              <>
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
                              </>
                            )}
                          </div>
                          {!certDisponible && (
                            <div className="rs-notime-note">Sin marca de meta registrada. No se emite certificado.</div>
                          )}
                        </div>
                      </div>

                      {/* Tiempos hero */}
                      <div className="rs-time-hero">
                        <div>
                          <div className="rs-time-label">TIEMPO PISTOLA · {race.nameShort} {modalidad}</div>{/* V4.8 */}
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
                              eventName={`${race.nameLong} · ${modalidad}`}
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
        {/* V4.8: assets, ciudad y watermark salen del evento activo */}
        {/* ═══════════════════════════════════════════════════════ */}
        {runner && certDisponible && (
          <div className="rs-cert-offscreen-wrapper">
            <div ref={certRef} className="rs-cert-canvas">

              {/* Fondo mapa con filtro táctico */}
              <div className="rs-cert-map-bg" style={{ backgroundImage: `url(${race.certBg})` }}/>
              <div className="rs-cert-overlay"/>

              <div className="rs-cert-content">

                {/* Header — logo + tag del evento (sponsors retirados) */}
                <div className="rs-cert-header">
                  <div className="rs-cert-logo">
                    <img src={race.certLogo} alt="RAYOCERO"/>
                  </div>
                  <div className="rs-cert-eventtag">
                    <div className="rs-cert-eventtag-line1">{modalidad}</div>
                    <div className="rs-cert-eventtag-line2">{race.city} · {race.date}</div>
                  </div>
                </div>

                {/* Atleta */}
                <div className="rs-cert-athlete">
                  <div className="rs-cert-athlete-meta">
                    <span style={{ display:'inline-block', width:12, height:12, background:'#00f2ff', borderRadius:'50%' }}/>
                    {race.nameShort} · DORSAL #{bib4(runner.bib_number)}
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
                  <div className="rs-cert-watermark">{race.certWatermark} · {race.city} {race.date}</div>{/* V4.8 */}
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
    </RaceCtx.Provider>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
 * V4.7: CANINATA RESULTS / Por defecto no muestra pruebas al público.
 * Una única llamada de lectura agregada con cadencia de 60 s, sin llamadas
 * por atleta. Los datos proceden de la misma tabla rc_timing_marks.
 * ═══════════════════════════════════════════════════════════════════════ */
type CaninataResultRow = {
  bib: string;
  nombre: string;
  apellido: string;
  modalidad: string;
  categoria: string;
  genero: string;
  distance_km: number | null;
  finish_ms: number | null;
  km5_ms: number | null;
  ranking_general: number | null;
  ranking_categoria: number | null;
};
type CaninataBoard = {published:boolean;session_status:string;rows:CaninataResultRow[]};
const CANINATA_RACE_ID = import.meta.env.VITE_RACE_ID_CANINATA || 'faef662a-8a97-4867-aef2-d91d9b71b937';
const normalizeCaninataBib = (v:string|number) => String(v).trim().replace(/^0+/,'') || '0';
const showCaninataBib = (v:string|number) => String(v).padStart(4,'0');
const caninataTime = (value:number|null) => {
  if (value == null || !Number.isFinite(value) || value < 0) return '—';
  const n=Math.round(value);
  return `${String(Math.floor(n/3600000)).padStart(2,'0')}:${String(Math.floor(n/60000)%60).padStart(2,'0')}:${String(Math.floor(n/1000)%60).padStart(2,'0')}.${String(n%1000).padStart(3,'0')}`;
};
const caninataPace = (r:CaninataResultRow) => {
  if (!r.finish_ms || !r.distance_km) return '—';
  const s=Math.round(r.finish_ms/1000/r.distance_km);
  return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')} min/km`;
};
const caninataSpeed = (r:CaninataResultRow) =>
  r.finish_ms && r.distance_km ? `${(3600000*r.distance_km/r.finish_ms).toFixed(2)} km/h` : '—';
const caninataSort = (a:CaninataResultRow,b:CaninataResultRow) => {
  if (a.finish_ms === null && b.finish_ms === null) return a.bib.localeCompare(b.bib, 'es', {numeric:true});
  if (a.finish_ms === null) return 1;
  if (b.finish_ms === null) return -1;
  return a.finish_ms-b.finish_ms || a.bib.localeCompare(b.bib,'es',{numeric:true});
};

function CaninataResults() {
  const [board,setBoard]=useState<CaninataBoard|null>(null);
  const [boardError,setBoardError]=useState('');
  const [loadingBoard,setLoadingBoard]=useState(false);
  const [bib,setBib]=useState('');
  const [filter,setFilter]=useState('');
  const [selected,setSelected]=useState<CaninataResultRow|null>(null);
  const [section,setSection]=useState<'individual'|'tabla'>('individual');
  const [exporting,setExporting]=useState(false);
  const [downloadError,setDownloadError]=useState('');
  const certRef=useRef<HTMLDivElement|null>(null);
  const loadingRef=useRef(false);

  const refresh=useCallback(async()=>{
    if (loadingRef.current) return;
    loadingRef.current=true; setLoadingBoard(true);
    try {
      const {data,error}=await supabase.rpc('rc_timing_results_board',{p_race_id:CANINATA_RACE_ID});
      if (error) throw error;
      const result=data as CaninataBoard | null;
      if (!result || !Array.isArray(result.rows)) throw new Error('Respuesta de resultados inválida. Verifica la migración de Caninata.');
      const ordered=[...result.rows].sort(caninataSort);
      setBoard({...result,rows:ordered});
      setBoardError('');
      setSelected(old => old ? ordered.find(r=>normalizeCaninataBib(r.bib)===normalizeCaninataBib(old.bib)) || null : null);
    }catch(e){
      setBoardError(e instanceof Error?e.message:'No fue posible cargar los resultados.');
    }finally{ loadingRef.current=false;setLoadingBoard(false); }
  },[]);
  useEffect(()=>{
    void refresh();
    const poll=window.setInterval(()=>{if(!document.hidden)void refresh();},60000);
    return ()=>clearInterval(poll);
  },[refresh]);

  const rows=board?.published ? board.rows : [];
  const sortedRows=useMemo(()=>[...rows].sort(caninataSort),[rows]);
  const finishers=useMemo(()=>sortedRows.filter(r=>r.finish_ms!==null),[sortedRows]);
  const filteredRows=useMemo(()=>{
    const q=filter.toLocaleLowerCase('es').trim();
    if (!q) return sortedRows;
    return sortedRows.filter(r=>[r.bib, r.nombre, r.apellido, r.categoria, r.modalidad].some(x=>x.toLocaleLowerCase('es').includes(q)));
  },[sortedRows,filter]);
  const search=(e:React.FormEvent)=>{
    e.preventDefault();setDownloadError('');
    const n=normalizeCaninataBib(bib);
    if(!/^\d{1,10}$/.test(n)||n==='0'){setSelected(null);setDownloadError('Introduce un dorsal válido.');return;}
    const matching=rows.filter(r=>normalizeCaninataBib(r.bib)===n);
    if(matching.length!==1){setSelected(null);setDownloadError(matching.length>1?'Dorsal duplicado: consulta a Dirección.':'No se encontró el dorsal en los resultados publicados.');return;}
    setSelected(matching[0]);
    setSection('individual');
  };
  const exportCert=async()=>{
    if(!selected||selected.finish_ms===null||exporting||!certRef.current||!board?.published)return;
    setExporting(true);setDownloadError('');
    try{
      await document.fonts.ready;
      // Esperamos a cargar la imagen. HTML-to-image necesita el certificado visible en el DOM.
      const img=certRef.current.querySelector('img');
      if(img&&!img.complete) await new Promise<void>((resolve,reject)=>{
        img.addEventListener('load',()=>resolve(),{once:true});
        img.addEventListener('error',()=>reject(new Error('No cargó la plantilla del certificado.')),{once:true});
      });
      const url=await toPng(certRef.current,{pixelRatio:1,cacheBust:false,backgroundColor:'#fff'});
      const a=document.createElement('a');a.href=url;
      a.download=`CANINATA_${selected.modalidad}_${showCaninataBib(selected.bib)}.png`;
      document.body.appendChild(a);a.click();a.remove();
    }catch(e){setDownloadError(e instanceof Error?e.message:'No se pudo generar el certificado.');}
    finally{setExporting(false);}
  };
  const podium=(modalidad:string)=>finishers.filter(r=>r.modalidad.toUpperCase().trim()===modalidad).slice(0,3);

  return <section className="rcres-page">
    <div className="rcres-shell">
      <header className="rcres-hero">
        <div className="rcres-kicker">RAYOCERO / VALKYRON GROUP · 2026</div>
        <h1>CANINATA <span>RESULTS.</span></h1>
        <p>Caninata 5K y Carrera 10K · Clasificación de meta por tiempo oficial validado.</p>
        <button type="button" className="rcres-refresh" onClick={()=>void refresh()} disabled={loadingBoard}>{loadingBoard?'Actualizando…':'Actualizar resultados ↻'}</button>
      </header>
      <nav className="rcres-tabs" aria-label="Vista de resultados de Caninata">
        <button type="button" className={section==='individual'?'active':''} onClick={()=>setSection('individual')}>Consulta por dorsal</button>
        <button type="button" className={section==='tabla'?'active':''} onClick={()=>setSection('tabla')}>Clasificación general</button>
      </nav>
      {boardError&&<p className="rcres-alert" role="alert">{boardError}. Los resultados de Coro permanecen independientes.</p>}
      {!board?.published&&<div className="rcres-pending"><strong>RESULTADOS AÚN NO PUBLICADOS</strong><p>{board?.session_status==='closed'?'Dirección debe revisar las marcas y autorizar la publicación.':'Los resultados aparecerán después del cierre oficial y la aprobación de Dirección.'}</p></div>}
      {section==='individual'&&<div className="rcres-panel">
        <form className="rcres-form" onSubmit={search}>
          <label htmlFor="rcres-bib">BUSCA TU DORSAL</label>
          <div className="rcres-search"><input id="rcres-bib" type="text" inputMode="numeric" value={bib} placeholder="0001" onChange={e=>setBib(e.target.value)} maxLength={10}/><button type="submit" disabled={!board?.published}>CONSULTAR</button></div>
        </form>
        {downloadError&&<p className="rcres-alert" role="alert">{downloadError}</p>}
        {selected&&board?.published&&<div className="rcres-result">
          <div className="rcres-athlete"><div><small>RESULTADO OFICIAL / {selected.modalidad}</small><h2>{selected.nombre} {selected.apellido}</h2><p>{selected.categoria||'Participante'} · Dorsal #{showCaninataBib(selected.bib)}</p></div><b>#{showCaninataBib(selected.bib)}</b></div>
          <div className="rcres-metrics">
            <div><small>TIEMPO EN META</small><strong>{caninataTime(selected.finish_ms)}</strong></div>
            <div><small>RITMO MEDIO</small><strong>{caninataPace(selected)}</strong></div>
            <div><small>VELOCIDAD MEDIA</small><strong>{caninataSpeed(selected)}</strong></div>
            <div><small>POSICIÓN EN {selected.modalidad}</small><strong>{selected.ranking_general??'—'}</strong></div>
            <div><small>POSICIÓN CATEGORÍA</small><strong>{selected.ranking_categoria??'—'}</strong></div>
            <div><small>PARCIAL KM 5</small><strong>{selected.modalidad==='10K'?caninataTime(selected.km5_ms):'—'}</strong></div>
          </div>
          {selected.finish_ms!==null?<button className="rcres-cert-btn" type="button" onClick={()=>void exportCert()} disabled={exporting}>{exporting?'GENERANDO CERTIFICADO…':'DESCARGAR CERTIFICADO PNG ↓'}</button>:<p className="rcres-note">Este dorsal todavía no tiene una marca de meta validada. No se emite certificado sin tiempo oficial.</p>}
        </div>}
      </div>}
      {section==='tabla'&&board?.published&&<div className="rcres-panel">
        <div className="rcres-podiums">{(['5K','10K'] as const).map(mod=><div className="rcres-podium" key={mod}><h3>PODIO {mod}</h3>{podium(mod).length?podium(mod).map((r,i)=><div className="rcres-podium-row" key={r.bib}><b>{i+1}º</b><span>{r.nombre} {r.apellido}<small>#{showCaninataBib(r.bib)} · {r.categoria}</small></span><strong>{caninataTime(r.finish_ms)}</strong></div>):<p>Sin llegadas aprobadas.</p>}</div>)}</div>
        <label className="rcres-filter">Filtrar corredores<input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Nombre, dorsal, categoría…"/></label>
        <div className="rcres-scroll"><table><thead><tr><th>POS.</th><th>ATLETA</th><th>MOD.</th><th>CATEGORÍA</th><th>TIEMPO</th><th>RITMO</th></tr></thead><tbody>
          {filteredRows.map(r=><tr key={`${r.modalidad}-${r.bib}`} onClick={()=>{setSelected(r);setBib(r.bib);setSection('individual');}}><td>{r.ranking_general??'—'}</td><td><strong>{r.nombre} {r.apellido}</strong><small>#{showCaninataBib(r.bib)}</small></td><td>{r.modalidad}</td><td>{r.categoria||'—'}</td><td>{caninataTime(r.finish_ms)}</td><td>{caninataPace(r)}</td></tr>)}
          {!filteredRows.length&&<tr><td colSpan={6}>Sin corredores para ese filtro.</td></tr>}
        </tbody></table></div>
        <p className="rcres-note">Tiempo de menor a mayor por llegada a meta. Clasificación general separada por distancia (5K/10K). Las marcas pendientes de revisión no se publican.</p>
      </div>}
      <footer className="rcres-footer">RAYOCERO TIMING SYSTEM · POWERED BY VALKYRON GROUP</footer>
    </div>
    {selected&&board?.published&&selected.finish_ms!==null&&<div className="rcres-offscreen" aria-hidden="true">
      <div className="rcres-cert" ref={certRef}>
        <img className="rcres-cert-template" alt="" src={selected.modalidad==='10K'?caninataCert10K:caninataCert5K}/>
        <div className="rcres-cert-name">{selected.nombre} {selected.apellido}</div>
        <div className="rcres-cert-bib">DORSAL #{showCaninataBib(selected.bib)} · {selected.categoria}</div>
        <div className="rcres-cert-value" style={{top:330}}>{selected.modalidad}</div>
        <div className="rcres-cert-value" style={{top:471}}>{caninataPace(selected)}</div>
        <div className="rcres-cert-value" style={{top:606}}>{caninataTime(selected.finish_ms)}</div>
        <div className="rcres-cert-position">POSICIÓN {selected.ranking_general ?? '—'} · {selected.modalidad}</div>
      </div>
    </div>}
    <style>{CANINATA_RESULTS_STYLES}</style>
  </section>;
}

const CANINATA_RESULTS_STYLES = `
.rcres-page{background:#090d0b;color:#f9faf9;min-height:65vh;padding:24px 12px 55px;font-family:Inter,system-ui,sans-serif}
.rcres-page *{box-sizing:border-box}.rcres-shell{max-width:1160px;margin:auto}.rcres-hero{position:relative;padding:clamp(23px,5vw,56px);border:1px solid #ffffff20;background:radial-gradient(circle at 95% 0%,#ff224825,transparent 50%),#151a17;border-radius:24px}
.rcres-kicker{color:#ff5470;letter-spacing:.18em;font-size:10px;font-weight:900}.rcres-hero h1{font-size:clamp(29px,7vw,66px);letter-spacing:-.06em;line-height:1;margin:18px 0}.rcres-hero h1 span{color:#ff355e}.rcres-hero p{color:#ddd9;font-size:13px;line-height:1.6}.rcres-refresh{border:1px solid #ffffff33;border-radius:12px;background:#ffffff0d;color:#fff;padding:11px 14px;cursor:pointer;margin-top:8px}
.rcres-tabs{display:flex;gap:9px;margin:20px 0}.rcres-tabs button{flex:1;background:#1a211d;color:#fff;border:1px solid #ffffff20;padding:14px 8px;border-radius:12px;cursor:pointer;font-weight:800}.rcres-tabs .active{background:#ff3159;color:#fff;border-color:#ff3159}
.rcres-panel{border:1px solid #ffffff21;background:#ffffff09;border-radius:22px;padding:clamp(18px,4vw,33px)}.rcres-pending{border:1px solid #f7bf4b55;background:#f7bf4b13;border-radius:17px;padding:22px;margin-bottom:17px}.rcres-pending strong{font-size:13px;color:#ffda84}.rcres-pending p{font-size:12px;color:#fff9;line-height:1.6;margin:8px 0 0}.rcres-form label,.rcres-filter{display:block;letter-spacing:.12em;color:#ff6a84;font-weight:800;font-size:11px;margin-bottom:13px}.rcres-search{display:flex;gap:10px}.rcres-search input,.rcres-filter input{min-width:0;border:1px solid #ffffff30;background:#ffffff0b;border-radius:12px;color:#fff;padding:14px;font-size:17px}.rcres-search input{flex:1}.rcres-search button,.rcres-cert-btn{border:0;background:#ff3159;border-radius:12px;color:#fff;font-weight:900;padding:14px 22px;cursor:pointer}.rcres-search button:disabled,.rcres-cert-btn:disabled{opacity:.5;cursor:not-allowed}.rcres-alert{background:#ff49621f;border:1px solid #ff496240;border-radius:12px;color:#ffb8c3;padding:13px;margin:12px 0}
.rcres-result{margin-top:20px;border-top:1px solid #ffffff27;padding-top:20px}.rcres-athlete{display:flex;justify-content:space-between;align-items:start;gap:14px;flex-wrap:wrap}.rcres-athlete small{color:#ff5470;font-weight:900;letter-spacing:.08em}.rcres-athlete h2{font-size:clamp(22px,4vw,34px);margin:9px 0 5px}.rcres-athlete p{font-size:12px;color:#fff9}.rcres-athlete>b{font-size:22px;color:#ff5470}.rcres-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:20px 0}.rcres-metrics>div{padding:18px;border:1px solid #ffffff15;background:#ffffff0a;border-radius:14px;min-width:0}.rcres-metrics small{font-size:10px;color:#ff7b92;font-weight:900;letter-spacing:.07em;display:block}.rcres-metrics strong{font-size:clamp(14px,2.4vw,24px);display:block;margin-top:9px;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}.rcres-note{font-size:11px;color:#fffc;line-height:1.6}
.rcres-podiums{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.rcres-podium{border:1px solid #ffffff1f;border-radius:15px;padding:18px;background:#ffffff0a}.rcres-podium h3{margin:0 0 12px;color:#ff6483}.rcres-podium p{color:#fffa;font-size:12px}.rcres-podium-row{display:grid;grid-template-columns:35px minmax(0,1fr) auto;gap:12px;align-items:center;padding:12px 0;border-top:1px solid #ffffff16;font-size:12px}.rcres-podium-row>b{color:#ff3159;font-size:18px}.rcres-podium-row span{min-width:0;overflow-wrap:anywhere}.rcres-podium-row small{display:block;color:#fff8;margin-top:5px}.rcres-podium-row strong{font-variant-numeric:tabular-nums;white-space:nowrap}
.rcres-filter{margin-top:28px}.rcres-filter input{display:block;margin-top:9px;width:100%}.rcres-scroll{max-width:100%;overflow-x:auto}.rcres-scroll table{width:100%;min-width:780px;border-collapse:collapse;text-align:left}.rcres-scroll th,.rcres-scroll td{border-bottom:1px solid #ffffff15;padding:15px 11px}.rcres-scroll th{font-size:10px;color:#ff7b92;letter-spacing:.09em}.rcres-scroll td{font-size:12px}.rcres-scroll td small{display:block;margin-top:5px;color:#fff8}.rcres-scroll tr{cursor:pointer}.rcres-scroll tbody tr:hover{background:#ffffff10}.rcres-footer{text-align:center;color:#fff6;font-size:10px;margin-top:22px;letter-spacing:.07em}
.rcres-offscreen{position:fixed;left:-12000px;top:0;width:1080px;height:1350px;pointer-events:none;z-index:-1}.rcres-cert{width:1080px;height:1350px;position:relative;background:#fff;overflow:hidden;color:#141414;font-family:Inter,Arial,sans-serif}.rcres-cert-template{position:absolute;inset:0;width:1080px;height:1350px;object-fit:fill}.rcres-cert-name{position:absolute;top:183px;left:80px;width:920px;text-align:center;font-size:39px;line-height:1.15;font-weight:900;text-transform:uppercase;overflow-wrap:anywhere}.rcres-cert-bib{position:absolute;top:238px;left:80px;width:920px;text-align:center;font-size:19px;font-weight:850;color:#414141}.rcres-cert-value{position:absolute;left:40px;width:1000px;text-align:center;font-size:42px;font-weight:900;color:#191919;white-space:nowrap}.rcres-cert-position{position:absolute;top:1017px;left:50px;width:980px;text-align:center;font-weight:850;font-size:23px;color:#fe2752}
@media(max-width:750px){.rcres-podiums{grid-template-columns:1fr}.rcres-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:440px){.rcres-search{flex-direction:column}.rcres-search button{min-height:46px}.rcres-metrics{grid-template-columns:1fr}.rcres-tabs button{font-size:11px}.rcres-podium-row{grid-template-columns:30px minmax(0,1fr);}.rcres-podium-row strong{grid-column:2}.rcres-hero h1{overflow-wrap:anywhere}}
@media(prefers-reduced-motion:reduce){.rcres-page *{animation:none!important;transition:none!important}}
`;

/* ═══════════════════════════════════════════════════════════════════════
 * V4.8: CATÁLOGO DE EVENTOS Y SELECTOR INICIAL
 * El orden de EVENTOS define tanto el selector inicial como la navegación.
 * ═══════════════════════════════════════════════════════════════════════ */

/** @brief V4.8 — Identificador de evento consultable. */
type EventoId = 'coro' | 'caninata' | 'werun';

/** @brief V4.8 — Metadatos de presentación de cada evento. */
interface EventoMeta {
  id: EventoId;
  /** Texto del botón de la barra de eventos (V4.7). */
  label: string;
  /** Nombre en la tarjeta del selector inicial. */
  nombre: string;
  lugar: string;
  distancias: string;
}

const EVENTOS: EventoMeta[] = [
  { id: 'coro',     label: '499 RUN · CORO',        nombre: '499 RUN Coro',          lugar: 'Coro, Falcón',       distancias: '10K y 4K' },
  { id: 'caninata', label: 'CANINATA BARQUISIMETO', nombre: 'Caninata Barquisimeto', lugar: 'Barquisimeto, Lara', distancias: '5K y 10K' },
  { id: 'werun',    label: 'WE RUN RAYOCERO',       nombre: 'WE RUN Rayocero',       lugar: 'Barquisimeto, Lara', distancias: '10K' },
];

/** @brief V4.8 — Type guard para el parámetro `?evento=` de la URL. */
const isEventoId = (v: string | null): v is EventoId =>
  v === 'coro' || v === 'caninata' || v === 'werun';

/**
 * Página de resultados única. La sección original 499 RUN Coro V4.6 NO se modifica en su
 * comportamiento: sólo se monta o desmonta según el selector. Este componente conserva export default.
 * V4.8: sin evento explícito en la URL se pregunta primero qué carrera consultar.
 */
export default function ResultsSectionCoro() {
  const getInitialEvent = (): EventoId | null => {
    if (typeof window==='undefined') return null;
    const event=new URLSearchParams(window.location.search).get('evento');
    if (isEventoId(event)) return event;                                   // V4.8 — coro | caninata | werun
    const path=window.location.pathname.toLowerCase();
    if (path.includes('caninata')) return 'caninata';
    if (path.includes('werun') || path.includes('we-run')) return 'werun'; // V4.8
    return null;                                                           // V4.8 — mostrar selector inicial
  };
  const [event,setEvent]=useState<EventoId|null>(getInitialEvent);

  /**
   * @brief V4.8 — Fija el evento y lo refleja en la URL (`?evento=`) sin navegar.
   * @note  Se preserva window.history.state para no romper el índice del router.
   */
  const elegirEvento = useCallback((id: EventoId) => {
    setEvent(id);
    if (typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('evento', id);
      window.history.replaceState(window.history.state, '', url.toString());
    } catch { /* noop — la URL es cosmética, el estado ya cambió */ }
  }, []);

  return <>
    {/* V4.7.1 — El selector de evento se ubica DEBAJO del navbar global,
        sin modificar la navegación principal ni el motor de resultados. */}
    <div className="rcres-layout">
      {event === null ? (
        /* V4.8 — Selector inicial: el usuario elige la carrera antes de ver resultados */
        <section className="rcres-picker" aria-labelledby="rcres-picker-title">
          <p className="rcres-picker-kicker">Resultados oficiales Rayocero</p>
          <h2 id="rcres-picker-title" className="rcres-picker-title">¿Qué carrera quieres consultar?</h2>
          <p className="rcres-picker-sub">Elige el evento para buscar tu dorsal, ver la clasificación general y descargar tu certificado.</p>
          <div className="rcres-picker-grid">
            {EVENTOS.map(ev => (
              <button key={ev.id} type="button" className="rcres-picker-card" onClick={() => elegirEvento(ev.id)}>
                <span className="rcres-picker-dist">{ev.distancias}</span>
                <span className="rcres-picker-name">{ev.nombre}</span>
                <span className="rcres-picker-place">{ev.lugar}</span>
                <span className="rcres-picker-cta">Ver resultados</span>
              </button>
            ))}
          </div>
        </section>
      ) : (
        <>
          <nav className="rcres-event-nav" aria-label="Seleccionar evento de resultados">
            {EVENTOS.map(ev => (/* V4.8 — botones generados desde EVENTOS (+ WE RUN RAYOCERO) */
              <button key={ev.id} type="button" className={event===ev.id?'active':''} aria-current={event===ev.id?'page':undefined} onClick={()=>elegirEvento(ev.id)}>{ev.label}</button>
            ))}
          </nav>
          {event==='caninata'
            ? <CaninataResults/>
            : <ResultsSectionCoroOriginal key={event} config={RACE_CONFIGS[event]}/>}{/* V4.8 — key reinicia estado al cambiar de carrera */}
        </>
      )}
    </div>
    <style>{`
      /* Sólo el contenedor de resultados: no afecta al navbar global. */
      .rcres-layout {
        position: relative;
        min-width: 0;
        padding-top: clamp(125px, 10vw, 160px);
        background: #070b09;
      }
      .rcres-event-nav {
        position: relative;
        display: flex;
        justify-content: center;
        align-items: stretch;
        gap: 12px;
        flex-wrap: wrap;
        width: min(100% - 32px, 1080px);
        margin: 0 auto 24px;
        padding: 12px;
        border: 1px solid rgba(255, 255, 255, .13);
        border-radius: 22px;
        background: rgba(24, 28, 27, .86);
        box-shadow: 0 14px 36px rgba(0, 0, 0, .30);
      }
      .rcres-event-nav button {
        flex: 1 1 230px;
        min-width: 0;
        min-height: 52px;
        padding: 13px 18px;
        border: 1px solid rgba(255, 255, 255, .18);
        border-radius: 14px;
        background: rgba(255, 255, 255, .035);
        color: rgba(255, 255, 255, .8);
        font: 800 12px Inter, system-ui, sans-serif;
        letter-spacing: .065em;
        text-align: center;
        cursor: pointer;
        transition: background .18s ease, border-color .18s ease, color .18s ease;
      }
      .rcres-event-nav button:hover { background: rgba(255, 255, 255, .10); }
      .rcres-event-nav button.active {
        background: #fd325b;
        border-color: #fd325b;
        color: #fff;
        box-shadow: 0 6px 20px rgba(253, 50, 91, .18);
      }
      .rcres-event-nav button:focus-visible {
        outline: 2px solid #fff;
        outline-offset: 3px;
      }

      /* ── V4.8 — SELECTOR INICIAL DE CARRERA (mobile first) ── */
      .rcres-picker {
        width: min(100% - 24px, 1080px);
        margin: 0 auto 56px;
        padding: 28px 18px;
        border: 1px solid rgba(255, 255, 255, .13);
        border-radius: 22px;
        background: rgba(24, 28, 27, .86);
        box-shadow: 0 14px 36px rgba(0, 0, 0, .30);
        color: #f9faf9;
        font-family: Inter, system-ui, sans-serif;
      }
      .rcres-picker-kicker { margin: 0 0 10px; font-size: 13px; font-weight: 700; color: #ff6a84; }
      .rcres-picker-title { margin: 0; font-size: clamp(27px, 7.5vw, 48px); line-height: 1.05; letter-spacing: -.035em; font-weight: 900; color: #fff; }
      .rcres-picker-sub { margin: 12px 0 26px; max-width: 56ch; font-size: 14px; line-height: 1.6; color: rgba(255, 255, 255, .66); }
      .rcres-picker-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
      .rcres-picker-card {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        grid-template-areas: "name dist" "place cta";
        align-items: baseline;
        gap: 6px 14px;
        min-height: 88px;
        padding: 18px;
        border: 1px solid rgba(255, 255, 255, .18);
        border-radius: 14px;
        background: rgba(255, 255, 255, .035);
        color: #fff;
        font: inherit;
        text-align: left;
        cursor: pointer;
        transition: background .18s ease, border-color .18s ease;
      }
      .rcres-picker-name { grid-area: name; min-width: 0; font-size: 19px; font-weight: 900; letter-spacing: -.01em; overflow-wrap: anywhere; }
      .rcres-picker-place { grid-area: place; min-width: 0; font-size: 13px; color: rgba(255, 255, 255, .6); }
      .rcres-picker-dist {
        grid-area: dist;
        justify-self: end;
        padding: 4px 10px;
        border: 1px solid rgba(253, 50, 91, .45);
        border-radius: 999px;
        font-size: 12px;
        font-weight: 800;
        color: #ff8aa0;
        white-space: nowrap;
      }
      .rcres-picker-cta { grid-area: cta; justify-self: end; font-size: 13px; font-weight: 800; color: #fd325b; white-space: nowrap; }
      .rcres-picker-card:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }
      .rcres-picker-card:active { background: rgba(253, 50, 91, .14); border-color: #fd325b; }
      @media (hover: hover) {
        .rcres-picker-card:hover { background: rgba(253, 50, 91, .10); border-color: #fd325b; }
      }
      @media (min-width: 720px) {
        .rcres-picker { padding: 44px; margin-bottom: 72px; }
        .rcres-picker-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
        .rcres-picker-card {
          grid-template-columns: minmax(0, 1fr);
          grid-template-areas: "dist" "name" "place" "cta";
          align-content: start;
          min-height: 200px;
          padding: 22px;
        }
        .rcres-picker-name { font-size: 22px; margin-top: 14px; }
        .rcres-picker-dist { justify-self: start; }
        .rcres-picker-cta { justify-self: start; align-self: end; margin-top: 22px; }
      }

      @media (max-width: 600px) {
        .rcres-layout { padding-top: 118px; }
        .rcres-event-nav { width: calc(100% - 24px); padding: 9px; gap: 8px; margin-bottom: 18px; border-radius: 18px; }
        .rcres-event-nav button { flex: 1 1 100%; min-height: 48px; padding: 12px 10px; font-size: 11px; }
      }
      @media (prefers-reduced-motion: reduce) {
        .rcres-event-nav button { transition: none; }
        .rcres-picker-card { transition: none; }
      }
    `}</style>
  </>;
}
/**
 * RAYO CERO — RESULTS SECTION V14
 * Build: VALKYRON NEW YORK
 * CEO: Lualdo Sciscioli | Valkyron Group
 *
 * EVOLUCIÓN V14:
 * ─ Diseño editorial New York / Nike / Vogue Sports
 * ─ StravaMap SVG eliminado → RouteMapStrava V3 (Leaflet tiles reales)
 * ─ Tipografía agresiva Barlow Condensed italic 900
 * ─ Layout asimétrico con número de dorsal gigante como watermark
 * ─ Stats en layout editorial con líneas divisorias finas
 * ─ Animaciones de entrada por token con stagger
 */

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Clock, Trophy, Zap, Loader2, AlertCircle,
  Medal, Crosshair, CheckCircle, MapPin, Share2, Navigation
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import LazyRouteMapStrava, { type GeoPoint } from "@/components/LazyRouteMapStrava";

/* ─── Types ──────────────────────────────────────────────────── */
interface RunnerResultData {
  name: string;
  firstName: string;
  lastName: string;
  bib: string | number;
  category: string;
  time: string | null;
  rank?: string | number;
  categoryRank?: string | number;
  pace?: string;
  speedKmh?: string;
  gpsTrack?: GeoPoint[];
  distanceKm?: number;
}

/* ─── Helpers ────────────────────────────────────────────────── */
const calcDistanceKm = (points: GeoPoint[]): number => {
  if (points.length < 2) return 0;
  return points.reduce((acc, p, i) => {
    if (i === 0) return 0;
    const prev = points[i - 1];
    const R = 6371;
    const dLat = ((p.lat - prev.lat) * Math.PI) / 180;
    const dLng = ((p.lng - prev.lng) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos((prev.lat * Math.PI) / 180) *
      Math.cos((p.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
    return acc + R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, 0);
};

const calcPace = (distanceKm: number, timeStr: string | null): string => {
  if (!timeStr || distanceKm < 0.01) return '---';
  const parts = timeStr.split(':');
  if (parts.length < 2) return '---';
  const totalSeconds = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2] || '0');
  const paceSecPerKm = totalSeconds / distanceKm;
  const pm = Math.floor(paceSecPerKm / 60);
  const ps = Math.floor(paceSecPerKm % 60);
  return `${pm}:${String(ps).padStart(2, '0')}`;
};

/* ─── CSS ────────────────────────────────────────────────────── */
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

  /* ── Ambient glow ── */
  .rs-glow-1 {
    position: absolute;
    top: -200px; left: 50%;
    transform: translateX(-50%);
    width: 900px; height: 600px;
    background: radial-gradient(ellipse, rgba(0,242,255,0.04) 0%, transparent 70%);
    pointer-events: none;
  }

  .rs-glow-2 {
    position: absolute;
    bottom: 0; right: -200px;
    width: 600px; height: 600px;
    background: radial-gradient(ellipse, rgba(0,100,255,0.03) 0%, transparent 70%);
    pointer-events: none;
  }

  /* ── Section header ── */
  .rs-header {
    padding: 7rem 2rem 4rem;
    max-width: 1100px;
    margin: 0 auto;
    position: relative;
  }

  .rs-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 14px;
    border-radius: 100px;
    background: rgba(0,242,255,0.04);
    border: 1px solid rgba(0,242,255,0.12);
    margin-bottom: 2rem;
  }

  .rs-eyebrow-text {
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 0.4em;
    color: rgba(0,242,255,0.6);
    text-transform: uppercase;
  }

  .rs-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-style: italic;
    font-weight: 900;
    font-size: clamp(72px, 12vw, 130px);
    line-height: 0.85;
    letter-spacing: -0.02em;
    text-transform: uppercase;
    color: #fff;
    margin: 0;
  }

  .rs-title-line2 {
    color: transparent;
    -webkit-text-stroke: 1.5px rgba(255,255,255,0.25);
  }

  /* ── Search ── */
  .rs-search-wrap {
    max-width: 700px;
    margin: 0 auto;
    padding: 0 2rem 5rem;
    position: relative;
  }

  .rs-search-box {
    display: flex;
    align-items: center;
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 4px;
    overflow: hidden;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .rs-search-box:focus-within {
    border-color: rgba(0,242,255,0.3);
    box-shadow: 0 0 0 1px rgba(0,242,255,0.1);
  }

  .rs-search-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    padding: 20px 28px;
    color: #fff;
    font-family: 'Barlow Condensed', sans-serif;
    font-style: italic;
    font-weight: 900;
    font-size: 2.5rem;
    letter-spacing: 0.1em;
    text-align: center;
  }

  .rs-search-input::placeholder {
    color: rgba(255,255,255,0.1);
    letter-spacing: 0.3em;
  }

  .rs-search-btn {
    padding: 20px 32px;
    background: #00f2ff;
    border: none;
    color: #03070b;
    font-family: 'Barlow Condensed', sans-serif;
    font-style: italic;
    font-weight: 900;
    font-size: 0.9rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .rs-search-btn:hover { background: #fff; letter-spacing: 0.25em; }
  .rs-search-btn:active { transform: scaleX(0.98); }
  .rs-search-btn:disabled { opacity: 0.4; cursor: not-allowed; letter-spacing: 0.2em; }

  /* ── Result card ── */
  .rs-card {
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 2rem 6rem;
    position: relative;
  }

  .rs-card-inner {
    position: relative;
    border-top: 1px solid rgba(255,255,255,0.08);
    border-bottom: 1px solid rgba(255,255,255,0.08);
    padding: 4rem 0;
  }

  /* Número de dorsal gigante como watermark */
  .rs-bib-watermark {
    position: absolute;
    top: 50%;
    right: -2rem;
    transform: translateY(-50%);
    font-family: 'Barlow Condensed', sans-serif;
    font-style: italic;
    font-weight: 900;
    font-size: clamp(160px, 25vw, 300px);
    color: transparent;
    -webkit-text-stroke: 1px rgba(0,242,255,0.06);
    line-height: 1;
    pointer-events: none;
    user-select: none;
    letter-spacing: -0.04em;
  }

  /* ── Athlete info ── */
  .rs-athlete-row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 3rem;
    align-items: start;
    margin-bottom: 3rem;
    position: relative;
  }

  .rs-athlete-meta {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.35em;
    color: rgba(0,242,255,0.5);
    text-transform: uppercase;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .rs-athlete-meta-dot {
    width: 3px; height: 3px;
    border-radius: 50%;
    background: rgba(0,242,255,0.3);
  }

  .rs-athlete-name-first {
    font-family: 'Barlow Condensed', sans-serif;
    font-style: italic;
    font-weight: 900;
    font-size: clamp(3rem, 8vw, 6rem);
    line-height: 0.85;
    text-transform: uppercase;
    color: #fff;
    letter-spacing: -0.02em;
  }

  .rs-athlete-name-last {
    font-family: 'Barlow Condensed', sans-serif;
    font-style: italic;
    font-weight: 300;
    font-size: clamp(3rem, 8vw, 6rem);
    line-height: 0.85;
    text-transform: uppercase;
    color: rgba(255,255,255,0.4);
    letter-spacing: -0.02em;
  }

  .rs-status-col {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.75rem;
    padding-top: 1rem;
  }

  .rs-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    border-radius: 3px;
    font-family: 'Barlow Condensed', sans-serif;
    font-style: italic;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    white-space: nowrap;
    transition: all 0.2s;
  }

  .rs-status-badge.finished {
    background: rgba(34,197,94,0.08);
    border: 1px solid rgba(34,197,94,0.25);
    color: #22c55e;
    box-shadow: 0 0 20px rgba(34,197,94,0.08);
  }

  .rs-status-badge.pending {
    background: rgba(0,242,255,0.06);
    border: 1px solid rgba(0,242,255,0.2);
    color: rgba(0,242,255,0.8);
    animation: rs-pending-pulse 2s ease infinite;
  }

  @keyframes rs-pending-pulse {
    0%, 100% { box-shadow: 0 0 0 rgba(0,242,255,0); }
    50% { box-shadow: 0 0 16px rgba(0,242,255,0.15); }
  }

  .rs-share-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background: transparent;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 3px;
    color: rgba(255,255,255,0.4);
    font-family: 'Barlow Condensed', sans-serif;
    font-style: italic;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.2s;
  }

  .rs-share-btn:hover {
    border-color: rgba(0,242,255,0.25);
    color: #00f2ff;
    background: rgba(0,242,255,0.04);
  }

  .rs-share-btn:active { transform: scale(0.97); }

  /* ── Time hero ── */
  .rs-time-hero {
    padding: 3rem 0;
    border-top: 1px solid rgba(255,255,255,0.05);
    border-bottom: 1px solid rgba(255,255,255,0.05);
    margin-bottom: 3rem;
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 2rem;
  }

  .rs-time-label {
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 0.4em;
    color: rgba(255,255,255,0.2);
    text-transform: uppercase;
    margin-bottom: 0.75rem;
  }

  .rs-time-value {
    font-family: 'Barlow Condensed', sans-serif;
    font-style: italic;
    font-weight: 900;
    font-size: clamp(4rem, 12vw, 8rem);
    line-height: 1;
    color: #fff;
    letter-spacing: -0.02em;
  }

  .rs-time-value.has-time { color: #00f2ff; }

  /* ── Stats grid editorial ── */
  .rs-stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0;
    margin-bottom: 3rem;
  }

  @media (max-width: 768px) {
    .rs-header { padding: 4rem 1.25rem 2rem; }
    .rs-title { font-size: clamp(52px, 16vw, 90px); }
    .rs-search-wrap { padding: 0 1.25rem 3rem; }
    .rs-card { padding: 0 1.25rem 4rem; }
    .rs-stats-grid { grid-template-columns: repeat(2, 1fr); gap: 0; }
    .rs-athlete-row { grid-template-columns: 1fr; gap: 1.5rem; }
    .rs-status-col { align-items: flex-start; flex-direction: row; flex-wrap: wrap; }
    .rs-time-hero { grid-template-columns: 1fr; gap: 1.5rem; }
    .rs-bib-watermark { display: none; }
    .rs-card-inner { padding: 2rem 0; }
    .rs-athlete-name-first,
    .rs-athlete-name-last { font-size: clamp(2.5rem, 11vw, 4rem); }
    .rs-time-value { font-size: clamp(3rem, 15vw, 6rem); }
    .rs-search-input { font-size: 2rem; padding: 16px 20px; }
    .rs-search-btn { padding: 16px 20px; font-size: 0.75rem; }
    .rs-stat { padding: 1rem 0; padding-right: 1rem; margin-right: 1rem; }
    .rs-stat-value { font-size: 1.6rem; }
  }

  @media (max-width: 480px) {
    .rs-stats-grid { grid-template-columns: 1fr 1fr; }
    .rs-stat:nth-child(2n) { border-right: none; padding-right: 0; margin-right: 0; }
    .rs-stat:nth-child(2n+1) { border-right: 1px solid rgba(255,255,255,0.05); padding-right: 1rem; margin-right: 1rem; }
  }

  .rs-stat {
    padding: 1.5rem 0;
    border-right: 1px solid rgba(255,255,255,0.05);
    padding-right: 1.5rem;
    margin-right: 1.5rem;
  }

  .rs-stat:last-child {
    border-right: none;
    padding-right: 0;
    margin-right: 0;
  }

  .rs-stat-label {
    font-size: 7px;
    font-weight: 700;
    letter-spacing: 0.3em;
    color: rgba(255,255,255,0.2);
    text-transform: uppercase;
    margin-bottom: 0.5rem;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .rs-stat-value {
    font-family: 'Barlow Condensed', sans-serif;
    font-style: italic;
    font-weight: 900;
    font-size: 2rem;
    color: #fff;
    line-height: 1;
    letter-spacing: -0.01em;
  }

  .rs-stat-value.accent { color: #00f2ff; }

  .rs-stat-unit {
    font-size: 0.7rem;
    color: rgba(255,255,255,0.25);
    font-style: italic;
    font-weight: 400;
    margin-left: 4px;
  }

  /* ── Map section ── */
  .rs-map-section {
    border-top: 1px solid rgba(255,255,255,0.05);
    padding-top: 2rem;
    margin-bottom: 2rem;
  }

  .rs-map-label {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 1rem;
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 0.3em;
    color: rgba(255,255,255,0.2);
    text-transform: uppercase;
  }

  /* ── Error ── */
  .rs-error {
    max-width: 500px;
    margin: 0 auto;
    padding: 2rem;
    border: 1px solid rgba(239,68,68,0.15);
    border-radius: 2px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .rs-error-text {
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.2em;
    color: rgba(239,68,68,0.7);
    text-transform: uppercase;
  }
`;

/* ─── Stagger variants ───────────────────────────────────────── */
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } },
};

/* ─── Main Component ─────────────────────────────────────────── */
const ResultsSection = () => {
  const [bib, setBib] = useState("");
  const [result, setResult] = useState<RunnerResultData | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSearch = async () => {
    const rawBib = bib.trim();
    if (!rawBib) return;
    const numericBib = parseInt(rawBib, 10);
    if (isNaN(numericBib)) { setErrorMsg("Dorsal no válido."); return; }

    setIsSearching(true);
    setResult(null);
    setErrorMsg("");

    try {
      const { data: runner, error: rError } = await supabase
        .from('runners')
        .select('nombre, apellido, bib_number, categoria, gps_track, finish_time_seconds')
        .eq('bib_number', numericBib)
        .maybeSingle();

      if (rError) throw rError;
      if (!runner) throw new Error("Atleta no localizado en el sistema.");

      const { data: race, error: rcError } = await supabase
        .from('race_results')
        .select('tiempo_chip, ranking_general, ranking_categoria, velocidad_kmh')
        .eq('bib_number', numericBib)
        .maybeSingle();

      if (rcError) throw rcError;

      processTelemetry(runner, race);
    } catch (e: any) {
      setErrorMsg(e.message || "Error de telemetría.");
    } finally {
      setIsSearching(false);
    }
  };

  const processTelemetry = (runner: any, race: any) => {
    let formattedTime: string | null = null;

    if (race?.tiempo_chip) {
      const t = race.tiempo_chip;
      if (typeof t === 'object') {
        const h = String(t.hours || 0).padStart(2, '0');
        const m = String(t.minutes || 0).padStart(2, '0');
        const s = String(t.seconds || 0).padStart(2, '0');
        formattedTime = `${h}:${m}:${s}`;
      } else {
        formattedTime = t;
      }
    }

    if (!formattedTime && runner.finish_time_seconds) {
      const secs = runner.finish_time_seconds;
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      const s = (secs % 60).toFixed(2);
      formattedTime = h > 0
        ? `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(parseFloat(s)).padStart(5,'0')}`
        : `${String(m).padStart(2,'0')}:${String(parseFloat(s)).padStart(5,'0')}`;
    }

    const gpsTrack: GeoPoint[] = runner.gps_track ?? [];
    const distanceKm = calcDistanceKm(gpsTrack);
    const pace = distanceKm > 0.01 && formattedTime ? calcPace(distanceKm, formattedTime) : '---';
    const nameParts = `${runner.nombre} ${runner.apellido}`.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    setResult({
      name: `${runner.nombre} ${runner.apellido}`,
      firstName,
      lastName,
      bib: runner.bib_number,
      category: runner.categoria || 'GENERAL',
      time: formattedTime,
      rank: race?.ranking_general ? `${race.ranking_general}` : '---',
      categoryRank: race?.ranking_categoria ? `${race.ranking_categoria}` : '---',
      pace,
      speedKmh: race?.velocidad_kmh ? `${race.velocidad_kmh}` : '---',
      gpsTrack: gpsTrack.length > 1 ? gpsTrack : undefined,
      distanceKm: distanceKm > 0 ? distanceKm : undefined,
    });
  };

  const handleShare = async () => {
    if (!result) return;
    const text = `⚡ Rayo Cero We Run\n🏃 ${result.name} — BIB #${result.bib}\n⏱️ ${result.time}\n🏆 Pos. General: ${result.rank}°\n📍 ${result.distanceKm?.toFixed(2) ?? '---'} km\n\nrayocero-run.vercel.app`;
    if (navigator.share) await navigator.share({ title: 'Mi resultado — Rayo Cero', text });
    else { await navigator.clipboard.writeText(text); alert('Resultado copiado'); }
  };

  return (
    <>
      <style>{CSS}</style>
      <section className="rs-root">
        <div className="rs-glow-1" />
        <div className="rs-glow-2" />

        {/* ── Header ── */}
        <div className="rs-header">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="rs-eyebrow">
              <Crosshair size={10} color="rgba(0,242,255,0.6)" />
              <span className="rs-eyebrow-text">UHF Chip System · Telemetría en vivo</span>
            </div>
            <h2 className="rs-title">
              TIEMPOS<br />
              <span className="rs-title-line2">EN VIVO.</span>
            </h2>
          </motion.div>
        </div>

        {/* ── Search ── */}
        <div className="rs-search-wrap">
          <motion.div
            className="rs-search-box"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <input
              type="text"
              inputMode="numeric"
              placeholder="000"
              value={bib}
              onChange={e => setBib(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="rs-search-input"
            />
            <button
              className="rs-search-btn"
              onClick={handleSearch}
              disabled={isSearching || !bib.trim()}
            >
              {isSearching
                ? <Loader2 size={16} className="animate-spin" />
                : <Search size={16} />
              }
              {isSearching ? 'Validando' : 'Buscar dorsal'}
            </button>
          </motion.div>
        </div>

        {/* ── Results ── */}
        <AnimatePresence mode="wait">
          {result && (
            <motion.div
              key="result"
              className="rs-card"
              variants={container}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, y: -20, transition: { duration: 0.3 } }}
            >
              <div className="rs-card-inner">

                {/* Watermark BIB */}
                <div className="rs-bib-watermark">#{result.bib}</div>

                {/* ── Athlete header ── */}
                <motion.div className="rs-athlete-row" variants={item}>
                  <div>
                    <div className="rs-athlete-meta">
                      <span>Atleta oficial</span>
                      <span className="rs-athlete-meta-dot" />
                      <span>BIB #{result.bib}</span>
                      <span className="rs-athlete-meta-dot" />
                      <span>{result.category}</span>
                    </div>
                    <div className="rs-athlete-name-first">{result.firstName}</div>
                    <div className="rs-athlete-name-last">{result.lastName}</div>
                  </div>

                  <div className="rs-status-col">
                    <div className={`rs-status-badge ${result.time ? 'finished' : 'pending'}`}>
                      {result.time
                        ? <><CheckCircle size={10} /> Carrera finalizada</>
                        : <><Zap size={10} /> En pista</>
                      }
                    </div>
                    <button className="rs-share-btn" onClick={handleShare}>
                      <Share2 size={10} /> Compartir
                    </button>
                  </div>
                </motion.div>

                {/* ── Time hero ── */}
                <motion.div className="rs-time-hero" variants={item}>
                  <div>
                    <div className="rs-time-label">Tiempo neto oficial</div>
                    <div className={`rs-time-value ${result.time ? 'has-time' : ''}`}>
                      {result.time || '--:--:--'}
                    </div>
                  </div>
                  {result.distanceKm && (
                    <div style={{ textAlign: 'right' }}>
                      <div className="rs-time-label">Distancia GPS</div>
                      <div className="rs-time-value" style={{ fontSize: 'clamp(2rem, 6vw, 4rem)' }}>
                        {result.distanceKm.toFixed(2)}
                        <span className="rs-stat-unit">km</span>
                      </div>
                    </div>
                  )}
                </motion.div>

                {/* ── Stats ── */}
                <motion.div className="rs-stats-grid" variants={item}>
                  <div className="rs-stat">
                    <div className="rs-stat-label"><Trophy size={10} /> Pos. General</div>
                    <div className="rs-stat-value accent">{result.rank}°</div>
                  </div>
                  <div className="rs-stat">
                    <div className="rs-stat-label"><Medal size={10} /> Pos. Categoría</div>
                    <div className="rs-stat-value accent">{result.categoryRank}°</div>
                  </div>
                  <div className="rs-stat">
                    <div className="rs-stat-label"><Zap size={10} /> Ritmo</div>
                    <div className="rs-stat-value">
                      {result.pace}
                      {result.pace !== '---' && <span className="rs-stat-unit">/km</span>}
                    </div>
                  </div>
                  <div className="rs-stat">
                    <div className="rs-stat-label"><Navigation size={10} /> Velocidad</div>
                    <div className="rs-stat-value">
                      {result.speedKmh}
                      {result.speedKmh !== '---' && <span className="rs-stat-unit">km/h</span>}
                    </div>
                  </div>
                </motion.div>

                {/* ── Mapa real Leaflet ── */}
                {result.gpsTrack && result.gpsTrack.length > 1 && (
                  <motion.div className="rs-map-section" variants={item}>
                    <div className="rs-map-label">
                      <MapPin size={10} />
                      Ruta GPS — Filtro Kalman activo
                    </div>
                    <LazyRouteMapStrava
                      points={result.gpsTrack}
                      athleteName={result.name}
                      eventName="WE RUN 10K NIGHT FEST 2026"
                      showShareCard={false}
                    />
                  </motion.div>
                )}

              </div>
            </motion.div>
          )}

          {errorMsg && (
            <motion.div
              key="error"
              className="rs-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="rs-error">
                <AlertCircle size={20} color="rgba(239,68,68,0.6)" />
                <div className="rs-error-text">{errorMsg}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </>
  );
};

export default ResultsSection;
/**
 * RAYO CERO — RESULTS MODULE (STABLE V13 - STRAVA STRIKE)
 * Senior Dev: MIA (Valkyron Group)
 * CEO: Lualdo Sciscioli
 *
 * EVOLUCIÓN V13:
 * - GPS TRACK MAP: Renderizado de ruta estilo Strava desde columna gps_track (jsonb).
 * - PACE CALCULATOR: Cálculo de pace real desde distancia GPS + tiempo_chip.
 * - SHARE CARD: Botón para compartir resultado como imagen.
 * - REGLA DE ORO: Código íntegro, evolucionado y blindado sin omitir componentes V12.
 */

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Clock, Trophy, Zap, Loader2, AlertCircle,
  Medal, Crosshair, CheckCircle, MapPin, Share2, Navigation
} from "lucide-react";
import { supabase } from "@/lib/supabase";

/* ─── Types ──────────────────────────────────────────────────── */
interface GeoPoint {
  lat: number;
  lng: number;
  timestamp: number;
  accuracy?: number;
  speed?: number;
}

interface RunnerResultData {
  name: string;
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

/* ─── GPS Distance Calculator ────────────────────────────────── */
const calcDistanceKm = (points: GeoPoint[]): number => {
  if (points.length < 2) return 0;
  return points.reduce((acc, p, i) => {
    if (i === 0) return 0;
    const prev = points[i - 1];
    const R = 6371;
    const dLat = ((p.lat - prev.lat) * Math.PI) / 180;
    const dLng = ((p.lng - prev.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
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
  const totalSeconds =
    parseInt(parts[0]) * 3600 +
    parseInt(parts[1]) * 60 +
    parseFloat(parts[2] || '0');
  const paceSecPerKm = totalSeconds / distanceKm;
  const pm = Math.floor(paceSecPerKm / 60);
  const ps = Math.floor(paceSecPerKm % 60);
  return `${pm}:${String(ps).padStart(2, '0')} /km`;
};

/* ─── Strava Route Map ───────────────────────────────────────── */
const StravaMap = ({ points }: { points: GeoPoint[] }) => {
  if (points.length < 2) return null;

  const W = 700;
  const H = 320;
  const PAD = 48;

  const lats = points.map(p => p.lat);
  const lngs = points.map(p => p.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const rLat = maxLat - minLat || 0.0001;
  const rLng = maxLng - minLng || 0.0001;

  const toXY = (lat: number, lng: number) => ({
    x: PAD + ((lng - minLng) / rLng) * (W - PAD * 2),
    y: H - PAD - ((lat - minLat) / rLat) * (H - PAD * 2),
  });

  const path = points
    .map((p, i) => {
      const { x, y } = toXY(p.lat, p.lng);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const start = toXY(points[0].lat, points[0].lng);
  const end = toXY(points[points.length - 1].lat, points[points.length - 1].lng);

  // Color gradient por velocidad (si existe)
  const hasSpeed = points.some(p => p.speed !== undefined && p.speed !== null);

  // Segmentos con color por velocidad
  const segments = hasSpeed
    ? points.slice(1).map((p, i) => {
        const prev = points[i];
        const { x: x1, y: y1 } = toXY(prev.lat, prev.lng);
        const { x: x2, y: y2 } = toXY(p.lat, p.lng);
        const spd = (p.speed ?? 0) * 3.6; // m/s → km/h
        const hue = Math.min(120, Math.max(0, spd * 4)); // 0=rojo, 120=verde
        return { x1, y1, x2, y2, color: `hsl(${hue}, 80%, 55%)` };
      })
    : null;

  return (
    <div style={{
      borderRadius: 24,
      overflow: 'hidden',
      border: '1px solid rgba(0,242,255,0.1)',
      background: 'rgba(0,0,0,0.5)',
      position: 'relative',
      marginBottom: 8,
    }}>
      {/* Header del mapa */}
      <div style={{
        position: 'absolute', top: 12, left: 16, zIndex: 10,
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
        borderRadius: 8, padding: '4px 10px',
        border: '1px solid rgba(255,255,255,0.05)',
      }}>
        <Navigation size={10} color="#00f2ff" />
        <span style={{ fontSize: 9, letterSpacing: '0.2em', color: 'rgba(0,242,255,0.7)', fontFamily: 'monospace', textTransform: 'uppercase', fontWeight: 700 }}>
          Ruta GPS · {points.length} pts
        </span>
      </div>

      {hasSpeed && (
        <div style={{
          position: 'absolute', top: 12, right: 16, zIndex: 10,
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
          borderRadius: 8, padding: '4px 10px',
          border: '1px solid rgba(255,255,255,0.05)',
        }}>
          <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>LENTO</span>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'linear-gradient(90deg, #ef4444, #22c55e)' }} />
          <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>RÁPIDO</span>
        </div>
      )}

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <defs>
          <linearGradient id="stravaGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00f2ff" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#00f2ff" stopOpacity="1" />
            <stop offset="100%" stopColor="#7B2CBF" stopOpacity="0.8" />
          </linearGradient>
          <filter id="glow1">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glow2">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map(t => (
          <line key={t}
            x1={PAD} y1={PAD + t * (H - PAD * 2)}
            x2={W - PAD} y2={PAD + t * (H - PAD * 2)}
            stroke="rgba(255,255,255,0.03)" strokeWidth="1"
          />
        ))}

        {/* Glow shadow track */}
        <path d={path} fill="none" stroke="rgba(0,242,255,0.15)" strokeWidth="12"
          strokeLinecap="round" strokeLinejoin="round" />

        {/* Segmentos por velocidad O track uniforme */}
        {segments ? (
          segments.map((seg, i) => (
            <line key={i}
              x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2}
              stroke={seg.color} strokeWidth="3"
              strokeLinecap="round"
              filter="url(#glow1)"
            />
          ))
        ) : (
          <path d={path} fill="none" stroke="url(#stravaGrad)"
            strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
            filter="url(#glow1)" />
        )}

        {/* Start dot */}
        <circle cx={start.x} cy={start.y} r={10} fill="rgba(34,197,94,0.2)" filter="url(#glow2)" />
        <circle cx={start.x} cy={start.y} r={6} fill="#22c55e" />
        <circle cx={start.x} cy={start.y} r={3} fill="white" />

        {/* Finish dot */}
        <circle cx={end.x} cy={end.y} r={10} fill="rgba(0,242,255,0.2)" filter="url(#glow2)" />
        <circle cx={end.x} cy={end.y} r={6} fill="#00f2ff" />
        <circle cx={end.x} cy={end.y} r={3} fill="white" />

        {/* Labels */}
        <text x={start.x + 14} y={start.y + 4}
          fill="#22c55e" fontSize="9" fontFamily="monospace" fontWeight="bold">
          INICIO
        </text>
        <text x={end.x + 14} y={end.y + 4}
          fill="#00f2ff" fontSize="9" fontFamily="monospace" fontWeight="bold">
          META
        </text>
      </svg>
    </div>
  );
};

/* ─── Main Component ─────────────────────────────────────────── */
const ResultsSection = () => {
  const [bib, setBib] = useState("");
  const [result, setResult] = useState<RunnerResultData | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);

  const handleSearch = async () => {
    const rawBib = bib.trim();
    if (!rawBib) return;
    const numericBib = parseInt(rawBib, 10);
    if (isNaN(numericBib)) { setErrorMsg("Dorsal no válido."); return; }

    setIsSearching(true);
    setResult(null);
    setErrorMsg("");

    try {
      // Uplink Alfa — datos del corredor + GPS track
      const { data: runner, error: rError } = await supabase
        .from('runners')
        .select('nombre, apellido, bib_number, categoria, gps_track, finish_time_seconds')
        .eq('bib_number', numericBib)
        .maybeSingle();

      if (rError) throw rError;
      if (!runner) throw new Error("Atleta no localizado en el sistema.");

      // Uplink Beta — resultados de carrera
      const { data: race, error: rcError } = await supabase
        .from('race_results')
        .select('tiempo_chip, ranking_general, ranking_categoria, velocidad_kmh')
        .eq('bib_number', numericBib)
        .maybeSingle();

      if (rcError) throw rcError;

      processTelemetry(runner, race);
    } catch (e: any) {
      console.error('[MIA V13 CRITICAL]', e.message);
      setErrorMsg(e.message || "Error de telemetría.");
    } finally {
      setIsSearching(false);
    }
  };

  const processTelemetry = (runner: any, race: any) => {
    // Formatear tiempo
    let formattedTime: string | null = null;

    // Primero intentar desde race_results
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

    // Fallback: finish_time_seconds de runners
    if (!formattedTime && runner.finish_time_seconds) {
      const secs = runner.finish_time_seconds;
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      const s = (secs % 60).toFixed(2);
      formattedTime = h > 0
        ? `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(parseFloat(s)).padStart(5,'0')}`
        : `${String(m).padStart(2,'0')}:${String(parseFloat(s)).padStart(5,'0')}`;
    }

    // GPS Track
    const gpsTrack: GeoPoint[] = runner.gps_track ?? [];
    const distanceKm = calcDistanceKm(gpsTrack);

    // Pace desde GPS real o velocidad de race_results
    let pace = '---';
    if (distanceKm > 0.01 && formattedTime) {
      pace = calcPace(distanceKm, formattedTime);
    }

    const stats: RunnerResultData = {
      name: `${runner.nombre} ${runner.apellido}`,
      bib: runner.bib_number,
      category: runner.categoria || 'GENERAL',
      time: formattedTime,
      rank: race?.ranking_general ? `${race.ranking_general}°` : '---',
      categoryRank: race?.ranking_categoria ? `${race.ranking_categoria}°` : '---',
      pace,
      speedKmh: race?.velocidad_kmh ? `${race.velocidad_kmh} km/h` : '---',
      gpsTrack: gpsTrack.length > 1 ? gpsTrack : undefined,
      distanceKm: distanceKm > 0 ? distanceKm : undefined,
    };

    setResult(stats);
  };

  const handleShare = async () => {
    if (!result) return;
    const text = `⚡ Rayo Cero We Run\n🏃 ${result.name} — BIB #${result.bib}\n⏱️ ${result.time}\n🏆 Pos. General: ${result.rank}\n📍 ${result.distanceKm?.toFixed(2) ?? '---'} km\n\nrayocero-run.vercel.app`;
    if (navigator.share) {
      await navigator.share({ title: 'Mi resultado — Rayo Cero', text });
    } else {
      await navigator.clipboard.writeText(text);
      alert('Resultado copiado al portapapeles');
    }
  };

  return (
    <section className="relative min-h-screen pt-32 pb-24 px-6 bg-[#03070b] font-sans overflow-hidden">
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-4xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Header */}
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/5 backdrop-blur-md mb-6"
            >
              <Crosshair className="h-3 w-3 text-cyan-400" />
              <span className="text-[9px] font-black tracking-[0.4em] text-white/60 uppercase">
                UHF Chip System Verification
              </span>
            </motion.div>
            <h2 className="text-5xl md:text-[5rem] font-black text-white mb-4 tracking-tighter italic uppercase leading-[0.85] drop-shadow-2xl">
              TIEMPOS EN <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-white">VIVO.</span>
            </h2>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto mb-16">
            <div className="flex items-center w-full bg-white/[0.02] border border-white/10 rounded-full p-2 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all focus-within:border-cyan-400/50 focus-within:bg-white/[0.04] focus-within:shadow-[0_0_30px_rgba(0,242,255,0.1)]">
              <input
                type="text"
                inputMode="numeric"
                placeholder="Nº DE DORSAL"
                value={bib}
                onChange={(e) => setBib(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="flex-grow w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 py-3 md:py-4 px-6 md:px-8 text-2xl md:text-3xl font-black text-white placeholder:text-white/20 tracking-[0.2em] text-center md:text-left"
              />
              <button
                onClick={handleSearch}
                disabled={isSearching || !bib.trim()}
                className="shrink-0 bg-cyan-500 hover:bg-cyan-400 text-black py-4 md:py-5 px-8 md:px-12 rounded-full font-black text-[10px] md:text-xs tracking-[0.2em] uppercase flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,242,255,0.15)] active:scale-95"
              >
                {isSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                <span className="hidden md:inline">{isSearching ? "VALIDANDO" : "BUSCAR"}</span>
              </button>
            </div>
          </div>

          {/* Results */}
          <AnimatePresence mode="wait">
            {result && (
              <motion.div
                ref={cardRef}
                key="result-card"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ duration: 0.4, ease: "circOut" }}
                className="bg-white/[0.02] border border-white/10 rounded-[3rem] p-8 md:p-12 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                  <Trophy className="h-48 w-48 text-white" />
                </div>

                {/* Runner header */}
                <div className="flex flex-col md:flex-row justify-between gap-8 mb-10 relative z-10 border-b border-white/5 pb-8">
                  <div>
                    <span className="text-[9px] font-black text-cyan-400 tracking-[0.3em] uppercase bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
                      Atleta Oficial
                    </span>
                    <h3 className="text-4xl md:text-5xl font-black text-white italic uppercase mt-4 tracking-tighter leading-none">
                      {result.name}
                    </h3>
                    <p className="text-white/50 text-[10px] font-black mt-3 tracking-widest uppercase">
                      {result.category} <span className="text-white/20 mx-2">|</span> DORSAL #{result.bib}
                      {result.distanceKm && (
                        <><span className="text-white/20 mx-2">|</span>
                        <MapPin className="inline h-3 w-3 mr-1" />
                        {result.distanceKm.toFixed(2)} KM</>
                      )}
                    </p>
                  </div>

                  <div className="flex flex-col items-start md:items-end justify-center gap-3">
                    {result.time ? (
                      <div className="px-6 py-3 rounded-full text-[10px] font-black tracking-[0.3em] uppercase border bg-emerald-500/10 border-emerald-500/20 text-emerald-400 flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                        <CheckCircle className="h-3 w-3" /> CARRERA FINALIZADA
                      </div>
                    ) : (
                      <div className="px-6 py-3 rounded-full text-[10px] font-black tracking-[0.3em] uppercase border bg-cyan-500/10 border-cyan-500/20 text-cyan-400 flex items-center gap-2 animate-pulse shadow-[0_0_15px_rgba(0,242,255,0.1)]">
                        <Zap className="h-3 w-3" /> EN PISTA / ESPERANDO TIEMPO
                      </div>
                    )}
                    {/* Share button */}
                    <button
                      onClick={handleShare}
                      className="px-4 py-2 rounded-full text-[9px] font-black tracking-[0.2em] uppercase border border-white/10 text-white/40 hover:text-white hover:border-white/20 flex items-center gap-2 transition-all"
                    >
                      <Share2 className="h-3 w-3" /> Compartir
                    </button>
                  </div>
                </div>

                {/* ── MAPA GPS STRAVA ── */}
                {result.gpsTrack && result.gpsTrack.length > 1 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mb-10 relative z-10"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <MapPin className="h-3 w-3 text-cyan-400" />
                      <span className="text-[9px] font-black tracking-[0.3em] text-white/40 uppercase">
                        Ruta GPS — Filtro Kalman activo
                      </span>
                    </div>
                    <StravaMap points={result.gpsTrack} />
                  </motion.div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
                  {/* Tiempo */}
                  <div className="p-6 bg-white/[0.03] border border-white/5 rounded-[1.5rem] hover:border-cyan-500/30 transition-colors group lg:col-span-2">
                    <div className="flex items-center gap-3 mb-3 text-white/30 group-hover:text-cyan-400 transition-colors">
                      <Clock className="h-4 w-4" />
                      <span className="text-[9px] font-black uppercase tracking-[0.2em]">Tiempo Neto</span>
                    </div>
                    <p className="text-4xl md:text-5xl font-black text-white italic tracking-tighter leading-none">
                      {result.time || '--:--:--'}
                    </p>
                  </div>

                  {/* Ranking general */}
                  <div className="p-6 bg-white/[0.03] border border-white/5 rounded-[1.5rem] hover:border-cyan-500/30 transition-colors group">
                    <div className="flex items-center gap-3 mb-3 text-white/30 group-hover:text-cyan-400 transition-colors">
                      <Trophy className="h-4 w-4" />
                      <span className="text-[9px] font-black uppercase tracking-[0.2em]">Pos. General</span>
                    </div>
                    <p className="text-4xl font-black text-cyan-400 italic tracking-tighter leading-none">
                      {result.rank}
                    </p>
                  </div>

                  {/* Ranking categoría */}
                  <div className="p-6 bg-white/[0.03] border border-white/5 rounded-[1.5rem] hover:border-cyan-500/30 transition-colors group">
                    <div className="flex items-center gap-3 mb-3 text-white/30 group-hover:text-cyan-400 transition-colors">
                      <Medal className="h-4 w-4" />
                      <span className="text-[9px] font-black uppercase tracking-[0.2em]">Pos. Categoría</span>
                    </div>
                    <p className="text-4xl font-black text-cyan-400 italic tracking-tighter leading-none">
                      {result.categoryRank}
                    </p>
                  </div>

                  {/* Pace */}
                  <div className="p-6 bg-white/[0.03] border border-white/5 rounded-[1.5rem] hover:border-cyan-500/30 transition-colors group">
                    <div className="flex items-center gap-3 mb-3 text-white/30 group-hover:text-cyan-400 transition-colors">
                      <Zap className="h-4 w-4" />
                      <span className="text-[9px] font-black uppercase tracking-[0.2em]">Ritmo</span>
                    </div>
                    <p className="text-2xl font-black text-white italic tracking-tighter leading-none">
                      {result.pace}
                    </p>
                  </div>

                  {/* Velocidad */}
                  <div className="p-6 bg-white/[0.03] border border-white/5 rounded-[1.5rem] hover:border-cyan-500/30 transition-colors group">
                    <div className="flex items-center gap-3 mb-3 text-white/30 group-hover:text-cyan-400 transition-colors">
                      <Navigation className="h-4 w-4" />
                      <span className="text-[9px] font-black uppercase tracking-[0.2em]">Velocidad</span>
                    </div>
                    <p className="text-2xl font-black text-white italic tracking-tighter leading-none">
                      {result.speedKmh}
                    </p>
                  </div>

                  {/* Distancia */}
                  {result.distanceKm && (
                    <div className="p-6 bg-white/[0.03] border border-white/5 rounded-[1.5rem] hover:border-cyan-500/30 transition-colors group">
                      <div className="flex items-center gap-3 mb-3 text-white/30 group-hover:text-cyan-400 transition-colors">
                        <MapPin className="h-4 w-4" />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em]">Distancia GPS</span>
                      </div>
                      <p className="text-2xl font-black text-white italic tracking-tighter leading-none">
                        {result.distanceKm.toFixed(2)} km
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {errorMsg && (
              <motion.div
                key="error-msg"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl max-w-xl mx-auto text-center flex flex-col items-center justify-center gap-3 backdrop-blur-md"
              >
                <AlertCircle className="h-6 w-6 text-red-400" />
                <span className="font-black text-[10px] tracking-[0.2em] text-red-400 uppercase leading-relaxed">
                  {errorMsg}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
};

export default ResultsSection;
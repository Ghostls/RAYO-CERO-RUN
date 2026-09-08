/**
 * RAYO CERO — RACE CALENDAR (EVOLUTION V10.9 — PRECIO CANINATA REMOVED)
 * Senior Dev: MIA (Valkyron Group)
 * CEO: Lualdo Sciscioli
 * REGLA DE ORO: Evolución sin Destrucción. Código completo. Copy-paste ready.
 *
 * CHANGELOG V10.9 (evoluciona sobre V10.8):
 * [V10.9-1] Eliminado item Tag "10K CANINATA - $25 (INCLUYE PERRO)" del array
 *           de info rows — precio manejado exclusivamente en RegistrationForm.
 *           Import Tag eliminado de lucide-react (ya no se referencia).
 * [V10.9-2] Fecha caninata viene de Supabase (race.date) — actualizar a
 *           2026-10-18 directamente en la tabla races de la BD.
 *
 * CHANGELOG V10.8 (base intacta):
 * [V10.8-1] Header LED hero: opacity 20→10, gradientes reforzados.
 * CHANGELOG V10.7 (base intacta):
 * [V10.7-1] cfg.isComingSoon: ambos botones disabled sin Link.
 * CHANGELOG V10.6 (base intacta):
 * [V10.6-1..4] CTAs próximamente/completada, countdown, fecha chip.
 * CHANGELOG V10.5 (base intacta):
 * [V10.5-1..6] LED Run import, matcher, asset routing, header hero.
 * CHANGELOG V10.4 (base intacta):
 * [V10.4-1..4] inscripciones_cerradas_definitivo.
 * CHANGELOG V10.3 (base intacta):
 * [V10.3-1..3] Caninata override.
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  MapPin, Calendar, Clock, Info, Zap, Loader2,
  Trophy, CheckCircle2, Compass, Dog, XCircle
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { INSCRIPCIONES_ABIERTAS } from "@/lib/registrationConfig";

// ── IMÁGENES LOCALES ─────────────────────────────────────────────────────────
import portada499Agosto          from "@/assets/PORTADA_499.png";
import flyerOctubreInscripciones from "@/assets/flyer-coro-inscripciones.png";
import flyerCaninataBanner       from "@/assets/flyer-caninata.png";
import ledRunHero                from "@/assets/led-run-hero.png";

const DEFAULT_IMAGE = flyerCaninataBanner;

/* ─────────────────────────────────────────────────────────────────────────── */
/* HELPERS                                                                     */
/* ─────────────────────────────────────────────────────────────────────────── */
const isCaninataRace = (name: string = ""): boolean =>
  name.toLowerCase().includes("caninata");

const isCoroRace = (name: string = ""): boolean => {
  const n = name.toLowerCase();
  return n.includes("coro") || n.includes("499") || n.includes("falcón") || n.includes("falcon");
};

const isLedRunRace = (name: string = ""): boolean =>
  name.toLowerCase().includes("led");

/* ─────────────────────────────────────────────────────────────────────────── */
/* IMAGEN                                                                      */
/* ─────────────────────────────────────────────────────────────────────────── */
const getRaceImage = (name: string = "", fallbackUrl?: string): string => {
  const n = name.toLowerCase();
  if (n.includes("caninata")) return flyerCaninataBanner || fallbackUrl || DEFAULT_IMAGE;
  if (n.includes("led"))      return ledRunHero;
  if (n.includes("499") || n.includes("agosto")) return portada499Agosto;
  if (n.includes("coro") || n.includes("falcón") || n.includes("falcon") || n.includes("octubre"))
    return flyerOctubreInscripciones;
  return fallbackUrl || DEFAULT_IMAGE;
};

/* ─────────────────────────────────────────────────────────────────────────── */
/* REGIÓN TAG                                                                  */
/* ─────────────────────────────────────────────────────────────────────────── */
const getRegionTag = (
  location: string = "",
  name: string = ""
): { label: string; color: string; icon?: "dog" } | null => {
  const l = location.toLowerCase();
  const n = name.toLowerCase();
  if (n.includes("caninata"))
    return { label: "CANINATA 10K", color: "#FDD454", icon: "dog" };
  if (n.includes("led"))
    return { label: "FALCÓN", color: "#FCD34D" };
  if (l.includes("barquisimeto") || l.includes("lara"))
    return { label: "LARA", color: "#00f2ff" };
  if (l.includes("coro") || l.includes("falcón") || l.includes("falcon"))
    return { label: "FALCÓN", color: "#FCD34D" };
  return null;
};

/* ─────────────────────────────────────────────────────────────────────────── */
/* COUNTDOWN                                                                   */
/* ─────────────────────────────────────────────────────────────────────────── */
const useCountdown = (targetDate: string) => {
  const [remaining, setRemaining] = useState<{ days: number; hours: number } | null>(null);

  useEffect(() => {
    if (!targetDate) return;
    const target = new Date(targetDate + "T00:00:00").getTime();
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) { setRemaining(null); return; }
      const days  = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      setRemaining({ days, hours });
    };
    tick();
    const interval = setInterval(tick, 60 * 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return remaining;
};

/* ─────────────────────────────────────────────────────────────────────────── */
/* STATUS CONFIG                                                               */
/* ─────────────────────────────────────────────────────────────────────────── */
type StatusKey =
  | "completada"
  | "inscripciones_abiertas"
  | "inscripciones_cerradas"
  | "proximamente"
  | "default";

const getStatusConfig = (
  rawStatus: string,
  inscripcionesAbiertas: boolean,
  isCaninata: boolean = false,
  raceName: string = "",
) => {
  const s = rawStatus?.toLowerCase().trim() ?? "";

  if (isCaninata && s !== "completada" && s !== "completed") {
    return {
      key: "inscripciones_abiertas" as StatusKey,
      label: "Inscripciones Abiertas",
      badgeClass: "bg-[#FDD454]/10 border-[#FDD454]/30 text-[#FDD454] shadow-[0_0_15px_rgba(253,212,84,0.2)]",
      dotColor: "bg-[#FDD454]",
      isCompleted: false, isClosed: false, isComingSoon: false, isDefinitivelyClosed: false,
    };
  }

  if (s === "completada" || s === "completed") {
    return {
      key: "completada" as StatusKey,
      label: "Completada",
      badgeClass: "bg-amber-500/10 border-amber-400/30 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.15)]",
      dotColor: "bg-amber-400",
      isCompleted: true, isClosed: false, isComingSoon: false, isDefinitivelyClosed: false,
    };
  }

  if (s === "próximamente" || s === "proximamente") {
    return {
      key: "proximamente" as StatusKey,
      label: "Próximamente",
      badgeClass: "bg-white/5 border-white/10 text-white/50",
      dotColor: null,
      isCompleted: false, isClosed: false, isComingSoon: true, isDefinitivelyClosed: false,
    };
  }

  if (!inscripcionesAbiertas) {
    const isCoro = isCoroRace(raceName);
    return {
      key: "inscripciones_cerradas" as StatusKey,
      label: "Inscripciones Cerradas",
      badgeClass: "bg-red-500/10 border-red-500/25 text-red-400 shadow-[0_0_12px_rgba(255,60,60,0.15)]",
      dotColor: "bg-red-400",
      isCompleted: false, isClosed: true, isComingSoon: false, isDefinitivelyClosed: isCoro,
    };
  }

  return {
    key: "inscripciones_abiertas" as StatusKey,
    label: "Inscripciones Abiertas",
    badgeClass: "bg-cyan-500/10 border-cyan-400/30 text-cyan-400 shadow-[0_0_15px_rgba(0,242,255,0.2)]",
    dotColor: "bg-cyan-400",
    isCompleted: false, isClosed: false, isComingSoon: false, isDefinitivelyClosed: false,
  };
};

/* ─────────────────────────────────────────────────────────────────────────── */
/* CARD IMAGE SLIDER                                                           */
/* ─────────────────────────────────────────────────────────────────────────── */
const CardImageSlider = ({
  image, alt, status, region, isCaninata, raceName,
}: {
  image: string;
  alt: string;
  status: string;
  region: { label: string; color: string; icon?: "dog" } | null;
  isCaninata: boolean;
  raceName: string;
}) => {
  const cfg = getStatusConfig(status, INSCRIPCIONES_ABIERTAS, isCaninata, raceName);

  return (
    <div className="relative h-72 w-full overflow-hidden bg-[#03070b] rounded-t-[2.5rem]">
      <motion.img
        src={image || DEFAULT_IMAGE}
        alt={alt}
        initial={{ opacity: 0.8, scale: 1.05 }}
        animate={{
          opacity: cfg.isCompleted ? 0.35 : cfg.isComingSoon ? 0.5 : 0.85,
          scale: 1,
        }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ${
          cfg.isCompleted
            ? "grayscale-[0.6]"
            : cfg.isComingSoon
            ? "grayscale-[0.3]"
            : "group-hover:scale-105 group-hover:opacity-100"
        }`}
        onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_IMAGE; }}
      />

      <div className={`absolute inset-0 bg-gradient-to-t ${
        isCaninata
          ? "from-[#050801] via-[#050801]/40 to-transparent"
          : "from-[#03070b] via-[#03070b]/40 to-transparent"
      }`} />

      {/* Badge de estado */}
      <div className="absolute top-6 left-6 z-20">
        <span className={`text-[8px] font-black uppercase tracking-[0.3em] px-4 py-2 rounded-full border backdrop-blur-md shadow-lg flex items-center gap-1.5 ${cfg.badgeClass}`}>
          {cfg.dotColor && !cfg.isCompleted && !cfg.isClosed && !cfg.isComingSoon && (
            <motion.span
              className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor} inline-block`}
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
          {cfg.isCompleted && <CheckCircle2 className="h-3 w-3" />}
          {cfg.isClosed && !cfg.isCompleted && <XCircle className="h-3 w-3" />}
          {cfg.label}
        </span>
      </div>

      {region && (
        <div className="absolute top-6 right-6 z-20">
          <span
            className="text-[8px] font-black uppercase tracking-[0.3em] px-3 py-2 rounded-full border backdrop-blur-md flex items-center gap-1.5"
            style={{
              background:  `${region.color}14`,
              borderColor: `${region.color}40`,
              color:       region.color,
            }}
          >
            {region.icon === "dog"
              ? <Dog className="h-3 w-3" />
              : <Compass className="h-3 w-3" />
            }
            {region.label}
          </span>
        </div>
      )}

      {cfg.isCompleted && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <Trophy className="h-16 w-16 text-amber-400/20" strokeWidth={1} />
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────── */
/* COUNTDOWN CHIP                                                              */
/* ─────────────────────────────────────────────────────────────────────────── */
const CountdownChip = ({
  date,
  isCaninata,
  isComingSoon,
}: {
  date: string;
  isCaninata: boolean;
  isComingSoon?: boolean;
}) => {
  const remaining = useCountdown(date);
  if (!remaining) return null;

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl mb-4 border ${
        isComingSoon
          ? "border-white/8"
          : isCaninata
          ? ""
          : "bg-cyan-500/[0.06] border-cyan-400/15"
      }`}
      style={
        isComingSoon
          ? { background: "rgba(255,255,255,0.02)" }
          : isCaninata
          ? { background: "rgba(253,212,84,0.05)", borderColor: "rgba(253,212,84,0.15)" }
          : {}
      }
    >
      <Zap
        className="h-3.5 w-3.5 shrink-0"
        style={{
          color: isComingSoon ? "rgba(255,255,255,0.3)"
            : isCaninata ? "#FDD454"
            : "#22d3ee",
        }}
      />
      <span
        className="text-[10px] font-black tracking-widest uppercase"
        style={{
          color: isComingSoon ? "rgba(255,255,255,0.3)"
            : isCaninata ? "#FDD454"
            : "#67e8f9",
        }}
      >
        Faltan {remaining.days}d {remaining.hours}h
      </span>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────── */
/* RACES SECTION                                                               */
/* ─────────────────────────────────────────────────────────────────────────── */
const RacesSection = () => {
  const navigate  = useNavigate();
  const [races, setRaces]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRaces = async () => {
      try {
        const { data, error } = await supabase
          .from("races")
          .select("*")
          .eq("is_active", true)
          .order("date", { ascending: true });
        if (error) throw error;

        const sorted = [...(data || [])].sort((a, b) => {
          const aC = (a.status ?? "").toLowerCase().includes("completa") ? 1 : 0;
          const bC = (b.status ?? "").toLowerCase().includes("completa") ? 1 : 0;
          return aC - bC;
        });

        setRaces(sorted);
      } catch (err) {
        console.error("[MIA ERROR] Fallo en enlace de datos:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRaces();
  }, []);

  const handleRegistrationClick = (e: React.MouseEvent, race: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (isCaninataRace(race.name)) {
      navigate(`/registro?race=${race.id}&tipo=caninata`);
    } else {
      navigate("/registro");
    }
  };

  return (
    <section className="min-h-screen pt-32 pb-24 px-6 max-w-7xl mx-auto relative z-10" id="carreras">

      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* ── HEADER [V10.8-1] ── */}
      <div className="relative mb-16 rounded-[2.5rem] overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src={ledRunHero}
            alt="WE RUN RAYOCERO LED CORO 10K"
            fetchPriority="high"
            loading="eager"
            decoding="async"
            className="w-full h-full object-cover object-center opacity-10"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#03070b] via-[#03070b]/85 to-[#03070b]/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#03070b] via-[#03070b]/40 to-transparent" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6 px-8 py-12">
          <div className="text-left">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/5 backdrop-blur-md mb-6"
            >
              <Calendar className="h-3 w-3 text-cyan-400" />
              <span className="text-[9px] font-black tracking-[0.4em] text-white/60 uppercase">
                Calendario Operativo Rayocero
              </span>
            </motion.div>

            <h2 className="text-5xl md:text-[5.5rem] font-black italic text-white tracking-tighter uppercase leading-[0.85] drop-shadow-2xl">
              PRÓXIMOS DESAFÍOS.<br />
            </h2>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-cyan-500 font-mono italic">
          <Loader2 className="h-10 w-10 animate-spin mb-4" />
          <span className="text-[10px] uppercase tracking-[0.5em] animate-pulse">
            Sincronizando Ecosistema...
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
          {races.length > 0 ? (
            races.map((race, idx) => {
              const caninata = isCaninataRace(race.name ?? "");
              const cfg      = getStatusConfig(
                race.status ?? "",
                caninata ? true : INSCRIPCIONES_ABIERTAS,
                caninata,
                race.name ?? "",
              );
              const region = getRegionTag(race.location ?? "", race.name ?? "");

              return (
                <motion.div
                  key={race.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1, duration: 0.6, ease: "easeOut" }}
                  className={`group relative backdrop-blur-2xl border transition-all duration-500 flex flex-col h-full overflow-hidden rounded-[2.5rem] shadow-[0_20px_40px_rgba(0,0,0,0.5)] ${
                    cfg.isCompleted
                      ? "bg-white/[0.015] border-white/[0.04] hover:border-amber-400/10"
                      : caninata
                      ? "bg-white/[0.02] border-white/5 hover:border-[#FDD454]/20 hover:-translate-y-2"
                      : cfg.isClosed
                      ? "bg-white/[0.015] border-white/[0.04] hover:border-red-500/10"
                      : cfg.isComingSoon
                      ? "bg-white/[0.015] border-white/[0.04]"
                      : "bg-white/[0.02] border-white/5 hover:border-white/10 hover:-translate-y-2"
                  }`}
                >
                  <CardImageSlider
                    image={getRaceImage(race.name, race.image_url)}
                    alt={race.name}
                    status={race.status ?? ""}
                    region={region}
                    isCaninata={caninata}
                    raceName={race.name ?? ""}
                  />

                  <div className="p-8 flex flex-col flex-grow relative z-20">
                    <h3
                      className={`text-3xl font-black italic mb-4 tracking-tighter uppercase leading-[0.9] min-h-[3.5rem] transition-colors ${
                        cfg.isCompleted
                          ? "text-white/50 group-hover:text-amber-400/70"
                          : caninata
                          ? "text-white group-hover:text-[#FDD454]"
                          : cfg.isClosed
                          ? "text-white/60 group-hover:text-red-400/70"
                          : cfg.isComingSoon
                          ? "text-white/40"
                          : "text-white group-hover:text-cyan-400"
                      }`}
                    >
                      {race.name}
                    </h3>

                    {/* Countdown */}
                    {!cfg.isCompleted && !cfg.isClosed && race.date && (
                      <CountdownChip
                        date={race.date}
                        isCaninata={caninata}
                        isComingSoon={cfg.isComingSoon}
                      />
                    )}

                    {/* Chip fecha por confirmar */}
                    {cfg.isComingSoon && !race.date && (
                      <div
                        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl mb-4 border border-white/8"
                        style={{ background: "rgba(255,255,255,0.02)" }}
                      >
                        <Zap className="h-3.5 w-3.5 shrink-0 text-white/20" />
                        <span className="text-[10px] font-black tracking-widest uppercase text-white/20">
                          Fecha por confirmar
                        </span>
                      </div>
                    )}

                    {/* Chip inscripciones cerradas */}
                    {cfg.isClosed && !cfg.isCompleted && (
                      <div
                        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl mb-4 border"
                        style={{ background: "rgba(255,60,60,0.05)", borderColor: "rgba(255,60,60,0.15)" }}
                      >
                        <XCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
                        <span className="text-[10px] font-black tracking-widest uppercase text-red-400/80">
                          Inscripciones cerradas
                        </span>
                      </div>
                    )}

                    {/* Info rows — [V10.9-1] sin precio caninata */}
                    <div className="space-y-4 mb-10 flex-grow">
                      {[
                        { icon: MapPin, val: race.location },
                        {
                          icon: Calendar,
                          val: race.date
                            ? new Date(race.date + "T00:00:00")
                                .toLocaleDateString("es-ES", {
                                  day: "2-digit",
                                  month: "long",
                                  year: "numeric",
                                })
                                .toUpperCase()
                            : "FECHA POR CONFIRMAR",
                        },
                        { icon: Clock, val: race.time || "POR CONFIRMAR" },
                      ]
                        .filter(Boolean)
                        .map((item: any, i: number) => (
                          <div
                            key={i}
                            className="flex items-center gap-4 text-white/40 group-hover:text-white/80 transition-colors"
                          >
                            <item.icon
                              className="h-4 w-4"
                              style={{
                                color: cfg.isCompleted
                                  ? "rgba(245,158,11,0.5)"
                                  : cfg.isClosed
                                  ? "rgba(248,113,113,0.5)"
                                  : cfg.isComingSoon
                                  ? "rgba(255,255,255,0.15)"
                                  : caninata
                                  ? "#FDD454"
                                  : "#06b6d4",
                              }}
                            />
                            <span className="text-[10px] font-bold tracking-[0.2em] uppercase">
                              {item.val}
                            </span>
                          </div>
                        ))}
                    </div>

                    {/* ── CTAs ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-auto">

                      {cfg.isCompleted ? (
                        <>
                          <Link to={`/carrera/${race.id}`} className="w-full">
                            <button className="w-full py-5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/8 rounded-2xl text-[9px] font-black text-white/50 italic tracking-[0.2em] transition-all flex items-center justify-center gap-2 uppercase backdrop-blur-md active:scale-95">
                              <Info className="h-3 w-3 text-white/30" /> DETALLES
                            </button>
                          </Link>
                          <Link to="/resultados" className="w-full">
                            <button
                              className="w-full py-5 rounded-2xl text-[9px] font-black italic tracking-[0.2em] transition-all flex items-center justify-center gap-2 uppercase active:scale-95"
                              style={{
                                background: "rgba(245,158,11,0.08)",
                                border:     "1px solid rgba(245,158,11,0.25)",
                                color:      "#FCD34D",
                              }}
                            >
                              <Trophy className="h-3 w-3" /> VER RESULTADOS
                            </button>
                          </Link>
                        </>

                      ) : cfg.isComingSoon ? (
                        <>
                          <button
                            disabled
                            className="w-full h-full py-5 rounded-2xl text-[9px] font-black italic tracking-[0.2em] flex items-center justify-center gap-2 uppercase cursor-not-allowed select-none"
                            style={{
                              background: "rgba(255,255,255,0.02)",
                              border:     "1px solid rgba(255,255,255,0.06)",
                              color:      "rgba(255,255,255,0.15)",
                            }}
                          >
                            <Info className="h-3 w-3" /> DETALLES
                          </button>
                          <button
                            disabled
                            className="w-full h-full py-5 rounded-2xl text-[9px] font-black italic tracking-[0.2em] flex items-center justify-center gap-2 uppercase cursor-not-allowed select-none"
                            style={{
                              background: "rgba(255,255,255,0.02)",
                              border:     "1px solid rgba(255,255,255,0.06)",
                              color:      "rgba(255,255,255,0.15)",
                            }}
                          >
                            <Zap className="h-3 w-3" /> PRÓXIMAMENTE
                          </button>
                        </>

                      ) : cfg.isClosed ? (
                        <>
                          <Link to={`/carrera/${race.id}`} className="w-full">
                            <button className="w-full h-full py-5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 rounded-2xl text-[9px] font-black text-white italic tracking-[0.2em] transition-all flex items-center justify-center gap-2 uppercase backdrop-blur-md active:scale-95">
                              <Info className="h-3 w-3 text-red-400" /> VER RUTA
                            </button>
                          </Link>
                          <button
                            disabled
                            className="w-full h-full py-5 rounded-2xl text-[9px] font-black italic tracking-[0.2em] flex items-center justify-center gap-2 uppercase cursor-not-allowed"
                            style={{
                              background: "rgba(255,40,40,0.06)",
                              border:     "1px solid rgba(255,60,60,0.2)",
                              color:      "rgba(248,113,113,0.5)",
                            }}
                          >
                            <XCircle className="h-3 w-3" /> INSCRIPCIONES CERRADAS
                          </button>
                        </>

                      ) : (
                        <>
                          <Link to={`/carrera/${race.id}`} className="w-full">
                            <button className="w-full h-full py-5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 rounded-2xl text-[9px] font-black text-white italic tracking-[0.2em] transition-all flex items-center justify-center gap-2 uppercase backdrop-blur-md active:scale-95 text-center">
                              <Info className="h-3 w-3 text-cyan-400" /> DETALLES
                            </button>
                          </Link>

                          {caninata ? (
                            <button
                              onClick={(e) => handleRegistrationClick(e, race)}
                              className="w-full h-full py-5 rounded-2xl text-[9px] font-black text-[#050801] italic tracking-[0.2em] transition-all flex items-center justify-center gap-2 uppercase active:scale-95 group/btn"
                              style={{
                                background: "linear-gradient(135deg, #D09644, #FDD454)",
                                boxShadow:  "0 0 20px rgba(253,212,84,0.15)",
                              }}
                            >
                              INSCRIBIRME <Dog className="h-3 w-3 transition-transform group-hover/btn:scale-110" />
                            </button>
                          ) : (
                            <button
                              onClick={(e) => handleRegistrationClick(e, race)}
                              className="w-full h-full py-5 bg-cyan-500 hover:bg-cyan-400 rounded-2xl text-[9px] font-black text-black italic tracking-[0.2em] transition-all flex items-center justify-center gap-2 uppercase active:scale-95 shadow-[0_0_20px_rgba(0,242,255,0.15)] group/btn text-center"
                            >
                              INSCRIBIRME <Zap className="h-3 w-3 fill-current transition-transform group-hover/btn:scale-110" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="col-span-full py-20 text-center border border-white/5 rounded-[2.5rem] bg-white/[0.01] backdrop-blur-sm">
              <p className="text-white/20 text-xs font-bold uppercase tracking-[0.5em]">
                No se han detectado desafíos activos.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default RacesSection;
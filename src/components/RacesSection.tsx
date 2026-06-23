/**
 * RAYO CERO — RACE CALENDAR (EVOLUTION V8.0 - CORO FALCÓN + COMPLETADA)
 * Senior Dev: MIA (Valkyron Group)
 * CEO: Lualdo Sciscioli
 * Grado: Militar / Operativo / Diseñador
 * REGLA DE ORO: Evolución sin Destrucción. Código completo. Copy-paste ready.
 *
 * CHANGELOG V8.0 (WE RUN CORO FALCÓN):
 * [V8-1] Badge "Completada" — estilo dorado/amber con ícono de trofeo.
 *        Card con overlay de desaturación sutil para carreras pasadas.
 * [V8-2] Botón de acción en carrera completada → "VER RESULTADOS" (link a /resultados).
 * [V8-3] Preservada toda lógica V7: INSCRIPCIONES_ABIERTAS flag, badge dinámico,
 *        "CUPO COMPLETO" state, Supabase fetch.
 * [V8-4] getStatusConfig() — función centralizada para todos los estados de status.
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MapPin, Calendar, Clock, Info, Zap, Loader2, Lock, Trophy, CheckCircle2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { INSCRIPCIONES_ABIERTAS } from "@/lib/registrationConfig";

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1594882645126-14020914d58d?q=80&w=800";

/* ─────────────────────────────────────────────────────────────────────────── */
/* STATUS CONFIG — fuente única de verdad para estilos y lógica de status     */
/* ─────────────────────────────────────────────────────────────────────────── */
type StatusKey = "completada" | "inscripciones_abiertas" | "inscripciones_cerradas" | "proximamente" | "default";

const getStatusConfig = (rawStatus: string, inscripcionesAbiertas: boolean) => {
  const s = rawStatus?.toLowerCase().trim() ?? "";

  if (s === "completada" || s === "completed") {
    return {
      key: "completada" as StatusKey,
      label: "Completada",
      badgeClass:
        "bg-amber-500/10 border-amber-400/30 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.15)]",
      dotColor: "bg-amber-400",
      isCompleted: true,
      isClosed: false,
    };
  }

  if (!inscripcionesAbiertas) {
    return {
      key: "inscripciones_cerradas" as StatusKey,
      label: "Inscripciones Cerradas",
      badgeClass:
        "bg-red-500/10 border-red-500/25 text-red-400 shadow-[0_0_12px_rgba(255,60,60,0.15)]",
      dotColor: "bg-red-400",
      isCompleted: false,
      isClosed: true,
    };
  }

  if (s === "próximamente" || s === "proximamente") {
    return {
      key: "proximamente" as StatusKey,
      label: "Próximamente",
      badgeClass: "bg-white/5 border-white/10 text-white/50",
      dotColor: null,
      isCompleted: false,
      isClosed: false,
    };
  }

  // Default = Inscripciones Abiertas
  return {
    key: "inscripciones_abiertas" as StatusKey,
    label: "Inscripciones Abiertas",
    badgeClass:
      "bg-cyan-500/10 border-cyan-400/30 text-cyan-400 shadow-[0_0_15px_rgba(0,242,255,0.2)]",
    dotColor: "bg-cyan-400",
    isCompleted: false,
    isClosed: false,
  };
};

/* ─────────────────────────────────────────────────────────────────────────── */
/* CARD IMAGE SLIDER                                                           */
/* ─────────────────────────────────────────────────────────────────────────── */
const CardImageSlider = ({
  image,
  alt,
  status,
}: {
  image: string;
  alt: string;
  status: string;
}) => {
  const cfg = getStatusConfig(status, INSCRIPCIONES_ABIERTAS);

  return (
    <div className="relative h-72 w-full overflow-hidden bg-[#03070b] rounded-t-[2.5rem]">
      <motion.img
        src={image || DEFAULT_IMAGE}
        alt={alt}
        initial={{ opacity: 0, scale: 1.1 }}
        animate={{ opacity: cfg.isCompleted ? 0.35 : 0.6, scale: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ${
          cfg.isCompleted ? "grayscale-[0.6]" : "group-hover:opacity-100"
        }`}
        onError={(e) => {
          (e.target as any).src = DEFAULT_IMAGE;
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#03070b] via-[#03070b]/20 to-transparent" />

      {/* Badge de status — dinámico */}
      <div className="absolute top-6 left-6 z-20">
        <span
          className={`
            text-[8px] font-black uppercase tracking-[0.3em] px-4 py-2 rounded-full border backdrop-blur-md shadow-lg
            flex items-center gap-1.5
            ${cfg.badgeClass}
          `}
        >
          {cfg.dotColor && (
            <motion.span
              className={`w-1.5 h-1.5 rounded-full ${cfg.dotColor} inline-block`}
              animate={cfg.isCompleted ? { opacity: 1 } : { opacity: [1, 0.2, 1] }}
              transition={{ duration: 2, repeat: cfg.isCompleted ? 0 : Infinity, ease: "easeInOut" }}
            />
          )}
          {cfg.isCompleted && <CheckCircle2 className="h-3 w-3" />}
          {cfg.label}
        </span>
      </div>

      {/* Overlay de trofeo para completadas */}
      {cfg.isCompleted && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <Trophy className="h-16 w-16 text-amber-400/20" strokeWidth={1} />
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────── */
/* RACES SECTION                                                               */
/* ─────────────────────────────────────────────────────────────────────────── */
const RacesSection = () => {
  const navigate = useNavigate();
  const [races, setRaces] = useState<any[]>([]);
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
        setRaces(data || []);
      } catch (err) {
        console.error("[MIA ERROR] Fallo en enlace de datos:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRaces();
  }, []);

  const handleRegistrationClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate("/registro");
  };

  return (
    <section
      className="min-h-screen pt-32 pb-24 px-6 max-w-7xl mx-auto relative z-10"
      id="carreras"
    >
      {/* Glow ambiental */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* Header editorial */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6 relative z-10">
        <div className="text-left">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/5 backdrop-blur-md mb-6"
          >
            <Calendar className="h-3 w-3 text-cyan-400" />
            <span className="text-[9px] font-black tracking-[0.4em] text-white/60 uppercase">
              Calendario Operativo Valkyron
            </span>
          </motion.div>

          <h2 className="text-5xl md:text-[5.5rem] font-black italic text-white tracking-tighter uppercase leading-[0.85] drop-shadow-2xl">
            PRÓXIMOS <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-white">
              DESAFÍOS.
            </span>
          </h2>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-cyan-500 font-mono italic">
          <Loader2 className="h-10 w-10 animate-spin mb-4" />
          <span className="text-[10px] uppercase tracking-[0.5em] animate-pulse">
            Sincronizando_Ecosistema...
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
          {races.length > 0 ? (
            races.map((race, idx) => {
              const cfg = getStatusConfig(race.status ?? "", INSCRIPCIONES_ABIERTAS);

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
                      : "bg-white/[0.02] border-white/5 hover:border-white/10 hover:-translate-y-2"
                  }`}
                >
                  <CardImageSlider
                    image={race.image_url}
                    alt={race.name}
                    status={race.status ?? ""}
                  />

                  <div className="p-8 flex flex-col flex-grow relative z-20">
                    <h3
                      className={`text-3xl font-black italic mb-6 tracking-tighter uppercase leading-[0.9] min-h-[3.5rem] transition-colors ${
                        cfg.isCompleted
                          ? "text-white/50 group-hover:text-amber-400/70"
                          : "text-white group-hover:text-cyan-400"
                      }`}
                    >
                      {race.name}
                    </h3>

                    <div className="space-y-4 mb-10 flex-grow">
                      {[
                        { icon: MapPin, val: race.location },
                        {
                          icon: Calendar,
                          val: new Date(race.date + "T00:00:00")
                            .toLocaleDateString("es-ES", {
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                            })
                            .toUpperCase(),
                        },
                        { icon: Clock, val: race.time || "19:00 HRS" },
                      ].map((item, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-4 text-white/40 group-hover:text-white/80 transition-colors"
                        >
                          <item.icon
                            className={`h-4 w-4 ${
                              cfg.isCompleted ? "text-amber-500/50" : "text-cyan-500"
                            }`}
                          />
                          <span className="text-[10px] font-bold tracking-[0.2em] uppercase">
                            {item.val}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* ── BOTONES — lógica por estado ── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-auto">

                      {cfg.isCompleted ? (
                        /* Carrera completada: Detalles + Ver Resultados */
                        <>
                          <Link to={`/carrera/${race.id}`} className="w-full">
                            <button className="w-full py-5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/8 rounded-2xl text-[9px] font-black text-white/50 italic tracking-[0.2em] transition-all flex items-center justify-center gap-2 uppercase backdrop-blur-md active:scale-95">
                              <Info className="h-3 w-3 text-white/30" /> DETALLES
                            </button>
                          </Link>
                          <Link to="/resultados" className="w-full">
                            <button className="w-full py-5 rounded-2xl text-[9px] font-black italic tracking-[0.2em] transition-all flex items-center justify-center gap-2 uppercase active:scale-95"
                              style={{
                                background: "rgba(245,158,11,0.08)",
                                border: "1px solid rgba(245,158,11,0.25)",
                                color: "#FCD34D",
                              }}
                            >
                              <Trophy className="h-3 w-3" /> VER RESULTADOS
                            </button>
                          </Link>
                        </>
                      ) : (
                        /* Carrera activa: Detalles + Inscripción/Cupo Completo */
                        <>
                          <Link to={`/carrera/${race.id}`} className="w-full">
                            <button className="w-full h-full py-5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 rounded-2xl text-[9px] font-black text-white italic tracking-[0.2em] transition-all flex items-center justify-center gap-2 uppercase backdrop-blur-md active:scale-95 text-center">
                              <Info className="h-3 w-3 text-cyan-400" /> DETALLES
                            </button>
                          </Link>

                          {INSCRIPCIONES_ABIERTAS ? (
                            <button
                              onClick={handleRegistrationClick}
                              className="w-full h-full py-5 bg-cyan-500 hover:bg-cyan-400 rounded-2xl text-[9px] font-black text-black italic tracking-[0.2em] transition-all flex items-center justify-center gap-2 uppercase active:scale-95 shadow-[0_0_20px_rgba(0,242,255,0.15)] group/btn text-center"
                            >
                              INSCRIBIRME{" "}
                              <Zap className="h-3 w-3 fill-current transition-transform group-hover/btn:scale-110" />
                            </button>
                          ) : (
                            <button
                              onClick={handleRegistrationClick}
                              className="w-full h-full py-5 rounded-2xl text-[9px] font-black italic tracking-[0.2em] transition-all flex items-center justify-center gap-2 uppercase active:scale-95 text-center"
                              style={{
                                background: "rgba(255,40,40,0.08)",
                                border: "1px solid rgba(255,60,60,0.25)",
                                color: "#F87171",
                              }}
                            >
                              <Lock className="h-3 w-3" /> PROXIMAMENTE
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
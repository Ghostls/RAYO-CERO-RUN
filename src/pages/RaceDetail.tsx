/**
 * RAYO CERO — RACE OPERATIVE DETAIL (EVOLUTION V12.0 - MULTI-RACE DYNAMIC)
 * Senior Dev: MIA (Valkyron Group)
 * CEO: Lualdo Sciscioli
 * REGLA DE ORO: Evolución sin Destrucción. Código completo. Copy-paste ready.
 *
 * CHANGELOG V12.0:
 * [V12-1] Componente dinámico — lee race desde Supabase por ID de URL
 * [V12-2] RACE_CONFIGS: mapa de configuración por race.name
 *         - Barquisimeto → mapa + ruta + flyer premios (igual que antes)
 *         - Cualquier otra carrera sin config → pantalla "Próximamente"
 * [V12-3] Pantalla Próximamente: glassmorphism táctico, fecha, ubicación,
 *         botón inscripción con flag INSCRIPCIONES_ABIERTAS
 * [V12-4] Toda la lógica de Barquisimeto preservada sin tocar
 */

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { MapPin, Clock, Zap, Users, ArrowLeft, Trophy, Lock, Calendar, Shield } from "lucide-react";
import { MapContainer, TileLayer, Polyline, Marker, useMap, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { supabase } from "@/lib/supabase";
import { INSCRIPCIONES_ABIERTAS } from "@/lib/registrationConfig";
import flyerPremios from "@/assets/flier_premios_info.png";

const MapComp    = MapContainer as any;
const TileComp   = TileLayer   as any;
const PolyComp   = Polyline    as any;
const MarkerComp = Marker      as any;
const CircleComp = Circle      as any;

/* ─────────────────────────────────────────────────────────────────────────── */
/* RACE CONFIGS — agrega aquí cada carrera cuando tenga datos                 */
/* ─────────────────────────────────────────────────────────────────────────── */
const RACE_CONFIGS: Record<string, { hasMap: boolean }> = {
  "Rayocero Night Fest Barquisimeto":      { hasMap: true },
  "RAYOCERO NIGHT FEST BARQUISIMETO":      { hasMap: true },
  // Coro Falcón — sin mapa aún
  "We Run Rayocero — Coro Falcón":         { hasMap: false },
};

const hasMapConfig = (name: string): boolean => {
  // Match parcial case-insensitive para Barquisimeto
  if (name?.toLowerCase().includes("barquisimeto") || name?.toLowerCase().includes("night fest")) return true;
  return RACE_CONFIGS[name]?.hasMap ?? false;
};

/* ─────────────────────────────────────────────────────────────────────────── */
/* WAYPOINT ICONS                                                              */
/* ─────────────────────────────────────────────────────────────────────────── */
const createCompoundIcon = (waypoint: any) => {
  let poiHtml = "";
  if (waypoint.pois?.length > 0) {
    const poiCircles = waypoint.pois.map((poi: any) =>
      `<div style="background-color:#000;width:18px;height:18px;border-radius:50%;border:1.5px solid ${poi.color};display:flex;align-items:center;justify-content:center;color:${poi.color};font-weight:900;font-size:9px;box-shadow:0 0 8px ${poi.color}40;flex-shrink:0;">${poi.icon}</div>`
    ).join("");
    poiHtml = `<div style="display:flex;gap:4px;margin-left:6px;background:rgba(0,0,0,0.6);padding:4px 6px;border-radius:20px;backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.1);">${poiCircles}</div>`;
  }
  const mainCircle = waypoint.isMeta
    ? `<div style="background-color:#000;width:40px;height:40px;border-radius:50%;border:2px solid #00f2ff;box-shadow:0 0 20px #00f2ff;display:flex;align-items:center;justify-content:center;color:#00f2ff;font-weight:900;font-size:10px;text-transform:uppercase;z-index:10;flex-shrink:0;">META</div>`
    : `<div style="background-color:#00f2ff;width:30px;height:30px;border-radius:50%;border:2px solid #000;box-shadow:0 0 10px rgba(0,242,255,0.5);display:flex;align-items:center;justify-content:center;color:#000;font-weight:900;font-size:12px;font-style:italic;z-index:10;flex-shrink:0;">${waypoint.label}</div>`;
  return L.divIcon({
    className: "custom-compound-marker",
    html: `<div style="display:flex;align-items:center;width:max-content;pointer-events:none;">${mainCircle}${poiHtml}</div>`,
    iconSize: [0, 0],
    iconAnchor: waypoint.isMeta ? [20, 20] : [15, 15],
  });
};

const MapController = ({ bounds }: { bounds: L.LatLngBoundsExpression }) => {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
      map.fitBounds(bounds, { padding: [50, 50] });
    }, 500);
    return () => clearTimeout(timer);
  }, [map, bounds]);
  return null;
};

/* ─────────────────────────────────────────────────────────────────────────── */
/* PANTALLA PRÓXIMAMENTE                                                       */
/* ─────────────────────────────────────────────────────────────────────────── */
const ComingSoonPanel = ({ race, registeredCount, onBack, onRegister }: {
  race: any;
  registeredCount: number;
  onBack: () => void;
  onRegister: (e: React.MouseEvent) => void;
}) => {
  const dateStr = race?.date
    ? new Date(race.date + "T00:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" }).toUpperCase()
    : "—";

  return (
    <div className="min-h-screen w-full bg-[#03070b] flex flex-col text-white relative font-sans pt-[85px] md:pt-[104px] pb-12 overflow-y-auto">

      {/* Fondo glow ambiental */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-amber-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[300px] bg-cyan-500/5 blur-[100px] rounded-full" />
      </div>

      {/* Textura táctica */}
      <div className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />

      <div className="relative z-10 w-full max-w-2xl mx-auto px-4 sm:px-6 flex flex-col items-center py-8">

        {/* Back button */}
        <div className="w-full flex justify-start mb-8">
          <button onClick={onBack}
            className="flex items-center gap-2 group bg-white/[0.03] hover:bg-white/10 py-2 px-4 rounded-full transition-all border border-white/5">
            <ArrowLeft className="h-4 w-4 text-cyan-400 group-hover:-translate-x-1 transition-transform" />
            <span className="font-black text-[9px] tracking-[0.3em] uppercase text-white/70">Volver</span>
          </button>
        </div>

        {/* Card principal */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="w-full bg-white/[0.02] border border-white/8 rounded-[2.5rem] backdrop-blur-2xl p-7 sm:p-10 md:p-12 shadow-[0_30px_80px_rgba(0,0,0,0.6)] flex flex-col items-center text-center gap-6"
        >
          {/* Badge */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-400/20">
            <motion.span className="w-1.5 h-1.5 rounded-full bg-amber-400"
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 1.8, repeat: Infinity }} />
            <span className="text-[8px] font-black tracking-[0.4em] uppercase text-amber-300">
              Detalles Operativos En Preparación
            </span>
          </div>

          {/* Título */}
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-[0.9] text-white mb-3">
              {race?.name ?? "PRÓXIMA MISIÓN"}
            </h1>
            <p className="text-white/30 text-sm font-bold tracking-widest uppercase">
              La ruta táctica se revelará pronto
            </p>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
            {[
              { icon: MapPin,    label: "Ubicación",   val: race?.location ?? "—" },
              { icon: Calendar,  label: "Fecha",       val: dateStr },
              { icon: Users,     label: "Inscritos",   val: `${registeredCount}` },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-3 p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                <item.icon className="h-5 w-5 text-cyan-400" />
                <div>
                  <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">{item.label}</p>
                  <p className="text-sm font-black text-white uppercase">{item.val}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Separador */}
          <div className="w-full h-px bg-white/5" />

          {/* Mensaje táctico */}
          <div className="flex items-start gap-4 text-left bg-cyan-500/[0.04] border border-cyan-400/10 rounded-2xl p-5 w-full">
            <Shield className="h-5 w-5 text-cyan-400 mt-0.5 shrink-0" />
            <p className="text-[11px] text-white/50 leading-relaxed">
              El mapa de ruta, waypoints de hidratación, cronometraje y estructura de premios 
              serán publicados en las próximas semanas. Mantente atento al canal oficial de Rayocero.
            </p>
          </div>

          {/* Botón inscripción */}
          {INSCRIPCIONES_ABIERTAS ? (
            <button onClick={onRegister}
              className="w-full py-6 rounded-2xl font-black text-xs tracking-[0.4em] uppercase italic transition-all flex items-center justify-center gap-4 bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_30px_rgba(0,242,255,0.2)] active:scale-95">
              INSCRIBIRME <Zap className="h-4 w-4 fill-current" />
            </button>
          ) : (
            <button onClick={onRegister}
              className="w-full py-6 rounded-2xl font-black text-xs tracking-[0.4em] uppercase italic transition-all flex items-center justify-center gap-4 active:scale-95"
              style={{ background: "rgba(255,40,40,0.08)", border: "1px solid rgba(255,60,60,0.28)", color: "#F87171" }}>
              <Lock className="h-4 w-4" /> CUPO COMPLETO
            </button>
          )}
        </motion.div>
      </div>

      <style>{`.leaflet-container{background:transparent!important}`}</style>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────── */
/* BARQUISIMETO DETAIL — idéntico al original                                 */
/* ─────────────────────────────────────────────────────────────────────────── */
const BarquisimetoDetail = ({ registeredCount, onRegister }: {
  registeredCount: number;
  onRegister: (e: React.MouseEvent) => void;
}) => {
  const navigate = useNavigate();

  const officialRoute: [number, number][] = [
    [10.077576, -69.283447], [10.067250, -69.284621], [10.062852, -69.282465],
    [10.061500, -69.276373], [10.064014, -69.288046], [10.065609, -69.295721],
    [10.068926, -69.296563], [10.068897, -69.298359], [10.073951, -69.297750],
    [10.073542, -69.296712], [10.070855, -69.294501], [10.069175, -69.293670],
    [10.069175, -69.292201], [10.070609, -69.291723], [10.079514, -69.288873],
    [10.078963, -69.285316], [10.079192, -69.283498], [10.080416, -69.281270],
    [10.078575, -69.280296], [10.076105, -69.280867], [10.076149, -69.283252],
    [10.077576, -69.283447],
  ];

  const WAYPOINTS = [
    { pos: [10.077576, -69.283447], isMeta: true, label: "META", pois: [{ icon: "♪", color: "#a855f7" }, { icon: "B", color: "#94a3b8" }, { icon: "+", color: "#22c55e" }, { icon: "C", color: "#eab308" }] },
    { pos: [10.067250, -69.284621], label: "1K",  pois: [{ icon: "♪", color: "#a855f7" }] },
    { pos: [10.062852, -69.282465], label: "2K",  pois: [] },
    { pos: [10.061500, -69.276373], label: "3K",  pois: [{ icon: "♪", color: "#a855f7" }] },
    { pos: [10.064014, -69.288046], label: "4K",  pois: [{ icon: "P", color: "#3b82f6" }] },
    { pos: [10.065609, -69.295721], label: "5K",  pois: [{ icon: "♪", color: "#a855f7" }, { icon: "C", color: "#eab308" }] },
    { pos: [10.073542, -69.296712], label: "6K",  pois: [] },
    { pos: [10.070855, -69.294501], label: "7K",  pois: [{ icon: "♪", color: "#a855f7" }, { icon: "+", color: "#22c55e" }] },
    { pos: [10.070609, -69.291723], label: "8K",  pois: [{ icon: "P", color: "#3b82f6" }] },
    { pos: [10.079514, -69.288873], label: "9K",  pois: [] },
  ];

  const mapBounds = useMemo(() => L.latLngBounds(officialRoute), []);

  return (
    <div className="h-screen w-full bg-[#03070b] flex flex-col lg:flex-row overflow-hidden text-white relative font-sans pt-[85px] md:pt-[104px] z-0">

      <div className="relative w-full lg:w-[65%] h-[45vh] lg:h-full bg-[#080808] z-0">
        <MapComp bounds={mapBounds} zoom={15} className="h-full w-full z-10" zoomControl={false}>
          <MapController bounds={mapBounds} />
          <TileComp url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution="&copy; CARTO" />
          <CircleComp center={[10.077576, -69.283447]} radius={300}
            pathOptions={{ color: "#00f2ff", fillColor: "#00f2ff", fillOpacity: 0.08, weight: 1, className: "radar-pulse" }} />
          <PolyComp positions={officialRoute}
            pathOptions={{ color: "#00f2ff", weight: 5, opacity: 0.9, className: "glow-path" }} />
          {WAYPOINTS.map((wp, idx) => (
            <MarkerComp key={idx} position={wp.pos} icon={createCompoundIcon(wp)} />
          ))}
        </MapComp>
        <div className="absolute bottom-10 left-10 z-[500] pointer-events-none hidden md:block">
          <h2 className="text-white font-black italic text-7xl leading-[0.8] tracking-tighter uppercase opacity-30 select-none drop-shadow-2xl">
            NIGHT FEST<br />10K <span className="text-cyan-500">ROUTE</span>
          </h2>
        </div>
      </div>

      <aside className="w-full lg:w-[35%] h-[55vh] lg:h-full overflow-y-auto bg-[#03070b] p-8 lg:p-12 custom-scrollbar border-l border-white/5 relative z-10">
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-2 group bg-white/[0.03] hover:bg-white/10 py-2 px-4 rounded-full transition-all border border-white/5">
            <ArrowLeft className="h-4 w-4 text-cyan-400 group-hover:-translate-x-1 transition-transform" />
            <span className="font-black text-[9px] tracking-[0.3em] uppercase text-white/70">Volver</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[9px] font-black text-cyan-400 tracking-widest leading-none">RAYOCERO</p>
              <p className="text-[7px] text-white/30 font-bold uppercase mt-1">NIGHT FEST 10K</p>
            </div>
            <div className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_10px_#00f2ff]" />
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12 pb-10">
          <div className="flex flex-col items-center w-full">
            <p className="flex items-center gap-2 text-[9px] font-black tracking-[0.3em] text-cyan-400 uppercase mb-4 w-full text-left">
              <Trophy className="h-3 w-3" /> Recompensa Estratégica
            </p>
            <div className="w-full relative shadow-[0_0_40px_rgba(34,211,238,0.08)] rounded-2xl overflow-hidden border border-white/10 group">
              <div className="absolute inset-0 bg-gradient-to-t from-[#03070b] via-transparent to-transparent opacity-50 z-10 pointer-events-none" />
              <img src={flyerPremios} alt="Premios Night Fest 10K"
                className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
            </div>
          </div>

          <header className="space-y-4">
            <h1 className="text-7xl font-black italic uppercase leading-none tracking-tighter">
              10<span className="text-cyan-400">K</span>
            </h1>
            <p className="text-sm font-black tracking-[0.5em] text-white/30 uppercase">6 . JUN . 2026</p>
          </header>

          <div className="grid grid-cols-1 gap-4">
            {[
              { icon: MapPin, label: "Salida / Meta",       val: "Monumento al Sol" },
              { icon: Clock,  label: "Hora Operativa",      val: "19:00 HRS"        },
              { icon: Users,  label: "Atletas Confirmados", val: `${registeredCount}` },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-6 p-5 bg-white/[0.02] border border-white/5 rounded-3xl group hover:border-cyan-500/30 transition-all backdrop-blur-md">
                <div className="h-12 w-12 flex items-center justify-center bg-cyan-400/10 rounded-2xl text-cyan-400 transition-colors group-hover:bg-cyan-400 group-hover:text-black">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">{item.label}</p>
                  <p className="font-bold text-lg uppercase text-white">{item.val}</p>
                </div>
              </div>
            ))}
          </div>

          {INSCRIPCIONES_ABIERTAS ? (
            <button onClick={onRegister}
              className="w-full py-7 rounded-2xl font-black text-xs tracking-[0.4em] uppercase italic transition-all flex items-center justify-center gap-4 bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_30px_rgba(0,242,255,0.2)] active:scale-95">
              INSCRIBIRME <Zap className="h-4 w-4 fill-current" />
            </button>
          ) : (
            <button onClick={onRegister}
              className="w-full py-7 rounded-2xl font-black text-xs tracking-[0.4em] uppercase italic transition-all flex items-center justify-center gap-4 active:scale-95"
              style={{ background: "rgba(255,40,40,0.08)", border: "1px solid rgba(255,60,60,0.28)", color: "#F87171" }}>
              <Lock className="h-4 w-4" /> CUPO COMPLETO
              <motion.span className="w-2 h-2 rounded-full" style={{ background: "#FF4444" }}
                animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 2, repeat: Infinity }} />
            </button>
          )}

          <div className="pt-6 border-t border-white/5">
            <p className="text-[9px] font-black tracking-[0.3em] text-white/40 uppercase mb-6">Leyenda Operativa</p>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { color: "#00f2ff", icon: "1K", label: "KM"          },
                { color: "#3b82f6", icon: "P",  label: "HIDRATACIÓN" },
                { color: "#a855f7", icon: "♪",  label: "MÚSICA"      },
                { color: "#eab308", icon: "C",  label: "CRONO"       },
                { color: "#22c55e", icon: "+",  label: "MÉDICO"      },
                { color: "#94a3b8", icon: "B",  label: "BAÑOS"       },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full border flex items-center justify-center text-[10px] font-black"
                    style={{ borderColor: l.color, color: l.color }}>{l.icon}</div>
                  <span className="text-[10px] font-bold text-white/60">{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </aside>

      <style>{`
        .glow-path { filter: drop-shadow(0 0 15px rgba(0,242,255,0.5)); }
        .radar-pulse { animation: radar 3s ease-out infinite; transform-origin: center; }
        @keyframes radar { 0% { r: 50; opacity: 0.8; } 100% { r: 400; opacity: 0; } }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 10px; }
      `}</style>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────── */
/* MAIN COMPONENT — router dinámico                                           */
/* ─────────────────────────────────────────────────────────────────────────── */
const RaceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [race, setRace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [registeredCount, setRegisteredCount] = useState(1);

  useEffect(() => {
    const fetchRace = async () => {
      if (!id) return;
      try {
        const { data, error } = await supabase.from("races").select("*").eq("id", id).single();
        if (!error) setRace(data);
      } catch (err) {
        console.error("[MIA] Error fetching race:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRace();
  }, [id]);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const { count, error } = await supabase
          .from("runners").select("*", { count: "exact", head: true }).eq("estado", "confirmado");
        if (!error && count !== null && count > 0) setRegisteredCount(count);
      } catch (err) { console.error("[MIA] Error fetching count:", err); }
    };
    fetchCount();
  }, []);

  const handleRegister = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate("/registro");
  };

  if (loading) {
    return (
      <div className="h-screen w-full bg-[#03070b] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-cyan-500">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-[10px] font-black tracking-[0.5em] uppercase animate-pulse">Cargando misión...</span>
        </div>
      </div>
    );
  }

  // Decide qué renderizar según la carrera
  if (race && hasMapConfig(race.name)) {
    return <BarquisimetoDetail registeredCount={registeredCount} onRegister={handleRegister} />;
  }

  return <ComingSoonPanel race={race} registeredCount={registeredCount} onBack={() => navigate(-1)} onRegister={handleRegister} />;
};

export default RaceDetail;
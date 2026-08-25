/**
 * RAYO CERO — RACE OPERATIVE DETAIL (EVOLUTION V15.1 - CANINATA ROUTE FIX)
 * Senior Dev: MIA (Valkyron Group)
 * CEO: Lualdo Sciscioli
 * REGLA DE ORO: Evolución sin Destrucción. Código completo. Copy-paste ready.
 *
 * CHANGELOG V15.1:
 * [V15.1-1] caninataRoute5K CORREGIDA: loop norte desde Lidotel → Hotel →
 *           Troncal 4 → Av Venezuela → AEB → ANP → Av Libertador → Av Los Leones
 *           → Av Venezuela → Lidotel. Termina en 10.070519,-69.291850.
 * [V15.1-2] caninataRoute10K CORREGIDA: misma base 5K + extensión sur
 *           Troncal 4 sur → Calle 6 → Calle B → Altamira → Calle 14 →
 *           regreso Caroní → París → APP → JGI → JGL → Troncal → Lidotel.
 * [V15.1-3] CANINATA_WAYPOINTS_10K CORREGIDOS: marcadores sobre el trazado real.
 * [V15.1-4] CANINATA_WAYPOINTS_5K CORREGIDOS: reflejan el loop norte real.
 *
 * CHANGELOG V15.0 (preservado):
 * [V15-1] CANINATA ROUTES dual (naranja 10K, verde 5K).
 * [V15-2] Waypoints diferenciados con POIs 🐾 y 🩺.
 * [V15-3] CaninataDetail: toggle 10K/5K, paleta verde forestal + ámbar.
 * [V15-4] isCaninataRace(), RACE_CONFIGS, hasMapConfig actualizados.
 * [V15-5] Router: Caninata → CaninataDetail (evaluado primero).
 * [V15-6] handleRegister: /registro?race=id&tipo=caninata para Caninata.
 * [V15-7] Count por race_id para Caninata (no legacy NULL).
 */

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import {
  MapPin, Clock, Zap, Users, ArrowLeft, Trophy,
  Lock, Calendar, Shield, Dog, Heart, ChevronRight,
} from "lucide-react";
import { MapContainer, TileLayer, Polyline, Marker, useMap, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { supabase } from "@/lib/supabase";
import { INSCRIPCIONES_ABIERTAS } from "@/lib/registrationConfig";
import flyerPremios from "@/assets/flier_premios_info.png";

// ── BANNERS OPERATIVOS ───────────────────────────────────────────────────────
import portada499Agosto          from "@/assets/PORTADA_499.png";
import flyerOctubreInscripciones from "@/assets/flyer-coro-inscripciones.png";

let flyerCaninataBanner: string | null = null;
try {
  flyerCaninataBanner = require("@/assets/flyer-caninata.png").default;
} catch (_) { /* asset pendiente */ }

const MapComp    = MapContainer as any;
const TileComp   = TileLayer   as any;
const PolyComp   = Polyline    as any;
const MarkerComp = Marker      as any;
const CircleComp = Circle      as any;

/* ─────────────────────────────────────────────────────────────────────────── */
/* RACE CONFIGS                                                                */
/* ─────────────────────────────────────────────────────────────────────────── */
const RACE_CONFIGS: Record<string, { hasMap: boolean }> = {
  "Rayocero Night Fest Barquisimeto":  { hasMap: true },
  "RAYOCERO NIGHT FEST BARQUISIMETO":  { hasMap: true },
  "We Run Rayocero — Coro Falcón":     { hasMap: true },
  "499 Run — Coro Falcón":             { hasMap: true },
  "Caninata Barquisimeto":             { hasMap: true },
  "CANINATA BARQUISIMETO":             { hasMap: true },
  "Caninata Rayocero":                 { hasMap: true },
};

const hasMapConfig = (name: string): boolean => {
  if (!name) return false;
  const n = name.toLowerCase();
  if (n.includes("barquisimeto") || n.includes("night fest")) return true;
  if (n.includes("coro") || n.includes("falcón") || n.includes("falcon") || n.includes("499")) return true;
  if (n.includes("caninata")) return true;
  return RACE_CONFIGS[name]?.hasMap ?? false;
};

const isBarquisimetoRace = (name: string): boolean => {
  const n = name?.toLowerCase() ?? "";
  return (n.includes("barquisimeto") || n.includes("night fest")) && !n.includes("caninata");
};

const isCoroRace = (name: string): boolean => {
  const n = name?.toLowerCase() ?? "";
  return n.includes("coro") || n.includes("falcón") || n.includes("falcon") || n.includes("499");
};

const isCaninataRace = (name: string): boolean => {
  return (name?.toLowerCase() ?? "").includes("caninata");
};

/* ─────────────────────────────────────────────────────────────────────────── */
/* RACE BANNERS                                                                */
/* ─────────────────────────────────────────────────────────────────────────── */
const getRaceBanner = (name: string = ""): string | null => {
  const n = name.toLowerCase();
  if (n.includes("caninata")) return flyerCaninataBanner;
  if (n.includes("499") || n.includes("agosto")) return portada499Agosto;
  if (n.includes("coro") || n.includes("falcón") || n.includes("falcon") || n.includes("octubre"))
    return flyerOctubreInscripciones;
  return null;
};

/* ─────────────────────────────────────────────────────────────────────────── */
/* COUNTDOWN                                                                   */
/* ─────────────────────────────────────────────────────────────────────────── */
const useCountdown = (targetDate?: string) => {
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
    ? `<div style="background-color:#000;width:40px;height:40px;border-radius:50%;border:2px solid #FDD454;box-shadow:0 0 20px #FDD454;display:flex;align-items:center;justify-content:center;color:#FDD454;font-weight:900;font-size:10px;text-transform:uppercase;z-index:10;flex-shrink:0;">META</div>`
    : waypoint.isCaninata
    ? `<div style="background-color:#3C491F;width:30px;height:30px;border-radius:50%;border:2px solid #FDD454;box-shadow:0 0 10px rgba(253,212,84,0.5);display:flex;align-items:center;justify-content:center;color:#FDD454;font-weight:900;font-size:12px;font-style:italic;z-index:10;flex-shrink:0;">${waypoint.label}</div>`
    : `<div style="background-color:#00f2ff;width:30px;height:30px;border-radius:50%;border:2px solid #000;box-shadow:0 0 10px rgba(0,242,255,0.5);display:flex;align-items:center;justify-content:center;color:#000;font-weight:900;font-size:12px;font-style:italic;z-index:10;flex-shrink:0;">${waypoint.label}</div>`;
  return L.divIcon({
    className: "custom-compound-marker",
    html: `<div style="display:flex;align-items:center;width:max-content;pointer-events:none;">${mainCircle}${poiHtml}</div>`,
    iconSize:   [0, 0],
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
/* RUTA — 499 RUN CORO FALCÓN (V14 — sin cambios)                            */
/* ─────────────────────────────────────────────────────────────────────────── */
const coroRoute: [number, number][] = [
  [11.409922, -69.675254],
  [11.408140, -69.674525],
  [11.405352, -69.673543],
  [11.401830, -69.672276],
  [11.402671, -69.669663],
  [11.404142, -69.665417],
  [11.404920, -69.662972],
  [11.406875, -69.663787],
  [11.409608, -69.664795],
  [11.410785, -69.659327],
  [11.411626, -69.655788],
  [11.412109, -69.653579],
  [11.414632, -69.654480],
  [11.418016, -69.655681],
  [11.416061, -69.658941],
  [11.414127, -69.662265],
  [11.412362, -69.665781],
  [11.418158, -69.668000],
  [11.422750, -69.669504],
  [11.418158, -69.668000],
  [11.416152, -69.667408],
  [11.414895, -69.672463],
  [11.413179, -69.679237],
  [11.409250, -69.678246],
  [11.409938, -69.675271],
];

const CORO_WAYPOINTS = [
  { pos: [11.409922, -69.675254], isMeta: true, label: "META", pois: [{ icon: "♪", color: "#a855f7" }, { icon: "B", color: "#94a3b8" }, { icon: "+", color: "#22c55e" }, { icon: "C", color: "#eab308" }] },
  { pos: [11.408140, -69.674525], label: "1K",  pois: [{ icon: "♪", color: "#a855f7" }] },
  { pos: [11.405352, -69.673543], label: "2K",  pois: [] },
  { pos: [11.402671, -69.669663], label: "3K",  pois: [{ icon: "P", color: "#3b82f6" }] },
  { pos: [11.404920, -69.662972], label: "4K",  pois: [{ icon: "♪", color: "#a855f7" }] },
  { pos: [11.409608, -69.664795], label: "5K",  pois: [{ icon: "C", color: "#eab308" }] },
  { pos: [11.411626, -69.655788], label: "6K",  pois: [{ icon: "P", color: "#3b82f6" }] },
  { pos: [11.414632, -69.654480], label: "7K",  pois: [{ icon: "♪", color: "#a855f7" }, { icon: "+", color: "#22c55e" }] },
  { pos: [11.416061, -69.658941], label: "8K",  pois: [] },
  { pos: [11.418158, -69.668000], label: "9K",  pois: [{ icon: "♪", color: "#a855f7" }] },
];

/* ─────────────────────────────────────────────────────────────────────────── */
/* [V15.1-1] RUTA CANINATA 5K — Loop norte, termina en Lidotel               */
/* ─────────────────────────────────────────────────────────────────────────── */
const caninataRoute5K: [number, number][] = [
  [10.070519, -69.291850], // Lidotel — SALIDA
  [10.070007, -69.292075], // Hotel
  [10.072938, -69.290581], // Troncal 4
  [10.073323, -69.290469], // Av Venezuela
  [10.077091, -69.289493], // Troncal 4
  [10.079665, -69.288816], // Av Libertador
  [10.082015, -69.288985], // Av La Feria
  [10.083088, -69.289061], // Transversal
  [10.083088, -69.290000], // Calle Guri
  [10.082921, -69.290733], // Paso
  [10.081922, -69.290996], // Av AEB
  [10.081941, -69.291861], // Av AEB
  [10.080257, -69.292086], // ANP
  [10.078907, -69.285302], // Av Libertador
  [10.078037, -69.284137], // Av Los Leones
  [10.075447, -69.283329], // ""
  [10.072467, -69.283936], // Av Venezuela
  [10.073282, -69.290226], // Av
  [10.070519, -69.291850], // Lidotel — META 5K
];

/* ─────────────────────────────────────────────────────────────────────────── */
/* [V15.1-2] RUTA CANINATA 10K — base 5K + extensión sur + regreso Caroní   */
/* ─────────────────────────────────────────────────────────────────────────── */
const caninataRoute10K: [number, number][] = [
  [10.070519, -69.291850], // Lidotel — SALIDA
  [10.070007, -69.292075], // Hotel
  [10.072938, -69.290581], // Troncal 4
  [10.073323, -69.290469], // Av Venezuela
  [10.077091, -69.289493], // Troncal 4
  [10.079665, -69.288816], // Av Libertador
  [10.082015, -69.288985], // Av La Feria
  [10.083088, -69.289061], // Transversal
  [10.083088, -69.290000], // Calle Guri
  [10.082921, -69.290733], // Paso
  [10.081922, -69.290996], // Av AEB
  [10.081941, -69.291861], // Av AEB
  [10.080257, -69.292086], // ANP
  [10.079522, -69.288849],
  [10.073282, -69.290226], // Av
  // ── Extensión sur 10K ───────────────────────────────────────────────────
  [10.070932, -69.291616], // Troncal 4 sur
  [10.065053, -69.292257], // ""
  [10.060223, -69.293289], // Calle 6
  [10.057109, -69.289339], // Calle B
  [10.052219, -69.286893], // Altamira / Terepaima
  [10.053100, -69.284387], // ""
  [10.063093, -69.283825], // "" Lara
  [10.062017, -69.277521], // Tiuna
  [10.066864, -69.276653], // Calle 14
  // ── Regreso Caroní ──────────────────────────────────────────────────────
  [10.067928, -69.282669], // Av Caroní
  [10.068452, -69.284482], // El París
  [10.069459, -69.288448], // APP
  [10.069281, -69.289687], // JGI
  [10.071134, -69.290295], // JGL
  [10.071478, -69.291331], // Troncal
  [10.070519, -69.291850], // Lidotel — META 10K
];

/* ─────────────────────────────────────────────────────────────────────────── */
/* [V15.1-3] WAYPOINTS CANINATA 10K — sobre el trazado real corregido        */
/* ─────────────────────────────────────────────────────────────────────────── */
const CANINATA_WAYPOINTS_10K = [
  {
    pos: [10.070519, -69.291850], isMeta: true, isCaninata: true, label: "META",
    pois: [
      { icon: "🐾", color: "#FDD454" },
      { icon: "🩺", color: "#22c55e" },
      { icon: "B",  color: "#94a3b8" },
      { icon: "C",  color: "#D09644" },
    ],
  },
  { pos: [10.079665, -69.288816], isCaninata: true, label: "1K", },
  { pos: [10.083088, -69.290000], isCaninata: true, label: "2K", },
  { pos: [10.073323, -69.290469], isCaninata: true, label: "3K", },
  { pos: [10.069596, -69.292092], isCaninata: true, label: "4K", },
  { pos: [10.060223, -69.293289], isCaninata: true, label: "5K", },
  { pos: [10.052219, -69.286893], isCaninata: true, label: "6K",  },
  { pos: [10.062017, -69.277521], isCaninata: true, label: "7K", },
  { pos: [10.067928, -69.282669], isCaninata: true, label: "8K", },
  { pos: [10.069459, -69.288448], isCaninata: true, label: "9K", },
];

/* ─────────────────────────────────────────────────────────────────────────── */
/* [V15.1-4] WAYPOINTS CANINATA 5K — sobre el loop norte real corregido      */
/* ─────────────────────────────────────────────────────────────────────────── */
const CANINATA_WAYPOINTS_5K = [
  {
    pos: [10.070519, -69.291850], isMeta: true, isCaninata: true, label: "META",
    pois: [{ icon: "🐾", color: "#FDD454" }, { icon: "🩺", color: "#22c55e" }],
  },
  { pos: [10.077091, -69.289493], isCaninata: true, label: "1K",  pois: [] },
  { pos: [10.082015, -69.288985], isCaninata: true, label: "2K",  pois: [{ icon: "P", color: "#3b82f6" }] },
  { pos: [10.080257, -69.292086], isCaninata: true, label: "3K",  pois: [{ icon: "🩺", color: "#22c55e" }] },
  { pos: [10.075447, -69.283329], isCaninata: true, label: "4K",  pois: [{ icon: "P", color: "#3b82f6" }] },
  { pos: [10.073282, -69.290226], isCaninata: true, label: "5K",  pois: [] },
];

/* ─────────────────────────────────────────────────────────────────────────── */
/* COMING SOON PANEL (V14 — sin cambios)                                      */
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

  const banner       = getRaceBanner(race?.name ?? "");
  const countdown    = useCountdown(race?.date);
  const inscAbiertas = race?.inscripciones_abiertas ?? INSCRIPCIONES_ABIERTAS;

  return (
    <div className="min-h-screen w-full bg-[#03070b] flex flex-col text-white relative font-sans pt-[85px] md:pt-[104px] pb-12 overflow-y-auto">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-amber-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[300px] bg-cyan-500/5 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-2xl mx-auto px-4 sm:px-6 flex flex-col items-center py-8">
        <div className="w-full flex justify-start mb-8">
          <button onClick={onBack}
            className="flex items-center gap-2 group bg-white/[0.03] hover:bg-white/10 py-2 px-4 rounded-full transition-all border border-white/5">
            <ArrowLeft className="h-4 w-4 text-cyan-400 group-hover:-translate-x-1 transition-transform" />
            <span className="font-black text-[9px] tracking-[0.3em] uppercase text-white/70">Volver</span>
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="w-full bg-white/[0.02] border border-white/8 rounded-[2.5rem] backdrop-blur-2xl overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.6)] flex flex-col items-center text-center"
        >
          {banner && (
            <div className="w-full relative">
              <img src={banner} alt={race?.name ?? "Banner de carrera"} loading="lazy" decoding="async" className="w-full h-auto object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#03070b] via-transparent to-transparent" />
            </div>
          )}

          <div className="w-full flex flex-col items-center gap-6 p-7 sm:p-10 md:p-12">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-400/20">
              <motion.span className="w-1.5 h-1.5 rounded-full bg-amber-400"
                animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1.8, repeat: Infinity }} />
              <span className="text-[8px] font-black tracking-[0.4em] uppercase text-amber-300">
                Detalles Operativos En Preparación
              </span>
            </div>

            <div>
              <h1 className="text-3xl sm:text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-[0.9] text-white mb-3">
                {race?.name ?? "PRÓXIMA MISIÓN"}
              </h1>
              <p className="text-white/30 text-sm font-bold tracking-widest uppercase">
                La ruta táctica se revelará pronto
              </p>
            </div>

            {countdown && (
              <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-cyan-500/[0.06] border border-cyan-400/15">
                <Zap className="h-4 w-4 text-cyan-400" />
                <span className="text-xs font-black text-cyan-300 tracking-[0.3em] uppercase">
                  Faltan {countdown.days} días {countdown.hours}h
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
              {[
                { icon: MapPin,   label: "Ubicación", val: race?.location ?? "—" },
                { icon: Calendar, label: "Fecha",     val: dateStr               },
                { icon: Users,    label: "Inscritos", val: `${registeredCount}`  },
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

            <div className="w-full h-px bg-white/5" />

            <div className="flex items-start gap-4 text-left bg-cyan-500/[0.04] border border-cyan-400/10 rounded-2xl p-5 w-full">
              <Shield className="h-5 w-5 text-cyan-400 mt-0.5 shrink-0" />
              <p className="text-[11px] text-white/50 leading-relaxed">
                El mapa de ruta, waypoints de hidratación, cronometraje y estructura de premios
                serán publicados en las próximas semanas. Mantente atento al canal oficial de Rayocero.
              </p>
            </div>

            {inscAbiertas ? (
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
          </div>
        </motion.div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────── */
/* BARQUISIMETO DETAIL (V14 — sin cambios)                                    */
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
            pathOptions={{ color: "#00f2ff", weight: 5, opacity: 0.9, className: "glow-path-cyan" }} />
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
        .glow-path-cyan { filter: drop-shadow(0 0 15px rgba(0,242,255,0.5)); }
        .radar-pulse { animation: radar 3s ease-out infinite; transform-origin: center; }
        @keyframes radar { 0% { r: 50; opacity: 0.8; } 100% { r: 400; opacity: 0; } }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 10px; }
      `}</style>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────── */
/* CORO DETAIL (V14 — sin cambios)                                            */
/* ─────────────────────────────────────────────────────────────────────────── */
const CoroDetail = ({ race, registeredCount, onRegister }: {
  race: any;
  registeredCount: number;
  onRegister: (e: React.MouseEvent) => void;
}) => {
  const navigate     = useNavigate();
  const mapBounds    = useMemo(() => L.latLngBounds(coroRoute), []);
  const banner       = getRaceBanner(race?.name ?? "");
  const inscAbiertas = race?.inscripciones_abiertas ?? INSCRIPCIONES_ABIERTAS;
  const dateStr      = race?.date
    ? new Date(race.date + "T00:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" }).toUpperCase()
    : "20 . AGO . 2026";

  return (
    <div className="h-screen w-full bg-[#03070b] flex flex-col lg:flex-row overflow-hidden text-white relative font-sans pt-[85px] md:pt-[104px] z-0">
      <div className="relative w-full lg:w-[65%] h-[45vh] lg:h-full bg-[#080808] z-0">
        <MapComp bounds={mapBounds} zoom={14} className="h-full w-full z-10" zoomControl={false}>
          <MapController bounds={mapBounds} />
          <TileComp url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution="&copy; CARTO" />
          <CircleComp center={[11.409922, -69.675254]} radius={300}
            pathOptions={{ color: "#00f2ff", fillColor: "#00f2ff", fillOpacity: 0.08, weight: 1, className: "radar-pulse" }} />
          <PolyComp positions={coroRoute}
            pathOptions={{ color: "#00f2ff", weight: 5, opacity: 0.9, className: "glow-path-cyan" }} />
          {CORO_WAYPOINTS.map((wp, idx) => (
            <MarkerComp key={idx} position={wp.pos} icon={createCompoundIcon(wp)} />
          ))}
        </MapComp>
        <div className="absolute bottom-10 left-10 z-[500] pointer-events-none hidden md:block">
          <h2 className="text-white font-black italic text-7xl leading-[0.8] tracking-tighter uppercase opacity-30 select-none drop-shadow-2xl">
            499 RUN<br />CORO <span className="text-cyan-500">10K</span>
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
              <p className="text-[7px] text-white/30 font-bold uppercase mt-1">499 RUN CORO FALCÓN</p>
            </div>
            <div className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_10px_#00f2ff]" />
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12 pb-10">
          {banner && (
            <div className="w-full relative rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_40px_rgba(34,211,238,0.08)] group">
              <div className="absolute inset-0 bg-gradient-to-t from-[#03070b] via-transparent to-transparent opacity-50 z-10 pointer-events-none" />
              <img src={banner} alt={race?.name ?? "499 Run Coro Falcón"}
                className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
            </div>
          )}

          <header className="space-y-4">
            <h1 className="text-7xl font-black italic uppercase leading-none tracking-tighter">
              10<span className="text-cyan-400">K</span>
            </h1>
            <p className="text-sm font-black tracking-[0.5em] text-white/30 uppercase">{dateStr}</p>
          </header>

          <div className="grid grid-cols-1 gap-4">
            {[
              { icon: MapPin, label: "Salida / Meta",       val: "Av. Manaure, Coro" },
              { icon: Clock,  label: "Hora Operativa",      val: race?.time ?? "Por confirmar" },
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

          {inscAbiertas ? (
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
        .glow-path-cyan { filter: drop-shadow(0 0 15px rgba(0,242,255,0.5)); }
        .radar-pulse { animation: radar 3s ease-out infinite; transform-origin: center; }
        @keyframes radar { 0% { r: 50; opacity: 0.8; } 100% { r: 400; opacity: 0; } }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 10px; }
      `}</style>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────── */
/* CANINATA DETAIL — V15.1 (rutas corregidas, lógica V15.0 intacta)          */
/* ─────────────────────────────────────────────────────────────────────────── */
type CaninataMode = "10K" | "5K";

const CaninataDetail = ({ race, registeredCount, onRegister }: {
  race: any;
  registeredCount: number;
  onRegister: (e: React.MouseEvent) => void;
}) => {
  const navigate = useNavigate();
  const [activeMode, setActiveMode] = useState<CaninataMode>("10K");

  const mapBounds = useMemo(() => {
    const route = activeMode === "10K" ? caninataRoute10K : caninataRoute5K;
    return L.latLngBounds(route);
  }, [activeMode]);

  const inscAbiertas = race?.inscripciones_abiertas ?? INSCRIPCIONES_ABIERTAS;

  const dateStr = race?.date
    ? new Date(race.date + "T00:00:00").toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" }).toUpperCase()
    : "4 . OCT . 2026";

  const banner = getRaceBanner(race?.name ?? "");

  const ACCENT_10K = "#D09644";
  const ACCENT_AMB = "#FDD454";

  return (
    <div className="h-screen w-full flex flex-col lg:flex-row overflow-hidden text-white relative font-sans pt-[85px] md:pt-[104px] z-0"
      style={{ background: "#050801" }}>

      {/* MAPA */}
      <div className="relative w-full lg:w-[65%] h-[45vh] lg:h-full z-0" style={{ background: "#050801" }}>

        {/* Toggle */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[600] flex gap-1 p-1 rounded-full"
          style={{ background: "rgba(5,8,1,0.85)", border: "1px solid rgba(253,212,84,0.2)", backdropFilter: "blur(12px)" }}>
          {(["10K", "5K"] as CaninataMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setActiveMode(mode)}
              className="px-5 py-2 rounded-full font-black text-[10px] tracking-[0.3em] uppercase transition-all"
              style={
                activeMode === mode
                  ? {
                      background: mode === "10K" ? ACCENT_10K : "#3C491F",
                      color: mode === "10K" ? "#050801" : "#FDD454",
                      boxShadow: `0 0 16px ${mode === "10K" ? "#D0964455" : "#3C491F55"}`,
                    }
                  : { color: "rgba(255,255,255,0.4)" }
              }>
              {mode === "10K" ? "🏃 10K CARRERA" : "🐾 5K CAMINATA"}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={activeMode} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }} className="h-full w-full">
            <MapComp bounds={mapBounds} zoom={14} className="h-full w-full z-10" zoomControl={false}>
              <MapController bounds={mapBounds} />
              <TileComp url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution="&copy; CARTO" />
              <CircleComp
                center={[10.070519, -69.291850]}
                radius={200}
                pathOptions={{ color: ACCENT_AMB, fillColor: ACCENT_AMB, fillOpacity: 0.06, weight: 1, className: "radar-pulse-caninata" }}
              />
              {activeMode === "10K" && (
                <>
                  <PolyComp positions={caninataRoute10K}
                    pathOptions={{ color: ACCENT_10K, weight: 5, opacity: 0.95, className: "glow-path-amber" }} />
                  {CANINATA_WAYPOINTS_10K.map((wp, idx) => (
                    <MarkerComp key={idx} position={wp.pos} icon={createCompoundIcon(wp)} />
                  ))}
                </>
              )}
              {activeMode === "5K" && (
                <>
                  <PolyComp positions={caninataRoute5K}
                    pathOptions={{ color: "#4ade80", weight: 5, opacity: 0.95, className: "glow-path-green" }} />
                  {CANINATA_WAYPOINTS_5K.map((wp, idx) => (
                    <MarkerComp key={idx} position={wp.pos} icon={createCompoundIcon(wp)} />
                  ))}
                </>
              )}
            </MapComp>
          </motion.div>
        </AnimatePresence>

        <div className="absolute bottom-10 left-10 z-[500] pointer-events-none hidden md:block">
          <h2 className="font-black italic text-7xl leading-[0.8] tracking-tighter uppercase opacity-20 select-none drop-shadow-2xl"
            style={{ color: activeMode === "10K" ? ACCENT_10K : "#4ade80" }}>
            CANINATA<br />{activeMode} <span style={{ color: ACCENT_AMB }}>ROUTE</span>
          </h2>
        </div>
      </div>

      {/* SIDEBAR */}
      <aside className="w-full lg:w-[35%] h-[55vh] lg:h-full overflow-y-auto p-8 lg:p-12 custom-scrollbar relative z-10"
        style={{ background: "#050801", borderLeft: "1px solid rgba(253,212,84,0.08)" }}>

        <div className="flex items-center justify-between mb-8 pb-6"
          style={{ borderBottom: "1px solid rgba(253,212,84,0.08)" }}>
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-2 group py-2 px-4 rounded-full transition-all"
            style={{ background: "rgba(253,212,84,0.04)", border: "1px solid rgba(253,212,84,0.1)" }}>
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" style={{ color: ACCENT_AMB }} />
            <span className="font-black text-[9px] tracking-[0.3em] uppercase" style={{ color: "rgba(255,255,255,0.5)" }}>Volver</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[9px] font-black tracking-widest leading-none" style={{ color: ACCENT_AMB }}>RAYOCERO</p>
              <p className="text-[7px] font-bold uppercase mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>CANINATA BCO</p>
            </div>
            <motion.div className="h-2 w-2 rounded-full"
              style={{ background: ACCENT_AMB, boxShadow: `0 0 10px ${ACCENT_AMB}` }}
              animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 2, repeat: Infinity }} />
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-10 pb-10">

          {banner && (
            <div className="w-full relative rounded-2xl overflow-hidden group"
              style={{ border: "1px solid rgba(253,212,84,0.12)", boxShadow: "0 0 40px rgba(253,212,84,0.05)" }}>
              <div className="absolute inset-0 bg-gradient-to-t from-[#050801] via-transparent to-transparent opacity-60 z-10 pointer-events-none" />
              <img src={banner} alt={race?.name ?? "Caninata"}
                className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
            </div>
          )}

          <header className="space-y-3">
            <h1 className="text-7xl font-black italic uppercase leading-none tracking-tighter text-white">
              CANI<span style={{ color: ACCENT_AMB }}>NATA</span>
            </h1>
            <p className="text-sm font-black tracking-[0.4em] uppercase" style={{ color: "rgba(255,255,255,0.25)" }}>
              {dateStr}
            </p>
            <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#4ade80" }}>
              Día Mundial de la Castración Animal
            </p>
          </header>

          <div className="flex gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full"
              style={{ background: "rgba(208,150,68,0.08)", border: "1px solid rgba(208,150,68,0.25)" }}>
              <span className="text-[9px] font-black tracking-[0.3em] uppercase" style={{ color: ACCENT_10K }}>
                🏃 10K CARRERA
              </span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full"
              style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)" }}>
              <span className="text-[9px] font-black tracking-[0.3em] uppercase text-green-400">
                🐾 5K CAMINATA
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {[
              { icon: MapPin, label: "Salida / Meta",  val: "Lidotel Barquisimeto"            },
              { icon: Clock,  label: "Hora Operativa", val: race?.time ?? "Por confirmar"     },
              { icon: Users,  label: "Inscritos",      val: `${registeredCount}`              },
              { icon: Heart,  label: "Causa",          val: "Castración Animal"               },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-5 p-4 rounded-2xl transition-all"
                style={{ background: "rgba(253,212,84,0.02)", border: "1px solid rgba(253,212,84,0.06)" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(253,212,84,0.2)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(253,212,84,0.06)")}>
                <div className="h-11 w-11 flex items-center justify-center rounded-xl"
                  style={{ background: "rgba(253,212,84,0.08)", color: ACCENT_AMB }}>
                  <item.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.2)" }}>
                    {item.label}
                  </p>
                  <p className="font-bold text-base uppercase text-white">{item.val}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-start gap-4 p-5 rounded-2xl"
            style={{ background: "rgba(253,212,84,0.04)", border: "1px solid rgba(253,212,84,0.1)" }}>
            <Dog className="h-5 w-5 mt-0.5 shrink-0" style={{ color: ACCENT_AMB }} />
            <div>
              <p className="text-[9px] font-black tracking-[0.3em] uppercase mb-1" style={{ color: ACCENT_AMB }}>
                Invitado Especial
              </p>
              <p className="text-sm font-black text-white uppercase">TSUNAMI — Héroe Nacional 🐾</p>
              <p className="text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                El perro que ayudó a salvar vidas en el sismo del 24 de junio de 2026.
              </p>
            </div>
          </div>

 

          {inscAbiertas ? (
            <button onClick={onRegister}
              className="w-full py-7 rounded-2xl font-black text-xs tracking-[0.4em] uppercase italic transition-all flex items-center justify-center gap-4 active:scale-95"
              style={{
                background: `linear-gradient(135deg, ${ACCENT_10K}, ${ACCENT_AMB})`,
                color: "#050801",
                boxShadow: `0 0 30px rgba(208,150,68,0.25)`,
              }}>
              INSCRIBIRME <ChevronRight className="h-4 w-4" />
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

          <div className="pt-5" style={{ borderTop: "1px solid rgba(253,212,84,0.06)" }}>
            <p className="text-[9px] font-black tracking-[0.3em] uppercase mb-5" style={{ color: "rgba(255,255,255,0.3)" }}>
              Leyenda Operativa
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { color: ACCENT_10K, icon: "1K", label: "KM 10K"     },
                { color: "#4ade80",  icon: "🐾", label: "MASCOTAS"   },
                { color: "#3b82f6",  icon: "P",  label: "HIDRATACIÓN"},
                { color: "#22c55e",  icon: "🩺", label: "VETERINARIO"},
                { color: ACCENT_AMB, icon: "C",  label: "CRONO"      },
                { color: "#94a3b8",  icon: "B",  label: "BAÑOS"      },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full border flex items-center justify-center text-[10px] font-black"
                    style={{ borderColor: l.color, color: l.color }}>{l.icon}</div>
                  <span className="text-[9px] font-bold" style={{ color: "rgba(255,255,255,0.5)" }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </aside>

      <style>{`
        .glow-path-amber { filter: drop-shadow(0 0 12px rgba(208,150,68,0.6)); }
        .glow-path-green { filter: drop-shadow(0 0 12px rgba(74,222,128,0.5)); }
        .radar-pulse-caninata { animation: radarGold 3s ease-out infinite; transform-origin: center; }
        @keyframes radarGold { 0% { r: 50; opacity: 0.8; } 100% { r: 400; opacity: 0; } }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 10px; }
      `}</style>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────── */
/* MAIN COMPONENT — router dinámico V15                                       */
/* ─────────────────────────────────────────────────────────────────────────── */
const RaceDetail = () => {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const [race, setRace]                       = useState<any>(null);
  const [loading, setLoading]                 = useState(true);
  const [registeredCount, setRegisteredCount] = useState(0);

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
    if (!race || !id) return;
    const fetchCount = async () => {
      try {
        let query = supabase
          .from("runners")
          .select("*", { count: "exact", head: true })
          .eq("estado", "confirmado");

        if (isBarquisimetoRace(race.name)) {
          query = query.is("race_id", null);
        } else {
          query = query.eq("race_id", id);
        }

        const { count, error } = await query;
        if (!error && count !== null) setRegisteredCount(count);
      } catch (err) { console.error("[MIA] Error fetching count:", err); }
    };
    fetchCount();
  }, [race, id]);

  const handleRegister = (e: React.MouseEvent) => {
    e.preventDefault();
    if (race && isCaninataRace(race.name)) {
      navigate(`/registro?race=${id}&tipo=caninata`);
    } else {
      navigate("/registro");
    }
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

  // Router V15 — Caninata primero
  if (race && hasMapConfig(race.name)) {
    if (isCaninataRace(race.name)) {
      return <CaninataDetail race={race} registeredCount={registeredCount} onRegister={handleRegister} />;
    }
    if (isBarquisimetoRace(race.name)) {
      return <BarquisimetoDetail registeredCount={registeredCount} onRegister={handleRegister} />;
    }
    if (isCoroRace(race.name)) {
      return <CoroDetail race={race} registeredCount={registeredCount} onRegister={handleRegister} />;
    }
  }

  return (
    <ComingSoonPanel
      race={race}
      registeredCount={registeredCount}
      onBack={() => navigate(-1)}
      onRegister={handleRegister}
    />
  );
};

export default RaceDetail;
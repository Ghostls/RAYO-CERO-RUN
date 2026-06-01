/**
 * RAYO CERO — REGISTRATION TERMINAL (STABLE BUILD V25_REAL_MAP)
 * Senior Dev: MIA (Valkyron Group)
 * CEO: Lualdo Sciscioli
 * REGLA DE ORO: Código completo sin omisiones. Base mantenida.
 *
 * CHANGELOG V25:
 * [V25-1] MAP UPGRADE: SVG estático reemplazado por Leaflet real con coordenadas
 *         GPS exactas extraídas de RaceDetail.tsx (officialRoute + WAYPOINTS).
 * [V25-2] TILE LAYER: Stadia Alidade Smooth Dark — máximo detalle urbano.
 * [V25-3] WAYPOINTS: Marcadores compuestos con POIs heredados de RaceDetail.
 * [V25-4] GLOW PATH: Polyline con drop-shadow cyan idéntico al RaceDetail.
 * [V25-5] PANEL: Mapa flotante con overlay de título y badge de ruta oficial.
 * [V25-6] Todo el formulario original intacto debajo del early return.
 */

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Shield, CheckCircle, Trophy, Mail, CreditCard,
  Loader2, AlertCircle, Home, Banknote, UploadCloud,
  Accessibility, RefreshCw, Download, Lock, Bell,
  ChevronRight, Flag, Timer, Users, MapPin,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import imageCompression from "browser-image-compression";
import emailjs from "@emailjs/browser";

// Leaflet — mismo stack que RaceDetail.tsx
import { MapContainer, TileLayer, Polyline, Marker, useMap, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { registerRunner, calcularEdad, calcularCategoria, type RegistrationFormData } from "@/lib/api";
import { supabase } from "@/lib/supabase";

import logoPrincipal from "../assets/logo.png";
import dorsalBgSrc from "../assets/dorsal-bg.png";

// Bypass TypeScript para Leaflet (idéntico a RaceDetail)
const MapComp    = MapContainer as any;
const TileComp   = TileLayer   as any;
const PolyComp   = Polyline    as any;
const MarkerComp = Marker      as any;
const CircleComp = Circle      as any;

/* ══════════════════════════════════════════════════════════════════════════════
 * FLAG DE CONTROL
 * ══════════════════════════════════════════════════════════════════════════════ */
const INSCRIPCIONES_ABIERTAS = false;

/* ══════════════════════════════════════════════════════════════════════════════
 * METADATA DEL EVENTO
 * ══════════════════════════════════════════════════════════════════════════════ */
const EVENTO = {
  nombre:     "RAYOCERO 10K · NIGHT FEST",
  fecha:      "06 JUN 2026",
  hora:       "06:00 PM",
  distancia:  "10K",
  atletas:    "+1.000",
  desnivel:   "+180M",
  lugar:      "MONUMENTO AL SOL",
  proximaEd:  "TEMPORADA 2026",
  targetDate: new Date("2026-06-06T06:00:00"),
};

/* ─────────────────────────────────────────────────────────────────────────── */
/* INTERFACES                                                                  */
/* ─────────────────────────────────────────────────────────────────────────── */
interface FormData {
  nombre: string; apellido: string; cedula: string; email: string;
  telefono: string; fechaNacimiento: string; genero: string; talla: string;
  movilidadReducida: boolean; referenciaPago: string;
  contactoEmergencia: string; telefonoEmergencia: string;
  aceptaDeslinde: boolean; timestampAceptacion?: string;
}
const initialForm: FormData = {
  nombre: "", apellido: "", cedula: "", email: "", telefono: "",
  fechaNacimiento: "", genero: "", talla: "", movilidadReducida: false,
  referenciaPago: "", contactoEmergencia: "", telefonoEmergencia: "",
  aceptaDeslinde: false,
};

/* ─────────────────────────────────────────────────────────────────────────── */
/* SKELETON DORSAL                                                             */
/* ─────────────────────────────────────────────────────────────────────────── */
const DorsalSkeleton = () => (
  <div className="absolute inset-0 w-full h-full bg-white/[0.02] rounded-2xl overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent animate-[shimmer_1.5s_infinite]" />
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
      <div className="w-48 h-32 bg-white/[0.04] rounded-xl animate-pulse" />
      <div className="w-64 h-6 bg-white/[0.03] rounded-lg animate-pulse" />
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════════════════════════
 * MAPA LEAFLET REAL — coordenadas GPS exactas de RaceDetail.tsx
 * ══════════════════════════════════════════════════════════════════════════════ */

// Ruta oficial exacta (copiada 1:1 de RaceDetail)
const OFFICIAL_ROUTE: [number, number][] = [
  [10.077576, -69.283447],
  [10.067250, -69.284621],
  [10.062852, -69.282465],
  [10.061500, -69.276373],
  [10.064014, -69.288046],
  [10.065609, -69.295721],
  [10.068926, -69.296563],
  [10.068897, -69.298359],
  [10.073951, -69.297750],
  [10.073542, -69.296712],
  [10.070855, -69.294501],
  [10.069175, -69.293670],
  [10.069175, -69.292201],
  [10.070609, -69.291723],
  [10.079514, -69.288873],
  [10.078963, -69.285316],
  [10.079192, -69.283498],
  [10.080416, -69.281270],
  [10.078575, -69.280296],
  [10.076105, -69.280867],
  [10.076149, -69.283252],
  [10.077576, -69.283447],
];

// Waypoints compuestos (copiados 1:1 de RaceDetail)
const WAYPOINTS = [
  {
    pos: [10.077576, -69.283447] as [number, number],
    isMeta: true, label: "META",
    pois: [
      { icon: "♪", color: "#a855f7" },
      { icon: "B", color: "#94a3b8" },
      { icon: "+", color: "#22c55e" },
      { icon: "C", color: "#eab308" },
    ],
  },
  { pos: [10.067250, -69.284621] as [number, number], label: "1K",  pois: [{ icon: "♪", color: "#a855f7" }] },
  { pos: [10.062852, -69.282465] as [number, number], label: "2K",  pois: [] },
  { pos: [10.061500, -69.276373] as [number, number], label: "3K",  pois: [{ icon: "♪", color: "#a855f7" }] },
  { pos: [10.064014, -69.288046] as [number, number], label: "4K",  pois: [{ icon: "P", color: "#3b82f6" }] },
  { pos: [10.065609, -69.295721] as [number, number], label: "5K",  pois: [{ icon: "♪", color: "#a855f7" }, { icon: "C", color: "#eab308" }] },
  { pos: [10.073542, -69.296712] as [number, number], label: "6K",  pois: [] },
  { pos: [10.070855, -69.294501] as [number, number], label: "7K",  pois: [{ icon: "♪", color: "#a855f7" }, { icon: "+", color: "#22c55e" }] },
  { pos: [10.070609, -69.291723] as [number, number], label: "8K",  pois: [{ icon: "P", color: "#3b82f6" }] },
  { pos: [10.079514, -69.288873] as [number, number], label: "9K",  pois: [] },
];

// Generador de marcadores compuestos (idéntico a RaceDetail)
const createCompoundIcon = (waypoint: typeof WAYPOINTS[0]) => {
  let poiHtml = "";
  if (waypoint.pois && waypoint.pois.length > 0) {
    const circles = waypoint.pois.map((poi) =>
      `<div style="background:#000;width:18px;height:18px;border-radius:50%;border:1.5px solid ${poi.color};display:flex;align-items:center;justify-content:center;color:${poi.color};font-weight:900;font-size:9px;box-shadow:0 0 8px ${poi.color}40;flex-shrink:0;">${poi.icon}</div>`
    ).join("");
    poiHtml = `<div style="display:flex;gap:4px;margin-left:6px;background:rgba(0,0,0,0.6);padding:4px 6px;border-radius:20px;backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.1);">${circles}</div>`;
  }

  const main = waypoint.isMeta
    ? `<div style="background:#000;width:40px;height:40px;border-radius:50%;border:2px solid #00f2ff;box-shadow:0 0 20px #00f2ff;display:flex;align-items:center;justify-content:center;color:#00f2ff;font-weight:900;font-size:10px;text-transform:uppercase;z-index:10;flex-shrink:0;">META</div>`
    : `<div style="background:#00f2ff;width:30px;height:30px;border-radius:50%;border:2px solid #000;box-shadow:0 0 10px rgba(0,242,255,0.5);display:flex;align-items:center;justify-content:center;color:#000;font-weight:900;font-size:12px;font-style:italic;z-index:10;flex-shrink:0;">${waypoint.label}</div>`;

  return L.divIcon({
    className: "custom-compound-marker",
    html: `<div style="display:flex;align-items:center;width:max-content;pointer-events:none;">${main}${poiHtml}</div>`,
    iconSize: [0, 0],
    iconAnchor: waypoint.isMeta ? [20, 20] : [15, 15],
  });
};

// Controller que ajusta bounds al montar
const MapBoundsController = ({ bounds }: { bounds: L.LatLngBoundsExpression }) => {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => {
      map.invalidateSize();
      map.fitBounds(bounds, { padding: [40, 40] });
    }, 400);
    return () => clearTimeout(t);
  }, [map, bounds]);
  return null;
};

// Componente del mapa completo
const RealRouteMap = () => {
  const bounds = useMemo(() => L.latLngBounds(OFFICIAL_ROUTE), []);

  return (
    <div className="relative w-full overflow-hidden rounded-[1.75rem]"
      style={{ height: "420px", border: "1px solid rgba(255,255,255,0.07)" }}>

      <MapComp
        bounds={bounds}
        zoom={15}
        className="h-full w-full"
        zoomControl={false}
        scrollWheelZoom={false}
        dragging={true}
        attributionControl={false}
        style={{ background: "#03070b" }}
      >
        <MapBoundsController bounds={bounds} />

        {/* Tile layer Stadia Alidade Smooth Dark — máximo detalle urbano */}
        <TileComp
          url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>'
        />

        {/* Pulso radar en salida/meta */}
        <CircleComp
          center={[10.077576, -69.283447]}
          radius={200}
          pathOptions={{
            color: "#00f2ff",
            fillColor: "#00f2ff",
            fillOpacity: 0.06,
            weight: 1,
            className: "rc-radar-pulse",
          }}
        />

        {/* Polyline con glow cyan */}
        <PolyComp
          positions={OFFICIAL_ROUTE}
          pathOptions={{
            color: "#00f2ff",
            weight: 5,
            opacity: 0.92,
            className: "rc-glow-path",
          }}
        />

        {/* Waypoints compuestos */}
        {WAYPOINTS.map((wp, i) => (
          <MarkerComp
            key={`rc-wp-${i}`}
            position={wp.pos}
            icon={createCompoundIcon(wp)}
          />
        ))}
      </MapComp>

      {/* Overlay: título sobre el mapa */}
      <div className="pointer-events-none absolute bottom-4 left-5 z-[500]">
        <p
          className="font-black italic uppercase leading-none select-none"
          style={{
            fontSize: "clamp(1.4rem, 4vw, 2rem)",
            color: "rgba(255,255,255,0.18)",
            letterSpacing: "-0.01em",
            textShadow: "0 2px 20px rgba(0,0,0,0.8)",
          }}
        >
          NIGHT FEST <span style={{ color: "rgba(0,212,200,0.35)" }}>10K</span>
        </p>
        <p style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.2)", letterSpacing: "0.18em", fontWeight: 700 }}>
          BARQUISIMETO · RUTA OFICIAL
        </p>
      </div>

      {/* Badge top-right */}
      <div
        className="pointer-events-none absolute top-4 right-4 z-[500] flex items-center gap-1.5 px-3 py-1.5 rounded-full"
        style={{
          background: "rgba(3,7,11,0.75)",
          border: "1px solid rgba(0,212,200,0.2)",
          backdropFilter: "blur(12px)",
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: "#00d4c8" }}
        />
        <span style={{
          fontSize: "0.6rem",
          fontWeight: 800,
          letterSpacing: "0.14em",
          color: "rgba(0,212,200,0.8)",
          textTransform: "uppercase",
          fontFamily: "'Barlow Condensed', sans-serif",
        }}>
          GPS VERIFICADO
        </span>
      </div>

      {/* Leyenda compacta */}
      <div
        className="pointer-events-none absolute top-4 left-4 z-[500] flex flex-col gap-1.5 px-3 py-2.5 rounded-xl"
        style={{
          background: "rgba(3,7,11,0.8)",
          border: "1px solid rgba(255,255,255,0.07)",
          backdropFilter: "blur(12px)",
        }}
      >
        {[
          { icon: "♪", color: "#a855f7", label: "Música"   },
          { icon: "P", color: "#3b82f6", label: "Hidrat."  },
          { icon: "+", color: "#22c55e", label: "Médico"   },
          { icon: "C", color: "#eab308", label: "Crono"    },
          { icon: "B", color: "#94a3b8", label: "Baños"    },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-2">
            <div style={{
              width: 16, height: 16, borderRadius: "50%",
              border: `1.5px solid ${l.color}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: l.color, fontSize: 8, fontWeight: 900,
            }}>
              {l.icon}
            </div>
            <span style={{
              fontSize: "0.58rem", fontWeight: 700,
              color: "rgba(255,255,255,0.4)",
              textTransform: "uppercase", letterSpacing: "0.08em",
              fontFamily: "'Barlow Condensed', sans-serif",
            }}>
              {l.label}
            </span>
          </div>
        ))}
      </div>

      <style>{`
        .rc-glow-path {
          filter: drop-shadow(0 0 8px rgba(0,242,255,0.7))
                  drop-shadow(0 0 2px rgba(0,242,255,1));
        }
        .rc-radar-pulse {
          animation: rc-radar 3s ease-out infinite;
          transform-origin: center;
        }
        @keyframes rc-radar {
          0%   { r: 50;  opacity: 0.8; }
          100% { r: 400; opacity: 0; }
        }
        .leaflet-container {
          background: #03070b !important;
        }
        /* Ocultar atribución de Leaflet para UI limpia */
        .leaflet-control-attribution {
          display: none !important;
        }
      `}</style>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════════
 * PANTALLA DE CIERRE DE INSCRIPCIONES
 * ══════════════════════════════════════════════════════════════════════════════ */
const RegistrationLockedScreen = () => {
  const navigate = useNavigate();

  const calcTime = () => {
    const ms = Math.max(0, EVENTO.targetDate.getTime() - Date.now());
    return {
      d: Math.floor(ms / 86_400_000),
      h: Math.floor((ms % 86_400_000) / 3_600_000),
      m: Math.floor((ms % 3_600_000) / 60_000),
      s: Math.floor((ms % 60_000) / 1_000),
    };
  };
  const [cd, setCd] = useState(calcTime);
  useEffect(() => {
    const id = setInterval(() => setCd(calcTime()), 1_000);
    return () => clearInterval(id);
  }, []);

  const stats = [
    { icon: <Users className="h-4 w-4" />,   label: "ATLETAS",   value: EVENTO.atletas   },
    { icon: <MapPin className="h-4 w-4" />,  label: "LUGAR",     value: "MON. AL SOL"    },
    { icon: <Timer className="h-4 w-4" />,   label: "DISTANCIA", value: EVENTO.distancia },
    { icon: <Flag className="h-4 w-4" />,    label: "SALIDA",    value: EVENTO.hora      },
  ];

  const cdUnits = [
    { val: cd.d, lbl: "DÍAS" },
    { val: cd.h, lbl: "HRS"  },
    { val: cd.m, lbl: "MIN"  },
    { val: cd.s, lbl: "SEG"  },
  ];

  return (
    <section
      className="relative min-h-screen pt-28 pb-24 px-4 sm:px-6 overflow-hidden"
      style={{ background: "#03070b", fontFamily: "'Barlow Condensed', 'Arial Narrow', sans-serif" }}
    >
      {/* Noise */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 opacity-[0.028]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E")` }}/>

      {/* Glow ambiental */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0"
        style={{ background: "radial-gradient(ellipse 70% 40% at 50% -5%, rgba(0,212,200,0.08) 0%, transparent 65%)" }}/>

      <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8"
        >
          <img src={logoPrincipal} alt="RayoCero Running" className="h-10 w-auto object-contain"
            style={{ filter: "brightness(1.05)" }}/>
        </motion.div>

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.45, ease: "backOut" }}
          className="mb-8 inline-flex items-center gap-2.5 px-5 py-2 rounded-full"
          style={{ background: "rgba(255,35,35,0.09)", border: "1px solid rgba(255,55,55,0.28)", backdropFilter: "blur(16px)" }}
        >
          <motion.span className="w-2 h-2 rounded-full" style={{ background: "#FF4444" }}
            animate={{ opacity: [1, 0.15, 1] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}/>
          <span className="text-xs font-black tracking-[0.22em] uppercase" style={{ color: "#FF6B6B" }}>
            INSCRIPCIONES CERRADAS
          </span>
        </motion.div>

        {/* Hero title */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-10"
        >
          <h1 className="font-black italic uppercase text-white leading-[0.88]"
            style={{ fontSize: "clamp(3rem, 11vw, 6.5rem)", letterSpacing: "-0.01em" }}>
            WE RUN <span style={{ color: "#00d4c8" }}>10K</span>
            <br />RAYOCERO
          </h1>
          <p className="mt-4 font-bold uppercase tracking-[0.26em] text-white/35"
            style={{ fontSize: "0.78rem" }}>
            NIGHT FEST · {EVENTO.fecha} · {EVENTO.hora}
          </p>
        </motion.div>

        {/* Card principal — Lock + Stats + Countdown */}
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full mb-4 rounded-[2rem] overflow-hidden"
          style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(32px)" }}
        >
          {/* Header */}
          <div className="px-8 pt-8 pb-6 flex flex-col items-center text-center">
            <div className="mb-6 h-16 w-16 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <Lock className="h-7 w-7" style={{ color: "#00d4c8" }}/>
            </div>
            <h2 className="font-black italic uppercase text-white mb-2"
              style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)", letterSpacing: "-0.01em" }}>
              CUPO COMPLETO
            </h2>
            <p className="font-semibold text-white/40 max-w-md leading-relaxed" style={{ fontSize: "0.88rem" }}>
              Más de <span className="text-white/75 font-black">1.000 atletas</span> confirmados para{" "}
              <span className="text-white/75 font-black">{EVENTO.nombre}</span>.
              El registro está oficialmente cerrado.
            </p>
          </div>

          <div className="mx-8 h-px" style={{ background: "rgba(255,255,255,0.06)" }}/>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-6">
            {stats.map((s, i) => (
              <motion.div key={s.label}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.38 + i * 0.06 }}
                className="flex flex-col items-center gap-1.5 py-4 px-3 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.055)" }}
              >
                <span style={{ color: "#00d4c8" }}>{s.icon}</span>
                <span className="font-black text-white text-center"
                  style={{ fontSize: "clamp(1rem, 2.5vw, 1.45rem)", fontVariantNumeric: "tabular-nums lining-nums", lineHeight: 1 }}>
                  {s.value}
                </span>
                <span className="font-bold uppercase"
                  style={{ fontSize: "0.6rem", letterSpacing: "0.16em", color: "rgba(255,255,255,0.28)" }}>
                  {s.label}
                </span>
              </motion.div>
            ))}
          </div>

          <div className="mx-8 h-px" style={{ background: "rgba(255,255,255,0.06)" }}/>

          {/* Countdown */}
          <div className="px-8 py-7">
            <p className="text-center font-bold uppercase tracking-[0.22em] mb-5"
              style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.22)" }}>
              TIEMPO HASTA LA SALIDA
            </p>
            <div className="flex items-start justify-center gap-2 sm:gap-4">
              {cdUnits.map((unit, i) => (
                <div key={unit.lbl} className="flex items-start gap-2 sm:gap-4">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="relative flex items-center justify-center rounded-xl overflow-hidden"
                      style={{
                        width: "clamp(56px,10vw,76px)", height: "clamp(56px,10vw,76px)",
                        background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)",
                      }}>
                      <div className="absolute top-0 left-0 right-0 h-px"
                        style={{ background: "rgba(255,255,255,0.1)" }}/>
                      <AnimatePresence mode="popLayout">
                        <motion.span key={unit.val}
                          initial={{ y: -14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 14, opacity: 0 }}
                          transition={{ duration: 0.16, ease: "easeOut" }}
                          className="font-black text-white"
                          style={{ fontSize: "clamp(1.3rem,3.5vw,1.85rem)", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                          {String(unit.val).padStart(2, "0")}
                        </motion.span>
                      </AnimatePresence>
                    </div>
                    <span className="font-bold uppercase"
                      style={{ fontSize: "0.58rem", letterSpacing: "0.16em", color: "rgba(255,255,255,0.25)" }}>
                      {unit.lbl}
                    </span>
                  </div>
                  {i < 3 && (
                    <span className="font-black"
                      style={{ fontSize: "clamp(1.2rem,3vw,1.6rem)", color: "rgba(0,212,200,0.35)", marginTop: "clamp(12px,2.5vw,18px)" }}>
                      :
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ══ MAPA LEAFLET REAL ══════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38, duration: 0.6 }}
          className="w-full mb-4"
        >
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="font-bold uppercase tracking-[0.18em]"
              style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.25)" }}>
              TRAYECTO OFICIAL
            </p>
            <p className="font-bold uppercase"
              style={{ fontSize: "0.6rem", color: "rgba(0,212,200,0.5)", letterSpacing: "0.12em" }}>
              10 KM · BARQUISIMETO · GPS REAL
            </p>
          </div>
          <RealRouteMap />
        </motion.div>

        {/* Próxima edición */}
        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.48, duration: 0.5 }}
          className="w-full rounded-[1.75rem] p-6 md:p-7 flex flex-col sm:flex-row items-center justify-between gap-5 mb-4"
          style={{ background: "rgba(0,212,200,0.04)", border: "1px solid rgba(0,212,200,0.15)", backdropFilter: "blur(24px)" }}
        >
          <div className="flex items-center gap-4">
            <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(0,212,200,0.09)", border: "1px solid rgba(0,212,200,0.2)" }}>
              <Bell className="h-5 w-5" style={{ color: "#00d4c8" }}/>
            </div>
            <div>
              <p className="font-black uppercase text-white" style={{ fontSize: "0.9rem", letterSpacing: "0.04em" }}>
                {EVENTO.proximaEd}
              </p>
              <p className="font-semibold text-white/35 mt-0.5" style={{ fontSize: "0.78rem" }}>
                Sé el primero cuando abran los cupos.
              </p>
            </div>
          </div>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/")}
            className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-full font-black uppercase"
            style={{ background: "#00d4c8", color: "#03070b", fontSize: "0.7rem", letterSpacing: "0.12em", boxShadow: "0 4px 18px rgba(0,212,200,0.22)" }}>
            SEGUIR NOTICIAS <ChevronRight className="h-3.5 w-3.5"/>
          </motion.button>
        </motion.div>

        {/* Ya estás inscrito */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.5 }}
          className="w-full rounded-[1.75rem] p-6 md:p-7 flex flex-col sm:flex-row items-center justify-between gap-5"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.065)", backdropFilter: "blur(24px)" }}
        >
          <div>
            <p className="font-black uppercase text-white" style={{ fontSize: "0.9rem", letterSpacing: "0.04em" }}>
              ¿YA ESTÁS INSCRITO?
            </p>
            <p className="font-semibold text-white/35 mt-0.5" style={{ fontSize: "0.78rem" }}>
              Descarga tu dorsal y kit de bienvenida.
            </p>
          </div>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/resultados")}
            className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-full font-black uppercase text-white/65"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", fontSize: "0.7rem", letterSpacing: "0.12em", backdropFilter: "blur(12px)", transition: "border-color .2s" }}>
            VER MIS DATOS <ChevronRight className="h-3.5 w-3.5"/>
          </motion.button>
        </motion.div>

        {/* Footer */}
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
          className="mt-8 font-bold uppercase text-center"
          style={{ fontSize: "0.6rem", letterSpacing: "0.28em", color: "rgba(255,255,255,0.13)" }}>
          © 2026 RAYOCERO RUNNING · VALKYRON GROUP · TODOS LOS DERECHOS RESERVADOS
        </motion.p>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,400;0,600;0,700;0,800;0,900;1,700;1,800;1,900&display=swap');
      `}</style>
    </section>
  );
};

/* ══════════════════════════════════════════════════════════════════════════════
 * COMPONENTE PRINCIPAL — REGISTRATION FORM
 * ══════════════════════════════════════════════════════════════════════════════ */
const RegistrationForm = () => {

  /* ── BLOQUEO — EARLY RETURN ─────────────────────────────────────────────── */
  if (!INSCRIPCIONES_ABIERTAS) return <RegistrationLockedScreen />;

  /* ── TODO EL CÓDIGO ORIGINAL DEBAJO — SIN MODIFICACIÓN ─────────────────── */

  const [step, setStep]                       = useState(0);
  const [form, setForm]                       = useState<FormData>(initialForm);
  const [showDeslinde, setShowDeslinde]       = useState(false);
  const [submitted, setSubmitted]             = useState(false);
  const [bibNumber, setBibNumber]             = useState<number | null>(null);
  const [submitError, setSubmitError]         = useState<string | null>(null);
  const [dorsalLoaded, setDorsalLoaded]       = useState(false);
  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null);
  const [isCompressing, setIsCompressing]     = useState(false);
  const [isExporting, setIsExporting]         = useState(false);
  const [exchangeRate, setExchangeRate]       = useState<number | null>(null);
  const [registrationFee, setRegistrationFee] = useState<number>(40);
  const [isFetchingFinance, setIsFetchingFinance] = useState(false);
  const [lastUpdate, setLastUpdate]           = useState<string | null>(null);

  const navigate = useNavigate();

  const age = form.fechaNacimiento ? calcularEdad(form.fechaNacimiento) : null;
  const category = age !== null && form.genero
    ? calcularCategoria(age, form.genero as "M" | "F", form.movilidadReducida)
    : null;

  useEffect(() => {
    if (step === 2 && exchangeRate === null) {
      const fetchInternalFinance = async () => {
        try {
          setIsFetchingFinance(true);
          const { data, error } = await supabase
            .from("system_config")
            .select("tasa_bcv, costo_usd, ultima_actualizacion")
            .eq("id", 1).single();
          if (error) throw error;
          if (data) {
            setExchangeRate(data.tasa_bcv);
            if (data.costo_usd) setRegistrationFee(data.costo_usd);
            setLastUpdate(new Date(data.ultima_actualizacion).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
          }
        } catch (err) {
          console.error("[MIA TACTICAL ALERT] Error de enlace financiero:", err);
          setExchangeRate(null);
        } finally { setIsFetchingFinance(false); }
      };
      fetchInternalFinance();
    }
  }, [step, exchangeRate]);

  const calcularMontoExacto = (tasa: number, usd: number) =>
    (Math.round(tasa * 1_000_000) * usd) / 1_000_000;

  const totalBolivares = exchangeRate ? calcularMontoExacto(exchangeRate, registrationFee) : 0;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type === "application/pdf") { setComprobanteFile(file); return; }
    setIsCompressing(true);
    try {
      setComprobanteFile(await imageCompression(file, { maxSizeMB: 0.1, maxWidthOrHeight: 1280, useWebWorker: true }));
    } catch { setComprobanteFile(file); }
    finally { setIsCompressing(false); }
  };

  const { mutate: submitToSupabase, isPending: isSubmitting } = useMutation({
    mutationFn: async (data: RegistrationFormData) => {
      if (comprobanteFile) {
        const ext = comprobanteFile.name.split(".").pop();
        await supabase.storage.from("comprobantes-pago")
          .upload(`${data.cedula}_${Date.now()}.${ext}`, comprobanteFile, { cacheControl: "3600", upsert: false });
      }
      return registerRunner(data);
    },
    onSuccess: (data) => {
      setBibNumber(data.bib_number);
      setSubmitted(true);
      setSubmitError(null);
      emailjs.send("service_7knzrtk", "template_7x0cg5m", {
        to_email: form.email, to_name: `${form.nombre} ${form.apellido}`,
        bib_number: data.bib_number.toString().padStart(4, "0"),
        categoria: category || "General",
      }, "yUhQUXtq2yj-nVnr7");
    },
    onError: (error: Error) => setSubmitError(error.message),
  });

  const handleDownloadPNG = async () => {
    setIsExporting(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1200; canvas.height = 900;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No se pudo iniciar el contexto 2D");
      const img = new Image();
      img.crossOrigin = "anonymous"; img.src = dorsalBgSrc;
      await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(); });
      ctx.drawImage(img, 0, 0, 1200, 900);
      await document.fonts.ready;
      const formattedBib = bibNumber?.toString().padStart(4, "0") || "0000";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0,0,0,0.8)"; ctx.shadowBlur = 30; ctx.shadowOffsetY = 20;
      ctx.font = "italic 900 280px sans-serif"; ctx.fillStyle = "#ffffff";
      ctx.fillText(formattedBib, 600, 380);
      ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      ctx.font = "900 56px sans-serif"; ctx.fillStyle = "#03070b";
      (ctx as any).letterSpacing = "4px";
      ctx.fillText(`${form.nombre} ${form.apellido}`.toUpperCase(), 600, 670);
      if (category) {
        ctx.font = "900 22px sans-serif"; ctx.fillStyle = "#1a1a1a";
        (ctx as any).letterSpacing = "6px";
        ctx.fillText(`CATEGORÍA: ${category.toUpperCase()}`, 600, 730);
      }
      const link = document.createElement("a");
      link.download = `DORSAL_RAYOCERO_${form.cedula}.png`;
      link.href = canvas.toDataURL("image/png", 1.0);
      link.click();
    } catch (err) {
      console.error("MIA CANVAS FATAL ERROR:", err);
      alert("Error en el motor de dibujo.");
    } finally { setIsExporting(false); }
  };

  const update = (field: keyof FormData, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  const canNext = () => {
    if (step === 0) return form.nombre && form.apellido && form.cedula && form.email && form.telefono;
    if (step === 1) return form.fechaNacimiento && form.genero && form.talla;
    if (step === 2) return form.referenciaPago.length >= 4;
    if (step === 3) return form.contactoEmergencia && form.telefonoEmergencia && form.aceptaDeslinde;
    return false;
  };

  const handleSubmit = () => {
    setSubmitError(null);
    submitToSupabase({
      nombre: form.nombre.trim(), apellido: form.apellido.trim(),
      cedula: form.cedula.replace(/\D/g, ""),
      email: form.email.toLowerCase().trim(), telefono: form.telefono,
      fechaNacimiento: form.fechaNacimiento, genero: form.genero as "M" | "F",
      talla: form.talla as any, movilidadReducida: form.movilidadReducida,
      referenciaPago: form.referenciaPago.trim(),
      contactoEmergencia: form.contactoEmergencia,
      telefonoEmergencia: form.telefonoEmergencia, aceptaDeslinde: true,
    });
  };

  const inputClass = "w-full rounded-2xl bg-white/[0.03] border border-white/[0.08] px-5 py-4 text-xs font-bold text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/30 focus:bg-white/[0.05] transition-all backdrop-blur-2xl uppercase tracking-wider shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]";

  const steps = [
    {
      title: "Identificación de Atleta", icon: <User className="h-5 w-5 text-cyan-400" />,
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <input className={inputClass} placeholder="Nombre" value={form.nombre} onChange={(e) => update("nombre", e.target.value)} autoComplete="given-name"/>
          <input className={inputClass} placeholder="Apellido" value={form.apellido} onChange={(e) => update("apellido", e.target.value)} autoComplete="family-name"/>
          <div className="relative"><CreditCard className="absolute right-4 top-4 h-4 w-4 text-white/20 pointer-events-none"/><input className={inputClass} placeholder="Cédula / ID" value={form.cedula} onChange={(e) => update("cedula", e.target.value)} inputMode="numeric"/></div>
          <div className="relative"><Mail className="absolute right-4 top-4 h-4 w-4 text-white/20 pointer-events-none"/><input className={inputClass} placeholder="Email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} inputMode="email"/></div>
          <input className={`${inputClass} sm:col-span-2`} placeholder="Teléfono" value={form.telefono} onChange={(e) => update("telefono", e.target.value)} inputMode="tel"/>
        </div>
      ),
    },
    {
      title: "Categoría & Logística", icon: <Trophy className="h-5 w-5 text-cyan-400" />,
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div><label className="text-[9px] font-black uppercase text-cyan-400/80 mb-3 block ml-1">Nacimiento</label><input className={inputClass} type="date" value={form.fechaNacimiento} onChange={(e) => update("fechaNacimiento", e.target.value)}/></div>
            <div><label className="text-[9px] font-black uppercase text-cyan-400/80 mb-3 block ml-1">Género</label><select className={inputClass} value={form.genero} onChange={(e) => update("genero", e.target.value)}><option value="" className="bg-[#03070b]">Seleccionar</option><option value="M" className="bg-[#03070b]">Masculino</option><option value="F" className="bg-[#03070b]">Femenino</option></select></div>
            <div className="sm:col-span-2"><label className="text-[9px] font-black uppercase text-cyan-400/80 mb-3 block ml-1">Talla Camiseta</label><select className={inputClass} value={form.talla} onChange={(e) => update("talla", e.target.value)}><option value="" className="bg-[#03070b]">Seleccionar talla</option>{["XS","S","M","L","XL","XXL"].map(t => <option key={t} value={t} className="bg-[#03070b]">{t}</option>)}</select></div>
            <div className="sm:col-span-2 mt-2 bg-white/[0.02] border border-white/[0.06] p-5 rounded-2xl flex items-center justify-between backdrop-blur-2xl">
              <div className="flex items-center gap-4"><Accessibility className="h-5 w-5 text-cyan-400"/><div className="flex flex-col"><span className="text-[10px] font-black uppercase text-white">Movilidad Reducida</span><span className="text-[8px] text-white/30 uppercase">Logística especial</span></div></div>
              <input type="checkbox" checked={form.movilidadReducida} onChange={(e) => update("movilidadReducida", e.target.checked)} className="h-5 w-5 rounded border-white/20 bg-white/5 text-cyan-500 cursor-pointer"/>
            </div>
          </div>
          {category && <motion.div initial={{ opacity:0,y:10 }} animate={{ opacity:1,y:0 }} className="bg-cyan-500/[0.04] border border-cyan-500/15 p-6 rounded-2xl text-center backdrop-blur-2xl"><p className="text-[9px] font-black uppercase text-cyan-400/50 mb-2">Categoría</p><p className="text-2xl font-black text-cyan-400 uppercase tracking-tighter">{category}</p></motion.div>}
        </div>
      ),
    },
    {
      title: "Pago Operativo", icon: <Banknote className="h-5 w-5 text-cyan-400" />,
      content: (
        <div className="space-y-6">
          <div className="bg-cyan-500/[0.03] border border-cyan-500/15 rounded-2xl p-6 md:p-8 backdrop-blur-2xl relative overflow-hidden shadow-inner">
            <div className="mb-8 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10 shadow-lg hover:border-cyan-500/20 transition-all">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-cyan-500/[0.08] border border-cyan-500/15 flex items-center justify-center text-cyan-400 shrink-0">{isFetchingFinance ? <RefreshCw className="animate-spin h-5 w-5"/> : <Shield className="h-5 w-5"/>}</div>
                <div className="flex flex-col text-left"><span className="text-[10px] font-black uppercase text-cyan-400">Tasa Oficial (RAYOCERO)</span><span className="text-[8px] text-white/50 uppercase mt-1">{exchangeRate ? `Sync: ${lastUpdate}` : "Conectando..."}</span></div>
              </div>
              <div className="flex flex-col items-end shrink-0">
                <div className="text-4xl font-black italic tracking-tighter text-white drop-shadow-[0_0_15px_rgba(242,255,255,0.4)]">${registrationFee}</div>
                {exchangeRate && <div className="text-sm font-black text-cyan-400 uppercase mt-2 bg-cyan-500/[0.08] px-3 py-1 rounded-md">Bs. {totalBolivares.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</div>}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10 text-[10px] font-bold uppercase text-white/40 tracking-widest leading-relaxed">
              <div><span className="block text-cyan-400/50 mb-1">Titular</span><span className="text-white text-sm">Rayocero Eventos C.A</span></div>
              <div><span className="block text-cyan-400/50 mb-1">RIF</span><span className="text-white text-sm">J-505771710</span></div>
              <div><span className="block text-cyan-400/50 mb-1">Pago Móvil</span><span className="text-white text-sm">0414-5643372</span></div>
              <div><span className="block text-cyan-400/50 mb-1">BNC</span><span className="text-white text-sm">0191-0060-0921-6016-9493</span></div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-5">
            <input className={inputClass} placeholder="Nº de Referencia Bancaria" value={form.referenciaPago} onChange={(e) => update("referenciaPago", e.target.value)} inputMode="numeric"/>
            <label className="w-full border-2 border-dashed border-white/[0.07] hover:border-cyan-500/30 bg-white/[0.01] rounded-2xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer group backdrop-blur-2xl">
              <input type="file" accept="image/*,application/pdf" onChange={handleFileChange} className="hidden" disabled={isCompressing || isSubmitting}/>
              {isCompressing ? <Loader2 className="h-8 w-8 text-cyan-400 animate-spin"/> : comprobanteFile ? (
                <div className="flex flex-col items-center gap-3"><CheckCircle className="h-8 w-8 text-green-400"/><span className="text-[10px] font-black text-green-400 uppercase tracking-widest">{comprobanteFile.name}</span></div>
              ) : (<><UploadCloud className="h-8 w-8 text-white/15 group-hover:text-cyan-400 transition-colors mb-3"/><span className="text-[10px] font-black text-white/30 uppercase text-center">Subir Comprobante</span></>)}
            </label>
          </div>
        </div>
      ),
    },
    {
      title: "Seguridad & Deslinde Legal", icon: <Shield className="h-5 w-5 text-cyan-400" />,
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <input className={inputClass} placeholder="Contacto Emergencia" value={form.contactoEmergencia} onChange={(e) => update("contactoEmergencia", e.target.value)}/>
            <input className={inputClass} placeholder="Teléfono Emergencia" value={form.telefonoEmergencia} onChange={(e) => update("telefonoEmergencia", e.target.value)} inputMode="tel"/>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.06] p-6 rounded-2xl flex items-start gap-4 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <input type="checkbox" checked={form.aceptaDeslinde} onChange={(e) => update("aceptaDeslinde", e.target.checked)} className="mt-1 h-5 w-5 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500/50 cursor-pointer flex-shrink-0"/>
            <p className="text-xs text-white/50 leading-relaxed font-medium">Confirmo que acepto el{" "}<button onClick={(e) => { e.preventDefault(); setShowDeslinde(true); }} className="text-cyan-400 font-bold underline decoration-cyan-400/20">Deslinde de Responsabilidad</button>{" "}para este evento.</p>
          </div>
        </div>
      ),
    },
  ];

  if (submitted && bibNumber) {
    const formattedBib = bibNumber.toString().padStart(4, "0");
    return (
      <section id="success-bib" className="relative min-h-screen pt-32 pb-24 px-4 sm:px-6 bg-[#03070b] flex items-center justify-center font-sans overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#00f2ff]/[0.06] blur-[140px] rounded-full z-0"/>
        <motion.div initial={{ scale:0.95,opacity:0,y:30 }} animate={{ scale:1,opacity:1,y:0 }} className="max-w-3xl mx-auto w-full relative z-10 flex flex-col items-center">
          <motion.div initial={{ opacity:0,y:-10 }} animate={{ opacity:1,y:0 }} className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/[0.08] border border-green-500/20 backdrop-blur-xl shadow-inner">
            <CheckCircle className="h-3.5 w-3.5 text-green-400"/><span className="text-[9px] font-black tracking-[0.4em] text-green-400 uppercase">Acreditación Confirmada</span>
          </motion.div>
          <div className="relative w-full max-w-[600px] aspect-[4/3] rounded-2xl shadow-[0_40px_80px_-15px_rgba(0,242,255,0.15)] border border-white/[0.08] overflow-hidden bg-black">
            {!dorsalLoaded && <DorsalSkeleton/>}
            <img src={dorsalBgSrc} alt="Dorsal Preview" className={`absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-500 ${dorsalLoaded?"opacity-100":"opacity-0"}`} onLoad={() => setDorsalLoaded(true)}/>
            <div className="absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-full flex justify-center px-4">
              <h2 className="font-[900] text-white tracking-tighter italic drop-shadow-2xl leading-none text-center" style={{ fontSize:"clamp(4.5rem,18vw,11rem)" }}>{formattedBib}</h2>
            </div>
            <div className="absolute top-[72%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-full max-w-[85%] flex flex-col items-center justify-center">
              <h3 className="font-black text-[#03070b] uppercase tracking-[0.06em] text-center leading-tight m-0 p-0 w-full truncate" style={{ fontSize:"clamp(0.85rem,3.5vw,1.875rem)" }}>{form.nombre} {form.apellido}</h3>
              {category && <p className="font-black text-gray-800 uppercase tracking-[0.2em] mt-1 text-center m-0 p-0" style={{ fontSize:"clamp(0.5rem,1.2vw,0.75rem)" }}>CATEGORÍA: {category}</p>}
            </div>
            <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none z-20"/>
          </div>
          <div className="mt-10 w-full grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-[600px]">
            <button onClick={handleDownloadPNG} disabled={isExporting} className="flex items-center justify-center gap-3 rounded-2xl bg-[#00f2ff] hover:bg-cyan-400 text-[#03070b] px-10 py-5 text-[11px] font-black uppercase tracking-widest shadow-xl transition-all transform hover:-translate-y-1 active:scale-95 disabled:opacity-50">{isExporting?<Loader2 className="h-5 w-5 animate-spin"/>:<Download className="h-5 w-5"/>}{isExporting?"PROCESANDO...":"GUARDAR DORSAL"}</button>
            <button onClick={() => navigate("/")} className="flex items-center justify-center gap-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] text-white px-10 py-5 text-[11px] font-black uppercase tracking-widest border border-white/[0.08] transition-all backdrop-blur-2xl hover:-translate-y-1 active:scale-95"><Home className="h-5 w-5 text-[#00f2ff]"/> FINALIZAR</button>
          </div>
          <p className="mt-10 text-[9px] text-white/15 font-black uppercase tracking-[0.5em] text-center">Acreditación Oficial Generada · RAYOCERO</p>
        </motion.div>
      </section>
    );
  }

  return (
    <section id="register" className="relative min-h-screen pt-32 pb-24 px-4 sm:px-6 bg-[#03070b] font-sans overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-cyan-500/[0.04] blur-[140px] rounded-full pointer-events-none -z-10"/>
      <div className="max-w-4xl mx-auto relative z-10">
        <motion.div initial={{ opacity:0,y:30 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.6 }}>
          <div className="text-center mb-14"><h2 className="text-5xl md:text-[5rem] font-black text-white mb-4 tracking-tighter italic uppercase leading-[0.85] drop-shadow-2xl">INSCRIPCIÓN <br/><span className="text-cyan-400">OPERATIVA.</span></h2></div>
          <div className="flex flex-wrap items-center justify-center gap-3 mb-14">
            {steps.map((_,i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`h-11 w-11 rounded-full flex items-center justify-center text-xs font-black transition-all duration-500 ${i===step?"bg-cyan-500 text-black shadow-lg scale-110":i<step?"bg-white text-black":"bg-white/[0.02] text-white/30 border border-white/[0.07] backdrop-blur-xl"}`}>{i<step?<CheckCircle className="h-4 w-4"/>:i+1}</div>
                {i<steps.length-1&&<div className={`w-4 md:w-10 h-px ${i<step?"bg-white/70":"bg-white/[0.08]"}`}/>}
              </div>
            ))}
          </div>
          <div className="bg-white/[0.02] border border-white/[0.06] p-7 md:p-12 rounded-[2.5rem] backdrop-blur-2xl shadow-2xl relative overflow-hidden">
            <div className="flex items-center gap-5 mb-10 border-b border-white/[0.05] pb-8">
              <div className="p-4 bg-white/[0.02] border border-white/[0.07] rounded-2xl shadow-inner backdrop-blur-xl">{steps[step].icon}</div>
              <div><h3 className="text-xl sm:text-2xl font-black text-white uppercase italic">{steps[step].title}</h3><p className="text-[10px] text-white/30 font-bold uppercase mt-1">RAYO CERO TERMINAL</p></div>
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity:0,x:20 }} animate={{ opacity:1,x:0 }} exit={{ opacity:0,x:-20 }} transition={{ duration:0.35 }}>{steps[step].content}</motion.div>
            </AnimatePresence>
            {submitError&&<div className="mt-8 p-5 bg-red-500/[0.07] border border-red-500/15 rounded-2xl flex items-start gap-3 text-red-300 text-xs font-bold uppercase backdrop-blur-2xl"><AlertCircle className="h-5 w-5 text-red-400"/>{submitError}</div>}
            <div className="flex flex-col-reverse sm:flex-row justify-between gap-4 mt-10 pt-8 border-t border-white/[0.05]">
              {step>0&&<button onClick={() => setStep(step-1)} className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/[0.02] hover:bg-white/[0.05] text-white/70 text-[10px] font-black uppercase border border-white/[0.08] transition-all backdrop-blur-xl">ATRÁS</button>}
              <button onClick={() => step<steps.length-1?setStep(step+1):handleSubmit()} disabled={!canNext()||isSubmitting||isCompressing} className={`w-full sm:w-auto px-10 py-4 rounded-full text-[10px] font-black uppercase transition-all shadow-xl ${canNext()&&!isSubmitting?"bg-[#00f2ff] hover:bg-cyan-300 text-[#03070b]":"bg-white/[0.03] text-white/20 border border-white/[0.05] cursor-not-allowed"}`}>{isSubmitting?"PROCESANDO...":step<steps.length-1?"SIGUIENTE":"CONFIRMAR REGISTRO"}</button>
            </div>
          </div>
        </motion.div>
      </div>
      <AnimatePresence>
        {showDeslinde&&(
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#03070b]/70 backdrop-blur-2xl" onClick={() => setShowDeslinde(false)}>
            <motion.div initial={{ scale:0.95,y:20 }} animate={{ scale:1,y:0 }} exit={{ scale:0.95,y:20 }} onClick={(e) => e.stopPropagation()} className="bg-[#07090f]/90 border border-white/[0.07] p-8 md:p-12 rounded-[2.5rem] max-w-2xl w-full max-h-[88vh] overflow-y-auto shadow-2xl relative custom-scrollbar backdrop-blur-2xl text-white">
              <h3 className="text-2xl sm:text-3xl font-black mb-8 italic uppercase text-center">DESLINDE LEGAL</h3>
              <div className="text-sm text-white/40 space-y-6 font-medium leading-relaxed">
                <p>Al procesar esta inscripción, el atleta declara condiciones físicas óptimas y asume total responsabilidad.</p>
                <p>Acepta la cesión de derechos de imagen para la plataforma RAYOCERO.</p>
              </div>
              <button onClick={() => { update("aceptaDeslinde",true); setShowDeslinde(false); }} className="w-full mt-10 rounded-2xl bg-white text-black py-5 text-[10px] font-black uppercase shadow-xl transition-all hover:bg-gray-100">ACEPTO TÉRMINOS Y CONDICIONES</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <style>{`
        @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 10px; }
      `}</style>
    </section>
  );
};

export default RegistrationForm;
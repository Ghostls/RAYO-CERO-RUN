/**
 * RAYO CERO — VENEZUELA MISSION MAP (V2.2 - CLEAN TSX)
 * Senior Dev: MIA (Valkyron Group)
 * CEO: Lualdo Sciscioli
 * REGLA DE ORO: Evolución sin Destrucción. Código completo. Copy-paste ready.
 *
 * ARCHIVOS REQUERIDOS EN src/components/:
 *   - VenezuelaMap.tsx  (este archivo)
 *   - venezuelaGeoJSON.ts (archivo de datos GeoJSON)
 *
 * DEPENDENCIAS:
 *   npm install leaflet && npm install -D @types/leaflet
 *   En main.tsx: import 'leaflet/dist/leaflet.css'
 */

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, MapPin, Zap } from "lucide-react";
import L from "leaflet";
import VENEZUELA_GEOJSON from "./venezuelaGeoJson";

/* ─────────────────────────────────────────────────────────────────────────── */
/* CONFIG                                                                      */
/* ─────────────────────────────────────────────────────────────────────────── */
type RaceStatus = "completada" | "proxima" | "idle";
interface StateRace { status: RaceStatus; eventName?: string; date?: string; }

const RACE_STATES: Record<string, StateRace> = {
  "Lara":   { status: "completada", eventName: "We Run 10K Barquisimeto", date: "06.06.26" },
  "Falcón": { status: "proxima",    eventName: "We Run 8K Coro Falcón",      date: "31.10.26" },
};

/* ─────────────────────────────────────────────────────────────────────────── */
/* ESTILOS                                                                     */
/* ─────────────────────────────────────────────────────────────────────────── */
const getStateStyle = (name: string, hovered = false): L.PathOptions => {
  const status = RACE_STATES[name]?.status ?? "idle";
  if (status === "completada") return { fillColor: hovered ? "#00f2ff" : "#00d4e0", fillOpacity: hovered ? 0.75 : 0.55, color: "#00f2ff", weight: hovered ? 2.5 : 1.5, opacity: 1 };
  if (status === "proxima")    return { fillColor: hovered ? "#f59e0b" : "#d97706", fillOpacity: hovered ? 0.65 : 0.45, color: "#f59e0b", weight: hovered ? 2.5 : 1.5, opacity: 1 };
  return { fillColor: "#0d1825", fillOpacity: hovered ? 0.55 : 0.45, color: hovered ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.07)", weight: hovered ? 1.2 : 0.6, opacity: 1 };
};

/* ─────────────────────────────────────────────────────────────────────────── */
/* TOOLTIP — función pura sin template literals anidados                      */
/* ─────────────────────────────────────────────────────────────────────────── */
const buildTooltip = (name: string, race: StateRace | undefined): string => {
  const status = race?.status ?? "idle";
  const statusColor = status === "completada" ? "#00f2ff" : status === "proxima" ? "#f59e0b" : "rgba(255,255,255,0.2)";
  const statusLabel = status === "completada" ? "&#10003; COMPLETADA" : status === "proxima" ? "&#9889; PROXIMA" : "";

  const wrapStyle = "background:rgba(3,7,11,0.97);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:10px 14px;font-family:system-ui,sans-serif;min-width:155px;box-shadow:0 8px 32px rgba(0,0,0,0.7);";
  const nameHtml  = "<div style='font-size:9px;font-weight:900;letter-spacing:0.2em;color:rgba(255,255,255,0.65);text-transform:uppercase;margin-bottom:5px;'>&#128205; " + name + "</div>";

  let bodyHtml = "";
  if (race) {
    bodyHtml  = "<div style='font-size:7px;font-weight:900;letter-spacing:0.25em;text-transform:uppercase;color:" + statusColor + ";margin-bottom:4px;'>" + statusLabel + "</div>";
    bodyHtml += "<div style='font-size:9px;font-weight:700;color:rgba(255,255,255,0.55);'>" + (race.eventName ?? "") + "</div>";
    bodyHtml += "<div style='font-size:8px;color:rgba(255,255,255,0.28);margin-top:2px;font-family:monospace;'>" + (race.date ?? "") + "</div>";
  } else {
    bodyHtml = "<div style='font-size:8px;color:rgba(255,255,255,0.18);text-transform:uppercase;letter-spacing:0.1em;'>Sin carrera registrada</div>";
  }

  return "<div style='" + wrapStyle + "'>" + nameHtml + bodyHtml + "</div>";
};

/* ─────────────────────────────────────────────────────────────────────────── */
/* LEAFLET MAP                                                                 */
/* ─────────────────────────────────────────────────────────────────────────── */
const VenezuelaLeafletMap = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [7.5, -66.0], zoom: 5,
      zoomControl: false, attributionControl: false,
      scrollWheelZoom: false, dragging: false,
      doubleClickZoom: false, boxZoom: false, keyboard: false,
    });
    mapRef.current = map;
    map.getContainer().style.background = "transparent";

    const geoLayer = L.geoJSON(VENEZUELA_GEOJSON, {
      style: (feature) => getStateStyle(feature?.properties?.name ?? ""),
      onEachFeature: (feature, layer) => {
        const name: string = feature?.properties?.name ?? "Estado";
        const race = RACE_STATES[name];
        layer.on({
          mouseover: (e) => {
            (e.target as L.Path).setStyle(getStateStyle(name, true));
            (e.target as L.Path).bringToFront();
            layer.bindTooltip(buildTooltip(name, race), { sticky: true, opacity: 1, className: "rc-tooltip" }).openTooltip();
          },
          mouseout: (e) => {
            (e.target as L.Path).setStyle(getStateStyle(name, false));
            layer.closeTooltip();
          },
        });
      },
    }).addTo(map);

    map.fitBounds(geoLayer.getBounds(), { padding: [20, 20] });
    return () => { mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  return <div ref={containerRef} style={{ width: "100%", minHeight: "420px", background: "transparent" }} />;
};

/* ─────────────────────────────────────────────────────────────────────────── */
/* SECTION WRAPPER                                                             */
/* ─────────────────────────────────────────────────────────────────────────── */
const VenezuelaMap = () => {
  const completadas = Object.entries(RACE_STATES).filter(([, v]) => v.status === "completada");
  const proximas    = Object.entries(RACE_STATES).filter(([, v]) => v.status === "proxima");

  return (
    <section className="relative py-24 px-6 max-w-7xl mx-auto w-full z-10">

      <style>{".leaflet-container{background:transparent!important}.rc-tooltip{background:transparent!important;border:none!important;box-shadow:none!important;padding:0!important}.rc-tooltip::before{display:none!important}"}</style>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <div>
          <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/5 backdrop-blur-md mb-5">
            <Zap className="h-3 w-3 text-cyan-400" />
            <span className="text-[9px] font-black tracking-[0.4em] text-white/60 uppercase">Expansión Territorial</span>
          </motion.div>
          <h2 className="text-5xl md:text-[4.5rem] font-black italic text-white tracking-tighter uppercase leading-[0.85]">
            MISIONES <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-white">ACTIVAS.</span>
          </h2>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-cyan-500/10 border border-cyan-400/20">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(0,242,255,1)]" />
            <span className="text-[8px] font-black tracking-[0.3em] uppercase text-cyan-300">Carrera Completada ({completadas.length})</span>
          </div>
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-amber-500/10 border border-amber-400/20">
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.9)]" />
            <span className="text-[8px] font-black tracking-[0.3em] uppercase text-amber-300">Próxima Carrera ({proximas.length})</span>
          </div>
        </div>
      </div>

      {/* Mapa + Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

        {/* MAP */}
        <div className="lg:col-span-2">
          <div className="relative rounded-[2rem] bg-[#060d18] border border-white/5 overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)]" style={{ minHeight: "420px" }}>
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.03] to-transparent pointer-events-none rounded-[2rem] z-10" />
            <VenezuelaLeafletMap />
            <div className="absolute bottom-4 right-4 z-20 pointer-events-none">
              <span className="text-[7px] font-bold tracking-[0.3em] uppercase text-white/15">REPÚBLICA BOLIVARIANA DE VENEZUELA</span>
            </div>
          </div>
        </div>

        {/* MISSION LOG */}
        <div className="flex flex-col gap-4">
          <p className="text-[8px] font-black tracking-[0.4em] uppercase text-white/30 mb-2">LOG DE MISIONES</p>

          {Object.entries(RACE_STATES).map(([state, race]) => (
            <motion.div key={state} initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className={
                "relative rounded-2xl border backdrop-blur-xl p-5 overflow-hidden " +
                (race.status === "completada" ? "bg-cyan-500/5 border-cyan-400/20" : "bg-amber-500/5 border-amber-400/20")
              }>
              <div className={"absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl pointer-events-none " + (race.status === "completada" ? "bg-cyan-400/10" : "bg-amber-400/10")} />
              <span className={
                "inline-flex items-center gap-1.5 text-[7px] font-black uppercase tracking-[0.3em] px-2.5 py-1 rounded-full border mb-3 " +
                (race.status === "completada" ? "bg-cyan-500/20 border-cyan-400/40 text-cyan-300" : "bg-amber-500/20 border-amber-400/40 text-amber-300")
              }>
                {race.status === "completada" && <CheckCircle2 className="h-2.5 w-2.5" />}
                {race.status === "completada" ? "COMPLETADA" : "PRÓXIMA"}
              </span>
              <h4 className="text-base font-black italic text-white tracking-tight leading-tight mb-1">{race.eventName}</h4>
              <div className="flex items-center gap-2 mt-2">
                <MapPin className={"h-3 w-3 " + (race.status === "completada" ? "text-cyan-400" : "text-amber-400")} />
                <span className="text-[9px] font-bold tracking-widest uppercase text-white/50">{state}</span>
                <span className="text-[8px] text-white/25">·</span>
                <span className="text-[9px] font-mono text-white/40">{race.date}</span>
              </div>
            </motion.div>
          ))}

          <div className="rounded-2xl border border-dashed border-white/5 p-5 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-white/10" />
            <span className="text-[8px] font-bold tracking-[0.3em] uppercase text-white/20">Próximas misiones por revelar...</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VenezuelaMap;
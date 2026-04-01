/**
 * RAYO CERO — RACE OPERATIVE DETAIL (STABLE BUILD V11)
 * Senior Dev: MIA (Valkyron Group)
 * Fix: Arquitectura de Clústeres HUD Unificados. Cero colisiones en macro-zoom.
 * Cumplimiento de Regla de Oro: Evolución sin omisiones.
 */

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { MapPin, Calendar, Clock, Zap, Users, ShieldCheck, Music, Droplet, Plus, ArrowLeft } from "lucide-react";
import { MapContainer, TileLayer, Polyline, Marker, useMap, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// [MIA TACTICAL UPLINK] - Conexión oficial a la base de datos
import { supabase } from "@/lib/supabase"; 

// --- BYPASS TÁCTICO PARA ERRORES DE TYPESCRIPT ---
const MapComp = MapContainer as any;
const TileComp = TileLayer as any;
const PolyComp = Polyline as any;
const MarkerComp = Marker as any;
const CircleComp = Circle as any;

// ─── GENERADOR DE CLÚSTERES TÁCTICOS (HUD UNIFICADO) ───
// Esta función crea un solo marcador HTML que contiene el KM central y sus POIs orbitando a la derecha
const createCompoundIcon = (waypoint: any) => {
  let poiHtml = '';
  
  if (waypoint.pois && waypoint.pois.length > 0) {
    const poiCircles = waypoint.pois.map((poi: any) =>
      `<div style="background-color: #000; width: 18px; height: 18px; border-radius: 50%; border: 1.5px solid ${poi.color}; display: flex; align-items: center; justify-content: center; color: ${poi.color}; font-weight: 900; font-size: 9px; box-shadow: 0 0 8px ${poi.color}40; flex-shrink: 0;">${poi.icon}</div>`
    ).join('');

    poiHtml = `<div style="display: flex; gap: 4px; margin-left: 6px; background: rgba(0,0,0,0.6); padding: 4px 6px; border-radius: 20px; backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.1);">${poiCircles}</div>`;
  }

  const mainCircle = waypoint.isMeta
    ? `<div style="background-color: #000; width: 40px; height: 40px; border-radius: 50%; border: 2px solid #00f2ff; box-shadow: 0 0 20px #00f2ff; display: flex; align-items: center; justify-content: center; color: #00f2ff; font-weight: 900; font-size: 10px; text-transform: uppercase; z-index: 10; flex-shrink: 0;">META</div>`
    : `<div style="background-color: #00f2ff; width: 30px; height: 30px; border-radius: 50%; border: 2px solid #000; box-shadow: 0 0 10px rgba(0,242,255,0.5); display: flex; align-items: center; justify-content: center; color: #000; font-weight: 900; font-size: 12px; font-style: italic; z-index: 10; flex-shrink: 0;">${waypoint.label}</div>`;

  return L.divIcon({
    className: "custom-compound-marker",
    // Contenedor Flex para que los iconos no se aplasten y crezcan a la derecha
    html: `<div style="display: flex; align-items: center; width: max-content; pointer-events: none;">
             ${mainCircle}
             ${poiHtml}
           </div>`,
    iconSize: [0, 0], // Anula restricciones de tamaño base
    iconAnchor: waypoint.isMeta ? [20, 20] : [15, 15], // Ancla EXACTAMENTE el centro del círculo al mapa
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

const RaceDetail = () => {
  const navigate = useNavigate();
  const [registeredCount, setRegisteredCount] = useState(1);

  useEffect(() => {
    const fetchRegisteredAthletes = async () => {
      try {
        const { count, error } = await supabase
          .from('runners')
          .select('*', { count: 'exact', head: true })
          .eq('estado', 'confirmado');

        if (!error && count !== null && count > 0) {
          setRegisteredCount(count);
        }
      } catch (err) {
        console.error("[MIA CRITICAL] Fallo de telemetría.", err);
      }
    };
    fetchRegisteredAthletes();
  }, []);

  const handleRegistrationClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate("/registro");
  };

  // ─── RUTA ULTRA-PRECISA: NIGHT FEST 10K (BARQUISIMETO) ───
  const officialRoute: [number, number][] = [
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

  // ─── MATRIZ OPERATIVA (WAYPOINTS UNIFICADOS) ───
  const WAYPOINTS = [
    {
      pos: [10.077576, -69.283447],
      isMeta: true,
      label: "META",
      pois: [
        { icon: "♪", color: "#a855f7" }, // Música
        { icon: "B", color: "#94a3b8" }, // Baños
        { icon: "+", color: "#22c55e" }, // Médico
        { icon: "C", color: "#eab308" }  // Crono
      ]
    },
    { pos: [10.067250, -69.284621], label: "1K", pois: [{ icon: "♪", color: "#a855f7" }] },
    { pos: [10.062852, -69.282465], label: "2K", pois: [] },
    { pos: [10.061500, -69.276373], label: "3K", pois: [{ icon: "♪", color: "#a855f7" }] },
    { pos: [10.064014, -69.288046], label: "4K", pois: [{ icon: "P", color: "#3b82f6" }] },
    { pos: [10.065609, -69.295721], label: "5K", pois: [{ icon: "♪", color: "#a855f7" }, { icon: "C", color: "#eab308" }] },
    { pos: [10.073542, -69.296712], label: "6K", pois: [] },
    { pos: [10.070855, -69.294501], label: "7K", pois: [{ icon: "♪", color: "#a855f7" }, { icon: "+", color: "#22c55e" }] },
    { pos: [10.070609, -69.291723], label: "8K", pois: [{ icon: "P", color: "#3b82f6" }] },
    { pos: [10.079514, -69.288873], label: "9K", pois: [] },
  ];

  const mapBounds = useMemo(() => L.latLngBounds(officialRoute), []);

  return (
    <div className="h-screen w-full bg-[#03070b] flex flex-col lg:flex-row overflow-hidden text-white relative font-sans pt-[85px] md:pt-[104px] z-0">
      
      {/* MAPA OPERATIVO */}
      <div className="relative w-full lg:w-[65%] h-[45vh] lg:h-full bg-[#080808] z-0">
        <MapComp 
          bounds={mapBounds}
          zoom={15} 
          className="h-full w-full z-10"
          zoomControl={false}
        >
          <MapController bounds={mapBounds} />
          <TileComp 
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
            attribution='&copy; CARTO'
          />
          
          <CircleComp 
              center={[10.077576, -69.283447]} 
              radius={300} 
              pathOptions={{ color: '#00f2ff', fillColor: '#00f2ff', fillOpacity: 0.08, weight: 1, className: 'radar-pulse' }} 
          />

          <PolyComp 
            positions={officialRoute} 
            pathOptions={{ color: '#00f2ff', weight: 5, opacity: 0.9, className: "glow-path" }} 
          />

          {/* Renderizado de Matriz Unificada (Cero superposición) */}
          {WAYPOINTS.map((wp, idx) => (
            <MarkerComp key={`wp-${idx}`} position={wp.pos} icon={createCompoundIcon(wp)} />
          ))}

        </MapComp>

        <div className="absolute bottom-10 left-10 z-[500] pointer-events-none hidden md:block">
          <h2 className="text-white font-black italic text-7xl leading-[0.8] tracking-tighter uppercase opacity-30 select-none drop-shadow-2xl">
            NIGHT FEST<br />10K <span className="text-cyan-500">ROUTE</span>
          </h2>
        </div>
      </div>

      {/* INFO PANEL LATERAL */}
      <aside className="w-full lg:w-[35%] h-[55vh] lg:h-full overflow-y-auto bg-[#03070b] p-8 lg:p-12 custom-scrollbar border-l border-white/5 relative z-10">
        
        {/* HEADER TÁCTICO INTEGRADO */}
        <div className="flex items-center justify-between mb-10 pb-6 border-b border-white/5">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center gap-2 group bg-white/[0.03] hover:bg-white/10 py-2 px-4 rounded-full transition-all border border-white/5"
          >
            <ArrowLeft className="h-4 w-4 text-cyan-400 group-hover:-translate-x-1 transition-transform" />
            <span className="font-black text-[9px] tracking-[0.3em] uppercase text-white/70">Volver</span>
          </button>
          
          <div className="flex items-center gap-3">
              <div className="text-right">
                  <p className="text-[9px] font-black text-cyan-400 tracking-widest leading-none">RAYO CERO</p>
                  <p className="text-[7px] text-white/30 font-bold uppercase mt-1">NIGHT FEST 10K</p>
              </div>
              <div className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_10px_#00f2ff]" />
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12 pb-10">
          
          <header className="space-y-4">
              <h1 className="text-7xl font-black italic uppercase leading-none tracking-tighter">
                 10<span className="text-cyan-400">K</span>
              </h1>
              <p className="text-sm font-black tracking-[0.5em] text-white/30 uppercase">6 . JUN . 2026</p>
          </header>

          <div className="grid grid-cols-1 gap-4">
            {[
              { icon: MapPin, label: "Salida / Meta", val: "Monumento al Sol" },
              { icon: Clock, label: "Hora Operativa", val: "19:00 HRS" },
              { icon: Users, label: "Atletas Confirmados", val: `${registeredCount}` }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-6 p-5 bg-white/[0.02] border border-white/5 rounded-3xl group hover:border-cyan-500/30 transition-all backdrop-blur-md">
                <div className="h-12 w-12 flex items-center justify-center bg-cyan-400/10 rounded-2xl text-cyan-400 transition-colors group-hover:bg-cyan-400 group-hover:text-black">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">{item.label}</p>
                  <motion.p 
                    key={item.val} 
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="font-bold text-lg uppercase text-white"
                  >
                    {item.val}
                  </motion.p>
                </div>
              </div>
            ))}
          </div>

          <button 
            onClick={handleRegistrationClick}
            className="w-full py-7 rounded-2xl font-black text-xs tracking-[0.4em] uppercase italic transition-all flex items-center justify-center gap-4 overflow-hidden bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_30px_rgba(0,242,255,0.2)] active:scale-95"
          >
            INSCRIBIRME <Zap className="h-4 w-4 fill-current" />
          </button>

          {/* LEYENDA TÁCTICA */}
          <div className="pt-6 border-t border-white/5">
              <p className="text-[9px] font-black tracking-[0.3em] text-white/40 uppercase mb-6">Leyenda Operativa</p>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
                  <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full border border-[#00f2ff] flex items-center justify-center text-[10px] font-black text-[#00f2ff]">1K</div>
                      <span className="text-[10px] font-bold text-white/60">KM</span>
                  </div>
                  <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full border border-[#3b82f6] flex items-center justify-center text-[10px] font-black text-[#3b82f6]">P</div>
                      <span className="text-[10px] font-bold text-white/60">HIDRATA</span>
                  </div>
                  <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full border border-[#a855f7] flex items-center justify-center text-[10px] font-black text-[#a855f7]">♪</div>
                      <span className="text-[10px] font-bold text-white/60">MÚSICA</span>
                  </div>
                  <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full border border-[#eab308] flex items-center justify-center text-[10px] font-black text-[#eab308]">C</div>
                      <span className="text-[10px] font-bold text-white/60">CRONO</span>
                  </div>
                  <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full border border-[#22c55e] flex items-center justify-center text-[10px] font-black text-[#22c55e]">+</div>
                      <span className="text-[10px] font-bold text-white/60">MÉDICO</span>
                  </div>
                  <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full border border-[#94a3b8] flex items-center justify-center text-[10px] font-black text-[#94a3b8]">B</div>
                      <span className="text-[10px] font-bold text-white/60">BAÑOS</span>
                  </div>
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

export default RaceDetail;
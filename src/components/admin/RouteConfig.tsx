import React, { useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';

export const RouteConfig = () => {
  const [coords, setCoords] = useState("");

  // Simulación de cálculo de trayectoria vectorial
  const calculateVectorDist = (rawCoords: string) => {
    const points = rawCoords.split(';').length;
    return (points * 1.2).toFixed(2); // Simulación de d = ∑|Δp|
  };

  return (
    <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-md">
      <h4 className="text-cyan-500 font-bold mb-4 flex items-center gap-2 italic">
        <Navigation size={18} /> CONFIGURADOR DE TRAYECTORIA GPS
      </h4>
      <textarea 
        value={coords}
        onChange={(e) => setCoords(e.target.value)}
        placeholder="Lat, Lng; Lat, Lng..."
        className="w-full bg-black/40 border border-white/5 p-4 rounded-xl font-mono text-xs text-cyan-300 h-32 focus:border-cyan-500/50 outline-none"
      />
      <div className="mt-4 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-gray-500">
        <span>Puntos Detectados: {coords.split(';').filter(c => c.trim()).length}</span>
        <span className="text-cyan-500">Distancia Estimada: {calculateVectorDist(coords)} KM</span>
      </div>
    </div>
  );
};
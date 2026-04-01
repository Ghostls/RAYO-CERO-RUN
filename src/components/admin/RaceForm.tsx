/**
 * RAYO CERO — RACE DEPLOYMENT MODULE (V7 - EVOLUTION)
 * Senior Dev: MIA (Valkyron Group)
 * Bucket: "eventos"
 * Regla de Oro: Evolución constante, integración de almacenamiento y validación de vectores.
 */

import React, { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Plus, 
  MapPin, 
  Navigation, 
  Info, 
  UploadCloud, 
  ImageIcon, 
  Loader2, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const RaceForm = () => {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({ 
    name: '', 
    date: '', 
    location: '', 
    distance: '',
    route_coords: '' 
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let publicImageUrl = 'placeholder.jpg';

      // 1. GESTIÓN DE STORAGE (BUCKET: eventos)
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        const filePath = `flyers/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('eventos')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('eventos')
          .getPublicUrl(filePath);
        
        publicImageUrl = urlData.publicUrl;
      }

      // 2. INSERCIÓN DE DATOS EVOLUCIONADA
      const payload = {
        name: formData.name,
        date: formData.date,
        location: formData.location,
        distance: parseFloat(formData.distance) || 0,
        route_coords: formData.route_coords,
        image_url: publicImageUrl,
        is_active: true
      };

      const { error: dbError } = await supabase
        .from('races')
        .insert([payload]);

      if (dbError) throw dbError;

      alert("DESPLIEGUE EXITOSO: Carrera y Flyer sincronizados en Rayo Cero.");
      
      // Limpieza táctica
      setFormData({ name: '', date: '', location: '', distance: '', route_coords: '' });
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

    } catch (error: any) {
      console.error("[MIA ERROR]:", error.message);
      alert(`FALLO DE ENLACE: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-black/40 border border-white/10 p-3 rounded-xl focus:border-cyan-500 outline-none transition-all text-sm text-gray-200 placeholder:text-gray-700";
  const labelClass = "text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] ml-1 mb-1 block";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
      
      {/* SECCIÓN DE CARGA DE FLYER (MODULO ADJUNTO) */}
      <div className="space-y-2">
        <label className={labelClass}>Flyer Oficial (Bucket: eventos)</label>
        <div 
          onClick={() => fileInputRef.current?.click()}
          className={`relative group border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center bg-white/[0.02] cursor-pointer transition-all duration-500 ${
            file ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-white/10 hover:border-cyan-500/30'
          }`}
        >
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          
          {file ? (
            <div className="flex flex-col items-center animate-in zoom-in duration-300">
              <CheckCircle2 className="text-cyan-400 mb-2" size={32} />
              <span className="text-xs font-black text-cyan-400 uppercase tracking-tighter">{file.name}</span>
              <p className="text-[9px] text-gray-500 mt-1 uppercase font-bold italic">Archivo listo para transmisión</p>
            </div>
          ) : (
            <>
              <UploadCloud className="text-gray-600 mb-2 group-hover:text-cyan-500 transition-colors" size={40} />
              <span className="text-[10px] text-gray-500 font-black uppercase tracking-[0.3em]">Cargar Arte de Carrera</span>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Identificador del Evento */}
        <div className="space-y-1">
          <label className={labelClass}>Nombre del Evento</label>
          <input 
            type="text" 
            placeholder="Ej: MARATÓN BARQUISIMETO 10K" 
            required
            value={formData.name}
            className={inputClass}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
          />
        </div>

        {/* Cronograma */}
        <div className="space-y-1">
          <label className={labelClass}>Fecha de Ejecución</label>
          <div className="relative">
            <input 
              type="date" 
              required
              value={formData.date}
              className={inputClass}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
            />
          </div>
        </div>

        {/* Ubicación Física */}
        <div className="space-y-1">
          <label className={labelClass}>Ubicación (Sede)</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 text-cyan-500/50" size={16} />
            <input 
              type="text" 
              placeholder="Ej: El Obelisco, Lara" 
              required
              value={formData.location}
              className={`${inputClass} pl-10`}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
            />
          </div>
        </div>

        {/* Métrica de Distancia */}
        <div className="space-y-1">
          <label className={labelClass}>Distancia Total (KM)</label>
          <div className="relative">
            <Navigation className="absolute left-3 top-3 text-cyan-500/50" size={16} />
            <input 
              type="number" 
              step="0.01"
              placeholder="Ej: 10.5" 
              required
              value={formData.distance}
              className={`${inputClass} pl-10 font-mono`}
              onChange={(e) => setFormData({...formData, distance: e.target.value})}
            />
          </div>
        </div>
      </div>

      {/* Bloque de Coordenadas (Vectores) */}
      <div className="space-y-1">
        <label className={`${labelClass} flex items-center gap-1`}>
          Vectores de Ruta (Protocolo GPS) <Info size={12} className="text-cyan-500" />
        </label>
        <textarea 
          placeholder="Lat, Lng; Lat, Lng... (Protocolo GPS)"
          required
          value={formData.route_coords}
          className={`${inputClass} h-32 resize-none font-mono text-[11px] leading-relaxed p-4`}
          onChange={(e) => setFormData({...formData, route_coords: e.target.value})}
        />
        <p className="text-[9px] text-gray-600 italic mt-1">
          * Use punto para decimales y punto y coma para separar los pares de coordenadas.
        </p>
      </div>

      <button 
        type="submit" 
        disabled={loading}
        className={`group w-full py-5 rounded-2xl font-black text-xs tracking-[0.4em] uppercase italic transition-all flex items-center justify-center gap-3 active:scale-95 shadow-lg ${
          loading 
          ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
          : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_10px_20px_rgba(0,242,255,0.2)]'
        }`}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" size={20} />
            SINCRONIZANDO_DATOS...
          </>
        ) : (
          <>
            <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" /> 
            DESPLEGAR CARRERA EN RED
          </>
        )}
      </button>
    </form>
  );
};
/**
 * RAYO CERO — RACE CALENDAR (TACTICAL RE-ROUTE V6 - FULL LIVE)
 * Senior Dev: MIA (Valkyron Group)
 * Grado: Militar / Operativo / Diseñador
 * REGLA DE ORO: Full Dynamic Sync. Exportación por defecto para Router.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Calendar, Clock, Info, Zap, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom"; 
import { supabase } from "@/lib/supabase"; // Alias @ para evitar errores de ruta

// Fallback image en caso de que no haya una en la DB (Rayo Cero Branding)
const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1594882645126-14020914d58d?q=80&w=800";

const CardImageSlider = ({ image, alt, status }: { image: string, alt: string, status: string }) => {
  return (
    <div className="relative h-72 w-full overflow-hidden bg-[#03070b] rounded-t-[2.5rem]">
      <motion.img
        src={image || DEFAULT_IMAGE}
        alt={alt}
        initial={{ opacity: 0, scale: 1.1 }}
        animate={{ opacity: 0.6, scale: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="absolute inset-0 w-full h-full object-cover group-hover:opacity-100 transition-opacity duration-1000"
        onError={(e) => {
          (e.target as any).src = DEFAULT_IMAGE;
        }}
      />
      
      <div className="absolute inset-0 bg-gradient-to-t from-[#03070b] via-[#03070b]/20 to-transparent" />
      
      <div className="absolute top-6 left-6 z-20">
         <span className={`text-[8px] font-black uppercase tracking-[0.3em] px-4 py-2 rounded-full border backdrop-blur-md shadow-lg ${
            status === "Próximamente" 
            ? "bg-white/5 border-white/10 text-white/50" 
            : "bg-cyan-500/10 border-cyan-400/30 text-cyan-400 shadow-[0_0_15px_rgba(0,242,255,0.2)]"
          }`}>
            {status}
          </span>
      </div>
    </div>
  );
};

const RacesSection = () => {
  const navigate = useNavigate();
  const [races, setRaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // --- SINCRONIZACIÓN CON EL KERNEL DE DATOS (SUPABASE) ---
  useEffect(() => {
    const fetchRaces = async () => {
      try {
        const { data, error } = await supabase
          .from('races')
          .select('*')
          .eq('is_active', true) 
          .order('date', { ascending: true });

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
    <section className="min-h-screen pt-32 pb-24 px-6 max-w-7xl mx-auto relative z-10" id="carreras">
      
      {/* Glow Ambiental de Fondo */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* HEADER EDITORIAL */}
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
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-white">DESAFÍOS.</span>
          </h2>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-cyan-500 font-mono italic">
          <Loader2 className="h-10 w-10 animate-spin mb-4" />
          <span className="text-[10px] uppercase tracking-[0.5em] animate-pulse">Sincronizando_Ecosistema...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
          {races.length > 0 ? (
            races.map((race, idx) => (
              <motion.div
                key={race.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1, duration: 0.6, ease: "easeOut" }}
                className="group relative bg-white/[0.02] backdrop-blur-2xl border border-white/5 hover:border-white/10 transition-all duration-500 flex flex-col h-full overflow-hidden rounded-[2.5rem] shadow-[0_20px_40px_rgba(0,0,0,0.5)] hover:-translate-y-2"
              >
                <CardImageSlider image={race.image_url} alt={race.name} status={race.status || "Inscripciones Abiertas"} />
                
                <div className="p-8 flex flex-col flex-grow relative z-20">
                  <h3 className="text-3xl font-black italic text-white mb-6 tracking-tighter group-hover:text-cyan-400 transition-colors uppercase leading-[0.9] min-h-[3.5rem]">
                    {race.name}
                  </h3>
                  
                  <div className="space-y-4 mb-10 flex-grow">
                    {[
                      { icon: MapPin, val: race.location },
                      { icon: Calendar, val: new Date(race.date + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase() },
                      { icon: Clock, val: race.time || "19:00 HRS" }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-4 text-white/40 group-hover:text-white/80 transition-colors">
                        <item.icon className="h-4 w-4 text-cyan-500" /> 
                        <span className="text-[10px] font-bold tracking-[0.2em] uppercase">{item.val}</span>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-auto">
                    <Link to={`/carrera/${race.id}`} className="w-full">
                      <button className="w-full h-full py-5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 rounded-2xl text-[9px] font-black text-white italic tracking-[0.2em] transition-all flex items-center justify-center gap-2 uppercase backdrop-blur-md active:scale-95 text-center">
                        <Info className="h-3 w-3 text-cyan-400" /> DETALLES
                      </button>
                    </Link>

                    <button 
                      onClick={handleRegistrationClick}
                      className="w-full h-full py-5 bg-cyan-500 hover:bg-cyan-400 rounded-2xl text-[9px] font-black text-black italic tracking-[0.2em] transition-all flex items-center justify-center gap-2 uppercase active:scale-95 shadow-[0_0_20px_rgba(0,242,255,0.15)] group/btn text-center"
                    >
                      INSCRIBIRME <Zap className="h-3 w-3 fill-current transition-transform group-hover/btn:scale-110" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center border border-white/5 rounded-[2.5rem] bg-white/[0.01] backdrop-blur-sm">
              <p className="text-white/20 text-xs font-bold uppercase tracking-[0.5em]">No se han detectado desafíos activos.</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default RacesSection;
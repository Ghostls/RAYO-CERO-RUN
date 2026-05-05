/**
 * RAYO CERO — TEAM REGISTRATION MODULE (STABLE BUILD V1.0_EQUIPOS)
 * Senior Dev: MIA (Valkyron Group)
 * CEO: Lualdo Sciscioli
 * Grado: Militar / Operativo
 * REGLA DE ORO: Código completo sin omisiones.
 * LÓGICA: Validación cruzada de paridad (2H + 2M) y estatus "confirmado".
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, Shield, CheckCircle, AlertCircle, Search, 
  Loader2, X, Info, Zap, ArrowRight 
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { type RunnerRow } from "@/lib/supabase";

interface TeamMember {
  id: string;
  nombre: string;
  apellido: string;
  cedula: string;
  genero: "M" | "F";
}

const TeamRegistration = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [teamName, setTeamName] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<RunnerRow[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Slots del equipo
  const [membersM, setMembersM] = useState<TeamMember[]>([]);
  const [membersF, setMembersF] = useState<TeamMember[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // ─── MOTOR DE BÚSQUEDA TÁCTICA ───
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (searchQuery.length < 4) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const { data, error } = await supabase
          .from("runners")
          .select("*")
          .or(`cedula.ilike.%${searchQuery}%,nombre.ilike.%${searchQuery}%,apellido.ilike.%${searchQuery}%`)
          .eq("estado", "confirmado") // Solo operativos
          .limit(5);

        if (error) throw error;
        setSearchResults(data || []);
      } catch (err) {
        console.error("MIA Search Error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const addMember = (runner: RunnerRow) => {
    const member: TeamMember = {
      id: runner.id,
      nombre: runner.nombre,
      apellido: runner.apellido,
      cedula: runner.cedula,
      genero: runner.genero as "M" | "F"
    };

    // Validar si ya está en algún slot
    if ([...membersM, ...membersF].some(m => m.id === member.id)) {
      setError("ESTE ATLETA YA ESTÁ EN LA LISTA DEL EQUIPO.");
      return;
    }

    if (member.genero === "M") {
      if (membersM.length < 2) setMembersM([...membersM, member]);
      else setError("CUPO MASCULINO COMPLETO (MAX 2).");
    } else {
      if (membersF.length < 2) setMembersF([...membersF, member]);
      else setError("CUPO FEMENINO COMPLETO (MAX 2).");
    }
    setSearchQuery("");
    setSearchResults([]);
    setError(null);
  };

  const removeMember = (id: string, genero: "M" | "F") => {
    if (genero === "M") setMembersM(membersM.filter(m => m.id !== id));
    else setMembersF(membersF.filter(m => m.id !== id));
  };

  const canSubmit = teamName.length >= 3 && membersM.length === 2 && membersF.length === 2;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const { error: teamError } = await supabase
        .from("teams")
        .insert([{
          team_name: teamName.toUpperCase(),
          info_adicional: additionalInfo,
          runner_m1_id: membersM[0].id,
          runner_m2_id: membersM[1].id,
          runner_f1_id: membersF[0].id,
          runner_f2_id: membersF[1].id
        }]);

      if (teamError) throw teamError;
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "ERROR EN LA CREACIÓN DEL TEAM.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full rounded-xl bg-white/[0.03] border border-white/10 px-5 py-4 text-xs font-bold text-white placeholder:text-white/20 focus:outline-none focus:border-cyan-400 transition-all uppercase";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#03070b]/90 backdrop-blur-xl"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
            className="bg-[#080b11] border border-white/10 p-8 rounded-[2rem] max-w-2xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl"
          >
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-3xl font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
                  <Users className="text-cyan-400 h-8 w-8" /> ARMA TU TEAM
                </h3>
                <p className="text-[10px] text-cyan-400/50 font-black tracking-[0.3em] uppercase mt-1">
                  Modalidad Mixta 2H + 2M
                </p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                <X className="text-white/40 h-6 w-6" />
              </button>
            </div>

            {success ? (
              <div className="text-center py-12">
                <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-6" />
                <h4 className="text-2xl font-black text-white uppercase italic">EQUIPO REGISTRADO</h4>
                <p className="text-white/40 text-xs mt-2 uppercase tracking-widest">Listos para la batalla en el asfalto.</p>
                <button onClick={onClose} className="mt-8 px-10 py-4 bg-white text-black font-black text-[10px] rounded-xl uppercase tracking-[0.2em]">Cerrar</button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Info Básica */}
                <div className="grid grid-cols-1 gap-4">
                  <input 
                    className={inputClass} placeholder="NOMBRE DEL EQUIPO" 
                    value={teamName} onChange={e => setTeamName(e.target.value)} 
                  />
                  <input 
                    className={inputClass} placeholder="INFO ADICIONAL / CLUB (OPCIONAL)" 
                    value={additionalInfo} onChange={e => setAdditionalInfo(e.target.value)} 
                  />
                </div>

                {/* Buscador de Atletas */}
                <div className="relative">
                  <label className="text-[9px] font-black text-cyan-400 uppercase tracking-widest mb-3 block">Buscar Atletas Inscritos (Cédula o Nombre)</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-4 h-4 w-4 text-white/20" />
                    <input 
                      className={`${inputClass} pl-12`} 
                      placeholder="ESCRIBE MÍNIMO 4 CARACTERES..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                    {isSearching && <Loader2 className="absolute right-4 top-4 h-4 w-4 text-cyan-400 animate-spin" />}
                  </div>

                  {/* Resultados Búsqueda */}
                  {searchResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-2 bg-[#12161d] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                      {searchResults.map(r => (
                        <button 
                          key={r.id} onClick={() => addMember(r)}
                          className="w-full p-4 flex items-center justify-between hover:bg-cyan-500/10 transition-colors border-b border-white/5 last:border-0 text-left"
                        >
                          <div>
                            <p className="text-[10px] font-black text-white uppercase">{r.nombre} {r.apellido}</p>
                            <p className="text-[8px] text-white/40 uppercase">V-{r.cedula} | {r.genero === "M" ? "HOMBRE" : "MUJER"}</p>
                          </div>
                          <Zap className="h-3 w-3 text-cyan-400" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Grid de Slots */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Slot Hombres */}
                  <div className="space-y-3">
                    <h5 className="text-[9px] font-black text-white/40 uppercase tracking-widest flex items-center gap-2">
                      <div className="h-1 w-1 bg-cyan-400 rounded-full" /> HOMBRES ({membersM.length}/2)
                    </h5>
                    {[0, 1].map(i => (
                      <div key={i} className="h-14 rounded-xl border border-dashed border-white/10 flex items-center px-4 relative overflow-hidden bg-white/[0.01]">
                        {membersM[i] ? (
                          <div className="flex justify-between items-center w-full">
                            <span className="text-[10px] font-bold text-white uppercase truncate pr-8">{membersM[i].nombre}</span>
                            <button onClick={() => removeMember(membersM[i].id, "M")} className="absolute right-4"><X className="h-3 w-3 text-red-500" /></button>
                          </div>
                        ) : (
                          <span className="text-[8px] text-white/10 font-black uppercase tracking-tighter">Esperando Atleta...</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Slot Mujeres */}
                  <div className="space-y-3">
                    <h5 className="text-[9px] font-black text-white/40 uppercase tracking-widest flex items-center gap-2">
                      <div className="h-1 w-1 bg-pink-400 rounded-full" /> MUJERES ({membersF.length}/2)
                    </h5>
                    {[0, 1].map(i => (
                      <div key={i} className="h-14 rounded-xl border border-dashed border-white/10 flex items-center px-4 relative overflow-hidden bg-white/[0.01]">
                        {membersF[i] ? (
                          <div className="flex justify-between items-center w-full">
                            <span className="text-[10px] font-bold text-white uppercase truncate pr-8">{membersF[i].nombre}</span>
                            <button onClick={() => removeMember(membersF[i].id, "F")} className="absolute right-4"><X className="h-3 w-3 text-red-500" /></button>
                          </div>
                        ) : (
                          <span className="text-[8px] text-white/10 font-black uppercase tracking-tighter">Esperando Atleta...</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                    <AlertCircle className="h-4 w-4 text-red-400" />
                    <p className="text-[9px] font-black text-red-400 uppercase tracking-widest">{error}</p>
                  </div>
                )}

                <button 
                  disabled={!canSubmit || isSubmitting}
                  onClick={handleSubmit}
                  className={`w-full py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 ${
                    canSubmit && !isSubmitting 
                    ? "bg-[#00f2ff] text-[#03070b] shadow-[0_0_20px_rgba(0,242,255,0.3)]" 
                    : "bg-white/5 text-white/20 border border-white/5 cursor-not-allowed"
                  }`}
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Shield className="h-4 w-4" /> REGISTRAR ESCUADRÓN</>}
                </button>

                <div className="bg-white/[0.02] p-4 rounded-xl border border-white/5 flex gap-3 items-start">
                  <Info className="h-4 w-4 text-cyan-400 shrink-0" />
                  <p className="text-[8px] text-white/30 font-medium uppercase leading-relaxed tracking-widest">
                    REGLA MIA: El tiempo del equipo será la suma de los 4 tiempos individuales. Todos los miembros deben estar confirmados previamente.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TeamRegistration;
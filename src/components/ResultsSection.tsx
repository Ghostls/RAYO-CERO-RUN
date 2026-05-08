/**
 * RAYO CERO — RESULTS MODULE (STABLE V12 - PRECISION STRIKE)
 * Senior Dev: MIA (Valkyron Group)
 * CEO: Lualdo Sciscioli
 * Grado: Militar / Operativo / Diseñador
 * 
 * EVOLUCIÓN V12:
 * - DATA MAPPING FINAL: Sincronización con columnas reales (ranking_general, ranking_categoria).
 * - INTERVAL PARSING: Formateo de tiempos tipo 'interval' para visualización humana.
 * - AMBIGUITY BYPASS: Mantenemos consultas separadas para evitar errores de relación.
 * - REGLA DE ORO: Código íntegro, evolucionado y blindado.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Clock, Trophy, Zap, Loader2, AlertCircle, Medal, Crosshair, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface RunnerResultData {
  name: string;
  bib: string | number;
  category: string;
  time: string | null;
  rank?: string | number;
  categoryRank?: string | number;
  pace?: string;
}

const ResultsSection = () => {
  const [bib, setBib] = useState("");
  const [result, setResult] = useState<RunnerResultData | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSearch = async () => {
    const rawBib = bib.trim();
    if (!rawBib) return;

    const numericBib = parseInt(rawBib, 10);
    if (isNaN(numericBib)) {
      setErrorMsg("Dorsal no válido.");
      return;
    }

    setIsSearching(true);
    setResult(null);
    setErrorMsg("");

    try {
      // 1. Obtener datos del corredor (Uplink Alfa)
      const { data: runner, error: rError } = await supabase
        .from('runners')
        .select('nombre, apellido, bib_number, categoria')
        .eq('bib_number', numericBib)
        .maybeSingle();

      if (rError) throw rError;
      if (!runner) throw new Error("Atleta no localizado en el sistema.");

      // 2. Obtener resultados (Uplink Beta - Columnas Confirmadas)
      const { data: race, error: rcError } = await supabase
        .from('race_results')
        .select('tiempo_chip, ranking_general, ranking_categoria, velocidad_kmh')
        .eq('bib_number', numericBib)
        .maybeSingle();

      if (rcError) throw rcError;

      processTelemetry(runner, race);

    } catch (e: any) {
      console.error('[MIA CRITICAL]', e.message);
      setErrorMsg(e.message || "Error de telemetría.");
    } finally {
      setIsSearching(false);
    }
  };

  const processTelemetry = (runner: any, race: any) => {
    // Formatear el intervalo de tiempo (PostgreSQL interval a HH:MM:SS)
    let formattedTime = race?.tiempo_chip || null;
    if (formattedTime && typeof formattedTime === 'object') {
      // Si Supabase lo devuelve como objeto de intervalo
      const h = String(formattedTime.hours || 0).padStart(2, '0');
      const m = String(formattedTime.minutes || 0).padStart(2, '0');
      const s = String(formattedTime.seconds || 0).padStart(2, '0');
      formattedTime = `${h}:${m}:${s}`;
    }

    const stats: RunnerResultData = {
      name: `${runner.nombre} ${runner.apellido}`,
      bib: runner.bib_number,
      category: runner.categoria || "GENERAL",
      time: formattedTime,
      rank: race?.ranking_general ? `${race.ranking_general}°` : "---",
      categoryRank: race?.ranking_categoria ? `${race.ranking_categoria}°` : "---",
      pace: race?.velocidad_kmh ? `${race.velocidad_kmh} KM/H` : "---"
    };
    setResult(stats);
  };

  return (
    <section className="relative min-h-screen pt-32 pb-24 px-6 bg-[#03070b] font-sans overflow-hidden">
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-4xl mx-auto relative z-10">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          
          <div className="text-center mb-16">
            <motion.div 
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/5 backdrop-blur-md mb-6"
            >
              <Crosshair className="h-3 w-3 text-cyan-400" />
              <span className="text-[9px] font-black tracking-[0.4em] text-white/60 uppercase">
                UHF Chip System Verification
              </span>
            </motion.div>
            <h2 className="text-5xl md:text-[5rem] font-black text-white mb-4 tracking-tighter italic uppercase leading-[0.85] drop-shadow-2xl">
              TIEMPOS EN <br /> 
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-white">VIVO.</span>
            </h2>
          </div>

          <div className="relative max-w-2xl mx-auto mb-16">
            <div className="flex items-center w-full bg-white/[0.02] border border-white/10 rounded-full p-2 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all focus-within:border-cyan-400/50 focus-within:bg-white/[0.04] focus-within:shadow-[0_0_30px_rgba(0,242,255,0.1)]">
              <input
                type="text" 
                inputMode="numeric"
                placeholder="Nº DE DORSAL"
                value={bib}
                onChange={(e) => setBib(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="flex-grow w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 py-3 md:py-4 px-6 md:px-8 text-2xl md:text-3xl font-black text-white placeholder:text-white/20 tracking-[0.2em] text-center md:text-left"
              />
              <button
                onClick={handleSearch}
                disabled={isSearching || !bib.trim()}
                className="shrink-0 bg-cyan-500 hover:bg-cyan-400 text-black py-4 md:py-5 px-8 md:px-12 rounded-full font-black text-[10px] md:text-xs tracking-[0.2em] uppercase flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,242,255,0.15)] active:scale-95"
              >
                {isSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                <span className="hidden md:inline">{isSearching ? "VALIDANDO" : "BUSCAR"}</span>
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {result && (
              <motion.div
                key="result-card"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ duration: 0.4, ease: "circOut" }}
                className="bg-white/[0.02] border border-white/10 rounded-[3rem] p-8 md:p-12 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                   <Trophy className="h-48 w-48 text-white" />
                </div>

                <div className="flex flex-col md:flex-row justify-between gap-8 mb-12 relative z-10 border-b border-white/5 pb-8">
                  <div>
                    <span className="text-[9px] font-black text-cyan-400 tracking-[0.3em] uppercase bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">Atleta Oficial</span>
                    <h3 className="text-4xl md:text-5xl font-black text-white italic uppercase mt-4 tracking-tighter leading-none">{result.name}</h3>
                    <p className="text-white/50 text-[10px] font-black mt-3 tracking-widest uppercase">
                      {result.category} <span className="text-white/20 mx-2">|</span> DORSAL #{result.bib}
                    </p>
                  </div>

                  <div className="flex flex-col items-start md:items-end justify-center">
                     {result.time ? (
                        <div className="px-6 py-3 rounded-full text-[10px] font-black tracking-[0.3em] uppercase border bg-emerald-500/10 border-emerald-500/20 text-emerald-400 flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                          <CheckCircle className="h-3 w-3" /> CARRERA FINALIZADA
                        </div>
                     ) : (
                        <div className="px-6 py-3 rounded-full text-[10px] font-black tracking-[0.3em] uppercase border bg-cyan-500/10 border-cyan-500/20 text-cyan-400 flex items-center gap-2 animate-pulse shadow-[0_0_15px_rgba(0,242,255,0.1)]">
                          <Zap className="h-3 w-3" /> EN PISTA / ESPERANDO TIEMPO
                        </div>
                     )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 relative z-10">
                  <div className="p-8 bg-white/[0.03] border border-white/5 rounded-[2rem] hover:border-cyan-500/30 transition-colors group">
                    <div className="flex items-center gap-3 mb-4 text-white/30 group-hover:text-cyan-400 transition-colors">
                      <Clock className="h-4 w-4" />
                      <span className="text-[9px] font-black uppercase tracking-[0.2em]">Tiempo Neto</span>
                    </div>
                    <p className="text-4xl md:text-5xl font-black text-white italic tracking-tighter leading-none">
                      {result.time || "--:--:--"}
                    </p>
                  </div>

                  <div className="p-8 bg-white/[0.03] border border-white/5 rounded-[2rem] hover:border-cyan-500/30 transition-colors group">
                    <div className="flex items-center gap-3 mb-4 text-white/30 group-hover:text-cyan-400 transition-colors">
                      <Trophy className="h-4 w-4" />
                      <span className="text-[9px] font-black uppercase tracking-[0.2em]">Ranking General</span>
                    </div>
                    <p className="text-4xl md:text-5xl font-black text-cyan-400 italic tracking-tighter leading-none">
                      {result.rank}
                    </p>
                  </div>

                  <div className="p-8 bg-white/[0.03] border border-white/5 rounded-[2rem] hover:border-cyan-500/30 transition-colors group sm:col-span-2 lg:col-span-1">
                    <div className="flex items-center gap-3 mb-4 text-white/30 group-hover:text-cyan-400 transition-colors">
                      <Medal className="h-4 w-4" />
                      <span className="text-[9px] font-black uppercase tracking-[0.2em]">Rendimiento</span>
                    </div>
                    <div className="flex items-end justify-between">
                       <div>
                          <p className="text-3xl font-black text-white italic tracking-tighter leading-none">
                            {result.pace}
                          </p>
                          <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mt-1">VELOCIDAD</p>
                       </div>
                       <div className="text-right">
                          <p className="text-3xl font-black text-cyan-400 italic tracking-tighter leading-none">
                            {result.categoryRank}
                          </p>
                          <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest mt-1">POS. CATEGORÍA</p>
                       </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {errorMsg && (
              <motion.div 
                key="error-msg"
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl max-w-xl mx-auto text-center flex flex-col items-center justify-center gap-3 backdrop-blur-md"
              >
                <AlertCircle className="h-6 w-6 text-red-400" /> 
                <span className="font-black text-[10px] tracking-[0.2em] text-red-400 uppercase leading-relaxed">{errorMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      </div>
    </section>
  );
};

export default ResultsSection;
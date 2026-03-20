import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Clock, TrendingUp, Award, Trophy, Download, ShieldCheck, Zap } from "lucide-react";

interface RunnerResult {
  bib: string;
  name: string;
  time: string;
  pace: string;
  rank: number;
  categoryRank: number;
  category: string;
  totalRunners: number;
}

const mockResults: Record<string, RunnerResult> = {
  "1001": { bib: "1001", name: "Carlos Méndez", time: "00:42:15", pace: "4:13/km", rank: 3, categoryRank: 1, category: "Abierta Masculino", totalRunners: 250 },
  "1002": { bib: "1002", name: "María López", time: "00:45:32", pace: "4:33/km", rank: 12, categoryRank: 2, category: "Abierta Femenino", totalRunners: 250 },
  "1003": { bib: "1003", name: "Roberto Díaz", time: "00:38:47", pace: "3:53/km", rank: 1, categoryRank: 1, category: "Sub-Master Masculino", totalRunners: 250 },
  "1004": { bib: "1004", name: "Ana Torres", time: "00:51:20", pace: "5:08/km", rank: 45, categoryRank: 5, category: "Master A Femenino", totalRunners: 250 },
};

const ResultsSection = () => {
  const [bib, setBib] = useState("");
  const [result, setResult] = useState<RunnerResult | null>(null);
  const [notFound, setNotFound] = useState(false);

  const handleSearch = () => {
    const found = mockResults[bib.trim()];
    if (found) {
      setResult(found);
      setNotFound(false);
    } else {
      setResult(null);
      setNotFound(true);
    }
  };

  const stats = result
    ? [
        { icon: <Clock className="h-5 w-5" />, label: "TIEMPO OFICIAL", value: result.time },
        { icon: <TrendingUp className="h-5 w-5" />, label: "RITMO MEDIO", value: result.pace },
        { icon: <Award className="h-5 w-5" />, label: "RANKING GENERAL", value: `${result.rank} / ${result.totalRunners}` },
        { icon: <Trophy className="h-5 w-5" />, label: "RANKING CATEGORÍA", value: `${result.categoryRank}°` },
      ]
    : [];

  const inputClass = "flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all backdrop-blur-md";

  return (
    <section id="results" className="relative py-32 px-6 bg-[#000a12]">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tighter italic uppercase">
              Módulo de <span className="text-white/30 text-gradient">Resultados</span>
            </h2>
            <div className="flex items-center justify-center gap-2">
                <ShieldCheck className="h-4 w-4 text-white/40" />
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-bold">Chip-Timing Verification System</p>
            </div>
          </div>

          {/* Search Container: Liquid Glass */}
          <div className="bg-white/5 border border-white/10 p-8 rounded-[32px] mb-12 backdrop-blur-xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Search className="h-20 w-20 text-white" />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 relative z-10">
              <input
                className={inputClass}
                placeholder="Ingresar número de dorsal (BIB)"
                value={bib}
                onChange={(e) => setBib(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <motion.button
                whileHover={{ scale: 1.02, backgroundColor: "#ffffff", color: "#000a12" }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSearch}
                className="rounded-xl bg-white/10 border border-white/20 px-8 py-4 text-sm font-black text-white flex items-center justify-center gap-3 transition-all"
              >
                <Zap className="h-4 w-4" /> CONSULTAR
              </motion.button>
            </div>
            <p className="text-[10px] text-white/20 mt-4 font-mono uppercase tracking-widest text-center sm:text-left italic">
              Prueba de sistema: 1001, 1002, 1003, 1004
            </p>
          </div>

          {/* Results: Liquid Card */}
          <AnimatePresence mode="wait">
            {result && (
              <motion.div
                key={result.bib}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white/5 border border-white/10 p-10 rounded-[40px] backdrop-blur-2xl shadow-2xl relative overflow-hidden"
              >
                {/* Certificate Background Detail */}
                <div className="absolute top-10 right-10 opacity-10">
                    <Trophy className="h-32 w-32 text-white" />
                </div>

                <div className="text-center sm:text-left mb-10 border-b border-white/10 pb-8">
                  <div className="inline-block px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[10px] font-black text-white/60 mb-4 uppercase tracking-[0.2em]">
                    Dorsal Confirmado #{result.bib}
                  </div>
                  <h3 className="text-4xl font-black text-white tracking-tighter italic uppercase">{result.name}</h3>
                  <p className="text-sm text-white/40 font-bold mt-1 uppercase tracking-widest">{result.category}</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {stats.map((s, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-white/5 border border-white/5 p-5 rounded-2xl flex flex-col items-center justify-center text-center group hover:bg-white/10 transition-all"
                    >
                      <div className="text-white/40 group-hover:text-white transition-colors mb-3">{s.icon}</div>
                      <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-2">{s.label}</p>
                      <p className="text-xl font-black text-white tracking-tighter italic">{s.value}</p>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-12 flex flex-col sm:flex-row gap-4 items-center justify-between pt-8 border-t border-white/10">
                    <div className="text-left">
                        <p className="text-[10px] font-mono text-white/20 uppercase">Validación Valkyron-ID: {btoa(result.name).substring(0, 10)}</p>
                        <p className="text-[10px] font-mono text-white/20 uppercase tracking-tighter">Sincronización de chip: Real-Time Active</p>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-3 rounded-full bg-white px-8 py-4 text-xs font-black text-[#000a12] shadow-xl shadow-white/10 transition-all uppercase tracking-widest"
                    >
                        <Download className="h-4 w-4" /> Descargar Certificado
                    </motion.button>
                </div>
              </motion.div>
            )}

            {notFound && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 border border-white/10 p-12 rounded-[32px] text-center backdrop-blur-xl shadow-xl"
              >
                <div className="p-4 bg-red-500/10 rounded-full inline-block mb-4">
                    <Search className="h-8 w-8 text-red-500" />
                </div>
                <h4 className="text-xl font-black text-white italic tracking-tight mb-2 uppercase">Atleta No Encontrado</h4>
                <p className="text-white/40 text-sm font-medium">El dorsal <span className="text-white">#{bib}</span> no ha sido registrado por el sistema de cronometraje.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
};

export default ResultsSection;
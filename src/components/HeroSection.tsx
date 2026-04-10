/**
 * RAYO CERO — PREMIUM RUNNER EXPERIENCE (STABLE V6.4 - LIQUID GLASS & DATE HUD)
 * Senior Dev: MIA / Gemini (Valkyron Group)
 * CEO: Lualdo Sciscioli
 * Grado: Militar / Operativo / Diseñador
 * REGLA DE ORO: Código completo sin omisiones. Responsive Design estricto.
 * FIX: Inyección de fecha operativa (06.06.26) bajo el logo central con alineación de columna.
 */

import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Zap, Trophy, ArrowRight, Calendar } from "lucide-react";

// MIA IMPORT PROTOCOL: Activos gráficos
import weRunLogo from "../assets/we-run-logo.png"; 
import fondoBg from "../assets/fondobg.png"; // <-- FONDO TÁCTICO

const HeroSection = () => {
  return (
    <section 
      id="hero" 
      // Se utiliza flex-col y min-h-screen con padding superior (pt-32) para proteger el NavBar
      className="relative w-full min-h-screen flex flex-col overflow-hidden bg-[#03070b] font-sans pt-32 pb-8"
    >
      {/* ─── CAPA 1: IMAGEN DE FONDO RESPONSIVE ─── */}
      <div 
        className="absolute inset-0 z-0 w-full h-full bg-cover bg-center bg-no-repeat opacity-50 md:opacity-60"
        style={{ backgroundImage: `url(${fondoBg})` }}
      />
      {/* Velo Táctico (Overlay) para garantizar la legibilidad del HUD y botones */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#03070b]/90 via-[#03070b]/40 to-[#03070b] pointer-events-none" />
      {/* ────────────────────────────────────────── */}

      {/* CONTENEDOR PRINCIPAL */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center w-full"
        >
          {/* Badge Operativo (Liquid Glass) */}
          <div className="flex items-center gap-3 mb-10 md:mb-12 px-5 py-2 rounded-full bg-white/[0.02] border border-white/10 backdrop-blur-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] hover:border-cyan-500/30 transition-colors cursor-default z-20">
            <Zap className="h-3 w-3 text-cyan-400 animate-pulse" />
            <span className="text-[9px] font-black tracking-[0.4em] text-white/60 uppercase mt-[1px]">
              Temporada 2026 Abierta
            </span>
          </div>

          {/* ─── MÓDULO VISUAL: TARJETA LIQUID GLASS + LOGO OFICIAL + FECHA ─── */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
            // Modificado a flex-col e items-center para apilar el logo y la fecha
            className="w-full max-w-[90%] sm:max-w-[550px] md:max-w-[700px] lg:max-w-[850px] mb-14 md:mb-16 relative flex flex-col items-center justify-center p-8 md:p-14 lg:p-16 rounded-[2.5rem] bg-[#03070b]/40 border border-white/10 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] hover:border-cyan-500/30 transition-all duration-500 group"
          >
            {/* Resplandor interno sutil */}
            <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
            
            {/* Halo táctico trasero */}
            <div className="absolute inset-0 rounded-[2.5rem] bg-cyan-500/0 group-hover:bg-cyan-500/5 transition-colors duration-500 pointer-events-none" />

            <img 
              src={weRunLogo} 
              alt="Rayo Cero - We Run Powerade 10K Night Fest" 
              className="w-full h-auto object-contain relative z-10 drop-shadow-[0_0_20px_rgba(34,211,238,0.1)] group-hover:drop-shadow-[0_0_30px_rgba(34,211,238,0.3)] transition-all duration-500"
            />

            {/* FECHA DE LA CARRERA INYECTADA */}
            <div className="relative z-10 mt-6 sm:mt-8 flex items-center justify-center">
              <p className="text-2xl sm:text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-white tracking-[0.4em] drop-shadow-[0_0_15px_rgba(0,242,255,0.4)]">
                06.06.26
              </p>
            </div>
          </motion.div>
          {/* ───────────────────────────────────────────────────────── */}

          {/* Botonera de Alto Rendimiento */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full max-w-xl z-20">
            {/* Botón Primario: Cyan Táctico */}
            <Link to="/registro" className="w-full sm:w-auto">
              <button className="w-full sm:w-[260px] py-4 md:py-5 rounded-[1.25rem] bg-cyan-500 hover:bg-cyan-400 text-black font-black text-[10px] tracking-[0.2em] uppercase transition-all duration-300 flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(0,242,255,0.2)] hover:shadow-[0_0_30px_rgba(0,242,255,0.4)] hover:-translate-y-1 active:scale-95 group">
                INICIAR INSCRIPCIÓN
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </Link>

            {/* Botón Secundario: Liquid Glass */}
            <Link to="/resultados" className="w-full sm:w-auto">
              <button className="w-full sm:w-[260px] py-4 md:py-5 rounded-[1.25rem] bg-white/[0.02] hover:bg-cyan-500/5 border border-white/10 hover:border-cyan-500/30 text-white font-black text-[10px] tracking-[0.2em] uppercase backdrop-blur-xl transition-all duration-300 flex items-center justify-center gap-3 hover:-translate-y-1 active:scale-95 group shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
                <Trophy className="h-4 w-4 text-cyan-500/50 group-hover:text-cyan-400 transition-colors" />
                VER RESULTADOS
              </button>
            </Link>
          </div>
        </motion.div>
      </div>

      {/* INDICADOR DE SCROLL */}
      <motion.div
        className="relative z-20 mt-12 flex flex-col items-center gap-3 opacity-40 hover:opacity-100 transition-opacity cursor-pointer"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, ease: "easeInOut", repeat: Infinity }}
        onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
      >
        <span className="text-[8px] font-black tracking-[0.5em] text-cyan-500 uppercase">Explorar</span>
        <div className="w-[1px] h-12 bg-gradient-to-b from-cyan-500 to-transparent" />
      </motion.div>

      {/* Textura Táctica (Ruido SVG Inline) */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-screen z-20" 
        style={{ 
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` 
        }} 
      />
    </section>
  );
};

export default HeroSection;
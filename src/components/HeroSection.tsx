/**
 * RAYO CERO — PREMIUM RUNNER EXPERIENCE (STABLE V6 - LIQUID GLASS)
 * Senior Dev: MIA (Valkyron Group)
 * Fix: Sincronización estética con el nuevo Index. Paneles de cristal y resplandor táctico.
 * Cumplimiento de Regla de Oro: Evolución sin omisiones.
 */

import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Zap, Trophy, ArrowRight } from "lucide-react";
import GlassSphere from "./GlassSphere";

const HeroSection = () => {
  return (
    <section 
      id="hero" 
      // Se utiliza flex-col y min-h-screen con padding superior (pt-32) para proteger el NavBar
      className="relative w-full min-h-screen flex flex-col overflow-hidden bg-[#03070b] font-sans pt-32 pb-8"
    >
      {/* Esferas de Cristal Líquido — Paleta Cyan/Naval */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <GlassSphere size={600} color="hsla(195, 100%, 50%, 0.08)" initialX={-15} initialY={5} delay={0} />
        <GlassSphere size={450} color="hsla(210, 30%, 20%, 0.15)" initialX={75} initialY={20} delay={1} />
        <GlassSphere size={350} color="hsla(195, 100%, 50%, 0.05)" initialX={40} initialY={65} delay={2} />
      </div>

      {/* CONTENEDOR PRINCIPAL */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center w-full"
        >
          {/* Badge Operativo (Liquid Glass) */}
          <div className="flex items-center gap-3 mb-8 px-5 py-2 rounded-full bg-white/[0.02] border border-white/10 backdrop-blur-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] hover:border-cyan-500/30 transition-colors cursor-default">
            <Zap className="h-3 w-3 text-cyan-400 animate-pulse" />
            <span className="text-[9px] font-black tracking-[0.4em] text-white/60 uppercase mt-[1px]">
              Temporada 2026 Abierta
            </span>
          </div>

          {/* Headline Aspiracional */}
          <h1 className="text-6xl md:text-8xl lg:text-[8.5rem] font-black italic tracking-tighter leading-[0.85] mb-8 text-white uppercase drop-shadow-2xl text-center">
            DOMINA EL <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-white">ASFALTO.</span>
          </h1>

          <p className="text-sm md:text-lg text-white/40 max-w-2xl mx-auto mb-12 font-medium leading-relaxed tracking-wide text-center">
            Experimenta el cronometraje de precisión y la gestión inteligente 
            diseñada para el atleta que exige excelencia en cada kilómetro.
          </p>

          {/* Botonera de Alto Rendimiento */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full max-w-xl">
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
        className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-screen" 
        style={{ 
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` 
        }} 
      />
    </section>
  );
};

export default HeroSection;
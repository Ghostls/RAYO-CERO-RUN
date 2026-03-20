import { motion } from "framer-motion";
import { ChevronDown, Activity, Timer } from "lucide-react";
import GlassSphere from "./GlassSphere";

interface HeroSectionProps {
  onNavigate: (section: string) => void;
}

const HeroSection = ({ onNavigate }: HeroSectionProps) => {
  return (
    <section 
      id="hero" 
      // CORRECCIÓN: pt-28 (móvil) y pt-36 (desktop) compensan la altura del Navbar fijo
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#000a12] pt-28 md:pt-36 pb-20"
    >
      {/* Liquid Glass Spheres - Evolucionadas a paleta Rayo Cero (Naval & Cyan) */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <GlassSphere size={400} color="#001F3F" initialX={-5} initialY={10} delay={0} />
        <GlassSphere size={300} color="#0077b6" initialX={80} initialY={20} delay={1} />
        <GlassSphere size={250} color="#00b4d8" initialX={50} initialY={70} delay={2} />
        <GlassSphere size={180} color="#ffffff" initialX={15} initialY={80} delay={0.5} />
      </div>

      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          // CORRECCIÓN: padding-top extra para garantizar que el texto principal no se solape
          className="flex flex-col gap-6"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="h-[1px] w-8 bg-white/30" />
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-white/60">
              Valkyron Group <span className="text-white/20 px-2">|</span> Military Grade Tech
            </p>
            <span className="h-[1px] w-8 bg-white/30" />
          </div>

          <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-[0.85] mb-4 text-white">
            RAYO
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40">CERO</span>
            <br />
            <span className="text-[0.4em] tracking-[0.2em] font-light text-white/90">RUNNING</span>
          </h1>

          <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10 font-medium leading-relaxed">
            Ecosistema Digital de alto rendimiento. Gestión inteligente de atletas, 
            cronometraje por chip y precisión de ingeniería en cada kilómetro.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(255,255,255,0.1)" }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onNavigate("register")}
              className="group relative flex items-center gap-3 rounded-full bg-white px-10 py-5 text-base font-bold text-[#001F3F] transition-all"
            >
              <Activity className="h-5 w-5 transition-transform group-hover:rotate-12" />
              Inscribirme ahora
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onNavigate("results")}
              className="flex items-center gap-3 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 px-10 py-5 text-base font-bold text-white hover:bg-white/10 transition-all"
            >
              <Timer className="h-5 w-5" />
              Consultar resultados
            </motion.button>
          </div>
        </motion.div>

        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] font-bold tracking-widest text-white/30 uppercase">Scroll para explorar</span>
            <ChevronDown className="h-5 w-5 text-white/30" />
          </div>
        </motion.div>
      </div>

      {/* Overlay de ruido sutil para textura "Military Grade" */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
    </section>
  );
};

export default HeroSection;
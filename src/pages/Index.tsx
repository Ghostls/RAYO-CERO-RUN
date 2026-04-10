/**
 * RAYO CERO — HOME CORE MODULE (STABLE V7.1 - AURORA KINETIC EDITION + FLYER INTEGRATION)
 * Senior Dev: MIA (Valkyron Group)
 * CEO: Lualdo Sciscioli
 * Grado: Diseñador / Operativo
 * * REGLA DE ORO: Evolución estructural sin omisiones. Integración de logos oficiales.
 * * FIX: Implementación de Aurora Boreal ultra sutil (Framer Motion) en capa base (Z-0).
 * * UPDATE: Integración de Flyer de Inscripciones responsivo.
 */

import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Zap, ShieldCheck, Trophy, ArrowRight, Activity, Crosshair, Map } from "lucide-react";

// Componentes del Ecosistema
import HeroSection from "@/components/HeroSection";
import RacesSection from "@/components/RacesSection";

// Importación de activos gráficos (Logos de Patrocinantes y Flyers)
import logoValkyron from "@/assets/logo1.png";
import logoPowerade from "@/assets/logo2.png";
import flyerInscripciones from "@/assets/flier_inscripciones_abiertas.png"; 

const Index = () => {
  return (
    // Sincronización estricta con el fondo Obsidian Naval del resto del ecosistema
    <div className="relative min-h-screen bg-[#03070b] flex flex-col overflow-x-hidden font-sans text-white z-0">
      
      {/* ─── EFECTO AURORA BOREAL (ULTRA SUTIL) ─── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {/* Nodo Norte - Cyan */}
        <motion.div
          animate={{
            x: [0, 100, 0, -100, 0],
            y: [0, 50, 100, 50, 0],
            scale: [1, 1.1, 1, 1.05, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-cyan-500/5 blur-[150px] rounded-full mix-blend-screen"
        />
        {/* Nodo Sur - Deep Blue */}
        <motion.div
          animate={{
            x: [0, -120, 0, 120, 0],
            y: [0, -80, 0, 80, 0],
            scale: [1, 1.2, 1, 1.1, 1],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute top-[40%] -right-[10%] w-[60%] h-[60%] bg-blue-600/5 blur-[150px] rounded-full mix-blend-screen"
        />
      </div>
      {/* ────────────────────────────────────────── */}

      {/* 1. MÓDULO HERO: Portal de Entrada (Se mantiene intacto) */}
      <HeroSection />

      {/* ─── MÓDULO VISUAL: FLYER DE INSCRIPCIONES (Integración Estructural) ─── */}
      <section className="relative w-full overflow-hidden flex justify-center items-center py-10 md:py-16 z-10 bg-gradient-to-b from-transparent via-[#050b14] to-transparent">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-[600px] aspect-[9/16] relative px-4 sm:px-0"
        >
          <img
            src={flyerInscripciones}
            alt="Inscripciones Abiertas - Rayocero"
            className="w-full h-full object-contain drop-shadow-[0_0_25px_rgba(34,211,238,0.15)] rounded-lg"
          />
        </motion.div>
      </section>
      {/* ─────────────────────────────────────────────────────────────────────── */}

      {/* BRANDING / PARTNERS GRID (Da legitimidad corporativa al evento) */}
      <div className="w-full border-y border-white/5 bg-white/[0.01] py-12 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-[9px] font-black uppercase tracking-[0.4em] text-white/30 mb-8">
            Partners Operativos & Patrocinantes
          </p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-40 grayscale hover:grayscale-0 transition-all duration-700">
             {/* Logo 2: Valkyron */}
             <img src={logoValkyron} alt="Valkyron Group" className="h-12 md:h-20 w-auto object-contain drop-shadow-xl" />             
             
             {/* Logo 1: powerade */}
             <img src={logoPowerade} alt="Powerade" className="h-8 md:h-12 w-auto object-contain drop-shadow-xl" />
          </div>
        </div>
      </div>

      {/* 2. MÓDULO DE CARRERAS: Calendario Operativo */}
      <div className="relative z-10">
        <RacesSection />
      </div>

      {/* 3. MANIFIESTO Y MÉTRICAS DE ALTO RENDIMIENTO */}
      <section className="py-24 px-6 max-w-7xl mx-auto w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Textos Editoriales */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-6">
              <Activity className="h-3 w-3 text-cyan-400" />
              <span className="text-[8px] font-black tracking-[0.3em] text-cyan-400 uppercase">Filosofía Rayo Cero</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-black italic tracking-tighter uppercase leading-[0.9]">
              REDEFINIENDO <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-white">EL LÍMITE.</span>
            </h2>
            <p className="mt-8 text-white/50 text-sm leading-relaxed font-medium max-w-md">
              No organizamos simples carreras, orquestamos operaciones de alto rendimiento. 
              Desde el trazado de la ruta hasta la telemetría en tiempo real, cada milímetro 
              de nuestro ecosistema está diseñado con precisión de grado militar para el atleta que exige excelencia.
            </p>
          </motion.div>

          {/* Grid de Stats (Liquid Glass) */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <div className="bg-[#03070b]/60 border border-white/5 p-8 rounded-[2rem] backdrop-blur-2xl hover:border-cyan-500/30 transition-colors shadow-2xl">
               <Crosshair className="h-6 w-6 text-cyan-400 mb-6" />
               <h4 className="text-3xl font-black italic tracking-tighter mb-2">UHF RFID</h4>
               <p className="text-[10px] font-bold text-white/40 tracking-widest uppercase">Cronometraje de Precisión</p>
            </div>
            <div className="bg-[#03070b]/60 border border-white/5 p-8 rounded-[2rem] backdrop-blur-2xl hover:border-cyan-500/30 transition-colors shadow-2xl">
               <Zap className="h-6 w-6 text-cyan-400 mb-6" />
               <h4 className="text-3xl font-black italic tracking-tighter mb-2">LIVE DATA</h4>
               <p className="text-[10px] font-bold text-white/40 tracking-widest uppercase">Resultados en Tiempo Real</p>
            </div>
            <div className="bg-[#03070b]/60 border border-white/5 p-8 rounded-[2rem] backdrop-blur-2xl hover:border-cyan-500/30 transition-colors sm:col-span-2 shadow-2xl">
               <Map className="h-6 w-6 text-cyan-400 mb-6" />
               <h4 className="text-3xl font-black italic tracking-tighter mb-2">RUTAS CERTIFICADAS</h4>
               <p className="text-[10px] font-bold text-white/40 tracking-widest uppercase max-w-xs">Circuitos blindados con seguridad operativa, hidratación estratégica y puntos de control.</p>
            </div>
          </motion.div>

        </div>
      </section>

      {/* 4. TERMINALES DE ACCESO (Reemplazo de las tarjetas genéricas) */}
      <section className="py-24 px-6 max-w-5xl mx-auto w-full relative z-10">
        
        <div className="text-center mb-16">
          <p className="text-[10px] font-black tracking-[0.5em] text-cyan-400 uppercase mb-4">
            Gestión Operativa
          </p>
          <h2 className="text-4xl md:text-5xl font-black italic text-white tracking-tighter uppercase drop-shadow-2xl">
            PANELES DE <span className="text-white/30">ACCESO</span>
          </h2>
        </div>

        <div className="flex flex-col gap-6">
          
          {/* Panel: Inscripción */}
          <Link to="/registro" className="group">
            <motion.div 
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full bg-[#03070b]/60 border border-white/5 rounded-[2.5rem] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-3xl hover:bg-cyan-500/5 hover:border-cyan-500/30 transition-all duration-500 shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
            >
              <div className="flex items-center gap-6 md:gap-8 w-full md:w-auto text-center md:text-left">
                <div className="p-5 bg-white/[0.03] border border-white/10 rounded-2xl group-hover:bg-cyan-400 group-hover:text-black transition-colors duration-500 shrink-0 mx-auto md:mx-0">
                  <ShieldCheck className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-2xl md:text-3xl font-black italic text-white tracking-tighter mb-2">
                    MÓDULO DE INSCRIPCIÓN
                  </h3>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                    Portal de registro oficial y validación de atletas.
                  </p>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-cyan-400 group-hover:text-black transition-colors duration-500 shrink-0">
                <ArrowRight className="h-5 w-5" />
              </div>
            </motion.div>
          </Link>

          {/* Panel: Resultados */}
          <Link to="/resultados" className="group">
            <motion.div 
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full bg-[#03070b]/60 border border-white/5 rounded-[2.5rem] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-3xl hover:bg-cyan-500/5 hover:border-cyan-500/30 transition-all duration-500 shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
            >
              <div className="flex items-center gap-6 md:gap-8 w-full md:w-auto text-center md:text-left">
                <div className="p-5 bg-white/[0.03] border border-white/10 rounded-2xl group-hover:bg-cyan-400 group-hover:text-black transition-colors duration-500 shrink-0 mx-auto md:mx-0">
                  <Trophy className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="text-2xl md:text-3xl font-black italic text-white tracking-tighter mb-2">
                    SISTEMA DE TIEMPOS
                  </h3>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                    Cronometraje UHF y ranking en vivo.
                  </p>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-cyan-400 group-hover:text-black transition-colors duration-500 shrink-0">
                <ArrowRight className="h-5 w-5" />
              </div>
            </motion.div>
          </Link>

        </div>

        {/* Branding Inferior */}
        <div className="mt-32 flex flex-col items-center gap-6">
          <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
          <div className="flex flex-col items-center opacity-30 hover:opacity-100 transition-opacity duration-700">
            <Zap className="h-6 w-6 text-cyan-400 mb-3 animate-pulse fill-current" />
            <p className="text-[9px] font-black tracking-[0.8em] uppercase text-white text-center">
              RAYOCERO EVENTOS
            </p>
            <p className="text-[7px] font-bold tracking-[0.4em] uppercase text-white/50 mt-2 text-center">
              INGENIERÍA DE PRECISIÓN PARA ATLETAS DE ALTO RENDIMIENTO
            </p>
          </div>
        </div>

      </section>
    </div>
  );
};

export default Index;
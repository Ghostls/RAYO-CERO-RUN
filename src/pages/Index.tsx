/**
 * RAYO CERO — HOME CORE MODULE (STABLE V7.9.3 - INTEGRATED HUD EDITION)
 * Senior Dev: MIA (Valkyron Group)
 * CEO: Lualdo Sciscioli
 * Grado: Diseñador / Operativo
 * * EVOLUCIÓN V7.9.3 (ATHLETE AUTH ROUTING FIX):
 * - TERMINAL DE ACCESO: Enrutamiento apuntando estrictamente a "/acceso".
 * - FÍSICA APLICADA: Calibración balística (stiffness: 278, damping: 27) para feedback táctil.
 * - FULL SCALE FLYER INTEGRATION: Consolidación del contenedor ampliado para el flyer de inscripciones.
 * - CONSECUTIVE PRICE MODULE: Inyección limpia y consecutiva del asset 'precio.png'.
 * - REGLA DE ORO RESPETADA: Evolución estructural sin omisiones. Se mantienen patrocinadores, estados y secciones íntegras.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Zap, ShieldCheck, Trophy, ArrowRight, Activity, Crosshair, Map, Smartphone } from "lucide-react";

// Componentes del Ecosistema
import HeroSection from "@/components/HeroSection";
import RacesSection from "@/components/RacesSection";

// Importación de activos gráficos (Logos de Patrocinantes y Flyers)
import logoValkyron from "@/assets/12.png";
import logoWeRun from "@/assets/we-run-logo.png"; 
import flyerInscripciones from "@/assets/flier_inscripciones_abiertas.png"; 
import flyerPrecios from "@/assets/precio.png"; 

// Mapeo dinámico secuencial para los 22 patrocinadores externos (Sponsor 1 al 22)
import logo1 from "@/assets/1.png"; import logo2 from "@/assets/2.png"; import logo3 from "@/assets/3.png"; 
import logo4 from "@/assets/4.png"; import logo5 from "@/assets/5.png"; import logo6 from "@/assets/6.png"; 
import logo7 from "@/assets/7.png"; import logo8 from "@/assets/8.png"; import logo9 from "@/assets/9.png"; 
import logo10 from "@/assets/10.png"; import logo11 from "@/assets/11.png"; import logo12 from "@/assets/12.png"; 
import logo13 from "@/assets/13.png"; import logo14 from "@/assets/14.png"; import logo15 from "@/assets/15.png"; 
import logo16 from "@/assets/16.png"; import logo17 from "@/assets/17.png"; import logo18 from "@/assets/18.png"; 
import logo19 from "@/assets/19.png"; import logo20 from "@/assets/20.png"; import logo21 from "@/assets/21.png"; 
import logo22 from "@/assets/22.png";

const sponsorsList = [
  logo1, logo2, logo3, logo4, logo5, logo6, logo7, logo8, logo9, logo10,
  logo11, logo12, logo13, logo14, logo15, logo16, logo17, logo18, logo19, logo20, logo21, logo22
];

// Duplicamos el array para asegurar una transición cinemática fluida sin cortes visuales en el bucle
const infiniteSponsors = [...sponsorsList, ...sponsorsList];

const Index = () => {
  // Estado para controlar la pausa inercial del carrusel por interacción del usuario
  const [isPaused, setIsPaused] = useState(false);

  return (
    // Sincronización estricta con el fondo Obsidian Naval del resto del ecosistema
    <div className="relative min-h-screen bg-[#03070b] flex flex-col overflow-x-hidden font-sans text-white z-0">
      
      {/* ─── EFECTO AURORA BOREAL (ULTRA SUTIL - POLAR LIGHT CORRECTION) ─── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {/* Nodo Norte - Polar Light Cyan (#50E8E3) */}
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
          className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-[#50E8E3]/5 blur-[150px] rounded-full mix-blend-screen"
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

      {/* ─── MÓDULO VISUAL SCALE: INYECCIÓN CINEMÁTICA DE FLYERS ─── */}
      <section className="relative w-full overflow-hidden flex flex-col justify-center items-center py-10 md:py-16 gap-10 md:gap-16 z-10 bg-gradient-to-b from-transparent via-[#050b14] to-transparent">
        
        {/* Contenedor 01: Flyer de Inscripciones Ampliado (Tamaño de Página) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-7xl px-4 sm:px-6 lg:px-8 relative"
        >
          <img
            src={flyerInscripciones}
            alt="Inscripciones Abiertas - Rayocero"
            className="w-full h-auto object-contain drop-shadow-[0_0_35px_rgba(80,232,227,0.18)] rounded-2xl"
          />
        </motion.div>

        {/* Contenedor 02: Flyer de Precios Simétrico (Consecutivo justo debajo) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="w-full max-w-7xl px-4 sm:px-6 lg:px-8 relative"
        >
          <img
            src={flyerPrecios}
            alt="Costos e Inscripción - Rayocero"
            className="w-full h-auto object-contain drop-shadow-[0_0_35px_rgba(80,232,227,0.18)] rounded-2xl"
          />
        </motion.div>

      </section>
      {/* ─────────────────────────────────────────────────────────────────────── */}

      {/* ─── BRANDING / SPONSORS INFINITE CAROUSEL (POLAR LIGHT ENGINE) ─── */}
      <div className="w-full border-y border-white/5 bg-white/[0.01] py-12 relative z-10 overflow-hidden">
        <div className="w-full max-w-7xl mx-auto px-6">
          
          {/* Módulo de Co-Organización de Marcas */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 mb-12 pb-8 border-b border-white/5">
            <div className="flex flex-col items-center gap-3">
              <span className="text-[8px] font-bold text-white/30 tracking-[0.3em] uppercase">Presentadores Oficiales</span>
              <img 
                src={logoWeRun} 
                alt="We Run Night Fest 10K" 
                className="h-16 md:h-24 w-auto object-contain filter drop-shadow-[0_0_15px_rgba(80,232,227,0.25)]" 
              />
            </div>
            <div className="h-[1px] w-12 md:h-12 md:w-[1px] bg-white/10" />
            <div className="flex flex-col items-center gap-3">
              <span className="text-[8px] font-bold text-white/30 tracking-[0.3em] uppercase">Ingeniería del Ecosistema</span>
              <img 
                src={logoValkyron} 
                alt="Valkyron Group" 
                className="h-10 md:h-14 w-auto object-contain opacity-80 hover:opacity-100 transition-opacity duration-300" 
              />
            </div>
          </div>

          <p className="text-center text-[9px] font-black uppercase tracking-[0.4em] text-white/30 mb-8">
            Partners Operativos & Patrocinantes Oficiales
          </p>
          
          {/* Contenedor de Máscara Desvanecida Táctica en los Bordes */}
          <div className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_15%,white_85%,transparent)]">
            <motion.div 
              className="flex gap-16 md:gap-24 w-max px-8 cursor-pointer"
              animate={isPaused ? {} : { x: [0, "-50%"] }}
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
              transition={{
                ease: "linear",
                duration: 65, 
                repeat: Infinity,
              }}
            >
              {infiniteSponsors.map((src, index) => (
                <div 
                  key={index} 
                  className="h-10 md:h-14 w-32 md:w-40 flex items-center justify-center shrink-0 opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500 hover:scale-105"
                >
                  <img 
                    src={src} 
                    alt={`Sponsor Oficial ${(index % 21) + 1}`} 
                    className="max-h-full max-w-full object-contain drop-shadow-md" 
                  />
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
      {/* ───────────────────────────────────────────────────────────────────────────── */}

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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#50E8E3]/10 border border-[#50E8E3]/20 mb-6">
              <Activity className="h-3 w-3 text-[#50E8E3]" />
              <span className="text-[8px] font-black tracking-[0.3em] text-[#50E8E3] uppercase">Filosofía Rayocero</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-black italic tracking-tighter uppercase leading-[0.9]">
              REDEFINIENDO <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#50E8E3] to-white">EL LÍMITE.</span>
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
            <div className="bg-[#03070b]/60 border border-white/5 p-8 rounded-[2rem] backdrop-blur-2xl hover:border-[#50E8E3]/30 transition-colors shadow-2xl">
               <Crosshair className="h-6 w-6 text-[#50E8E3] mb-6" />
               <h4 className="text-3xl font-black italic tracking-tighter mb-2">UHF RFID</h4>
               <p className="text-[10px] font-bold text-white/40 tracking-widest uppercase">Cronometraje de Precisión</p>
            </div>
            <div className="bg-[#03070b]/60 border border-white/5 p-8 rounded-[2rem] backdrop-blur-2xl hover:border-[#50E8E3]/30 transition-colors shadow-2xl">
               <Zap className="h-6 w-6 text-[#50E8E3] mb-6" />
               <h4 className="text-3xl font-black italic tracking-tighter mb-2">LIVE DATA</h4>
               <p className="text-[10px] font-bold text-white/40 tracking-widest uppercase">Resultados en Tiempo Real</p>
            </div>
            <div className="bg-[#03070b]/60 border border-white/5 p-8 rounded-[2rem] backdrop-blur-2xl hover:border-[#50E8E3]/30 transition-colors sm:col-span-2 shadow-2xl">
               <Map className="h-6 w-6 text-[#50E8E3] mb-6" />
               <h4 className="text-3xl font-black italic tracking-tighter mb-2">RUTAS CERTIFICADAS</h4>
               <p className="text-[10px] font-bold text-white/40 tracking-widest uppercase max-w-xs">Circuitos blindados con seguridad operativa, hidratación estratégica y puntos de control.</p>
            </div>
          </motion.div>

        </div>
      </section>

      {/* 4. TERMINALES DE ACCESO (Paneles Avanzados) */}
      <section className="py-24 px-6 max-w-5xl mx-auto w-full relative z-10">
        
        <div className="text-center mb-16">
          <p className="text-[10px] font-black tracking-[0.5em] text-[#50E8E3] uppercase mb-4">
            Gestión Operativa
          </p>
          <h2 className="text-4xl md:text-5xl font-black italic text-white tracking-tighter uppercase drop-shadow-2xl">
            PANELES DE <span className="text-white/30">ACCESO</span>
          </h2>
        </div>

        <div className="flex flex-col gap-6">
          
          {/* Panel 01: Acceso Mini APK / Autenticación de Runners */}
          <Link to="/acceso" className="group">
            <motion.div 
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
              transition={{ type: "spring", stiffness: 278, damping: 27, mass: 1 }}
              className="w-full bg-[#03070b]/60 border border-[#50E8E3]/30 rounded-[2.5rem] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-3xl hover:bg-[#50E8E3]/5 hover:border-[#50E8E3]/60 transition-all duration-500 shadow-[0_0_40px_rgba(80,232,227,0.15)] relative overflow-hidden"
            >
              {/* Overlay táctico escáner */}
              <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(80,232,227,0.03)_50%)] bg-[length:100%_4px] pointer-events-none" />
              
              <div className="flex items-center gap-6 md:gap-8 w-full md:w-auto text-center md:text-left relative z-10">
                <div className="p-5 bg-[#50E8E3]/10 border border-[#50E8E3]/30 rounded-2xl group-hover:bg-[#50E8E3] group-hover:text-black transition-colors duration-500 shrink-0 mx-auto md:mx-0 shadow-[0_0_15px_rgba(80,232,227,0.2)]">
                  <Smartphone className="h-8 w-8 text-[#50E8E3] group-hover:text-black" />
                </div>
                <div>
                  <h3 className="text-2xl md:text-3xl font-black italic text-[#50E8E3] tracking-tighter mb-2">
                    LOGIN MINI APK
                  </h3>
                  <p className="text-[10px] font-bold text-[#50E8E3]/60 uppercase tracking-widest">
                    Acceso encriptado para runners y telemetría de carrera.
                  </p>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-[#50E8E3]/10 border border-[#50E8E3]/30 flex items-center justify-center group-hover:bg-[#50E8E3] group-hover:text-black transition-colors duration-500 shrink-0 relative z-10">
                <ArrowRight className="h-5 w-5 text-[#50E8E3] group-hover:text-black" />
              </div>
            </motion.div>
          </Link>

          {/* Panel 02: Inscripción */}
          <Link to="/registro" className="group">
            <motion.div 
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full bg-[#03070b]/60 border border-white/5 rounded-[2.5rem] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-3xl hover:bg-[#50E8E3]/5 hover:border-[#50E8E3]/30 transition-all duration-500 shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
            >
              <div className="flex items-center gap-6 md:gap-8 w-full md:w-auto text-center md:text-left">
                <div className="p-5 bg-white/[0.03] border border-white/10 rounded-2xl group-hover:bg-[#50E8E3] group-hover:text-black transition-colors duration-500 shrink-0 mx-auto md:mx-0">
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
              <div className="h-12 w-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-[#50E8E3] group-hover:text-black transition-colors duration-500 shrink-0">
                <ArrowRight className="h-5 w-5" />
              </div>
            </motion.div>
          </Link>

          {/* Panel 03: Resultados */}
          <Link to="/resultados" className="group">
            <motion.div 
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full bg-[#03070b]/60 border border-white/5 rounded-[2.5rem] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-3xl hover:bg-[#50E8E3]/5 hover:border-[#50E8E3]/30 transition-all duration-500 shadow-[0_20px_40px_rgba(0,0,0,0.4)]"
            >
              <div className="flex items-center gap-6 md:gap-8 w-full md:w-auto text-center md:text-left">
                <div className="p-5 bg-white/[0.03] border border-white/10 rounded-2xl group-hover:bg-[#50E8E3] group-hover:text-black transition-colors duration-500 shrink-0 mx-auto md:mx-0">
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
              <div className="h-12 w-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-[#50E8E3] group-hover:text-black transition-colors duration-500 shrink-0">
                <ArrowRight className="h-5 w-5" />
              </div>
            </motion.div>
          </Link>

        </div>
      </section>
    </div>
  );
};

export default Index;
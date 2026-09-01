/**
 * RAYOCERO — HOME CORE MODULE (V9.1 - FIX AURORA DUPLICATE STYLE)
 * Senior Dev: MIA (Valkyron Group)
 * CEO: Lualdo Sciscioli
 * REGLA DE ORO: Evolución sin Destrucción. Código completo. Copy-paste ready.
 *
 * CHANGELOG V9.1 (evoluciona sobre V9.0):
 * [V9.1-1] FIX TS-17001: Aurora blobs 1 y 2 tenían dos props `style`
 *          duplicadas — fusionadas en un único objeto style por blob
 * [V9.1-2] Todo lo demás de V9.0 preservado íntegramente
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Zap, ShieldCheck, Trophy, ArrowRight,
  Activity, Crosshair, Map, Smartphone,
} from "lucide-react";

import HeroSection  from "@/components/HeroSection";
import RacesSection from "@/components/RacesSection";
import VenezuelaMap from "@/components/VenezuelaMap";

import logoRayo     from "@/assets/logorayo.png";
import logoValkyron from "@/assets/12.png";

import logo1  from "@/assets/1.png";  import logo2  from "@/assets/2.png";
import logo3  from "@/assets/3.png";  import logo4  from "@/assets/4.png";
import logo5  from "@/assets/5.png";  import logo6  from "@/assets/6.png";
import logo7  from "@/assets/7.png";  import logo8  from "@/assets/8.png";
import logo9  from "@/assets/9.png";  import logo10 from "@/assets/10.png";
import logo11 from "@/assets/11.png"; import logo12 from "@/assets/12.png";
import logo13 from "@/assets/13.png"; import logo14 from "@/assets/14.png";
import logo15 from "@/assets/15.png"; import logo16 from "@/assets/16.png";
import logo17 from "@/assets/17.png"; import logo18 from "@/assets/18.png";
import logo19 from "@/assets/19.png"; import logo20 from "@/assets/20.png";
import logo21 from "@/assets/21.png"; import logo22 from "@/assets/22.png";

// ─── PALETA LED UNIFICADA ─────────────────────────────────────────────────────
const LED_CYAN    = "#00f2ff";
const LED_ORANGE  = "#ff6b00";
const LED_MAGENTA = "#ff00c8";
const LED_GREEN   = "#00ff9d";
const BG_DEEP     = "#020608";

const sponsorsList     = [logo1,logo2,logo3,logo4,logo5,logo6,logo7,logo8,logo9,logo10,logo11,logo12,logo13,logo14,logo15,logo16,logo17,logo18,logo19,logo20,logo21,logo22];
const infiniteSponsors = [...sponsorsList, ...sponsorsList];

// ─── SEPARADOR DE SECCIÓN ─────────────────────────────────────────────────────
const SectionDivider = ({ flip = false }: { flip?: boolean }) => (
  <div className="relative w-full pointer-events-none" style={{ height: "2px", overflow: "visible" }}>
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: flip
          ? `linear-gradient(90deg, transparent 0%, ${LED_MAGENTA}40 25%, ${LED_CYAN}60 50%, ${LED_ORANGE}40 75%, transparent 100%)`
          : `linear-gradient(90deg, transparent 0%, ${LED_CYAN}40 25%, ${LED_GREEN}50 50%, ${LED_MAGENTA}40 75%, transparent 100%)`,
      }}
    />
    <div
      style={{
        position: "absolute",
        inset: "-4px 10% -4px 10%",
        background: flip
          ? `linear-gradient(90deg, transparent, ${LED_MAGENTA}18, ${LED_CYAN}25, transparent)`
          : `linear-gradient(90deg, transparent, ${LED_CYAN}20, ${LED_GREEN}18, transparent)`,
        filter: "blur(6px)",
      }}
    />
  </div>
);

// ─── INDEX ────────────────────────────────────────────────────────────────────
const Index = () => {
  const [isPaused, setIsPaused] = useState(false);

  return (
    <div
      className="relative min-h-screen flex flex-col overflow-x-hidden font-sans text-white z-0"
      style={{ background: BG_DEEP }}
    >

      {/* ─── AURORA BOREAL [V9.1-1 FIX] ─── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">

        {/* Blob 1 — cyan, top-left */}
        <motion.div
          animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[10%] -left-[10%] w-[60%] h-[50%] rounded-full mix-blend-screen"
          style={{
            background: `${LED_CYAN}08`,
            filter: "blur(120px)",
            willChange: "transform",
            transform: "translateZ(0)",
          }}
        />

        {/* Blob 2 — magenta, right */}
        <motion.div
          animate={{ x: [0, -50, 0], y: [0, -30, 0] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute top-[40%] -right-[10%] w-[70%] h-[60%] rounded-full mix-blend-screen"
          style={{
            background: `${LED_MAGENTA}06`,
            filter: "blur(140px)",
            willChange: "transform",
            transform: "translateZ(0)",
          }}
        />

        {/* Blob 3 — naranja, bottom-left */}
        <motion.div
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[20%] left-[20%] w-[40%] h-[30%] rounded-full mix-blend-screen"
          style={{
            background: `${LED_ORANGE}05`,
            filter: "blur(100px)",
            willChange: "transform",
            transform: "translateZ(0)",
          }}
        />
      </div>

      {/* ══════════════════════════════════════════
          1. HERO
      ══════════════════════════════════════════ */}
      <HeroSection />

      {/* ══════════════════════════════════════════
          2. SPONSORS
      ══════════════════════════════════════════ */}
      <SectionDivider />

      <div
        className="w-full py-14 relative z-10 overflow-hidden"
        style={{
          background: `linear-gradient(180deg, ${BG_DEEP} 0%, #010407 50%, ${BG_DEEP} 100%)`,
        }}
      >
        <div className="w-full max-w-7xl mx-auto px-6">

          {/* Presentadores y ecosistema */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="flex flex-col md:flex-row items-center justify-center gap-10 md:gap-20 mb-12 pb-10"
            style={{ borderBottom: `1px solid rgba(0,242,255,0.08)` }}
          >
            {/* Presentadores Oficiales — logoRayo */}
            <div className="flex flex-col items-center gap-3">
              <span
                className="text-[8px] font-black tracking-[0.4em] uppercase"
                style={{ color: `${LED_CYAN}66` }}
              >
                Presentadores Oficiales
              </span>
              <img
                src={logoRayo}
                alt="RAYOCERO"
                loading="lazy"
                decoding="async"
                className="h-14 md:h-20 w-auto object-contain"
                style={{ filter: `drop-shadow(0 0 20px ${LED_CYAN}30)` }}
              />
            </div>

            {/* Separador */}
            <div
              className="h-[1px] w-10 md:h-10 md:w-[1px]"
              style={{ background: `linear-gradient(to bottom, transparent, ${LED_CYAN}40, transparent)` }}
            />

            {/* Ingeniería del Ecosistema — Valkyron */}
            <div className="flex flex-col items-center gap-3">
              <span
                className="text-[8px] font-black tracking-[0.4em] uppercase"
                style={{ color: "rgba(255,255,255,0.25)" }}
              >
                Ingeniería del Ecosistema
              </span>
              <img
                src={logoValkyron}
                alt="Valkyron Group"
                loading="lazy"
                decoding="async"
                className="h-9 md:h-12 w-auto object-contain"
                style={{ opacity: 0.65 }}
              />
            </div>
          </motion.div>

          {/* Label partners */}
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center text-[9px] font-black uppercase tracking-[0.45em] mb-8"
            style={{ color: "rgba(255,255,255,0.22)" }}
          >
            Partners Operativos &amp; Patrocinantes Oficiales
          </motion.p>

          {/* Carrusel de logos */}
          <div
            className="relative w-full overflow-hidden"
            style={{
              maskImage: "linear-gradient(to right, transparent, white 12%, white 88%, transparent)",
              WebkitMaskImage: "linear-gradient(to right, transparent, white 12%, white 88%, transparent)",
            }}
          >
            <motion.div
              className="flex gap-14 md:gap-20 w-max px-8 cursor-pointer"
              animate={isPaused ? {} : { x: [0, "-50%"] }}
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
              transition={{ ease: "linear", duration: 65, repeat: Infinity }}
              style={{ willChange: "transform", transform: "translateZ(0)" }}
            >
              {infiniteSponsors.map((src, index) => (
                <div
                  key={index}
                  className="h-10 md:h-14 w-28 md:w-36 flex items-center justify-center shrink-0 transition-all duration-500"
                  style={{ opacity: 0.35, filter: "grayscale(1)" }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.opacity = "1";
                    (e.currentTarget as HTMLDivElement).style.filter = "grayscale(0)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.opacity = "0.35";
                    (e.currentTarget as HTMLDivElement).style.filter = "grayscale(1)";
                  }}
                >
                  <img
                    src={src} alt="Sponsor Oficial"
                    loading="lazy" decoding="async"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>

      <SectionDivider flip />

      {/* ══════════════════════════════════════════
          3. MÓDULO DE CARRERAS
      ══════════════════════════════════════════ */}
      <div className="relative z-10">
        <RacesSection />
      </div>

      <SectionDivider />

      {/* ══════════════════════════════════════════
          4. MAPA DE MISIONES
      ══════════════════════════════════════════ */}
      <div className="relative z-10">
        <VenezuelaMap />
      </div>

      <SectionDivider flip />

      {/* ══════════════════════════════════════════
          5. MANIFIESTO Y MÉTRICAS
      ══════════════════════════════════════════ */}
      <section className="py-24 px-6 max-w-7xl mx-auto w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Texto manifiesto */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "50px" }}
            transition={{ duration: 0.6 }}
          >
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
              style={{
                background: `${LED_CYAN}12`,
                border: `1px solid ${LED_CYAN}28`,
              }}
            >
              <Activity className="h-3 w-3" style={{ color: LED_CYAN }} />
              <span
                className="text-[8px] font-black tracking-[0.3em] uppercase"
                style={{ color: LED_CYAN }}
              >
                Filosofía Rayocero
              </span>
            </div>

            <h2 className="text-5xl md:text-6xl font-black italic tracking-tighter uppercase leading-[0.9]">
              REDEFINIENDO <br />
              <span
                className="text-transparent bg-clip-text"
                style={{
                  backgroundImage: `linear-gradient(105deg, ${LED_CYAN} 0%, ${LED_GREEN} 50%, #fff 100%)`,
                }}
              >
                EL LÍMITE.
              </span>
            </h2>

            <p
              className="mt-8 text-sm leading-relaxed font-medium max-w-md"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              No organizamos simples carreras, orquestamos operaciones de alto rendimiento.
              Desde el trazado de la ruta hasta la telemetría en tiempo real, cada milímetro
              está diseñado con precisión militar.
            </p>

            <div
              className="mt-10 h-[1px] max-w-xs"
              style={{ background: `linear-gradient(90deg, ${LED_CYAN}50, transparent)` }}
            />
          </motion.div>

          {/* Cards métricas */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "50px" }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            {/* UHF RFID */}
            <div
              className="p-8 rounded-[2rem] backdrop-blur-xl transition-all duration-500"
              style={{
                background: `${BG_DEEP}99`,
                border: "1px solid rgba(255,255,255,0.06)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.border = `1px solid ${LED_CYAN}35`;
                (e.currentTarget as HTMLDivElement).style.boxShadow = `0 20px 60px rgba(0,0,0,0.4), 0 0 30px ${LED_CYAN}12`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.border = "1px solid rgba(255,255,255,0.06)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "0 20px 60px rgba(0,0,0,0.4)";
              }}
            >
              <Crosshair className="h-6 w-6 mb-6" style={{ color: LED_CYAN }} />
              <h4 className="text-3xl font-black italic tracking-tighter mb-2">UHF RFID</h4>
              <p className="text-[10px] font-bold tracking-widest uppercase"
                style={{ color: "rgba(255,255,255,0.35)" }}>
                Cronometraje de Precisión
              </p>
            </div>

            {/* LIVE DATA */}
            <div
              className="p-8 rounded-[2rem] backdrop-blur-xl transition-all duration-500"
              style={{
                background: `${BG_DEEP}99`,
                border: "1px solid rgba(255,255,255,0.06)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.border = `1px solid ${LED_ORANGE}35`;
                (e.currentTarget as HTMLDivElement).style.boxShadow = `0 20px 60px rgba(0,0,0,0.4), 0 0 30px ${LED_ORANGE}12`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.border = "1px solid rgba(255,255,255,0.06)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "0 20px 60px rgba(0,0,0,0.4)";
              }}
            >
              <Zap className="h-6 w-6 mb-6" style={{ color: LED_ORANGE }} />
              <h4 className="text-3xl font-black italic tracking-tighter mb-2">LIVE DATA</h4>
              <p className="text-[10px] font-bold tracking-widest uppercase"
                style={{ color: "rgba(255,255,255,0.35)" }}>
                Resultados en Tiempo Real
              </p>
            </div>

            {/* RUTAS CERTIFICADAS */}
            <div
              className="p-8 rounded-[2rem] backdrop-blur-xl sm:col-span-2 transition-all duration-500"
              style={{
                background: `${BG_DEEP}99`,
                border: "1px solid rgba(255,255,255,0.06)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.border = `1px solid ${LED_MAGENTA}30`;
                (e.currentTarget as HTMLDivElement).style.boxShadow = `0 20px 60px rgba(0,0,0,0.4), 0 0 30px ${LED_MAGENTA}10`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.border = "1px solid rgba(255,255,255,0.06)";
                (e.currentTarget as HTMLDivElement).style.boxShadow = "0 20px 60px rgba(0,0,0,0.4)";
              }}
            >
              <Map className="h-6 w-6 mb-6" style={{ color: LED_MAGENTA }} />
              <h4 className="text-3xl font-black italic tracking-tighter mb-2">RUTAS CERTIFICADAS</h4>
              <p className="text-[10px] font-bold tracking-widest uppercase max-w-xs"
                style={{ color: "rgba(255,255,255,0.35)" }}>
                Circuitos blindados con seguridad operativa e hidratación.
              </p>
            </div>
          </motion.div>

        </div>
      </section>

      <SectionDivider />

      {/* ══════════════════════════════════════════
          6. TERMINALES DE ACCESO
      ══════════════════════════════════════════ */}
      <section className="py-24 px-6 max-w-5xl mx-auto w-full relative z-10">

        <div className="text-center mb-16">
          <p
            className="text-[10px] font-black tracking-[0.5em] uppercase mb-4"
            style={{ color: LED_CYAN }}
          >
            Gestión Operativa
          </p>
          <h2 className="text-4xl md:text-5xl font-black italic text-white tracking-tighter uppercase">
            PANELES DE{" "}
            <span style={{ color: "rgba(255,255,255,0.22)" }}>ACCESO</span>
          </h2>
          <div
            className="mx-auto mt-5 h-[1px] w-24"
            style={{ background: `linear-gradient(90deg, transparent, ${LED_CYAN}50, transparent)` }}
          />
        </div>

        <div className="flex flex-col gap-5">

          {/* Terminal 1 — LOGIN MINI APK */}
          <Link to="/acceso" className="group">
            <motion.div
              whileHover={{ scale: 1.012 }}
              whileTap={{ scale: 0.988 }}
              transition={{ type: "spring", stiffness: 278, damping: 27, mass: 1 }}
              className="w-full rounded-[2.5rem] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-3xl relative overflow-hidden transition-all duration-500"
              style={{
                background: `${BG_DEEP}99`,
                border: `1px solid ${LED_CYAN}35`,
                boxShadow: `0 0 40px ${LED_CYAN}12`,
              }}
            >
              {/* Scanlines */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `repeating-linear-gradient(0deg, transparent, transparent 3px, ${LED_CYAN}03 3px, ${LED_CYAN}03 4px)`,
                  borderRadius: "inherit",
                }}
              />
              <div className="flex items-center gap-6 md:gap-8 w-full md:w-auto text-center md:text-left relative z-10">
                <div
                  className="p-5 rounded-2xl shrink-0 mx-auto md:mx-0 transition-all duration-500"
                  style={{
                    background: `${LED_CYAN}14`,
                    border: `1px solid ${LED_CYAN}35`,
                    boxShadow: `0 0 15px ${LED_CYAN}20`,
                  }}
                >
                  <Smartphone className="h-8 w-8" style={{ color: LED_CYAN }} />
                </div>
                <div>
                  <h3
                    className="text-2xl md:text-3xl font-black italic tracking-tighter mb-1.5"
                    style={{ color: LED_CYAN }}
                  >
                    LOGIN MINI APK
                  </h3>
                  <p
                    className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: `${LED_CYAN}55` }}
                  >
                    Acceso encriptado para runners y telemetría de carrera.
                  </p>
                </div>
              </div>
              <div
                className="h-12 w-12 rounded-full flex items-center justify-center shrink-0 relative z-10 transition-all duration-500 group-hover:scale-110"
                style={{ background: `${LED_CYAN}14`, border: `1px solid ${LED_CYAN}35` }}
              >
                <ArrowRight
                  className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1"
                  style={{ color: LED_CYAN }}
                />
              </div>
            </motion.div>
          </Link>

          {/* Terminal 2 — INSCRIPCIÓN */}
          <Link to="/registro" className="group">
            <motion.div
              whileHover={{ scale: 1.008 }}
              whileTap={{ scale: 0.992 }}
              transition={{ type: "spring", stiffness: 278, damping: 27, mass: 1 }}
              className="w-full rounded-[2.5rem] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-3xl transition-all duration-500"
              style={{
                background: `${BG_DEEP}99`,
                border: "1px solid rgba(255,255,255,0.07)",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.border = `1px solid ${LED_CYAN}25`;
                (e.currentTarget as HTMLDivElement).style.background = `${LED_CYAN}06`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.border = "1px solid rgba(255,255,255,0.07)";
                (e.currentTarget as HTMLDivElement).style.background = `${BG_DEEP}99`;
              }}
            >
              <div className="flex items-center gap-6 md:gap-8 w-full md:w-auto text-center md:text-left">
                <div
                  className="p-5 rounded-2xl shrink-0 mx-auto md:mx-0 transition-colors duration-500"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <ShieldCheck className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl md:text-3xl font-black italic text-white tracking-tighter mb-1.5">
                    MÓDULO DE INSCRIPCIÓN
                  </h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: "rgba(255,255,255,0.35)" }}>
                    Portal de registro oficial y validación de atletas.
                  </p>
                </div>
              </div>
              <div
                className="h-12 w-12 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 group-hover:scale-110"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <ArrowRight className="h-5 w-5 text-white transition-transform duration-300 group-hover:translate-x-1" />
              </div>
            </motion.div>
          </Link>

          {/* Terminal 3 — SISTEMA DE TIEMPOS */}
          <Link to="/resultados" className="group">
            <motion.div
              whileHover={{ scale: 1.008 }}
              whileTap={{ scale: 0.992 }}
              transition={{ type: "spring", stiffness: 278, damping: 27, mass: 1 }}
              className="w-full rounded-[2.5rem] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-3xl transition-all duration-500"
              style={{
                background: `${BG_DEEP}99`,
                border: "1px solid rgba(255,255,255,0.07)",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.border = `1px solid ${LED_ORANGE}28`;
                (e.currentTarget as HTMLDivElement).style.background = `${LED_ORANGE}05`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.border = "1px solid rgba(255,255,255,0.07)";
                (e.currentTarget as HTMLDivElement).style.background = `${BG_DEEP}99`;
              }}
            >
              <div className="flex items-center gap-6 md:gap-8 w-full md:w-auto text-center md:text-left">
                <div
                  className="p-5 rounded-2xl shrink-0 mx-auto md:mx-0 transition-colors duration-500"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <Trophy className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl md:text-3xl font-black italic text-white tracking-tighter mb-1.5">
                    SISTEMA DE TIEMPOS
                  </h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: "rgba(255,255,255,0.35)" }}>
                    Cronometraje UHF y ranking en vivo.
                  </p>
                </div>
              </div>
              <div
                className="h-12 w-12 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 group-hover:scale-110"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <ArrowRight className="h-5 w-5 text-white transition-transform duration-300 group-hover:translate-x-1" />
              </div>
            </motion.div>
          </Link>

        </div>
      </section>

      {/* Footer fade */}
      <div
        className="relative z-10 w-full h-24 pointer-events-none"
        style={{ background: `linear-gradient(to bottom, transparent, ${BG_DEEP})` }}
      />

    </div>
  );
};

export default Index;
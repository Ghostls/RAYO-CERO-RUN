/**
 * RAYOCERO — HERO SECTION (V24.2 - MOBILE DATE POSITION FIX)
 * Senior Dev: MIA (Valkyron Group)
 * CEO: Lualdo Sciscioli
 * REGLA DE ORO: Evolución sin Destrucción. Código completo. Copy-paste ready.
 *
 * CHANGELOG V24.2 (evoluciona sobre V24.1):
 * [V24.2-1] FIX CRÍTICO MOBILE: separado centrado CSS del motion value Y
 *           wrapper div estático maneja posición, motion.div interno solo Y
 * [V24.2-2] Posición fecha: bottom:clamp(160px,28vh,240px) — zona azul screenshot
 * [V24.2-3] fontSize: clamp(2.4rem,11vw,4rem) — 11vw×8chars=88vw, cabe con padding
 * [V24.2-4] padding lateral 6vw — nunca toca bordes del viewport
 * [V24.2-5] Desktop: mismo patrón wrapper/motion aplicado — sin cambios visuales
 */

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import { Trophy, ArrowRight, Zap } from "lucide-react";
import { useRef } from "react";


import ledRunHero from "../assets/led-run-hero.png";

import EventCarousel from "./EventCarrousel";

// ─── PALETA LED ───────────────────────────────────────────────────────────────
const LED_ORANGE  = "#ff6b00";
const LED_CYAN    = "#00f2ff";
const LED_GREEN   = "#00ff9d";
const LED_MAGENTA = "#ff00c8";
const BG_DEEP     = "#020608";

// ─── MARQUEE ─────────────────────────────────────────────────────────────────
const MARQUEE_ITEMS = [
  "WE RUN LED", "10K", "CORO · FALCÓN",
  "CARRERA NOCTURNA", "31 DE OCTUBRE",
  "RAYOCERO", "INSCRIPCIONES ABIERTAS",
];

const TacticalMarquee = () => {
  const prefersReducedMotion = useReducedMotion();
  const dotColors = [LED_CYAN, LED_ORANGE, LED_MAGENTA, LED_CYAN, LED_ORANGE, LED_CYAN, LED_MAGENTA];
  const row = (
    <div className="flex shrink-0 items-center">
      {MARQUEE_ITEMS.map((item, i) => (
        <span key={i} className="flex items-center">
          <span
            className="text-[10px] sm:text-[11px] font-black tracking-[0.4em] uppercase whitespace-nowrap"
            style={{ color: "rgba(255,255,255,0.28)" }}
          >
            {item}
          </span>
          <span
            className="mx-5 sm:mx-8 h-1 w-1 rounded-full"
            style={{ background: dotColors[i % dotColors.length] + "60" }}
          />
        </span>
      ))}
    </div>
  );
  return (
    <div
      className="relative z-20 w-full overflow-hidden py-4"
      style={{ borderTop: "1px solid rgba(0,242,255,0.08)" }}
    >
      <motion.div
        className="flex w-max"
        animate={prefersReducedMotion ? {} : { x: ["0%", "-50%"] }}
        transition={{ duration: 32, ease: "linear", repeat: Infinity }}
      >
        {row}{row}
      </motion.div>
    </div>
  );
};

// ─── HEADLINE TIPOGRÁFICO ─────────────────────────────────────────────────────
const EventHeadline = ({ isMobile = false }: { isMobile?: boolean }) => {
  // [V24.2-3] 11vw × 8 chars = 88vw total — cabe con padding 6vw a cada lado
  const sizeFecha = isMobile
    ? "clamp(2.4rem, 11vw, 4rem)"
    : "clamp(5.5rem, 11.5vw, 13rem)";

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        alignItems: isMobile ? "center" : "flex-start",
        justifyContent: isMobile ? "center" : "flex-start",
        overflow: "hidden",
      }}
    >
      <span
        className="font-black leading-none select-none pointer-events-none"
        style={{
          fontSize: sizeFecha,
          letterSpacing: "-0.04em",
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
          background: `linear-gradient(105deg,
            #ffffff        0%,
            ${LED_CYAN}    18%,
            ${LED_GREEN}   38%,
            #ffe600        58%,
            #ff6bcd        78%,
            ${LED_MAGENTA} 100%)`,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          WebkitTextFillColor: "transparent",
          color: "transparent",
          WebkitFontSmoothing: "antialiased",
          filter: `drop-shadow(0 0 ${isMobile ? "14px" : "40px"} rgba(0,242,255,0.18))`,
          maxWidth: "100%",
          display: "block",
        }}
      >
        31.10.26
      </span>
    </div>
  );
};

// ─── HERO SECTION ─────────────────────────────────────────────────────────────
const HeroSection = () => {
  const prefersReducedMotion = useReducedMotion();
  const sectionRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const headlineY  = useTransform(scrollYProgress, [0, 1], ["0%", prefersReducedMotion ? "0%" : "14%"]);
  const heroAssetY = useTransform(scrollYProgress, [0, 1], ["0%", prefersReducedMotion ? "0%" : "8%"]);

  const btnCyanStyle: React.CSSProperties = {
    background: `linear-gradient(105deg, ${LED_CYAN} 0%, ${LED_GREEN} 100%)`,
    color: "#000",
    boxShadow: `0 0 28px ${LED_CYAN}55, 0 0 60px ${LED_CYAN}22, 0 8px 24px rgba(0,0,0,0.45)`,
  };
  const btnCyanHover: React.CSSProperties = {
    background: `linear-gradient(105deg, ${LED_CYAN} 0%, ${LED_GREEN} 100%)`,
    color: "#000",
    boxShadow: `0 0 50px ${LED_CYAN}88, 0 0 100px ${LED_CYAN}33, 0 12px 32px rgba(0,0,0,0.55)`,
  };

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative w-full flex flex-col font-sans"
      style={{ background: BG_DEEP }}
    >
    

      {/* ══════════════════════════════════════════════════════
          ██  MOBILE LAYOUT (< md)  ██
      ══════════════════════════════════════════════════════ */}
      <div
        className="relative z-10 md:hidden w-full"
        style={{ height: "100svh", minHeight: "600px", overflow: "hidden" }}
      >
        {/* Asset hero */}
        <motion.div
          style={{ y: heroAssetY }}
          className="absolute inset-0 z-[1] pointer-events-none select-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <img
            src={ledRunHero}
            alt="WE RUN LED 10K — Carrera Nocturna Coro Falcón"
            draggable={false}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center 15%",
              filter: "brightness(0.52) saturate(1.2)",
            }}
          />
          {/* Fade inferior imagen */}
          <div
            className="absolute inset-x-0 bottom-0"
            style={{
              height: "65%",
              background: `linear-gradient(to top, ${BG_DEEP} 45%, transparent 100%)`,
            }}
          />
        </motion.div>

        {/* [V24.2-1][V24.2-2] Fecha mobile
            Patrón: div estático posiciona, motion.div interno solo mueve Y */}
        <div
          className="absolute z-[2] pointer-events-none"
          style={{
            bottom: "clamp(160px, 28vh, 240px)",
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "0 6vw",
          }}
        >
          <motion.div
            style={{ y: headlineY, width: "100%" }}
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          >
            <EventHeadline isMobile={true} />
          </motion.div>
        </div>

        {/* Fade oscuro inferior */}
        <div
          className="absolute inset-x-0 bottom-0 z-[3] pointer-events-none"
          style={{
            height: "38%",
            background: `linear-gradient(to top, ${BG_DEEP} 55%, transparent 100%)`,
          }}
        />

        {/* Botones mobile */}
        <motion.div
          initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.85 }}
          className="absolute inset-x-0 bottom-6 z-[5] flex flex-col gap-3 px-5"
        >
          <Link to="/registro" className="w-full">
            <button
              className="w-full py-4 rounded-[1.25rem] font-black text-[10px] tracking-[0.2em] uppercase transition-all duration-300 flex items-center justify-center gap-3 active:scale-95 group"
              style={btnCyanStyle}
            >
              <Zap className="h-4 w-4 flex-shrink-0" />
              INSCRIBIRSE AHORA
              <ArrowRight className="h-4 w-4 flex-shrink-0 transition-transform group-hover:translate-x-1" />
            </button>
          </Link>
          <Link to="/resultados" className="w-full">
            <button
              className="w-full py-4 rounded-[1.25rem] font-black text-[10px] tracking-[0.2em] uppercase backdrop-blur-xl transition-all duration-300 flex items-center justify-center gap-3 active:scale-95 group"
              style={{
                background: `${BG_DEEP}CC`,
                border: `1px solid ${LED_CYAN}30`,
                color: "rgba(255,255,255,0.85)",
                boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
              }}
            >
              <Trophy className="h-4 w-4 flex-shrink-0" style={{ color: `${LED_CYAN}99` }} />
              VER RESULTADOS
            </button>
          </Link>
        </motion.div>
      </div>

      {/* ══════════════════════════════════════════════════════
          ██  DESKTOP LAYOUT (md+)  ██
      ══════════════════════════════════════════════════════ */}
      <div
        className="relative w-full hidden md:block"
        style={{ height: "100svh", minHeight: "640px", overflow: "hidden" }}
      >
        {/* PLANO 1: Asset hero */}
        <motion.div
          style={{ y: heroAssetY }}
          className="absolute inset-0 z-[1] pointer-events-none select-none"
          initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <img
            src={ledRunHero}
            alt="WE RUN LED 10K — Carrera Nocturna Coro Falcón"
            draggable={false}
            style={{
              width: "100%",
              height: "115%",
              objectFit: "cover",
              objectPosition: "center 18%",
              filter: "brightness(0.42) saturate(1.3) contrast(1.05)",
              transform: "translateZ(0)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(90deg,
                ${BG_DEEP}EE 0%,
                transparent   30%,
                transparent   70%,
                ${BG_DEEP}EE 100%)`,
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg,
                ${BG_DEEP}CC 0%,
                transparent   20%,
                transparent   65%,
                ${BG_DEEP}DD 85%,
                ${BG_DEEP}   100%)`,
            }}
          />
        </motion.div>

        {/* PLANO 2: línea de acento cyan */}
        <div
          className="absolute z-[2] pointer-events-none"
          style={{
            bottom: "clamp(90px, 14vh, 140px)",
            left: "clamp(40px, 8vw, 120px)",
            right: "clamp(40px, 8vw, 120px)",
            height: "1px",
            background: `linear-gradient(90deg, transparent, ${LED_CYAN}40, transparent)`,
          }}
        />

        {/* PLANO 3: Fecha desktop
            [V24.2-5] mismo patrón wrapper/motion — div estático + motion solo Y */}
        <div
          className="absolute z-[3] pointer-events-none"
          style={{
            left: "clamp(40px, 8vw, 120px)",
            bottom: "clamp(120px, 18vh, 220px)",
          }}
        >
          <motion.div
            style={{ y: headlineY }}
            initial={{ opacity: 0, x: prefersReducedMotion ? 0 : -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          >
            <EventHeadline isMobile={false} />
          </motion.div>
        </div>

        {/* Marca vertical lg+ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.4 }}
          className="absolute left-4 lg:left-6 bottom-24 z-[4] hidden lg:flex items-center"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          <span
            className="text-[9px] font-black tracking-[0.5em] uppercase"
            style={{ color: "rgba(255,255,255,0.22)" }}
          >
            Coro · 10K · 31 Oct · Falcón · Venezuela
          </span>
        </motion.div>

        {/* Botonera desktop */}
        <div className="absolute inset-x-0 bottom-8 lg:bottom-10 z-[5] flex justify-start px-[clamp(40px,8vw,120px)]">
          <motion.div
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 1.0 }}
            className="flex flex-row gap-4 items-center"
          >
            <Link to="/registro">
              <button
                className="py-4 lg:py-5 rounded-[1.25rem] font-black text-[10px] tracking-[0.2em] uppercase transition-all duration-300 flex items-center justify-center gap-3 hover:-translate-y-1 active:scale-95 group"
                style={{ width: "clamp(220px, 20vw, 280px)", ...btnCyanStyle }}
                onMouseEnter={e => Object.assign((e.currentTarget as HTMLButtonElement).style, btnCyanHover)}
                onMouseLeave={e => Object.assign((e.currentTarget as HTMLButtonElement).style, btnCyanStyle)}
              >
                <Zap className="h-4 w-4 flex-shrink-0" />
                INSCRIBIRSE AHORA
                <ArrowRight className="h-4 w-4 flex-shrink-0 transition-transform group-hover:translate-x-1" />
              </button>
            </Link>
            <Link to="/resultados">
              <button
                className="py-4 lg:py-5 rounded-[1.25rem] font-black text-[10px] tracking-[0.2em] uppercase backdrop-blur-xl transition-all duration-300 flex items-center justify-center gap-3 hover:-translate-y-1 active:scale-95 group"
                style={{
                  width: "clamp(220px, 20vw, 280px)",
                  background: `${BG_DEEP}80`,
                  border: `1px solid ${LED_CYAN}30`,
                  color: "rgba(255,255,255,0.80)",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.border = `1px solid ${LED_CYAN}60`;
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 20px ${LED_CYAN}20, 0 12px 32px rgba(0,0,0,0.5)`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.border = `1px solid ${LED_CYAN}30`;
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 10px 30px rgba(0,0,0,0.4)";
                }}
              >
                <Trophy className="h-4 w-4 flex-shrink-0" style={{ color: `${LED_CYAN}70` }} />
                VER RESULTADOS
              </button>
            </Link>
          </motion.div>
        </div>
      </div>

      {/* ─── INDICADOR DE SCROLL (md+) ─── */}
      <motion.div
        className="relative z-20 mb-6 hidden md:flex flex-col items-center gap-3 opacity-40 hover:opacity-100 transition-opacity cursor-pointer"
        animate={prefersReducedMotion ? {} : { y: [0, 8, 0] }}
        transition={{ duration: 2, ease: "easeInOut", repeat: Infinity }}
        onClick={() => window.scrollTo({ top: window.innerHeight, behavior: "smooth" })}
      >
        <span
          className="text-[8px] font-black tracking-[0.5em] uppercase"
          style={{ color: LED_CYAN }}
        >
          Explorar
        </span>
        <div
          className="w-[1px] h-12"
          style={{ background: `linear-gradient(to bottom, ${LED_CYAN}, transparent)` }}
        />
      </motion.div>

      {/* ─── MARQUEE ─── */}
      <TacticalMarquee />

      {/* ─── BRIDGE → CAROUSEL ─── */}
      <div
        className="relative z-20 w-full pointer-events-none"
        style={{ height: "80px", marginBottom: "-1px", background: BG_DEEP }}
      />

      {/* ─── CAROUSEL ─── */}
      <div className="relative z-10">
        <EventCarousel />
      </div>

      {/* ─── TEXTURA TÁCTICA ─── */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none mix-blend-screen z-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </section>
  );
};

export default HeroSection;
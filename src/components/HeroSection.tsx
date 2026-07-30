/**
 * RAYOCERO — HERO SECTION (V19.0 - DUAL RUNNER DEPTH SANDWICH)
 * Senior Dev: MIA (Valkyron Group)
 * CEO: Lualdo Sciscioli
 * REGLA DE ORO: Evolución sin Destrucción. Código completo. Copy-paste ready.
 *
 * CHANGELOG V19.0:
 * [V19-1] DEPTH SANDWICH: corredor izquierdo (z-[3]) DELANTE del 499,
 *         corredor derecho (z-[1]) DETRÁS del 499 → ilusión 3D real
 * [V19-2] El 499 ocupa z-[2] como plano intermedio entre ambos runners
 * [V19-3] Runner izquierdo: flip horizontal, entra desde -60px, ancla bottom-left
 * [V19-4] Runner derecho: normal, entra desde +60px, ancla bottom-right
 * [V19-5] MOBILE: mismo sandwich comprimido, runners a 45vw de alto
 * [V19-6] PARALLAX diferenciado: runner izq más rápido (cerca), runner der
 *         más lento (lejos), 499 en medio — refuerza profundidad
 * [V19-7] Todo lo demás de V18 preservado (marquee, carousel, scroll indicator)
 *
 * ASSETS REQUERIDOS:
 *   runner-hero.png  →  src/assets/runner-hero.png  (PNG transparente, mismo que V18)
 *   fondobg.png      →  src/assets/fondobg.png
 *
 * NOTA: Si tienes un segundo PNG de corredor (diferente pose), cámbialo en
 *   runnerRight import. Si no, ambos usan runner-hero.png con scaleX(-1) y normal.
 */

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import { Trophy, ArrowRight } from "lucide-react";
import { useRef } from "react";

import fondoBg from "../assets/fondobg.png";
import runnerHero  from "../assets/499_AZUL_CORREDOR_2.png";   // corredor — izquierda, delante
import runnerRight from "../assets/499_AZUL_CORREDORA.png";    // corredora — derecha, detrás

import EventCarousel from "./EventCarrousel";

// ─── MARQUEE ─────────────────────────────────────────────────────────────────
const MARQUEE_ITEMS = ["499 RUN", "CORO", "FALCÓN", "10K", "RAYOCERO", "INSCRIPCIONES ABIERTAS"];

const TacticalMarquee = () => {
  const prefersReducedMotion = useReducedMotion();
  const row = (
    <div className="flex shrink-0 items-center">
      {MARQUEE_ITEMS.map((item, i) => (
        <span key={i} className="flex items-center">
          <span className="text-[10px] sm:text-[11px] font-black tracking-[0.4em] uppercase text-white/30 whitespace-nowrap">
            {item}
          </span>
          <span className="mx-5 sm:mx-8 h-1 w-1 rounded-full bg-cyan-500/40" />
        </span>
      ))}
    </div>
  );
  return (
    <div className="relative z-20 w-full overflow-hidden border-t border-white/5 py-4">
      <motion.div
        className="flex w-max"
        animate={prefersReducedMotion ? {} : { x: ["0%", "-50%"] }}
        transition={{ duration: 28, ease: "linear", repeat: Infinity }}
      >
        {row}{row}
      </motion.div>
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

  // Parallax diferenciado por plano:
  // Runner izq (z-[3], más cerca) → se mueve MÁS rápido hacia arriba
  // 499 (z-[2], plano medio)
  // Runner der (z-[1], más lejos) → se mueve MENOS
  const runnerLeftY  = useTransform(scrollYProgress, [0, 1], ["0%", prefersReducedMotion ? "0%" : "12%"]);
  const typeY        = useTransform(scrollYProgress, [0, 1], ["0%", prefersReducedMotion ? "0%" : "18%"]);
  const runnerRightY = useTransform(scrollYProgress, [0, 1], ["0%", prefersReducedMotion ? "0%" : "6%"]);

  // Sombra proyectada del runner detrás (derecho) filtrada para que parezca profundidad
  const dropShadowFar  = "drop-shadow(0 25px 40px rgba(0,0,0,0.9)) contrast(1.01)";
  const dropShadowNear = "drop-shadow(0 30px 50px rgba(0,0,0,0.85)) drop-shadow(0 0 60px rgba(34,211,238,0.12)) contrast(1.02)";

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative w-full flex flex-col bg-[#03070b] font-sans"
    >
      {/* ─── FONDO ─── */}
      <div
        className="absolute inset-0 z-0 w-full h-full bg-cover bg-center bg-no-repeat opacity-50 md:opacity-60 pointer-events-none"
        style={{ backgroundImage: `url(${fondoBg})` }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#03070b]/90 via-[#03070b]/40 to-[#03070b] pointer-events-none" />

      {/* ══════════════════════════════════════════════════════════════════
          ██  MOBILE LAYOUT (< md)  ██
          100svh, posicionamiento absoluto igual que desktop.
          499 enorme en el centro-top, runners anclados al bottom
          a cada lado, botones al fondo.
      ══════════════════════════════════════════════════════════════════ */}
      <div
        className="relative z-10 md:hidden w-full"
        style={{ height: "100svh", minHeight: "600px" }}
      >
        {/* ── 499 centrado arriba ── */}
        <motion.div
          aria-hidden="true"
          style={{ y: typeY }}
          className="absolute inset-x-0 top-[18%] z-[2] flex justify-center pointer-events-none select-none"
        >
          <h1
            className="absolute font-black leading-none"
            style={{
              fontSize: "clamp(7rem, 38vw, 12rem)",
              letterSpacing: "-0.055em",
              fontVariantNumeric: "tabular-nums",
              color: "transparent",
              WebkitTextStroke: "clamp(2px, 0.8vw, 6px) rgba(148,163,184,0.15)",
              WebkitFontSmoothing: "antialiased",
            }}
          >
            499
          </h1>
          <h1
            className="relative font-black leading-none"
            style={{
              fontSize: "clamp(7rem, 38vw, 12rem)",
              letterSpacing: "-0.055em",
              fontVariantNumeric: "tabular-nums",
              color: "transparent",
              WebkitTextStroke: "clamp(1px, 0.4vw, 3px) rgba(226,232,240,0.75)",
              maskImage: "linear-gradient(180deg, black 0%, black 45%, rgba(0,0,0,0.3) 80%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(180deg, black 0%, black 45%, rgba(0,0,0,0.3) 80%, transparent 100%)",
              WebkitFontSmoothing: "antialiased",
            }}
          >
            499
          </h1>
        </motion.div>

        {/* ── Runner derecho — z-[3], anclado bottom-right ── */}
        <motion.div
          style={{ y: runnerRightY }}
          className="absolute right-0 bottom-[14%] z-[3] pointer-events-none select-none"
          initial={{ opacity: 0, x: prefersReducedMotion ? 0 : 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
        >
          <img
            src={runnerRight}
            alt=""
            aria-hidden="true"
            draggable={false}
            style={{
              height: "clamp(260px, 58vw, 400px)",
              width: "auto",
              objectFit: "contain",
              filter: `brightness(0.78) saturate(0.88) ${dropShadowFar}`,
            }}
          />
        </motion.div>

        {/* ── Runner izquierdo — z-[3], anclado bottom-left, más grande ── */}
        <motion.div
          style={{ y: runnerLeftY }}
          className="absolute left-0 bottom-[14%] z-[3] pointer-events-none select-none"
          initial={{ opacity: 0, x: prefersReducedMotion ? 0 : -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        >
          <img
            src={runnerHero}
            alt="Atleta corriendo — 499 Run Coro Falcón"
            draggable={false}
            style={{
              height: "clamp(300px, 68vw, 460px)",
              width: "auto",
              objectFit: "contain",
              filter: dropShadowNear,
            }}
          />
        </motion.div>

        {/* ── Botones anclados al fondo — z-[4] por encima de runners ── */}
        <motion.div
          initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="absolute inset-x-0 bottom-6 z-[4] flex flex-col gap-3 px-5"
        >
          <Link to="/registro" className="w-full">
            <button className="w-full py-4 rounded-[1.25rem] bg-cyan-500 hover:bg-cyan-400 text-black font-black text-[10px] tracking-[0.2em] uppercase transition-all duration-300 flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(0,242,255,0.3)] active:scale-95 group">
              INICIAR INSCRIPCIÓN
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </Link>
          <Link to="/resultados" className="w-full">
            <button className="w-full py-4 rounded-[1.25rem] bg-[#03070b]/80 border border-white/15 text-white font-black text-[10px] tracking-[0.2em] uppercase backdrop-blur-xl transition-all duration-300 flex items-center justify-center gap-3 active:scale-95 group shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
              <Trophy className="h-4 w-4 text-cyan-400/60 group-hover:text-cyan-400 transition-colors" />
              VER RESULTADOS
            </button>
          </Link>
        </motion.div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          ██  DESKTOP LAYOUT (md+)  ██
          DEPTH SANDWICH full-viewport:
            z-[2] 499 stroke (plano medio — corta visualmente al corredor izq)
            z-[3] runner derecho (pequeño = lejos) + runner izquierdo (grande = cerca)
            Profundidad por ESCALA + brightness, no por z-index oculto
      ══════════════════════════════════════════════════════════════════ */}
      <div
        className="relative w-full hidden md:block"
        style={{ height: "100vh", minHeight: "640px", overflow: "visible" }}
      >

        {/* ── PLANO 1 (detrás en escala): Runner derecho — z-[3] delante del 499
              El efecto 3D viene del TAMAÑO (más pequeña = más lejos) + brightness
              No del z-index — así se ve completa sin quedar cortada por el número ── */}
        <motion.div
          style={{ y: runnerRightY }}
          className="absolute inset-x-0 bottom-0 z-[3] flex justify-end items-end pointer-events-none select-none"
        >
          {/*
            Posición: anclado a la derecha, desplazado hacia el centro
            para que quede parcialmente DETRÁS del 499.
            Cuanto más hacia el centro, más se "mete debajo" del número.
          */}
          <div
            style={{
              // Centra el runner y lo desplaza a la derecha del 499
              // clamp asegura que en pantallas chicas no se salga
              marginRight: "clamp(0px, 6vw, 100px)",
              paddingBottom: 0,
            }}
          >
            {/* Sombra en el suelo — más difusa (está lejos) */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                bottom: 0,
                left: "50%",
                transform: "translateX(-50%)",
                width: "clamp(180px, 28vw, 400px)",
                height: "clamp(20px, 4vh, 40px)",
                background: "radial-gradient(ellipse at center, rgba(0,0,0,0.6) 0%, transparent 72%)",
                filter: "blur(18px)",
              }}
            />
            <motion.img
              src={runnerRight}
              alt=""
              aria-hidden="true"
              draggable={false}
              initial={{ opacity: 0, x: prefersReducedMotion ? 0 : 60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
              style={{
                // Más pequeña que el corredor izq (86vh) → profundidad por escala
                height: "clamp(260px, 56vh, 620px)",
                width: "auto",
                objectFit: "contain",
                // Levemente más oscura → refuerza distancia, pero visible
                filter: `brightness(0.78) saturate(0.88) ${dropShadowFar}`,
                opacity: 0.95,
                transform: "translateZ(0)",
              }}
            />
          </div>
        </motion.div>

        {/* ── PLANO 2 (medio): 499 stroke-only ── */}
        <motion.div
          aria-hidden="true"
          style={{ y: typeY }}
          className="absolute inset-0 z-[2] flex items-center justify-center pointer-events-none select-none"
        >
          {/* stroke grueso sutil */}
          <h1
            className="absolute font-black leading-none"
            style={{
              fontSize: "clamp(10rem, 36vw, 42rem)",
              lineHeight: 0.82,
              letterSpacing: "-0.055em",
              fontVariantNumeric: "tabular-nums",
              whiteSpace: "nowrap",
              color: "transparent",
              WebkitTextStroke: "clamp(3px, 0.5vw, 8px) rgba(148,163,184,0.18)",
              transform: "translateZ(0) translateY(-4%)",
              WebkitFontSmoothing: "antialiased",
            }}
          >
            499
          </h1>
          {/* stroke fino con fade vertical */}
          <h1
            className="relative font-black leading-none"
            style={{
              fontSize: "clamp(10rem, 36vw, 42rem)",
              lineHeight: 0.82,
              letterSpacing: "-0.055em",
              fontVariantNumeric: "tabular-nums",
              whiteSpace: "nowrap",
              color: "transparent",
              WebkitTextStroke: "clamp(1.5px, 0.22vw, 3.5px) rgba(226,232,240,0.75)",
              maskImage: "linear-gradient(180deg, black 0%, black 40%, rgba(0,0,0,0.35) 75%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(180deg, black 0%, black 40%, rgba(0,0,0,0.35) 75%, transparent 100%)",
              transform: "translateZ(0) translateY(-4%)",
              WebkitFontSmoothing: "antialiased",
              filter: "drop-shadow(0 0 40px rgba(34,211,238,0.08))",
            }}
          >
            499
          </h1>
        </motion.div>

        {/* ── PLANO 3 (delante): Runner izquierdo — z-[3], espejado ── */}
        <motion.div
          style={{ y: runnerLeftY }}
          className="absolute inset-x-0 bottom-0 z-[3] flex justify-start items-end pointer-events-none select-none"
        >
          <div
            style={{
              marginLeft: "clamp(0px, 6vw, 100px)",
            }}
          >
            {/* Sombra en el suelo — más concentrada (está cerca) */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                bottom: 0,
                left: "50%",
                transform: "translateX(-50%)",
                width: "clamp(200px, 32vw, 480px)",
                height: "clamp(26px, 5vh, 50px)",
                background: "radial-gradient(ellipse at center, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.35) 55%, transparent 78%)",
                filter: "blur(12px)",
              }}
            />
            <motion.img
              src={runnerHero}
              alt="Atleta corriendo — 499 Run Coro Falcón"
              draggable={false}
              initial={{ opacity: 0, x: prefersReducedMotion ? 0 : -60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
              style={{
                height: "clamp(420px, 86vh, 940px)",
                width: "auto",
                objectFit: "contain",
                transform: "translateZ(0)",
                filter: dropShadowNear,
              }}
            />
          </div>
        </motion.div>

        {/* ── CAPA 4: marca vertical (lg+) ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.2 }}
          className="absolute left-4 lg:left-6 bottom-24 z-[4] hidden lg:flex items-center"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          <span className="text-[9px] font-black tracking-[0.5em] uppercase text-white/30">
            Coro · 499 Años · Falcón · Venezuela
          </span>
        </motion.div>

        {/* ── CAPA 5: botonera anclada abajo — z-[5] para quedar por encima de todo ── */}
        <div className="absolute inset-x-0 bottom-8 lg:bottom-10 z-[5] flex justify-center px-4">
          <motion.div
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 1.1 }}
            className="flex flex-row gap-4 justify-center items-center w-full max-w-xl"
          >
            <Link to="/registro" className="w-auto">
              <button className="w-[240px] lg:w-[260px] py-4 lg:py-5 rounded-[1.25rem] bg-cyan-500 hover:bg-cyan-400 text-black font-black text-[10px] tracking-[0.2em] uppercase transition-all duration-300 flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(0,242,255,0.3)] hover:shadow-[0_0_30px_rgba(0,242,255,0.5)] hover:-translate-y-1 active:scale-95 group">
                INICIAR INSCRIPCIÓN
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </Link>
            <Link to="/resultados" className="w-auto">
              <button className="w-[240px] lg:w-[260px] py-4 lg:py-5 rounded-[1.25rem] bg-[#03070b]/60 hover:bg-cyan-500/10 border border-white/15 hover:border-cyan-500/40 text-white font-black text-[10px] tracking-[0.2em] uppercase backdrop-blur-xl transition-all duration-300 flex items-center justify-center gap-3 hover:-translate-y-1 active:scale-95 group shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
                <Trophy className="h-4 w-4 text-cyan-400/60 group-hover:text-cyan-400 transition-colors" />
                VER RESULTADOS
              </button>
            </Link>
          </motion.div>
        </div>
      </div>

      {/* ─── CARRUSEL DE FLYERS ─── */}
      <div className="relative z-10 mt-14 sm:mt-20 md:mt-24 mb-12 sm:mb-16 md:mb-20">
        <EventCarousel />
      </div>

      {/* ─── INDICADOR DE SCROLL (solo md+) ─── */}
      <motion.div
        className="relative z-20 mb-8 hidden md:flex flex-col items-center gap-3 opacity-40 hover:opacity-100 transition-opacity cursor-pointer"
        animate={prefersReducedMotion ? {} : { y: [0, 8, 0] }}
        transition={{ duration: 2, ease: "easeInOut", repeat: Infinity }}
        onClick={() => window.scrollTo({ top: window.innerHeight, behavior: "smooth" })}
      >
        <span className="text-[8px] font-black tracking-[0.5em] text-cyan-500 uppercase">Explorar</span>
        <div className="w-[1px] h-12 bg-gradient-to-b from-cyan-500 to-transparent" />
      </motion.div>

      {/* ─── MARQUEE ─── */}
      <TacticalMarquee />

      {/* ─── TEXTURA TÁCTICA ─── */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-screen z-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </section>
  );
};

export default HeroSection;
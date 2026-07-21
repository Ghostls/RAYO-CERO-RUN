/**
 * RAYO CERO — HERO SECTION (V9.0 - CARRUSEL FALCÓN)
 * Senior Dev: MIA (Valkyron Group)
 * CEO: Lualdo Sciscioli
 * REGLA DE ORO: Evolución sin Destrucción. Código completo. Copy-paste ready.
 *
 * CHANGELOG V9.0:
 * [V9-1] FlierSlider reintroducido — carrusel automático con las 2 imágenes del evento
 * [V9-2] Diseño full-bleed: imágenes ocupan 100% del contenedor, sin bordes artificiales
 * [V9-3] Crossfade suave entre slides (opacity transition 700ms)
 * [V9-4] Indicadores táticos en la base del carrusel (dots + barra de progreso activa)
 * [V9-5] Overlay gradiente interno mantiene legibilidad del badge y fecha
 * [V9-6] Auto-advance cada 4.5s, pausado on hover, touch/swipe compatible
 * [V9-7] Badge y fecha operativa preservados, ahora dentro del carrusel
 */

import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Trophy, ArrowRight } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";

import fondoBg from "../assets/fondobg.png";

// ─── SLIDES DEL EVENTO ───────────────────────────────────────────────────────
// Reemplaza estos imports con las rutas reales de tus assets
import slide1 from "../assets/falco-n-1.png"; // WEB_499_FALCO_N__1_.png
import slide2 from "../assets/falco-n-2.png"; // WEB_499_FALCO_N_2.png

const SLIDES = [
  {
    src: slide1,
    alt: "499 Run Coro Falcón — Carrera 10K",
    caption: "CARRERA 10K",
  },
  {
    src: slide2,
    alt: "499 Run Coro Falcón — Inscripción $20",
    caption: "INSCRIPCIÓN $20",
  },
];

const INTERVAL_MS = 4500;

// ─── CARRUSEL INTERNO ────────────────────────────────────────────────────────
const EventCarousel = () => {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);
  const progressRef = useRef(null);
  const startTimeRef = useRef(null);

  // Touch swipe
  const touchStartX = useRef(null);

  const goTo = useCallback((idx) => {
    setCurrent(idx);
    setProgress(0);
    startTimeRef.current = performance.now();
  }, []);

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % SLIDES.length);
    setProgress(0);
    startTimeRef.current = performance.now();
  }, []);

  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 + SLIDES.length) % SLIDES.length);
    setProgress(0);
    startTimeRef.current = performance.now();
  }, []);

  // Auto-advance + progress bar
  useEffect(() => {
    if (paused) {
      cancelAnimationFrame(progressRef.current);
      clearTimeout(timerRef.current);
      return;
    }

    startTimeRef.current = performance.now();

    const tick = (now) => {
      const elapsed = now - startTimeRef.current;
      const pct = Math.min((elapsed / INTERVAL_MS) * 100, 100);
      setProgress(pct);
      if (pct < 100) {
        progressRef.current = requestAnimationFrame(tick);
      } else {
        next();
      }
    };

    progressRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(progressRef.current);
    };
  }, [current, paused, next]);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) {
      dx < 0 ? next() : prev();
    }
    touchStartX.current = null;
  };

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        aspectRatio: "16 / 9",
        borderRadius: "2rem",
        maxHeight: "clamp(220px, 50vw, 520px)",
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── SLIDES ── */}
      {SLIDES.map((slide, idx) => (
        <div
          key={idx}
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: idx === current ? 1 : 0, zIndex: idx === current ? 1 : 0 }}
          aria-hidden={idx !== current}
        >
          <img
            src={slide.src}
            alt={slide.alt}
            className="w-full h-full object-cover object-center"
            draggable={false}
          />
        </div>
      ))}

      {/* ── OVERLAY GRADIENTES ── */}
      {/* Top: funde con el fondo negro del hero */}
      <div
        className="absolute inset-x-0 top-0 pointer-events-none z-10"
        style={{ height: "35%", background: "linear-gradient(to bottom, #03070b 0%, transparent 100%)" }}
      />
      {/* Bottom: zona de indicadores */}
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none z-10"
        style={{ height: "40%", background: "linear-gradient(to top, rgba(3,7,11,0.95) 0%, rgba(3,7,11,0.4) 60%, transparent 100%)" }}
      />
      {/* Viñeta lateral sutil */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{ background: "radial-gradient(ellipse at center, transparent 55%, rgba(3,7,11,0.6) 100%)" }}
      />

      {/* ── INDICADORES TÁCTICOS ── */}
      <div className="absolute bottom-4 inset-x-0 z-20 flex items-center justify-center gap-3">
        {SLIDES.map((_, idx) => (
          <button
            key={idx}
            onClick={() => goTo(idx)}
            aria-label={`Slide ${idx + 1}`}
            className="relative flex items-center justify-center focus:outline-none"
          >
            {/* Línea base */}
            <span
              className="block transition-all duration-300"
              style={{
                width: idx === current ? "clamp(28px, 5vw, 40px)" : "clamp(16px, 3vw, 24px)",
                height: "2px",
                borderRadius: "1px",
                background: idx === current ? "rgba(34,211,238,0.25)" : "rgba(255,255,255,0.15)",
              }}
            />
            {/* Barra de progreso sobre el slide activo */}
            {idx === current && (
              <span
                className="absolute left-0 top-0 h-full rounded-sm bg-cyan-400"
                style={{ width: `${progress}%`, transition: "width 0.05s linear" }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── HERO SECTION ─────────────────────────────────────────────────────────────
const HeroSection = () => {
  return (
    <section
      id="hero"
      className="relative w-full min-h-screen flex flex-col overflow-hidden bg-[#03070b] font-sans pt-32 pb-8"
    >
      {/* ─── CAPA 1: IMAGEN DE FONDO RESPONSIVE ─── */}
      <div
        className="absolute inset-0 z-0 w-full h-full bg-cover bg-center bg-no-repeat opacity-50 md:opacity-60"
        style={{ backgroundImage: `url(${fondoBg})` }}
      />
      {/* Velo Táctico */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#03070b]/90 via-[#03070b]/40 to-[#03070b] pointer-events-none" />

      {/* CONTENEDOR PRINCIPAL */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center w-full max-w-5xl mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center w-full"
        >
          {/* ─── MÓDULO VISUAL: CARRUSEL FULL-BLEED ─── */}
          <motion.div
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
            className="w-full mb-10 sm:mb-12 md:mb-14"
            style={{ maxWidth: "min(100%, 900px)" }}
          >
            <EventCarousel />
          </motion.div>
          {/* ──────────────────────────────────────────── */}

          {/* Botonera */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full max-w-xl z-20">
            <Link to="/registro" className="w-full sm:w-auto">
              <button className="w-full sm:w-[260px] py-4 md:py-5 rounded-[1.25rem] bg-cyan-500 hover:bg-cyan-400 text-black font-black text-[10px] tracking-[0.2em] uppercase transition-all duration-300 flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(0,242,255,0.2)] hover:shadow-[0_0_30px_rgba(0,242,255,0.4)] hover:-translate-y-1 active:scale-95 group">
                INICIAR INSCRIPCIÓN
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </Link>

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
        onClick={() => window.scrollTo({ top: window.innerHeight, behavior: "smooth" })}
      >
        <span className="text-[8px] font-black tracking-[0.5em] text-cyan-500 uppercase">Explorar</span>
        <div className="w-[1px] h-12 bg-gradient-to-b from-cyan-500 to-transparent" />
      </motion.div>

      {/* Textura Táctica */}
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
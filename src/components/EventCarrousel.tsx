/**
 * RAYOCERO — EVENT CAROUSEL (V3.0 - SIN CRASH EN TRANSICIÓN)
 * Senior Dev: MIA (Valkyron Group)
 * CEO: Lualdo Sciscioli
 *
 * CHANGELOG V3.0:
 * [V3-1] Contenedor con altura fija via padding-bottom (aspect ratio trick) —
 *        el div nunca colapsa entre slides, cero redimensionado
 * [V3-2] Slides con position:absolute sobre el contenedor → overlap real,
 *        la imagen saliente y la entrante coexisten durante la transición
 * [V3-3] AnimatePresence mode="sync" (no "wait") — no espera que salga
 *        antes de entrar, transición cruzada suave
 * [V3-4] Fade simple (opacity) en lugar de slide lateral — más limpio,
 *        sin riesgo de overflow ni artefactos de scroll horizontal
 */

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import slide1 from "../assets/falco-n-1.png";
import slide2 from "../assets/falco-n-2.png";

const SLIDES = [
  { src: slide1, alt: "499 Run Coro Falcón — Carrera 10K", label: "CARRERA 10K" },
  { src: slide2, alt: "499 Run Coro Falcón — Inscripción $20", label: "INSCRIPCIÓN $20" },
];

const INTERVAL_MS = 5500;
const SWIPE_THRESHOLD = 50;

const EventCarousel = () => {
  const prefersReducedMotion = useReducedMotion();
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(null);
  const touchStartX = useRef(null);

  const goTo = useCallback((idx) => {
    setCurrent(((idx % SLIDES.length) + SLIDES.length) % SLIDES.length);
    setProgress(0);
    startRef.current = performance.now();
  }, []);

  const next = useCallback(() => goTo(current + 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);

  useEffect(() => {
    if (paused || prefersReducedMotion) {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    startRef.current = performance.now();
    const tick = (now) => {
      const pct = Math.min(((now - startRef.current) / INTERVAL_MS) * 100, 100);
      setProgress(pct);
      if (pct < 100) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        next();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [current, paused, prefersReducedMotion, next]);

  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > SWIPE_THRESHOLD) dx < 0 ? next() : prev();
    touchStartX.current = null;
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="flex items-center justify-center gap-3 mb-8 sm:mb-10"
      >
        <div className="h-[1px] w-8 sm:w-12 bg-gradient-to-r from-transparent to-cyan-500/60" />
        <span className="text-[9px] sm:text-[10px] font-black tracking-[0.45em] uppercase text-white/50">
          El Evento
        </span>
        <div className="h-[1px] w-8 sm:w-12 bg-gradient-to-l from-transparent to-cyan-500/60" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/*
          CONTENEDOR ESTABLE:
          - overflow:hidden para no ver slides fuera de bounds
          - altura determinada por la primera imagen (se carga invisible abajo)
            usando una img transparente con el mismo src para que el browser
            reserve el espacio correcto sin parpadeos
          - position:relative para que las slides absolutas se anclen aquí
        */}
        <div
          className="relative w-full overflow-hidden"
          style={{
            borderRadius: "1.5rem",
            background: "#03070b",
            boxShadow: "0 30px 80px -20px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06)",
          }}
        >
          {/* Imagen fantasma: reserva el espacio del contenedor con el aspect
              ratio de la slide actual SIN ser visible. Cambia instantáneamente
              (sin animación) para que el contenedor tenga siempre la altura
              correcta. */}
          <img
            src={SLIDES[current].src}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="w-full h-auto block select-none"
            style={{
              maxHeight: "75vh",
              objectFit: "contain",
              visibility: "hidden",   // ocupa espacio pero no se ve
              pointerEvents: "none",
            }}
          />

          {/* Slides animadas: absolutas sobre el fantasma */}
          <AnimatePresence mode="sync">
            <motion.div
              key={current}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.45, ease: "easeInOut" }}
              className="absolute inset-0"
            >
              <img
                src={SLIDES[current].src}
                alt={SLIDES[current].alt}
                draggable={false}
                className="w-full h-full block select-none"
                style={{ objectFit: "contain" }}
              />
            </motion.div>
          </AnimatePresence>

          {/* Velo superior */}
          <div
            className="absolute inset-x-0 top-0 pointer-events-none z-10"
            style={{ height: "18%", background: "linear-gradient(to bottom, rgba(3,7,11,0.5) 0%, transparent 100%)" }}
          />

          {/* Label */}
          <div className="absolute top-4 right-5 z-20 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
            <span className="text-[9px] font-black tracking-[0.35em] uppercase text-white/80">
              {SLIDES[current].label}
            </span>
          </div>
        </div>

        {/* Flechas */}
        <button
          onClick={prev}
          aria-label="Anterior"
          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-10 h-10 rounded-full backdrop-blur-xl transition-all duration-300 hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
        >
          <ChevronLeft className="w-5 h-5 text-white/80" />
        </button>
        <button
          onClick={next}
          aria-label="Siguiente"
          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-10 h-10 rounded-full backdrop-blur-xl transition-all duration-300 hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
        >
          <ChevronRight className="w-5 h-5 text-white/80" />
        </button>

        {/* Progress pills */}
        <div className="flex items-center justify-center gap-3 mt-5">
          {SLIDES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goTo(idx)}
              aria-label={`Slide ${idx + 1}`}
              className="relative overflow-hidden rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 transition-all duration-300"
              style={{
                width: idx === current ? "clamp(36px, 6vw, 56px)" : "8px",
                height: "4px",
                background: "rgba(255,255,255,0.15)",
              }}
            >
              {idx === current && (
                <span
                  className="absolute left-0 top-0 h-full rounded-full bg-cyan-400"
                  style={{
                    width: `${prefersReducedMotion ? 100 : progress}%`,
                    boxShadow: "0 0 8px rgba(34,211,238,0.7)",
                    transition: "width 0.05s linear",
                  }}
                />
              )}
            </button>
          ))}
        </div>

        <p className="text-center mt-3 text-[9px] font-black tracking-[0.4em] uppercase text-white/25">
          {String(current + 1).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")}
        </p>
      </motion.div>
    </div>
  );
};

export default EventCarousel;
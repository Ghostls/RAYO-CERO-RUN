/**
 * CORO BANNER CAROUSEL — Rotación fluida de banners Coro Falcón
 * Valkyron Group / Rayocero
 * V3: slides planos (1 imagen c/u), transición deslizante, altura fija,
 *     autoplay estable con useRef (evita closures obsoletos)
 * Evolución sin Destrucción — módulo aislado
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── AGOSTO 29 ──────────────────────────────────────────────────────────────
import portada499Agosto from "@/assets/PORTADA_499.png";

// ── OCTUBRE 31 ─────────────────────────────────────────────────────────────
import flyerOctubreInscripciones from "@/assets/flyer-coro-inscripciones.png";
import flyerOctubrePrecios from "@/assets/flyer-coro-precios.png";

interface BannerSlide {
  id: string;
  fecha: string;
  src: string;
  alt: string;
}

const slides: BannerSlide[] = [
  {
    id: "agosto-499",
    fecha: "29 DE AGOSTO",
    src: portada499Agosto,
    alt: "499 Run — Coro Falcón · 29 de Agosto",
  },
  {
    id: "octubre-inscripciones",
    fecha: "31 DE OCTUBRE",
    src: flyerOctubreInscripciones,
    alt: "We Run Rayocero — Coro Falcón · Inscripciones",
  },
  {
    id: "octubre-precios",
    fecha: "31 DE OCTUBRE",
    src: flyerOctubrePrecios,
    alt: "We Run Rayocero — Coro Falcón · Precios",
  },
];

const AUTO_ROTATE_MS = 3000;

const variants = {
  enter: { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

const CoroBannerCarousel = () => {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const indexRef = useRef(index);
  indexRef.current = index;

  const goTo = useCallback((i: number) => {
    setIndex(((i % slides.length) + slides.length) % slides.length);
  }, []);

  const next = useCallback(() => {
    goTo(indexRef.current + 1);
  }, [goTo]);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      next();
    }, AUTO_ROTATE_MS);
    return () => clearInterval(timer);
  }, [isPaused, next]);

  const active = slides[index];

  return (
    <div
      className="w-full max-w-5xl px-4 sm:px-6 lg:px-8 mx-auto"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* ── INDICADOR DE CARRERA ACTIVA ── */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <span className="text-[9px] font-black tracking-[0.4em] text-[#50E8E3] uppercase">
          Próxima Operación · {active.fecha}
        </span>
      </div>

      {/* ── STAGE FIJO — evita saltos de layout entre slides distintos ── */}
      <div className="relative w-full aspect-[16/9] md:aspect-[16/8] overflow-hidden rounded-2xl shadow-[0_0_35px_rgba(80,232,227,0.18)]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.img
            key={active.id}
            src={active.src}
            alt={active.alt}
            loading="lazy"
            decoding="async"
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            className="absolute inset-0 w-full h-full object-contain bg-[#03070b]"
          />
        </AnimatePresence>
      </div>

      {/* ── DOTS DE NAVEGACIÓN ── */}
      <div className="flex items-center justify-center gap-2 mt-6">
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            onClick={() => goTo(i)}
            aria-label={`Ver ${slide.alt}`}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i === index
                ? "w-8 bg-[#50E8E3] shadow-[0_0_10px_rgba(80,232,227,0.6)]"
                : "w-1.5 bg-white/20 hover:bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default CoroBannerCarousel;
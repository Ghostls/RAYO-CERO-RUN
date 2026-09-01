/**
 * RAYOCERO — EVENT CAROUSEL (V4.1 - SEAMLESS BG + NEON FLOW)
 * Senior Dev: MIA (Valkyron Group)
 * CEO: Lualdo Sciscioli
 * REGLA DE ORO: Evolución sin Destrucción. Código completo. Copy-paste ready.
 *
 * CHANGELOG V4.1 (evoluciona sobre V4.0):
 * [V4.1-1] Wrapper background: gradiente que arranca desde BG_DEEP (#020608)
 *          igual que el hero — transición imperceptible entre secciones
 * [V4.1-2] paddingTop reducido — el bridge del hero ya aporta espacio superior
 * [V4.1-3] Todo lo demás de V4.0 preservado (NeonFlowBg, 3 slides, RAF, swipe)
 */

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import slide1 from "../assets/led-run-hero.png";
import slide2 from "../assets/precios-web.png";
import slide3 from "../assets/led-run-kit.png";

const LED_CYAN    = "#00f2ff";
const LED_MAGENTA = "#ff00c8";
const LED_ORANGE  = "#ff6b00";
const LED_GREEN   = "#00ff9d";
const BG_DEEP     = "#020608";

const SLIDES = [
  { src: slide1, alt: "WE RUN LED 10K — Portada Carrera Nocturna",   label: "CARRERA NOCTURNA" },
  { src: slide2, alt: "WE RUN LED 10K — Precio $40 Pago con Cashea", label: "PRECIO $40" },
  { src: slide3, alt: "WE RUN LED 10K — Kit del corredor",            label: "KIT DEL CORREDOR" },
];

const INTERVAL_MS     = 5500;
const SWIPE_THRESHOLD = 50;

// ─── NEON FLOW BACKGROUND ─────────────────────────────────────────────────────
const NeonFlowBg = () => (
  <div
    className="absolute inset-0 overflow-hidden pointer-events-none"
    aria-hidden="true"
    style={{ borderRadius: "2rem" }}
  >
    <div className="absolute inset-0" style={{ background: "#010407" }} />
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 1200 500"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="ng-cyan" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor={LED_CYAN}    stopOpacity="0" />
          <stop offset="25%"  stopColor={LED_CYAN}    stopOpacity="0.9" />
          <stop offset="60%"  stopColor={LED_CYAN}    stopOpacity="0.6" />
          <stop offset="100%" stopColor={LED_CYAN}    stopOpacity="0" />
        </linearGradient>
        <linearGradient id="ng-magenta" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor={LED_MAGENTA} stopOpacity="0" />
          <stop offset="30%"  stopColor={LED_MAGENTA} stopOpacity="0.8" />
          <stop offset="70%"  stopColor="#ff6bcd"     stopOpacity="0.5" />
          <stop offset="100%" stopColor={LED_MAGENTA} stopOpacity="0" />
        </linearGradient>
        <linearGradient id="ng-orange" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor={LED_ORANGE}  stopOpacity="0" />
          <stop offset="20%"  stopColor={LED_ORANGE}  stopOpacity="0.7" />
          <stop offset="55%"  stopColor="#ffb347"     stopOpacity="0.4" />
          <stop offset="100%" stopColor={LED_ORANGE}  stopOpacity="0" />
        </linearGradient>
        <linearGradient id="ng-blue" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#4400ff"     stopOpacity="0" />
          <stop offset="35%"  stopColor="#7b2fff"     stopOpacity="0.6" />
          <stop offset="65%"  stopColor="#4400ff"     stopOpacity="0.4" />
          <stop offset="100%" stopColor="#4400ff"     stopOpacity="0" />
        </linearGradient>
        <linearGradient id="ng-green" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor={LED_GREEN}   stopOpacity="0" />
          <stop offset="40%"  stopColor={LED_GREEN}   stopOpacity="0.5" />
          <stop offset="100%" stopColor={LED_GREEN}   stopOpacity="0" />
        </linearGradient>
        <filter id="neon-blur-sm"><feGaussianBlur stdDeviation="2" /></filter>
        <filter id="neon-blur-lg"><feGaussianBlur stdDeviation="5" /></filter>
      </defs>

      {/* Cyan */}
      <g filter="url(#neon-blur-sm)">
        <path d="M -200 185 Q 300 175 700 180 Q 1000 183 1400 178"
          stroke="url(#ng-cyan)" strokeWidth="1.5" fill="none">
          <animateTransform attributeName="transform" type="translate"
            from="-300 0" to="1500 0" dur="4.2s" repeatCount="indefinite" />
        </path>
      </g>
      <g filter="url(#neon-blur-lg)" opacity="0.4">
        <path d="M -200 185 Q 300 175 700 180 Q 1000 183 1400 178"
          stroke={LED_CYAN} strokeWidth="8" fill="none">
          <animateTransform attributeName="transform" type="translate"
            from="-300 0" to="1500 0" dur="4.2s" repeatCount="indefinite" />
        </path>
      </g>
      <g filter="url(#neon-blur-sm)" opacity="0.5">
        <path d="M -200 192 Q 400 184 800 188 Q 1100 190 1400 186"
          stroke="url(#ng-cyan)" strokeWidth="1" fill="none">
          <animateTransform attributeName="transform" type="translate"
            from="-300 0" to="1500 0" dur="4.2s" begin="-2.1s" repeatCount="indefinite" />
        </path>
      </g>

      {/* Magenta */}
      <g filter="url(#neon-blur-sm)">
        <path d="M -300 240 Q 200 230 600 235 Q 900 240 1300 260 Q 1450 270 1600 290"
          stroke="url(#ng-magenta)" strokeWidth="2" fill="none">
          <animateTransform attributeName="transform" type="translate"
            from="-400 0" to="1600 0" dur="5.8s" repeatCount="indefinite" />
        </path>
      </g>
      <g filter="url(#neon-blur-lg)" opacity="0.35">
        <path d="M -300 240 Q 200 230 600 235 Q 900 240 1300 260 Q 1450 270 1600 290"
          stroke={LED_MAGENTA} strokeWidth="10" fill="none">
          <animateTransform attributeName="transform" type="translate"
            from="-400 0" to="1600 0" dur="5.8s" repeatCount="indefinite" />
        </path>
      </g>
      <g filter="url(#neon-blur-sm)" opacity="0.6">
        <path d="M -300 248 Q 200 238 600 243 Q 900 248 1300 268"
          stroke="url(#ng-magenta)" strokeWidth="1" fill="none">
          <animateTransform attributeName="transform" type="translate"
            from="-400 0" to="1600 0" dur="5.8s" begin="-2.9s" repeatCount="indefinite" />
        </path>
      </g>

      {/* Naranja */}
      <g filter="url(#neon-blur-sm)">
        <path d="M -100 300 Q 150 290 400 295 Q 600 298 800 310"
          stroke="url(#ng-orange)" strokeWidth="1.8" fill="none">
          <animateTransform attributeName="transform" type="translate"
            from="-200 0" to="1400 0" dur="6.5s" repeatCount="indefinite" />
        </path>
      </g>
      <g filter="url(#neon-blur-lg)" opacity="0.3">
        <path d="M -100 300 Q 150 290 400 295 Q 600 298 800 310"
          stroke={LED_ORANGE} strokeWidth="9" fill="none">
          <animateTransform attributeName="transform" type="translate"
            from="-200 0" to="1400 0" dur="6.5s" repeatCount="indefinite" />
        </path>
      </g>
      <g filter="url(#neon-blur-sm)" opacity="0.45">
        <path d="M -100 308 Q 150 298 400 303 Q 600 306 800 318"
          stroke="url(#ng-orange)" strokeWidth="1" fill="none">
          <animateTransform attributeName="transform" type="translate"
            from="-200 0" to="1400 0" dur="6.5s" begin="-3.25s" repeatCount="indefinite" />
        </path>
      </g>

      {/* Azul-violeta */}
      <g filter="url(#neon-blur-sm)">
        <path d="M -400 270 Q 0 258 400 263 Q 700 267 1100 280 Q 1300 288 1500 300"
          stroke="url(#ng-blue)" strokeWidth="2" fill="none">
          <animateTransform attributeName="transform" type="translate"
            from="-500 0" to="1700 0" dur="7.1s" repeatCount="indefinite" />
        </path>
      </g>
      <g filter="url(#neon-blur-lg)" opacity="0.28">
        <path d="M -400 270 Q 0 258 400 263 Q 700 267 1100 280 Q 1300 288 1500 300"
          stroke="#7b2fff" strokeWidth="12" fill="none">
          <animateTransform attributeName="transform" type="translate"
            from="-500 0" to="1700 0" dur="7.1s" repeatCount="indefinite" />
        </path>
      </g>
      <g filter="url(#neon-blur-sm)" opacity="0.5">
        <path d="M -400 278 Q 0 266 400 271 Q 700 275 1100 288"
          stroke="url(#ng-blue)" strokeWidth="1" fill="none">
          <animateTransform attributeName="transform" type="translate"
            from="-500 0" to="1700 0" dur="7.1s" begin="-3.55s" repeatCount="indefinite" />
        </path>
      </g>

      {/* Verde sutil */}
      <g filter="url(#neon-blur-sm)" opacity="0.4">
        <path d="M -200 220 Q 300 212 700 216 Q 1000 219 1400 215"
          stroke="url(#ng-green)" strokeWidth="1.2" fill="none">
          <animateTransform attributeName="transform" type="translate"
            from="-300 0" to="1500 0" dur="8.0s" repeatCount="indefinite" />
        </path>
      </g>

      {/* Destello circular derecho */}
      <g opacity="0.18" filter="url(#neon-blur-lg)">
        <ellipse cx="1050" cy="320" rx="280" ry="120"
          stroke={LED_MAGENTA} strokeWidth="3" fill="none">
          <animate attributeName="opacity" values="0.18;0.32;0.18" dur="3s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="1080" cy="330" rx="200" ry="85"
          stroke="#9b5fff" strokeWidth="2" fill="none">
          <animate attributeName="opacity" values="0.15;0.28;0.15" dur="3s" begin="-1s" repeatCount="indefinite" />
        </ellipse>
      </g>

      {/* Vignette punto de fuga */}
      <radialGradient id="vp-dark" cx="45%" cy="55%" r="50%">
        <stop offset="0%"   stopColor="#010407" stopOpacity="0" />
        <stop offset="100%" stopColor="#010407" stopOpacity="0.65" />
      </radialGradient>
      <rect x="0" y="0" width="1200" height="500" fill="url(#vp-dark)" />
    </svg>
    <div
      className="absolute inset-0"
      style={{ background: `radial-gradient(ellipse 90% 80% at 45% 60%, transparent 30%, #010407cc 100%)` }}
    />
  </div>
);

// ─── EVENT CAROUSEL ───────────────────────────────────────────────────────────
const EventCarousel = () => {
  const prefersReducedMotion = useReducedMotion();
  const [current,  setCurrent]  = useState(0);
  const [paused,   setPaused]   = useState(false);
  const [progress, setProgress] = useState(0);
  const rafRef      = useRef<number | null>(null);
  const startRef    = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);

  const goTo = useCallback((idx: number) => {
    setCurrent(((idx % SLIDES.length) + SLIDES.length) % SLIDES.length);
    setProgress(0);
    startRef.current = performance.now();
  }, []);

  const next = useCallback(() => goTo(current + 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);

  useEffect(() => {
    if (paused || prefersReducedMotion) { cancelAnimationFrame(rafRef.current!); return; }
    startRef.current = performance.now();
    const tick = (now: number) => {
      const pct = Math.min(((now - startRef.current!) / INTERVAL_MS) * 100, 100);
      setProgress(pct);
      if (pct < 100) { rafRef.current = requestAnimationFrame(tick); } else { next(); }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current!);
  }, [current, paused, prefersReducedMotion, next]);

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd   = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > SWIPE_THRESHOLD) dx < 0 ? next() : prev();
    touchStartX.current = null;
  };

  return (
    // [V4.1-1] Fondo continuo desde BG_DEEP — empalme perfecto con el hero
    <div
      className="relative w-full overflow-hidden"
      style={{
        background: BG_DEEP,
        paddingTop: "clamp(1rem, 3vw, 2rem)",       // [V4.1-2] reducido — bridge del hero ya aporta
        paddingBottom: "clamp(2rem, 5vw, 4rem)",
      }}
    >
      <NeonFlowBg />

      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="flex items-center justify-center gap-3 mb-8 sm:mb-10"
        >
          <div className="h-[1px] w-8 sm:w-12"
            style={{ background: `linear-gradient(to right, transparent, ${LED_CYAN}60)` }} />
          <span className="text-[9px] sm:text-[10px] font-black tracking-[0.45em] uppercase"
            style={{ color: "rgba(255,255,255,0.50)" }}>
            WE RUN LED
          </span>
          <div className="h-[1px] w-8 sm:w-12"
            style={{ background: `linear-gradient(to left, transparent, ${LED_CYAN}60)` }} />
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
          {/* Card */}
          <div
            className="relative w-full overflow-hidden"
            style={{
              borderRadius: "1.5rem",
              background: "#010407",
              boxShadow: `0 0 0 1px rgba(0,242,255,0.12), 0 30px 80px -20px rgba(0,0,0,0.9), 0 0 60px -10px rgba(0,242,255,0.06)`,
            }}
          >
            {/* Ghost image — reserva altura */}
            <img src={SLIDES[current].src} alt="" aria-hidden="true" draggable={false}
              className="w-full h-auto block select-none"
              style={{ maxHeight: "75vh", objectFit: "contain", visibility: "hidden", pointerEvents: "none" }}
            />

            {/* Slides animadas */}
            <AnimatePresence mode="sync">
              <motion.div
                key={current}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.45, ease: "easeInOut" }}
                className="absolute inset-0"
              >
                <img src={SLIDES[current].src} alt={SLIDES[current].alt} draggable={false}
                  className="w-full h-full block select-none" style={{ objectFit: "contain" }} />
              </motion.div>
            </AnimatePresence>

            {/* Velo superior */}
            <div className="absolute inset-x-0 top-0 pointer-events-none z-10"
              style={{ height: "18%", background: "linear-gradient(to bottom, rgba(1,4,7,0.55) 0%, transparent 100%)" }}
            />

            {/* Label */}
            <div className="absolute top-4 right-5 z-20 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full"
                style={{ background: LED_CYAN, boxShadow: `0 0 8px ${LED_CYAN}` }} />
              <span className="text-[9px] font-black tracking-[0.35em] uppercase"
                style={{ color: "rgba(255,255,255,0.80)" }}>
                {SLIDES[current].label}
              </span>
            </div>
          </div>

          {/* Flechas */}
          <button onClick={prev} aria-label="Anterior"
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-10 h-10 rounded-full backdrop-blur-xl transition-all duration-300 hover:scale-110 active:scale-95 focus:outline-none"
            style={{ background: "rgba(0,242,255,0.06)", border: `1px solid ${LED_CYAN}25` }}>
            <ChevronLeft className="w-5 h-5" style={{ color: "rgba(255,255,255,0.80)" }} />
          </button>
          <button onClick={next} aria-label="Siguiente"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-10 h-10 rounded-full backdrop-blur-xl transition-all duration-300 hover:scale-110 active:scale-95 focus:outline-none"
            style={{ background: "rgba(0,242,255,0.06)", border: `1px solid ${LED_CYAN}25` }}>
            <ChevronRight className="w-5 h-5" style={{ color: "rgba(255,255,255,0.80)" }} />
          </button>

          {/* Progress pills */}
          <div className="flex items-center justify-center gap-3 mt-5">
            {SLIDES.map((_, idx) => (
              <button key={idx} onClick={() => goTo(idx)} aria-label={`Slide ${idx + 1}`}
                className="relative overflow-hidden rounded-full focus:outline-none transition-all duration-300"
                style={{
                  width: idx === current ? "clamp(36px, 6vw, 56px)" : "8px",
                  height: "4px",
                  background: "rgba(255,255,255,0.12)",
                }}
              >
                {idx === current && (
                  <span className="absolute left-0 top-0 h-full rounded-full"
                    style={{
                      width: `${prefersReducedMotion ? 100 : progress}%`,
                      background: `linear-gradient(90deg, ${LED_CYAN}, ${LED_GREEN})`,
                      boxShadow: `0 0 8px ${LED_CYAN}99`,
                      transition: "width 0.05s linear",
                    }}
                  />
                )}
              </button>
            ))}
          </div>

          <p className="text-center mt-3 text-[9px] font-black tracking-[0.4em] uppercase"
            style={{ color: "rgba(255,255,255,0.22)" }}>
            {String(current + 1).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")}
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default EventCarousel;
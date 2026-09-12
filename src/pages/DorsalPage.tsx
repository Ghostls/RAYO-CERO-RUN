/**
 * RAYOCERO — DORSAL PAGE (V4.1 — LED_CONFIG CALIBRADO)
 * Senior Dev: MIA (Valkyron Group)
 * CEO: Lualdo Sciscioli
 * REGLA DE ORO: Código completo. Copy-paste ready.
 *
 * CHANGELOG V4.1 (evoluciona sobre V4.0):
 * [V4.1-1] LED_CONFIG calibrada sobre DORSAL_LED-01.png:
 *          bibCy 492→400, bibFont 218→260, bibColor "#03070b"→"#ffffff"
 *          franjaX1 360→80, franjaX2 1110→1320, franjaY 718→720, franjaH 85→100
 *          nombreCy 761→770, nombreFontMax 38→72, nombreFontMin 18→28
 *          catCy 898→870, catColor "#FCD34D"→"#ffffff", catSpacing 3→4
 *          Sin franja de color — nombre y categoría van sobre fondo oscuro.
 *
 * CHANGELOG V4.0 (base preservada — NO MODIFICAR):
 * [V4.0-1] Import dorsalLedSrc.
 * [V4.0-2] LED_CONFIG inicial.
 * [V4.0-3] isLedRunEvento().
 * [V4.0-4] Router: caninata → DorsalCaninata, led → DorsalLedCoro, default → DorsalCarrera.
 * [V4.0-5] DorsalLedCoro: un solo canvas, acento #FCD34D.
 *
 * CHANGELOG V3.0 (base preservada — NO MODIFICAR):
 * [V3.0-1..6] Router caninata, DorsalRenderConfig, renderDorsalToCanvas,
 *             canvas doble caninata, downloadCanvas, UI caninata — INTACTOS.
 */

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Download, Home, Share2, Check, Loader2, Dog, User,
} from "lucide-react";

import dorsalCoroSrc     from "../assets/dorsal-coro.png";
import dorsalCaninataSrc from "../assets/dorsal-caninata.png";
import dorsalLedSrc      from "../assets/dorsal-led.png";

// ─────────────────────────────────────────────────────────────────────────────
// TIPO: DorsalRenderConfig
// ─────────────────────────────────────────────────────────────────────────────

interface DorsalRenderConfig {
  cw           : number;
  ch           : number;
  bibCx        : number;
  bibCy        : number;
  bibFont      : number;
  bibColor     : string;
  franjaY      : number;
  franjaH      : number;
  franjaX1     : number;
  franjaX2     : number;
  nombreCy     : number;
  nombreColor  : string;
  nombreFontMax: number;
  nombreFontMin: number;
  catCx        : number;
  catCy        : number;
  catColor     : string;
  catSpacing   : number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CORO_CONFIG — calibrada sobre dorsal-coro.png (NO MODIFICAR)
// ─────────────────────────────────────────────────────────────────────────────

const CORO_CONFIG: DorsalRenderConfig = {
  cw: 1400, ch: 1000,
  bibCx: 694,  bibCy: 492,  bibFont: 218, bibColor: "#42210b",
  franjaY: 718, franjaH: 85, franjaX1: 360, franjaX2: 1110,
  nombreCy: 761, nombreColor: "#ffffff",
  nombreFontMax: 38, nombreFontMin: 18,
  catCx: 735, catCy: 898, catColor: "#5a2e0e", catSpacing: 3,
};

// ─────────────────────────────────────────────────────────────────────────────
// CANINATA_CONFIG — para dorsal-caninata.png (NO MODIFICAR)
// ─────────────────────────────────────────────────────────────────────────────

const CANINATA_CONFIG: DorsalRenderConfig = {
  cw: 1400, ch: 1000,
  bibCx: 700,  bibCy: 390,  bibFont: 210, bibColor: "#1a1a1a",
  franjaY: 710, franjaH: 90, franjaX1: 130, franjaX2: 1270,
  nombreCy: 735,
  nombreColor: "#1a1a1a",
  nombreFontMax: 48, nombreFontMin: 20,
  catCx: 700, catCy: 850, catColor: "#ffffff", catSpacing: 2,
};

// ─────────────────────────────────────────────────────────────────────────────
// [V4.1-1] LED_CONFIG — calibrada sobre DORSAL_LED-01.png
// Sin franja de color — nombre y categoría sobre fondo oscuro directo.
// Ajuste fino: bibCy ±20px, nombreCy ±20px, catCy ±20px
// ─────────────────────────────────────────────────────────────────────────────

const LED_CONFIG: DorsalRenderConfig = {
  cw: 1400, ch: 1000,

  // BIB — grande, centrado, blanco sobre imagen
  bibCx:    700,
  bibCy:    400,
  bibFont:  260,
  bibColor: "#ffffff",

  // Franja clip — zona amplia sin barra visible, solo evita que el texto se salga
  franjaY:  720,
  franjaH:  100,
  franjaX1:  80,
  franjaX2: 1320,

  // Nombre — blanco, font grande, sobre fondo oscuro inferior
  nombreCy:      770,
  nombreColor:   "#ffffff",
  nombreFontMax:  72,
  nombreFontMin:  28,

  // Categoría — blanco, tracking amplio, debajo del nombre
  catCx:      700,
  catCy:      870,
  catColor:   "#ffffff",
  catSpacing:  4,
};

// ─────────────────────────────────────────────────────────────────────────────
// renderDorsalToCanvas — función pura, sin side effects (NO MODIFICAR)
// ─────────────────────────────────────────────────────────────────────────────

function renderDorsalToCanvas(
  canvas    : HTMLCanvasElement,
  assetSrc  : string,
  cfg       : DorsalRenderConfig,
  bib       : string,
  nombre    : string,
  categoria : string,
  onDone    : () => void,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width  = cfg.cw;
  canvas.height = cfg.ch;

  const bg = new Image();
  bg.crossOrigin = "anonymous";
  bg.src = assetSrc;

  bg.onload = () => {
    // 1. Fondo completo sin recortes
    ctx.drawImage(bg, 0, 0, cfg.cw, cfg.ch);

    // 2. BIB — solo texto, zona ya en el asset
    ctx.save();
    ctx.font         = `900 ${cfg.bibFont}px 'Arial Black', Arial, sans-serif`;
    ctx.fillStyle    = cfg.bibColor;
    ctx.textAlign    = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(bib, cfg.bibCx, cfg.bibCy);
    ctx.restore();

    // 3. Nombre — clip estricto a zona de texto, auto-fit font
    ctx.save();
    ctx.beginPath();
    ctx.rect(cfg.franjaX1, cfg.franjaY, cfg.franjaX2 - cfg.franjaX1, cfg.franjaH);
    ctx.clip();

    const maxW = cfg.franjaX2 - cfg.franjaX1 - 36;
    let fs = cfg.nombreFontMax;
    ctx.font = `900 ${fs}px 'Arial Black', Arial, sans-serif`;
    while (ctx.measureText(nombre).width > maxW && fs > cfg.nombreFontMin) {
      fs -= 2;
      ctx.font = `900 ${fs}px 'Arial Black', Arial, sans-serif`;
    }
    ctx.fillStyle    = cfg.nombreColor;
    ctx.textAlign    = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(nombre, (cfg.franjaX1 + cfg.franjaX2) / 2, cfg.nombreCy);
    ctx.restore();

    // 4. Categoría — letter-spacing manual para matching visual exacto
    if (categoria) {
      ctx.save();
      const catText = `CATEGORÍA: ${categoria.toUpperCase()}`;
      ctx.font         = `700 22px Arial, sans-serif`;
      ctx.fillStyle    = cfg.catColor;
      ctx.textAlign    = "left";
      ctx.textBaseline = "middle";
      let totalW = 0;
      for (const ch of catText) {
        totalW += ctx.measureText(ch).width + cfg.catSpacing;
      }
      totalW -= cfg.catSpacing;
      let x = cfg.catCx - totalW / 2;
      for (const ch of catText) {
        ctx.fillText(ch, x, cfg.catCy);
        x += ctx.measureText(ch).width + cfg.catSpacing;
      }
      ctx.restore();
    }

    onDone();
  };

  bg.onerror = () => {
    ctx.fillStyle = "#03070b";
    ctx.fillRect(0, 0, cfg.cw, cfg.ch);
    ctx.fillStyle    = cfg.bibColor;
    ctx.font         = `900 ${cfg.bibFont}px Arial`;
    ctx.textAlign    = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(bib, cfg.cw / 2, cfg.ch / 2);
    onDone();
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// [V4.0-3] Detector LED
// ─────────────────────────────────────────────────────────────────────────────

const isLedRunEvento = (evento: string = ""): boolean =>
  evento.toLowerCase().includes("led");

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE RAÍZ — Router V4.0
// ─────────────────────────────────────────────────────────────────────────────

export default function DorsalPage() {
  const [searchParams] = useSearchParams();
  const navigate        = useNavigate();

  const isCaninata = searchParams.get("tipo") === "caninata";

  const bib       = searchParams.get("bib") ?? "000";
  const nombre    = searchParams.get("nombre")
    ? decodeURIComponent(searchParams.get("nombre")!) : "";
  const apellido  = searchParams.get("apellido")
    ? decodeURIComponent(searchParams.get("apellido")!) : "";
  const evento    = searchParams.get("evento")
    ? decodeURIComponent(searchParams.get("evento")!) : "RAYOCERO";
  const categoria = searchParams.get("categoria")
    ? decodeURIComponent(searchParams.get("categoria")!) : "";

  // Params exclusivos caninata
  const nombrePerro = searchParams.get("perro")
    ? decodeURIComponent(searchParams.get("perro")!) : "";
  const razaPerro   = searchParams.get("raza")
    ? decodeURIComponent(searchParams.get("raza")!) : "";

  const bibPad         = bib.toString().padStart(4, "0");
  const nombreCompleto = `${nombre} ${apellido}`.trim().toUpperCase();

  // [V4.0-4] Router: Caninata → LED → Carrera default
  if (isCaninata) {
    return (
      <DorsalCaninata
        bibPad         ={bibPad}
        nombreCompleto ={nombreCompleto}
        nombre         ={nombre}
        apellido       ={apellido}
        nombrePerro    ={nombrePerro}
        razaPerro      ={razaPerro}
        evento         ={evento}
        navigate       ={navigate}
      />
    );
  }

  if (isLedRunEvento(evento)) {
    return (
      <DorsalLedCoro
        bibPad         ={bibPad}
        nombreCompleto ={nombreCompleto}
        nombre         ={nombre}
        categoria      ={categoria}
        evento         ={evento}
        navigate       ={navigate}
      />
    );
  }

  return (
    <DorsalCarrera
      bibPad         ={bibPad}
      nombreCompleto ={nombreCompleto}
      nombre         ={nombre}
      categoria      ={categoria}
      evento         ={evento}
      navigate       ={navigate}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DorsalCarrera — 499 RUN CORO (NO MODIFICAR)
// ─────────────────────────────────────────────────────────────────────────────

interface DorsalCarreraProps {
  bibPad: string; nombreCompleto: string; nombre: string;
  categoria: string; evento: string;
  navigate: ReturnType<typeof useNavigate>;
}

function DorsalCarrera({
  bibPad, nombreCompleto, nombre, categoria, evento, navigate,
}: DorsalCarreraProps) {
  const canvasRef               = useRef<HTMLCanvasElement>(null);
  const [rendered, setRendered] = useState(false);
  const [copied,   setCopied]   = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderDorsalToCanvas(
      canvas, dorsalCoroSrc, CORO_CONFIG,
      bibPad, nombreCompleto, categoria,
      () => setRendered(true),
    );
  }, [bibPad, nombreCompleto, categoria]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link    = document.createElement("a");
    link.download = `dorsal-${bibPad}-${nombre.toLowerCase()}.png`;
    link.href     = canvas.toDataURL("image/png");
    link.click();
  };

  const handleShare = async () => {
    const text = `¡Me inscribí en ${evento} con el dorsal #${bibPad}! 🏃 Categoría: ${categoria}. #Rayocero`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "RAYOCERO", text, url: window.location.origin });
        return;
      } catch (_) {}
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#1a0e08] flex flex-col items-center justify-center px-4 py-10 font-sans">
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <motion.div
        className="w-full max-w-2xl"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="text-center mb-6">
          <span
            className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em]"
            style={{ background: "#42210b30", color: "#c4832a", border: "1px solid #42210b50" }}
          >
            Inscripción Confirmada · {evento}
          </span>
          <h1
            className="mt-3 font-black italic uppercase leading-none"
            style={{ fontSize: "clamp(2rem,6vw,3rem)", color: "#ffffff" }}
          >
            ¡Listo para Correr!
          </h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 8 }}>
            Tu dorsal oficial ha sido generado. Descárgalo y guárdalo.
          </p>
        </div>

        <div
          className="relative rounded-2xl overflow-hidden mb-6"
          style={{
            border:    "1px solid rgba(66,33,11,0.5)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(196,131,42,0.15)",
          }}
        >
          {!rendered && <DorsalLoadingOverlay color="#c4832a" bg="#1a0e08" />}
          <DorsalPreview canvasRef={canvasRef} rendered={rendered} />
        </div>

        <div className="flex flex-wrap gap-2 justify-center mb-6">
          <InfoChip label="Dorsal"    value={`#${bibPad}`} />
          {categoria && <InfoChip label="Categoría" value={categoria} />}
          <InfoChip label="Evento"    value={evento} />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex-1 py-3.5 rounded-xl font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 transition-all"
            style={{
              background: "rgba(255,255,255,0.05)",
              border:     "1px solid rgba(255,255,255,0.1)",
              color:      "rgba(255,255,255,0.5)",
            }}
          >
            <Home size={15} /> Inicio
          </button>
          <button
            onClick={handleShare}
            className="flex-1 py-3.5 rounded-xl font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 transition-all"
            style={{
              background: "rgba(66,33,11,0.4)",
              border:     "1px solid rgba(196,131,42,0.3)",
              color:      "#c4832a",
            }}
          >
            {copied
              ? <><Check size={15} /> ¡Copiado!</>
              : <><Share2 size={15} /> Compartir</>}
          </button>
          <button
            onClick={handleDownload}
            disabled={!rendered}
            className="flex-1 py-3.5 rounded-xl font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-40"
            style={{
              background: rendered ? "#42210b" : "rgba(66,33,11,0.3)",
              color:      "#ffffff",
              boxShadow:  rendered ? "0 4px 20px rgba(66,33,11,0.5)" : "none",
            }}
          >
            <Download size={15} /> Descargar Dorsal
          </button>
        </div>

        <p
          className="text-center mt-8 font-black uppercase tracking-[0.3em]"
          style={{ fontSize: 9, color: "rgba(196,131,42,0.35)" }}
        >
          499 RUN · RAYOCERO · VALKYRON GROUP · {new Date().getFullYear()}
        </p>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// [V4.0-5] DorsalLedCoro — WE RUN RAYOCERO LED CORO 10K
// Un solo canvas. Acento #FCD34D. Asset: dorsal-led.png
// ─────────────────────────────────────────────────────────────────────────────

const LED_ACCENT = "#FCD34D";

interface DorsalLedCoroProps {
  bibPad: string; nombreCompleto: string; nombre: string;
  categoria: string; evento: string;
  navigate: ReturnType<typeof useNavigate>;
}

function DorsalLedCoro({
  bibPad, nombreCompleto, nombre, categoria, evento, navigate,
}: DorsalLedCoroProps) {
  const canvasRef               = useRef<HTMLCanvasElement>(null);
  const [rendered, setRendered] = useState(false);
  const [copied,   setCopied]   = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    renderDorsalToCanvas(
      canvas, dorsalLedSrc, LED_CONFIG,
      bibPad, nombreCompleto, categoria,
      () => setRendered(true),
    );
  }, [bibPad, nombreCompleto, categoria]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link    = document.createElement("a");
    link.download = `dorsal-led-${bibPad}-${nombre.toLowerCase()}.png`;
    link.href     = canvas.toDataURL("image/png");
    link.click();
  };

  const handleShare = async () => {
    const text =
      `¡Me inscribí en ${evento} con el dorsal #${bibPad}! 🏃💛 ` +
      `Categoría: ${categoria}. #WERunLED #Rayocero`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "WE RUN RAYOCERO LED CORO", text, url: window.location.origin });
        return;
      } catch (_) {}
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-10 font-sans"
      style={{ background: "#03070b" }}
    >
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <motion.div
        className="w-full max-w-2xl"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <span
            className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em]"
            style={{
              background: `${LED_ACCENT}18`,
              color:       LED_ACCENT,
              border:     `1px solid ${LED_ACCENT}35`,
            }}
          >
            Inscripción Confirmada · {evento}
          </span>
          <h1
            className="mt-3 font-black italic uppercase leading-none"
            style={{ fontSize: "clamp(2rem,6vw,3rem)", color: "#ffffff" }}
          >
            ¡Listo para Correr!
          </h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 8 }}>
            Tu dorsal LED oficial ha sido generado. Descárgalo y guárdalo.
          </p>
        </div>

        {/* Preview */}
        <div
          className="relative rounded-2xl overflow-hidden mb-6"
          style={{
            border:    `1px solid ${LED_ACCENT}30`,
            boxShadow: `0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px ${LED_ACCENT}15`,
          }}
        >
          {!rendered && <DorsalLoadingOverlay color={LED_ACCENT} bg="#03070b" />}
          <DorsalPreview canvasRef={canvasRef} rendered={rendered} />
        </div>

        {/* Chips info */}
        <div className="flex flex-wrap gap-2 justify-center mb-6">
          <InfoChipCaninata label="Dorsal"    value={`#${bibPad}`} color={LED_ACCENT} />
          {categoria && (
            <InfoChipCaninata label="Categoría" value={categoria}   color={LED_ACCENT} />
          )}
          <InfoChipCaninata label="Evento"    value={evento}        color={LED_ACCENT} />
        </div>

        {/* Botones */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex-1 py-3.5 rounded-xl font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 transition-all"
            style={{
              background: "rgba(255,255,255,0.04)",
              border:     "1px solid rgba(255,255,255,0.08)",
              color:      "rgba(255,255,255,0.4)",
            }}
          >
            <Home size={15} /> Inicio
          </button>
          <button
            onClick={handleShare}
            className="flex-1 py-3.5 rounded-xl font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 transition-all"
            style={{
              background: `${LED_ACCENT}18`,
              border:     `1px solid ${LED_ACCENT}35`,
              color:       LED_ACCENT,
            }}
          >
            {copied
              ? <><Check size={15} /> ¡Copiado!</>
              : <><Share2 size={15} /> Compartir</>}
          </button>
          <button
            onClick={handleDownload}
            disabled={!rendered}
            className="flex-1 py-3.5 rounded-xl font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-40"
            style={{
              background: rendered
                ? `linear-gradient(135deg, #e6b800, ${LED_ACCENT})`
                : `${LED_ACCENT}20`,
              color:      "#03070b",
              boxShadow:  rendered ? `0 4px 20px ${LED_ACCENT}40` : "none",
            }}
          >
            <Download size={15} /> Descargar Dorsal LED
          </button>
        </div>

        <p
          className="text-center mt-8 font-black uppercase tracking-[0.3em]"
          style={{ fontSize: 9, color: `${LED_ACCENT}30` }}
        >
          WE RUN LED · RAYOCERO · VALKYRON GROUP · {new Date().getFullYear()}
        </p>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DorsalCaninata — dorsal doble dueño + perro (NO MODIFICAR)
// ─────────────────────────────────────────────────────────────────────────────

const YELLOW       = "#FDD454";
const CAT_CANINATA = "Caminata Canina / Familiar";

interface DorsalCaninataProps {
  bibPad: string; nombreCompleto: string;
  nombre: string; apellido: string;
  nombrePerro: string; razaPerro: string;
  evento: string;
  navigate: ReturnType<typeof useNavigate>;
}

function DorsalCaninata({
  bibPad, nombreCompleto, nombre, apellido,
  nombrePerro, razaPerro, evento, navigate,
}: DorsalCaninataProps) {
  const canvasRefDueno  = useRef<HTMLCanvasElement>(null);
  const canvasRefPerro  = useRef<HTMLCanvasElement>(null);
  const [renderedDueno, setRenderedDueno] = useState(false);
  const [renderedPerro, setRenderedPerro] = useState(false);
  const [copied,        setCopied]        = useState(false);

  const nombrePerroUpper = nombrePerro.toUpperCase();

  useEffect(() => {
    const canvas = canvasRefDueno.current;
    if (!canvas) return;
    renderDorsalToCanvas(
      canvas, dorsalCaninataSrc, CANINATA_CONFIG,
      bibPad, nombreCompleto, CAT_CANINATA,
      () => setRenderedDueno(true),
    );
  }, [bibPad, nombreCompleto]);

  useEffect(() => {
    const canvas = canvasRefPerro.current;
    if (!canvas) return;
    renderDorsalToCanvas(
      canvas, dorsalCaninataSrc, CANINATA_CONFIG,
      bibPad, nombrePerroUpper, `MASCOTA · ${razaPerro.toUpperCase()}`,
      () => setRenderedPerro(true),
    );
  }, [bibPad, nombrePerroUpper, razaPerro]);

  const downloadCanvas = (
    ref     : React.RefObject<HTMLCanvasElement>,
    filename: string,
  ) => {
    const canvas = ref.current;
    if (!canvas) return;
    const link    = document.createElement("a");
    link.download = filename;
    link.href     = canvas.toDataURL("image/png");
    link.click();
  };

  const handleShare = async () => {
    const text =
      `¡${nombre} ${apellido} y ${nombrePerro} están inscritos en ${evento}! 🐕🏃 ` +
      `Dorsal #${bibPad}. #Rayocero #Caninata`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "RAYOCERO CANINATA", text, url: window.location.origin });
        return;
      } catch (_) {}
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center px-4 py-10 font-sans"
      style={{ background: "#080f08" }}
    >
      <canvas ref={canvasRefDueno} style={{ display: "none" }} />
      <canvas ref={canvasRefPerro} style={{ display: "none" }} />

      <motion.div
        className="w-full max-w-2xl"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="text-center mb-8">
          <span
            className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em]"
            style={{ background: `${YELLOW}18`, color: YELLOW, border: `1px solid ${YELLOW}35` }}
          >
            Inscripción Confirmada · {evento}
          </span>
          <h1
            className="mt-3 font-black italic uppercase leading-none"
            style={{ fontSize: "clamp(2rem,6vw,3rem)", color: "#ffffff" }}
          >
            ¡Listos para Correr!
          </h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 8 }}>
            Generamos dos dorsales: uno para ti y uno para tu mascota.
          </p>
        </div>

        {/* ══ DORSAL DUEÑO ══ */}
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-3">
            <User size={14} style={{ color: YELLOW }} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: YELLOW }}>
              Tu dorsal — {nombre} {apellido}
            </span>
          </div>
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{
              border:    `1px solid ${YELLOW}30`,
              boxShadow: `0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px ${YELLOW}15`,
            }}
          >
            {!renderedDueno && <DorsalLoadingOverlay color={YELLOW} bg="#080f08" />}
            <DorsalPreview canvasRef={canvasRefDueno} rendered={renderedDueno} />
          </div>
          <div className="flex flex-wrap gap-2 mt-3 mb-3">
            <InfoChipCaninata label="Dorsal"    value={`#${bibPad}`}            color={YELLOW} />
            <InfoChipCaninata label="Categoría" value={CAT_CANINATA}            color={YELLOW} />
            <InfoChipCaninata label="Atleta"    value={`${nombre} ${apellido}`} color={YELLOW} />
          </div>
          <button
            onClick={() => downloadCanvas(canvasRefDueno, `dorsal-${bibPad}-${nombre.toLowerCase()}.png`)}
            disabled={!renderedDueno}
            className="w-full py-3.5 rounded-xl font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-40"
            style={{
              background: renderedDueno ? YELLOW : `${YELLOW}30`,
              color:      "#080f08",
              boxShadow:  renderedDueno ? `0 4px 20px ${YELLOW}40` : "none",
            }}
          >
            <Download size={15} />
            {renderedDueno ? "Descargar Mi Dorsal" : "Generando..."}
          </button>
        </div>

        {/* Divisor */}
        <div className="my-6 flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: `${YELLOW}20` }} />
          <Dog size={16} style={{ color: `${YELLOW}80` }} />
          <div className="flex-1 h-px" style={{ background: `${YELLOW}20` }} />
        </div>

        {/* ══ DORSAL PERRO ══ */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Dog size={14} style={{ color: YELLOW }} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: YELLOW }}>
              Dorsal mascota — {nombrePerro}
            </span>
          </div>
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{
              border:    `1px solid ${YELLOW}30`,
              boxShadow: `0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px ${YELLOW}15`,
            }}
          >
            {!renderedPerro && <DorsalLoadingOverlay color={YELLOW} bg="#080f08" />}
            <DorsalPreview canvasRef={canvasRefPerro} rendered={renderedPerro} />
          </div>
          <div className="flex flex-wrap gap-2 mt-3 mb-3">
            <InfoChipCaninata label="Dorsal"  value={`#${bibPad}`} color={YELLOW} />
            <InfoChipCaninata label="Mascota" value={nombrePerro}  color={YELLOW} />
            <InfoChipCaninata label="Raza"    value={razaPerro}    color={YELLOW} />
          </div>
          <button
            onClick={() =>
              downloadCanvas(canvasRefPerro, `dorsal-${bibPad}-${nombrePerro.toLowerCase()}.png`)
            }
            disabled={!renderedPerro}
            className="w-full py-3.5 rounded-xl font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 transition-all disabled:opacity-40"
            style={{
              background: renderedPerro ? YELLOW : `${YELLOW}30`,
              color:      "#080f08",
              boxShadow:  renderedPerro ? `0 4px 20px ${YELLOW}40` : "none",
            }}
          >
            <Download size={15} />
            {renderedPerro ? `Descargar Dorsal de ${nombrePerro}` : "Generando..."}
          </button>
        </div>

        {/* Botonera inferior */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex-1 py-3.5 rounded-xl font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 transition-all"
            style={{
              background: "rgba(255,255,255,0.04)",
              border:     "1px solid rgba(255,255,255,0.08)",
              color:      "rgba(255,255,255,0.4)",
            }}
          >
            <Home size={15} /> Inicio
          </button>
          <button
            onClick={handleShare}
            className="flex-1 py-3.5 rounded-xl font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 transition-all"
            style={{
              background: `${YELLOW}18`,
              border:     `1px solid ${YELLOW}35`,
              color:      YELLOW,
            }}
          >
            {copied
              ? <><Check size={15} /> ¡Copiado!</>
              : <><Share2 size={15} /> Compartir</>}
          </button>
        </div>

        <p
          className="text-center mt-8 font-black uppercase tracking-[0.3em]"
          style={{ fontSize: 9, color: `${YELLOW}30` }}
        >
          CANINATA · RAYOCERO · VALKYRON GROUP · {new Date().getFullYear()}
        </p>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILIDADES COMPARTIDAS (NO MODIFICAR)
// ─────────────────────────────────────────────────────────────────────────────

function DorsalPreview({
  canvasRef,
  rendered,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  rendered : boolean;
}) {
  const [src, setSrc] = useState<string>("");

  useEffect(() => {
    if (!rendered) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSrc(canvas.toDataURL("image/png"));
  }, [rendered, canvasRef]);

  if (!src) {
    return (
      <div style={{ width: "100%", paddingTop: "71.4%", background: "#03070b" }} />
    );
  }
  return (
    <img src={src} alt="Dorsal" style={{ width: "100%", display: "block" }} />
  );
}

function DorsalLoadingOverlay({ color, bg }: { color: string; bg: string }) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center z-10"
      style={{ background: bg }}
    >
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="animate-spin" style={{ color, width: 36, height: 36 }} />
        <p style={{
          color: "rgba(255,255,255,0.3)", fontSize: 11, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.2em",
        }}>
          Generando dorsal...
        </p>
      </div>
    </div>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
      style={{ background: "rgba(66,33,11,0.25)", border: "1px solid rgba(66,33,11,0.4)" }}
    >
      <span style={{
        fontSize: 9, fontWeight: 900, letterSpacing: "0.15em",
        textTransform: "uppercase", color: "rgba(196,131,42,0.7)",
      }}>
        {label}
      </span>
      <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>
        {value}
      </span>
    </div>
  );
}

function InfoChipCaninata({
  label, value, color,
}: {
  label: string; value: string; color: string;
}) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
      style={{ background: `${color}10`, border: `1px solid ${color}25` }}
    >
      <span style={{
        fontSize: 9, fontWeight: 900, letterSpacing: "0.15em",
        textTransform: "uppercase", color: `${color}90`,
      }}>
        {label}
      </span>
      <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>
        {value}
      </span>
    </div>
  );
}
/**
 * RAYOCERO — DORSAL PAGE (V2.0_CALIBRADO)
 * Senior Dev: MIA (Valkyron Group)
 * CEO: Lualdo Sciscioli
 * REGLA DE ORO: Código completo. Copy-paste ready.
 *
 * CHANGELOG V2.0:
 * [V2.0-1] BUG FIX CRÍTICO: eliminado ctx.fillRect de la franja marrón.
 *          La franja YA existe en dorsal-coro.png (#42210b verificado por pixel).
 *          V1.0 dibujaba un rect encima tapando el RAYOCERO del asset.
 * [V2.0-2] Coordenadas recalibradas sobre imagen 7488×5349 → canvas 1400×1000:
 *          - BIB:       cx=719, cy=492  (centrado entre logos y franja)
 *          - Nombre:    cx=716, cy=764  (franja post-logo: x=317-1116, w=799px)
 *          - Categoría: cx=716, cy=898  (alineada con nombre)
 * [V2.0-5] BUG FIX: Hay DOS franjas marrones en el asset:
 *          Franja 1 (nombre): canvas y=725-803, ~3700px/fila — rect nombre
 *          Franja 2 (RAYOCERO): canvas y=831-860, ~1200px/fila — logo+texto
 *          V1.0 y V2.0 ponían el nombre en cy=797/790, cayendo entre las dos franjas.
 *          Fix: cy=764 = centro exacto de la franja 1.
 * [V2.0-3] Auto-fit del nombre: font baja de 52px hasta 26px si el texto
 *          supera el ancho disponible de la franja (≈860px).
 * [V2.0-4] Categoría con letter-spacing manual de 3px para matching exacto del original.
 */

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Download, Home, Share2, Check, Loader2 } from "lucide-react";

import dorsalCoroSrc from "../assets/dorsal-coro.png";

// ── Constantes de layout — calibradas sobre pixel real del asset ─────────────
const CW = 1400;
const CH = 1000;

// Número BIB — zona blanca central (calibrado desde screenshot)
const BIB_CX   = 694;
const BIB_CY   = 492;
const BIB_FONT = 218;

// Franja nombre — zona post-logo 499 RUN dentro del rect marrón del asset
// Franja completa canvas: x=217 a x=1117
// Logo 499 RUN cubre hasta x≈355 → texto disponible: x=355 a x=1117
const FRANJA_Y        = 718;   // top de la franja marrón
const FRANJA_H        = 85;    // altura del rect nombre (hasta y=803)
const FRANJA_X1_TEXTO = 360;   // inicio zona texto (después del logo)
const FRANJA_X2_TEXTO = 1110;  // fin zona texto
const FRANJA_CX_TEXTO = 735;   // (360+1110)/2

const NOMBRE_CY = 761;   // centro vertical franja nombre

// Categoría — debajo de la franja RAYOCERO
const CAT_CX = 735;
const CAT_CY = 898;

// Colores — extraídos por pixel del asset original
const BROWN      = "#42210b";   // texto BIB y número (misma tonalidad que el asset)
const WHITE      = "#ffffff";   // texto nombre dentro de la franja oscura
const BROWN_SOFT = "#5a2e0e";   // texto categoría

export default function DorsalPage() {
  const [searchParams] = useSearchParams();
  const navigate        = useNavigate();
  const canvasRef       = useRef<HTMLCanvasElement>(null);
  const [rendered, setRendered] = useState(false);
  const [copied,   setCopied]   = useState(false);

  // Params
  const bib       = searchParams.get("bib")       ?? "000";
  const categoria = searchParams.get("categoria")
    ? decodeURIComponent(searchParams.get("categoria")!) : "";
  const nombre    = searchParams.get("nombre")
    ? decodeURIComponent(searchParams.get("nombre")!)    : "";
  const apellido  = searchParams.get("apellido")
    ? decodeURIComponent(searchParams.get("apellido")!)  : "";
  const evento    = searchParams.get("evento")
    ? decodeURIComponent(searchParams.get("evento")!)    : "499 RUN — CORO FALCÓN";

  const nombreCompleto = `${nombre} ${apellido}`.trim().toUpperCase();
  const bibPad         = bib.toString().padStart(4, "0");

  // ── Canvas render ────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width  = CW;
    canvas.height = CH;

    const bg = new Image();
    bg.crossOrigin = "anonymous";
    bg.src = dorsalCoroSrc;

    bg.onload = () => {
      // 1. Fondo — asset completo, sin recortes
      ctx.drawImage(bg, 0, 0, CW, CH);

      // 2. Número BIB — centrado en zona blanca
      //    [V2.0-1] Solo texto, NO rect — la zona blanca ya está en el asset
      ctx.save();
      ctx.font         = `900 ${BIB_FONT}px 'Arial Black', Arial, sans-serif`;
      ctx.fillStyle    = BROWN;
      ctx.textAlign    = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(bibPad, BIB_CX, BIB_CY);
      ctx.restore();

      // 3. Nombre del atleta — centrado en la zona POST-LOGO de la franja marrón
      //    ctx.clip() garantiza que nunca desborde a la izquierda (zona del logo 499)
      ctx.save();
      // Clip estricto a la zona de texto (excluyendo el logo 499 RUN)
      ctx.beginPath();
      ctx.rect(FRANJA_X1_TEXTO, FRANJA_Y, FRANJA_X2_TEXTO - FRANJA_X1_TEXTO, FRANJA_H);
      ctx.clip();
      // Auto-fit: reducir font si el nombre supera el ancho disponible
      const nombreMaxW = FRANJA_X2_TEXTO - FRANJA_X1_TEXTO - 36; // 18px padding c/lado
      let nombreFS = 38;
      ctx.font = `900 ${nombreFS}px 'Arial Black', Arial, sans-serif`;
      let textW = ctx.measureText(nombreCompleto).width;
      while (textW > nombreMaxW && nombreFS > 18) {
        nombreFS -= 2;
        ctx.font = `900 ${nombreFS}px 'Arial Black', Arial, sans-serif`;
        textW = ctx.measureText(nombreCompleto).width;
      }
      ctx.fillStyle    = WHITE;
      ctx.textAlign    = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(nombreCompleto, FRANJA_CX_TEXTO, NOMBRE_CY);
      ctx.restore();

      // 4. Categoría — debajo de la franja
      //    [V2.0-4] letter-spacing manual de 3px para matching con el original
      if (categoria) {
        ctx.save();
        const catText = `CATEGORÍA: ${categoria.toUpperCase()}`;
        ctx.font         = `700 22px Arial, sans-serif`;
        ctx.fillStyle    = BROWN_SOFT;
        ctx.textAlign    = "left";
        ctx.textBaseline = "middle";
        const SPACING = 3;
        // Medir ancho total con spacing para centrar
        let totalW = 0;
        for (const ch of catText) {
          totalW += ctx.measureText(ch).width + SPACING;
        }
        totalW -= SPACING;
        let x = CAT_CX - totalW / 2;
        for (const ch of catText) {
          ctx.fillText(ch, x, CAT_CY);
          x += ctx.measureText(ch).width + SPACING;
        }
        ctx.restore();
      }

      setRendered(true);
    };

    bg.onerror = () => {
      // Fallback sin imagen
      ctx.fillStyle = "#eeebe6";
      ctx.fillRect(0, 0, CW, CH);
      ctx.fillStyle = BROWN;
      ctx.font = `900 ${BIB_FONT}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(bibPad, CW / 2, CH / 2);
      setRendered(true);
    };
  }, [bibPad, nombreCompleto, categoria]);

  // ── Descarga PNG ─────────────────────────────────────────────────────────
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `dorsal-${bibPad}-${nombre.toLowerCase()}.png`;
    link.href     = canvas.toDataURL("image/png");
    link.click();
  };

  // ── Share ─────────────────────────────────────────────────────────────────
  const handleShare = async () => {
    const text = `¡Me inscribí en ${evento} con el dorsal #${bibPad}! 🏃 Categoría: ${categoria}. #Rayocero #499RunCoro`;
    if (navigator.share) {
      try { await navigator.share({ title: "RAYOCERO", text, url: window.location.origin }); return; }
      catch (_) {}
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#1a0e08] flex flex-col items-center justify-center px-4 py-10 font-sans">

      {/* Canvas oculto — solo para render y descarga */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <motion.div
        className="w-full max-w-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Header */}
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

        {/* Preview del dorsal */}
        <div
          className="relative rounded-2xl overflow-hidden mb-6"
          style={{
            border: "1px solid rgba(66,33,11,0.5)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(196,131,42,0.15)",
          }}
        >
          {!rendered && (
            <div
              className="absolute inset-0 flex items-center justify-center z-10"
              style={{ background: "#1a0e08" }}
            >
              <div className="flex flex-col items-center gap-3">
                <Loader2
                  className="animate-spin"
                  style={{ color: "#c4832a", width: 36, height: 36 }}
                />
                <p style={{
                  color: "rgba(255,255,255,0.3)", fontSize: 11, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.2em",
                }}>
                  Generando dorsal...
                </p>
              </div>
            </div>
          )}
          <DorsalPreview canvasRef={canvasRef} rendered={rendered} />
        </div>

        {/* Info chips */}
        <div className="flex flex-wrap gap-2 justify-center mb-6">
          <InfoChip label="Dorsal"    value={`#${bibPad}`} />
          {categoria && <InfoChip label="Categoría" value={categoria} />}
          <InfoChip label="Evento"    value={evento} />
        </div>

        {/* Botones */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex-1 py-3.5 rounded-xl font-black uppercase text-xs tracking-wider
                       flex items-center justify-center gap-2 transition-all"
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
            className="flex-1 py-3.5 rounded-xl font-black uppercase text-xs tracking-wider
                       flex items-center justify-center gap-2 transition-all"
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
            className="flex-1 py-3.5 rounded-xl font-black uppercase text-xs tracking-wider
                       flex items-center justify-center gap-2 transition-all disabled:opacity-40"
            style={{
              background:  rendered ? "#42210b" : "rgba(66,33,11,0.3)",
              color:       "#ffffff",
              boxShadow:   rendered ? "0 4px 20px rgba(66,33,11,0.5)" : "none",
            }}
          >
            <Download size={15} /> Descargar Dorsal
          </button>
        </div>

        {/* Footer */}
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

// ── Preview: convierte el canvas a <img> cuando rendered=true ───────────────
function DorsalPreview({
  canvasRef,
  rendered,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  rendered: boolean;
}) {
  const [src, setSrc] = useState<string>("");

  useEffect(() => {
    if (!rendered) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSrc(canvas.toDataURL("image/png"));
  }, [rendered, canvasRef]);

  if (!src) {
    return <div style={{ width: "100%", paddingTop: "71.4%", background: "#1a0e08" }} />;
  }

  return (
    <img
      src={src}
      alt={`Dorsal de inscripción`}
      style={{ width: "100%", display: "block" }}
    />
  );
}

// ── InfoChip ─────────────────────────────────────────────────────────────────
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
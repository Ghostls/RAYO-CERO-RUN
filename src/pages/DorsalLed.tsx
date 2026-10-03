/**
 * RAYOCERO — DORSAL LED (V1.1 — MOBILE FIRST + PERFORMANCE)
 * Senior Dev: MIA (Valkyron Group)
 * CEO: Lualdo Sciscioli
 * Architecture: React / TypeScript / Framer Motion / Canvas 2D
 * REGLA DE ORO: Evolución sin Destrucción. Código completo. Copy-paste ready.
 *
 * CHANGELOG V1.1 (evoluciona sobre V1.0):
 * [V1.1-1]  Precarga a nivel de módulo: el arte (fetchpriority high + decode())
 *           y las fuentes (preconnect + stylesheet) arrancan apenas se
 *           descarga el chunk. Con el prefetch de RegistrationForm V37.7, la
 *           página abre con todo ya en caché.
 * [V1.1-2]  Fuentes no bloqueantes: espera máx. 1.2 s (antes 3.5 s); si
 *           llegan después, el canvas se redibuja con la fuente final.
 *           Pesos reducidos a 4: Big Shoulders 800/900, Chakra Petch 500/700.
 * [V1.1-3]  Canvas de pantalla dimensionado al contenedor × DPR (máx. 2x) en
 *           lugar de la resolución nativa del PNG → muchos menos píxeles por
 *           frame en móvil.
 * [V1.1-4]  Capa base cacheada (arte + nombre + categoría) en canvas
 *           offscreen; durante la decodificación solo se redibuja el número.
 * [V1.1-5]  Exportación a resolución nativa en canvas temporal, tope 16 MP
 *           (límite de canvas en iOS Safari), JPEG 0.92 (codifica varias veces
 *           más rápido que PNG en teléfonos), blob cacheado y memoria liberada.
 *           Se pre-genera en idle al terminar la animación: Compartir abre al
 *           instante y no pierde la activación de usuario en iOS.
 * [V1.1-6]  Piso de la Red animado con transform (GPU) en lugar de
 *           background-position (repaint por frame).
 * [V1.1-7]  Secuencia de entrada más corta: 600 ms + 900 ms (antes 900 + 1300).
 * [V1.1-8]  Mobile first: título y datos reservan su espacio desde el inicio
 *           (sin saltos de layout), acciones en 2 columnas con objetivos
 *           táctiles ≥ 52 px, safe areas de iPhone, 100dvh, sin tap highlight.
 * [V1.1-9]  Guardado nativo en móvil: si el navegador comparte archivos
 *           (iOS/Android), el botón principal abre la hoja nativa (Guardar
 *           imagen / WhatsApp / Instagram). En navegadores internos
 *           (Instagram, Facebook, WhatsApp) o si la descarga falla → vista de
 *           imagen con "mantén presionada para guardar".
 * [V1.1-10] Estado de error si el arte no carga.
 * [V1.1-11] Funciones de dibujo parametrizadas por (W, H): mismas proporciones
 *           a cualquier resolución. Lógica de capas de V1.0 intacta.
 *
 * CHANGELOG V1.0 (base preservada):
 * [LED-1] Dorsal compuesto en <canvas> sobre el PNG original.
 * [LED-2] Número en tubo de neón (base oscura + reflejo naranja + halo cian +
 *         núcleo blanco + contorno de tubo), Big Shoulders Display.
 * [LED-3] Nombre auto-ajustado al 78% del ancho; categoría en cápsula.
 * [LED-4] Secuencia Tron Legacy: línea de luz → marco → rez → decodificación.
 * [LED-5] Descargar y Compartir.
 *
 * ASSET: si dorsal-led.png pesa más de ~600 KB, convertirlo a WebP y cambiar
 *        el import (ver respuesta del asistente para el comando).
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Download, Share2, UserPlus, Loader2, Image as ImageIcon, X } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import dorsalLedSrc from "@/assets/dorsal-led.png";

// ---------------------------------------------------------------------------
// TOKENS
// ---------------------------------------------------------------------------

const T = {
  void:    "#02040a",
  panel:   "#060b16",
  cyan:    "#19e6ff",
  orange:  "#ff7a1a",
  ink:     "#eaf6ff",
  dim:     "#7d93a8",
} as const;

const FONT_DISPLAY = `"Big Shoulders Display", "Arial Narrow", Impact, sans-serif`;
const FONT_UI      = `"Chakra Petch", "Segoe UI", system-ui, sans-serif`;
// [V1.1-2] 4 pesos en total
const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@800;900" +
  "&family=Chakra+Petch:wght@500;700&display=swap";
const FONT_WAIT_MS = 1200;

const LED_EVENT = {
  fecha: "31 OCT 2026",
  hora:  "07:00 PM",
  lugar: "Coro, Falcón",
} as const;

/**
 * Arte por modalidad. El PNG actual tiene "10K" impreso en la esquina.
 * Cuando exista el arte 5K: importarlo y asignarlo en "5K".
 */
const DORSAL_ASSETS: Record<string, string> = {
  "10K": dorsalLedSrc,
  "5K":  dorsalLedSrc,
};

/** Posiciones relativas al alto/ancho del arte. */
const L = {
  numberY:    0.475,
  numberSize: 0.235,
  nameY:      0.758,
  nameSize:   0.06,
  nameMaxW:   0.78,
  catY:       0.893,
  catSize:    0.027,
  catMaxW:    0.9,
} as const;

const BOOT_MS = 600;  // [V1.1-7]
const REZ_MS  = 900;  // [V1.1-7]
const RADIUS  = 14;

/** [V1.1-5] Límite seguro de área de canvas en iOS Safari. */
const EXPORT_MAX_PIXELS = 16_000_000;
const EXPORT_MIME = "image/jpeg";
const EXPORT_QUALITY = 0.92;

// ---------------------------------------------------------------------------
// [V1.1-1] PRECARGA A NIVEL DE MÓDULO
// ---------------------------------------------------------------------------

const IMG_CACHE = new Map<string, Promise<HTMLImageElement>>();

function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = IMG_CACHE.get(src);
  if (cached) return cached;
  const p = new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.decoding = "async";
    (i as HTMLImageElement & { fetchPriority?: string }).fetchPriority = "high";
    i.onload = () => {
      const decoded = typeof i.decode === "function" ? i.decode().catch(() => undefined) : Promise.resolve();
      decoded.then(() => resolve(i));
    };
    i.onerror = () => { IMG_CACHE.delete(src); reject(new Error("img")); };
    i.src = src;
  });
  IMG_CACHE.set(src, p);
  return p;
}

let fontsPromise: Promise<void> | null = null;

function ensureLedFonts(): Promise<void> {
  if (fontsPromise) return fontsPromise;
  if (typeof document === "undefined") return Promise.resolve();

  const addLink = (attrs: Record<string, string>): HTMLLinkElement => {
    const l = document.createElement("link");
    Object.entries(attrs).forEach(([k, v]) => l.setAttribute(k, v));
    document.head.appendChild(l);
    return l;
  };

  let link = document.querySelector<HTMLLinkElement>("link[data-led-fonts]");
  if (!link) {
    addLink({ rel: "preconnect", href: "https://fonts.googleapis.com" });
    addLink({ rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" });
  }

  const sheet = new Promise<void>((resolve) => {
    if (link?.dataset.loaded === "1") { resolve(); return; }
    if (!link) link = addLink({ rel: "stylesheet", href: FONT_HREF, "data-led-fonts": "1" });
    link.addEventListener("load", () => { link!.dataset.loaded = "1"; resolve(); }, { once: true });
    link.addEventListener("error", () => resolve(), { once: true });
  });

  fontsPromise = sheet
    .then(() => Promise.all([
      document.fonts.load(`900 100px "Big Shoulders Display"`),
      document.fonts.load(`800 100px "Big Shoulders Display"`),
      document.fonts.load(`500 40px "Chakra Petch"`),
      document.fonts.load(`700 40px "Chakra Petch"`),
    ]))
    .then(() => undefined)
    .catch(() => undefined);

  return fontsPromise;
}

// Arranca descargas en cuanto el chunk se evalúa (prefetch desde el formulario)
if (typeof window !== "undefined") {
  void ensureLedFonts();
  void loadImage(dorsalLedSrc).catch(() => undefined);
}

// ---------------------------------------------------------------------------
// DETECCIÓN + ROUTER
// ---------------------------------------------------------------------------

/** Detecta el evento LED por nombre (cubre registros previos a V37.5). */
export const isLedEvento = (evento: string = ""): boolean =>
  /\bled\b/i.test(evento) || /we\s*run\s*rayocero/i.test(evento);

/** Enrutador opcional de /dorsal (App.tsx V8.0 usa su propio DorsalSwitch). */
export function DorsalRouter({ fallback }: { fallback: ReactNode }) {
  const [sp] = useSearchParams();
  const tipo = sp.get("tipo");
  const isLed =
    tipo === "led" || (tipo !== "caninata" && isLedEvento(sp.get("evento") ?? ""));
  return isLed ? <DorsalLed /> : <>{fallback}</>;
}

// ---------------------------------------------------------------------------
// HOOKS DE CARGA
// ---------------------------------------------------------------------------

/** [V1.1-2] ready = fuentes listas o timeout; version sube cuando llegan. */
function useLedFonts(): { ready: boolean; version: number } {
  const [ready,   setReady]   = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => { if (alive) setReady(true); }, FONT_WAIT_MS);
    ensureLedFonts().then(() => {
      if (!alive) return;
      setReady(true);
      setVersion((v) => v + 1);
    });
    return () => { alive = false; clearTimeout(t); };
  }, []);

  return { ready, version };
}

/** [V1.1-10] Imagen desde caché de módulo, con estado de error. */
function useImageAsset(src: string): { img: HTMLImageElement | null; failed: boolean } {
  const [state, setState] = useState<{ img: HTMLImageElement | null; failed: boolean }>(
    { img: null, failed: false },
  );
  useEffect(() => {
    let alive = true;
    setState({ img: null, failed: false });
    loadImage(src)
      .then((i) => { if (alive) setState({ img: i, failed: false }); })
      .catch(() => { if (alive) setState({ img: null, failed: true }); });
    return () => { alive = false; };
  }, [src]);
  return state;
}

// ---------------------------------------------------------------------------
// CANVAS: PRIMITIVAS
// ---------------------------------------------------------------------------

type Ctx = CanvasRenderingContext2D;

function measureSpaced(ctx: Ctx, text: string, spacing: number): number {
  const chars = Array.from(text);
  const glyphs = chars.reduce((acc, c) => acc + ctx.measureText(c).width, 0);
  return glyphs + spacing * Math.max(0, chars.length - 1);
}

function drawSpacedFrom(
  ctx: Ctx, text: string, xLeft: number, y: number, spacing: number,
  mode: "fill" | "stroke" = "fill",
): void {
  ctx.textAlign = "left";
  let x = xLeft;
  for (const c of Array.from(text)) {
    if (mode === "fill") ctx.fillText(c, x, y);
    else ctx.strokeText(c, x, y);
    x += ctx.measureText(c).width + spacing;
  }
}

function drawSpacedCentered(
  ctx: Ctx, text: string, cx: number, y: number, spacing: number,
  mode: "fill" | "stroke" = "fill",
): void {
  drawSpacedFrom(ctx, text, cx - measureSpaced(ctx, text, spacing) / 2, y, spacing, mode);
}

function roundRectPath(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function resetShadow(ctx: Ctx): void {
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

// ---------------------------------------------------------------------------
// CANVAS: CAPAS (parametrizadas por W, H) — [V1.1-11]
// ---------------------------------------------------------------------------

interface DorsalText { numero: string; nombre: string; categoria: string; }

/** Número en tubo de neón (capas idénticas a V1.0). */
function drawNumberLayer(ctx: Ctx, numero: string, W: number, H: number): void {
  if (!numero) return;
  const nSize = H * L.numberSize;
  const nY    = H * L.numberY;
  const nSp   = nSize * 0.035;
  ctx.textBaseline = "middle";
  ctx.font = `900 ${nSize}px ${FONT_DISPLAY}`;

  ctx.save();
  ctx.fillStyle   = "rgba(2,4,10,0.55)";
  ctx.shadowColor = "rgba(2,4,10,0.95)";
  ctx.shadowBlur  = H * 0.05;
  drawSpacedCentered(ctx, numero, W / 2, nY, nSp);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.fillStyle   = T.orange;
  ctx.shadowColor = T.orange;
  ctx.shadowBlur  = H * 0.035;
  drawSpacedCentered(ctx, numero, W / 2, nY + H * 0.008, nSp);
  ctx.restore();

  ctx.save();
  ctx.fillStyle   = T.cyan;
  ctx.shadowColor = T.cyan;
  ctx.globalAlpha = 0.9;
  ctx.shadowBlur  = H * 0.07;
  drawSpacedCentered(ctx, numero, W / 2, nY, nSp);
  ctx.shadowBlur  = H * 0.025;
  drawSpacedCentered(ctx, numero, W / 2, nY, nSp);
  ctx.restore();

  ctx.save();
  const core = ctx.createLinearGradient(0, nY - nSize / 2, 0, nY + nSize / 2);
  core.addColorStop(0,    "#ffffff");
  core.addColorStop(0.55, "#effcff");
  core.addColorStop(1,    "#a8f5ff");
  ctx.fillStyle   = core;
  ctx.shadowColor = "rgba(255,255,255,0.9)";
  ctx.shadowBlur  = H * 0.008;
  drawSpacedCentered(ctx, numero, W / 2, nY, nSp);
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "rgba(25,230,255,0.85)";
  ctx.lineWidth   = Math.max(1, nSize * 0.012);
  ctx.lineJoin    = "round";
  drawSpacedCentered(ctx, numero, W / 2, nY, nSp, "stroke");
  ctx.restore();
}

function drawNameLayer(ctx: Ctx, nombre: string, W: number, H: number): void {
  if (!nombre) return;
  ctx.textBaseline = "middle";
  let size = H * L.nameSize;
  let sp   = size * 0.06;
  ctx.font = `800 ${size}px ${FONT_DISPLAY}`;
  for (let i = 0; i < 24 && measureSpaced(ctx, nombre, sp) > W * L.nameMaxW; i++) {
    size *= 0.94; sp = size * 0.06;
    ctx.font = `800 ${size}px ${FONT_DISPLAY}`;
  }
  const y = H * L.nameY;

  ctx.save();
  ctx.fillStyle   = "#ffffff";
  ctx.shadowColor = "rgba(0,0,0,0.95)";
  ctx.shadowBlur  = H * 0.022;
  drawSpacedCentered(ctx, nombre, W / 2, y, sp);
  ctx.restore();

  ctx.save();
  ctx.fillStyle   = "#ffffff";
  ctx.shadowColor = T.cyan;
  ctx.shadowBlur  = H * 0.012;
  drawSpacedCentered(ctx, nombre, W / 2, y, sp);
  ctx.restore();
}

function drawCategoryLayer(ctx: Ctx, categoria: string, W: number, H: number): void {
  if (!categoria) return;
  ctx.textBaseline = "middle";
  const label = "CATEGORÍA";
  const value = categoria;
  let cSize = H * L.catSize;

  const measurePill = (s: number) => {
    ctx.font = `500 ${s}px ${FONT_UI}`;
    const lw = measureSpaced(ctx, label, s * 0.2);
    ctx.font = `700 ${s}px ${FONT_UI}`;
    const vw = measureSpaced(ctx, value, s * 0.12);
    const padX = s * 1.2;
    const gap  = s * 0.9;
    return { lw, vw, padX, gap, w: lw + gap + vw + padX * 2, h: s * 2.2 };
  };

  let m = measurePill(cSize);
  for (let i = 0; i < 12 && m.w > W * L.catMaxW; i++) {
    cSize *= 0.92; m = measurePill(cSize);
  }

  const cy = H * L.catY;
  const px = (W - m.w) / 2;
  const py = cy - m.h / 2;

  ctx.save();
  roundRectPath(ctx, px, py, m.w, m.h, m.h / 2);
  ctx.fillStyle = "rgba(2,4,10,0.66)";
  ctx.fill();
  ctx.lineWidth   = Math.max(1, H * 0.0025);
  ctx.strokeStyle = "rgba(25,230,255,0.6)";
  ctx.shadowColor = T.cyan;
  ctx.shadowBlur  = H * 0.012;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  resetShadow(ctx);
  ctx.font = `500 ${cSize}px ${FONT_UI}`;
  ctx.fillStyle = T.cyan;
  drawSpacedFrom(ctx, label, px + m.padX, cy, cSize * 0.2);
  ctx.font = `700 ${cSize}px ${FONT_UI}`;
  ctx.fillStyle = "#ffffff";
  drawSpacedFrom(ctx, value, px + m.padX + m.lw + m.gap, cy, cSize * 0.12);
  ctx.restore();
}

/** [V1.1-4] Capa base: arte + nombre + categoría (sin número). */
function drawBase(ctx: Ctx, img: HTMLImageElement, t: DorsalText, W: number, H: number): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, W, H);
  drawNameLayer(ctx, t.nombre, W, H);
  drawCategoryLayer(ctx, t.categoria, W, H);
}

/** Composición completa (exportación). */
function drawDorsal(ctx: Ctx, img: HTMLImageElement, t: DorsalText, W: number, H: number): void {
  drawBase(ctx, img, t, W, H);
  drawNumberLayer(ctx, t.numero, W, H);
}

/** [V1.1-5] Render a resolución nativa (con tope de iOS) → JPEG. */
async function renderExportBlob(img: HTMLImageElement, t: DorsalText): Promise<Blob | null> {
  let W = img.naturalWidth;
  let H = img.naturalHeight;
  const px = W * H;
  if (px > EXPORT_MAX_PIXELS) {
    const s = Math.sqrt(EXPORT_MAX_PIXELS / px);
    W = Math.floor(W * s); H = Math.floor(H * s);
  }
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  drawDorsal(ctx, img, t, W, H);
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, EXPORT_MIME, EXPORT_QUALITY));
  c.width = 0; c.height = 0; // libera memoria (crítico en iOS)
  return blob;
}

// ---------------------------------------------------------------------------
// CAPACIDADES DEL DISPOSITIVO — [V1.1-9]
// ---------------------------------------------------------------------------

function detectShareFiles(): boolean {
  try {
    if (typeof navigator === "undefined" || typeof navigator.canShare !== "function") return false;
    const f = new File([new Blob(["x"], { type: "image/jpeg" })], "t.jpg", { type: "image/jpeg" });
    return navigator.canShare({ files: [f] });
  } catch {
    return false;
  }
}

const detectInAppBrowser = (): boolean =>
  typeof navigator !== "undefined" &&
  /Instagram|FBAN|FBAV|FB_IAB|WhatsApp|Line\/|TikTok|musical_ly/i.test(navigator.userAgent);

const onIdle = (fn: () => void): (() => void) => {
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  if (w.requestIdleCallback) {
    const id = w.requestIdleCallback(fn, { timeout: 1500 });
    return () => w.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(fn, 300);
  return () => window.clearTimeout(id);
};

// ---------------------------------------------------------------------------
// PÁGINA
// ---------------------------------------------------------------------------

type Phase = "idle" | "boot" | "rez" | "done";

export default function DorsalLed() {
  const [sp]     = useSearchParams();
  const navigate = useNavigate();
  const reduce   = !!useReducedMotion();

  const bib       = (sp.get("bib") ?? "").replace(/\D/g, "");
  const numero    = bib ? bib.padStart(4, "0") : "----";
  const nombre    = `${sp.get("nombre") ?? ""} ${sp.get("apellido") ?? ""}`.trim().toUpperCase();
  const categoria = (sp.get("categoria") ?? "").toUpperCase();
  const evento    = sp.get("evento") ?? "WE RUN RAYOCERO LED CORO";
  const modalidad = sp.get("modalidad") ?? (categoria.includes("5K") ? "5K" : "10K");

  const { img, failed }                       = useImageAsset(DORSAL_ASSETS[modalidad] ?? dorsalLedSrc);
  const { ready: fontsReady, version: fontV } = useLedFonts();

  const stageRef    = useRef<HTMLDivElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const baseRef     = useRef<HTMLCanvasElement | null>(null);
  const exportCache = useRef<{ key: string; blob: Blob } | null>(null);

  const [size,        setSize]        = useState<{ w: number; h: number } | null>(null);
  const [baseVersion, setBaseVersion] = useState(0);
  const [phase,       setPhase]       = useState<Phase>("idle");
  const [numShown,    setNumShown]    = useState<string>(numero);
  const [busy,        setBusy]        = useState(false);
  const [notice,      setNotice]      = useState<string | null>(null);
  const [previewUrl,  setPreviewUrl]  = useState<string | null>(null);

  const shareFiles = useMemo(detectShareFiles, []);
  const inApp      = useMemo(detectInAppBrowser, []);

  // [V1.1-3] Tamaño de canvas = ancho CSS × DPR (máx. 2x), nunca mayor al arte
  useEffect(() => {
    const el = stageRef.current;
    if (!el || !img) return;
    const compute = () => {
      const cssW = el.clientWidth;
      if (!cssW) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.min(img.naturalWidth, Math.round(cssW * dpr));
      const h = Math.round((w * img.naturalHeight) / img.naturalWidth);
      setSize((prev) => (prev && Math.abs(prev.w - w) < 8 ? prev : { w, h }));
    };
    compute();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", compute);
      return () => window.removeEventListener("resize", compute);
    }
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [img]);

  // [V1.1-4] Capa base cacheada; se rehace solo si cambia tamaño, datos o fuente
  useEffect(() => {
    if (!fontsReady || !img || !size) return;
    let b = baseRef.current;
    if (!b) { b = document.createElement("canvas"); baseRef.current = b; }
    b.width = size.w; b.height = size.h;
    const bctx = b.getContext("2d");
    if (!bctx) return;
    drawBase(bctx, img, { numero: "", nombre, categoria }, size.w, size.h);
    setBaseVersion((v) => v + 1);
  }, [fontsReady, fontV, img, size, nombre, categoria]);

  useEffect(() => () => {
    if (baseRef.current) { baseRef.current.width = 0; baseRef.current.height = 0; }
  }, []);

  // Frame: base cacheada + número
  useEffect(() => {
    const c = canvasRef.current;
    const b = baseRef.current;
    if (!c || !b || !size || baseVersion === 0) return;
    if (c.width  !== size.w) c.width  = size.w;
    if (c.height !== size.h) c.height = size.h;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, size.w, size.h);
    ctx.drawImage(b, 0, 0);
    drawNumberLayer(ctx, numShown, size.w, size.h);
  }, [baseVersion, numShown, size]);

  const canvasReady = baseVersion > 0;

  // Secuencia de entrada
  useEffect(() => {
    if (!canvasReady) return;
    if (reduce) { setNumShown(numero); setPhase("done"); return; }
    setPhase("boot");
    const t1 = setTimeout(() => setPhase("rez"),  BOOT_MS);
    const t2 = setTimeout(() => setPhase("done"), BOOT_MS + REZ_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [canvasReady, reduce, numero]);

  // Decodificación del número durante el rez
  useEffect(() => {
    if (phase !== "rez") return;
    const steps = 14;
    let step = 0;
    const id = setInterval(() => {
      step++;
      const locked = Math.floor((step / steps) * numero.length);
      const next = Array.from(numero)
        .map((c, i) => (i < locked || !/\d/.test(c) ? c : String(Math.floor(Math.random() * 10))))
        .join("");
      setNumShown(step >= steps ? numero : next);
      if (step >= steps) clearInterval(id);
    }, Math.floor((REZ_MS * 0.85) / steps));
    return () => clearInterval(id);
  }, [phase, numero]);

  useEffect(() => { if (phase === "done") setNumShown(numero); }, [phase, numero]);

  // ------------------------------ EXPORTACIÓN ------------------------------

  const exportKey = `${numero}|${nombre}|${categoria}|${fontV}|${img?.src ?? ""}`;
  const fileName  = `dorsal-led-${numero}.jpg`;

  const getBlob = useCallback(async (): Promise<Blob | null> => {
    if (!img) return null;
    if (exportCache.current?.key === exportKey) return exportCache.current.blob;
    const blob = await renderExportBlob(img, { numero, nombre, categoria });
    if (blob) exportCache.current = { key: exportKey, blob };
    return blob;
  }, [img, exportKey, numero, nombre, categoria]);

  // [V1.1-5] Pre-generar en idle al terminar la animación
  useEffect(() => {
    if (phase !== "done" || !img) return;
    return onIdle(() => { void getBlob(); });
  }, [phase, img, getBlob]);

  const openPreview = useCallback(async () => {
    setBusy(true); setNotice(null);
    try {
      const blob = await getBlob();
      if (!blob) throw new Error("blob");
      setPreviewUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(blob); });
    } catch {
      setNotice("No se pudo generar la imagen. Recarga la página e intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }, [getBlob]);

  const closePreview = useCallback(() => {
    setPreviewUrl((old) => { if (old) URL.revokeObjectURL(old); return null; });
  }, []);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  useEffect(() => {
    if (!previewUrl) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closePreview(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previewUrl, closePreview]);

  const handleDownload = useCallback(async () => {
    if (inApp) { await openPreview(); return; }
    setBusy(true); setNotice(null);
    try {
      const blob = await getBlob();
      if (!blob) throw new Error("blob");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = fileName; a.rel = "noopener";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      setNotice("Dorsal descargado.");
    } catch {
      setBusy(false);
      await openPreview();
      return;
    } finally {
      setBusy(false);
    }
  }, [inApp, getBlob, fileName, openPreview]);

  const handleShare = useCallback(async () => {
    setNotice(null);
    try {
      const blob = await getBlob();
      if (!blob) throw new Error("blob");
      const file = new File([blob], fileName, { type: EXPORT_MIME });
      await navigator.share({
        files: [file],
        title: evento,
        text: `Ya tengo mi dorsal #${numero} para ${evento}.`,
      });
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      // NotAllowedError (activación perdida) u otro → vista para guardar manual
      await openPreview();
    }
  }, [getBlob, fileName, evento, numero, openPreview]);

  // Acciones según dispositivo
  const primary = shareFiles
    ? { label: "Guardar o compartir", Icon: Share2,   onClick: handleShare }
    : inApp
    ? { label: "Ver y guardar",       Icon: ImageIcon, onClick: openPreview }
    : { label: "Descargar dorsal",    Icon: Download,  onClick: handleDownload };
  const secondary = shareFiles
    ? { label: "Descargar",           Icon: Download,  onClick: handleDownload }
    : { label: "Ver imagen",          Icon: ImageIcon, onClick: openPreview };

  const aspect    = img ? `${img.naturalWidth} / ${img.naturalHeight}` : "1.4 / 1";
  const uiVisible = phase === "done";
  const clipHidden = `inset(0% 0% 100% 0% round ${RADIUS}px)`;
  const clipShown  = `inset(0% 0% 0% 0% round ${RADIUS}px)`;

  return (
    <div
      className="relative min-h-screen overflow-hidden text-white"
      style={{
        minHeight: "100dvh",
        background: T.void,
        fontFamily: FONT_UI,
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <style>{`
        @keyframes led-grid-run { from { transform: translate3d(0,0,0); } to { transform: translate3d(0,64px,0); } }
        @keyframes led-horizon  { 0%,100% { opacity: .55 } 50% { opacity: .85 } }
        .led-focus:focus-visible { outline: 2px solid ${T.cyan}; outline-offset: 3px; }
        @media (prefers-reduced-motion: reduce) {
          .led-grid, .led-horizon { animation: none !important; }
        }
      `}</style>

      {/* ------------------------- FONDO: LA RED ------------------------- */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="led-horizon absolute inset-x-0"
          style={{
            top: "56%", height: "40%",
            background: `radial-gradient(70% 55% at 50% 0%, ${T.orange}33 0%, ${T.cyan}14 45%, transparent 75%)`,
            animation: "led-horizon 6s ease-in-out infinite",
            willChange: "opacity",
          }}
        />
        <div
          className="absolute inset-x-0 h-px"
          style={{
            top: "56%",
            background: `linear-gradient(90deg, transparent, ${T.cyan}, ${T.orange}, ${T.cyan}, transparent)`,
            boxShadow: `0 0 14px ${T.cyan}`,
          }}
        />
        {/* [V1.1-6] Piso animado con transform (compositor) */}
        <div className="absolute inset-x-0 bottom-0 opacity-60 sm:opacity-100" style={{ top: "56%", perspective: "420px" }}>
          <div
            className="absolute overflow-hidden"
            style={{
              left: "-60%", right: "-60%", top: 0, height: "170%",
              transform: "rotateX(64deg)", transformOrigin: "top center",
              maskImage: "linear-gradient(to bottom, transparent 0%, black 22%, black 70%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 22%, black 70%, transparent 100%)",
            }}
          >
            <div
              className="led-grid absolute inset-x-0"
              style={{
                top: "-64px", bottom: 0,
                backgroundImage:
                  `linear-gradient(${T.cyan}55 1px, transparent 1px),` +
                  `linear-gradient(90deg, ${T.cyan}40 1px, transparent 1px)`,
                backgroundSize: "64px 64px",
                animation: "led-grid-run 1.4s linear infinite",
                willChange: "transform",
              }}
            />
          </div>
        </div>
        <div
          className="absolute inset-0"
          style={{ background: `radial-gradient(90% 60% at 50% 30%, transparent 40%, ${T.void} 95%)` }}
        />
      </div>

      {/* ---------------------------- CONTENIDO ---------------------------- */}
      <main
        className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center px-4 pt-24 sm:px-6 sm:pt-28"
        style={{ paddingBottom: "calc(2.5rem + env(safe-area-inset-bottom, 0px))" }}
      >
        {/* [V1.1-8] Espacio reservado desde el inicio: sin saltos de layout */}
        <motion.header
          initial={false}
          animate={{ opacity: uiVisible ? 1 : 0, y: uiVisible ? 0 : -8 }}
          transition={{ duration: reduce ? 0 : 0.45, ease: "easeOut" }}
          className="mb-6 w-full text-center sm:mb-10"
          aria-hidden={!uiVisible}
        >
          <h1
            className="leading-[0.9]"
            style={{
              fontFamily: FONT_DISPLAY, fontWeight: 900,
              fontSize: "clamp(2.5rem, 12vw, 6rem)",
              color: "#fff",
              textShadow: `0 0 16px ${T.cyan}aa, 0 0 38px ${T.cyan}55`,
            }}
          >
            ENTRASTE A LA RED
          </h1>
          <p className="mx-auto mt-3 max-w-md text-[13px] leading-relaxed sm:max-w-xl sm:text-base" style={{ color: T.dim }}>
            Inscripción recibida para <span className="text-white">{evento}</span>.
            Tu pago será verificado por la organización.
          </p>
        </motion.header>

        {/* ------------------------- ESCENARIO DORSAL ------------------------- */}
        <div ref={stageRef} className="relative w-full max-w-[880px]" style={{ aspectRatio: aspect }}>

          <AnimatePresence>
            {phase === "boot" && (
              <motion.div
                key="lightline"
                aria-hidden
                className="absolute inset-x-0 top-1/2 h-[2px]"
                style={{
                  background: `linear-gradient(90deg, ${T.orange}, #fff, ${T.cyan})`,
                  boxShadow: `0 0 18px ${T.cyan}, 0 0 44px ${T.cyan}88`,
                  transformOrigin: "center",
                }}
                initial={{ scaleX: 0, opacity: 1 }}
                animate={{ scaleX: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: (BOOT_MS / 1000) * 0.75, ease: [0.7, 0, 0.2, 1] }}
              />
            )}
          </AnimatePresence>

          {(phase === "boot" || phase === "rez") && (
            <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
              <motion.rect
                x="0.15%" y="0.2%" width="99.7%" height="99.6%" rx={RADIUS}
                fill="none" stroke={T.cyan} strokeWidth="2"
                style={{ filter: `drop-shadow(0 0 6px ${T.cyan})` }}
                initial={{ pathLength: 0, opacity: 1 }}
                animate={{ pathLength: 1, opacity: phase === "rez" ? 0 : 1 }}
                transition={{
                  pathLength: { duration: BOOT_MS / 1000, ease: "easeInOut" },
                  opacity:    { duration: 0.4, delay: 0.4 },
                }}
              />
            </svg>
          )}

          <motion.div
            className="absolute inset-0 overflow-hidden"
            style={{
              borderRadius: RADIUS,
              boxShadow: phase === "idle"
                ? "none"
                : `0 0 0 1px ${T.cyan}55, 0 0 32px ${T.cyan}40, 0 24px 60px ${T.orange}22`,
            }}
            initial={false}
            animate={{ clipPath: phase === "idle" || phase === "boot" ? clipHidden : clipShown }}
            transition={{ duration: reduce ? 0 : (REZ_MS / 1000) * 0.8, ease: [0.4, 0, 0.2, 1] }}
          >
            <canvas
              ref={canvasRef}
              className="block h-full w-full"
              role="img"
              aria-label={`Dorsal número ${numero} de ${nombre || "participante"}, ${categoria}`}
            />
          </motion.div>

          <AnimatePresence>
            {phase === "rez" && !reduce && (
              <motion.div
                key="scan"
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-[3px]"
                style={{
                  background: `linear-gradient(90deg, transparent, #fff, ${T.cyan}, #fff, transparent)`,
                  boxShadow: `0 0 16px ${T.cyan}, 0 0 40px ${T.cyan}`,
                  willChange: "transform",
                }}
                initial={{ y: 0, opacity: 1 }}
                animate={{ y: size ? stageRef.current?.clientHeight ?? 0 : 0, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: (REZ_MS / 1000) * 0.8, ease: [0.4, 0, 0.2, 1] }}
              />
            )}
          </AnimatePresence>

          {!canvasReady && !failed && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: T.cyan }} />
            </div>
          )}

          {failed && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-[14px] border p-6 text-center"
              style={{ borderColor: `${T.orange}55`, background: `${T.panel}cc` }}
            >
              <p className="text-sm text-white">No se pudo cargar el dorsal.</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="led-focus min-h-[44px] rounded-xl px-5 text-sm font-bold"
                style={{ background: T.cyan, color: T.void }}
              >
                Recargar
              </button>
            </div>
          )}
        </div>

        {/* --------------------------- DATOS + ACCIONES --------------------------- */}
        <motion.section
          initial={false}
          animate={{ opacity: uiVisible ? 1 : 0, y: uiVisible ? 0 : 10 }}
          transition={{ duration: reduce ? 0 : 0.45, delay: reduce ? 0 : 0.08, ease: "easeOut" }}
          className="mt-6 w-full max-w-[880px] sm:mt-8"
          style={{ pointerEvents: uiVisible ? "auto" : "none" }}
          aria-hidden={!uiVisible}
        >
          <dl
            className="grid grid-cols-2 overflow-hidden rounded-2xl border sm:grid-cols-4"
            style={{ borderColor: `${T.cyan}30`, background: `${T.panel}cc` }}
          >
            {[
              { k: "Dorsal",    v: `#${numero}` },
              { k: "Categoría", v: categoria ? categoria.toLowerCase().replace(/(^|\s)\S/g, (s) => s.toUpperCase()) : "—" },
              { k: "Distancia", v: modalidad === "5K" ? "5K caminata" : "10K carrera" },
              { k: "Salida",    v: `${LED_EVENT.fecha}, ${LED_EVENT.hora}` },
            ].map((d, i) => (
              <div
                key={d.k}
                className="min-w-0 px-3.5 py-3 sm:px-4 sm:py-3.5"
                style={{
                  borderLeft: i % 2 === 1 ? `1px solid ${T.cyan}20` : undefined,
                  borderTop:  i >= 2 ? `1px solid ${T.cyan}20` : undefined,
                }}
              >
                <dt className="text-[11px] font-medium" style={{ color: T.cyan }}>{d.k}</dt>
                <dd
                  className="mt-0.5 truncate text-base text-white sm:text-lg"
                  style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, letterSpacing: "0.02em" }}
                >
                  {d.v}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-center text-xs" style={{ color: T.dim }}>{LED_EVENT.lugar}</p>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:mt-6 sm:grid-cols-3">
            <button
              type="button"
              onClick={primary.onClick}
              disabled={busy || !uiVisible}
              className="led-focus flex min-h-[52px] items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold transition-transform active:scale-[0.98] disabled:opacity-50"
              style={{ background: T.cyan, color: T.void, boxShadow: `0 0 20px ${T.cyan}55`, touchAction: "manipulation" }}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <primary.Icon className="h-4 w-4 shrink-0" />}
              <span className="truncate">{primary.label}</span>
            </button>
            <button
              type="button"
              onClick={secondary.onClick}
              disabled={busy || !uiVisible}
              className="led-focus flex min-h-[52px] items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold transition-transform active:scale-[0.98] disabled:opacity-50"
              style={{ borderColor: `${T.orange}88`, color: T.orange, background: `${T.orange}10`, touchAction: "manipulation" }}
            >
              <secondary.Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{secondary.label}</span>
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              disabled={!uiVisible}
              className="led-focus col-span-2 flex min-h-[52px] items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors hover:bg-white/5 sm:col-span-1"
              style={{ borderColor: "rgba(255,255,255,0.14)", color: T.ink, touchAction: "manipulation" }}
            >
              <UserPlus className="h-4 w-4 shrink-0" />
              Inscribir a otra persona
            </button>
          </div>

          <p aria-live="polite" className="mt-3 min-h-[1.25rem] text-center text-xs" style={{ color: T.dim }}>
            {notice}
          </p>
        </motion.section>
      </main>

      {/* ---------------- [V1.1-9] VISTA PARA GUARDAR (long-press) ---------------- */}
      <AnimatePresence>
        {previewUrl && (
          <motion.div
            key="preview"
            role="dialog"
            aria-modal="true"
            aria-label="Imagen del dorsal"
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-4 px-4"
            style={{
              background: "rgba(2,4,10,0.94)",
              paddingTop: "calc(1rem + env(safe-area-inset-top, 0px))",
              paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closePreview}
          >
            <img
              src={previewUrl}
              alt={`Dorsal ${numero}`}
              className="max-h-[72dvh] w-auto max-w-full rounded-xl"
              style={{ boxShadow: `0 0 0 1px ${T.cyan}55, 0 0 30px ${T.cyan}33`, WebkitTouchCallout: "default" } as React.CSSProperties}
              onClick={(e) => e.stopPropagation()}
            />
            <p className="max-w-sm text-center text-sm text-white">
              Mantén presionada la imagen y elige <span style={{ color: T.cyan }}>Guardar imagen</span>.
            </p>
            <button
              type="button"
              onClick={closePreview}
              className="led-focus flex min-h-[48px] items-center gap-2 rounded-xl border px-5 text-sm font-semibold"
              style={{ borderColor: "rgba(255,255,255,0.18)", color: T.ink }}
            >
              <X className="h-4 w-4" /> Cerrar
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
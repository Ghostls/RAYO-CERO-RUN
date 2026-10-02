/**
 * RAYOCERO — CANINATA CLIENT DASHBOARD (V1.3 — COMPROBANTES + ENTREGA KITS)
 * Senior Dev: MIA (Valkyron Group)
 * CEO: Lualdo Sciscioli
 * REGLA DE ORO: Evolución sin Destrucción. Código completo. Copy-paste ready.
 *
 * CHANGELOG V1.3 (evoluciona sobre V1.2):
 * [V1.3-1] Atleta + referencia_pago, comprobante_url, comprobante_path.
 *          fetchAtletas usa select("*") — el SELECT explícito de V1.2 rompía
 *          la carga completa si alguna columna opcional no existía.
 * [V1.3-2] resolveComprobanteCaninata(): resolver multi-capa AISLADO a la caninata:
 *            Capa 1 — ruta registrada en el runner (verificada contra storage).
 *            Capa 2 — carpetas de la caninata (slug de la carrera, caninata/).
 *            Capa 3 — raíz del bucket (fallback, marcado para verificación).
 *          NO escanea carpetas de otras carreras (coro-499/, lara/, ...), así un
 *          atleta inscrito en varias carreras no muestra el comprobante equivocado.
 *          Desempate temporal: gana el archivo con menor |file.created_at − runner.created_at|.
 * [V1.3-3] Cache de listados de storage por prefijo (TTL 60 s) + re-escaneo forzado.
 * [V1.3-4] ComprobanteModal (portal): imagen o PDF, origen del comprobante,
 *          delta temporal, toggles pago/kit, abrir original, cerrar con Esc.
 * [V1.3-5] Guardia anti-race-condition: requestId descarta respuestas de
 *          inspecciones previas (cambio rápido entre atletas / cierre del modal).
 * [V1.3-6] togglePago()/toggleKit() retornan Promise<boolean> (éxito/fallo)
 *          para que la pestaña de entrega reporte el resultado real.
 * [V1.3-7] Pestaña "Entrega Kits": búsqueda por dorsal sobre el estado local,
 *          detección de dorsal duplicado, alerta si el pago no está verificado,
 *          confirmar / revertir con toggleKit (contadores siempre sincronizados).
 * [V1.3-8] Columna "Comprobante" en la tabla (VER / ADMIN / GRATIS).
 *
 * CHANGELOG V1.2:
 * [V1.2-1] togglePago() — verifica/desverifica pago desde el dashboard cliente.
 * [V1.2-2] toggleKit()  — marca/desmarca kit entregado desde el dashboard cliente.
 * [V1.2-3] Botones inline en tabla con feedback visual inmediato.
 * [V1.2-4] Estado optimista — UI actualiza antes de confirmar Supabase.
 *
 * CHANGELOG V1.1:
 * [V1.1-1] Columna Teléfono añadida.
 *
 * CHANGELOG V1.0:
 * [V1.0-1] PIN gate — CANINATA2026, persiste en localStorage.
 * [V1.0-2] Carga automática de la carrera caninata activa.
 * [V1.0-3] Tabla atletas, TasaConfig, buscador, contadores.
 */

import { useState, useEffect, useMemo, useCallback, useRef } from "react"; // [V1.3] + useRef
import { createPortal } from "react-dom";                                    // [V1.3-4]
import { supabase } from "@/lib/supabase";
import {
  Dog, LogOut, Search, ShieldCheck, RefreshCw,
  Save, CheckCircle, Users, AlertCircle, Loader2,
  Eye, EyeOff, Lock, Phone, Gift, Shield,
  X, FileText, ExternalLink, ShieldAlert, Package, AlertTriangle, // [V1.3]
} from "lucide-react";

// ─── CONSTANTES ──────────────────────────────────────────────────────────────
const PIN_CORRECTO = "CANINATA2026";
const LS_KEY       = "caninata_dash_auth";
const YELLOW       = "#FDD454";
const BG           = "#080f08";

// [V1.3-2] Storage de comprobantes
const BUCKET              = "comprobantes-pago";
const LIST_PAGE_SIZE      = 200;
const LIST_MAX_PAGES      = 50;          // cota dura: 10.000 archivos por prefijo
const LIST_CACHE_TTL_MS   = 60_000;      // [V1.3-3]
const MATCH_WINDOW_MIN    = 72 * 60;     // ventana de confianza para matches en raíz
const REF_SIN_COMPROBANTE = new Set(["INSCRIPCION_ADMIN", "NINO_GRATIS"]);
const FALLBACK_PREFIXES   = ["", "comprobantes/"];

// ─── TIPOS ───────────────────────────────────────────────────────────────────
interface Atleta {
  id               : string;
  nombre           : string;
  apellido         : string;
  cedula           : string;
  telefono?        : string;
  modalidad?       : string;
  categoria?       : string;
  bib_number?      : string | number;
  pago_verificado  : boolean;
  kit_entregado    : boolean;
  talla_camiseta?  : string;
  created_at       : string;
  referencia_pago? : string | null;  // [V1.3-1]
  comprobante_url? : string | null;  // [V1.3-1]
  comprobante_path?: string | null;  // [V1.3-1]
}

interface CaninatRace {
  id  : string;
  name: string;
}

/** [V1.3-2] Entrada de archivo en storage (carpetas tienen id === null). */
interface StorageEntry {
  name      : string;
  id        : string;
  created_at: string | null;
}

/** [V1.3-2] Origen del comprobante resuelto. */
type ComprobanteSource = "registro" | "caninata" | "raiz";

interface ComprobanteHit {
  url     : string;
  path    : string;
  source  : ComprobanteSource;
  deltaMin: number | null;   // |file.created_at − runner.created_at| en minutos
  isPdf   : boolean;
}

// ─── [V1.3-2] RESOLVER DE COMPROBANTES — CANINATA ────────────────────────────

/** [V1.3-3] Cache de listados por prefijo. */
const listCache = new Map<string, { ts: number; files: StorageEntry[] }>();

/** Slug idéntico al del AdminDashboard principal (compatibilidad de rutas). */
const slugRaw = (s: string) =>
  s.toLowerCase().replace(/\s+/g, "-").substring(0, 20);

/** Slug normalizado (sin acentos ni símbolos) — cubre terminales que sanitizan. */
const slugNorm = (s: string) =>
  s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 20);

/** Carpetas propias de la caninata, en orden de prioridad. */
const getCaninataPrefixes = (raceName: string): string[] => {
  const set = new Set<string>();
  [slugRaw(raceName), slugNorm(raceName), "caninata", "caninata-2026"]
    .forEach(p => { if (p) set.add(`${p}/`); });
  return [...set];
};

const publicUrlOf = (path: string): string | null =>
  supabase.storage.from(BUCKET).getPublicUrl(path).data?.publicUrl ?? null;

const isPdfName = (name: string) => /\.pdf$/i.test(name);

/** Extrae la ruta interna del bucket desde una URL pública de Supabase. */
const pathFromPublicUrl = (url: string): string | null => {
  const marker = `/object/public/${BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return null;
  try {
    return decodeURIComponent(url.substring(i + marker.length).split("?")[0]);
  } catch {
    return null;
  }
};

/** Normaliza una ruta guardada (quita "/" inicial y el nombre del bucket si viene incluido). */
const normalizeStoredPath = (p: string): string => {
  let clean = p.trim().replace(/^\/+/, "");
  if (clean.startsWith(`${BUCKET}/`)) clean = clean.substring(BUCKET.length + 1);
  return clean;
};

/** Lista un prefijo completo con paginación y cache. Excluye carpetas. */
const listPrefix = async (prefix: string, force: boolean): Promise<StorageEntry[]> => {
  const cached = listCache.get(prefix);
  if (!force && cached && Date.now() - cached.ts < LIST_CACHE_TTL_MS) return cached.files;

  const folder = prefix.replace(/\/$/, "");
  const out: StorageEntry[] = [];
  for (let page = 0; page < LIST_MAX_PAGES; page++) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(folder, {
        limit : LIST_PAGE_SIZE,
        offset: page * LIST_PAGE_SIZE,
        sortBy: { column: "name", order: "asc" },
      });
    if (error) {
      console.warn(`[MIA-CANINATA] Error listando "${prefix}":`, error.message);
      break;
    }
    if (!data || data.length === 0) break;
    data.forEach(f => {
      if (f.id) out.push({ name: f.name, id: f.id, created_at: f.created_at ?? null });
    });
    if (data.length < LIST_PAGE_SIZE) break;
  }
  listCache.set(prefix, { ts: Date.now(), files: out });
  return out;
};

/** Verifica que una ruta exista realmente en el bucket. */
const verifyPath = async (path: string): Promise<StorageEntry | null> => {
  const idx  = path.lastIndexOf("/");
  const dir  = idx === -1 ? "" : path.substring(0, idx);
  const file = idx === -1 ? path : path.substring(idx + 1);
  if (!file) return null;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(dir, { limit: 100, search: file });
  if (error || !data) return null;
  const f = data.find(x => x.name === file && x.id);
  return f ? { name: f.name, id: f.id as string, created_at: f.created_at ?? null } : null;
};

const deltaMinutes = (fileTs: string | null, runnerTs: string | null | undefined): number | null => {
  if (!fileTs || !runnerTs) return null;
  const d = Math.abs(Date.parse(fileTs) - Date.parse(runnerTs));
  return Number.isFinite(d) ? Math.round(d / 60_000) : null;
};

/** Matcher por teléfono (prioritario), cédula y referencia. */
const buildMatcher = (a: Atleta) => {
  const ced   = String(a.cedula ?? "").replace(/^V-?/i, "").replace(/\D/g, "");
  const tel   = String(a.telefono ?? "").replace(/\D/g, "");
  const tel10 = tel.length >= 10 ? tel.slice(-10) : "";
  const ref   = String(a.referencia_pago ?? "").toLowerCase().trim();
  const refOk = ref.length >= 4 && !REF_SIN_COMPROBANTE.has(ref.toUpperCase());

  return (fileName: string): boolean => {
    const n = fileName.toLowerCase();
    if (tel && n.startsWith(tel))      return true;
    if (tel10 && n.includes(tel10))    return true;
    if (ced.length >= 5 && n.includes(ced)) return true;
    if (refOk && n.includes(ref))      return true;
    return false;
  };
};

/**
 * [V1.3-2] Resuelve el comprobante del atleta dentro del ámbito de la caninata.
 * @param a        Atleta.
 * @param raceName Nombre de la carrera caninata (para slug de carpeta).
 * @param force    true = ignora cache de listados (re-escaneo).
 */
const resolveComprobanteCaninata = async (
  a: Atleta,
  raceName: string,
  force = false,
): Promise<ComprobanteHit | null> => {
  // ── Capa 1: ruta registrada en el runner ──
  const storedRaw =
    a.comprobante_path?.trim() ||
    (a.comprobante_url ? pathFromPublicUrl(a.comprobante_url) : null);
  if (storedRaw) {
    const path  = normalizeStoredPath(storedRaw);
    const entry = await verifyPath(path);
    if (entry) {
      const url = publicUrlOf(path);
      if (url) {
        return {
          url, path, source: "registro",
          deltaMin: deltaMinutes(entry.created_at, a.created_at),
          isPdf   : isPdfName(path),
        };
      }
    }
  }

  const matches = buildMatcher(a);

  const pickBest = async (prefixes: string[], source: ComprobanteSource): Promise<ComprobanteHit | null> => {
    let best: ComprobanteHit | null = null;
    for (const prefix of prefixes) {
      const files = await listPrefix(prefix, force);
      for (const f of files) {
        if (!matches(f.name)) continue;
        const delta  = deltaMinutes(f.created_at, a.created_at);
        const better = !best || (delta ?? Infinity) < (best.deltaMin ?? Infinity);
        if (!better) continue;
        const path = `${prefix}${f.name}`;
        const url  = publicUrlOf(path);
        if (url) best = { url, path, source, deltaMin: delta, isPdf: isPdfName(f.name) };
      }
    }
    return best;
  };

  // ── Capa 2: carpetas de la caninata ──
  const caninataHit = await pickBest(getCaninataPrefixes(raceName), "caninata");
  if (caninataHit) return caninataHit;

  // ── Capa 3: raíz del bucket (fallback marcado) ──
  return pickBest(FALLBACK_PREFIXES, "raiz");
};

const formatDelta = (min: number | null): string => {
  if (min == null) return "sin fecha";
  if (min < 60)    return `${min} min`;
  if (min < 1440)  return `${Math.round(min / 60)} h`;
  return `${Math.round(min / 1440)} d`;
};

// ─── TASACONFIG EMBEBIDA ─────────────────────────────────────────────────────
const TasaConfigCaninata = ({ raceId }: { raceId: string }) => {
  const [tasaBCV,    setTasaBCV]    = useState("");
  const [costo10k,   setCosto10k]   = useState("");
  const [costo5k,    setCosto5k]    = useState("");
  const [configId,   setConfigId]   = useState<number | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      let data: any = null;
      const { data: d } = await supabase
        .from("system_config")
        .select("*")
        .eq("race_id", raceId)
        .maybeSingle();
      data = d;
      if (!data) {
        const { data: fb } = await supabase
          .from("system_config")
          .select("*")
          .eq("id", 1)
          .single();
        data = fb;
      }
      if (data) {
        setConfigId(data.id);
        setTasaBCV(String(data.tasa_bcv ?? ""));
        setCosto10k(String(data.costo_usd ?? ""));
        setCosto5k(String(data.costo_4k_usd ?? ""));
      }
    } catch {
      setErrorMsg("Error cargando configuración.");
    } finally {
      setLoading(false);
    }
  }, [raceId]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configId) return;
    setSaving(true); setErrorMsg(null);
    try {
      const { error } = await supabase
        .from("system_config")
        .update({
          tasa_bcv            : parseFloat(tasaBCV.replace(",", ".")),
          costo_usd           : parseFloat(costo10k.replace(",", ".")),
          costo_4k_usd        : parseFloat(costo5k.replace(",", ".")),
          ultima_actualizacion: new Date().toISOString(),
        })
        .eq("id", configId);
      if (error) throw error;
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-10">
      <Loader2 className="animate-spin" style={{ color: YELLOW, width: 28, height: 28 }} />
    </div>
  );

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {errorMsg && (
        <div className="p-3 rounded-xl text-xs font-bold text-red-400 border border-red-500/30 bg-red-500/10">
          {errorMsg}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Tasa BCV (Bs/$)",       value: tasaBCV,  set: setTasaBCV,  color: "#94a3b8" },
          { label: "Inscripción 10K (USD)", value: costo10k, set: setCosto10k, color: YELLOW    },
          { label: "Inscripción 5K (USD)",  value: costo5k,  set: setCosto5k,  color: YELLOW    },
        ].map(({ label, value, set, color }) => (
          <div key={label}>
            <label
              className="block text-[10px] font-black uppercase tracking-widest mb-2"
              style={{ color }}
            >
              {label}
            </label>
            <input
              type="text"
              value={value}
              onChange={e => set(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-white text-sm font-bold outline-none"
              style={{
                background: "rgba(255,255,255,0.04)",
                border    : `1px solid ${color}30`,
              }}
            />
          </div>
        ))}
      </div>
      <button
        type="submit"
        disabled={saving}
        className="w-full py-3.5 rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-40"
        style={{ background: YELLOW, color: BG }}
      >
        {saving
          ? <><RefreshCw size={14} className="animate-spin" /> Guardando...</>
          : <><Save size={14} /> Guardar Configuración</>
        }
      </button>
      {successMsg && (
        <div className="flex items-center justify-center gap-2 text-emerald-400 text-xs font-black uppercase">
          <CheckCircle size={14} /> Configuración guardada
        </div>
      )}
    </form>
  );
};

// ─── [V1.3-4] MODAL DE INSPECCIÓN DE COMPROBANTE ─────────────────────────────
interface ComprobanteModalProps {
  atleta      : Atleta;         // instancia viva (derivada del estado del padre)
  raceName    : string;
  togglingPago: boolean;
  togglingKit : boolean;
  onTogglePago: () => void;
  onToggleKit : () => void;
  onClose     : () => void;
}

const SOURCE_STYLE: Record<ComprobanteSource, { label: string; color: string }> = {
  registro: { label: "Ruta registrada",  color: "#22c55e" },
  caninata: { label: "Carpeta caninata", color: YELLOW    },
  raiz    : { label: "Raíz del bucket",  color: "#f59e0b" },
};

const ComprobanteModal = ({
  atleta, raceName, togglingPago, togglingKit, onTogglePago, onToggleKit, onClose,
}: ComprobanteModalProps) => {
  const [hit,       setHit]       = useState<ComprobanteHit | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [msg,       setMsg]       = useState("");
  const [imgFailed, setImgFailed] = useState(false);
  const [scanNonce, setScanNonce] = useState(0);
  const reqRef = useRef(0); // [V1.3-5]

  const refUpper       = String(atleta.referencia_pago ?? "").toUpperCase();
  const sinComprobante = REF_SIN_COMPROBANTE.has(refUpper);

  // [V1.3-2 / V1.3-5] Escaneo con descarte de respuestas obsoletas
  useEffect(() => {
    const reqId = ++reqRef.current;
    setHit(null);
    setImgFailed(false);

    if (sinComprobante) {
      setLoading(false);
      setMsg(refUpper === "NINO_GRATIS"
        ? "Inscripción gratuita: no requiere comprobante."
        : "Inscripción directa desde el panel admin: no hay comprobante en storage.");
      return;
    }

    setLoading(true);
    setMsg("Buscando comprobante...");
    (async () => {
      try {
        const r = await resolveComprobanteCaninata(atleta, raceName, scanNonce > 0);
        if (reqId !== reqRef.current) return;
        if (r) {
          setHit(r);
          setMsg("");
        } else {
          setMsg(
            `No se encontró comprobante para V-${atleta.cedula}` +
            ` · Tel ${atleta.telefono ?? "—"}` +
            (atleta.referencia_pago ? ` · Ref ${atleta.referencia_pago}` : "")
          );
        }
      } catch {
        if (reqId === reqRef.current) setMsg("No se pudo consultar el storage. Usa Re-escanear.");
      } finally {
        if (reqId === reqRef.current) setLoading(false);
      }
    })();

    return () => { reqRef.current++; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atleta.id, raceName, scanNonce, sinComprobante]);

  // Cerrar con Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const fueraDeVentana = hit?.source === "raiz" && (hit.deltaMin == null || hit.deltaMin > MATCH_WINDOW_MIN);

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[999999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(6px)" }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-6xl max-h-[92vh] rounded-3xl overflow-hidden flex flex-col md:flex-row"
        style={{ background: BG, border: `1px solid ${YELLOW}25` }}
      >
        {/* Panel izquierdo — comprobante */}
        <div className="flex-1 bg-black flex items-center justify-center p-4 min-h-[360px] overflow-auto">
          {loading ? (
            <div className="text-center">
              <Loader2 className="animate-spin mx-auto mb-3" style={{ color: YELLOW, width: 36, height: 36 }} />
              <p className="text-xs font-bold" style={{ color: `${YELLOW}90` }}>{msg}</p>
            </div>
          ) : sinComprobante ? (
            <div className="text-center max-w-xs">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)" }}
              >
                <ShieldCheck size={30} style={{ color: "#818cf8" }} />
              </div>
              <p className="text-sm font-black text-white mb-1">
                {refUpper === "NINO_GRATIS" ? "Inscripción gratuita" : "Inscripción admin"}
              </p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>{msg}</p>
            </div>
          ) : hit && !imgFailed ? (
            hit.isPdf ? (
              <iframe
                src={hit.url}
                title="Comprobante PDF"
                className="w-full h-[80vh] rounded-xl bg-white"
              />
            ) : (
              <img
                src={hit.url}
                alt={`Comprobante de ${atleta.nombre} ${atleta.apellido}`}
                className="max-h-[82vh] max-w-full object-contain"
                onError={() => setImgFailed(true)}
              />
            )
          ) : (
            <div className="text-center max-w-sm">
              <ShieldAlert size={48} className="mx-auto mb-4" style={{ color: "rgba(255,255,255,0.15)" }} />
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
                {imgFailed
                  ? "El archivo existe pero no se pudo mostrar. Ábrelo en una pestaña nueva."
                  : msg}
              </p>
            </div>
          )}
        </div>

        {/* Panel derecho — datos y acciones */}
        <div
          className="w-full md:w-[360px] p-6 flex flex-col gap-3 overflow-y-auto"
          style={{ background: "rgba(255,255,255,0.02)", borderLeft: `1px solid ${YELLOW}12` }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-lg font-black uppercase text-white leading-tight">
                {atleta.nombre} {atleta.apellido}
              </p>
              <p className="text-[10px] font-mono mt-1" style={{ color: `${YELLOW}90` }}>
                V-{atleta.cedula}{atleta.bib_number ? ` · Dorsal #${atleta.bib_number}` : ""}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="p-2 rounded-full hover:bg-white/10"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              <X size={18} />
            </button>
          </div>

          {[
            ["Teléfono",   atleta.telefono ?? "—"],
            ["Modalidad",  atleta.modalidad ?? "—"],
            ["Categoría",  atleta.categoria ?? "—"],
            ["Talla",      atleta.talla_camiseta ?? "N/A"],
            ["Referencia", atleta.referencia_pago ?? "Sin referencia"],
          ].map(([lbl, val]) => (
            <div
              key={lbl}
              className="rounded-xl px-4 py-3"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <p className="text-[9px] uppercase font-black" style={{ color: "rgba(255,255,255,0.35)" }}>{lbl}</p>
              <p className="text-xs font-bold text-white break-all">{val}</p>
            </div>
          ))}

          {/* Origen del comprobante */}
          {hit && (
            <div
              className="rounded-xl px-4 py-3"
              style={{
                background: `${SOURCE_STYLE[hit.source].color}10`,
                border    : `1px solid ${SOURCE_STYLE[hit.source].color}35`,
              }}
            >
              <p className="text-[9px] uppercase font-black" style={{ color: SOURCE_STYLE[hit.source].color }}>
                {SOURCE_STYLE[hit.source].label} · subido a {formatDelta(hit.deltaMin)} del registro
              </p>
              <p className="text-[10px] font-mono mt-1 break-all" style={{ color: "rgba(255,255,255,0.5)" }}>
                {hit.path}
              </p>
              {fueraDeVentana && (
                <p className="text-[10px] font-bold mt-2 flex items-start gap-1.5 text-amber-400">
                  <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                  Encontrado fuera de la carpeta de la caninata y lejos de la fecha de inscripción. Confirma que corresponde a esta carrera antes de aprobar.
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setScanNonce(n => n + 1)}
              disabled={loading || sinComprobante}
              className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1.5 disabled:opacity-30"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Re-escanear
            </button>
            {hit && (
              <a
                href={hit.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1.5"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}
              >
                <ExternalLink size={12} /> Abrir original
              </a>
            )}
          </div>

          <div className="mt-auto flex flex-col gap-2 pt-2">
            <button
              onClick={onToggleKit}
              disabled={togglingKit}
              className="w-full py-3 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 transition-all disabled:opacity-40 active:scale-95"
              style={atleta.kit_entregado
                ? { background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b" }
                : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }
              }
            >
              {togglingKit ? <RefreshCw size={14} className="animate-spin" /> : <Gift size={14} />}
              {atleta.kit_entregado ? "Kit entregado · revertir" : "Marcar kit entregado"}
            </button>
            <button
              onClick={onTogglePago}
              disabled={togglingPago}
              className="w-full py-3 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 transition-all disabled:opacity-40 active:scale-95"
              style={atleta.pago_verificado
                ? { background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e" }
                : { background: YELLOW, color: BG }
              }
            >
              {togglingPago
                ? <RefreshCw size={14} className="animate-spin" />
                : atleta.pago_verificado ? <CheckCircle size={14} /> : <ShieldCheck size={14} />
              }
              {atleta.pago_verificado ? "Pago validado · revertir" : "Aprobar pago"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ─── [V1.3-7] PESTAÑA ENTREGA DE KITS POR DORSAL ─────────────────────────────
interface EntregaKitsProps {
  atletas    : Atleta[];
  loading    : boolean;
  togglingKit: string | null;
  onToggleKit: (id: string, current: boolean) => Promise<boolean>;
}

const EntregaKitsCaninata = ({ atletas, loading, togglingKit, onToggleKit }: EntregaKitsProps) => {
  const [bibInput, setBibInput] = useState("");
  const [targetId, setTargetId] = useState<string | null>(null);
  const [msg,      setMsg]      = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const bibRef   = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  // Instancia viva: refleja cambios hechos desde la tabla o el modal
  const target = useMemo(
    () => atletas.find(a => a.id === targetId) ?? null,
    [atletas, targetId],
  );

  const total      = atletas.length;
  const entregados = atletas.filter(a => a.kit_entregado).length;
  const pct        = total > 0 ? Math.round((entregados / total) * 100) : 0;

  const reset = () => {
    setTargetId(null);
    setBibInput("");
    bibRef.current?.focus();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = bibInput.trim();
    if (!q) return;
    const n = Number(q);
    const found = atletas.filter(a => {
      if (a.bib_number == null || a.bib_number === "") return false;
      return Number.isFinite(n) ? Number(a.bib_number) === n : String(a.bib_number) === q;
    });
    if (found.length === 0) {
      setTargetId(null);
      setMsg({ text: `Dorsal #${q} no está asignado en esta carrera.`, type: "error" });
      return;
    }
    if (found.length > 1) {
      setTargetId(null);
      setMsg({ text: `Dorsal #${q} está asignado a ${found.length} atletas. Corrige el duplicado antes de entregar.`, type: "error" });
      return;
    }
    setTargetId(found[0].id);
    setMsg(found[0].kit_entregado
      ? { text: `El kit del dorsal #${q} ya fue entregado.`, type: "error" }
      : { text: "Atleta identificado. Confirma la entrega.", type: "info" });
  };

  const handleToggle = async () => {
    if (!target) return;
    const wasDelivered = target.kit_entregado;
    const ok = await onToggleKit(target.id, wasDelivered);
    if (!ok) {
      setMsg({ text: "No se guardó el cambio. Revisa la conexión e intenta de nuevo.", type: "error" });
      return;
    }
    setMsg({
      text: wasDelivered
        ? `Entrega revertida · #${target.bib_number}`
        : `Kit entregado · #${target.bib_number} ${target.nombre} ${target.apellido}`,
      type: wasDelivered ? "info" : "success",
    });
    setTargetId(null);
    setBibInput("");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { setMsg(null); bibRef.current?.focus(); }, 2500);
  };

  const msgStyle = (type: "success" | "error" | "info") =>
    type === "success" ? { background: "rgba(34,197,94,0.1)",  border: "1px solid rgba(34,197,94,0.3)",  color: "#22c55e" }
    : type === "error" ? { background: "rgba(239,68,68,0.1)",  border: "1px solid rgba(239,68,68,0.3)",  color: "#f87171" }
    :                    { background: `${YELLOW}12`,          border: `1px solid ${YELLOW}30`,          color: YELLOW    };

  return (
    <div className="space-y-4">
      {/* Progreso */}
      <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(245,158,11,0.2)" }}>
        <div className="flex justify-between items-center mb-3">
          <p className="text-xs font-bold" style={{ color: "rgba(255,255,255,0.6)" }}>
            {entregados} de {total} kits entregados · {total - entregados} pendientes
          </p>
          <p className="text-lg font-black italic text-amber-400">{pct}%</p>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${YELLOW}, #f59e0b)` }}
          />
        </div>
      </div>

      {/* Buscador por dorsal */}
      <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${YELLOW}15` }}>
        <form onSubmit={handleSearch} className="flex gap-3 mb-4">
          <div className="flex-1">
            <label className="block text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: `${YELLOW}90` }}>
              Número de dorsal
            </label>
            <input
              ref={bibRef}
              type="text"
              inputMode="numeric"
              value={bibInput}
              onChange={e => setBibInput(e.target.value)}
              disabled={loading}
              autoFocus
              placeholder="0001"
              className="w-full rounded-xl px-4 py-3.5 text-2xl font-black text-white outline-none placeholder:text-white/15"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${YELLOW}20` }}
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={!bibInput.trim() || loading}
              className="h-[60px] px-6 rounded-xl font-black uppercase text-xs tracking-widest flex items-center gap-2 disabled:opacity-40"
              style={{ background: YELLOW, color: BG }}
            >
              <Search size={16} /> Buscar
            </button>
          </div>
        </form>

        {msg && (
          <div className="p-3 mb-4 rounded-xl text-xs font-bold" style={msgStyle(msg.type)}>
            {msg.text}
          </div>
        )}

        {target && (
          <div className="space-y-3 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-xl font-black uppercase text-white">{target.nombre} {target.apellido}</p>
                <p className="text-[10px] font-mono mt-1" style={{ color: `${YELLOW}90` }}>
                  V-{target.cedula} · {target.modalidad ?? "—"} · {target.categoria ?? "Sin categoría"}
                </p>
              </div>
              <div className="rounded-xl p-4 flex flex-col items-center justify-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-[9px] uppercase font-black" style={{ color: "rgba(255,255,255,0.35)" }}>Talla</p>
                <p className="text-3xl font-black italic text-amber-400">{target.talla_camiseta ?? "N/A"}</p>
              </div>
            </div>

            {!target.pago_verificado && !target.kit_entregado && (
              <div className="p-3 rounded-xl text-xs font-bold flex items-start gap-2" style={msgStyle("error")}>
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                El pago de este atleta no está verificado. Revisa el comprobante en la pestaña Inscritos antes de entregar.
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleToggle}
                disabled={togglingKit === target.id}
                className="flex-1 py-3.5 rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 disabled:opacity-40 active:scale-95"
                style={target.kit_entregado
                  ? { background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }
                  : { background: "#22c55e", color: BG }
                }
              >
                {togglingKit === target.id
                  ? <RefreshCw size={16} className="animate-spin" />
                  : target.kit_entregado ? <RefreshCw size={16} /> : <CheckCircle size={16} />
                }
                {target.kit_entregado ? "Revertir entrega" : "Confirmar entrega"}
              </button>
              <button
                onClick={() => { reset(); setMsg(null); }}
                className="px-5 py-3.5 rounded-xl font-black uppercase text-xs"
                style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.5)" }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── PIN GATE ────────────────────────────────────────────────────────────────
const PinGate = ({ onAuth }: { onAuth: () => void }) => {
  const [pin,     setPin]     = useState("");
  const [error,   setError]   = useState(false);
  const [visible, setVisible] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.trim().toUpperCase() === PIN_CORRECTO) {
      localStorage.setItem(LS_KEY, "1");
      onAuth();
    } else {
      setError(true);
      setPin("");
      setTimeout(() => setError(false), 2500);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: BG }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: `${YELLOW}15`, border: `1px solid ${YELLOW}30` }}
          >
            <Dog size={28} style={{ color: YELLOW }} />
          </div>
          <h1
            className="text-2xl font-black italic uppercase leading-none mb-1"
            style={{ color: "#ffffff" }}
          >
            Caninata
          </h1>
          <p
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: `${YELLOW}80` }}
          >
            Panel de Organizador
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl p-6 space-y-4"
          style={{
            background: "rgba(255,255,255,0.02)",
            border    : `1px solid ${error ? "rgba(239,68,68,0.4)" : `${YELLOW}20`}`,
            transition: "border-color 0.3s",
          }}
        >
          <div>
            <label
              className="block text-[10px] font-black uppercase tracking-widest mb-2"
              style={{ color: `${YELLOW}90` }}
            >
              Código de Acceso
            </label>
            <div className="relative">
              <Lock
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: `${YELLOW}50` }}
              />
              <input
                type={visible ? "text" : "password"}
                value={pin}
                onChange={e => setPin(e.target.value)}
                autoFocus
                placeholder="••••••••••••"
                className="w-full rounded-xl pl-9 pr-10 py-3 text-sm font-bold text-white outline-none placeholder:text-white/20"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border    : `1px solid ${error ? "rgba(239,68,68,0.5)" : `${YELLOW}20`}`,
                }}
              />
              <button
                type="button"
                onClick={() => setVisible(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: `${YELLOW}50` }}
              >
                {visible ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {error && (
              <p className="text-[10px] text-red-400 font-bold mt-2 flex items-center gap-1">
                <AlertCircle size={10} /> Código incorrecto
              </p>
            )}
          </div>
          <button
            type="submit"
            className="w-full py-3.5 rounded-xl font-black uppercase text-xs tracking-widest transition-all active:scale-95"
            style={{ background: YELLOW, color: BG }}
          >
            Acceder
          </button>
        </form>

        <p
          className="text-center mt-6 text-[9px] uppercase tracking-widest font-bold"
          style={{ color: "rgba(255,255,255,0.15)" }}
        >
          RAYOCERO · Valkyron Group
        </p>
      </div>
    </div>
  );
};

// ─── DASHBOARD PRINCIPAL ──────────────────────────────────────────────────────
const CaninataDashboardMain = ({ onLogout }: { onLogout: () => void }) => {
  const [race,             setRace]             = useState<CaninatRace | null>(null);
  const [atletas,          setAtletas]          = useState<Atleta[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [searchTerm,       setSearchTerm]       = useState("");
  const [activeTab,        setActiveTab]        = useState<"atletas" | "kits" | "config">("atletas"); // [V1.3-7] + "kits"
  const [error,            setError]            = useState<string | null>(null);
  const [togglingPago,     setTogglingPago]     = useState<string | null>(null);  // [V1.2-1]
  const [togglingKit,      setTogglingKit]      = useState<string | null>(null);  // [V1.2-2]
  const [inspectId,        setInspectId]        = useState<string | null>(null);  // [V1.3-4]

  // [V1.3-4] Atleta inspeccionado derivado del estado — los toggles se reflejan sin sincronización manual
  const inspected = useMemo(
    () => atletas.find(a => a.id === inspectId) ?? null,
    [atletas, inspectId],
  );

  // Cargar carrera caninata activa
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("races")
          .select("id,name")
          .ilike("name", "%caninata%")
          .eq("inscripciones_abiertas", true)
          .maybeSingle();
        if (error) throw error;
        if (!data) {
          const { data: fallback } = await supabase
            .from("races")
            .select("id,name")
            .ilike("name", "%caninata%")
            .order("date", { ascending: false })
            .limit(1)
            .maybeSingle();
          setRace(fallback ?? null);
        } else {
          setRace(data);
        }
      } catch {
        setError("No se pudo cargar la carrera caninata.");
      }
    })();
  }, []);

  const fetchAtletas = useCallback(async () => {
    if (!race) return;
    setLoading(true);
    try {
      // [V1.3-1] select("*"): incluye referencia_pago / comprobante_* sin romper si alguna columna no existe
      const { data, error } = await supabase
        .from("runners")
        .select("*")
        .eq("race_id", race.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setAtletas((data as Atleta[]) || []);
    } catch {
      setError("Error cargando atletas.");
    } finally {
      setLoading(false);
    }
  }, [race]);

  useEffect(() => { fetchAtletas(); }, [fetchAtletas]);

  // [V1.2-1] Toggle pago — actualización optimista
  // [V1.3-6] Retorna true/false según resultado real en Supabase
  const togglePago = async (id: string, current: boolean): Promise<boolean> => {
    setTogglingPago(id);
    const next = !current;
    // Optimista: UI primero
    setAtletas(prev => prev.map(a => a.id === id ? { ...a, pago_verificado: next } : a));
    try {
      const { error } = await supabase
        .from("runners")
        .update({ pago_verificado: next })
        .eq("id", id);
      if (error) throw error;
      return true; // [V1.3-6]
    } catch {
      // Revertir si falla
      setAtletas(prev => prev.map(a => a.id === id ? { ...a, pago_verificado: current } : a));
      setError("Error actualizando pago. Intenta de nuevo.");
      setTimeout(() => setError(null), 3000);
      return false; // [V1.3-6]
    } finally {
      setTogglingPago(null);
    }
  };

  // [V1.2-2] Toggle kit — actualización optimista
  // [V1.3-6] Retorna true/false según resultado real en Supabase
  const toggleKit = async (id: string, current: boolean): Promise<boolean> => {
    setTogglingKit(id);
    const next = !current;
    // Optimista: UI primero
    setAtletas(prev => prev.map(a => a.id === id ? { ...a, kit_entregado: next } : a));
    try {
      const { error } = await supabase
        .from("runners")
        .update({ kit_entregado: next })
        .eq("id", id);
      if (error) throw error;
      return true; // [V1.3-6]
    } catch {
      // Revertir si falla
      setAtletas(prev => prev.map(a => a.id === id ? { ...a, kit_entregado: current } : a));
      setError("Error actualizando kit. Intenta de nuevo.");
      setTimeout(() => setError(null), 3000);
      return false; // [V1.3-6]
    } finally {
      setTogglingKit(null);
    }
  };

  const closeInspect = useCallback(() => setInspectId(null), []); // [V1.3-4]

  const filtered = useMemo(() => {
    if (!searchTerm) return atletas;
    const t = searchTerm.toLowerCase();
    return atletas.filter(a =>
      `${a.nombre} ${a.apellido} ${a.cedula} ${a.categoria ?? ""} ${a.telefono ?? ""}`.toLowerCase().includes(t)
    );
  }, [atletas, searchTerm]);

  const total    = atletas.length;
  const pagados  = atletas.filter(a => a.pago_verificado).length;
  const kits     = atletas.filter(a => a.kit_entregado).length;
  const count10k = atletas.filter(a => a.modalidad === "10K").length;
  const count5k  = atletas.filter(a => a.modalidad === "5K").length;

  return (
    <div className="min-h-screen font-sans" style={{ background: BG, color: "#ffffff" }}>

      {/* NAVBAR */}
      <nav
        className="sticky top-0 z-50 flex items-center justify-between px-5 py-4 border-b"
        style={{ background: `${BG}ee`, borderColor: `${YELLOW}18`, backdropFilter: "blur(12px)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center"
            style={{ background: `${YELLOW}15`, border: `1px solid ${YELLOW}30` }}
          >
            <Dog size={18} style={{ color: YELLOW }} />
          </div>
          <div>
            <p className="text-sm font-black italic uppercase leading-none">Caninata</p>
            <p
              className="text-[9px] uppercase tracking-widest"
              style={{ color: `${YELLOW}60` }}
            >
              {race?.name ?? "Cargando..."}
            </p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 text-[10px] uppercase font-black px-3 py-2 rounded-lg transition-all hover:bg-white/5"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          <LogOut size={13} /> Salir
        </button>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">

        {error && (
          <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm font-bold flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* CONTADORES */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total inscritos",   value: total,                      color: YELLOW    },
            { label: "Pagos verificados", value: `${pagados} / ${total}`,    color: "#22c55e" },
            { label: "Kits entregados",   value: `${kits} / ${total}`,       color: "#f59e0b" },
            { label: "10K / 5K",          value: `${count10k} / ${count5k}`, color: YELLOW    },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="rounded-2xl p-4 flex flex-col gap-1"
              style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${color}20` }}
            >
              <p
                className="text-[9px] uppercase font-black tracking-widest"
                style={{ color: `${color}80` }}
              >
                {label}
              </p>
              <p className="text-2xl font-black italic" style={{ color }}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* TABS */}
        <div className="flex gap-2 flex-wrap">
          {([
            { id: "atletas", label: `Inscritos (${total})`,           icon: <Users size={13} />   },
            { id: "kits",    label: `Entrega Kits (${kits}/${total})`, icon: <Package size={13} /> }, // [V1.3-7]
            { id: "config",  label: "Tarifas",                         icon: <Save size={13} />    },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all"
              style={activeTab === tab.id
                ? { background: YELLOW, color: BG }
                : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.08)" }
              }
            >
              {tab.icon} {tab.label}
            </button>
          ))}

          <button
            onClick={fetchAtletas}
            className="ml-auto p-2.5 rounded-xl transition-all hover:bg-white/5"
            style={{ color: `${YELLOW}60`, border: `1px solid ${YELLOW}15` }}
            title="Actualizar lista"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* TAB: ATLETAS */}
        {activeTab === "atletas" && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: `1px solid ${YELLOW}15` }}
          >
            {/* Buscador */}
            <div
              className="p-4 border-b"
              style={{ borderColor: `${YELLOW}10`, background: "rgba(255,255,255,0.01)" }}
            >
              <div className="relative max-w-sm">
                <Search
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: `${YELLOW}50` }}
                />
                <input
                  type="text"
                  placeholder="Buscar nombre, cédula o teléfono..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl pl-9 pr-4 py-2.5 text-xs text-white outline-none placeholder:text-white/20"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border    : `1px solid ${YELLOW}15`,
                  }}
                />
              </div>
            </div>

            {/* Leyenda botones */}
            <div
              className="px-4 py-2 flex items-center gap-4 border-b text-[9px] font-black uppercase"
              style={{ borderColor: `${YELLOW}08`, background: "rgba(255,255,255,0.005)", color: "rgba(255,255,255,0.25)" }}
            >
              {/* [V1.3-8] */}
              <span className="flex items-center gap-1">
                <FileText size={10} style={{ color: YELLOW }} /> Ver comprobante
              </span>
              <span className="flex items-center gap-1">
                <Shield size={10} style={{ color: "#22c55e" }} /> Verificar pago
              </span>
              <span className="flex items-center gap-1">
                <Gift size={10} style={{ color: "#f59e0b" }} /> Marcar kit
              </span>
              <span className="ml-auto">Toca el ícono para cambiar estado</span>
            </div>

            {/* Tabla */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                    {["Atleta", "Teléfono", "Dorsal", "Modalidad", "Categoría", "Talla", "Comprobante", "Pago", "Kit"].map(h => ( /* [V1.3-8] + Comprobante */
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[9px] uppercase font-black tracking-widest whitespace-nowrap"
                        style={{ color: `${YELLOW}60` }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center">
                        <Loader2
                          className="animate-spin mx-auto"
                          style={{ color: YELLOW, width: 28, height: 28 }}
                        />
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="py-16 text-center text-[10px] uppercase font-black"
                        style={{ color: "rgba(255,255,255,0.2)" }}
                      >
                        {searchTerm ? "Sin coincidencias" : "No hay atletas inscritos aún"}
                      </td>
                    </tr>
                  ) : filtered.map((a, i) => {
                    // [V1.3-8] Etiqueta de comprobante
                    const refU = String(a.referencia_pago ?? "").toUpperCase();
                    const compLabel = refU === "INSCRIPCION_ADMIN" ? "ADMIN"
                      : refU === "NINO_GRATIS" ? "GRATIS"
                      : "VER";
                    return (
                    <tr
                      key={a.id}
                      style={{
                        borderTop : "1px solid rgba(255,255,255,0.04)",
                        background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                      }}
                    >
                      {/* Atleta */}
                      <td className="px-4 py-3">
                        <p className="text-xs font-black uppercase text-white whitespace-nowrap">
                          {a.nombre} {a.apellido}
                        </p>
                        <p
                          className="text-[9px] font-mono mt-0.5"
                          style={{ color: "rgba(255,255,255,0.35)" }}
                        >
                          V-{a.cedula}
                        </p>
                      </td>

                      {/* Teléfono */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Phone size={11} style={{ color: `${YELLOW}60`, flexShrink: 0 }} />
                          <span
                            className="text-[10px] font-mono font-bold whitespace-nowrap"
                            style={{ color: `${YELLOW}90` }}
                          >
                            {a.telefono ?? "—"}
                          </span>
                        </div>
                      </td>

                      {/* Dorsal */}
                      <td className="px-4 py-3">
                        <span className="text-sm font-black" style={{ color: YELLOW }}>
                          {a.bib_number ? `#${a.bib_number}` : "—"}
                        </span>
                      </td>

                      {/* Modalidad */}
                      <td className="px-4 py-3">
                        <span
                          className="text-[9px] font-black uppercase px-2.5 py-1 rounded-full whitespace-nowrap"
                          style={a.modalidad === "10K"
                            ? { background: `${YELLOW}12`, color: YELLOW, border: `1px solid ${YELLOW}25` }
                            : a.modalidad === "5K"
                            ? { background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.25)" }
                            : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.08)" }
                          }
                        >
                          {a.modalidad === "10K" ? "🏃 10K"
                            : a.modalidad === "5K" ? "🐕 5K"
                            : "—"}
                        </span>
                      </td>

                      {/* Categoría */}
                      <td className="px-4 py-3">
                        <span
                          className="text-[9px] uppercase font-bold whitespace-nowrap"
                          style={{ color: "rgba(255,255,255,0.5)" }}
                        >
                          {a.categoria ?? "—"}
                        </span>
                      </td>

                      {/* Talla */}
                      <td className="px-4 py-3">
                        <span
                          className="text-[9px] font-mono font-bold px-2 py-0.5 rounded"
                          style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)" }}
                        >
                          {a.talla_camiseta ?? "N/A"}
                        </span>
                      </td>

                      {/* [V1.3-8] Comprobante — abre modal de inspección */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setInspectId(a.id)}
                          title="Ver comprobante de pago"
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all active:scale-95 hover:brightness-125"
                          style={compLabel === "VER"
                            ? { background: `${YELLOW}10`, border: `1px solid ${YELLOW}30`, color: YELLOW }
                            : { background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)", color: "#818cf8" }
                          }
                        >
                          <Eye size={12} />
                          <span className="text-[9px] font-black uppercase whitespace-nowrap">{compLabel}</span>
                        </button>
                      </td>

                      {/* [V1.2-1] Pago — botón toggle */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => togglePago(a.id, a.pago_verificado)}
                          disabled={togglingPago === a.id}
                          title={a.pago_verificado ? "Clic para desverificar pago" : "Clic para verificar pago"}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-40 active:scale-95"
                          style={a.pago_verificado
                            ? { background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e" }
                            : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.3)" }
                          }
                        >
                          {togglingPago === a.id
                            ? <RefreshCw size={12} className="animate-spin" />
                            : a.pago_verificado
                            ? <ShieldCheck size={12} />
                            : <Shield size={12} />
                          }
                          <span className="text-[9px] font-black uppercase whitespace-nowrap">
                            {a.pago_verificado ? "OK" : "—"}
                          </span>
                        </button>
                      </td>

                      {/* [V1.2-2] Kit — botón toggle */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleKit(a.id, a.kit_entregado)}
                          disabled={togglingKit === a.id}
                          title={a.kit_entregado ? "Clic para revertir entrega de kit" : "Clic para marcar kit entregado"}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-40 active:scale-95"
                          style={a.kit_entregado
                            ? { background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b" }
                            : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.3)" }
                          }
                        >
                          {togglingKit === a.id
                            ? <RefreshCw size={12} className="animate-spin" />
                            : <Gift size={12} />
                          }
                          <span className="text-[9px] font-black uppercase whitespace-nowrap">
                            {a.kit_entregado ? "OK" : "—"}
                          </span>
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer tabla */}
            {!loading && filtered.length > 0 && (
              <div
                className="px-4 py-3 text-[9px] uppercase font-black"
                style={{
                  color    : "rgba(255,255,255,0.2)",
                  borderTop: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                Mostrando {filtered.length} de {total} atletas
              </div>
            )}
          </div>
        )}

        {/* [V1.3-7] TAB: ENTREGA DE KITS */}
        {activeTab === "kits" && (
          <EntregaKitsCaninata
            atletas={atletas}
            loading={loading}
            togglingKit={togglingKit}
            onToggleKit={toggleKit}
          />
        )}

        {/* TAB: CONFIG TARIFAS */}
        {activeTab === "config" && race && (
          <div
            className="rounded-2xl p-6"
            style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${YELLOW}15` }}
          >
            <h3
              className="text-sm font-black uppercase tracking-widest mb-6"
              style={{ color: YELLOW }}
            >
              Configuración de Tarifas — {race.name}
            </h3>
            <TasaConfigCaninata raceId={race.id} />
          </div>
        )}

        {activeTab === "config" && !race && (
          <div
            className="py-12 text-center text-sm font-bold"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            No se encontró una carrera caninata activa.
          </div>
        )}

        <p
          className="text-center text-[9px] uppercase tracking-widest font-bold pb-4"
          style={{ color: "rgba(255,255,255,0.1)" }}
        >
          CANINATA · RAYOCERO · VALKYRON GROUP
        </p>
      </div>

      {/* [V1.3-4] Modal de inspección de comprobante */}
      {inspected && race && (
        <ComprobanteModal
          atleta={inspected}
          raceName={race.name}
          togglingPago={togglingPago === inspected.id}
          togglingKit={togglingKit === inspected.id}
          onTogglePago={() => togglePago(inspected.id, inspected.pago_verificado)}
          onToggleKit={() => toggleKit(inspected.id, inspected.kit_entregado)}
          onClose={closeInspect}
        />
      )}
    </div>
  );
};

// ─── ROOT ────────────────────────────────────────────────────────────────────
export default function CaninataDashboard() {
  const [authed, setAuthed] = useState(
    () => localStorage.getItem(LS_KEY) === "1"
  );

  const handleLogout = () => {
    localStorage.removeItem(LS_KEY);
    setAuthed(false);
  };

  if (!authed) return <PinGate onAuth={() => setAuthed(true)} />;
  return <CaninataDashboardMain onLogout={handleLogout} />;
}
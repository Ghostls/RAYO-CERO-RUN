/**
 * RAYOCERO — REGISTRATION TERMINAL (V38.3.4 — TITULAR DE CASHEA)
 * Senior Dev: MIA (Valkyron Group)
 * CEO: Lualdo Sciscioli
 * Architecture: React / TypeScript / Supabase / React Query / Framer Motion
 * REGLA DE ORO: Evolución sin Destrucción. Código completo. Copy-paste ready.
 *
 * CHANGELOG V38.3.4 (sobre V38.3.3):
 * [V38.3.4-1] Campo obligatorio Nombre completo del titular de Cashea.
 * [V38.3.4-2] Persiste el nombre en banco_origen solo cuando metodo=Cashea;
 *             la API actual ya acepta bancoOrigen, sin alterar SQL ni rutas.
 * [V38.3.4-3] Dorsal LED inmediato y verificacion manual sin cambios.
 *
 * CHANGELOG V38.3 (evoluciona sobre V38.2):
 * [V38.3-1] Selector de pago móvil / Cashea en carreras LED 10K y 5K.
 * [V38.3-2] Abre enlace oficial compartido Cashea en otra pestaña/app.
 * [V38.3-3] Retorno al formulario + captura obligatoria de cuota inicial Cashea.
 * [V38.3-4] Referencia CASHEA-* en runners.referencia_pago para revisión admin.
 * [V38.3-5] CASHEA: genera y muestra el dorsal inmediatamente; la verificación del pago sigue pendiente.
 * [V38.3-7] Restaura navegación original /dorsal para ambos métodos; señal visual para aviso debajo del dorsal.
 * [V38.3-6] WE CAN MOVE 3K gratuito y pago móvil original intactos.
 * AVISO: enlace de PRODUCTO COMPARTIDO, no sesión individual ni pago automático.
 *
 * CHANGELOG V38.2 (evoluciona sobre V38.1):
 * [V38.2-1] Fecha de nacimiento segmentada DD / MM / AAAA con teclado numerico
 *           movil, sin obligar a desplazar el calendario nativo de Android.
 * [V38.2-2] Validacion de calendario, bisiestos, fecha futura y anio 1900+.
 * [V38.2-3] Conversion a ISO YYYY-MM-DD para API, edad, categorias y Supabase.
 * [V38.2-4] Previene envios con fecha incompleta/invalida; no usa fecha inventada.
 * [V38.2-5] Inscripciones, eventos, pagos, dorsales y mascotas sin alteraciones.
 *
 * CHANGELOG V38.1 (evoluciona sobre V38.0):
 * [V38.1-1] Selector "SELECCIONA TU EVENTO": la carrera WE RUN RAYOCERO Coro
 *           ahora genera DOS tarjetas: (a) WE RUN LED CORO 10K / 5K y
 *           (b) WE CAN MOVE 3K MASCOTAS GRATIS (21 NOV 2026, 5:00 PM).
 * [V38.1-2] La tarjeta 3K navega con ?race=<id LED>&modo=wecanmove. Se reutiliza
 *           el mismo race_id → BD, RLS, INSERT y confirmación NO cambian.
 * [V38.1-3] getRaceCfg(race, modoWeCanMove): modo 3K → solo ["3K"] con fecha
 *           propia; modo LED → solo ["10K","5K"]. El 3K ya no se mezcla en el
 *           selector de modalidad de la LED.
 * [V38.1-4] "Cambiar de evento" limpia la URL (race + modo) y recarga la lista.
 * [V38.1-5] Prefetch de DorsalLed omitido en modo 3K (no genera dorsal).
 *
 * CHANGELOG V38.0 (evoluciona sobre V37.9):
 * [V38.0-1] 3K gratuito se inserta en tabla independiente we_can_move_registrations.
 * [V38.0-2] NO requiere cambiar lib/api.ts ni tocar runners, precios o dorsal LED.
 * [V38.0-3] Un participante de 10K/5K también puede inscribirse en 3K.
 * [V38.0-4] La BD valida evento correcto, unicidad y ausencia de kit/pago.
 *
 * CHANGELOG V37.9 (evoluciona sobre V37.8):
 * [V37.9-1] Modalidad 3K WE CAN MOVE, gratuita y exclusiva de WE RUN LED Coro.
 * [V37.9-2] Fecha propia: 21/NOV/2026, 5:00 PM, Ciudad Deportiva Universitaria.
 * [V37.9-3] Mascota obligatoria; sin pago, comprobante, talla ni kit.
 * [V37.9-4] Muestra confirmación propia sin dorsal pago.
 * [V37.9-5] Protege el precio de 10K/5K sin afectar otras carreras.
 * NOTA: ejecutar WE_CAN_MOVE.sql antes de activar la modalidad gratuita.
 *
 * CHANGELOG V37.8 (evoluciona sobre V37.7):
 * [V37.8-1] Aviso obligatorio a nuevos inscritos CANINATA 18/OCT/2026:
 *           la franela sera entregada despues del evento por contacto directo.
 * [V37.8-2] Confirmacion explicita antes de inscribir, aislada de otras carreras.
 * [V37.8-3] El flag lo persiste el trigger de Supabase (migracion SQL adjunta);
 *           no modifica registerRunner ni el flujo de dorsal, pago o kit.
 *
 * CHANGELOG V37.7 (evoluciona sobre V37.6):
 * [V37.7-1] Prefetch de pages/DorsalLed mientras el usuario llena el
 *           formulario de una carrera LED: descarga el chunk y, al evaluarse,
 *           el módulo precarga el arte del dorsal y las fuentes. Al enviar,
 *           /dorsal abre sin esperas de red. Otras carreras: sin cambios.
 *
 * CHANGELOG V37.6 (base preservada):
 * [V37.6-1] BUG FIX: isLedRunRace() no detectaba la carrera real
 *           "WE RUN RAYOCERO 10K - 5K CORO" (el nombre en BD no contiene
 *           "LED") → se cargaba CORO_CONFIG (499: 10K/4K, cian, costo 4K).
 *           Ahora detecta "LED" como palabra completa O "WE RUN RAYOCERO".
 *           Regex alineada 1:1 con isLedEvento() de DorsalLed.tsx.
 * [V37.6-2] "led" pasa a coincidencia por palabra (\bled\b): evita falsos
 *           positivos por subcadena en nombres que contengan "led".
 * [V37.6-3] Efecto en cascada (sin tocar más código): config LED_CORO_CONFIG
 *           (10K / 5K caminata), color #FCD34D, badge del selector, costo
 *           costo_5k_usd y navegación /dorsal?...&tipo=led&modalidad=...
 *           → DorsalRouter renderiza DorsalLed.
 *
 * CHANGELOG V37.5 (base preservada):
 * [V37.5-1] mapRegistrationError(): traduce errores Postgres/PostgREST a
 *           mensajes accionables, identificando el índice violado por nombre:
 *           uniq_cedula_por_carrera / runners_cedula_per_race,
 *           uniq_email_por_carrera / runners_email_per_race,
 *           uniq_bib_por_carrera, runners_rfid_epc_key, FK race_id, CHECKs.
 *           Log completo a consola (code, details, hint) para diagnóstico.
 * [V37.5-2] Normalización de entrada antes del INSERT: cédula sin espacios,
 *           email trim + lowercase (los índices únicos son case-sensitive).
 * [V37.5-3] Pre-check de cédula duplicada en la misma carrera ANTES de subir
 *           el comprobante → evita el 409 y archivos huérfanos en storage.
 *           Si RLS bloquea el SELECT, se omite el pre-check (fail-open) y el
 *           índice único de BD sigue siendo la garantía final.
 * [V37.5-4] Navegación a /dorsal para LED Coro: agrega &tipo=led&modalidad=
 *           para que la página Dorsal seleccione dorsal-led.png.
 *           499 Coro conserva exactamente la URL de V37.4.
 *
 * CHANGELOG V37.4 (base preservada):
 * [V37.4-1] LED_CORO_CONFIG: modalidadesDisponibles ["10K", "5K"] — 5K CAMINATA.
 * [V37.4-2] isCaminata5K: "5K" en carrera tipo "carrera" = caminata recreativa.
 * [V37.4-3] getModalidadMeta(m, tipo): 5K → "5K CAMINATA" (Footprints).
 * [V37.4-4] usePrecioEvento(raceId, modalidad, usaCosto5k): costo_5k_usd.
 * [V37.4-5] categoria: 5K caminata → "Caminata Recreativa 5K".
 * [V37.4-6] Preview de categoría visible también para 5K caminata.
 * [V37.4-7] Badge del selector de eventos LED: "10K CARRERA / 5K CAMINATA".
 * [V37.4-8] Botón submit: label + ícono Footprints para 5K caminata.
 *
 * CHANGELOG V37.3 (base preservada):
 * [V37.3-1] LED_CORO_CONFIG: config estática WE RUN RAYOCERO LED CORO 10K.
 * [V37.3-2] isLedRunRace(): detector por keyword "led".
 * [V37.3-3] getRaceCfg(): LED evaluado ANTES que el fallback CORO_CONFIG.
 * [V37.3-4] accentColor LED: "#FCD34D".
 * [V37.3-5] Selector de modalidad: una sola modalidad → grid-cols-1.
 * [V37.3-6] Badge de carrera en selector de eventos por tipo.
 *
 * CHANGELOG V37.2 (base preservada):
 * [V37.2-1] BUG FIX CRÍTICO: onSuccess detecta isCaninataRaceType en lugar de
 *           modalidad==="5K". Cualquier modalidad caninata navega a /dorsal?tipo=caninata.
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, AlertCircle, Banknote,
  ChevronRight, Flag, Timer, Dog, Calendar, Check, Copy, Zap, ShieldAlert,
  Footprints, Shirt, ExternalLink, CreditCard, UploadCloud, // [V38.3]
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import imageCompression from "browser-image-compression";

import { registerRunner, calcularEdad, type RegistrationFormData } from "@/lib/api";
import { supabase } from "@/lib/supabase";

import dorsalCoroSrc from "../assets/dorsal-led.png";

let dorsalCaninataSrc: string = dorsalCoroSrc;
try { dorsalCaninataSrc = require("../assets/dorsal-caninata.png").default; } catch (_) {}

// ---------------------------------------------------------------------------
// TIPOS
// ---------------------------------------------------------------------------

type Modalidad = "10K" | "4K" | "5K" | "3K";

interface ActiveRace {
  id: string; name: string; slug: string | null; date: string;
  time: string | null; location: string | null; inscripciones_abiertas: boolean;
}

interface RaceStaticConfig {
  tipo: "carrera" | "caninata";
  modalidadesDisponibles: Modalidad[];
  evento: {
    nombre: string; fecha: string; hora: string; distancia: string;
    atletas: string; lugar: string; proximaEd: string; targetDate: Date;
  };
  pago: { titular: string; cedula: string; pagoMovil: string; banco: string; cuenta: string; };
}

interface PetData { nombrePerro: string; razaPerro: string; }

// Cashea envió este enlace de producto compartido; no es una orden única por participante.
// IMPORTANTE: confirmar con RayoCero que los precios del producto corresponden
// a la(s) modalidad(es) habilitadas. La app Cashea fija las cuotas y la inicial.
const CASHEA_LINK = "https://mobile.cashea.app/products/226c2f83-35c8-4866-b10a-c0e0ba5423cb";
type MetodoPago = "pago_movil" | "cashea";

const RAZAS_COMUNES: string[] = [
  "Mestizo / Criollo","Labrador Retriever","Golden Retriever","Pastor Alemán",
  "Bulldog Francés","Poodle / Caniche","Beagle","Chihuahua","Schnauzer",
  "Dachshund / Salchicha","Rottweiler","Doberman","Pitbull / American Stafford",
  "Shih Tzu","Yorkshire Terrier","Maltés","Bichón Frisé","Boxer",
  "Husky Siberiano","Border Collie","Cocker Spaniel","Pomerania",
  "Jack Russell Terrier","Otra raza",
];

// ---------------------------------------------------------------------------
// GUARDIA DE GÉNERO/CATEGORÍA
// ---------------------------------------------------------------------------

function validateGenderCategory(genero: "M" | "F", categoria: string): string | null {
  const cat = categoria.toLowerCase();
  if (
    cat.includes("movilidad reducida") ||
    cat.includes("caninata") ||
    cat.includes("caminata")
  ) return null;

  const expectMasculino = genero === "M";
  const catHasMasculino = cat.includes("masculino");
  const catHasFemenino  = cat.includes("femenino");

  if (!catHasMasculino && !catHasFemenino) return null;

  if (expectMasculino && catHasFemenino) {
    return `Conflicto Género/Categoría: seleccionaste Masculino pero la categoría calculada es "${categoria}". Verifica tu género y fecha de nacimiento.`;
  }
  if (!expectMasculino && catHasMasculino) {
    return `Conflicto Género/Categoría: seleccionaste Femenino pero la categoría calculada es "${categoria}". Verifica tu género y fecha de nacimiento.`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// [V37.5-1] MAPEO DE ERRORES POSTGRES / POSTGREST
// ---------------------------------------------------------------------------

/**
 * @brief Traduce un error de Supabase (PostgrestError o Error envuelto) a un
 *        mensaje accionable para el usuario.
 * @details Postgres incluye el nombre del índice violado en `message`
 *          ("duplicate key value violates unique constraint \"<indice>\"")
 *          y la clave en `details` ("Key (email, race_id)=(...) already exists.").
 *          Se evalúa por nombre de índice primero y por columna como respaldo.
 * @param err Error lanzado por registerRunner / supabase-js.
 * @return Mensaje en español listo para formError.
 */
function mapRegistrationError(err: any): string {
  const code: string    = String(err?.code ?? "");
  const message: string = String(err?.message ?? "");
  const details: string = String(err?.details ?? "");
  const blob = `${message} ${details}`.toLowerCase();

  // Log completo para diagnóstico en campo (DevTools)
  console.error("[RAYOCERO][REGISTRO] Error de inscripción:", {
    code, message, details, hint: err?.hint, raw: err,
  });

  // 23505 — unique_violation
  if (code === "23505" || blob.includes("duplicate key")) {
    if (
      blob.includes("uniq_cedula_por_carrera") ||
      blob.includes("runners_cedula_per_race") ||
      blob.includes("uniq_cedula_legacy") ||
      blob.includes("(cedula")
    ) {
      return "Esta cédula ya está inscrita en este evento. Si necesitas tu dorsal o corregir datos, contacta a la organización.";
    }
    if (
      blob.includes("uniq_email_por_carrera") ||
      blob.includes("runners_email_per_race") ||
      blob.includes("uniq_email_legacy") ||
      blob.includes("(email")
    ) {
      return "Este correo electrónico ya fue usado en otra inscripción de este evento. Usa un correo distinto para este participante.";
    }
    if (
      blob.includes("uniq_bib_por_carrera") ||
      blob.includes("uniq_bib_legacy") ||
      blob.includes("(bib_number")
    ) {
      return "Colisión al asignar el número de dorsal. Presiona procesar nuevamente; si persiste, contacta a soporte.";
    }
    if (blob.includes("rfid_epc")) {
      return "Conflicto de chip RFID asignado. Contacta a soporte con tu cédula.";
    }
    return `Registro duplicado detectado. ${details || message}`.trim();
  }

  // 23503 — foreign_key_violation
  if (code === "23503" || blob.includes("foreign key")) {
    return "El evento seleccionado ya no es válido. Recarga la página y vuelve a seleccionar el evento.";
  }

  // 23514 — check_violation
  if (code === "23514" || blob.includes("check constraint")) {
    if (blob.includes("talla")) {
      return "La talla de camisa seleccionada no es aceptada por el sistema. Elige una talla de la lista (XS a XXL).";
    }
    if (blob.includes("genero")) {
      return "Género inválido. Selecciona Masculino o Femenino.";
    }
    return `Un dato fue rechazado por las reglas de validación. ${details || message}`.trim();
  }

  // 23502 — not_null_violation
  if (code === "23502" || blob.includes("null value in column")) {
    return `Falta un dato obligatorio. ${details || message}`.trim();
  }

  return message || "Error al procesar la inscripción.";
}

// ---------------------------------------------------------------------------
// HOOK: usePrecioEvento
// ---------------------------------------------------------------------------

interface PrecioEvento {
  tasaBCV: number; costoUSD: number; montoBs: number;
  loading: boolean; error: string | null;
}

/**
 * @param raceId      Carrera activa (fila per-race de system_config).
 * @param modalidad   Modalidad seleccionada.
 * @param usaCosto5k  [V37.4-4] true SOLO para 5K caminata (LED Coro).
 *                    Controla tanto la columna solicitada como el mapeo del costo.
 */
function usePrecioEvento(
  raceId: string,
  modalidad: Modalidad,
  usaCosto5k: boolean = false, // [V37.4-4]
  esGratuita: boolean = false,  // [V37.9] 3K WE CAN MOVE
): PrecioEvento {
  const [tasaBCV,  setTasaBCV]  = useState(0);
  const [costoUSD, setCostoUSD] = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    // [V37.9] Nunca consultar costos de otra modalidad para la caminata gratuita.
    if (esGratuita) {
      setTasaBCV(0);
      setCostoUSD(0);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    // [V37.4-4] costo_5k_usd solo se solicita cuando aplica → query idéntica
    //           a V37.3 para 499 Coro, Caninata y LED 10K.
    const cols = usaCosto5k
      ? "tasa_bcv,costo_usd,costo_4k_usd,costo_5k_usd"
      : "tasa_bcv,costo_usd,costo_4k_usd";
    (async () => {
      setLoading(true); setError(null);
      try {
        let data: any = null;
        if (raceId) {
          const { data: d } = await supabase
            .from("system_config").select(cols)
            .eq("race_id", raceId).maybeSingle();
          data = d;
        }
        if (!data) {
          const { data: fb } = await supabase
            .from("system_config").select(cols)
            .eq("id", 1).single();
          data = fb;
        }
        if (!cancelled && data) {
          setTasaBCV(data.tasa_bcv ?? 0);
          // [V37.4-4] Mapeo modalidad → columna de costo:
          //   10K                → costo_usd
          //   5K caminata (LED)  → costo_5k_usd
          //   4K / 5K caninata   → costo_4k_usd (comportamiento V37.3 intacto)
          let usd: number;
          if (modalidad === "10K")                    usd = data.costo_usd    ?? 0;
          else if (modalidad === "5K" && usaCosto5k)  usd = data.costo_5k_usd ?? 0;
          else                                        usd = data.costo_4k_usd ?? 0;
          setCostoUSD(usd);
        }
      } catch (err: any) {
        if (!cancelled) setError("No se pudo cargar el precio del evento.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [raceId, modalidad, usaCosto5k, esGratuita]); // [V37.9] gratuito en deps

  return {
    tasaBCV, costoUSD,
    montoBs: tasaBCV > 0 && costoUSD > 0 ? tasaBCV * costoUSD : 0,
    loading, error,
  };
}

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

const isCaninataRace = (name: string = ""): boolean =>
  name.toLowerCase().includes("caninata");

// [V37.3-2] Detector LED Run — keyword "led"
// [V37.6-1] + "WE RUN RAYOCERO" (nombre real en BD sin "LED")
// [V37.6-2] "led" como palabra completa
const isLedRunRace = (name: string = ""): boolean =>
  /\bled\b/i.test(name) || /we\s*run\s*rayocero/i.test(name);

// Exclusivamente WE RUN RAYOCERO Coro, no otras carreras que usen la marca LED.
const isWeCanMoveRace = (name: string = ""): boolean =>
  /we\s*run\s*rayocero/i.test(name) && /\bcoro\b/i.test(name);

/**
 * [V37.4-3] tipo opcional: en carreras tipo "carrera" el 5K es CAMINATA.
 * Sin tipo (o tipo "caninata") conserva el comportamiento V37.3.
 */
const getModalidadMeta = (
  m: Modalidad,
  tipo: RaceStaticConfig["tipo"] = "caninata",
): { label: string; Icon: React.ElementType } => {
  switch (m) {
    case "5K":
      return tipo === "carrera"
        ? { label: "5K CAMINATA", Icon: Footprints } // [V37.4-3]
        : { label: "5K CANINATA", Icon: Dog };
    case "3K":  return { label: "3K MASCOTAS · GRATIS", Icon: Dog };
    case "4K":  return { label: "4K CARRERA",  Icon: Flag };
    case "10K": return { label: "10K CARRERA", Icon: Timer };
    default:    return { label: `${m} CARRERA`, Icon: Timer };
  }
};

const formatBs = (n: number): string =>
  `Bs. ${n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * [V37.5-2] Normalización de identificadores antes del INSERT.
 * Los índices únicos (cedula, race_id) y (email, race_id) son case/space
 * sensitive: " 12345678" ≠ "12345678" y "Juan@x.com" ≠ "juan@x.com".
 */
const normalizeCedula = (c: string): string => c.replace(/\s+/g, "").trim();
const normalizeEmail  = (e: string): string => e.trim().toLowerCase();

// [V38.2] Conservar ISO YYYY-MM-DD sin depender del calendario nativo Android.
// Retorna cadena vacia hasta que los tres campos formen una fecha valida.
function fechaNacimientoISO(dia: string, mes: string, anio: string): string {
  if (!/^\d{1,2}$/.test(dia) || !/^\d{1,2}$/.test(mes) || !/^\d{4}$/.test(anio)) return "";
  const d = Number(dia);
  const m = Number(mes);
  const y = Number(anio);
  const ahora = new Date();
  if (y < 1900 || y > ahora.getFullYear() || m < 1 || m > 12 || d < 1 || d > 31) return "";
  const fecha = new Date(y, m - 1, d);
  if (fecha.getFullYear() !== y || fecha.getMonth() !== m - 1 || fecha.getDate() !== d) return "";
  const iso = `${anio}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const hoy = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`;
  return iso <= hoy ? iso : "";
}


// ---------------------------------------------------------------------------
// CONFIGS ESTÁTICAS
// ---------------------------------------------------------------------------

const CORO_CONFIG: RaceStaticConfig = {
  tipo: "carrera",
  modalidadesDisponibles: ["10K", "4K"],
  evento: {
    nombre: "499 RUN — CORO FALCÓN", fecha: "29 AGO 2026", hora: "06:00 PM",
    distancia: "10K / 4K", atletas: "+500", lugar: "CENTRO HISTÓRICO DE CORO",
    proximaEd: "TEMPORADA 2026", targetDate: new Date("2026-08-29T18:00:00"),
  },
  pago: {
    titular: "Rayocero", cedula: "17.627.699",
    pagoMovil: "0414-5643372", banco: "Banco Nacional de Crédito (BNC)", cuenta: "",
  },
};

// [V37.3-1] Config exclusiva WE RUN RAYOCERO LED CORO
// [V37.9] 10K/5K conservan precio/configuración previa. 3K tiene fecha separada.
// [V38.1-3] Base con las 3 modalidades; getRaceCfg la recorta según el modo.
const LED_CORO_CONFIG: RaceStaticConfig = {
  tipo: "carrera",
  modalidadesDisponibles: ["10K", "5K", "3K"],
  evento: {
    nombre: "WE RUN RAYOCERO LED CORO", fecha: "28 NOV 2026", hora: "07:00 PM",
    distancia: "10K / 5K / 3K",
    atletas: "+500", lugar: "CORO, FALCÓN",
    proximaEd: "TEMPORADA 2026", targetDate: new Date("2026-11-28T19:00:00"),
  },
  pago: {
    titular: "Rayocero",
    cedula:   "17.627.699",
    pagoMovil: "0414-5643372",
    banco:    "Banco Nacional de Crédito (BNC)",
    cuenta:   "",
  },
};

// Actividad gratuita asociada al evento LED, pero en fecha/hora distintas.
const WE_CAN_MOVE = {
  nombre: "WE CAN MOVE — CAMINATA CON MASCOTAS 3K",
  fecha: "21 DE NOVIEMBRE DE 2026",
  hora: "5:00 PM",
  lugar: "CIUDAD DEPORTIVA UNIVERSITARIA, CORO, FALCÓN",
  invitado: "TSUNAMI",
} as const;

// [V38.1-3] Config propia del modo 3K: solo 3K, fecha 21/NOV/2026 5:00 PM.
const WE_CAN_MOVE_CONFIG: RaceStaticConfig = {
  ...LED_CORO_CONFIG,
  modalidadesDisponibles: ["3K"],
  evento: {
    nombre: WE_CAN_MOVE.nombre, fecha: "21 NOV 2026", hora: WE_CAN_MOVE.hora,
    distancia: "3K MASCOTAS", atletas: "+500", lugar: WE_CAN_MOVE.lugar,
    proximaEd: "TEMPORADA 2026", targetDate: new Date("2026-11-21T17:00:00"),
  },
};

const CANINATA_CONFIG: RaceStaticConfig = {
  tipo: "caninata",
  modalidadesDisponibles: ["10K", "5K"],
  evento: {
    nombre: "CANINATA BARQUISIMETO", fecha: "18 OCT 2026", hora: "07:00 AM",
    distancia: "10K / 5K CANINATA", atletas: "+300", lugar: "LIDOTEL BARQUISIMETO",
    proximaEd: "TEMPORADA 2026", targetDate: new Date("2026-10-18T07:00:00"),
  },
  pago: {
    titular: "Caninata", cedula: "5.245.463", pagoMovil: "0414-5192876",
    banco: "Banco de Venezuela",
    cuenta: "Zelle: piolas.art@gmail.com | Soporte: 0412-1394596",
  },
};

// [V37.3-3] getRaceCfg: LED evaluado antes del fallback CORO
// [V38.1-3] modoWeCanMove: true → solo 3K; false → LED solo 10K/5K.
const getRaceCfg = (race: ActiveRace | null, modoWeCanMove: boolean = false): RaceStaticConfig => {
  if (race && isCaninataRace(race.name)) return CANINATA_CONFIG;
  if (race && isLedRunRace(race.name)) {
    if (isWeCanMoveRace(race.name) && modoWeCanMove) return WE_CAN_MOVE_CONFIG;
    return { ...LED_CORO_CONFIG, modalidadesDisponibles: ["10K", "5K"] };
  }
  return CORO_CONFIG;
};

// [V37.3-4] accentColor por tipo de carrera
const getAccentColor = (cfg: RaceStaticConfig, raceName: string = ""): string => {
  if (cfg.tipo === "caninata")       return "#FDD454";
  if (isLedRunRace(raceName))        return "#FCD34D";
  return "#00f2ff";
};

// ---------------------------------------------------------------------------
// HOOK: useTargetRace
// ---------------------------------------------------------------------------

const useTargetRace = () => {
  const [searchParams] = useSearchParams();
  const raceIdParam = searchParams.get("race");
  const [race, setRace]               = useState<ActiveRace | null | undefined>(undefined);
  const [activeRaces, setActiveRaces] = useState<ActiveRace[]>([]);

  useEffect(() => {
    (async () => {
      try {
        if (raceIdParam) {
          const { data: d } = await supabase
            .from("races").select("id,name,slug,date,time,location,inscripciones_abiertas")
            .eq("id", raceIdParam).maybeSingle();
          setRace((d as ActiveRace) ?? null);
        } else {
          const { data: list } = await supabase
            .from("races").select("id,name,slug,date,time,location,inscripciones_abiertas")
            .eq("inscripciones_abiertas", true).order("date", { ascending: true });
          setActiveRaces((list as ActiveRace[]) || []);
          setRace(null);
        }
      } catch { setRace(null); }
    })();
  }, [raceIdParam]);

  return { race, setRace, activeRaces };
};

// ---------------------------------------------------------------------------
// calcularCategoria
// ---------------------------------------------------------------------------

const calcularCategoria = (
  edad: number, genero: "M" | "F", movilidadReducida: boolean,
): string => {
  const g = genero === "M" ? "Masculino" : "Femenino";
  if (movilidadReducida)        return "Movilidad Reducida";
  if (edad < 16)                return `Junior ${g}`;
  if (edad >= 16 && edad <= 19) return `Juvenil ${g}`;
  if (edad >= 20 && edad <= 29) return `Libre ${g}`;
  if (edad >= 30 && edad <= 34) return `Sub Master (30-34) ${g}`;
  if (edad >= 35 && edad <= 39) return `Sub Master (35-39) ${g}`;
  if (edad >= 40 && edad <= 49) return `Master A ${g}`;
  if (edad >= 50 && edad <= 59) return `Master B ${g}`;
  if (edad >= 60 && edad <= 69) return `Master C ${g}`;
  if (edad >= 70 && edad <= 79) return `Master D ${g}`;
  return `Absoluto ${g}`;
};

// ---------------------------------------------------------------------------
// COMPONENTE RAÍZ
// ---------------------------------------------------------------------------

export default function RegistrationForm() {
  const { race, setRace, activeRaces } = useTargetRace();
  const [searchParams, setSearchParams] = useSearchParams();
  // [V38.1-2] Modo 3K persistente en URL (?modo=wecanmove) y en estado.
  const [modoWeCanMove, setModoWeCanMove] = useState<boolean>(
    searchParams.get("modo") === "wecanmove",
  );

  if (race === undefined) {
    return (
      <div className="min-h-screen bg-[#03070b] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#FDD454]" />
      </div>
    );
  }

  if (!race) {
    // [V38.1-1] Una carrera WE RUN Coro se expande en dos tarjetas de selección.
    const cards: { r: ActiveRace; wcm: boolean }[] = activeRaces.flatMap((r) =>
      isWeCanMoveRace(r.name)
        ? [{ r, wcm: false }, { r, wcm: true }]
        : [{ r, wcm: false }],
    );

    return (
      <div className="min-h-screen bg-[#03070b] text-white pt-28 pb-20 px-4 font-sans flex flex-col items-center">
        <div className="max-w-4xl w-full text-center mb-10">
          <span className="text-[#FDD454] text-xs font-bold tracking-[0.2em] uppercase">
            Terminal de Inscripciones
          </span>
          <h1 className="text-4xl sm:text-6xl font-black italic uppercase mt-2">
            SELECCIONA TU EVENTO
          </h1>
          <p className="text-white/40 text-sm mt-2">
            Elige el evento en el que deseas participar hoy.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
          {cards.map(({ r, wcm }) => {
            const isCan = isCaninataRace(r.name);
            const isLed = isLedRunRace(r.name);
            // [V37.3-4] color por tipo
            const color = isCan ? "#FDD454" : isLed ? "#FCD34D" : "#00f2ff";
            // [V37.3-6] badge label por tipo
            // [V37.4-7] LED muestra 10K + 5K caminata
            // [V38.1-1] 3K tiene su propia tarjeta/badge
            const badgeLabel = wcm
              ? "3K MASCOTAS · GRATIS"
              : isCan
              ? "10K CARRERA / 5K CANINATA"
              : isLed
              ? "10K CARRERA / 5K CAMINATA"
              : "CARRERA OFICIAL 10K / 4K";

            return (
              <motion.div
                key={`${r.id}-${wcm ? "wcm" : "std"}`}
                whileHover={{ scale: 1.02 }}
                onClick={() => {
                  setModoWeCanMove(wcm);
                  setRace(r);
                  setSearchParams(wcm ? { race: r.id, modo: "wecanmove" } : { race: r.id });
                }}
                className="cursor-pointer bg-white/[0.02] border border-white/10 hover:border-white/20 rounded-3xl p-6 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span
                      className="px-3 py-1 rounded-full text-[10px] font-black uppercase"
                      style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}
                    >
                      {badgeLabel}
                    </span>
                    <ChevronRight className="h-5 w-5 text-white/30" />
                  </div>
                  <h2 className="text-2xl font-black italic uppercase text-white mb-2">
                    {wcm ? WE_CAN_MOVE.nombre : r.name}
                  </h2>
                  <div className="space-y-1.5 text-xs text-white/50 mb-6">
                    <p className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-white/40" />
                      {wcm ? `${WE_CAN_MOVE.fecha} · ${WE_CAN_MOVE.hora}` : r.date}
                    </p>
                    <p className="flex items-center gap-2">
                      <ChevronRight className="h-3.5 w-3.5 text-white/40" />
                      {wcm ? WE_CAN_MOVE.lugar : (r.location || "Venezuela")}
                    </p>
                    {wcm && (
                      <p className="flex items-center gap-2 text-[#FCD34D]">
                        <Dog className="h-3.5 w-3.5" />
                        INSCRIPCIÓN GRATUITA · SIN KIT NI FRANELA
                      </p>
                    )}
                  </div>
                </div>
                <button
                  className="w-full py-3 rounded-xl font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 transition-all"
                  style={{ background: color, color: "#03070b" }}
                >
                  {wcm ? "INSCRIBIRME GRATIS" : "INICIAR REGISTRO"} <ChevronRight className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }

  const raceCfg = getRaceCfg(race, modoWeCanMove); // [V38.1-3]
  return (
    <RegistrationFormActive
      key={`${race.id}-${modoWeCanMove ? "wcm" : "std"}`}
      race={race}
      cfg={raceCfg}
      onResetRace={() => {
        // [V38.1-4] Limpia race + modo de la URL → recarga la lista de eventos.
        setModoWeCanMove(false);
        setRace(null);
        setSearchParams({});
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// RegistrationFormActive
// ---------------------------------------------------------------------------

function RegistrationFormActive({
  race, cfg, onResetRace,
}: {
  race: ActiveRace; cfg: RaceStaticConfig; onResetRace: () => void;
}) {
  const navigate           = useNavigate();
  const isCaninataRaceType = cfg.tipo === "caninata";
  // Solamente la CANINATA del 18/OCT/2026. Supabase aplica la fecha de corte.
  const franelaPostCarreraActiva = isCaninataRaceType
    && String(race.date).slice(0, 10) === "2026-10-18"
    && Date.now() >= new Date("2026-10-15T00:00:00-04:00").getTime();
  // [V37.3-4] accentColor dinámico por tipo
  const accentColor        = getAccentColor(cfg, race.name);
  // [V37.5-4] Detector LED para selección de dorsal en /dorsal
  const isLedRace          = isLedRunRace(race.name);
  // [V38.1-3] Modo 3K: la config solo ofrece 3K
  const modoSolo3K         = cfg.modalidadesDisponibles.length === 1 && cfg.modalidadesDisponibles[0] === "3K";

  // [V37.7-1] Prefetch DorsalLed (chunk + arte + fuentes) en segundo plano
  // [V38.1-5] No aplica al modo 3K (no genera dorsal).
  useEffect(() => {
    if (!isLedRace || modoSolo3K) return;
    const t = setTimeout(() => { void import("@/pages/DorsalLed").catch(() => undefined); }, 1500);
    return () => clearTimeout(t);
  }, [isLedRace, modoSolo3K]);

  const [modalidad,          setModalidad]          = useState<Modalidad>(cfg.modalidadesDisponibles[0]);
  const [nombre,             setNombre]             = useState("");
  const [apellido,           setApellido]           = useState("");
  const [cedula,             setCedula]             = useState("");
  const [email,              setEmail]              = useState("");
  const [telefono,           setTelefono]           = useState("");
  // [V38.2] Dia, mes y anio independientes para escribirlos con teclado Android.
  const [diaNacimiento,     setDiaNacimiento]     = useState("");
  const [mesNacimiento,     setMesNacimiento]     = useState("");
  const [anioNacimiento,    setAnioNacimiento]    = useState("");
  const fechaNacimiento = useMemo(
    () => fechaNacimientoISO(diaNacimiento, mesNacimiento, anioNacimiento),
    [diaNacimiento, mesNacimiento, anioNacimiento],
  );
  const fechaNacimientoInvalida =
    Boolean(diaNacimiento && mesNacimiento && anioNacimiento) && !fechaNacimiento;
  const [genero,             setGenero]             = useState<"M" | "F">("M");
  const [talla,              setTalla]              = useState<RegistrationFormData["talla"]>("M");
  const [movilidadReducida,  setMovilidadReducida]  = useState(false);
  const [referencia,         setReferencia]         = useState("");
  const [metodoPago,         setMetodoPago]         = useState<MetodoPago>("pago_movil");
  const [titularCashea,       setTitularCashea]       = useState("");
  // Fija el método enviado para que cambiar la selección durante la subida
  // no pueda alterar la pantalla de éxito ni habilitar un dorsal por accidente.
  const envioFueCashea = useRef(false);
  const [casheaAbierto,      setCasheaAbierto]      = useState(false);
  const [casheaPrimeraCuota, setCasheaPrimeraCuota] = useState(false);
  const [contactoEmergencia, setContactoEmergencia] = useState("");
  const [telefonoEmergencia, setTelefonoEmergencia] = useState("");
  const [fileComprobante,    setFileComprobante]    = useState<File | null>(null);
  const [nombrePerro,        setNombrePerro]        = useState("");
  const [razaPerro,          setRazaPerro]          = useState(RAZAS_COMUNES[0]);
  const [tipoMascota,        setTipoMascota]        = useState<"Perro" | "Gato" | "Otra especie">("Perro");
  const [detalleMascota,     setDetalleMascota]     = useState("");
  const [copiedField,        setCopiedField]        = useState<string | null>(null);
  const [uploading,          setUploading]          = useState(false);
  const [formError,          setFormError]          = useState<string | null>(null);
  const [aceptaEntregaPost, setAceptaEntregaPost] = useState(false); // [V37.8]
  const [aceptaMascota, setAceptaMascota] = useState(false); // [V37.9]
  const [weCanMoveConfirmation, setWeCanMoveConfirmation] = useState<{
    nombre: string;
    apellido: string;
    mascota: string;
  } | null>(null);

  // [V37.9] Solo 3K de WE RUN LED Coro: gratuito, sin kit, con mascota.
  const isWeCanMove3K = isWeCanMoveRace(race.name) && modalidad === "3K";
  const isMascotaForm = (isCaninataRaceType && modalidad === "5K") || isWeCanMove3K;
  // [V37.4-2] 5K en carrera tipo "carrera" = caminata recreativa (LED Coro)
  const isCaminata5K = !isCaninataRaceType && modalidad === "5K";
  // Disponible por defecto solo en el evento LED pago donde se recibió este link.
  // NO ofrecer el mismo producto Cashea para carreras/precios distintos sin validar.
  const casheaDisponible = isWeCanMoveRace(race.name) && !isWeCanMove3K
    && (modalidad === "10K" || modalidad === "5K");
  const esCashea = casheaDisponible && metodoPago === "cashea";

  const precio = usePrecioEvento(race.id, modalidad, isCaminata5K, isWeCanMove3K);

  const edad = useMemo(
    () => (fechaNacimiento ? calcularEdad(fechaNacimiento) : 0),
    [fechaNacimiento],
  );

  const categoria = useMemo(() => {
    if (isWeCanMove3K) return "Caminata con Mascotas WE CAN MOVE 3K";
    if (modalidad === "5K") {
      // [V37.4-5] Caninata intacta; carrera tipo "carrera" → caminata 5K
      if (isCaninataRaceType) return "Caminata Canina / Familiar";
      return "Caminata Recreativa 5K";
    }
    return calcularCategoria(edad, genero, movilidadReducida);
  }, [edad, genero, movilidadReducida, modalidad, isCaninataRaceType, isWeCanMove3K]);

  const genderMismatchWarning = useMemo(
    () => validateGenderCategory(genero, categoria),
    [genero, categoria],
  );

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // [V37.2-1] onSuccess: detecta por tipo de carrera, no por modalidad
  const mutation = useMutation({
    mutationFn: registerRunner,
    onSuccess: (data) => {
      // Regla RayoCero: Cashea y Pago Móvil reciben el dorsal inmediatamente.
      // La aprobación administrativa del pago permanece independiente.
      if (isCaninataRaceType) {
        navigate(
          `/dorsal` +
          `?tipo=caninata` +
          `&bib=${data.bib_number}` +
          `&nombre=${encodeURIComponent(nombre)}` +
          `&apellido=${encodeURIComponent(apellido)}` +
          `&perro=${encodeURIComponent(nombrePerro.trim())}` +
          `&raza=${encodeURIComponent(razaPerro)}` +
          `&evento=${encodeURIComponent(race.name)}`,
        );
      } else {
        navigate(
          `/dorsal?bib=${data.bib_number}` +
          `&categoria=${encodeURIComponent(data.categoria)}` +
          `&nombre=${encodeURIComponent(nombre)}` +
          `&apellido=${encodeURIComponent(apellido)}` +
          `&evento=${encodeURIComponent(race.name)}` +
          // [V37.5-4] LED Coro: la página Dorsal usa tipo=led → dorsal-led.png
          (isLedRace
            ? `&tipo=led&modalidad=${encodeURIComponent(modalidad)}`
            : "") +
          // Parámetro exclusivamente informativo: NO confirma el pago.
          (envioFueCashea.current ? "&pago=cashea&verificacion=pendiente" : ""),
        );
      }
    },
    onError: (err: any) =>
      setFormError(mapRegistrationError(err)), // [V37.5-1]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!nombre.trim() || !apellido.trim() || !cedula.trim() || !email.trim() ||
        (!isWeCanMove3K && !esCashea && !referencia.trim())) {
      setFormError("Por favor completa todos los campos obligatorios.");
      return;
    }
    if (esCashea) {
      const titularNormalizado = titularCashea.trim().replace(/\s+/g, " ");
      if (titularNormalizado.length < 5 || titularNormalizado.length > 100 || titularNormalizado.split(" ").length < 2) {
        setFormError("Indica el nombre y apellido del titular de la cuenta Cashea con la que se pagó.");
        return;
      }
    }
    if (esCashea && !telefono.trim()) {
      setFormError("Para la inscripción con Cashea necesitamos tu teléfono de contacto.");
      return;
    }
    if (esCashea && !casheaAbierto) {
      setFormError("Abre primero el enlace de pago de Cashea y completa la primera cuota.");
      return;
    }
    if (esCashea && !casheaPrimeraCuota) {
      setFormError("Confirma que completaste el pago de la primera cuota en Cashea.");
      return;
    }
    if (esCashea && !fileComprobante) {
      setFormError("Para finalizar con Cashea debes subir una captura de la primera cuota pagada.");
      return;
    }
    if (fileComprobante && (!fileComprobante.type.startsWith("image/") || fileComprobante.size > 10 * 1024 * 1024)) {
      setFormError("El comprobante debe ser una imagen JPG, PNG o equivalente de máximo 10 MB.");
      return;
    }
    if (isWeCanMove3K && !telefono.trim()) {
      setFormError("Para WE CAN MOVE necesitamos un teléfono de contacto.");
      return;
    }
    // [V38.2] Validar tambien los eventos pagos: una fecha invalida altera
    // edad/categoria y jamas debe sustituirse por una fecha ficticia.
    if (!fechaNacimiento) {
      setFormError("Introduce una fecha de nacimiento válida (día, mes y año). No puede ser futura.");
      return;
    }
    if (isWeCanMove3K && !aceptaMascota) {
      setFormError("Confirma las condiciones de participación con tu mascota.");
      return;
    }
    // [V37.9] Impedir que 10K/5K LED se registren como gratuitos si falta tarifa.
    if (isLedRace && !isWeCanMove3K &&
        (precio.loading || precio.error || precio.costoUSD <= 0 || precio.montoBs <= 0)) {
      setFormError("No se pudo validar el importe de esta modalidad paga. Intenta nuevamente o contacta a la organización.");
      return;
    }
    if (franelaPostCarreraActiva && !telefono.trim()) {
      setFormError("Para coordinar la entrega posterior de la franela, introduce un número de teléfono de contacto.");
      return;
    }
    if (franelaPostCarreraActiva && !aceptaEntregaPost) {
      setFormError("Debes confirmar que la franela de esta inscripción se entregará después de la Caninata.");
      return;
    }
    if (isMascotaForm && !nombrePerro.trim()) {
      setFormError("Por favor ingresa el nombre de tu mascota.");
      return;
    }

    const genderErr = validateGenderCategory(genero, categoria);
    if (genderErr) { setFormError(genderErr); return; }

    // [V37.5-2] Identificadores normalizados (coinciden con índices únicos)
    const cedulaNorm = normalizeCedula(cedula);
    const emailNorm  = normalizeEmail(email);

    try {
      setUploading(true);

      // [V38.0] La caminata 3K usa su propia tabla y su propia política RLS.
      // Ni el método de pago ni la API de corredores pagados se ejecutan.
      if (isWeCanMove3K) {
        const razaOMarca = tipoMascota === "Perro"
          ? razaPerro
          : detalleMascota.trim() || "Sin especificar";
        // Cast local: permite desplegar sin regenerar tipos de Supabase.
        // La estructura del objeto corresponde 1:1 con WE_CAN_MOVE.sql.
        const { error: errorGratuito } = await (supabase as any)
          .from("we_can_move_registrations")
          .insert({
            race_id: race.id,
            nombre: nombre.trim(),
            apellido: apellido.trim(),
            cedula: cedulaNorm,
            email: emailNorm,
            telefono: telefono.trim(),
            fecha_nacimiento: fechaNacimiento,
            genero,
            movilidad_reducida: movilidadReducida,
            contacto_emergencia: contactoEmergencia.trim() || null,
            telefono_emergencia: telefonoEmergencia.trim() || null,
            nombre_mascota: nombrePerro.trim(),
            tipo_mascota: tipoMascota,
            raza_mascota: razaOMarca,
            acepta_condiciones: aceptaMascota,
          });

        if (errorGratuito) {
          if (errorGratuito.code === "23505") {
            setFormError("Esta cédula ya está inscrita en WE CAN MOVE 3K. No debes registrarte de nuevo.");
            return;
          }
          throw errorGratuito;
        }

        // Mostrar éxito solo cuando la inserción ha sido aceptada por Supabase.
        setWeCanMoveConfirmation({
          nombre: nombre.trim(),
          apellido: apellido.trim(),
          mascota: nombrePerro.trim(),
        });
        return;
      }

      // [V37.5-3] Pre-check de cédula duplicada en esta carrera ANTES de subir
      //           el comprobante. Fail-open: si RLS bloquea el SELECT, se
      //           continúa y el índice uniq_cedula_por_carrera decide.
      const { data: dupRows, error: dupErr } = await supabase
        .from("runners")
        .select("id,bib_number")
        .eq("race_id", race.id)
        .eq("cedula", cedulaNorm)
        .limit(1);
      if (!dupErr && dupRows && dupRows.length > 0) {
        const bib = (dupRows[0] as { bib_number: number | null }).bib_number;
        setFormError(
          `La cédula ${cedulaNorm} ya está inscrita en ${race.name}` +
          (bib ? ` (dorsal #${bib}).` : ".") +
          " Si necesitas corregir datos, contacta a la organización.",
        );
        return;
      }

      let comprobanteUrl = "";

      if (fileComprobante) {
        const compressed = await imageCompression(fileComprobante, {
          maxSizeMB: 0.8, maxWidthOrHeight: 1200,
        });
        const ext = compressed.type === "image/png" ? "png"
          : compressed.type === "image/webp" ? "webp" : "jpg";
        const filePath = `comprobantes/${Date.now()}_${cedulaNorm}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("comprobantes-pago").upload(filePath, compressed, { contentType: compressed.type || "image/jpeg" });
        if (upErr) throw upErr;
        comprobanteUrl = supabase.storage
          .from("comprobantes-pago").getPublicUrl(filePath).data.publicUrl;
      }

      const petFields: Partial<PetData> = (isCaninataRaceType && modalidad === "5K")
        ? { nombrePerro: nombrePerro.trim(), razaPerro }
        : {};

      const payload: RegistrationFormData = {
        nombre, apellido,
        cedula: cedulaNorm, // [V37.5-2]
        email:  emailNorm,  // [V37.5-2]
        telefono,
        fechaNacimiento, // [V38.2] ISO validado; nunca inventar fecha por defecto.
        genero,
        talla,
        movilidadReducida, categoria,
        monto: precio.montoBs > 0 ? String(precio.montoBs.toFixed(2)) : "0",
        // La columna existente referencia_pago permite al admin identificar CASHEA
        // sin modificar lib/api.ts ni exigir migraciones SQL para nuevas columnas.
        referenciaPago: esCashea
          ? `CASHEA-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
          : referencia.trim(),
        // El titular puede ser distinto del corredor. Usar el campo ya existente
        // banco_origen mediante la propiedad bancoOrigen de lib/api.ts.
        // No usar referencia_pago: conserva su identificador CASHEA-*.
        bancoOrigen: esCashea ? titularCashea.trim().replace(/\s+/g, " ") : undefined,
        comprobanteUrl: comprobanteUrl || undefined,
        contactoEmergencia: contactoEmergencia || "N/A",
        telefonoEmergencia: telefonoEmergencia || "N/A",
        aceptaDeslinde:     true,
        race_id:            race.id,
        modalidad,
        ...petFields,
      } as RegistrationFormData & Partial<PetData>;

      envioFueCashea.current = esCashea;
      await mutation.mutateAsync(payload);
    } catch (err: any) {
      setFormError(mapRegistrationError(err)); // [V37.5-1]
    } finally {
      setUploading(false);
    }
  };

  // [V37.3-5] Una sola modalidad → col-span completo
  const solaModalidad = cfg.modalidadesDisponibles.length === 1;

  if (weCanMoveConfirmation) {
    return (
      <div className="min-h-screen bg-[#03070b] text-white pt-28 pb-20 px-4 font-sans flex justify-center">
        <section className="w-full max-w-xl h-fit rounded-3xl border border-emerald-400/25 bg-white/[0.03] p-7 sm:p-10 space-y-5 text-center" role="status">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-400/10 flex items-center justify-center">
            <Check className="h-8 w-8 text-emerald-400" />
          </div>
          <span className="inline-block text-[11px] font-black tracking-[0.2em] text-[#FCD34D] uppercase">
            WE CAN MOVE · 3K GRATUITOS
          </span>
          <h1 className="text-3xl sm:text-4xl font-black uppercase">¡Inscripción registrada!</h1>
          <p className="text-sm text-white/65 leading-relaxed">
            {weCanMoveConfirmation.nombre} {weCanMoveConfirmation.apellido}, registramos tu participación junto a
            {" "}<strong className="text-white">{weCanMoveConfirmation.mascota}</strong>.
          </p>
          <div className="rounded-2xl border border-[#FCD34D]/20 bg-[#FCD34D]/[0.05] p-5 text-left space-y-2 text-sm">
            <p><strong>Fecha:</strong> {WE_CAN_MOVE.fecha}</p>
            <p><strong>Hora:</strong> {WE_CAN_MOVE.hora}</p>
            <p><strong>Lugar:</strong> {WE_CAN_MOVE.lugar}</p>
            <p><strong>Participación:</strong> Gratis · sin kit ni franela</p>
          </div>
          <p className="text-xs text-white/45">Guarda una captura de esta confirmación. No necesitas comprobante bancario.</p>
          <button type="button" onClick={() => navigate("/")}
            className="w-full rounded-xl bg-[#FCD34D] py-3.5 text-xs font-black uppercase text-[#03070b]">
            Volver al inicio
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#03070b] text-white pt-24 pb-20 px-4 font-sans flex flex-col items-center">
      <div className="max-w-3xl w-full">

        <button
          onClick={onResetRace}
          className="mb-6 text-xs text-white/40 hover:text-white transition-colors flex items-center gap-1 uppercase font-bold"
        >
          ← Cambiar de evento
        </button>

        <div className="text-center mb-8">
          <span
            className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
            style={{ background: `${accentColor}15`, color: accentColor, border: `1px solid ${accentColor}30` }}
          >
            {modoSolo3K ? WE_CAN_MOVE.nombre : race.name}
          </span>
          <h1 className="text-4xl font-black italic uppercase mt-3">
            FORMULARIO DE INSCRIPCIÓN
          </h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white/[0.02] border border-white/10 rounded-3xl p-6 sm:p-10 space-y-6"
        >
          {formError && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* [V37.8] AVISO SOLO CANINATA 18/OCT/2026: el flag real se escribe en BD. */}
          {franelaPostCarreraActiva && (
            <div
              role="note"
              className="rounded-2xl border border-amber-400/40 bg-amber-400/[0.08] p-5 sm:p-6 space-y-3"
            >
              <div className="flex items-center gap-2 text-amber-300">
                <Shirt className="h-5 w-5 shrink-0" />
                <span className="text-xs font-black uppercase tracking-wider">Aviso importante · Franela post carrera</span>
              </div>
              <p className="text-sm leading-relaxed text-white/90">
                Para las inscripciones realizadas <strong>desde el 15 de octubre de 2026</strong>,
                la franela de la Caninata del <strong>18 de octubre</strong> se entregará
                <strong> después del evento</strong>, en los días posteriores.
              </p>
              <p className="text-xs leading-relaxed text-white/70">
                La organización se comunicará contigo al teléfono o correo que registres
                para coordinar la entrega. El resto del kit se gestiona por separado.
              </p>
              <p className="text-[11px] font-bold text-amber-200/90">
                Conserva tus datos de contacto actualizados. La entrega de franela quedará identificada en tu inscripción.
              </p>
            </div>
          )}

          {/* [V37.9] Ficha informativa de 3K con fecha propia, distinta de 10K/5K. */}
          {isWeCanMove3K && (
            <div className="rounded-2xl border border-[#FCD34D]/35 bg-[#FCD34D]/[0.06] p-5 space-y-3" role="note">
              <div className="flex items-center gap-2 text-[#FCD34D]">
                <Dog className="h-5 w-5" />
                <h2 className="text-lg font-black uppercase">WE CAN MOVE · 3K GRATIS</h2>
              </div>
              <p className="text-sm text-white/85">Caminata recreativa de 3 km con mascotas, con la participación de <strong>{WE_CAN_MOVE.invitado}</strong>.</p>
              <div className="grid sm:grid-cols-2 gap-2 text-xs text-white/75">
                <p><strong className="text-white">Fecha:</strong> {WE_CAN_MOVE.fecha}</p>
                <p><strong className="text-white">Hora:</strong> {WE_CAN_MOVE.hora}</p>
                <p className="sm:col-span-2"><strong className="text-white">Lugar:</strong> {WE_CAN_MOVE.lugar}</p>
              </div>
              <p className="text-xs text-[#FCD34D] font-bold">Inscripción totalmente gratuita. No incluye kit ni franela. No requiere transferencia ni comprobante.</p>
            </div>
          )}

          {/* SELECTOR DE MODALIDAD */}
          <div className="space-y-2 pb-2">
            <label className="text-xs font-bold uppercase text-white/60 block">
              Modalidad / Distancia
            </label>
            {/* [V37.9] LED con 3 modalidades; responsive en pantallas pequeñas. */}
            <div className={`grid gap-3 ${solaModalidad ? "grid-cols-1" : cfg.modalidadesDisponibles.length === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2"}`}>
              {cfg.modalidadesDisponibles.map((m) => {
                const isSelected      = modalidad === m;
                const { label, Icon } = getModalidadMeta(m, cfg.tipo); // [V37.4-3]
                return (
                  <button
                    key={m} type="button" onClick={() => setModalidad(m)}
                    className={`py-3.5 px-4 rounded-xl text-xs font-black uppercase border transition-all flex items-center justify-center gap-2 ${
                      isSelected
                        ? "border-transparent text-black shadow-lg"
                        : "border-white/10 bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
                    }`}
                    style={isSelected ? { background: accentColor } : undefined}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* DATOS PERSONALES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-white/60 mb-1 block">Nombre</label>
              <input
                type="text" value={nombre} onChange={e => setNombre(e.target.value)} required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/30"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-white/60 mb-1 block">Apellido</label>
              <input
                type="text" value={apellido} onChange={e => setApellido(e.target.value)} required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-white/60 mb-1 block">Cédula</label>
              <input
                type="text" value={cedula} onChange={e => setCedula(e.target.value)} required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/30"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-white/60 mb-1 block">Correo Electrónico</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-white/60 mb-1 block">
                Teléfono {franelaPostCarreraActiva && <span className="text-amber-300">* Obligatorio para contactarte</span>}
              </label>
              <input
                type="tel" value={telefono} onChange={e => setTelefono(e.target.value)}
                required={franelaPostCarreraActiva} autoComplete="tel"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/30"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-white/60 mb-1 block" id="rc-birthdate-label">
                Fecha de Nacimiento
              </label>
              {/* [V38.2] No abrir date-picker nativo: en Android obliga a retroceder
                  meses/años. Se introduce directamente dia / mes / anio. */}
              <div role="group" aria-labelledby="rc-birthdate-label" className="grid grid-cols-[1fr_1fr_1.5fr] gap-2">
                <div>
                  <label htmlFor="rc-birth-day" className="sr-only">Día de nacimiento</label>
                  <input
                    id="rc-birth-day" type="text" inputMode="numeric" pattern="[0-9]*"
                    autoComplete="bday-day" placeholder="DD" aria-label="Día"
                    maxLength={2} required value={diaNacimiento}
                    onChange={e => setDiaNacimiento(e.target.value.replace(/\D/g, "").slice(0, 2))}
                    className="w-full min-w-0 bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-sm text-center text-white focus:outline-none focus:border-white/30"
                  />
                </div>
                <div>
                  <label htmlFor="rc-birth-month" className="sr-only">Mes de nacimiento</label>
                  <input
                    id="rc-birth-month" type="text" inputMode="numeric" pattern="[0-9]*"
                    autoComplete="bday-month" placeholder="MM" aria-label="Mes"
                    maxLength={2} required value={mesNacimiento}
                    onChange={e => setMesNacimiento(e.target.value.replace(/\D/g, "").slice(0, 2))}
                    className="w-full min-w-0 bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-sm text-center text-white focus:outline-none focus:border-white/30"
                  />
                </div>
                <div>
                  <label htmlFor="rc-birth-year" className="sr-only">Año de nacimiento</label>
                  <input
                    id="rc-birth-year" type="text" inputMode="numeric" pattern="[0-9]*"
                    autoComplete="bday-year" placeholder="AAAA" aria-label="Año"
                    maxLength={4} required value={anioNacimiento}
                    onChange={e => setAnioNacimiento(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    className="w-full min-w-0 bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-sm text-center text-white focus:outline-none focus:border-white/30"
                  />
                </div>
              </div>
              {fechaNacimientoInvalida ? (
                <p role="alert" className="mt-2 text-xs text-red-400">
                  Fecha inválida o futura. Verifica el día, mes y año.
                </p>
              ) : (
                <p className="mt-1.5 text-[11px] text-white/40">Escribe tu fecha: día / mes / año (por ejemplo 08 / 05 / 1990).</p>
              )}
            </div>
          </div>

          {/* GÉNERO Y TALLA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-white/60 mb-1 block">Género</label>
              <div className="grid grid-cols-2 gap-2">
                {(["M", "F"] as const).map((g) => (
                  <button
                    key={g} type="button" onClick={() => setGenero(g)}
                    className={`py-3 rounded-xl text-xs font-black uppercase border transition-all ${
                      genero === g
                        ? "border-transparent text-black"
                        : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                    }`}
                    style={genero === g ? { background: accentColor } : undefined}
                  >
                    {g === "M" ? "Masculino" : "Femenino"}
                  </button>
                ))}
              </div>
            </div>
            {!isWeCanMove3K && (
              <div>
                <label className="text-xs font-bold uppercase text-white/60 mb-1 block">Talla de Camisa</label>
                <select
                  value={talla}
                  onChange={e => setTalla(e.target.value as RegistrationFormData["talla"])}
                  className="w-full bg-[#0d1117] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/30 appearance-none cursor-pointer"
                >
                  {(["XS","S","M","L","XL","XXL","NA"] as const).map(t => (
                    <option key={t} value={t}>{t === "NA" ? "No aplica" : t}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* CATEGORY PREVIEW BADGE */}
          {/* [V37.4-6] Visible también para 5K caminata; oculto solo en 5K caninata */}
          <AnimatePresence mode="wait">
            {fechaNacimiento && (modalidad !== "5K" || isCaminata5K || isWeCanMove3K) && (
              <motion.div
                key={`${categoria}-${genderMismatchWarning ? "warn" : "ok"}`}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                {genderMismatchWarning ? (
                  <div className="flex items-start gap-3 p-4 rounded-xl border border-orange-500/40 bg-orange-500/10">
                    <ShieldAlert className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-black uppercase text-orange-400 mb-0.5">
                        Conflicto Género / Categoría
                      </p>
                      <p className="text-xs text-orange-300/80">{genderMismatchWarning}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/8 bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider">
                        Categoría calculada:
                      </span>
                    </div>
                    <span
                      className="text-[11px] font-black uppercase px-3 py-1 rounded-lg"
                      style={{
                        background: `${accentColor}10`,
                        color: accentColor,
                        border: `1px solid ${accentColor}25`,
                      }}
                    >
                      {categoria}
                    </span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* MOVILIDAD REDUCIDA */}
          <div
            className="flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all"
            style={{
              background:  movilidadReducida ? `${accentColor}10` : "rgba(255,255,255,0.03)",
              borderColor: movilidadReducida ? `${accentColor}40` : "rgba(255,255,255,0.10)",
            }}
            onClick={() => setMovilidadReducida(!movilidadReducida)}
          >
            <div>
              <p className="text-xs font-bold uppercase text-white/80">Movilidad Reducida</p>
              <p className="text-[10px] text-white/40 mt-0.5">
                Marca si requieres atención especial durante el evento
              </p>
            </div>
            <div
              className="h-6 w-11 rounded-full relative transition-all shrink-0"
              style={{ background: movilidadReducida ? accentColor : "rgba(255,255,255,0.1)" }}
            >
              <div
                className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all"
                style={{ left: movilidadReducida ? "calc(100% - 1.35rem)" : "0.1rem" }}
              />
            </div>
          </div>

          {/* CONTACTO DE EMERGENCIA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-white/60 mb-1 block">
                Contacto de Emergencia
              </label>
              <input
                type="text" value={contactoEmergencia}
                onChange={e => setContactoEmergencia(e.target.value)}
                placeholder="Nombre del contacto"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/30 placeholder:text-white/20"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-white/60 mb-1 block">
                Teléfono de Emergencia
              </label>
              <input
                type="text" value={telefonoEmergencia}
                onChange={e => setTelefonoEmergencia(e.target.value)}
                placeholder="Ej: 0414-1234567"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/30 placeholder:text-white/20"
              />
            </div>
          </div>

          {/* [V37.9] SECCIÓN MASCOTA — 5K caninata original O 3K WE CAN MOVE */}
          <AnimatePresence>
            {isMascotaForm && (
              <motion.div
                key="pet-section"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="pt-6 border-t border-[#FDD454]/20 space-y-4">
                  <h3 className="text-sm font-bold uppercase text-white/80 flex items-center gap-2">
                    <Dog className="h-4 w-4 text-[#FDD454]" />
                    Datos de tu Mascota
                    <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#FDD454]/10 text-[#FDD454] border border-[#FDD454]/20">
                      REQUERIDO
                    </span>
                  </h3>
                  <div className="p-5 rounded-2xl bg-[#FDD454]/[0.03] border border-[#FDD454]/15 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold uppercase text-white/60 mb-1 block">
                          {isWeCanMove3K ? "Nombre de tu mascota" : "Nombre del Perro"}
                        </label>
                        <input
                          type="text" value={nombrePerro}
                          onChange={e => setNombrePerro(e.target.value)}
                          placeholder="Ej: Rocky, Luna, Mochi..." maxLength={40}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FDD454]/40 transition-colors placeholder:text-white/20"
                        />
                      </div>
                      {isWeCanMove3K && (
                        <div>
                          <label className="text-xs font-bold uppercase text-white/60 mb-1 block">Tipo de mascota</label>
                          <select value={tipoMascota}
                            onChange={e => setTipoMascota(e.target.value as "Perro" | "Gato" | "Otra especie")}
                            className="w-full bg-[#0d1117] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FDD454]/40 appearance-none cursor-pointer"
                          >
                            <option value="Perro">Perro</option>
                            <option value="Gato">Gato</option>
                            <option value="Otra especie">Otra especie</option>
                          </select>
                        </div>
                      )}
                      <div>
                        <label className="text-xs font-bold uppercase text-white/60 mb-1 block">
                          {isWeCanMove3K && tipoMascota !== "Perro" ? "Raza / descripción" : "Raza"}
                        </label>
                        {isWeCanMove3K && tipoMascota !== "Perro" ? (
                          <input type="text" value={detalleMascota}
                            onChange={e => setDetalleMascota(e.target.value)} maxLength={60}
                            placeholder="Ej: Siamés / Mestizo"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FDD454]/40"
                          />
                        ) : (
                          <select
                            value={razaPerro} onChange={e => setRazaPerro(e.target.value)}
                            className="w-full bg-[#0d1117] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FDD454]/40 transition-colors appearance-none cursor-pointer"
                          >
                            {RAZAS_COMUNES.map(raza => (
                              <option key={raza} value={raza}>{raza}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-white/30 flex items-start gap-1.5 pt-1">
                      <Dog className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[#FDD454]/50" />
                      {isWeCanMove3K
                        ? "Registraremos los datos de tu mascota para WE CAN MOVE. Llévala bajo control y con los medios de sujeción adecuados."
                        : "Los datos de tu mascota aparecerán en el dorsal. Asegúrate de que cuente con correa."}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* [V37.9] Solo modalidades pagas muestran datos bancarios y comprobante. */}
          {!isWeCanMove3K ? (
          <div className="pt-6 border-t border-white/10 space-y-4">
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase text-white/80 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-[#FCD34D]" /> Forma de pago
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button type="button" disabled={uploading || mutation.isPending}
                  onClick={() => { if (metodoPago !== "pago_movil") { setFileComprobante(null); setCasheaPrimeraCuota(false); setCasheaAbierto(false); } setMetodoPago("pago_movil"); }}
                  aria-pressed={metodoPago === "pago_movil"}
                  className={`p-4 rounded-xl text-left border transition-colors ${metodoPago === "pago_movil" ? "border-emerald-400/60 bg-emerald-400/[0.07]" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"}`}>
                  <span className="flex gap-2 items-center font-black uppercase text-xs"><Banknote size={17} className="text-emerald-400" /> Pago móvil</span>
                  <span className="block mt-2 text-xs text-white/50">Transferencia con referencia bancaria.</span>
                </button>
                {casheaDisponible && (
                  <button type="button" disabled={uploading || mutation.isPending}
                    onClick={() => { if (metodoPago !== "cashea") { setFileComprobante(null); setCasheaPrimeraCuota(false); setCasheaAbierto(false); } setMetodoPago("cashea"); }}
                    aria-pressed={metodoPago === "cashea"}
                    className={`p-4 rounded-xl text-left border transition-colors ${esCashea ? "border-[#FCD34D]/70 bg-[#FCD34D]/[0.08]" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"}`}>
                    <span className="flex gap-2 items-center font-black uppercase text-xs"><CreditCard size={17} className="text-[#FCD34D]" /> Cashea</span>
                    <span className="block mt-2 text-xs text-white/50">Abre Cashea y paga la primera cuota.</span>
                  </button>
                )}
              </div>
            </div>

            {!esCashea && (
            <>
            <h3 className="text-sm font-bold uppercase text-white/80 flex items-center gap-2">
              <Banknote className="h-4 w-4 text-emerald-400" />
              Datos Bancarios para Pago / Transferencia
            </h3>

            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-white/40 block">Banco:</span>
                  <span className="font-bold text-white/90">{cfg.pago.banco}</span>
                </div>
                <div>
                  <span className="text-white/40 block">Titular:</span>
                  <span className="font-bold text-white/90">{cfg.pago.titular}</span>
                </div>
                <div>
                  <span className="text-white/40 block">Cédula / RIF:</span>
                  <span className="font-bold text-white/90">{cfg.pago.cedula}</span>
                </div>
                <div className="flex items-center justify-between bg-white/5 p-2 rounded-lg border border-white/10">
                  <div>
                    <span className="text-white/40 block text-[10px]">Pago Móvil / Teléfono:</span>
                    <span className="font-mono font-bold text-emerald-400">{cfg.pago.pagoMovil}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(cfg.pago.pagoMovil, "pm")}
                    className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-white/60"
                  >
                    {copiedField === "pm"
                      ? <Check className="h-3.5 w-3.5 text-emerald-400" />
                      : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              {cfg.pago.cuenta && (
                <div className="pt-2 border-t border-white/5 text-xs text-white/60">
                  <span className="font-bold text-white/80">Opciones Adicionales / Zelle:</span>
                  <p className="mt-0.5">{cfg.pago.cuenta}</p>
                </div>
              )}
            </div>

            {/* TARJETA MONTO */}
            <AnimatePresence>
              {!precio.loading && precio.montoBs > 0 && (
                <motion.div
                  key="precio-card"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                >
                  <div
                    className="p-5 rounded-2xl border space-y-3"
                    style={{
                      background:  `${accentColor}07`,
                      borderColor: `${accentColor}30`,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4" style={{ color: accentColor }} />
                      <span className="text-xs font-black uppercase" style={{ color: accentColor }}>
                        Monto a Transferir
                      </span>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-black uppercase"
                        style={{ background: `${accentColor}15`, color: accentColor, border: `1px solid ${accentColor}30` }}
                      >
                        {modalidad}
                      </span>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-[10px] text-white/40 uppercase font-bold mb-1">
                          Total en Bolívares
                        </p>
                        <p
                          className="font-black tabular-nums"
                          style={{ fontSize: "clamp(1.6rem,5vw,2.4rem)", color: accentColor, lineHeight: 1 }}
                        >
                          {formatBs(precio.montoBs)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(precio.montoBs.toFixed(2), "monto")}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase transition-all"
                        style={{ background: `${accentColor}15`, color: accentColor, border: `1px solid ${accentColor}30` }}
                      >
                        {copiedField === "monto"
                          ? <><Check className="h-3.5 w-3.5" /> Copiado</>
                          : <><Copy className="h-3.5 w-3.5" /> Copiar</>}
                      </button>
                    </div>
                    <div
                      className="flex items-center gap-3 pt-1 text-[10px] text-white/40 border-t"
                      style={{ borderColor: `${accentColor}15` }}
                    >
                      <span className="font-mono">${precio.costoUSD.toFixed(2)} USD</span>
                      <span>×</span>
                      <span className="font-mono">{precio.tasaBCV.toFixed(2)} Bs/$ (Tasa BCV)</span>
                      <span>=</span>
                      <span className="font-mono font-bold text-white/60">{formatBs(precio.montoBs)}</span>
                    </div>
                  </div>
                </motion.div>
              )}
              {precio.loading && (
                <motion.div
                  key="precio-loading"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="p-4 rounded-2xl border border-white/5 bg-white/[0.02] flex items-center gap-3"
                >
                  <Loader2 className="h-4 w-4 animate-spin text-white/30" />
                  <span className="text-[11px] text-white/30 uppercase font-bold">
                    Calculando precio...
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* CAMPOS DE PAGO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-xs font-bold uppercase text-white/60 mb-1 block">
                  Referencia de Pago
                </label>
                <input
                  type="text" value={referencia} onChange={e => setReferencia(e.target.value)}
                  placeholder="Ej: 849204" required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/30"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-white/60 mb-1 block">
                  Comprobante (Imagen)
                </label>
                <input
                  type="file" accept="image/*"
                  onChange={e => setFileComprobante(e.target.files?.[0] || null)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white/50 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white"
                />
              </div>
            </div>
            </>
            )}

            {esCashea && (
              <div className="space-y-4 rounded-2xl border border-[#FCD34D]/35 bg-[#FCD34D]/[0.04] p-5 sm:p-6" role="region" aria-label="Pago con Cashea">
                <div className="flex items-center gap-2 text-[#FCD34D]">
                  <CreditCard size={19} />
                  <p className="text-sm font-black uppercase">Paga con Cashea</p>
                </div>
                <div className="rounded-xl border border-[#FCD34D]/30 bg-black/20 p-4 space-y-2">
                  <label htmlFor="titular-cashea" className="block text-xs font-black uppercase text-[#FCD34D]">
                    Nombre completo del titular de Cashea · Obligatorio
                  </label>
                  <input
                    id="titular-cashea"
                    type="text"
                    autoComplete="name"
                    maxLength={100}
                    required={esCashea}
                    disabled={uploading || mutation.isPending}
                    value={titularCashea}
                    onChange={e => setTitularCashea(e.target.value)}
                    placeholder="Nombre y apellido como aparecen en Cashea"
                    className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-[#FCD34D]"
                  />
                  <p className="text-[11px] leading-relaxed text-white/60">
                    Si pagas con Cashea de un familiar o de otra persona, escribe el nombre de
                    esa persona, no el del corredor. RayoCero lo usará para verificar la inicial.
                  </p>
                </div>
                <p className="text-xs text-white/75 leading-relaxed">
                  1. Abre el enlace oficial de RayoCero en Cashea. Si estás en teléfono,
                  puede abrirse la aplicación. Completa la compra y paga la primera cuota.
                </p>
                <a href={CASHEA_LINK} target="_blank" rel="noopener noreferrer"
                  onClick={() => setCasheaAbierto(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FCD34D] px-5 py-4 text-xs font-black uppercase text-[#03070b] hover:brightness-110">
                  <ExternalLink size={18} /> Abrir pago en Cashea
                </a>
                <p className="text-[11px] text-white/50 leading-relaxed">
                  El enlace se abrirá en otra pestaña o en Cashea. Luego regresa a esta pestaña
                  sin cerrarla para conservar tus datos.
                  {precio.costoUSD > 0 && (
                    <strong className="block mt-2 text-white">Precio de la modalidad en RayoCero: ${precio.costoUSD.toFixed(2)} USD.</strong>
                  )}
                  Confirma que el producto mostrado en Cashea tenga el mismo importe y corresponda
                  a tu modalidad. Si no coincide, no pagues y contacta a RayoCero.
                </p>
                <div className="border-t border-white/10 pt-4 space-y-3">
                  <p className="text-xs text-white/75 leading-relaxed">
                    2. Una vez pagada la inicial, adjunta una <strong className="text-white">captura de la operación aprobada</strong>.
                    RayoCero revisará el comprobante.
                  </p>
                  <label className="block text-xs font-bold uppercase text-[#FCD34D]">
                    Captura del pago de la primera cuota · Obligatoria
                    <input type="file" accept="image/*" required={esCashea}
                      onChange={e => setFileComprobante(e.target.files?.[0] || null)}
                      className="mt-2 w-full bg-white/5 border border-[#FCD34D]/30 rounded-xl px-4 py-3 text-xs text-white/60 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#FCD34D]/20 file:text-[#FCD34D]" />
                  </label>
                  {fileComprobante && <p className="text-xs text-emerald-300">Imagen seleccionada: {fileComprobante.name}</p>}
                  <label className="flex gap-3 items-start cursor-pointer rounded-xl border border-white/10 p-3 text-xs text-white/80">
                    <input type="checkbox" checked={casheaPrimeraCuota}
                      onChange={e => setCasheaPrimeraCuota(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[#FCD34D]" />
                    Confirmo que ya pagué la primera cuota en Cashea y que la captura corresponde a esta operación.
                  </label>
                  <p className="text-[11px] text-amber-200/80">
                    Adjuntar un comprobante no equivale a pago validado. La organización verificará la transacción.
                  </p>
                </div>
              </div>
            )}
          </div>
          ) : (
            <div className="space-y-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.04] p-5">
              <p className="text-emerald-300 font-black uppercase text-sm flex items-center gap-2">
                <Check className="w-4 h-4" /> TOTAL A PAGAR: $0.00 USD
              </p>
              <p className="text-xs text-white/65">Sin pagos, sin referencia bancaria, sin comprobante y sin kit de corredor.</p>
              <label className="flex items-start gap-3 cursor-pointer text-xs leading-relaxed text-white/80">
                <input type="checkbox" checked={aceptaMascota}
                  onChange={e => setAceptaMascota(e.target.checked)}
                  required className="mt-0.5 h-4 w-4 shrink-0 accent-[#FCD34D]" />
                <span>Confirmo que soy responsable de mi mascota, que la llevaré bajo control y con los medios de sujeción adecuados, y que cumpliré las indicaciones de seguridad del evento.</span>
              </label>
            </div>
          )}

          {/* [V37.8] Confirmación expresa. No cambia aceptación de deslinde. */}
          {franelaPostCarreraActiva && (
            <label className="flex items-start gap-3 p-4 rounded-xl border border-amber-400/30 bg-amber-400/[0.05] cursor-pointer">
              <input
                type="checkbox"
                required
                checked={aceptaEntregaPost}
                onChange={e => setAceptaEntregaPost(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-amber-400 cursor-pointer"
              />
              <span className="text-xs leading-relaxed text-white/85">
                <strong>Confirmo que estoy informado/a:</strong> mi franela se entregará
                después de la Caninata. La organización me contactará posteriormente
                para coordinarla.
              </span>
            </label>
          )}

          {/* BOTÓN SUBMIT */}
          <button
            type="submit"
            disabled={uploading || mutation.isPending || !!genderMismatchWarning || (franelaPostCarreraActiva && !aceptaEntregaPost) || (isWeCanMove3K && !aceptaMascota)}
            className="w-full py-4 rounded-xl font-black uppercase text-sm tracking-wider flex items-center justify-center gap-2 transition-all mt-6 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: accentColor, color: "#03070b" }}
          >
            {(uploading || mutation.isPending) ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isCaninataRaceType && modalidad === "5K" ? (
              <><Dog className="h-5 w-5" /> PROCESAR Y GENERAR DORSALES CANINATA</>
            ) : isCaninataRaceType ? (
              <><Dog className="h-5 w-5" /> {`PROCESAR INSCRIPCIÓN CANINATA (${modalidad})`}</>
            ) : isWeCanMove3K ? (
              <><Dog className="h-5 w-5" /> INSCRIBIRME GRATIS · WE CAN MOVE 3K</>
            ) : esCashea ? (
              <><CreditCard className="h-5 w-5" /> ENVIAR INSCRIPCIÓN Y COMPROBANTE CASHEA</>
            ) : isCaminata5K ? (
              // [V37.4-8] 5K caminata LED Coro
              <><Footprints className="h-5 w-5" /> PROCESAR INSCRIPCIÓN CAMINATA (5K)</>
            ) : (
              <><Flag className="h-5 w-5" /> {`PROCESAR INSCRIPCIÓN (${modalidad})`}</>
            )}
          </button>

          {!fechaNacimiento && (
            <p className="text-center text-[10px] text-white/25 uppercase font-bold tracking-widest">
              Ingresa tu fecha de nacimiento para ver tu categoría
            </p>
          )}

        </form>
      </div>
    </div>
  );
}
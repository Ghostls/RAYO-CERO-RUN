/**
 * VALKYRON GROUP — RAYO CERO API LAYER (V3.4 - INTEGRIDAD Y EFICIENCIA)
 * Senior Dev: MIA (Valkyron Group)
 * CEO: Lualdo Sciscioli
 * REGLA DE ORO: Código completo sin omisiones. Copy-paste ready.
 *
 * CHANGELOG V3.4 (sobre V3.3):
 * [V3.4-1] Edad por cumpleaños real (sin error por año de 365.25 días).
 * [V3.4-2] Cédula numérica validada después de normalizar caracteres.
 * [V3.4-3] Pace redondeado sin generar segundos "60".
 * [V3.4-4] Consulta de dorsal exige entrada numérica íntegra, sin parseInt parcial.
 * [V3.4-5] Sin nuevas escrituras ni cambios a tablas, rutas, Cashea o dorsales.
 *
 * CHANGELOG V3.3:
 * [V3.3-1] Identificación automática de Cashea a partir de referenciaPago
 *          CASHEA-... enviada por RegistrationForm V38.3.1.
 * [V3.3-2] Guarda metodo_pago="cashea" o "pago_movil" según corresponde.
 * [V3.3-3] Inscripciones nuevas nacen como pago_verificado=false.
 *          El comprobante NO constituye confirmación automática.
 * [V3.3-4] Cashea exige comprobante y referencia interna antes del INSERT.
 * [V3.3-5] Compatibilidad entre nombrePerro/razaPerro y
 *          nombreMascota/razaMascota para Caninata 5K.
 * [V3.3-6] Conserva todas las funciones de resultados y atletismo.
 *
 * CHANGELOG V3.2:
 * [V3.2-1] EVOLUCIÓN: calcularCategoria() ahora usa el sistema estándar
 *          de atletismo venezolano con 9 categorías granulares:
 *          Junior (<16), Juvenil (16-19), Libre (20-29),
 *          Sub Master 30-34, Sub Master 35-39,
 *          Master A (40-49), Master B (50-59), Master C (60-69), Master D (70+)
 *          Alineado con CATEGORY_ORDER del AdminDashboard V4.0.
 * [V3.2-2] Modalidad 4K → "Caminata Recreativa 4K" (sin cambios).
 *          Modalidad 5K → "Caminata Canina / Familiar" (alineado con form V36.10).
 *
 * CHANGELOG V3.1 (base):
 * [V3.1-1] BUG FIX: movilidadReducida → movilidad_reducida en el insert.
 *
 * CHANGELOG V3.0 (base):
 * [V3.0-1] Payload extendido: pagos, mascota, representante.
 * [V3.0-2] Normalización referencia/referenciaPago.
 */

import { z } from "zod";
import { supabase } from "./supabase";

// ─── HELPERS MATEMÁTICOS ────────────────────────────────────────────────────

export function calcularEdad(fechaNacimiento: string): number {
  // Fecha civil (YYYY-MM-DD), sin desfases UTC ni aproximaciones de 365.25 días.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fechaNacimiento);
  if (!m) return 0;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const birth = new Date(year, month - 1, day);
  if (birth.getFullYear() !== year || birth.getMonth() !== month - 1 || birth.getDate() !== day) return 0;
  const today = new Date();
  let age = today.getFullYear() - year;
  if (today.getMonth() + 1 < month ||
      (today.getMonth() + 1 === month && today.getDate() < day)) age--;
  return Math.max(0, age);
}

export function calcularPace(tiempoSegundos: number, distanciaKm: number): string {
  if (distanciaKm <= 0) return "0:00/km";
  if (!Number.isFinite(tiempoSegundos) || tiempoSegundos < 0) return "0:00/km";
  const totalSegundos = Math.round(tiempoSegundos / distanciaKm);
  const minutos = Math.floor(totalSegundos / 60);
  const segundos = totalSegundos % 60;
  return `${minutos}:${segundos.toString().padStart(2, "0")}/km`;
}

export function calcularVelocidad(tiempoSegundos: number, distanciaKm: number): number {
  if (tiempoSegundos <= 0) return 0;
  return parseFloat(((distanciaKm / tiempoSegundos) * 3600).toFixed(4));
}

/**
 * [V3.2-1] Motor de categorías — sistema estándar atletismo venezolano.
 * 9 categorías granulares por edad + Movilidad Reducida.
 * Alineado con CATEGORY_ORDER del AdminDashboard V4.0.
 *
 * Categoría        | Edad
 * -----------------|----------
 * Junior           | < 16
 * Juvenil          | 16 – 19
 * Libre            | 20 – 29
 * Sub Master 30-34 | 30 – 34
 * Sub Master 35-39 | 35 – 39
 * Master A         | 40 – 49
 * Master B         | 50 – 59
 * Master C         | 60 – 69
 * Master D         | 70 +
 */
export function calcularCategoria(
  edad: number,
  genero: "M" | "F",
  movilidadReducida: boolean = false
): string {
  if (movilidadReducida) return "Movilidad Reducida";

  const g = genero === "M" ? "Masculino" : "Femenino";

  if (edad < 16)                return `Junior ${g}`;
  if (edad >= 16 && edad <= 19) return `Juvenil ${g}`;
  if (edad >= 20 && edad <= 29) return `Libre ${g}`;
  if (edad >= 30 && edad <= 34) return `Sub Master (30-34) ${g}`;
  if (edad >= 35 && edad <= 39) return `Sub Master (35-39) ${g}`;
  if (edad >= 40 && edad <= 49) return `Master A ${g}`;
  if (edad >= 50 && edad <= 59) return `Master B ${g}`;
  if (edad >= 60 && edad <= 69) return `Master C ${g}`;
  return `Master D ${g}`; // 70+
}

// ─── SCHEMA ZOD ─────────────────────────────────────────────────────────────

export const registrationSchema = z.object({
  nombre:   z.string().min(2, "Mínimo 2 caracteres").max(100),
  apellido: z.string().min(2, "Mínimo 2 caracteres").max(100),
  cedula: z
    .string()
    .min(4, "Cédula muy corta")
    .max(15, "Cédula muy larga")
    .transform((val) => val.replace(/\D/g, ""))
    .refine((val) => val.length >= 4 && val.length <= 15, "Cédula inválida: introduce entre 4 y 15 dígitos"),
  email:    z.string().email("Email inválido"),
  telefono: z.string().optional().or(z.literal("")),

  fechaNacimiento: z.string().refine(
    (val) => {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(val);
      if (!match) return false;
      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);
      if (year < 1900) return false;
      const date = new Date(year, month - 1, day);
      const today = new Date();
      return date.getFullYear() === year && date.getMonth() === month - 1 &&
        date.getDate() === day &&
        date.getTime() <= new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    },
    "Fecha de nacimiento inválida"
  ),

  genero:            z.enum(["M", "F"]),
  talla:             z.enum(["XS", "S", "M", "L", "XL", "XXL", "NA"]),
  movilidadReducida: z.boolean().default(false),
  categoria:         z.string().optional(),
  monto:             z.union([z.number(), z.string()]).optional(),

  // Datos de Pago
  referencia:     z.string().optional(),
  referenciaPago: z.string().optional(),
  bancoOrigen:    z.string().optional(),
  fechaPago:      z.string().optional(),
  metodoPago:     z.string().optional(),
  comprobanteUrl: z.string().optional(),

  // Emergencia / Legales
  contactoEmergencia: z.string().optional(),
  telefonoEmergencia: z.string().optional(),
  aceptaDeslinde:     z.literal(true).optional().default(true),

  // Mascota (Caninata 5K)
  nombreMascota: z.string().optional(),
  razaMascota:   z.string().optional(),
  // Alias utilizados por RegistrationForm para la Caninata.
  nombrePerro:   z.string().optional(),
  razaPerro:     z.string().optional(),

  // Carrera y Modalidad
  race_id:   z.string().uuid("race_id inválido").optional(),
  modalidad: z.enum(["10K", "4K", "5K"]).optional(),

  // Representante (doble nomenclatura para compatibilidad)
  nombreRepresentante: z.string().optional(),
  cedulaRepresentante: z.string().optional(),
  repr_nombre:         z.string().optional(),
  repr_apellido:       z.string().optional(),
  repr_cedula:         z.string().optional(),
  repr_telefono:       z.string().optional(),
  repr_email:          z.string().optional(),
  repr_relacion:       z.string().optional(),
});

export type RegistrationFormData = z.infer<typeof registrationSchema>;

// ─── INTERFACES ─────────────────────────────────────────────────────────────

export interface RegistrationResult {
  bib_number: number;
  id: string;
  categoria: string;
}

export interface RunnerResultData {
  bib: string;
  name: string;
  time: string | null;
  pace: string | null;
  rank: number | null;
  categoryRank: number | null;
  category: string;
  totalRunners: number;
  velocidadKmh: number | null;
}

// ─── REGISTRO DE ATLETA ─────────────────────────────────────────────────────

export async function registerRunner(
  formData: RegistrationFormData
): Promise<RegistrationResult> {
  const parsed = registrationSchema.parse(formData);
  const edad   = calcularEdad(parsed.fechaNacimiento);

  /**
   * Resolución de categoría — prioridad:
   * 1. Si el form ya calculó y envió `categoria` → se respeta
   * 2. Modalidad 4K  → "Caminata Recreativa 4K"
   * 3. Modalidad 5K  → "Caminata Canina / Familiar"
   * 4. Modalidad 10K → calcularCategoria() con 9 rangos granulares
   */
  let categoria = parsed.categoria?.trim() || "";
  if (!categoria) {
    if (parsed.modalidad === "4K") {
      categoria = "Caminata Recreativa 4K";
    } else if (parsed.modalidad === "5K") {
      categoria = "Caminata Canina / Familiar";
    } else {
      categoria = calcularCategoria(edad, parsed.genero, parsed.movilidadReducida);
    }
  }

  // Normalización doble nomenclatura. V38.3.1 envía referenciaPago.
  const refPago   = (parsed.referenciaPago || parsed.referencia || "").trim();
  const repNombre = parsed.nombreRepresentante || parsed.repr_nombre || null;
  const repCedula = parsed.cedulaRepresentante || parsed.repr_cedula || null;

  // La referencia CASHEA-* es un identificador interno del formulario,
  // NO la referencia real de la transacción en Cashea.
  const esCasheaPorRef = /^CASHEA-[A-Z0-9]+(?:-[A-Z0-9]+)*$/i.test(refPago);
  const metodoDeclarado = (parsed.metodoPago || "").trim().toLowerCase();
  const esCashea = esCasheaPorRef || metodoDeclarado === "cashea";

  // El panel admin V4.8.1 identifica Cashea mediante el prefijo CASHEA-.
  // Sin él, un registro podría ser rotulado incorrectamente como Pago Móvil.
  if (esCashea && !esCasheaPorRef) {
    throw new Error("La inscripción Cashea requiere su identificador interno CASHEA-...; regresa al formulario e inténtalo de nuevo.");
  }
  if (esCashea && !parsed.comprobanteUrl?.trim()) {
    throw new Error("Debes adjuntar el comprobante de la primera cuota de Cashea antes de finalizar la inscripción.");
  }

  // Mantener compatibilidad con otros canales de registro que ya envían
  // metodoPago. En el formulario web, una referencia bancaria implica Pago Móvil.
  const metodoPagoDb = esCashea
    ? "cashea"
    : (metodoDeclarado || (refPago ? "pago_movil" : null));

  // RegistrationForm envía nombrePerro/razaPerro, la API original esperaba
  // nombreMascota/razaMascota; aceptar ambas evita pérdida de datos.
  const nombreMascota = parsed.nombreMascota || parsed.nombrePerro || null;
  const razaMascota = parsed.razaMascota || parsed.razaPerro || null;

  const { data, error } = await supabase
    .from("runners")
    .insert([{
      // Datos personales
      nombre:           parsed.nombre,
      apellido:         parsed.apellido,
      cedula:           parsed.cedula,
      email:            parsed.email,
      telefono:         parsed.telefono || null,
      fecha_nacimiento: parsed.fechaNacimiento,
      genero:           parsed.genero,
      categoria:        categoria,
      talla_camiseta:   parsed.talla,

      // [V3.1-1] snake_case correcto
      movilidad_reducida: parsed.movilidadReducida,

      // Finanzas
      referencia_pago: refPago,
      monto:           parsed.monto          ?? null,
      banco_origen:    parsed.bancoOrigen    ?? null,
      fecha_pago:      parsed.fechaPago      ?? null,
      metodo_pago:     metodoPagoDb,
      comprobante_url: parsed.comprobanteUrl ?? null,
      // La inscripción puede reservar dorsal; el pago exige verificación
      // manual del administrador. Nunca marcar como pagado desde el cliente.
      pago_verificado: false,

      // Emergencia / Deslinde
      contacto_emergencia:  parsed.contactoEmergencia ?? null,
      telefono_emergencia:  parsed.telefonoEmergencia ?? null,
      acepta_deslinde:      true,
      timestamp_aceptacion: new Date().toISOString(),

      // Mascota (Caninata 5K)
      nombre_mascota: nombreMascota,
      raza_mascota:   razaMascota,

      // Carrera y Modalidad
      race_id:   parsed.race_id   ?? null,
      modalidad: parsed.modalidad ?? "10K",

      // Representante (menor de 18)
      repr_nombre:   repNombre,
      repr_apellido: parsed.repr_apellido ?? null,
      repr_cedula:   repCedula,
      repr_telefono: parsed.repr_telefono ?? null,
      repr_email:    parsed.repr_email    ?? null,
      repr_relacion: parsed.repr_relacion ?? null,
    }])
    .select("bib_number, id, categoria")
    .single();

  if (error) {
    // Conservar code, details y hint para mapRegistrationError(): el frontend
    // puede distinguir cédula, email o dorsal duplicado por su constraint real.
    // No reintentar automáticamente el INSERT: un timeout puede ocultar éxito.
    throw error;
  }

  return data as RegistrationResult;
}

// ─── RESULTADOS POR DORSAL ──────────────────────────────────────────────────

export async function getResultsByBib(bib: string): Promise<RunnerResultData> {
  const bibLimpio = bib.trim();
  if (!/^\d+$/.test(bibLimpio)) throw new Error("Dorsal inválido.");
  const bibNum = Number(bibLimpio);
  if (!Number.isSafeInteger(bibNum) || bibNum <= 0) throw new Error("Dorsal inválido.");

  const { data, error } = await supabase
    .from("runners")
    .select(`
      nombre,
      apellido,
      categoria,
      bib_number,
      race_results (
        tiempo_chip,
        velocidad_kmh,
        distancia_km,
        ranking_general,
        ranking_categoria
      )
    `)
    .eq("bib_number", bibNum)
    .single();

  if (error) {
    if (error.code === "PGRST116")
      throw new Error("Dorsal no encontrado en la base de datos de inscritos.");
    throw new Error(error.message);
  }

  const { count } = await supabase
    .from("race_results")
    .select("*", { count: "exact", head: true });

  const runnerData = data as any;
  const raceData =
    runnerData.race_results && runnerData.race_results.length > 0
      ? runnerData.race_results[0]
      : null;

  if (!raceData) {
    return {
      bib:          runnerData.bib_number.toString(),
      name:         `${runnerData.nombre} ${runnerData.apellido}`,
      time:         null,
      pace:         null,
      rank:         null,
      categoryRank: null,
      category:     runnerData.categoria,
      totalRunners: count || 0,
      velocidadKmh: null,
    };
  }

  const [hh, mm, ss] = raceData.tiempo_chip.split(":").map(Number);
  const tiempoSeg = hh * 3600 + mm * 60 + ss;

  return {
    bib:          runnerData.bib_number.toString(),
    name:         `${runnerData.nombre} ${runnerData.apellido}`,
    time:         raceData.tiempo_chip,
    pace:         calcularPace(tiempoSeg, raceData.distancia_km),
    rank:         raceData.ranking_general,
    categoryRank: raceData.ranking_categoria,
    category:     runnerData.categoria,
    totalRunners: count || 0,
    velocidadKmh: raceData.velocidad_kmh,
  };
}
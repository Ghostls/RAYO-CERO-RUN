/**
 * VALKYRON GROUP — RAYO CERO API LAYER (V3.1 - COLUMN_NAME_FIX)
 * Senior Dev: MIA (Valkyron Group)
 * CEO: Lualdo Sciscioli
 * REGLA DE ORO: Código completo sin omisiones.
 *
 * CHANGELOG V3.1:
 * [V3.1-1] BUG FIX CRÍTICO: `movilidadReducida` → `movilidad_reducida` en el objeto
 *          del insert. Era el único campo camelCase enviado directamente a Supabase,
 *          causando el 400 Bad Request. Todos los demás campos ya estaban en snake_case.
 *
 * CHANGELOG V3.0 (base — sin modificaciones):
 * [V3.0-1] Soporte completo para payload extendido:
 *          - Pagos: referencia, bancoOrigen, fechaPago, metodoPago, comprobanteUrl.
 *          - Mascota (Caninata): nombreMascota, razaMascota.
 *          - Representante: nombreRepresentante, cedulaRepresentante.
 * [V3.0-2] Normalización de `referencia` / `referenciaPago` y compatibilidad retroactiva.
 */

import { z } from "zod";
import { supabase } from "./supabase";

// ─── HELPERS MATEMÁTICOS ────────────────────────────────────────────────────

export function calcularEdad(fechaNacimiento: string): number {
  const nacimiento = new Date(fechaNacimiento).getTime();
  const ahora = Date.now();
  const diffMs = ahora - nacimiento;
  const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;
  return Math.floor(diffMs / MS_PER_YEAR);
}

export function calcularPace(tiempoSegundos: number, distanciaKm: number): string {
  if (distanciaKm <= 0) return "0:00/km";
  const paceTotalSegundos = tiempoSegundos / distanciaKm;
  const minutos = Math.floor(paceTotalSegundos / 60);
  const segundos = Math.round(paceTotalSegundos % 60);
  return `${minutos}:${segundos.toString().padStart(2, "0")}/km`;
}

export function calcularVelocidad(tiempoSegundos: number, distanciaKm: number): number {
  if (tiempoSegundos <= 0) return 0;
  return parseFloat(((distanciaKm / tiempoSegundos) * 3600).toFixed(4));
}

/**
 * Motor de categorías — incluye Junior (< 16) para carrera 10K.
 * Las caminatas 4K / 5K usan categorías fijas desde el form o inferidas aquí.
 */
export function calcularCategoria(
  edad: number,
  genero: "M" | "F",
  movilidadReducida: boolean = false
): string {
  if (movilidadReducida) return "Movilidad Reducida Absoluto";

  const g = genero === "M" ? "Masculino" : "Femenino";

  if (edad < 16)                return `Junior ${g}`;
  if (edad >= 16 && edad <= 19) return `Juvenil ${g}`;
  if (edad >= 20 && edad <= 29) return `Libre ${g}`;
  if (edad >= 30 && edad <= 39) return `Submaster ${g}`;
  if (edad >= 40)               return `Master ${g}`;

  return `Absoluto ${g}`;
}

// ─── SCHEMA ZOD ─────────────────────────────────────────────────────────────

export const registrationSchema = z.object({
  nombre:    z.string().min(2, "Mínimo 2 caracteres").max(100),
  apellido:  z.string().min(2, "Mínimo 2 caracteres").max(100),
  cedula: z
    .string()
    .min(4, "Cédula muy corta")
    .max(15, "Cédula muy larga")
    .transform((val) => val.replace(/\D/g, "")),
  email:    z.string().email("Email inválido"),
  telefono: z.string().optional().or(z.literal("")),

  fechaNacimiento: z.string().refine(
    (val) => {
      const d = new Date(val);
      return !isNaN(d.getTime()) && d.getFullYear() > 1900;
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

  // Datos de Mascota (Caninata 5K)
  nombreMascota: z.string().optional(),
  razaMascota:   z.string().optional(),

  // Carrera y Modalidad
  race_id:   z.string().uuid("race_id inválido").optional(),
  modalidad: z.enum(["10K", "4K", "5K"]).optional(),

  // Datos de Representante (doble nomenclatura para compatibilidad)
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
  const edad = calcularEdad(parsed.fechaNacimiento);

  /*
   * Categoría:
   *   Si ya viene definida en formData se prioriza, de lo contrario:
   *   4K Caminata → "Caminata Recreativa 4K"
   *   5K Caninata → "Caninata 5K"
   *   10K Carrera → calcularCategoria() incluye Junior para < 16.
   */
  let categoria = parsed.categoria || "";
  if (!categoria) {
    if (parsed.modalidad === "4K") {
      categoria = "Caminata Recreativa 4K";
    } else if (parsed.modalidad === "5K") {
      categoria = "Caninata 5K";
    } else {
      categoria = calcularCategoria(edad, parsed.genero, parsed.movilidadReducida);
    }
  }

  // Normalización de referencia y representante (compatibilidad doble nomenclatura)
  const refPago   = parsed.referencia || parsed.referenciaPago || "";
  const repNombre = parsed.nombreRepresentante || parsed.repr_nombre  || null;
  const repCedula = parsed.cedulaRepresentante || parsed.repr_cedula  || null;

  const { data, error } = await supabase
    .from("runners")
    .insert([{
      nombre:           parsed.nombre,
      apellido:         parsed.apellido,
      cedula:           parsed.cedula,
      email:            parsed.email,
      telefono:         parsed.telefono || null,
      fecha_nacimiento: parsed.fechaNacimiento,
      genero:           parsed.genero,
      categoria:        categoria,
      talla_camiseta:   parsed.talla,

      // ✅ [V3.1-1] BUG FIX: snake_case correcto — la columna en Postgres es `movilidad_reducida`
      //    V3.0 enviaba `movilidadReducida` (camelCase) → Supabase lo rechazaba con 400.
      movilidad_reducida: parsed.movilidadReducida,

      // Finanzas
      referencia_pago: refPago,
      monto:           parsed.monto ?? null,
      banco_origen:    parsed.bancoOrigen  ?? null,
      fecha_pago:      parsed.fechaPago    ?? null,
      metodo_pago:     parsed.metodoPago   ?? null,
      comprobante_url: parsed.comprobanteUrl ?? null,

      // Emergencia / Deslinde
      contacto_emergencia:  parsed.contactoEmergencia ?? null,
      telefono_emergencia:  parsed.telefonoEmergencia ?? null,
      acepta_deslinde:      true,
      timestamp_aceptacion: new Date().toISOString(),

      // Mascota (Caninata 5K)
      nombre_mascota: parsed.nombreMascota ?? null,
      raza_mascota:   parsed.razaMascota   ?? null,

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
    if (error.code === "23505")
      throw new Error("Ya estás inscrito en esta carrera con esta cédula o email.");
    throw new Error(error.message);
  }

  return data as RegistrationResult;
}

// ─── RESULTADOS POR DORSAL ──────────────────────────────────────────────────

export async function getResultsByBib(bib: string): Promise<RunnerResultData> {
  const bibNum = parseInt(bib.trim(), 10);
  if (isNaN(bibNum)) throw new Error("Dorsal inválido.");

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
      bib: runnerData.bib_number.toString(),
      name: `${runnerData.nombre} ${runnerData.apellido}`,
      time: null, pace: null, rank: null, categoryRank: null,
      category: runnerData.categoria,
      totalRunners: count || 0,
      velocidadKmh: null,
    };
  }

  const [hh, mm, ss] = raceData.tiempo_chip.split(":").map(Number);
  const tiempoSeg = hh * 3600 + mm * 60 + ss;

  return {
    bib: runnerData.bib_number.toString(),
    name: `${runnerData.nombre} ${runnerData.apellido}`,
    time: raceData.tiempo_chip,
    pace: calcularPace(tiempoSeg, raceData.distancia_km),
    rank: raceData.ranking_general,
    categoryRank: raceData.ranking_categoria,
    category: runnerData.categoria,
    totalRunners: count || 0,
    velocidadKmh: raceData.velocidad_kmh,
  };
}
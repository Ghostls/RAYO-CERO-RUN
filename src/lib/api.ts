/**
 * VALKYRON GROUP — RAYO CERO API LAYER (V2.7 - JUNIOR + NO AGE RESTRICTION)
 * Senior Dev: MIA (Valkyron Group)
 * CEO: Lualdo Sciscioli
 * REGLA DE ORO: Código completo sin omisiones.
 *
 * CHANGELOG V2.7:
 * [V2.7-1] SIN RESTRICCIÓN DE EDAD — eliminado el .refine() de edad >= 16.
 *          Cualquier persona puede inscribirse. No hay bloqueo por edad.
 * [V2.7-2] Categoría JUNIOR: menores de 16 años en carrera 10K.
 *          calcularCategoria ahora incluye Junior antes de Juvenil.
 * [V2.7-3] Schema Zod ampliado: modalidad, repr_* (representante).
 *          Sin estos campos el schema.parse() los eliminaba antes del insert.
 * [V2.7-4] insert incluye modalidad y campos de representante.
 *
 * CHANGELOG V2.6:
 * [V2.6-1] race_id añadido al schema Zod.
 * [V2.6-2] insert incluye race_id.
 * [V2.6-3] Unicidad por carrera (cedula+race_id / email+race_id).
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
 * [V2.7-2] Motor de categorías — incluye Junior (< 16) para carrera 10K.
 * La caminata 4K usa categoría fija "Caminata Recreativa 4K" desde el form;
 * esta función solo se llama para atletas de modalidad 10K.
 *
 * Orden: Junior → Juvenil → Libre → Submaster → Master → Absoluto
 */
export function calcularCategoria(
  edad: number,
  genero: "M" | "F",
  movilidadReducida: boolean = false
): string {
  if (movilidadReducida) return "Movilidad Reducida Absoluto";

  const g = genero === "M" ? "Masculino" : "Femenino";

  if (edad < 16)              return `Junior ${g}`;          // [V2.7-2]
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
    .transform((val) => val.replace(/\D/g, "")),  // [V2.7-fix] strip any non-digit, no regex block
  email:    z.string().email("Email inválido"),
  telefono: z.string().optional().or(z.literal("")),

  // [V2.7-1] Sin validación de edad mínima — cualquier fecha válida es aceptada
  fechaNacimiento: z.string().refine(
    (val) => {
      const d = new Date(val);
      return !isNaN(d.getTime()) && d.getFullYear() > 1900;
    },
    "Fecha de nacimiento inválida"
  ),

  genero:           z.enum(["M", "F"]),
  talla:            z.enum(["XS", "S", "M", "L", "XL", "XXL", "NA"]),
  movilidadReducida: z.boolean().default(false),
  referenciaPago:   z.string().min(4, "Referencia bancaria inválida"),
  contactoEmergencia: z.string().min(3),
  telefonoEmergencia: z.string(),
  aceptaDeslinde:   z.literal(true),

  // [V2.6-1] Carrera activa
  race_id: z.string().uuid("race_id inválido").optional(),

  // [V2.7-3] Modalidad — '10K' | '4K'
  modalidad: z.enum(["10K", "4K"]).optional(),

  // [V2.7-3] Representante — solo para menores de 18; todos opcionales en schema
  // (la obligatoriedad la maneja el form, no la API)
  repr_nombre:   z.string().optional(),
  repr_apellido: z.string().optional(),
  repr_cedula:   z.string().optional(),
  repr_telefono: z.string().optional(),
  repr_email:    z.string().optional(),
  repr_relacion: z.string().optional(),
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
   * [V2.7-2] Categoría:
   *   4K Caminata → el form envía "Caminata Recreativa 4K" directamente
   *                 a través del campo categoria (no se recalcula aquí).
   *   10K Carrera → calcularCategoria() incluye Junior para < 16.
   *
   * Si el form no envía una categoria sobreescrita, se calcula.
   * Para la caminata, el campo categoria viene del form como string fijo.
   */
  const categoria = parsed.modalidad === "4K"
    ? "Caminata Recreativa 4K"
    : calcularCategoria(edad, parsed.genero, parsed.movilidadReducida);

  const { data, error } = await supabase
    .from("runners")
    .insert([{
      nombre:    parsed.nombre,
      apellido:  parsed.apellido,
      cedula:    parsed.cedula,
      email:     parsed.email,
      telefono:  parsed.telefono || null,
      fecha_nacimiento: parsed.fechaNacimiento,
      genero:    parsed.genero,
      categoria: categoria,
      talla_camiseta: parsed.talla,
      movilidadReducida: parsed.movilidadReducida,
      referencia_pago:    parsed.referenciaPago,
      contacto_emergencia: parsed.contactoEmergencia,
      telefono_emergencia: parsed.telefonoEmergencia,
      acepta_deslinde:    true,
      timestamp_aceptacion: new Date().toISOString(),
      // [V2.6-2] Carrera
      race_id: parsed.race_id ?? null,
      // [V2.7-4] Modalidad y representante
      modalidad:     parsed.modalidad ?? "10K",
      repr_nombre:   parsed.repr_nombre   ?? null,
      repr_apellido: parsed.repr_apellido ?? null,
      repr_cedula:   parsed.repr_cedula   ?? null,
      repr_telefono: parsed.repr_telefono ?? null,
      repr_email:    parsed.repr_email    ?? null,
      repr_relacion: parsed.repr_relacion ?? null,
    }])
    .select("bib_number, id, categoria")
    .single();

  if (error) {
    // [V2.6-3] unique violation — unicidad por carrera
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
/**
 * VALKYRON GROUP — RAYO CERO API LAYER (V3.2 - CATEGORIAS_GRANULARES)
 * Senior Dev: MIA (Valkyron Group)
 * CEO: Lualdo Sciscioli
 * REGLA DE ORO: Código completo sin omisiones. Copy-paste ready.
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

  // Mascota (Caninata 5K)
  nombreMascota: z.string().optional(),
  razaMascota:   z.string().optional(),

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

  // Normalización doble nomenclatura
  const refPago   = parsed.referencia    || parsed.referenciaPago     || "";
  const repNombre = parsed.nombreRepresentante || parsed.repr_nombre  || null;
  const repCedula = parsed.cedulaRepresentante || parsed.repr_cedula  || null;

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
      metodo_pago:     parsed.metodoPago     ?? null,
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
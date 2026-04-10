/**
 * VALKYRON GROUP — RAYO CERO API LAYER (V2.5 - STABLE)
 * Senior Dev: MIA (Valkyron Group)
 * CEO: Lualdo Sciscioli
 * Grado: Operativo / Militar
 * REGLA DE ORO: Código completo sin omisiones.
 * FIX: Integración de parámetro Movilidad Reducida en Zod y reestructuración exacta de categorías.
 */

import { z } from "zod";
import { supabase } from "./supabase";

// ─── HELPERS MATEMÁTICOS DE PRECISIÓN ──────────────────────────────────────

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

// MIA CORE: Motor de Asignación de Categorías Oficiales Rayo Cero
export function calcularCategoria(edad: number, genero: "M" | "F", movilidadReducida: boolean = false): string {
  // Overrride supremo: Si tiene movilidad reducida, se ignora edad y género.
  if (movilidadReducida) {
    return "Movilidad Reducida Absoluto";
  }

  const g = genero === "M" ? "Masculino" : "Femenino";
  
  if (edad >= 16 && edad <= 19) return `Juvenil ${g}`;
  if (edad >= 20 && edad <= 29) return `Libre ${g}`;
  if (edad >= 30 && edad <= 39) return `Submaster ${g}`;
  if (edad >= 40) return `Master ${g}`;
  
  return `Absoluto ${g}`; // Fallback táctico
}

// ─── SCHEMA DE VALIDACIÓN ZOD ───────────────────────────────────────────────

export const registrationSchema = z.object({
  nombre: z.string().min(2, "Mínimo 2 caracteres").max(100),
  apellido: z.string().min(2, "Mínimo 2 caracteres").max(100),
  cedula: z
    .string()
    .regex(/^[VEJPGvejpg]?\d{5,10}$/, "Formato de cédula inválido")
    .transform((val) => val.toUpperCase().replace(/[^0-9]/g, "")), 
  email: z.string().email("Email inválido"),
  telefono: z.string().optional().or(z.literal("")),
  fechaNacimiento: z.string().refine((val) => {
    const edad = calcularEdad(val);
    return edad >= 16 && edad <= 99; // Ajustado a 16 años (Mínimo Juvenil)
  }, "Edad permitida: 16+ años"),
  genero: z.enum(["M", "F"]),
  talla: z.enum(["XS", "S", "M", "L", "XL", "XXL"]),
  movilidadReducida: z.boolean().default(false), // <-- INYECCIÓN TÁCTICA ZOD
  referenciaPago: z.string().min(4, "Referencia bancaria inválida"),
  contactoEmergencia: z.string().min(3),
  telefonoEmergencia: z.string(),
  aceptaDeslinde: z.literal(true),
});

export type RegistrationFormData = z.infer<typeof registrationSchema>;

// ─── INTERFACES DE DATOS ────────────────────────────────────────────────────

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

// ─── SERVICIOS OPERATIVOS ───────────────────────────────────────────────────

export async function registerRunner(formData: RegistrationFormData): Promise<RegistrationResult> {
  const parsed = registrationSchema.parse(formData);
  const edad = calcularEdad(parsed.fechaNacimiento);
  // Se pasa el parámetro de movilidad reducida al motor de categorías
  const categoria = calcularCategoria(edad, parsed.genero, parsed.movilidadReducida);

  const { data, error } = await supabase
    .from("runners")
    .insert([{
      nombre: parsed.nombre,
      apellido: parsed.apellido,
      cedula: parsed.cedula,
      email: parsed.email,
      telefono: parsed.telefono || null,
      fecha_nacimiento: parsed.fechaNacimiento,
      genero: parsed.genero,
      categoria: categoria,
      talla_camiseta: parsed.talla,
      "movilidadReducida": parsed.movilidadReducida, // <-- ENVÍO A BD (Forzando nombre exacto de columna)
      referencia_pago: parsed.referenciaPago, 
      contacto_emergencia: parsed.contactoEmergencia,
      telefono_emergencia: parsed.telefonoEmergencia,
      acepta_deslinde: true,
      timestamp_aceptacion: new Date().toISOString(),
    }])
    .select("bib_number, id, categoria")
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("Cédula o Email ya registrados en el sistema.");
    throw new Error(error.message);
  }
  return data as RegistrationResult;
}

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
    if (error.code === 'PGRST116') {
      throw new Error("Dorsal no encontrado en la base de datos de inscritos.");
    }
    throw new Error(error.message);
  }

  const { count } = await supabase
    .from("race_results")
    .select("*", { count: "exact", head: true });

  const runnerData = data as any;
  const raceData = runnerData.race_results && runnerData.race_results.length > 0 
    ? runnerData.race_results[0] 
    : null;

  if (!raceData) {
    return {
      bib: runnerData.bib_number.toString(),
      name: `${runnerData.nombre} ${runnerData.apellido}`,
      time: null,
      pace: null,
      rank: null,
      categoryRank: null,
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
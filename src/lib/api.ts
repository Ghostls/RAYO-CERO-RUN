/**
 * VALKYRON GROUP — RAYO CERO API LAYER (V2.2)
 * Senior Dev: MIA
 * Grado: Operativo / Militar
 * * Fix: Resolución de error 406 (PostgREST). Implementación de Left Join 
 * * para soportar atletas inscritos sin tiempos registrados aún.
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

export function calcularCategoria(edad: number, genero: "M" | "F"): string {
  const g = genero === "M" ? "Masculino" : "Femenino";
  if (edad < 18) return `Juvenil ${g}`;
  if (edad < 30) return `Abierta ${g}`;
  if (edad < 40) return `Sub-Master ${g}`;
  if (edad < 50) return `Master A ${g}`;
  if (edad < 60) return `Master B ${g}`;
  return `Master C ${g}`;
}

// ─── SCHEMA DE VALIDACIÓN ZOD ───────────────────────────────────────────────

export const registrationSchema = z.object({
  nombre: z.string().min(2, "Mínimo 2 caracteres").max(100),
  apellido: z.string().min(2, "Mínimo 2 caracteres").max(100),
  cedula: z
    .string()
    .regex(/^[VEJPGvejpg]-?\d{6,8}$/, "Formato inválido")
    .transform((val) => val.toUpperCase().replace("-", "")),
  email: z.string().email("Email inválido"),
  telefono: z.string().optional().or(z.literal("")),
  fechaNacimiento: z.string().refine((val) => {
    const edad = calcularEdad(val);
    return edad >= 14 && edad <= 80;
  }, "Edad permitida: 14-80 años"),
  genero: z.enum(["M", "F"]),
  talla: z.enum(["XS", "S", "M", "L", "XL", "XXL"]),
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
  time: string | null; // Puede ser null si la carrera no ha empezado
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
  const categoria = calcularCategoria(edad, parsed.genero);

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

  // TÁCTICA ANTI-406: Buscamos primero en 'runners' y hacemos JOIN a 'race_results'
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
  // Extraemos los resultados si existen
  const raceData = runnerData.race_results && runnerData.race_results.length > 0 
    ? runnerData.race_results[0] 
    : null;

  // Si no hay datos de carrera (El UHF no ha escaneado), devolvemos perfil en limpio
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

  // Si hay datos de carrera, calculamos
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
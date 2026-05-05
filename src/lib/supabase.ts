import { createClient } from "@supabase/supabase-js";

// ─── Variables de entorno (configurar en .env.local y en Vercel Dashboard) ───
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    "[Valkyron] Supabase env vars no configuradas. " +
    "Crea .env.local con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY."
  );
}

export const supabase = createClient(
  supabaseUrl ?? "",
  supabaseKey ?? ""
);

// ─── Tipos de la base de datos ─────────────────────────────────────────────

export interface RunnerInsert {
  nombre: string;
  apellido: string;
  cedula: string;
  email: string;
  telefono?: string;
  fecha_nacimiento: string;
  genero: "M" | "F";
  categoria: string;
  talla_camiseta: string;
  contacto_emergencia: string;
  telefono_emergencia: string;
  acepta_deslinde: boolean;
  timestamp_aceptacion: string;
}

export interface RunnerRow extends RunnerInsert {
  id: string;
  bib_number: number;
  estado: "pendiente" | "confirmado" | "cancelado";
  created_at: string;
  updated_at: string;
}

export interface RaceResult {
  id: string;
  bib_number: number;
  runner_id: string;
  tiempo_chip: string;       // interval as string "HH:MM:SS"
  pace_seg_km: number;
  velocidad_kmh: number;
  distancia_km: number;
  ranking_general: number;
  ranking_categoria: number;
  runners: {
    nombre: string;
    apellido: string;
    categoria: string;
    genero: "M" | "F"; // Evolución: Necesario para validar paridad en equipos
  };
}

// ─── Evolución MIA: Módulo de Equipos (Grado Militar) ──────────────────────

/**
 * Representa la estructura de un equipo 2M + 2F.
 * La victoria se define por el menor tiempo escalar resultante de la suma de vectores de tiempo individuales.
 */
export interface TeamInsert {
  team_name: string;
  info_adicional?: string;
  // IDs de los 4 corredores (Foreign Keys a RunnerRow)
  runner_m1_id: string;
  runner_m2_id: string;
  runner_f1_id: string;
  runner_f2_id: string;
  created_by_email: string; // Quien registra el team
}

export interface TeamRow extends TeamInsert {
  id: string;
  created_at: string;
  // Campos calculados en el motor de resultados
  tiempo_total_ms?: number; 
  ranking_team?: number;
}

/**
 * Estructura para la consulta de resultados por equipo
 */
export interface TeamResult {
  team_name: string;
  tiempo_total: string; // Formato "HH:MM:SS.mmm"
  miembros: {
    nombre: string;
    apellido: string;
    tiempo_individual: string;
  }[];
}
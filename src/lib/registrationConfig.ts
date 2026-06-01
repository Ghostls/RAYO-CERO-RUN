/**
 * RAYOCERO — REGISTRATION CONFIG
 * Valkyron Group · MIA
 *
 * FUENTE ÚNICA DE VERDAD para el estado de inscripciones.
 * Importar este flag en cualquier componente que necesite
 * saber si las inscripciones están abiertas o cerradas.
 *
 * Para reabrir: cambiar a true. Sin más modificaciones.
 */

export const INSCRIPCIONES_ABIERTAS = false;

export const REGISTRO_STATUS = {
  label:  INSCRIPCIONES_ABIERTAS ? "Inscripciones Abiertas" : "Inscripciones Cerradas",
  badge:  INSCRIPCIONES_ABIERTAS ? "abiertas"               : "cerradas",
} as const;
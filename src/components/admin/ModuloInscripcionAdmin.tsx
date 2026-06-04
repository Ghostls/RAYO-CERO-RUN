/**
 * RAYOCERO — MÓDULO INSCRIPCIÓN ADMIN
 * Build: V1.0 — VALKYRON HQ
 * CEO: Lualdo Sciscioli | Valkyron Group
 *
 * Inscripción directa desde el AdminDashboard.
 * — Sin restricción de inscripciones cerradas
 * — Sin pago requerido (marcado como verificado automáticamente)
 * — Misma lógica de categorías que RegistrationForm
 * — Asignación de dorsal automática
 */

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  User, Trophy, Shield, CheckCircle, AlertCircle,
  Loader2, Accessibility, RefreshCw, UserPlus
} from 'lucide-react';

/* ─── Helpers ────────────────────────────────────────────────── */
const calcularEdad = (fechaNacimiento: string): number => {
  const hoy = new Date();
  const nac = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - nac.getFullYear();
  const m = hoy.getMonth() - nac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
  return edad;
};

const calcularCategoria = (edad: number, genero: 'M' | 'F', movilidadReducida: boolean): string => {
  const g = genero === 'M' ? 'Masculino' : 'Femenino';
  if (movilidadReducida) return 'Movilidad Reducida';
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

interface FormData {
  nombre: string;
  apellido: string;
  cedula: string;
  email: string;
  telefono: string;
  fechaNacimiento: string;
  genero: string;
  talla: string;
  movilidadReducida: boolean;
  contactoEmergencia: string;
  telefonoEmergencia: string;
}

const initialForm: FormData = {
  nombre: '', apellido: '', cedula: '', email: '',
  telefono: '', fechaNacimiento: '', genero: '',
  talla: '', movilidadReducida: false,
  contactoEmergencia: '', telefonoEmergencia: '',
};

/* ─── Component ──────────────────────────────────────────────── */
export default function ModuloInscripcionAdmin() {
  const [form, setForm] = useState<FormData>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ bib: number; nombre: string; categoria: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const update = (field: keyof FormData, value: string | boolean) =>
    setForm(f => ({ ...f, [field]: value }));

  const age = form.fechaNacimiento ? calcularEdad(form.fechaNacimiento) : null;
  const categoria = age !== null && form.genero
    ? calcularCategoria(age, form.genero as 'M' | 'F', form.movilidadReducida)
    : null;
  const esMenorDeEdad = age !== null && age < 16;

  const canSubmit =
    form.nombre && form.apellido && form.cedula && form.email &&
    form.telefono && form.fechaNacimiento && form.genero && form.talla &&
    form.contactoEmergencia && form.telefonoEmergencia &&
    !esMenorDeEdad && !isSubmitting;

  const handleSubmit = async () => {
    if (!canSubmit || !categoria) return;
    setIsSubmitting(true);
    setError(null);

    try {
      // Verificar si la cédula ya existe
      const { data: existing } = await supabase
        .from('runners')
        .select('id, cedula')
        .eq('cedula', form.cedula.replace(/\D/g, ''))
        .maybeSingle();

      if (existing) {
        setError(`La cédula ${form.cedula} ya está registrada en el sistema.`);
        setIsSubmitting(false);
        return;
      }

      // Obtener el siguiente bib_number
      const { data: lastRunner } = await supabase
        .from('runners')
        .select('bib_number')
        .order('bib_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextBib = (Number(lastRunner?.bib_number) || 0) + 1;

      // Insertar runner
      const { data, error: insertError } = await supabase
        .from('runners')
        .insert({
          nombre:               form.nombre.trim(),
          apellido:             form.apellido.trim(),
          cedula:               form.cedula.replace(/\D/g, ''),
          email:                form.email.toLowerCase().trim(),
          telefono:             form.telefono,
          fecha_nacimiento:     form.fechaNacimiento,
          genero:               form.genero,
          talla_camiseta:       form.talla,
          movilidadReducida:    form.movilidadReducida,
          categoria:            categoria,
          bib_number:           nextBib,
          contacto_emergencia:  form.contactoEmergencia,
          telefono_emergencia:  form.telefonoEmergencia,
          acepta_deslinde:      true,
          timestamp_aceptacion: new Date().toISOString(),
          pago_verificado:      true,   // Admin inscribe = pago verificado
          estado:               'confirmado',
          race_status:          'waiting',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setSuccess({
        bib: nextBib,
        nombre: `${form.nombre} ${form.apellido}`,
        categoria,
      });
      setForm(initialForm);

    } catch (e: any) {
      setError(e.message || 'Error al registrar atleta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 text-xs font-bold text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-400/60 transition-all uppercase tracking-wider";

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">

      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
          <UserPlus size={20} className="text-cyan-400" />
        </div>
        <div>
          <h3 className="text-lg font-black text-white uppercase italic tracking-widest">
            Inscripción Directa
          </h3>
          <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-0.5">
            Acceso admin · Pago verificado automáticamente
          </p>
        </div>
      </div>

      {/* Success banner */}
      {success && (
        <div className="bg-green-500/10 border border-green-500/25 rounded-2xl p-6 flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center gap-4">
            <CheckCircle size={24} className="text-green-400 flex-shrink-0" />
            <div>
              <p className="text-green-400 font-black text-sm uppercase">
                ✅ {success.nombre} — BIB #{String(success.bib).padStart(4, '0')}
              </p>
              <p className="text-green-400/60 text-[10px] uppercase tracking-widest mt-1">
                {success.categoria}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSuccess(null)}
            className="text-[10px] font-black uppercase text-green-400/50 hover:text-green-400 transition-colors"
          >
            Nuevo registro
          </button>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3">
          <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-xs font-bold uppercase">{error}</p>
        </div>
      )}

      {/* Form */}
      <div className="bg-black/40 border border-white/10 rounded-2xl p-8 space-y-8">

        {/* Sección 1: Identificación */}
        <div>
          <div className="flex items-center gap-2 mb-5">
            <User size={14} className="text-cyan-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">
              Identificación
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input className={inputClass} placeholder="Nombre" value={form.nombre}
              onChange={e => update('nombre', e.target.value)} />
            <input className={inputClass} placeholder="Apellido" value={form.apellido}
              onChange={e => update('apellido', e.target.value)} />
            <input className={inputClass} placeholder="Cédula / ID" value={form.cedula}
              onChange={e => update('cedula', e.target.value)} inputMode="numeric" />
            <input className={inputClass} placeholder="Email" type="email" value={form.email}
              onChange={e => update('email', e.target.value)} />
            <input className={`${inputClass} md:col-span-2`} placeholder="Teléfono" value={form.telefono}
              onChange={e => update('telefono', e.target.value)} inputMode="tel" />
          </div>
        </div>

        <div className="border-t border-white/5" />

        {/* Sección 2: Categoría */}
        <div>
          <div className="flex items-center gap-2 mb-5">
            <Trophy size={14} className="text-cyan-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">
              Categoría & Logística
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[9px] font-black uppercase text-gray-500 mb-2 block">
                Fecha de Nacimiento
              </label>
              <input className={inputClass} type="date" value={form.fechaNacimiento}
                onChange={e => update('fechaNacimiento', e.target.value)} />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase text-gray-500 mb-2 block">
                Género
              </label>
              <select className={inputClass} value={form.genero}
                onChange={e => update('genero', e.target.value)}>
                <option value="" className="bg-[#03070b]">Seleccionar</option>
                <option value="M" className="bg-[#03070b]">Masculino</option>
                <option value="F" className="bg-[#03070b]">Femenino</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-[9px] font-black uppercase text-gray-500 mb-2 block">
                Talla Camiseta
              </label>
              <select className={inputClass} value={form.talla}
                onChange={e => update('talla', e.target.value)}>
                <option value="" className="bg-[#03070b]">Seleccionar talla</option>
                {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(t => (
                  <option key={t} value={t} className="bg-[#03070b]">{t}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 bg-white/[0.02] border border-white/5 p-4 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Accessibility size={16} className="text-cyan-400" />
                <div>
                  <p className="text-[10px] font-black uppercase text-white">Movilidad Reducida</p>
                  <p className="text-[8px] text-gray-500 uppercase">Logística especial</p>
                </div>
              </div>
              <input type="checkbox" checked={form.movilidadReducida}
                onChange={e => update('movilidadReducida', e.target.checked)}
                className="h-5 w-5 rounded border-white/20 text-cyan-500 cursor-pointer" />
            </div>
          </div>

          {/* Warning menor de edad */}
          {esMenorDeEdad && (
            <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-xs font-bold uppercase">
                Edad mínima 16 años — Actual: {age} años
              </p>
            </div>
          )}

          {/* Categoría calculada */}
          {categoria && !esMenorDeEdad && (
            <div className="mt-4 bg-cyan-500/5 border border-cyan-500/15 p-4 rounded-xl text-center">
              <p className="text-[9px] font-black uppercase text-cyan-400/50 mb-1">Categoría Asignada</p>
              <p className="text-xl font-black text-cyan-400 uppercase tracking-tighter">{categoria}</p>
            </div>
          )}
        </div>

        <div className="border-t border-white/5" />

        {/* Sección 3: Emergencia */}
        <div>
          <div className="flex items-center gap-2 mb-5">
            <Shield size={14} className="text-cyan-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">
              Contacto de Emergencia
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input className={inputClass} placeholder="Nombre del contacto" value={form.contactoEmergencia}
              onChange={e => update('contactoEmergencia', e.target.value)} />
            <input className={inputClass} placeholder="Teléfono de emergencia" value={form.telefonoEmergencia}
              onChange={e => update('telefonoEmergencia', e.target.value)} inputMode="tel" />
          </div>
        </div>

        <div className="border-t border-white/5" />

        {/* Submit */}
        <div className="flex items-center justify-between">
          <div className="text-[9px] text-gray-600 uppercase tracking-widest">
            Pago marcado como verificado · Inscripción inmediata
          </div>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`flex items-center gap-2 px-8 py-4 rounded-xl font-black uppercase text-xs tracking-widest transition-all ${
              canSubmit
                ? 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-lg shadow-cyan-500/20'
                : 'bg-white/5 text-gray-600 cursor-not-allowed'
            }`}
          >
            {isSubmitting
              ? <><RefreshCw size={14} className="animate-spin" /> Registrando...</>
              : <><UserPlus size={14} /> Confirmar Inscripción</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
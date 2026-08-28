/**
 * RAYOCERO — MÓDULO INSCRIPCIÓN ADMIN
 * Build: V2.0 — VALKYRON HQ (EVOLUTION — CORO 499 SCOPE FIX)
 * CEO: Lualdo Sciscioli | Valkyron Group
 * REGLA DE ORO: Evolución sin Destrucción. Código completo. Copy-paste ready.
 *
 * CHANGELOG V2.0:
 * [V2-1] Recibe `scope: RaceScope` como prop — la inscripción admin queda
 *        vinculada a la carrera activa seleccionada en el AdminDashboard.
 *        El runner se guarda con race_id = scope.raceId (o NULL si legacy).
 * [V2-2] Campo `modalidad` agregado al formulario — selector 10K / 4K.
 *        Es obligatorio para que el runner aparezca en los tabs correctos.
 * [V2-3] Bib number calculado POR CARRERA, no global.
 *        Query filtra por race_id para no contaminar dorsales entre eventos.
 * [V2-4] Check de cédula duplicada SCOPED POR RACE_ID — un runner de Lara
 *        puede inscribirse en Coro sin bloqueo.
 * [V2-5] Categorías completadas: Junior (13-15), Caminata Recreativa 4K
 *        cuando modalidad = 4K. Movilidad Reducida sigue siendo global.
 * [V2-6] Badge de carrera activa en el header — siempre visible.
 * [V2-7] Sin comprobante de pago — inscripción admin = pago_verificado TRUE,
 *        referencia_pago = 'INSCRIPCION_ADMIN' para que el panel de
 *        inspección lo identifique y no busque en storage.
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { RaceScope } from '../../pages/AdminDashboard';
import {
  User, Trophy, Shield, CheckCircle, AlertCircle,
  Loader2, Accessibility, RefreshCw, UserPlus, Radio
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

/**
 * [V2-5] calcularCategoria — modalidad determina si la categoría
 * es de carrera o de caminata recreativa 4K.
 */
const calcularCategoria = (
  edad: number,
  genero: 'M' | 'F',
  movilidadReducida: boolean,
  modalidad: '10K' | '4K',
): string => {
  if (movilidadReducida) return 'Movilidad Reducida';
  // [V2-5] Caminata 4K = categoría fija independiente de edad/genero
  if (modalidad === '4K')  return 'Caminata Recreativa 4K';

  const g = genero === 'M' ? 'Masculino' : 'Femenino';
  if (edad >= 13 && edad <= 15) return `Junior ${g}`;      // [V2-5] Junior agregado
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

/* ─── Types ──────────────────────────────────────────────────── */

type Modalidad = '10K' | '4K';

interface FormData {
  nombre:              string;
  apellido:            string;
  cedula:              string;
  email:               string;
  telefono:            string;
  fechaNacimiento:     string;
  genero:              string;
  talla:               string;
  modalidad:           Modalidad | '';   // [V2-2]
  movilidadReducida:   boolean;
  contactoEmergencia:  string;
  telefonoEmergencia:  string;
}

const initialForm: FormData = {
  nombre: '', apellido: '', cedula: '', email: '',
  telefono: '', fechaNacimiento: '', genero: '',
  talla: '', modalidad: '',
  movilidadReducida: false,
  contactoEmergencia: '', telefonoEmergencia: '',
};

/* ─── Props ──────────────────────────────────────────────────── */

interface Props {
  scope: RaceScope;   // [V2-1] scope de la carrera activa
}

/* ─── Component ──────────────────────────────────────────────── */

export default function ModuloInscripcionAdmin({ scope }: Props) {
  const [form, setForm]           = useState<FormData>(initialForm);
  const [isSubmitting, setIsSub]  = useState(false);
  const [success, setSuccess]     = useState<{
    bib: number; nombre: string; categoria: string; modalidad: Modalidad;
  } | null>(null);
  const [error, setError]         = useState<string | null>(null);

  // Reset form cuando cambia la carrera seleccionada
  useEffect(() => {
    setForm(initialForm);
    setSuccess(null);
    setError(null);
  }, [scope.raceId]);

  const update = (field: keyof FormData, value: string | boolean) =>
    setForm(f => ({ ...f, [field]: value }));

  const age      = form.fechaNacimiento ? calcularEdad(form.fechaNacimiento) : null;
  const esMenor  = age !== null && age < 13;   // [V2-5] mínimo 13 para Junior
  const categoria = (age !== null && form.genero && form.modalidad)
    ? calcularCategoria(age, form.genero as 'M' | 'F', form.movilidadReducida, form.modalidad as Modalidad)
    : null;

  const canSubmit =
    form.nombre && form.apellido && form.cedula && form.email &&
    form.telefono && form.fechaNacimiento && form.genero &&
    form.talla && form.modalidad &&
    form.contactoEmergencia && form.telefonoEmergencia &&
    !esMenor && !isSubmitting;

  /* ── isCoroRace para label visual ── */
  const isCoroRace = scope.name.toLowerCase().includes('coro') || scope.name.includes('499');
  const raceLabel  = isCoroRace ? 'CORO 499' : scope.name.toUpperCase();

  /* ── Submit ── */
  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !categoria || !form.modalidad) return;
    setIsSub(true);
    setError(null);

    try {
      const cedulaClean = form.cedula.replace(/\D/g, '');

      // [V2-4] Verificar duplicado SOLO dentro de la carrera activa
      let dupQuery = supabase
        .from('runners')
        .select('id, cedula')
        .eq('cedula', cedulaClean);

      if (scope.legacy) {
        dupQuery = dupQuery.is('race_id', null);
      } else if (scope.raceId) {
        dupQuery = dupQuery.eq('race_id', scope.raceId);
      }

      const { data: existing } = await dupQuery.maybeSingle();

      if (existing) {
        setError(
          `La cédula ${cedulaClean} ya está inscrita en ${raceLabel}. ` +
          `Puede estar en otra carrera — cambia el scope.`
        );
        setIsSub(false);
        return;
      }

      // [V2-3] Obtener el siguiente bib_number DENTRO DE ESTA CARRERA
      let bibQuery = supabase
        .from('runners')
        .select('bib_number')
        .order('bib_number', { ascending: false })
        .limit(1);

      if (scope.legacy) {
        bibQuery = bibQuery.is('race_id', null);
      } else if (scope.raceId) {
        bibQuery = bibQuery.eq('race_id', scope.raceId);
      }

      const { data: lastRunner } = await bibQuery.maybeSingle();
      const nextBib = (Number(lastRunner?.bib_number) || 0) + 1;

      // [V2-1][V2-2][V2-7] Insert con race_id, modalidad y referencia_pago admin
      const { data, error: insertError } = await supabase
        .from('runners')
        .insert({
          nombre:               form.nombre.trim(),
          apellido:             form.apellido.trim(),
          cedula:               cedulaClean,
          email:                form.email.toLowerCase().trim(),
          telefono:             form.telefono,
          fecha_nacimiento:     form.fechaNacimiento,
          genero:               form.genero,
          talla_camiseta:       form.talla,
          movilidadReducida:    form.movilidadReducida,
          categoria:            categoria,
          modalidad:            form.modalidad,    // [V2-2]
          bib_number:           nextBib,
          contacto_emergencia:  form.contactoEmergencia,
          telefono_emergencia:  form.telefonoEmergencia,
          acepta_deslinde:      true,
          timestamp_aceptacion: new Date().toISOString(),
          pago_verificado:      true,
          estado:               'confirmado',
          race_status:          'waiting',
          race_id:              scope.legacy ? null : scope.raceId,   // [V2-1]
          referencia_pago:      'INSCRIPCION_ADMIN',                  // [V2-7]
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setSuccess({
        bib:       nextBib,
        nombre:    `${form.nombre.trim()} ${form.apellido.trim()}`,
        categoria,
        modalidad: form.modalidad as Modalidad,
      });
      setForm(initialForm);

    } catch (e: any) {
      setError(e.message || 'Error al registrar atleta.');
    } finally {
      setIsSub(false);
    }
  }, [canSubmit, categoria, form, scope, raceLabel]);

  /* ── Styles ── */
  const inputClass =
    'w-full rounded-xl bg-white/[0.03] border border-white/10 px-4 py-3 ' +
    'text-xs font-bold text-white placeholder:text-white/25 ' +
    'focus:outline-none focus:border-cyan-400/60 transition-all uppercase tracking-wider';

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
        <div className="flex items-center gap-3">
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
        {/* [V2-6] Badge carrera activa */}
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-xl border font-black text-xs uppercase"
          style={isCoroRace
            ? { background: 'rgba(220,38,38,0.1)', borderColor: 'rgba(220,38,38,0.3)', color: '#dc2626' }
            : { background: 'rgba(34,211,238,0.08)', borderColor: 'rgba(34,211,238,0.25)', color: '#22d3ee' }
          }
        >
          <Radio size={12} />
          {raceLabel}
          {scope.isActive && (
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          )}
        </div>
      </div>

      {/* ── Success banner ── */}
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
                <span className="ml-3 px-2 py-0.5 rounded-full border border-current/30 bg-current/10">
                  {success.modalidad === '10K' ? '🏃 10K' : '🚶 4K'}
                </span>
                <span className="ml-2 opacity-50">· {raceLabel}</span>
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

      {/* ── Error banner ── */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3">
          <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-xs font-bold uppercase">{error}</p>
        </div>
      )}

      {/* ── Form ── */}
      <div className="bg-black/40 border border-white/10 rounded-2xl p-8 space-y-8">

        {/* ── 1. Identificación ── */}
        <div>
          <div className="flex items-center gap-2 mb-5">
            <User size={14} className="text-cyan-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">
              Identificación
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              className={inputClass}
              placeholder="Nombre"
              value={form.nombre}
              onChange={e => update('nombre', e.target.value)}
            />
            <input
              className={inputClass}
              placeholder="Apellido"
              value={form.apellido}
              onChange={e => update('apellido', e.target.value)}
            />
            <input
              className={inputClass}
              placeholder="Cédula / ID"
              value={form.cedula}
              onChange={e => update('cedula', e.target.value)}
              inputMode="numeric"
            />
            <input
              className={inputClass}
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={e => update('email', e.target.value)}
            />
            <input
              className={`${inputClass} md:col-span-2`}
              placeholder="Teléfono"
              value={form.telefono}
              onChange={e => update('telefono', e.target.value)}
              inputMode="tel"
            />
          </div>
        </div>

        <div className="border-t border-white/5" />

        {/* ── 2. Modalidad ── */}
        <div>
          <div className="flex items-center gap-2 mb-5">
            <Trophy size={14} className="text-cyan-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">
              Modalidad
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {([
              { val: '10K', emoji: '🏃', label: '10K Carrera', color: '#00d4c8', bg: 'rgba(0,212,200,0.08)', border: 'rgba(0,212,200,0.25)' },
              { val: '4K',  emoji: '🚶', label: '4K Caminata', color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.25)' },
            ] as const).map(opt => {
              const active = form.modalidad === opt.val;
              return (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => update('modalidad', opt.val)}
                  className="py-5 rounded-2xl border-2 font-black uppercase text-sm tracking-widest transition-all flex flex-col items-center gap-2"
                  style={{
                    background:   active ? opt.bg   : 'rgba(255,255,255,0.02)',
                    borderColor:  active ? opt.border : 'rgba(255,255,255,0.07)',
                    color:        active ? opt.color : 'rgba(255,255,255,0.2)',
                    boxShadow:    active ? `0 0 20px ${opt.border}` : 'none',
                  }}
                >
                  <span style={{ fontSize: '2rem' }}>{opt.emoji}</span>
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-white/5" />

        {/* ── 3. Categoría & logística ── */}
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
              <input
                className={inputClass}
                type="date"
                value={form.fechaNacimiento}
                onChange={e => update('fechaNacimiento', e.target.value)}
              />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase text-gray-500 mb-2 block">
                Género
              </label>
              <select
                className={inputClass}
                value={form.genero}
                onChange={e => update('genero', e.target.value)}
              >
                <option value="" className="bg-[#03070b]">Seleccionar</option>
                <option value="M" className="bg-[#03070b]">Masculino</option>
                <option value="F" className="bg-[#03070b]">Femenino</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-[9px] font-black uppercase text-gray-500 mb-2 block">
                Talla Camiseta
              </label>
              <select
                className={inputClass}
                value={form.talla}
                onChange={e => update('talla', e.target.value)}
              >
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
              <input
                type="checkbox"
                checked={form.movilidadReducida}
                onChange={e => update('movilidadReducida', e.target.checked)}
                className="h-5 w-5 rounded border-white/20 text-cyan-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Alerta menor < 13 */}
          {esMenor && (
            <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-xs font-bold uppercase">
                Edad mínima 13 años (Junior) — Actual: {age} años
              </p>
            </div>
          )}

          {/* Categoría calculada */}
          {categoria && !esMenor && (
            <div className="mt-4 bg-cyan-500/5 border border-cyan-500/15 p-4 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black uppercase text-cyan-400/50 mb-1">
                  Categoría Asignada
                </p>
                <p className="text-xl font-black text-cyan-400 uppercase tracking-tighter">
                  {categoria}
                </p>
              </div>
              {form.modalidad && (
                <span
                  className="text-xs font-black uppercase px-3 py-1.5 rounded-full border"
                  style={form.modalidad === '10K'
                    ? { background: 'rgba(0,212,200,0.08)', borderColor: 'rgba(0,212,200,0.25)', color: '#00d4c8' }
                    : { background: 'rgba(251,191,36,0.08)', borderColor: 'rgba(251,191,36,0.25)', color: '#fbbf24' }
                  }
                >
                  {form.modalidad === '10K' ? '🏃 10K' : '🚶 4K'}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-white/5" />

        {/* ── 4. Emergencia ── */}
        <div>
          <div className="flex items-center gap-2 mb-5">
            <Shield size={14} className="text-cyan-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">
              Contacto de Emergencia
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              className={inputClass}
              placeholder="Nombre del contacto"
              value={form.contactoEmergencia}
              onChange={e => update('contactoEmergencia', e.target.value)}
            />
            <input
              className={inputClass}
              placeholder="Teléfono de emergencia"
              value={form.telefonoEmergencia}
              onChange={e => update('telefonoEmergencia', e.target.value)}
              inputMode="tel"
            />
          </div>
        </div>

        <div className="border-t border-white/5" />

        {/* ── Submit ── */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="text-[9px] text-gray-600 uppercase tracking-widest leading-relaxed">
            <p>Pago marcado como verificado · Inscripción inmediata</p>
            <p style={{ color: isCoroRace ? 'rgba(220,38,38,0.5)' : 'rgba(34,211,238,0.4)' }}>
              Carrera destino: {raceLabel}
            </p>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`flex items-center gap-2 px-8 py-4 rounded-xl font-black uppercase text-xs tracking-widest transition-all ${
              canSubmit
                ? isCoroRace
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-lg shadow-cyan-500/20'
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
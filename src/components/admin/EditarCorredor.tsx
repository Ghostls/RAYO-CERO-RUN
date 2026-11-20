import { useEffect, useRef, useState } from 'react';
import './EditarCorredor.css';
import type { FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { calcularEdad as edadCivil, calcularCategoriaLedCoro, isLedCoroRace } from '../../lib/api';
import type { RaceScope } from '../../pages/AdminDashboard';

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
  aplicaCategoriaLedCoro: boolean,
): string => {
  if (aplicaCategoriaLedCoro) return calcularCategoriaLedCoro(edad, genero, movilidadReducida);
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


const labels = {
  "bib_number": "Dorsal",
  "nombre": "Nombre",
  "apellido": "Apellido",
  "cedula": "Cédula",
  "email": "Correo",
  "telefono": "Teléfono",
  "fecha_nacimiento": "Fecha de nacimiento",
  "genero": "Género",
  "modalidad": "Modalidad",
  "categoria": "Categoría",
  "movilidad_reducida": "Movilidad reducida",
  "talla_camiseta": "Talla",
  "contacto_emergencia": "Contacto de emergencia",
  "telefono_emergencia": "Teléfono de emergencia",
  "repr_nombre": "Nombre del representante",
  "repr_apellido": "Apellido del representante",
  "repr_cedula": "Cédula del representante",
  "repr_email": "Correo del representante",
  "repr_telefono": "Teléfono del representante",
  "repr_relacion": "Parentesco",
  "nombre_mascota": "Nombre de la mascota",
  "raza_mascota": "Raza de la mascota",
  "estado": "Estado de inscripción",
  "referencia_pago": "Referencia de pago",
  "metodo_pago": "Método de pago",
  "banco_origen": "Banco o titular Cashea",
  "fecha_pago": "Fecha de pago",
  "monto": "Monto",
  "franela_post_carrera": "Franela poscarrera"
} as const;

type Field = keyof typeof labels;
type Row = Record<Field | 'movilidadReducida', string | number | boolean | null>;
const fields = Object.keys(labels) as Field[];
const required = new Set<Field>(['bib_number','nombre','apellido','cedula','email','fecha_nacimiento','genero','modalidad','categoria','contacto_emergencia','telefono_emergencia']);
const projection = [...fields, 'movilidadReducida'].join(',');
const sections: { title: string; keys: Field[] }[] = [
  { title: 'Datos personales', keys: ['nombre','apellido','cedula','fecha_nacimiento','genero','telefono','email'] },
  { title: 'Inscripción', keys: ['bib_number','modalidad','categoria','estado','talla_camiseta','movilidad_reducida','franela_post_carrera'] },
  { title: 'Contacto de emergencia', keys: ['contacto_emergencia','telefono_emergencia'] },
  { title: 'Representante', keys: ['repr_nombre','repr_apellido','repr_cedula','repr_relacion','repr_telefono','repr_email'] },
  { title: 'Mascota', keys: ['nombre_mascota','raza_mascota'] },
  { title: 'Pago', keys: ['metodo_pago','referencia_pago','banco_origen','fecha_pago','monto'] },
];
type Props = { id: string; scope: RaceScope; led: boolean; onClose: () => void; onSaved: () => void };

export default function EditarCorredor({ id, scope, led, onClose, onSaved }: Props) {
  const [before, setBefore] = useState<Row | null>(null);
  const [draft, setDraft] = useState<Row | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const race = scope.legacy ? null : scope.raceId;

  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      const query = supabase.from('runners').select(projection).eq('id', id);
      const { data, error: failure } = await (race === null ? query.is('race_id', null) : query.eq('race_id', race)).single();
      if (!active) return;
      if (failure) { setError(failure.message); return; }
      const row = data as unknown as Row;
      setBefore(row);
      setDraft({ ...row });
    }
    void load().catch(() => { if (active) setError('No se pudo cargar la ficha.'); });
    return () => { active = false; };
  }, [id, race]);

  const options: Partial<Record<Field, string[]>> = {
    genero: ['M','F'], estado: ['pendiente','confirmado','cancelado'],
    talla_camiseta: ['XS','S','M','L','XL','XXL'],
    modalidad: led ? ['10K','5K'] : /caninata/i.test(scope.name) ? ['5K'] : ['10K','4K'],
  };
  function change(field: Field, value: string | boolean) {
    if (!draft) return;
    const next = { ...draft, [field]: value };
    if (field === 'movilidad_reducida') next.movilidadReducida = value;
    if (['fecha_nacimiento','genero','modalidad','movilidad_reducida'].includes(field) && next.fecha_nacimiento && next.genero) {
      const reduced = Boolean(next.movilidad_reducida || next.movilidadReducida);
      const led10 = next.modalidad === '10K' && !scope.legacy && isLedCoroRace(scope.name);
      const age = (led10 ? edadCivil : calcularEdad)(String(next.fecha_nacimiento));
      if (next.modalidad === '5K' && led) next.categoria = 'Caminata Recreativa 5K';
      if (next.modalidad === '10K' || next.modalidad === '4K')
        next.categoria = calcularCategoria(age, next.genero as 'M' | 'F', reduced, next.modalidad, led10);
    }
    setDraft(next);
    setError('');
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!before || !draft || busy) return;
    const changes: Partial<Row> = {};
    for (const k of [...fields, 'movilidadReducida'] as (keyof Row)[]) {
      if (draft[k] === before[k]) continue;
      let v = draft[k];
      if (typeof v === 'string') v = v.trim() || null;
      if (k === 'email' && typeof v === 'string') v = v.toLowerCase();
      if (k === 'bib_number') v = Number(v);
      if (k === 'cedula' && !/^\d+$/.test(String(v))) { setError('Escribe la cédula usando solo números.'); return; }
      if (v === null && required.has(k as Field)) { setError('Completa los campos obligatorios.'); return; }
      if (v !== before[k]) changes[k] = v;
    }
    if (!Object.keys(changes).length) { setError('La ficha ya contiene esos valores.'); return; }
    setBusy(true);
    setError('');
    try {
      const { error: failure } = await supabase.rpc('rc_edit_runner', { p_id: id, p_race: race, p_before: before, p_changes: changes });
      if (failure) {
        setError(failure.code === '23505' ? 'Valor duplicado. Revisa dorsal, cédula y correo. Detalle: ' + failure.message : failure.message);
        return;
      }
      onSaved();
    } catch { setError('Conexión interrumpida. Vuelve a abrir la ficha para confirmar el estado.'); }
    finally { setBusy(false); }
  }

  return <dialog ref={dialogRef} className="rc-profile" aria-labelledby="rc-edit-title"
    onCancel={e => { e.preventDefault(); if (!busy) onClose(); }}>
    <form className="rc-profile-form" onSubmit={save}>
      <header className="rc-profile-header">
        <div><h2 id="rc-edit-title">Editar corredor</h2><p>{scope.name}</p></div>
        <button className="rc-profile-close" type="button" disabled={busy} onClick={onClose} aria-label="Cerrar editor" title="Cerrar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
        </button>
      </header>
      <div className="rc-profile-scroll" data-lenis-prevent="" tabIndex={0} role="region" aria-label="Campos del corredor">
        {!draft && !error && <p role="status">Cargando ficha…</p>}
        {draft && sections.map(section => <fieldset key={section.title} disabled={busy}>
          <legend>{section.title}</legend>
          <div className="rc-profile-grid">
          {section.keys.map(k => {
            const list = options[k];
            const v = String(draft[k] ?? '');
            const isCheck = k === 'movilidad_reducida' || k === 'franela_post_carrera';
            return <label key={k} className={isCheck ? 'rc-profile-check' : 'rc-profile-field'}><span>{labels[k]}{required.has(k) && <small aria-hidden="true"> *</small>}</span>
              {isCheck ? <input type="checkbox"  checked={Boolean(draft[k] || (k === 'movilidad_reducida' && draft.movilidadReducida))}
                onChange={e => change(k, e.target.checked)} /> : list ?
                <select className="rc-profile-input" value={v} required={required.has(k)} onChange={e => change(k,e.target.value)}>
                  <option value="">Seleccionar</option>
                  {Array.from(new Set([...list, ...(v && !list.includes(v) ? [v] : [])])).map(s => <option key={s}>{s}</option>)}
                </select> :
                <input className="rc-profile-input" value={v} required={required.has(k)}
                  type={k === 'bib_number' ? 'number' : k === 'fecha_nacimiento' ? 'date' : k.endsWith('email') ? 'email' : 'text'}
                  min={k === 'bib_number' ? 1 : undefined} onChange={e => change(k,e.target.value)} />}
            </label>;
          })}
          </div>
        </fieldset>)}
      </div>
      <footer className="rc-profile-footer">
        {error && <p role="alert">{error}</p>}
        <button type="button" disabled={busy} onClick={onClose}>Cancelar</button>
        <button type="submit" disabled={!draft || busy}>{busy ? 'Guardando…' : 'Guardar cambios'}</button>
      </footer>
    </form>
  </dialog>;
}

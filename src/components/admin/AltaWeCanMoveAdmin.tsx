import { useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { supabase } from '../../lib/supabase';
import type { RaceScope } from '../../pages/AdminDashboard';

const coroId = '89e3604a-c7d8-473c-bfdc-54ecba9ff542';
const inputStyle = 'mt-1 block min-h-11 w-full min-w-0 rounded-lg border border-white/20 bg-slate-900 px-3 py-2 text-base text-white';

function Field({ name, label, type = 'text', optional = false, choices }: {
  name: string; label: string; type?: string; optional?: boolean; choices?: string[];
}) {
  return <label className="block min-w-0 text-sm text-slate-200">{label}{!optional && ' *'}
    {choices ? <select className={inputStyle} name={name} required={!optional} defaultValue="">
      <option value="" disabled>Seleccionar</option>
      {choices.map(v => <option key={v} value={v}>{v}</option>)}
    </select> : <input className={inputStyle} name={name} type={type} required={!optional}
      inputMode={name === 'cedula' ? 'numeric' : undefined} pattern={name === 'cedula' ? '[0-9]+' : undefined}/>}
  </label>;
}

function Formulario3K({ onBusy }: {onBusy: (value: boolean) => void}) {
  const lock = useRef(false);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [success,setSuccess] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const fields: Record<string,string|boolean> = {};
    data.forEach((v,k) => { fields[k] = String(v).trim(); });
    fields.acepta_condiciones = data.has('acepta_condiciones');
    fields.movilidad_reducida = data.has('movilidad_reducida');
    lock.current = true; setBusy(true); onBusy(true); setSuccess(''); setError('');
    try {
      const response = await supabase.rpc('rc_inscribir_we_can_move_3k',{p_ficha:fields});
      if (response.error) {
        setError(response.error.code === '23505' ? 'La inscripción coincide con un registro existente. Revisa 3K Mascotas.' : response.error.message);
        return;
      }
      if (!response.data) throw new Error('Respuesta sin confirmación.');
      setSuccess(`Inscripción confirmada: ${fields.nombre} ${fields.apellido} con ${fields.nombre_mascota}.`);
      form.reset();
    } catch { setError('No se pudo confirmar el envío. Consulta 3K Mascotas antes de reintentar.'); }
    finally { lock.current = false; setBusy(false); onBusy(false); }
  }
  return <form onSubmit={submit} className="rounded-2xl border border-violet-400/25 bg-slate-950 p-4 text-white sm:p-6">
    <h3 className="text-xl font-bold">WE CAN MOVE · 3K con mascotas</h3>
    <p className="mb-5 mt-1 text-sm text-violet-200">Coro · Inscripción administrativa gratuita</p>
    <fieldset disabled={busy} className="min-w-0 space-y-6">
      <section><h4 className="mb-3 font-semibold">Participante</h4>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field name="nombre" label="Nombre"/><Field name="apellido" label="Apellido"/>
          <Field name="cedula" label="Cédula (solo números)"/><Field name="fecha_nacimiento" label="Fecha de nacimiento" type="date"/>
          <Field name="email" label="Correo" type="email"/><Field name="telefono" label="Teléfono" type="tel"/>
          <Field name="genero" label="Género" choices={['M','F']}/>
          <label className="flex items-center gap-2"><input name="movilidad_reducida" type="checkbox"/>Movilidad reducida</label>
          <Field name="contacto_emergencia" label="Contacto de emergencia" optional/>
          <Field name="telefono_emergencia" label="Teléfono de emergencia" type="tel" optional/>
        </div>
      </section>
      <section><h4 className="mb-3 font-semibold">Mascota</h4>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field name="nombre_mascota" label="Nombre de la mascota"/>
          <Field name="tipo_mascota" label="Especie" choices={['Perro','Gato','Otra especie']}/>
          <Field name="raza_mascota" label="Raza o descripción" optional/>
        </div>
      </section>
      <label className="flex items-start gap-3 text-sm"><input name="acepta_condiciones" type="checkbox" required className="mt-1"/>
        El participante confirmó que se responsabiliza de su mascota, la llevará bajo control con sujeción adecuada y seguirá las indicaciones de seguridad del evento.
      </label>
      <button disabled={busy} className="w-full rounded-lg bg-violet-300 px-4 py-3 font-bold text-slate-950 sm:w-auto">
        {busy ? 'Inscribiendo…' : 'Confirmar inscripción 3K'}
      </button>
    </fieldset>
    {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
    {success && <p role="status" className="mt-3 text-sm text-emerald-300">{success}</p>}
  </form>;
}

export default function AltaWeCanMoveAdmin({scope,children}: {scope: RaceScope;children: ReactNode}) {
  const [pets,setPets] = useState(false);
  const [busy,setBusy] = useState(false);
  if (scope.legacy || scope.raceId !== coroId) return <>{children}</>;
  return <div className="mx-auto max-w-4xl space-y-4">
    <div role="group" aria-label="Evento de inscripción" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {[false,true].map(value => <button key={String(value)} type="button" aria-pressed={pets === value} disabled={busy}
        onClick={() => setPets(value)} className={`rounded-xl border px-4 py-3 text-sm font-bold ${pets === value ? 'border-cyan-300 bg-cyan-300 text-slate-950' : 'border-white/20 text-white'}`}>
        {value ? 'WE CAN MOVE · 3K Mascotas' : 'Inscripción de corredor'}
      </button>)}
    </div>
    {pets ? <Formulario3K onBusy={setBusy}/> : children}
  </div>;
}

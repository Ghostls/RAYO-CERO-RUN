/**
 * RAYOCERO — PRE RACE SIGNAL BUTTON
 * Build: V1.0 — VALKYRON LAUNCH
 *
 * Botón para el Admin Dashboard que dispara la señal pre-carrera.
 * Agregar en AdminDashboard o en el panel de control del evento.
 *
 * USO:
 *   import PreRaceButton from './PreRaceButton';
 *   <PreRaceButton />
 */

import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface Props {
  seconds?: number; // segundos del countdown, default 60
}

const CSS = `
  .prb-wrap {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .prb-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 20px;
    background: rgba(239,68,68,0.1);
    border: 1px solid rgba(239,68,68,0.35);
    border-radius: 12px;
    color: #f87171;
    font-family: 'Barlow Condensed', sans-serif;
    font-style: italic;
    font-weight: 900;
    font-size: 1rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
  }

  .prb-btn:hover:not(:disabled) {
    background: rgba(239,68,68,0.18);
    border-color: rgba(239,68,68,0.6);
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(239,68,68,0.2);
  }

  .prb-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .prb-btn.sent {
    background: rgba(34,197,94,0.1);
    border-color: rgba(34,197,94,0.35);
    color: #22c55e;
  }

  .prb-icon { font-size: 1.2rem; }

  .prb-confirm {
    background: rgba(0,0,0,0.4);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    padding: 10px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .prb-confirm-text {
    font-size: 0.8rem;
    color: rgba(255,255,255,0.5);
    font-family: 'Barlow', sans-serif;
  }

  .prb-confirm-btns {
    display: flex;
    gap: 8px;
  }

  .prb-yes {
    padding: 4px 14px;
    background: rgba(239,68,68,0.15);
    border: 1px solid rgba(239,68,68,0.4);
    border-radius: 6px;
    color: #f87171;
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s;
    font-family: 'Barlow Condensed', sans-serif;
    font-style: italic;
  }

  .prb-yes:hover { background: rgba(239,68,68,0.25); }

  .prb-no {
    padding: 4px 14px;
    background: transparent;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 6px;
    color: rgba(255,255,255,0.4);
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.15s;
    font-family: 'Barlow', sans-serif;
  }

  .prb-no:hover { background: rgba(255,255,255,0.05); }

  .prb-status {
    font-size: 0.72rem;
    color: rgba(255,255,255,0.3);
    text-align: center;
    font-family: 'Barlow', sans-serif;
    letter-spacing: 0.05em;
  }

  .prb-spinner {
    display: inline-block;
    width: 12px; height: 12px;
    border: 2px solid rgba(248,113,113,0.3);
    border-top-color: #f87171;
    border-radius: 50%;
    animation: prb-spin 0.6s linear infinite;
    margin-right: 6px;
  }

  @keyframes prb-spin { to { transform: rotate(360deg); } }
`;

export default function PreRaceButton({ seconds = 60 }: Props) {
  const [state, setState] = useState<'idle' | 'confirm' | 'sending' | 'sent' | 'error'>('idle');
  const [lastSentAt, setLastSentAt] = useState<string | null>(null);

  const handleSend = async () => {
    setState('sending');
    try {
      const { error } = await supabase.from('race_signals').insert({
        type: 'pre_race_warning',
        message: String(seconds),
        created_by: 'admin',
      });

      if (error) throw error;

      setState('sent');
      setLastSentAt(new Date().toLocaleTimeString('es-VE'));
      // Reset a idle después de 5 segundos
      setTimeout(() => setState('idle'), 5000);
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="prb-wrap">
        <button
          className={`prb-btn ${state === 'sent' ? 'sent' : ''}`}
          onClick={() => state === 'idle' && setState('confirm')}
          disabled={state === 'sending' || state === 'sent'}
        >
          {state === 'sending' && <span className="prb-spinner" />}
          <span className="prb-icon">
            {state === 'sent' ? '✅' : state === 'error' ? '❌' : '🚨'}
          </span>
          {state === 'sent'
            ? `SEÑAL ENVIADA — ${lastSentAt}`
            : state === 'error'
            ? 'ERROR — INTENTA NUEVAMENTE'
            : state === 'sending'
            ? 'ENVIANDO...'
            : `SEÑAL PRE-CARRERA — ${seconds}s`}
        </button>

        {state === 'confirm' && (
          <div className="prb-confirm">
            <span className="prb-confirm-text">
              ¿Enviar alerta a TODOS los atletas?
            </span>
            <div className="prb-confirm-btns">
              <button className="prb-yes" onClick={handleSend}>SÍ, ENVIAR</button>
              <button className="prb-no" onClick={() => setState('idle')}>Cancelar</button>
            </div>
          </div>
        )}

        {state === 'idle' && (
          <div className="prb-status">
            Todos los atletas recibirán la cuenta regresiva en pantalla
          </div>
        )}
      </div>
    </>
  );
}
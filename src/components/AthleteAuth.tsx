/**
 * RAYOCERO — ATHLETE AUTH MODULE
 * Build: V1.0 — VALKYRON SHIELD
 * CEO: Lualdo Sciscioli | Valkyron Group
 *
 * LOGIN SIN CONTRASEÑA: dorsal + últimos 4 dígitos de cédula
 * → Busca en tabla `runners` → guarda sesión en localStorage
 * → Redirige a /perfil
 *
 * REGLA DE ORO: Evolución sin Destrucción.
 * DEPENDENCIAS: supabase, react-router-dom
 */

import { useState, useEffect } from 'react';
import logoPrincipal from '../assets/logo.png';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

/* ─── Types ──────────────────────────────────────────────────── */
export interface AthleteSession {
  bib_number: number;
  nombre: string;
  apellido: string;
  categoria: string;
  cedula_last4: string;
  telefono?: string;
  authenticated_at: string;
}

/* ─── Session Helpers (exportados para uso en otros componentes) ─ */
export const SESSION_KEY = 'rayocero_athlete_session';

export function getAthleteSession(): AthleteSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AthleteSession;
  } catch {
    return null;
  }
}

export function clearAthleteSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

/* ─── CSS ─────────────────────────────────────────────────────── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@1,700;1,800&family=Barlow:wght@400;500;600&display=swap');

  .auth-root {
    min-height: 100dvh;
    background: #03070b;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    font-family: 'Barlow', sans-serif;
    position: relative;
    overflow: hidden;
  }

  .auth-root::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse 60% 40% at 50% 0%, rgba(0,242,255,0.07) 0%, transparent 70%),
      radial-gradient(ellipse 40% 60% at 80% 100%, rgba(0,100,255,0.05) 0%, transparent 60%);
    pointer-events: none;
  }

  .auth-grid-bg {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(0,242,255,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,242,255,0.03) 1px, transparent 1px);
    background-size: 40px 40px;
    pointer-events: none;
  }

  .auth-card {
    position: relative;
    width: 100%;
    max-width: 420px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(0,242,255,0.15);
    border-radius: 20px;
    padding: 2.5rem 2rem;
    backdrop-filter: blur(20px);
    box-shadow:
      0 0 0 1px rgba(0,242,255,0.05) inset,
      0 40px 80px rgba(0,0,0,0.6);
  }

  .auth-logo-wrap {
    display: flex;
    justify-content: center;
    margin: 0 auto 1.5rem;
    position: relative;
  }

  .auth-logo-img {
    width: 100px;
    height: auto;
    object-fit: contain;
    filter: drop-shadow(0 0 16px rgba(0,242,255,0.35));
    animation: pulse-ring 3s ease infinite;
  }

  @keyframes pulse-ring {
    0%, 100% { opacity: 0.3; transform: scale(1); }
    50% { opacity: 0.8; transform: scale(1.06); }
  }

  .auth-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-style: italic;
    font-weight: 800;
    font-size: 2rem;
    color: #fff;
    text-align: center;
    line-height: 1;
    margin-bottom: 0.25rem;
    letter-spacing: 0.01em;
  }

  .auth-subtitle {
    color: rgba(0,242,255,0.7);
    font-size: 0.78rem;
    text-align: center;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin-bottom: 2rem;
  }

  .auth-label {
    display: block;
    color: rgba(0,242,255,0.8);
    font-size: 0.72rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-bottom: 0.4rem;
    font-weight: 600;
  }

  .auth-input {
    width: 100%;
    background: rgba(0,0,0,0.4);
    border: 1px solid rgba(0,242,255,0.2);
    border-radius: 10px;
    padding: 0.75rem 1rem;
    color: #fff;
    font-size: 1.1rem;
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-style: italic;
    letter-spacing: 0.05em;
    transition: border-color 0.2s, box-shadow 0.2s;
    outline: none;
    box-sizing: border-box;
    -webkit-appearance: none;
  }

  .auth-input:focus {
    border-color: rgba(0,242,255,0.6);
    box-shadow: 0 0 0 3px rgba(0,242,255,0.08), 0 0 20px rgba(0,242,255,0.1);
  }

  .auth-input::placeholder { color: rgba(255,255,255,0.2); }

  .auth-field { margin-bottom: 1.25rem; }

  .auth-hint {
    color: rgba(255,255,255,0.35);
    font-size: 0.72rem;
    margin-top: 0.3rem;
  }

  .auth-btn {
    width: 100%;
    padding: 0.9rem;
    background: linear-gradient(135deg, #00f2ff, #0088cc);
    border: none;
    border-radius: 12px;
    color: #03070b;
    font-family: 'Barlow Condensed', sans-serif;
    font-style: italic;
    font-weight: 800;
    font-size: 1.1rem;
    letter-spacing: 0.08em;
    cursor: pointer;
    transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
    margin-top: 0.5rem;
  }

  .auth-btn:hover:not(:disabled) {
    opacity: 0.92;
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(0,242,255,0.3);
  }

  .auth-btn:active:not(:disabled) { transform: translateY(0); }

  .auth-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .auth-error {
    background: rgba(255,50,50,0.1);
    border: 1px solid rgba(255,50,50,0.3);
    border-radius: 8px;
    padding: 0.75rem 1rem;
    color: #ff6b6b;
    font-size: 0.85rem;
    margin-top: 1rem;
    text-align: center;
  }

  .auth-spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(3,7,11,0.3);
    border-top-color: #03070b;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    margin-right: 8px;
    vertical-align: middle;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .auth-divider {
    border: none;
    border-top: 1px solid rgba(0,242,255,0.08);
    margin: 1.5rem 0;
  }

  .auth-footer {
    text-align: center;
    color: rgba(255,255,255,0.25);
    font-size: 0.72rem;
    letter-spacing: 0.05em;
  }
`;

/* ─── Component ──────────────────────────────────────────────── */
export default function AthleteAuth() {
  const navigate = useNavigate();
  const [bib, setBib] = useState('');
  const [cedula4, setCedula4] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Si ya tiene sesión activa, redirigir directo
  useEffect(() => {
    const session = getAthleteSession();
    if (session) navigate('/perfil', { replace: true });
  }, [navigate]);

  const handleLogin = async () => {
    setError('');
    const bibNum = parseInt(bib.trim());
    const c4 = cedula4.trim();

    if (!bibNum || bibNum < 1 || bibNum > 9999) {
      setError('Número de dorsal inválido.');
      return;
    }
    if (c4.length !== 4 || !/^\d{4}$/.test(c4)) {
      setError('Ingresa exactamente los últimos 4 dígitos de tu cédula.');
      return;
    }

    setLoading(true);
    try {
      // Buscar atleta en la tabla runners
      // Soporta campo cedula como número completo o últimos 4 dígitos
      const { data, error: dbErr } = await supabase
        .from('runners')
        .select('bib_number, nombre, apellido, categoria, cedula, telefono')
        .eq('bib_number', bibNum)
        .single();

      if (dbErr || !data) {
        setError('Dorsal no encontrado. Verifica tu número de inscripción.');
        setLoading(false);
        return;
      }

      // Verificar últimos 4 dígitos de cédula
      const cedulaStr = String(data.cedula || '').replace(/\D/g, '');
      const last4 = cedulaStr.slice(-4);

      if (last4 !== c4) {
        setError('Los últimos 4 dígitos de la cédula no coinciden.');
        setLoading(false);
        return;
      }

      // Guardar sesión en localStorage
      const session: AthleteSession = {
        bib_number: data.bib_number,
        nombre: data.nombre,
        apellido: data.apellido,
        categoria: data.categoria,
        cedula_last4: c4,
        telefono: data.telefono,
        authenticated_at: new Date().toISOString(),
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));

      navigate('/perfil', { replace: true });
    } catch (e) {
      setError('Error de conexión. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="auth-root">
        <div className="auth-grid-bg" />
        <div className="auth-card">
          <div className="auth-logo-wrap">
            <img src={logoPrincipal} alt="RayoCero" className="auth-logo-img" />
          </div>
          <p className="auth-subtitle">Portal del Atleta · We Run 10K</p>

          <div className="auth-field">
            <label className="auth-label">Número de Dorsal</label>
            <input
              className="auth-input"
              type="number"
              inputMode="numeric"
              placeholder="Ej: 042"
              value={bib}
              onChange={e => setBib(e.target.value)}
              onKeyDown={handleKey}
              maxLength={4}
            />
          </div>

          <div className="auth-field">
            <label className="auth-label">Últimos 4 dígitos de tu cédula</label>
            <input
              className="auth-input"
              type="number"
              inputMode="numeric"
              placeholder="Ej: 7834"
              value={cedula4}
              onChange={e => setCedula4(e.target.value.slice(0, 4))}
              onKeyDown={handleKey}
              maxLength={4}
            />
            <p className="auth-hint">Si tu cédula es V-12.345.678, ingresa: 5678</p>
          </div>

          <button
            className="auth-btn"
            onClick={handleLogin}
            disabled={loading || !bib || cedula4.length !== 4}
          >
            {loading ? (
              <><span className="auth-spinner" />VERIFICANDO...</>
            ) : (
              'ACCEDER A MI PERFIL →'
            )}
          </button>

          {error && <div className="auth-error">{error}</div>}

          <hr className="auth-divider" />
          <p className="auth-footer">VALKYRON GROUP · TECNOLOGÍA DE CARRERA</p>
        </div>
      </div>
    </>
  );
}
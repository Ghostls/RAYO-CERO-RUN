/**
 * RAYOCERO — ATHLETE PROFILE MODULE
 * Build: V1.0 — VALKYRON SHIELD
 * CEO: Lualdo Sciscioli | Valkyron Group
 *
 * MÓDULO: Perfil del Atleta estilo Strava
 * - Stats del evento (tiempo, pace, distancia)
 * - Historial de actividades con tarjetas expandibles
 * - Mapa de ruta via RouteMapStrava SVG (desde gps_track en runners)
 * - Kudos: recibir/dar ánimos a otros atletas
 * - Badge de categoría + ranking en su género/categoría
 *
 * REGLA DE ORO: Evolución sin Destrucción.
 * DEPENDENCIAS: supabase, react-router-dom, RouteMapStrava
 */

import { useState, useEffect, useCallback } from 'react';
import logoPrincipal from '../assets/logo.png';
import RouteMapStrava, { type GeoPoint } from './RouteMapStrava';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getAthleteSession, clearAthleteSession, type AthleteSession } from './AthleteAuth';

/* ─── Types ──────────────────────────────────────────────────── */
interface ActivityRecord {
  id: string;
  bib_number: number;
  event_name: string;
  event_date: string;
  distance_km: number;
  finish_time_seconds: number | null;
  pace_per_km: number | null;  // segundos por km
  position_overall: number | null;
  position_category: number | null;
  total_participants: number | null;
  gps_track: GeoPoint[] | null;
  kudos_count: number;
  created_at: string;
}




interface KudosEntry {
  from_bib: number;
  from_name: string;
  activity_id: string;
  created_at: string;
}

interface LeaderboardEntry {
  bib_number: number;
  nombre: string;
  apellido: string;
  finish_time_seconds: number;
  position: number;
}

/* ─── Helpers ────────────────────────────────────────────────── */
function formatTime(seconds: number): string {
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatPace(secondsPerKm: number): string {
  const m = Math.floor(secondsPerKm / 60);
  const s = Math.round(secondsPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')} /km`;
}

function getInitials(nombre: string, apellido: string): string {
  return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
}

function getCategoryColor(categoria: string): string {
  const map: Record<string, string> = {
    'ELITE': '#ff6b35',
    'MASTER A': '#00f2ff',
    'MASTER B': '#a78bfa',
    'MASTER C': '#34d399',
    'LIBRE': '#fbbf24',
  };
  const key = Object.keys(map).find(k => categoria?.toUpperCase().includes(k));
  return key ? map[key] : '#00f2ff';
}

function getPercentile(position: number, total: number): string {
  const pct = Math.round((1 - (position - 1) / total) * 100);
  if (pct >= 90) return 'TOP 10%';
  if (pct >= 75) return 'TOP 25%';
  if (pct >= 50) return 'TOP 50%';
  return `TOP ${100 - pct}%`;
}

/* ─── CSS ─────────────────────────────────────────────────────── */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,600;1,700;1,800&family=Barlow:wght@400;500;600&display=swap');

  * { box-sizing: border-box; }

  .ap-root {
    min-height: 100dvh;
    background: #03070b;
    font-family: 'Barlow', sans-serif;
    color: #fff;
    padding-bottom: 4rem;
  }

  /* ── Header ── */
  .ap-header {
    background: rgba(0,0,0,0.6);
    backdrop-filter: blur(16px);
    border-bottom: 1px solid rgba(0,242,255,0.1);
    padding: 0.75rem 1.25rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: 50;
  }

  .ap-header-logo {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .ap-header-logo-img {
    height: 32px;
    width: auto;
    object-fit: contain;
    filter: drop-shadow(0 0 6px rgba(0,242,255,0.4));
  }

  .ap-logout-btn {
    background: transparent;
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 8px;
    color: rgba(255,255,255,0.5);
    font-size: 0.75rem;
    padding: 0.4rem 0.8rem;
    cursor: pointer;
    font-family: 'Barlow', sans-serif;
    transition: all 0.2s;
  }
  .ap-logout-btn:hover { border-color: rgba(255,100,100,0.4); color: #ff6b6b; }

  /* ── Hero Profile ── */
  .ap-hero {
    padding: 2rem 1.25rem 1.5rem;
    position: relative;
    overflow: hidden;
  }

  .ap-hero::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,242,255,0.06) 0%, transparent 70%);
    pointer-events: none;
  }

  .ap-avatar-row {
    display: flex;
    align-items: flex-end;
    gap: 1rem;
    margin-bottom: 1.25rem;
  }

  .ap-avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(0,242,255,0.2), rgba(0,100,200,0.3));
    border: 2px solid rgba(0,242,255,0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Barlow Condensed', sans-serif;
    font-style: italic;
    font-weight: 800;
    font-size: 1.8rem;
    color: #00f2ff;
    flex-shrink: 0;
    position: relative;
  }

  .ap-avatar::after {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    border: 1px solid rgba(0,242,255,0.15);
  }

  .ap-name {
    font-family: 'Barlow Condensed', sans-serif;
    font-style: italic;
    font-weight: 800;
    font-size: 1.9rem;
    line-height: 1;
    color: #fff;
    margin-bottom: 0.3rem;
  }

  .ap-badge-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .ap-badge {
    padding: 0.2rem 0.6rem;
    border-radius: 4px;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    border: 1px solid;
  }

  /* ── Stats Grid ── */
  .ap-stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
    margin: 0 1.25rem 1.5rem;
  }

  .ap-stat-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(0,242,255,0.1);
    border-radius: 14px;
    padding: 1rem 0.75rem;
    text-align: center;
    backdrop-filter: blur(8px);
  }

  .ap-stat-value {
    font-family: 'Barlow Condensed', sans-serif;
    font-style: italic;
    font-weight: 800;
    font-size: 1.5rem;
    color: #00f2ff;
    line-height: 1;
    margin-bottom: 0.25rem;
  }

  .ap-stat-label {
    font-size: 0.65rem;
    color: rgba(255,255,255,0.45);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 600;
  }

  /* ── Section ── */
  .ap-section {
    padding: 0 1.25rem;
    margin-bottom: 1.5rem;
  }

  .ap-section-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-style: italic;
    font-weight: 700;
    font-size: 1rem;
    color: rgba(0,242,255,0.8);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-bottom: 0.75rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .ap-section-title::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(0,242,255,0.1);
  }

  /* ── Activity Card ── */
  .ap-activity-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    overflow: hidden;
    margin-bottom: 0.75rem;
    transition: border-color 0.2s;
  }

  .ap-activity-card:hover { border-color: rgba(0,242,255,0.2); }

  .ap-activity-header {
    padding: 1rem 1.25rem;
    cursor: pointer;
    user-select: none;
  }

  .ap-activity-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.75rem;
  }

  .ap-activity-event {
    font-family: 'Barlow Condensed', sans-serif;
    font-style: italic;
    font-weight: 700;
    font-size: 1.1rem;
    color: #fff;
    margin-bottom: 0.15rem;
  }

  .ap-activity-date {
    font-size: 0.72rem;
    color: rgba(255,255,255,0.4);
  }

  .ap-activity-chevron {
    color: rgba(255,255,255,0.3);
    font-size: 0.75rem;
    transition: transform 0.2s;
    margin-top: 2px;
  }

  .ap-activity-chevron.open { transform: rotate(180deg); }

  .ap-activity-metrics {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
  }

  .ap-activity-metric {
    text-align: left;
  }

  .ap-activity-metric-val {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 1.1rem;
    color: #fff;
    line-height: 1;
  }

  .ap-activity-metric-lbl {
    font-size: 0.65rem;
    color: rgba(255,255,255,0.35);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  /* ── Expand body ── */
  .ap-activity-body {
    border-top: 1px solid rgba(255,255,255,0.06);
    overflow: hidden;
    transition: max-height 0.4s ease;
  }

  .ap-activity-body.closed { max-height: 0; }
  .ap-activity-body.open { max-height: 600px; }

  .ap-activity-detail-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem 1rem;
  }

  .ap-detail-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0.75rem;
    background: rgba(255,255,255,0.03);
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.05);
  }

  .ap-detail-label {
    font-size: 0.7rem;
    color: rgba(255,255,255,0.4);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .ap-detail-value {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 0.95rem;
    color: #00f2ff;
  }

  /* ── Kudos ── */
  .ap-kudos-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1.25rem;
    border-top: 1px solid rgba(255,255,255,0.05);
  }

  .ap-kudos-btn {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    background: transparent;
    border: 1px solid rgba(0,242,255,0.25);
    border-radius: 20px;
    padding: 0.35rem 0.9rem;
    color: rgba(0,242,255,0.8);
    font-size: 0.8rem;
    font-family: 'Barlow', sans-serif;
    cursor: pointer;
    transition: all 0.2s;
  }

  .ap-kudos-btn.given {
    background: rgba(0,242,255,0.1);
    border-color: rgba(0,242,255,0.5);
    color: #00f2ff;
  }

  .ap-kudos-btn:hover:not(.given) {
    background: rgba(0,242,255,0.08);
  }

  .ap-kudos-count {
    font-size: 0.8rem;
    color: rgba(255,255,255,0.4);
  }

  /* ── Leaderboard ── */
  .ap-leaderboard {
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(0,242,255,0.08);
    border-radius: 16px;
    overflow: hidden;
  }

  .ap-lb-row {
    display: flex;
    align-items: center;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    transition: background 0.15s;
  }

  .ap-lb-row:last-child { border-bottom: none; }
  .ap-lb-row:hover { background: rgba(255,255,255,0.03); }

  .ap-lb-row.highlight {
    background: rgba(0,242,255,0.06);
    border-left: 3px solid #00f2ff;
  }

  .ap-lb-pos {
    font-family: 'Barlow Condensed', sans-serif;
    font-style: italic;
    font-weight: 800;
    font-size: 1.1rem;
    color: rgba(255,255,255,0.5);
    width: 2.5rem;
    flex-shrink: 0;
  }

  .ap-lb-pos.gold { color: #fbbf24; }
  .ap-lb-pos.silver { color: #9ca3af; }
  .ap-lb-pos.bronze { color: #d97706; }

  .ap-lb-name {
    flex: 1;
    font-size: 0.9rem;
    color: #fff;
    font-weight: 500;
  }

  .ap-lb-time {
    font-family: 'Barlow Condensed', sans-serif;
    font-weight: 700;
    font-size: 1rem;
    color: #00f2ff;
  }

  /* ── Loading ── */
  .ap-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    gap: 1rem;
  }

  .ap-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(0,242,255,0.1);
    border-top-color: #00f2ff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .ap-empty {
    text-align: center;
    padding: 2rem;
    color: rgba(255,255,255,0.3);
    font-size: 0.9rem;
  }

  /* ── Speed bar ── */
  .ap-speed-bar {
    height: 3px;
    background: linear-gradient(90deg, #0088ff, #00f2ff, #ffeb3b, #ff5722);
    border-radius: 2px;
    margin-top: 4px;
  }
`;


/* ─── Activity Card Component ───────────────────────────────── */
interface ActivityCardProps {
  activity: ActivityRecord;
  currentBib: number;
}

function ActivityCard({ activity, currentBib }: ActivityCardProps) {
  const [open, setOpen] = useState(false);
  const [kudosGiven, setKudosGiven] = useState(false);
  const [kudosCount, setKudosCount] = useState(activity.kudos_count || 0);

  const eventDate = new Date(activity.event_date).toLocaleDateString('es-VE', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const handleKudos = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (kudosGiven) return;
    setKudosGiven(true);
    setKudosCount(c => c + 1);

    await supabase.from('athlete_kudos').insert({
      activity_id: activity.id,
      from_bib: currentBib,
      to_bib: activity.bib_number,
    });

    await supabase
      .from('athlete_activities')
      .update({ kudos_count: kudosCount + 1 })
      .eq('id', activity.id);
  };

  return (
    <div className="ap-activity-card">
      <div className="ap-activity-header" onClick={() => setOpen(o => !o)}>
        <div className="ap-activity-top">
          <div>
            <div className="ap-activity-event">{activity.event_name}</div>
            <div className="ap-activity-date">{eventDate}</div>
          </div>
          <span className={`ap-activity-chevron ${open ? 'open' : ''}`}>▼</span>
        </div>
        <div className="ap-activity-metrics">
          <div className="ap-activity-metric">
            <div className="ap-activity-metric-val">{activity.distance_km} km</div>
            <div className="ap-activity-metric-lbl">Distancia</div>
          </div>
          <div className="ap-activity-metric">
            <div className="ap-activity-metric-val">
              {activity.finish_time_seconds ? formatTime(activity.finish_time_seconds) : '--:--'}
            </div>
            <div className="ap-activity-metric-lbl">Tiempo</div>
          </div>
          <div className="ap-activity-metric">
            <div className="ap-activity-metric-val">
              {activity.pace_per_km ? formatPace(activity.pace_per_km) : '--:--'}
            </div>
            <div className="ap-activity-metric-lbl">Ritmo</div>
          </div>
        </div>
      </div>

      <div className={`ap-activity-body ${open ? 'open' : 'closed'}`}>
        {open && (
          <>
            <RouteMapStrava points={activity.gps_track || []} />
            <div className="ap-activity-detail-row">
              {activity.position_overall && activity.total_participants && (
                <>
                  <div className="ap-detail-item">
                    <span className="ap-detail-label">Posición General</span>
                    <span className="ap-detail-value">#{activity.position_overall}</span>
                  </div>
                  <div className="ap-detail-item">
                    <span className="ap-detail-label">Percentil</span>
                    <span className="ap-detail-value">
                      {getPercentile(activity.position_overall, activity.total_participants)}
                    </span>
                  </div>
                </>
              )}
              {activity.position_category && (
                <div className="ap-detail-item">
                  <span className="ap-detail-label">Posición Categoría</span>
                  <span className="ap-detail-value">#{activity.position_category}</span>
                </div>
              )}
            </div>

            <div className="ap-kudos-row">
              <button
                className={`ap-kudos-btn ${kudosGiven ? 'given' : ''}`}
                onClick={handleKudos}
              >
                👊 {kudosGiven ? '¡Kudos Dado!' : 'Dar Kudos'}
              </button>
              <span className="ap-kudos-count">
                {kudosCount > 0 ? `${kudosCount} kudos` : ''}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────── */
export default function AthleteProfile() {
  const navigate = useNavigate();
  const [session, setSession] = useState<AthleteSession | null>(null);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Verificar sesión al montar
  useEffect(() => {
    const s = getAthleteSession();
    if (!s) {
      navigate('/acceso', { replace: true });
      return;
    }
    setSession(s);
    loadData(s.bib_number, s.categoria);
  }, [navigate]);

  const loadData = useCallback(async (bib: number, categoria: string) => {
    setLoading(true);
    try {
      // ── Intentar cargar desde athlete_activities primero
      const { data: acts } = await supabase
        .from('athlete_activities')
        .select('*')
        .eq('bib_number', bib)
        .order('event_date', { ascending: false });

      if (acts && acts.length > 0) {
        setActivities(acts);
      } else {
        // ── FALLBACK: leer directamente de runners (datos reales post-evento)
        const { data: runner } = await supabase
          .from('runners')
          .select('bib_number, finish_time_seconds, gps_track, categoria')
          .eq('bib_number', bib)
          .single();

        if (runner && runner.finish_time_seconds) {
          const pace = runner.finish_time_seconds > 0
            ? Math.round(runner.finish_time_seconds / 10.0)
            : null;
          setActivities([{
            id: `runner-${runner.bib_number}`,
            bib_number: runner.bib_number,
            event_name: 'WE RUN 10K NIGHT FEST 2026',
            event_date: '2026-06-06',
            distance_km: 10.0,
            finish_time_seconds: runner.finish_time_seconds,
            pace_per_km: pace,
            position_overall: null,
            position_category: null,
            total_participants: null,
            gps_track: runner.gps_track ?? null,
            kudos_count: 0,
            created_at: new Date().toISOString(),
          }]);
        }
      }

      // ── Leaderboard: intentar athlete_activities, fallback a runners
      const { data: lb } = await supabase
        .from('athlete_activities')
        .select('bib_number, finish_time_seconds, runners(nombre, apellido)')
        .ilike('categoria', `%${categoria.split(' ')[0]}%`)
        .not('finish_time_seconds', 'is', null)
        .order('finish_time_seconds', { ascending: true })
        .limit(10);

      if (lb && lb.length > 0) {
        const entries: LeaderboardEntry[] = lb.map((row: unknown, idx: number) => {
          const r = row as {
            bib_number: number;
            finish_time_seconds: number;
            runners: { nombre: string; apellido: string } | null;
          };
          return {
            bib_number: r.bib_number,
            nombre: r.runners?.nombre || '---',
            apellido: r.runners?.apellido || '',
            finish_time_seconds: r.finish_time_seconds,
            position: idx + 1,
          };
        });
        setLeaderboard(entries);
      } else {
        // ── FALLBACK leaderboard: leer directamente de runners
        const { data: runnersLb } = await supabase
          .from('runners')
          .select('bib_number, nombre, apellido, finish_time_seconds')
          .ilike('categoria', `%${categoria.split(' ')[0]}%`)
          .not('finish_time_seconds', 'is', null)
          .order('finish_time_seconds', { ascending: true })
          .limit(10);

        if (runnersLb && runnersLb.length > 0) {
          setLeaderboard(runnersLb.map((r: any, idx: number) => ({
            bib_number: r.bib_number,
            nombre: r.nombre,
            apellido: r.apellido,
            finish_time_seconds: r.finish_time_seconds,
            position: idx + 1,
          })));
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogout = () => {
    clearAthleteSession();
    navigate('/acceso', { replace: true });
  };

  if (!session) return null;

  const catColor = getCategoryColor(session.categoria);

  // Stats agregados de todas las actividades
  const totalKm = activities.reduce((s, a) => s + a.distance_km, 0);
  const completedRaces = activities.filter(a => a.finish_time_seconds).length;
  const bestTime = activities
    .filter(a => a.finish_time_seconds)
    .sort((a, b) => (a.finish_time_seconds! - b.finish_time_seconds!));
  const bestPB = bestTime[0]?.finish_time_seconds;

  return (
    <>
      <style>{CSS}</style>
      <div className="ap-root">
        {/* Header */}
        <div className="ap-header">
          <div className="ap-header-logo">
            <img src={logoPrincipal} alt="RayoCero" className="ap-header-logo-img" />
          </div>
          <button className="ap-logout-btn" onClick={handleLogout}>Salir</button>
        </div>

        {loading ? (
          <div className="ap-loading">
            <div className="ap-spinner" />
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
              Cargando tu perfil...
            </span>
          </div>
        ) : (
          <>
            {/* Hero */}
            <div className="ap-hero">
              <div className="ap-avatar-row">
                <div className="ap-avatar">
                  {getInitials(session.nombre, session.apellido)}
                </div>
                <div>
                  <div className="ap-name">
                    {session.nombre.toUpperCase()} {session.apellido.toUpperCase()}
                  </div>
                  <div className="ap-badge-row">
                    <span
                      className="ap-badge"
                      style={{ color: catColor, borderColor: catColor, background: `${catColor}15` }}
                    >
                      {session.categoria}
                    </span>
                    <span className="ap-badge" style={{
                      color: 'rgba(255,255,255,0.5)',
                      borderColor: 'rgba(255,255,255,0.15)',
                      background: 'transparent',
                    }}>
                      #{String(session.bib_number).padStart(3, '0')}
                    </span>
                    {completedRaces > 0 && (
                      <span className="ap-badge" style={{
                        color: '#fbbf24',
                        borderColor: '#fbbf2440',
                        background: '#fbbf2410',
                      }}>
                        {completedRaces} CARRERA{completedRaces > 1 ? 'S' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="ap-stats-grid">
              <div className="ap-stat-card">
                <div className="ap-stat-value">{totalKm.toFixed(1)}</div>
                <div className="ap-stat-label">km totales</div>
              </div>
              <div className="ap-stat-card">
                <div className="ap-stat-value">
                  {bestPB ? formatTime(bestPB) : '--'}
                </div>
                <div className="ap-stat-label">mejor tiempo</div>
              </div>
              <div className="ap-stat-card">
                <div className="ap-stat-value">{completedRaces}</div>
                <div className="ap-stat-label">finishes</div>
              </div>
            </div>

            {/* Actividades */}
            <div className="ap-section">
              <div className="ap-section-title">MIS ACTIVIDADES</div>
              {activities.length === 0 ? (
                <div className="ap-empty">
                  Aún no tienes actividades registradas.<br />
                  <span style={{ color: 'rgba(0,242,255,0.4)' }}>
                    Tu próxima carrera aparecerá aquí automáticamente.
                  </span>
                </div>
              ) : (
                activities.map(act => (
                  <ActivityCard
                    key={act.id}
                    activity={act}
                    currentBib={session.bib_number}
                  />
                ))
              )}
            </div>

            {/* Leaderboard de categoría */}
            {leaderboard.length > 0 && (
              <div className="ap-section">
                <div className="ap-section-title">RANKING — {session.categoria}</div>
                <div className="ap-leaderboard">
                  {leaderboard.map(entry => (
                    <div
                      key={entry.bib_number}
                      className={`ap-lb-row ${entry.bib_number === session.bib_number ? 'highlight' : ''}`}
                    >
                      <span className={`ap-lb-pos ${entry.position === 1 ? 'gold' : entry.position === 2 ? 'silver' : entry.position === 3 ? 'bronze' : ''}`}>
                        {entry.position === 1 ? '🥇' : entry.position === 2 ? '🥈' : entry.position === 3 ? '🥉' : `#${entry.position}`}
                      </span>
                      <span className="ap-lb-name">
                        {entry.nombre} {entry.apellido}
                        {entry.bib_number === session.bib_number && (
                          <span style={{ color: '#00f2ff', fontSize: '0.7rem', marginLeft: '0.4rem' }}>TÚ</span>
                        )}
                      </span>
                      <span className="ap-lb-time">{formatTime(entry.finish_time_seconds)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
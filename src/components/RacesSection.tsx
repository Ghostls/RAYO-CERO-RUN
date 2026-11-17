/**
 * RAYOCERO — RACE CALENDAR V11.2
 * WE CAN MOVE usa src/assets/portada-caninata.png.
 * Diseño responsive y cierre exclusivo de su tarjeta.
 * Conserva registro LED, detalles, resultados y estados por carrera.
 */

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  MapPin,
  Calendar,
  Clock,
  Info,
  Zap,
  Loader2,
  Trophy,
  CheckCircle2,
  Dog,
  XCircle,
  ArrowUpRight,
  ArrowRight,
  Footprints,
  AlertCircle,
} from "lucide-react";
import { Link } from "react-router-dom";

import { supabase } from "@/lib/supabase";
import { INSCRIPCIONES_ABIERTAS } from "@/lib/registrationConfig";

import portada499Agosto from "@/assets/PORTADA_499.png";
import flyerOctubreInscripciones from "@/assets/flyer-coro-inscripciones.png";
import flyerCaninataBanner from "@/assets/flyer-caninata.png";
import ledRunHero from "@/assets/led-run-hero.png";

// Portada real de WE CAN MOVE.
import portadaWeCanMove from "@/assets/portada-caninata.png";

const DEFAULT_IMAGE = flyerCaninataBanner;

interface RaceRow {
  id: string;
  name: string;
  date: string | null;
  time: string | null;
  location: string | null;
  status: string | null;
  image_url: string | null;
  inscripciones_abiertas: boolean | null;
}

interface EventCard {
  key: string;
  race: RaceRow;
  wcm: boolean;
}

type StatusKey =
  | "completada"
  | "inscripciones_abiertas"
  | "inscripciones_cerradas"
  | "proximamente";

interface StatusConfig {
  key: StatusKey;
  label: string;
  isCompleted: boolean;
  isClosed: boolean;
  isComingSoon: boolean;
}

const WE_CAN_MOVE = {
  nombre: "WE CAN MOVE",
  fecha: "2026-11-21",
  hora: "5:00 PM",
  lugar: "Ciudad Deportiva Universitaria, Coro, Falcón",
  invitado: "TSUNAMI",
} as const;

const isWcmName = (name = "") =>
  /we\s*can\s*move/i.test(name);

const supportsWcm = (name = "") =>
  /we\s*run\s*rayocero/i.test(name) && /\bcoro\b/i.test(name);

const isCaninataRace = (name = "") =>
  name.toLowerCase().includes("caninata");

const isLedRunRace = (name = "") => {
  const n = name.toLowerCase();

  return (
    /\bled\b/i.test(name) ||
    (n.includes("we run") && n.includes("coro"))
  );
};

function getRaceImage(
  name = "",
  fallbackUrl?: string,
): string {
  const n = name.toLowerCase();

  if (isWcmName(name)) return portadaWeCanMove;
  if (isCaninataRace(name)) return flyerCaninataBanner;
  if (isLedRunRace(name)) return ledRunHero;

  if (n.includes("499") || n.includes("agosto")) {
    return portada499Agosto;
  }

  if (
    n.includes("coro") ||
    n.includes("falcón") ||
    n.includes("falcon") ||
    n.includes("octubre")
  ) {
    return flyerOctubreInscripciones;
  }

  return fallbackUrl || DEFAULT_IMAGE;
}

function getStatusConfig(
  rawStatus: string,
  inscripcionesAbiertas: boolean,
  isCaninata = false,
): StatusConfig {
  const status = rawStatus.toLowerCase().trim();

  // Completada mantiene la prioridad.
  if (status === "completada" || status === "completed") {
    return {
      key: "completada",
      label: "Completada",
      isCompleted: true,
      isClosed: false,
      isComingSoon: false,
    };
  }

  // Caninata: el flag explícito decide.
  if (isCaninata) {
    return inscripcionesAbiertas
      ? {
          key: "inscripciones_abiertas",
          label: "Inscripciones abiertas",
          isCompleted: false,
          isClosed: false,
          isComingSoon: false,
        }
      : {
          key: "inscripciones_cerradas",
          label: "Inscripciones cerradas",
          isCompleted: false,
          isClosed: true,
          isComingSoon: false,
        };
  }

  // Un true explícito prevalece sobre "próximamente".
  if (
    !inscripcionesAbiertas &&
    (status === "próximamente" || status === "proximamente")
  ) {
    return {
      key: "proximamente",
      label: "Próximamente",
      isCompleted: false,
      isClosed: false,
      isComingSoon: true,
    };
  }

  if (!inscripcionesAbiertas) {
    return {
      key: "inscripciones_cerradas",
      label: "Inscripciones cerradas",
      isCompleted: false,
      isClosed: true,
      isComingSoon: false,
    };
  }

  return {
    key: "inscripciones_abiertas",
    label: "Inscripciones abiertas",
    isCompleted: false,
    isClosed: false,
    isComingSoon: false,
  };
}

function dateLabel(value: string | null): string {
  const day = value?.slice(0, 10);

  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return "Fecha por confirmar";
  }

  const date = new Date(`${day}T12:00:00-04:00`);

  if (Number.isNaN(date.getTime())) {
    return "Fecha por confirmar";
  }

  return date.toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Caracas",
  });
}

function Countdown({ date }: { date: string | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 60_000);

    return () => clearInterval(interval);
  }, []);

  const target = date
    ? new Date(`${date.slice(0, 10)}T00:00:00-04:00`).getTime()
    : NaN;

  const diff = target - now;

  if (!Number.isFinite(diff) || diff <= 0) {
    return null;
  }

  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);

  return (
    <span className="rc-countdown">
      <Zap size={13} aria-hidden="true" />
      Faltan {days}d {hours}h
    </span>
  );
}

const styles = `
.rc-calendar {
  width: 100%;
  max-width: 1280px;
  box-sizing: border-box;
  margin: auto;
  padding: 112px 16px 72px;
  color: #f5f7f8;
  scroll-margin-top: 96px;
  font-family: inherit;
}

.rc-calendar *,
.rc-calendar *::before,
.rc-calendar *::after {
  box-sizing: border-box;
}

.rc-calendar button,
.rc-calendar a {
  -webkit-tap-highlight-color: transparent;
}

.rc-calendar a {
  text-decoration: none;
}

.rc-calendar button {
  font-family: inherit;
}

.rc-calendar svg {
  flex-shrink: 0;
}

.rc-header {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-bottom: 30px;
  padding-bottom: 28px;
  border-bottom: 1px solid #ffffff18;
}

.rc-eyebrow {
  display: flex;
  align-items: center;
  gap: 9px;
  margin: 0 0 16px;
  color: #aab4bd;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .18em;
  text-transform: uppercase;
}

.rc-eyebrow::before {
  content: "";
  width: 22px;
  height: 3px;
  flex-shrink: 0;
  border-radius: 9px;
  background: #fcd34d;
}

.rc-header h2 {
  margin: 0;
  font-size: clamp(36px, 7vw, 72px);
  font-weight: 950;
  font-style: italic;
  line-height: .98;
  letter-spacing: -.055em;
  text-transform: uppercase;
  overflow-wrap: anywhere;
}

.rc-header h2 span {
  color: #fcd34d;
}

.rc-intro {
  max-width: 440px;
  margin: 16px 0 0;
  color: #aab4bd;
  font-size: 14px;
  line-height: 1.65;
}

.rc-index {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #b9c3cb;
  font-size: 11px;
  flex-shrink: 0;
}

.rc-index b {
  color: #fff;
  font-size: 32px;
  line-height: 1;
  letter-spacing: -.07em;
}

.rc-index span {
  max-width: 130px;
  line-height: 1.5;
}

.rc-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: stretch;
  gap: 24px;
}

.rc-card {
  --rc-accent: #fcd34d;
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  border: 1px solid #ffffff1c;
  border-radius: 26px;
  background: linear-gradient(145deg, #111a22, #080d12 75%);
  box-shadow: 0 12px 30px #0003;
  transition: border-color .25s, box-shadow .25s;
}

.rc-card:hover {
  border-color: #ffffff40;
  box-shadow: 0 20px 48px #0006;
}

.rc-media {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  flex-shrink: 0;
  background: #121b24;
}

.rc-poster {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  transition: transform .7s ease;
}

.rc-card:hover .rc-poster {
  transform: scale(1.035);
}

.rc-card[data-state="completada"] .rc-poster {
  filter: saturate(.65);
  opacity: .65;
}

.rc-shade {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
    180deg,
    #03070b70,
    transparent 40%,
    #080d12e6
  );
}

.rc-badges {
  position: absolute;
  inset: 14px 14px auto;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 8px;
}

.rc-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  min-height: 30px;
  padding: 7px 10px;
  border: 1px solid #ffffff25;
  border-radius: 999px;
  background: #080d12e8;
  color: #f0f3f6;
  font-size: 9px;
  font-weight: 850;
  line-height: 1.3;
  letter-spacing: .06em;
  text-transform: uppercase;
}

.rc-badge[data-state="inscripciones_abiertas"] {
  color: #8ef2d5;
  border-color: #70e5be55;
  background: #09271fe8;
}

.rc-badge[data-state="inscripciones_cerradas"] {
  color: #ffb6ad;
  border-color: #f8717155;
  background: #301713ef;
}

.rc-badge[data-state="completada"] {
  color: #fcd97a;
  border-color: #fcd34d44;
  background: #2e2512ed;
}

.rc-region {
  color: #f8df93;
}

.rc-live {
  width: 6px;
  height: 6px;
  flex-shrink: 0;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 9px #8ef2d577;
}

.rc-media-bottom {
  position: absolute;
  right: 18px;
  bottom: 16px;
  left: 18px;
  z-index: 2;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.rc-discipline {
  color: #f5f7f8;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.rc-countdown {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 100%;
  padding: 7px 9px;
  border: 1px solid #fcd34d30;
  border-radius: 9px;
  background: #0a1019d9;
  color: #fcd97a;
  font-size: 10px;
  font-weight: 750;
  line-height: 1.4;
}

.rc-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  padding: 23px 20px 20px;
}

.rc-kicker {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0 0 10px;
  color: var(--rc-accent);
  font-size: 9px;
  font-weight: 850;
  letter-spacing: .16em;
  text-transform: uppercase;
}

.rc-title {
  margin: 0;
  font-size: clamp(25px, 4.8vw, 35px);
  font-weight: 950;
  font-style: italic;
  line-height: 1.04;
  letter-spacing: -.045em;
  text-transform: uppercase;
  overflow-wrap: anywhere;
}

.rc-description {
  margin: 12px 0 0;
  color: #b0bbc5;
  font-size: 12px;
  line-height: 1.7;
}

.rc-meta {
  display: grid;
  gap: 13px;
  margin: 0;
  padding: 20px 0;
  list-style: none;
}

.rc-meta li {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  min-width: 0;
}

.rc-meta svg {
  width: 16px;
  height: 16px;
  margin-top: 2px;
  color: var(--rc-accent);
}

.rc-meta span {
  min-width: 0;
  color: #d0d7df;
  font-size: 12px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.rc-meta small {
  display: block;
  margin-bottom: 2px;
  color: #8293a1;
  font-size: 9px;
  letter-spacing: .1em;
  text-transform: uppercase;
}

.rc-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
  margin-top: auto;
  padding-top: 18px;
  border-top: 1px solid #ffffff14;
}

.rc-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
  height: 56px;
  min-height: 56px;
  padding: 10px 12px;
  border: 1px solid #ffffff25;
  border-radius: 13px;
  background: #ffffff05;
  color: #e9eef2;
  font-size: 10px;
  font-weight: 850;
  line-height: 1.35;
  letter-spacing: .04em;
  text-align: center;
  text-transform: uppercase;
  cursor: pointer;
  transition: background .2s, filter .2s;
}

.rc-btn span {
  min-width: 0;
  overflow-wrap: anywhere;
}

.rc-btn:hover {
  background: #ffffff0d;
}

.rc-btn:focus-visible,
.rc-details summary:focus-visible {
  outline: 2px solid #fcd34d;
  outline-offset: 3px;
}

.rc-btn-primary {
  border-color: transparent;
  background: var(--rc-accent);
  color: #080d12;
  box-shadow: 0 3px 18px #fcd34d12;
}

.rc-btn-primary:hover {
  background: var(--rc-accent);
  filter: brightness(1.08);
}

.rc-btn:disabled {
  border-color: #f8717133;
  background: #f871710a;
  color: #ffa99e;
  cursor: not-allowed;
}

.rc-btn-soon:disabled {
  border-color: #ffffff18;
  background: #ffffff03;
  color: #a4afba;
}

.rc-result {
  border-color: #fcd34d40;
  background: #fcd34d09;
  color: #fcd97a;
}

.rc-note {
  margin: 0 0 18px;
  padding: 11px 12px;
  border: 1px solid #ffffff14;
  border-radius: 11px;
  color: #b4bfc9;
  font-size: 11px;
  line-height: 1.6;
}

.rc-details {
  min-width: 0;
}

.rc-details summary {
  list-style: none;
}

.rc-details summary::-webkit-details-marker {
  display: none;
}

.rc-details[open] {
  grid-column: 1 / -1;
}

.rc-details-content {
  padding: 14px 4px 2px;
  color: #ccd4dc;
  font-size: 12px;
  line-height: 1.7;
}

.rc-details-content p {
  margin: 0 0 8px;
}

.rc-empty {
  padding: 36px 20px;
  border: 1px solid #ffffff20;
  border-radius: 22px;
  color: #b9c3cb;
  font-size: 14px;
  line-height: 1.7;
  text-align: center;
}

.rc-empty button {
  max-width: 220px;
  margin: 16px auto 0;
}

.rc-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 64px 16px;
  color: #d9e2eb;
  font-size: 13px;
}

.rc-spinner {
  animation: rc-spin 1s linear infinite;
}

@keyframes rc-spin {
  to { transform: rotate(360deg); }
}

@media (min-width: 380px) {
  .rc-actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 640px) {
  .rc-calendar {
    padding-right: 24px;
    padding-left: 24px;
  }

  .rc-header {
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
  }

  .rc-body {
    padding: 26px;
  }

  .rc-badges {
    inset: 18px 18px auto;
  }

  .rc-media-bottom {
    right: 24px;
    bottom: 20px;
    left: 24px;
  }
}

@media (min-width: 768px) {
  .rc-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 26px;
  }

  .rc-title {
    font-size: clamp(28px, 3vw, 38px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .rc-card,
  .rc-poster,
  .rc-btn {
    transition: none;
  }

  .rc-card:hover .rc-poster {
    transform: none;
  }

  .rc-spinner {
    animation: none;
  }
}
`;

function RaceCard({
  card,
  index,
}: {
  card: EventCard;
  index: number;
}) {
  const { race, wcm } = card;
  const reduceMotion = useReducedMotion();

  const caninata = isCaninataRace(race.name);
  const led = !wcm && isLedRunRace(race.name);

  const open = wcm
    ? false
    : caninata
      ? race.inscripciones_abiertas === true
      : (race.inscripciones_abiertas ?? INSCRIPCIONES_ABIERTAS);

  // WE CAN MOVE siempre aparece cerrado en este calendario.
  const state: StatusConfig = wcm
    ? {
        key: "inscripciones_cerradas",
        label: "Inscripciones cerradas",
        isCompleted: false,
        isClosed: true,
        isComingSoon: false,
      }
    : getStatusConfig(race.status ?? "", open, caninata);

  const accent = wcm
    ? "#c5f48c"
    : caninata || led
      ? "#fcd34d"
      : "#67e8f9";

  const name = wcm ? WE_CAN_MOVE.nombre : race.name;
  const date = wcm ? WE_CAN_MOVE.fecha : race.date;

  const location = wcm
    ? WE_CAN_MOVE.lugar
    : race.location || "Lugar por confirmar";

  const region =
    wcm || led
      ? "Falcón"
      : caninata
        ? "Lara"
        : /lara|barquisimeto/i.test(location)
          ? "Lara"
          : /coro|falc[oó]n/i.test(location)
            ? "Falcón"
            : "Venezuela";

  const label = wcm
    ? "Caminata con mascotas"
    : caninata
      ? "Carrera + caninata"
      : led
        ? "Carrera nocturna"
        : "Running · RayoCero";

  const registerUrl =
    `/registro?race=${encodeURIComponent(race.id)}` +
    (caninata ? "&tipo=caninata" : "");

  // Selección explícita de la portada solicitada.
  const image = wcm
    ? portadaWeCanMove
    : getRaceImage(race.name, race.image_url ?? undefined);

  return (
    <motion.article
      className="rc-card"
      data-state={state.key}
      style={{ "--rc-accent": accent } as CSSProperties}
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{
        duration: 0.35,
        delay: Math.min(index * 0.04, 0.16),
      }}
      aria-labelledby={`rc-title-${card.key}`}
    >
      <div className="rc-media">
        <img
          className="rc-poster"
          src={image}
          alt={`Afiche de ${name}`}
          loading="lazy"
          decoding="async"
          onError={(event) => {
            const img = event.currentTarget;

            if (!img.dataset.fallback) {
              img.dataset.fallback = "1";
              img.src = DEFAULT_IMAGE;
            }
          }}
        />

        <div className="rc-shade" aria-hidden="true" />

        <div className="rc-badges">
          <span className="rc-badge" data-state={state.key}>
            {state.isCompleted ? (
              <CheckCircle2 size={12} aria-hidden="true" />
            ) : state.isClosed ? (
              <XCircle size={12} aria-hidden="true" />
            ) : state.isComingSoon ? (
              <Clock size={12} aria-hidden="true" />
            ) : (
              <span className="rc-live" aria-hidden="true" />
            )}

            {state.label}
          </span>

          <span className="rc-badge rc-region">
            <MapPin size={11} aria-hidden="true" />
            {region}
          </span>
        </div>

        <div className="rc-media-bottom">
          <span className="rc-discipline">
            {wcm
              ? "3 KM · MASCOTAS"
              : caninata || led
                ? "10K / 5K"
                : "RAYOCERO RUNNING"}
          </span>

          {!state.isCompleted &&
            !state.isClosed &&
            !state.isComingSoon && <Countdown date={date} />}

          {wcm && (
            <span className="rc-countdown">
              <Footprints size={13} aria-hidden="true" />
              Participación gratuita
            </span>
          )}
        </div>
      </div>

      <div className="rc-body">
        <p className="rc-kicker">
          {wcm ? (
            <Dog size={12} aria-hidden="true" />
          ) : (
            <Zap size={12} aria-hidden="true" />
          )}

          {label}
        </p>

        <h3 className="rc-title" id={`rc-title-${card.key}`}>
          {name}
        </h3>

        {wcm && (
          <p className="rc-description">
            3 kilómetros para compartir con tu mascota. Actividad
            gratuita junto a {WE_CAN_MOVE.invitado}.
          </p>
        )}

        <ul className="rc-meta">
          <li>
            <Calendar aria-hidden="true" />
            <span>
              <small>Fecha del evento</small>
              {dateLabel(date)}
            </span>
          </li>

          <li>
            <Clock aria-hidden="true" />
            <span>
              <small>Hora de encuentro</small>
              {wcm
                ? WE_CAN_MOVE.hora
                : race.time || "Por confirmar"}
            </span>
          </li>

          <li>
            <MapPin aria-hidden="true" />
            <span>
              <small>Punto de encuentro</small>
              {location}
            </span>
          </li>
        </ul>

        {wcm && (
          <p className="rc-note">
            Las inscripciones están cerradas. La participación es
            gratuita y no incluye kit ni franela.
          </p>
        )}

        <div className="rc-actions">
          {wcm ? (
            <>
              <details className="rc-details">
                <summary className="rc-btn">
                  <Info size={14} aria-hidden="true" />
                  <span>Ver información</span>
                </summary>

                <div className="rc-details-content">
                  <p>
                    <strong>WE CAN MOVE · 3K con mascotas</strong>
                  </p>

                  <p>
                    {dateLabel(WE_CAN_MOVE.fecha)} ·{" "}
                    {WE_CAN_MOVE.hora} · {WE_CAN_MOVE.lugar}.
                  </p>

                  <p>
                    Invitado: {WE_CAN_MOVE.invitado}. Lleva a tu
                    mascota bajo control y con los medios de
                    sujeción adecuados. Sigue las indicaciones de
                    la organización.
                  </p>
                </div>
              </details>

              <button type="button" className="rc-btn" disabled>
                <XCircle size={14} aria-hidden="true" />
                <span>Inscripciones cerradas</span>
              </button>
            </>
          ) : state.isComingSoon ? (
            <>
              <button
                type="button"
                className="rc-btn rc-btn-soon"
                disabled
              >
                <Info size={14} aria-hidden="true" />
                <span>Detalles</span>
              </button>

              <button
                type="button"
                className="rc-btn rc-btn-soon"
                disabled
              >
                <Clock size={14} aria-hidden="true" />
                <span>Próximamente</span>
              </button>
            </>
          ) : (
            <>
              <Link
                to={`/carrera/${race.id}`}
                className="rc-btn"
              >
                <ArrowUpRight size={15} aria-hidden="true" />
                <span>
                  {state.isClosed ? "Ver ruta" : "Detalles"}
                </span>
              </Link>

              {state.isCompleted ? (
                <Link
                  to="/resultados"
                  className="rc-btn rc-result"
                >
                  <Trophy size={14} aria-hidden="true" />
                  <span>Ver resultados</span>
                </Link>
              ) : state.isClosed ? (
                <button type="button" className="rc-btn" disabled>
                  <XCircle size={14} aria-hidden="true" />
                  <span>Inscripciones cerradas</span>
                </button>
              ) : (
                <Link
                  to={registerUrl}
                  className="rc-btn rc-btn-primary"
                >
                  <span>Inscribirme</span>
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </motion.article>
  );
}

export default function RacesSection() {
  const [races, setRaces] = useState<RaceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    setLoading(true);
    setError(false);

    const fetchRaces = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from("races")
          .select("*")
          .eq("is_active", true)
          .order("date", { ascending: true })
          .abortSignal(controller.signal);

        if (cancelled) return;
        if (fetchError) throw fetchError;

        const completed = (race: RaceRow) =>
          /^(completada|completed)$/i.test(
            race.status?.trim() ?? "",
          );

        const sorted = [...((data ?? []) as RaceRow[])].sort(
          (a, b) => Number(completed(a)) - Number(completed(b)),
        );

        setRaces(sorted);
      } catch (err) {
        if (!cancelled) {
          console.error(
            "[RAYOCERO] No se pudo cargar el calendario:",
            err,
          );
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchRaces();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [reload]);

  const cards = useMemo<EventCard[]>(() => {
    const result: EventCard[] = [];

    // Si existe una fila propia de WE CAN MOVE, no duplicarla.
    const hasOwnWcm = races.some((race) => isWcmName(race.name));
    let added = hasOwnWcm;

    for (const race of races) {
      result.push({
        key: race.id,
        race,
        wcm: isWcmName(race.name),
      });

      // Tarjeta asociada al evento LED, sin crear otra carrera en BD.
      if (!added && supportsWcm(race.name)) {
        result.push({
          key: `${race.id}-wecanmove`,
          race,
          wcm: true,
        });

        added = true;
      }
    }

    return result;
  }, [races]);

  return (
    <section
      className="rc-calendar"
      id="carreras"
      aria-labelledby="rc-calendar-title"
      aria-busy={loading}
    >
      <style>{styles}</style>

      <header className="rc-header">
        <div>
          <p className="rc-eyebrow">
            RayoCero · Calendario de eventos
          </p>

          <h2 id="rc-calendar-title">
            Tu próximo
            <br />
            <span>desafío.</span>
          </h2>

          <p className="rc-intro">
            Encuentra tu distancia, vive la experiencia y lleva tu
            energía a la línea de salida.
          </p>
        </div>

        {!loading && !error && (
          <div className="rc-index">
            <b>{String(cards.length).padStart(2, "0")}</b>
            <span>
              eventos en el calendario
              <br />
              Una misma comunidad.
            </span>
          </div>
        )}
      </header>

      {loading ? (
        <div className="rc-loading" role="status">
          <Loader2
            className="rc-spinner"
            size={22}
            aria-hidden="true"
          />
          Cargando eventos…
        </div>
      ) : error ? (
        <div className="rc-empty" role="alert">
          <AlertCircle
            size={24}
            aria-hidden="true"
            style={{ margin: "0 auto 12px" }}
          />

          <p>
            No pudimos cargar los eventos. Comprueba tu conexión
            e inténtalo de nuevo.
          </p>

          <button
            type="button"
            className="rc-btn"
            onClick={() => setReload((value) => value + 1)}
          >
            Reintentar
          </button>
        </div>
      ) : cards.length > 0 ? (
        <div className="rc-grid">
          {cards.map((card, index) => (
            <RaceCard
              key={card.key}
              card={card}
              index={index}
            />
          ))}
        </div>
      ) : (
        <div className="rc-empty">
          Pronto anunciaremos nuevos desafíos. Mantente cerca de
          RayoCero.
        </div>
      )}
    </section>
  );
}
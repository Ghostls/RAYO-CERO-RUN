/**
 * RAYOCERO — CONFIRMATION PAGE (V2.0_CANINATA_BRAND)
 * Senior Dev: MIA (Valkyron Group)
 * CEO: Lualdo Sciscioli
 * REGLA DE ORO: Código completo. Copy-paste ready.
 *
 * CHANGELOG V2.0:
 * [V2.0-1] Identidad visual Caninata aplicada al flujo 5K:
 *          Paleta: #3C491F (verde oscuro), #FDD454 (amarillo), #050801 (negro),
 *                  #D09644 (dorado), #C2B6AC (arena), #F2F2S4 (crema fondo)
 *          Tipografía: Bebas Neue (títulos) vía @import Google Fonts inline style
 *          Subtítulos: Montserrat (ya disponible via Tailwind/system)
 * [V2.0-2] Fondo texturizado con gradiente verde oscuro para Caninata.
 *          Fondo cian oscuro para flujo Carrera (sin cambios de marca).
 * [V2.0-3] Huella de perro (🐾) como elemento gráfico de la marca en lugar de CheckCircle.
 * [V2.0-4] Tarjeta de datos con borde dorado (#D09644) para Caninata.
 * [V2.0-5] Badge de evento con color #3C491F / #FDD454.
 * [V2.0-6] PRESERVADO: flujo dual carrera/caninata, InfoRow, Share API, animaciones.
 *
 * CHANGELOG V1.0 (base):
 * [V1.0-1] Flujo dual por query params (bib/categoria vs tipo=caninata).
 * [V1.0-2] Animación de entrada Framer Motion.
 * [V1.0-3] Botones: volver al inicio / compartir (Web Share API + clipboard fallback).
 * [V1.0-4] Acento diferenciado por modalidad.
 */

import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Flag, Home, Share2, Copy,
  Check, Timer, MapPin, Calendar, Hash, Dog
} from "lucide-react";
import { useState } from "react";

// ── Paleta Caninata (Brand Kit V1) ──────────────────────────────────────────
const CANINATA = {
  verdeOscuro:  "#3C491F",
  amarillo:     "#FDD454",
  negro:        "#050801",
  crema:        "#F2F2F4",
  dorado:       "#D09644",
  arena:        "#C2B6AC",
};

export default function ConfirmationPage() {
  const [searchParams] = useSearchParams();
  const navigate        = useNavigate();
  const [copied, setCopied] = useState(false);

  // ── Detección de flujo ──────────────────────────────────────────────────
  const tipo      = searchParams.get("tipo");
  const bib       = searchParams.get("bib");
  const categoria = searchParams.get("categoria");
  const ref       = searchParams.get("ref");
  const nombre    = searchParams.get("nombre");
  const perro     = searchParams.get("perro");
  const raza      = searchParams.get("raza");

  const isCaninata = tipo === "caninata" || (!bib && !!ref);

  // ── Tokens de color por flujo ───────────────────────────────────────────
  const accent       = isCaninata ? CANINATA.amarillo    : "#00f2ff";
  const accentDim    = isCaninata ? `${CANINATA.amarillo}20` : "#00f2ff15";
  const accentBorder = isCaninata ? `${CANINATA.dorado}60`   : "#00f2ff30";
  const cardBg       = isCaninata ? `${CANINATA.verdeOscuro}40` : "rgba(255,255,255,0.02)";
  const cardBorder   = isCaninata ? `${CANINATA.dorado}35`      : "rgba(255,255,255,0.08)";

  // ── Share ───────────────────────────────────────────────────────────────
  const shareText = isCaninata
    ? `¡Me inscribí en la CANINATA BARQUISIMETO junto a ${perro || "mi mascota"}! 🐾 #CaninataBqto #Rayocero`
    : `¡Me inscribí en RAYOCERO con el dorsal #${bib}! 🏃 Categoría: ${categoria}. #WERun10K #Rayocero`;

  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "RAYOCERO", text: shareText, url: window.location.origin }); return; }
      catch (_) {}
    }
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // ── Animaciones ─────────────────────────────────────────────────────────
  const containerVariants = {
    hidden:  { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const itemVariants = {
    hidden:  { opacity: 0, y: 22 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
  };

  return (
    <>
      {/* Bebas Neue para títulos — inline import */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
        .font-bebas { font-family: 'Bebas Neue', 'Impact', sans-serif; }
      `}</style>

      <div
        className="min-h-screen text-white flex flex-col items-center justify-center px-4 py-20"
        style={{
          background: isCaninata
            /* Fondo verde oscuro texturizado con viñeta — brand Caninata */
            ? `radial-gradient(ellipse at 60% 0%, #4a5e2a 0%, ${CANINATA.verdeOscuro} 35%, #1a2010 70%, ${CANINATA.negro} 100%)`
            /* Fondo oscuro cian para carrera */
            : "radial-gradient(ellipse at 60% 0%, #001a1f 0%, #03070b 60%)",
        }}
      >
        <motion.div
          className="max-w-lg w-full"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* ── ÍCONO / EMBLEMA ── */}
          <motion.div variants={itemVariants} className="flex justify-center mb-8">
            {isCaninata ? (
              /* Huella + círculo estilo brand kit */
              <div
                className="h-28 w-28 rounded-full flex items-center justify-center relative"
                style={{
                  background: `radial-gradient(circle, ${CANINATA.verdeOscuro} 0%, #1a2010 100%)`,
                  border: `2px solid ${CANINATA.dorado}`,
                  boxShadow: `0 0 40px ${CANINATA.amarillo}25`,
                }}
              >
                <span style={{ fontSize: "3.5rem", lineHeight: 1 }}>🐾</span>
              </div>
            ) : (
              <div
                className="h-24 w-24 rounded-full flex items-center justify-center"
                style={{ background: "#00f2ff15", border: "2px solid #00f2ff30" }}
              >
                <Check className="h-12 w-12 text-[#00f2ff]" />
              </div>
            )}
          </motion.div>

          {/* ── BADGE DE EVENTO ── */}
          <motion.div variants={itemVariants} className="flex justify-center mb-4">
            <span
              className="px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-[0.2em]"
              style={{
                background: isCaninata ? `${CANINATA.verdeOscuro}80` : "#00f2ff10",
                color:      isCaninata ? CANINATA.amarillo             : "#00f2ff",
                border:     `1px solid ${isCaninata ? CANINATA.dorado + "50" : "#00f2ff30"}`,
              }}
            >
              {isCaninata ? "CANINATA BARQUISIMETO · 4 OCT 2026" : "INSCRIPCIÓN CONFIRMADA"}
            </span>
          </motion.div>

          {/* ── TÍTULO ── */}
          <motion.div variants={itemVariants} className="text-center mb-8">
            <h1
              className="font-bebas uppercase leading-none"
              style={{
                fontSize: "clamp(3rem, 14vw, 5.5rem)",
                color: isCaninata ? CANINATA.amarillo : "#ffffff",
                letterSpacing: "0.04em",
                textShadow: isCaninata
                  ? `0 0 40px ${CANINATA.amarillo}40`
                  : "none",
              }}
            >
              {isCaninata ? "¡BIENVENIDOS\nA LA MANADA!" : "¡LISTO PARA\nCORRER!"}
            </h1>
            <p
              className="text-sm mt-3 font-medium"
              style={{ color: isCaninata ? CANINATA.arena : "rgba(255,255,255,0.4)", fontFamily: "Montserrat, sans-serif" }}
            >
              {isCaninata
                ? "Tu inscripción ha sido registrada exitosamente. 🐶"
                : "Tu inscripción ha sido procesada. Guarda tu dorsal."}
            </p>
          </motion.div>

          {/* ── TARJETA DE DATOS ── */}
          <motion.div
            variants={itemVariants}
            className="rounded-3xl p-6 sm:p-8 mb-6 space-y-4"
            style={{ background: cardBg, border: `1px solid ${cardBorder}`, backdropFilter: "blur(12px)" }}
          >
            {isCaninata ? (
              /* ─ BLOQUE CANINATA ─ */
              <>
                {nombre && (
                  <InfoRow icon={<Flag  className="h-4 w-4" />} label="Inscrito"          value={nombre} accent={accent} verdeOscuro={CANINATA.verdeOscuro} isCaninata />
                )}
                {perro && (
                  <InfoRow icon={<Dog   className="h-4 w-4" />} label="Nombre de Mascota" value={perro}  accent={accent} verdeOscuro={CANINATA.verdeOscuro} isCaninata />
                )}
                {raza && (
                  <InfoRow icon={<Dog   className="h-4 w-4 opacity-0" />} label="Raza" value={raza} accent={accent} verdeOscuro={CANINATA.verdeOscuro} isCaninata />
                )}
                {ref && (
                  <InfoRow icon={<Hash  className="h-4 w-4" />} label="Referencia de Pago" value={ref}  accent={accent} verdeOscuro={CANINATA.verdeOscuro} isCaninata />
                )}
                <InfoRow
                  icon={<Calendar className="h-4 w-4" />}
                  label="Fecha del Evento"
                  value="4 OCT 2026 · 07:00 AM"
                  accent={accent}
                  verdeOscuro={CANINATA.verdeOscuro}
                  isCaninata
                />
                <InfoRow
                  icon={<MapPin className="h-4 w-4" />}
                  label="Lugar"
                  value="Lidotel Barquisimeto"
                  accent={accent}
                  verdeOscuro={CANINATA.verdeOscuro}
                  isCaninata
                />

                {/* Divider decorativo */}
                <div
                  className="pt-4 mt-2 border-t text-xs leading-relaxed"
                  style={{ borderColor: `${CANINATA.dorado}25`, color: CANINATA.arena, fontFamily: "Montserrat, sans-serif" }}
                >
                  <span style={{ color: CANINATA.amarillo }} className="font-black">IMPORTANTE:</span>
                  {" "}Tu comprobante de pago será revisado. Recibirás confirmación final
                  por correo. Asegúrate de que tu mascota llegue con correa durante el evento.
                </div>
              </>
            ) : (
              /* ─ BLOQUE CARRERA (10K / 4K) ─ */
              <>
                {bib && (
                  <div className="text-center py-4">
                    <p className="text-xs font-bold uppercase text-white/40 tracking-widest mb-2">
                      Tu Número de Dorsal
                    </p>
                    <div
                      className="inline-flex items-center justify-center rounded-2xl px-10 py-4"
                      style={{ background: "#00f2ff15", border: "1px solid #00f2ff30" }}
                    >
                      <span className="font-black italic" style={{ fontSize: "clamp(3rem,12vw,5rem)", color: "#00f2ff", lineHeight: 1 }}>
                        #{bib}
                      </span>
                    </div>
                  </div>
                )}
                {categoria && (
                  <InfoRow icon={<Timer className="h-4 w-4" />} label="Categoría" value={categoria} accent="#00f2ff" verdeOscuro="#03070b" isCaninata={false} />
                )}
                <InfoRow icon={<MapPin className="h-4 w-4" />} label="Evento" value="RAYOCERO · WE RUN 10K NIGHT FEST" accent="#00f2ff" verdeOscuro="#03070b" isCaninata={false} />
                <div className="pt-4 mt-2 border-t text-xs text-white/40 leading-relaxed" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <span className="font-bold text-[#00f2ff]">PRÓXIMOS PASOS:</span>
                  {" "}Revisa tu correo para la confirmación. El dorsal físico se entrega en el kit del atleta previo al evento.
                </div>
              </>
            )}
          </motion.div>

          {/* ── BOTONES ── */}
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate("/")}
              className="flex-1 py-3.5 rounded-xl font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 transition-all"
              style={{
                background: isCaninata ? `${CANINATA.verdeOscuro}60` : "rgba(255,255,255,0.05)",
                border:     `1px solid ${isCaninata ? CANINATA.dorado + "30" : "rgba(255,255,255,0.10)"}`,
                color:      isCaninata ? CANINATA.arena : "rgba(255,255,255,0.6)",
                fontFamily: "Montserrat, sans-serif",
              }}
            >
              <Home className="h-4 w-4" />
              Volver al Inicio
            </button>

            <button
              onClick={handleShare}
              className="flex-1 py-3.5 rounded-xl font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 transition-all"
              style={{
                background: accent,
                color:      isCaninata ? CANINATA.negro : "#03070b",
                fontFamily: "Montserrat, sans-serif",
              }}
            >
              {copied
                ? <><Check className="h-4 w-4" /> ¡Copiado!</>
                : <><Share2 className="h-4 w-4" /> Compartir</>
              }
            </button>
          </motion.div>

          {/* ── FOOTER MARCA ── */}
          <motion.p
            variants={itemVariants}
            className="text-center text-[10px] font-black uppercase tracking-[0.35em] mt-8"
            style={{
              color: isCaninata ? `${CANINATA.dorado}70` : "rgba(255,255,255,0.15)",
              fontFamily: "Montserrat, sans-serif",
            }}
          >
            {isCaninata
              ? `CANINATA BARQUISIMETO · RAYOCERO · ${new Date().getFullYear()}`
              : `RAYOCERO · VALKYRON GROUP · ${new Date().getFullYear()}`
            }
          </motion.p>
        </motion.div>
      </div>
    </>
  );
}

// ── InfoRow ──────────────────────────────────────────────────────────────────
function InfoRow({
  icon, label, value, accent, verdeOscuro, isCaninata,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
  verdeOscuro: string;
  isCaninata: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{
          background: isCaninata ? `${verdeOscuro}90` : `${accent}12`,
          color: accent,
          border: isCaninata ? `1px solid ${accent}25` : "none",
        }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{ color: isCaninata ? "#C2B6AC" : "rgba(255,255,255,0.30)", fontFamily: "Montserrat, sans-serif" }}
        >
          {label}
        </p>
        <p className="text-sm font-bold mt-0.5 break-words" style={{ color: isCaninata ? "#F2F2F4" : "rgba(255,255,255,0.90)" }}>
          {value}
        </p>
      </div>
    </div>
  );
}
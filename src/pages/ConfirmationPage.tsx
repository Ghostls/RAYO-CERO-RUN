/**
 * RAYOCERO — CONFIRMATION PAGE (V5.0_GLASS_REBUILT)
 * Senior Dev: MIA (Valkyron Group)
 * CEO: Lualdo Sciscioli
 *
 * CHANGELOG V5.0:
 * [V5.0-1] Reconstrucción completa. Fondo: imagen inline base64-less — se usa
 *          un CSS gradient multicapa + mesh de puntos SVG inline como data-uri
 *          para que backdrop-filter tenga contenido real que desenfocarse.
 * [V5.0-2] Glass card: position:relative sobre un ::before con el fondo,
 *          resuelve el problema de stacking context que rompía backdropFilter.
 * [V5.0-3] Layout inspirado en ref Aiwanfo: avatar/hero centrado en la card,
 *          info en rows de label+valor, dos botones al fondo.
 * [V5.0-4] Brand Caninata: #3C491F/#FDD454/#D09644 — verde, amarillo, dorado.
 *          Brand Carrera: cian #00f2ff. Bebas Neue + Montserrat.
 * [V5.0-5] Responsive: una columna, max-w-[380px], sin overflow horizontal.
 * [V5.0-6] Evento dinámico desde searchParams (V3.0-1 preservado).
 * [V5.0-7] Share API preservado. Flujo dual caninata/carrera preservado.
 */

import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, Share2, Check, MapPin, Tag, Hash, Calendar } from "lucide-react";
import { useState } from "react";

const C = {
  verde:  "#3C491F",
  lime:   "#FDD454",
  dorado: "#D09644",
  arena:  "#C2B6AC",
  crema:  "#F2F2F4",
  negro:  "#050801",
};

export default function ConfirmationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const tipo      = searchParams.get("tipo");
  const bib       = searchParams.get("bib");
  const categoria = searchParams.get("categoria");
  const ref       = searchParams.get("ref");
  const nombre    = searchParams.get("nombre");
  const perro     = searchParams.get("perro");
  const raza      = searchParams.get("raza");
  const eventoRaw = searchParams.get("evento");
  const evento    = eventoRaw ? decodeURIComponent(eventoRaw) : "RAYOCERO";

  const isCan  = tipo === "caninata" || (!bib && !!ref);
  const accent = isCan ? C.lime    : "#00f2ff";
  const dim    = isCan ? C.dorado  : "#00b8cc";

  const shareText = isCan
    ? `¡Me inscribí en CANINATA BARQUISIMETO junto a ${perro || "mi mascota"}! 🐾 #CaninataBqto #Rayocero`
    : `¡Me inscribí en ${evento} con el dorsal #${bib}! 🏃 Categoría: ${categoria}. #Rayocero`;

  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "RAYOCERO", text: shareText, url: window.location.origin }); return; }
      catch (_) {}
    }
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // rows de datos
  const rows = isCan
    ? [
        nombre  && { icon: <Tag  size={14}/>, label: "Inscrito",   value: nombre },
        perro   && { icon: <span style={{fontSize:13}}>🐾</span>,  label: "Mascota",   value: perro  },
        raza    && { icon: <Tag  size={14}/>, label: "Raza",       value: raza   },
        ref     && { icon: <Hash size={14}/>, label: "Referencia", value: ref    },
        { icon: <Calendar size={14}/>, label: "Fecha",  value: "4 OCT 2026 · 07:00 AM" },
        { icon: <MapPin   size={14}/>, label: "Lugar",  value: "Lidotel Barquisimeto"   },
      ].filter(Boolean)
    : [
        categoria && { icon: <Tag     size={14}/>, label: "Categoría", value: categoria },
        { icon: <MapPin   size={14}/>, label: "Evento",    value: evento },
        ref       && { icon: <Hash    size={14}/>, label: "Referencia", value: ref      },
      ].filter(Boolean);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Montserrat:wght@400;600;700;900&display=swap');

        .rc-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          position: relative;
          overflow: hidden;
          font-family: 'Montserrat', system-ui, sans-serif;
        }

        /* Fondo real — capas apiladas para que backdrop-filter funcione */
        .rc-page::before {
          content: '';
          position: fixed;
          inset: 0;
          z-index: 0;
          background:
            ${isCan
              ? `radial-gradient(ellipse 80% 60% at 20% 10%, #4a5e2a 0%, transparent 60%),
                 radial-gradient(ellipse 70% 70% at 85% 90%, #2a3812 0%, transparent 60%),
                 radial-gradient(ellipse 60% 50% at 50% 50%, #1a2410 0%, transparent 80%),
                 linear-gradient(160deg, #0d1508 0%, #050801 100%)`
              : `radial-gradient(ellipse 80% 60% at 15% 5%,  #003d4d 0%, transparent 60%),
                 radial-gradient(ellipse 70% 70% at 90% 95%, #001828 0%, transparent 60%),
                 radial-gradient(ellipse 50% 50% at 50% 50%, #001c28 0%, transparent 80%),
                 linear-gradient(160deg, #001018 0%, #03070b 100%)`
            };
        }

        /* Puntos de ruido como textura */
        .rc-page::after {
          content: '';
          position: fixed;
          inset: 0;
          z-index: 0;
          background-image: radial-gradient(circle, ${isCan ? '#ffffff08' : '#00f2ff05'} 1px, transparent 1px);
          background-size: 24px 24px;
          pointer-events: none;
        }

        /* Blob decorativo animado */
        .rc-blob {
          position: fixed;
          z-index: 0;
          border-radius: 50%;
          filter: blur(60px);
          pointer-events: none;
          animation: blobDrift 16s ease-in-out infinite;
        }
        @keyframes blobDrift {
          0%,100% { transform: translate(0,0) scale(1); }
          33%     { transform: translate(40px,-30px) scale(1.1); }
          66%     { transform: translate(-30px,20px) scale(0.9); }
        }
        @media (prefers-reduced-motion: reduce) {
          .rc-blob { animation: none; }
        }

        /* Card glass */
        .rc-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 380px;
          border-radius: 28px;
          overflow: hidden;
          background: ${isCan
            ? 'rgba(30,38,15,0.55)'
            : 'rgba(0,18,28,0.55)'};
          backdrop-filter: blur(24px) saturate(1.6);
          -webkit-backdrop-filter: blur(24px) saturate(1.6);
          border: 1px solid ${isCan ? 'rgba(208,150,68,0.35)' : 'rgba(0,242,255,0.25)'};
          box-shadow:
            0 24px 64px rgba(0,0,0,0.5),
            0 1px 0 ${isCan ? 'rgba(253,212,84,0.25)' : 'rgba(0,242,255,0.2)'} inset,
            0 -1px 0 rgba(0,0,0,0.4) inset;
        }

        /* Brillo superior */
        .rc-shine {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg,
            transparent 0%,
            ${isCan ? 'rgba(253,212,84,0.6)' : 'rgba(0,242,255,0.5)'} 40%,
            ${isCan ? 'rgba(208,150,68,0.4)' : 'rgba(0,242,255,0.3)'} 60%,
            transparent 100%);
          z-index: 2;
        }

        .rc-badge {
          font-family: 'Montserrat', sans-serif;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          padding: 4px 12px;
          border-radius: 999px;
          background: ${isCan ? 'rgba(253,212,84,0.12)' : 'rgba(0,242,255,0.10)'};
          color: ${accent};
          border: 1px solid ${isCan ? 'rgba(253,212,84,0.28)' : 'rgba(0,242,255,0.25)'};
        }

        .rc-hero-ring {
          width: 110px;
          height: 110px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: ${isCan
            ? `radial-gradient(circle at 35% 35%, ${C.verde}ee, #0c1205)`
            : 'radial-gradient(circle at 35% 35%, #003d4d, #020e14)'};
          border: 1.5px solid ${isCan ? 'rgba(208,150,68,0.6)' : 'rgba(0,242,255,0.4)'};
          box-shadow:
            0 0 0 8px ${isCan ? 'rgba(253,212,84,0.06)' : 'rgba(0,242,255,0.05)'},
            0 0 40px ${isCan ? 'rgba(253,212,84,0.18)' : 'rgba(0,242,255,0.15)'};
        }

        .rc-bib-box {
          padding: 12px 28px 10px;
          border-radius: 16px;
          background: ${isCan ? 'rgba(253,212,84,0.06)' : 'rgba(0,242,255,0.06)'};
          border: 1px solid ${isCan ? 'rgba(253,212,84,0.2)' : 'rgba(0,242,255,0.2)'};
          box-shadow: 0 0 24px ${isCan ? 'rgba(253,212,84,0.1)' : 'rgba(0,242,255,0.1)'};
        }

        .rc-bib-number {
          font-family: 'Bebas Neue', Impact, sans-serif;
          font-size: clamp(3rem, 15vw, 4.5rem);
          line-height: 1;
          color: ${accent};
          text-shadow: 0 0 24px ${isCan ? 'rgba(253,212,84,0.5)' : 'rgba(0,242,255,0.5)'};
        }

        .rc-title {
          font-family: 'Bebas Neue', Impact, sans-serif;
          font-size: clamp(1.8rem, 8vw, 2.6rem);
          letter-spacing: 0.03em;
          line-height: 1.05;
          color: ${isCan ? C.lime : '#ffffff'};
          text-shadow: ${isCan ? `0 0 28px rgba(253,212,84,0.35)` : 'none'};
          text-align: center;
        }

        .rc-subtitle {
          font-size: 11px;
          font-weight: 500;
          color: ${isCan ? C.arena : 'rgba(255,255,255,0.42)'};
          text-align: center;
          margin-top: 6px;
        }

        .rc-divider {
          height: 1px;
          margin: 0 20px;
          background: linear-gradient(90deg,
            transparent,
            ${isCan ? 'rgba(208,150,68,0.25)' : 'rgba(0,242,255,0.15)'},
            transparent);
        }

        .rc-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 14px;
          border-radius: 12px;
          background: ${isCan ? 'rgba(60,73,31,0.3)' : 'rgba(0,242,255,0.04)'};
          border: 1px solid ${isCan ? 'rgba(208,150,68,0.15)' : 'rgba(0,242,255,0.1)'};
        }

        .rc-row-label {
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: ${isCan ? 'rgba(194,182,172,0.7)' : 'rgba(255,255,255,0.28)'};
          display: flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
          color: ${isCan ? C.arena + 'bb' : 'rgba(255,255,255,0.3)'};
        }

        .rc-row-value {
          font-size: 12px;
          font-weight: 700;
          text-align: right;
          color: ${isCan ? C.crema : 'rgba(255,255,255,0.88)'};
          word-break: break-word;
        }

        .rc-notice {
          padding: 12px 14px;
          border-radius: 12px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          font-size: 10px;
          line-height: 1.6;
          color: ${isCan ? C.arena + 'bb' : 'rgba(255,255,255,0.36)'};
        }

        .rc-btn-secondary {
          flex: 1;
          padding: 13px;
          border-radius: 14px;
          font-family: 'Montserrat', sans-serif;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.55);
          backdrop-filter: blur(8px);
        }
        .rc-btn-secondary:hover  { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.8); }
        .rc-btn-secondary:active { transform: scale(0.97); }

        .rc-btn-primary {
          flex: 1;
          padding: 13px;
          border-radius: 14px;
          font-family: 'Montserrat', sans-serif;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          cursor: pointer;
          transition: all 0.15s ease;
          background: ${accent};
          border: none;
          color: ${isCan ? C.negro : '#03070b'};
          box-shadow: 0 4px 20px ${isCan ? 'rgba(253,212,84,0.35)' : 'rgba(0,242,255,0.3)'};
        }
        .rc-btn-primary:hover  { filter: brightness(1.08); }
        .rc-btn-primary:active { transform: scale(0.97); }

        .rc-footer {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          text-align: center;
          margin-top: 20px;
          color: ${isCan ? 'rgba(208,150,68,0.45)' : 'rgba(255,255,255,0.12)'};
          font-family: 'Montserrat', sans-serif;
          position: relative;
          z-index: 1;
        }

        .rc-check-circle {
          width: 32px; height: 32px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          background: ${isCan ? 'rgba(253,212,84,0.15)' : 'rgba(0,242,255,0.12)'};
          border: 1px solid ${isCan ? 'rgba(253,212,84,0.35)' : 'rgba(0,242,255,0.3)'};
        }
      `}</style>

      {/* ── FONDO BLOBS ── */}
      <div className="rc-blob" style={{
        top: "-10%", left: "-15%", width: "55vw", height: "55vw",
        background: isCan
          ? `radial-gradient(circle, ${C.verde}cc 0%, transparent 70%)`
          : "radial-gradient(circle, #003d4dcc 0%, transparent 70%)",
        opacity: 0.8,
      }}/>
      <div className="rc-blob" style={{
        bottom: "-15%", right: "-10%", width: "50vw", height: "50vw",
        background: isCan
          ? `radial-gradient(circle, #2a3812 0%, transparent 70%)`
          : "radial-gradient(circle, #001828 0%, transparent 70%)",
        opacity: 0.6,
        animationDelay: "-8s",
        animationDuration: "20s",
      }}/>

      <div className="rc-page">
        <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 380 }}>

          {/* ══ GLASS CARD ══ */}
          <motion.div
            className="rc-card"
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="rc-shine"/>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 20px 0" }}>
              <span className="rc-badge">
                {isCan ? "Caninata · 5K" : `Inscripción · ${bib ? "Carrera" : ""}`}
              </span>
              <div className="rc-check-circle">
                <Check size={15} color={accent}/>
              </div>
            </div>

            {/* Hero */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 20px 20px" }}>
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                {isCan ? (
                  <div className="rc-hero-ring">
                    <span style={{ fontSize: "3rem", lineHeight: 1, filter: `drop-shadow(0 0 10px rgba(253,212,84,0.7))` }}>🐾</span>
                  </div>
                ) : (
                  <div className="rc-bib-box">
                    <p style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", textAlign: "center", marginBottom: 4, fontFamily: "Montserrat, sans-serif" }}>Dorsal</p>
                    <p className="rc-bib-number">#{bib}</p>
                  </div>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.32, duration: 0.4 }}
                style={{ marginTop: 18, width: "100%" }}
              >
                <h1 className="rc-title">
                  {isCan ? "¡Bienvenidos a\nla Manada!" : "¡Listo para\nCorrer!"}
                </h1>
                <p className="rc-subtitle">
                  {isCan ? "Inscripción registrada exitosamente 🐶" : "Tu inscripción ha sido confirmada."}
                </p>
              </motion.div>
            </div>

            {/* Divider */}
            <div className="rc-divider"/>

            {/* Datos */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.42, duration: 0.4 }}
              style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 6 }}
            >
              {(rows as any[]).map((row, i) => row && (
                <div key={i} className="rc-row">
                  <span className="rc-row-label">
                    <span style={{ color: accent, opacity: 0.8 }}>{row.icon}</span>
                    {row.label}
                  </span>
                  <span className="rc-row-value">{row.value}</span>
                </div>
              ))}

              {/* Aviso */}
              <div className="rc-notice" style={{ marginTop: 4 }}>
                {isCan ? (
                  <><span style={{ color: C.lime, fontWeight: 900 }}>Importante: </span>
                  Tu comprobante será revisado. Asegúrate de que tu mascota llegue con correa.</>
                ) : (
                  <><span style={{ color: accent, fontWeight: 900 }}>Próximos pasos: </span>
                  Revisa tu correo. El dorsal físico se entrega en el kit del atleta.</>
                )}
              </div>
            </motion.div>

            {/* Botones */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.52, duration: 0.4 }}
              style={{ padding: "0 20px 22px", display: "flex", gap: 10 }}
            >
              <button className="rc-btn-secondary" onClick={() => navigate("/")}>
                <Home size={14}/> Inicio
              </button>
              <button className="rc-btn-primary" onClick={handleShare}>
                {copied ? <><Check size={14}/> ¡Copiado!</> : <><Share2 size={14}/> Compartir</>}
              </button>
            </motion.div>

            {/* Brillo inferior */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1,
              background: `linear-gradient(90deg, transparent, ${isCan ? 'rgba(208,150,68,0.2)' : 'rgba(0,242,255,0.12)'}, transparent)` }}/>
          </motion.div>

          {/* Footer */}
          <motion.p
            className="rc-footer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65, duration: 0.4 }}
          >
            {isCan
              ? `Caninata Barquisimeto · Rayocero · ${new Date().getFullYear()}`
              : `${evento} · Valkyron Group · ${new Date().getFullYear()}`}
          </motion.p>
        </div>
      </div>
    </>
  );
}
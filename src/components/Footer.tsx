/**
 * RAYO CERO — TERMINAL FOOTER (STABLE BUILD V2.1)
 * Senior Dev: MIA (Valkyron Group)
 * Grado: Militar / Operativo
 * FIX: Inyección de assets oficiales (Logo Rayo Cero y Logo Valkyron Group).
 */

import { Activity } from "lucide-react";
import logoRayoCero from "../assets/logo.png";
import logoValkyron from "../assets/logo1.png";

const Footer = () => (
  <footer className="relative bg-[#03070b] border-t border-white/5 pt-12 pb-8 px-6 overflow-hidden z-20">
    {/* Línea de energía superior (Glow táctico) */}
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 md:w-1/3 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />

    <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4">
      
      {/* BLOQUE IZQUIERDO: Identidad del Evento y Estatus */}
      <div className="flex flex-col items-center md:items-start gap-3">
        <div className="flex items-center gap-2 md:gap-3">
          <img 
            src={logoRayoCero} 
            alt="Logo Rayo Cero" 
            className="h-5 md:h-7 w-auto object-contain filter drop-shadow-[0_0_5px_rgba(0,242,255,0.3)]" 
          />
        </div>
      </div>

      {/* BLOQUE CENTRAL: Firma del Creador (Valkyron Group) */}
      <div className="flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity duration-500 cursor-default p-4 rounded-2xl bg-white/[0.02] border border-white/5">
        <img 
          src={logoValkyron} 
          alt="Valkyron Group" 
          className="h-6 md:h-8 w-auto object-contain filter drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]" 
        />
        <div className="flex flex-col">
          <span className="text-[7px] md:text-[8px] font-black text-cyan-400/60 uppercase tracking-[0.4em]">
            Ingeniería de Software por
          </span>
          <span className="text-[10px] md:text-xs font-black text-white uppercase tracking-[0.2em] mt-0.5">
            Valkyron Group
          </span>
        </div>
      </div>

      {/* BLOQUE DERECHO: Legal y Telemetría */}
      <div className="flex flex-col items-center md:items-end gap-3">
        <p className="text-[8px] md:text-[9px] font-bold text-white/30 uppercase tracking-[0.2em] text-center md:text-right">
          © {new Date().getFullYear()} Rayocero. Todos los derechos reservados.
        </p>
      </div>

    </div>
  </footer>
);

export default Footer;
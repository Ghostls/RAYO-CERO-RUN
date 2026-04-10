/**
 * RAYOCERO — BRAND LOGO COMPONENT (STABLE BUILD V1.1)
 * Senior Dev: MIA (Valkyron Group)
 * CEO: Lualdo Sciscioli
 * Grado: Militar / Operativo
 * REGLA DE ORO: Código completo sin omisiones.
 * FIX: Ajuste tipográfico. Eliminación de espacio (RayoCero -> RAYOCERO).
 */

import { Zap } from "lucide-react";

const Logo = ({ className = "" }: { className?: string }) => (
  <div className={`flex items-center gap-3 group ${className}`}>
    <div className="relative">
      {/* Aura de energía del logo */}
      <div className="absolute inset-0 bg-cyan-400/20 blur-xl rounded-full animate-pulse" />
      <div className="relative bg-white p-2 rounded-xl shadow-[0_0_20px_rgba(0,180,216,0.3)] group-hover:rotate-12 transition-transform duration-500">
        <Zap className="h-6 w-6 text-[#001F3F] fill-current" />
      </div>
    </div>
    <div className="flex flex-col">
      {/* ─── Identidad Visual Ajustada: Sin espacio ─── */}
      <span className="text-2xl font-black italic tracking-tighter leading-none text-white">
        RAYO<span className="text-cyan-400">CERO</span>
      </span>
      <span className="text-[8px] font-black tracking-[0.4em] text-white/40 uppercase">
        Valkyron Systems
      </span>
    </div>
  </div>
);

export default Logo;
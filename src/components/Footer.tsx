/**
 * RAYO CERO — TERMINAL & CORE FOOTER FUSION (STABLE V7.4 - POLAR LIGHT EDIT)
 * Senior Dev: MIA (Valkyron Group)
 * CEO: Lualdo Sciscioli
 * Grado: Militar / Operativo / Diseñador
 * * REGLA DE ORO: Fusión estructural sin omisiones de metadatos, enlaces ni bloques de marca.
 * * FIX: Unificación de firma HUD compacta V2.1 con retícula informativa extendida V7.3.
 */

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Mail, Globe } from "lucide-react";

// Importación de activos gráficos corregidos con precisión quirúrgica militar
import logoRayoCero from "../assets/logo.png";
import logoValkyron from "../assets/12.png"; // ASIGNACIÓN PRECISIÓN: Puntero 12 asignado a Valkyron Group

const Footer = () => {
  // Constantes de cinemática áurea para transiciones fluidas de interfaz (t = 1 / phi)
  const tFluid = 0.618;
  const bezierPhi = [0.16, 1, 0.3, 1];

  return (
    <footer className="relative bg-[#03070b] border-t border-white/5 pt-16 pb-8 px-6 overflow-hidden z-20">
      
      {/* ─── LÍNEA DE ENERGÍA SUPERIOR (GLOW REFRACCIÓN POLAR) ─── */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 md:w-1/3 h-[1px] bg-gradient-to-r from-transparent via-[#50E8E3]/40 to-transparent" />

      {/* ─── EFECTO DE ILUMINACIÓN DE BAJA FRECUENCIA EN EL FONDO (AURORA INVERSA) ─── */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] h-[150px] bg-[#50E8E3]/5 blur-[80px] rounded-full pointer-events-none z-0" />

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* RETÍCULA INFORMATIVA Y DE CONTROL */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          
          {/* Columna 1: Identidad del Evento y Estatus Táctico */}
          <div className="md:col-span-2 flex flex-col gap-6">
            <div className="flex items-center justify-center md:justify-start gap-4">
              <img 
                src={logoRayoCero} 
                alt="Rayo Cero Running" 
                className="h-7 w-auto object-contain filter drop-shadow-[0_0_10px_rgba(80,232,227,0.25)]"
              />
              <span className="text-[10px] font-black tracking-[0.3em] text-[#50E8E3] uppercase bg-[#50E8E3]/10 px-2.5 py-1 rounded">
                NIGHT FEST 10K
              </span>
            </div>
            <p className="text-xs text-white/40 leading-relaxed font-medium max-w-sm text-center md:text-left mx-auto md:mx-0">
              Infraestructura de software y telemetría de vanguardia aplicada al atletismo de alto rendimiento. Desarrollado bajo estándares tácticos digitales.
            </p>
          </div>

          {/* Columna 2: Enlaces del Ecosistema Reactivo */}
          <div className="text-center md:text-left">
            <h4 className="text-[10px] font-black text-white uppercase tracking-[0.3em] mb-4">Navegación</h4>
            <ul className="space-y-3 text-xs font-semibold text-white/50">
              <li className="flex justify-center md:justify-start">
                <Link to="/" className="hover:text-[#50E8E3] transition-colors duration-300 flex items-center gap-2">
                  <Zap className="h-3 w-3 text-[#50E8E3]" /> Inicio
                </Link>
              </li>
              <li><Link to="/registro" className="hover:text-[#50E8E3] transition-colors duration-300">Inscripción</Link></li>
              <li><Link to="/resultados" className="hover:text-[#50E8E3] transition-colors duration-300">Resultados</Link></li>
            </ul>
          </div>

          {/* Columna 3: Soporte y Canales Operativos */}
          <div className="text-center md:text-left">
            <h4 className="text-[10px] font-black text-white uppercase tracking-[0.3em] mb-4">Canales</h4>
            <ul className="space-y-3 text-xs font-semibold text-white/50">
              <li className="flex items-center justify-center md:justify-start gap-2 hover:text-[#50E8E3] transition-colors duration-300 cursor-pointer">
                <Mail className="h-3 w-3" /> soporte@rayocero.com
              </li>
              <li className="flex items-center justify-center md:justify-start gap-2 hover:text-[#50E8E3] transition-colors duration-300 cursor-pointer">
                <Globe className="h-3 w-3" /> rayocero.com
              </li>
            </ul>
          </div>

        </div>

        {/* LÍNEA DIVISORIA PROPORCIONAL */}
        <div className="w-full h-[1px] bg-white/5 my-8" />

        {/* BARRA DE CRÉDITOS Y SELLO FIRMA DE DISEÑADOR */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4">
          
          {/* Bloque Legal */}
          <div className="text-[10px] font-bold text-white/30 tracking-wider uppercase order-2 md:order-1 text-center md:text-left">
            © {new Date().getFullYear()} RAYOCERO. TODOS LOS DERECHOS RESERVADOS.
          </div>
          
          {/* Bloque Central Fusionado: Firma HUD Premium de Valkyron Group */}
          <motion.div 
            whileHover={{ scale: 1.0382 }}
            transition={{ duration: tFluid, ease: bezierPhi }}
            className="flex items-center gap-4 order-1 md:order-2 bg-white/[0.02] border border-white/5 rounded-2xl p-4 hover:border-[#50E8E3]/30 hover:bg-[#50E8E3]/5 transition-all duration-500 shadow-xl cursor-default group"
          >
            <img 
              src={logoValkyron} 
              alt="Valkyron Group" 
              className="h-6 md:h-8 w-auto object-contain filter drop-shadow-[0_0_8px_rgba(255,255,255,0.1)] opacity-70 group-hover:opacity-100 transition-opacity duration-500" 
            />
            <div className="flex flex-col text-left">
              <span className="text-[7px] md:text-[8px] font-black text-[#50E8E3]/60 uppercase tracking-[0.4em] transition-colors duration-500 group-hover:text-[#50E8E3]">
                Ingeniería de Software por
              </span>
              <span className="text-[10px] md:text-xs font-black text-white uppercase tracking-[0.2em] mt-0.5">
                Valkyron Group
              </span>
            </div>
          </motion.div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
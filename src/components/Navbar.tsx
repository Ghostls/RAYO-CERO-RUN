/**
 * RAYO CERO — NAVIGATION CORE V4
 * Senior Dev: MIA (Valkyron Group)
 * Grado: Operativo / Diseñador
 * Fix: Transición a Arquitectura Multi-Página (Enrutamiento directo a /carreras).
 */

import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Trophy, UserPlus, Home, Zap, Calendar } from "lucide-react";

import logoPng from "@/assets/logo.png";

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Cierra el menú móvil automáticamente al cambiar de ruta
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  // ENRUTAMIENTO OFICIAL (Arquitectura Multi-Página)
  const navLinks = [
    { name: "INICIO", path: "/", icon: <Home className="h-4 w-4" /> },
    { name: "CARRERAS", path: "/carreras", icon: <Calendar className="h-4 w-4" /> },
    { name: "REGISTRO", path: "/registro", icon: <UserPlus className="h-4 w-4" /> },
    { name: "RESULTADOS", path: "/resultados", icon: <Trophy className="h-4 w-4" /> },
  ];

  // Lógica de estado activo perfeccionada
  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${
        isScrolled 
          ? "py-3 bg-[#03070b]/90 backdrop-blur-md border-b border-white/5 shadow-2xl shadow-black/50" 
          : "py-7 bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        
        {/* BRANDING: RAYO CERO */}
        <Link to="/" className="flex items-center gap-4 group">
          <div className="group-hover:rotate-6 transition-transform duration-300">
            {!logoError ? (
              <img 
                src={logoPng} 
                alt="Rayo Cero" 
                className="h-10 w-auto object-contain"
                onError={() => setLogoError(true)} 
              />
            ) : (
              <div className="bg-white p-2 rounded-lg">
                <Zap className="h-6 w-6 text-[#03070b] fill-current" />
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black italic tracking-tighter text-white leading-none">
              RUNNING
            </span>
          </div>
        </Link>

        {/* DESKTOP NAVIGATION (Liquid Glass Pill) */}
        <div className="hidden md:flex items-center gap-2 bg-white/[0.03] border border-white/10 p-1.5 rounded-2xl backdrop-blur-xl shadow-[0_0_30px_rgba(255,255,255,0.02)]">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black tracking-widest transition-all duration-300 ${
                isActive(link.path)
                  ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)] scale-105"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              {link.icon} {link.name}
            </Link>
          ))}
        </div>

        {/* MOBILE MENU TRIGGER */}
        <button
          className="md:hidden p-4 bg-white/5 border border-white/10 rounded-2xl text-white active:scale-95 transition-transform"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* MOBILE OVERLAY */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="absolute top-0 right-0 w-3/4 h-screen bg-[#03070b] border-l border-white/10 md:hidden p-10 flex flex-col gap-6 shadow-[-20px_0_50px_rgba(0,0,0,0.8)]"
          >
            <div className="flex justify-end mb-10">
               <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-white/5 rounded-full border border-white/10">
                 <X className="h-6 w-6 text-white/50 hover:text-white transition-colors" />
               </button>
            </div>
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center justify-between p-6 rounded-2xl font-black text-xs tracking-widest transition-all ${
                    isActive(link.path) 
                      ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]" 
                      : "bg-white/[0.02] border border-white/5 text-white/50 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {link.name}
                  {link.icon}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
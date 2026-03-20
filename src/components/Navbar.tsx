import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Menu, X, ShieldCheck } from "lucide-react";

interface NavbarProps {
  onNavigate: (section: string) => void;
}

const Navbar = ({ onNavigate }: NavbarProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { label: "Inicio", section: "hero" },
    { label: "Inscripción", section: "register" },
    { label: "Resultados", section: "results" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-white/5 border-b border-white/10">
      <div className="container mx-auto flex items-center justify-between px-6 py-4">
        <div className="flex flex-col items-start">
            <button onClick={() => onNavigate("hero")} className="flex items-center gap-2 group">
              <Zap className="h-6 w-6 text-white transition-transform group-hover:scale-110" />
              <span className="text-lg font-bold tracking-tight text-white">
                Rayo <span className="text-white/80">Cero</span>
              </span>
            </button>
            <span className="text-[10px] font-bold tracking-[0.2em] text-white/60 ml-8 uppercase">
              Powered by Valkyron Group
            </span>
        </div>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <button
              key={l.section}
              onClick={() => onNavigate(l.section)}
              className="text-sm font-semibold text-white/80 hover:text-white transition-colors relative group"
            >
              {l.label}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-white transition-all group-hover:w-full" />
            </button>
          ))}
          <motion.button
            whileHover={{ scale: 1.05, backgroundColor: "#002a54" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onNavigate("register")}
            className="flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-white/5 border border-white/10"
          >
            <ShieldCheck className="h-4 w-4" />
            Inscríbete
          </motion.button>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden text-white" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X /> : <Menu />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden backdrop-blur-xl bg-primary/95 border-t border-white/10 overflow-hidden"
          >
            <div className="flex flex-col gap-4 p-6">
              {links.map((l) => (
                <button
                  key={l.section}
                  onClick={() => { onNavigate(l.section); setMobileOpen(false); }}
                  className="text-base font-bold text-white hover:text-white transition-colors text-left"
                >
                  {l.label}
                </button>
              ))}
              <button 
                onClick={() => { onNavigate("register"); setMobileOpen(false); }}
                className="w-full text-center rounded-xl bg-white/10 py-4 text-white font-bold border border-white/20"
              >
                Inscríbete Ahora
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
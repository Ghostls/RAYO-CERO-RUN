/**
 * RAYO CERO — CORE ROUTER V7.1 (STABLE EVOLUTION - VALKYRON SHIELD)
 * Senior Dev: MIA / Gemini (Valkyron Group)
 * CEO: Lualdo Sciscioli
 * Grado: Operativo / Militar
 * REGLA DE ORO: Código completo sin omisiones. 
 * EVOLUCIÓN: Redirección OPSEC automática para sesiones activas.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// IMPORTACIONES DE COMPONENTES GLOBALES
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

// IMPORTACIONES DE PÁGINAS 
import Index from "./pages/Index";
import RaceDetail from "./pages/RaceDetail"; 
import NotFound from "./pages/NotFound";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";

// IMPORTACIONES DE MÓDULOS ESPECÍFICOS OPERATIVOS
import RegistrationForm from "./components/RegistrationForm";
import ResultsSection from "./components/ResultsSection";
import RacesSection from "./components/RacesSection";

const queryClient = new QueryClient();

// Componente Wrapper para manejar la lógica de visibilidad de UI Global
const AppContent = ({ session, loading }: { session: any, loading: boolean }) => {
  const location = useLocation();
  
  // Determinamos si estamos en una ruta de administración o login administrativo
  const isAdminRoute = location.pathname.startsWith('/admin') || location.pathname === '/v-access';

  return (
    <div className="min-h-screen bg-[#03070b] text-white flex flex-col selection:bg-cyan-500/30">
      
      {/* NAVEGACIÓN GLOBAL TÁCTICA - Se oculta si es ruta Admin */}
      {!isAdminRoute && <Navbar />}
      
      <main className="flex-grow">
        <Routes>
          {/* RUTAS PÚBLICAS */}
          <Route path="/" element={<Index />} />
          <Route path="/carreras" element={<RacesSection />} />
          <Route path="/carrera/:id" element={<RaceDetail />} /> 
          <Route path="/registro" element={<RegistrationForm />} />
          <Route path="/resultados" element={<ResultsSection />} />

          {/* ACCESO ADMINISTRATIVO (OCULTO & BLINDADO) */}
          <Route 
            path="/v-access" 
            element={
              loading ? (
                <div className="h-screen flex items-center justify-center bg-[#03070b]">
                  <div className="animate-pulse text-cyan-500 font-black tracking-widest text-xs uppercase">
                    Escaneando_Perímetro...
                  </div>
                </div>
              ) : session ? (
                // Bypass Operativo: Si ya hay sesión, saltar el login directo al Dashboard
                <Navigate to="/admin-dashboard" replace />
              ) : (
                <AdminLogin />
              )
            } 
          />
          
          {/* PROTECCIÓN DE RUTA: DASHBOARD M.I.A */}
          <Route 
            path="/admin-dashboard" 
            element={
              loading ? (
                <div className="h-screen flex items-center justify-center bg-[#03070b]">
                  <div className="animate-pulse text-cyan-500 font-black tracking-widest text-xs uppercase">
                    Verificando_Credenciales_Valkyron...
                  </div>
                </div>
              ) : session ? (
                <AdminDashboard />
              ) : (
                <Navigate to="/v-access" replace />
              )
            } 
          />

          {/* Manejo de Error 404 (Blindaje de navegación) */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {/* PIE DE PÁGINA OPERATIVO - Se oculta si es ruta Admin */}
      {!isAdminRoute && <Footer />}
      
    </div>
  );
};

const App = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sincronización de sesión con Supabase Auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent session={session} loading={loading} />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
/**
 * RAYO CERO — CORE ROUTER V8 (STABLE EVOLUTION - ASYNC LAZY LOADING)
 * Senior Dev: MIA (Valkyron Group)
 * CEO: Lualdo Sciscioli
 * Grado: Operativo / Militar
 * REGLA DE ORO: Evolución de módulos con protección de rutas y limpieza de UI Admin.
 * FIX: Implementación de carga asíncrona (React.lazy + Suspense) para optimización Grado Apple.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState, Suspense, lazy } from "react"; // MIA: Importación de tácticas asíncronas
import { supabase } from "./lib/supabase";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// IMPORTACIONES DE COMPONENTES GLOBALES (Sincrónicos, deben cargar de inmediato)
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

// ─── MIA PROTOCOL: IMPORTACIONES ASÍNCRONAS (LAZY LOADING) ───
// Estas ojivas solo se descargarán cuando el usuario navegue hacia ellas.
const Index = lazy(() => import("./pages/Index"));
const RaceDetail = lazy(() => import("./pages/RaceDetail")); 
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));

const RegistrationForm = lazy(() => import("./components/RegistrationForm"));
const ResultsSection = lazy(() => import("./components/ResultsSection"));
const RacesSection = lazy(() => import("./components/RacesSection"));
// ─────────────────────────────────────────────────────────────

const queryClient = new QueryClient();

// MIA: Componente de transición táctica durante la descarga asíncrona
const PageLoader = () => (
  <div className="h-screen w-full flex flex-col items-center justify-center bg-[#03070b]">
    <div className="h-10 w-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(0,242,255,0.5)]" />
    <span className="text-[9px] font-black text-cyan-500 uppercase tracking-[0.4em] animate-pulse">
      Desplegando_Interfaz...
    </span>
  </div>
);

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
        {/* MIA: Suspense envuelve las rutas para inyectar el loader mientras descarga */}
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* RUTAS PÚBLICAS */}
            <Route path="/" element={<Index />} />
            <Route path="/carreras" element={<RacesSection />} />
            <Route path="/carrera/:id" element={<RaceDetail />} /> 
            <Route path="/registro" element={<RegistrationForm />} />
            <Route path="/resultados" element={<ResultsSection />} />

            {/* ACCESO ADMINISTRATIVO (OCULTO) */}
            <Route path="/v-access" element={<AdminLogin />} />
            
            {/* PROTECCIÓN DE RUTA: DASHBOARD M.I.A */}
            <Route 
              path="/admin-dashboard" 
              element={
                loading ? (
                  <PageLoader /> // Usamos el mismo loader táctico aquí
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
        </Suspense>
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
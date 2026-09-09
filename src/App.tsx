/**
 * RAYO CERO — CORE ROUTER V7.9 (CANINATA CLIENT DASHBOARD)
 * Senior Dev: MIA (Valkyron Group)
 * CEO: Lualdo Sciscioli
 *
 * CHANGELOG V7.9 (evoluciona sobre V7.8):
 * [V7.9-1] Import CaninataDashboard — lazy load desde pages/CaninataDashboard.
 * [V7.9-2] Ruta /caninata → CaninataDashboard (PIN-based, sin Supabase Auth).
 * [V7.9-3] /caninata añadido a isAdminRoute — sin Navbar ni Footer.
 *
 * CHANGELOG V7.8 (base intacta):
 * [V7.8-1] Ruta /confirmacion eliminada.
 * [V7.8-2] Import ConfirmationPage eliminado.
 * [V7.8-3] /acceso y /perfil en isAdminRoute.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation, useParams } from "react-router-dom";
import { useEffect, useState, lazy, Suspense } from "react";
import { supabase } from "./lib/supabase";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import RaceSignalProvider from "./components/RaceSignalProvider";

// ── Skeleton global de carga ─────────────────────────────────────────────────
const PageLoader = () => (
  <div className="h-screen flex items-center justify-center bg-[#03070b]">
    <div style={{ textAlign: "center" }}>
      <div style={{
        width: 36, height: 36, margin: "0 auto 12px",
        border: "2px solid rgba(0,242,255,0.15)",
        borderTopColor: "#00f2ff",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
      <div style={{
        fontSize: 9, letterSpacing: "0.3em",
        color: "rgba(0,242,255,0.4)", textTransform: "uppercase", fontWeight: 700,
      }}>
        Cargando...
      </div>
    </div>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const wrap = (Component: React.ComponentType) => (
  <Suspense fallback={<PageLoader />}><Component /></Suspense>
);

// ── PÁGINAS — lazy load ──────────────────────────────────────────────────────
const Index          = lazy(() => import("./pages/Index"));
const RaceDetail     = lazy(() => import("./pages/RaceDetail"));
const NotFound       = lazy(() => import("./pages/NotFound"));
const AdminLogin     = lazy(() => import("./pages/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));

// ✅ [V7.7-1] DorsalPage — maneja AMBOS flujos: carrera y caninata
const DorsalPage = lazy(() => import("./pages/DorsalPage"));

// ✅ [V7.9-1] CaninataDashboard — acceso PIN para cliente dueño de la caninata
const CaninataDashboard = lazy(() => import("./pages/CaninataDashboard"));

// ── MÓDULOS ESPECÍFICOS — lazy load ─────────────────────────────────────────
const RegistrationForm = lazy(() => import("./components/RegistrationForm"));
const ResultsSection   = lazy(() => import("./components/ResultsSection"));
const RacesSection     = lazy(() => import("./components/RacesSection"));
const RaceTracker      = lazy(() => import("./components/RaceTracker"));
const TrackerLanding   = lazy(() => import("./components/TrackerLanding"));

// ── PORTAL DEL ATLETA — lazy load ───────────────────────────────────────────
const AthleteAuth    = lazy(() => import("./components/AthleteAuth"));
const AthleteProfile = lazy(() => import("./components/Athleteprofile"));

const queryClient = new QueryClient();

// ── Wrapper para RaceTracker con useParams ───────────────────────────────────
const TrackerPage = () => {
  const { bib } = useParams<{ bib: string }>();
  return <RaceTracker bibNumber={parseInt(bib ?? "0")} />;
};

// ── Lógica de visibilidad de UI Global ──────────────────────────────────────
const AppContent = ({ session, loading }: { session: any; loading: boolean }) => {
  const location = useLocation();

  // [V7.9-3] /caninata añadido — dashboard cliente sin Navbar/Footer
  const isAdminRoute =
    location.pathname.startsWith("/admin")   ||
    location.pathname === "/v-access"        ||
    location.pathname.startsWith("/tracker") ||
    location.pathname === "/acceso"          ||
    location.pathname === "/perfil"          ||
    location.pathname === "/caninata";

  return (
    <div className="min-h-screen bg-[#03070b] text-white flex flex-col selection:bg-cyan-500/30">

      {!isAdminRoute && <Navbar />}

      <main className="flex-grow">
        <Routes>

          {/* ── RUTAS PÚBLICAS ── */}
          <Route path="/"            element={wrap(Index)} />
          <Route path="/carreras"    element={wrap(RacesSection)} />
          <Route path="/carrera/:id" element={wrap(RaceDetail)} />
          <Route path="/registro"    element={wrap(RegistrationForm)} />
          <Route path="/resultados"  element={wrap(ResultsSection)} />

          {/* ── DORSAL — PNG Canvas 2D, maneja carrera y caninata ── */}
          <Route path="/dorsal" element={wrap(DorsalPage)} />

          {/* ── [V7.9-2] DASHBOARD CLIENTE CANINATA — PIN-based ── */}
          <Route path="/caninata" element={wrap(CaninataDashboard)} />

          {/* ── TELEMETRÍA GPS ── */}
          <Route path="/tracker"      element={wrap(TrackerLanding)} />
          <Route path="/tracker/:bib" element={<TrackerPage />} />

          {/* ── PORTAL DEL ATLETA ── */}
          <Route path="/acceso" element={wrap(AthleteAuth)} />
          <Route path="/perfil" element={wrap(AthleteProfile)} />

          {/* ── ACCESO ADMINISTRATIVO ── */}
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
                <Navigate to="/admin-dashboard" replace />
              ) : (
                <AdminLogin />
              )
            }
          />

          {/* ── DASHBOARD ADMIN ── */}
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

          {/* ── 404 ── */}
          <Route path="*" element={wrap(NotFound)} />

        </Routes>
      </main>

      {!isAdminRoute && <Footer />}

    </div>
  );
};

// ── App root ─────────────────────────────────────────────────────────────────
const App = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
          <RaceSignalProvider eventName="WE RUN 10K NIGHT FEST">
            <AppContent session={session} loading={loading} />
          </RaceSignalProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
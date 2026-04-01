import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  ShieldCheck, 
  Map as MapIcon, 
  Trophy, 
  PlusCircle, 
  Settings, 
  LogOut,
  Activity,
  ChevronRight
} from 'lucide-react';

// Importación de sub-componentes modulares
import { RaceForm } from '../components/admin/RaceForm';
import { RouteConfig } from '../components/admin/RouteConfig';
import { ResultsTable } from '../components/admin/ResultsTable';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('carreras');
  const [session, setSession] = useState<any>(null);

  // Verificación de sesión Valkyron Secure
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const glassStyle = "bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-[0_8px_32px_0_rgba(0,229,255,0.1)]";

  return (
    <div className="min-h-screen bg-[#050a0f] text-white p-4 md:p-8 font-sans selection:bg-cyan-500/30">
      
      {/* Header Valkyron Grade */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-cyan-500 p-2 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.5)]">
            <ShieldCheck size={24} className="text-black" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter uppercase italic">Rayo Cero HQ</h1>
            <p className="text-[10px] text-cyan-500 tracking-[0.2em] font-bold uppercase">Valkyron Secure-ID: MG==</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
            <p className="text-[10px] text-gray-500 font-bold uppercase">Status Operativo</p>
            <p className="text-xs text-green-400 font-mono animate-pulse">● EN LÍNEA</p>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-full border border-red-500/20 transition-all group"
          >
            <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" /> 
            <span className="text-xs font-black tracking-widest uppercase">Salir</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Sidebar de Navegación */}
        <nav className={`lg:col-span-3 flex flex-col gap-2 ${glassStyle} h-fit`}>
          <h2 className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] mb-4 px-2">Sistema_MIA_Kernel</h2>
          
          {[
            { id: 'carreras', icon: <PlusCircle size={18} />, label: 'Gestión Eventos' },
            { id: 'rutas', icon: <MapIcon size={18} />, label: 'Vectores de Ruta' },
            { id: 'tiempos', icon: <Trophy size={18} />, label: 'Ranking / Tiempos' },
            { id: 'config', icon: <Settings size={18} />, label: 'Parámetros' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center justify-between p-4 rounded-xl transition-all group ${
                activeTab === item.id 
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' 
                : 'hover:bg-white/5 text-gray-400 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3 font-bold text-sm uppercase tracking-tighter">
                {item.icon} {item.label}
              </div>
              <ChevronRight size={14} className={`${activeTab === item.id ? 'opacity-100' : 'opacity-0'} transition-opacity`} />
            </button>
          ))}
        </nav>

        {/* Content Area Principal */}
        <main className="lg:col-span-9 flex flex-col gap-6">
          
          {/* Módulo Dinámico basado en Pestaña */}
          <section className={`${glassStyle} min-h-[500px]`}>
            {activeTab === 'carreras' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-8">
                  <h3 className="text-xl font-black italic uppercase flex items-center gap-2">
                    <PlusCircle className="text-cyan-500" /> Desplegar Nueva Carrera
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">Añadir tarjetas al Liquid-Race-Flow público</p>
                </div>
                <RaceForm />
              </div>
            )}

            {activeTab === 'rutas' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-8">
                  <h3 className="text-xl font-black italic uppercase flex items-center gap-2">
                    <MapIcon className="text-cyan-500" /> Configuración de Trayectoria
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">Coordenadas de precisión para mapas interactivos</p>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  <RouteConfig />
                  
                  {/* Preview de Telemetría Visual */}
                  <div className="bg-black/40 border border-cyan-500/10 rounded-2xl flex flex-col items-center justify-center p-8 relative overflow-hidden">
                    <div className="absolute inset-0 bg-grid-white/[0.02] bg-[length:20px_20px]"></div>
                    <Activity className="text-cyan-500 mb-4 animate-pulse" size={40} />
                    <span className="text-[10px] font-black text-cyan-500/60 uppercase tracking-[0.4em]">Awaiting_Data_Packet...</span>
                    <div className="mt-4 w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-500 w-1/3 animate-infinite-scroll"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'tiempos' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-8 flex justify-between items-end">
                  <div>
                    <h3 className="text-xl font-black italic uppercase flex items-center gap-2">
                      <Trophy className="text-cyan-500" /> Registro de Resultados
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">Sincronización de dorsales y tiempos de meta</p>
                  </div>
                  <div className="text-[10px] font-mono text-cyan-500/50">SQL_FETCH_LATENCY: 12ms</div>
                </div>
                <ResultsTable />
              </div>
            )}

            {activeTab === 'config' && (
              <div className="flex items-center justify-center h-[400px] text-gray-600">
                <div className="text-center">
                  <Settings size={48} className="mx-auto mb-4 opacity-20" />
                  <p className="uppercase font-black tracking-widest text-xs italic">Módulo de Configuración Restringido</p>
                </div>
              </div>
            )}
          </section>

        </main>
      </div>

      {/* Footer Valkyron */}
      <footer className="mt-12 py-6 border-t border-white/5 text-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
          <p className="text-[9px] text-gray-600 font-black tracking-[0.6em] uppercase">
            Valkyron Group Deployment Unit © 2026
          </p>
        </div>
      </footer>
    </div>
  );
};

export default AdminDashboard;
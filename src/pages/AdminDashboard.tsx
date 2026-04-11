/**
 * RAYO CERO — ADMIN HQ DASHBOARD (FINAL STABLE BUILD V20.0)
 * Senior Dev: MIA (Valkyron Group)
 * CEO: Lualdo Sciscioli
 * Grado: Militar / Operativo
 * REGLA DE ORO: Código completo sin omisiones. Base mantenida y evolucionada.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { 
  ShieldCheck, 
  Map as MapIcon, 
  Trophy, 
  PlusCircle, 
  Settings, 
  LogOut,
  Activity,
  ChevronRight,
  Banknote,
  RefreshCw,
  Save,
  CheckCircle,
  Search,
  User,
  CreditCard,
  Calendar,
  Filter,
  Fingerprint,
  Database,
  AlertTriangle
} from 'lucide-react';

// Importación de sub-componentes modulares
import { RaceForm } from '../components/admin/RaceForm';
import { RouteConfig } from '../components/admin/RouteConfig';
import { ResultsTable } from '../components/admin/ResultsTable';

// ─── SUB-COMPONENTE 1: CONTROL DE DIVISA BCV ───
const TasaConfig = () => {
  const [tasaActual, setTasaActual] = useState<number | null>(null);
  const [nuevaTasa, setNuevaTasa] = useState<string>('');
  const [ultimaActualizacion, setUltimaActualizacion] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  useEffect(() => {
    fetchTasa();
  }, []);

  const fetchTasa = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('tasa_bcv, ultima_actualizacion')
        .eq('id', 1)
        .single();

      if (error) throw error;
      
      if (data) {
        setTasaActual(data.tasa_bcv);
        setNuevaTasa(data.tasa_bcv.toString());
        setUltimaActualizacion(new Date(data.ultima_actualizacion).toLocaleString('es-VE'));
      }
    } catch (error) {
      console.error("Error obteniendo tasa:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTasa = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const parsedTasa = parseFloat(nuevaTasa.replace(',', '.'));
      if (isNaN(parsedTasa) || parsedTasa <= 0) throw new Error("Valor inválido");

      const { error } = await supabase
        .from('system_config')
        .update({ 
          tasa_bcv: parsedTasa,
          ultima_actualizacion: new Date().toISOString()
        })
        .eq('id', 1);

      if (error) throw error;

      await fetchTasa();
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 3000);
    } catch (error) {
      alert("Error táctico: Verifique el formato de la tasa");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
      <div className="bg-black/40 border border-cyan-500/20 rounded-2xl p-8 relative">
        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
            <Banknote className="h-32 w-32 text-cyan-400" />
        </div>
        <h4 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
          <Settings size={18} className="text-cyan-400" /> Ajuste Manual de Divisa
        </h4>
        <form onSubmit={handleUpdateTasa} className="space-y-6 relative z-10 text-left">
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400 mb-2 block">Tasa BCV (Bs por USD)</label>
            <input 
              type="text" 
              value={nuevaTasa}
              onChange={(e) => setNuevaTasa(e.target.value)}
              className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-5 py-4 text-xl font-bold text-white focus:outline-none focus:border-cyan-400 font-mono"
            />
          </div>
          <button 
            type="submit" 
            disabled={isSaving || isLoading}
            className="w-full flex items-center justify-center gap-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black px-6 py-4 text-xs font-black uppercase tracking-[0.2em] transition-all"
          >
            {isSaving ? <RefreshCw className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />}
            {isSaving ? 'ACTUALIZANDO PROTOCOLO...' : 'ESTABLECER NUEVA TASA'}
          </button>
          {successMsg && (
            <div className="flex items-center gap-2 text-green-400 justify-center mt-4">
              <CheckCircle size={16} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Sincronización Exitosa</span>
            </div>
          )}
        </form>
      </div>
      <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-2xl flex flex-col justify-center p-8 text-center backdrop-blur-md">
        <h4 className="text-[10px] font-black text-cyan-500/60 uppercase tracking-[0.3em] mb-4">Valor Operativo Actual</h4>
        {isLoading ? (
          <div className="flex justify-center"><Activity className="animate-pulse text-cyan-500" size={48} /></div>
        ) : (
          <>
            <div className="text-6xl font-black italic tracking-tighter text-white drop-shadow-[0_0_15px_rgba(0,242,255,0.4)] font-mono">
              {tasaActual?.toFixed(2)}
            </div>
            <div className="mt-4 inline-flex flex-col items-center gap-1 bg-black/30 px-4 py-2 rounded-lg border border-white/5">
               <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">Última Sincronización</span>
               <span className="text-[10px] text-cyan-400 font-mono">{ultimaActualizacion || 'Desconocida'}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─── SUB-COMPONENTE 2: PROTOCOLO DE VALIDACIÓN RUNNER (v20.0) ───
const RunnerValidador = () => {
  const [search, setSearch] = useState('');
  const [runners, setRunners] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorStatus, setErrorStatus] = useState<boolean>(false);

  // Lógica de Checksum para validación rápida visual
  const getChecksum = (cedula: string) => {
    if(!cedula) return 0;
    return cedula.split('').reduce((a, b) => parseInt(a.toString()) + (parseInt(b) || 0), 0) % 9;
  };

  const fetchRunners = useCallback(async () => {
    setLoading(true);
    setErrorStatus(false);
    try {
      // APUNTANDO A LA TABLA REAL: 'runner'
      let query = supabase
        .from('runner')
        .select('nombre, apellido, cedula, referencia_pago, created_at, bib_number, categoria')
        .order('created_at', { ascending: false });

      if (search) {
        query = query.or(`nombre.ilike.%${search}%,apellido.ilike.%${search}%,cedula.ilike.%${search}%,referencia_pago.ilike.%${search}%`);
      }

      const { data, error } = await query.limit(15);
      
      if (error) {
        // Fallback táctico en caso de tabla pluralizada
        const fallback = await supabase
          .from('runners')
          .select('*')
          .or(`nombre.ilike.%${search}%,apellido.ilike.%${search}%,cedula.ilike.%${search}%`)
          .limit(10);
        
        if (fallback.error) throw new Error("Recurso no encontrado");
        setRunners(fallback.data || []);
      } else {
        setRunners(data || []);
      }
    } catch (e) {
      setErrorStatus(true);
      console.error("Critical Fetch Error:", e);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => fetchRunners(), 500);
    return () => clearTimeout(timer);
  }, [fetchRunners]);

  return (
    <div className="bg-black/40 border border-cyan-500/20 rounded-2xl p-6 relative overflow-hidden text-left">
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Database size={80} /></div>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h4 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
            <Fingerprint size={18} className="text-cyan-400" /> Validación de Kits
          </h4>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Telemetría directa de la tabla runner_production</p>
        </div>
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-cyan-400 transition-colors" size={16} />
          <input 
            type="text"
            placeholder="CÉDULA, NOMBRE O PAGO..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-xs font-bold uppercase tracking-widest focus:border-cyan-400 outline-none transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {errorStatus ? (
          <div className="bg-red-500/10 border border-red-500/30 p-6 rounded-xl flex items-center gap-4 text-red-500">
            <AlertTriangle size={20} />
            <span className="text-[10px] font-black uppercase tracking-widest">Falla de Enlace 404: Verifique el nombre de la tabla en Supabase</span>
          </div>
        ) : loading ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <RefreshCw className="animate-spin text-cyan-500" />
            <span className="text-[10px] font-mono text-cyan-500 animate-pulse uppercase tracking-[0.4em]">Sincronizando_Runner_Hangar...</span>
          </div>
        ) : runners.length > 0 ? (
          runners.map((r, idx) => (
            <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-white/[0.05] transition-all">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-cyan-500 flex items-center justify-center border border-cyan-500/20 text-black font-black text-xs">
                  {getChecksum(r.cedula)}
                </div>
                <div>
                  <h5 className="text-sm font-black uppercase italic leading-none mb-1">{r.nombre} {r.apellido}</h5>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-cyan-500/70">V-{r.cedula}</span>
                    <span className="text-[8px] bg-white/5 px-2 py-0.5 rounded text-gray-500 font-bold uppercase">{r.categoria || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:flex items-center gap-8 w-full md:w-auto">
                <div className="flex flex-col">
                  <span className="text-[8px] text-gray-500 font-black uppercase mb-1 italic">Ref_Pago</span>
                  <div className="flex items-center gap-2 text-xs font-mono text-green-400">
                    <CreditCard size={14} />
                    {r.referencia_pago || 'PENDIENTE'}
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-[8px] text-gray-500 font-black uppercase mb-1 italic">Fecha_Insc</span>
                  <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
                    <Calendar size={14} />
                    {r.created_at ? new Date(r.created_at).toLocaleDateString('es-VE') : 'S/F'}
                  </div>
                </div>
                <div className="flex flex-col items-end min-w-[60px]">
                  <span className="text-[8px] text-cyan-500 font-black uppercase italic">Dorsal</span>
                  <span className="text-xl font-black text-white italic">#{r.bib_number || '---'}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-12 text-center border border-dashed border-white/10 rounded-xl">
            <Activity size={32} className="mx-auto text-gray-800 mb-4" />
            <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.4em]">Esperando Datos Operativos</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── COMPONENTE PRINCIPAL: ADMIN HQ ───
const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('carreras');
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const glassStyle = "bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]";

  return (
    <div className="min-h-screen bg-[#02060a] text-white p-4 md:p-8 font-sans selection:bg-cyan-500/30">
      
      {/* Header Valkyron Grade */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4 border-b border-white/5 pb-8">
        <div className="flex items-center gap-3">
          <div className="bg-cyan-500 p-2 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.5)] rotate-2">
            <ShieldCheck size={24} className="text-black" />
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-black tracking-tighter uppercase italic bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">Rayo Cero HQ</h1>
            <p className="text-[10px] text-cyan-500 tracking-[0.4em] font-bold uppercase">Terminal_Valkyron_v20.0</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
            <p className="text-[10px] text-gray-600 font-black uppercase">Status</p>
            <p className="text-xs text-green-400 font-mono animate-pulse">● ONLINE_SECURE</p>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500 hover:text-black text-red-500 px-6 py-2.5 rounded-xl border border-red-500/20 transition-all font-black text-[10px] uppercase tracking-widest"
          >
            <LogOut size={16} /> Salir
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
        
        {/* Sidebar de Navegación */}
        <nav className={`lg:col-span-3 flex flex-col gap-2 ${glassStyle} h-fit`}>
          <h2 className="text-gray-500 text-[9px] font-black uppercase tracking-[0.5em] mb-4 px-2 italic">Intelligence_Kernel</h2>
          
          {[
            { id: 'carreras', icon: <PlusCircle size={18} />, label: 'Gestión Eventos' },
            { id: 'rutas', icon: <MapIcon size={18} />, label: 'Vectores Ruta' },
            { id: 'tiempos', icon: <Trophy size={18} />, label: 'Ranking Meta' },
            { id: 'finanzas', icon: <Banknote size={18} />, label: 'Finanzas & Kits' },
            { id: 'config', icon: <Settings size={18} />, label: 'Parámetros' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center justify-between p-4 rounded-xl transition-all group ${
                activeTab === item.id 
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' 
                : 'hover:bg-white/5 text-gray-400 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3 font-black text-xs uppercase tracking-tighter">
                {item.icon} {item.label}
              </div>
              <ChevronRight size={14} className={`${activeTab === item.id ? 'opacity-100' : 'opacity-0'}`} />
            </button>
          ))}
        </nav>

        {/* Content Area Principal */}
        <main className="lg:col-span-9 flex flex-col gap-6">
          <section className={`${glassStyle} min-h-[550px]`}>
            {activeTab === 'carreras' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-8">
                  <h3 className="text-xl font-black italic uppercase flex items-center gap-2">
                    <PlusCircle className="text-cyan-500" /> Desplegar Nueva Carrera
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">Sincronización masiva de eventos</p>
                </div>
                <RaceForm />
              </div>
            )}

            {activeTab === 'rutas' && <RouteConfig />}

            {activeTab === 'tiempos' && <ResultsTable />}

            {activeTab === 'finanzas' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-8 border-l-4 border-cyan-500 pl-6">
                  <h3 className="text-xl font-black italic uppercase flex items-center gap-2">
                    <Banknote className="text-cyan-500" /> Centro de Operaciones Financieras
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">Validación de Inscritos y Tasa BCV</p>
                </div>
                
                <TasaConfig />
                <RunnerValidador />
              </div>
            )}

            {activeTab === 'config' && (
              <div className="flex flex-col items-center justify-center h-[400px] border-2 border-dashed border-white/5 rounded-3xl opacity-20">
                <Settings size={48} className="mb-4" />
                <p className="uppercase font-black tracking-[0.6em] text-[10px]">Restricted_Access_Terminal</p>
              </div>
            )}
          </section>
        </main>
      </div>

      <footer className="mt-20 py-10 border-t border-white/5 flex flex-col items-center gap-4 opacity-50">
          <p className="text-[9px] text-gray-600 font-black tracking-[0.8em] uppercase">
            Valkyron Group HQ Deployment © 2026
          </p>
      </footer>
    </div>
  );
};

export default AdminDashboard;
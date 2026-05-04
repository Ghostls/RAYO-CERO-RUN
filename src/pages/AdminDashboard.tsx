/**
 * RAYO CERO — ADMIN HQ DASHBOARD (STABLE BUILD V23.6_CLEAN_PUSH)
 * Senior Dev: MIA (Valkyron Group)
 * CEO: Lualdo Sciscioli
 * Grado: Militar / Operativo
 * 
 * FIX FINAL: 
 * - Eliminación de colisiones de CSS (text-white vs text-gray) en líneas 584 y 621.
 * - Fusión completa de Telemetría COMMS + HARD PURGE.
 * - Doble redundancia de tablas mantenida.
 * 
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
  AlertTriangle,
  Users,
  Download,
  Mail,
  CheckSquare,
  Clock,
  Phone,
  Trash2,
  X
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 text-left">
      <div className="bg-black/40 border border-cyan-500/20 rounded-2xl p-8 relative">
        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
            <Banknote className="h-32 w-32 text-cyan-400" />
        </div>
        <h4 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
          <Settings size={18} className="text-cyan-400" /> Ajuste Manual de Divisa
        </h4>
        <form onSubmit={handleUpdateTasa} className="space-y-6 relative z-10">
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

// ─── SUB-COMPONENTE 2: PROTOCOLO DE VALIDACIÓN RUNNER ───
const RunnerValidador = () => {
  const [search, setSearch] = useState('');
  const [runners, setRunners] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorStatus, setErrorStatus] = useState<boolean>(false);

  const getChecksum = (cedula: string) => {
    if(!cedula) return 0;
    return cedula.split('').reduce((a, b) => parseInt(a.toString()) + (parseInt(b) || 0), 0) % 9;
  };

  const fetchRunners = useCallback(async () => {
    setLoading(true);
    setErrorStatus(false);
    try {
      let { data, error } = await supabase
        .from('runners')
        .select('nombre, apellido, cedula, referencia_pago, created_at, bib_number, categoria, telefono')
        .or(`nombre.ilike.%${search}%,apellido.ilike.%${search}%,cedula.ilike.%${search}%,referencia_pago.ilike.%${search}%`)
        .order('created_at', { ascending: false })
        .limit(15);

      if (error) {
        const fallback = await supabase
          .from('runner')
          .select('nombre, apellido, cedula, referencia_pago, created_at, bib_number, categoria, telefono')
          .or(`nombre.ilike.%${search}%,apellido.ilike.%${search}%,cedula.ilike.%${search}%,referencia_pago.ilike.%${search}%`)
          .order('created_at', { ascending: false })
          .limit(15);
        
        if (fallback.error) throw new Error("Error de enlace");
        setRunners(fallback.data || []);
      } else {
        setRunners(data || []);
      }
    } catch (e) {
      setErrorStatus(true);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => fetchRunners(), 500);
    return () => clearTimeout(timer);
  }, [fetchRunners]);

  return (
    <div className="bg-black/40 border border-cyan-500/20 rounded-2xl p-6 relative overflow-hidden text-left mb-6">
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none text-white"><Database size={80} /></div>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h4 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
            <Fingerprint size={18} className="text-cyan-400" /> Búsqueda Táctica
          </h4>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Localización rápida de unidades</p>
        </div>
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-cyan-400 transition-colors" size={16} />
          <input 
            type="text"
            placeholder="CÉDULA, NOMBRE O PAGO..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-xs font-bold uppercase tracking-widest focus:border-cyan-400 outline-none transition-all text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {errorStatus ? (
          <div className="bg-red-500/10 border border-red-500/30 p-6 rounded-xl flex items-center gap-4 text-red-500">
            <AlertTriangle size={20} />
            <span className="text-[10px] font-black uppercase tracking-widest">ERROR 404: BASE DE DATOS INACCESIBLE</span>
          </div>
        ) : loading ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <RefreshCw className="animate-spin text-cyan-500" />
            <span className="text-[10px] font-mono text-cyan-500 animate-pulse uppercase tracking-[0.4em]">Sincronizando...</span>
          </div>
        ) : runners.length > 0 ? (
          runners.map((r, idx) => (
            <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-white/[0.05] transition-all">
              <div className="flex items-center gap-4 text-white">
                <div className="h-10 w-10 rounded-lg bg-cyan-500 flex items-center justify-center border border-cyan-500/20 text-black font-black text-xs">
                  {getChecksum(r.cedula)}
                </div>
                <div>
                  <h5 className="text-sm font-black uppercase italic leading-none mb-1">{r.nombre} {r.apellido}</h5>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-cyan-500/70 italic">V-{r.cedula}</span>
                    <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1 uppercase tracking-tighter">
                      <Phone size={10} className="text-cyan-400" /> {r.telefono || 'Sin Teléfono'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[8px] text-cyan-500 font-black uppercase italic">Dorsal</span>
                <span className="text-xl font-black text-white italic">#{r.bib_number || '---'}</span>
              </div>
            </div>
          ))
        ) : (
          <div className="py-12 text-center border border-dashed border-white/10 rounded-xl">
            <p className="text-[10px] text-gray-600 font-black uppercase tracking-[0.4em]">Sin resultados en el sector</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── SUB-COMPONENTE 3: LISTADO GLOBAL DE ATLETAS ───
const AtletasList = () => {
  const [atletas, setAtletas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'confirmado' | 'pendiente'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [athleteToDelete, setAtleteToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAtletas = async () => {
    setLoading(true);
    try {
      let query = supabase.from('runners').select('*').order('created_at', { ascending: false });
      if (filterStatus === 'confirmado') query = query.not('bib_number', 'is', null);
      if (filterStatus === 'pendiente') query = query.is('bib_number', null);

      const { data, error } = await query;
      if (error) {
        let fallbackQuery = supabase.from('runner').select('*').order('created_at', { ascending: false });
        if (filterStatus === 'confirmado') fallbackQuery = fallbackQuery.not('bib_number', 'is', null);
        if (filterStatus === 'pendiente') fallbackQuery = fallbackQuery.is('bib_number', null);
        const fallback = await fallbackQuery;
        if (fallback.error) throw fallback.error;
        setAtletas(fallback.data || []);
      } else {
        setAtletas(data || []);
      }
    } catch (error) {
      console.error("Critical Error Fetching Atletas:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAthlete = async () => {
    if (!athleteToDelete) return;
    setIsDeleting(true);
    try {
      await supabase.from('race_results').delete().eq('runner_id', athleteToDelete.id);
      const { error } = await supabase.from('runners').delete().eq('id', athleteToDelete.id);
      if (error) {
        const fallback = await supabase.from('runner').delete().eq('id', athleteToDelete.id);
        if (fallback.error) throw fallback.error;
      }
      await fetchAtletas();
      setAtleteToDelete(null);
    } catch (error) {
      alert("Error en protocolo de eliminación.");
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    fetchAtletas();
  }, [filterStatus]);

  const filteredAtletas = atletas.filter(a => 
    `${a.nombre} ${a.apellido} ${a.cedula}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden text-left">
        <div className="p-6 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-white">
          <div className="flex items-center gap-4">
            {['all', 'confirmado', 'pendiente'].map(s => (
              <button 
                key={s} 
                onClick={() => setFilterStatus(s as any)}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filterStatus === s ? 'bg-cyan-500 text-black' : 'bg-white/5 text-gray-400'}`}
              >{s === 'all' ? 'Todos' : s}</button>
            ))}
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
            <input type="text" placeholder="Filtrar base..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-[10px] font-bold uppercase tracking-widest focus:border-cyan-400 outline-none" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-white">
            <thead>
              <tr className="bg-white/5">
                <th className="p-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Atleta</th>
                <th className="p-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Comunicación</th>
                <th className="p-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Categoría</th>
                <th className="p-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Dorsal</th>
                <th className="p-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={5} className="p-20 text-center animate-pulse text-cyan-500 font-mono text-[10px]">RECONSTRUYENDO...</td></tr>
              ) : filteredAtletas.length > 0 ? (
                filteredAtletas.map((atleta) => (
                  <tr key={atleta.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-4">
                      <div className="font-bold text-xs uppercase tracking-tight">{atleta.nombre} {atleta.apellido}</div>
                      <div className="text-[9px] text-gray-500 font-mono">V-{atleta.cedula}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-cyan-400 font-mono text-[10px]"><Phone size={12} /> {atleta.telefono || 'SIN_REGISTRO'}</div>
                      <div className="text-[8px] text-gray-500 font-mono uppercase mt-1 truncate max-w-[120px]">{atleta.email}</div>
                    </td>
                    <td className="p-4 text-[9px] uppercase font-bold text-gray-300">{atleta.categoria || 'Standard'}</td>
                    <td className="p-4 text-sm font-black italic text-white group-hover:text-cyan-400">
                      {atleta.bib_number ? `#${atleta.bib_number}` : '---'}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-3">
                        {atleta.bib_number ? <CheckSquare size={16} className="text-green-500" /> : <Clock size={16} className="text-yellow-500 opacity-50" />}
                        <button onClick={() => setAtleteToDelete(atleta)} className="p-1.5 rounded-md bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} className="p-20 text-center text-gray-600 font-black text-[10px] uppercase">Cero Unidades Detectadas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {athleteToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300 text-white">
          <div className="bg-[#0a0a0a] border border-red-500/30 rounded-3xl p-8 max-w-md w-full shadow-2xl text-left">
            <div className="flex justify-between items-start mb-6">
              <div className="bg-red-500/20 p-3 rounded-2xl"><AlertTriangle className="text-red-500" size={32} /></div>
              <button onClick={() => setAtleteToDelete(null)} className="text-gray-500 hover:text-white transition-colors"><X size={24} /></button>
            </div>
            <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-2">Protocolo de Expurgo</h3>
            <p className="text-gray-400 text-sm mb-8 leading-relaxed">
              Confirmando la eliminación de <span className="text-white font-bold">{athleteToDelete.nombre} {athleteToDelete.apellido}</span>. 
              Este comando es irreversible y borrará toda la telemetría asociada.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setAtleteToDelete(null)} className="px-6 py-4 rounded-2xl bg-white/5 text-gray-400 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Abortar</button>
              <button onClick={handleDeleteAthlete} disabled={isDeleting} className="px-6 py-4 rounded-2xl bg-red-500 text-black text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all flex items-center justify-center gap-2">
                {isDeleting ? <RefreshCw className="animate-spin" size={14} /> : <Trash2 size={14} />} Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ─── COMPONENTE PRINCIPAL: ADMIN HQ ───
const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('carreras');

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const glassStyle = "bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl";

  return (
    <div className="min-h-screen bg-[#02060a] text-white p-4 md:p-8 font-sans selection:bg-cyan-500/30 text-left">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4 border-b border-white/5 pb-8">
        <div className="flex items-center gap-3">
          <div className="bg-cyan-500 p-2 rounded-lg shadow-lg rotate-2 text-black"><ShieldCheck size={24} /></div>
          <div className="text-left text-white">
            <h1 className="text-2xl font-black tracking-tighter uppercase italic bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent leading-none">Rayo Cero HQ</h1>
            <p className="text-[10px] text-cyan-500 tracking-[0.4em] font-bold uppercase mt-1">Terminal_v23.6_CLEAN</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-white">
          <div className="text-right hidden md:block">
            <p className="text-[10px] text-gray-600 font-black uppercase">Status</p>
            <p className="text-xs text-green-400 font-mono animate-pulse">● ONLINE_SECURE</p>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500 hover:text-black px-6 py-2.5 rounded-xl border border-red-500/20 transition-all font-black text-[10px] uppercase tracking-widest text-white">
            <LogOut size={16} /> Salir
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
        <nav className={`lg:col-span-3 flex flex-col gap-2 ${glassStyle} h-fit text-white`}>
          <h2 className="text-gray-500 text-[9px] font-black uppercase tracking-[0.5em] mb-4 px-2 italic text-left">Intelligence_Kernel</h2>
          {[
            { id: 'carreras', icon: <PlusCircle size={18} />, label: 'Gestión Eventos' },
            { id: 'atletas', icon: <Users size={18} />, label: 'Base de Atletas' },
            { id: 'finanzas', icon: <Banknote size={18} />, label: 'Finanzas & Tasa' },
            { id: 'config', icon: <Settings size={18} />, label: 'Parámetros' }
          ].map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex items-center justify-between p-4 rounded-xl transition-all group ${activeTab === item.id ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'hover:bg-white/5 text-gray-400 border border-transparent'}`}>
              <div className="flex items-center gap-3 font-black text-xs uppercase tracking-tighter">{item.icon} {item.label}</div>
              <ChevronRight size={14} className={`${activeTab === item.id ? 'opacity-100' : 'opacity-0'}`} />
            </button>
          ))}
        </nav>

        <main className="lg:col-span-9 flex flex-col gap-6 text-white">
          <section className={`${glassStyle} min-h-[550px]`}>
            {activeTab === 'carreras' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-8 border-l-4 border-cyan-500 pl-6 text-left text-white">
                  <h3 className="text-xl font-black italic uppercase flex items-center gap-2"><PlusCircle className="text-cyan-500" /> Desplegar Evento</h3>
                </div>
                <RaceForm />
              </div>
            )}

            {activeTab === 'atletas' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-left">
                <div className="mb-8 border-l-4 border-cyan-500 pl-6 flex justify-between items-end">
                  <div>
                    <h3 className="text-xl font-black italic uppercase flex items-center gap-2 text-white"><Users className="text-cyan-500" /> Registro Global</h3>
                    <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest text-left">
                      Rescate y expurgo de telemetría operativa
                    </p>
                  </div>
                  <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-lg border border-white/10 transition-all text-white"><Download size={14} /> Exportar</button>
                </div>
                <AtletasList />
              </div>
            )}

            {activeTab === 'finanzas' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-left text-white">
                <div className="mb-8 border-l-4 border-cyan-500 pl-6">
                  <h3 className="text-xl font-black italic uppercase flex items-center gap-2 text-left"><Banknote className="text-cyan-500" /> Operaciones Financieras</h3>
                </div>
                <TasaConfig />
                <RunnerValidador />
              </div>
            )}

            {activeTab === 'config' && (
              <div className="flex flex-col items-center justify-center h-[400px] border-2 border-dashed border-white/5 rounded-3xl opacity-20 text-white">
                <Settings size={48} className="mb-4" />
                <p className="uppercase font-black tracking-[0.6em] text-[10px]">Restricted_Access_Terminal</p>
              </div>
            )}
          </section>
        </main>
      </div>

      <footer className="mt-20 py-10 border-t border-white/5 flex flex-col items-center gap-4 opacity-50">
          <p className="text-[9px] text-gray-500 font-black tracking-[0.8em] uppercase text-center">
            Valkyron Group HQ Deployment © 2026
          </p>
      </footer>
    </div>
  );
};

export default AdminDashboard;
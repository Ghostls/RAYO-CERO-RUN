/**
 * RAYO CERO — ADMIN HQ DASHBOARD (STABLE BUILD V29.5_FINAL_MERGE)
 * Senior Dev: MIA (Valkyron Group) — Protocolo de Inteligencia y Alcance Global
 * CEO: Lualdo Sciscioli
 * Grado: Militar / Operativo
 * 
 * FUSIÓN TÁCTICA:
 * - Restauración total de Inspección Visual de Comprobantes (Hangar Scan).
 * - Integración de Telemetría de Comunicación (Teléfonos en lista).
 * - Protocolo de Expurgo (Borrado de atletas) con Doble Redundancia de Tablas.
 * - Sincronización de Tasa USD y Costo de Inscripción dinámico.
 * 
 * REGLA DE ORO: Código completo sin omisiones. Base mantenida y evolucionada.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom'; 
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
  Fingerprint,
  Database,
  AlertTriangle,
  Users,
  Download,
  CheckSquare,
  Eye,
  X,
  ExternalLink,
  ShieldAlert,
  FileText,
  Trash2, 
  Phone,
  Clock
} from 'lucide-react';

// Motores de reporte
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Sub-componentes modulares
import { RaceForm } from '../components/admin/RaceForm';
import { RouteConfig } from '../components/admin/RouteConfig';
import { ResultsTable } from '../components/admin/ResultsTable';

// Identidad visual
import logoPrincipal from '../assets/logo.png';

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface Runner {
  id: string;
  nombre: string;
  apellido: string;
  cedula: string;
  email?: string;
  telefono?: string;
  referencia_pago?: string;
  created_at: string;
  bib_number?: string | number;
  categoria?: string;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const BUCKET = 'comprobantes-pago';

const getComprobantePublicUrl = async (
  cedula: string,
  referencia_pago?: string,
  storedPath?: string 
): Promise<string | null> => {
  if (storedPath && storedPath.trim() !== '') {
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(storedPath.trim());
    if (data?.publicUrl) return data.publicUrl;
  }

  let offset = 0;
  const PAGE_SIZE = 200;
  let found: string | null = null;

  while (!found) {
    const { data: files, error } = await supabase.storage
      .from(BUCKET)
      .list('', { limit: PAGE_SIZE, offset, sortBy: { column: 'name', order: 'asc' } });

    if (error || !files || files.length === 0) break;

    const match = files.find(
      (f) =>
        f.name.startsWith(`${cedula}_`) || 
        f.name.startsWith(`${cedula}.`) || 
        (referencia_pago && f.name.startsWith(`${referencia_pago}_`))
    );

    if (match) {
      found = match.name;
      break;
    }

    if (files.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  if (found) {
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(found);
    return data?.publicUrl ?? null;
  }
  return null;
};

// ─── SUB-COMPONENTE 1: CONTROL DE DIVISA Y TARIFAS ───────────────────────────

const TasaConfig = () => {
  const [tasaActual, setTasaActual] = useState<number | null>(null);
  const [nuevaTasa, setNuevaTasa] = useState<string>('');
  const [costoUSDActual, setCostoUSDActual] = useState<number | null>(null);
  const [nuevoCostoUSD, setNuevoCostoUSD] = useState<string>('');
  const [ultimaActualizacion, setUltimaActualizacion] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  useEffect(() => { fetchConfig(); }, []);

  const fetchConfig = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('tasa_bcv, costo_usd, ultima_actualizacion')
        .eq('id', 1)
        .single();

      if (error) throw error;
      if (data) {
        setTasaActual(data.tasa_bcv);
        setNuevaTasa(data.tasa_bcv.toString());
        setCostoUSDActual(data.costo_usd || 40); 
        setNuevoCostoUSD((data.costo_usd || 40).toString());
        setUltimaActualizacion(new Date(data.ultima_actualizacion).toLocaleString('es-VE'));
      }
    } catch (error) {
      console.error("Error obteniendo configuración financiera:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProtocol = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const parsedTasa = parseFloat(nuevaTasa.replace(',', '.'));
      const parsedCosto = parseFloat(nuevoCostoUSD.replace(',', '.'));
      if (isNaN(parsedTasa) || parsedTasa <= 0) throw new Error("Tasa inválida");
      const { error } = await supabase
        .from('system_config')
        .update({ 
          tasa_bcv: parsedTasa,
          costo_usd: parsedCosto,
          ultima_actualizacion: new Date().toISOString()
        })
        .eq('id', 1);
      if (error) throw error;
      await fetchConfig();
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 3000);
    } catch (err: any) {
      alert(`Error táctico: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 text-left">
      <div className="bg-black/40 border border-cyan-500/20 rounded-2xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
          <Banknote className="h-32 w-32 text-cyan-400" />
        </div>
        <h4 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
          <Settings size={18} className="text-cyan-400" /> Parámetros Financieros
        </h4>
        <form onSubmit={handleUpdateProtocol} className="space-y-6 relative z-10">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400 mb-2 block">Tasa BCV (Bs)</label>
              <input type="text" value={nuevaTasa} onChange={(e) => setNuevaTasa(e.target.value)}
                className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-5 py-4 text-xl font-bold text-white focus:outline-none focus:border-cyan-400 font-mono" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400 mb-2 block">Inscripción ($)</label>
              <input type="text" value={nuevoCostoUSD} onChange={(e) => setNuevoCostoUSD(e.target.value)}
                className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-5 py-4 text-xl font-bold text-white focus:outline-none focus:border-cyan-400 font-mono" />
            </div>
          </div>
          <button type="submit" disabled={isSaving || isLoading}
            className="w-full flex items-center justify-center gap-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black px-6 py-4 text-xs font-black uppercase tracking-[0.2em] transition-all">
            {isSaving ? <RefreshCw className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />}
            {isSaving ? 'ACTUALIZANDO PROTOCOLO...' : 'SINCRONIZAR CONFIGURACIÓN'}
          </button>
          {successMsg && (
            <div className="flex items-center gap-2 text-green-400 justify-center mt-4">
              <CheckCircle size={16} /><span className="text-[10px] font-bold uppercase tracking-widest">Sincronización Exitosa</span>
            </div>
          )}
        </form>
      </div>
      <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-2xl flex flex-col justify-center p-8 text-center backdrop-blur-md">
        <h4 className="text-[10px] font-black text-cyan-500/60 uppercase tracking-[0.3em] mb-4">Estado Operativo Actual</h4>
        {isLoading ? (
          <div className="flex justify-center"><Activity className="animate-pulse text-cyan-500" size={48} /></div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-around items-center">
               <div>
                  <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mb-1">Tasa BCV</p>
                  <div className="text-4xl font-black italic text-white font-mono">{tasaActual?.toFixed(2)}</div>
               </div>
               <div className="h-12 w-[1px] bg-white/10" />
               <div>
                  <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mb-1">Inscripción</p>
                  <div className="text-4xl font-black italic text-cyan-400 font-mono">${costoUSDActual}</div>
               </div>
            </div>
            <div className="mt-4 inline-flex flex-col items-center gap-1 bg-black/30 px-4 py-2 rounded-lg border border-white/5 w-full">
               <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">Última Sincronización</span>
               <span className="text-[10px] text-cyan-400 font-mono">{ultimaActualizacion || 'Desconocida'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── SUB-COMPONENTE 2: PROTOCOLO DE VALIDACIÓN RUNNER ────────────────────────

const RunnerValidador = () => {
  const [search, setSearch] = useState('');
  const [runners, setRunners] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorStatus, setErrorStatus] = useState<boolean>(false);

  const getChecksum = (cedula: string) => {
    if(!cedula) return 0;
    return (cedula.split('').reduce((a, b) => a + (parseInt(b) || 0), 0) % 9);
  };

  const fetchRunners = useCallback(async () => {
    setLoading(true);
    setErrorStatus(false);
    try {
      const filter = `nombre.ilike.%${search}%,apellido.ilike.%${search}%,cedula.ilike.%${search}%,referencia_pago.ilike.%${search}%`;
      const { data, error } = await supabase.from('runners').select('*').or(filter).order('created_at', { ascending: false }).limit(15);
      if (error) {
        const fallback = await supabase.from('runner').select('*').or(filter).order('created_at', { ascending: false }).limit(15);
        if (fallback.error) throw new Error("Error enlace");
        setRunners(fallback.data || []);
      } else {
        setRunners(data || []);
      }
    } catch { setErrorStatus(true); } finally { setLoading(false); }
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
          <input type="text" placeholder="CÉDULA, NOMBRE O PAGO..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-xs font-bold uppercase tracking-widest focus:border-cyan-400 text-white outline-none transition-all" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {errorStatus ? (
          <div className="bg-red-500/10 border border-red-500/30 p-6 rounded-xl flex items-center gap-4 text-red-400">
            <AlertTriangle size={20} /><span className="text-[10px] font-black uppercase tracking-widest">ERROR 404: BASE DE DATOS INACCESIBLE</span>
          </div>
        ) : loading ? (
          <div className="py-20 flex flex-col items-center gap-3">
            <RefreshCw className="animate-spin text-cyan-500" /><span className="text-[10px] font-mono text-cyan-500 animate-pulse uppercase tracking-[0.4em]">Sincronizando...</span>
          </div>
        ) : runners.length > 0 ? (
          runners.map((r, idx) => (
            <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-white/[0.05] transition-all text-white">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-cyan-500 flex items-center justify-center border border-cyan-400/20 text-black font-black text-xs shrink-0">{getChecksum(r.cedula)}</div>
                <div>
                  <h5 className="text-sm font-black uppercase italic leading-none mb-1">{r.nombre} {r.apellido}</h5>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-cyan-500/70">V-{r.cedula}</span>
                    <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1 uppercase tracking-tighter">
                      <Phone size={10} className="text-cyan-400" /> {r.telefono || 'Sin Registro'}
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

// ─── SUB-COMPONENTE 3: LISTADO GLOBAL DE ATLETAS CON SIGMA CORE ──────────────

const AtletasList = () => {
  const [atletas, setAtletas] = useState<Runner[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'confirmado' | 'pendiente'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAtleta, setSelectedAtleta] = useState<Runner | null>(null);
  const [comprobanteUrl, setComprobanteUrl] = useState<string | null>(null);
  const [imgLoading, setImgLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [athleteToDelete, setAthleteToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAtletas = async () => {
    setLoading(true);
    try {
      let q = supabase.from('runners').select('*').order('created_at', { ascending: false });
      if (filterStatus === 'confirmado') q = q.not('bib_number', 'is', null);
      if (filterStatus === 'pendiente') q = q.is('bib_number', null);
      const { data, error } = await q;
      if (error) {
        let fallbackQ = supabase.from('runner').select('*').order('created_at', { ascending: false });
        if (filterStatus === 'confirmado') fallbackQ = fallbackQ.not('bib_number', 'is', null);
        if (filterStatus === 'pendiente') fallbackQ = fallbackQ.is('bib_number', null);
        const fb = await fallbackQ;
        setAtletas(fb.data || []);
      } else { setAtletas(data || []); }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleDeleteAthlete = async () => {
    if (!athleteToDelete) return;
    setIsDeleting(true);
    try {
      await supabase.from('race_results').delete().eq('runner_id', athleteToDelete.id);
      const { error } = await supabase.from('runners').delete().eq('id', athleteToDelete.id);
      if (error) await supabase.from('runner').delete().eq('id', athleteToDelete.id);
      await fetchAtletas();
      setAthleteToDelete(null);
    } catch (err) { alert("Fallo en purga."); } finally { setIsDeleting(false); }
  };

  useEffect(() => { fetchAtletas(); }, [filterStatus]);

  useEffect(() => {
    document.body.style.overflow = (selectedAtleta || athleteToDelete) ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [selectedAtleta, athleteToDelete]);

  const filteredAtletas = atletas.filter((a) =>
    `${a.nombre} ${a.apellido} ${a.cedula}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportToPDF = () => {
    const doc = new jsPDF();
    const timestamp = new Date().toLocaleString('es-VE');
    const img = new Image(); img.src = logoPrincipal;
    doc.addImage(img, 'PNG', 14, 10, 30, 10);
    doc.setFontSize(18); doc.setTextColor(6, 182, 212); 
    doc.text('RAYOCERO — REPORTE DE INTELIGENCIA ATLETAS', 14, 30);
    doc.setFontSize(10); doc.setTextColor(100);
    doc.text(`Grado: Operativo / Generado: ${timestamp}`, 14, 38);
    const tableRows = filteredAtletas.map(a => [a.nombre + ' ' + a.apellido, `V-${a.cedula}`, a.telefono || 'N/A', a.bib_number ? `#${a.bib_number}` : '---', a.categoria || 'N/A']);
    autoTable(doc, {
      startY: 50, head: [['Unidad Atleta', 'ID Operativo', 'Comunicación', 'Dorsal', 'Categoría']], body: tableRows,
      headStyles: { fillColor: [6, 182, 212], textColor: 255, fontStyle: 'bold' }, styles: { fontSize: 8, font: 'helvetica' },
    });
    doc.save(`RAYOCERO_INTEL_${Date.now()}.pdf`);
  };

  const inspectComprobante = async (atleta: Runner) => {
    setSelectedAtleta(atleta); setComprobanteUrl(null); setImgLoading(true); setStatusMsg('Escaneando hangar...');
    try {
      const storedPath = (atleta as any).comprobante_url ?? (atleta as any).comprobante_path ?? undefined;
      const url = await getComprobantePublicUrl(atleta.cedula, atleta.referencia_pago, storedPath);
      if (!url) { setStatusMsg(`Archivo no detectado — V-${atleta.cedula}`); setImgLoading(false); return; }
      setComprobanteUrl(url); setStatusMsg('');
    } catch { setStatusMsg('Error enlace visual'); } finally { setImgLoading(false); }
  };

  return (
    <div className="relative text-white">
      <div className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden text-left">
        <div className="p-6 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            {(['all', 'confirmado', 'pendiente'] as const).map((s) => (
              <button key={s} onClick={() => setFilterStatus(s)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filterStatus === s ? 'bg-cyan-500 text-black shadow-lg' : 'bg-white/5 text-gray-400'}`}>
                {s === 'all' ? 'Todos' : s}
              </button>
            ))}
            <button onClick={exportToPDF} className="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest bg-white/5 text-cyan-400 border border-cyan-400/20 hover:bg-cyan-400 hover:text-black flex items-center gap-2"><FileText size={14} /> Exportar</button>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
            <input type="text" placeholder="Filtrar base..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-[10px] font-bold uppercase tracking-widest focus:border-cyan-400 outline-none" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5">
                {['Atleta', 'Comunicación', 'Categoría', 'Dorsal', 'Acciones'].map((h, i) => (
                  <th key={h} className={`p-4 text-[9px] font-black text-gray-400 uppercase tracking-widest ${i === 4 ? 'text-center' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={5} className="p-20 text-center animate-pulse text-cyan-500 font-mono text-[10px]">RECONSTRUYENDO...</td></tr>
              ) : filteredAtletas.length > 0 ? (
                filteredAtletas.map((a) => (
                  <tr key={a.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-4">
                      <div className="font-bold text-xs uppercase tracking-tight">{a.nombre} {a.apellido}</div>
                      <div className="text-[9px] text-gray-500 font-mono">V-{a.cedula}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-cyan-400 font-mono text-[10px]"><Phone size={12} /> {a.telefono || 'SIN_TLF'}</div>
                      <div className="text-[8px] text-gray-500 font-mono uppercase mt-1 truncate max-w-[120px]">{a.email}</div>
                    </td>
                    <td className="p-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">{a.categoria || 'Standard'}</td>
                    <td className="p-4 text-sm font-black italic text-white group-hover:text-cyan-400 transition-colors">
                      {a.bib_number ? `#${a.bib_number}` : ( <Clock size={14} className="text-yellow-500/50" /> )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => inspectComprobante(a)} className="p-2 rounded-lg bg-white/5 hover:bg-cyan-500 hover:text-black transition-all"><Eye size={16} /></button>
                        <button onClick={() => alert('Validar unidad...')} className="p-2 rounded-lg bg-white/5 hover:bg-green-500 hover:text-black text-green-500 transition-all"><CheckSquare size={16} /></button>
                        <button onClick={() => setAthleteToDelete(a)} className="p-2 rounded-lg bg-white/5 hover:bg-red-500 hover:text-black text-red-500 transition-all"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : ( <tr><td colSpan={5} className="p-20 text-center text-gray-600 font-black text-[10px] uppercase">Cero Unidades Detectadas</td></tr> )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE INSPECCIÓN VISUAL (STABLE V29.5) */}
      {selectedAtleta && createPortal(
        <div onClick={() => setSelectedAtleta(null)} className="fixed inset-0 z-[999999] flex items-center justify-center p-5 bg-black/95 backdrop-blur-md animate-in fade-in duration-300">
          <div onClick={(e) => e.stopPropagation()} className="bg-[#0a0f14] border border-cyan-400/20 rounded-[24px] w-full max-w-[1100px] height-[85vh] flex flex-row overflow-hidden shadow-2xl">
            <div className="flex-1 bg-black flex items-center justify-center p-8 relative">
              {imgLoading ? (
                <div className="text-center"><RefreshCw className="animate-spin text-cyan-400 mb-2" size={32} /><p className="text-[10px] text-cyan-400 font-mono uppercase tracking-widest">Enlazando...</p></div>
              ) : comprobanteUrl ? (
                <img src={comprobanteUrl} className="max-w-full max-h-full object-contain rounded-lg" alt="comprobante" />
              ) : (
                <div className="text-center"><ShieldAlert size={48} className="text-gray-800 mb-2" /><p className="text-[10px] text-gray-600 font-mono">{statusMsg || 'SIN RECURSO'}</p></div>
              )}
            </div>
            <div className="w-[320px] bg-[#0d1319] border-l border-white/5 p-8 flex flex-col gap-6">
              <div className="flex justify-between items-start">
                <div><h5 className="text-white font-black text-xl italic uppercase m-0 leading-none">Inspección</h5><p className="text-cyan-400 text-[9px] font-bold uppercase tracking-[2px] mt-1">Protocolo_Validación</p></div>
                <button onClick={() => setSelectedAtleta(null)} className="p-2 bg-white/5 rounded-full text-gray-500 hover:text-white"><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <p className="text-gray-500 text-[9px] uppercase font-black mb-1">Unidad Atleta</p>
                  <p className="text-white font-black text-sm uppercase leading-tight">{selectedAtleta.nombre} {selectedAtleta.apellido}</p>
                  <p className="text-cyan-400 font-mono text-xs mt-1">V-{selectedAtleta.cedula}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <p className="text-gray-500 text-[9px] uppercase font-black mb-1">Contacto Operativo</p>
                  <p className="text-white font-black text-sm font-mono">{selectedAtleta.telefono || 'SIN TLF'}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <p className="text-gray-500 text-[9px] uppercase font-black mb-1">Referencia</p>
                  <p className="text-green-400 font-mono font-black text-sm break-all">{selectedAtleta.referencia_pago || 'PENDIENTE'}</p>
                </div>
              </div>
              <div className="mt-auto flex flex-col gap-3">
                <button onClick={() => alert('Aprobando...')} className="w-full py-4 rounded-xl bg-cyan-400 text-black font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-cyan-300 transition-all"><CheckSquare size={16} /> Aprobar Unidad</button>
              </div>
            </div>
          </div>
        </div>, document.body
      )}

      {/* MODAL DE EXPURGO (STABLE V23.6) */}
      {athleteToDelete && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#0a0a0a] border border-red-500/30 rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-start mb-6">
              <div className="bg-red-500/20 p-3 rounded-2xl"><AlertTriangle className="text-red-500" size={32} /></div>
              <button onClick={() => setAthleteToDelete(null)} className="text-gray-500 hover:text-white"><X size={24} /></button>
            </div>
            <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-2 text-white text-left">Protocolo de Expurgo</h3>
            <p className="text-gray-400 text-sm mb-8 leading-relaxed text-left">Confirmando eliminación de <span className="text-white font-bold">{athleteToDelete.nombre} {athleteToDelete.apellido}</span>. Irreversible.</p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setAthleteToDelete(null)} className="px-6 py-4 rounded-2xl bg-white/5 text-gray-400 text-[10px] font-black uppercase tracking-widest hover:bg-white/10">Abortar</button>
              <button onClick={handleDeleteAthlete} disabled={isDeleting} className="px-6 py-4 rounded-2xl bg-red-500 text-black text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-600 transition-all">
                {isDeleting ? <RefreshCw className="animate-spin" size={14} /> : <Trash2 size={14} />} Confirmar
              </button>
            </div>
          </div>
        </div>, document.body
      )}
    </div>
  );
};

// ─── COMPONENTE PRINCIPAL: ADMIN HQ ──────────────────────────────────────────

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('atletas');
  const handleLogout = async () => { await supabase.auth.signOut(); window.location.href = '/'; };
  const glassStyle = 'bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl';

  return (
    <div className="min-h-screen bg-[#02060a] text-white p-4 md:p-8 font-sans selection:bg-cyan-500/30 text-left">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4 border-b border-white/5 pb-8">
        <div className="flex items-center gap-3">
          <div className="bg-cyan-500 p-2 rounded-lg shadow-lg rotate-2 text-black"><ShieldCheck size={24} /></div>
          <div><h1 className="text-2xl font-black tracking-tighter uppercase italic bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent leading-none">Rayo Cero HQ</h1><p className="text-[10px] text-cyan-500 tracking-[0.4em] font-bold uppercase mt-1">Terminal_v29.5_FINAL</p></div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block"><p className="text-[10px] text-gray-600 font-black uppercase">Status</p><p className="text-xs text-green-400 font-mono animate-pulse">● ONLINE_SECURE</p></div>
          <button onClick={handleLogout} className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500 hover:text-black px-6 py-2.5 rounded-xl border border-red-500/20 transition-all font-black text-[10px] uppercase tracking-widest">
            <LogOut size={16} /> Salir
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <nav className={`lg:col-span-3 flex flex-col gap-2 ${glassStyle} h-fit`}>
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
        <main className="lg:col-span-9 flex flex-col gap-6">
          <section className={`${glassStyle} min-h-[550px]`}>
            {activeTab === 'carreras' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-8 border-l-4 border-cyan-500 pl-6 text-left"><h3 className="text-xl font-black italic uppercase flex items-center gap-2"><PlusCircle className="text-cyan-500" /> Desplegar Evento</h3></div>
                <RaceForm />
              </div>
            )}
            {activeTab === 'atletas' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-left">
                <div className="mb-8 border-l-4 border-cyan-500 pl-6 flex justify-between items-end text-white">
                  <div><h3 className="text-xl font-black italic uppercase flex items-center gap-2"><Users className="text-cyan-500" /> Registro Global</h3><p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest text-left">Rescate y expurgo de telemetría operativa</p></div>
                  <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-lg border border-white/10 transition-all"><Download size={14} /> Exportar</button>
                </div>
                <AtletasList />
              </div>
            )}
            {activeTab === 'finanzas' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-left">
                <div className="mb-8 border-l-4 border-cyan-500 pl-6"><h3 className="text-xl font-black italic uppercase flex items-center gap-2 text-left text-white"><Banknote className="text-cyan-500" /> Operaciones Financieras</h3></div>
                <TasaConfig /><RunnerValidador />
              </div>
            )}
            {activeTab === 'config' && (
              <div className="flex flex-col items-center justify-center h-[400px] border-2 border-dashed border-white/5 rounded-3xl opacity-20">
                <Settings size={48} className="mb-4" /><p className="uppercase font-black tracking-[0.6em] text-[10px]">Restricted_Access_Terminal</p>
              </div>
            )}
          </section>
        </main>
      </div>
      <footer className="mt-20 py-10 border-t border-white/5 flex flex-col items-center gap-4 opacity-50">
          <p className="text-[9px] text-gray-500 font-black tracking-[0.8em] uppercase text-center">Valkyron Group HQ Deployment © 2026</p>
      </footer>
    </div>
  );
};

export default AdminDashboard;
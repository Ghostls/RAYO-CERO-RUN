/**
 * RAYO CERO — ADMIN HQ DASHBOARD (STABLE BUILD V39_TS_COMPLIANT)
 * Senior Dev: MIA (Valkyron Group)
 * CEO: Lualdo Sciscioli
 * 
 * EVOLUCIÓN V39:
 * - TS FIX (Error 2322): Eliminación de 'title' en componentes Lucide para compatibilidad estricta.
 * - TOOLTIP PERSISTENCE: Los mensajes de información se mantienen en los contenedores nativos (button).
 * - CASCADE PURGE INTACTO: Se mantiene la limpieza de dependencias de la V37.
 * - REGLA DE ORO RESPETADA: Código íntegro, funcional y evolucionado.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import {
  ShieldCheck, Settings, LogOut, Activity, RefreshCw, Save, CheckCircle,
  Search, CheckSquare, Eye, X, ShieldAlert, FileText, Trash2, Phone,
  Clock, AlertTriangle
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RaceForm } from '../components/admin/RaceForm';
import { RouteConfig } from '../components/admin/RouteConfig';
import { ResultsTable } from '../components/admin/ResultsTable';
import logoPrincipal from '../assets/logo.png';

/* ────────────────────────────────────────────────────────────── */
/* TYPES & CONSTANTS */
/* ────────────────────────────────────────────────────────────── */

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
  comprobante_url?: string;
  comprobante_path?: string;
  pago_verificado?: boolean;
}

const BUCKET = 'comprobantes-pago';

/* ────────────────────────────────────────────────────────────── */
/* HELPERS */
/* ────────────────────────────────────────────────────────────── */

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
  while (true) {
    const { data: files, error } = await supabase.storage.from(BUCKET).list('', {
      limit: PAGE_SIZE, offset, sortBy: { column: 'name', order: 'asc' }
    });
    if (error || !files || files.length === 0) break;
    const found = files.find(f => {
      const file = f.name.toLowerCase();
      return file.includes(cedula.toLowerCase()) || (referencia_pago && file.includes(referencia_pago.toLowerCase()));
    });
    if (found) {
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(found.name);
      return data?.publicUrl ?? null;
    }
    if (files.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return null;
};

/* ────────────────────────────────────────────────────────────── */
/* TASA CONFIG (MANEJO FINANCIERO) */
/* ────────────────────────────────────────────────────────────── */

const TasaConfig = () => {
  const [tasaActual, setTasaActual] = useState<number | null>(null);
  const [nuevaTasa, setNuevaTasa] = useState('');
  const [costoUSDActual, setCostoUSDActual] = useState<number | null>(null);
  const [nuevoCostoUSD, setNuevoCostoUSD] = useState('');
  const [ultimaActualizacion, setUltimaActualizacion] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  useEffect(() => { fetchConfig(); }, []);

  const fetchConfig = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('system_config').select('*').eq('id', 1).single();
      if (error) throw error;
      if (data) {
        setTasaActual(data.tasa_bcv);
        setNuevaTasa(String(data.tasa_bcv));
        setCostoUSDActual(data.costo_usd || 40);
        setNuevoCostoUSD(String(data.costo_usd || 40));
        setUltimaActualizacion(new Date(data.ultima_actualizacion).toLocaleString('es-VE'));
      }
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  };

  const handleUpdateProtocol = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const parsedTasa = parseFloat(nuevaTasa.replace(',', '.'));
      const parsedCosto = parseFloat(nuevoCostoUSD.replace(',', '.'));
      const { error } = await supabase.from('system_config').update({
        tasa_bcv: parsedTasa, costo_usd: parsedCosto, ultima_actualizacion: new Date().toISOString()
      }).eq('id', 1);
      if (error) throw error;
      await fetchConfig();
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 3000);
    } catch (err: any) { alert(err.message); } finally { setIsSaving(false); }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
      <div className="bg-black/40 border border-cyan-500/20 rounded-2xl p-8">
        <h4 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
          <Settings size={18} className="text-cyan-400" /> Parámetros Financieros
        </h4>
        <form onSubmit={handleUpdateProtocol} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="tasa_bcv_input" className="text-[10px] text-cyan-400 font-black uppercase tracking-widest mb-2 block">
                Tasa BCV
              </label>
              <input
                id="tasa_bcv_input"
                name="tasa_bcv"
                type="text"
                value={nuevaTasa}
                onChange={(e) => setNuevaTasa(e.target.value)}
                className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-5 py-4 text-white outline-none focus:border-cyan-500/50 transition-colors"
              />
            </div>
            <div>
              <label htmlFor="costo_usd_input" className="text-[10px] text-cyan-400 font-black uppercase tracking-widest mb-2 block">
                Inscripción USD
              </label>
              <input
                id="costo_usd_input"
                name="costo_usd"
                type="text"
                value={nuevoCostoUSD}
                onChange={(e) => setNuevoCostoUSD(e.target.value)}
                className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-5 py-4 text-white outline-none focus:border-cyan-500/50 transition-colors"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isSaving || isLoading}
            className="w-full flex items-center justify-center gap-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black px-6 py-4 text-xs font-black uppercase tracking-[0.2em] transition-all"
          >
            {isSaving ? <RefreshCw className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />}
            {isSaving ? 'ACTUALIZANDO...' : 'SINCRONIZAR'}
          </button>
          {successMsg && (
            <div className="flex items-center justify-center gap-2 text-green-400 animate-pulse">
              <CheckCircle size={16} /> <span className="text-[10px] uppercase font-bold">Sincronización Exitosa</span>
            </div>
          )}
        </form>
      </div>
      <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-2xl p-8 flex flex-col justify-center">
        {isLoading ? (
          <div className="flex justify-center"><Activity size={48} className="animate-pulse text-cyan-500" /></div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-around items-center">
              <div>
                <p className="text-[8px] text-gray-500 uppercase">Tasa</p>
                <div className="text-4xl font-black italic text-white">{tasaActual?.toFixed(2)}</div>
              </div>
              <div className="h-12 w-[1px] bg-white/10" />
              <div>
                <p className="text-[8px] text-gray-500 uppercase">Inscripción</p>
                <div className="text-4xl font-black italic text-cyan-400">${costoUSDActual}</div>
              </div>
            </div>
            <div className="text-[10px] text-cyan-400 font-mono text-center">{ultimaActualizacion}</div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────── */
/* ATLETAS LIST */
/* ────────────────────────────────────────────────────────────── */

const AtletasList = ({ onUpdateCount }: { onUpdateCount?: (count: number) => void }) => {
  const [atletas, setAtletas] = useState<Runner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAtleta, setSelectedAtleta] = useState<Runner | null>(null);
  const [comprobanteUrl, setComprobanteUrl] = useState<string | null>(null);
  const [imgLoading, setImgLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [athleteToDelete, setAthleteToDelete] = useState<Runner | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingPayment, setIsTogglingPayment] = useState<string | null>(null);

  const fetchAtletas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('runners').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setAtletas(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAtletas();
  }, []);

  useEffect(() => {
    if (onUpdateCount) {
      onUpdateCount(atletas.length);
    }
  }, [atletas.length, onUpdateCount]);

  const toggleVerificacionPago = async (id: string, currentStatus: boolean | undefined) => {
    setIsTogglingPayment(id);
    const newStatus = !currentStatus;
    
    try {
      const { error } = await supabase
        .from('runners')
        .update({ pago_verificado: newStatus })
        .eq('id', id);

      if (error) throw error;

      setAtletas(prev => prev.map(a => 
        a.id === id ? { ...a, pago_verificado: newStatus } : a
      ));
      
      console.log(`[PAYMENT_UPDATE] Unidad ID:${id} - Verificado: ${newStatus}`);
    } catch (err: any) {
      console.error('[PAYMENT_ERROR]', err);
      alert(`ERROR EN SISTEMA DE VERIFICACIÓN: ${err.message}`);
    } finally {
      setIsTogglingPayment(null);
    }
  };

  const handleDeleteAthlete = async () => {
    if (!athleteToDelete || isDeleting) return;

    setIsDeleting(true);
    const targetId = athleteToDelete.id;
    const targetCedula = athleteToDelete.cedula;
    const targetBib = athleteToDelete.bib_number;

    try {
      await Promise.all([
        supabase.from('race_results').delete().eq('cedula_runner', targetCedula),
        supabase.from('race_results').delete().eq('runner_cedula', targetCedula),
        supabase.from('race_results').delete().eq('runner_id', targetId),
        targetBib ? supabase.from('race_results').delete().eq('bib_number', targetBib) : Promise.resolve()
      ]);

      await Promise.all([
        supabase.from('teams').update({ runner_m1_id: null }).eq('runner_m1_id', targetId),
        supabase.from('teams').update({ runner_m2_id: null }).eq('runner_m2_id', targetId),
        supabase.from('teams').update({ runner_f1_id: null }).eq('runner_f1_id', targetId),
        supabase.from('teams').update({ runner_f2_id: null }).eq('runner_f2_id', targetId),
      ]);

      const { error: finalError } = await supabase
        .from('runners')
        .delete()
        .eq('id', targetId);

      if (finalError) throw finalError;

      setAtletas(prev => prev.filter(a => a.id !== targetId));
      setAthleteToDelete(null);
      console.log(`[PURGE_SUCCESS] Unidad V-${targetCedula} y dependencias erradicadas correctamente.`);

    } catch (err: any) {
      console.error('[PURGE_ERROR]', err);
      alert(`ERROR EN SISTEMA DE BORRADO: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const inspectComprobante = async (atleta: Runner) => {
    setSelectedAtleta(atleta);
    setComprobanteUrl(null);
    setImgLoading(true);
    setStatusMsg('Escaneando Hangar...');
    try {
      const url = await getComprobantePublicUrl(atleta.cedula, atleta.referencia_pago, atleta.comprobante_url || atleta.comprobante_path);
      if (!url) setStatusMsg(`Archivo no detectado — V-${atleta.cedula}`);
      else setComprobanteUrl(url);
    } catch (err) {
      setStatusMsg('Error de enlace visual');
    } finally {
      setImgLoading(false);
    }
  };

  const filteredAtletas = useMemo(() => {
    return atletas.filter(a => `${a.nombre} ${a.apellido} ${a.cedula}`.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [atletas, searchTerm]);

  const exportToPDF = () => {
    const doc = new jsPDF();
    const img = new Image();
    img.src = logoPrincipal;
    doc.addImage(img, 'PNG', 14, 10, 30, 10);
    doc.setFontSize(18);
    doc.text('RAYO CERO — REPORTE', 14, 30);
    const rows = filteredAtletas.map(a => [`${a.nombre} ${a.apellido}`, `V-${a.cedula}`, a.telefono || 'N/A', a.bib_number ? `#${a.bib_number}` : '---']);
    autoTable(doc, { startY: 40, head: [['Nombre', 'Cédula', 'Teléfono', 'Dorsal']], body: rows });
    doc.save(`RAYOCERO_${Date.now()}.pdf`);
  };

  return (
    <div className="relative text-white">
      <div className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <button onClick={exportToPDF} className="px-4 py-2 rounded-lg bg-white/5 text-cyan-400 border border-cyan-400/20 hover:bg-cyan-400 hover:text-black flex items-center gap-2 text-[10px] uppercase font-black transition-all">
            <FileText size={14} /> Exportar PDF
          </button>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
            <input
              id="filter_atletas"
              name="filter_atletas"
              type="text"
              placeholder="Filtrar base..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-[10px] uppercase font-bold outline-none focus:border-cyan-500/30 transition-all"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-white/5">
                <th className="p-4 text-left text-[9px] uppercase text-gray-400">Atleta</th>
                <th className="p-4 text-left text-[9px] uppercase text-gray-400">Comunicación</th>
                <th className="p-4 text-left text-[9px] uppercase text-gray-400">Dorsal</th>
                <th className="p-4 text-center text-[9px] uppercase text-gray-400">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={4} className="p-20 text-center text-cyan-500 font-black animate-pulse uppercase tracking-widest">Reconstruyendo Hangar...</td></tr>
              ) : filteredAtletas.map(a => (
                <tr key={a.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-xs uppercase flex items-center gap-2">
                      {a.nombre} {a.apellido}
                      {a.pago_verificado && <ShieldCheck size={12} className="text-green-500" />}
                    </div>
                    <div className="text-[9px] text-gray-500 font-mono">V-{a.cedula}</div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-cyan-400 text-[10px] font-mono">
                      <Phone size={12} /> {a.telefono || 'SIN_TLF'}
                    </div>
                  </td>
                  <td className="p-4">{a.bib_number ? `#${a.bib_number}` : <Clock size={14} className="text-yellow-500/50" />}</td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => inspectComprobante(a)} className="p-2 rounded-lg bg-white/5 hover:bg-cyan-500 hover:text-black transition-all" title="Inspeccionar Comprobante">
                        <Eye size={16} />
                      </button>
                      
                      <button 
                        onClick={() => toggleVerificacionPago(a.id, a.pago_verificado)}
                        disabled={isTogglingPayment === a.id}
                        className={`p-2 rounded-lg transition-all border ${
                          a.pago_verificado 
                            ? 'bg-green-500/10 text-green-500 border-green-500/30 hover:bg-green-500 hover:text-black' 
                            : 'bg-white/5 text-gray-500 border-transparent hover:bg-white/10 hover:text-white'
                        }`}
                        title={a.pago_verificado ? "Pago Confirmado (Clic para revertir)" : "Pago Pendiente (Clic para verificar)"}
                      >
                        {isTogglingPayment === a.id ? (
                          <RefreshCw size={16} className="animate-spin" />
                        ) : (
                          <CheckSquare size={16} />
                        )}
                      </button>

                      <button onClick={() => setAthleteToDelete(a)} className="p-2 rounded-lg bg-white/5 hover:bg-red-500 hover:text-black text-red-500 transition-all" title="Eliminar Unidad">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedAtleta && createPortal(
        <div onClick={() => setSelectedAtleta(null)} className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm">
          <div onClick={(e) => e.stopPropagation()} className="bg-[#0a0f14] border border-cyan-400/20 rounded-3xl w-full max-w-6xl overflow-hidden flex flex-col md:flex-row shadow-2xl animate-in zoom-in-95">
            <div className="flex-1 bg-black flex items-center justify-center p-4 min-h-[400px]">
              {imgLoading ? (
                <div className="text-center"><RefreshCw className="animate-spin text-cyan-400 mb-4" size={40} /><p className="text-cyan-400 text-xs uppercase">Enlazando Hangar...</p></div>
              ) : comprobanteUrl ? (
                <img src={comprobanteUrl} alt="comprobante" className="max-h-[80vh] object-contain shadow-2xl" />
              ) : (
                <div className="text-center"><ShieldAlert size={60} className="text-gray-700 mb-4" /><p className="text-gray-500 text-xs uppercase">{statusMsg}</p></div>
              )}
            </div>
            <div className="w-full md:w-[350px] bg-[#0d1319] border-l border-white/5 p-8 flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div><h5 className="text-white font-black text-xl uppercase italic">Inspección</h5><p className="text-cyan-400 text-[9px] uppercase tracking-widest">Hangar Scan</p></div>
                <button onClick={() => setSelectedAtleta(null)} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-all"><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div className="bg-white/[0.03] p-4 rounded-xl border border-white/5">
                  <p className="text-gray-500 text-[9px] uppercase">Unidad</p>
                  <p className="text-white font-black text-sm uppercase flex justify-between items-center">
                    {selectedAtleta.nombre} {selectedAtleta.apellido}
                    {selectedAtleta.pago_verificado && <ShieldCheck size={14} className="text-green-500" />}
                  </p>
                  <p className="text-cyan-400 font-mono text-xs">V-{selectedAtleta.cedula}</p>
                </div>
                <div className="bg-white/[0.03] p-4 rounded-xl border border-white/5"><p className="text-gray-500 text-[9px] uppercase">Teléfono</p><p className="text-white font-mono">{selectedAtleta.telefono || 'SIN REGISTRO'}</p></div>
                <div className="bg-white/[0.03] p-4 rounded-xl border border-white/5"><p className="text-gray-500 text-[9px] uppercase">Referencia</p><p className="text-green-400 font-mono break-all">{selectedAtleta.referencia_pago || 'PENDIENTE'}</p></div>
                
                <button 
                  onClick={() => toggleVerificacionPago(selectedAtleta.id, selectedAtleta.pago_verificado)}
                  disabled={isTogglingPayment === selectedAtleta.id}
                  className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase transition-all ${
                    selectedAtleta.pago_verificado 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30' 
                      : 'bg-cyan-500 hover:bg-cyan-400 text-black'
                  }`}
                >
                  {isTogglingPayment === selectedAtleta.id ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : selectedAtleta.pago_verificado ? (
                    <><CheckCircle size={14} /> PAGO VALIDADO</>
                  ) : (
                    <><ShieldCheck size={14} /> APROBAR PAGO</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>, document.body
      )}

      {athleteToDelete && createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <div className="bg-[#0a0a0a] border border-red-500/30 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-start mb-6">
              <div className="bg-red-500/20 p-3 rounded-2xl"><AlertTriangle className="text-red-500" size={24} /></div>
              <button onClick={() => setAthleteToDelete(null)} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>
            <h3 className="text-xl font-black text-white uppercase italic mb-2">Protocolo de Expurgo</h3>
            <p className="text-gray-400 text-sm mb-8">¿Eliminar permanentemente la unidad <span className="text-red-400 font-bold">{athleteToDelete.nombre} {athleteToDelete.apellido}</span>?</p>
            <div className="flex gap-4">
              <button onClick={() => setAthleteToDelete(null)} className="flex-1 py-4 rounded-xl bg-white/5 font-bold hover:bg-white/10 transition-all">Cancelar</button>
              <button onClick={handleDeleteAthlete} disabled={isDeleting} className="flex-1 py-4 rounded-xl bg-red-600 hover:bg-red-500 flex items-center justify-center gap-2 font-black uppercase text-xs transition-all shadow-lg shadow-red-600/20">
                {isDeleting ? <RefreshCw className="animate-spin" size={14} /> : <Trash2 size={14} />} Confirmar
              </button>
            </div>
          </div>
        </div>, document.body
      )}
    </div>
  );
};

/* ────────────────────────────────────────────────────────────── */
/* MAIN DASHBOARD HQ */
/* ────────────────────────────────────────────────────────────── */

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'race_config' | 'results'>('overview');
  const [totalAtletas, setTotalAtletas] = useState(0);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-cyan-500/30">
      <nav className="border-b border-white/5 bg-black/50 backdrop-blur-xl sticky top-0 z-[100]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <ShieldCheck className="text-black" size={24} />
            </div>
            <div>
              <h1 className="text-lg font-black italic uppercase leading-none">Rayo Cero HQ</h1>
              <p className="text-[8px] text-gray-500 uppercase tracking-widest mt-1">Valkyron Group</p>
            </div>
          </div>
          <button className="flex items-center gap-2 text-[10px] uppercase text-gray-400 hover:text-white transition-colors">
            <LogOut size={16} /> Salir
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-wrap gap-4 mb-12">
          <button onClick={() => setActiveTab('overview')} className={`px-8 py-5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all ${activeTab === 'overview' ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'bg-white/5 hover:bg-white/10 text-gray-400'}`}>Dashboard</button>
          <button onClick={() => setActiveTab('race_config')} className={`px-8 py-5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all ${activeTab === 'race_config' ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'bg-white/5 hover:bg-white/10 text-gray-400'}`}>Carrera</button>
          <button onClick={() => setActiveTab('results')} className={`px-8 py-5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all ${activeTab === 'results' ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'bg-white/5 hover:bg-white/10 text-gray-400'}`}>Resultados</button>
        </div>

        {activeTab === 'overview' && (
          <>
            <TasaConfig />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <AtletasList onUpdateCount={setTotalAtletas} />
              </div>
              <div>
                <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-3xl p-8 text-black shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Activity size={80} /></div>
                  <h4 className="text-xs font-black uppercase relative z-10">Participación Total</h4>
                  <p className="text-7xl font-black italic relative z-10">{totalAtletas.toString().padStart(3, '0')}</p>
                  <p className="text-[10px] font-bold uppercase mt-4 opacity-70">Unidades en Base</p>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'race_config' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-in slide-in-from-bottom-4">
            <RaceForm />
            <RouteConfig />
          </div>
        )}

        {activeTab === 'results' && (
          <div className="animate-in fade-in"><ResultsTable /></div>
        )}
      </main>
    </div>
  );
}
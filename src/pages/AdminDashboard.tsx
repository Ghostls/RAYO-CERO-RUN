/**
 * RAYO CERO — ADMIN HQ DASHBOARD (STABLE BUILD V28.4_FINANCE_SYNC)
 * Senior Dev: MIA (Valkyron Group) — Protocolo de Inteligencia y Alcance Global
 * CEO: Lualdo Sciscioli
 * Grado: Militar / Operativo
 * FIX: Dinamización de Costo de Inscripción USD. Ahora modificable desde DB.
 * INTEGRACIÓN: RAYOCERO (sin espacios) y Logo en reportes oficiales.
 * REGLA DE ORO: Código completo sin omisiones.
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
  CreditCard,
  Calendar,
  Filter,
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
  DollarSign, // Icono para el costo USD
} from 'lucide-react';

// Motores de reporte
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { RaceForm } from '../components/admin/RaceForm';
import { RouteConfig } from '../components/admin/RouteConfig';
import { ResultsTable } from '../components/admin/ResultsTable';

// Importación de identidad visual
import logoPrincipal from '../assets/logo.png';

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface Runner {
  id: string;
  nombre: string;
  apellido: string;
  cedula: string;
  email?: string;
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

  useEffect(() => {
    fetchConfig();
  }, []);

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
        setCostoUSDActual(data.costo_usd || 40); // Fallback a 40 si no existe
        setNuevoCostoUSD((data.costo_usd || 40).toString());
        setUltimaActualizacion(
          new Date(data.ultima_actualizacion).toLocaleString('es-VE')
        );
      }
    } catch (error) {
      console.error('Error obteniendo configuración financiera:', error);
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
      
      if (isNaN(parsedTasa) || parsedTasa <= 0) throw new Error('Tasa inválida');
      if (isNaN(parsedCosto) || parsedCosto <= 0) throw new Error('Costo inválido');

      const { error } = await supabase
        .from('system_config')
        .update({
          tasa_bcv: parsedTasa,
          costo_usd: parsedCosto,
          ultima_actualizacion: new Date().toISOString(),
        })
        .eq('id', 1);

      if (error) throw error;
      await fetchConfig();
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 3000);
    } catch (err: any) {
      alert(`Error táctico: ${err.message || 'Verifique los valores'}`);
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
          <Settings size={18} className="text-cyan-400" /> Parámetros de Inversión
        </h4>
        <form onSubmit={handleUpdateProtocol} className="space-y-6 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400 mb-2 block">
                Tasa BCV (Bs)
              </label>
              <input
                type="text"
                value={nuevaTasa}
                onChange={(e) => setNuevaTasa(e.target.value)}
                className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-5 py-4 text-xl font-bold text-white focus:outline-none focus:border-cyan-400 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400 mb-2 block">
                Inscripción ($)
              </label>
              <input
                type="text"
                value={nuevoCostoUSD}
                onChange={(e) => setNuevoCostoUSD(e.target.value)}
                className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-5 py-4 text-xl font-bold text-white focus:outline-none focus:border-cyan-400 font-mono"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isSaving || isLoading}
            className="w-full flex items-center justify-center gap-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black px-6 py-4 text-xs font-black uppercase tracking-[0.2em] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? <RefreshCw className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />}
            {isSaving ? 'ACTUALIZANDO PROTOCOLO...' : 'SINCRONIZAR CONFIGURACIÓN'}
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
        <h4 className="text-[10px] font-black text-cyan-500/60 uppercase tracking-[0.3em] mb-4">Estado Operativo Actual</h4>
        {isLoading ? (
          <div className="flex justify-center">
            <Activity className="animate-pulse text-cyan-500" size={48} />
          </div>
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
  const [runners, setRunners] = useState<Runner[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorStatus, setErrorStatus] = useState(false);

  const getChecksum = (cedula: string) => {
    if (!cedula) return 0;
    return (cedula.split('').reduce((a, b) => a + (parseInt(b) || 0), 0) % 9);
  };

  const fetchRunners = useCallback(async () => {
    setLoading(true);
    setErrorStatus(false);
    try {
      const orFilter = `nombre.ilike.%${search}%,apellido.ilike.%${search}%,cedula.ilike.%${search}%,referencia_pago.ilike.%${search}%`;
      let { data, error } = await supabase
        .from('runners')
        .select('nombre, apellido, cedula, referencia_pago, created_at, bib_number, categoria')
        .or(orFilter)
        .order('created_at', { ascending: false })
        .limit(15);

      if (error) {
        const fallback = await supabase
          .from('runner')
          .select('nombre, apellido, cedula, referencia_pago, created_at, bib_number, categoria')
          .or(orFilter)
          .order('created_at', { ascending: false })
          .limit(15);
        if (fallback.error) throw new Error('Error de enlace');
        setRunners((fallback.data as Runner[]) || []);
      } else {
        setRunners((data as Runner[]) || []);
      }
    } catch {
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
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <Database size={80} className="text-white" />
      </div>
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
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-xs font-bold uppercase tracking-widest focus:border-cyan-400 text-white outline-none transition-all"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {errorStatus ? (
          <div className="bg-red-500/10 border border-red-500/30 p-6 rounded-xl flex items-center gap-4 text-red-400">
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
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-cyan-500 flex items-center justify-center border border-cyan-400/20 text-black font-black text-xs shrink-0">
                  {getChecksum(r.cedula)}
                </div>
                <div>
                  <h5 className="text-sm font-black uppercase italic text-white leading-none mb-1">{r.nombre} {r.apellido}</h5>
                  <span className="text-[10px] font-mono text-cyan-500/70">V-{r.cedula}</span>
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

  const fetchAtletas = async () => {
    setLoading(true);
    try {
      const buildQuery = (tableName: string) => {
        let q = supabase.from(tableName).select('*').order('created_at', { ascending: false });
        if (filterStatus === 'confirmado') q = q.not('bib_number', 'is', null);
        if (filterStatus === 'pendiente') q = q.is('bib_number', null);
        return q;
      };
      const { data, error } = await buildQuery('runners');
      if (error) {
        const fallback = await buildQuery('runner');
        setAtletas((fallback.data as Runner[]) || []);
      } else {
        setAtletas((data as Runner[]) || []);
      }
    } catch (err) {
      console.error('Critical Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAtletas(); }, [filterStatus]);

  useEffect(() => {
    if (selectedAtleta) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [selectedAtleta]);

  // Cálculo de filtrado para uso global en el componente
  const filteredAtletas = atletas.filter((a) =>
    `${a.nombre} ${a.apellido} ${a.cedula}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // MOTOR DE EXPORTACIÓN PDF CON IDENTIDAD VISUAL
  const exportToPDF = () => {
    const doc = new jsPDF();
    const timestamp = new Date().toLocaleString('es-VE');

    // Inyección de Logo
    const img = new Image();
    img.src = logoPrincipal;
    
    // Dibujar logo (x, y, w, h)
    doc.addImage(img, 'PNG', 14, 10, 30, 10);

    // Configuración estética del reporte
    doc.setFontSize(18);
    doc.setTextColor(6, 182, 212); // Color Cyan RAYOCERO
    doc.text('RAYOCERO — REPORTE DE INTELIGENCIA ATLETAS', 14, 30);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Grado: Operativo / Generado: ${timestamp}`, 14, 38);
    doc.text(`Filtro Activo: ${filterStatus.toUpperCase()} | Unidades detectadas: ${filteredAtletas.length}`, 14, 43);

    const tableRows = filteredAtletas.map(atleta => [
      atleta.nombre + ' ' + atleta.apellido,
      `V-${atleta.cedula}`,
      atleta.referencia_pago || 'PENDIENTE',
      atleta.bib_number ? `#${atleta.bib_number}` : '---',
      atleta.categoria || 'N/A'
    ]);

    autoTable(doc, {
      startY: 50,
      head: [['Unidad Atleta', 'ID Operativo', 'Ref_Pago', 'Dorsal', 'Categoría']],
      body: tableRows,
      headStyles: { fillColor: [6, 182, 212], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      styles: { fontSize: 8, font: 'helvetica' },
    });

    doc.save(`RAYOCERO_ATLETAS_${filterStatus}_${Date.now()}.pdf`);
  };

  const inspectComprobante = async (atleta: Runner) => {
    setSelectedAtleta(atleta);
    setComprobanteUrl(null);
    setImgLoading(true);
    setStatusMsg('Escaneando hangar...');
    try {
      const storedPath = (atleta as any).comprobante_url ?? (atleta as any).comprobante_path ?? undefined;
      const url = await getComprobantePublicUrl(atleta.cedula, atleta.referencia_pago, storedPath);
      if (!url) {
        setStatusMsg(`Archivo no detectado — Cédula: ${atleta.cedula}`);
        setImgLoading(false);
        return;
      }
      setComprobanteUrl(url);
      setStatusMsg('');
    } catch (err) {
      setStatusMsg('Error de enlace visual');
    } finally {
      setImgLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedAtleta(null);
    setComprobanteUrl(null);
  };

  return (
    <div className="relative">
      <div className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden text-left">
        <div className="p-6 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            {(['all', 'confirmado', 'pendiente'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  filterStatus === status
                    ? status === 'confirmado' ? 'bg-green-500 text-black' : status === 'pendiente' ? 'bg-yellow-500 text-black' : 'bg-cyan-500 text-black'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                {status === 'all' ? 'Todos' : status === 'confirmado' ? 'Confirmados' : 'Pendientes'}
              </button>
            ))}
            
            <button 
              onClick={exportToPDF}
              className="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all bg-white/5 text-cyan-400 border border-cyan-400/20 hover:bg-cyan-400 hover:text-black flex items-center gap-2"
            >
              <FileText size={14} /> Exportar PDF
            </button>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
            <input
              type="text"
              placeholder="Filtrar base..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-[10px] font-bold uppercase tracking-widest focus:border-cyan-400 text-white outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5">
                {['Unidad Atleta', 'ID Operativo', 'Ref_Pago', 'Dorsal', 'Acción'].map((h, i) => (
                  <th key={h} className={`p-4 text-[9px] font-black text-gray-400 uppercase tracking-widest ${i === 4 ? 'text-center' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={5} className="p-20 text-center animate-pulse text-cyan-500 font-mono text-[10px]">INICIANDO_SISTEMAS_INTEL...</td></tr>
              ) : filteredAtletas.length > 0 ? (
                filteredAtletas.map((atleta) => (
                  <tr key={atleta.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-4">
                      <div className="font-bold text-xs uppercase tracking-tight text-white">{atleta.nombre} {atleta.apellido}</div>
                      <div className="text-[9px] text-gray-500 font-mono">{atleta.email}</div>
                    </td>
                    <td className="p-4 text-[10px] font-mono text-cyan-400">V-{atleta.cedula}</td>
                    <td className="p-4 text-[10px] font-mono">
                      <span className={atleta.referencia_pago ? 'text-green-400' : 'text-yellow-500'}>{atleta.referencia_pago || 'PENDIENTE'}</span>
                    </td>
                    <td className="p-4 text-sm font-black italic text-white group-hover:text-cyan-400 transition-colors">{atleta.bib_number ? `#${atleta.bib_number}` : '---'}</td>
                    <td className="p-4 text-center">
                      <button onClick={() => inspectComprobante(atleta)} className="p-2 rounded-lg bg-white/5 hover:bg-cyan-500 hover:text-black text-white transition-all group-hover:scale-110">
                        <Eye size={16} />
                      </button>
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

      {selectedAtleta && createPortal(
        <div
          onClick={closeModal}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 999999,
            background: 'rgba(0,0,0,0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            backdropFilter: 'blur(15px)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#0a0f14',
              border: '1px solid rgba(0,229,255,0.25)',
              borderRadius: '24px',
              width: '100%',
              maxWidth: '1100px',
              height: '85vh',
              display: 'flex',
              flexDirection: 'row',
              overflow: 'hidden',
              boxShadow: '0 0 100px rgba(0,0,0,1), 0 0 40px rgba(0,229,255,0.2)',
            }}
          >
            <div style={{ flex: 1, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '30px', position: 'relative' }}>
              {imgLoading ? (
                <div style={{ textAlign: 'center' }}>
                    <RefreshCw className="animate-spin text-cyan-400 mb-2" size={32} />
                    <p style={{ color: '#00e5ff', fontFamily: 'monospace', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px' }}>Estableciendo Enlace...</p>
                </div>
              ) : comprobanteUrl ? (
                <img
                  src={comprobanteUrl}
                  alt="comprobante"
                  style={{ maxWidth: '100%', maxHeight: '100%', display: 'block', objectFit: 'contain', borderRadius: '8px' }}
                />
              ) : (
                <div style={{ textAlign: 'center' }}>
                    <ShieldAlert size={48} color="#333" style={{ margin: '0 auto 10px' }} />
                    <p style={{ color: '#555', fontFamily: 'monospace', fontSize: '12px' }}>{statusMsg || 'RECURSO NO LOCALIZADO'}</p>
                </div>
              )}
              <div style={{ position: 'absolute', top: '24px', left: '24px', background: 'rgba(0,0,0,0.7)', padding: '6px 14px', borderRadius: '8px', border: '1px solid rgba(0,229,255,0.3)', color: '#00e5ff', fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Hangar_Scan_V28.0_INTERCEPTOR
              </div>
            </div>

            <div style={{ width: '280px', borderLeft: '1px solid rgba(255,255,255,0.08)', padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px', background: '#0d1319' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h5 style={{ color: '#fff', fontWeight: 950, fontSize: '20px', textTransform: 'uppercase', fontStyle: 'italic', margin: 0 }}>Inspección</h5>
                    <p style={{ color: '#00e5ff', fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', marginTop: '4px' }}>Protocolo_Validación</p>
                </div>
                <button onClick={closeModal} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', color: '#888', cursor: 'pointer', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={22} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '18px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ color: '#555', fontSize: '9px', marginBottom: '10px', textTransform: 'uppercase', fontWeight: 900, letterSpacing: '1.5px' }}>Atleta Corresponsal</p>
                    <p style={{ color: '#fff', fontWeight: 900, fontSize: '15px', textTransform: 'uppercase', lineHeight: 1.2 }}>{selectedAtleta.nombre} {selectedAtleta.apellido}</p>
                    <p style={{ color: '#00e5ff', fontFamily: 'monospace', fontSize: '13px', marginTop: '8px', fontWeight: 700 }}>V-{selectedAtleta.cedula}</p>
                  </div>

                  <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '18px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ color: '#555', fontSize: '9px', marginBottom: '10px', textTransform: 'uppercase', fontWeight: 900, letterSpacing: '1.5px' }}>Referencia de Pago</p>
                    <p style={{ color: '#4ade80', fontFamily: 'monospace', fontWeight: 900, fontSize: '18px', wordBreak: 'break-all' }}>{selectedAtleta.referencia_pago || 'PENDIENTE'}</p>
                  </div>
              </div>

              <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {comprobanteUrl && (
                    <a href={comprobanteUrl} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px', background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.15)', borderRadius: '12px', color: '#00e5ff', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', textDecoration: 'none', transition: 'all 0.2s' }}>
                      <ExternalLink size={16} /> Abrir Original
                    </a>
                  )}
                  <button onClick={() => alert('Asignando Dorsal...')}
                    style={{ padding: '16px', borderRadius: '12px', background: '#00e5ff', border: 'none', color: '#000', cursor: 'pointer', fontSize: '11px', fontWeight: 950, textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    <CheckSquare size={18} /> Aprobar Inscripción
                  </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

// ─── COMPONENTE PRINCIPAL: ADMIN HQ ──────────────────────────────────────────

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('carreras');
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };
  const glassStyle = 'bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]';
  const navItems = [
    { id: 'carreras', icon: <PlusCircle size={18} />, label: 'Gestión Eventos' },
    { id: 'atletas', icon: <Users size={18} />, label: 'Validación Pagos' },
    { id: 'rutas', icon: <MapIcon size={18} />, label: 'Vectores Ruta' },
    { id: 'tiempos', icon: <Trophy size={18} />, label: 'Ranking Meta' },
    { id: 'finanzas', icon: <Banknote size={18} />, label: 'Finanzas & Tasa' },
    { id: 'config', icon: <Settings size={18} />, label: 'Parámetros' },
  ];

  return (
    <div className="min-h-screen bg-[#02060a] text-white p-4 md:p-8 font-sans selection:bg-cyan-500/30">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4 border-b border-white/5 pb-8">
        <div className="flex items-center gap-3 text-left">
          <div className="bg-cyan-500 p-2 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.5)] rotate-2"><ShieldCheck size={24} className="text-black" /></div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter uppercase italic bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent leading-none">RAYOCERO HQ</h1>
            <p className="text-[10px] text-cyan-500 tracking-[0.4em] font-bold uppercase mt-1">Terminal_Valkyron_v28.4</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
            <p className="text-[10px] text-gray-600 font-black uppercase">Status</p>
            <p className="text-xs text-green-400 font-mono animate-pulse">● ONLINE_SECURE</p>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500 hover:text-black text-red-500 px-6 py-2.5 rounded-xl border border-red-500/20 transition-all font-black text-[10px] uppercase tracking-widest">
            <LogOut size={16} /> Salir
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
        <nav className={`lg:col-span-3 flex flex-col gap-2 ${glassStyle} h-fit`}>
          <h2 className="text-gray-500 text-[9px] font-black uppercase tracking-[0.5em] mb-4 px-2 italic">Intelligence_Kernel</h2>
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex items-center justify-between p-4 rounded-xl transition-all group ${activeTab === item.id ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'hover:bg-white/5 text-gray-400 border border-transparent'}`}>
              <div className="flex items-center gap-3 font-black text-xs uppercase tracking-tighter">{item.icon} {item.label}</div>
              <ChevronRight size={14} className={`transition-opacity ${activeTab === item.id ? 'opacity-100' : 'opacity-0'}`} />
            </button>
          ))}
        </nav>

        <main className="lg:col-span-9 flex flex-col gap-6">
          <section className={`${glassStyle} min-h-[550px]`}>
            {activeTab === 'carreras' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-8 border-l-4 border-cyan-500 pl-6 text-left text-white">
                  <h3 className="text-xl font-black italic uppercase flex items-center gap-2"><PlusCircle className="text-cyan-500" /> Desplegar Nueva Carrera</h3>
                </div>
                <RaceForm />
              </div>
            )}
            {activeTab === 'atletas' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-8 border-l-4 border-cyan-500 pl-6 flex justify-between items-end text-left text-white">
                  <div>
                    <h3 className="text-xl font-black italic uppercase flex items-center gap-2"><Users className="text-cyan-500" /> Auditoría de Inscripciones</h3>
                    <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest">Protocolo Valkyron: Análisis Visual de Hangar</p>
                  </div>
                  <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-lg border border-white/10 transition-all text-white"><Download size={14} /> Exportar CSV</button>
                </div>
                <AtletasList />
              </div>
            )}
            {activeTab === 'rutas' && <RouteConfig />}
            {activeTab === 'tiempos' && <ResultsTable />}
            {activeTab === 'finanzas' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-left text-white">
                <div className="mb-8 border-l-4 border-cyan-500 pl-6"><h3 className="text-xl font-black italic uppercase flex items-center gap-2"><Banknote className="text-cyan-500" /> Operaciones Financieras</h3></div>
                <TasaConfig /><RunnerValidador />
              </div>
            )}
            {activeTab === 'config' && (
              <div className="flex flex-col items-center justify-center h-[400px] border-2 border-dashed border-white/5 rounded-3xl opacity-20">
                <Settings size={48} className="mb-4 text-white" />
                <p className="uppercase font-black tracking-[0.6em] text-[10px] text-white">Restricted_Access_Terminal</p>
              </div>
            )}
          </section>
        </main>
      </div>
      <footer className="mt-20 py-10 border-t border-white/5 flex flex-col items-center gap-2 opacity-50">
        <p className="text-[9px] text-gray-600 font-black tracking-[0.8em] uppercase">Valkyron Group HQ Deployment © 2026</p>
      </footer>
    </div>
  );
};

export default AdminDashboard;
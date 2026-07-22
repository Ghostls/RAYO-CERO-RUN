/**
 * RAYO CERO — ADMIN DASHBOARD (EVOLUTION V2.1 - MULTI-RACE SCOPE + BIB PER RACE)
 * Senior Dev: MIA (Valkyron Group)
 * CEO: Lualdo Sciscioli
 * REGLA DE ORO: Evolución sin Destrucción. Código completo. Copy-paste ready.
 *
 * CHANGELOG V2.1:
 * [V2.1-1] EscuadronesList: embed race_results!race_results_bib_number_fkey
 *          reemplazado por join manual — la FK se eliminó al migrar a
 *          dorsales por carrera (bib 0001 en cada evento).
 *
 * CHANGELOG V2.0:
 * [V2-1] RaceScopeBar: selector global de carrera. Auto-selecciona la activa
 *        (inscripciones_abiertas = true). Las pasadas aparecen como ARCHIVO.
 * [V2-2] AtletasList filtrada por scope: Lara (legacy) = race_id IS NULL,
 *        carreras nuevas = race_id exacto. Admin limpio para la 499.
 * [V2-3] TasaConfig por carrera: lee/edita la fila de system_config con
 *        race_id de la carrera seleccionada; fallback a fila id=1 (legacy).
 * [V2-4] ModuloEntregaKits y ModuloChequeoKits: búsquedas y stats filtradas
 *        por el scope activo (los dorsales de cada carrera viven aislados).
 * [V2-5] Tarjeta de participación muestra el nombre de la carrera activa.
 * [V2-6] Todo lo demás (PDF, escuadrones, telemetría, expurgo) intacto.
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import {
  ShieldCheck, Settings, LogOut, Activity, RefreshCw, Save, CheckCircle,
  Search, CheckSquare, Eye, X, ShieldAlert, FileText, Trash2, Phone,
  Clock, AlertTriangle, Users, Package, Scan, Radio, Zap, BarChart2,
  ChevronDown, Filter, UserPlus, Gift
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RaceForm } from '../components/admin/RaceForm';
import { RouteConfig } from '../components/admin/RouteConfig';
import { ResultsTable } from '../components/admin/ResultsTable';
import logoPrincipal from '../assets/logo.png';
import PreRaceButton from '../components/Preracebutton';
import ModuloInscripcionAdmin from '../components/admin/ModuloInscripcionAdmin';

/* ────────────────────────────────────────────────────────────── */
/* TYPES & CONSTANTS                                              */
/* ────────────────────────────────────────────────────────────── */

interface Runner {
  id: string;
  nombre: string;
  apellido: string;
  cedula: string;
  email?: string;
  telefono?: string;
  talla_camiseta?: string;
  referencia_pago?: string;
  created_at: string;
  bib_number?: string | number;
  categoria?: string;
  comprobante_url?: string;
  comprobante_path?: string;
  pago_verificado?: boolean;
  rfid_epc?: string | null;
  kit_entregado?: boolean;
  race_id?: string | null;
}

const BUCKET = 'comprobantes-pago';

const CATEGORY_ORDER: string[] = [
  'Movilidad Reducida',
  'Juvenil Masculino', 'Juvenil Femenino',
  'Libre Masculino', 'Libre Femenino',
  'Sub Master (30-34) Masculino', 'Sub Master (30-34) Femenino',
  'Sub Master (35-39) Masculino', 'Sub Master (35-39) Femenino',
  'Master A Masculino', 'Master A Femenino',
  'Master B Masculino', 'Master B Femenino',
  'Master C Masculino', 'Master C Femenino',
  'Master D Masculino', 'Master D Femenino',
  'Absoluto Masculino', 'Absoluto Femenino',
];

const getCategoryColor = (categoria: string): [number, number, number] => {
  const c = categoria.toLowerCase();
  if (c.includes('movilidad')) return [168, 85, 247];
  if (c.includes('juvenil')) return [34, 211, 238];
  if (c.includes('libre')) return [251, 191, 36];
  if (c.includes('30-34')) return [52, 211, 153];
  if (c.includes('35-39')) return [16, 185, 129];
  if (c.includes('master a')) return [249, 115, 22];
  if (c.includes('master b')) return [239, 68, 68];
  if (c.includes('master c')) return [236, 72, 153];
  if (c.includes('master d')) return [99, 102, 241];
  if (c.includes('masculino') || c.includes(' m')) return [59, 130, 246];
  if (c.includes('femenino') || c.includes(' f')) return [244, 114, 182];
  return [156, 163, 175];
};

/* ────────────────────────────────────────────────────────────── */
/* [V2-1] RACE SCOPE — selector de carrera global                 */
/* ────────────────────────────────────────────────────────────── */

export interface RaceScope {
  raceId: string | null;
  legacy: boolean;   // true = runners sin race_id (Lara)
  name: string;
  isActive: boolean; // inscripciones_abiertas
}

const isLegacyRace = (name: string): boolean => {
  const n = (name || '').toLowerCase();
  return n.includes('barquisimeto') || n.includes('night fest');
};

/** Aplica el filtro de carrera a cualquier query de runners */
const applyScopeFilter = (query: any, scope: RaceScope) => {
  if (scope.legacy) return query.is('race_id', null);
  if (scope.raceId) return query.eq('race_id', scope.raceId);
  return query;
};

const RaceScopeBar = ({
  scope,
  onChange,
}: {
  scope: RaceScope | null;
  onChange: (scope: RaceScope) => void;
}) => {
  const [races, setRaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRaces = async () => {
      try {
        const { data, error } = await supabase
          .from('races')
          .select('id, name, date, inscripciones_abiertas')
          .order('date', { ascending: false });
        if (error) throw error;
        setRaces(data || []);

        if (!scope && data && data.length > 0) {
          const activa = data.find(r => r.inscripciones_abiertas) || data[0];
          onChange({
            raceId: activa.id,
            legacy: isLegacyRace(activa.name),
            name: activa.name,
            isActive: !!activa.inscripciones_abiertas,
          });
        }
      } catch (err) {
        console.error('[MIA] RaceScopeBar:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="mb-8 h-16 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse flex items-center px-6">
        <span className="text-[9px] text-gray-600 uppercase tracking-widest font-black">Cargando carreras...</span>
      </div>
    );
  }

  return (
    <div className="mb-8 p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 mr-2">
        <Filter size={14} className="text-cyan-400" />
        <span className="text-[9px] text-gray-500 uppercase tracking-widest font-black">Carrera:</span>
      </div>
      {races.map(r => {
        const legacy = isLegacyRace(r.name);
        const selected = scope?.raceId === r.id;
        return (
          <button
            key={r.id}
            onClick={() => onChange({ raceId: r.id, legacy, name: r.name, isActive: !!r.inscripciones_abiertas })}
            className={`px-5 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center gap-2 border ${
              selected
                ? r.inscripciones_abiertas
                  ? 'bg-cyan-500 text-black border-cyan-500 shadow-lg shadow-cyan-500/20'
                  : 'bg-amber-500/90 text-black border-amber-500 shadow-lg shadow-amber-500/20'
                : 'bg-white/5 hover:bg-white/10 text-gray-400 border-white/10'
            }`}
          >
            {r.inscripciones_abiertas ? (
              <span className={`w-1.5 h-1.5 rounded-full ${selected ? 'bg-black' : 'bg-cyan-400 animate-pulse'}`} />
            ) : (
              <Clock size={11} />
            )}
            {r.name}
            {!r.inscripciones_abiertas && (
              <span className={`text-[8px] px-1.5 py-0.5 rounded ${selected ? 'bg-black/20' : 'bg-white/5'}`}>ARCHIVO</span>
            )}
          </button>
        );
      })}
    </div>
  );
};

/* ────────────────────────────────────────────────────────────── */
/* HELPERS                                                        */
/* ────────────────────────────────────────────────────────────── */

const parseTimeToSeconds = (timeVal: any): number => {
  if (!timeVal) return 0;
  if (typeof timeVal === 'string') {
    const parts = timeVal.split(':');
    if (parts.length === 3)
      return parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseFloat(parts[2]);
    return 0;
  }
  if (typeof timeVal === 'object')
    return (timeVal.hours || 0) * 3600 + (timeVal.minutes || 0) * 60 + (timeVal.seconds || 0);
  return 0;
};

const formatSeconds = (totalSeconds: number): string => {
  if (totalSeconds <= 0) return '--:--:--';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
};

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
      return file.includes(cedula.toLowerCase()) ||
        (referencia_pago && file.includes(referencia_pago.toLowerCase()));
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
/* PDF EXPORT                                                     */
/* ────────────────────────────────────────────────────────────── */

type PDFMode = 'segmented' | 'specific' | 'general';

interface PDFExportModalProps {
  atletas: Runner[];
  raceName: string;
  onClose: () => void;
}

const generateCategoryPDF = (atletas: Runner[], selectedCategories: string[], mode: PDFMode, raceName: string) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const originalAddPage = doc.addPage.bind(doc);
  (doc as any).addPage = function(...args: any[]) {
    originalAddPage(...args);
    this.setFillColor(5, 5, 5);
    this.rect(0, 0, pageW, pageH, 'F');
    return this;
  };
  doc.setFillColor(5, 5, 5);
  doc.rect(0, 0, pageW, pageH, 'F');
  const categoryCounts: Record<string, number> = {};
  atletas.forEach(a => {
    const cat = a.categoria || 'Sin categoría';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });
  try {
    const img = new Image();
    img.src = logoPrincipal;
    doc.addImage(img, 'PNG', pageW / 2 - 20, 15, 40, 14);
  } catch {}
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(36);
  doc.setTextColor(34, 211, 238);
  doc.text('RAYOCERO', pageW / 2, 42, { align: 'center' });
  doc.setFontSize(12);
  doc.setTextColor(200, 200, 200);
  doc.text(raceName.toUpperCase(), pageW / 2, 50, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text('Valkyron Group', pageW / 2, 56, { align: 'center' });
  doc.setDrawColor(34, 211, 238);
  doc.setLineWidth(0.5);
  doc.line(20, 64, pageW - 20, 64);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  const reportTitle =
    mode === 'segmented' ? 'REPORTE SEGMENTADO POR CATEGORÍA' :
    mode === 'specific' ? `CATEGORÍA: ${selectedCategories[0]?.toUpperCase() ?? ''}` :
    'LISTADO GENERAL DE ATLETAS';
  doc.text(reportTitle, pageW / 2, 75, { align: 'center' });
  const totalFiltered = atletas.filter(a => selectedCategories.includes(a.categoria || 'Sin categoría')).length;
  const pagadosFiltered = atletas.filter(a => selectedCategories.includes(a.categoria || 'Sin categoría') && a.pago_verificado).length;
  doc.setFontSize(9);
  doc.setTextColor(156, 163, 175);
  doc.text(`Total atletas en reporte: ${totalFiltered}`, 14, 85);
  doc.text(`Pagos verificados: ${pagadosFiltered}`, 14, 90);
  doc.text(`Generado: ${new Date().toLocaleString('es-VE')}`, pageW - 14, 85, { align: 'right' });
  let barY = 100;
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('DISTRIBUCIÓN POR CATEGORÍA', 14, barY - 4);
  const maxCount = Math.max(...Object.values(categoryCounts), 1);
  const barMaxWidth = pageW - 28 - 40;
  const categoriesForBars = CATEGORY_ORDER.filter(cat => categoryCounts[cat]);
  const otherCats = Object.keys(categoryCounts).filter(cat => !CATEGORY_ORDER.includes(cat));
  const allCatsForBars = [...categoriesForBars, ...otherCats];
  allCatsForBars.forEach((cat) => {
    const count = categoryCounts[cat] || 0;
    const barWidth = (count / maxCount) * barMaxWidth;
    const [r, g, b] = getCategoryColor(cat);
    doc.setFillColor(20, 20, 20);
    doc.rect(14, barY, barMaxWidth, 5, 'F');
    doc.setFillColor(r, g, b);
    doc.rect(14, barY, Math.max(barWidth, 1), 5, 'F');
    doc.setFontSize(7);
    doc.setTextColor(200, 200, 200);
    doc.text(cat.length > 30 ? cat.substring(0, 28) + '…' : cat, 16, barY + 3.8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(r, g, b);
    doc.text(String(count), pageW - 14, barY + 3.8, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    barY += 8;
    if (barY > pageH - 20) { doc.addPage(); barY = 20; }
  });
  const categoriesToRender = selectedCategories.filter(cat => CATEGORY_ORDER.includes(cat));
  selectedCategories.forEach(cat => {
    if (!CATEGORY_ORDER.includes(cat) && !categoriesToRender.includes(cat))
      categoriesToRender.push(cat);
  });
  categoriesToRender.sort((a, b) => {
    const indexA = CATEGORY_ORDER.indexOf(a);
    const indexB = CATEGORY_ORDER.indexOf(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });
  categoriesToRender.forEach((categoria) => {
    const catAtletas = atletas
      .filter(a => (a.categoria || 'Sin categoría') === categoria)
      .sort((a, b) => Number(a.bib_number ?? 9999) - Number(b.bib_number ?? 9999));
    if (catAtletas.length === 0) return;
    doc.addPage();
    const [r, g, b] = getCategoryColor(categoria);
    doc.setFillColor(r, g, b);
    doc.rect(0, 0, pageW, 20, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(categoria.toUpperCase(), pageW / 2, 13, { align: 'center' });
    doc.setFontSize(9);
    doc.text(`${catAtletas.length} ATLETAS`, pageW - 14, 13, { align: 'right' });
    const rows = catAtletas.map((a, idx) => [
      String(idx + 1),
      a.bib_number ? `#${a.bib_number}` : '---',
      `${a.nombre} ${a.apellido}`.toUpperCase(),
      `V-${a.cedula}`,
      a.telefono || 'N/A',
      a.talla_camiseta || 'N/A',
      a.pago_verificado ? '✓' : '—',
      a.kit_entregado ? '✓' : '—',
    ]);
    autoTable(doc, {
      startY: 25,
      head: [['#', 'Dorsal', 'Atleta', 'Cédula', 'Teléfono', 'Talla', 'Pago', 'Kit']],
      body: rows,
      theme: 'plain',
      styles: { fontSize: 8, cellPadding: 3, textColor: [255, 255, 255], lineColor: [40, 40, 40], lineWidth: 0.1, fillColor: [5, 5, 5] },
      headStyles: { fillColor: [r, g, b], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [15, 15, 15] },
    });
  });
  const totalPages = (doc.internal as any).getNumberOfPages?.() ?? 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(6);
    doc.setTextColor(80, 80, 80);
    doc.text(`RAYOCERO · Valkyron Group · Pág ${i}/${totalPages}`, pageW / 2, pageH - 5, { align: 'center' });
  }
  const suffix = mode === 'general' ? 'GENERAL' : mode === 'specific' ? selectedCategories[0]?.replace(/\s+/g, '_').toUpperCase() : 'SEGMENTADO';
  doc.save(`RAYOCERO_${suffix}_${Date.now()}.pdf`);
};

const PDFExportModal: React.FC<PDFExportModalProps> = ({ atletas, raceName, onClose }) => {
  const [mode, setMode] = useState<PDFMode>('segmented');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const availableCategories = useMemo(() => {
    const cats = new Set(atletas.map(a => a.categoria || 'Sin categoría'));
    return CATEGORY_ORDER.filter(c => cats.has(c));
  }, [atletas]);
  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      let categoriesToInclude: string[] = [];
      if (mode === 'segmented') categoriesToInclude = availableCategories;
      else if (mode === 'specific') {
        if (!selectedCategory) { alert('Selecciona una categoría.'); setIsGenerating(false); return; }
        categoriesToInclude = [selectedCategory];
      } else {
        categoriesToInclude = [...new Set(atletas.map(a => a.categoria || 'Sin categoría'))];
      }
      generateCategoryPDF(atletas, categoriesToInclude, mode, raceName);
    } catch (err: any) {
      alert(`Error al generar PDF: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };
  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
      <div className="bg-[#0a0a0a] border border-cyan-500/30 rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-in zoom-in-95">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-black text-white uppercase italic tracking-widest">Exportar PDF</h3>
            <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">{raceName} · Selecciona el modo de exportación</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={20} /></button>
        </div>
        <div className="space-y-3 mb-6">
          {[
            { id: 'segmented' as PDFMode, label: 'Segmentado por categoría', desc: `Portada con barras + sección por cada categoría (${availableCategories.length} categorías, ${atletas.length} atletas)` },
            { id: 'specific' as PDFMode, label: 'Categoría específica', desc: 'Exporta solo una categoría seleccionada' },
            { id: 'general' as PDFMode, label: 'Lista general', desc: 'Todos los atletas en una sola tabla sin segmentar' },
          ].map(opt => (
            <button key={opt.id} onClick={() => setMode(opt.id)}
              className={`w-full text-left p-4 rounded-2xl border transition-all ${mode === opt.id ? 'bg-cyan-500/10 border-cyan-500/40 text-white' : 'bg-white/[0.02] border-white/5 text-gray-400 hover:border-white/10'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${mode === opt.id ? 'bg-cyan-400 border-cyan-400' : 'border-gray-600'}`} />
                <div>
                  <p className="text-xs font-black uppercase tracking-wide">{opt.label}</p>
                  <p className="text-[9px] text-gray-500 mt-0.5">{opt.desc}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
        {mode === 'specific' && (
          <div className="mb-6 animate-in slide-in-from-top-2">
            <label className="text-[10px] text-cyan-400 font-black uppercase tracking-widest mb-2 block">Categoría</label>
            <div className="relative">
              <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-bold outline-none focus:border-cyan-500/50 appearance-none cursor-pointer">
                <option value="">— Seleccionar —</option>
                {availableCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-white/5 font-bold hover:bg-white/10 transition-all text-xs uppercase">Cancelar</button>
          <button onClick={handleGenerate} disabled={isGenerating}
            className="flex-1 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase text-xs tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {isGenerating ? <RefreshCw size={14} className="animate-spin" /> : <FileText size={14} />}
            {isGenerating ? 'Generando...' : 'Generar PDF'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

/* ────────────────────────────────────────────────────────────── */
/* [V2-4] MÓDULO ENTREGA DE KITS Y RFID — filtrado por scope      */
/* ────────────────────────────────────────────────────────────── */

const ModuloEntregaKits = ({ scope }: { scope: RaceScope }) => {
  const [bibInput, setBibInput] = useState<string>('');
  const [epcInput, setEpcInput] = useState<string>('');
  const [activeRunner, setActiveRunner] = useState<Runner | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const epcInputRef = useRef<HTMLInputElement>(null);

  const searchRunner = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!bibInput) return;
    setIsLoading(true); setStatusMsg(null); setActiveRunner(null);
    let query = supabase.from('runners')
      .select('id, bib_number, nombre, apellido, cedula, categoria, rfid_epc, talla_camiseta')
      .eq('bib_number', parseInt(bibInput, 10));
    query = applyScopeFilter(query, scope);
    const { data, error } = await query.maybeSingle();
    setIsLoading(false);
    if (error || !data) { setStatusMsg({ text: `Objetivo DORSAL #${bibInput} no localizado en ${scope.name}.`, type: 'error' }); return; }
    if (data.rfid_epc) { setStatusMsg({ text: `ALERTA: El dorsal ${data.bib_number} ya posee el chip enlazado (${data.rfid_epc}).`, type: 'error' }); return; }
    setActiveRunner(data as Runner);
    setStatusMsg({ text: 'Identidad confirmada. Proceda a escanear el chip RFID sobre el sensor HID.', type: 'info' });
    setTimeout(() => epcInputRef.current?.focus(), 100);
  };

  const handleEpcScan = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!activeRunner || !epcInput) return;
      setIsLoading(true);
      const { error } = await supabase.from('runners').update({ rfid_epc: epcInput }).eq('id', activeRunner.id);
      setIsLoading(false);
      if (error) { setStatusMsg({ text: `Falla de enlace: ${error.message}`, type: 'error' }); setEpcInput(''); }
      else { setStatusMsg({ text: `APROVISIONAMIENTO EXITOSO: Chip asignado al Dorsal #${activeRunner.bib_number}`, type: 'success' }); setBibInput(''); setEpcInput(''); setActiveRunner(null); }
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-black/40 border border-cyan-500/20 rounded-2xl p-8 shadow-2xl relative overflow-hidden animate-in fade-in">
      <div className="absolute top-0 right-0 bg-cyan-500/10 text-cyan-400 font-black text-xs px-4 py-2 rounded-bl-2xl border-b border-l border-cyan-500/20">ENLACE RFID · {scope.name.toUpperCase()}</div>
      <h3 className="text-xl font-black text-white uppercase italic tracking-widest flex items-center gap-3 mb-8"><Package className="text-cyan-400" /> Centro de Aprovisionamiento</h3>
      {statusMsg && (
        <div className={`p-4 mb-8 rounded-xl border backdrop-blur-md font-mono text-xs uppercase font-bold tracking-wider ${statusMsg.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : statusMsg.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'}`}>
          {statusMsg.type === 'success' && <CheckCircle size={16} className="inline mr-2 mb-1" />}
          {statusMsg.type === 'error' && <AlertTriangle size={16} className="inline mr-2 mb-1" />}
          {statusMsg.text}
        </div>
      )}
      <form onSubmit={searchRunner} className="flex gap-4 mb-8">
        <div className="flex-1">
          <label className="text-[10px] text-cyan-400 font-black uppercase tracking-widest mb-2 block">Número de Dorsal Físico</label>
          <input type="number" value={bibInput} onChange={e => setBibInput(e.target.value)} disabled={activeRunner !== null}
            className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-5 py-4 text-2xl font-black text-white outline-none focus:border-cyan-500/50 transition-colors disabled:opacity-50"
            placeholder="Ej: 0001" autoFocus />
        </div>
        <div className="flex items-end">
          <button type="submit" disabled={!bibInput || isLoading || activeRunner !== null}
            className="h-[64px] px-8 flex items-center justify-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-[0.2em] transition-all disabled:opacity-50">
            {isLoading && !activeRunner ? <RefreshCw className="animate-spin" size={18} /> : <Search size={18} />} Localizar
          </button>
        </div>
      </form>
      {activeRunner && (
        <div className="space-y-6 border-t border-white/10 pt-8 animate-in slide-in-from-bottom-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/[0.02] border border-white/5 p-5 rounded-xl">
              <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mb-1">Objetivo Identificado</p>
              <p className="text-lg font-black text-white uppercase">{activeRunner.nombre} {activeRunner.apellido}</p>
              <p className="text-xs text-cyan-400 font-mono mt-1">CI: V-{activeRunner.cedula}</p>
            </div>
            <div className="bg-white/[0.02] border border-white/5 p-5 rounded-xl flex flex-col justify-center">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest">Categoría:</span>
                <span className="text-xs text-white font-bold">{activeRunner.categoria || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest">Talla Asignada:</span>
                <span className="text-xs bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded font-black">{activeRunner.talla_camiseta || 'N/A'}</span>
              </div>
            </div>
          </div>
          <div className="bg-cyan-900/10 border-2 border-dashed border-cyan-500/30 rounded-xl p-6 relative">
            <label className="text-[10px] text-cyan-400 font-black uppercase tracking-widest mb-4 flex items-center gap-2">
              <Scan size={14} /> Interceptación de Código EPC
            </label>
            <input ref={epcInputRef} type="text" value={epcInput} onChange={e => setEpcInput(e.target.value)} onKeyDown={handleEpcScan} disabled={isLoading}
              className="w-full bg-transparent border-b-2 border-cyan-500/50 pb-2 text-center text-xl font-mono text-white outline-none focus:border-cyan-400 transition-colors placeholder-cyan-500/20"
              placeholder="[ APROXIME EL CHIP AL LECTOR USB ]" />
            <p className="text-center text-[9px] text-gray-500 uppercase mt-4 tracking-widest">El sensor ejecutará el enlace automáticamente al leer el tag.</p>
          </div>
          <div className="flex justify-end">
            <button onClick={() => { setActiveRunner(null); setBibInput(''); }} className="text-[10px] uppercase font-black tracking-widest text-red-500 hover:text-red-400 transition-colors">[ Abortar Secuencia ]</button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ────────────────────────────────────────────────────────────── */
/* [V2-4] MÓDULO CHEQUEO DE KITS — filtrado por scope             */
/* ────────────────────────────────────────────────────────────── */

const ModuloChequeoKits = ({ scope }: { scope: RaceScope }) => {
  const [bibInput, setBibInput] = useState<string>('');
  const [activeRunner, setActiveRunner] = useState<Runner | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [stats, setStats] = useState({ total: 0, entregados: 0, pendientes: 0 });
  const bibInputRef = useRef<HTMLInputElement>(null);

  const fetchStats = useCallback(async () => {
    let query = supabase.from('runners').select('kit_entregado');
    query = applyScopeFilter(query, scope);
    const { data } = await query;
    if (data) {
      const entregados = data.filter(r => r.kit_entregado).length;
      setStats({ total: data.length, entregados, pendientes: data.length - entregados });
    }
  }, [scope.raceId, scope.legacy]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const searchRunner = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!bibInput.trim()) return;
    setIsLoading(true); setStatusMsg(null); setActiveRunner(null);
    let query = supabase.from('runners')
      .select('id, bib_number, nombre, apellido, cedula, categoria, talla_camiseta, kit_entregado, pago_verificado')
      .eq('bib_number', parseInt(bibInput, 10));
    query = applyScopeFilter(query, scope);
    const { data, error } = await query.maybeSingle();
    setIsLoading(false);
    if (error || !data) { setStatusMsg({ text: `Dorsal #${bibInput} no encontrado en ${scope.name}.`, type: 'error' }); return; }
    setActiveRunner(data as Runner);
    if (data.kit_entregado) setStatusMsg({ text: `⚠️ ALERTA: El kit del Dorsal #${data.bib_number} ya fue entregado anteriormente.`, type: 'error' });
    else setStatusMsg({ text: `Atleta identificado. Confirme la entrega del kit.`, type: 'info' });
  };

  const confirmarEntrega = async () => {
    if (!activeRunner) return;
    setIsLoading(true);
    const { error } = await supabase.from('runners').update({ kit_entregado: true }).eq('id', activeRunner.id);
    setIsLoading(false);
    if (error) { setStatusMsg({ text: `Error: ${error.message}`, type: 'error' }); }
    else {
      setStatusMsg({ text: `✅ KIT ENTREGADO — Dorsal #${activeRunner.bib_number} · ${activeRunner.nombre} ${activeRunner.apellido}`, type: 'success' });
      setActiveRunner(null); setBibInput(''); fetchStats();
      setTimeout(() => { setStatusMsg(null); bibInputRef.current?.focus(); }, 2500);
    }
  };

  const deshacerEntrega = async () => {
    if (!activeRunner) return;
    setIsLoading(true);
    const { error } = await supabase.from('runners').update({ kit_entregado: false }).eq('id', activeRunner.id);
    setIsLoading(false);
    if (!error) { setStatusMsg({ text: `Entrega revertida para Dorsal #${activeRunner.bib_number}`, type: 'info' }); setActiveRunner(null); setBibInput(''); fetchStats(); }
  };

  const pct = stats.total > 0 ? Math.round((stats.entregados / stats.total) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-black/40 border border-white/10 rounded-2xl p-6 text-center">
          <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mb-1">Total · {scope.name}</p>
          <p className="text-4xl font-black italic text-white">{stats.total}</p>
        </div>
        <div className="bg-black/40 border border-green-500/20 rounded-2xl p-6 text-center">
          <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mb-1">Entregados</p>
          <p className="text-4xl font-black italic text-green-400">{stats.entregados}</p>
        </div>
        <div className="bg-black/40 border border-yellow-500/20 rounded-2xl p-6 text-center">
          <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mb-1">Pendientes</p>
          <p className="text-4xl font-black italic text-yellow-400">{stats.pendientes}</p>
        </div>
      </div>
      <div className="bg-black/40 border border-white/10 rounded-2xl p-6">
        <div className="flex justify-between items-center mb-3">
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Progreso de Entrega</p>
          <p className="text-lg font-black italic text-white">{pct}%</p>
        </div>
        <div className="h-3 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-cyan-500 to-green-400 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="bg-black/40 border border-amber-500/20 rounded-2xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 bg-amber-500/10 text-amber-400 font-black text-xs px-4 py-2 rounded-bl-2xl border-b border-l border-amber-500/20">CHEQUEO · {scope.name.toUpperCase()}</div>
        <h3 className="text-xl font-black text-white uppercase italic tracking-widest flex items-center gap-3 mb-8"><Gift className="text-amber-400" /> Entrega de Kit</h3>
        {statusMsg && (
          <div className={`p-4 mb-6 rounded-xl border font-mono text-xs uppercase font-bold tracking-wider ${statusMsg.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : statusMsg.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>
            {statusMsg.text}
          </div>
        )}
        <form onSubmit={searchRunner} className="flex gap-4 mb-6">
          <div className="flex-1">
            <label className="text-[10px] text-amber-400 font-black uppercase tracking-widest mb-2 block">Número de Dorsal</label>
            <input ref={bibInputRef} type="number" value={bibInput} onChange={e => setBibInput(e.target.value)}
              className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-5 py-4 text-2xl font-black text-white outline-none focus:border-amber-500/50 transition-colors"
              placeholder="Ej: 0001" autoFocus />
          </div>
          <div className="flex items-end">
            <button type="submit" disabled={!bibInput.trim() || isLoading}
              className="h-[64px] px-8 flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-[0.2em] transition-all disabled:opacity-50">
              {isLoading ? <RefreshCw className="animate-spin" size={18} /> : <Search size={18} />} Buscar
            </button>
          </div>
        </form>
        {activeRunner && (
          <div className="border-t border-white/10 pt-6 space-y-4 animate-in slide-in-from-bottom-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 bg-white/[0.02] border border-white/5 p-5 rounded-xl">
                <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mb-2">Atleta</p>
                <p className="text-2xl font-black text-white uppercase">{activeRunner.nombre} {activeRunner.apellido}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-cyan-400 font-mono">V-{activeRunner.cedula}</span>
                  <span className="text-[8px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded font-black uppercase">{activeRunner.categoria || 'SIN CAT'}</span>
                  {activeRunner.pago_verificado && <span className="text-[8px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded font-black uppercase flex items-center gap-1"><ShieldCheck size={10} /> PAGO OK</span>}
                </div>
              </div>
              <div className="bg-white/[0.02] border border-white/5 p-5 rounded-xl flex flex-col items-center justify-center">
                <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mb-1">Talla</p>
                <p className="text-4xl font-black italic text-amber-400">{activeRunner.talla_camiseta || 'N/A'}</p>
              </div>
            </div>
            <div className="flex gap-3">
              {!activeRunner.kit_entregado ? (
                <button onClick={confirmarEntrega} disabled={isLoading}
                  className="flex-1 py-4 rounded-xl bg-green-500 hover:bg-green-400 text-black font-black uppercase text-sm tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-3">
                  {isLoading ? <RefreshCw size={18} className="animate-spin" /> : <CheckCircle size={18} />} Confirmar Entrega de Kit
                </button>
              ) : (
                <>
                  <div className="flex-1 py-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 font-black uppercase text-sm tracking-widest flex items-center justify-center gap-3"><CheckCircle size={18} /> Kit Ya Entregado</div>
                  <button onClick={deshacerEntrega} disabled={isLoading} className="px-6 py-4 rounded-xl bg-white/5 hover:bg-red-500/10 text-red-400 border border-red-500/20 font-black uppercase text-xs tracking-widest transition-all">Revertir</button>
                </>
              )}
              <button onClick={() => { setActiveRunner(null); setBibInput(''); setStatusMsg(null); }} className="px-6 py-4 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-black uppercase text-xs tracking-widest transition-all">Cancelar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────── */
/* [V2-3] TASA CONFIG — por carrera (system_config.race_id)       */
/* ────────────────────────────────────────────────────────────── */

const TasaConfig = ({ scope }: { scope: RaceScope }) => {
  const [tasaActual, setTasaActual] = useState<number | null>(null);
  const [nuevaTasa, setNuevaTasa] = useState('');
  const [costoUSDActual, setCostoUSDActual] = useState<number | null>(null);
  const [nuevoCostoUSD, setNuevoCostoUSD] = useState('');
  const [ultimaActualizacion, setUltimaActualizacion] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [configRowId, setConfigRowId] = useState<number | null>(null);

  const fetchConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      let data: any = null;

      // Carrera nueva → busca su fila por race_id
      if (!scope.legacy && scope.raceId) {
        const byRace = await supabase
          .from('system_config')
          .select('*')
          .eq('race_id', scope.raceId)
          .maybeSingle();
        data = byRace.data;
      }

      // Legacy (Lara) o sin fila propia → fila id=1
      if (!data) {
        const fallback = await supabase.from('system_config').select('*').eq('id', 1).single();
        data = fallback.data;
      }

      if (data) {
        setConfigRowId(data.id);
        setTasaActual(data.tasa_bcv); setNuevaTasa(String(data.tasa_bcv));
        setCostoUSDActual(data.costo_usd || 40); setNuevoCostoUSD(String(data.costo_usd || 40));
        setUltimaActualizacion(new Date(data.ultima_actualizacion).toLocaleString('es-VE'));
      }
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  }, [scope.raceId, scope.legacy]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleUpdateProtocol = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSaving(true);
    try {
      if (configRowId === null) throw new Error('Fila de configuración no localizada');
      const parsedTasa = parseFloat(nuevaTasa.replace(',', '.'));
      const parsedCosto = parseFloat(nuevoCostoUSD.replace(',', '.'));
      const { error } = await supabase
        .from('system_config')
        .update({ tasa_bcv: parsedTasa, costo_usd: parsedCosto, ultima_actualizacion: new Date().toISOString() })
        .eq('id', configRowId);
      if (error) throw error;
      await fetchConfig(); setSuccessMsg(true); setTimeout(() => setSuccessMsg(false), 3000);
    } catch (err: any) { alert(err.message); } finally { setIsSaving(false); }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
      <div className="bg-black/40 border border-cyan-500/20 rounded-2xl p-8">
        <h4 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
          <Settings size={18} className="text-cyan-400" /> Parámetros Financieros
          <span className="text-[8px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded font-black uppercase ml-2">{scope.name}</span>
        </h4>
        <form onSubmit={handleUpdateProtocol} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="tasa_bcv_input" className="text-[10px] text-cyan-400 font-black uppercase tracking-widest mb-2 block">Tasa BCV</label>
              <input id="tasa_bcv_input" name="tasa_bcv" type="text" value={nuevaTasa} onChange={e => setNuevaTasa(e.target.value)} className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-5 py-4 text-white outline-none focus:border-cyan-500/50 transition-colors" />
            </div>
            <div>
              <label htmlFor="costo_usd_input" className="text-[10px] text-cyan-400 font-black uppercase tracking-widest mb-2 block">Inscripción USD</label>
              <input id="costo_usd_input" name="costo_usd" type="text" value={nuevoCostoUSD} onChange={e => setNuevoCostoUSD(e.target.value)} className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-5 py-4 text-white outline-none focus:border-cyan-500/50 transition-colors" />
            </div>
          </div>
          <button type="submit" disabled={isSaving || isLoading} className="w-full flex items-center justify-center gap-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black px-6 py-4 text-xs font-black uppercase tracking-[0.2em] transition-all">
            {isSaving ? <RefreshCw className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />}
            {isSaving ? 'ACTUALIZANDO...' : 'SINCRONIZAR'}
          </button>
          {successMsg && <div className="flex items-center justify-center gap-2 text-green-400 animate-pulse"><CheckCircle size={16} /> <span className="text-[10px] uppercase font-bold">Sincronización Exitosa</span></div>}
        </form>
      </div>
      <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-2xl p-8 flex flex-col justify-center">
        {isLoading ? <div className="flex justify-center"><Activity size={48} className="animate-pulse text-cyan-500" /></div> : (
          <div className="space-y-4">
            <div className="flex justify-around items-center">
              <div><p className="text-[8px] text-gray-500 uppercase">Tasa</p><div className="text-4xl font-black italic text-white">{tasaActual?.toFixed(2)}</div></div>
              <div className="h-12 w-[1px] bg-white/10" />
              <div><p className="text-[8px] text-gray-500 uppercase">Inscripción</p><div className="text-4xl font-black italic text-cyan-400">${costoUSDActual}</div></div>
            </div>
            <div className="text-[10px] text-cyan-400 font-mono text-center">{ultimaActualizacion}</div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────── */
/* [V2-2] ATLETAS LIST — filtrada por scope                       */
/* ────────────────────────────────────────────────────────────── */

const AtletasList = ({ scope, onUpdateCount }: { scope: RaceScope; onUpdateCount?: (count: number) => void }) => {
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
  const [isTogglingKit, setIsTogglingKit] = useState<string | null>(null);
  const [showPDFModal, setShowPDFModal] = useState(false);

  const fetchAtletas = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('runners').select('*').order('created_at', { ascending: false });
      query = applyScopeFilter(query, scope);
      const { data, error } = await query;
      if (error) throw error;
      setAtletas(data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [scope.raceId, scope.legacy]);

  useEffect(() => { fetchAtletas(); }, [fetchAtletas]);
  useEffect(() => { if (onUpdateCount) onUpdateCount(atletas.length); }, [atletas.length, onUpdateCount]);

  const toggleVerificacionPago = async (id: string, currentStatus: boolean | undefined) => {
    setIsTogglingPayment(id);
    const newStatus = !currentStatus;
    try {
      const { error } = await supabase.from('runners').update({ pago_verificado: newStatus }).eq('id', id);
      if (error) throw error;
      setAtletas(prev => prev.map(a => a.id === id ? { ...a, pago_verificado: newStatus } : a));
      if (selectedAtleta?.id === id) setSelectedAtleta(prev => prev ? { ...prev, pago_verificado: newStatus } : null);
    } catch (err: any) { alert(`ERROR: ${err.message}`); } finally { setIsTogglingPayment(null); }
  };

  const toggleKitEntregado = async (id: string, currentStatus: boolean | undefined) => {
    setIsTogglingKit(id);
    const newStatus = !currentStatus;
    try {
      const { error } = await supabase.from('runners').update({ kit_entregado: newStatus }).eq('id', id);
      if (error) throw error;
      setAtletas(prev => prev.map(a => a.id === id ? { ...a, kit_entregado: newStatus } : a));
      if (selectedAtleta?.id === id) setSelectedAtleta(prev => prev ? { ...prev, kit_entregado: newStatus } : null);
    } catch (err: any) { alert(`ERROR: ${err.message}`); } finally { setIsTogglingKit(null); }
  };

  const handleDeleteAthlete = async () => {
    if (!athleteToDelete || isDeleting) return;
    setIsDeleting(true);
    const targetId = athleteToDelete.id; const targetCedula = athleteToDelete.cedula; const targetBib = athleteToDelete.bib_number;
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
      const { error: finalError } = await supabase.from('runners').delete().eq('id', targetId);
      if (finalError) throw finalError;
      setAtletas(prev => prev.filter(a => a.id !== targetId));
      setAthleteToDelete(null);
    } catch (err: any) { alert(`ERROR: ${err.message}`); } finally { setIsDeleting(false); }
  };

  const inspectComprobante = async (atleta: Runner) => {
    setSelectedAtleta(atleta); setComprobanteUrl(null); setImgLoading(true); setStatusMsg('Escaneando Hangar...');
    try {
      const url = await getComprobantePublicUrl(atleta.cedula, atleta.referencia_pago, atleta.comprobante_url || atleta.comprobante_path);
      if (!url) setStatusMsg(`Archivo no detectado — V-${atleta.cedula}`);
      else setComprobanteUrl(url);
    } catch { setStatusMsg('Error de enlace visual'); } finally { setImgLoading(false); }
  };

  const filteredAtletas = useMemo(() => atletas.filter(a =>
    `${a.nombre} ${a.apellido} ${a.cedula} ${a.categoria || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
  ), [atletas, searchTerm]);

  const kitsEntregados = atletas.filter(a => a.kit_entregado).length;

  return (
    <div className="relative text-white">
      <div className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowPDFModal(true)} className="px-4 py-2 rounded-lg bg-white/5 text-cyan-400 border border-cyan-400/20 hover:bg-cyan-400 hover:text-black flex items-center gap-2 text-[10px] uppercase font-black transition-all">
              <FileText size={14} /> Exportar PDF
            </button>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Gift size={14} className="text-amber-400" />
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider">Kits: {kitsEntregados}/{atletas.length}</span>
            </div>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
            <input id="filter_atletas" name="filter_atletas" type="text" placeholder="Filtrar base..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-[10px] uppercase font-bold outline-none focus:border-cyan-500/30 transition-all" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-white/5">
                <th className="p-4 text-left text-[9px] uppercase text-gray-400">Atleta / Categoría</th>
                <th className="p-4 text-left text-[9px] uppercase text-gray-400">Comunicación</th>
                <th className="p-4 text-left text-[9px] uppercase text-gray-400">Talla</th>
                <th className="p-4 text-left text-[9px] uppercase text-gray-400">Dorsal & RFID</th>
                <th className="p-4 text-center text-[9px] uppercase text-gray-400">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={5} className="p-20 text-center text-cyan-500 font-black animate-pulse uppercase tracking-widest">Reconstruyendo Hangar...</td></tr>
              ) : filteredAtletas.length === 0 ? (
                <tr><td colSpan={5} className="p-20 text-center text-gray-600 font-black uppercase tracking-widest text-[10px]">
                  {searchTerm ? 'Sin coincidencias' : `Sin atletas registrados en ${scope.name} todavía`}
                </td></tr>
              ) : filteredAtletas.map(a => (
                <tr key={a.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-xs uppercase flex items-center gap-2">
                      {a.nombre} {a.apellido}
                      {a.pago_verificado && <ShieldCheck size={12} className="text-green-500" />}
                      {a.kit_entregado && <Gift size={12} className="text-amber-400" />}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] text-gray-500 font-mono">V-{a.cedula}</span>
                      <span className="text-[8px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded font-black uppercase tracking-wider">{a.categoria || 'SIN CAT'}</span>
                    </div>
                  </td>
                  <td className="p-4"><div className="flex items-center gap-2 text-cyan-400 text-[10px] font-mono"><Phone size={12} /> {a.telefono || 'SIN_TLF'}</div></td>
                  <td className="p-4"><span className="text-xs font-mono bg-white/5 px-2 py-1 rounded border border-white/10 text-white">{a.talla_camiseta || 'N/A'}</span></td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-white">{a.bib_number ? `#${a.bib_number}` : <Clock size={14} className="text-yellow-500/50" />}</span>
                      {a.rfid_epc && <span className="text-[8px] text-cyan-400 font-mono tracking-widest mt-1">RFID CONFIRMADO</span>}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => inspectComprobante(a)} className="p-2 rounded-lg bg-white/5 hover:bg-cyan-500 hover:text-black transition-all" title="Ver comprobante"><Eye size={16} /></button>
                      <button onClick={() => toggleVerificacionPago(a.id, a.pago_verificado)} disabled={isTogglingPayment === a.id}
                        className={`p-2 rounded-lg transition-all border ${a.pago_verificado ? 'bg-green-500/10 text-green-500 border-green-500/30 hover:bg-green-500 hover:text-black' : 'bg-white/5 text-gray-500 border-transparent hover:bg-white/10 hover:text-white'}`} title="Verificar pago">
                        {isTogglingPayment === a.id ? <RefreshCw size={16} className="animate-spin" /> : <CheckSquare size={16} />}
                      </button>
                      <button onClick={() => toggleKitEntregado(a.id, a.kit_entregado)} disabled={isTogglingKit === a.id}
                        className={`p-2 rounded-lg transition-all border ${a.kit_entregado ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500 hover:text-black' : 'bg-white/5 text-gray-500 border-transparent hover:bg-amber-500/20 hover:text-amber-400'}`}
                        title={a.kit_entregado ? 'Kit entregado — click para revertir' : 'Marcar kit entregado'}>
                        {isTogglingKit === a.id ? <RefreshCw size={16} className="animate-spin" /> : <Gift size={16} />}
                      </button>
                      <button onClick={() => setAthleteToDelete(a)} className="p-2 rounded-lg bg-white/5 hover:bg-red-500 hover:text-black text-red-500 transition-all" title="Eliminar"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showPDFModal && <PDFExportModal atletas={atletas} raceName={scope.name} onClose={() => setShowPDFModal(false)} />}

      {selectedAtleta && createPortal(
        <div onClick={() => setSelectedAtleta(null)} className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm">
          <div onClick={e => e.stopPropagation()} className="bg-[#0a0f14] border border-cyan-400/20 rounded-3xl w-full max-w-6xl overflow-hidden flex flex-col md:flex-row shadow-2xl animate-in zoom-in-95">
            <div className="flex-1 bg-black flex items-center justify-center p-4 min-h-[400px]">
              {imgLoading ? <div className="text-center"><RefreshCw className="animate-spin text-cyan-400 mb-4" size={40} /><p className="text-cyan-400 text-xs uppercase">Enlazando Hangar...</p></div>
                : comprobanteUrl ? <img src={comprobanteUrl} alt="comprobante" className="max-h-[80vh] object-contain shadow-2xl" />
                : <div className="text-center"><ShieldAlert size={60} className="text-gray-700 mb-4" /><p className="text-gray-500 text-xs uppercase">{statusMsg}</p></div>}
            </div>
            <div className="w-full md:w-[350px] bg-[#0d1319] border-l border-white/5 p-8 flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div><h5 className="text-white font-black text-xl uppercase italic">Inspección</h5><p className="text-cyan-400 text-[9px] uppercase tracking-widest">Hangar Scan</p></div>
                <button onClick={() => setSelectedAtleta(null)} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-all"><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div className="bg-white/[0.03] p-4 rounded-xl border border-white/5">
                  <p className="text-gray-500 text-[9px] uppercase">Unidad</p>
                  <p className="text-white font-black text-sm uppercase flex justify-between items-center">{selectedAtleta.nombre} {selectedAtleta.apellido}{selectedAtleta.pago_verificado && <ShieldCheck size={14} className="text-green-500" />}</p>
                  <p className="text-cyan-400 font-mono text-xs">V-{selectedAtleta.cedula}</p>
                </div>
                <div className="bg-white/[0.03] p-4 rounded-xl border border-white/5"><p className="text-gray-500 text-[9px] uppercase">Categoría Asignada</p><p className="text-cyan-400 font-black uppercase tracking-wider">{selectedAtleta.categoria || 'SIN ASIGNAR'}</p></div>
                <div className="bg-white/[0.03] p-4 rounded-xl border border-white/5"><p className="text-gray-500 text-[9px] uppercase">Teléfono</p><p className="text-white font-mono">{selectedAtleta.telefono || 'SIN REGISTRO'}</p></div>
                <div className="bg-white/[0.03] p-4 rounded-xl border border-white/5"><p className="text-gray-500 text-[9px] uppercase">Talla Reservada</p><p className="text-white font-mono uppercase">{selectedAtleta.talla_camiseta || 'NO ESPECIFICADA'}</p></div>
                <div className="bg-white/[0.03] p-4 rounded-xl border border-white/5"><p className="text-gray-500 text-[9px] uppercase">Referencia</p><p className="text-green-400 font-mono break-all">{selectedAtleta.referencia_pago || 'PENDIENTE'}</p></div>
                <div className={`p-4 rounded-xl border flex items-center justify-between ${selectedAtleta.kit_entregado ? 'bg-amber-500/10 border-amber-500/30' : 'bg-white/[0.03] border-white/5'}`}>
                  <div><p className="text-gray-500 text-[9px] uppercase">Kit</p><p className={`font-black text-sm uppercase ${selectedAtleta.kit_entregado ? 'text-amber-400' : 'text-gray-500'}`}>{selectedAtleta.kit_entregado ? 'Entregado ✓' : 'Pendiente'}</p></div>
                  <button onClick={() => toggleKitEntregado(selectedAtleta.id, selectedAtleta.kit_entregado)} disabled={isTogglingKit === selectedAtleta.id}
                    className={`p-2 rounded-lg transition-all ${selectedAtleta.kit_entregado ? 'bg-amber-500/20 text-amber-400' : 'bg-white/5 text-gray-500 hover:text-amber-400'}`}>
                    {isTogglingKit === selectedAtleta.id ? <RefreshCw size={14} className="animate-spin" /> : <Gift size={14} />}
                  </button>
                </div>
                <button onClick={() => toggleVerificacionPago(selectedAtleta.id, selectedAtleta.pago_verificado)} disabled={isTogglingPayment === selectedAtleta.id}
                  className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase transition-all ${selectedAtleta.pago_verificado ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-cyan-500 hover:bg-cyan-400 text-black'}`}>
                  {isTogglingPayment === selectedAtleta.id ? <RefreshCw size={14} className="animate-spin" /> : selectedAtleta.pago_verificado ? <><CheckCircle size={14} /> PAGO VALIDADO</> : <><ShieldCheck size={14} /> APROBAR PAGO</>}
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
/* ESCUADRONES                                                    */
/* ────────────────────────────────────────────────────────────── */

const EscuadronesList = () => {
  const [equipos, setEquipos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEquipos = async () => {
      setLoading(true);
      try {
        const { data: teamsData, error: teamsError } = await supabase.from('teams').select('*');
        if (teamsError) throw teamsError;
        if (!teamsData || teamsData.length === 0) { setEquipos([]); return; }
        const runnerIds = [...new Set(teamsData.flatMap(t => [t.runner_m1_id, t.runner_m2_id, t.runner_f1_id, t.runner_f2_id]).filter(Boolean))];
        // [V2.1] Join manual: la FK race_results_bib_number_fkey fue eliminada
        // al pasar a dorsales por carrera, así que el embed ya no existe.
        const { data: runnersData, error: runnersError } = await supabase.from('runners')
          .select('id, nombre, apellido, bib_number, telefono, talla_camiseta, categoria')
          .in('id', runnerIds);
        if (runnersError) throw runnersError;
        const bibs = (runnersData || []).map(r => r.bib_number).filter(Boolean);
        const { data: resultsData } = bibs.length > 0
          ? await supabase.from('race_results').select('bib_number, tiempo_chip').in('bib_number', bibs)
          : { data: [] as any[] };
        const resultsMap = new Map((resultsData || []).map(r => [r.bib_number, r]));
        const runnersMap = new Map(runnersData?.map(r => [r.id, r]));
        const processedTeams = teamsData.map(team => {
          const membersIds = [team.runner_m1_id, team.runner_m2_id, team.runner_f1_id, team.runner_f2_id];
          let totalSeconds = 0; let allFinished = true;
          const detailedMembers = membersIds.map(id => {
            const memberData = runnersMap.get(id);
            if (!memberData) return null;
            const timeRaw = resultsMap.get((memberData as any).bib_number)?.tiempo_chip;
            const secs = parseTimeToSeconds(timeRaw);
            if (secs > 0) totalSeconds += secs; else allFinished = false;
            return { nombre: `${memberData.nombre} ${memberData.apellido}`, bib: memberData.bib_number, telefono: memberData.telefono, talla_camiseta: memberData.talla_camiseta, categoria: memberData.categoria, tiempoStr: secs > 0 ? formatSeconds(secs) : 'EN PISTA', secs };
          }).filter(Boolean);
          return { ...team, members: detailedMembers, totalTimeStr: allFinished && totalSeconds > 0 ? formatSeconds(totalSeconds) : 'OPERATIVO', totalSeconds: allFinished ? totalSeconds : 0 };
        });
        processedTeams.sort((a, b) => { if (a.totalSeconds === 0) return 1; if (b.totalSeconds === 0) return -1; return a.totalSeconds - b.totalSeconds; });
        setEquipos(processedTeams);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchEquipos();
  }, []);

  if (loading) return (
    <div className="py-20 text-center bg-white/[0.02] rounded-2xl border border-white/5 animate-pulse">
      <Users className="h-10 w-10 text-cyan-500 mx-auto mb-4" />
      <p className="text-[10px] font-black tracking-[0.4em] text-cyan-500 uppercase">Enlazando Escuadrones...</p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in">
      {equipos.length === 0 ? (
        <div className="col-span-full py-20 text-center bg-white/[0.02] rounded-2xl border border-white/5">
          <p className="text-[10px] font-black tracking-[0.4em] text-gray-500 uppercase">No hay escuadrones activos</p>
        </div>
      ) : equipos.map((equipo, index) => (
        <div key={equipo.id} className="bg-black/40 border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden group hover:border-cyan-500/30 transition-all">
          <div className="absolute top-0 right-0 bg-cyan-500 text-black font-black text-xs px-4 py-1 rounded-bl-xl shadow-lg">RANGO #{index + 1}</div>
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-cyan-500/10 p-3 rounded-xl border border-cyan-500/20"><Users size={20} className="text-cyan-400" /></div>
            <div>
              <h3 className="text-xl font-black text-white italic uppercase tracking-widest">{equipo.team_name}</h3>
              <p className="text-[9px] text-gray-400 uppercase tracking-[0.2em]">Fuerza Operativa: {equipo.members.length}/4</p>
            </div>
          </div>
          <div className="space-y-3 mb-6">
            {equipo.members.map((m: any, i: number) => (
              <div key={i} className="flex justify-between items-center bg-white/[0.03] p-3 rounded-xl border border-white/5">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white uppercase">{m.nombre}</span>
                  <span className="text-[9px] text-gray-500 font-mono">DORSAL #{m.bib || '---'} — {m.categoria || 'SIN CAT'} — TALLA: {m.talla_camiseta || 'N/A'}</span>
                </div>
                <span className={`text-xs font-mono font-bold px-3 py-1 rounded-lg ${m.secs > 0 ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'bg-white/5 text-gray-400'}`}>{m.tiempoStr}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 pt-4 flex justify-between items-end">
            <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Tiempo Combinado</span>
            <span className={`text-3xl font-black italic tracking-tighter ${equipo.totalSeconds > 0 ? 'text-white' : 'text-gray-600'}`}>{equipo.totalTimeStr}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ────────────────────────────────────────────────────────────── */
/* PRE-RACE OVERLAY — Countdown fullscreen 60s                   */
/* ────────────────────────────────────────────────────────────── */

const PreRaceOverlay: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [seconds, setSeconds] = useState(60);
  const [fired, setFired] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setFired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const pct = seconds / 60;
  const r = pct > 0.5 ? Math.round((1 - pct) * 2 * 255) : 255;
  const g = pct > 0.5 ? 255 : Math.round(pct * 2 * 255);
  const color = `rgb(${r},${g},0)`;
  const glowColor = `rgba(${r},${g},0,0.35)`;

  const radius = 140;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - seconds / 60);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999999] flex flex-col items-center justify-center"
      style={{ background: fired ? 'rgba(0,255,80,0.08)' : 'rgba(0,0,0,0.96)', backdropFilter: 'blur(8px)', transition: 'background 0.4s' }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `radial-gradient(ellipse at center, ${glowColor} 0%, transparent 65%)`,
        animation: seconds <= 10 && !fired ? 'prerace-pulse 0.5s ease infinite' : undefined,
      }} />

      <style>{`
        @keyframes prerace-pulse { 0%,100%{opacity:0.6} 50%{opacity:1} }
        @keyframes gun-flash { 0%{opacity:1;transform:scale(1)} 100%{opacity:0;transform:scale(3)} }
        @keyframes fired-bounce { 0%{transform:scale(0.7);opacity:0} 60%{transform:scale(1.08)} 100%{transform:scale(1);opacity:1} }
      `}</style>

      {!fired ? (
        <>
          <p className="text-white/40 text-xs font-black uppercase tracking-[0.5em] mb-12 relative z-10">
            PRE-CARRERA · ALERTA ATLETAS
          </p>

          <div className="relative flex items-center justify-center mb-12">
            <svg width="320" height="320" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="160" cy="160" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
              <circle
                cx="160" cy="160" r={radius}
                fill="none"
                stroke={color}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.5s ease', filter: `drop-shadow(0 0 12px ${color})` }}
              />
            </svg>
            <div className="absolute flex flex-col items-center" style={{ transform: 'rotate(0deg)' }}>
              <span
                className="font-black tabular-nums leading-none"
                style={{
                  fontSize: '9rem',
                  color,
                  textShadow: `0 0 40px ${color}, 0 0 80px ${glowColor}`,
                  fontFamily: 'Barlow Condensed, sans-serif',
                  fontStyle: 'italic',
                  transition: 'color 0.5s ease',
                }}
              >
                {seconds}
              </span>
              <span className="text-white/30 text-xs font-black uppercase tracking-[0.4em] mt-1">SEGUNDOS</span>
            </div>
          </div>

          {seconds <= 10 && (
            <div className="flex gap-2 mb-8">
              {Array.from({ length: seconds }).map((_, i) => (
                <div key={i} className="w-3 h-8 rounded-sm" style={{ background: color, opacity: 0.8 + i * 0.02, boxShadow: `0 0 6px ${color}` }} />
              ))}
            </div>
          )}

          <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.3em] relative z-10">
            RAYOCERO RUNNING · VALKYRON GROUP
          </p>

          <button
            onClick={onClose}
            className="absolute top-8 right-8 text-white/20 hover:text-white/60 transition-colors text-xs font-black uppercase tracking-widest flex items-center gap-2"
          >
            <X size={14} /> Cerrar
          </button>
        </>
      ) : (
        <div className="flex flex-col items-center gap-6" style={{ animation: 'fired-bounce 0.6s cubic-bezier(0.16,1,0.3,1) forwards' }}>
          <div style={{ fontSize: '8rem', lineHeight: 1 }}>🏁</div>
          <p className="text-white font-black text-4xl uppercase italic tracking-widest" style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>¡CARRERA INICIADA!</p>
          <p className="text-white/40 text-xs uppercase tracking-[0.4em]">Pistola disparada · Corredores en pista</p>
          <button onClick={onClose} className="mt-8 px-8 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-black uppercase text-xs tracking-widest transition-all">
            Cerrar
          </button>
        </div>
      )}
    </div>,
    document.body
  );
};

/* ────────────────────────────────────────────────────────────── */
/* TELEMETRY MODULE — Cronómetro + Pistola Digital + PreRaceButton*/
/* ────────────────────────────────────────────────────────────── */

type RaceState = 'idle' | 'running' | 'paused' | 'finished';

const TelemetryModule = ({ scope }: { scope: RaceScope }) => {
  const [raceState, setRaceState] = useState<RaceState>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [startTimestamp, setStartTimestamp] = useState<number | null>(null);
  const [pausedMs, setPausedMs] = useState(0);
  const [officialStartTime, setOfficialStartTime] = useState<string | null>(null);
  const rafRef = useRef<number | null>(null);
  const [gunFlash, setGunFlash] = useState(false);
  const [savingStart, setSavingStart] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (raceState === 'running') {
      const tick = () => {
        setElapsedMs(Date.now() - startTimestamp! + pausedMs);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [raceState, startTimestamp, pausedMs]);

  const formatElapsed = (ms: number) => {
    const totalCs = Math.floor(ms / 10);
    const cs = totalCs % 100;
    const totalSec = Math.floor(ms / 1000);
    const sec = totalSec % 60;
    const min = Math.floor(totalSec / 60) % 60;
    const hr = Math.floor(totalSec / 3600);
    if (hr > 0) return `${hr}:${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
    return `${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;
  };

  const handleFireGun = async () => {
    const now = Date.now();
    const isoNow = new Date(now).toISOString();
    setGunFlash(true);
    setTimeout(() => setGunFlash(false), 600);
    setStartTimestamp(now);
    setPausedMs(0);
    setElapsedMs(0);
    setRaceState('running');
    setOfficialStartTime(isoNow);
    setSavingStart(true);
    setSaveMsg(null);
    try {
      // [V2-4] La pistola solo marca start_time a los runners de la carrera activa
      let query = supabase
        .from('runners')
        .update({ start_time: isoNow, race_status: 'in_progress' })
        .is('start_time', null);
      query = applyScopeFilter(query, scope);
      const { error } = await query;
      if (error) throw error;
      await supabase.from('race_signals').insert({
        type: 'race_start',
        message: isoNow,
        created_by: 'admin',
      });
      setSaveMsg({ text: `✅ Pistola disparada · Señal enviada a atletas de ${scope.name}`, ok: true });
    } catch (err: any) {
      setSaveMsg({ text: `⚠️ Cronómetro corriendo — error: ${err.message}`, ok: false });
    } finally {
      setSavingStart(false);
      setTimeout(() => setSaveMsg(null), 5000);
    }
  };

  const handlePauseResume = () => {
    if (raceState === 'running') { setPausedMs(elapsedMs); setRaceState('paused'); }
    else if (raceState === 'paused') { setStartTimestamp(Date.now()); setRaceState('running'); }
  };

  const handleReset = () => {
    setRaceState('idle'); setElapsedMs(0); setStartTimestamp(null);
    setPausedMs(0); setOfficialStartTime(null); setSaveMsg(null); setConfirmReset(false);
  };

  const handleFinish = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setRaceState('finished');
  };

  const stateColor: Record<RaceState, string> = {
    idle: 'rgba(100,100,120,1)', running: '#00f2ff', paused: '#fbbf24', finished: '#22c55e',
  };
  const stateGlow: Record<RaceState, string> = {
    idle: 'transparent', running: 'rgba(0,242,255,0.15)',
    paused: 'rgba(251,191,36,0.15)', finished: 'rgba(34,197,94,0.15)',
  };
  const stateLabel: Record<RaceState, string> = {
    idle: 'EN ESPERA', running: 'EN CURSO', paused: 'PAUSADO', finished: 'FINALIZADO',
  };
  const color = stateColor[raceState];
  const glow  = stateGlow[raceState];

  return (
    <>
      {gunFlash && createPortal(
        <div className="fixed inset-0 z-[9999998] pointer-events-none"
          style={{ background: 'rgba(255,255,255,0.18)', animation: 'gun-flash-anim 0.55s ease-out forwards' }} />,
        document.body
      )}
      <style>{`
        @keyframes gun-flash-anim { 0%{opacity:1} 100%{opacity:0} }
        @keyframes chrono-blink   { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>

      <div className="space-y-6 animate-in fade-in max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black italic uppercase text-white tracking-widest"
              style={{ fontFamily: 'Barlow Condensed, sans-serif' }}>Control de Carrera</h2>
            <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">{scope.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{
              background: color, boxShadow: `0 0 8px ${color}`,
              animation: raceState === 'running' ? 'chrono-blink 1s ease infinite' : undefined,
            }} />
            <span className="text-xs font-black uppercase tracking-widest" style={{ color }}>
              {stateLabel[raceState]}
            </span>
          </div>
        </div>

        {/* Cronómetro */}
        <div className="relative rounded-3xl overflow-hidden border"
          style={{ borderColor: `${color}30`, background: 'linear-gradient(135deg,rgba(0,0,0,0.6),rgba(0,0,0,0.4))', boxShadow: `inset 0 0 80px ${glow}` }}>
          {raceState === 'running' && (
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: `radial-gradient(ellipse at 50% 0%,${glow} 0%,transparent 60%)` }} />
          )}
          <div className="relative z-10 p-10 flex flex-col items-center">
            <p className="text-[9px] text-gray-500 uppercase tracking-[0.4em] mb-4 font-black">CRONÓMETRO OFICIAL</p>
            <div className="font-black tabular-nums leading-none mb-2" style={{
              fontSize: 'clamp(5rem,14vw,9rem)', color,
              textShadow: raceState === 'running' ? `0 0 30px ${color},0 0 60px ${glow}` : 'none',
              fontFamily: 'Barlow Condensed,sans-serif', fontStyle: 'italic', letterSpacing: '-0.02em',
              animation: raceState === 'paused' ? 'chrono-blink 0.8s ease infinite' : undefined,
              transition: 'color 0.4s,text-shadow 0.4s',
            }}>
              {formatElapsed(elapsedMs)}
            </div>
            {officialStartTime && (
              <p className="text-[9px] font-mono uppercase tracking-widest mb-8" style={{ color: `${color}80` }}>
                PISTOLA: {new Date(officialStartTime).toLocaleTimeString('es-VE', { hour12: false })}
              </p>
            )}
            {saveMsg && (
              <div className={`mb-6 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider border ${
                saveMsg.ok ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
              }`}>
                {savingStart && <RefreshCw size={12} className="inline animate-spin mr-2" />}
                {saveMsg.text}
              </div>
            )}
            <div className="flex flex-wrap gap-3 justify-center">
              {raceState === 'idle' && (
                <button onClick={handleFireGun} disabled={savingStart}
                  className="relative px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-black transition-all flex items-center gap-3 text-sm overflow-hidden disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', boxShadow: '0 0 32px rgba(34,197,94,0.4)' }}>
                  {savingStart ? <RefreshCw size={20} className="animate-spin" /> : <Zap size={20} />}
                  DISPARAR PISTOLA
                </button>
              )}
              {(raceState === 'running' || raceState === 'paused') && (
                <button onClick={handlePauseResume}
                  className="px-8 py-4 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center gap-3 text-sm border"
                  style={{
                    background: raceState === 'running' ? 'rgba(251,191,36,0.1)' : 'rgba(0,242,255,0.1)',
                    borderColor: raceState === 'running' ? 'rgba(251,191,36,0.3)' : 'rgba(0,242,255,0.3)',
                    color: raceState === 'running' ? '#fbbf24' : '#00f2ff',
                  }}>
                  {raceState === 'running' ? '⏸ PAUSAR' : '▶ REANUDAR'}
                </button>
              )}
              {(raceState === 'running' || raceState === 'paused') && (
                <button onClick={handleFinish}
                  className="px-8 py-4 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center gap-3 text-sm border border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20">
                  🏁 FINALIZAR
                </button>
              )}
              {raceState !== 'idle' && (
                <button onClick={() => setConfirmReset(true)}
                  className="px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center gap-2 border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/15">
                  <RefreshCw size={14} /> RESET
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Paso 1 — Pre-Carrera */}
        <div className="bg-black/40 border border-white/[0.08] rounded-2xl p-6">
          <div className="flex items-start gap-4 mb-5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0"
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>1</div>
            <div>
              <p className="text-white font-black uppercase tracking-widest text-sm">Alerta Pre-Carrera</p>
              <p className="text-gray-500 text-[10px] uppercase tracking-widest mt-0.5">
                Inserta señal en <span className="text-cyan-400 font-mono">race_signals</span> →
                todos los atletas con la app abierta ven el countdown de 60s en su pantalla
              </p>
            </div>
          </div>
          <PreRaceButton seconds={60} />
        </div>

        {/* Paso 2 — Estado pistola */}
        <div className="bg-black/40 border border-white/[0.08] rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0"
              style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e' }}>2</div>
            <div className="flex-1">
              <p className="text-white font-black uppercase tracking-widest text-sm">Pistola de Salida</p>
              <p className="text-gray-500 text-[10px] uppercase tracking-widest mt-0.5">
                {raceState === 'idle'
                  ? `Usa DISPARAR PISTOLA — inicia cronómetro + escribe start_time solo a los atletas de ${scope.name} + señal race_start`
                  : raceState === 'running'
                    ? `En curso desde ${officialStartTime ? new Date(officialStartTime).toLocaleTimeString('es-VE') : '—'}`
                    : raceState === 'paused' ? 'Pausado — presiona REANUDAR'
                    : `Finalizado — ${formatElapsed(elapsedMs)}`}
              </p>
              {raceState !== 'idle' && (
                <div className="mt-3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{
                    background: color, boxShadow: `0 0 6px ${color}`,
                    animation: raceState === 'running' ? 'chrono-blink 1s ease infinite' : undefined,
                  }} />
                  <span className="text-xs font-black uppercase tracking-widest" style={{ color }}>
                    {stateLabel[raceState]}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Confirm Reset */}
        {confirmReset && createPortal(
          <div className="fixed inset-0 z-[9999999] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
            <div className="bg-[#0a0a0a] border border-red-500/30 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95">
              <div className="bg-red-500/15 p-3 rounded-2xl w-fit mb-5"><AlertTriangle className="text-red-500" size={24} /></div>
              <h3 className="text-xl font-black text-white uppercase italic mb-2">Resetear Cronómetro</h3>
              <p className="text-gray-400 text-sm mb-8">Vuelve a cero. <span className="text-red-400">No borra Supabase.</span></p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmReset(false)} className="flex-1 py-4 rounded-xl bg-white/5 font-bold hover:bg-white/10 transition-all text-sm">Cancelar</button>
                <button onClick={handleReset} className="flex-1 py-4 rounded-xl bg-red-600 hover:bg-red-500 font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-2">
                  <RefreshCw size={14} /> Confirmar Reset
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </>
  );
};

/* ────────────────────────────────────────────────────────────── */
/* MAIN DASHBOARD                                                 */
/* ────────────────────────────────────────────────────────────── */

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'race_config' | 'results' | 'teams' | 'kit_delivery' | 'kit_chequeo' | 'telemetry' | 'inscripcion'>('overview');
  const [totalAtletas, setTotalAtletas] = useState(0);
  const [raceScope, setRaceScope] = useState<RaceScope | null>(null);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-cyan-500/30">
      <nav className="border-b border-white/5 bg-black/50 backdrop-blur-xl sticky top-0 z-[100]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <ShieldCheck className="text-black" size={24} />
            </div>
            <div>
              <h1 className="text-lg font-black italic uppercase leading-none">RayoCero HQ</h1>
              <p className="text-[8px] text-gray-500 uppercase tracking-widest mt-1">
                Valkyron Group{raceScope ? ` · ${raceScope.name}` : ''}
              </p>
            </div>
          </div>
          <button className="flex items-center gap-2 text-[10px] uppercase text-gray-400 hover:text-white transition-colors">
            <LogOut size={16} /> Salir
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">

        {/* [V2-1] Selector global de carrera */}
        <RaceScopeBar scope={raceScope} onChange={setRaceScope} />

        <div className="flex flex-wrap gap-4 mb-12 border-b border-white/5 pb-6">
          {[
            { id: 'overview',     label: 'Dashboard',    icon: null },
            { id: 'kit_delivery', label: 'RFID',         icon: <Package size={14} /> },
            { id: 'kit_chequeo',  label: 'Entrega Kits', icon: <Gift size={14} />, accent: 'amber' },
            { id: 'telemetry',    label: 'Telemetría',   icon: <Radio size={14} />, accent: 'yellow' },
            { id: 'inscripcion',  label: 'Inscribir',    icon: <UserPlus size={14} /> },
            { id: 'teams',        label: 'Escuadrones',  icon: null },
            { id: 'race_config',  label: 'Carrera',      icon: null },
            { id: 'results',      label: 'Resultados',   icon: null },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? (tab as any).accent === 'amber' ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20'
                    : (tab as any).accent === 'yellow' ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20'
                    : 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                  : 'bg-white/5 hover:bg-white/10 text-gray-400'
              }`}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* Mientras carga el scope, no renderizamos módulos dependientes */}
        {!raceScope ? (
          <div className="py-20 text-center bg-white/[0.02] rounded-2xl border border-white/5 animate-pulse">
            <p className="text-[10px] font-black tracking-[0.4em] text-cyan-500 uppercase">Sincronizando carrera activa...</p>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <>
                <TasaConfig scope={raceScope} />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2"><AtletasList scope={raceScope} onUpdateCount={setTotalAtletas} /></div>
                  <div>
                    <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-3xl p-8 text-black shadow-2xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Activity size={80} /></div>
                      <h4 className="text-xs font-black uppercase relative z-10">Participación · {raceScope.name}</h4>
                      <p className="text-7xl font-black italic relative z-10">{totalAtletas.toString().padStart(3, '0')}</p>
                      <p className="text-[10px] font-bold uppercase mt-4 opacity-70">
                        {raceScope.isActive ? 'Carrera Activa' : 'Archivo Histórico'}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'kit_delivery' && <ModuloEntregaKits scope={raceScope} />}
            {activeTab === 'kit_chequeo'  && <ModuloChequeoKits scope={raceScope} />}
            {activeTab === 'telemetry'    && <TelemetryModule scope={raceScope} />}
            {activeTab === 'inscripcion'  && <ModuloInscripcionAdmin />}
            {activeTab === 'teams'        && <EscuadronesList />}
            {activeTab === 'race_config'  && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-in slide-in-from-bottom-4">
                <RaceForm /><RouteConfig />
              </div>
            )}
            {activeTab === 'results' && <div className="animate-in fade-in"><ResultsTable /></div>}
          </>
        )}
      </main>
    </div>
  );
}
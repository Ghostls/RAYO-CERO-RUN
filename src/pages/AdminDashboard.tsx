import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import {
  ShieldCheck, Settings, LogOut, Activity, RefreshCw, Save, CheckCircle,
  Search, CheckSquare, Eye, X, ShieldAlert, FileText, Trash2, Phone,
  Clock, AlertTriangle, Users, Package, Scan, Radio, Zap, BarChart2,
  ChevronDown, Filter, UserPlus
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RaceForm } from '../components/admin/RaceForm';
import { RouteConfig } from '../components/admin/RouteConfig';
import { ResultsTable } from '../components/admin/ResultsTable';
import PreRaceButton from '../components/Preracebutton';
import logoPrincipal from '../assets/logo.png';
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
}

const BUCKET = 'comprobantes-pago';
const TELEMETRY_API = 'http://localhost:8090';

const CATEGORY_ORDER: string[] = [
  'Movilidad Reducida',
  'Juvenil Masculino',
  'Juvenil Femenino',
  'Libre Masculino',
  'Libre Femenino',
  'Sub Master (30-34) Masculino',
  'Sub Master (30-34) Femenino',
  'Sub Master (35-39) Masculino',
  'Sub Master (35-39) Femenino',
  'Master A Masculino',
  'Master A Femenino',
  'Master B Masculino',
  'Master B Femenino',
  'Master C Masculino',
  'Master C Femenino',
  'Master D Masculino',
  'Master D Femenino',
  'Absoluto Masculino',
  'Absoluto Femenino',
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
  onClose: () => void;
}

const generateCategoryPDF = (atletas: Runner[], selectedCategories: string[], mode: PDFMode) => {
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
  doc.text('NIGHT FEST · 06 JUN 2026 · 06:00 PM', pageW / 2, 50, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text('Monumento al Sol, Barquisimeto · Valkyron Group', pageW / 2, 56, { align: 'center' });

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
    ]);

    autoTable(doc, {
      startY: 25,
      head: [['#', 'Dorsal', 'Atleta', 'Cédula', 'Teléfono', 'Talla', 'Pago']],
      body: rows,
      theme: 'plain',
      styles: {
        fontSize: 8, cellPadding: 3,
        textColor: [255, 255, 255],
        lineColor: [40, 40, 40], lineWidth: 0.1,
        fillColor: [5, 5, 5],
      },
      headStyles: {
        fillColor: [r, g, b], textColor: [0, 0, 0],
        fontStyle: 'bold', fontSize: 8,
      },
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

const PDFExportModal: React.FC<PDFExportModalProps> = ({ atletas, onClose }) => {
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
      generateCategoryPDF(atletas, categoriesToInclude, mode);
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
            <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">Selecciona el modo de exportación</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={20} /></button>
        </div>

        <div className="space-y-3 mb-6">
          {[
            { id: 'segmented' as PDFMode, label: 'Segmentado por categoría', desc: `Portada con barras + sección por cada categoría (${availableCategories.length} categorías, ${atletas.length} atletas)` },
            { id: 'specific' as PDFMode, label: 'Categoría específica', desc: 'Exporta solo una categoría seleccionada' },
            { id: 'general' as PDFMode, label: 'Lista general', desc: 'Todos los atletas en una sola tabla sin segmentar' },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setMode(opt.id)}
              className={`w-full text-left p-4 rounded-2xl border transition-all ${
                mode === opt.id
                  ? 'bg-cyan-500/10 border-cyan-500/40 text-white'
                  : 'bg-white/[0.02] border-white/5 text-gray-400 hover:border-white/10'
              }`}
            >
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
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-bold outline-none focus:border-cyan-500/50 appearance-none cursor-pointer"
              >
                <option value="">— Seleccionar —</option>
                {availableCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-white/5 font-bold hover:bg-white/10 transition-all text-xs uppercase">
            Cancelar
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex-1 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase text-xs tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
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
/* MÓDULO ENTREGA DE KITS Y RFID                                  */
/* ────────────────────────────────────────────────────────────── */

const ModuloEntregaKits = () => {
  const [bibInput, setBibInput] = useState<string>('');
  const [epcInput, setEpcInput] = useState<string>('');
  const [activeRunner, setActiveRunner] = useState<Runner | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const epcInputRef = useRef<HTMLInputElement>(null);

  const searchRunner = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!bibInput) return;
    setIsLoading(true);
    setStatusMsg(null);
    setActiveRunner(null);
    const { data, error } = await supabase
      .from('runners')
      .select('id, bib_number, nombre, apellido, cedula, categoria, rfid_epc, talla_camiseta')
      .eq('bib_number', parseInt(bibInput, 10))
      .single();
    setIsLoading(false);
    if (error || !data) {
      setStatusMsg({ text: `Objetivo DORSAL #${bibInput} no localizado en la base.`, type: 'error' });
      return;
    }
    if (data.rfid_epc) {
      setStatusMsg({ text: `ALERTA: El dorsal ${data.bib_number} ya posee el chip enlazado (${data.rfid_epc}).`, type: 'error' });
      return;
    }
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
      if (error) {
        setStatusMsg({ text: `Falla de enlace: ${error.message}`, type: 'error' });
        setEpcInput('');
      } else {
        setStatusMsg({ text: `APROVISIONAMIENTO EXITOSO: Chip asignado al Dorsal #${activeRunner.bib_number}`, type: 'success' });
        setBibInput(''); setEpcInput(''); setActiveRunner(null);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-black/40 border border-cyan-500/20 rounded-2xl p-8 shadow-2xl relative overflow-hidden animate-in fade-in">
      <div className="absolute top-0 right-0 bg-cyan-500/10 text-cyan-400 font-black text-xs px-4 py-2 rounded-bl-2xl border-b border-l border-cyan-500/20">
        ENLACE RFID ACTIVO
      </div>
      <h3 className="text-xl font-black text-white uppercase italic tracking-widest flex items-center gap-3 mb-8">
        <Package className="text-cyan-400" /> Centro de Aprovisionamiento
      </h3>
      {statusMsg && (
        <div className={`p-4 mb-8 rounded-xl border backdrop-blur-md font-mono text-xs uppercase font-bold tracking-wider ${
          statusMsg.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
          statusMsg.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
          'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
        }`}>
          {statusMsg.type === 'success' && <CheckCircle size={16} className="inline mr-2 mb-1" />}
          {statusMsg.type === 'error' && <AlertTriangle size={16} className="inline mr-2 mb-1" />}
          {statusMsg.text}
        </div>
      )}
      <form onSubmit={searchRunner} className="flex gap-4 mb-8">
        <div className="flex-1">
          <label className="text-[10px] text-cyan-400 font-black uppercase tracking-widest mb-2 block">Número de Dorsal Físico</label>
          <input
            type="number"
            value={bibInput}
            onChange={e => setBibInput(e.target.value)}
            disabled={activeRunner !== null}
            className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-5 py-4 text-2xl font-black text-white outline-none focus:border-cyan-500/50 transition-colors disabled:opacity-50"
            placeholder="Ej: 0001"
            autoFocus
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={!bibInput || isLoading || activeRunner !== null}
            className="h-[64px] px-8 flex items-center justify-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-[0.2em] transition-all disabled:opacity-50"
          >
            {isLoading && !activeRunner ? <RefreshCw className="animate-spin" size={18} /> : <Search size={18} />}
            Localizar
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
            <input
              ref={epcInputRef}
              type="text"
              value={epcInput}
              onChange={e => setEpcInput(e.target.value)}
              onKeyDown={handleEpcScan}
              disabled={isLoading}
              className="w-full bg-transparent border-b-2 border-cyan-500/50 pb-2 text-center text-xl font-mono text-white outline-none focus:border-cyan-400 transition-colors placeholder-cyan-500/20"
              placeholder="[ APROXIME EL CHIP AL LECTOR USB ]"
            />
            <p className="text-center text-[9px] text-gray-500 uppercase mt-4 tracking-widest">El sensor ejecutará el enlace automáticamente al leer el tag.</p>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => { setActiveRunner(null); setBibInput(''); }}
              className="text-[10px] uppercase font-black tracking-widest text-red-500 hover:text-red-400 transition-colors"
            >
              [ Abortar Secuencia ]
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ────────────────────────────────────────────────────────────── */
/* TASA CONFIG                                                    */
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
              <label htmlFor="tasa_bcv_input" className="text-[10px] text-cyan-400 font-black uppercase tracking-widest mb-2 block">Tasa BCV</label>
              <input id="tasa_bcv_input" name="tasa_bcv" type="text" value={nuevaTasa} onChange={e => setNuevaTasa(e.target.value)}
                className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-5 py-4 text-white outline-none focus:border-cyan-500/50 transition-colors" />
            </div>
            <div>
              <label htmlFor="costo_usd_input" className="text-[10px] text-cyan-400 font-black uppercase tracking-widest mb-2 block">Inscripción USD</label>
              <input id="costo_usd_input" name="costo_usd" type="text" value={nuevoCostoUSD} onChange={e => setNuevoCostoUSD(e.target.value)}
                className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-5 py-4 text-white outline-none focus:border-cyan-500/50 transition-colors" />
            </div>
          </div>
          <button type="submit" disabled={isSaving || isLoading}
            className="w-full flex items-center justify-center gap-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black px-6 py-4 text-xs font-black uppercase tracking-[0.2em] transition-all">
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
/* ATLETAS LIST                                                   */
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
  const [showPDFModal, setShowPDFModal] = useState(false);

  const fetchAtletas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('runners').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setAtletas(data || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchAtletas(); }, []);
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
      const { error: finalError } = await supabase.from('runners').delete().eq('id', targetId);
      if (finalError) throw finalError;
      setAtletas(prev => prev.filter(a => a.id !== targetId));
      setAthleteToDelete(null);
    } catch (err: any) { alert(`ERROR: ${err.message}`); } finally { setIsDeleting(false); }
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
    } catch { setStatusMsg('Error de enlace visual'); } finally { setImgLoading(false); }
  };

  const filteredAtletas = useMemo(() => {
    return atletas.filter(a =>
      `${a.nombre} ${a.apellido} ${a.cedula} ${a.categoria || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [atletas, searchTerm]);

  return (
    <div className="relative text-white">
      <div className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <button
            onClick={() => setShowPDFModal(true)}
            className="px-4 py-2 rounded-lg bg-white/5 text-cyan-400 border border-cyan-400/20 hover:bg-cyan-400 hover:text-black flex items-center gap-2 text-[10px] uppercase font-black transition-all"
          >
            <FileText size={14} /> Exportar PDF
          </button>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
            <input
              id="filter_atletas" name="filter_atletas" type="text"
              placeholder="Filtrar base..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-[10px] uppercase font-bold outline-none focus:border-cyan-500/30 transition-all"
            />
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
              ) : filteredAtletas.map(a => (
                <tr key={a.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-xs uppercase flex items-center gap-2">
                      {a.nombre} {a.apellido}
                      {a.pago_verificado && <ShieldCheck size={12} className="text-green-500" />}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] text-gray-500 font-mono">V-{a.cedula}</span>
                      <span className="text-[8px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded font-black uppercase tracking-wider">
                        {a.categoria || 'SIN CAT'}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 text-cyan-400 text-[10px] font-mono">
                      <Phone size={12} /> {a.telefono || 'SIN_TLF'}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-xs font-mono bg-white/5 px-2 py-1 rounded border border-white/10 text-white">
                      {a.talla_camiseta || 'N/A'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-white">{a.bib_number ? `#${a.bib_number}` : <Clock size={14} className="text-yellow-500/50" />}</span>
                      {a.rfid_epc && <span className="text-[8px] text-cyan-400 font-mono tracking-widest mt-1">RFID CONFIRMADO</span>}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => inspectComprobante(a)} className="p-2 rounded-lg bg-white/5 hover:bg-cyan-500 hover:text-black transition-all">
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => toggleVerificacionPago(a.id, a.pago_verificado)}
                        disabled={isTogglingPayment === a.id}
                        className={`p-2 rounded-lg transition-all border ${a.pago_verificado ? 'bg-green-500/10 text-green-500 border-green-500/30 hover:bg-green-500 hover:text-black' : 'bg-white/5 text-gray-500 border-transparent hover:bg-white/10 hover:text-white'}`}
                      >
                        {isTogglingPayment === a.id ? <RefreshCw size={16} className="animate-spin" /> : <CheckSquare size={16} />}
                      </button>
                      <button onClick={() => setAthleteToDelete(a)} className="p-2 rounded-lg bg-white/5 hover:bg-red-500 hover:text-black text-red-500 transition-all">
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

      {showPDFModal && <PDFExportModal atletas={atletas} onClose={() => setShowPDFModal(false)} />}

      {selectedAtleta && createPortal(
        <div onClick={() => setSelectedAtleta(null)} className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm">
          <div onClick={e => e.stopPropagation()} className="bg-[#0a0f14] border border-cyan-400/20 rounded-3xl w-full max-w-6xl overflow-hidden flex flex-col md:flex-row shadow-2xl animate-in zoom-in-95">
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
                <div className="bg-white/[0.03] p-4 rounded-xl border border-white/5"><p className="text-gray-500 text-[9px] uppercase">Categoría Asignada</p><p className="text-cyan-400 font-black uppercase tracking-wider">{selectedAtleta.categoria || 'SIN ASIGNAR'}</p></div>
                <div className="bg-white/[0.03] p-4 rounded-xl border border-white/5"><p className="text-gray-500 text-[9px] uppercase">Teléfono</p><p className="text-white font-mono">{selectedAtleta.telefono || 'SIN REGISTRO'}</p></div>
                <div className="bg-white/[0.03] p-4 rounded-xl border border-white/5"><p className="text-gray-500 text-[9px] uppercase">Talla Reservada</p><p className="text-white font-mono uppercase">{selectedAtleta.talla_camiseta || 'NO ESPECIFICADA'}</p></div>
                <div className="bg-white/[0.03] p-4 rounded-xl border border-white/5"><p className="text-gray-500 text-[9px] uppercase">Referencia</p><p className="text-green-400 font-mono break-all">{selectedAtleta.referencia_pago || 'PENDIENTE'}</p></div>
                <button
                  onClick={() => toggleVerificacionPago(selectedAtleta.id, selectedAtleta.pago_verificado)}
                  disabled={isTogglingPayment === selectedAtleta.id}
                  className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase transition-all ${selectedAtleta.pago_verificado ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-cyan-500 hover:bg-cyan-400 text-black'}`}
                >
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
        const { data: runnersData, error: runnersError } = await supabase
          .from('runners')
          .select(`id, nombre, apellido, bib_number, telefono, talla_camiseta, categoria, race_results:race_results!race_results_bib_number_fkey ( tiempo_chip )`)
          .in('id', runnerIds);
        if (runnersError) throw runnersError;
        const runnersMap = new Map(runnersData?.map(r => [r.id, r]));
        const processedTeams = teamsData.map(team => {
          const membersIds = [team.runner_m1_id, team.runner_m2_id, team.runner_f1_id, team.runner_f2_id];
          let totalSeconds = 0;
          let allFinished = true;
          const detailedMembers = membersIds.map(id => {
            const memberData = runnersMap.get(id);
            if (!memberData) return null;
            const timeRaw = (memberData as any).race_results?.[0]?.tiempo_chip;
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
/* TELEMETRÍA RFID                                                */
/* ────────────────────────────────────────────────────────────── */

interface SystemStatus {
  llrp_connected: boolean;
  reader_host: string;
  antennas: number[];
  runners_with_chip: number;
  race_started: boolean;
  race_start_time: string | null;
  demo_mode: boolean;
}

interface CrossingEvent {
  type: 'start' | 'finish' | 'race_start' | 'connected';
  bib?: number;
  nombre?: string;
  categoria?: string;
  time?: string;
  elapsed_seconds?: number;
  elapsed_str?: string;
  epc?: string;
}

interface RaceResult {
  position: number;
  bib_number: number;
  nombre: string;
  apellido: string;
  categoria: string;
  genero: string;
  finish_time_seconds: number;
  finish_time_str: string;
}

const TelemetryModule = () => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [apiOnline, setApiOnline] = useState(false);
  const [sseConnected, setSseConnected] = useState(false);
  const [events, setEvents] = useState<CrossingEvent[]>([]);
  const [results, setResults] = useState<RaceResult[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'live' | 'results'>('live');
  const [raceStarting, setRaceStarting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const eventsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${TELEMETRY_API}/status`, { signal: AbortSignal.timeout(3000) });
        if (res.ok) { setStatus(await res.json()); setApiOnline(true); }
        else setApiOnline(false);
      } catch { setApiOnline(false); setStatus(null); }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!apiOnline) return;
    const es = new EventSource(`${TELEMETRY_API}/live`);
    es.onopen = () => setSseConnected(true);
    es.onerror = () => setSseConnected(false);
    es.onmessage = (e) => {
      try {
        const event: CrossingEvent = JSON.parse(e.data);
        if (event.type === 'connected') return;
        setEvents(prev => [event, ...prev].slice(0, 100));
        if (event.type === 'finish') fetchResults();
      } catch {}
    };
    return () => { es.close(); setSseConnected(false); };
  }, [apiOnline]);

  const fetchResults = useCallback(async () => {
    try {
      const res = await fetch(`${TELEMETRY_API}/results`);
      if (res.ok) setResults(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    if (apiOnline) {
      fetchResults();
      const interval = setInterval(fetchResults, 10000);
      return () => clearInterval(interval);
    }
  }, [apiOnline, fetchResults]);

  const handleRaceStart = async () => {
    if (!confirm('¿Disparar pistola de salida? Se registrará start_time para todos los corredores.')) return;
    setRaceStarting(true);
    try {
      const res = await fetch(`${TELEMETRY_API}/race/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const data = await res.json();
      if (res.ok) alert(`✅ Carrera iniciada: ${data.start_time}`);
      else alert(`❌ Error: ${data.detail}`);
    } catch { alert('❌ No se pudo conectar con el servidor de telemetría'); }
    finally { setRaceStarting(false); }
  };

  const handleReset = async () => {
    if (!confirm('¿BORRAR TODOS LOS TIEMPOS? Esta acción no se puede deshacer.')) return;
    setResetting(true);
    try {
      await fetch(`${TELEMETRY_API}/race/reset`, { method: 'POST' });
      setResults([]); setEvents([]);
    } catch { alert('❌ Error en reset'); }
    finally { setResetting(false); }
  };

  if (!apiOnline) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <div className="bg-black/40 border border-yellow-500/20 rounded-2xl p-12 text-center">
          <Radio size={48} className="text-yellow-500/50 mx-auto mb-4" />
          <h3 className="text-xl font-black text-white uppercase italic tracking-widest mb-2">Servidor Offline</h3>
          <p className="text-gray-400 text-sm mb-6">El backend de telemetría no está accesible.</p>
          <div className="bg-white/[0.03] border border-white/5 rounded-xl p-6 text-left space-y-2 mb-6">
            <p className="text-[10px] text-yellow-400 font-black uppercase tracking-widest mb-3">Checklist de arranque:</p>
            <p className="text-xs text-gray-300 font-mono">1. Ejecutar <span className="text-cyan-400">start_telemetry.bat</span> en la PC Windows</p>
            <p className="text-xs text-gray-300 font-mono">2. Zebra IoT UI → Connection → <span className="text-cyan-400">Disconnect</span></p>
            <p className="text-xs text-gray-300 font-mono">3. Confirmar en consola: <span className="text-green-400">✅ LLRP conectado</span></p>
            <p className="text-xs text-gray-300 font-mono">4. URL actual: <span className="text-yellow-400">{TELEMETRY_API}</span></p>
          </div>
          <p className="text-[9px] text-gray-600 uppercase tracking-widest">
            Si la IP cambió, editar la constante TELEMETRY_API en AdminDashboard.tsx
          </p>
        </div>
        <div className="mt-8 bg-black/40 border border-red-500/20 rounded-2xl p-6">
          <p className="text-[9px] text-red-400 font-black uppercase tracking-widest mb-4 flex items-center gap-2">
            <Zap size={12} /> Señal pre-carrera — disponible sin servidor RFID
          </p>
          <PreRaceButton seconds={60} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Lector RFID', value: status?.llrp_connected ? 'CONECTADO' : status?.demo_mode ? 'DEMO' : 'OFFLINE', color: status?.llrp_connected ? 'green' : status?.demo_mode ? 'yellow' : 'red' },
          { label: 'Corredores con chip', value: String(status?.runners_with_chip ?? 0), color: 'cyan' },
          { label: 'Carrera', value: status?.race_started ? 'EN CURSO' : 'EN ESPERA', color: status?.race_started ? 'green' : 'gray' },
          { label: 'Antenas activas', value: status?.antennas?.join(', ') ?? '—', color: 'cyan' },
        ].map(card => (
          <div key={card.label} className={`bg-black/40 border rounded-2xl p-4 ${
            card.color === 'green' ? 'border-green-500/20' :
            card.color === 'yellow' ? 'border-yellow-500/20' :
            card.color === 'red' ? 'border-red-500/20' :
            card.color === 'cyan' ? 'border-cyan-500/20' :
            'border-white/10'
          }`}>
            <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mb-1">{card.label}</p>
            <p className={`font-black text-lg ${
              card.color === 'green' ? 'text-green-400' :
              card.color === 'yellow' ? 'text-yellow-400' :
              card.color === 'red' ? 'text-red-400' :
              card.color === 'cyan' ? 'text-cyan-400' :
              'text-gray-400'
            }`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${sseConnected ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`} />
        <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest">
          {sseConnected ? 'Stream en vivo activo' : 'Stream desconectado'}
        </span>
      </div>

      <div className="bg-black/40 border border-white/5 rounded-2xl p-6 space-y-6">
        <h4 className="text-[10px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-2">
          <Radio size={12} className="text-cyan-400" /> Control de Carrera
        </h4>
        <div>
          <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mb-3 flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-[8px] flex items-center justify-center font-black">1</span>
            Alerta Pre-Carrera · Enviar 1 minuto antes
          </p>
          <PreRaceButton seconds={60} />
        </div>
        <div className="border-t border-white/5" />
        <div>
          <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mb-3 flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-green-500/20 border border-green-500/40 text-green-400 text-[8px] flex items-center justify-center font-black">2</span>
            Pistola de Salida · Registra start_time en Supabase
          </p>
          <div className="flex flex-wrap gap-3">
            <button onClick={handleRaceStart} disabled={raceStarting}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-black uppercase text-xs tracking-widest transition-all disabled:opacity-50">
              {raceStarting ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
              Disparar Pistola
            </button>
            <button onClick={fetchResults}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-400 font-black uppercase text-xs tracking-widest transition-all border border-cyan-500/20">
              <RefreshCw size={14} /> Actualizar
            </button>
            <button onClick={handleReset} disabled={resetting}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-900/30 hover:bg-red-900/50 text-red-400 font-black uppercase text-xs tracking-widest transition-all border border-red-500/20 ml-auto disabled:opacity-50">
              {resetting ? <RefreshCw size={14} className="animate-spin" /> : <AlertTriangle size={14} />}
              Reset Tiempos
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-1 border-b border-white/5">
        {(['live', 'results'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveSubTab(tab)}
            className={`px-6 py-3 text-xs font-black uppercase tracking-widest transition-all rounded-t-xl ${
              activeSubTab === tab ? 'bg-white/5 text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-500 hover:text-white'
            }`}>
            {tab === 'live' ? '📡 Live' : '🏁 Resultados'}
          </button>
        ))}
      </div>

      {activeSubTab === 'live' && (
        <div className="bg-black/40 border border-white/5 rounded-2xl p-4 max-h-[500px] overflow-y-auto">
          {events.length === 0 ? (
            <div className="py-16 text-center">
              <Radio size={32} className="text-gray-700 mx-auto mb-3" />
              <p className="text-gray-600 text-xs uppercase font-black tracking-widest">Esperando cruces de chips...</p>
            </div>
          ) : events.map((ev, i) => {
            if (ev.type === 'race_start') return (
              <div key={i} className="flex items-center gap-3 py-3 border-b border-white/5 text-green-400">
                <Zap size={18} />
                <div>
                  <span className="font-black text-xs uppercase">Pistola Disparada</span>
                  <span className="text-gray-600 text-[9px] ml-2 font-mono">{ev.time}</span>
                </div>
              </div>
            );
            const isFinish = ev.type === 'finish';
            return (
              <div key={i} className={`flex items-center gap-3 py-3 border-b border-white/5 ${isFinish ? 'text-yellow-400' : 'text-cyan-400'}`}>
                <span className="text-lg">{isFinish ? '🏁' : '🚀'}</span>
                <div className="flex-1 min-w-0">
                  <span className="font-black text-xs">BIB #{ev.bib}</span>
                  <span className="text-white text-xs ml-2">{ev.nombre}</span>
                  <span className="text-gray-500 text-[9px] ml-2 uppercase">{ev.categoria}</span>
                </div>
                {isFinish && ev.elapsed_str && (
                  <span className="text-yellow-400 font-black text-sm font-mono flex-shrink-0">{ev.elapsed_str}</span>
                )}
                {!isFinish && <span className="text-cyan-400 text-[9px] font-black uppercase flex-shrink-0">Salida</span>}
              </div>
            );
          })}
          <div ref={eventsEndRef} />
        </div>
      )}

      {activeSubTab === 'results' && (
        <div className="bg-black/40 border border-white/5 rounded-2xl overflow-hidden">
          {results.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-gray-600 text-xs uppercase font-black tracking-widest">Sin resultados aún</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-white/5">
                  <th className="p-4 text-left text-[9px] uppercase text-gray-400">#</th>
                  <th className="p-4 text-left text-[9px] uppercase text-gray-400">Dorsal</th>
                  <th className="p-4 text-left text-[9px] uppercase text-gray-400">Atleta</th>
                  <th className="p-4 text-left text-[9px] uppercase text-gray-400">Categoría</th>
                  <th className="p-4 text-right text-[9px] uppercase text-yellow-400">Tiempo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {results.map(r => (
                  <tr key={r.bib_number} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 text-gray-500 font-black text-sm">{r.position}</td>
                    <td className="p-4 text-cyan-400 font-black text-sm">#{r.bib_number}</td>
                    <td className="p-4 text-white text-xs font-bold uppercase">{r.nombre} {r.apellido}</td>
                    <td className="p-4 text-gray-500 text-[9px] uppercase">{r.categoria}</td>
                    <td className="p-4 text-right text-yellow-400 font-black font-mono">{r.finish_time_str}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

/* ────────────────────────────────────────────────────────────── */
/* MAIN DASHBOARD                                                 */
/* ────────────────────────────────────────────────────────────── */

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'race_config' | 'results' | 'teams' | 'kit_delivery' | 'telemetry' | 'inscripcion'>('overview');
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
              <h1 className="text-lg font-black italic uppercase leading-none">RayoCero HQ</h1>
              <p className="text-[8px] text-gray-500 uppercase tracking-widest mt-1">Valkyron Group</p>
            </div>
          </div>
          <button className="flex items-center gap-2 text-[10px] uppercase text-gray-400 hover:text-white transition-colors">
            <LogOut size={16} /> Salir
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-wrap gap-4 mb-12 border-b border-white/5 pb-6">
          {[
            { id: 'overview',     label: 'Dashboard',       icon: null },
            { id: 'kit_delivery', label: 'Entrega de Kits', icon: <Package size={14} /> },
            { id: 'telemetry',    label: 'Telemetría',      icon: <Radio size={14} />, accent: 'yellow' },
            { id: 'inscripcion',  label: 'Inscribir',       icon: <UserPlus size={14} /> },
            { id: 'teams',        label: 'Escuadrones',     icon: null },
            { id: 'race_config',  label: 'Carrera',         icon: null },
            { id: 'results',      label: 'Resultados',      icon: null },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? (tab as any).accent === 'yellow'
                    ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20'
                    : 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                  : 'bg-white/5 hover:bg-white/10 text-gray-400'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
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

        {activeTab === 'kit_delivery' && <ModuloEntregaKits />}
        {activeTab === 'telemetry' && <TelemetryModule />}
        {activeTab === 'inscripcion' && <ModuloInscripcionAdmin />}
        {activeTab === 'teams' && <EscuadronesList />}
        {activeTab === 'race_config' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-in slide-in-from-bottom-4">
            <RaceForm /><RouteConfig />
          </div>
        )}
        {activeTab === 'results' && (
          <div className="animate-in fade-in"><ResultsTable /></div>
        )}
      </main>
    </div>
  );
}
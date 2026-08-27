/**
 * RAYO CERO — ADMIN DASHBOARD (EVOLUTION V4.1 — LEGACY RACE FIX)
 * Senior Dev: MIA (Valkyron Group)
 * CEO: Lualdo Sciscioli
 * REGLA DE ORO: Evolución sin Destrucción. Código completo. Copy-paste ready.
 *
 * CHANGELOG V4.1:
 * [V4.1-1] BUGFIX CRÍTICO: isLegacyRace() corregido — solo 'night fest' es
 *          legacy (race_id NULL). 'barquisimeto' eliminado del criterio porque
 *          CANINATA BARQUISIMETO es una carrera nueva con su propio race_id.
 *          Bug anterior causaba que la caninata usara el filtro IS NULL,
 *          trayendo runners del Night Fest y precios de system_config id=1.
 *
 * CHANGELOG V4.0:
 * [V4-1] Runner interface: campo `genero?: 'M' | 'F'` agregado.
 * [V4-2] validateGenderCategoryConsistency(): función pura que detecta mismatch
 *        género↔categoría. Retorna string | null.
 * [V4-3] GenderMismatchBadge: badge rojo ⚠ GÉNERO/CAT en fila de atleta
 *        con mismatch en AtletasList. También visible en panel de inspección.
 * [V4-4] EscuadronesList: recibe `scope: RaceScope` — filtra `teams` por
 *        race_id o race_id IS NULL (Barquisimeto legacy). Evita mezcla de
 *        carreras en el módulo de escuadrones.
 * [V4-5] TelemetryModule.handleFire: race_signals.insert ahora lleva
 *        race_id: scope.raceId para aislar señales por carrera.
 * [V4-6] ModuloRepresentantes: elimina `?? '10K'` — badge de modalidad usa
 *        valor real. null → '—'. Runners legacy no se infieren como 10K.
 * [V4-7] Panel de inspección de atleta: muestra alerta de mismatch género
 *        si validateGenderCategoryConsistency() detecta conflicto.
 * [V4-8] RaceScopeBar: guard `hasAutoSelected` — auto-selección solo ocurre
 *        en el primer mount. Evita reset del scope al recargar sub-componentes.
 *
 * CHANGELOG V3.0 (base sin modificaciones):
 * [V3-1] AtletasList: tabs TODOS / 10K CARRERA / 4K CAMINATA.
 * [V3-2] TasaConfig: campo costo_4k_usd editable.
 * [V3-3] PDFExportModal: filtro de modalidad.
 * [V3-4] Runner interface: modalidad, repr_* fields.
 *
 * CHANGELOG V2.1 (base sin modificaciones):
 * [V2.1-1] EscuadronesList: join manual (FK eliminada).
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import {
  ShieldCheck, Settings, LogOut, Activity, RefreshCw, Save, CheckCircle,
  Search, CheckSquare, Eye, X, ShieldAlert, FileText, Trash2, Phone,
  Clock, AlertTriangle, Users, Package, Scan, Radio, Zap, BarChart2,
  ChevronDown, Filter, UserPlus, Gift, Baby
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

type Modalidad = '10K' | '4K';

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
  modalidad?: Modalidad;
  genero?: 'M' | 'F';           // [V4-1]
  repr_nombre?:   string | null;
  repr_apellido?: string | null;
  repr_cedula?:   string | null;
  repr_telefono?: string | null;
  repr_email?:    string | null;
  repr_relacion?: string | null;
}

const BUCKET = 'comprobantes-pago';

const CATEGORY_ORDER: string[] = [
  'Movilidad Reducida',
  'Junior Masculino', 'Junior Femenino',
  'Juvenil Masculino', 'Juvenil Femenino',
  'Libre Masculino', 'Libre Femenino',
  'Sub Master (30-34) Masculino', 'Sub Master (30-34) Femenino',
  'Sub Master (35-39) Masculino', 'Sub Master (35-39) Femenino',
  'Master A Masculino', 'Master A Femenino',
  'Master B Masculino', 'Master B Femenino',
  'Master C Masculino', 'Master C Femenino',
  'Master D Masculino', 'Master D Femenino',
  'Absoluto Masculino', 'Absoluto Femenino',
  'Caminata Recreativa 4K',
];

const getCategoryColor = (categoria: string): [number,number,number] => {
  const c = categoria.toLowerCase();
  if (c.includes('movilidad'))  return [168,85,247];
  if (c.includes('caminata'))   return [251,191,36];
  if (c.includes('junior'))     return [34,197,94];
  if (c.includes('juvenil'))    return [34,211,238];
  if (c.includes('libre'))      return [251,191,36];
  if (c.includes('30-34'))      return [52,211,153];
  if (c.includes('35-39'))      return [16,185,129];
  if (c.includes('master a'))   return [249,115,22];
  if (c.includes('master b'))   return [239,68,68];
  if (c.includes('master c'))   return [236,72,153];
  if (c.includes('master d'))   return [99,102,241];
  if (c.includes('masculino'))  return [59,130,246];
  if (c.includes('femenino'))   return [244,114,182];
  return [156,163,175];
};

/* ────────────────────────────────────────────────────────────── */
/* [V4-2] GENDER / CATEGORY CONSISTENCY VALIDATOR                */
/*                                                                */
/* Detecta si la categoría almacenada contiene un género que      */
/* contradice el campo genero del runner.                         */
/* Retorna un mensaje descriptivo o null si es coherente.         */
/* ────────────────────────────────────────────────────────────── */

function validateGenderCategoryConsistency(runner: Runner): string | null {
  const { genero, categoria } = runner;
  if (!genero || !categoria) return null;

  const cat = categoria.toLowerCase();
  // Categorías neutras — sin validación de género
  if (
    cat.includes('movilidad reducida') ||
    cat.includes('caminata') ||
    cat.includes('caninata')
  ) return null;

  const catHasMasculino = cat.includes('masculino');
  const catHasFemenino  = cat.includes('femenino');
  if (!catHasMasculino && !catHasFemenino) return null;

  if (genero === 'M' && catHasFemenino) {
    return `Género M pero categoría tiene "Femenino" — posible error de registro.`;
  }
  if (genero === 'F' && catHasMasculino) {
    return `Género F pero categoría tiene "Masculino" — posible error de registro.`;
  }
  return null;
}

/* ────────────────────────────────────────────────────────────── */
/* [V4-3] GENDER MISMATCH BADGE — componente inline reutilizable  */
/* ────────────────────────────────────────────────────────────── */

const GenderMismatchBadge: React.FC<{ runner: Runner; className?: string }> = ({ runner, className = '' }) => {
  const msg = validateGenderCategoryConsistency(runner);
  if (!msg) return null;
  return (
    <span
      title={msg}
      className={`inline-flex items-center gap-1 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border cursor-help ${className}`}
      style={{ background: 'rgba(239,68,68,0.12)', borderColor: 'rgba(239,68,68,0.35)', color: '#ef4444' }}
    >
      <ShieldAlert size={9} />
      GÉNERO/CAT
    </span>
  );
};

/* ────────────────────────────────────────────────────────────── */
/* RACE SCOPE                                                     */
/* ────────────────────────────────────────────────────────────── */

export interface RaceScope {
  raceId: string | null; legacy: boolean; name: string; isActive: boolean;
}

/**
 * [V4.1] isLegacyRace — SOLO el WE RUN 10K NIGHT FEST es legacy (race_id NULL).
 * La CANINATA BARQUISIMETO y cualquier carrera futura en Barquisimeto tienen
 * su propio race_id en la tabla races y NO son legacy.
 * Criterio: únicamente 'night fest' identifica la primera carrera histórica.
 */
const isLegacyRace = (name: string) => {
  const n = (name||'').toLowerCase();
  return n.includes('night fest');
};

const applyScopeFilter = (query: any, scope: RaceScope) => {
  if (scope.legacy) return query.is('race_id', null);
  if (scope.raceId) return query.eq('race_id', scope.raceId);
  return query;
};

/**
 * [V4-8] RaceScopeBar — guard hasAutoSelected
 * La auto-selección solo ocurre en el PRIMER mount del componente.
 * Las re-renders subsiguientes no disparan onChange innecesariamente,
 * evitando que los sub-componentes pierdan el scope al recargar datos.
 */
const RaceScopeBar = ({ scope, onChange }:{ scope:RaceScope|null; onChange:(s:RaceScope)=>void }) => {
  const [races, setRaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const hasAutoSelected = useRef(false); // [V4-8]

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.from('races').select('id,name,date,inscripciones_abiertas').order('date',{ascending:false});
        if (error) throw error;
        setRaces(data||[]);
        // [V4-8] Auto-selección solo si nunca se ha hecho antes y no hay scope activo
        if (!hasAutoSelected.current && !scope && data?.length) {
          hasAutoSelected.current = true;
          const activa = data.find(r=>r.inscripciones_abiertas)||data[0];
          onChange({ raceId:activa.id, legacy:isLegacyRace(activa.name), name:activa.name, isActive:!!activa.inscripciones_abiertas });
        }
      } catch(err){ console.error('[MIA] RaceScopeBar:',err); } finally { setLoading(false); }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div className="mb-8 h-16 rounded-2xl bg-white/[0.02] border border-white/5 animate-pulse flex items-center px-6"><span className="text-[9px] text-gray-600 uppercase tracking-widest font-black">Cargando carreras...</span></div>;
  return (
    <div className="mb-8 p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 mr-2"><Filter size={14} className="text-cyan-400" /><span className="text-[9px] text-gray-500 uppercase tracking-widest font-black">Carrera:</span></div>
      {races.map(r=>{
        const legacy = isLegacyRace(r.name); const selected = scope?.raceId===r.id;
        return (
          <button key={r.id} onClick={()=>onChange({raceId:r.id,legacy,name:r.name,isActive:!!r.inscripciones_abiertas})}
            className={`px-5 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center gap-2 border ${selected?r.inscripciones_abiertas?'bg-cyan-500 text-black border-cyan-500 shadow-lg shadow-cyan-500/20':'bg-amber-500/90 text-black border-amber-500 shadow-lg shadow-amber-500/20':'bg-white/5 hover:bg-white/10 text-gray-400 border-white/10'}`}>
            {r.inscripciones_abiertas?<span className={`w-1.5 h-1.5 rounded-full ${selected?'bg-black':'bg-cyan-400 animate-pulse'}`}/>:<Clock size={11}/>}
            {r.name}
            {!r.inscripciones_abiertas&&<span className={`text-[8px] px-1.5 py-0.5 rounded ${selected?'bg-black/20':'bg-white/5'}`}>ARCHIVO</span>}
          </button>
        );
      })}
    </div>
  );
};

/* ────────────────────────────────────────────────────────────── */
/* HELPERS                                                        */
/* ────────────────────────────────────────────────────────────── */

const parseTimeToSeconds = (t: any): number => {
  if (!t) return 0;
  if (typeof t==='string') { const p=t.split(':'); if(p.length===3) return parseInt(p[0])*3600+parseInt(p[1])*60+parseFloat(p[2]); return 0; }
  if (typeof t==='object') return (t.hours||0)*3600+(t.minutes||0)*60+(t.seconds||0);
  return 0;
};
const formatSeconds = (s: number): string => {
  if (s<=0) return '--:--:--';
  const h=Math.floor(s/3600); const m=Math.floor((s%3600)/60); const sec=Math.floor(s%60);
  return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
};
const getComprobantePublicUrl = async (cedula:string,referencia_pago?:string,storedPath?:string): Promise<string|null> => {
  if (storedPath?.trim()) { const {data}=supabase.storage.from(BUCKET).getPublicUrl(storedPath.trim()); if(data?.publicUrl) return data.publicUrl; }
  let offset=0; const PS=200;
  while (true) {
    const {data:files,error}=await supabase.storage.from(BUCKET).list('',{limit:PS,offset,sortBy:{column:'name',order:'asc'}});
    if (error||!files||files.length===0) break;
    const found=files.find(f=>{ const n=f.name.toLowerCase(); return n.includes(cedula.toLowerCase())||(referencia_pago&&n.includes(referencia_pago.toLowerCase())); });
    if (found) { const {data}=supabase.storage.from(BUCKET).getPublicUrl(found.name); return data?.publicUrl??null; }
    if (files.length<PS) break; offset+=PS;
  }
  return null;
};

/* ────────────────────────────────────────────────────────────── */
/* PDF EXPORT — [V3-3] sin modificaciones                         */
/* ────────────────────────────────────────────────────────────── */

type PDFMode = 'segmented'|'specific'|'general';
type PDFModalidadFilter = 'todos'|'10K'|'4K';

interface PDFExportModalProps { atletas:Runner[]; raceName:string; onClose:()=>void; }

const generateCategoryPDF = (atletas:Runner[], selectedCategories:string[], mode:PDFMode, raceName:string) => {
  const doc = new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  const pageW=doc.internal.pageSize.getWidth(); const pageH=doc.internal.pageSize.getHeight();
  const origAdd=doc.addPage.bind(doc);
  (doc as any).addPage = function(...a:any[]){ origAdd(...a); this.setFillColor(5,5,5); this.rect(0,0,pageW,pageH,'F'); return this; };
  doc.setFillColor(5,5,5); doc.rect(0,0,pageW,pageH,'F');
  const categoryCounts:Record<string,number>={};
  atletas.forEach(a=>{ const c=a.categoria||'Sin categoría'; categoryCounts[c]=(categoryCounts[c]||0)+1; });
  try{ const img=new Image(); img.src=logoPrincipal; doc.addImage(img,'PNG',pageW/2-20,15,40,14); }catch{}
  doc.setFont('helvetica','bold'); doc.setFontSize(36); doc.setTextColor(34,211,238);
  doc.text('RAYOCERO',pageW/2,42,{align:'center'});
  doc.setFontSize(12); doc.setTextColor(200,200,200); doc.text(raceName.toUpperCase(),pageW/2,50,{align:'center'});
  doc.setFont('helvetica','normal'); doc.setFontSize(10); doc.setTextColor(120,120,120);
  doc.text('Valkyron Group',pageW/2,56,{align:'center'});
  doc.setDrawColor(34,211,238); doc.setLineWidth(0.5); doc.line(20,64,pageW-20,64);
  doc.setFont('helvetica','bold'); doc.setFontSize(16); doc.setTextColor(255,255,255);
  const title = mode==='segmented'?'REPORTE SEGMENTADO POR CATEGORÍA':mode==='specific'?`CATEGORÍA: ${selectedCategories[0]?.toUpperCase()??''}`:'LISTADO GENERAL DE ATLETAS';
  doc.text(title,pageW/2,75,{align:'center'});
  const totalF=atletas.filter(a=>selectedCategories.includes(a.categoria||'Sin categoría')).length;
  const pagF=atletas.filter(a=>selectedCategories.includes(a.categoria||'Sin categoría')&&a.pago_verificado).length;
  doc.setFontSize(9); doc.setTextColor(156,163,175);
  doc.text(`Total: ${totalF}`,14,85); doc.text(`Pagos verificados: ${pagF}`,14,90);
  doc.text(`Generado: ${new Date().toLocaleString('es-VE')}`,pageW-14,85,{align:'right'});
  let barY=100; const maxC=Math.max(...Object.values(categoryCounts),1); const barMaxW=pageW-28-40;
  const catsBar=[...CATEGORY_ORDER.filter(c=>categoryCounts[c]),...Object.keys(categoryCounts).filter(c=>!CATEGORY_ORDER.includes(c))];
  catsBar.forEach(cat=>{ const cnt=categoryCounts[cat]||0; const bw=(cnt/maxC)*barMaxW; const [r,g,b]=getCategoryColor(cat);
    doc.setFillColor(20,20,20); doc.rect(14,barY,barMaxW,5,'F');
    doc.setFillColor(r,g,b); doc.rect(14,barY,Math.max(bw,1),5,'F');
    doc.setFontSize(7); doc.setTextColor(200,200,200); doc.text(cat.length>30?cat.substring(0,28)+'…':cat,16,barY+3.8);
    doc.setFont('helvetica','bold'); doc.setTextColor(r,g,b); doc.text(String(cnt),pageW-14,barY+3.8,{align:'right'});
    doc.setFont('helvetica','normal'); barY+=8; if(barY>pageH-20){doc.addPage();barY=20;}
  });
  const toRender=[...selectedCategories.filter(c=>CATEGORY_ORDER.includes(c)),...selectedCategories.filter(c=>!CATEGORY_ORDER.includes(c))];
  toRender.sort((a,b)=>{ const ia=CATEGORY_ORDER.indexOf(a),ib=CATEGORY_ORDER.indexOf(b); if(ia===-1)return 1; if(ib===-1)return -1; return ia-ib; });
  toRender.forEach(categoria=>{
    const ca=atletas.filter(a=>(a.categoria||'Sin categoría')===categoria).sort((a,b)=>Number(a.bib_number??9999)-Number(b.bib_number??9999));
    if(!ca.length) return;
    doc.addPage(); const [r,g,b]=getCategoryColor(categoria);
    doc.setFillColor(r,g,b); doc.rect(0,0,pageW,20,'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(14); doc.setTextColor(0,0,0);
    doc.text(categoria.toUpperCase(),pageW/2,13,{align:'center'});
    doc.setFontSize(9); doc.text(`${ca.length} ATLETAS`,pageW-14,13,{align:'right'});
    autoTable(doc,{
      startY:25,
      head:[['#','Dorsal','Atleta','Cédula','Teléfono','Talla','Pago','Kit']],
      body:ca.map((a,idx)=>[String(idx+1),a.bib_number?`#${a.bib_number}`:'---',`${a.nombre} ${a.apellido}`.toUpperCase(),`V-${a.cedula}`,a.telefono||'N/A',a.talla_camiseta||'N/A',a.pago_verificado?'✓':'—',a.kit_entregado?'✓':'—']),
      theme:'plain',
      styles:{fontSize:8,cellPadding:3,textColor:[255,255,255],lineColor:[40,40,40],lineWidth:0.1,fillColor:[5,5,5]},
      headStyles:{fillColor:[r,g,b],textColor:[0,0,0],fontStyle:'bold',fontSize:8},
      alternateRowStyles:{fillColor:[15,15,15]},
    });
  });
  const tp=(doc.internal as any).getNumberOfPages?.()??1;
  for(let i=1;i<=tp;i++){ doc.setPage(i); doc.setFontSize(6); doc.setTextColor(80,80,80); doc.text(`RAYOCERO · Valkyron Group · Pág ${i}/${tp}`,pageW/2,pageH-5,{align:'center'}); }
  const suffix=mode==='general'?'GENERAL':mode==='specific'?selectedCategories[0]?.replace(/\s+/g,'_').toUpperCase():'SEGMENTADO';
  doc.save(`RAYOCERO_${suffix}_${Date.now()}.pdf`);
};

const PDFExportModal: React.FC<PDFExportModalProps> = ({ atletas, raceName, onClose }) => {
  const [mode, setMode]             = useState<PDFMode>('segmented');
  const [selectedCategory, setSC]   = useState('');
  const [modalidadFilter, setMF]    = useState<PDFModalidadFilter>('todos');
  const [isGenerating, setIsGen]    = useState(false);

  const filteredAtletas = useMemo(() => {
    if (modalidadFilter === 'todos') return atletas;
    return atletas.filter(a => a.modalidad === modalidadFilter);
  }, [atletas, modalidadFilter]);

  const availableCategories = useMemo(() => {
    const cats=new Set(filteredAtletas.map(a=>a.categoria||'Sin categoría'));
    return CATEGORY_ORDER.filter(c=>cats.has(c));
  }, [filteredAtletas]);

  const getModalidadBtnClass = (val: PDFModalidadFilter): string => {
    const base = 'flex-1 py-2.5 rounded-xl border text-[10px] font-black uppercase transition-all';
    if (modalidadFilter !== val) return `${base} bg-white/[0.02] border-white/5 text-gray-500 hover:border-white/10`;
    if (val === '4K')  return `${base} bg-yellow-500/20 border-yellow-500/40 text-yellow-300`;
    if (val === '10K') return `${base} bg-cyan-500/20 border-cyan-500/40 text-cyan-300`;
    return `${base} bg-white/10 border-white/20 text-white`;
  };

  const pdfModeOptions: { id: PDFMode; label: string; desc: string }[] = [
    { id: 'segmented', label: 'Segmentado por categoría', desc: `Portada con barras + sección por categoría (${availableCategories.length} cats, ${filteredAtletas.length} atletas)` },
    { id: 'specific',  label: 'Categoría específica',     desc: 'Solo una categoría' },
    { id: 'general',   label: 'Lista general',             desc: 'Todos en una tabla' },
  ];

  const handleGenerate = async () => {
    setIsGen(true);
    try {
      let cats:string[]=[];
      if (mode==='segmented') cats=availableCategories;
      else if (mode==='specific') { if(!selectedCategory){alert('Selecciona una categoría.');setIsGen(false);return;} cats=[selectedCategory]; }
      else cats=[...new Set(filteredAtletas.map(a=>a.categoria||'Sin categoría'))];
      const label = modalidadFilter === 'todos' ? '' : ` (${modalidadFilter})`;
      generateCategoryPDF(filteredAtletas, cats, mode, raceName + label);
    } catch(err:any){ alert(`Error: ${err.message}`); } finally { setIsGen(false); }
  };

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
      <div className="bg-[#0a0a0a] border border-cyan-500/30 rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-in zoom-in-95">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-black text-white uppercase italic tracking-widest">Exportar PDF</h3>
            <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">{raceName} · Selecciona el modo</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={20}/></button>
        </div>
        <div className="mb-5">
          <p className="text-[9px] text-cyan-400 font-black uppercase tracking-widest mb-3">Modalidad</p>
          <div className="flex gap-2">
            {(['todos', '10K', '4K'] as PDFModalidadFilter[]).map(val => {
              const labels: Record<PDFModalidadFilter, string> = { todos: 'TODOS', '10K': '🏃 10K', '4K': '🚶 4K' };
              const subs:  Record<PDFModalidadFilter, string> = { todos: ' atletas', '10K': ' Carrera', '4K': ' Caminata' };
              return (
                <button key={val} onClick={() => setMF(val)} className={getModalidadBtnClass(val)}>
                  {labels[val]}
                  <span className="text-[8px] opacity-60 block">{filteredAtletas.length}{subs[val]}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="space-y-3 mb-6">
          {pdfModeOptions.map(opt=>(
            <button key={opt.id} onClick={()=>setMode(opt.id)}
              className={`w-full text-left p-4 rounded-2xl border transition-all ${mode===opt.id?'bg-cyan-500/10 border-cyan-500/40 text-white':'bg-white/[0.02] border-white/5 text-gray-400 hover:border-white/10'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${mode===opt.id?'bg-cyan-400 border-cyan-400':'border-gray-600'}`}/>
                <div><p className="text-xs font-black uppercase">{opt.label}</p><p className="text-[9px] text-gray-500 mt-0.5">{opt.desc}</p></div>
              </div>
            </button>
          ))}
        </div>
        {mode==='specific'&&(
          <div className="mb-6 animate-in slide-in-from-top-2">
            <label className="text-[10px] text-cyan-400 font-black uppercase tracking-widest mb-2 block">Categoría</label>
            <div className="relative">
              <select value={selectedCategory} onChange={e=>setSC(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-bold outline-none focus:border-cyan-500/50 appearance-none cursor-pointer">
                <option value="">— Seleccionar —</option>
                {availableCategories.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"/>
            </div>
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-white/5 font-bold hover:bg-white/10 text-xs uppercase">Cancelar</button>
          <button onClick={handleGenerate} disabled={isGenerating}
            className="flex-1 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase text-xs tracking-widest disabled:opacity-50 flex items-center justify-center gap-2">
            {isGenerating?<RefreshCw size={14} className="animate-spin"/>:<FileText size={14}/>}
            {isGenerating?'Generando...':'Generar PDF'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

/* ────────────────────────────────────────────────────────────── */
/* MÓDULO ENTREGA KITS — sin modificaciones                       */
/* ────────────────────────────────────────────────────────────── */

const ModuloEntregaKits = ({ scope }:{ scope:RaceScope }) => {
  const [bibInput,setBibInput]=useState('');
  const [epcInput,setEpcInput]=useState('');
  const [activeRunner,setActiveRunner]=useState<Runner|null>(null);
  const [statusMsg,setStatusMsg]=useState<{text:string;type:'success'|'error'|'info'}|null>(null);
  const [isLoading,setIsLoading]=useState(false);
  const epcRef=useRef<HTMLInputElement>(null);

  const searchRunner=async(e?:React.FormEvent)=>{ if(e)e.preventDefault(); if(!bibInput)return; setIsLoading(true);setStatusMsg(null);setActiveRunner(null);
    let q=supabase.from('runners').select('id,bib_number,nombre,apellido,cedula,categoria,rfid_epc,talla_camiseta').eq('bib_number',parseInt(bibInput,10));
    q=applyScopeFilter(q,scope); const{data,error}=await q.maybeSingle(); setIsLoading(false);
    if(error||!data){setStatusMsg({text:`Dorsal #${bibInput} no localizado.`,type:'error'});return;}
    if(data.rfid_epc){setStatusMsg({text:`ALERTA: Dorsal ${data.bib_number} ya tiene chip (${data.rfid_epc}).`,type:'error'});return;}
    setActiveRunner(data as Runner); setStatusMsg({text:'Identidad confirmada. Escanear chip.',type:'info'});
    setTimeout(()=>epcRef.current?.focus(),100);
  };
  const handleEpcScan=async(e:React.KeyboardEvent<HTMLInputElement>)=>{ if(e.key!=='Enter')return; e.preventDefault(); if(!activeRunner||!epcInput)return; setIsLoading(true);
    const{error}=await supabase.from('runners').update({rfid_epc:epcInput}).eq('id',activeRunner.id); setIsLoading(false);
    if(error){setStatusMsg({text:`Falla: ${error.message}`,type:'error'});setEpcInput('');}
    else{setStatusMsg({text:`EXITOSO: Chip asignado Dorsal #${activeRunner.bib_number}`,type:'success'});setBibInput('');setEpcInput('');setActiveRunner(null);}
  };

  return (
    <div className="max-w-4xl mx-auto bg-black/40 border border-cyan-500/20 rounded-2xl p-8 shadow-2xl relative overflow-hidden animate-in fade-in">
      <div className="absolute top-0 right-0 bg-cyan-500/10 text-cyan-400 font-black text-xs px-4 py-2 rounded-bl-2xl border-b border-l border-cyan-500/20">ENLACE RFID · {scope.name.toUpperCase()}</div>
      <h3 className="text-xl font-black text-white uppercase italic tracking-widest flex items-center gap-3 mb-8"><Package className="text-cyan-400"/> Centro de Aprovisionamiento</h3>
      {statusMsg&&<div className={`p-4 mb-8 rounded-xl border font-mono text-xs uppercase font-bold tracking-wider ${statusMsg.type==='success'?'bg-green-500/10 border-green-500/30 text-green-400':statusMsg.type==='error'?'bg-red-500/10 border-red-500/30 text-red-400':'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'}`}>{statusMsg.text}</div>}
      <form onSubmit={searchRunner} className="flex gap-4 mb-8">
        <div className="flex-1"><label className="text-[10px] text-cyan-400 font-black uppercase tracking-widest mb-2 block">Número de Dorsal</label>
          <input type="number" value={bibInput} onChange={e=>setBibInput(e.target.value)} disabled={activeRunner!==null} className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-5 py-4 text-2xl font-black text-white outline-none focus:border-cyan-500/50 disabled:opacity-50" placeholder="0001" autoFocus /></div>
        <div className="flex items-end"><button type="submit" disabled={!bibInput||isLoading||activeRunner!==null} className="h-[64px] px-8 flex items-center justify-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-[0.2em] disabled:opacity-50">{isLoading&&!activeRunner?<RefreshCw className="animate-spin" size={18}/>:<Search size={18}/>} Localizar</button></div>
      </form>
      {activeRunner&&<div className="space-y-6 border-t border-white/10 pt-8 animate-in slide-in-from-bottom-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/[0.02] border border-white/5 p-5 rounded-xl"><p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mb-1">Objetivo</p><p className="text-lg font-black text-white uppercase">{activeRunner.nombre} {activeRunner.apellido}</p><p className="text-xs text-cyan-400 font-mono mt-1">CI: V-{activeRunner.cedula}</p></div>
          <div className="bg-white/[0.02] border border-white/5 p-5 rounded-xl flex flex-col justify-center">
            <div className="flex justify-between items-center mb-2"><span className="text-[9px] text-gray-500 uppercase font-black">Categoría:</span><span className="text-xs text-white font-bold">{activeRunner.categoria||'N/A'}</span></div>
            <div className="flex justify-between items-center"><span className="text-[9px] text-gray-500 uppercase font-black">Talla:</span><span className="text-xs bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded font-black">{activeRunner.talla_camiseta||'N/A'}</span></div>
          </div>
        </div>
        <div className="bg-cyan-900/10 border-2 border-dashed border-cyan-500/30 rounded-xl p-6 relative">
          <label className="text-[10px] text-cyan-400 font-black uppercase tracking-widest mb-4 flex items-center gap-2"><Scan size={14}/> Código EPC</label>
          <input ref={epcRef} type="text" value={epcInput} onChange={e=>setEpcInput(e.target.value)} onKeyDown={handleEpcScan} disabled={isLoading}
            className="w-full bg-transparent border-b-2 border-cyan-500/50 pb-2 text-center text-xl font-mono text-white outline-none focus:border-cyan-400 placeholder-cyan-500/20" placeholder="[ APROXIME EL CHIP AL LECTOR ]"/>
          <p className="text-center text-[9px] text-gray-500 uppercase mt-4">El sensor enlazará automáticamente.</p>
        </div>
        <div className="flex justify-end"><button onClick={()=>{setActiveRunner(null);setBibInput('');}} className="text-[10px] uppercase font-black tracking-widest text-red-500 hover:text-red-400">[ Abortar ]</button></div>
      </div>}
    </div>
  );
};

/* ────────────────────────────────────────────────────────────── */
/* MÓDULO CHEQUEO KITS — sin modificaciones                       */
/* ────────────────────────────────────────────────────────────── */

const ModuloChequeoKits = ({ scope }:{ scope:RaceScope }) => {
  const [bibInput,setBibInput]=useState('');
  const [activeRunner,setActiveRunner]=useState<Runner|null>(null);
  const [statusMsg,setStatusMsg]=useState<{text:string;type:'success'|'error'|'info'}|null>(null);
  const [isLoading,setIsLoading]=useState(false);
  const [stats,setStats]=useState({total:0,entregados:0,pendientes:0});
  const bibRef=useRef<HTMLInputElement>(null);
  const fetchStats=useCallback(async()=>{ let q=supabase.from('runners').select('kit_entregado'); q=applyScopeFilter(q,scope); const{data}=await q;
    if(data){const e=data.filter(r=>r.kit_entregado).length;setStats({total:data.length,entregados:e,pendientes:data.length-e});} },[scope.raceId,scope.legacy]);
  useEffect(()=>{fetchStats();},[fetchStats]);
  const searchRunner=async(e?:React.FormEvent)=>{ if(e)e.preventDefault(); if(!bibInput.trim())return; setIsLoading(true);setStatusMsg(null);setActiveRunner(null);
    let q=supabase.from('runners').select('id,bib_number,nombre,apellido,cedula,categoria,talla_camiseta,kit_entregado,pago_verificado').eq('bib_number',parseInt(bibInput,10));
    q=applyScopeFilter(q,scope); const{data,error}=await q.maybeSingle(); setIsLoading(false);
    if(error||!data){setStatusMsg({text:`Dorsal #${bibInput} no encontrado.`,type:'error'});return;}
    setActiveRunner(data as Runner); if(data.kit_entregado)setStatusMsg({text:`⚠️ El kit del Dorsal #${data.bib_number} ya fue entregado.`,type:'error'}); else setStatusMsg({text:'Atleta identificado. Confirme la entrega.',type:'info'});
  };
  const confirmarEntrega=async()=>{ if(!activeRunner)return; setIsLoading(true);
    const{error}=await supabase.from('runners').update({kit_entregado:true}).eq('id',activeRunner.id); setIsLoading(false);
    if(error)setStatusMsg({text:`Error: ${error.message}`,type:'error'}); else{setStatusMsg({text:`✅ KIT ENTREGADO — #${activeRunner.bib_number} ${activeRunner.nombre} ${activeRunner.apellido}`,type:'success'});setActiveRunner(null);setBibInput('');fetchStats();setTimeout(()=>{setStatusMsg(null);bibRef.current?.focus();},2500);}
  };
  const deshacerEntrega=async()=>{ if(!activeRunner)return; setIsLoading(true);
    const{error}=await supabase.from('runners').update({kit_entregado:false}).eq('id',activeRunner.id); setIsLoading(false);
    if(!error){setStatusMsg({text:`Revertido Dorsal #${activeRunner.bib_number}`,type:'info'});setActiveRunner(null);setBibInput('');fetchStats();}
  };
  const pct=stats.total>0?Math.round((stats.entregados/stats.total)*100):0;
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-black/40 border border-white/10 rounded-2xl p-6 text-center"><p className="text-[9px] text-gray-500 uppercase font-black mb-1">Total</p><p className="text-4xl font-black italic text-white">{stats.total}</p></div>
        <div className="bg-black/40 border border-green-500/20 rounded-2xl p-6 text-center"><p className="text-[9px] text-gray-500 uppercase font-black mb-1">Entregados</p><p className="text-4xl font-black italic text-green-400">{stats.entregados}</p></div>
        <div className="bg-black/40 border border-yellow-500/20 rounded-2xl p-6 text-center"><p className="text-[9px] text-gray-500 uppercase font-black mb-1">Pendientes</p><p className="text-4xl font-black italic text-yellow-400">{stats.pendientes}</p></div>
      </div>
      <div className="bg-black/40 border border-white/10 rounded-2xl p-6">
        <div className="flex justify-between items-center mb-3"><p className="text-[10px] text-gray-400 font-black uppercase">Progreso de Entrega</p><p className="text-lg font-black italic text-white">{pct}%</p></div>
        <div className="h-3 bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-cyan-500 to-green-400 rounded-full transition-all duration-700" style={{width:`${pct}%`}}/></div>
      </div>
      <div className="bg-black/40 border border-amber-500/20 rounded-2xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 bg-amber-500/10 text-amber-400 font-black text-xs px-4 py-2 rounded-bl-2xl border-b border-l border-amber-500/20">CHEQUEO · {scope.name.toUpperCase()}</div>
        <h3 className="text-xl font-black text-white uppercase italic tracking-widest flex items-center gap-3 mb-8"><Gift className="text-amber-400"/> Entrega de Kit</h3>
        {statusMsg&&<div className={`p-4 mb-6 rounded-xl border font-mono text-xs uppercase font-bold tracking-wider ${statusMsg.type==='success'?'bg-green-500/10 border-green-500/30 text-green-400':statusMsg.type==='error'?'bg-red-500/10 border-red-500/30 text-red-400':'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>{statusMsg.text}</div>}
        <form onSubmit={searchRunner} className="flex gap-4 mb-6">
          <div className="flex-1"><label className="text-[10px] text-amber-400 font-black uppercase mb-2 block">Número de Dorsal</label>
            <input ref={bibRef} type="number" value={bibInput} onChange={e=>setBibInput(e.target.value)} className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-5 py-4 text-2xl font-black text-white outline-none focus:border-amber-500/50" placeholder="0001" autoFocus/></div>
          <div className="flex items-end"><button type="submit" disabled={!bibInput.trim()||isLoading} className="h-[64px] px-8 flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-[0.2em] disabled:opacity-50">{isLoading?<RefreshCw className="animate-spin" size={18}/>:<Search size={18}/>} Buscar</button></div>
        </form>
        {activeRunner&&<div className="border-t border-white/10 pt-6 space-y-4 animate-in slide-in-from-bottom-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 bg-white/[0.02] border border-white/5 p-5 rounded-xl">
              <p className="text-[9px] text-gray-500 uppercase font-black mb-2">Atleta</p>
              <p className="text-2xl font-black text-white uppercase">{activeRunner.nombre} {activeRunner.apellido}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-cyan-400 font-mono">V-{activeRunner.cedula}</span>
                <span className="text-[8px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded font-black uppercase">{activeRunner.categoria||'SIN CAT'}</span>
                {activeRunner.pago_verificado&&<span className="text-[8px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded font-black uppercase flex items-center gap-1"><ShieldCheck size={10}/> PAGO OK</span>}
              </div>
            </div>
            <div className="bg-white/[0.02] border border-white/5 p-5 rounded-xl flex flex-col items-center justify-center"><p className="text-[9px] text-gray-500 uppercase font-black mb-1">Talla</p><p className="text-4xl font-black italic text-amber-400">{activeRunner.talla_camiseta||'N/A'}</p></div>
          </div>
          <div className="flex gap-3">
            {!activeRunner.kit_entregado?(
              <button onClick={confirmarEntrega} disabled={isLoading} className="flex-1 py-4 rounded-xl bg-green-500 hover:bg-green-400 text-black font-black uppercase text-sm tracking-widest disabled:opacity-50 flex items-center justify-center gap-3">{isLoading?<RefreshCw size={18} className="animate-spin"/>:<CheckCircle size={18}/>} Confirmar Entrega</button>
            ):(<><div className="flex-1 py-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 font-black uppercase text-sm flex items-center justify-center gap-3"><CheckCircle size={18}/> Ya Entregado</div><button onClick={deshacerEntrega} disabled={isLoading} className="px-6 py-4 rounded-xl bg-white/5 hover:bg-red-500/10 text-red-400 border border-red-500/20 font-black uppercase text-xs">Revertir</button></>)}
            <button onClick={()=>{setActiveRunner(null);setBibInput('');setStatusMsg(null);}} className="px-6 py-4 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-black uppercase text-xs">Cancelar</button>
          </div>
        </div>}
      </div>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────── */
/* TASA CONFIG — sin modificaciones                               */
/* ────────────────────────────────────────────────────────────── */

const TasaConfig = ({ scope }:{ scope:RaceScope }) => {
  const [tasaActual,setTasaActual]=useState<number|null>(null);
  const [nuevaTasa,setNuevaTasa]=useState('');
  const [costoUSDActual,setCostoUSDActual]=useState<number|null>(null);
  const [nuevoCostoUSD,setNuevoCostoUSD]=useState('');
  const [costo4kActual,setCosto4kActual]=useState<number|null>(null);
  const [nuevoCosto4k,setNuevoCosto4k]=useState('');
  const [ultimaAct,setUltimaAct]=useState<string|null>(null);
  const [isLoading,setIsLoading]=useState(true);
  const [isSaving,setIsSaving]=useState(false);
  const [successMsg,setSuccessMsg]=useState(false);
  const [configRowId,setConfigRowId]=useState<number|null>(null);

  const fetchConfig=useCallback(async()=>{
    setIsLoading(true);
    try {
      let data:any=null;
      if (!scope.legacy&&scope.raceId) { const br=await supabase.from('system_config').select('*').eq('race_id',scope.raceId).maybeSingle(); data=br.data; }
      if (!data) { const fb=await supabase.from('system_config').select('*').eq('id',1).single(); data=fb.data; }
      if (data) {
        setConfigRowId(data.id); setTasaActual(data.tasa_bcv); setNuevaTasa(String(data.tasa_bcv));
        setCostoUSDActual(data.costo_usd||40); setNuevoCostoUSD(String(data.costo_usd||40));
        setCosto4kActual(data.costo_4k_usd||20); setNuevoCosto4k(String(data.costo_4k_usd||20));
        setUltimaAct(new Date(data.ultima_actualizacion).toLocaleString('es-VE'));
      }
    } catch(err){console.error(err);} finally{setIsLoading(false);}
  },[scope.raceId,scope.legacy]);

  useEffect(()=>{fetchConfig();},[fetchConfig]);

  const handleUpdate=async(e:React.FormEvent)=>{ e.preventDefault(); setIsSaving(true);
    try {
      if(configRowId===null) throw new Error('Fila config no localizada');
      const{error}=await supabase.from('system_config').update({
        tasa_bcv:parseFloat(nuevaTasa.replace(',','.')),
        costo_usd:parseFloat(nuevoCostoUSD.replace(',','.')),
        costo_4k_usd:parseFloat(nuevoCosto4k.replace(',','.')),
        ultima_actualizacion:new Date().toISOString(),
      }).eq('id',configRowId);
      if(error) throw error;
      await fetchConfig(); setSuccessMsg(true); setTimeout(()=>setSuccessMsg(false),3000);
    } catch(err:any){alert(err.message);} finally{setIsSaving(false);}
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
      <div className="bg-black/40 border border-cyan-500/20 rounded-2xl p-8">
        <h4 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
          <Settings size={18} className="text-cyan-400"/> Parámetros Financieros
          <span className="text-[8px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded font-black uppercase ml-2">{scope.name}</span>
        </h4>
        <form onSubmit={handleUpdate} className="space-y-5">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-[10px] text-cyan-400 font-black uppercase tracking-widest mb-2 block">Tasa BCV</label>
              <input type="text" value={nuevaTasa} onChange={e=>setNuevaTasa(e.target.value)} className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-5 py-4 text-white outline-none focus:border-cyan-500/50"/>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest mb-2 block items-center gap-1.5" style={{color:"#00d4c8"}}>🏃 Inscripción 10K USD</label>
              <input type="text" value={nuevoCostoUSD} onChange={e=>setNuevoCostoUSD(e.target.value)} className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-5 py-4 text-white outline-none focus:border-cyan-500/50"/>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest mb-2 block items-center gap-1.5" style={{color:"#fbbf24"}}>🚶 Inscripción 4K Caminata USD</label>
              <input type="text" value={nuevoCosto4k} onChange={e=>setNuevoCosto4k(e.target.value)} className="w-full rounded-xl bg-white/[0.03] border border-white/10 px-5 py-4 text-white outline-none focus:border-yellow-500/50"/>
            </div>
          </div>
          <button type="submit" disabled={isSaving||isLoading} className="w-full flex items-center justify-center gap-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black px-6 py-4 text-xs font-black uppercase tracking-[0.2em] transition-all">
            {isSaving?<RefreshCw className="animate-spin h-5 w-5"/>:<Save className="h-5 w-5"/>}
            {isSaving?'ACTUALIZANDO...':'SINCRONIZAR'}
          </button>
          {successMsg&&<div className="flex items-center justify-center gap-2 text-green-400 animate-pulse"><CheckCircle size={16}/><span className="text-[10px] uppercase font-bold">Sincronización Exitosa</span></div>}
        </form>
      </div>
      <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-2xl p-8 flex flex-col justify-center">
        {isLoading?<div className="flex justify-center"><Activity size={48} className="animate-pulse text-cyan-500"/></div>:(
          <div className="space-y-5">
            <div className="flex justify-around items-center">
              <div><p className="text-[8px] text-gray-500 uppercase">Tasa BCV</p><div className="text-3xl font-black italic text-white">{tasaActual?.toFixed(2)}</div></div>
              <div className="h-12 w-[1px] bg-white/10"/>
              <div className="flex flex-col gap-2">
                <div><p className="text-[8px] uppercase" style={{color:"rgba(0,212,200,0.6)"}}>🏃 10K</p><div className="text-2xl font-black italic" style={{color:"#00d4c8"}}>${costoUSDActual}</div></div>
                <div><p className="text-[8px] uppercase" style={{color:"rgba(251,191,36,0.6)"}}>🚶 4K</p><div className="text-2xl font-black italic" style={{color:"#fbbf24"}}>${costo4kActual}</div></div>
              </div>
            </div>
            <div className="text-[10px] text-cyan-400 font-mono text-center">{ultimaAct}</div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────── */
/* ATLETAS LIST — [V4-3] GenderMismatchBadge integrado            */
/* ────────────────────────────────────────────────────────────── */

type ModalidadTab = 'todos' | '10K' | '4K';

const AtletasList = ({ scope, onUpdateCount }:{ scope:RaceScope; onUpdateCount?:(n:number)=>void }) => {
  const [atletas,setAtletas]=useState<Runner[]>([]);
  const [loading,setLoading]=useState(true);
  const [searchTerm,setSearchTerm]=useState('');
  const [modalidadTab,setModalidadTab]=useState<ModalidadTab>('todos');
  const [selectedAtleta,setSelectedAtleta]=useState<Runner|null>(null);
  const [comprobanteUrl,setComprobanteUrl]=useState<string|null>(null);
  const [imgLoading,setImgLoading]=useState(false);
  const [statusMsg,setStatusMsg]=useState('');
  const [athleteToDelete,setAthleteToDelete]=useState<Runner|null>(null);
  const [isDeleting,setIsDeleting]=useState(false);
  const [isTogglingPayment,setIsTogglingPayment]=useState<string|null>(null);
  const [isTogglingKit,setIsTogglingKit]=useState<string|null>(null);
  const [showPDFModal,setShowPDFModal]=useState(false);

  const fetchAtletas=useCallback(async()=>{ setLoading(true);
    try {
      // Incluimos `genero` en el select para poder validar el mismatch [V4-1]
      let q=supabase.from('runners').select('*,genero').order('created_at',{ascending:false});
      q=applyScopeFilter(q,scope);
      const{data,error}=await q; if(error)throw error; setAtletas(data||[]);
    }
    catch(err){console.error(err);} finally{setLoading(false);}
  },[scope.raceId,scope.legacy]);

  useEffect(()=>{fetchAtletas();},[fetchAtletas]);
  useEffect(()=>{ if(onUpdateCount) onUpdateCount(atletas.length); },[atletas.length,onUpdateCount]);

  const togglePago=async(id:string,current?:boolean)=>{ setIsTogglingPayment(id); const nv=!current;
    try{ const{error}=await supabase.from('runners').update({pago_verificado:nv}).eq('id',id); if(error)throw error;
      setAtletas(prev=>prev.map(a=>a.id===id?{...a,pago_verificado:nv}:a));
      if(selectedAtleta?.id===id) setSelectedAtleta(prev=>prev?{...prev,pago_verificado:nv}:null);
    }catch(err:any){alert(err.message);} finally{setIsTogglingPayment(null);}
  };
  const toggleKit=async(id:string,current?:boolean)=>{ setIsTogglingKit(id); const nv=!current;
    try{ const{error}=await supabase.from('runners').update({kit_entregado:nv}).eq('id',id); if(error)throw error;
      setAtletas(prev=>prev.map(a=>a.id===id?{...a,kit_entregado:nv}:a));
      if(selectedAtleta?.id===id) setSelectedAtleta(prev=>prev?{...prev,kit_entregado:nv}:null);
    }catch(err:any){alert(err.message);} finally{setIsTogglingKit(null);}
  };
  const handleDelete=async()=>{ if(!athleteToDelete||isDeleting)return; setIsDeleting(true);
    const{id:tid,cedula:tc,bib_number:tb}=athleteToDelete;
    try {
      await Promise.all([
        supabase.from('race_results').delete().eq('cedula_runner',tc),
        supabase.from('race_results').delete().eq('runner_cedula',tc),
        supabase.from('race_results').delete().eq('runner_id',tid),
        tb?supabase.from('race_results').delete().eq('bib_number',tb):Promise.resolve(),
      ]);
      await Promise.all([
        supabase.from('teams').update({runner_m1_id:null}).eq('runner_m1_id',tid),
        supabase.from('teams').update({runner_m2_id:null}).eq('runner_m2_id',tid),
        supabase.from('teams').update({runner_f1_id:null}).eq('runner_f1_id',tid),
        supabase.from('teams').update({runner_f2_id:null}).eq('runner_f2_id',tid),
      ]);
      const{error}=await supabase.from('runners').delete().eq('id',tid);
      if(error)throw error;
      setAtletas(prev=>prev.filter(a=>a.id!==tid)); setAthleteToDelete(null);
    }catch(err:any){alert(err.message);} finally{setIsDeleting(false);}
  };
  const inspectComprobante=async(a:Runner)=>{ setSelectedAtleta(a);setComprobanteUrl(null);setImgLoading(true);setStatusMsg('Escaneando...');
    try{ const url=await getComprobantePublicUrl(a.cedula,a.referencia_pago,a.comprobante_url||a.comprobante_path); if(!url)setStatusMsg(`No encontrado — V-${a.cedula}`); else setComprobanteUrl(url); }
    catch{setStatusMsg('Error de enlace');} finally{setImgLoading(false);}
  };

  const count10k = atletas.filter(a => a.modalidad === '10K').length;
  const count4k  = atletas.filter(a => a.modalidad === '4K').length;
  const countSinModalidad = atletas.filter(a => !a.modalidad).length;

  // [V4-3] Conteo de mismatches para mostrar en el header
  const countMismatch = atletas.filter(a => validateGenderCategoryConsistency(a) !== null).length;

  const filteredAtletas = useMemo(() => {
    let list = atletas;
    if (modalidadTab === '10K') list = list.filter(a => a.modalidad === '10K');
    else if (modalidadTab === '4K') list = list.filter(a => a.modalidad === '4K');
    if (searchTerm) list = list.filter(a =>
      `${a.nombre} ${a.apellido} ${a.cedula} ${a.categoria || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return list;
  }, [atletas, searchTerm, modalidadTab]);

  const kitsEntregados=atletas.filter(a=>a.kit_entregado).length;

  return (
    <div className="relative text-white">
      <div className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">

        {/* Tabs de modalidad */}
        <div className="px-6 pt-6 pb-0 border-b border-white/5">
          <div className="flex flex-wrap gap-1 mb-0">
            {([
              ['todos', `TODOS (${atletas.length})`,         '#94a3b8'],
              ['10K',   `🏃 10K CARRERA (${count10k})`,      '#00d4c8'],
              ['4K',    `🚶 4K CAMINATA (${count4k})`,       '#fbbf24'],
            ] as [ModalidadTab, string, string][]).map(([val, lbl, color]) => (
              <button key={val} onClick={() => setModalidadTab(val)}
                className={`px-5 py-3 rounded-t-xl font-black uppercase text-[10px] tracking-widest transition-all border-b-2 ${modalidadTab === val ? 'bg-white/[0.04] border-current' : 'bg-transparent border-transparent text-gray-500 hover:text-gray-300'}`}
                style={{ color: modalidadTab === val ? color : '', borderColor: modalidadTab === val ? color : 'transparent' }}>
                {lbl}
              </button>
            ))}
            {countSinModalidad > 0 && (
              <div className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-amber-500/60 flex items-center gap-1.5 border-b-2 border-transparent">
                <AlertTriangle size={11} />
                {countSinModalidad} sin modalidad (solo en TODOS)
              </div>
            )}
            {/* [V4-3] Alerta de mismatches género/categoría en el header */}
            {countMismatch > 0 && (
              <div className="px-4 py-3 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 border-b-2 border-transparent"
                style={{ color: 'rgba(239,68,68,0.7)', borderColor: 'transparent' }}>
                <ShieldAlert size={11} />
                {countMismatch} conflicto{countMismatch > 1 ? 's' : ''} género/cat
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <button onClick={()=>setShowPDFModal(true)} className="px-4 py-2 rounded-lg bg-white/5 text-cyan-400 border border-cyan-400/20 hover:bg-cyan-400 hover:text-black flex items-center gap-2 text-[10px] uppercase font-black transition-all">
              <FileText size={14}/> Exportar PDF
            </button>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Gift size={14} className="text-amber-400"/>
              <span className="text-[10px] font-black text-amber-400 uppercase">Kits: {kitsEntregados}/{atletas.length}</span>
            </div>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14}/>
            <input type="text" placeholder="Filtrar..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-[10px] uppercase font-bold outline-none focus:border-cyan-500/30"/>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-white/5">
                <th className="p-4 text-left text-[9px] uppercase text-gray-400">Atleta / Categoría</th>
                <th className="p-4 text-left text-[9px] uppercase text-gray-400">Modalidad</th>
                <th className="p-4 text-left text-[9px] uppercase text-gray-400">Comunicación</th>
                <th className="p-4 text-left text-[9px] uppercase text-gray-400">Talla</th>
                <th className="p-4 text-left text-[9px] uppercase text-gray-400">Dorsal & RFID</th>
                <th className="p-4 text-center text-[9px] uppercase text-gray-400">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading?(
                <tr><td colSpan={6} className="p-20 text-center text-cyan-500 font-black animate-pulse uppercase">Cargando atletas...</td></tr>
              ):filteredAtletas.length===0?(
                <tr><td colSpan={6} className="p-20 text-center text-gray-600 font-black uppercase text-[10px]">
                  {searchTerm?'Sin coincidencias':`Sin atletas${modalidadTab!=='todos'?` en ${modalidadTab}`:''} para ${scope.name}`}
                </td></tr>
              ):filteredAtletas.map(a=>(
                <tr key={a.id} className={`hover:bg-white/[0.02] transition-colors ${validateGenderCategoryConsistency(a) ? 'bg-red-500/[0.02]' : ''}`}>
                  <td className="p-4">
                    <div className="font-bold text-xs uppercase flex items-center gap-2 flex-wrap">
                      {a.nombre} {a.apellido}
                      {a.pago_verificado&&<ShieldCheck size={12} className="text-green-500"/>}
                      {a.kit_entregado&&<Gift size={12} className="text-amber-400"/>}
                      {a.repr_cedula&&<span title="Menor con representante" style={{fontSize:"0.65rem"}}>👨‍👧</span>}
                      {/* [V4-3] Badge de mismatch género/categoría */}
                      <GenderMismatchBadge runner={a} />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] text-gray-500 font-mono">V-{a.cedula}</span>
                      <span className="text-[8px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded font-black uppercase">{a.categoria||'SIN CAT'}</span>
                      {a.referencia_pago==='NINO_GRATIS'&&<span className="text-[8px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded font-black uppercase">GRATIS</span>}
                    </div>
                  </td>
                  {/* Badge de modalidad — null muestra '—' sin inferir 10K */}
                  <td className="p-4">
                    {a.modalidad === '10K' && (
                      <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-full border"
                        style={{background:'rgba(0,212,200,0.07)',borderColor:'rgba(0,212,200,0.2)',color:'#00d4c8'}}>🏃 10K</span>
                    )}
                    {a.modalidad === '4K' && (
                      <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-full border"
                        style={{background:'rgba(251,191,36,0.07)',borderColor:'rgba(251,191,36,0.2)',color:'#fbbf24'}}>🚶 4K</span>
                    )}
                    {!a.modalidad && (
                      <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-full border"
                        style={{background:'rgba(255,255,255,0.03)',borderColor:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.25)'}}>—</span>
                    )}
                  </td>
                  <td className="p-4"><div className="flex items-center gap-2 text-cyan-400 text-[10px] font-mono"><Phone size={12}/>{a.telefono||'SIN_TLF'}</div></td>
                  <td className="p-4"><span className="text-xs font-mono bg-white/5 px-2 py-1 rounded border border-white/10 text-white">{a.talla_camiseta||'N/A'}</span></td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-white">{a.bib_number?`#${a.bib_number}`:<Clock size={14} className="text-yellow-500/50"/>}</span>
                      {a.rfid_epc&&<span className="text-[8px] text-cyan-400 font-mono mt-1">RFID ✓</span>}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={()=>inspectComprobante(a)} className="p-2 rounded-lg bg-white/5 hover:bg-cyan-500 hover:text-black transition-all" title="Ver comprobante"><Eye size={16}/></button>
                      <button onClick={()=>togglePago(a.id,a.pago_verificado)} disabled={isTogglingPayment===a.id}
                        className={`p-2 rounded-lg transition-all border ${a.pago_verificado?'bg-green-500/10 text-green-500 border-green-500/30 hover:bg-green-500 hover:text-black':'bg-white/5 text-gray-500 border-transparent hover:bg-white/10'}`}>
                        {isTogglingPayment===a.id?<RefreshCw size={16} className="animate-spin"/>:<CheckSquare size={16}/>}
                      </button>
                      <button onClick={()=>toggleKit(a.id,a.kit_entregado)} disabled={isTogglingKit===a.id}
                        className={`p-2 rounded-lg transition-all border ${a.kit_entregado?'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500 hover:text-black':'bg-white/5 text-gray-500 border-transparent hover:bg-amber-500/20 hover:text-amber-400'}`}>
                        {isTogglingKit===a.id?<RefreshCw size={16} className="animate-spin"/>:<Gift size={16}/>}
                      </button>
                      <button onClick={()=>setAthleteToDelete(a)} className="p-2 rounded-lg bg-white/5 hover:bg-red-500 hover:text-black text-red-500 transition-all"><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showPDFModal&&<PDFExportModal atletas={atletas} raceName={scope.name} onClose={()=>setShowPDFModal(false)}/>}

      {selectedAtleta&&createPortal(
        <div onClick={()=>setSelectedAtleta(null)} className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm">
          <div onClick={e=>e.stopPropagation()} className="bg-[#0a0f14] border border-cyan-400/20 rounded-3xl w-full max-w-6xl overflow-hidden flex flex-col md:flex-row shadow-2xl animate-in zoom-in-95">
            <div className="flex-1 bg-black flex items-center justify-center p-4 min-h-[400px]">
              {imgLoading?<div className="text-center"><RefreshCw className="animate-spin text-cyan-400 mb-4" size={40}/><p className="text-cyan-400 text-xs uppercase">Cargando...</p></div>
                :comprobanteUrl?<img src={comprobanteUrl} alt="comprobante" className="max-h-[80vh] object-contain shadow-2xl"/>
                :<div className="text-center"><ShieldAlert size={60} className="text-gray-700 mb-4"/><p className="text-gray-500 text-xs uppercase">{statusMsg}</p></div>}
            </div>
            <div className="w-full md:w-[350px] bg-[#0d1319] border-l border-white/5 p-8 flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div><h5 className="text-white font-black text-xl uppercase italic">Inspección</h5><p className="text-cyan-400 text-[9px] uppercase tracking-widest">Hangar Scan</p></div>
                <button onClick={()=>setSelectedAtleta(null)} className="p-2 bg-white/5 rounded-full hover:bg-white/10"><X size={20}/></button>
              </div>

              {/* [V4-7] Alerta de mismatch en panel de inspección */}
              {validateGenderCategoryConsistency(selectedAtleta) && (
                <div className="mb-4 p-3 rounded-xl border flex items-start gap-2"
                  style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.3)' }}>
                  <ShieldAlert size={14} className="text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[9px] font-black uppercase text-red-400 mb-0.5">Conflicto Género / Categoría</p>
                    <p className="text-[9px] text-red-300/70">{validateGenderCategoryConsistency(selectedAtleta)}</p>
                    <p className="text-[9px] text-red-300/50 mt-1">Corregir en Supabase → tabla runners.</p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="bg-white/[0.03] p-4 rounded-xl border border-white/5">
                  <p className="text-gray-500 text-[9px] uppercase">Unidad</p>
                  <p className="text-white font-black text-sm uppercase flex justify-between">{selectedAtleta.nombre} {selectedAtleta.apellido}{selectedAtleta.pago_verificado&&<ShieldCheck size={14} className="text-green-500"/>}</p>
                  <p className="text-cyan-400 font-mono text-xs">V-{selectedAtleta.cedula}</p>
                </div>
                {/* Género registrado */}
                {selectedAtleta.genero && (
                  <div className="bg-white/[0.03] p-4 rounded-xl border border-white/5">
                    <p className="text-gray-500 text-[9px] uppercase">Género registrado</p>
                    <p className="font-black uppercase text-sm text-white">
                      {selectedAtleta.genero === 'M' ? '♂ Masculino' : '♀ Femenino'}
                    </p>
                  </div>
                )}
                {/* Modalidad — sin inferir null como 10K [V4-6] */}
                <div className="bg-white/[0.03] p-4 rounded-xl border border-white/5">
                  <p className="text-gray-500 text-[9px] uppercase">Modalidad</p>
                  <p className="font-black uppercase text-sm"
                    style={{ color: selectedAtleta.modalidad === '10K' ? '#00d4c8' : selectedAtleta.modalidad === '4K' ? '#fbbf24' : 'rgba(255,255,255,0.25)' }}>
                    {selectedAtleta.modalidad === '10K' ? '🏃 10K Carrera'
                      : selectedAtleta.modalidad === '4K' ? '🚶 4K Caminata'
                      : '— Sin modalidad'}
                  </p>
                </div>
                <div className="bg-white/[0.03] p-4 rounded-xl border border-white/5"><p className="text-gray-500 text-[9px] uppercase">Categoría</p><p className="text-cyan-400 font-black uppercase">{selectedAtleta.categoria||'SIN ASIGNAR'}</p></div>
                <div className="bg-white/[0.03] p-4 rounded-xl border border-white/5"><p className="text-gray-500 text-[9px] uppercase">Teléfono</p><p className="text-white font-mono">{selectedAtleta.telefono||'SIN REGISTRO'}</p></div>
                <div className="bg-white/[0.03] p-4 rounded-xl border border-white/5"><p className="text-gray-500 text-[9px] uppercase">Talla</p><p className="text-white font-mono uppercase">{selectedAtleta.talla_camiseta||'N/A'}</p></div>
                <div className="bg-white/[0.03] p-4 rounded-xl border border-white/5"><p className="text-gray-500 text-[9px] uppercase">Referencia</p><p className="text-green-400 font-mono break-all">{selectedAtleta.referencia_pago||'PENDIENTE'}</p></div>
                {selectedAtleta.repr_cedula && (
                  <div className="p-4 rounded-xl border" style={{background:"rgba(251,191,36,0.05)",borderColor:"rgba(251,191,36,0.2)"}}>
                    <p className="text-[9px] uppercase font-black mb-2" style={{color:"rgba(251,191,36,0.6)"}}>👨‍👧 Representante</p>
                    <p className="text-white font-black text-xs uppercase">{selectedAtleta.repr_nombre} {selectedAtleta.repr_apellido}</p>
                    <p className="text-yellow-400 font-mono text-[10px] mt-0.5">V-{selectedAtleta.repr_cedula} · {selectedAtleta.repr_relacion}</p>
                    {selectedAtleta.repr_telefono && <p className="text-white/40 font-mono text-[10px] mt-0.5">{selectedAtleta.repr_telefono}</p>}
                  </div>
                )}
                <div className={`p-4 rounded-xl border flex items-center justify-between ${selectedAtleta.kit_entregado?'bg-amber-500/10 border-amber-500/30':'bg-white/[0.03] border-white/5'}`}>
                  <div><p className="text-gray-500 text-[9px] uppercase">Kit</p><p className={`font-black text-sm uppercase ${selectedAtleta.kit_entregado?'text-amber-400':'text-gray-500'}`}>{selectedAtleta.kit_entregado?'Entregado ✓':'Pendiente'}</p></div>
                  <button onClick={()=>toggleKit(selectedAtleta.id,selectedAtleta.kit_entregado)} disabled={isTogglingKit===selectedAtleta.id}
                    className={`p-2 rounded-lg ${selectedAtleta.kit_entregado?'bg-amber-500/20 text-amber-400':'bg-white/5 text-gray-500 hover:text-amber-400'}`}>
                    {isTogglingKit===selectedAtleta.id?<RefreshCw size={14} className="animate-spin"/>:<Gift size={14}/>}
                  </button>
                </div>
                <button onClick={()=>togglePago(selectedAtleta.id,selectedAtleta.pago_verificado)} disabled={isTogglingPayment===selectedAtleta.id}
                  className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase transition-all ${selectedAtleta.pago_verificado?'bg-green-500/20 text-green-400 border border-green-500/30':'bg-cyan-500 hover:bg-cyan-400 text-black'}`}>
                  {isTogglingPayment===selectedAtleta.id?<RefreshCw size={14} className="animate-spin"/>:selectedAtleta.pago_verificado?<><CheckCircle size={14}/>PAGO VALIDADO</>:<><ShieldCheck size={14}/>APROBAR PAGO</>}
                </button>
              </div>
            </div>
          </div>
        </div>,document.body
      )}

      {athleteToDelete&&createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
          <div className="bg-[#0a0a0a] border border-red-500/30 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-start mb-6"><div className="bg-red-500/20 p-3 rounded-2xl"><AlertTriangle className="text-red-500" size={24}/></div><button onClick={()=>setAthleteToDelete(null)} className="text-gray-500 hover:text-white"><X size={20}/></button></div>
            <h3 className="text-xl font-black text-white uppercase italic mb-2">Protocolo de Expurgo</h3>
            <p className="text-gray-400 text-sm mb-8">¿Eliminar a <span className="text-red-400 font-bold">{athleteToDelete.nombre} {athleteToDelete.apellido}</span>?</p>
            <div className="flex gap-4">
              <button onClick={()=>setAthleteToDelete(null)} className="flex-1 py-4 rounded-xl bg-white/5 font-bold hover:bg-white/10">Cancelar</button>
              <button onClick={handleDelete} disabled={isDeleting} className="flex-1 py-4 rounded-xl bg-red-600 hover:bg-red-500 flex items-center justify-center gap-2 font-black uppercase text-xs">
                {isDeleting?<RefreshCw className="animate-spin" size={14}/>:<Trash2 size={14}/>} Confirmar
              </button>
            </div>
          </div>
        </div>,document.body
      )}
    </div>
  );
};

/* ────────────────────────────────────────────────────────────── */
/* MÓDULO REPRESENTANTES — [V4-6] sin inferencia de modalidad     */
/* ────────────────────────────────────────────────────────────── */

const ModuloRepresentantes = ({ scope }: { scope: RaceScope }) => {
  const [menores, setMenores]     = useState<Runner[]>([]);
  const [loading, setLoading]     = useState(true);
  const [searchTerm, setSearch]   = useState('');
  const [selected, setSelected]   = useState<Runner | null>(null);

  const fetchMenores = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase
        .from('runners')
        .select('id,nombre,apellido,cedula,categoria,modalidad,genero,bib_number,repr_nombre,repr_apellido,repr_cedula,repr_telefono,repr_email,repr_relacion,created_at')
        .not('repr_cedula', 'is', null)
        .order('created_at', { ascending: false });
      q = applyScopeFilter(q, scope);
      const { data, error } = await q;
      if (error) throw error;
      setMenores(data || []);
    } catch (err) { console.error('[MIA] ModuloRepresentantes:', err); }
    finally { setLoading(false); }
  }, [scope.raceId, scope.legacy]);

  useEffect(() => { fetchMenores(); }, [fetchMenores]);

  const filtered = useMemo(() => {
    if (!searchTerm) return menores;
    const t = searchTerm.toLowerCase();
    return menores.filter(r =>
      `${r.nombre} ${r.apellido} ${r.cedula} ${r.repr_nombre ?? ''} ${r.repr_apellido ?? ''} ${r.repr_cedula ?? ''}`.toLowerCase().includes(t)
    );
  }, [menores, searchTerm]);

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black italic uppercase text-white tracking-widest" style={{fontFamily:'Barlow Condensed,sans-serif'}}>
            Menores Inscritos
          </h2>
          <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">
            {scope.name} · {menores.length} menor{menores.length !== 1 ? 'es' : ''} registrado{menores.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
          <input type="text" placeholder="Buscar atleta o representante..."
            value={searchTerm} onChange={e => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-[10px] uppercase font-bold outline-none focus:border-yellow-500/30 transition-all text-white"/>
        </div>
      </div>

      {!loading && menores.length === 0 && (
        <div className="py-20 text-center bg-white/[0.02] rounded-2xl border border-white/5">
          <Baby size={40} className="mx-auto mb-4 text-yellow-400/30" />
          <p className="text-[10px] font-black tracking-[0.4em] text-gray-500 uppercase">
            No hay menores inscritos en {scope.name}
          </p>
        </div>
      )}

      {(loading || filtered.length > 0) && (
        <div className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-white/5">
                  <th className="p-4 text-left text-[9px] uppercase text-gray-400">Atleta Menor</th>
                  <th className="p-4 text-left text-[9px] uppercase text-gray-400">Dorsal / Cat.</th>
                  <th className="p-4 text-left text-[9px] uppercase text-gray-400">Representante</th>
                  <th className="p-4 text-left text-[9px] uppercase text-gray-400">Contacto</th>
                  <th className="p-4 text-left text-[9px] uppercase text-gray-400">Relación</th>
                  <th className="p-4 text-center text-[9px] uppercase text-gray-400">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr><td colSpan={6} className="p-20 text-center text-yellow-400 font-black animate-pulse uppercase text-[10px]">Cargando menores...</td></tr>
                ) : filtered.map(r => (
                  <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-xs uppercase text-white">{r.nombre} {r.apellido}</p>
                      <p className="text-[9px] text-gray-500 font-mono mt-0.5">V-{r.cedula}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-black text-white text-sm">{r.bib_number ? `#${r.bib_number}` : '—'}</p>
                      {/* [V4-6] Sin ?? '10K' — null muestra '—' */}
                      {r.modalidad ? (
                        <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full border mt-1 inline-block"
                          style={r.modalidad === '10K'
                            ? {background:'rgba(0,212,200,0.07)',borderColor:'rgba(0,212,200,0.2)',color:'#00d4c8'}
                            : {background:'rgba(251,191,36,0.07)',borderColor:'rgba(251,191,36,0.2)',color:'#fbbf24'}}>
                          {r.modalidad === '10K' ? '🏃 10K' : '🚶 4K'}
                        </span>
                      ) : (
                        <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full border mt-1 inline-block"
                          style={{background:'rgba(255,255,255,0.03)',borderColor:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.25)'}}>—</span>
                      )}
                    </td>
                    <td className="p-4">
                      {r.repr_nombre ? (
                        <>
                          <p className="font-bold text-xs uppercase text-white">{r.repr_nombre} {r.repr_apellido}</p>
                          <p className="text-[9px] text-yellow-400/70 font-mono mt-0.5">V-{r.repr_cedula}</p>
                        </>
                      ) : (
                        <span className="text-[9px] text-gray-600 uppercase font-black">Sin datos</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-[10px] font-mono text-cyan-400">
                        <Phone size={11} />{r.repr_telefono || '—'}
                      </div>
                      {r.repr_email && (
                        <p className="text-[9px] text-white/30 mt-0.5 font-mono truncate max-w-[160px]">{r.repr_email}</p>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="text-[9px] font-black uppercase px-2 py-1 rounded-lg"
                        style={{background:'rgba(251,191,36,0.07)',border:'1px solid rgba(251,191,36,0.2)',color:'#fbbf24'}}>
                        {r.repr_relacion || '—'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <button onClick={() => setSelected(r)}
                        className="p-2 rounded-lg bg-white/5 hover:bg-yellow-500/20 hover:text-yellow-300 text-gray-400 transition-all">
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected && createPortal(
        <div onClick={() => setSelected(null)}
          className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
          <div onClick={e => e.stopPropagation()}
            className="bg-[#0a0f14] border border-yellow-400/20 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between px-8 pt-7 pb-5 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center"
                  style={{background:'rgba(251,191,36,0.1)',border:'1px solid rgba(251,191,36,0.2)'}}>
                  <Baby size={18} style={{color:'#fbbf24'}} />
                </div>
                <div>
                  <h4 className="text-white font-black text-lg uppercase italic">Ficha de Menor</h4>
                  <p className="text-yellow-400/60 text-[9px] uppercase tracking-widest">Representante registrado</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 bg-white/5 rounded-full hover:bg-white/10"><X size={18}/></button>
            </div>

            <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-4">
                <p className="text-[9px] font-black uppercase tracking-widest mb-3" style={{color:'rgba(0,212,200,0.6)'}}>👤 Atleta</p>
                <div className="bg-white/[0.03] p-4 rounded-xl border border-white/5">
                  <p className="text-gray-400 text-[9px] uppercase mb-1">Nombre completo</p>
                  <p className="text-white font-black uppercase">{selected.nombre} {selected.apellido}</p>
                </div>
                <div className="bg-white/[0.03] p-4 rounded-xl border border-white/5">
                  <p className="text-gray-400 text-[9px] uppercase mb-1">Cédula</p>
                  <p className="text-cyan-400 font-mono">V-{selected.cedula}</p>
                </div>
                <div className="bg-white/[0.03] p-4 rounded-xl border border-white/5">
                  <p className="text-gray-400 text-[9px] uppercase mb-1">Dorsal</p>
                  <p className="text-white font-black text-2xl italic">{selected.bib_number ? `#${selected.bib_number}` : 'Sin asignar'}</p>
                </div>
                <div className="bg-white/[0.03] p-4 rounded-xl border border-white/5">
                  <p className="text-gray-400 text-[9px] uppercase mb-1">Categoría</p>
                  <p className="text-cyan-400 font-black uppercase tracking-wide">{selected.categoria || '—'}</p>
                </div>
                {/* [V4-6] Modalidad sin inferencia */}
                <div className="bg-white/[0.03] p-4 rounded-xl border border-white/5">
                  <p className="text-gray-400 text-[9px] uppercase mb-1">Modalidad</p>
                  {selected.modalidad ? (
                    <span className="font-black uppercase text-sm px-3 py-1 rounded-full"
                      style={selected.modalidad === '10K'
                        ? {background:'rgba(0,212,200,0.08)',border:'1px solid rgba(0,212,200,0.2)',color:'#00d4c8'}
                        : {background:'rgba(251,191,36,0.08)',border:'1px solid rgba(251,191,36,0.2)',color:'#fbbf24'}}>
                      {selected.modalidad === '10K' ? '🏃 10K Carrera' : '🚶 4K Caminata'}
                    </span>
                  ) : (
                    <span className="font-black uppercase text-sm px-3 py-1 rounded-full"
                      style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.25)'}}>
                      — Sin modalidad
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[9px] font-black uppercase tracking-widest mb-3" style={{color:'rgba(251,191,36,0.6)'}}>👨‍👧 Representante</p>
                <div className="p-4 rounded-xl border" style={{background:'rgba(251,191,36,0.04)',borderColor:'rgba(251,191,36,0.15)'}}>
                  <p className="text-gray-400 text-[9px] uppercase mb-1">Nombre completo</p>
                  <p className="text-white font-black uppercase">{selected.repr_nombre} {selected.repr_apellido}</p>
                </div>
                <div className="p-4 rounded-xl border" style={{background:'rgba(251,191,36,0.04)',borderColor:'rgba(251,191,36,0.15)'}}>
                  <p className="text-gray-400 text-[9px] uppercase mb-1">Cédula</p>
                  <p className="text-yellow-400 font-mono">V-{selected.repr_cedula}</p>
                </div>
                <div className="p-4 rounded-xl border" style={{background:'rgba(251,191,36,0.04)',borderColor:'rgba(251,191,36,0.15)'}}>
                  <p className="text-gray-400 text-[9px] uppercase mb-1">Teléfono</p>
                  <p className="text-white font-mono">{selected.repr_telefono || '—'}</p>
                </div>
                {selected.repr_email && (
                  <div className="p-4 rounded-xl border" style={{background:'rgba(251,191,36,0.04)',borderColor:'rgba(251,191,36,0.15)'}}>
                    <p className="text-gray-400 text-[9px] uppercase mb-1">Email</p>
                    <p className="text-white font-mono text-xs break-all">{selected.repr_email}</p>
                  </div>
                )}
                <div className="p-4 rounded-xl border" style={{background:'rgba(251,191,36,0.04)',borderColor:'rgba(251,191,36,0.15)'}}>
                  <p className="text-gray-400 text-[9px] uppercase mb-1">Relación con el atleta</p>
                  <p className="text-yellow-400 font-black uppercase">{selected.repr_relacion || '—'}</p>
                </div>
              </div>
            </div>

            <div className="px-8 pb-7">
              <button onClick={() => setSelected(null)}
                className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-black uppercase text-xs tracking-widest transition-all">
                Cerrar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

/* ────────────────────────────────────────────────────────────── */
/* [V4-4] ESCUADRONES — scoped por carrera                        */
/*                                                                */
/* Recibe `scope: RaceScope` y filtra los teams por race_id       */
/* (o race_id IS NULL para carreras legacy de Barquisimeto).      */
/* Evita que los escuadrones de Coro y Barquisimeto se mezclen.   */
/* ────────────────────────────────────────────────────────────── */

const EscuadronesList = ({ scope }: { scope: RaceScope }) => {
  const [equipos,setEquipos]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    (async()=>{ setLoading(true);
      try {
        // [V4-4] Filtrar teams por race_id del scope
        let tq = supabase.from('teams').select('*');
        if (scope.legacy) {
          tq = tq.is('race_id', null);
        } else if (scope.raceId) {
          tq = tq.eq('race_id', scope.raceId);
        }
        const{data:td,error:te}=await tq; if(te)throw te;
        if(!td?.length){setEquipos([]);return;}
        const ids=[...new Set(td.flatMap(t=>[t.runner_m1_id,t.runner_m2_id,t.runner_f1_id,t.runner_f2_id]).filter(Boolean))];
        const{data:rd,error:re}=await supabase.from('runners').select('id,nombre,apellido,bib_number,telefono,talla_camiseta,categoria').in('id',ids); if(re)throw re;
        const bibs=(rd||[]).map(r=>r.bib_number).filter(Boolean);
        const{data:resd}=bibs.length>0?await supabase.from('race_results').select('bib_number,tiempo_chip').in('bib_number',bibs):{data:[] as any[]};
        const resMap=new Map((resd||[]).map(r=>[r.bib_number,r]));
        const runMap=new Map(rd?.map(r=>[r.id,r]));
        const proc=td.map(team=>{
          const mids=[team.runner_m1_id,team.runner_m2_id,team.runner_f1_id,team.runner_f2_id];
          let tot=0;let allF=true;
          const dm=mids.map(id=>{ const m=runMap.get(id); if(!m)return null; const s=parseTimeToSeconds(resMap.get((m as any).bib_number)?.tiempo_chip); if(s>0)tot+=s; else allF=false; return{nombre:`${m.nombre} ${m.apellido}`,bib:m.bib_number,telefono:m.telefono,talla_camiseta:m.talla_camiseta,categoria:m.categoria,tiempoStr:s>0?formatSeconds(s):'EN PISTA',secs:s}; }).filter(Boolean);
          return{...team,members:dm,totalTimeStr:allF&&tot>0?formatSeconds(tot):'OPERATIVO',totalSeconds:allF?tot:0};
        });
        proc.sort((a,b)=>{ if(a.totalSeconds===0)return 1; if(b.totalSeconds===0)return -1; return a.totalSeconds-b.totalSeconds; });
        setEquipos(proc);
      }catch(err){console.error(err);} finally{setLoading(false);}
    })();
  },[scope.raceId,scope.legacy]); // [V4-4] re-ejecuta al cambiar scope

  if(loading) return <div className="py-20 text-center bg-white/[0.02] rounded-2xl border border-white/5 animate-pulse"><Users className="h-10 w-10 text-cyan-500 mx-auto mb-4"/><p className="text-[10px] font-black tracking-[0.4em] text-cyan-500 uppercase">Enlazando Escuadrones...</p></div>;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in">
      {equipos.length===0?(
        <div className="col-span-full py-20 text-center bg-white/[0.02] rounded-2xl border border-white/5">
          <p className="text-[10px] font-black tracking-[0.4em] text-gray-500 uppercase">No hay escuadrones activos en {scope.name}</p>
        </div>
      ):equipos.map((eq,i)=>(
        <div key={eq.id} className="bg-black/40 border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden hover:border-cyan-500/30 transition-all">
          <div className="absolute top-0 right-0 bg-cyan-500 text-black font-black text-xs px-4 py-1 rounded-bl-xl">RANGO #{i+1}</div>
          <div className="flex items-center gap-3 mb-6"><div className="bg-cyan-500/10 p-3 rounded-xl border border-cyan-500/20"><Users size={20} className="text-cyan-400"/></div>
            <div><h3 className="text-xl font-black text-white italic uppercase">{eq.team_name}</h3><p className="text-[9px] text-gray-400 uppercase">Fuerza: {eq.members.length}/4</p></div></div>
          <div className="space-y-3 mb-6">{eq.members.map((m:any,j:number)=>(
            <div key={j} className="flex justify-between items-center bg-white/[0.03] p-3 rounded-xl border border-white/5">
              <div><span className="text-xs font-bold text-white uppercase block">{m.nombre}</span><span className="text-[9px] text-gray-500 font-mono">#{m.bib||'---'} — {m.categoria||'SIN CAT'} — {m.talla_camiseta||'N/A'}</span></div>
              <span className={`text-xs font-mono font-bold px-3 py-1 rounded-lg ${m.secs>0?'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20':'bg-white/5 text-gray-400'}`}>{m.tiempoStr}</span>
            </div>
          ))}</div>
          <div className="border-t border-white/10 pt-4 flex justify-between items-end">
            <span className="text-[10px] text-gray-500 font-black uppercase">Tiempo Combinado</span>
            <span className={`text-3xl font-black italic ${eq.totalSeconds>0?'text-white':'text-gray-600'}`}>{eq.totalTimeStr}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

/* ────────────────────────────────────────────────────────────── */
/* PRE-RACE OVERLAY — sin modificaciones                          */
/* ────────────────────────────────────────────────────────────── */

const PreRaceOverlay: React.FC<{onClose:()=>void}> = ({ onClose }) => {
  const [seconds,setSeconds]=useState(60);
  const [fired,setFired]=useState(false);
  const intRef=useRef<ReturnType<typeof setInterval>|null>(null);
  useEffect(()=>{ intRef.current=setInterval(()=>{ setSeconds(p=>{ if(p<=1){clearInterval(intRef.current!);setFired(true);return 0;} return p-1; }); },1000); return()=>{if(intRef.current)clearInterval(intRef.current);}; },[]);
  const pct=seconds/60;
  const r=pct>0.5?Math.round((1-pct)*2*255):255; const g=pct>0.5?255:Math.round(pct*2*255);
  const color=`rgb(${r},${g},0)`; const glow=`rgba(${r},${g},0,0.35)`;
  const radius=140; const circ=2*Math.PI*radius; const dash=circ*(1-seconds/60);
  return createPortal(
    <div className="fixed inset-0 z-[9999999] flex flex-col items-center justify-center" style={{background:fired?'rgba(0,255,80,0.08)':'rgba(0,0,0,0.96)',backdropFilter:'blur(8px)',transition:'background 0.4s'}}>
      <div className="absolute inset-0 pointer-events-none" style={{background:`radial-gradient(ellipse at center, ${glow} 0%, transparent 65%)`,animation:seconds<=10&&!fired?'prerace-pulse 0.5s ease infinite':undefined}}/>
      <style>{`@keyframes prerace-pulse{0%,100%{opacity:0.6}50%{opacity:1}}@keyframes fired-bounce{0%{transform:scale(0.7);opacity:0}60%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}`}</style>
      {!fired?(
        <><p className="text-white/40 text-xs font-black uppercase tracking-[0.5em] mb-12">PRE-CARRERA · ALERTA ATLETAS</p>
          <div className="relative flex items-center justify-center mb-12">
            <svg width="320" height="320" style={{transform:'rotate(-90deg)'}}>
              <circle cx="160" cy="160" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8"/>
              <circle cx="160" cy="160" r={radius} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={dash} style={{transition:'stroke-dashoffset 0.9s linear,stroke 0.5s ease',filter:`drop-shadow(0 0 12px ${color})`}}/>
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="font-black tabular-nums leading-none" style={{fontSize:'9rem',color,textShadow:`0 0 40px ${color}`,fontFamily:'Barlow Condensed,sans-serif',fontStyle:'italic',transition:'color 0.5s'}}>{seconds}</span>
              <span className="text-white/30 text-xs font-black uppercase tracking-[0.4em] mt-1">SEGUNDOS</span>
            </div>
          </div>
          <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.3em]">RAYOCERO RUNNING · VALKYRON GROUP</p>
          <button onClick={onClose} className="absolute top-8 right-8 text-white/20 hover:text-white/60 text-xs font-black uppercase flex items-center gap-2"><X size={14}/> Cerrar</button>
        </>
      ):(
        <div className="flex flex-col items-center gap-6" style={{animation:'fired-bounce 0.6s cubic-bezier(0.16,1,0.3,1) forwards'}}>
          <div style={{fontSize:'8rem',lineHeight:1}}>🏁</div>
          <p className="text-white font-black text-4xl uppercase italic" style={{fontFamily:'Barlow Condensed,sans-serif'}}>¡CARRERA INICIADA!</p>
          <p className="text-white/40 text-xs uppercase tracking-[0.4em]">Pistola disparada · Corredores en pista</p>
          <button onClick={onClose} className="mt-8 px-8 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-black uppercase text-xs">Cerrar</button>
        </div>
      )}
    </div>,document.body
  );
};

/* ────────────────────────────────────────────────────────────── */
/* TELEMETRY MODULE — [V4-5] race_signals con race_id             */
/* ────────────────────────────────────────────────────────────── */

type RaceState='idle'|'running'|'paused'|'finished';

const TelemetryModule = ({ scope }:{ scope:RaceScope }) => {
  const [raceState,setRaceState]=useState<RaceState>('idle');
  const [elapsedMs,setElapsedMs]=useState(0);
  const [startTs,setStartTs]=useState<number|null>(null);
  const [pausedMs,setPausedMs]=useState(0);
  const [officialStart,setOfficialStart]=useState<string|null>(null);
  const rafRef=useRef<number|null>(null);
  const [gunFlash,setGunFlash]=useState(false);
  const [savingStart,setSavingStart]=useState(false);
  const [saveMsg,setSaveMsg]=useState<{text:string;ok:boolean}|null>(null);
  const [confirmReset,setConfirmReset]=useState(false);

  useEffect(()=>{ if(raceState==='running'){ const tick=()=>{ setElapsedMs(Date.now()-startTs!+pausedMs); rafRef.current=requestAnimationFrame(tick); }; rafRef.current=requestAnimationFrame(tick); } return()=>{ if(rafRef.current)cancelAnimationFrame(rafRef.current); }; },[raceState,startTs,pausedMs]);

  const fmt=(ms:number)=>{ const cs=Math.floor(ms/10)%100; const ts=Math.floor(ms/1000); const s=ts%60; const m=Math.floor(ts/60)%60; const h=Math.floor(ts/3600); if(h>0)return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(cs).padStart(2,'0')}`; };

  const handleFire=async()=>{ const now=Date.now(); const iso=new Date(now).toISOString(); setGunFlash(true); setTimeout(()=>setGunFlash(false),600); setStartTs(now);setPausedMs(0);setElapsedMs(0);setRaceState('running');setOfficialStart(iso);setSavingStart(true);setSaveMsg(null);
    try {
      let q=supabase.from('runners').update({start_time:iso,race_status:'in_progress'}).is('start_time',null); q=applyScopeFilter(q,scope); const{error}=await q; if(error)throw error;
      // [V4-5] race_signals ahora lleva race_id para aislar señales por carrera
      await supabase.from('race_signals').insert({
        type: 'race_start',
        message: iso,
        created_by: 'admin',
        race_id: scope.raceId,   // [V4-5] aislamiento
      });
      setSaveMsg({text:`✅ Pistola disparada · ${scope.name}`,ok:true});
    }catch(err:any){setSaveMsg({text:`⚠️ ${err.message}`,ok:false});} finally{setSavingStart(false);setTimeout(()=>setSaveMsg(null),5000);}
  };
  const handlePR=()=>{ if(raceState==='running'){setPausedMs(elapsedMs);setRaceState('paused');} else if(raceState==='paused'){setStartTs(Date.now());setRaceState('running');} };
  const handleReset=()=>{ setRaceState('idle');setElapsedMs(0);setStartTs(null);setPausedMs(0);setOfficialStart(null);setSaveMsg(null);setConfirmReset(false); };
  const handleFinish=()=>{ if(rafRef.current)cancelAnimationFrame(rafRef.current); setRaceState('finished'); };

  const SC:Record<RaceState,string>={idle:'rgba(100,100,120,1)',running:'#00f2ff',paused:'#fbbf24',finished:'#22c55e'};
  const SG:Record<RaceState,string>={idle:'transparent',running:'rgba(0,242,255,0.15)',paused:'rgba(251,191,36,0.15)',finished:'rgba(34,197,94,0.15)'};
  const SL:Record<RaceState,string>={idle:'EN ESPERA',running:'EN CURSO',paused:'PAUSADO',finished:'FINALIZADO'};
  const color=SC[raceState]; const glow=SG[raceState];

  return (
    <>
      {gunFlash&&createPortal(<div className="fixed inset-0 z-[9999998] pointer-events-none" style={{background:'rgba(255,255,255,0.18)',animation:'gun-flash-anim 0.55s ease-out forwards'}}/>,document.body)}
      <style>{`@keyframes gun-flash-anim{0%{opacity:1}100%{opacity:0}}@keyframes chrono-blink{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
      <div className="space-y-6 animate-in fade-in max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div><h2 className="text-2xl font-black italic uppercase text-white tracking-widest" style={{fontFamily:'Barlow Condensed,sans-serif'}}>Control de Carrera</h2><p className="text-[9px] text-gray-500 uppercase mt-1">{scope.name}</p></div>
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{background:color,boxShadow:`0 0 8px ${color}`,animation:raceState==='running'?'chrono-blink 1s ease infinite':undefined}}/><span className="text-xs font-black uppercase" style={{color}}>{SL[raceState]}</span></div>
        </div>
        <div className="relative rounded-3xl overflow-hidden border" style={{borderColor:`${color}30`,background:'linear-gradient(135deg,rgba(0,0,0,0.6),rgba(0,0,0,0.4))',boxShadow:`inset 0 0 80px ${glow}`}}>
          {raceState==='running'&&<div className="absolute inset-0 pointer-events-none" style={{background:`radial-gradient(ellipse at 50% 0%,${glow} 0%,transparent 60%)`}}/>}
          <div className="relative z-10 p-10 flex flex-col items-center">
            <p className="text-[9px] text-gray-500 uppercase tracking-[0.4em] mb-4 font-black">CRONÓMETRO OFICIAL</p>
            <div className="font-black tabular-nums leading-none mb-2" style={{fontSize:'clamp(5rem,14vw,9rem)',color,textShadow:raceState==='running'?`0 0 30px ${color},0 0 60px ${glow}`:'none',fontFamily:'Barlow Condensed,sans-serif',fontStyle:'italic',animation:raceState==='paused'?'chrono-blink 0.8s ease infinite':undefined,transition:'color 0.4s'}}>{fmt(elapsedMs)}</div>
            {officialStart&&<p className="text-[9px] font-mono uppercase mb-8" style={{color:`${color}80`}}>PISTOLA: {new Date(officialStart).toLocaleTimeString('es-VE',{hour12:false})}</p>}
            {saveMsg&&<div className={`mb-6 px-5 py-3 rounded-xl text-xs font-black uppercase border ${saveMsg.ok?'bg-green-500/10 border-green-500/30 text-green-400':'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'}`}>{savingStart&&<RefreshCw size={12} className="inline animate-spin mr-2"/>}{saveMsg.text}</div>}
            <div className="flex flex-wrap gap-3 justify-center">
              {raceState==='idle'&&<button onClick={handleFire} disabled={savingStart} className="px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-black flex items-center gap-3 text-sm disabled:opacity-50" style={{background:'linear-gradient(135deg,#22c55e,#16a34a)',boxShadow:'0 0 32px rgba(34,197,94,0.4)'}}>{savingStart?<RefreshCw size={20} className="animate-spin"/>:<Zap size={20}/>} DISPARAR PISTOLA</button>}
              {(raceState==='running'||raceState==='paused')&&<button onClick={handlePR} className="px-8 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center gap-3 text-sm border" style={{background:raceState==='running'?'rgba(251,191,36,0.1)':'rgba(0,242,255,0.1)',borderColor:raceState==='running'?'rgba(251,191,36,0.3)':'rgba(0,242,255,0.3)',color:raceState==='running'?'#fbbf24':'#00f2ff'}}>{raceState==='running'?'⏸ PAUSAR':'▶ REANUDAR'}</button>}
              {(raceState==='running'||raceState==='paused')&&<button onClick={handleFinish} className="px-8 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center gap-3 text-sm border border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20">🏁 FINALIZAR</button>}
              {raceState!=='idle'&&<button onClick={()=>setConfirmReset(true)} className="px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-2 border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/15"><RefreshCw size={14}/> RESET</button>}
            </div>
          </div>
        </div>
        <div className="bg-black/40 border border-white/[0.08] rounded-2xl p-6">
          <div className="flex items-start gap-4 mb-5"><div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0" style={{background:'rgba(239,68,68,0.15)',border:'1px solid rgba(239,68,68,0.3)',color:'#ef4444'}}>1</div>
            <div><p className="text-white font-black uppercase tracking-widest text-sm">Alerta Pre-Carrera</p><p className="text-gray-500 text-[10px] uppercase mt-0.5">Countdown 60s en pantalla de atletas</p></div></div>
          <PreRaceButton seconds={60}/>
        </div>
        {confirmReset&&createPortal(
          <div className="fixed inset-0 z-[9999999] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
            <div className="bg-[#0a0a0a] border border-red-500/30 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95">
              <div className="bg-red-500/15 p-3 rounded-2xl w-fit mb-5"><AlertTriangle className="text-red-500" size={24}/></div>
              <h3 className="text-xl font-black text-white uppercase italic mb-2">Resetear Cronómetro</h3>
              <p className="text-gray-400 text-sm mb-8">Vuelve a cero. <span className="text-red-400">No borra Supabase.</span></p>
              <div className="flex gap-3">
                <button onClick={()=>setConfirmReset(false)} className="flex-1 py-4 rounded-xl bg-white/5 font-bold hover:bg-white/10 text-sm">Cancelar</button>
                <button onClick={handleReset} className="flex-1 py-4 rounded-xl bg-red-600 hover:bg-red-500 font-black uppercase text-xs flex items-center justify-center gap-2"><RefreshCw size={14}/> Confirmar</button>
              </div>
            </div>
          </div>,document.body
        )}
      </div>
    </>
  );
};

/* ────────────────────────────────────────────────────────────── */
/* MAIN DASHBOARD — [V4-4] EscuadronesList recibe scope           */
/* ────────────────────────────────────────────────────────────── */

export default function AdminDashboard() {
  const [activeTab,setActiveTab]=useState<'overview'|'race_config'|'results'|'teams'|'kit_delivery'|'kit_chequeo'|'telemetry'|'inscripcion'|'menores'>('overview');
  const [totalAtletas,setTotalAtletas]=useState(0);
  const [raceScope,setRaceScope]=useState<RaceScope|null>(null);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-cyan-500/30">
      <nav className="border-b border-white/5 bg-black/50 backdrop-blur-xl sticky top-0 z-[100]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20"><ShieldCheck className="text-black" size={24}/></div>
            <div><h1 className="text-lg font-black italic uppercase leading-none">RayoCero HQ</h1><p className="text-[8px] text-gray-500 uppercase tracking-widest mt-1">Valkyron Group{raceScope?` · ${raceScope.name}`:''}</p></div>
          </div>
          <button className="flex items-center gap-2 text-[10px] uppercase text-gray-400 hover:text-white"><LogOut size={16}/> Salir</button>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-6 py-12">
        <RaceScopeBar scope={raceScope} onChange={setRaceScope}/>
        <div className="flex flex-wrap gap-4 mb-12 border-b border-white/5 pb-6">
          {[
            {id:'overview',    label:'Dashboard',    icon:null},
            {id:'kit_delivery',label:'RFID',         icon:<Package size={14}/>},
            {id:'kit_chequeo', label:'Entrega Kits', icon:<Gift size={14}/>,accent:'amber'},
            {id:'telemetry',   label:'Telemetría',   icon:<Radio size={14}/>,accent:'yellow'},
            {id:'inscripcion', label:'Inscribir',    icon:<UserPlus size={14}/>},
            {id:'menores',     label:'Menores',      icon:<Baby size={14}/>, accent:'yellow'},
            {id:'teams',       label:'Escuadrones',  icon:null},
            {id:'race_config', label:'Carrera',      icon:null},
            {id:'results',     label:'Resultados',   icon:null},
          ].map(tab=>(
            <button key={tab.id} onClick={()=>setActiveTab(tab.id as typeof activeTab)}
              className={`px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all flex items-center gap-2 ${activeTab===tab.id?(tab as any).accent==='amber'?'bg-amber-400 text-black shadow-lg shadow-amber-400/20':(tab as any).accent==='yellow'?'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20':'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20':'bg-white/5 hover:bg-white/10 text-gray-400'}`}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>
        {!raceScope?(
          <div className="py-20 text-center bg-white/[0.02] rounded-2xl border border-white/5 animate-pulse">
            <p className="text-[10px] font-black tracking-[0.4em] text-cyan-500 uppercase">Sincronizando carrera activa...</p>
          </div>
        ):(
          <>
            {activeTab==='overview'&&(
              <>
                <TasaConfig scope={raceScope}/>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2"><AtletasList scope={raceScope} onUpdateCount={setTotalAtletas}/></div>
                  <div>
                    <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-3xl p-8 text-black shadow-2xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><Activity size={80}/></div>
                      <h4 className="text-xs font-black uppercase">Participación · {raceScope.name}</h4>
                      <p className="text-7xl font-black italic">{totalAtletas.toString().padStart(3,'0')}</p>
                      <p className="text-[10px] font-bold uppercase mt-4 opacity-70">{raceScope.isActive?'Carrera Activa':'Archivo Histórico'}</p>
                    </div>
                  </div>
                </div>
              </>
            )}
            {activeTab==='kit_delivery'&&<ModuloEntregaKits scope={raceScope}/>}
            {activeTab==='kit_chequeo' &&<ModuloChequeoKits scope={raceScope}/>}
            {activeTab==='telemetry'   &&<TelemetryModule scope={raceScope}/>}
            {activeTab==='inscripcion' &&<ModuloInscripcionAdmin/>}
            {activeTab==='menores'     &&<ModuloRepresentantes scope={raceScope}/>}
            {/* [V4-4] EscuadronesList ahora recibe scope para filtrar por carrera */}
            {activeTab==='teams'       &&<EscuadronesList scope={raceScope}/>}
            {activeTab==='race_config' &&<div className="grid grid-cols-1 lg:grid-cols-2 gap-12"><RaceForm/><RouteConfig/></div>}
            {activeTab==='results'     &&<div className="animate-in fade-in"><ResultsTable/></div>}
          </>
        )}
      </main>
    </div>
  );
}
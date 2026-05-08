/**
 * RAYO CERO — REGISTRATION TERMINAL (STABLE BUILD V22_MONUMENTAL_RE-ALIGNED)
 * Senior Dev: MIA (Valkyron Group)
 * CEO: Lualdo Sciscioli
 * Grado: Militar / Operativo / Diseñador
 * REGLA DE ORO: Código completo sin omisiones. Base mantenida.
 * FUSIÓN: Telemetría Supabase + Canvas 2D API Nativo + Liquid Glassmorphism UI.
 *
 * CHANGELOG V22 (ULTRA-SURGICAL):
 * [V22-1] FIX COORDENADAS CANVAS: 
 * • Nombre: Y=670 (Centrado en franja blanca)
 * • Categoría: Y=730 (Debajo del nombre, dentro del blanco)
 * • Bib Number: Y=380 (Zona Turquesa)
 * [V22-2] FIX VISUAL WEB: top-[76%] -> top-[72%] para alinear preview con descarga.
 * [V22-3] UI: Liquid Glassmorphism total — bg-white/[0.01] + backdrop-blur-2xl.
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Shield, CheckCircle, ArrowRight, ArrowLeft, Zap, Trophy,
  Mail, CreditCard, Loader2, AlertCircle, Home, Banknote, UploadCloud,
  Printer, Accessibility, RefreshCw, TrendingUp, Download, Image as ImageIcon
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import imageCompression from "browser-image-compression";
import emailjs from '@emailjs/browser';

import { registerRunner, calcularEdad, calcularCategoria, type RegistrationFormData } from "@/lib/api";
import { supabase } from "@/lib/supabase";

import logoPrincipal from "../assets/logo.png";
import logoSecundario from "../assets/logo2.png";
import dorsalBgSrc from "../assets/dorsal-bg.png";

/* ────────────────────────────────────────────────────────────── */
/* INTERFACES */
/* ────────────────────────────────────────────────────────────── */

interface FormData {
  nombre: string;
  apellido: string;
  cedula: string;
  email: string;
  telefono: string;
  fechaNacimiento: string;
  genero: string;
  talla: string;
  movilidadReducida: boolean;
  referenciaPago: string;
  contactoEmergencia: string;
  telefonoEmergencia: string;
  aceptaDeslinde: boolean;
  timestampAceptacion?: string;
}

const initialForm: FormData = {
  nombre: "",
  apellido: "",
  cedula: "",
  email: "",
  telefono: "",
  fechaNacimiento: "",
  genero: "",
  talla: "",
  movilidadReducida: false,
  referenciaPago: "",
  contactoEmergencia: "",
  telefonoEmergencia: "",
  aceptaDeslinde: false,
};

/* ────────────────────────────────────────────────────────────── */
/* COMPONENTE: SKELETON LOADER PARA DORSAL */
/* ────────────────────────────────────────────────────────────── */

const DorsalSkeleton = () => (
  <div className="absolute inset-0 w-full h-full bg-white/[0.02] rounded-2xl overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent animate-[shimmer_1.5s_infinite]" />
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
      <div className="w-48 h-32 bg-white/[0.04] rounded-xl animate-pulse" />
      <div className="w-64 h-6 bg-white/[0.03] rounded-lg animate-pulse" />
      <div className="w-40 h-4 bg-white/[0.02] rounded-lg animate-pulse" />
    </div>
  </div>
);

/* ────────────────────────────────────────────────────────────── */
/* COMPONENTE PRINCIPAL: REGISTRATION FORM */
/* ────────────────────────────────────────────────────────────── */

const RegistrationForm = () => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(initialForm);
  const [showDeslinde, setShowDeslinde] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [bibNumber, setBibNumber] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [dorsalLoaded, setDorsalLoaded] = useState(false);

  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  /* ── ESTADOS FINANCIEROS DINÁMICOS (TELEMETRÍA VALKYRON) ── */
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [registrationFee, setRegistrationFee] = useState<number>(40);
  const [isFetchingFinance, setIsFetchingFinance] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  const navigate = useNavigate();

  const age = form.fechaNacimiento ? calcularEdad(form.fechaNacimiento) : null;
  const category = age !== null && form.genero
    ? calcularCategoria(age, form.genero as "M" | "F", form.movilidadReducida)
    : null;

  /* ── RADAR DE FINANZAS (UPLINK HQ) ── */
  useEffect(() => {
    if (step === 2 && exchangeRate === null) {
      const fetchInternalFinance = async () => {
        try {
          setIsFetchingFinance(true);
          const { data, error } = await supabase
            .from("system_config")
            .select("tasa_bcv, costo_usd, ultima_actualizacion")
            .eq("id", 1)
            .single();

          if (error) throw error;

          if (data) {
            setExchangeRate(data.tasa_bcv);
            if (data.costo_usd) setRegistrationFee(data.costo_usd);

            const fechaSync = new Date(data.ultima_actualizacion);
            const horaFormateada = fechaSync.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
            setLastUpdate(horaFormateada);
          }
        } catch (err) {
          console.error("[MIA TACTICAL ALERT] Error de enlace financiero:", err);
          setExchangeRate(null);
        } finally {
          setIsFetchingFinance(false);
        }
      };
      fetchInternalFinance();
    }
  }, [step, exchangeRate]);

  /* ── MOTOR MATEMÁTICO DE PRECISIÓN ── */
  const calcularMontoExacto = (tasa: number, usd: number) => {
    const factor = 1000000;
    const resultado = (Math.round(tasa * factor) * usd) / factor;
    return resultado;
  };

  const totalBolivares = exchangeRate
    ? calcularMontoExacto(exchangeRate, registrationFee)
    : 0;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "application/pdf") {
      setComprobanteFile(file);
      return;
    }

    setIsCompressing(true);
    try {
      const options = {
        maxSizeMB: 0.1,
        maxWidthOrHeight: 1280,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(file, options);
      setComprobanteFile(compressedFile);
    } catch (error) {
      console.error("M.I.A Error de compresión:", error);
      setComprobanteFile(file);
    } finally {
      setIsCompressing(false);
    }
  };

  const { mutate: submitToSupabase, isPending: isSubmitting } = useMutation({
    mutationFn: async (data: RegistrationFormData) => {
      if (comprobanteFile) {
        const fileExt = comprobanteFile.name.split(".").pop();
        const fileName = `${data.cedula}_${Date.now()}.${fileExt}`;

        await supabase.storage
          .from("comprobantes-pago")
          .upload(fileName, comprobanteFile, {
            cacheControl: "3600",
            upsert: false,
          });
      }
      return registerRunner(data);
    },
    onSuccess: (data) => {
      setBibNumber(data.bib_number);
      setSubmitted(true);
      setSubmitError(null);

      const formattedBib = data.bib_number.toString().padStart(4, "0");

      const templateParams = {
        to_email: form.email,
        to_name: `${form.nombre} ${form.apellido}`,
        bib_number: formattedBib,
        categoria: category || "General",
      };

      emailjs.send(
        "service_7knzrtk",
        "template_7x0cg5m",
        templateParams,
        "yUhQUXtq2yj-nVnr7"
      );
    },
    onError: (error: Error) => {
      setSubmitError(error.message);
    },
  });

  /* ── PROTOCOLO DE DESCARGA VISUAL (V22 - CALIBRACIÓN FINAL) ─────────────── */
  const handleDownloadPNG = async () => {
    setIsExporting(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 900;
      const ctx = canvas.getContext("2d");

      if (!ctx) throw new Error("No se pudo iniciar el contexto 2D");

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = dorsalBgSrc;

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Error al cargar background"));
      });

      // 1. Fondo
      ctx.drawImage(img, 0, 0, 1200, 900);

      await document.fonts.ready;
      const formattedBib = bibNumber?.toString().padStart(4, "0") || "0000";

      // 2. Bib Number (Zona Turquesa)
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 20;

      ctx.font = "italic 900 280px sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(formattedBib, 600, 380); // Y=380 para zona turquesa

      // Reset sombras
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // 3. Nombre Completo (AJUSTE Y=670 — CENTRO FRANJA BLANCA)
      const nombreCompleto = `${form.nombre} ${form.apellido}`.toUpperCase();
      ctx.font = "900 56px sans-serif";
      ctx.fillStyle = "#03070b";
      (ctx as any).letterSpacing = "4px";
      ctx.fillText(nombreCompleto, 600, 670); // <<-- SUBIDO PARA CENTRAR

      // 4. Categoría (AJUSTE Y=730 — BAJO EL NOMBRE, DENTRO DE FRANJA BLANCA)
      if (category) {
        ctx.font = "900 22px sans-serif";
        ctx.fillStyle = "#1a1a1a";
        (ctx as any).letterSpacing = "6px";
        ctx.fillText(`CATEGORÍA: ${category.toUpperCase()}`, 600, 730); // <<-- SUBIDO PARA EVITAR LOGOS
      }

      const dataUrl = canvas.toDataURL("image/png", 1.0);
      const link = document.createElement("a");
      link.download = `DORSAL_RAYOCERO_${form.cedula}.png`;
      link.href = dataUrl;
      link.click();

    } catch (err) {
      console.error("MIA CANVAS FATAL ERROR:", err);
      alert("Error en el motor de dibujo.");
    } finally {
      setIsExporting(false);
    }
  };

  const update = (field: keyof FormData, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  const canNext = () => {
    if (step === 0) return form.nombre && form.apellido && form.cedula && form.email && form.telefono;
    if (step === 1) return form.fechaNacimiento && form.genero && form.talla;
    if (step === 2) return form.referenciaPago.length >= 4;
    if (step === 3) return form.contactoEmergencia && form.telefonoEmergencia && form.aceptaDeslinde;
    return false;
  };

  const handleSubmit = () => {
    setSubmitError(null);
    const normalizedCedula = form.cedula.replace(/\D/g, "");

    const registrationData: RegistrationFormData = {
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      cedula: normalizedCedula,
      email: form.email.toLowerCase().trim(),
      telefono: form.telefono,
      fechaNacimiento: form.fechaNacimiento,
      genero: form.genero as "M" | "F",
      talla: form.talla as any,
      movilidadReducida: form.movilidadReducida,
      referenciaPago: form.referenciaPago.trim(),
      contactoEmergencia: form.contactoEmergencia,
      telefonoEmergencia: form.telefonoEmergencia,
      aceptaDeslinde: true,
    };

    submitToSupabase(registrationData);
  };

  const inputClass =
    "w-full rounded-2xl bg-white/[0.03] border border-white/[0.08] px-5 py-4 text-xs font-bold text-white placeholder:text-white/25 focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/30 focus:bg-white/[0.05] transition-all backdrop-blur-2xl uppercase tracking-wider shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]";

  const steps = [
    {
      title: "Identificación de Atleta",
      icon: <User className="h-5 w-5 text-cyan-400" />,
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <input className={inputClass} placeholder="Nombre" value={form.nombre} onChange={(e) => update("nombre", e.target.value)} autoComplete="given-name" />
          <input className={inputClass} placeholder="Apellido" value={form.apellido} onChange={(e) => update("apellido", e.target.value)} autoComplete="family-name" />
          <div className="relative">
            <CreditCard className="absolute right-4 top-4 h-4 w-4 text-white/20 pointer-events-none" />
            <input className={inputClass} placeholder="Cédula / ID" value={form.cedula} onChange={(e) => update("cedula", e.target.value)} inputMode="numeric" />
          </div>
          <div className="relative">
            <Mail className="absolute right-4 top-4 h-4 w-4 text-white/20 pointer-events-none" />
            <input className={inputClass} placeholder="Email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} inputMode="email" />
          </div>
          <input className={`${inputClass} sm:col-span-2`} placeholder="Teléfono" value={form.telefono} onChange={(e) => update("telefono", e.target.value)} inputMode="tel" />
        </div>
      ),
    },
    {
      title: "Categoría & Logística",
      icon: <Trophy className="h-5 w-5 text-cyan-400" />,
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div><label className="text-[9px] font-black uppercase text-cyan-400/80 mb-3 block ml-1">Nacimiento</label><input className={inputClass} type="date" value={form.fechaNacimiento} onChange={(e) => update("fechaNacimiento", e.target.value)} /></div>
            <div><label className="text-[9px] font-black uppercase text-cyan-400/80 mb-3 block ml-1">Género</label><select className={inputClass} value={form.genero} onChange={(e) => update("genero", e.target.value)}><option value="" className="bg-[#03070b]">Seleccionar</option><option value="M" className="bg-[#03070b]">Masculino</option><option value="F" className="bg-[#03070b]">Femenino</option></select></div>
            <div className="sm:col-span-2"><label className="text-[9px] font-black uppercase text-cyan-400/80 mb-3 block ml-1">Talla Camiseta</label><select className={inputClass} value={form.talla} onChange={(e) => update("talla", e.target.value)}><option value="" className="bg-[#03070b]">Seleccionar talla</option><option value="XS" className="bg-[#03070b]">XS</option><option value="S" className="bg-[#03070b]">S</option><option value="M" className="bg-[#03070b]">M</option><option value="L" className="bg-[#03070b]">L</option><option value="XL" className="bg-[#03070b]">XL</option><option value="XXL" className="bg-[#03070b]">XXL</option></select></div>
            <div className="sm:col-span-2 mt-2 bg-white/[0.02] border border-white/[0.06] p-5 rounded-2xl flex items-center justify-between backdrop-blur-2xl transition-all">
              <div className="flex items-center gap-4"><Accessibility className="h-5 w-5 text-cyan-400" /><div className="flex flex-col"><span className="text-[10px] font-black uppercase text-white">Movilidad Reducida</span><span className="text-[8px] text-white/30 uppercase">Logística especial</span></div></div>
              <input type="checkbox" checked={form.movilidadReducida} onChange={(e) => update("movilidadReducida", e.target.checked)} className="h-5 w-5 rounded border-white/20 bg-white/5 text-cyan-500 cursor-pointer" />
            </div>
          </div>
          {category && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-cyan-500/[0.04] border border-cyan-500/15 p-6 rounded-2xl text-center backdrop-blur-2xl"><p className="text-[9px] font-black uppercase text-cyan-400/50 mb-2">Categoría</p><p className="text-2xl font-black text-cyan-400 uppercase tracking-tighter">{category}</p></motion.div>}
        </div>
      ),
    },
    {
      title: "Pago Operativo",
      icon: <Banknote className="h-5 w-5 text-cyan-400" />,
      content: (
        <div className="space-y-6">
          <div className="bg-cyan-500/[0.03] border border-cyan-500/15 rounded-2xl p-6 md:p-8 backdrop-blur-2xl relative overflow-hidden shadow-inner">
            <div className="mb-8 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10 shadow-lg transition-all hover:border-cyan-500/20">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-cyan-500/[0.08] border border-cyan-500/15 flex items-center justify-center text-cyan-400 shrink-0">{isFetchingFinance ? <RefreshCw className="animate-spin h-5 w-5" /> : <Shield className="h-5 w-5" />}</div>
                <div className="flex flex-col text-left"><span className="text-[10px] font-black uppercase text-cyan-400">Tasa Oficial (RAYOCERO)</span><span className="text-[8px] text-white/50 uppercase mt-1">{exchangeRate ? `Sync: ${lastUpdate}` : "Conectando..."}</span></div>
              </div>
              <div className="flex flex-col items-end shrink-0"><div className="text-4xl font-black italic tracking-tighter text-white drop-shadow-[0_0_15px_rgba(242,255,255,0.4)]">${registrationFee}</div>{exchangeRate && <div className="text-sm font-black text-cyan-400 uppercase mt-2 bg-cyan-500/[0.08] px-3 py-1 rounded-md">Bs. {totalBolivares.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</div>}</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10 text-[10px] font-bold uppercase text-white/40 tracking-widest leading-relaxed">
              <div><span className="block text-cyan-400/50 mb-1">Titular</span><span className="text-white text-sm">Rayocero Eventos C.A</span></div>
              <div><span className="block text-cyan-400/50 mb-1">RIF</span><span className="text-white text-sm">J-505771710</span></div>
              <div><span className="block text-cyan-400/50 mb-1">Pago Móvil</span><span className="text-white text-sm">0414-5643372</span></div>
              <div><span className="block text-cyan-400/50 mb-1">BNC</span><span className="text-white text-sm">0191-0060-0921-6016-9493</span></div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-5">
            <input className={inputClass} placeholder="Nº de Referencia Bancaria" value={form.referenciaPago} onChange={(e) => update("referenciaPago", e.target.value)} inputMode="numeric" />
            <label className="w-full border-2 border-dashed border-white/[0.07] hover:border-cyan-500/30 bg-white/[0.01] rounded-2xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer group backdrop-blur-2xl">
              <input type="file" accept="image/*,application/pdf" onChange={handleFileChange} className="hidden" disabled={isCompressing || isSubmitting} />
              {isCompressing ? <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" /> : comprobanteFile ? (
                <div className="flex flex-col items-center gap-3"><CheckCircle className="h-8 w-8 text-green-400" /><span className="text-[10px] font-black text-green-400 uppercase tracking-widest">{comprobanteFile.name}</span></div>
              ) : (
                <><UploadCloud className="h-8 w-8 text-white/15 group-hover:text-cyan-400 transition-colors mb-3" /><span className="text-[10px] font-black text-white/30 uppercase text-center">Subir Comprobante</span></>
              )}
            </label>
          </div>
        </div>
      ),
    },
    {
      title: "Seguridad & Deslinde Legal",
      icon: <Shield className="h-5 w-5 text-cyan-400" />,
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5"><input className={inputClass} placeholder="Contacto Emergencia" value={form.contactoEmergencia} onChange={(e) => update("contactoEmergencia", e.target.value)} /><input className={inputClass} placeholder="Teléfono Emergencia" value={form.telefonoEmergencia} onChange={(e) => update("telefonoEmergencia", e.target.value)} inputMode="tel" /></div>
          <div className="bg-white/[0.02] border border-white/[0.06] p-6 rounded-2xl flex items-start gap-4 backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <input type="checkbox" checked={form.aceptaDeslinde} onChange={(e) => update("aceptaDeslinde", e.target.checked)} className="mt-1 h-5 w-5 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500/50 cursor-pointer flex-shrink-0" />
            <p className="text-xs text-white/50 leading-relaxed font-medium">Confirmo que acepto el <button onClick={(e) => { e.preventDefault(); setShowDeslinde(true); }} className="text-cyan-400 font-bold underline decoration-cyan-400/20">Deslinde de Responsabilidad</button> para este evento.</p>
          </div>
        </div>
      ),
    },
  ];

  /* ── VISTA DE ÉXITO ── */
  if (submitted && bibNumber) {
    const formattedBib = bibNumber.toString().padStart(4, "0");
    return (
      <section id="success-bib" className="relative min-h-screen pt-32 pb-24 px-4 sm:px-6 bg-[#03070b] flex items-center justify-center font-sans overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#00f2ff]/[0.06] blur-[140px] rounded-full z-0" />
        <motion.div initial={{ scale: 0.95, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="max-w-3xl mx-auto w-full relative z-10 flex flex-col items-center">
          
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/[0.08] border border-green-500/20 backdrop-blur-xl shadow-inner">
            <CheckCircle className="h-3.5 w-3.5 text-green-400" />
            <span className="text-[9px] font-black tracking-[0.4em] text-green-400 uppercase">Acreditación Confirmada</span>
          </motion.div>

          <div className="relative w-full max-w-[600px] aspect-[4/3] rounded-2xl shadow-[0_40px_80px_-15px_rgba(0,242,255,0.15)] border border-white/[0.08] overflow-hidden bg-black">
            {!dorsalLoaded && <DorsalSkeleton />}
            <img src={dorsalBgSrc} alt="Dorsal Preview" className={`absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-500 ${dorsalLoaded ? "opacity-100" : "opacity-0"}`} onLoad={() => setDorsalLoaded(true)} />
            
            <div className="absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-full flex justify-center px-4">
              <h2 className="font-[900] text-white tracking-tighter italic drop-shadow-2xl leading-none text-center" style={{ fontSize: "clamp(4.5rem, 18vw, 11rem)" }}>{formattedBib}</h2>
            </div>

            {/* AJUSTE WEB: top-[72%] para centrar Name+Category en franja blanca */}
            <div className="absolute top-[72%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-full max-w-[85%] flex flex-col items-center justify-center">
              <h3 className="font-black text-[#03070b] uppercase tracking-[0.06em] text-center leading-tight m-0 p-0 w-full truncate" style={{ fontSize: "clamp(0.85rem, 3.5vw, 1.875rem)" }}>{form.nombre} {form.apellido}</h3>
              {category && <p className="font-black text-gray-800 uppercase tracking-[0.2em] mt-1 text-center m-0 p-0" style={{ fontSize: "clamp(0.5rem, 1.2vw, 0.75rem)" }}>CATEGORÍA: {category}</p>}
            </div>
            <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none z-20" />
          </div>

          <div className="mt-10 w-full grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-[600px]">
            <button onClick={handleDownloadPNG} disabled={isExporting} className="flex items-center justify-center gap-3 rounded-2xl bg-[#00f2ff] hover:bg-cyan-400 text-[#03070b] px-10 py-5 text-[11px] font-black uppercase tracking-widest shadow-xl transition-all transform hover:-translate-y-1 active:scale-95 disabled:opacity-50">{isExporting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />} {isExporting ? "PROCESANDO..." : "GUARDAR DORSAL"}</button>
            <button onClick={() => navigate("/")} className="flex items-center justify-center gap-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] text-white px-10 py-5 text-[11px] font-black uppercase tracking-widest border border-white/[0.08] transition-all backdrop-blur-2xl hover:-translate-y-1 active:scale-95"><Home className="h-5 w-5 text-[#00f2ff]" /> FINALIZAR</button>
          </div>
          <p className="mt-10 text-[9px] text-white/15 font-black uppercase tracking-[0.5em] text-center">Acreditación Oficial Generada · RAYOCERO</p>
        </motion.div>
      </section>
    );
  }

  /* ── VISTA PRINCIPAL (STEPS) ── */
  return (
    <section id="register" className="relative min-h-screen pt-32 pb-24 px-4 sm:px-6 bg-[#03070b] font-sans overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-cyan-500/[0.04] blur-[140px] rounded-full pointer-events-none -z-10" />
      <div className="max-w-4xl mx-auto relative z-10">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="text-center mb-14"><h2 className="text-5xl md:text-[5rem] font-black text-white mb-4 tracking-tighter italic uppercase leading-[0.85] drop-shadow-2xl">INSCRIPCIÓN <br /><span className="text-cyan-400">OPERATIVA.</span></h2></div>
          <div className="flex flex-wrap items-center justify-center gap-3 mb-14">{steps.map((_, i) => (<div key={i} className="flex items-center gap-3"><div className={`h-11 w-11 rounded-full flex items-center justify-center text-xs font-black transition-all duration-500 ${i === step ? "bg-cyan-500 text-black shadow-lg scale-110" : i < step ? "bg-white text-black" : "bg-white/[0.02] text-white/30 border border-white/[0.07] backdrop-blur-xl"}`}>{i < step ? <CheckCircle className="h-4 w-4" /> : i + 1}</div>{i < steps.length - 1 && <div className={`w-4 md:w-10 h-px ${i < step ? "bg-white/70" : "bg-white/[0.08]"}`} />}</div>))}</div>
          <div className="bg-white/[0.02] border border-white/[0.06] p-7 md:p-12 rounded-[2.5rem] backdrop-blur-2xl shadow-2xl relative overflow-hidden">
            <div className="flex items-center gap-5 mb-10 border-b border-white/[0.05] pb-8"><div className="p-4 bg-white/[0.02] border border-white/[0.07] rounded-2xl shadow-inner backdrop-blur-xl">{steps[step].icon}</div><div><h3 className="text-xl sm:text-2xl font-black text-white uppercase italic">{steps[step].title}</h3><p className="text-[10px] text-white/30 font-bold uppercase mt-1">RAYO CERO TERMINAL</p></div></div>
            <AnimatePresence mode="wait"><motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.35 }}>{steps[step].content}</motion.div></AnimatePresence>
            {submitError && <div className="mt-8 p-5 bg-red-500/[0.07] border border-red-500/15 rounded-2xl flex items-start gap-3 text-red-300 text-xs font-bold uppercase backdrop-blur-2xl"><AlertCircle className="h-5 w-5 text-red-400" />{submitError}</div>}
            <div className="flex flex-col-reverse sm:flex-row justify-between gap-4 mt-10 pt-8 border-t border-white/[0.05]">{step > 0 && <button onClick={() => setStep(step - 1)} className="w-full sm:w-auto px-8 py-4 rounded-full bg-white/[0.02] hover:bg-white/[0.05] text-white/70 text-[10px] font-black uppercase border border-white/[0.08] transition-all backdrop-blur-xl">ATRÁS</button>}<button onClick={() => step < steps.length - 1 ? setStep(step + 1) : handleSubmit()} disabled={!canNext() || isSubmitting || isCompressing} className={`w-full sm:w-auto px-10 py-4 rounded-full text-[10px] font-black uppercase transition-all shadow-xl ${canNext() && !isSubmitting ? "bg-[#00f2ff] hover:bg-cyan-300 text-[#03070b]" : "bg-white/[0.03] text-white/20 border border-white/[0.05] cursor-not-allowed"}`}>{isSubmitting ? "PROCESANDO..." : step < steps.length - 1 ? "SIGUIENTE" : "CONFIRMAR REGISTRO"}</button></div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {showDeslinde && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#03070b]/70 backdrop-blur-2xl" onClick={() => setShowDeslinde(false)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} onClick={(e) => e.stopPropagation()} className="bg-[#07090f]/90 border border-white/[0.07] p-8 md:p-12 rounded-[2.5rem] max-w-2xl w-full max-h-[88vh] overflow-y-auto shadow-2xl relative custom-scrollbar backdrop-blur-2xl text-white">
              <h3 className="text-2xl sm:text-3xl font-black mb-8 italic uppercase text-center">DESLINDE LEGAL</h3>
              <div className="text-sm text-white/40 space-y-6 font-medium leading-relaxed">
                <p>Al procesar esta inscripción, el atleta declara condiciones físicas óptimas y asume total responsabilidad.</p>
                <p>Acepta la cesión de derechos de imagen para la plataforma RAYOCERO.</p>
              </div>
              <button onClick={() => { update("aceptaDeslinde", true); setShowDeslinde(false); }} className="w-full mt-10 rounded-2xl bg-white text-black py-5 text-[10px] font-black uppercase shadow-xl transition-all hover:bg-gray-100">ACEPTO TÉRMINOS Y CONDICIONES</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 10px; }
      `}</style>
    </section>
  );
};

export default RegistrationForm;
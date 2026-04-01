/**
 * RAYO CERO — REGISTRATION TERMINAL (STABLE BUILD V7 - LIQUID GLASS EDITION)
 * Senior Dev: MIA (Valkyron Group)
 * Grado: Militar / Operativo / Diseñador
 * * REGLA DE ORO: Inclusión de Módulo de Pago Operativo y validación por referencia.
 * * Fix: Corrección de Payload para validación Zod (referenciaPago).
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Shield, CheckCircle, ArrowRight, ArrowLeft, Zap, Trophy, Mail, CreditCard, Loader2, AlertCircle, Home, Banknote, UploadCloud } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom"; 
import { registerRunner, calcularEdad, calcularCategoria, type RegistrationFormData } from "@/lib/api";

interface FormData {
  nombre: string;
  apellido: string;
  cedula: string;
  email: string;
  telefono: string;
  fechaNacimiento: string;
  genero: string;
  talla: string;
  referenciaPago: string; // Nuevo campo de auditoría financiera
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
  referenciaPago: "",
  contactoEmergencia: "",
  telefonoEmergencia: "",
  aceptaDeslinde: false,
};

const RegistrationForm = () => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(initialForm);
  const [showDeslinde, setShowDeslinde] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [bibNumber, setBibNumber] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  const navigate = useNavigate();

  // Mutación Supabase — Conectada al core de Valkyron
  const { mutate: submitToSupabase, isPending: isSubmitting } = useMutation({
    mutationFn: (data: RegistrationFormData) => registerRunner(data), // Tipado estricto restaurado
    onSuccess: (data) => {
      setBibNumber(data.bib_number);
      setSubmitted(true);
      setSubmitError(null);
    },
    onError: (error: Error) => {
      setSubmitError(error.message);
    },
  });

  const update = (field: keyof FormData, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  // [MIA PRECISION] Uso de funciones de grado operativo
  const age = form.fechaNacimiento ? calcularEdad(form.fechaNacimiento) : null;
  const category = age !== null && form.genero ? calcularCategoria(age, form.genero as "M" | "F") : null;

  const canNext = () => {
    if (step === 0) return form.nombre && form.apellido && form.cedula && form.email && form.telefono;
    if (step === 1) return form.fechaNacimiento && form.genero && form.talla;
    if (step === 2) return form.referenciaPago.length >= 4; // Validación de pago obligatoria
    if (step === 3) return form.contactoEmergencia && form.telefonoEmergencia && form.aceptaDeslinde;
    return false;
  };

  const handleSubmit = () => {
    setSubmitError(null);
    
    // Preparar payload validado EXACTO para la API Zod
    const registrationData: RegistrationFormData = {
      nombre: form.nombre,
      apellido: form.apellido,
      cedula: form.cedula,
      email: form.email,
      telefono: form.telefono,
      fechaNacimiento: form.fechaNacimiento,
      genero: form.genero as "M" | "F",
      talla: form.talla as "XS" | "S" | "M" | "L" | "XL" | "XXL",
      referenciaPago: form.referenciaPago, // CORRECCIÓN TÁCTICA: camelCase para Zod
      contactoEmergencia: form.contactoEmergencia,
      telefonoEmergencia: form.telefonoEmergencia,
      aceptaDeslinde: true,
    };

    submitToSupabase(registrationData);
  };

  // ESTILO DE INPUT LIQUID GLASS TÁCTICO
  const inputClass =
    "w-full rounded-2xl bg-white/[0.03] border border-white/10 px-5 py-4 text-xs font-bold text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 focus:bg-white/[0.06] transition-all backdrop-blur-md uppercase tracking-wider";

  const steps = [
    {
      title: "Identificación de Atleta",
      icon: <User className="h-5 w-5 text-cyan-400" />,
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <input className={inputClass} placeholder="Nombre" value={form.nombre} onChange={(e) => update("nombre", e.target.value)} />
          <input className={inputClass} placeholder="Apellido" value={form.apellido} onChange={(e) => update("apellido", e.target.value)} />
          <div className="relative">
            <CreditCard className="absolute right-4 top-4 h-4 w-4 text-white/20" />
            <input className={inputClass} placeholder="Cédula / ID (Ej: V-12345678)" value={form.cedula} onChange={(e) => update("cedula", e.target.value)} />
          </div>
          <div className="relative">
            <Mail className="absolute right-4 top-4 h-4 w-4 text-white/20" />
            <input className={inputClass} placeholder="Email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
          </div>
          <input className={inputClass} placeholder="Teléfono" value={form.telefono} onChange={(e) => update("telefono", e.target.value)} />
        </div>
      ),
    },
    {
      title: "Categoría & Logística",
      icon: <Trophy className="h-5 w-5 text-cyan-400" />,
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-[9px] font-black uppercase tracking-[0.3em] text-cyan-400 mb-3 block ml-1">Fecha de Nacimiento</label>
              <input className={inputClass} type="date" value={form.fechaNacimiento} onChange={(e) => update("fechaNacimiento", e.target.value)} />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase tracking-[0.3em] text-cyan-400 mb-3 block ml-1">Género</label>
              <select className={inputClass} value={form.genero} onChange={(e) => update("genero", e.target.value)}>
                <option value="" className="bg-[#03070b]">Seleccionar</option>
                <option value="M" className="bg-[#03070b]">Masculino</option>
                <option value="F" className="bg-[#03070b]">Femenino</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-[9px] font-black uppercase tracking-[0.3em] text-cyan-400 mb-3 block ml-1">Talla de Camiseta (Oficial Rayo Cero)</label>
              <select className={inputClass} value={form.talla} onChange={(e) => update("talla", e.target.value)}>
                <option value="" className="bg-[#03070b]">Seleccionar talla</option>
                <option value="XS" className="bg-[#03070b]">XS</option>
                <option value="S" className="bg-[#03070b]">S</option>
                <option value="M" className="bg-[#03070b]">M</option>
                <option value="L" className="bg-[#03070b]">L</option>
                <option value="XL" className="bg-[#03070b]">XL</option>
                <option value="XXL" className="bg-[#03070b]">XXL</option>
              </select>
            </div>
          </div>
          {category && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-cyan-500/5 border border-cyan-500/20 p-6 rounded-2xl text-center backdrop-blur-xl"
            >
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-cyan-400/60 mb-2">Validación de Categoría Automática</p>
              <p className="text-2xl font-black text-cyan-400 uppercase tracking-tighter">{category}</p>
              {age !== null && <p className="text-[10px] text-white/40 mt-2 font-bold tracking-widest uppercase">Atleta verificado: {age} años</p>}
            </motion.div>
          )}
        </div>
      ),
    },
    {
      title: "Pago Operativo",
      icon: <Banknote className="h-5 w-5 text-cyan-400" />,
      content: (
        <div className="space-y-6">
          {/* TERMINAL DE COORDENADAS BANCARIAS */}
          <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-2xl p-6 md:p-8 backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                <Banknote className="h-32 w-32 text-cyan-400" />
            </div>
            
            <div className="flex items-center gap-3 mb-6 border-b border-cyan-500/20 pb-4 relative z-10">
              <Zap className="h-4 w-4 text-cyan-400" />
              <h4 className="text-xs font-black text-white uppercase tracking-[0.3em]">Coordenadas Bancarias</h4>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10">
              <div>
                <span className="block text-cyan-400/60 text-[9px] font-black uppercase tracking-widest mb-1">Titular (Razón Social)</span>
                <span className="text-white text-sm font-bold uppercase tracking-wider">Rayocero Eventos C.A</span>
              </div>
              <div>
                <span className="block text-cyan-400/60 text-[9px] font-black uppercase tracking-widest mb-1">RIF / Documento</span>
                <span className="text-white text-sm font-bold tracking-wider">J-505771710</span>
              </div>
              <div>
                <span className="block text-cyan-400/60 text-[9px] font-black uppercase tracking-widest mb-1">Pago Móvil (Teléfono)</span>
                <span className="text-white text-sm font-bold tracking-wider">0414-5643372</span>
              </div>
              <div>
                <span className="block text-cyan-400/60 text-[9px] font-black uppercase tracking-widest mb-1">Cuenta Bancaria (BNC 0191)</span>
                <span className="text-white text-sm font-bold tracking-wider">0191-0060-0921-6016-9493</span>
              </div>
            </div>
          </div>

          {/* ZONA DE AUDITORÍA Y COMPROBANTE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="relative col-span-1 sm:col-span-2">
              <label className="text-[9px] font-black uppercase tracking-[0.3em] text-cyan-400 mb-3 block ml-1">Nº de Referencia Bancaria</label>
              <input 
                className={inputClass} 
                placeholder="EJ: 458921 (ÚLTIMOS DÍGITOS)" 
                value={form.referenciaPago} 
                onChange={(e) => update("referenciaPago", e.target.value)} 
              />
              <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest mt-3 ml-2 flex items-center gap-2">
                <Shield className="h-3 w-3 text-cyan-500" />
                Este número será exigido para retirar el Kit de Corredor.
              </p>
            </div>

            {/* ZONA DE UPLOAD VISUAL (Preparada para el futuro) */}
            <div className="sm:col-span-2 mt-2">
               <label className="text-[9px] font-black uppercase tracking-[0.3em] text-white/50 mb-3 block ml-1">Capture del Pago (Opcional)</label>
               <div className="w-full border-2 border-dashed border-white/10 hover:border-cyan-500/50 bg-white/[0.02] rounded-2xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer group">
                  <UploadCloud className="h-8 w-8 text-white/20 group-hover:text-cyan-400 transition-colors mb-3" />
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] group-hover:text-white transition-colors text-center">
                    Haz clic para subir comprobante <br/> <span className="text-[8px] font-bold tracking-widest text-white/20 mt-1 block">JPG, PNG o PDF</span>
                  </span>
               </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Seguridad & Deslinde Legal",
      icon: <Shield className="h-5 w-5 text-cyan-400" />,
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <input className={inputClass} placeholder="Contacto de Emergencia (Nombre)" value={form.contactoEmergencia} onChange={(e) => update("contactoEmergencia", e.target.value)} />
            <input className={inputClass} placeholder="Teléfono Emergencia" value={form.telefonoEmergencia} onChange={(e) => update("telefonoEmergencia", e.target.value)} />
          </div>
          <div className="bg-white/[0.02] border border-white/10 p-6 rounded-2xl flex items-start gap-4 backdrop-blur-md">
            <input
              type="checkbox"
              checked={form.aceptaDeslinde}
              onChange={(e) => update("aceptaDeslinde", e.target.checked)}
              className="mt-1 h-5 w-5 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500/50 cursor-pointer"
            />
            <p className="text-xs text-white/60 leading-relaxed font-medium">
              Confirmo que he leído y acepto el{" "}
              <button onClick={(e) => { e.preventDefault(); setShowDeslinde(true); }} className="text-cyan-400 font-bold underline decoration-cyan-400/30 hover:decoration-cyan-400 transition-all">
                Deslinde de Responsabilidad
              </button>{" "}
              y los términos operativos de Valkyron Group para este evento.
            </p>
          </div>
        </div>
      ),
    },
  ];

  // ─── PANTALLA DE ÉXITO (HOLOGRAMA TÁCTICO) ───
  if (submitted && bibNumber) {
    return (
      <section id="register" className="relative min-h-screen pt-32 pb-24 px-6 bg-[#03070b] flex items-center justify-center font-sans overflow-hidden">
        
        {/* Glow de éxito */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-lg mx-auto text-center w-full relative z-10">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="bg-white/[0.02] border border-white/10 p-12 md:p-16 rounded-[3rem] backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
          >
            <div className="relative inline-flex items-center justify-center mb-10">
              <motion.div 
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: "spring" }}
                className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping" 
              />
              <div className="bg-cyan-500/10 p-4 rounded-full border border-cyan-500/30">
                 <CheckCircle className="h-16 w-16 text-cyan-400 relative z-10" />
              </div>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4 italic tracking-tighter uppercase">REGISTRO CONFIRMADO</h2>
            <p className="text-cyan-400 mb-10 uppercase tracking-[0.3em] text-[9px] font-black">Tu Número de Dorsal Oficial</p>
            
            <div className="text-8xl md:text-[8rem] leading-none font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-400 to-white mb-10 tracking-tighter drop-shadow-[0_0_20px_rgba(0,242,255,0.3)]">
              {bibNumber}
            </div>
            
            <div className="space-y-3 border-t border-white/10 pt-8 mb-10">
              <p className="text-[9px] text-white/30 font-black tracking-widest uppercase">
                Valkyron Secure-ID: <span className="text-white/60">{btoa(bibNumber.toString()).substring(0, 12)}</span>
              </p>
              <p className="text-[9px] text-white/30 font-black tracking-widest uppercase">
                TS: <span className="text-white/60">{new Date().toISOString()}</span>
              </p>
            </div>

            {/* BOTÓN DE EXTRACCIÓN AÑADIDO */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/")}
              className="flex items-center justify-center gap-3 w-full rounded-full bg-white/[0.03] hover:bg-white/10 px-8 py-5 text-[10px] font-black text-white uppercase tracking-[0.2em] border border-white/10 transition-all"
            >
              <Home className="h-4 w-4 text-cyan-400" /> VOLVER AL INICIO
            </motion.button>
          </motion.div>
        </div>
      </section>
    );
  }

  // ─── FORMULARIO PRINCIPAL ───
  return (
    <section id="register" className="relative min-h-screen pt-32 pb-24 px-6 bg-[#03070b] font-sans overflow-hidden">
      
      {/* Glow Ambiental de Fondo */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-4xl mx-auto relative z-10">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          
          <div className="text-center mb-16">
            <motion.div 
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/5 backdrop-blur-md mb-6"
            >
              <Zap className="h-3 w-3 text-cyan-400" />
              <span className="text-[9px] font-black tracking-[0.4em] text-white/60 uppercase">
                Portal de Ingreso
              </span>
            </motion.div>
            <h2 className="text-5xl md:text-[5rem] font-black text-white mb-4 tracking-tighter italic uppercase leading-[0.85] drop-shadow-2xl">
              INSCRIPCIÓN <br /> 
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-white">OPERATIVA.</span>
            </h2>
          </div>

          {/* INDICADORES DE PASOS (Nodos Tácticos) */}
          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 mb-16 px-4">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-3 md:gap-4">
                <div className={`h-12 w-12 rounded-full flex items-center justify-center text-xs font-black transition-all duration-500 flex-shrink-0 ${i === step ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(0,242,255,0.4)] scale-110" : i < step ? "bg-white text-black" : "bg-white/[0.02] text-white/30 border border-white/10"}`}>
                  {i < step ? <CheckCircle className="h-5 w-5" /> : i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-4 md:w-12 lg:w-20 h-[2px] transition-all duration-700 rounded-full ${i < step ? "bg-white" : "bg-white/10"}`} />
                )}
              </div>
            ))}
          </div>

          {/* CONTENEDOR DEL FORMULARIO (Liquid Glass) */}
          <div className="bg-white/[0.02] border border-white/5 p-8 md:p-14 rounded-[2.5rem] backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
            
            <div className="flex items-center gap-5 mb-10 border-b border-white/5 pb-8">
              <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl shadow-inner">
                {steps[step].icon}
              </div>
              <div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight italic">{steps[step].title}</h3>
                <p className="text-[10px] text-white/40 font-bold tracking-widest uppercase mt-1">Ingeniería Valkyron v2.1</p>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4, ease: "circOut" }}
              >
                {steps[step].content}
              </motion.div>
            </AnimatePresence>

            <AnimatePresence>
              {submitError && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="mt-8 flex items-start gap-3 bg-red-500/10 border border-red-500/20 p-5 rounded-2xl backdrop-blur-md"
                >
                  <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300 font-bold uppercase tracking-wider">{submitError}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* BOTONERA TÁCTICA */}
            <div className="flex flex-col-reverse sm:flex-row justify-between gap-4 mt-12 pt-8 border-t border-white/5">
              {step > 0 ? (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => { e.preventDefault(); setStep(step - 1); }}
                  className="w-full sm:w-auto flex items-center justify-center gap-3 rounded-full bg-white/[0.03] hover:bg-white/10 px-8 py-5 text-[10px] font-black text-white uppercase tracking-[0.2em] border border-white/10 transition-all"
                >
                  <ArrowLeft className="h-4 w-4 text-cyan-400" /> ATRÁS
                </motion.button>
              ) : <div className="hidden sm:block" />}
              
              <motion.button
                whileHover={{ scale: canNext() ? 1.02 : 1 }}
                whileTap={{ scale: canNext() ? 0.98 : 1 }}
                onClick={(e) => {
                  e.preventDefault();
                  if (!canNext() || isSubmitting) return;
                  if (step < steps.length - 1) setStep(step + 1);
                  else handleSubmit();
                }}
                disabled={!canNext() || isSubmitting}
                className={`w-full sm:w-auto flex items-center justify-center gap-3 rounded-full px-10 py-5 text-[10px] font-black uppercase tracking-[0.2em] transition-all group ${
                  canNext() && !isSubmitting 
                  ? "bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_20px_rgba(0,242,255,0.2)]" 
                  : "bg-white/5 text-white/20 border border-white/5 cursor-not-allowed"
                }`}
              >
                {isSubmitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> PROCESANDO...</>
                ) : step < steps.length - 1 ? (
                  <>SIGUIENTE <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></>
                ) : (
                  <>CONFIRMAR REGISTRO <CheckCircle className="h-4 w-4" /></>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* MODAL DESLINDE LEGAL (Liquid Glass) */}
      <AnimatePresence>
        {showDeslinde && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#03070b]/80 backdrop-blur-xl"
            onClick={() => setShowDeslinde(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#080b11] border border-white/10 p-10 md:p-14 rounded-[2.5rem] max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl relative custom-scrollbar"
            >
              <div className="absolute top-8 right-8 text-white/5 font-black text-6xl select-none pointer-events-none">LEGAL</div>
              
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 mb-6">
                 <Shield className="h-3 w-3 text-red-400" />
                 <span className="text-[8px] font-black uppercase tracking-[0.3em] text-red-400">Documento Oficial</span>
              </div>

              <h3 className="text-3xl font-black text-white mb-8 italic tracking-tighter uppercase">DESLINDE DE RESPONSABILIDAD</h3>
              
              <div className="text-sm text-white/50 space-y-6 font-medium leading-relaxed">
                <p>Al procesar esta inscripción en el ecosistema digital de Rayo Cero Running, el atleta declara:</p>
                <div className="p-5 rounded-2xl bg-white/[0.02] border-l-2 border-cyan-400 italic text-white/80">
                  "Me encuentro en óptimas condiciones físicas y asumo total responsabilidad operativa y médica por mi participación en este evento de alto rendimiento."
                </div>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="text-cyan-400 font-black mt-1">01.</span> 
                    <span>Sometimiento a protocolos de validación de datos por parte de la ingeniería de Valkyron Group.</span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="text-cyan-400 font-black mt-1">02.</span> 
                    <span>Aceptación irrevocable del sistema de cronometraje electrónico y las decisiones de los jueces de ruta.</span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="text-cyan-400 font-black mt-1">03.</span> 
                    <span>Cesión de derechos de imagen para la plataforma operativa y promocional de Rayo Cero.</span>
                  </li>
                </ul>
              </div>
              
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={(e) => { e.preventDefault(); update("aceptaDeslinde", true); setShowDeslinde(false); }}
                className="w-full mt-12 rounded-2xl bg-white text-black py-5 text-[10px] font-black uppercase tracking-[0.3em] shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:bg-gray-200 transition-colors"
              >
                ACEPTO TÉRMINOS Y CONDICIONES
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 10px; }
      `}</style>
    </section>
  );
};

export default RegistrationForm;
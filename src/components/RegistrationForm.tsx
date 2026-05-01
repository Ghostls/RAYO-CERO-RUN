/**
 * RAYO CERO — REGISTRATION TERMINAL (STABLE BUILD V19.7_CANVAS_CORE)
 * Senior Dev: MIA (Valkyron Group)
 * CEO: Lualdo Sciscioli
 * Grado: Militar / Operativo / Diseñador
 * REGLA DE ORO: Código completo sin omisiones. Base mantenida.
 * FUSIÓN: Telemetría Supabase + Canvas 2D API Nativo.
 * FIX DEFINITIVO: Purgado `html-to-image`. Implementación de motor de dibujo
 * imperativo sobre Canvas nativo para garantizar compatibilidad total en iOS/Safari
 * y eliminar el fallo de renderizado "Black Box" de elementos fuera del viewport.
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
import dorsalBgSrc from "../assets/dorsal-bg.jpg"; 

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

const RegistrationForm = () => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(initialForm);
  const [showDeslinde, setShowDeslinde] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [bibNumber, setBibNumber] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  const [comprobanteFile, setComprobanteFile] = useState<File | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // ─── ESTADOS FINANCIEROS DINÁMICOS (TELEMETRÍA VALKYRON) ───
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [registrationFee, setRegistrationFee] = useState<number>(40); 
  const [isFetchingFinance, setIsFetchingFinance] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  const navigate = useNavigate();

  const age = form.fechaNacimiento ? calcularEdad(form.fechaNacimiento) : null;
  const category = age !== null && form.genero ? calcularCategoria(age, form.genero as "M" | "F", form.movilidadReducida) : null;

  // ─── RADAR DE FINANZAS (SINCRO CON ADMIN HQ) ───
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

  // ─── MOTOR MATEMÁTICO DE PRECISIÓN MILITAR ───
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

  // ─── PROTOCOLO DE DESCARGA VISUAL (V19.7 CANVAS API NATIVA) ───
  // Reemplazo total de html-to-image. Dibuja directamente sobre un elemento
  // canvas en memoria usando instrucciones imperativas, asegurando 100% de
  // compatibilidad con iOS/Safari y eliminando el bug del "black box".
  const handleDownloadPNG = async () => {
    setIsExporting(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 900;
      const ctx = canvas.getContext("2d");

      if (!ctx) throw new Error("No se pudo iniciar el contexto 2D del Canvas");

      // Cargar imagen de fondo
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = dorsalBgSrc;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // Dibujar fondo
      ctx.drawImage(img, 0, 0, 1200, 900);

      // Esperar a que las fuentes personalizadas estén listas en el documento
      await document.fonts.ready;

      const formattedBib = bibNumber?.toString().padStart(4, "0") || "0000";

      // --- RENDERIZADO DEL BIB NUMBER ---
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      // Sombra para el Bib Number (drop-shadow-like)
      ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 20;

      // Configuración de la fuente (Asumiendo que Tailwind carga una fuente sans-serif audaz)
      ctx.font = "italic 900 280px sans-serif";
      ctx.fillStyle = "#ffffff";
      
      // Coordenadas calculadas: Centro X (600), Y ajustado al 42% (378)
      ctx.fillText(formattedBib, 600, 378);

      // Limpiar sombra para los textos siguientes
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // --- RENDERIZADO DE LA IDENTIDAD (Nombre) ---
      const nombreCompleto = `${form.nombre} ${form.apellido}`.toUpperCase();
      ctx.font = "900 56px sans-serif";
      ctx.fillStyle = "#03070b"; // Color oscuro
      // Reducimos un poco el espaciado entre letras dibujando manualmente si es necesario, 
      // pero la API nativa de canvas maneja letterSpacing en navegadores modernos (Chrome 89+ / Safari 14+).
      // Usaremos un aproximado estándar seguro.
      ctx.letterSpacing = "4px"; 
      
      // Y centrado inferior (~72%)
      ctx.fillText(nombreCompleto, 600, 648);

      // --- RENDERIZADO DE LA CATEGORÍA ---
      if (category) {
        ctx.font = "900 22px sans-serif";
        ctx.fillStyle = "#1a1a1a";
        ctx.letterSpacing = "6px";
        ctx.fillText(`CATEGORÍA: ${category.toUpperCase()}`, 600, 710);
      }

      // Exportar a PNG
      const dataUrl = canvas.toDataURL("image/png", 1.0);
      
      const link = document.createElement("a");
      link.download = `DORSAL_RAYOCERO_${form.cedula}.png`;
      link.href = dataUrl;
      link.click();

    } catch (err) {
      console.error("MIA CANVAS FATAL ERROR:", err);
      alert("Error en el motor de dibujo. Por favor, realiza una captura de pantalla.");
    } finally {
      setIsExporting(false);
    }
  };

  const update = (field: keyof FormData, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  const canNext = () => {
    if (step === 0)
      return (
        form.nombre &&
        form.apellido &&
        form.cedula &&
        form.email &&
        form.telefono
      );
    if (step === 1) return form.fechaNacimiento && form.genero && form.talla;
    if (step === 2) return form.referenciaPago.length >= 4;
    if (step === 3)
      return (
        form.contactoEmergencia &&
        form.telefonoEmergencia &&
        form.aceptaDeslinde
      );
    return false;
  };

  const handleSubmit = () => {
    setSubmitError(null);
    const normalizedCedula = form.cedula.replace(/[VEJGvejg.\s-]/g, "");

    const registrationData: any = {
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      cedula: normalizedCedula,
      email: form.email.toLowerCase().trim(),
      telefono: form.telefono,
      fechaNacimiento: form.fechaNacimiento,
      genero: form.genero as "M" | "F",
      talla: form.talla as "XS" | "S" | "M" | "L" | "XL" | "XXL",
      movilidadReducida: form.movilidadReducida,
      referenciaPago: form.referenciaPago.trim(),
      contactoEmergencia: form.contactoEmergencia,
      telefonoEmergencia: form.telefonoEmergencia,
      aceptaDeslinde: true,
    };

    submitToSupabase(registrationData);
  };

  const inputClass =
    "w-full rounded-2xl bg-white/[0.03] border border-white/10 px-5 py-4 text-xs font-bold text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 focus:bg-white/[0.06] transition-all backdrop-blur-md uppercase tracking-wider";

  const steps = [
    {
      title: "Identificación de Atleta",
      icon: <User className="h-5 w-5 text-cyan-400" />,
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <input
            className={inputClass}
            placeholder="Nombre"
            value={form.nombre}
            onChange={(e) => update("nombre", e.target.value)}
          />
          <input
            className={inputClass}
            placeholder="Apellido"
            value={form.apellido}
            onChange={(e) => update("apellido", e.target.value)}
          />
          <div className="relative">
            <CreditCard className="absolute right-4 top-4 h-4 w-4 text-white/20" />
            <input
              className={inputClass}
              placeholder="Cédula / ID"
              value={form.cedula}
              onChange={(e) => update("cedula", e.target.value)}
            />
          </div>
          <div className="relative">
            <Mail className="absolute right-4 top-4 h-4 w-4 text-white/20" />
            <input
              className={inputClass}
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
            />
          </div>
          <input
            className={inputClass}
            placeholder="Teléfono"
            value={form.telefono}
            onChange={(e) => update("telefono", e.target.value)}
          />
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
              <label className="text-[9px] font-black uppercase tracking-[0.3em] text-cyan-400 mb-3 block ml-1">
                Fecha de Nacimiento
              </label>
              <input
                className={inputClass}
                type="date"
                value={form.fechaNacimiento}
                onChange={(e) => update("fechaNacimiento", e.target.value)}
              />
            </div>
            <div>
              <label className="text-[9px] font-black uppercase tracking-[0.3em] text-cyan-400 mb-3 block ml-1">
                Género
              </label>
              <select
                className={inputClass}
                value={form.genero}
                onChange={(e) => update("genero", e.target.value)}
              >
                <option value="" className="bg-[#03070b]">
                  Seleccionar
                </option>
                <option value="M" className="bg-[#03070b]">
                  Masculino
                </option>
                <option value="F" className="bg-[#03070b]">
                  Femenino
                </option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-[9px] font-black uppercase tracking-[0.3em] text-cyan-400 mb-3 block ml-1">
                Talla de Camiseta (Oficial RAYOCERO)
              </label>
              <select
                className={inputClass}
                value={form.talla}
                onChange={(e) => update("talla", e.target.value)}
              >
                <option value="" className="bg-[#03070b]">
                  Seleccionar talla
                </option>
                <option value="XS" className="bg-[#03070b]">
                  XS
                </option>
                <option value="S" className="bg-[#03070b]">
                  S
                </option>
                <option value="M" className="bg-[#03070b]">
                  M
                </option>
                <option value="L" className="bg-[#03070b]">
                  L
                </option>
                <option value="XL" className="bg-[#03070b]">
                  XL
                </option>
                <option value="XXL" className="bg-[#03070b]">
                  XXL
                </option>
              </select>
            </div>

            <div className="sm:col-span-2 mt-2 bg-white/[0.02] border border-white/5 p-5 rounded-2xl flex items-center justify-between group hover:border-cyan-500/30 transition-all backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-500 group-hover:text-[#03070b] transition-colors">
                  <Accessibility className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">
                    Movilidad Reducida
                  </span>
                  <span className="text-[8px] text-white/40 uppercase tracking-widest mt-1">
                    Marcar si requiere logística especial
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={form.movilidadReducida}
                onChange={(e) => update("movilidadReducida", e.target.checked)}
                className="h-5 w-5 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500/50 cursor-pointer transition-all"
              />
            </div>
          </div>
          {category && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-cyan-500/5 border border-cyan-500/20 p-6 rounded-2xl text-center backdrop-blur-xl"
            >
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-cyan-400/60 mb-2">
                Validación de Categoría Automática
              </p>
              <p className="text-2xl font-black text-cyan-400 uppercase tracking-tighter">
                {category}
              </p>
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
          <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-2xl p-6 md:p-8 backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
              <TrendingUp className="h-32 w-32 text-cyan-400" />
            </div>

            <div className="mb-8 p-5 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10 shadow-[0_0_20px_rgba(0,0,0,0.2)] hover:border-cyan-500/30 transition-all">
              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="h-12 w-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                  {isFetchingFinance ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    <Shield className="h-5 w-5" />
                  )}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400">
                    Tasa Oficial (RAYOCERO)
                  </span>
                  <span className="text-[8px] text-white/60 uppercase tracking-widest mt-1 leading-tight">
                    {exchangeRate
                      ? `Última Sync: ${lastUpdate}`
                      : "Conectando al Servidor..."}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end shrink-0 w-full sm:w-auto text-center sm:text-right border-t sm:border-t-0 border-white/5 pt-4 sm:pt-0">
                <div className="text-4xl font-black italic tracking-tighter text-white drop-shadow-[0_0_15px_rgba(0,242,255,0.4)] leading-none">
                  ${registrationFee}
                  <span className="text-cyan-400 text-xl">.00</span>
                </div>

                {isFetchingFinance ? (
                  <div className="flex items-center gap-2 mt-2 text-cyan-500/60 justify-center sm:justify-end">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span className="text-[8px] font-black tracking-widest uppercase">
                      Consultando...
                    </span>
                  </div>
                ) : exchangeRate ? (
                  <div className="text-sm font-black tracking-widest text-cyan-400 uppercase mt-2 bg-cyan-500/10 px-3 py-1 rounded-md border border-cyan-500/20">
                    Total: Bs.{" "}
                    {totalBolivares.toLocaleString("es-VE", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                ) : (
                  <div className="text-[8px] font-bold tracking-widest text-red-400 uppercase mt-2">
                    Sistema en Mantenimiento.
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
              <div>
                <span className="block text-cyan-400/60 mb-1">
                  Titular (Razón Social)
                </span>
                <span className="text-white text-sm">Rayocero Eventos C.A</span>
              </div>
              <div>
                <span className="block text-cyan-400/60 mb-1">
                  RIF / Documento
                </span>
                <span className="text-white text-sm">J-505771710</span>
              </div>
              <div>
                <span className="block text-cyan-400/60 mb-1">
                  Pago Móvil (Teléfono)
                </span>
                <span className="text-white text-sm">0414-5643372</span>
              </div>
              <div>
                <span className="block text-cyan-400/60 mb-1">
                  Cuenta Bancaria (BNC)
                </span>
                <span className="text-white text-sm">
                  0191-0060-0921-6016-9493
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="relative col-span-1 sm:col-span-2">
              <label className="text-[9px] font-black uppercase tracking-[0.3em] text-cyan-400 mb-3 block ml-1">
                Nº de Referencia Bancaria
              </label>
              <input
                className={inputClass}
                placeholder="EJ: 458921 (ÚLTIMOS DÍGITOS)"
                value={form.referenciaPago}
                onChange={(e) => update("referenciaPago", e.target.value)}
              />
            </div>

            <div className="sm:col-span-2 mt-2">
              <label className="w-full border-2 border-dashed border-white/10 hover:border-cyan-500/50 bg-white/[0.02] rounded-2xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer group relative overflow-hidden">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isCompressing || isSubmitting}
                />

                {isCompressing ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
                    <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.2em] text-center">
                      Adjuntando...
                    </span>
                  </div>
                ) : comprobanteFile ? (
                  <div className="flex flex-col items-center gap-3">
                    <CheckCircle className="h-8 w-8 text-green-400" />
                    <span className="text-[10px] font-black text-green-400 uppercase tracking-[0.2em] text-center">
                      Evidencia Lista <br />
                      <span className="text-[8px] text-white/50 tracking-widest block mt-1">
                        {comprobanteFile.name}
                      </span>
                    </span>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="h-8 w-8 text-white/20 group-hover:text-cyan-400 transition-colors mb-3" />
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] group-hover:text-white transition-colors text-center">
                      Haz clic para subir comprobante <br />{" "}
                      <span className="text-[8px] font-bold tracking-widest text-cyan-500/80 mt-1 block">
                        JPG, PNG o PDF
                      </span>
                    </span>
                  </>
                )}
              </label>
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
            <input
              className={inputClass}
              placeholder="Contacto de Emergencia"
              value={form.contactoEmergencia}
              onChange={(e) => update("contactoEmergencia", e.target.value)}
            />
            <input
              className={inputClass}
              placeholder="Teléfono Emergencia"
              value={form.telefonoEmergencia}
              onChange={(e) => update("telefonoEmergencia", e.target.value)}
            />
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
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setShowDeslinde(true);
                }}
                className="text-cyan-400 font-bold underline decoration-cyan-400/30 hover:decoration-cyan-400 transition-all"
              >
                Deslinde de Responsabilidad
              </button>{" "}
              y los términos operativos de RAYOCERO para este evento.
            </p>
          </div>
        </div>
      ),
    },
  ];

  // ─────────────────────────────────────────────────────────────────────────────
  // VISTA DE ÉXITO — Dorsal Generado
  // ─────────────────────────────────────────────────────────────────────────────
  if (submitted && bibNumber) {
    const formattedBib = bibNumber.toString().padStart(4, "0");

    return (
      <>
        <section
          id="success-bib"
          className="relative min-h-screen pt-32 pb-24 px-4 sm:px-6 bg-[#03070b] flex items-center justify-center font-sans overflow-hidden print:hidden"
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#00f2ff]/10 blur-[120px] rounded-full pointer-events-none z-0" />

          <div className="max-w-3xl mx-auto w-full relative z-10 flex flex-col items-center">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="w-full flex flex-col items-center"
            >
              
              {/* ── VISTA PREVIA RESPONSIVE PARA EL USUARIO (Solo visualización) ── */}
              {/* Esta es la placa que ve el usuario en su dispositivo (Tailwind normal) */}
              <div className="relative w-full max-w-[600px] aspect-[4/3] rounded-2xl shadow-[0_40px_80px_-15px_rgba(0,242,255,0.2)] border-4 sm:border-8 border-white/10 overflow-hidden bg-black">
                <img
                  src={dorsalBgSrc}
                  alt="Dorsal Preview"
                  className="absolute inset-0 w-full h-full object-cover z-0"
                />

                <div className="absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-full flex justify-center px-4">
                  <h2 className="text-[7rem] sm:text-[11rem] font-[900] text-white tracking-tighter italic drop-shadow-[0_12px_20px_rgba(0,0,0,0.6)] leading-none m-0 p-0 text-center">
                    {formattedBib}
                  </h2>
                </div>

                <div className="absolute top-[74%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-full max-w-[85%] flex flex-col items-center justify-center">
                  <h3 className="text-xl sm:text-3xl font-black text-[#03070b] uppercase tracking-[0.1em] text-center leading-tight m-0 p-0 truncate w-full">
                    {form.nombre} {form.apellido}
                  </h3>
                  {category && (
                    <p className="text-[10px] sm:text-xs font-black text-gray-800 uppercase tracking-[0.25em] mt-1.5 sm:mt-2 text-center m-0 p-0">
                      CATEGORÍA: {category}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-12 w-full grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-[600px]">
                <button
                  onClick={handleDownloadPNG}
                  disabled={isExporting}
                  className="flex items-center justify-center gap-3 rounded-2xl bg-[#00f2ff] hover:bg-cyan-400 text-[#03070b] px-10 py-6 text-[11px] font-black uppercase tracking-[0.3em] shadow-[0_20px_40px_-10px_rgba(0,242,255,0.4)] transition-all transform hover:-translate-y-1 active:scale-95 disabled:opacity-50"
                >
                  {isExporting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Download className="h-5 w-5" />
                  )}
                  {isExporting
                    ? "PROCESANDO..."
                    : "GUARDAR EN GALERÍA"}
                </button>
                <button
                  onClick={() => navigate("/")}
                  className="flex items-center justify-center gap-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] text-white px-10 py-6 text-[11px] font-black uppercase tracking-[0.3em] border border-white/10 transition-all backdrop-blur-md hover:-translate-y-1 active:scale-95"
                >
                  <Home className="h-5 w-5 text-[#00f2ff]" /> FINALIZAR REGISTRO
                </button>
              </div>

              <p className="mt-10 text-[9px] text-white/20 font-black uppercase tracking-[0.5em] text-center">
                Acreditación Oficial Generada Correctamente.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Canvas legacy para compatibilidad con impresión en papel */}
        <div id="print-canvas" className="hidden">
          <div className="print-container relative mx-auto w-full max-w-[21cm]">
            <img
              src={dorsalBgSrc}
              className="w-full h-auto block"
              alt="Dorsal Impresion"
            />
            <div className="absolute inset-0 z-10 w-full h-full">
              <div className="absolute top-[18%] h-[50%] w-full flex items-center justify-center">
                <h2 className="print-bib font-[900] text-white tracking-tighter italic leading-none text-center m-0 p-0 drop-shadow-md">
                  {formattedBib}
                </h2>
              </div>
              <div className="absolute top-[66.5%] h-[16%] w-full flex flex-col items-center justify-center px-4 sm:px-8">
                <h3 className="print-name font-black text-[#03070b] uppercase tracking-widest w-full text-center leading-none m-0 p-0 truncate">
                  {form.nombre} {form.apellido}
                </h3>
                {category && (
                  <p className="print-cat font-bold text-gray-800 uppercase tracking-[0.2em] leading-tight m-0 p-0 text-center w-full px-2 line-clamp-2">
                    CATEGORÍA: {category}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @media print {
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            html, body { background-color: white !important; margin: 0 !important; padding: 0 !important; }
            body * { visibility: hidden !important; }
            #print-canvas, #print-canvas * { visibility: visible !important; }
            #print-canvas { display: block !important; position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; background-color: white !important; z-index: 999999 !important; }
            .print-container { width: 100% !important; max-width: 100% !important; }
            .print-bib { font-size: 20vw !important; }
            .print-name { font-size: 5vw !important; }
            .print-cat { font-size: 2vw !important; margin-top: 1vw !important; }
            * { transform: none !important; overflow: visible !important; }
            @page { size: portrait; margin: 0.5cm !important; }
          }
        `}</style>
      </>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // VISTA PRINCIPAL DEL FORMULARIO
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <section
      id="register"
      className="relative min-h-screen pt-32 pb-24 px-6 bg-[#03070b] font-sans overflow-hidden"
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="max-w-4xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/5 backdrop-blur-md mb-6"
            >
              <Zap className="h-3 w-3 text-cyan-400" />
              <span className="text-[9px] font-black tracking-[0.4em] text-white/60 uppercase">
                Portal de Ingreso
              </span>
            </motion.div>
            <h2 className="text-5xl md:text-[5rem] font-black text-white mb-4 tracking-tighter italic uppercase leading-[0.85] drop-shadow-2xl">
              INSCRIPCIÓN <br />{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-white">
                OPERATIVA.
              </span>
            </h2>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 mb-16 px-4">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-3 md:gap-4">
                <div
                  className={`h-12 w-12 rounded-full flex items-center justify-center text-xs font-black transition-all duration-500 flex-shrink-0 ${
                    i === step
                      ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(0,242,255,0.4)] scale-110"
                      : i < step
                      ? "bg-white text-black"
                      : "bg-white/[0.02] text-white/30 border border-white/10"
                  }`}
                >
                  {i < step ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    i + 1
                  )}
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`w-4 md:w-12 lg:w-20 h-[2px] transition-all duration-700 rounded-full ${
                      i < step ? "bg-white" : "bg-white/10"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="bg-white/[0.02] border border-white/5 p-8 md:p-14 rounded-[2.5rem] backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
            <div className="flex items-center gap-5 mb-10 border-b border-white/5 pb-8">
              <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl shadow-inner">
                {steps[step].icon}
              </div>
              <div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight italic">
                  {steps[step].title}
                </h3>
                <p className="text-[10px] text-white/40 font-bold tracking-widest uppercase mt-1">
                  REGISTRO
                </p>
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
                  <p className="text-xs text-red-300 font-bold uppercase tracking-wider">
                    {submitError}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-col-reverse sm:flex-row justify-between gap-4 mt-12 pt-8 border-t border-white/5">
              {step > 0 ? (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.preventDefault();
                    setStep(step - 1);
                  }}
                  className="w-full sm:w-auto flex items-center justify-center gap-3 rounded-full bg-white/[0.03] hover:bg-white/10 px-8 py-5 text-[10px] font-black text-white uppercase border border-white/10 transition-all"
                >
                  <ArrowLeft className="h-4 w-4 text-cyan-400" /> ATRÁS
                </motion.button>
              ) : (
                <div className="hidden sm:block" />
              )}

              <motion.button
                whileHover={{ scale: canNext() ? 1.02 : 1 }}
                whileTap={{ scale: canNext() ? 0.98 : 1 }}
                onClick={(e) => {
                  e.preventDefault();
                  if (!canNext() || isSubmitting || isCompressing) return;
                  if (step < steps.length - 1) setStep(step + 1);
                  else handleSubmit();
                }}
                disabled={!canNext() || isSubmitting || isCompressing}
                className={`w-full sm:w-auto flex items-center justify-center gap-3 rounded-full px-10 py-5 text-[10px] font-black uppercase tracking-[0.2em] transition-all group ${
                  canNext() && !isSubmitting && !isCompressing
                    ? "bg-[#00f2ff] hover:bg-cyan-400 text-[#03070b] shadow-[0_0_20px_rgba(0,242,255,0.4)]"
                    : "bg-white/5 text-white/20 border border-white/5 cursor-not-allowed"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> PROCESANDO...
                  </>
                ) : step < steps.length - 1 ? (
                  <>
                    SIGUIENTE{" "}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                ) : (
                  <>
                    CONFIRMAR REGISTRO <CheckCircle className="h-4 w-4" />
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>

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
              <div className="absolute top-8 right-8 text-white/5 font-black text-6xl select-none pointer-events-none">
                LEGAL
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 mb-6">
                <Shield className="h-3 w-3 text-red-400" />
                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-red-400">
                  Documento Oficial
                </span>
              </div>
              <h3 className="text-3xl font-black text-white mb-8 italic tracking-tighter uppercase">
                DESLINDE DE RESPONSABILIDAD
              </h3>
              <div className="text-sm text-white/50 space-y-6 font-medium leading-relaxed">
                <p>
                  Al procesar esta inscripción en el ecosistema digital de
                  Rayocero Running, el atleta declara:
                </p>
                <div className="p-5 rounded-2xl bg-white/[0.02] border-l-2 border-cyan-400 italic text-white/80">
                  "Me encuentro en óptimas condiciones físicas y asumo total
                  responsabilidad operativa por mi participación."
                </div>
                <ul className="space-y-4">
                  <li className="flex gap-4 items-start">
                    <span className="text-cyan-400 font-black mt-1">01.</span>
                    <span>
                      Sometimiento a protocolos de validación de datos por
                      parte de la ingeniería de Valkyron Group.
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="text-cyan-400 font-black mt-1">02.</span>
                    <span>
                      Aceptación irrevocable del sistema de cronometraje
                      electrónico.
                    </span>
                  </li>
                  <li className="flex gap-4 items-start">
                    <span className="text-cyan-400 font-black mt-1">03.</span>
                    <span>
                      Cesión de derechos de imagen para la plataforma RAYOCERO.
                    </span>
                  </li>
                </ul>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.preventDefault();
                  update("aceptaDeslinde", true);
                  setShowDeslinde(false);
                }}
                className="w-full mt-12 rounded-2xl bg-white text-black py-5 text-[10px] font-black uppercase tracking-[0.3em] shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:bg-gray-200 transition-colors"
              >
                ACEPTO TÉRMINOS Y CONDICIONES
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 10px; }`}</style>
    </section>
  );
};

export default RegistrationForm;
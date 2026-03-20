import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Shield, CheckCircle, ArrowRight, ArrowLeft, Zap, Trophy, Mail, CreditCard } from "lucide-react";

interface FormData {
  nombre: string;
  apellido: string;
  cedula: string;
  email: string;
  telefono: string;
  fechaNacimiento: string;
  genero: string;
  talla: string;
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
  contactoEmergencia: "",
  telefonoEmergencia: "",
  aceptaDeslinde: false,
};

function getAge(dateStr: string): number {
  const today = new Date();
  const birth = new Date(dateStr);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function getCategory(age: number, genero: string): string {
  const g = genero === "M" ? "Masculino" : "Femenino";
  if (age < 18) return `Juvenil ${g}`;
  if (age < 30) return `Abierta ${g}`;
  if (age < 40) return `Sub-Master ${g}`;
  if (age < 50) return `Master A ${g}`;
  if (age < 60) return `Master B ${g}`;
  return `Master C ${g}`;
}

const RegistrationForm = () => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(initialForm);
  const [showDeslinde, setShowDeslinde] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [bibNumber, setBibNumber] = useState<number | null>(null);

  const update = (field: keyof FormData, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  const age = form.fechaNacimiento ? getAge(form.fechaNacimiento) : null;
  const category = age !== null && form.genero ? getCategory(age, form.genero) : null;

  const canNext = () => {
    if (step === 0) return form.nombre && form.apellido && form.cedula && form.email;
    if (step === 1) return form.fechaNacimiento && form.genero && form.talla;
    if (step === 2) return form.contactoEmergencia && form.telefonoEmergencia && form.aceptaDeslinde;
    return false;
  };

  const handleSubmit = () => {
    setBibNumber(Math.floor(Math.random() * 9000) + 1000);
    setSubmitted(true);
  };

  // Evolución de clase: Vidrio esmerilado con bordes reactivos
  const inputClass =
    "w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 focus:bg-white/10 transition-all backdrop-blur-md";

  const steps = [
    {
      title: "Identificación de Atleta",
      icon: <User className="h-5 w-5 text-white" />,
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input className={inputClass} placeholder="Nombre" value={form.nombre} onChange={(e) => update("nombre", e.target.value)} />
          <input className={inputClass} placeholder="Apellido" value={form.apellido} onChange={(e) => update("apellido", e.target.value)} />
          <div className="relative">
            <CreditCard className="absolute right-3 top-3 h-4 w-4 text-white/20" />
            <input className={inputClass} placeholder="Cédula / ID" value={form.cedula} onChange={(e) => update("cedula", e.target.value)} />
          </div>
          <div className="relative">
            <Mail className="absolute right-3 top-3 h-4 w-4 text-white/20" />
            <input className={inputClass} placeholder="Email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
          </div>
          <input className={inputClass} placeholder="Teléfono" value={form.telefono} onChange={(e) => update("telefono", e.target.value)} />
        </div>
      ),
    },
    {
      title: "Categoría & Logística",
      icon: <Trophy className="h-5 w-5 text-white" />,
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-white/50 mb-2 block">Fecha de Nacimiento</label>
              <input className={inputClass} type="date" value={form.fechaNacimiento} onChange={(e) => update("fechaNacimiento", e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-white/50 mb-2 block">Género</label>
              <select className={inputClass} value={form.genero} onChange={(e) => update("genero", e.target.value)}>
                <option value="" className="bg-[#000a12]">Seleccionar</option>
                <option value="M" className="bg-[#000a12]">Masculino</option>
                <option value="F" className="bg-[#000a12]">Femenino</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-[10px] uppercase tracking-widest text-white/50 mb-2 block">Talla de Camiseta (Oficial Rayo Cero)</label>
              <select className={inputClass} value={form.talla} onChange={(e) => update("talla", e.target.value)}>
                <option value="" className="bg-[#000a12]">Seleccionar talla</option>
                <option value="XS" className="bg-[#000a12]">XS</option>
                <option value="S" className="bg-[#000a12]">S</option>
                <option value="M" className="bg-[#000a12]">M</option>
                <option value="L" className="bg-[#000a12]">L</option>
                <option value="XL" className="bg-[#000a12]">XL</option>
              </select>
            </div>
          </div>
          {category && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 border border-white/10 p-6 rounded-2xl text-center backdrop-blur-xl"
            >
              <p className="text-[10px] uppercase tracking-widest text-white/40 mb-2">Validación de Categoría Automática [cite: 8]</p>
              <p className="text-2xl font-black text-white">{category}</p>
              {age !== null && <p className="text-xs text-white/60 mt-2 italic">Atleta verificado: {age} años</p>}
            </motion.div>
          )}
        </div>
      ),
    },
    {
      title: "Seguridad & Deslinde Legal",
      icon: <Shield className="h-5 w-5 text-white" />,
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input className={inputClass} placeholder="Contacto de Emergencia" value={form.contactoEmergencia} onChange={(e) => update("contactoEmergencia", e.target.value)} />
            <input className={inputClass} placeholder="Teléfono Emergencia" value={form.telefonoEmergencia} onChange={(e) => update("telefonoEmergencia", e.target.value)} />
          </div>
          <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-start gap-4">
            <input
              type="checkbox"
              checked={form.aceptaDeslinde}
              onChange={(e) => update("aceptaDeslinde", e.target.checked)}
              className="mt-1 h-5 w-5 rounded border-white/20 bg-white/5 text-white focus:ring-white/20"
            />
            <p className="text-sm text-white/70 leading-relaxed">
              Confirmo que he leído y acepto el{" "}
              <button onClick={() => setShowDeslinde(true)} className="text-white font-bold underline decoration-white/30 hover:decoration-white transition-all">
                Deslinde de Responsabilidad [cite: 10]
              </button>{" "}
              y los términos operativos de Valkyron Group para este evento.
            </p>
          </div>
        </div>
      ),
    },
  ];

  if (submitted && bibNumber) {
    return (
      <section id="register" className="relative py-32 px-6 bg-[#000a12] min-h-screen flex items-center">
        <div className="max-w-lg mx-auto text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white/5 border border-white/10 p-12 rounded-[40px] backdrop-blur-2xl shadow-2xl"
          >
            <div className="relative inline-block mb-8">
              <motion.div className="absolute inset-0 rounded-full bg-white/20 animate-ping" />
              <CheckCircle className="h-20 w-20 text-white relative z-10" />
            </div>
            <h2 className="text-4xl font-black text-white mb-4 italic tracking-tighter">REGISTRO COMPLETADO</h2>
            <p className="text-white/50 mb-8 uppercase tracking-[0.2em] text-xs font-bold">Tu Número de Dorsal Oficial [cite: 14]</p>
            <div className="text-8xl font-black text-white mb-6 tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">{bibNumber}</div>
            <div className="space-y-2 border-t border-white/10 pt-6">
              <p className="text-[10px] text-white/30 font-mono uppercase">
                Valkyron Secure-ID: {btoa(bibNumber.toString()).substring(0, 12)}
              </p>
              <p className="text-[10px] text-white/30 font-mono uppercase">
                TS: {new Date().toISOString()} [cite: 10]
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section id="register" className="relative py-32 px-6 bg-[#000a12]">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tighter italic">
              INSCRIPCIÓN <span className="text-white/30">OPERATIVA</span>
            </h2>
            <div className="h-1 w-20 bg-white/20 mx-auto" />
          </div>

          {/* Progress: Apple Style */}
          <div className="flex items-center justify-center gap-4 mb-16">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-black transition-all duration-500 ${i <= step ? "bg-white text-[#000a12]" : "bg-white/10 text-white/30 border border-white/5"}`}>
                  {i < step ? <CheckCircle className="h-5 w-5" /> : i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-12 md:w-20 h-[2px] transition-all duration-700 ${i < step ? "bg-white" : "bg-white/10"}`} />
                )}
              </div>
            ))}
          </div>

          {/* Form card: Liquid Glass */}
          <div className="bg-white/5 border border-white/10 p-8 md:p-12 rounded-[32px] backdrop-blur-xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
                <Zap className="h-24 w-24 text-white" />
            </div>
            
            <div className="flex items-center gap-4 mb-10 border-b border-white/10 pb-6">
              <div className="p-3 bg-white/10 rounded-2xl">
                {steps[step].icon}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white uppercase tracking-wider">{steps[step].title}</h3>
                <p className="text-xs text-white/40 font-medium">Módulo de ingeniería Rayo Cero [cite: 37]</p>
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

            <div className="flex justify-between mt-12 pt-8 border-t border-white/10">
              {step > 0 ? (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setStep(step - 1)}
                  className="flex items-center gap-2 rounded-full bg-white/5 hover:bg-white/10 px-8 py-4 text-sm font-bold text-white border border-white/10 transition-all"
                >
                  <ArrowLeft className="h-4 w-4" /> ATRÁS
                </motion.button>
              ) : <div />}
              
              <motion.button
                whileHover={{ scale: canNext() ? 1.02 : 1 }}
                whileTap={{ scale: canNext() ? 0.98 : 1 }}
                onClick={() => {
                  if (!canNext()) return;
                  if (step < steps.length - 1) setStep(step + 1);
                  else handleSubmit();
                }}
                disabled={!canNext()}
                className={`flex items-center gap-3 rounded-full px-10 py-4 text-sm font-black transition-all ${canNext() ? "bg-white text-[#000a12] shadow-xl shadow-white/10" : "bg-white/5 text-white/20 border border-white/5 cursor-not-allowed"}`}
              >
                {step < steps.length - 1 ? (
                  <>SIGUIENTE <ArrowRight className="h-4 w-4" /></>
                ) : (
                  <>CONFIRMAR REGISTRO <CheckCircle className="h-4 w-4" /></>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Deslinde Modal: High-Security Liquid Glass */}
      <AnimatePresence>
        {showDeslinde && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#000a12]/80 backdrop-blur-md"
            onClick={() => setShowDeslinde(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#001F3F] border border-white/20 p-10 rounded-[40px] max-w-xl w-full max-h-[85vh] overflow-y-auto shadow-2xl relative"
            >
              <div className="absolute top-6 right-8 text-white/10 font-black text-4xl">LEGAL</div>
              <h3 className="text-2xl font-black text-white mb-6 italic tracking-tighter">DESLINDE DE RESPONSABILIDAD [cite: 10]</h3>
              <div className="text-sm text-white/70 space-y-4 font-medium leading-relaxed">
                <p>Al procesar esta inscripción en el ecosistema digital de Rayo Cero Running, el atleta declara[cite: 31]:</p>
                <p className="pl-4 border-l-2 border-white/20 italic">"Me encuentro en condiciones físicas de alto rendimiento y asumo total responsabilidad por mi participación..."</p>
                <ul className="space-y-3">
                  <li className="flex gap-3"><span className="text-white font-bold">01.</span> Validación de datos en tiempo real bajo protocolos de Valkyron Group[cite: 8].</li>
                  <li className="flex gap-3"><span className="text-white font-bold">02.</span> Aceptación de cronometraje electrónico por chip[cite: 32].</li>
                  <li className="flex gap-3"><span className="text-white font-bold">03.</span> Protección de datos personales bajo estándares internacionales[cite: 21].</li>
                </ul>
              </div>
              <div className="mt-8 p-4 bg-white/5 rounded-xl border border-white/10">
                <p className="text-[10px] font-mono text-white/40 uppercase tracking-tighter">Registro de Seguridad Digital:</p>
                <p className="text-[10px] font-mono text-white/60">VALID_ACCEPT_TS_{new Date().getTime()}</p>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => { update("aceptaDeslinde", true); setShowDeslinde(false); }}
                className="w-full mt-10 rounded-full bg-white py-5 text-sm font-black text-[#001F3F] shadow-2xl"
              >
                ACEPTO TÉRMINOS Y CONDICIONES
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default RegistrationForm;
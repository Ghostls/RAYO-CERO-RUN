/**
 * RAYOCERO — REGISTRATION TERMINAL (STABLE BUILD V36.6_PET_DATA)
 * Senior Dev: MIA (Valkyron Group)
 * CEO: Lualdo Sciscioli
 * Architecture: React / TypeScript / Supabase / React Query / Framer Motion
 * REGLA DE ORO: Evolución sin Destrucción. Código completo. Copy-paste ready.
 *
 * CHANGELOG V36.5 (base):
 * [V36.5-1] BASE: Fusión limpia de V36.3 (estructura) + V36.4 (lógica dual).
 * [V36.5-2] BUG FIX: Corregidos tipos genéricos malformados de V36.4.
 * [V36.5-3] BUG FIX: JSX props corregidas en <RegistrationFormActive>.
 * [V36.5-4] EVOLUCIÓN: Selector de modalidad con getModalidadMeta() por item.
 * [V36.5-5] EVOLUCIÓN: categoria useMemo diferenciada por modalidad.
 * [V36.5-6] EVOLUCIÓN: Label botón y onSuccess diferenciado por modalidad === "5K".
 * [V36.5-7] PRESERVADO: Tarjeta dinámica de pago cfg.pago.
 * [V36.5-8] PRESERVADO: Compresión y upload de comprobante en Supabase Storage.
 *
 * CHANGELOG V36.6:
 * [V36.6-1] NUEVO TIPO: `PetData` — interfaz para datos del perro (nombre + raza).
 * [V36.6-2] NUEVO TIPO: `RAZAS_COMUNES` — catálogo extensible de razas de perro.
 * [V36.6-3] EVOLUCIÓN: Estados `nombrePerro` y `razaPerro` añadidos a RegistrationFormActive.
 * [V36.6-4] EVOLUCIÓN: Sección "Datos de tu Mascota" animada con AnimatePresence/motion.div,
 *            aparece condicionalmente cuando modalidad === "5K", desaparece al cambiar a 10K.
 * [V36.6-5] EVOLUCIÓN: Validación en handleSubmit — si 5K, nombre y raza del perro son requeridos.
 * [V36.6-6] EVOLUCIÓN: payload extendido con nombrePerro y razaPerro cuando modalidad === "5K".
 * [V36.6-7] EVOLUCIÓN: onSuccess para 5K incluye parámetros de mascota en la URL de confirmación.
 */

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Shield, CheckCircle, Trophy, Mail, CreditCard,
  Loader2, AlertCircle, Home, Banknote, UploadCloud,
  Accessibility, RefreshCw, Download, Lock, Bell,
  ChevronRight, Flag, Timer, Users, MapPin, Gift, Dog, Calendar, Check, Copy
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import imageCompression from "browser-image-compression";

import { registerRunner, calcularEdad, type RegistrationFormData } from "@/lib/api";
import { supabase } from "@/lib/supabase";

import logoPrincipal from "../assets/logo.png";
import dorsalCoroSrc from "../assets/dorsal-coro.png";

// [V36.3-PRESERVADO] Fallback seguro para asset opcional de caninata
let dorsalCaninataSrc: string = dorsalCoroSrc;
try { dorsalCaninataSrc = require("../assets/dorsal-caninata.png").default; } catch (_) {}

// ---------------------------------------------------------------------------
// TIPOS
// ---------------------------------------------------------------------------

type Modalidad = "10K" | "4K" | "5K";

interface ActiveRace {
  id: string;
  name: string;
  slug: string | null;
  date: string;
  time: string | null;
  location: string | null;
  inscripciones_abiertas: boolean;
}

interface RaceStaticConfig {
  tipo: "carrera" | "caninata";
  modalidadesDisponibles: Modalidad[];
  evento: {
    nombre: string; fecha: string; hora: string; distancia: string;
    atletas: string; lugar: string; proximaEd: string; targetDate: Date;
  };
  pago: { titular: string; cedula: string; pagoMovil: string; banco: string; cuenta: string; };
}

/**
 * [V36.6-1] Datos de mascota — separados del formulario principal para tipado estricto.
 * Se incluyen en el payload únicamente cuando modalidad === "5K".
 */
interface PetData {
  nombrePerro: string;
  razaPerro: string;
}

/**
 * [V36.6-2] Catálogo de razas — extensible sin tocar el JSX.
 * Ordenadas por prevalencia en Venezuela + internacionales comunes.
 */
const RAZAS_COMUNES: string[] = [
  "Mestizo / Criollo",
  "Labrador Retriever",
  "Golden Retriever",
  "Pastor Alemán",
  "Bulldog Francés",
  "Poodle / Caniche",
  "Beagle",
  "Chihuahua",
  "Schnauzer",
  "Dachshund / Salchicha",
  "Rottweiler",
  "Doberman",
  "Pitbull / American Stafford",
  "Shih Tzu",
  "Yorkshire Terrier",
  "Maltés",
  "Bichón Frisé",
  "Boxer",
  "Husky Siberiano",
  "Border Collie",
  "Cocker Spaniel",
  "Pomerania",
  "Jack Russell Terrier",
  "Otra raza",
];

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

const isCaninataRace = (name: string = ""): boolean =>
  name.toLowerCase().includes("caninata");

/**
 * [V36.5-4] Determina ícono y label textual de cada modalidad de forma individual.
 * Extensible: agregar "3K", "21K", etc. sin tocar el selector JSX.
 */
const getModalidadMeta = (m: Modalidad): { label: string; Icon: React.ElementType } => {
  switch (m) {
    case "5K":  return { label: "5K CANINATA",  Icon: Dog };
    case "4K":  return { label: "4K CARRERA",   Icon: Flag };
    case "10K": return { label: "10K CARRERA",  Icon: Timer };
    default:    return { label: `${m} CARRERA`, Icon: Timer };
  }
};

// ---------------------------------------------------------------------------
// CONFIGS ESTÁTICAS
// ---------------------------------------------------------------------------

const CORO_CONFIG: RaceStaticConfig = {
  tipo: "carrera",
  modalidadesDisponibles: ["10K", "4K"],
  evento: {
    nombre: "499 RUN — CORO FALCÓN", fecha: "29 AGO 2026", hora: "06:00 PM",
    distancia: "10K / 4K", atletas: "+500", lugar: "CENTRO HISTÓRICO DE CORO",
    proximaEd: "TEMPORADA 2026", targetDate: new Date("2026-08-29T18:00:00"),
  },
  pago: {
    titular: "Rayocero", cedula: "17.627.699",
    pagoMovil: "0414-5643372", banco: "Banco Nacional de Crédito (BNC)", cuenta: "",
  },
};

// [V36.4-PRESERVADO] Modalidades duales habilitadas para Caninata
const CANINATA_CONFIG: RaceStaticConfig = {
  tipo: "caninata",
  modalidadesDisponibles: ["10K", "5K"],
  evento: {
    nombre: "CANINATA BARQUISIMETO", fecha: "4 OCT 2026", hora: "07:00 AM",
    distancia: "10K / 5K CANINATA", atletas: "+300", lugar: "LIDOTEL BARQUISIMETO",
    proximaEd: "TEMPORADA 2026", targetDate: new Date("2026-10-04T07:00:00"),
  },
  pago: {
    titular: "V-5.245.463", cedula: "5.245.463", pagoMovil: "0414-5192879",
    banco: "Banco de Venezuela / Banco Mercantil",
    cuenta: "Zelle: piolas.art@gmail.com | Soporte: 0412-1394596",
  },
};

const getRaceCfg = (race: ActiveRace | null): RaceStaticConfig => {
  if (race && isCaninataRace(race.name)) return CANINATA_CONFIG;
  return CORO_CONFIG;
};

// ---------------------------------------------------------------------------
// HOOK: useTargetRace
// [V36.5-2] BUG FIX: tipo genérico corregido `<ActiveRace | null | undefined>`
// ---------------------------------------------------------------------------

const useTargetRace = () => {
  const [searchParams] = useSearchParams();
  const raceIdParam = searchParams.get("race");

  // ✅ V36.5-2: Tipo genérico correctamente formado (V36.4 tenía `<ActiveRace null undefined |>`)
  const [race, setRace]               = useState<ActiveRace | null | undefined>(undefined);
  const [activeRaces, setActiveRaces] = useState<ActiveRace[]>([]);

  useEffect(() => {
    (async () => {
      try {
        if (raceIdParam) {
          const { data: d } = await supabase
            .from("races")
            .select("id,name,slug,date,time,location,inscripciones_abiertas")
            .eq("id", raceIdParam)
            .maybeSingle();
          setRace((d as ActiveRace) ?? null);
        } else {
          const { data: list } = await supabase
            .from("races")
            .select("id,name,slug,date,time,location,inscripciones_abiertas")
            .eq("inscripciones_abiertas", true)
            .order("date", { ascending: true });
          setActiveRaces((list as ActiveRace[]) || []);
          setRace(null);
        }
      } catch (err) {
        setRace(null);
      }
    })();
  }, [raceIdParam]);

  return { race, setRace, activeRaces };
};

// ---------------------------------------------------------------------------
// FUNCIÓN: calcularCategoria
// [V36.3-PRESERVADO] Sin modificaciones
// ---------------------------------------------------------------------------

const calcularCategoria = (edad: number, genero: "M" | "F", movilidadReducida: boolean): string => {
  const g = genero === "M" ? "Masculino" : "Femenino";
  if (movilidadReducida)             return "Movilidad Reducida";
  if (edad < 16)                     return `Junior ${g}`;
  if (edad >= 16 && edad <= 19)      return `Juvenil ${g}`;
  if (edad >= 20 && edad <= 29)      return `Libre ${g}`;
  if (edad >= 30 && edad <= 34)      return `Sub Master (30-34) ${g}`;
  if (edad >= 35 && edad <= 39)      return `Sub Master (35-39) ${g}`;
  if (edad >= 40 && edad <= 49)      return `Master A ${g}`;
  if (edad >= 50 && edad <= 59)      return `Master B ${g}`;
  if (edad >= 60 && edad <= 69)      return `Master C ${g}`;
  if (edad >= 70 && edad <= 79)      return `Master D ${g}`;
  return `Absoluto ${g}`;
};

// ---------------------------------------------------------------------------
// COMPONENTE RAÍZ: RegistrationForm
// [V36.5-3] BUG FIX: JSX props de <RegistrationFormActive> corregidas (V36.4 las tenía como strings)
// ---------------------------------------------------------------------------

export default function RegistrationForm() {
  const { race, setRace, activeRaces } = useTargetRace();
  const [, setSearchParams] = useSearchParams();

  if (race === undefined) {
    return (
      <div className="min-h-screen bg-[#03070b] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#00f2ff]" />
      </div>
    );
  }

  if (!race) {
    return (
      <div className="min-h-screen bg-[#03070b] text-white pt-28 pb-20 px-4 font-sans flex flex-col items-center">
        <div className="max-w-4xl w-full text-center mb-10">
          <span className="text-[#00f2ff] text-xs font-bold tracking-[0.2em] uppercase">
            Terminal de Inscripciones
          </span>
          <h1 className="text-4xl sm:text-6xl font-black italic uppercase mt-2">SELECCIONA TU EVENTO</h1>
          <p className="text-white/40 text-sm mt-2">Elige el evento en el que deseas participar hoy.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
          {activeRaces.map((r) => {
            const isCan = isCaninataRace(r.name);
            const color = isCan ? "#FDD454" : "#00f2ff";
            return (
              <motion.div
                key={r.id}
                whileHover={{ scale: 1.02 }}
                onClick={() => {
                  setRace(r);
                  setSearchParams({ race: r.id });
                }}
                className="cursor-pointer bg-white/[0.02] border border-white/10 hover:border-white/20 rounded-3xl p-6 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span
                      className="px-3 py-1 rounded-full text-[10px] font-black uppercase"
                      style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}
                    >
                      {isCan ? "10K CARRERA / 5K CANINATA" : "CARRERA OFICIAL 10K / 4K"}
                    </span>
                    <ChevronRight className="h-5 w-5 text-white/30" />
                  </div>
                  <h2 className="text-2xl font-black italic uppercase text-white mb-2">{r.name}</h2>
                  <div className="space-y-1.5 text-xs text-white/50 mb-6">
                    <p className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-white/40" /> {r.date}
                    </p>
                    <p className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-white/40" /> {r.location || "Venezuela"}
                    </p>
                  </div>
                </div>
                <button
                  className="w-full py-3 rounded-xl font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 transition-all"
                  style={{ background: color, color: "#03070b" }}
                >
                  INICIAR REGISTRO <ChevronRight className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }

  const raceCfg = getRaceCfg(race);

  // ✅ V36.5-3: Props tipadas correctamente, sin conversión a string literal
  return (
    <RegistrationFormActive
      race={race}
      cfg={raceCfg}
      onResetRace={() => setRace(null)}
    />
  );
}

// ---------------------------------------------------------------------------
// COMPONENTE: RegistrationFormActive
// ---------------------------------------------------------------------------

function RegistrationFormActive({
  race,
  cfg,
  onResetRace,
}: {
  race: ActiveRace;
  cfg: RaceStaticConfig;
  onResetRace: () => void;
}) {
  const navigate = useNavigate();
  const isCaninataRaceType = cfg.tipo === "caninata";
  const accentColor = isCaninataRaceType ? "#FDD454" : "#00f2ff";

  const [modalidad, setModalidad]             = useState<Modalidad>(cfg.modalidadesDisponibles[0]);
  const [nombre, setNombre]                   = useState("");
  const [apellido, setApellido]               = useState("");
  const [cedula, setCedula]                   = useState("");
  const [email, setEmail]                     = useState("");
  const [telefono, setTelefono]               = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [genero, setGenero]                   = useState<"M" | "F">("M");
  const [talla, setTalla]                     = useState<RegistrationFormData["talla"]>("M");
  const [movilidadReducida, setMovilidadReducida] = useState(false);
  const [monto, setMonto]                     = useState("");
  const [referencia, setReferencia]           = useState("");

  // ✅ V36.5-2: Tipo genérico corregido (V36.4 tenía `<File null |>`)
  const [fileComprobante, setFileComprobante] = useState<File | null>(null);

  // [V36.6-3] Estados de mascota — activos solo cuando modalidad === "5K"
  const [nombrePerro, setNombrePerro] = useState<string>("");
  const [razaPerro,   setRazaPerro]   = useState<string>(RAZAS_COMUNES[0]);

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [uploading, setUploading]     = useState(false);
  const [formError, setFormError]     = useState<string | null>(null);

  const edad = useMemo(
    () => (fechaNacimiento ? calcularEdad(fechaNacimiento) : 0),
    [fechaNacimiento]
  );

  /**
   * [V36.5-5] Categoría diferenciada por modalidad:
   * - "5K" → Caninata/Familiar (sin calificación etaria)
   * - Cualquier otra ("10K", "4K") → calcula por edad, género y movilidad reducida
   */
  const categoria = useMemo(() => {
    if (modalidad === "5K") return "Caminata Canina / Familiar";
    return calcularCategoria(edad, genero, movilidadReducida);
  }, [edad, genero, movilidadReducida, modalidad]);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  /**
   * [V36.5-6] onSuccess diferenciado por `modalidad === "5K"`:
   * - 5K → comprobante caninata (sin dorsal BIB)
   * - 10K / 4K → confirmación con BIB asignado
   * Permite que evento tipo "caninata" inscriba 10K con dorsal completo.
   */
  const mutation = useMutation({
    mutationFn: registerRunner,
    onSuccess: (data) => {
      if (modalidad === "5K") {
        // [V36.6-7] URL de confirmación incluye datos de mascota para personalizar la pantalla
        navigate(
          `/confirmacion?tipo=caninata` +
          `&ref=${encodeURIComponent(referencia)}` +
          `&nombre=${encodeURIComponent(nombre)}` +
          `&perro=${encodeURIComponent(nombrePerro.trim())}` +
          `&raza=${encodeURIComponent(razaPerro)}`
        );
      } else {
        navigate(
          `/confirmacion?bib=${data.bib_number}&categoria=${encodeURIComponent(data.categoria)}`
        );
      }
    },
    onError: (err: any) => {
      setFormError(err?.message || "Error al procesar la inscripción.");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!nombre || !apellido || !cedula || !email || !referencia) {
      setFormError("Por favor completa todos los campos obligatorios.");
      return;
    }

    // [V36.6-5] Validación de mascota: requerida solo en modalidad Caninata 5K
    if (modalidad === "5K" && !nombrePerro.trim()) {
      setFormError("Por favor ingresa el nombre de tu mascota.");
      return;
    }

    try {
      setUploading(true);
      let comprobanteUrl = "";

      // [V36.3-PRESERVADO] Compresión y upload de comprobante intactos
      if (fileComprobante) {
        const compressed = await imageCompression(fileComprobante, {
          maxSizeMB: 0.8,
          maxWidthOrHeight: 1200,
        });
        const filePath = `comprobantes/${Date.now()}_${cedula}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("payments")
          .upload(filePath, compressed);
        if (upErr) throw upErr;
        comprobanteUrl = supabase.storage
          .from("payments")
          .getPublicUrl(filePath).data.publicUrl;
      }

      // [V36.6-6] Datos de mascota inyectados en payload solo para modalidad 5K
      const petFields: Partial<PetData> = modalidad === "5K"
        ? { nombrePerro: nombrePerro.trim(), razaPerro }
        : {};

      const payload: RegistrationFormData = {
        nombre,
        apellido,
        cedula,
        email,
        telefono,
        fechaNacimiento: fechaNacimiento || "2000-01-01",
        genero,
        talla,
        movilidadReducida,
        categoria,
        monto: monto || "0",
        referenciaPago: referencia,
        contactoEmergencia: "N/A",
        telefonoEmergencia: "N/A",
        aceptaDeslinde: true,
        race_id: race.id,
        modalidad,
        ...petFields,
      } as RegistrationFormData & Partial<PetData>;

      await mutation.mutateAsync(payload);
    } catch (err: any) {
      setFormError(err?.message || "Error subiendo comprobante o registrando inscripción.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#03070b] text-white pt-24 pb-20 px-4 font-sans flex flex-col items-center">
      <div className="max-w-3xl w-full">
        <button
          onClick={onResetRace}
          className="mb-6 text-xs text-white/40 hover:text-white transition-colors flex items-center gap-1 uppercase font-bold"
        >
          ← Cambiar de evento
        </button>

        <div className="text-center mb-8">
          <span
            className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
            style={{
              background: `${accentColor}15`,
              color: accentColor,
              border: `1px solid ${accentColor}30`,
            }}
          >
            {race.name}
          </span>
          <h1 className="text-4xl font-black italic uppercase mt-3">FORMULARIO DE INSCRIPCIÓN</h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white/[0.02] border border-white/10 rounded-3xl p-6 sm:p-10 space-y-6"
        >
          {formError && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* ----------------------------------------------------------------
              SELECTOR DE MODALIDAD / DISTANCIA
              [V36.5-4] Ícono y label derivados de getModalidadMeta(m) por item,
              no hardcodeado a `m === "5K"`. Extensible sin tocar JSX.
          ---------------------------------------------------------------- */}
          <div className="space-y-2 pb-2">
            <label className="text-xs font-bold uppercase text-white/60 block">
              Modalidad / Distancia
            </label>
            <div className="grid grid-cols-2 gap-3">
              {cfg.modalidadesDisponibles.map((m) => {
                const isSelected = modalidad === m;
                const { label, Icon } = getModalidadMeta(m); // ✅ V36.5-4
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setModalidad(m)}
                    className={`py-3.5 px-4 rounded-xl text-xs font-black uppercase border transition-all flex items-center justify-center gap-2 ${
                      isSelected
                        ? "border-transparent text-black shadow-lg"
                        : "border-white/10 bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
                    }`}
                    style={isSelected ? { background: accentColor } : undefined}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* DATOS PERSONALES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-white/60 mb-1 block">Nombre</label>
              <input
                type="text" value={nombre}
                onChange={e => setNombre(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/30"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-white/60 mb-1 block">Apellido</label>
              <input
                type="text" value={apellido}
                onChange={e => setApellido(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-white/60 mb-1 block">Cédula</label>
              <input
                type="text" value={cedula}
                onChange={e => setCedula(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/30"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-white/60 mb-1 block">Correo Electrónico</label>
              <input
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-white/60 mb-1 block">Teléfono</label>
              <input
                type="text" value={telefono}
                onChange={e => setTelefono(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/30"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-white/60 mb-1 block">Fecha de Nacimiento</label>
              <input
                type="date" value={fechaNacimiento}
                onChange={e => setFechaNacimiento(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/30"
              />
            </div>
          </div>

          {/* ----------------------------------------------------------------
              SECCIÓN MASCOTA — [V36.6-4]
              Aparece con animación suave solo cuando modalidad === "5K".
              AnimatePresence gestiona el mount/unmount del bloque completo.
          ---------------------------------------------------------------- */}
          <AnimatePresence>
            {modalidad === "5K" && (
              <motion.div
                key="pet-section"
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 0 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="pt-6 border-t border-[#FDD454]/20 space-y-4">
                  {/* Header de sección */}
                  <h3 className="text-sm font-bold uppercase text-white/80 flex items-center gap-2">
                    <Dog className="h-4 w-4 text-[#FDD454]" />
                    Datos de tu Mascota
                    <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#FDD454]/10 text-[#FDD454] border border-[#FDD454]/20">
                      REQUERIDO
                    </span>
                  </h3>

                  <div className="p-5 rounded-2xl bg-[#FDD454]/[0.03] border border-[#FDD454]/15 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Nombre del perro */}
                      <div>
                        <label className="text-xs font-bold uppercase text-white/60 mb-1 block">
                          Nombre del Perro
                        </label>
                        <input
                          type="text"
                          value={nombrePerro}
                          onChange={e => setNombrePerro(e.target.value)}
                          placeholder="Ej: Rocky, Luna, Mochi..."
                          maxLength={40}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FDD454]/40 transition-colors placeholder:text-white/20"
                        />
                      </div>

                      {/* Raza — select con catálogo RAZAS_COMUNES */}
                      <div>
                        <label className="text-xs font-bold uppercase text-white/60 mb-1 block">
                          Raza
                        </label>
                        <select
                          value={razaPerro}
                          onChange={e => setRazaPerro(e.target.value)}
                          className="w-full bg-[#0d1117] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FDD454]/40 transition-colors appearance-none cursor-pointer"
                        >
                          {RAZAS_COMUNES.map((raza) => (
                            <option key={raza} value={raza}>
                              {raza}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Aviso informativo */}
                    <p className="text-[11px] text-white/30 flex items-start gap-1.5 pt-1">
                      <Dog className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[#FDD454]/50" />
                      Los datos de tu mascota aparecerán en el comprobante de inscripción.
                      Asegúrate de que tu perro cuente con correa durante el evento.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ----------------------------------------------------------------
              TARJETA DINÁMICA DE DATOS DE PAGO BANCARIO
              [V36.3-PRESERVADO] cfg.pago sin modificaciones
          ---------------------------------------------------------------- */}
          <div className="pt-6 border-t border-white/10 space-y-4">
            <h3 className="text-sm font-bold uppercase text-white/80 flex items-center gap-2">
              <Banknote className="h-4 w-4 text-emerald-400" />
              Datos Bancarios para Pago / Transferencia
            </h3>

            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-white/40 block">Banco:</span>
                  <span className="font-bold text-white/90">{cfg.pago.banco}</span>
                </div>
                <div>
                  <span className="text-white/40 block">Titular:</span>
                  <span className="font-bold text-white/90">{cfg.pago.titular}</span>
                </div>
                <div>
                  <span className="text-white/40 block">Cédula / RIF:</span>
                  <span className="font-bold text-white/90">{cfg.pago.cedula}</span>
                </div>
                <div className="flex items-center justify-between bg-white/5 p-2 rounded-lg border border-white/10">
                  <div>
                    <span className="text-white/40 block text-[10px]">Pago Móvil / Teléfono:</span>
                    <span className="font-mono font-bold text-emerald-400">{cfg.pago.pagoMovil}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(cfg.pago.pagoMovil, "pm")}
                    className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-white/60"
                  >
                    {copiedField === "pm"
                      ? <Check className="h-3.5 w-3.5 text-emerald-400" />
                      : <Copy className="h-3.5 w-3.5" />
                    }
                  </button>
                </div>
              </div>

              {cfg.pago.cuenta && (
                <div className="pt-2 border-t border-white/5 text-xs text-white/60">
                  <span className="font-bold text-white/80">Opciones Adicionales / Zelle:</span>
                  <p className="mt-0.5">{cfg.pago.cuenta}</p>
                </div>
              )}
            </div>

            {/* CAMPOS DE CONFIRMACIÓN DE PAGO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-xs font-bold uppercase text-white/60 mb-1 block">
                  Referencia de Pago
                </label>
                <input
                  type="text" value={referencia}
                  onChange={e => setReferencia(e.target.value)}
                  placeholder="Ej: 849204"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/30"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-white/60 mb-1 block">
                  Comprobante (Imagen)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setFileComprobante(e.target.files?.[0] || null)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white/50 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white"
                />
              </div>
            </div>
          </div>

          {/*
            [V36.5-6] Label del botón dinámico: "COMPROBANTE CANINATA" si 5K,
            "PROCESAR INSCRIPCIÓN (Xk)" para cualquier otra modalidad con dorsal BIB.
          */}
          <button
            type="submit"
            disabled={uploading || mutation.isPending}
            className="w-full py-4 rounded-xl font-black uppercase text-sm tracking-wider flex items-center justify-center gap-2 transition-all mt-6"
            style={{ background: accentColor, color: "#03070b" }}
          >
            {(uploading || mutation.isPending) ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : modalidad === "5K" ? (
              <>
                <Dog className="h-5 w-5" />
                PROCESAR Y GENERAR COMPROBANTE CANINATA
              </>
            ) : (
              <>
                <Flag className="h-5 w-5" />
                {`PROCESAR INSCRIPCIÓN (${modalidad})`}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
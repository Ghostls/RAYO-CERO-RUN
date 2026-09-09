/**
 * RAYOCERO — CANINATA CLIENT DASHBOARD (V1.2 — PAGO + KIT TOGGLE)
 * Senior Dev: MIA (Valkyron Group)
 * CEO: Lualdo Sciscioli
 *
 * CHANGELOG V1.2 (evoluciona sobre V1.1):
 * [V1.2-1] togglePago() — verifica/desverifica pago desde el dashboard cliente.
 * [V1.2-2] toggleKit()  — marca/desmarca kit entregado desde el dashboard cliente.
 * [V1.2-3] Botones inline en tabla con feedback visual inmediato.
 * [V1.2-4] Estado optimista — UI actualiza antes de confirmar Supabase.
 *
 * CHANGELOG V1.1:
 * [V1.1-1] Columna Teléfono añadida.
 *
 * CHANGELOG V1.0:
 * [V1.0-1] PIN gate — CANINATA2026, persiste en localStorage.
 * [V1.0-2] Carga automática de la carrera caninata activa.
 * [V1.0-3] Tabla atletas, TasaConfig, buscador, contadores.
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  Dog, LogOut, Search, ShieldCheck, RefreshCw,
  Save, CheckCircle, Users, AlertCircle, Loader2,
  Eye, EyeOff, Lock, Phone, Gift, Shield,
} from "lucide-react";

// ─── CONSTANTES ──────────────────────────────────────────────────────────────
const PIN_CORRECTO = "CANINATA2026";
const LS_KEY       = "caninata_dash_auth";
const YELLOW       = "#FDD454";
const BG           = "#080f08";

// ─── TIPOS ───────────────────────────────────────────────────────────────────
interface Atleta {
  id             : string;
  nombre         : string;
  apellido       : string;
  cedula         : string;
  telefono?      : string;
  modalidad?     : string;
  categoria?     : string;
  bib_number?    : string | number;
  pago_verificado: boolean;
  kit_entregado  : boolean;
  talla_camiseta?: string;
  created_at     : string;
}

interface CaninatRace {
  id  : string;
  name: string;
}

// ─── TASACONFIG EMBEBIDA ─────────────────────────────────────────────────────
const TasaConfigCaninata = ({ raceId }: { raceId: string }) => {
  const [tasaBCV,    setTasaBCV]    = useState("");
  const [costo10k,   setCosto10k]   = useState("");
  const [costo5k,    setCosto5k]    = useState("");
  const [configId,   setConfigId]   = useState<number | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      let data: any = null;
      const { data: d } = await supabase
        .from("system_config")
        .select("*")
        .eq("race_id", raceId)
        .maybeSingle();
      data = d;
      if (!data) {
        const { data: fb } = await supabase
          .from("system_config")
          .select("*")
          .eq("id", 1)
          .single();
        data = fb;
      }
      if (data) {
        setConfigId(data.id);
        setTasaBCV(String(data.tasa_bcv ?? ""));
        setCosto10k(String(data.costo_usd ?? ""));
        setCosto5k(String(data.costo_4k_usd ?? ""));
      }
    } catch {
      setErrorMsg("Error cargando configuración.");
    } finally {
      setLoading(false);
    }
  }, [raceId]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!configId) return;
    setSaving(true); setErrorMsg(null);
    try {
      const { error } = await supabase
        .from("system_config")
        .update({
          tasa_bcv            : parseFloat(tasaBCV.replace(",", ".")),
          costo_usd           : parseFloat(costo10k.replace(",", ".")),
          costo_4k_usd        : parseFloat(costo5k.replace(",", ".")),
          ultima_actualizacion: new Date().toISOString(),
        })
        .eq("id", configId);
      if (error) throw error;
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-10">
      <Loader2 className="animate-spin" style={{ color: YELLOW, width: 28, height: 28 }} />
    </div>
  );

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {errorMsg && (
        <div className="p-3 rounded-xl text-xs font-bold text-red-400 border border-red-500/30 bg-red-500/10">
          {errorMsg}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Tasa BCV (Bs/$)",       value: tasaBCV,  set: setTasaBCV,  color: "#94a3b8" },
          { label: "Inscripción 10K (USD)", value: costo10k, set: setCosto10k, color: YELLOW    },
          { label: "Inscripción 5K (USD)",  value: costo5k,  set: setCosto5k,  color: YELLOW    },
        ].map(({ label, value, set, color }) => (
          <div key={label}>
            <label
              className="block text-[10px] font-black uppercase tracking-widest mb-2"
              style={{ color }}
            >
              {label}
            </label>
            <input
              type="text"
              value={value}
              onChange={e => set(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-white text-sm font-bold outline-none"
              style={{
                background: "rgba(255,255,255,0.04)",
                border    : `1px solid ${color}30`,
              }}
            />
          </div>
        ))}
      </div>
      <button
        type="submit"
        disabled={saving}
        className="w-full py-3.5 rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-40"
        style={{ background: YELLOW, color: BG }}
      >
        {saving
          ? <><RefreshCw size={14} className="animate-spin" /> Guardando...</>
          : <><Save size={14} /> Guardar Configuración</>
        }
      </button>
      {successMsg && (
        <div className="flex items-center justify-center gap-2 text-emerald-400 text-xs font-black uppercase">
          <CheckCircle size={14} /> Configuración guardada
        </div>
      )}
    </form>
  );
};

// ─── PIN GATE ────────────────────────────────────────────────────────────────
const PinGate = ({ onAuth }: { onAuth: () => void }) => {
  const [pin,     setPin]     = useState("");
  const [error,   setError]   = useState(false);
  const [visible, setVisible] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.trim().toUpperCase() === PIN_CORRECTO) {
      localStorage.setItem(LS_KEY, "1");
      onAuth();
    } else {
      setError(true);
      setPin("");
      setTimeout(() => setError(false), 2500);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: BG }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: `${YELLOW}15`, border: `1px solid ${YELLOW}30` }}
          >
            <Dog size={28} style={{ color: YELLOW }} />
          </div>
          <h1
            className="text-2xl font-black italic uppercase leading-none mb-1"
            style={{ color: "#ffffff" }}
          >
            Caninata
          </h1>
          <p
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: `${YELLOW}80` }}
          >
            Panel de Organizador
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl p-6 space-y-4"
          style={{
            background: "rgba(255,255,255,0.02)",
            border    : `1px solid ${error ? "rgba(239,68,68,0.4)" : `${YELLOW}20`}`,
            transition: "border-color 0.3s",
          }}
        >
          <div>
            <label
              className="block text-[10px] font-black uppercase tracking-widest mb-2"
              style={{ color: `${YELLOW}90` }}
            >
              Código de Acceso
            </label>
            <div className="relative">
              <Lock
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: `${YELLOW}50` }}
              />
              <input
                type={visible ? "text" : "password"}
                value={pin}
                onChange={e => setPin(e.target.value)}
                autoFocus
                placeholder="••••••••••••"
                className="w-full rounded-xl pl-9 pr-10 py-3 text-sm font-bold text-white outline-none placeholder:text-white/20"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border    : `1px solid ${error ? "rgba(239,68,68,0.5)" : `${YELLOW}20`}`,
                }}
              />
              <button
                type="button"
                onClick={() => setVisible(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: `${YELLOW}50` }}
              >
                {visible ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {error && (
              <p className="text-[10px] text-red-400 font-bold mt-2 flex items-center gap-1">
                <AlertCircle size={10} /> Código incorrecto
              </p>
            )}
          </div>
          <button
            type="submit"
            className="w-full py-3.5 rounded-xl font-black uppercase text-xs tracking-widest transition-all active:scale-95"
            style={{ background: YELLOW, color: BG }}
          >
            Acceder
          </button>
        </form>

        <p
          className="text-center mt-6 text-[9px] uppercase tracking-widest font-bold"
          style={{ color: "rgba(255,255,255,0.15)" }}
        >
          RAYOCERO · Valkyron Group
        </p>
      </div>
    </div>
  );
};

// ─── DASHBOARD PRINCIPAL ──────────────────────────────────────────────────────
const CaninataDashboardMain = ({ onLogout }: { onLogout: () => void }) => {
  const [race,             setRace]             = useState<CaninatRace | null>(null);
  const [atletas,          setAtletas]          = useState<Atleta[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [searchTerm,       setSearchTerm]       = useState("");
  const [activeTab,        setActiveTab]        = useState<"atletas" | "config">("atletas");
  const [error,            setError]            = useState<string | null>(null);
  const [togglingPago,     setTogglingPago]     = useState<string | null>(null);  // [V1.2-1]
  const [togglingKit,      setTogglingKit]      = useState<string | null>(null);  // [V1.2-2]

  // Cargar carrera caninata activa
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("races")
          .select("id,name")
          .ilike("name", "%caninata%")
          .eq("inscripciones_abiertas", true)
          .maybeSingle();
        if (error) throw error;
        if (!data) {
          const { data: fallback } = await supabase
            .from("races")
            .select("id,name")
            .ilike("name", "%caninata%")
            .order("date", { ascending: false })
            .limit(1)
            .maybeSingle();
          setRace(fallback ?? null);
        } else {
          setRace(data);
        }
      } catch {
        setError("No se pudo cargar la carrera caninata.");
      }
    })();
  }, []);

  const fetchAtletas = useCallback(async () => {
    if (!race) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("runners")
        .select("id,nombre,apellido,cedula,telefono,modalidad,categoria,bib_number,pago_verificado,kit_entregado,talla_camiseta,created_at")
        .eq("race_id", race.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setAtletas((data as Atleta[]) || []);
    } catch {
      setError("Error cargando atletas.");
    } finally {
      setLoading(false);
    }
  }, [race]);

  useEffect(() => { fetchAtletas(); }, [fetchAtletas]);

  // [V1.2-1] Toggle pago — actualización optimista
  const togglePago = async (id: string, current: boolean) => {
    setTogglingPago(id);
    const next = !current;
    // Optimista: UI primero
    setAtletas(prev => prev.map(a => a.id === id ? { ...a, pago_verificado: next } : a));
    try {
      const { error } = await supabase
        .from("runners")
        .update({ pago_verificado: next })
        .eq("id", id);
      if (error) throw error;
    } catch {
      // Revertir si falla
      setAtletas(prev => prev.map(a => a.id === id ? { ...a, pago_verificado: current } : a));
      setError("Error actualizando pago. Intenta de nuevo.");
      setTimeout(() => setError(null), 3000);
    } finally {
      setTogglingPago(null);
    }
  };

  // [V1.2-2] Toggle kit — actualización optimista
  const toggleKit = async (id: string, current: boolean) => {
    setTogglingKit(id);
    const next = !current;
    // Optimista: UI primero
    setAtletas(prev => prev.map(a => a.id === id ? { ...a, kit_entregado: next } : a));
    try {
      const { error } = await supabase
        .from("runners")
        .update({ kit_entregado: next })
        .eq("id", id);
      if (error) throw error;
    } catch {
      // Revertir si falla
      setAtletas(prev => prev.map(a => a.id === id ? { ...a, kit_entregado: current } : a));
      setError("Error actualizando kit. Intenta de nuevo.");
      setTimeout(() => setError(null), 3000);
    } finally {
      setTogglingKit(null);
    }
  };

  const filtered = useMemo(() => {
    if (!searchTerm) return atletas;
    const t = searchTerm.toLowerCase();
    return atletas.filter(a =>
      `${a.nombre} ${a.apellido} ${a.cedula} ${a.categoria ?? ""} ${a.telefono ?? ""}`.toLowerCase().includes(t)
    );
  }, [atletas, searchTerm]);

  const total    = atletas.length;
  const pagados  = atletas.filter(a => a.pago_verificado).length;
  const kits     = atletas.filter(a => a.kit_entregado).length;
  const count10k = atletas.filter(a => a.modalidad === "10K").length;
  const count5k  = atletas.filter(a => a.modalidad === "5K").length;

  return (
    <div className="min-h-screen font-sans" style={{ background: BG, color: "#ffffff" }}>

      {/* NAVBAR */}
      <nav
        className="sticky top-0 z-50 flex items-center justify-between px-5 py-4 border-b"
        style={{ background: `${BG}ee`, borderColor: `${YELLOW}18`, backdropFilter: "blur(12px)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center"
            style={{ background: `${YELLOW}15`, border: `1px solid ${YELLOW}30` }}
          >
            <Dog size={18} style={{ color: YELLOW }} />
          </div>
          <div>
            <p className="text-sm font-black italic uppercase leading-none">Caninata</p>
            <p
              className="text-[9px] uppercase tracking-widest"
              style={{ color: `${YELLOW}60` }}
            >
              {race?.name ?? "Cargando..."}
            </p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 text-[10px] uppercase font-black px-3 py-2 rounded-lg transition-all hover:bg-white/5"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          <LogOut size={13} /> Salir
        </button>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">

        {error && (
          <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm font-bold flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* CONTADORES */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total inscritos",   value: total,                      color: YELLOW    },
            { label: "Pagos verificados", value: `${pagados} / ${total}`,    color: "#22c55e" },
            { label: "Kits entregados",   value: `${kits} / ${total}`,       color: "#f59e0b" },
            { label: "10K / 5K",          value: `${count10k} / ${count5k}`, color: YELLOW    },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="rounded-2xl p-4 flex flex-col gap-1"
              style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${color}20` }}
            >
              <p
                className="text-[9px] uppercase font-black tracking-widest"
                style={{ color: `${color}80` }}
              >
                {label}
              </p>
              <p className="text-2xl font-black italic" style={{ color }}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* TABS */}
        <div className="flex gap-2 flex-wrap">
          {([
            { id: "atletas", label: `Inscritos (${total})`, icon: <Users size={13} /> },
            { id: "config",  label: "Tarifas",              icon: <Save size={13} />  },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all"
              style={activeTab === tab.id
                ? { background: YELLOW, color: BG }
                : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.08)" }
              }
            >
              {tab.icon} {tab.label}
            </button>
          ))}

          <button
            onClick={fetchAtletas}
            className="ml-auto p-2.5 rounded-xl transition-all hover:bg-white/5"
            style={{ color: `${YELLOW}60`, border: `1px solid ${YELLOW}15` }}
            title="Actualizar lista"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* TAB: ATLETAS */}
        {activeTab === "atletas" && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: `1px solid ${YELLOW}15` }}
          >
            {/* Buscador */}
            <div
              className="p-4 border-b"
              style={{ borderColor: `${YELLOW}10`, background: "rgba(255,255,255,0.01)" }}
            >
              <div className="relative max-w-sm">
                <Search
                  size={13}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: `${YELLOW}50` }}
                />
                <input
                  type="text"
                  placeholder="Buscar nombre, cédula o teléfono..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl pl-9 pr-4 py-2.5 text-xs text-white outline-none placeholder:text-white/20"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border    : `1px solid ${YELLOW}15`,
                  }}
                />
              </div>
            </div>

            {/* Leyenda botones */}
            <div
              className="px-4 py-2 flex items-center gap-4 border-b text-[9px] font-black uppercase"
              style={{ borderColor: `${YELLOW}08`, background: "rgba(255,255,255,0.005)", color: "rgba(255,255,255,0.25)" }}
            >
              <span className="flex items-center gap-1">
                <Shield size={10} style={{ color: "#22c55e" }} /> Verificar pago
              </span>
              <span className="flex items-center gap-1">
                <Gift size={10} style={{ color: "#f59e0b" }} /> Marcar kit
              </span>
              <span className="ml-auto">Toca el ícono para cambiar estado</span>
            </div>

            {/* Tabla */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                    {["Atleta", "Teléfono", "Dorsal", "Modalidad", "Categoría", "Talla", "Pago", "Kit"].map(h => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[9px] uppercase font-black tracking-widest whitespace-nowrap"
                        style={{ color: `${YELLOW}60` }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center">
                        <Loader2
                          className="animate-spin mx-auto"
                          style={{ color: YELLOW, width: 28, height: 28 }}
                        />
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-16 text-center text-[10px] uppercase font-black"
                        style={{ color: "rgba(255,255,255,0.2)" }}
                      >
                        {searchTerm ? "Sin coincidencias" : "No hay atletas inscritos aún"}
                      </td>
                    </tr>
                  ) : filtered.map((a, i) => (
                    <tr
                      key={a.id}
                      style={{
                        borderTop : "1px solid rgba(255,255,255,0.04)",
                        background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                      }}
                    >
                      {/* Atleta */}
                      <td className="px-4 py-3">
                        <p className="text-xs font-black uppercase text-white whitespace-nowrap">
                          {a.nombre} {a.apellido}
                        </p>
                        <p
                          className="text-[9px] font-mono mt-0.5"
                          style={{ color: "rgba(255,255,255,0.35)" }}
                        >
                          V-{a.cedula}
                        </p>
                      </td>

                      {/* Teléfono */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Phone size={11} style={{ color: `${YELLOW}60`, flexShrink: 0 }} />
                          <span
                            className="text-[10px] font-mono font-bold whitespace-nowrap"
                            style={{ color: `${YELLOW}90` }}
                          >
                            {a.telefono ?? "—"}
                          </span>
                        </div>
                      </td>

                      {/* Dorsal */}
                      <td className="px-4 py-3">
                        <span className="text-sm font-black" style={{ color: YELLOW }}>
                          {a.bib_number ? `#${a.bib_number}` : "—"}
                        </span>
                      </td>

                      {/* Modalidad */}
                      <td className="px-4 py-3">
                        <span
                          className="text-[9px] font-black uppercase px-2.5 py-1 rounded-full whitespace-nowrap"
                          style={a.modalidad === "10K"
                            ? { background: `${YELLOW}12`, color: YELLOW, border: `1px solid ${YELLOW}25` }
                            : a.modalidad === "5K"
                            ? { background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.25)" }
                            : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.08)" }
                          }
                        >
                          {a.modalidad === "10K" ? "🏃 10K"
                            : a.modalidad === "5K" ? "🐕 5K"
                            : "—"}
                        </span>
                      </td>

                      {/* Categoría */}
                      <td className="px-4 py-3">
                        <span
                          className="text-[9px] uppercase font-bold whitespace-nowrap"
                          style={{ color: "rgba(255,255,255,0.5)" }}
                        >
                          {a.categoria ?? "—"}
                        </span>
                      </td>

                      {/* Talla */}
                      <td className="px-4 py-3">
                        <span
                          className="text-[9px] font-mono font-bold px-2 py-0.5 rounded"
                          style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)" }}
                        >
                          {a.talla_camiseta ?? "N/A"}
                        </span>
                      </td>

                      {/* [V1.2-1] Pago — botón toggle */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => togglePago(a.id, a.pago_verificado)}
                          disabled={togglingPago === a.id}
                          title={a.pago_verificado ? "Clic para desverificar pago" : "Clic para verificar pago"}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-40 active:scale-95"
                          style={a.pago_verificado
                            ? { background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e" }
                            : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.3)" }
                          }
                        >
                          {togglingPago === a.id
                            ? <RefreshCw size={12} className="animate-spin" />
                            : a.pago_verificado
                            ? <ShieldCheck size={12} />
                            : <Shield size={12} />
                          }
                          <span className="text-[9px] font-black uppercase whitespace-nowrap">
                            {a.pago_verificado ? "OK" : "—"}
                          </span>
                        </button>
                      </td>

                      {/* [V1.2-2] Kit — botón toggle */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleKit(a.id, a.kit_entregado)}
                          disabled={togglingKit === a.id}
                          title={a.kit_entregado ? "Clic para revertir entrega de kit" : "Clic para marcar kit entregado"}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-40 active:scale-95"
                          style={a.kit_entregado
                            ? { background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b" }
                            : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.3)" }
                          }
                        >
                          {togglingKit === a.id
                            ? <RefreshCw size={12} className="animate-spin" />
                            : <Gift size={12} />
                          }
                          <span className="text-[9px] font-black uppercase whitespace-nowrap">
                            {a.kit_entregado ? "OK" : "—"}
                          </span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer tabla */}
            {!loading && filtered.length > 0 && (
              <div
                className="px-4 py-3 text-[9px] uppercase font-black"
                style={{
                  color    : "rgba(255,255,255,0.2)",
                  borderTop: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                Mostrando {filtered.length} de {total} atletas
              </div>
            )}
          </div>
        )}

        {/* TAB: CONFIG TARIFAS */}
        {activeTab === "config" && race && (
          <div
            className="rounded-2xl p-6"
            style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${YELLOW}15` }}
          >
            <h3
              className="text-sm font-black uppercase tracking-widest mb-6"
              style={{ color: YELLOW }}
            >
              Configuración de Tarifas — {race.name}
            </h3>
            <TasaConfigCaninata raceId={race.id} />
          </div>
        )}

        {activeTab === "config" && !race && (
          <div
            className="py-12 text-center text-sm font-bold"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            No se encontró una carrera caninata activa.
          </div>
        )}

        <p
          className="text-center text-[9px] uppercase tracking-widest font-bold pb-4"
          style={{ color: "rgba(255,255,255,0.1)" }}
        >
          CANINATA · RAYOCERO · VALKYRON GROUP
        </p>
      </div>
    </div>
  );
};

// ─── ROOT ────────────────────────────────────────────────────────────────────
export default function CaninataDashboard() {
  const [authed, setAuthed] = useState(
    () => localStorage.getItem(LS_KEY) === "1"
  );

  const handleLogout = () => {
    localStorage.removeItem(LS_KEY);
    setAuthed(false);
  };

  if (!authed) return <PinGate onAuth={() => setAuthed(true)} />;
  return <CaninataDashboardMain onLogout={handleLogout} />;
}
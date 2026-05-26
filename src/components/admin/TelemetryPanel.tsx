/**
 * RayoCero Telemetry Panel — Componente TSX
 * 
 * Integración con el backend Python en tiempo real via SSE.
 * 
 * USO: importar en tu App.tsx o en la ruta /admin/telemetria
 * 
 * import TelemetryPanel from "@/components/TelemetryPanel";
 * <TelemetryPanel apiUrl="http://192.168.1.X:8090" />
 * 
 * apiUrl: IP de la PC Windows donde corre el backend
 *         (debe ser accesible desde el cliente — misma red WiFi)
 */

import { useEffect, useRef, useState } from "react";

// ─── Tipos ────────────────────────────────────────────────────────────────────
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
  type: "start" | "finish" | "race_start" | "connected";
  bib?: number;
  nombre?: string;
  categoria?: string;
  time?: string;
  finish_time?: string;
  elapsed_seconds?: number;
  elapsed_str?: string;
  epc?: string;
}

interface Result {
  position: number;
  bib_number: number;
  nombre: string;
  apellido: string;
  categoria: string;
  genero: string;
  finish_time_seconds: number;
  finish_time_str: string;
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function TelemetryPanel({
  apiUrl = "http://localhost:8090",
}: {
  apiUrl?: string;
}) {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [events, setEvents] = useState<CrossingEvent[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [connected, setConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<"live" | "results" | "assign">("live");

  // Asignación de chips
  const [assignBib, setAssignBib] = useState("");
  const [assignEpc, setAssignEpc] = useState("");
  const [assignMsg, setAssignMsg] = useState("");

  const eventsEndRef = useRef<HTMLDivElement>(null);

  // ── Polling de status ─────────────────────────────────────────────────────
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${apiUrl}/status`);
        if (res.ok) setStatus(await res.json());
      } catch {
        setStatus(null);
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [apiUrl]);

  // ── SSE — eventos en tiempo real ──────────────────────────────────────────
  useEffect(() => {
    const es = new EventSource(`${apiUrl}/live`);

    es.onopen = () => setConnected(true);
    es.onerror = () => {
      setConnected(false);
      // reconectar automático por el navegador
    };
    es.onmessage = (e) => {
      try {
        const event: CrossingEvent = JSON.parse(e.data);
        if (event.type === "connected") return;

        setEvents((prev) => [event, ...prev].slice(0, 100));

        if (event.type === "finish") {
          // Actualizar resultados
          fetchResults();
        }
      } catch {}
    };

    return () => es.close();
  }, [apiUrl]);

  // ── Resultados ────────────────────────────────────────────────────────────
  const fetchResults = async () => {
    try {
      const res = await fetch(`${apiUrl}/results`);
      if (res.ok) setResults(await res.json());
    } catch {}
  };

  useEffect(() => {
    fetchResults();
    const interval = setInterval(fetchResults, 10000);
    return () => clearInterval(interval);
  }, [apiUrl]);

  // ── Scroll automático en eventos ──────────────────────────────────────────
  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  // ── Acciones ──────────────────────────────────────────────────────────────
  const handleRaceStart = async () => {
    if (!confirm("¿Disparar pistola de salida? Esto registrará start_time para TODOS los corredores.")) return;
    try {
      const res = await fetch(`${apiUrl}/race/start`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = await res.json();
      alert(`✅ Carrera iniciada: ${data.start_time}`);
    } catch (e) {
      alert("❌ Error al iniciar carrera");
    }
  };

  const handleReset = async () => {
    if (!confirm("¿BORRAR TODOS LOS TIEMPOS? Esta acción no se puede deshacer.")) return;
    try {
      await fetch(`${apiUrl}/race/reset`, { method: "POST" });
      setResults([]);
      setEvents([]);
      alert("✅ Reset completado");
    } catch {
      alert("❌ Error en reset");
    }
  };

  const handleAssign = async () => {
    if (!assignBib || !assignEpc) return;
    try {
      const res = await fetch(`${apiUrl}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bib_number: parseInt(assignBib), epc: assignEpc }),
      });
      const data = await res.json();
      if (res.ok) {
        setAssignMsg(`✅ ${data.nombre} (BIB #${data.bib_number}) → ${data.epc}`);
        setAssignBib("");
        setAssignEpc("");
      } else {
        setAssignMsg(`❌ Error: ${data.detail}`);
      }
    } catch {
      setAssignMsg("❌ Error de conexión con el backend");
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 text-white font-mono p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-yellow-400">⚡ RAYOCERO TELEMETRY</h1>
          <p className="text-gray-400 text-sm">Sistema RFID en tiempo real</p>
        </div>
        <div className="flex gap-2 items-center">
          <span
            className={`w-3 h-3 rounded-full ${connected ? "bg-green-400 animate-pulse" : "bg-red-500"}`}
          />
          <span className="text-sm text-gray-300">
            {connected ? "SSE Conectado" : "SSE Desconectado"}
          </span>
        </div>
      </div>

      {/* Status Cards */}
      {status && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatusCard
            label="Lector RFID"
            value={status.llrp_connected ? "CONECTADO" : status.demo_mode ? "DEMO" : "OFFLINE"}
            color={status.llrp_connected ? "green" : status.demo_mode ? "yellow" : "red"}
          />
          <StatusCard
            label="Corredores con chip"
            value={String(status.runners_with_chip)}
            color="blue"
          />
          <StatusCard
            label="Carrera"
            value={status.race_started ? "EN CURSO" : "EN ESPERA"}
            color={status.race_started ? "green" : "gray"}
          />
          <StatusCard
            label="Antenas activas"
            value={status.antennas.join(", ")}
            color="blue"
          />
        </div>
      )}

      {/* Botones de control */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <button
          onClick={handleRaceStart}
          className="bg-green-600 hover:bg-green-500 text-white font-bold px-6 py-2 rounded-lg transition"
        >
          🔫 DISPARAR PISTOLA
        </button>
        <button
          onClick={fetchResults}
          className="bg-blue-700 hover:bg-blue-600 text-white font-bold px-4 py-2 rounded-lg transition"
        >
          🔄 Actualizar
        </button>
        <button
          onClick={handleReset}
          className="bg-red-800 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg transition ml-auto"
        >
          ⚠️ Reset tiempos
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-700">
        {(["live", "results", "assign"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-semibold transition rounded-t-lg ${
              activeTab === tab
                ? "bg-gray-800 text-yellow-400 border-b-2 border-yellow-400"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {{ live: "📡 Live", results: "🏁 Resultados", assign: "🏷️ Asignar chips" }[tab]}
          </button>
        ))}
      </div>

      {/* Tab: Live Events */}
      {activeTab === "live" && (
        <div className="bg-gray-900 rounded-xl p-4 max-h-[500px] overflow-y-auto">
          {events.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Esperando cruces de chips...
              <br />
              <span className="text-xs">(El primer tag aparecerá aquí en tiempo real)</span>
            </p>
          ) : (
            events.map((ev, i) => <EventRow key={i} event={ev} />)
          )}
          <div ref={eventsEndRef} />
        </div>
      )}

      {/* Tab: Results */}
      {activeTab === "results" && (
        <div className="bg-gray-900 rounded-xl overflow-hidden">
          {results.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Sin resultados aún</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-800 text-gray-300">
                <tr>
                  <th className="py-3 px-3 text-left">#</th>
                  <th className="py-3 px-3 text-left">BIB</th>
                  <th className="py-3 px-3 text-left">Nombre</th>
                  <th className="py-3 px-3 text-left">Categoría</th>
                  <th className="py-3 px-3 text-right text-yellow-400">Tiempo</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.bib_number} className="border-t border-gray-800 hover:bg-gray-800">
                    <td className="py-2 px-3 text-gray-400 font-bold">{r.position}</td>
                    <td className="py-2 px-3 text-blue-400 font-bold">#{r.bib_number}</td>
                    <td className="py-2 px-3">{r.nombre} {r.apellido}</td>
                    <td className="py-2 px-3 text-gray-400 text-xs">{r.categoria}</td>
                    <td className="py-2 px-3 text-right text-yellow-400 font-bold">{r.finish_time_str}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab: Asignar chips */}
      {activeTab === "assign" && (
        <div className="bg-gray-900 rounded-xl p-6 max-w-md">
          <h3 className="text-lg font-bold mb-4 text-yellow-400">Asignar chip a corredor</h3>
          <p className="text-gray-400 text-xs mb-4">
            El EPC del chip aparece en la consola del servidor cuando pasas el chip por la antena.
            Formato: cadena hex como <code className="text-green-400">E2003412ABCD1234</code>
          </p>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-300 block mb-1">Número de dorsal (BIB)</label>
              <input
                type="number"
                value={assignBib}
                onChange={(e) => setAssignBib(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-yellow-400"
                placeholder="Ej: 42"
              />
            </div>
            <div>
              <label className="text-sm text-gray-300 block mb-1">EPC del chip</label>
              <input
                type="text"
                value={assignEpc}
                onChange={(e) => setAssignEpc(e.target.value.toUpperCase())}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-yellow-400"
                placeholder="Ej: E2003412ABCD1234"
              />
            </div>
            <button
              onClick={handleAssign}
              className="w-full bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold py-2 rounded-lg transition"
            >
              Asignar chip
            </button>
            {assignMsg && (
              <p className={`text-sm mt-2 ${assignMsg.startsWith("✅") ? "text-green-400" : "text-red-400"}`}>
                {assignMsg}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────
function StatusCard({
  label, value, color,
}: {
  label: string;
  value: string;
  color: "green" | "red" | "yellow" | "blue" | "gray";
}) {
  const colors = {
    green: "text-green-400 border-green-800",
    red: "text-red-400 border-red-800",
    yellow: "text-yellow-400 border-yellow-800",
    blue: "text-blue-400 border-blue-800",
    gray: "text-gray-400 border-gray-700",
  };
  return (
    <div className={`bg-gray-900 border rounded-xl p-3 ${colors[color]}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`font-bold text-lg ${colors[color].split(" ")[0]}`}>{value}</p>
    </div>
  );
}

function EventRow({ event }: { event: CrossingEvent }) {
  if (event.type === "race_start") {
    return (
      <div className="flex items-center gap-3 py-2 border-b border-gray-800 text-green-400">
        <span className="text-xl">🔫</span>
        <div>
          <span className="font-bold">PISTOLA DISPARADA</span>
          <span className="text-gray-500 text-xs ml-2">{event.time}</span>
        </div>
      </div>
    );
  }

  const isFinish = event.type === "finish";
  return (
    <div
      className={`flex items-center gap-3 py-2 border-b border-gray-800 ${
        isFinish ? "text-yellow-400" : "text-blue-400"
      }`}
    >
      <span className="text-xl">{isFinish ? "🏁" : "🚀"}</span>
      <div className="flex-1">
        <span className="font-bold">BIB #{event.bib}</span>
        <span className="text-white ml-2">{event.nombre}</span>
        <span className="text-gray-500 text-xs ml-2">{event.categoria}</span>
      </div>
      {isFinish && event.elapsed_str && (
        <span className="text-yellow-400 font-bold text-lg">{event.elapsed_str}</span>
      )}
      {!isFinish && (
        <span className="text-blue-400 text-sm">SALIDA</span>
      )}
    </div>
  );
}
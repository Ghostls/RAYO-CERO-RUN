/**
 * RAYO CERO — RESULTS TABLE (STABLE BUILD V3.5_STEALTH)
 * Senior Dev: MIA (Valkyron Group)
 * CEO: Lualdo Sciscioli
 * Grado: Militar / Operativo 
 * 
 * EVOLUCIÓN V3.5:
 * - STEALTH OPTIMIZATION: Tras confirmación táctica, el enlace primario 
 *   ahora es 'bib_number' (Beta Link anterior). Se elimina el warning de consola.
 * - FALLBACK SILENCIOSO: Redundancia mantenida en background por seguridad.
 * - REGLA DE ORO RESPETADA: Código completo y optimizado.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Loader2, AlertCircle, Trophy } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface RunnerResult {
  bib_number: number;
  nombre: string;
  apellido: string;
  tiempo: string;
}

export const ResultsTable = () => {
  const [results, setResults] = useState<RunnerResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setIsLoading(true);
        setError(null);

        /**
         * MIA STEALTH LINK:
         * Ruta confirmada y optimizada: bib_number.
         */
        const { data: primaryData, error: primaryError } = await supabase
          .from('runners')
          .select(`
            bib_number,
            nombre,
            apellido,
            race_results!bib_number (
              tiempo_chip
            )
          `)
          .order('bib_number', { ascending: true });

        if (primaryError) {
          // Fallback silencioso en caso de anomalías futuras
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('runners')
            .select(`
              bib_number,
              nombre,
              apellido,
              race_results!cedula_runner (
                tiempo_chip
              )
            `)
            .order('bib_number', { ascending: true });

          if (fallbackError) throw fallbackError;
          processTelemetry(fallbackData);
        } else {
          processTelemetry(primaryData);
        }

      } catch (err: any) {
        console.error('[MIA CRITICAL] Caída de Enlace:', err.message);
        setError('Error de enlace: Imposible establecer conexión con la tabla de tiempos.');
      } finally {
        setIsLoading(false);
      }
    };

    const processTelemetry = (data: any[]) => {
      if (!data) return;
      const formattedData: RunnerResult[] = data.map((runner: any) => ({
        bib_number: runner.bib_number,
        nombre: runner.nombre || 'SIN NOMBRE',
        apellido: runner.apellido || '',
        tiempo: runner.race_results && runner.race_results.length > 0 
          ? runner.race_results[0].tiempo_chip 
          : 'En espera / DNS',
      }));
      setResults(formattedData);
    };

    fetchResults();
  }, []);

  const filteredResults = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return results;
    return results.filter(r => 
      `${r.nombre} ${r.apellido} ${r.bib_number}`.toLowerCase().includes(query)
    );
  }, [searchQuery, results]);

  return (
    <div className="w-full animate-in fade-in duration-500">
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-3 text-cyan-500/50" size={18} />
          <input 
            type="text" 
            placeholder="Radar de búsqueda activa..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#03070b]/50 border border-white/10 pl-12 pr-4 py-3 rounded-xl text-sm text-white focus:border-cyan-500/50 outline-none transition-all" 
          />
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center bg-white/[0.02] rounded-2xl border border-white/5">
          <Loader2 className="h-10 w-10 text-cyan-500 animate-spin mx-auto mb-4" />
          <p className="text-[10px] font-black tracking-[0.4em] text-cyan-500 uppercase">Sincronizando Uplink Pro...</p>
        </div>
      ) : error ? (
        <div className="p-10 text-center bg-red-500/5 border border-red-500/20 rounded-2xl">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
          <p className="text-sm font-bold text-red-400 uppercase tracking-widest">{error}</p>
          <p className="text-[10px] text-gray-500 mt-2 font-mono">Consulte al Analista de Inteligencia Militar</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-2xl">
          <table className="w-full text-left">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="p-5 text-[9px] font-black text-gray-500 uppercase tracking-[0.3em]">Unidad (Dorsal)</th>
                <th className="p-5 text-[9px] font-black text-gray-500 uppercase tracking-[0.3em]">Atleta</th>
                <th className="p-5 text-[9px] font-black text-gray-500 uppercase tracking-[0.3em] text-right">Telemetría (Tiempo)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredResults.length > 0 ? (
                filteredResults.map((runner) => (
                  <tr key={runner.bib_number} className="group hover:bg-cyan-500/[0.03] transition-all">
                    <td className="p-5">
                      <span className="font-mono text-cyan-400 font-bold bg-cyan-500/5 border border-cyan-500/10 px-3 py-1 rounded-lg">
                        #{runner.bib_number?.toString().padStart(4, '0') || '0000'}
                      </span>
                    </td>
                    <td className="p-5 font-bold text-white uppercase text-xs tracking-tight">
                      {runner.nombre} {runner.apellido}
                    </td>
                    <td className="p-5 text-right">
                      {runner.tiempo.includes('En espera') ? (
                        <span className="text-gray-600 text-[10px] font-bold uppercase tracking-widest italic">{runner.tiempo}</span>
                      ) : (
                        <span className="font-black text-cyan-400 font-mono text-lg">{runner.tiempo}</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="p-20 text-center opacity-30">
                    <Trophy className="mx-auto h-12 w-12 mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-[0.5em]">Radar Limpio - Cero Unidades</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
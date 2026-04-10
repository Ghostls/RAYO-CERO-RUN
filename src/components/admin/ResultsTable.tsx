/**
 * RAYO CERO — RESULTS TABLE (STABLE BUILD V3.1 - SUPABASE UPLINK)
 * Senior Dev: MIA (Valkyron Group)
 * CEO: Lualdo Sciscioli
 * Grado: Militar / Operativo 
 * REGLA DE ORO: Código completo sin omisiones.
 * FIX: Eliminación de datos estáticos (Mockup). Conexión en tiempo real con BD Supabase.
 */

import React, { useState, useEffect } from 'react';
import { Search, Loader2, AlertCircle, Trophy } from 'lucide-react';
import { supabase } from '@/lib/supabase'; // MIA UPLINK: Conexión a la BD

// Interfaz estricta para mapear la telemetría de Supabase
interface RunnerResult {
  bib_number: number;
  nombre: string;
  apellido: string;
  tiempo: string;
}

export const ResultsTable = () => {
  const [results, setResults] = useState<RunnerResult[]>([]);
  const [filteredResults, setFilteredResults] = useState<RunnerResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // MIA PROTOCOL: Extracción de datos de Supabase al montar el componente
  useEffect(() => {
    const fetchResults = async () => {
      try {
        setIsLoading(true);
        // Hacemos un JOIN táctico entre runners y race_results (si existe el tiempo)
        const { data, error: fetchError } = await supabase
          .from('runners')
          .select(`
            bib_number,
            nombre,
            apellido,
            race_results (
              tiempo_chip
            )
          `)
          .order('bib_number', { ascending: true });

        if (fetchError) throw fetchError;

        // Formateo de los datos recibidos
        const formattedData: RunnerResult[] = (data || []).map((runner: any) => ({
          bib_number: runner.bib_number,
          nombre: runner.nombre,
          apellido: runner.apellido,
          // Si no tiene tiempo registrado aún, indicamos que está en espera
          tiempo: runner.race_results && runner.race_results.length > 0 
            ? runner.race_results[0].tiempo_chip 
            : 'En espera / DNS',
        }));

        setResults(formattedData);
        setFilteredResults(formattedData);
      } catch (err: any) {
        console.error('[MIA CRITICAL] Fallo al obtener telemetría de resultados:', err);
        setError('Error de conexión con la base de datos de resultados.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, []);

  // MIA PROTOCOL: Motor de filtrado en tiempo real (Radar)
  useEffect(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      setFilteredResults(results);
      return;
    }

    const filtered = results.filter(
      (runner) =>
        runner.nombre.toLowerCase().includes(query) ||
        runner.apellido.toLowerCase().includes(query) ||
        runner.bib_number.toString().includes(query)
    );
    setFilteredResults(filtered);
  }, [searchQuery, results]);

  return (
    <div className="w-full">
      {/* ─── RADAR DE BÚSQUEDA ─── */}
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-3 text-cyan-500/50 group-focus-within:text-cyan-400 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Escanear por Dorsal, Nombre o Apellido..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#03070b]/50 border border-white/10 focus:border-cyan-500/50 focus:bg-white/[0.02] pl-12 pr-4 py-3 rounded-xl text-sm text-white placeholder:text-white/30 outline-none transition-all shadow-inner backdrop-blur-md" 
          />
        </div>
      </div>

      {/* ─── PANTALLAS DE ESTADO TÁCTICO ─── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 bg-white/[0.02] rounded-xl border border-white/5">
          <Loader2 className="h-8 w-8 text-cyan-400 animate-spin mb-4" />
          <p className="text-[10px] font-black tracking-[0.3em] text-cyan-400 uppercase">Descargando Telemetría...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 bg-red-500/5 border border-red-500/20 rounded-xl">
          <AlertCircle className="h-8 w-8 text-red-500 mb-4" />
          <p className="text-xs font-bold tracking-widest text-red-400 uppercase">{error}</p>
        </div>
      ) : (
        /* ─── TABLA DE RESULTADOS OPERATIVA ─── */
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-md">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#03070b]/80 border-b border-white/10">
              <tr>
                <th className="p-4 text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Dorsal</th>
                <th className="p-4 text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Atleta</th>
                <th className="p-4 text-[10px] font-black text-white/40 uppercase tracking-[0.3em] text-right">Tiempo Oficial</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredResults.length > 0 ? (
                filteredResults.map((runner, index) => (
                  <tr 
                    key={runner.bib_number} 
                    className={`hover:bg-white/5 transition-colors border-b border-white/5 group ${index % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.01]'}`}
                  >
                    <td className="p-4">
                      <span className="inline-block px-2 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-black font-mono text-xs rounded-md shadow-[0_0_10px_rgba(0,242,255,0.1)] group-hover:shadow-[0_0_15px_rgba(0,242,255,0.3)] transition-shadow">
                        #{runner.bib_number.toString().padStart(4, '0')}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-white uppercase tracking-wider">
                      {runner.nombre} {runner.apellido}
                    </td>
                    <td className="p-4 font-mono text-right text-cyan-500">
                      {runner.tiempo === 'En espera / DNS' ? (
                        <span className="text-white/30 text-[10px] tracking-widest">{runner.tiempo}</span>
                      ) : (
                        <span className="font-black">{runner.tiempo}</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="p-12 text-center text-white/30">
                    <Trophy className="h-8 w-8 mx-auto mb-3 opacity-20" />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">No se encontraron registros</span>
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
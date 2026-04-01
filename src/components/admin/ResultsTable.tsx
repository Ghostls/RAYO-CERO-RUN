import React from 'react';
import { Trophy, Search } from 'lucide-react';

export const ResultsTable = () => {
  return (
    <div className="w-full">
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 text-gray-500" size={16} />
          <input type="text" placeholder="Buscar por Dorsal o Nombre..." className="w-full bg-white/5 border border-white/10 pl-10 pr-4 py-2 rounded-lg text-sm" />
        </div>
      </div>
      <table className="w-full text-left">
        <thead className="text-[10px] text-gray-500 uppercase tracking-widest border-b border-white/10">
          <tr>
            <th className="p-3">Dorsal</th>
            <th className="p-3">Runner</th>
            <th className="p-3">Tiempo (ms)</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          <tr className="hover:bg-white/5 transition-colors border-b border-white/5">
            <td className="p-3 font-mono text-cyan-400">#002</td>
            <td className="p-3">Lualdo Sciscioli</td>
            <td className="p-3 font-mono">14:22.05</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
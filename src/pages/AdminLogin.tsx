import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { ShieldAlert, Lock, Mail, ArrowRight } from 'lucide-react';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("ACCESO DENEGADO: Credenciales Invalidas");
      setLoading(false);
    } else {
      window.location.href = '/admin-dashboard';
    }
  };

  return (
    <div className="min-h-screen bg-[#050a0f] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Efectos de Fondo Liquid */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-blue-600/10 rounded-full blur-[100px]"></div>

      <div className="w-full max-w-md z-10">
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          
          <div className="text-center mb-8">
            <div className="inline-flex p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl mb-4">
              <ShieldAlert className="text-cyan-500" size={32} />
            </div>
            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">Valkyron Auth</h2>
            <p className="text-[10px] text-cyan-500 font-bold tracking-[0.3em] uppercase mt-2">Protocolo de Acceso Nivel 5</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Terminal ID (Email)</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-cyan-400 focus:border-cyan-500/50 focus:outline-none transition-all placeholder:text-gray-700"
                  placeholder="admin@valkyron.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Access Key</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input 
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-cyan-400 focus:border-cyan-500/50 focus:outline-none transition-all placeholder:text-gray-700"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-[10px] text-red-400 font-black text-center uppercase tracking-widest">
                {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[0_0_30px_rgba(6,182,212,0.3)] disabled:opacity-50"
            >
              {loading ? "VERIFICANDO..." : "INICIAR SESIÓN"}
              {!loading && <ArrowRight size={20} />}
            </button>
          </form>

          <p className="text-center mt-8 text-[9px] text-gray-600 font-bold uppercase tracking-[0.4em]">
            Authorized Personnel Only
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
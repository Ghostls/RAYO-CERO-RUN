/**
 * RAYO CERO — VITE BUILD CONFIGURATION (STABLE V2.1 - TACTICAL MERGE & LOW LATENCY)
 * Senior Dev: MIA (Valkyron Group)
 * CEO: Lualdo Sciscioli
 * Grado: Militar / Operativo
 * REGLA DE ORO: Código completo sin omisiones.
 * FIX: Fusión del entorno actual (SWC/Lovable) con el protocolo de Code Splitting para acelerar Vercel.
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // ─── MIA PROTOCOL: MOTOR DE COMPILACIÓN Y REDUCCIÓN DE LATENCIA ───
  build: {
    target: 'esnext',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Fragmentación táctica para Vercel: Divide el peso en descargas paralelas
          if (id.includes('node_modules')) {
            if (id.includes('framer-motion')) return 'vendor-framer';
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('@emailjs')) return 'vendor-email';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('react-router-dom') || id.includes('react-router')) return 'vendor-router';
            if (id.includes('react') || id.includes('react-dom')) return 'vendor-react';
            return 'vendor-core';
          }
        }
      }
    }
  }
}));
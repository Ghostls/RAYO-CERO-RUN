/**
 * RAYO CERO — VITE BUILD CONFIGURATION (STABLE V2.6 - APPLE GRADE OPTIMIZATION)
 * Senior Dev: MIA (Valkyron Group)
 * CEO: Lualdo Sciscioli
 * Grado: Militar / Operativo
 * FIX: Implementación de Code Splitting Quirúrgico. Aislamiento de cargas pesadas sin tocar el núcleo de React.
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
  // ─── MIA PROTOCOL: MOTOR DE COMPILACIÓN GRADO APPLE ───
  build: {
    target: 'esnext',
    minify: 'esbuild', // Minificación ultra rápida nativa
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Fragmentación Quirúrgica: Separamos solo las librerías pesadas externas.
          // El núcleo de React queda intacto para evitar colisiones (pantalla negra).
          if (id.includes('node_modules')) {
            if (id.includes('framer-motion')) return 'ui-motion';
            if (id.includes('leaflet') || id.includes('react-leaflet')) return 'map-leaflet';
            if (id.includes('@supabase')) return 'db-supabase';
            if (id.includes('@emailjs')) return 'net-email';
            
            // Todo el resto de dependencias menores se agrupan en un solo bloque seguro
            return 'vendor-core';
          }
        }
      }
    }
  }
}));
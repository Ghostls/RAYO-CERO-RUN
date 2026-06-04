import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Separar chunks por vendor para mejor cache
    rollupOptions: {
      output: {
        manualChunks: {
          // Leaflet en su propio chunk — solo carga cuando se usa el mapa
          'leaflet': ['leaflet'],
          // Framer motion separado
          'framer-motion': ['framer-motion'],
          // Supabase separado
          'supabase': ['@supabase/supabase-js'],
          // React core
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
    // Aumentar límite de warning de chunk
    chunkSizeWarningLimit: 600,
  },
  // Pre-bundling para desarrollo más rápido
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@supabase/supabase-js'],
    exclude: ['leaflet'],
  },
});
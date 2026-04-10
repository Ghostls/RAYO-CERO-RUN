/**
 * RAYO CERO — VITE BUILD CONFIGURATION (STABLE V2.2 - EMERGENCY ROLLBACK)
 * Senior Dev: MIA / Gemini (Valkyron Group)
 * CEO: Lualdo Sciscioli
 * FIX: Retorno a optimización automática segura para evitar colisión de React.
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
  // MIA PROTOCOL: Retorno a optimización base segura
  build: {
    target: 'esnext',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1500, 
  }
}));
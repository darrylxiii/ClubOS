import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    modulePreload: {
      polyfill: true,
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core React libraries
          if (id.includes('node_modules/react') || 
              id.includes('node_modules/react-dom') || 
              id.includes('node_modules/react-router-dom')) {
            return 'react-vendor';
          }
          
          // Radix UI components - split by category
          if (id.includes('@radix-ui')) {
            return 'ui-vendor';
          }
          
          // Chart/data viz libraries
          if (id.includes('recharts') || id.includes('d3-')) {
            return 'charts';
          }
          
          // Form libraries
          if (id.includes('react-hook-form') || id.includes('zod')) {
            return 'forms';
          }
          
          // Supabase
          if (id.includes('@supabase')) {
            return 'supabase';
          }
          
          // Framer Motion
          if (id.includes('framer-motion')) {
            return 'motion';
          }
        },
      },
    },
    // Target modern browsers for smaller bundles
    target: 'es2020',
    // Enable CSS code splitting
    cssCodeSplit: true,
  },
}));

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import type { Plugin } from 'vite';

// Plugin to defer non-critical CSS for better performance
const deferCSSPlugin = (): Plugin => ({
  name: 'vite-plugin-defer-css',
  enforce: 'post',
  transformIndexHtml(html) {
    // Transform stylesheet links to use preload pattern for async loading
    // This regex handles any attribute order
    return html.replace(
      /<link\s+([^>]*?)rel="stylesheet"([^>]*?)href="([^"]+\.css)"([^>]*?)>/g,
      (match, before, middle, href, after) => {
        // Extract crossorigin attribute if present
        const crossorigin = (before + middle + after).includes('crossorigin') ? ' crossorigin' : '';
        return `<link rel="preload" as="style" href="${href}"${crossorigin} onload="this.onload=null;this.rel='stylesheet'"><noscript><link rel="stylesheet"${crossorigin} href="${href}"></noscript>`;
      }
    );
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
    mode === "production" && deferCSSPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    cssCodeSplit: true,
    modulePreload: {
      polyfill: true,
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            // Split large vendor libraries into separate chunks
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('@radix-ui')) {
              return 'radix-vendor';
            }
            if (id.includes('recharts') || id.includes('d3-')) {
              return 'charts-vendor';
            }
            if (id.includes('@tanstack')) {
              return 'query-vendor';
            }
            // Other vendors in separate chunk
            return 'vendor';
          }
        },
      },
    },
    cssMinify: true,
  },
}));

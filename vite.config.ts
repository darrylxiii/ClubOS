import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => ({
  server: {
    host: true, // Listen on all interfaces (localhost + network IP)
    port: 8080,
    strictPort: false, // Allow Vite to use next available port if 8080 is busy
  },
  // Optimize dependency pre-bundling to reduce memory
  optimizeDeps: {
    // Limit entries to reduce initial scan
    entries: ['src/main.tsx'],
    // Force pre-bundling for CJS/ESM compatibility issues
    include: ['extend'],
    // Exclude heavy libraries from pre-bundling
    exclude: ['mermaid', 'katex', '@blocknote/core', '@blocknote/react'],
  },
  plugins: [
    react(),
    // Only used for the editor/devtools while running the dev server
    command === 'serve' && mode === 'development' && componentTagger(),
    // PWA is only needed for production builds; it is memory-heavy during build
    command === 'build' && mode === 'production' &&
      VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'quantum-logo.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'The Quantum Club',
        short_name: 'TQC',
        description: 'Invite-only career management for visionary talent. Discreet. High-tech. Unapologetically exclusive.',
        theme_color: '#0E0E10',
        background_color: '#0E0E10',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-192-maskable.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        categories: ['business', 'productivity'],
        shortcuts: [
          {
            name: 'My Applications',
            url: '/applications',
            description: 'View your job applications'
          },
          {
            name: 'Club Home',
            url: '/home',
            description: 'Access your club dashboard'
          }
        ]
      },
      workbox: {
        // CRITICAL: Do NOT precache HTML - use NetworkFirst at runtime
        // This prevents stale index.html from bricking the app after deploy
        globPatterns: ['**/*.{js,css,ico,png,svg,woff2}'],
        
        // CRITICAL: Auto-activate new service worker immediately
        // Prevents users from being stuck on old cached version
        skipWaiting: true,
        clientsClaim: true,
        
        // Clean up old caches
        cleanupOutdatedCaches: true,
        
        // Increase limit to 5MB for og-image.png etc
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        
        // Runtime caching strategies
        runtimeCaching: [
          // CRITICAL: Document navigations use NetworkFirst
          // This ensures fresh index.html on every page load
          {
            urlPattern: ({ request }) => request.destination === 'document',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 // 1 day fallback
              },
              networkTimeoutSeconds: 3,
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },
          {
            urlPattern: /^https:\/\/dpjucecmoyfzrduhlctt\.supabase\.co\/rest\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 5 // 5 minutes
              },
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // CRITICAL: JS/CSS bundles use NetworkOnly to eliminate stale-asset issues
          // Hashed bundles MUST come from network - cache mismatches cause boot failures
          {
            urlPattern: /\.(?:js|css)$/i,
            handler: 'NetworkOnly',
            options: {
              cacheName: 'static-resources'
            }
          }
        ]
      },
      devOptions: {
        enabled: false // Disable in dev to avoid issues
      }
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    modulePreload: false, // Disable to reduce memory
    // Development-mode builds (build:dev) should be cheap on memory.
    minify: mode === 'development' ? false : 'esbuild',
    cssMinify: mode === 'development' ? false : true,
    reportCompressedSize: false,

    // Disable sourcemaps to reduce memory usage
    sourcemap: false,

    // Reduce chunk size warnings threshold
    chunkSizeWarningLimit: 3000,

    // CRITICAL: Limit concurrent operations to reduce memory pressure
    rollupOptions: {
      // Limit the number of concurrent module transforms
      maxParallelFileOps: 5,
      
      output: {
        // Simpler chunking - isolate only the heaviest libs
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return undefined;
          
          // Heavy libraries - isolate into their own chunks
          if (id.includes('recharts') || id.includes('d3-')) return 'charts';
          if (id.includes('@blocknote')) return 'blocknote';
          if (id.includes('@tiptap') || id.includes('prosemirror')) return 'editor';
          if (id.includes('livekit') || id.includes('@livekit')) return 'livekit';
          if (id.includes('framer-motion')) return 'motion';
          if (id.includes('@radix-ui')) return 'radix';
          if (id.includes('@supabase')) return 'supabase';
          if (id.includes('mermaid')) return 'mermaid';
          if (id.includes('fabric')) return 'fabric';
          if (id.includes('jspdf')) return 'pdf';
          
          // Core React vendor
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-vendor';
          }
        },
      },
    },
    // Target modern browsers for smaller bundles
    target: 'esnext',
    // Disable CSS code splitting to reduce memory
    cssCodeSplit: false,
  },
}));

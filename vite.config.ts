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
          // CRITICAL: JS/CSS bundles use NetworkFirst to prevent stale-asset bricking
          // When index.html references new hashed bundles, we MUST fetch from network
          {
            urlPattern: /\.(?:js|css)$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'static-resources',
              networkTimeoutSeconds: 5, // Fast fallback to cache if offline
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days for offline fallback
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
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
    modulePreload: {
      polyfill: true,
    },
    // Development-mode builds (build:dev) should be cheap on memory.
    minify: mode === 'development' ? false : 'esbuild',
    cssMinify: mode === 'development' ? false : true,
    reportCompressedSize: false,

    // Disable sourcemaps to reduce memory usage
    sourcemap: false,

    // Reduce chunk size warnings threshold
    chunkSizeWarningLimit: 2000,

    // CRITICAL: Limit concurrent operations to reduce memory pressure
    rollupOptions: {
      // Limit the number of concurrent module transforms
      maxParallelFileOps: 5, // Reduced from 10 to 5

      // Use treeshake preset for lighter memory footprint
      treeshake: {
        preset: 'smallest',
        moduleSideEffects: false,
      },

      // CRITICAL: Externalize heavy optional dependencies in dev builds
      external: mode === 'development' ? [
        // These are lazy-loaded anyway, externalize in dev to save memory
        'mermaid',
        '@mediapipe/camera_utils',
        '@mediapipe/selfie_segmentation',
      ] : [],

      output: {
        // CRITICAL: Aggressive code splitting by feature to reduce memory per chunk
        manualChunks: (id) => {
          // Node modules only - skip src files for auto-chunking
          if (!id.includes('node_modules')) {
            return undefined;
          }

          // Heavy libraries - isolate into their own chunks
          if (id.includes('mermaid')) return 'vendor-mermaid';
          if (id.includes('katex')) return 'vendor-katex';
          if (id.includes('recharts')) return 'vendor-recharts';
          if (id.includes('d3-')) return 'vendor-d3';
          if (id.includes('@blocknote')) return 'vendor-blocknote';
          if (id.includes('@tiptap')) return 'vendor-tiptap';
          if (id.includes('prosemirror')) return 'vendor-prosemirror';
          if (id.includes('@radix-ui')) return 'vendor-radix';
          if (id.includes('@supabase')) return 'vendor-supabase';
          if (id.includes('framer-motion')) return 'vendor-motion';
          if (id.includes('@mantine')) return 'vendor-mantine';
          if (id.includes('@opentelemetry')) return 'vendor-telemetry';
          if (id.includes('@sentry')) return 'vendor-sentry';
          if (id.includes('livekit') || id.includes('@livekit')) return 'vendor-livekit';
          if (id.includes('@elevenlabs')) return 'vendor-elevenlabs';
          if (id.includes('fabric')) return 'vendor-fabric';
          if (id.includes('jspdf')) return 'vendor-pdf';
          if (id.includes('date-fns')) return 'vendor-date-fns';
          if (id.includes('i18next')) return 'vendor-i18n';
          if (id.includes('posthog')) return 'vendor-posthog';
          if (id.includes('@tanstack')) return 'vendor-tanstack';
          if (id.includes('@dnd-kit') || id.includes('@hello-pangea')) return 'vendor-dnd';
          if (id.includes('@capacitor')) return 'vendor-capacitor';
          if (id.includes('lucide')) return 'vendor-lucide';
          if (id.includes('@tabler')) return 'vendor-tabler';
          if (id.includes('zod')) return 'vendor-zod';
          if (id.includes('react-hook-form') || id.includes('@hookform')) return 'vendor-forms';

          // Core React - single vendor chunk
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/react-router')
          ) {
            return 'vendor-react';
          }

          // Everything else in a shared vendor chunk
          return 'vendor-common';
        },
      },
    },
    // Target modern browsers for smaller bundles
    target: 'esnext',
    // Enable CSS code splitting
    cssCodeSplit: true,
  },
}));

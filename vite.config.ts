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
          // CRITICAL: Never cache backend function calls
          // Public booking pages rely on these being fresh and reachable.
          {
            // NOTE: Do not hardcode a single hostname; preview/published environments can differ.
            urlPattern: /^https:\/\/.*\.supabase\.co\/functions\/v1\/.*/i,
            handler: 'NetworkOnly',
            options: {
              cacheName: 'functions-cache-bypass',
            },
          },
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
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
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
    modulePreload: false,
    minify: false,
    cssMinify: false,
    reportCompressedSize: false,
    sourcemap: false,
    chunkSizeWarningLimit: 10000,
    target: 'esnext',
    cssCodeSplit: false, // Single CSS file = less memory
    assetsInlineLimit: 0,

    rollupOptions: {
      maxParallelFileOps: 1, // Minimum parallelism to reduce peak memory
      treeshake: mode === 'production',
      
      // CRITICAL: Mark heavy dependencies as external in dev mode
      // They won't be bundled, reducing memory significantly
      ...(mode === 'development' ? {
        external: [
          'mermaid',
          '@mediapipe/selfie_segmentation',
          '@mediapipe/camera_utils',
          'fabric',
          'katex',
          '@blocknote/core',
          '@blocknote/react',
          '@blocknote/mantine',
          // LiveKit removed - must be bundled for lazy loading to work
          'jspdf',
          'jspdf-autotable',
          '@tiptap/core',
          '@tiptap/react',
          '@tiptap/extensions',
          'prosemirror-state',
          'prosemirror-view',
          'prosemirror-model',
        ],
      } : {}),
      
      output: {
        // OOM FIX: Static object for manualChunks is cheaper than a function
        // and forces the heaviest libs into separate chunks
        manualChunks: mode === 'production'
          ? (id: string) => {
              if (!id.includes('node_modules')) return undefined;
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
              if (id.includes('@sentry')) return 'sentry';
              if (id.includes('posthog')) return 'analytics';
              if (id.includes('@opentelemetry')) return 'telemetry';
              if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
                return 'react-vendor';
              }
            }
          : undefined, // Let Rollup handle chunking in dev to avoid function overhead
      },
    },
  },
}));

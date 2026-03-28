import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => ({
  server: {
    host: true,
    port: 8080,
    strictPort: false,
    warmup: {
      ssrFiles: [],
      clientFiles: [],
    },
  },
  optimizeDeps: {
    entries: ['src/main.tsx'],
    include: [
      // Core React — must be pre-bundled and deduped
      'react', 'react-dom', 'react-dom/client',
      'react/jsx-runtime', 'react/jsx-dev-runtime',
      // Eagerly-used React consumers — must share the same React instance
      'react-router-dom',
      '@supabase/supabase-js',
      '@tanstack/react-query',
      'use-sync-external-store/shim',
      'use-sync-external-store/shim/with-selector',
      'sonner', 'next-themes', 'clsx', 'tailwind-merge',
      'class-variance-authority',
      'date-fns',
      'framer-motion',
      'react-helmet-async',
      'i18next', 'react-i18next', 'i18next-browser-languagedetector',
      'zod', 'react-hook-form', '@hookform/resolvers',
      // Radix primitives used at startup
      '@radix-ui/react-tooltip', '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-dialog', '@radix-ui/react-popover',
      '@radix-ui/react-select', '@radix-ui/react-tabs',
      '@radix-ui/react-slot', '@radix-ui/react-label',
      '@radix-ui/react-separator', '@radix-ui/react-scroll-area',
      '@radix-ui/react-avatar', '@radix-ui/react-switch',
      '@radix-ui/react-checkbox', '@radix-ui/react-toggle',
      '@radix-ui/react-toast', '@radix-ui/react-accordion',
      '@radix-ui/react-progress', '@radix-ui/react-navigation-menu',
      '@mantine/hooks',
    ],
    exclude: ['mermaid', 'katex'],
  },
  plugins: [
    react(),
    // PERF: Bundle visualizer — generates stats.html on production builds
    mode === 'production' && visualizer({
      filename: 'stats.html',
      gzipSize: true,
      brotliSize: true,
      template: 'treemap',
    }) as any,
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
        // CRITICAL: OAuth redirects to /~oauth must always hit the network
        navigateFallbackDenylist: [/^\/~oauth/],
        // CRITICAL: Do NOT precache HTML - use NetworkFirst at runtime
        // This prevents stale index.html from bricking the app after deploy
        globPatterns: ['**/*.{js,css,ico,png,svg,woff2}'],
        // PERF: Exclude locale chunks from precache — they are loaded on-demand
        // when a user switches language, not needed for initial load
        globIgnores: ['**/common-*.js'],
        
        // CRITICAL: Auto-activate new service worker immediately
        // Prevents users from being stuck on old cached version
        skipWaiting: true,
        clientsClaim: true,
        
        // Clean up old caches
        cleanupOutdatedCaches: true,
        
        // Allow hashed bundles up to 3MB for precaching; larger chunks use runtime caching
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        
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
          // CRITICAL: JS/CSS bundles use NetworkFirst to prevent stale asset serving.
          // Even though filenames are content-hashed, a stale sw.js (cached by CDN)
          // can request old hashes. NetworkFirst ensures we always try the network
          // first and only fall back to cache when offline.
          {
            urlPattern: /\.(?:js|css)$/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'static-resources',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              networkTimeoutSeconds: 5,
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
    dedupe: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'scheduler',
      '@mantine/hooks',
    ],
  },
  build: {
    reportCompressedSize: false,
    sourcemap: false,
    chunkSizeWarningLimit: 500,
    target: 'esnext',
    cssCodeSplit: true,

    // PERF: Strip console.* and debugger in production — saves ~50KB+ and prevents GC leaks
    ...(mode === 'production' && {
      minify: 'esbuild',
    }),
    ...(mode === 'production' && {
      esbuild: {
        drop: ['console', 'debugger'],
        legalComments: 'none',
      },
    }),

    rollupOptions: {
      // PERF: Removed maxParallelFileOps: 1 throttle — let Rollup use all cores
      treeshake: true,
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-radix': [
            '@radix-ui/react-tooltip', '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-dialog', '@radix-ui/react-popover',
            '@radix-ui/react-select', '@radix-ui/react-tabs',
            '@radix-ui/react-slot', '@radix-ui/react-label',
            '@radix-ui/react-separator', '@radix-ui/react-scroll-area',
            '@radix-ui/react-avatar', '@radix-ui/react-switch',
            '@radix-ui/react-checkbox', '@radix-ui/react-toggle',
            '@radix-ui/react-toast', '@radix-ui/react-accordion',
            '@radix-ui/react-progress', '@radix-ui/react-navigation-menu',
          ],
          'vendor-charts': ['recharts'],
          'vendor-editor': ['@blocknote/core', '@blocknote/react', '@blocknote/mantine'],
          'vendor-motion': ['framer-motion'],
          'vendor-i18n': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
          'vendor-forms': ['zod', 'react-hook-form', '@hookform/resolvers'],
          // PERF: Isolate heavy libs that should only load on-demand
          'vendor-pdf': ['jspdf', 'jspdf-autotable'],
          'vendor-date': ['date-fns', 'date-fns-tz'],
          'vendor-dnd': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          'vendor-sentry': ['@sentry/react'],
          'vendor-posthog': ['posthog-js'],
          'vendor-helmet': ['react-helmet-async'],
          'vendor-carousel': ['embla-carousel', 'embla-carousel-react'],
        },
      },
    },
  },
}));

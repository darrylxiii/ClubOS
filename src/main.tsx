// Signal IMMEDIATELY that the script is executing (before any imports)
// This allows index.html to detect script loading vs script failure
(window as any).__APP_BOOTING__ = true;
(window as any).__MAIN_LOADED__ = true; // Script successfully started executing

import "./index.css";
import "./i18n/config";
import { initializeGlobalErrorHandlers } from "./utils/globalErrorHandlers";

// Initialize global error handlers BEFORE React renders
// This captures any errors during initialization
initializeGlobalErrorHandlers();

console.log('[Main] 🚀 Starting application initialization...');
console.log('[Main] Environment check:', {
  hasSupabaseUrl: !!import.meta.env.VITE_SUPABASE_URL,
  hasSupabaseKey: !!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  mode: import.meta.env.MODE,
  baseUrl: import.meta.env.BASE_URL,
});

// Dynamic import bootstrap - catches import-time crashes
async function bootstrap() {
  try {
    // Dynamically import React and App to catch any import-time errors
    const [{ createRoot }, { default: App }] = await Promise.all([
      import("react-dom/client"),
      import("./App.tsx"),
    ]);

    const rootElement = document.getElementById("root");
    if (!rootElement) {
      throw new Error('Root element not found');
    }
    
    console.log('[Main] Root element found, creating React root...');
    const root = createRoot(rootElement);
    
    console.log('[Main] Rendering App component...');
    root.render(<App />);
    
    // Signal to the boot timeout that the app has started
    (window as any).__APP_BOOTED__ = true;
    
    console.log('[Main] ✅ Application initialized successfully');
  } catch (error) {
    console.error('[Main] ❌ CRITICAL: Failed to initialize application:', error);
    
    // Report to Sentry if available
    try {
      const { captureException } = await import("@sentry/react");
      captureException(error);
    } catch {
      // Sentry not available
    }
    
    // Render emergency fallback UI with detailed error info
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    
    document.body.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #0E0E10; color: #F5F4EF; font-family: Inter, sans-serif; padding: 2rem;">
        <div style="text-align: center; max-width: 700px;">
          <h1 style="font-size: 1.75rem; margin-bottom: 1rem; color: #C9A24E;">Application Failed to Start</h1>
          <p style="margin-bottom: 1rem; color: #9CA3AF;">A critical error occurred during initialization.</p>
          <div style="background: #1a1a1a; padding: 1rem; border-radius: 0.5rem; text-align: left; margin-bottom: 1rem; border: 1px solid #374151;">
            <p style="font-weight: 600; color: #EF4444; margin-bottom: 0.5rem;">${errorMessage}</p>
            ${errorStack ? `<pre style="font-size: 11px; overflow-x: auto; color: #9CA3AF; white-space: pre-wrap; word-break: break-word;">${errorStack}</pre>` : ''}
          </div>
          <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
            <button onclick="(async function(){
              try {
                const regs = await navigator.serviceWorker.getRegistrations();
                for (const reg of regs) await reg.unregister();
                const cacheNames = await caches.keys();
                for (const name of cacheNames) await caches.delete(name);
                localStorage.clear();
                sessionStorage.clear();
              } catch(e) {}
              location.replace(location.origin + '/auth');
            })()" style="padding: 0.75rem 1.5rem; background: #C9A24E; color: #0E0E10; border: none; border-radius: 0.5rem; cursor: pointer; font-weight: 600;">
              Reset Cache & Reload
            </button>
            <button onclick="location.replace(location.origin + '/auth?safe=1')" style="padding: 0.75rem 1.5rem; background: #374151; color: #F5F4EF; border: none; border-radius: 0.5rem; cursor: pointer;">
              Try Safe Mode
            </button>
          </div>
          <p style="margin-top: 1rem; font-size: 0.75rem; color: #6B7280;">Build: ${import.meta.env.MODE} | ${new Date().toISOString()}</p>
        </div>
      </div>
    `;
  }
}

bootstrap();

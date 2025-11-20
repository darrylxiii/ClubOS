import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n/config";

console.log('[Main] 🚀 Starting application initialization...');
console.log('[Main] Environment check:', {
  hasSupabaseUrl: !!import.meta.env.VITE_SUPABASE_URL,
  hasSupabaseKey: !!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  mode: import.meta.env.MODE,
  baseUrl: import.meta.env.BASE_URL,
});

try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error('Root element not found');
  }
  
  console.log('[Main] Root element found, creating React root...');
  const root = createRoot(rootElement);
  
  console.log('[Main] Rendering App component...');
  root.render(<App />);
  
  console.log('[Main] ✅ Application initialized successfully');
} catch (error) {
  console.error('[Main] ❌ CRITICAL: Failed to initialize application:', error);
  // Render emergency fallback UI
  document.body.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #0E0E10; color: #F5F4EF; font-family: Inter, sans-serif; padding: 2rem;">
      <div style="text-align: center; max-width: 600px;">
        <h1 style="font-size: 2rem; margin-bottom: 1rem;">Application Failed to Start</h1>
        <p style="margin-bottom: 1rem;">We encountered a critical error during initialization.</p>
        <pre style="background: #1a1a1a; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; text-align: left;">${error instanceof Error ? error.message : 'Unknown error'}</pre>
        <button onclick="window.location.reload()" style="margin-top: 1rem; padding: 0.75rem 1.5rem; background: #4a5568; color: white; border: none; border-radius: 0.5rem; cursor: pointer;">Reload Page</button>
      </div>
    </div>
  `;
}
/**
 * Backend runtime config.
 *
 * Some preview environments can omit Vite env vars at runtime. Public pages
 * (like /book/:slug) still need a stable way to reach backend functions.
 *
 * NOTE: The publishable key is safe to ship client-side.
 */

export type BackendConfig = {
  baseUrl: string;
  publishableKey: string;
};

// Last-resort fallback values for this project.
// Keep these as a final safety net when import.meta.env is unavailable.
const FALLBACK_PROJECT_ID = 'dpjucecmoyfzrduhlctt';
const FALLBACK_BASE_URL = `https://${FALLBACK_PROJECT_ID}.supabase.co`;
const FALLBACK_PUBLISHABLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwanVjZWNtb3lmenJkdWhsY3R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0Mjc2MTAsImV4cCI6MjA3NTAwMzYxMH0.hdX709NlaXPUE4ohWtd3LBuAOqPKCBhVep694LC6tRw';

/**
 * Detects if the environment is missing proper Supabase config (placeholder/preview mode).
 * When true, services should skip supabase.functions.invoke and use direct fetch.
 */
export function isPlaceholderEnvironment(): boolean {
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || '';
  // Empty, placeholder, or missing config - all mean we use direct fetch with fallbacks
  return !url || url.includes('placeholder') || url.includes('localhost');
}

/**
 * Native XMLHttpRequest-based fetch that completely bypasses any fetch instrumentation.
 * This is critical for public booking paths that must work even when OTel/other
 * instrumentation breaks the global fetch.
 */
export function nativeFetch(url: string, options: RequestInit = {}): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(options.method || 'GET', url, true);

    // Set headers
    const headers = options.headers as Record<string, string> | undefined;
    if (headers) {
      Object.entries(headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });
    }

    xhr.onload = () => {
      const responseHeaders = new Headers();
      xhr.getAllResponseHeaders()
        .trim()
        .split(/[\r\n]+/)
        .forEach((line) => {
          const parts = line.split(': ');
          const header = parts.shift();
          const value = parts.join(': ');
          if (header) responseHeaders.append(header, value);
        });

      resolve(
        new Response(xhr.responseText, {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: responseHeaders,
        })
      );
    };

    xhr.onerror = () => reject(new Error('Network request failed'));
    xhr.ontimeout = () => reject(new Error('Network request timeout'));

    xhr.send(options.body as string | undefined);
  });
}

export function getBackendConfig(): BackendConfig {
  const envBaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || '';
  const envKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) || '';
  const envProjectId = (import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined) || '';

  const baseUrl = envBaseUrl || (envProjectId ? `https://${envProjectId}.supabase.co` : '');
  const publishableKey = envKey;

  return {
    baseUrl: baseUrl || FALLBACK_BASE_URL,
    publishableKey: publishableKey || FALLBACK_PUBLISHABLE_KEY,
  };
}

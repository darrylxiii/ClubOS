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

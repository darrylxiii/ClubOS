/**
 * Unified Anonymous ID Management
 * Single source of truth for anonymous user tracking across the blog system
 */

const ANONYMOUS_ID_KEY = 'aa_anonymous_id';
const SESSION_ID_KEY = 'aa_session_id';

/**
 * Get or create a persistent anonymous ID
 * Stored in localStorage - persists across sessions
 */
export function getAnonymousId(): string {
  if (typeof window === 'undefined') return '';
  
  let id = localStorage.getItem(ANONYMOUS_ID_KEY);
  if (!id) {
    id = `anon_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    localStorage.setItem(ANONYMOUS_ID_KEY, id);
  }
  return id;
}

/**
 * Get or create a session-scoped ID
 * Stored in sessionStorage - resets on browser close
 */
export function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  
  let id = sessionStorage.getItem(SESSION_ID_KEY);
  if (!id) {
    id = `session_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    sessionStorage.setItem(SESSION_ID_KEY, id);
  }
  return id;
}

/**
 * Clear anonymous tracking data (for testing or privacy reset)
 */
export function clearAnonymousData(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem(ANONYMOUS_ID_KEY);
  sessionStorage.removeItem(SESSION_ID_KEY);
}

/**
 * Check if user has an existing anonymous ID
 */
export function hasAnonymousId(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem(ANONYMOUS_ID_KEY);
}

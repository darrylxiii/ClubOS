/**
 * OAuth CSRF Protection Utilities
 * 
 * Generates and validates cryptographic state parameters for OAuth flows
 * to prevent CSRF attacks.
 */

const OAUTH_STATE_KEY = 'oauth_state';
const OAUTH_STATE_EXPIRY_KEY = 'oauth_state_expiry';
const STATE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Generate a cryptographically secure state parameter for OAuth
 */
export function generateOAuthState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const state = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  
  // Store state and expiry in sessionStorage
  sessionStorage.setItem(OAUTH_STATE_KEY, state);
  sessionStorage.setItem(OAUTH_STATE_EXPIRY_KEY, String(Date.now() + STATE_EXPIRY_MS));
  
  console.log('[OAuth CSRF] State generated and stored');
  return state;
}

/**
 * Validate the OAuth state parameter from the callback
 */
export function validateOAuthState(returnedState: string | null): boolean {
  if (!returnedState) {
    console.warn('[OAuth CSRF] No state parameter in callback');
    return false;
  }

  const storedState = sessionStorage.getItem(OAUTH_STATE_KEY);
  const expiryStr = sessionStorage.getItem(OAUTH_STATE_EXPIRY_KEY);
  
  // Clean up stored state
  sessionStorage.removeItem(OAUTH_STATE_KEY);
  sessionStorage.removeItem(OAUTH_STATE_EXPIRY_KEY);

  if (!storedState) {
    console.warn('[OAuth CSRF] No stored state found');
    return false;
  }

  if (!expiryStr || Date.now() > parseInt(expiryStr, 10)) {
    console.warn('[OAuth CSRF] State has expired');
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  if (!constantTimeCompare(storedState, returnedState)) {
    console.error('[OAuth CSRF] State mismatch - possible CSRF attack');
    return false;
  }

  console.log('[OAuth CSRF] State validated successfully');
  return true;
}

/**
 * Clear any stored OAuth state (for cleanup)
 */
export function clearOAuthState(): void {
  sessionStorage.removeItem(OAUTH_STATE_KEY);
  sessionStorage.removeItem(OAUTH_STATE_EXPIRY_KEY);
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Check if there's a pending OAuth flow
 */
export function hasPendingOAuthFlow(): boolean {
  const storedState = sessionStorage.getItem(OAUTH_STATE_KEY);
  const expiryStr = sessionStorage.getItem(OAUTH_STATE_EXPIRY_KEY);
  
  if (!storedState || !expiryStr) {
    return false;
  }
  
  return Date.now() <= parseInt(expiryStr, 10);
}

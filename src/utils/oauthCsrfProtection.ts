/**
 * OAuth CSRF Protection Utilities
 * 
 * Generates and validates cryptographic state parameters for OAuth flows
 * to prevent CSRF attacks.
 */

import { logger } from '@/lib/logger';

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
  
  // Store state and expiry in localStorage (survives redirects better than sessionStorage)
  try {
    localStorage.setItem(OAUTH_STATE_KEY, state);
    localStorage.setItem(OAUTH_STATE_EXPIRY_KEY, String(Date.now() + STATE_EXPIRY_MS));
    logger.debug('OAuth CSRF state generated and stored', { componentName: 'OAuthCSRF' });
  } catch (e) {
    logger.warn('Failed to store OAuth state in localStorage', { componentName: 'OAuthCSRF', error: e });
  }
  
  return state;
}

/**
 * Validate the OAuth state parameter from the callback
 */
export function validateOAuthState(returnedState: string | null): boolean {
  if (!returnedState) {
    logger.warn('No state parameter in callback', { componentName: 'OAuthCSRF' });
    return false;
  }

  const storedState = localStorage.getItem(OAUTH_STATE_KEY);
  const expiryStr = localStorage.getItem(OAUTH_STATE_EXPIRY_KEY);
  
  // Clean up stored state immediately
  clearOAuthState();

  if (!storedState) {
    logger.warn('No stored state found in localStorage', { componentName: 'OAuthCSRF' });
    return false;
  }

  if (!expiryStr || Date.now() > parseInt(expiryStr, 10)) {
    logger.warn('State has expired', { componentName: 'OAuthCSRF' });
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  if (!constantTimeCompare(storedState, returnedState)) {
    logger.warn('State mismatch', { componentName: 'OAuthCSRF' });
    return false;
  }

  logger.debug('State validated successfully', { componentName: 'OAuthCSRF' });
  return true;
}

/**
 * Clear any stored OAuth state (for cleanup)
 */
export function clearOAuthState(): void {
  try {
    localStorage.removeItem(OAUTH_STATE_KEY);
    localStorage.removeItem(OAUTH_STATE_EXPIRY_KEY);
  } catch (e) {
    console.warn('[OAuth CSRF] Failed to clear state from localStorage:', e);
  }
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
  try {
    const storedState = localStorage.getItem(OAUTH_STATE_KEY);
    const expiryStr = localStorage.getItem(OAUTH_STATE_EXPIRY_KEY);
    
    if (!storedState || !expiryStr) {
      return false;
    }
    
    return Date.now() <= parseInt(expiryStr, 10);
  } catch (e) {
    return false;
  }
}

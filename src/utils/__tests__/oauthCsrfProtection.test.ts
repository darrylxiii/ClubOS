import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  generateOAuthState, 
  validateOAuthState, 
  clearOAuthState,
  hasPendingOAuthFlow 
} from '../oauthCsrfProtection';

describe('oauthCsrfProtection', () => {
  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateOAuthState', () => {
    it('should generate a 64-character hex string', () => {
      const state = generateOAuthState();
      expect(state).toHaveLength(64);
      expect(/^[0-9a-f]+$/i.test(state)).toBe(true);
    });

    it('should store state in sessionStorage', () => {
      const state = generateOAuthState();
      expect(sessionStorage.getItem('oauth_state')).toBe(state);
    });

    it('should store expiry time in sessionStorage', () => {
      generateOAuthState();
      const expiry = sessionStorage.getItem('oauth_state_expiry');
      expect(expiry).not.toBeNull();
      expect(parseInt(expiry!, 10)).toBeGreaterThan(Date.now());
    });

    it('should generate unique states on each call', () => {
      const state1 = generateOAuthState();
      const state2 = generateOAuthState();
      expect(state1).not.toBe(state2);
    });
  });

  describe('validateOAuthState', () => {
    it('should return false for null state', () => {
      expect(validateOAuthState(null)).toBe(false);
    });

    it('should return false when no stored state', () => {
      expect(validateOAuthState('some-state')).toBe(false);
    });

    it('should return false for mismatched state', () => {
      generateOAuthState();
      expect(validateOAuthState('wrong-state')).toBe(false);
    });

    it('should return true for matching state', () => {
      const state = generateOAuthState();
      expect(validateOAuthState(state)).toBe(true);
    });

    it('should clear stored state after validation', () => {
      const state = generateOAuthState();
      validateOAuthState(state);
      expect(sessionStorage.getItem('oauth_state')).toBeNull();
      expect(sessionStorage.getItem('oauth_state_expiry')).toBeNull();
    });

    it('should return false for expired state', () => {
      const state = generateOAuthState();
      // Manually set expiry to past
      sessionStorage.setItem('oauth_state_expiry', String(Date.now() - 1000));
      expect(validateOAuthState(state)).toBe(false);
    });
  });

  describe('clearOAuthState', () => {
    it('should remove state and expiry from sessionStorage', () => {
      generateOAuthState();
      clearOAuthState();
      expect(sessionStorage.getItem('oauth_state')).toBeNull();
      expect(sessionStorage.getItem('oauth_state_expiry')).toBeNull();
    });

    it('should not throw when storage is empty', () => {
      expect(() => clearOAuthState()).not.toThrow();
    });
  });

  describe('hasPendingOAuthFlow', () => {
    it('should return false when no pending flow', () => {
      expect(hasPendingOAuthFlow()).toBe(false);
    });

    it('should return true after generating state', () => {
      generateOAuthState();
      expect(hasPendingOAuthFlow()).toBe(true);
    });

    it('should return false after state is validated', () => {
      const state = generateOAuthState();
      validateOAuthState(state);
      expect(hasPendingOAuthFlow()).toBe(false);
    });

    it('should return false for expired state', () => {
      generateOAuthState();
      sessionStorage.setItem('oauth_state_expiry', String(Date.now() - 1000));
      expect(hasPendingOAuthFlow()).toBe(false);
    });
  });
});

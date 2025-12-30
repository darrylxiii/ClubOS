import { describe, it, expect, vi, beforeEach } from 'vitest';
import { secureStorage } from '../secureStorage';

describe('secureStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('saveSessionToken', () => {
    it('should save session tokens successfully', async () => {
      const result = await secureStorage.saveSessionToken('access-token', 'refresh-token');
      expect(result).toBe(true);
    });

    it('should store tokens in localStorage', async () => {
      await secureStorage.saveSessionToken('access-token', 'refresh-token');
      
      // Verify something was stored (encoded)
      const keys = Object.keys(localStorage).filter(k => k.startsWith('tqc_secure_'));
      expect(keys.length).toBeGreaterThan(0);
    });
  });

  describe('getSessionTokens', () => {
    it('should retrieve stored session tokens', async () => {
      await secureStorage.saveSessionToken('test-access', 'test-refresh');
      
      const tokens = await secureStorage.getSessionTokens();
      
      expect(tokens).not.toBeNull();
      expect(tokens?.accessToken).toBe('test-access');
      expect(tokens?.refreshToken).toBe('test-refresh');
    });

    it('should return null when no tokens stored', async () => {
      const tokens = await secureStorage.getSessionTokens();
      expect(tokens).toBeNull();
    });
  });

  describe('clearSessionTokens', () => {
    it('should clear session tokens', async () => {
      await secureStorage.saveSessionToken('access', 'refresh');
      
      const result = await secureStorage.clearSessionTokens();
      
      expect(result).toBe(true);
      
      const tokens = await secureStorage.getSessionTokens();
      expect(tokens).toBeNull();
    });
  });

  describe('setBiometricEnabled', () => {
    it('should save biometric preference', async () => {
      const result = await secureStorage.setBiometricEnabled(true);
      expect(result).toBe(true);
    });
  });

  describe('isBiometricEnabled', () => {
    it('should return true when enabled', async () => {
      await secureStorage.setBiometricEnabled(true);
      
      const enabled = await secureStorage.isBiometricEnabled();
      expect(enabled).toBe(true);
    });

    it('should return false when disabled', async () => {
      await secureStorage.setBiometricEnabled(false);
      
      const enabled = await secureStorage.isBiometricEnabled();
      expect(enabled).toBe(false);
    });

    it('should return false by default', async () => {
      const enabled = await secureStorage.isBiometricEnabled();
      expect(enabled).toBe(false);
    });
  });

  describe('updateLastAuthTime', () => {
    it('should update last auth time', async () => {
      const result = await secureStorage.updateLastAuthTime();
      expect(result).toBe(true);
    });
  });

  describe('getLastAuthTime', () => {
    it('should return last auth time after update', async () => {
      const before = Date.now();
      await secureStorage.updateLastAuthTime();
      const after = Date.now();
      
      const lastAuthTime = await secureStorage.getLastAuthTime();
      
      expect(lastAuthTime).not.toBeNull();
      expect(lastAuthTime).toBeGreaterThanOrEqual(before);
      expect(lastAuthTime).toBeLessThanOrEqual(after);
    });

    it('should return null when never set', async () => {
      const lastAuthTime = await secureStorage.getLastAuthTime();
      expect(lastAuthTime).toBeNull();
    });
  });

  describe('shouldRequireReauth', () => {
    it('should require reauth when never authenticated', async () => {
      const shouldReauth = await secureStorage.shouldRequireReauth();
      expect(shouldReauth).toBe(true);
    });

    it('should not require reauth immediately after auth', async () => {
      await secureStorage.updateLastAuthTime();
      
      const shouldReauth = await secureStorage.shouldRequireReauth(5);
      expect(shouldReauth).toBe(false);
    });
  });

  describe('clearAll', () => {
    it('should clear all secure storage', async () => {
      await secureStorage.saveSessionToken('access', 'refresh');
      await secureStorage.setBiometricEnabled(true);
      
      const result = await secureStorage.clearAll();
      
      expect(result).toBe(true);
      
      const tokens = await secureStorage.getSessionTokens();
      expect(tokens).toBeNull();
    });
  });

  describe('isNative', () => {
    it('should return boolean', () => {
      const isNative = secureStorage.isNative();
      expect(typeof isNative).toBe('boolean');
    });
  });
});

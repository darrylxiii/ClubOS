const STORAGE_PREFIX = 'tqc_secure_';

interface SecureStorageService {
  setItem: (key: string, value: string) => Promise<boolean>;
  getItem: (key: string) => Promise<string | null>;
  removeItem: (key: string) => Promise<boolean>;
  clear: () => Promise<boolean>;
}

// Web storage using localStorage with basic obfuscation
const webStorage: SecureStorageService = {
  setItem: async (key: string, value: string) => {
    try {
      const encoded = btoa(encodeURIComponent(value));
      localStorage.setItem(`${STORAGE_PREFIX}${key}`, encoded);
      return true;
    } catch {
      return false;
    }
  },
  getItem: async (key: string) => {
    try {
      const encoded = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
      if (!encoded) return null;
      return decodeURIComponent(atob(encoded));
    } catch {
      return null;
    }
  },
  removeItem: async (key: string) => {
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
      return true;
    } catch {
      return false;
    }
  },
  clear: async () => {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_PREFIX));
      keys.forEach(k => localStorage.removeItem(k));
      return true;
    } catch {
      return false;
    }
  },
};

// Session token management
const SESSION_TOKEN_KEY = 'session_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const LAST_AUTH_TIME_KEY = 'last_auth_time';

export const secureStorage = {
  // Store session token after successful login
  saveSessionToken: async (accessToken: string, refreshToken: string): Promise<boolean> => {
    const storage = webStorage;
    const [accessResult, refreshResult] = await Promise.all([
      storage.setItem(SESSION_TOKEN_KEY, accessToken),
      storage.setItem(REFRESH_TOKEN_KEY, refreshToken),
    ]);
    return accessResult && refreshResult;
  },

  // Retrieve session tokens
  getSessionTokens: async (): Promise<{ accessToken: string; refreshToken: string } | null> => {
    const storage = webStorage;
    const [accessToken, refreshToken] = await Promise.all([
      storage.getItem(SESSION_TOKEN_KEY),
      storage.getItem(REFRESH_TOKEN_KEY),
    ]);
    if (!accessToken || !refreshToken) return null;
    return { accessToken, refreshToken };
  },

  // Clear session tokens (logout)
  clearSessionTokens: async (): Promise<boolean> => {
    const storage = webStorage;
    const [accessResult, refreshResult] = await Promise.all([
      storage.removeItem(SESSION_TOKEN_KEY),
      storage.removeItem(REFRESH_TOKEN_KEY),
    ]);
    return accessResult && refreshResult;
  },

  // Biometric settings
  setBiometricEnabled: async (enabled: boolean): Promise<boolean> => {
    return webStorage.setItem(BIOMETRIC_ENABLED_KEY, String(enabled));
  },

  isBiometricEnabled: async (): Promise<boolean> => {
    const value = await webStorage.getItem(BIOMETRIC_ENABLED_KEY);
    return value === 'true';
  },

  // Track last authentication time for auto-lock
  updateLastAuthTime: async (): Promise<boolean> => {
    return webStorage.setItem(LAST_AUTH_TIME_KEY, String(Date.now()));
  },

  getLastAuthTime: async (): Promise<number | null> => {
    const value = await webStorage.getItem(LAST_AUTH_TIME_KEY);
    return value ? parseInt(value, 10) : null;
  },

  // Check if session needs re-authentication (auto-lock after timeout)
  shouldRequireReauth: async (timeoutMinutes: number = 5): Promise<boolean> => {
    const lastAuthTime = await secureStorage.getLastAuthTime();
    if (!lastAuthTime) return true;
    
    const elapsed = Date.now() - lastAuthTime;
    const timeoutMs = timeoutMinutes * 60 * 1000;
    return elapsed > timeoutMs;
  },

  // Clear all secure storage
  clearAll: async (): Promise<boolean> => {
    return webStorage.clear();
  },

  // Check if we're on a native platform (always false for web)
  isNative: (): boolean => {
    return false;
  },
};

export default secureStorage;

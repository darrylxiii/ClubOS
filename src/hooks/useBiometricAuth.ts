import { useCallback, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';

interface BiometricAvailability {
  isAvailable: boolean;
  biometryType: 'face' | 'fingerprint' | 'iris' | 'none';
  errorMessage?: string;
}

interface BiometricResult {
  success: boolean;
  errorMessage?: string;
}

// Native biometric plugin interface (dynamically loaded)
interface NativeBiometricPlugin {
  isAvailable: () => Promise<{ isAvailable: boolean; biometryType: number }>;
  verifyIdentity: (options: {
    reason?: string;
    title?: string;
    subtitle?: string;
    description?: string;
  }) => Promise<void>;
  setCredentials: (options: { server: string; username: string; password: string }) => Promise<void>;
  getCredentials: (options: { server: string }) => Promise<{ username: string; password: string }>;
  deleteCredentials: (options: { server: string }) => Promise<void>;
}

let nativeBiometricPlugin: NativeBiometricPlugin | null = null;

// Try to load native biometric plugin dynamically
async function loadNativeBiometric(): Promise<NativeBiometricPlugin | null> {
  if (nativeBiometricPlugin) return nativeBiometricPlugin;
  
  if (!Capacitor.isNativePlatform()) return null;
  
  try {
    // Try multiple known biometric plugins
    const plugins = [
      '@nicaela-alexandra/capacitor-native-biometric',
      '@capacitor-community/biometric-auth',
      'capacitor-native-biometric',
    ];
    
    for (const pluginName of plugins) {
      try {
        const module = await import(/* @vite-ignore */ pluginName);
        if (module.NativeBiometric) {
          nativeBiometricPlugin = module.NativeBiometric;
          return nativeBiometricPlugin;
        }
      } catch {
        // Plugin not available, try next
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function useBiometricAuth() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [biometryType, setBiometryType] = useState<'face' | 'fingerprint' | 'iris' | 'none'>('none');
  const [isLoading, setIsLoading] = useState(true);
  const isNative = Capacitor.isNativePlatform();

  // Check biometric availability
  const checkAvailability = useCallback(async (): Promise<BiometricAvailability> => {
    if (!isNative) {
      // Web: Check for WebAuthn support
      const webAuthnAvailable = typeof window !== 'undefined' && window.PublicKeyCredential !== undefined;
      return {
        isAvailable: webAuthnAvailable,
        biometryType: webAuthnAvailable ? 'fingerprint' : 'none',
      };
    }

    try {
      const plugin = await loadNativeBiometric();
      
      if (!plugin) {
        return { isAvailable: false, biometryType: 'none', errorMessage: 'Plugin not available' };
      }

      const result = await plugin.isAvailable();
      
      let type: 'face' | 'fingerprint' | 'iris' | 'none' = 'none';
      if (result.biometryType === 1) type = 'fingerprint';
      else if (result.biometryType === 2) type = 'face';
      else if (result.biometryType === 3) type = 'iris';

      return {
        isAvailable: result.isAvailable,
        biometryType: type,
      };
    } catch (error) {
      return {
        isAvailable: false,
        biometryType: 'none',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }, [isNative]);

  // Authenticate with biometrics
  const authenticate = useCallback(async (reason?: string): Promise<BiometricResult> => {
    if (!isNative) {
      // Web fallback - simulated success for development
      return { success: true };
    }

    try {
      const plugin = await loadNativeBiometric();
      
      if (!plugin) {
        return { success: false, errorMessage: 'Plugin not available' };
      }

      await plugin.verifyIdentity({
        reason: reason || 'Unlock The Quantum Club',
        title: 'Authentication Required',
        subtitle: 'Use biometrics to continue',
        description: 'Place your finger on the sensor or look at the camera',
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Authentication failed',
      };
    }
  }, [isNative]);

  // Store credentials securely
  const setCredentials = useCallback(async (server: string, username: string, password: string): Promise<boolean> => {
    if (!isNative) {
      // Web fallback - use sessionStorage (less secure)
      try {
        sessionStorage.setItem(`biometric_${server}`, JSON.stringify({ username, password }));
        return true;
      } catch {
        return false;
      }
    }

    try {
      const plugin = await loadNativeBiometric();
      if (!plugin) return false;

      await plugin.setCredentials({ server, username, password });
      return true;
    } catch {
      return false;
    }
  }, [isNative]);

  // Get stored credentials
  const getCredentials = useCallback(async (server: string): Promise<{ username: string; password: string } | null> => {
    if (!isNative) {
      try {
        const stored = sessionStorage.getItem(`biometric_${server}`);
        return stored ? JSON.parse(stored) : null;
      } catch {
        return null;
      }
    }

    try {
      const plugin = await loadNativeBiometric();
      if (!plugin) return null;

      const credentials = await plugin.getCredentials({ server });
      return { username: credentials.username, password: credentials.password };
    } catch {
      return null;
    }
  }, [isNative]);

  // Delete stored credentials
  const deleteCredentials = useCallback(async (server: string): Promise<boolean> => {
    if (!isNative) {
      try {
        sessionStorage.removeItem(`biometric_${server}`);
        return true;
      } catch {
        return false;
      }
    }

    try {
      const plugin = await loadNativeBiometric();
      if (!plugin) return false;

      await plugin.deleteCredentials({ server });
      return true;
    } catch {
      return false;
    }
  }, [isNative]);

  // Get friendly biometry name
  const getBiometryName = useCallback((): string => {
    switch (biometryType) {
      case 'face': return 'Face ID';
      case 'fingerprint': return 'Touch ID';
      case 'iris': return 'Iris Scan';
      default: return 'Biometrics';
    }
  }, [biometryType]);

  // Initialize on mount
  useEffect(() => {
    checkAvailability().then((result) => {
      setIsAvailable(result.isAvailable);
      setBiometryType(result.biometryType);
      setIsLoading(false);
    });
  }, [checkAvailability]);

  return {
    isAvailable,
    biometryType,
    biometryName: getBiometryName(),
    isLoading,
    isNative,
    authenticate,
    setCredentials,
    getCredentials,
    deleteCredentials,
    checkAvailability,
  };
}

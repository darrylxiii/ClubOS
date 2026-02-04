import { useCallback, useEffect, useState } from 'react';

interface BiometricAvailability {
  isAvailable: boolean;
  biometryType: 'face' | 'fingerprint' | 'iris' | 'none';
  errorMessage?: string;
}

interface BiometricResult {
  success: boolean;
  errorMessage?: string;
}

export function useBiometricAuth() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [biometryType, setBiometryType] = useState<'face' | 'fingerprint' | 'iris' | 'none'>('none');
  const [isLoading, setIsLoading] = useState(true);
  const isNative = false; // Web-only - no native platform support

  // Check biometric availability (web fallback)
  const checkAvailability = useCallback(async (): Promise<BiometricAvailability> => {
    // Web: Check for WebAuthn support
    const webAuthnAvailable = typeof window !== 'undefined' && window.PublicKeyCredential !== undefined;
    return {
      isAvailable: webAuthnAvailable,
      biometryType: webAuthnAvailable ? 'fingerprint' : 'none',
    };
  }, []);

  // Authenticate with biometrics (web fallback - simulated success)
  const authenticate = useCallback(async (reason?: string): Promise<BiometricResult> => {
    // Web fallback - simulated success for development
    return { success: true };
  }, []);

  // Store credentials securely (web fallback using sessionStorage)
  const setCredentials = useCallback(async (server: string, username: string, password: string): Promise<boolean> => {
    try {
      sessionStorage.setItem(`biometric_${server}`, JSON.stringify({ username, password }));
      return true;
    } catch {
      return false;
    }
  }, []);

  // Get stored credentials
  const getCredentials = useCallback(async (server: string): Promise<{ username: string; password: string } | null> => {
    try {
      const stored = sessionStorage.getItem(`biometric_${server}`);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, []);

  // Delete stored credentials
  const deleteCredentials = useCallback(async (server: string): Promise<boolean> => {
    try {
      sessionStorage.removeItem(`biometric_${server}`);
      return true;
    } catch {
      return false;
    }
  }, []);

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

import { ReactNode, createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useSafeArea } from '@/hooks/useSafeArea';
import { secureStorage } from '@/services/secureStorage';
import { BiometricLockScreen } from '@/components/native/BiometricLockScreen';
import { useNavigate } from 'react-router-dom';

interface MobileLayoutContextValue {
  isNative: boolean;
  isLocked: boolean;
  insets: { top: number; right: number; bottom: number; left: number };
  hasNotch: boolean;
  hasHomeIndicator: boolean;
  lockApp: () => void;
  unlockApp: () => void;
}

const MobileLayoutContext = createContext<MobileLayoutContextValue | null>(null);

export function useMobileLayout() {
  const context = useContext(MobileLayoutContext);
  if (!context) {
    throw new Error('useMobileLayout must be used within MobileLayoutProvider');
  }
  return context;
}

interface MobileLayoutProviderProps {
  children: ReactNode;
  autoLockEnabled?: boolean;
  autoLockTimeout?: number; // minutes
}

export function MobileLayoutProvider({
  children,
  autoLockEnabled = false,
  autoLockTimeout = 5,
}: MobileLayoutProviderProps) {
  const { insets, isNative, hasNotch, hasHomeIndicator } = useSafeArea();
  const [isLocked, setIsLocked] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const navigate = useNavigate();

  // Check if biometric lock is enabled
  useEffect(() => {
    const checkBiometric = async () => {
      const enabled = await secureStorage.isBiometricEnabled();
      setBiometricEnabled(enabled);
    };
    checkBiometric();
  }, []);

  // Handle app visibility changes (background/foreground) - web version
  useEffect(() => {
    if (!autoLockEnabled || !biometricEnabled) return;

    const handleVisibilityChange = async () => {
      if (document.hidden) {
        await secureStorage.updateLastAuthTime();
      } else {
        const shouldLock = await secureStorage.shouldRequireReauth(autoLockTimeout);
        if (shouldLock && biometricEnabled) {
          setIsLocked(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [autoLockEnabled, autoLockTimeout, biometricEnabled]);

  const lockApp = useCallback(() => {
    if (biometricEnabled) {
      setIsLocked(true);
    }
  }, [biometricEnabled]);

  const unlockApp = useCallback(async () => {
    await secureStorage.updateLastAuthTime();
    setIsLocked(false);
  }, []);

  const handleFallbackLogin = useCallback(() => {
    setIsLocked(false);
    navigate('/auth');
  }, [navigate]);

  const value: MobileLayoutContextValue = {
    isNative,
    isLocked,
    insets,
    hasNotch,
    hasHomeIndicator,
    lockApp,
    unlockApp,
  };

  return (
    <MobileLayoutContext.Provider value={value}>
      {/* Biometric Lock Screen Overlay */}
      {isLocked && biometricEnabled && (
        <BiometricLockScreen
          onUnlock={unlockApp}
          onFallbackLogin={handleFallbackLogin}
        />
      )}
      
      {/* Main content */}
      <div
        className="min-h-screen"
        style={{
          // Apply safe area padding as CSS custom properties
          '--safe-area-top': `env(safe-area-inset-top, 0px)`,
          '--safe-area-right': `env(safe-area-inset-right, 0px)`,
          '--safe-area-bottom': `env(safe-area-inset-bottom, 0px)`,
          '--safe-area-left': `env(safe-area-inset-left, 0px)`,
        } as React.CSSProperties}
      >
        {children}
      </div>
    </MobileLayoutContext.Provider>
  );
}

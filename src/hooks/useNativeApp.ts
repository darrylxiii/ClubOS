import { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface AppState {
  isActive: boolean;
  isNative: boolean;
  platform: 'ios' | 'android' | 'web';
}

export function useNativeApp() {
  const navigate = useNavigate();
  const [appState, setAppState] = useState<AppState>({
    isActive: true,
    isNative: false, // Web-only - no native platform support
    platform: 'web',
  });

  // Web: Listen for visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      setAppState(prev => ({ ...prev, isActive: !document.hidden }));
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Handle back navigation (browser back button)
  useEffect(() => {
    const handlePopState = () => {
      // Browser handles this natively
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [navigate]);

  const exitApp = useCallback(async () => {
    // No-op for web - can't exit browser
  }, []);

  const minimizeApp = useCallback(async () => {
    // No-op for web - can't minimize browser
  }, []);

  const getAppInfo = useCallback(async () => {
    // Return basic web info
    return {
      id: 'web',
      name: 'thequantumclub',
      build: '1',
      version: '1.0.0',
    };
  }, []);

  return {
    ...appState,
    exitApp,
    minimizeApp,
    getAppInfo,
  };
}

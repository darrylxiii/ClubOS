import { useEffect, useCallback, useState } from 'react';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
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
    isNative: Capacitor.isNativePlatform(),
    platform: Capacitor.getPlatform() as 'ios' | 'android' | 'web',
  });

  // Handle deep links
  const handleDeepLink = useCallback((event: URLOpenListenerEvent) => {
    const url = new URL(event.url);
    const path = url.pathname;
    
    // Navigate to the appropriate route
    if (path) {
      navigate(path);
    }
  }, [navigate]);

  // Handle back button (Android)
  const handleBackButton = useCallback(() => {
    // Check if we can go back in history
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    
    // Otherwise minimize app (Android only)
    if (appState.platform === 'android') {
      App.minimizeApp();
    }
  }, [navigate, appState.platform]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // Listen for app state changes
    const stateListener = App.addListener('appStateChange', ({ isActive }) => {
      setAppState(prev => ({ ...prev, isActive }));
    });

    // Listen for deep links
    const urlListener = App.addListener('appUrlOpen', handleDeepLink);

    // Listen for back button (Android)
    const backListener = App.addListener('backButton', handleBackButton);

    return () => {
      stateListener.then(l => l.remove());
      urlListener.then(l => l.remove());
      backListener.then(l => l.remove());
    };
  }, [handleDeepLink, handleBackButton]);

  const exitApp = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      await App.exitApp();
    }
  }, []);

  const minimizeApp = useCallback(async () => {
    if (Capacitor.isNativePlatform() && appState.platform === 'android') {
      await App.minimizeApp();
    }
  }, [appState.platform]);

  const getAppInfo = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return null;
    return await App.getInfo();
  }, []);

  return {
    ...appState,
    exitApp,
    minimizeApp,
    getAppInfo,
  };
}

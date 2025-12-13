import { useCallback } from 'react';
import { SplashScreen } from '@capacitor/splash-screen';
import { Capacitor } from '@capacitor/core';

interface SplashOptions {
  fadeOutDuration?: number;
  showDuration?: number;
}

export function useSplashScreen() {
  const isNative = Capacitor.isNativePlatform();

  const hide = useCallback(async (options?: SplashOptions) => {
    if (!isNative) return;
    
    await SplashScreen.hide({
      fadeOutDuration: options?.fadeOutDuration ?? 300,
    });
  }, [isNative]);

  const show = useCallback(async (options?: SplashOptions) => {
    if (!isNative) return;
    
    await SplashScreen.show({
      showDuration: options?.showDuration ?? 2000,
      autoHide: true,
      fadeInDuration: 300,
      fadeOutDuration: options?.fadeOutDuration ?? 300,
    });
  }, [isNative]);

  return {
    hide,
    show,
    isNative,
  };
}

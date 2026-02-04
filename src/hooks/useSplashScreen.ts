import { useCallback } from 'react';

interface SplashOptions {
  fadeOutDuration?: number;
  showDuration?: number;
}

export function useSplashScreen() {
  const isNative = false;
  const hide = useCallback(async (options?: SplashOptions) => {}, []);
  const show = useCallback(async (options?: SplashOptions) => {}, []);
  return { hide, show, isNative };
}

import { useMemo } from 'react';

type Platform = 'ios' | 'android' | 'web';

interface PlatformInfo {
  platform: Platform;
  isNative: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isWeb: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  hasSafeArea: boolean;
  supportsHaptics: boolean;
  supportsPushNotifications: boolean;
  supportsBiometrics: boolean;
}

export function usePlatform(): PlatformInfo {
  return useMemo(() => {
    const platform: Platform = 'web';
    const isNative = false;
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileUA = /iphone|ipod|android|blackberry|windows phone/i.test(userAgent);
    const isTabletUA = /ipad|android(?!.*mobile)/i.test(userAgent);
    const screenWidth = window.innerWidth;
    
    const isMobile = isMobileUA || screenWidth < 768;
    const isTablet = isTabletUA || (screenWidth >= 768 && screenWidth < 1024);
    const isDesktop = !isMobile && !isTablet;
    const hasSafeArea = CSS.supports('padding-top: env(safe-area-inset-top)');

    return {
      platform,
      isNative,
      isIOS: false,
      isAndroid: false,
      isWeb: true,
      isMobile,
      isTablet,
      isDesktop,
      hasSafeArea,
      supportsHaptics: 'vibrate' in navigator,
      supportsPushNotifications: 'Notification' in window,
      supportsBiometrics: false,
    };
  }, []);
}

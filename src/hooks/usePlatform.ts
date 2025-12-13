import { useMemo } from 'react';
import { Capacitor } from '@capacitor/core';

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
    const platform = Capacitor.getPlatform() as Platform;
    const isNative = Capacitor.isNativePlatform();
    const isIOS = platform === 'ios';
    const isAndroid = platform === 'android';
    const isWeb = platform === 'web';

    // Detect device type based on screen size and user agent
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileUA = /iphone|ipod|android|blackberry|windows phone/i.test(userAgent);
    const isTabletUA = /ipad|android(?!.*mobile)/i.test(userAgent);
    const screenWidth = window.innerWidth;
    
    const isMobile = isNative || isMobileUA || screenWidth < 768;
    const isTablet = isTabletUA || (screenWidth >= 768 && screenWidth < 1024);
    const isDesktop = !isMobile && !isTablet;

    // Feature detection
    const hasSafeArea = isIOS || (isWeb && CSS.supports('padding-top: env(safe-area-inset-top)'));
    const supportsHaptics = isNative || 'vibrate' in navigator;
    const supportsPushNotifications = isNative || 'Notification' in window;
    const supportsBiometrics = isNative; // Only available in native apps

    return {
      platform,
      isNative,
      isIOS,
      isAndroid,
      isWeb,
      isMobile,
      isTablet,
      isDesktop,
      hasSafeArea,
      supportsHaptics,
      supportsPushNotifications,
      supportsBiometrics,
    };
  }, []);
}

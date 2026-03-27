import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.thequantumclub.os',
  appName: 'thequantumclub',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0E0E10',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0E0E10',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    NativeBiometric: {
      useFallback: true,
      fallbackTitle: 'Use PIN',
      maxAttempts: 3,
    },
  },
  ios: {
    scheme: 'thequantumclub',
    contentInset: 'automatic',
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#0E0E10',
  },
};

export default config;

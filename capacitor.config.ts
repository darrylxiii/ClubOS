import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.ed1ccbeab8dd4007bcc4b3329d10bf67',
  appName: 'thequantumclub',
  webDir: 'dist',
  server: {
    url: 'https://ed1ccbea-b8dd-4007-bcc4-b3329d10bf67.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
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

import { registerSW } from 'virtual:pwa-register';

export function registerServiceWorker() {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      console.log('[PWA] New content available, please refresh.');
      if (confirm('New version available! Reload to update?')) {
        updateSW(true);
      }
    },
    onOfflineReady() {
      console.log('[PWA] App ready to work offline');
    },
    onRegistered(registration) {
      console.log('[PWA] Service Worker registered:', registration);
    },
    onRegisterError(error) {
      console.error('[PWA] Service Worker registration error:', error);
    }
  });

  return updateSW;
}

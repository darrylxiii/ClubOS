import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface InstallPromptState {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  isStandalone: boolean;
  deferredPrompt: BeforeInstallPromptEvent | null;
}

export function useInstallPrompt() {
  const [state, setState] = useState<InstallPromptState>({
    isInstallable: false,
    isInstalled: false,
    isIOS: false,
    isStandalone: false,
    deferredPrompt: null,
  });

  useEffect(() => {
    // Check if already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true
      || document.referrer.includes('android-app://');

    // Check if iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

    // Check localStorage for dismissed state
    const isDismissed = localStorage.getItem('pwa-install-dismissed') === 'true';

    setState(prev => ({
      ...prev,
      isStandalone,
      isIOS,
      isInstalled: isStandalone,
    }));

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      
      setState(prev => ({
        ...prev,
        isInstallable: !isDismissed,
        deferredPrompt: promptEvent,
      }));
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setState(prev => ({
        ...prev,
        isInstallable: false,
        isInstalled: true,
        deferredPrompt: null,
      }));
      localStorage.removeItem('pwa-install-dismissed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!state.deferredPrompt) {
      return { outcome: 'dismissed' as const, platform: '' };
    }

    try {
      await state.deferredPrompt.prompt();
      const result = await state.deferredPrompt.userChoice;
      
      if (result.outcome === 'accepted') {
        setState(prev => ({
          ...prev,
          isInstallable: false,
          deferredPrompt: null,
        }));
      }
      
      return result;
    } catch (error) {
      console.error('Error prompting install:', error);
      return { outcome: 'dismissed' as const, platform: '' };
    }
  }, [state.deferredPrompt]);

  const dismissPrompt = useCallback(() => {
    localStorage.setItem('pwa-install-dismissed', 'true');
    setState(prev => ({
      ...prev,
      isInstallable: false,
    }));
  }, []);

  const resetDismissal = useCallback(() => {
    localStorage.removeItem('pwa-install-dismissed');
    if (state.deferredPrompt) {
      setState(prev => ({
        ...prev,
        isInstallable: true,
      }));
    }
  }, [state.deferredPrompt]);

  return {
    ...state,
    promptInstall,
    dismissPrompt,
    resetDismissal,
  };
}

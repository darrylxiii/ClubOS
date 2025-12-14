import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export function useSafeArea() {
  const [insets, setInsets] = useState<SafeAreaInsets>({ top: 0, right: 0, bottom: 0, left: 0 });
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    const updateInsets = () => {
      const computedStyle = getComputedStyle(document.documentElement);
      
      // Parse CSS env() values
      const parseEnvValue = (value: string): number => {
        const match = value.match(/(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      };

      // Create a temp element to compute safe area values
      const tempEl = document.createElement('div');
      tempEl.style.cssText = `
        position: fixed;
        top: env(safe-area-inset-top, 0px);
        right: env(safe-area-inset-right, 0px);
        bottom: env(safe-area-inset-bottom, 0px);
        left: env(safe-area-inset-left, 0px);
        pointer-events: none;
        visibility: hidden;
      `;
      document.body.appendChild(tempEl);

      const rect = tempEl.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      setInsets({
        top: rect.top,
        right: viewportWidth - rect.right,
        bottom: viewportHeight - rect.bottom,
        left: rect.left,
      });

      document.body.removeChild(tempEl);
    };

    updateInsets();
    window.addEventListener('resize', updateInsets);
    window.addEventListener('orientationchange', updateInsets);

    return () => {
      window.removeEventListener('resize', updateInsets);
      window.removeEventListener('orientationchange', updateInsets);
    };
  }, []);

  return {
    insets,
    isNative,
    // CSS custom properties for inline styles
    style: {
      paddingTop: `env(safe-area-inset-top, 0px)`,
      paddingRight: `env(safe-area-inset-right, 0px)`,
      paddingBottom: `env(safe-area-inset-bottom, 0px)`,
      paddingLeft: `env(safe-area-inset-left, 0px)`,
    },
    // Check if device has notch/dynamic island
    hasNotch: insets.top > 20,
    // Check if device has home indicator
    hasHomeIndicator: insets.bottom > 0,
  };
}

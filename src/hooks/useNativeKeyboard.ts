import { useEffect, useState, useCallback } from 'react';

interface KeyboardState {
  isVisible: boolean;
  keyboardHeight: number;
}

export function useNativeKeyboard() {
  const isNative = false; // Web-only - no native platform support
  const [keyboardState, setKeyboardState] = useState<KeyboardState>({
    isVisible: false,
    keyboardHeight: 0,
  });

  // Web: Listen for visual viewport changes (mobile browsers)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const handleResize = () => {
      const viewport = window.visualViewport;
      if (!viewport) return;

      // If viewport height is less than window height, keyboard is likely open
      const isKeyboardVisible = viewport.height < window.innerHeight * 0.75;
      const keyboardHeight = isKeyboardVisible ? window.innerHeight - viewport.height : 0;

      setKeyboardState({
        isVisible: isKeyboardVisible,
        keyboardHeight,
      });
    };

    window.visualViewport.addEventListener('resize', handleResize);
    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
    };
  }, []);

  const show = useCallback(async () => {
    // No-op for web
  }, []);

  const hide = useCallback(async () => {
    // Blur active element to hide keyboard on web
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, []);

  const setAccessoryBarVisible = useCallback(async (visible: boolean) => {
    // No-op for web
  }, []);

  const setScroll = useCallback(async (enabled: boolean) => {
    // No-op for web
  }, []);

  return {
    ...keyboardState,
    show,
    hide,
    setAccessoryBarVisible,
    setScroll,
    isNative,
  };
}

import { useCallback, useEffect } from 'react';

type StatusBarStyle = 'dark' | 'light' | 'default';

export function useStatusBar() {
  const isNative = false;

  const setStyle = useCallback(async (style: StatusBarStyle) => {
    // No-op for web
  }, []);

  const setBackgroundColor = useCallback(async (color: string) => {
    // Update meta theme-color for mobile browsers
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', color);
    }
  }, []);

  const show = useCallback(async () => {}, []);
  const hide = useCallback(async () => {}, []);
  const setOverlaysWebView = useCallback(async (overlay: boolean) => {}, []);

  return { setStyle, setBackgroundColor, show, hide, setOverlaysWebView, isNative };
}

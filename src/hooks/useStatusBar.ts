import { useCallback, useEffect } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

type StatusBarStyle = 'dark' | 'light' | 'default';

export function useStatusBar() {
  const isNative = Capacitor.isNativePlatform();

  const setStyle = useCallback(async (style: StatusBarStyle) => {
    if (!isNative) return;
    
    const styleMap: Record<StatusBarStyle, Style> = {
      dark: Style.Dark,
      light: Style.Light,
      default: Style.Default,
    };
    
    await StatusBar.setStyle({ style: styleMap[style] });
  }, [isNative]);

  const setBackgroundColor = useCallback(async (color: string) => {
    if (!isNative) return;
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color });
    }
  }, [isNative]);

  const show = useCallback(async () => {
    if (!isNative) return;
    await StatusBar.show();
  }, [isNative]);

  const hide = useCallback(async () => {
    if (!isNative) return;
    await StatusBar.hide();
  }, [isNative]);

  const setOverlaysWebView = useCallback(async (overlay: boolean) => {
    if (!isNative) return;
    await StatusBar.setOverlaysWebView({ overlay });
  }, [isNative]);

  // Initialize with dark style for TQC theme
  useEffect(() => {
    if (isNative) {
      setStyle('dark');
      setBackgroundColor('#0E0E10');
    }
  }, [isNative, setStyle, setBackgroundColor]);

  return {
    setStyle,
    setBackgroundColor,
    show,
    hide,
    setOverlaysWebView,
    isNative,
  };
}

import { useCallback } from 'react';

type HapticImpact = 'light' | 'medium' | 'heavy';
type HapticNotification = 'success' | 'warning' | 'error';

export function useHaptics() {
  const isNative = false;

  const impact = useCallback(async (style: HapticImpact = 'medium') => {
    if ('vibrate' in navigator) {
      const duration = style === 'light' ? 10 : style === 'medium' ? 20 : 30;
      navigator.vibrate(duration);
    }
  }, []);

  const notification = useCallback(async (type: HapticNotification = 'success') => {
    if ('vibrate' in navigator) {
      const patterns: Record<HapticNotification, number[]> = {
        success: [10, 50, 10],
        warning: [20, 30, 20],
        error: [50, 100, 50],
      };
      navigator.vibrate(patterns[type]);
    }
  }, []);

  const vibrate = useCallback(async (duration: number = 300) => {
    if ('vibrate' in navigator) navigator.vibrate(duration);
  }, []);

  const selectionStart = useCallback(async () => {}, []);
  const selectionChanged = useCallback(async () => {}, []);
  const selectionEnd = useCallback(async () => {}, []);

  return { impact, notification, vibrate, selectionStart, selectionChanged, selectionEnd, isNative };
}

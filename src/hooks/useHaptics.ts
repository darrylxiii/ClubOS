import { useCallback } from 'react';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

type HapticImpact = 'light' | 'medium' | 'heavy';
type HapticNotification = 'success' | 'warning' | 'error';

export function useHaptics() {
  const isNative = Capacitor.isNativePlatform();

  const impact = useCallback(async (style: HapticImpact = 'medium') => {
    if (!isNative) {
      // Fallback to web vibration API
      if ('vibrate' in navigator) {
        const duration = style === 'light' ? 10 : style === 'medium' ? 20 : 30;
        navigator.vibrate(duration);
      }
      return;
    }

    const styleMap: Record<HapticImpact, ImpactStyle> = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
    };

    await Haptics.impact({ style: styleMap[style] });
  }, [isNative]);

  const notification = useCallback(async (type: HapticNotification = 'success') => {
    if (!isNative) {
      // Fallback to web vibration API
      if ('vibrate' in navigator) {
        const patterns: Record<HapticNotification, number[]> = {
          success: [10, 50, 10],
          warning: [20, 30, 20],
          error: [50, 100, 50],
        };
        navigator.vibrate(patterns[type]);
      }
      return;
    }

    const typeMap: Record<HapticNotification, NotificationType> = {
      success: NotificationType.Success,
      warning: NotificationType.Warning,
      error: NotificationType.Error,
    };

    await Haptics.notification({ type: typeMap[type] });
  }, [isNative]);

  const vibrate = useCallback(async (duration: number = 300) => {
    if (!isNative) {
      if ('vibrate' in navigator) {
        navigator.vibrate(duration);
      }
      return;
    }

    await Haptics.vibrate({ duration });
  }, [isNative]);

  const selectionStart = useCallback(async () => {
    if (!isNative) return;
    await Haptics.selectionStart();
  }, [isNative]);

  const selectionChanged = useCallback(async () => {
    if (!isNative) return;
    await Haptics.selectionChanged();
  }, [isNative]);

  const selectionEnd = useCallback(async () => {
    if (!isNative) return;
    await Haptics.selectionEnd();
  }, [isNative]);

  return {
    impact,
    notification,
    vibrate,
    selectionStart,
    selectionChanged,
    selectionEnd,
    isNative,
  };
}

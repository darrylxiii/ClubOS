import { useEffect, useState, useCallback } from 'react';
import { Keyboard, KeyboardInfo } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';

interface KeyboardState {
  isVisible: boolean;
  keyboardHeight: number;
}

export function useNativeKeyboard() {
  const isNative = Capacitor.isNativePlatform();
  const [keyboardState, setKeyboardState] = useState<KeyboardState>({
    isVisible: false,
    keyboardHeight: 0,
  });

  useEffect(() => {
    if (!isNative) return;

    const showListener = Keyboard.addListener('keyboardWillShow', (info: KeyboardInfo) => {
      setKeyboardState({
        isVisible: true,
        keyboardHeight: info.keyboardHeight,
      });
    });

    const hideListener = Keyboard.addListener('keyboardWillHide', () => {
      setKeyboardState({
        isVisible: false,
        keyboardHeight: 0,
      });
    });

    return () => {
      showListener.then(l => l.remove());
      hideListener.then(l => l.remove());
    };
  }, [isNative]);

  const show = useCallback(async () => {
    if (!isNative) return;
    await Keyboard.show();
  }, [isNative]);

  const hide = useCallback(async () => {
    if (!isNative) return;
    await Keyboard.hide();
  }, [isNative]);

  const setAccessoryBarVisible = useCallback(async (visible: boolean) => {
    if (!isNative) return;
    await Keyboard.setAccessoryBarVisible({ isVisible: visible });
  }, [isNative]);

  const setScroll = useCallback(async (enabled: boolean) => {
    if (!isNative) return;
    await Keyboard.setScroll({ isDisabled: !enabled });
  }, [isNative]);

  return {
    ...keyboardState,
    show,
    hide,
    setAccessoryBarVisible,
    setScroll,
    isNative,
  };
}

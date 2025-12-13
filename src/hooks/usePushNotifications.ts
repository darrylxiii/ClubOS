import { useEffect, useState, useCallback } from 'react';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PushNotificationState {
  permissionGranted: boolean;
  token: string | null;
  notifications: PushNotificationSchema[];
}

export function usePushNotifications() {
  const { user } = useAuth();
  const isNative = Capacitor.isNativePlatform();
  const [state, setState] = useState<PushNotificationState>({
    permissionGranted: false,
    token: null,
    notifications: [],
  });

  // Request permission and register for push notifications
  const requestPermission = useCallback(async () => {
    if (!isNative) {
      // Web fallback
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        setState(prev => ({ ...prev, permissionGranted: permission === 'granted' }));
        return permission === 'granted';
      }
      return false;
    }

    const result = await PushNotifications.requestPermissions();
    const granted = result.receive === 'granted';
    
    if (granted) {
      await PushNotifications.register();
    }
    
    setState(prev => ({ ...prev, permissionGranted: granted }));
    return granted;
  }, [isNative]);

  // Save device token to database
  const saveToken = useCallback(async (token: string) => {
    if (!user?.id) return;

    try {
      // Upsert device token
      await supabase
        .from('device_tokens' as any)
        .upsert({
          user_id: user.id,
          token,
          platform: Capacitor.getPlatform(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,token',
        });
    } catch (error) {
      console.error('Failed to save device token:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!isNative) return;

    // Listen for successful registration
    const registrationListener = PushNotifications.addListener('registration', (token: Token) => {
      setState(prev => ({ ...prev, token: token.value }));
      saveToken(token.value);
    });

    // Listen for registration errors
    const errorListener = PushNotifications.addListener('registrationError', (error) => {
      console.error('Push notification registration error:', error);
    });

    // Listen for incoming notifications
    const notificationListener = PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      setState(prev => ({
        ...prev,
        notifications: [...prev.notifications, notification],
      }));
    });

    // Listen for notification actions
    const actionListener = PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      console.log('Push notification action performed:', action);
      // Handle notification tap - navigate to relevant screen
      const data = action.notification.data;
      if (data?.route) {
        window.location.href = data.route;
      }
    });

    // Check current permission status
    PushNotifications.checkPermissions().then(result => {
      setState(prev => ({ ...prev, permissionGranted: result.receive === 'granted' }));
    });

    return () => {
      registrationListener.then(l => l.remove());
      errorListener.then(l => l.remove());
      notificationListener.then(l => l.remove());
      actionListener.then(l => l.remove());
    };
  }, [isNative, saveToken]);

  const clearNotifications = useCallback(() => {
    setState(prev => ({ ...prev, notifications: [] }));
  }, []);

  const removeDeviceToken = useCallback(async () => {
    if (!user?.id || !state.token) return;

    try {
      await supabase
        .from('device_tokens' as any)
        .delete()
        .eq('user_id', user.id)
        .eq('token', state.token);
    } catch (error) {
      console.error('Failed to remove device token:', error);
    }
  }, [user?.id, state.token]);

  return {
    ...state,
    requestPermission,
    clearNotifications,
    removeDeviceToken,
    isNative,
  };
}

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Bell } from 'lucide-react';

/**
 * Global component that handles push notification display and routing
 * Place this in your app's root layout
 */
export function PushNotificationHandler() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notifications, clearNotifications, requestPermission, permissionGranted, isNative } = usePushNotifications();

  // Request permission on mount for native apps
  useEffect(() => {
    if (isNative && user && !permissionGranted) {
      // Delay permission request to not interrupt initial app load
      const timer = setTimeout(() => {
        requestPermission();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isNative, user, permissionGranted, requestPermission]);

  // Handle incoming notifications
  useEffect(() => {
    if (notifications.length === 0) return;

    // Show toast for each new notification
    notifications.forEach((notification) => {
      toast(notification.title, {
        description: notification.body,
        icon: <Bell className="h-4 w-4" />,
        action: notification.data?.route ? {
          label: 'View',
          onClick: () => {
            navigate(notification.data.route as string);
          },
        } : undefined,
        duration: 5000,
      });
    });

    // Clear processed notifications
    clearNotifications();
  }, [notifications, navigate, clearNotifications]);

  // This component doesn't render anything visible
  return null;
}

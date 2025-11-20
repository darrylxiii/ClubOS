import { useState, useEffect } from 'react';
import { Bell, Smartphone } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PushNotificationService } from '@/services/pushNotificationService';
import { toast } from 'sonner';

export function PushNotificationSettings() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      const subscription = await PushNotificationService.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (isSubscribed) {
        await PushNotificationService.unsubscribe();
        setIsSubscribed(false);
        toast.success('Push notifications disabled');
      } else {
        await PushNotificationService.subscribe();
        setIsSubscribed(true);
        toast.success('Push notifications enabled');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update notification settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Receive real-time alerts for matches, messages, and interview invites
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="push-enabled">Enable Push Notifications</Label>
            <p className="text-sm text-muted-foreground">
              Get notified even when the app is closed
            </p>
          </div>
          <Switch
            id="push-enabled"
            checked={isSubscribed}
            onCheckedChange={handleToggle}
            disabled={loading}
          />
        </div>

        {isSubscribed && (
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-green-500" />
              Push notifications are active on this device
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

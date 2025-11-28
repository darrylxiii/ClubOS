import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Bell } from 'lucide-react';

interface NotificationsTabProps {
  settings: {
    emailNotifications: boolean;
    applicationUpdates: boolean;
    weeklyDigest: boolean;
    profileVisibility: boolean;
    shareWithPartners: boolean;
  };
  isSaving: boolean;
  onSettingsChange: (field: string, value: boolean) => void;
  onSave: () => void;
}

export function NotificationsTab({
  settings,
  isSaving,
  onSettingsChange,
  onSave,
}: NotificationsTabProps) {
  const notificationItems = [
    { 
      key: 'emailNotifications', 
      label: 'Email Notifications', 
      description: 'Receive email updates about your account',
      icon: Bell,
    },
    { 
      key: 'applicationUpdates', 
      label: 'Application Updates', 
      description: 'Get notified about application status changes',
      icon: Bell,
    },
    { 
      key: 'weeklyDigest', 
      label: 'Weekly Digest', 
      description: 'Receive a weekly summary of new opportunities',
      icon: Bell,
    },
  ];

  const visibilityItems = [
    { 
      key: 'profileVisibility', 
      label: 'Profile Visibility', 
      description: 'Make your profile visible to partners',
    },
    { 
      key: 'shareWithPartners', 
      label: 'Share with Partners', 
      description: 'Allow partners to view your profile details',
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
          <CardDescription>Manage how you receive updates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {notificationItems.map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor={item.key}>{item.label}</Label>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
              <Switch
                id={item.key}
                checked={settings[item.key as keyof typeof settings]}
                onCheckedChange={(checked) => onSettingsChange(item.key, checked)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Visibility Settings</CardTitle>
          <CardDescription>Control who can see your profile</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {visibilityItems.map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor={item.key}>{item.label}</Label>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
              <Switch
                id={item.key}
                checked={settings[item.key as keyof typeof settings]}
                onCheckedChange={(checked) => onSettingsChange(item.key, checked)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Button onClick={onSave} disabled={isSaving}>
        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Changes
      </Button>
    </div>
  );
}

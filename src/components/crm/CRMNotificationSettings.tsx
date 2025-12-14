import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Mail, MessageSquare, Calendar, TrendingUp, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface NotificationSetting {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  channel: 'email' | 'push' | 'both';
}

export function CRMNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSetting[]>([
    {
      id: 'new_reply',
      label: 'New Email Replies',
      description: 'Get notified when prospects reply to your emails',
      icon: <Mail className="h-4 w-4" />,
      enabled: true,
      channel: 'both',
    },
    {
      id: 'hot_lead',
      label: 'Hot Lead Alerts',
      description: 'Instant alerts when a lead shows high buying intent',
      icon: <TrendingUp className="h-4 w-4" />,
      enabled: true,
      channel: 'push',
    },
    {
      id: 'stage_change',
      label: 'Stage Changes',
      description: 'Notifications when prospects move through the pipeline',
      icon: <MessageSquare className="h-4 w-4" />,
      enabled: true,
      channel: 'email',
    },
    {
      id: 'meeting_reminder',
      label: 'Meeting Reminders',
      description: 'Reminders before scheduled prospect meetings',
      icon: <Calendar className="h-4 w-4" />,
      enabled: true,
      channel: 'both',
    },
    {
      id: 'stale_deal',
      label: 'Stale Deal Warnings',
      description: 'Alerts when deals have no activity for too long',
      icon: <AlertTriangle className="h-4 w-4" />,
      enabled: false,
      channel: 'email',
    },
  ]);

  const [digestFrequency, setDigestFrequency] = useState('daily');

  const handleToggle = (id: string) => {
    setSettings(prev => prev.map(s => 
      s.id === id ? { ...s, enabled: !s.enabled } : s
    ));
    toast.success('Notification preference updated');
  };

  const handleChannelChange = (id: string, channel: 'email' | 'push' | 'both') => {
    setSettings(prev => prev.map(s => 
      s.id === id ? { ...s, channel } : s
    ));
    toast.success('Notification channel updated');
  };

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Configure when and how you receive CRM notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {settings.map((setting) => (
            <div 
              key={setting.id}
              className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-background/50"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-primary/10 text-primary">
                  {setting.icon}
                </div>
                <div>
                  <Label className="text-sm font-medium">{setting.label}</Label>
                  <p className="text-xs text-muted-foreground">{setting.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Select
                  value={setting.channel}
                  onValueChange={(value) => handleChannelChange(setting.id, value as any)}
                  disabled={!setting.enabled}
                >
                  <SelectTrigger className="w-24 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="push">Push</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
                <Switch 
                  checked={setting.enabled} 
                  onCheckedChange={() => handleToggle(setting.id)} 
                />
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Daily Digest</Label>
              <p className="text-xs text-muted-foreground">
                Receive a summary of all CRM activity
              </p>
            </div>
            <Select value={digestFrequency} onValueChange={setDigestFrequency}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">Never</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

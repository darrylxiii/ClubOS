import { useState } from 'react';
import { Settings, MessageSquare, Mail, Phone, Users, Bell, Clock, Moon, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

interface Preferences {
  preferred_channel: 'whatsapp' | 'email' | 'phone' | 'in_person';
  quiet_hours_start: string;
  quiet_hours_end: string;
  quiet_hours_timezone: string;
  receive_marketing: boolean;
  receive_job_alerts: boolean;
  receive_meeting_reminders: boolean;
  max_messages_per_day: number;
}

interface Props {
  preferences: Preferences | null;
  onUpdate: (updates: Partial<Preferences>) => Promise<void>;
}

const channelOptions = [
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'phone', label: 'Phone', icon: Phone },
  { value: 'in_person', label: 'In Person', icon: Users },
];

const timezones = [
  { value: 'Europe/Amsterdam', label: 'Amsterdam (CET)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'America/New_York', label: 'New York (EST)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
];

export function CommunicationPreferencesCard({ preferences, onUpdate }: Props) {
  const [saving, setSaving] = useState(false);
  const [localPrefs, setLocalPrefs] = useState<Partial<Preferences>>(preferences || {
    preferred_channel: 'whatsapp',
    quiet_hours_start: '21:00',
    quiet_hours_end: '08:00',
    quiet_hours_timezone: 'Europe/Amsterdam',
    receive_marketing: true,
    receive_job_alerts: true,
    receive_meeting_reminders: true,
    max_messages_per_day: 5
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(localPrefs);
    } finally {
      setSaving(false);
    }
  };

  const updateLocal = (key: keyof Preferences, value: any) => {
    setLocalPrefs(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          Communication Preferences
        </CardTitle>
        <CardDescription>
          Control how and when The Quantum Club contacts you
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Preferred Channel */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Preferred Communication Channel
          </Label>
          <Select
            value={localPrefs.preferred_channel}
            onValueChange={(v) => updateLocal('preferred_channel', v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {channelOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div className="flex items-center gap-2">
                    <opt.icon className="h-4 w-4" />
                    {opt.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            We'll prioritize this channel for non-urgent communications
          </p>
        </div>

        <Separator />

        {/* Quiet Hours */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Moon className="h-4 w-4" />
            Quiet Hours
          </Label>
          <p className="text-xs text-muted-foreground">
            We won't send non-urgent messages during these hours
          </p>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Start</Label>
              <Input
                type="time"
                value={localPrefs.quiet_hours_start}
                onChange={(e) => updateLocal('quiet_hours_start', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">End</Label>
              <Input
                type="time"
                value={localPrefs.quiet_hours_end}
                onChange={(e) => updateLocal('quiet_hours_end', e.target.value)}
              />
            </div>
          </div>
          
          <Select
            value={localPrefs.quiet_hours_timezone}
            onValueChange={(v) => updateLocal('quiet_hours_timezone', v)}
          >
            <SelectTrigger>
              <Clock className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timezones.map(tz => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Notification Toggles */}
        <div className="space-y-4">
          <Label className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notification Preferences
          </Label>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Job Alerts</p>
                <p className="text-xs text-muted-foreground">
                  New opportunities matching your profile
                </p>
              </div>
              <Switch
                checked={localPrefs.receive_job_alerts}
                onCheckedChange={(v) => updateLocal('receive_job_alerts', v)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Meeting Reminders</p>
                <p className="text-xs text-muted-foreground">
                  Reminders for scheduled interviews and calls
                </p>
              </div>
              <Switch
                checked={localPrefs.receive_meeting_reminders}
                onCheckedChange={(v) => updateLocal('receive_meeting_reminders', v)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Marketing & Updates</p>
                <p className="text-xs text-muted-foreground">
                  Platform news, tips, and career insights
                </p>
              </div>
              <Switch
                checked={localPrefs.receive_marketing}
                onCheckedChange={(v) => updateLocal('receive_marketing', v)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Daily Limit */}
        <div className="space-y-3">
          <Label>Maximum Messages Per Day</Label>
          <Select
            value={String(localPrefs.max_messages_per_day)}
            onValueChange={(v) => updateLocal('max_messages_per_day', parseInt(v))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 messages</SelectItem>
              <SelectItem value="5">5 messages (recommended)</SelectItem>
              <SelectItem value="10">10 messages</SelectItem>
              <SelectItem value="999">Unlimited</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Critical updates (interview confirmations, offers) will always come through
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </CardContent>
    </Card>
  );
}

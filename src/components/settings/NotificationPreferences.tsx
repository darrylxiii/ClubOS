import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Bell, Mail, Moon, MessageSquare, Phone } from 'lucide-react';
import { toast } from 'sonner';

interface NotificationPrefs {
  email_enabled: boolean;
  email_applications: boolean;
  email_messages: boolean;
  email_interviews: boolean;
  email_job_matches: boolean;
  email_system: boolean;
  email_digest: boolean;
  email_digest_frequency: string;
  inapp_enabled: boolean;
  inapp_applications: boolean;
  inapp_messages: boolean;
  inapp_interviews: boolean;
  inapp_job_matches: boolean;
  inapp_system: boolean;
  sms_enabled: boolean;
  sms_interviews: boolean;
  sms_reminders: boolean;
  sms_offers: boolean;
  sms_stage_updates: boolean;
  whatsapp_enabled: boolean;
  whatsapp_interviews: boolean;
  whatsapp_reminders: boolean;
  whatsapp_stage_updates: boolean;
  whatsapp_job_matches: boolean;
  whatsapp_offers: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  quiet_hours_timezone: string;
  preferred_channel: string;
}

const defaultPrefs: NotificationPrefs = {
  email_enabled: true,
  email_applications: true,
  email_messages: true,
  email_interviews: true,
  email_job_matches: true,
  email_system: true,
  email_digest: false,
  email_digest_frequency: 'daily',
  inapp_enabled: true,
  inapp_applications: true,
  inapp_messages: true,
  inapp_interviews: true,
  inapp_job_matches: true,
  inapp_system: true,
  sms_enabled: false,
  sms_interviews: true,
  sms_reminders: true,
  sms_offers: true,
  sms_stage_updates: true,
  whatsapp_enabled: false,
  whatsapp_interviews: true,
  whatsapp_reminders: true,
  whatsapp_stage_updates: true,
  whatsapp_job_matches: false,
  whatsapp_offers: true,
  quiet_hours_enabled: false,
  quiet_hours_start: '22:00',
  quiet_hours_end: '08:00',
  quiet_hours_timezone: 'Europe/Amsterdam',
  preferred_channel: 'email',
};

export const NotificationPreferences = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPrefs>(defaultPrefs);
  const [hasPhone, setHasPhone] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    try {
      const [{ data: prefData, error: prefError }, { data: profile }] = await Promise.all([
        supabase
          .from('notification_preferences')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('phone')
          .eq('id', user.id)
          .single(),
      ]);

      if (prefError && prefError.code !== 'PGRST116') throw prefError;

      setHasPhone(!!profile?.phone);

      if (prefData) {
        setPrefs({
          ...defaultPrefs,
          ...Object.fromEntries(
            Object.entries(prefData).filter(([_, v]) => v !== null)
          ),
        } as NotificationPrefs);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      toast.error('Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...prefs,
          updated_at: new Date().toISOString(),
        } as any);

      if (error) throw error;

      toast.success('Notification preferences saved');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const updatePref = (key: keyof NotificationPrefs, value: boolean | string) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Preferred Channel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preferred Channel</CardTitle>
          <CardDescription>
            Choose your primary communication channel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={prefs.preferred_channel}
            onValueChange={(value) => updatePref('preferred_channel', value)}
          >
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms" disabled={!hasPhone}>SMS</SelectItem>
              <SelectItem value="whatsapp" disabled={!hasPhone}>WhatsApp</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="w-4 h-4" />
            Email Notifications
          </CardTitle>
          <CardDescription>
            Choose what email notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Master switch for all email notifications
              </p>
            </div>
            <Switch
              checked={prefs.email_enabled}
              onCheckedChange={(checked) => updatePref('email_enabled', checked)}
            />
          </div>

          <Separator />

          <div className="space-y-4" style={{ opacity: prefs.email_enabled ? 1 : 0.5 }}>
            {[
              { key: 'email_applications' as const, label: 'Application Updates' },
              { key: 'email_messages' as const, label: 'New Messages' },
              { key: 'email_interviews' as const, label: 'Interview Reminders' },
              { key: 'email_job_matches' as const, label: 'Job Matches' },
              { key: 'email_system' as const, label: 'System Updates' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <Label>{label}</Label>
                <Switch
                  checked={prefs[key]}
                  onCheckedChange={(checked) => updatePref(key, checked)}
                  disabled={!prefs.email_enabled}
                />
              </div>
            ))}
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Digest</Label>
                <p className="text-sm text-muted-foreground">
                  Receive a summary instead of individual emails
                </p>
              </div>
              <Switch
                checked={prefs.email_digest}
                onCheckedChange={(checked) => updatePref('email_digest', checked)}
                disabled={!prefs.email_enabled}
              />
            </div>

            {prefs.email_digest && (
              <div className="space-y-2">
                <Label>Digest Frequency</Label>
                <Select
                  value={prefs.email_digest_frequency}
                  onValueChange={(value) => updatePref('email_digest_frequency', value)}
                  disabled={!prefs.email_enabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* SMS Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="w-4 h-4" />
            SMS Notifications
            <Badge variant="secondary" className="text-xs">Optional</Badge>
          </CardTitle>
          <CardDescription>
            Receive text messages for time-sensitive updates
            {!hasPhone && (
              <span className="block mt-1 text-destructive">
                Add a phone number in your profile to enable SMS notifications.
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable SMS Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Master switch for all SMS notifications
              </p>
            </div>
            <Switch
              checked={prefs.sms_enabled}
              onCheckedChange={(checked) => updatePref('sms_enabled', checked)}
              disabled={!hasPhone}
            />
          </div>

          {prefs.sms_enabled && hasPhone && (
            <>
              <Separator />
              <div className="space-y-4">
                {[
                  { key: 'sms_interviews' as const, label: 'Interview Reminders' },
                  { key: 'sms_reminders' as const, label: 'Meeting Reminders' },
                  { key: 'sms_stage_updates' as const, label: 'Stage Updates' },
                  { key: 'sms_offers' as const, label: 'Offer Notifications' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label>{label}</Label>
                    <Switch
                      checked={prefs[key]}
                      onCheckedChange={(checked) => updatePref(key, checked)}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* WhatsApp Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="w-4 h-4" />
            WhatsApp Notifications
            <Badge variant="secondary" className="text-xs">Optional</Badge>
          </CardTitle>
          <CardDescription>
            Get updates directly on WhatsApp for a more personal experience
            {!hasPhone && (
              <span className="block mt-1 text-destructive">
                Add a phone number in your profile to enable WhatsApp notifications.
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable WhatsApp Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Master switch for all WhatsApp notifications
              </p>
            </div>
            <Switch
              checked={prefs.whatsapp_enabled}
              onCheckedChange={(checked) => updatePref('whatsapp_enabled', checked)}
              disabled={!hasPhone}
            />
          </div>

          {prefs.whatsapp_enabled && hasPhone && (
            <>
              <Separator />
              <div className="space-y-4">
                {[
                  { key: 'whatsapp_interviews' as const, label: 'Interview Reminders' },
                  { key: 'whatsapp_reminders' as const, label: 'Meeting Reminders' },
                  { key: 'whatsapp_stage_updates' as const, label: 'Stage Updates' },
                  { key: 'whatsapp_offers' as const, label: 'Offer Notifications' },
                  { key: 'whatsapp_job_matches' as const, label: 'Job Matches' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label>{label}</Label>
                    <Switch
                      checked={prefs[key]}
                      onCheckedChange={(checked) => updatePref(key, checked)}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* In-App Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="w-4 h-4" />
            In-App Notifications
          </CardTitle>
          <CardDescription>
            Control notifications you see within the platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable In-App Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Show notifications in the app
              </p>
            </div>
            <Switch
              checked={prefs.inapp_enabled}
              onCheckedChange={(checked) => updatePref('inapp_enabled', checked)}
            />
          </div>

          <Separator />

          <div className="space-y-4" style={{ opacity: prefs.inapp_enabled ? 1 : 0.5 }}>
            {[
              { key: 'inapp_applications' as const, label: 'Application Updates' },
              { key: 'inapp_messages' as const, label: 'New Messages' },
              { key: 'inapp_interviews' as const, label: 'Interview Reminders' },
              { key: 'inapp_job_matches' as const, label: 'Job Matches' },
              { key: 'inapp_system' as const, label: 'System Updates' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <Label>{label}</Label>
                <Switch
                  checked={prefs[key]}
                  onCheckedChange={(checked) => updatePref(key, checked)}
                  disabled={!prefs.inapp_enabled}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Moon className="w-4 h-4" />
            Quiet Hours
          </CardTitle>
          <CardDescription>
            Pause notifications during specific times
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Quiet Hours</Label>
              <p className="text-sm text-muted-foreground">
                Mute notifications during these times
              </p>
            </div>
            <Switch
              checked={prefs.quiet_hours_enabled}
              onCheckedChange={(checked) => updatePref('quiet_hours_enabled', checked)}
            />
          </div>

          {prefs.quiet_hours_enabled && (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={prefs.quiet_hours_start}
                    onChange={(e) => updatePref('quiet_hours_start', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={prefs.quiet_hours_end}
                    onChange={(e) => updatePref('quiet_hours_end', e.target.value)}
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button onClick={savePreferences} disabled={saving} className="w-full">
        {saving ? 'Saving...' : 'Save Notification Preferences'}
      </Button>
    </div>
  );
};

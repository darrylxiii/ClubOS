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
import { Bell, Mail, Moon } from 'lucide-react';
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
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  quiet_hours_timezone: string;
}

export const NotificationPreferences = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPrefs>({
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
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00',
    quiet_hours_timezone: 'Europe/Amsterdam',
  });

  useEffect(() => {
    loadPreferences();
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notification_preferences' as any)
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        const prefData = data as any;
        setPrefs({
          email_enabled: prefData.email_enabled,
          email_applications: prefData.email_applications,
          email_messages: prefData.email_messages,
          email_interviews: prefData.email_interviews,
          email_job_matches: prefData.email_job_matches,
          email_system: prefData.email_system,
          email_digest: prefData.email_digest,
          email_digest_frequency: prefData.email_digest_frequency,
          inapp_enabled: prefData.inapp_enabled,
          inapp_applications: prefData.inapp_applications,
          inapp_messages: prefData.inapp_messages,
          inapp_interviews: prefData.inapp_interviews,
          inapp_job_matches: prefData.inapp_job_matches,
          inapp_system: prefData.inapp_system,
          quiet_hours_enabled: prefData.quiet_hours_enabled,
          quiet_hours_start: prefData.quiet_hours_start || '22:00',
          quiet_hours_end: prefData.quiet_hours_end || '08:00',
          quiet_hours_timezone: prefData.quiet_hours_timezone,
        });
      }
    } catch (_error) {
      console.error('Error loading preferences:', _error);
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
        .from('notification_preferences' as any)
        .upsert({
          user_id: user.id,
          ...prefs,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success('Notification preferences saved');
    } catch (_error) {
      console.error('Error saving preferences:', _error);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const updatePref = (key: keyof NotificationPrefs, value: any) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
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

          <div className="space-y-4 opacity-100" style={{ opacity: prefs.email_enabled ? 1 : 0.5 }}>
            <div className="flex items-center justify-between">
              <Label>Application Updates</Label>
              <Switch
                checked={prefs.email_applications}
                onCheckedChange={(checked) => updatePref('email_applications', checked)}
                disabled={!prefs.email_enabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>New Messages</Label>
              <Switch
                checked={prefs.email_messages}
                onCheckedChange={(checked) => updatePref('email_messages', checked)}
                disabled={!prefs.email_enabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Interview Reminders</Label>
              <Switch
                checked={prefs.email_interviews}
                onCheckedChange={(checked) => updatePref('email_interviews', checked)}
                disabled={!prefs.email_enabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Job Matches</Label>
              <Switch
                checked={prefs.email_job_matches}
                onCheckedChange={(checked) => updatePref('email_job_matches', checked)}
                disabled={!prefs.email_enabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>System Updates</Label>
              <Switch
                checked={prefs.email_system}
                onCheckedChange={(checked) => updatePref('email_system', checked)}
                disabled={!prefs.email_enabled}
              />
            </div>
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

      {/* In-App Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
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
            <div className="flex items-center justify-between">
              <Label>Application Updates</Label>
              <Switch
                checked={prefs.inapp_applications}
                onCheckedChange={(checked) => updatePref('inapp_applications', checked)}
                disabled={!prefs.inapp_enabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>New Messages</Label>
              <Switch
                checked={prefs.inapp_messages}
                onCheckedChange={(checked) => updatePref('inapp_messages', checked)}
                disabled={!prefs.inapp_enabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Interview Reminders</Label>
              <Switch
                checked={prefs.inapp_interviews}
                onCheckedChange={(checked) => updatePref('inapp_interviews', checked)}
                disabled={!prefs.inapp_enabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Job Matches</Label>
              <Switch
                checked={prefs.inapp_job_matches}
                onCheckedChange={(checked) => updatePref('inapp_job_matches', checked)}
                disabled={!prefs.inapp_enabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>System Updates</Label>
              <Switch
                checked={prefs.inapp_system}
                onCheckedChange={(checked) => updatePref('inapp_system', checked)}
                disabled={!prefs.inapp_enabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="w-5 h-5" />
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

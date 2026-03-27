import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('settings');
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
      toast.error(t('notifications.failedLoad'));
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

      toast.success(t('notifications.preferencesSaved'));
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error(t('notifications.failedSave'));
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
          <CardTitle className="text-base">{t('notifications.preferredChannel')}</CardTitle>
          <CardDescription>
            {t('notifications.preferredChannelDesc')}
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
            {t('notifications.emailNotifications')}
          </CardTitle>
          <CardDescription>
            {t('notifications.emailNotificationsDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('notifications.enableEmail')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('notifications.masterSwitchEmail')}
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
              { key: 'email_applications' as const, label: t('notifications.applicationUpdates') },
              { key: 'email_messages' as const, label: t('notifications.newMessages') },
              { key: 'email_interviews' as const, label: t('notifications.interviewReminders') },
              { key: 'email_job_matches' as const, label: t('notifications.jobMatches') },
              { key: 'email_system' as const, label: t('notifications.systemUpdates') },
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
                <Label>{t('notifications.emailDigest')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('notifications.emailDigestDesc')}
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
                <Label>{t('notifications.digestFrequency')}</Label>
                <Select
                  value={prefs.email_digest_frequency}
                  onValueChange={(value) => updatePref('email_digest_frequency', value)}
                  disabled={!prefs.email_enabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">{t('notifications.daily')}</SelectItem>
                    <SelectItem value="weekly">{t('notifications.weekly')}</SelectItem>
                    <SelectItem value="never">{t('notifications.never')}</SelectItem>
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
            {t('notifications.smsNotifications')}
            <Badge variant="secondary" className="text-xs">{t('notifications.optional')}</Badge>
          </CardTitle>
          <CardDescription>
            {t('notifications.smsDesc')}
            {!hasPhone && (
              <span className="block mt-1 text-destructive">
                {t('notifications.addPhoneForSMS')}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('notifications.enableSMS')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('notifications.masterSwitchSMS')}
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
                  { key: 'sms_interviews' as const, label: t('notifications.interviewReminders') },
                  { key: 'sms_reminders' as const, label: t('notifications.meetingReminders') },
                  { key: 'sms_stage_updates' as const, label: t('notifications.stageUpdates') },
                  { key: 'sms_offers' as const, label: t('notifications.offerNotifications') },
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
            {t('notifications.whatsappNotifications')}
            <Badge variant="secondary" className="text-xs">{t('notifications.optional')}</Badge>
          </CardTitle>
          <CardDescription>
            {t('notifications.whatsappDesc')}
            {!hasPhone && (
              <span className="block mt-1 text-destructive">
                {t('notifications.addPhoneForWhatsApp')}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('notifications.enableWhatsApp')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('notifications.masterSwitchWhatsApp')}
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
                  { key: 'whatsapp_interviews' as const, label: t('notifications.interviewReminders') },
                  { key: 'whatsapp_reminders' as const, label: t('notifications.meetingReminders') },
                  { key: 'whatsapp_stage_updates' as const, label: t('notifications.stageUpdates') },
                  { key: 'whatsapp_offers' as const, label: t('notifications.offerNotifications') },
                  { key: 'whatsapp_job_matches' as const, label: t('notifications.jobMatches') },
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
            {t('notifications.inAppNotifications')}
          </CardTitle>
          <CardDescription>
            {t('notifications.inAppDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('notifications.enableInApp')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('notifications.showInApp')}
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
              { key: 'inapp_applications' as const, label: t('notifications.applicationUpdates') },
              { key: 'inapp_messages' as const, label: t('notifications.newMessages') },
              { key: 'inapp_interviews' as const, label: t('notifications.interviewReminders') },
              { key: 'inapp_job_matches' as const, label: t('notifications.jobMatches') },
              { key: 'inapp_system' as const, label: t('notifications.systemUpdates') },
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
            {t('notifications.quietHours')}
          </CardTitle>
          <CardDescription>
            {t('notifications.quietHoursDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t('notifications.enableQuietHours')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('notifications.muteNotifications')}
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
                  <Label>{t('notifications.startTime')}</Label>
                  <Input
                    type="time"
                    value={prefs.quiet_hours_start}
                    onChange={(e) => updatePref('quiet_hours_start', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('notifications.endTime')}</Label>
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
        {saving ? t('common:status.saving') : t('notifications.savePreferences')}
      </Button>
    </div>
  );
};

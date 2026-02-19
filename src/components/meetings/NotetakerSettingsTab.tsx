import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Bot, Calendar, RefreshCw, Link as LinkIcon, Unlink, Mail, Clock, Globe } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { format } from "date-fns";

interface NotetakerSettings {
  auto_join_all_bookings: boolean;
  auto_join_detected_interviews: boolean;
  send_summary_email: boolean;
  send_transcript_email: boolean;
  default_language: string;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}

const DEFAULT_SETTINGS: NotetakerSettings = {
  auto_join_all_bookings: true,
  auto_join_detected_interviews: true,
  send_summary_email: true,
  send_transcript_email: false,
  default_language: 'en',
  quiet_hours_start: null,
  quiet_hours_end: null,
};

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'nl', label: 'Nederlands' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
  { value: 'es', label: 'Español' },
];

export function NotetakerSettingsTab() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotetakerSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [calendarConnections, setCalendarConnections] = useState<any[]>([]);

  const loadSettings = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('notetaker_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setSettings({
        auto_join_all_bookings: data.auto_join_all_bookings ?? true,
        auto_join_detected_interviews: data.auto_join_detected_interviews ?? true,
        send_summary_email: data.send_summary_email ?? true,
        send_transcript_email: data.send_transcript_email ?? false,
        default_language: data.default_language ?? 'en',
        quiet_hours_start: data.quiet_hours_start,
        quiet_hours_end: data.quiet_hours_end,
      });
    }

    if (error && error.code !== 'PGRST116') {
      console.error('Failed to load notetaker settings:', error);
    }

    setLoading(false);
  }, [user]);

  const loadCalendarConnections = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);
    setCalendarConnections(data || []);
  }, [user]);

  useEffect(() => {
    if (user) {
      loadSettings();
      loadCalendarConnections();
    }
  }, [user, loadSettings, loadCalendarConnections]);

  const saveSettings = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from('notetaker_settings')
      .upsert({
        user_id: user.id,
        ...settings,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) {
      notify.error("Failed to save settings");
      console.error('Save error:', error);
    } else {
      notify.success("Settings saved", {
        description: "Your Club AI Notetaker preferences have been updated.",
      });
    }

    setSaving(false);
  };

  const updateSetting = <K extends keyof NotetakerSettings>(key: K, value: NotetakerSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleDisconnect = async (connectionId: string) => {
    const { error } = await supabase
      .from('calendar_connections')
      .update({ is_active: false })
      .eq('id', connectionId);

    if (error) {
      notify.error("Failed to disconnect calendar");
    } else {
      notify.success("Calendar disconnected");
      loadCalendarConnections();
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="p-6 animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4" />
          <div className="space-y-4">
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Core Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <Bot className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Club AI Notetaker</h3>
            <p className="text-sm text-muted-foreground">
              Powered by QUIN — automatically joins your Google Meet calls to capture notes, generate summaries, and extract action items.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-join-bookings">Auto-join all Google Meet bookings</Label>
              <p className="text-sm text-muted-foreground">
                Automatically join every Google Meet booked through your scheduling links.
              </p>
            </div>
            <Switch
              id="auto-join-bookings"
              checked={settings.auto_join_all_bookings}
              onCheckedChange={(v) => updateSetting('auto_join_all_bookings', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-join-interviews">Auto-join detected interviews</Label>
              <p className="text-sm text-muted-foreground">
                Automatically join calendar events detected as interviews.
              </p>
            </div>
            <Switch
              id="auto-join-interviews"
              checked={settings.auto_join_detected_interviews}
              onCheckedChange={(v) => updateSetting('auto_join_detected_interviews', v)}
            />
          </div>
        </div>
      </Card>

      {/* Email Preferences */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Mail className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Post-Meeting Emails</h3>
            <p className="text-sm text-muted-foreground">
              Choose what you receive after each meeting.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="send-summary">Send summary email</Label>
              <p className="text-sm text-muted-foreground">
                Receive an email with the AI summary, key points, and action items.
              </p>
            </div>
            <Switch
              id="send-summary"
              checked={settings.send_summary_email}
              onCheckedChange={(v) => updateSetting('send_summary_email', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="send-transcript">Include full transcript</Label>
              <p className="text-sm text-muted-foreground">
                Attach the complete meeting transcript to the summary email.
              </p>
            </div>
            <Switch
              id="send-transcript"
              checked={settings.send_transcript_email}
              onCheckedChange={(v) => updateSetting('send_transcript_email', v)}
            />
          </div>
        </div>
      </Card>

      {/* Language & Quiet Hours */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-accent/50">
            <Globe className="h-6 w-6 text-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Language & Quiet Hours</h3>
            <p className="text-sm text-muted-foreground">
              Configure transcription language and availability windows.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Transcription language</Label>
            <Select
              value={settings.default_language}
              onValueChange={(v) => updateSetting('default_language', v)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map(lang => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Quiet hours (notetaker will not join during these times)
            </Label>
            <div className="flex items-center gap-3">
              <Input
                type="time"
                value={settings.quiet_hours_start || ''}
                onChange={(e) => updateSetting('quiet_hours_start', e.target.value || null)}
                className="w-[140px]"
                placeholder="Start"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="time"
                value={settings.quiet_hours_end || ''}
                onChange={(e) => updateSetting('quiet_hours_end', e.target.value || null)}
                className="w-[140px]"
                placeholder="End"
              />
              {(settings.quiet_hours_start || settings.quiet_hours_end) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    updateSetting('quiet_hours_start', null);
                    updateSetting('quiet_hours_end', null);
                  }}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>

      {/* Connected Calendars */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Calendar className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Connected Calendars</h3>
            <p className="text-sm text-muted-foreground">
              The notetaker uses your calendar connections to access Google Meet.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {calendarConnections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No calendars connected</p>
              <p className="text-xs mt-1">Connect your Google Calendar to enable the notetaker.</p>
            </div>
          ) : (
            calendarConnections.map(connection => (
              <Card key={connection.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <LinkIcon className="h-4 w-4 text-green-600" />
                      <h4 className="font-semibold">
                        {connection.provider === 'google' ? 'Google' : 'Microsoft'} - {connection.calendar_label}
                      </h4>
                      <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                        Active
                      </Badge>
                    </div>
                    {connection.last_synced_at && (
                      <p className="text-sm text-muted-foreground">
                        Last synced: {format(new Date(connection.last_synced_at), 'MMM d, h:mm a')}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDisconnect(connection.id)}
                    >
                      <Unlink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1">
              + Connect Google Calendar
            </Button>
            <Button variant="outline" className="flex-1">
              + Connect Microsoft Calendar
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

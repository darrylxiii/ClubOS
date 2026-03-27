import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Clock, Timer, Camera, Bell, Activity } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface TimeTrackingSettingsData {
  default_hourly_rate: number;
  auto_start_timer: boolean;
  idle_detection_enabled: boolean;
  idle_threshold_minutes: number;
  screenshot_enabled: boolean;
  screenshot_frequency_minutes: number;
  activity_tracking_enabled: boolean;
  timesheet_reminder_enabled: boolean;
  timesheet_reminder_day: string;
  blur_screenshots: boolean;
}

export function TimeTrackingSettings() {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<TimeTrackingSettingsData>({
    default_hourly_rate: 75,
    auto_start_timer: false,
    idle_detection_enabled: true,
    idle_threshold_minutes: 5,
    screenshot_enabled: false,
    screenshot_frequency_minutes: 10,
    activity_tracking_enabled: true,
    timesheet_reminder_enabled: true,
    timesheet_reminder_day: 'friday',
    blur_screenshots: true,
  });

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;
    
    try {
      // Use localStorage as fallback since these columns may not exist
      const stored = localStorage.getItem(`time_tracking_settings_${user.id}`);
      if (stored) {
        setSettings({ ...settings, ...JSON.parse(stored) });
      }
    } catch (error) {
      console.error('Error loading time tracking settings:', error);
    }
  };

  const saveSettings = async () => {
    if (!user) return;
    setSaving(true);
    
    try {
      // Store in localStorage as these columns may not exist in DB
      localStorage.setItem(`time_tracking_settings_${user.id}`, JSON.stringify(settings));
      toast.success(t("time_tracking_settings_saved", "Time tracking settings saved"));
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(t("failed_to_save_settings", "Failed to save settings"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Timer Settings
          </CardTitle>
          <CardDescription>{t("configure_how_the_time", "Configure how the time tracker behaves")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>{t("default_hourly_rate", "Default Hourly Rate (€)")}</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[settings.default_hourly_rate]}
                onValueChange={([value]) => setSettings({ ...settings, default_hourly_rate: value })}
                min={10}
                max={500}
                step={5}
                className="flex-1"
              />
              <span className="text-sm font-medium w-16 text-right">€{settings.default_hourly_rate}</span>
            </div>
            <p className="text-xs text-muted-foreground">{t("applied_to_new_time", "Applied to new time entries without a project rate")}</p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("autostart_timer", "Auto-start Timer")}</Label>
              <p className="text-xs text-muted-foreground">{t("automatically_start_timer_when", "Automatically start timer when selecting a task")}</p>
            </div>
            <Switch
              checked={settings.auto_start_timer}
              onCheckedChange={(checked) => setSettings({ ...settings, auto_start_timer: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Activity Monitoring
          </CardTitle>
          <CardDescription>{t("track_your_productivity_and", "Track your productivity and activity levels")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("activity_tracking", "Activity Tracking")}</Label>
              <p className="text-xs text-muted-foreground">{t("monitor_keyboard_and_mouse", "Monitor keyboard and mouse activity")}</p>
            </div>
            <Switch
              checked={settings.activity_tracking_enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, activity_tracking_enabled: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("idle_detection", "Idle Detection")}</Label>
              <p className="text-xs text-muted-foreground">{t("detect_when_youre_away", "Detect when you're away from your computer")}</p>
            </div>
            <Switch
              checked={settings.idle_detection_enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, idle_detection_enabled: checked })}
            />
          </div>

          {settings.idle_detection_enabled && (
            <div className="space-y-2 pl-4 border-l-2 border-muted">
              <Label>{t("idle_threshold", "Idle Threshold")}</Label>
              <Select
                value={settings.idle_threshold_minutes.toString()}
                onValueChange={(value) => setSettings({ ...settings, idle_threshold_minutes: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">{t("3_minutes", "3 minutes")}</SelectItem>
                  <SelectItem value="5">{t("5_minutes", "5 minutes")}</SelectItem>
                  <SelectItem value="10">{t("10_minutes", "10 minutes")}</SelectItem>
                  <SelectItem value="15">{t("15_minutes", "15 minutes")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Screenshots
          </CardTitle>
          <CardDescription>{t("optional_screenshot_capture_for", "Optional screenshot capture for verification")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("enable_screenshots", "Enable Screenshots")}</Label>
              <p className="text-xs text-muted-foreground">{t("capture_periodic_screenshots_while", "Capture periodic screenshots while tracking")}</p>
            </div>
            <Switch
              checked={settings.screenshot_enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, screenshot_enabled: checked })}
            />
          </div>

          {settings.screenshot_enabled && (
            <>
              <div className="space-y-2 pl-4 border-l-2 border-muted">
                <Label>{t("screenshot_frequency", "Screenshot Frequency")}</Label>
                <Select
                  value={settings.screenshot_frequency_minutes.toString()}
                  onValueChange={(value) => setSettings({ ...settings, screenshot_frequency_minutes: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">{t("every_5_minutes", "Every 5 minutes")}</SelectItem>
                    <SelectItem value="10">{t("every_10_minutes", "Every 10 minutes")}</SelectItem>
                    <SelectItem value="15">{t("every_15_minutes", "Every 15 minutes")}</SelectItem>
                    <SelectItem value="30">{t("every_30_minutes", "Every 30 minutes")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between pl-4 border-l-2 border-muted">
                <div className="space-y-0.5">
                  <Label>{t("blur_screenshots", "Blur Screenshots")}</Label>
                  <p className="text-xs text-muted-foreground">{t("blur_sensitive_content_in", "Blur sensitive content in screenshots")}</p>
                </div>
                <Switch
                  checked={settings.blur_screenshots}
                  onCheckedChange={(checked) => setSettings({ ...settings, blur_screenshots: checked })}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Reminders
          </CardTitle>
          <CardDescription>{t("get_reminded_to_submit", "Get reminded to submit your timesheets")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("timesheet_reminders", "Timesheet Reminders")}</Label>
              <p className="text-xs text-muted-foreground">{t("weekly_reminder_to_submit", "Weekly reminder to submit your timesheet")}</p>
            </div>
            <Switch
              checked={settings.timesheet_reminder_enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, timesheet_reminder_enabled: checked })}
            />
          </div>

          {settings.timesheet_reminder_enabled && (
            <div className="space-y-2 pl-4 border-l-2 border-muted">
              <Label>{t("reminder_day", "Reminder Day")}</Label>
              <Select
                value={settings.timesheet_reminder_day}
                onValueChange={(value) => setSettings({ ...settings, timesheet_reminder_day: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="thursday">{t("thursday", "Thursday")}</SelectItem>
                  <SelectItem value="friday">{t("friday", "Friday")}</SelectItem>
                  <SelectItem value="saturday">{t("saturday", "Saturday")}</SelectItem>
                  <SelectItem value="sunday">{t("sunday", "Sunday")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}

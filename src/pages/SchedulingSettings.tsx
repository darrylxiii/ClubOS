import { useTranslation } from 'react-i18next';
import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { Clock, Calendar, Globe, Bell, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { WeeklyAvailabilityGrid, type WeekSchedule } from "@/components/scheduling/WeeklyAvailabilityGrid";
import { DateOverrideManager, type DateOverride } from "@/components/scheduling/DateOverrideManager";

interface AvailabilitySettings {
  default_start_time: string;
  default_end_time: string;
  default_timezone: string;
  default_buffer_before: number;
  default_buffer_after: number;
  default_min_notice_hours: number;
  default_advance_booking_days: number;
  send_reminders: boolean;
  reminder_minutes_before: number;
  auto_detect_timezone: boolean;
  notify_on_booking: boolean;
}

const TIMEZONES = [
  "Europe/Amsterdam",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "America/Chicago",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
];

export default function SchedulingSettings() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [weekSchedule, setWeekSchedule] = useState<WeekSchedule | undefined>(undefined);
  const [dateOverrides, setDateOverrides] = useState<DateOverride[]>([]);
  const [settings, setSettings] = useState<AvailabilitySettings>({
    default_start_time: "09:00",
    default_end_time: "17:00",
    default_timezone: "Europe/Amsterdam",
    default_buffer_before: 5,
    default_buffer_after: 5,
    default_min_notice_hours: 24,
    default_advance_booking_days: 30,
    send_reminders: true,
    reminder_minutes_before: 60,
    auto_detect_timezone: false,
    notify_on_booking: true,
  });

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user]);

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const loadSettings = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from("booking_availability_settings")
      .select("*")
      .eq("user_id", user?.id)
      .maybeSingle();

    if (error) {
      toast.error(t("failed_to_load_scheduling", "Failed to load scheduling settings"));
      setLoading(false);
      setFetchError(true);
      return;
    }

    if (data) {
      setSettings({
        default_start_time: data.default_start_time || "09:00",
        default_end_time: data.default_end_time || "17:00",
        default_timezone: data.default_timezone || "Europe/Amsterdam",
        default_buffer_before: data.default_buffer_before || 5,
        default_buffer_after: data.default_buffer_after || 5,
        default_min_notice_hours: data.default_min_notice_hours || 24,
        default_advance_booking_days: data.default_advance_booking_days || 30,
        send_reminders: data.send_reminders ?? true,
        reminder_minutes_before: data.reminder_minutes_before || 60,
        auto_detect_timezone: data.auto_detect_timezone || false,
        notify_on_booking: data.notify_on_booking ?? true,
      });
    }
    
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    
    const { error } = await supabase
      .from("booking_availability_settings")
      .upsert({
        user_id: user?.id,
        ...settings,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id",
      });

    if (error) {
      toast.error(t("failed_to_save_settings", "Failed to save settings"));
    } else {
      toast.success(t("settings_saved_successfully", "Settings saved successfully"));
    }
    
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <ErrorState variant="page" title={t("failed_to_load_settings", "Failed to load settings")} message="We couldn't load your scheduling settings. Please try again." onRetry={() => { setFetchError(false); loadSettings(); }} />
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <Breadcrumb />
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t("scheduling_settings", "Scheduling Settings")}</h1>
          <p className="text-muted-foreground">{t("configure_your_default_availability", "Configure your default availability and booking preferences")}</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/booking-management")}>
          Back to Booking Management
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Working Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Working Hours
            </CardTitle>
            <CardDescription>{t("set_your_default_availability", "Set your default availability hours")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("start_time", "Start Time")}</Label>
                <Input
                  type="time"
                  value={settings.default_start_time}
                  onChange={(e) => setSettings({ ...settings, default_start_time: e.target.value })}
                />
              </div>
              <div>
                <Label>{t("end_time", "End Time")}</Label>
                <Input
                  type="time"
                  value={settings.default_end_time}
                  onChange={(e) => setSettings({ ...settings, default_end_time: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Timezone
              </Label>
              <Select
                value={settings.default_timezone}
                onValueChange={(value) => setSettings({ ...settings, default_timezone: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Buffer Times */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Buffer Times
            </CardTitle>
            <CardDescription>{t("add_breathing_room_between", "Add breathing room between meetings")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("buffer_before_min", "Buffer Before (min)")}</Label>
                <Input
                  type="number"
                  min="0"
                  max="60"
                  value={settings.default_buffer_before}
                  onChange={(e) => setSettings({ ...settings, default_buffer_before: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>{t("buffer_after_min", "Buffer After (min)")}</Label>
                <Input
                  type="number"
                  min="0"
                  max="60"
                  value={settings.default_buffer_after}
                  onChange={(e) => setSettings({ ...settings, default_buffer_after: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("min_notice_hours", "Min Notice (hours)")}</Label>
                <Input
                  type="number"
                  min="0"
                  value={settings.default_min_notice_hours}
                  onChange={(e) => setSettings({ ...settings, default_min_notice_hours: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>{t("advance_booking_days", "Advance Booking (days)")}</Label>
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={settings.default_advance_booking_days}
                  onChange={(e) => setSettings({ ...settings, default_advance_booking_days: parseInt(e.target.value) || 30 })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>{t("configure_booking_reminders", "Configure booking reminders")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>{t("send_reminders", "Send Reminders")}</Label>
              <Switch
                checked={settings.send_reminders}
                onCheckedChange={(checked) => setSettings({ ...settings, send_reminders: checked })}
              />
            </div>

            {settings.send_reminders && (
              <div>
                <Label>{t("reminder_before", "Reminder Before")}</Label>
                <Select
                  value={settings.reminder_minutes_before.toString()}
                  onValueChange={(value) => setSettings({ ...settings, reminder_minutes_before: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">{t("15_minutes_before", "15 minutes before")}</SelectItem>
                    <SelectItem value="30">{t("30_minutes_before", "30 minutes before")}</SelectItem>
                    <SelectItem value="60">{t("1_hour_before", "1 hour before")}</SelectItem>
                    <SelectItem value="120">{t("2_hours_before", "2 hours before")}</SelectItem>
                    <SelectItem value="1440">{t("24_hours_before", "24 hours before")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label>{t("notify_on_new_booking", "Notify on New Booking")}</Label>
              <Switch
                checked={settings.notify_on_booking}
                onCheckedChange={(checked) => setSettings({ ...settings, notify_on_booking: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Timezone Detection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Booking Preferences
            </CardTitle>
            <CardDescription>{t("control_how_bookings_are", "Control how bookings are handled")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>{t("autodetect_timezone", "Auto-Detect Timezone")}</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically detect guest timezone for booking
                </p>
              </div>
              <Switch
                checked={settings.auto_detect_timezone}
                onCheckedChange={(checked) => setSettings({ ...settings, auto_detect_timezone: checked })}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-Day Availability */}
      <WeeklyAvailabilityGrid value={weekSchedule} onChange={setWeekSchedule} />

      {/* Date Overrides */}
      <DateOverrideManager overrides={dateOverrides} onChange={setDateOverrides} />

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}

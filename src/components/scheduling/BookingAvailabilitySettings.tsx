import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { TimezoneSelector } from "@/components/booking/TimezoneSelector";
import { Clock, Calendar, Video, Palette, Bell, Settings } from "lucide-react";

interface BookingSettings {
  default_start_time: string;
  default_end_time: string;
  default_available_days: number[];
  time_slot_interval: number;
  default_buffer_before: number;
  default_buffer_after: number;
  default_advance_booking_days: number;
  default_min_notice_hours: number;
  primary_calendar_id: string | null;
  check_all_calendars: boolean;
  default_timezone: string;
  auto_detect_timezone: boolean;
  default_video_provider: string | null;
  auto_generate_links: boolean;
  include_dial_in: boolean;
  default_color: string;
  show_profile_picture: boolean;
  custom_welcome_message: string | null;
  notify_on_booking: boolean;
  send_reminders: boolean;
  reminder_minutes_before: number;
  send_calendar_invites: boolean;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export function BookingAvailabilitySettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [calendars, setCalendars] = useState<any[]>([]);
  const [settings, setSettings] = useState<BookingSettings>({
    default_start_time: "09:00",
    default_end_time: "17:00",
    default_available_days: [1, 2, 3, 4, 5],
    time_slot_interval: 30,
    default_buffer_before: 0,
    default_buffer_after: 0,
    default_advance_booking_days: 60,
    default_min_notice_hours: 2,
    primary_calendar_id: null,
    check_all_calendars: true,
    default_timezone: "Europe/Amsterdam",
    auto_detect_timezone: true,
    default_video_provider: null,
    auto_generate_links: false,
    include_dial_in: false,
    default_color: "#6366f1",
    show_profile_picture: true,
    custom_welcome_message: null,
    notify_on_booking: true,
    send_reminders: true,
    reminder_minutes_before: 60,
    send_calendar_invites: true,
  });

  useEffect(() => {
    if (user) {
      loadSettings();
      loadCalendars();
    }
  }, [user]);

  const loadCalendars = async () => {
    try {
      const { data, error } = await supabase
        .from("calendar_connections")
        .select("*")
        .eq("user_id", user?.id)
        .eq("is_active", true);

      if (error) throw error;
      setCalendars(data || []);
    } catch (error) {
      console.error("Error loading calendars:", error);
    }
  };

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("booking_availability_settings")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("booking_availability_settings")
        .upsert({
          ...settings,
          user_id: user?.id,
        });

      if (error) throw error;
      toast.success("Settings saved successfully");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day: number) => {
    const days = settings.default_available_days.includes(day)
      ? settings.default_available_days.filter((d) => d !== day)
      : [...settings.default_available_days, day].sort();
    setSettings({ ...settings, default_available_days: days });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Default Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Default Availability Hours
          </CardTitle>
          <CardDescription>Set your default working hours for all booking links</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_time">Start Time</Label>
              <Input
                id="start_time"
                type="time"
                value={settings.default_start_time}
                onChange={(e) => setSettings({ ...settings, default_start_time: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="end_time">End Time</Label>
              <Input
                id="end_time"
                type="time"
                value={settings.default_end_time}
                onChange={(e) => setSettings({ ...settings, default_end_time: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label>Available Days</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
              {DAYS_OF_WEEK.map((day) => (
                <div key={day.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`day-${day.value}`}
                    checked={settings.default_available_days.includes(day.value)}
                    onCheckedChange={() => toggleDay(day.value)}
                  />
                  <label
                    htmlFor={`day-${day.value}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {day.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Slot & Buffers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Time Slot Settings
          </CardTitle>
          <CardDescription>Configure time slots and buffer times</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="time_slot_interval">Time Slot Interval (minutes)</Label>
            <Select
              value={settings.time_slot_interval.toString()}
              onValueChange={(value) => setSettings({ ...settings, time_slot_interval: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">60 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="buffer_before">Buffer Before (minutes)</Label>
              <Input
                id="buffer_before"
                type="number"
                min="0"
                step="5"
                value={settings.default_buffer_before}
                onChange={(e) => setSettings({ ...settings, default_buffer_before: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="buffer_after">Buffer After (minutes)</Label>
              <Input
                id="buffer_after"
                type="number"
                min="0"
                step="5"
                value={settings.default_buffer_after}
                onChange={(e) => setSettings({ ...settings, default_buffer_after: parseInt(e.target.value) })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Booking Window */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Booking Window Defaults
          </CardTitle>
          <CardDescription>Set advance booking and minimum notice requirements</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="advance_booking">Advance Booking (days)</Label>
              <Input
                id="advance_booking"
                type="number"
                min="1"
                value={settings.default_advance_booking_days}
                onChange={(e) =>
                  setSettings({ ...settings, default_advance_booking_days: parseInt(e.target.value) })
                }
              />
            </div>
            <div>
              <Label htmlFor="min_notice">Minimum Notice (hours)</Label>
              <Input
                id="min_notice"
                type="number"
                min="0"
                value={settings.default_min_notice_hours}
                onChange={(e) => setSettings({ ...settings, default_min_notice_hours: parseInt(e.target.value) })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Calendar Preferences</CardTitle>
          <CardDescription>Configure calendar integration settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="primary_calendar">Primary Calendar</Label>
            <Select
              value={settings.primary_calendar_id || "none"}
              onValueChange={(value) =>
                setSettings({ ...settings, primary_calendar_id: value === "none" ? null : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a calendar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {calendars.map((cal) => (
                  <SelectItem key={cal.id} value={cal.id}>
                    {cal.calendar_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="check_all">Check All Calendars for Conflicts</Label>
              <p className="text-sm text-muted-foreground">Check all connected calendars for availability</p>
            </div>
            <Switch
              id="check_all"
              checked={settings.check_all_calendars}
              onCheckedChange={(checked) => setSettings({ ...settings, check_all_calendars: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Timezone */}
      <Card>
        <CardHeader>
          <CardTitle>Timezone Settings</CardTitle>
          <CardDescription>Configure timezone preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="timezone">Default Timezone</Label>
            <TimezoneSelector
              value={settings.default_timezone}
              onChange={(value) => setSettings({ ...settings, default_timezone: value })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto_detect">Auto-Detect Visitor Timezone</Label>
              <p className="text-sm text-muted-foreground">Automatically show times in visitor's timezone</p>
            </div>
            <Switch
              id="auto_detect"
              checked={settings.auto_detect_timezone}
              onCheckedChange={(checked) => setSettings({ ...settings, auto_detect_timezone: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Video Conferencing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Meeting Link Preferences
          </CardTitle>
          <CardDescription>Configure video conferencing defaults</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="video_provider">Default Video Provider</Label>
            <Select
              value={settings.default_video_provider || "none"}
              onValueChange={(value) =>
                setSettings({ ...settings, default_video_provider: value === "none" ? null : value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="google_meet">Google Meet</SelectItem>
                <SelectItem value="zoom">Zoom</SelectItem>
                <SelectItem value="microsoft_teams">Microsoft Teams</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto_generate">Auto-Generate Meeting Links</Label>
              <p className="text-sm text-muted-foreground">Automatically create meeting links for bookings</p>
            </div>
            <Switch
              id="auto_generate"
              checked={settings.auto_generate_links}
              onCheckedChange={(checked) => setSettings({ ...settings, auto_generate_links: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="dial_in">Include Dial-In Numbers</Label>
              <p className="text-sm text-muted-foreground">Add phone dial-in information</p>
            </div>
            <Switch
              id="dial_in"
              checked={settings.include_dial_in}
              onCheckedChange={(checked) => setSettings({ ...settings, include_dial_in: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Branding */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Booking Page Branding
          </CardTitle>
          <CardDescription>Customize the look of your booking pages</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="color">Default Color</Label>
            <div className="flex gap-2">
              <Input
                id="color"
                type="color"
                value={settings.default_color}
                onChange={(e) => setSettings({ ...settings, default_color: e.target.value })}
                className="w-20"
              />
              <Input
                type="text"
                value={settings.default_color}
                onChange={(e) => setSettings({ ...settings, default_color: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="show_picture">Show Profile Picture</Label>
              <p className="text-sm text-muted-foreground">Display your profile picture on booking pages</p>
            </div>
            <Switch
              id="show_picture"
              checked={settings.show_profile_picture}
              onCheckedChange={(checked) => setSettings({ ...settings, show_profile_picture: checked })}
            />
          </div>

          <div>
            <Label htmlFor="welcome_message">Custom Welcome Message</Label>
            <Textarea
              id="welcome_message"
              value={settings.custom_welcome_message || ""}
              onChange={(e) => setSettings({ ...settings, custom_welcome_message: e.target.value || null })}
              placeholder="Welcome! Please select a time that works for you..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Settings
          </CardTitle>
          <CardDescription>Configure booking notifications and reminders</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notify_booking">Email Notifications for New Bookings</Label>
              <p className="text-sm text-muted-foreground">Get notified when someone books time with you</p>
            </div>
            <Switch
              id="notify_booking"
              checked={settings.notify_on_booking}
              onCheckedChange={(checked) => setSettings({ ...settings, notify_on_booking: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="send_reminders">Send Reminder Emails</Label>
              <p className="text-sm text-muted-foreground">Send reminders before meetings</p>
            </div>
            <Switch
              id="send_reminders"
              checked={settings.send_reminders}
              onCheckedChange={(checked) => setSettings({ ...settings, send_reminders: checked })}
            />
          </div>

          {settings.send_reminders && (
            <div>
              <Label htmlFor="reminder_time">Reminder Time (minutes before)</Label>
              <Select
                value={settings.reminder_minutes_before.toString()}
                onValueChange={(value) =>
                  setSettings({ ...settings, reminder_minutes_before: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                  <SelectItem value="1440">1 day</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="calendar_invites">Send Calendar Invites to Guests</Label>
              <p className="text-sm text-muted-foreground">Automatically send calendar invites to guests</p>
            </div>
            <Switch
              id="calendar_invites"
              checked={settings.send_calendar_invites}
              onCheckedChange={(checked) => setSettings({ ...settings, send_calendar_invites: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={saving} size="lg">
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}

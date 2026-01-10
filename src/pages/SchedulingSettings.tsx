import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Calendar, Globe, Bell, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
      toast.error("Failed to save settings");
    } else {
      toast.success("Settings saved successfully");
    }
    
    setSaving(false);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto py-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
        <Breadcrumb />
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Scheduling Settings</h1>
            <p className="text-muted-foreground">Configure your default availability and booking preferences</p>
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
              <CardDescription>Set your default availability hours</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={settings.default_start_time}
                    onChange={(e) => setSettings({ ...settings, default_start_time: e.target.value })}
                  />
                </div>
                <div>
                  <Label>End Time</Label>
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
              <CardDescription>Add breathing room between meetings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Buffer Before (min)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="60"
                    value={settings.default_buffer_before}
                    onChange={(e) => setSettings({ ...settings, default_buffer_before: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Buffer After (min)</Label>
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
                  <Label>Min Notice (hours)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={settings.default_min_notice_hours}
                    onChange={(e) => setSettings({ ...settings, default_min_notice_hours: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Advance Booking (days)</Label>
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
              <CardDescription>Configure booking reminders</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Send Reminders</Label>
                <Switch
                  checked={settings.send_reminders}
                  onCheckedChange={(checked) => setSettings({ ...settings, send_reminders: checked })}
                />
              </div>

              {settings.send_reminders && (
                <div>
                  <Label>Reminder Before</Label>
                  <Select
                    value={settings.reminder_minutes_before.toString()}
                    onValueChange={(value) => setSettings({ ...settings, reminder_minutes_before: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes before</SelectItem>
                      <SelectItem value="30">30 minutes before</SelectItem>
                      <SelectItem value="60">1 hour before</SelectItem>
                      <SelectItem value="120">2 hours before</SelectItem>
                      <SelectItem value="1440">24 hours before</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label>Notify on New Booking</Label>
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
              <CardDescription>Control how bookings are handled</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-Detect Timezone</Label>
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

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}

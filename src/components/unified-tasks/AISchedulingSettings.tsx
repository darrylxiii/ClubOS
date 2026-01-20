import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Settings, Clock, Calendar, Sparkles } from "lucide-react";

interface AISchedulingSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSettingsUpdated: () => void;
}

export const AISchedulingSettings = ({
  open,
  onOpenChange,
  onSettingsUpdated,
}: AISchedulingSettingsProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    ai_scheduling_enabled: true,
    working_hours_start: "09:00",
    working_hours_end: "17:00",
    working_days: [1, 2, 3, 4, 5],
    max_tasks_per_day: 8,
    buffer_between_tasks_minutes: 15,
  });

  useEffect(() => {
    if (open && user) {
      loadSettings();
    }
  }, [open, user]);

  const loadSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("task_system_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          ai_scheduling_enabled: data.ai_scheduling_enabled ?? true,
          working_hours_start: data.working_hours_start ?? "09:00",
          working_hours_end: data.working_hours_end ?? "17:00",
          working_days: data.working_days ?? [1, 2, 3, 4, 5],
          max_tasks_per_day: data.max_tasks_per_day ?? 8,
          buffer_between_tasks_minutes: data.buffer_between_tasks_minutes ?? 15,
        });
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("task_system_preferences")
        .upsert({
          user_id: user.id,
          ...settings,
        });

      if (error) throw error;

      toast.success("AI scheduling settings updated");
      onSettingsUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to update settings");
    } finally {
      setLoading(false);
    }
  };

  const toggleWorkingDay = (day: number) => {
    setSettings(prev => ({
      ...prev,
      working_days: prev.working_days.includes(day)
        ? prev.working_days.filter(d => d !== day)
        : [...prev.working_days, day].sort(),
    }));
  };

  const weekDays = [
    { value: 1, label: "Mon" },
    { value: 2, label: "Tue" },
    { value: 3, label: "Wed" },
    { value: 4, label: "Thu" },
    { value: 5, label: "Fri" },
    { value: 6, label: "Sat" },
    { value: 0, label: "Sun" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Scheduling Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Enable AI Scheduling */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable AI Scheduling</Label>
              <p className="text-sm text-muted-foreground">
                Let AI automatically schedule your tasks
              </p>
            </div>
            <Switch
              checked={settings.ai_scheduling_enabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, ai_scheduling_enabled: checked })
              }
            />
          </div>

          {/* Working Hours */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Working Hours
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start">Start</Label>
                <Input
                  id="start"
                  type="time"
                  value={settings.working_hours_start}
                  onChange={(e) =>
                    setSettings({ ...settings, working_hours_start: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="end">End</Label>
                <Input
                  id="end"
                  type="time"
                  value={settings.working_hours_end}
                  onChange={(e) =>
                    setSettings({ ...settings, working_hours_end: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          {/* Working Days */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Working Days
            </Label>
            <div className="flex gap-2">
              {weekDays.map((day) => (
                <Button
                  key={day.value}
                  type="button"
                  variant={settings.working_days.includes(day.value) ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => toggleWorkingDay(day.value)}
                >
                  {day.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Max Tasks Per Day */}
          <div className="space-y-2">
            <Label htmlFor="max_tasks">Max Tasks Per Day</Label>
            <Input
              id="max_tasks"
              type="number"
              min="1"
              max="20"
              value={settings.max_tasks_per_day}
              onChange={(e) =>
                setSettings({ ...settings, max_tasks_per_day: parseInt(e.target.value) || 8 })
              }
            />
          </div>

          {/* Buffer Between Tasks */}
          <div className="space-y-2">
            <Label htmlFor="buffer">Buffer Between Tasks (minutes)</Label>
            <Select
              value={settings.buffer_between_tasks_minutes.toString()}
              onValueChange={(value) =>
                setSettings({ ...settings, buffer_between_tasks_minutes: parseInt(value) })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">No buffer</SelectItem>
                <SelectItem value="5">5 minutes</SelectItem>
                <SelectItem value="10">10 minutes</SelectItem>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

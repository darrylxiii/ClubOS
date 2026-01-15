import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Clock, Sparkles, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export function TaskSchedulingPreferences() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [preferences, setPreferences] = useState({
    auto_schedule_enabled: false,
    working_hours_start: "09:00",
    working_hours_end: "17:00",
    working_days: [1, 2, 3, 4, 5], // Monday to Friday
    preferred_task_duration_minutes: 30,
    break_between_tasks_minutes: 15,
    max_tasks_per_day: 8,
  });

  const weekDays = [
    { value: 1, label: "Mon" },
    { value: 2, label: "Tue" },
    { value: 3, label: "Wed" },
    { value: 4, label: "Thu" },
    { value: 5, label: "Fri" },
    { value: 6, label: "Sat" },
    { value: 0, label: "Sun" },
  ];

  useEffect(() => {
    loadPreferences();
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('task_scheduling_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setPreferences({
          auto_schedule_enabled: data.auto_schedule_enabled,
          working_hours_start: data.working_hours_start,
          working_hours_end: data.working_hours_end,
          working_days: data.working_days,
          preferred_task_duration_minutes: data.preferred_task_duration_minutes,
          break_between_tasks_minutes: data.break_between_tasks_minutes,
          max_tasks_per_day: data.max_tasks_per_day,
        });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('task_scheduling_preferences')
        .upsert({
          user_id: user.id,
          ...preferences,
        });

      if (error) throw error;
      toast.success('Scheduling preferences saved');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleWorkingDayToggle = (day: number) => {
    const newDays = preferences.working_days.includes(day)
      ? preferences.working_days.filter(d => d !== day)
      : [...preferences.working_days, day].sort();
    
    setPreferences({ ...preferences, working_days: newDays });
  };

  if (loading) {
    return <div className="p-4">Loading preferences...</div>;
  }

  return (
    <Card className="border-0 bg-card/30 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent" />
          AI Task Scheduling
        </CardTitle>
        <CardDescription>
          Configure Motion-style intelligent scheduling for your tasks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable Auto-Scheduling */}
        <div className="flex items-center justify-between p-4 border-2 border-accent/20 rounded-lg bg-accent/5">
          <div>
            <Label htmlFor="auto-schedule" className="text-base font-semibold cursor-pointer">
              Enable AI Auto-Scheduling
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              Let AI automatically schedule your tasks based on calendar and priorities
            </p>
          </div>
          <Switch
            id="auto-schedule"
            checked={preferences.auto_schedule_enabled}
            onCheckedChange={(checked) => 
              setPreferences({ ...preferences, auto_schedule_enabled: checked })
            }
          />
        </div>

        <Separator />

        {/* Working Hours */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-accent" />
            <Label className="text-base font-semibold">Working Hours</Label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-time" className="text-sm">Start Time</Label>
              <Input
                id="start-time"
                type="time"
                value={preferences.working_hours_start}
                onChange={(e) => 
                  setPreferences({ ...preferences, working_hours_start: e.target.value })
                }
                className="bg-background/50"
              />
            </div>
            <div>
              <Label htmlFor="end-time" className="text-sm">End Time</Label>
              <Input
                id="end-time"
                type="time"
                value={preferences.working_hours_end}
                onChange={(e) => 
                  setPreferences({ ...preferences, working_hours_end: e.target.value })
                }
                className="bg-background/50"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Working Days */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-accent" />
            <Label className="text-base font-semibold">Working Days</Label>
          </div>
          <div className="flex flex-wrap gap-2">
            {weekDays.map((day) => (
              <label
                key={day.value}
                className={cn(
                  "flex items-center justify-center w-12 h-12 rounded-lg border-2 cursor-pointer transition-all",
                  preferences.working_days.includes(day.value)
                    ? "bg-accent text-background border-accent font-bold"
                    : "border-border hover:border-accent/50"
                )}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={preferences.working_days.includes(day.value)}
                  onChange={() => handleWorkingDayToggle(day.value)}
                />
                <span className="text-xs font-bold">{day.label}</span>
              </label>
            ))}
          </div>
        </div>

        <Separator />

        {/* Task Duration */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label className="text-base font-semibold">Default Task Duration</Label>
            <span className="text-sm font-bold">{preferences.preferred_task_duration_minutes} min</span>
          </div>
          <Slider
            value={[preferences.preferred_task_duration_minutes]}
            onValueChange={(value) => 
              setPreferences({ ...preferences, preferred_task_duration_minutes: value[0] })
            }
            min={15}
            max={180}
            step={15}
            className="py-4"
          />
        </div>

        <Separator />

        {/* Break Between Tasks */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label className="text-base font-semibold">Break Between Tasks</Label>
            <span className="text-sm font-bold">{preferences.break_between_tasks_minutes} min</span>
          </div>
          <Slider
            value={[preferences.break_between_tasks_minutes]}
            onValueChange={(value) => 
              setPreferences({ ...preferences, break_between_tasks_minutes: value[0] })
            }
            min={0}
            max={60}
            step={5}
            className="py-4"
          />
        </div>

        <Separator />

        {/* Max Tasks Per Day */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label className="text-base font-semibold">Max Tasks Per Day</Label>
            <span className="text-sm font-bold">{preferences.max_tasks_per_day} tasks</span>
          </div>
          <Slider
            value={[preferences.max_tasks_per_day]}
            onValueChange={(value) => 
              setPreferences({ ...preferences, max_tasks_per_day: value[0] })
            }
            min={1}
            max={20}
            step={1}
            className="py-4"
          />
        </div>

        <Button
          onClick={savePreferences}
          disabled={saving}
          className="w-full"
          variant="glass"
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>

        <div className="p-4 bg-accent/5 border border-accent/20 rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong>About AI Scheduling:</strong> When enabled, our AI analyzes your calendar, 
            task priorities, and these preferences to automatically schedule tasks at optimal times. 
            Similar to Motion.app, it dynamically adjusts as new tasks arrive or your schedule changes.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
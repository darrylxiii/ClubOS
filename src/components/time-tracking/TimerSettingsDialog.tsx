import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings, Clock, BellOff } from "lucide-react";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { useState, useEffect } from "react";

interface TimerSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TimerSettingsDialog({
  open,
  onOpenChange,
}: TimerSettingsDialogProps) {
  const { timerSettings, projects, updateTimerSettings } = useTimeTracking();
  
  const [idleThreshold, setIdleThreshold] = useState(5);
  const [autoStopOnIdle, setAutoStopOnIdle] = useState(false);
  const [defaultProjectId, setDefaultProjectId] = useState<string | null>(null);
  const [showRunningHeader, setShowRunningHeader] = useState(true);

  // Sync with saved settings
  useEffect(() => {
    if (timerSettings) {
      setIdleThreshold(timerSettings.idle_threshold_minutes);
      setAutoStopOnIdle(timerSettings.auto_stop_on_idle);
      setDefaultProjectId(timerSettings.default_project_id);
      setShowRunningHeader(timerSettings.show_running_timer_header);
    }
  }, [timerSettings]);

  const handleSave = async () => {
    await updateTimerSettings.mutateAsync({
      idle_threshold_minutes: idleThreshold,
      auto_stop_on_idle: autoStopOnIdle,
      default_project_id: defaultProjectId,
      show_running_timer_header: showRunningHeader,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Timer Settings
          </DialogTitle>
          <DialogDescription>
            Customize your time tracking preferences
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Idle threshold */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Idle Detection Threshold
            </Label>
            <Select
              value={idleThreshold.toString()}
              onValueChange={(val) => setIdleThreshold(parseInt(val))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select threshold" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 minutes</SelectItem>
                <SelectItem value="10">10 minutes</SelectItem>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              You'll be notified after being idle for this duration
            </p>
          </div>

          {/* Auto-stop on idle */}
          <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium flex items-center gap-2">
                <BellOff className="h-4 w-4" />
                Auto-stop on Idle
              </Label>
              <p className="text-xs text-muted-foreground">
                Automatically stop timer when idle threshold is reached
              </p>
            </div>
            <Switch
              checked={autoStopOnIdle}
              onCheckedChange={setAutoStopOnIdle}
            />
          </div>

          {/* Default project */}
          <div className="space-y-2">
            <Label>Default Project</Label>
            <Select
              value={defaultProjectId || "none"}
              onValueChange={(val) => setDefaultProjectId(val === "none" ? null : val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select default project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No default</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: project.color }}
                      />
                      {project.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              New timers will use this project by default
            </p>
          </div>

          {/* Show running timer header */}
          <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">
                Show Timer Header
              </Label>
              <p className="text-xs text-muted-foreground">
                Show sticky header when timer is running
              </p>
            </div>
            <Switch
              checked={showRunningHeader}
              onCheckedChange={setShowRunningHeader}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateTimerSettings.isPending}>
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

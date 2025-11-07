import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";
import { toast } from "sonner";

export interface ActivityThresholds {
  greenDays: number;
  yellowDays: number;
}

const DEFAULT_THRESHOLDS: ActivityThresholds = {
  greenDays: 7,
  yellowDays: 30,
};

const STORAGE_KEY = 'admin_activity_thresholds';

export function getActivityThresholds(): ActivityThresholds {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (err) {
    console.error('Error loading activity thresholds:', err);
  }
  return DEFAULT_THRESHOLDS;
}

export function saveActivityThresholds(thresholds: ActivityThresholds) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(thresholds));
  } catch (err) {
    console.error('Error saving activity thresholds:', err);
  }
}

export function getActivityColor(lastInteractionDate: string | null, thresholds: ActivityThresholds) {
  if (!lastInteractionDate) return 'red';
  
  const daysSince = Math.floor(
    (Date.now() - new Date(lastInteractionDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  
  if (daysSince < thresholds.greenDays) return 'green';
  if (daysSince < thresholds.yellowDays) return 'yellow';
  return 'red';
}

export function getActivityLabel(lastInteractionDate: string | null) {
  if (!lastInteractionDate) return 'No activity';
  
  const daysSince = Math.floor(
    (Date.now() - new Date(lastInteractionDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  
  if (daysSince === 0) return 'Today';
  if (daysSince === 1) return 'Yesterday';
  if (daysSince < 7) return `${daysSince} days ago`;
  if (daysSince < 30) return `${Math.floor(daysSince / 7)} weeks ago`;
  return `${Math.floor(daysSince / 30)} months ago`;
}

interface ActivitySettingsDialogProps {
  onThresholdsChange: (thresholds: ActivityThresholds) => void;
}

export function ActivitySettingsDialog({ onThresholdsChange }: ActivitySettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [greenDays, setGreenDays] = useState(DEFAULT_THRESHOLDS.greenDays);
  const [yellowDays, setYellowDays] = useState(DEFAULT_THRESHOLDS.yellowDays);

  useEffect(() => {
    const thresholds = getActivityThresholds();
    setGreenDays(thresholds.greenDays);
    setYellowDays(thresholds.yellowDays);
  }, [open]);

  const handleSave = () => {
    if (greenDays >= yellowDays) {
      toast.error('Active threshold must be less than Warning threshold');
      return;
    }

    const thresholds: ActivityThresholds = {
      greenDays,
      yellowDays,
    };

    saveActivityThresholds(thresholds);
    onThresholdsChange(thresholds);
    toast.success('Activity thresholds updated');
    setOpen(false);
  };

  const handleReset = () => {
    setGreenDays(DEFAULT_THRESHOLDS.greenDays);
    setYellowDays(DEFAULT_THRESHOLDS.yellowDays);
    saveActivityThresholds(DEFAULT_THRESHOLDS);
    onThresholdsChange(DEFAULT_THRESHOLDS);
    toast.success('Reset to default thresholds');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4 mr-2" />
          Activity Settings
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Activity Status Thresholds</DialogTitle>
          <DialogDescription>
            Configure when candidates are marked as Active (Green), Warning (Yellow), or Inactive (Red)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="green-days">
              Active Threshold (Green)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="green-days"
                type="number"
                min="1"
                max="365"
                value={greenDays}
                onChange={(e) => setGreenDays(parseInt(e.target.value) || 1)}
              />
              <span className="text-sm text-muted-foreground">days</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Candidates with activity within this period will be marked as Active (Green)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="yellow-days">
              Warning Threshold (Yellow)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="yellow-days"
                type="number"
                min="1"
                max="365"
                value={yellowDays}
                onChange={(e) => setYellowDays(parseInt(e.target.value) || 1)}
              />
              <span className="text-sm text-muted-foreground">days</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Candidates with activity between {greenDays} and this period will be marked as Warning (Yellow)
            </p>
          </div>

          <div className="space-y-2">
            <Label>Inactive (Red)</Label>
            <p className="text-xs text-muted-foreground">
              Candidates with activity beyond {yellowDays} days will be marked as Inactive (Red)
            </p>
          </div>

          <div className="flex items-center gap-2 pt-4 border-t">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-xs">Active (&lt;{greenDays}d)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-xs">Warning ({greenDays}-{yellowDays}d)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-xs">Inactive (&gt;{yellowDays}d)</span>
            </div>
          </div>
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={handleReset}>
            Reset to Default
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

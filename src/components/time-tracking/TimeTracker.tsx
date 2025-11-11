import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Play, 
  Pause, 
  Square, 
  Clock,
  DollarSign,
  Tag
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TimeTrackerProps {
  contractId: string;
  hourlyRate: number;
  onSave: (entry: {
    hours: number;
    description: string;
    isBillable: boolean;
    tags: string[];
  }) => Promise<void>;
}

export function TimeTracker({ contractId, hourlyRate, onSave }: TimeTrackerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [taskDescription, setTaskDescription] = useState("");
  const [isBillable, setIsBillable] = useState(true);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  // Timer logic
  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isPaused]);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    if (!isRunning) {
      startTimeRef.current = new Date();
    }
    setIsRunning(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    setIsPaused(true);
  };

  const handleResume = () => {
    setIsPaused(false);
  };

  const handleStop = async () => {
    if (seconds < 60) {
      alert("Minimum time entry is 1 minute");
      return;
    }

    const hours = seconds / 3600;
    await onSave({
      hours,
      description: taskDescription,
      isBillable,
      tags
    });

    // Reset
    setIsRunning(false);
    setIsPaused(false);
    setSeconds(0);
    setTaskDescription("");
    setTags([]);
    startTimeRef.current = null;
  };

  const addTag = () => {
    if (tagInput && !tags.includes(tagInput)) {
      setTags([...tags, tagInput]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const currentEarnings = (seconds / 3600) * hourlyRate;

  return (
    <Card className="p-6 border border-border/50">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Time Tracker
        </h3>
        {isRunning && (
          <Badge className={cn(
            "border",
            isPaused 
              ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" 
              : "bg-green-500/10 text-green-600 border-green-500/20 animate-pulse"
          )}>
            {isPaused ? "Paused" : "Tracking"}
          </Badge>
        )}
      </div>

      {/* Timer Display */}
      <div className="mb-6 p-8 bg-muted/30 rounded-lg text-center">
        <div className="text-6xl font-bold text-foreground font-mono mb-4">
          {formatTime(seconds)}
        </div>
        {isRunning && (
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground">
                €{currentEarnings.toFixed(2)}
              </span>
              <span className="text-muted-foreground">earned</span>
            </div>
            <div className="text-muted-foreground">
              @ €{hourlyRate}/hr
            </div>
          </div>
        )}
      </div>

      {/* Task Description */}
      <div className="mb-4">
        <Label htmlFor="task-desc" className="mb-2 block">
          What are you working on?
        </Label>
        <Textarea
          id="task-desc"
          placeholder="Describe the task you're working on..."
          value={taskDescription}
          onChange={(e) => setTaskDescription(e.target.value)}
          disabled={!isRunning}
          className="min-h-[80px]"
        />
      </div>

      {/* Tags */}
      <div className="mb-4">
        <Label className="mb-2 block">Tags</Label>
        <div className="flex items-center gap-2 mb-2">
          <Input
            placeholder="Add tag (e.g., frontend, bug-fix)"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addTag()}
            disabled={!isRunning}
          />
          <Button 
            size="sm" 
            variant="outline"
            onClick={addTag}
            disabled={!isRunning || !tagInput}
          >
            <Tag className="h-4 w-4" />
          </Button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge 
                key={tag}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => removeTag(tag)}
              >
                {tag} ×
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Billable Toggle */}
      <div className="flex items-center justify-between mb-6 p-3 bg-muted/20 rounded-md">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="billable" className="cursor-pointer">
            Billable Time
          </Label>
        </div>
        <Switch
          id="billable"
          checked={isBillable}
          onCheckedChange={setIsBillable}
          disabled={!isRunning}
        />
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-3">
        {!isRunning ? (
          <Button 
            className="flex-1"
            size="lg"
            onClick={handleStart}
            disabled={!taskDescription}
          >
            <Play className="h-4 w-4 mr-2" />
            Start Timer
          </Button>
        ) : (
          <>
            {!isPaused ? (
              <Button 
                className="flex-1"
                size="lg"
                variant="outline"
                onClick={handlePause}
              >
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
            ) : (
              <Button 
                className="flex-1"
                size="lg"
                onClick={handleResume}
              >
                <Play className="h-4 w-4 mr-2" />
                Resume
              </Button>
            )}
            <Button 
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              size="lg"
              onClick={handleStop}
            >
              <Square className="h-4 w-4 mr-2" />
              Stop & Save
            </Button>
          </>
        )}
      </div>

      {isRunning && (
        <p className="text-xs text-muted-foreground text-center mt-3">
          Timer started at {startTimeRef.current?.toLocaleTimeString()}
        </p>
      )}
    </Card>
  );
}

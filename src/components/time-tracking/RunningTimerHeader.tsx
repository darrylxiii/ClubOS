import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Square } from "lucide-react";
import { useTimeTracking, formatDuration } from "@/hooks/useTimeTracking";

export function RunningTimerHeader() {
  const { runningEntry, projects, stopTimer, switchProject } = useTimeTracking();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Update elapsed time every second
  useEffect(() => {
    if (!runningEntry?.start_time) {
      setElapsedSeconds(0);
      return;
    }

    const updateElapsed = () => {
      const start = new Date(runningEntry.start_time!).getTime();
      const now = Date.now();
      setElapsedSeconds(Math.floor((now - start) / 1000));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [runningEntry?.start_time]);

  if (!runningEntry) return null;

  const currentProject = projects.find(p => p.id === runningEntry.project_id);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-primary/95 to-primary backdrop-blur-md shadow-lg border-b border-primary/20">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Project & Timer */}
          <div className="flex items-center gap-4">
            {/* Pulsing green indicator */}
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>

            {/* Project selector */}
            <Select
              value={runningEntry.project_id || undefined}
              onValueChange={(value) => switchProject.mutate({ projectId: value })}
            >
              <SelectTrigger className="w-[200px] bg-white/10 border-white/20 text-white hover:bg-white/20">
                <div className="flex items-center gap-2">
                  {currentProject && (
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: currentProject.color }}
                    />
                  )}
                  <SelectValue placeholder="No project" />
                </div>
              </SelectTrigger>
              <SelectContent>
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

            {/* Description */}
            {runningEntry.description && (
              <span className="text-white/80 text-sm truncate max-w-[200px]">
                {runningEntry.description}
              </span>
            )}

            {/* Billable badge */}
            {runningEntry.is_billable && (
              <Badge variant="secondary" className="bg-white/20 text-white border-0">
                Billable
              </Badge>
            )}
          </div>

          {/* Center: Timer display */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-2xl font-bold text-white tabular-nums tracking-wider">
              {formatDuration(elapsedSeconds)}
            </span>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => stopTimer.mutate(runningEntry.id)}
              className="bg-white/20 hover:bg-white/30 text-white border-0 gap-2"
            >
              <Square className="h-4 w-4" />
              Stop
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

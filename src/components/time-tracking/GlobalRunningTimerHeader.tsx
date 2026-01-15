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
import { Square, Clock } from "lucide-react";
import { useTimeTracking, formatDuration } from "@/hooks/useTimeTracking";
import { useNavigate } from "react-router-dom";

export function GlobalRunningTimerHeader() {
  const navigate = useNavigate();
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
    <div className="fixed top-14 sm:top-16 left-0 right-0 md:left-20 z-40 bg-gradient-to-r from-primary/95 to-primary backdrop-blur-md shadow-lg border-b border-primary/20">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Pulsing indicator & Project */}
          <div className="flex items-center gap-3">
            {/* Pulsing green indicator */}
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>

            {/* Project selector - hidden on mobile */}
            <div className="hidden sm:block">
              <Select
                value={runningEntry.project_id || undefined}
                onValueChange={(value) => switchProject.mutate({ projectId: value })}
              >
                <SelectTrigger className="w-[160px] h-8 bg-white/10 border-white/20 text-white hover:bg-white/20 text-sm">
                  <div className="flex items-center gap-2">
                    {currentProject && (
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
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
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: project.color }}
                        />
                        {project.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description - hidden on small screens */}
            {runningEntry.description && (
              <span className="hidden md:block text-white/80 text-sm truncate max-w-[150px]">
                {runningEntry.description}
              </span>
            )}

            {/* Billable badge */}
            {runningEntry.is_billable && (
              <Badge variant="secondary" className="hidden sm:inline-flex bg-white/20 text-white border-0 text-xs">
                Billable
              </Badge>
            )}
          </div>

          {/* Center: Timer display */}
          <button 
            onClick={() => navigate('/time-tracking')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Clock className="h-4 w-4 text-white/80" />
            <span className="font-mono text-lg font-bold text-white tabular-nums tracking-wider">
              {formatDuration(elapsedSeconds)}
            </span>
          </button>

          {/* Right: Stop button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => stopTimer.mutate(runningEntry.id)}
            className="bg-white/20 hover:bg-white/30 text-white border-0 gap-1.5 h-8"
          >
            <Square className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Stop</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
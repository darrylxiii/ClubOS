import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Clock, Timer, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreakoutRoomTimerProps {
  timeRemaining: string | null;
  isHost: boolean;
  onSetTimer?: (minutes: number) => void;
}

export function BreakoutRoomTimer({ 
  timeRemaining, 
  isHost,
  onSetTimer 
}: BreakoutRoomTimerProps) {
  const [timerMinutes, setTimerMinutes] = useState(10);

  const parseTime = (time: string): number => {
    const [mins, secs] = time.split(':').map(Number);
    return mins * 60 + secs;
  };

  const isLowTime = timeRemaining ? parseTime(timeRemaining) <= 60 : false;
  const isVeryLowTime = timeRemaining ? parseTime(timeRemaining) <= 30 : false;

  return (
    <Card className={cn(
      "flex items-center gap-3 px-4 py-2",
      isVeryLowTime && "bg-destructive/10 border-destructive animate-pulse",
      isLowTime && !isVeryLowTime && "bg-yellow-500/10 border-yellow-500"
    )}>
      {timeRemaining ? (
        <>
          <Timer className={cn(
            "h-5 w-5",
            isVeryLowTime && "text-destructive",
            isLowTime && !isVeryLowTime && "text-yellow-500",
            !isLowTime && "text-primary"
          )} />
          <div>
            <p className="text-sm text-muted-foreground">Time Remaining</p>
            <p className={cn(
              "text-xl font-mono font-bold",
              isVeryLowTime && "text-destructive",
              isLowTime && !isVeryLowTime && "text-yellow-500"
            )}>
              {timeRemaining}
            </p>
          </div>
          {isLowTime && (
            <AlertTriangle className={cn(
              "h-5 w-5 ml-2",
              isVeryLowTime ? "text-destructive" : "text-yellow-500"
            )} />
          )}
        </>
      ) : isHost ? (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Clock className="h-4 w-4" />
              Set Timer
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <div className="flex gap-2">
                  {[5, 10, 15, 20].map(mins => (
                    <Button
                      key={mins}
                      size="sm"
                      variant={timerMinutes === mins ? "default" : "outline"}
                      onClick={() => setTimerMinutes(mins)}
                    >
                      {mins}
                    </Button>
                  ))}
                </div>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={timerMinutes}
                  onChange={e => setTimerMinutes(parseInt(e.target.value) || 10)}
                  className="mt-2"
                />
              </div>
              <Button 
                className="w-full" 
                onClick={() => onSetTimer?.(timerMinutes)}
              >
                Start Timer
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      ) : (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span className="text-sm">No timer set</span>
        </div>
      )}
    </Card>
  );
}

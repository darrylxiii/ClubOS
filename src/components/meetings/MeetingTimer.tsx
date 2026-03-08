import { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';

interface MeetingTimerProps {
  startTime?: string | null; // ISO string of when the meeting started
}

export function MeetingTimer({ startTime }: MeetingTimerProps) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!startTime) return;

    const start = new Date(startTime).getTime();
    if (isNaN(start)) return;

    const tick = () => {
      setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    };

    tick();
    intervalRef.current = setInterval(tick, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startTime]);

  if (!startTime) return null;

  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  const display = hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;

  return (
    <div className="flex items-center gap-1.5 text-xs text-white/60 font-mono tabular-nums">
      <Clock className="h-3 w-3" />
      <span>{display}</span>
    </div>
  );
}

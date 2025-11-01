import { memo } from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';

interface IncubatorTimerProps {
  timeElapsed: number;
  timeLimit: number; // in seconds
  phase: string;
}

export const IncubatorTimer = memo(({ timeElapsed, timeLimit, phase }: IncubatorTimerProps) => {
  const percentage = Math.min((timeElapsed / timeLimit) * 100, 100);
  const minutes = Math.floor((timeLimit - timeElapsed) / 60);
  const seconds = (timeLimit - timeElapsed) % 60;
  const isWarning = timeElapsed > timeLimit * 0.8;
  const isCritical = timeElapsed > timeLimit * 0.95;

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="relative w-24 h-24">
        {/* Background circle */}
        <svg className="transform -rotate-90 w-24 h-24">
          <circle
            cx="48"
            cy="48"
            r="40"
            stroke="currentColor"
            strokeWidth="6"
            fill="transparent"
            className="text-muted"
          />
          <motion.circle
            cx="48"
            cy="48"
            r="40"
            stroke="currentColor"
            strokeWidth="6"
            fill="transparent"
            strokeDasharray={251.2}
            strokeDashoffset={251.2 - (251.2 * percentage) / 100}
            className={
              isCritical
                ? 'text-destructive'
                : isWarning
                ? 'text-warning'
                : 'text-primary'
            }
            strokeLinecap="round"
            initial={{ strokeDashoffset: 251.2 }}
            animate={{ strokeDashoffset: 251.2 - (251.2 * percentage) / 100 }}
            transition={{ duration: 0.5 }}
          />
        </svg>

        {/* Time display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Clock className={`w-4 h-4 mb-1 ${isCritical ? 'text-destructive' : 'text-muted-foreground'}`} />
          <span className={`text-sm font-bold ${isCritical ? 'text-destructive' : ''}`}>
            {minutes}:{seconds.toString().padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* Phase indicator */}
      <div className="mt-2 text-center">
        <span className="text-xs text-muted-foreground capitalize">{phase}</span>
      </div>
    </div>
  );
});

IncubatorTimer.displayName = 'IncubatorTimer';

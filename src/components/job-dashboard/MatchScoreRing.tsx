import { memo } from "react";
import { cn } from "@/lib/utils";
import { useTranslation } from 'react-i18next';

interface MatchScoreRingProps {
  score: number; // 0-100
  size?: number;
  className?: string;
}

export const MatchScoreRing = memo(({ score, size = 28, className }: MatchScoreRingProps) => {
  const { t } = useTranslation('jobs');
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(score, 0), 100);
  const offset = circumference - (progress / 100) * circumference;

  const color = score >= 80 ? 'text-success' : score >= 60 ? 'text-warning' : 'text-destructive';
  const trackColor = score >= 80 ? 'text-success/20' : score >= 60 ? 'text-warning/20' : 'text-destructive/20';

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={cn("stroke-current", trackColor)}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn("stroke-current transition-all duration-300", color)}
        />
      </svg>
      <span
        className={cn("absolute inset-0 flex items-center justify-center text-[8px] font-bold tabular-nums", color)}
      >
        {score}
      </span>
    </div>
  );
});

MatchScoreRing.displayName = 'MatchScoreRing';

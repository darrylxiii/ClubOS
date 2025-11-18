import { cn } from "@/lib/utils";
import { Activity } from "lucide-react";

interface DealHealthBadgeProps {
  score: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function DealHealthBadge({ score, showLabel = true, size = 'md' }: DealHealthBadgeProps) {
  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-success border-success/30 bg-success/10';
    if (score >= 50) return 'text-warning border-warning/30 bg-warning/10';
    return 'text-destructive border-destructive/30 bg-destructive/10';
  };

  const getHealthIcon = (score: number) => {
    if (score >= 80) return '🟢';
    if (score >= 50) return '🟡';
    return '🔴';
  };

  const getHealthLabel = (score: number) => {
    if (score >= 80) return 'Healthy';
    if (score >= 50) return 'Needs Attention';
    return 'At Risk';
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2',
  };

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors",
      getHealthColor(score),
      sizeClasses[size]
    )}>
      <Activity className={cn(
        size === 'sm' && 'h-3 w-3',
        size === 'md' && 'h-3.5 w-3.5',
        size === 'lg' && 'h-4 w-4'
      )} />
      <span>{getHealthIcon(score)}</span>
      <span>{score}</span>
      {showLabel && size !== 'sm' && (
        <span className="ml-1">{getHealthLabel(score)}</span>
      )}
    </div>
  );
}

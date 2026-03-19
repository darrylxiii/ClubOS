import { memo } from "react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Users, Activity, Clock, TrendingUp, AlertCircle, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

interface JobDashboardStatsBarProps {
  totalCandidates: number;
  activeCandidates: number;
  pendingReviews: number;
  daysOpen: number;
  conversionRate: number;
  avgTimeToHire: number;
}

const thresholdColor = (value: number, green: number, amber: number, invert = false) => {
  if (invert) {
    if (value >= green) return 'text-success';
    if (value >= amber) return 'text-warning';
    return 'text-destructive';
  }
  if (value <= green) return 'text-success';
  if (value <= amber) return 'text-warning';
  return 'text-destructive';
};

export const JobDashboardStatsBar = memo(({
  totalCandidates,
  activeCandidates,
  pendingReviews,
  daysOpen,
  conversionRate,
  avgTimeToHire,
}: JobDashboardStatsBarProps) => {
  const stats = [
    {
      icon: Users,
      label: "Candidates",
      value: totalCandidates,
      format: (v: number) => Math.round(v).toString(),
      colorClass: 'text-foreground',
    },
    {
      icon: Activity,
      label: "Active",
      value: activeCandidates,
      format: (v: number) => Math.round(v).toString(),
      colorClass: 'text-foreground',
    },
    {
      icon: AlertCircle,
      label: "Pending Reviews",
      value: pendingReviews,
      format: (v: number) => Math.round(v).toString(),
      colorClass: pendingReviews > 0 ? 'text-warning' : 'text-foreground',
      attention: pendingReviews > 0,
    },
    {
      icon: Clock,
      label: "Days Open",
      value: daysOpen,
      format: (v: number) => `${Math.round(v)}d`,
      colorClass: thresholdColor(daysOpen, 14, 30),
    },
    {
      icon: TrendingUp,
      label: "Conversion",
      value: conversionRate,
      format: (v: number) => `${Math.round(v)}%`,
      colorClass: thresholdColor(conversionRate, 50, 25, true),
    },
    {
      icon: Timer,
      label: "Avg to Hire",
      value: avgTimeToHire,
      format: (v: number) => `${Math.round(v)}d`,
      colorClass: thresholdColor(avgTimeToHire, 21, 45),
    },
  ];

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-2 px-1 scrollbar-none">
      {stats.map((stat, i) => (
        <div
          key={stat.label}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg",
            "bg-card/30 backdrop-blur-sm border border-border/20",
            "whitespace-nowrap text-xs shrink-0",
          )}
        >
          <stat.icon className={cn("w-3.5 h-3.5 text-muted-foreground", stat.attention && "text-warning")} />
          <span className="text-muted-foreground">{stat.label}</span>
          <span className={cn("font-semibold tabular-nums", stat.colorClass)}>
            <AnimatedNumber value={stat.value} format={stat.format} />
          </span>
          {stat.attention && (
            <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
          )}
          {i < stats.length - 1 && (
            <span className="ml-1 text-border/40">·</span>
          )}
        </div>
      ))}
    </div>
  );
});

JobDashboardStatsBar.displayName = 'JobDashboardStatsBar';

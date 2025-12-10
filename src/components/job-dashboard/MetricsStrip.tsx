import { memo } from "react";
import { Users, Clock, TrendingUp, Calendar } from "lucide-react";

interface MetricsStripProps {
  totalCandidates: number;
  activeCandidates: number;
  daysOpen: number;
  avgTimeToHire: number;
  interviewsScheduled?: number;
}

export const MetricsStrip = memo(({
  totalCandidates,
  activeCandidates,
  daysOpen,
  avgTimeToHire,
  interviewsScheduled = 0
}: MetricsStripProps) => {
  const metrics = [
    {
      label: "Total Candidates",
      value: totalCandidates,
      icon: Users,
      color: "text-primary"
    },
    {
      label: "Active in Pipeline",
      value: activeCandidates,
      icon: TrendingUp,
      color: "text-emerald-600"
    },
    {
      label: "Days Open",
      value: daysOpen,
      icon: Clock,
      color: daysOpen > 45 ? "text-orange-600" : daysOpen > 30 ? "text-amber-600" : "text-muted-foreground"
    },
    {
      label: "Avg Time to Hire",
      value: `${avgTimeToHire}d`,
      icon: Calendar,
      color: avgTimeToHire > 30 ? "text-orange-600" : "text-muted-foreground"
    }
  ];

  return (
    <div className="flex items-center gap-6 py-4 px-1 overflow-x-auto">
      {metrics.map((metric, idx) => (
        <div 
          key={metric.label} 
          className="flex items-center gap-3 min-w-fit"
        >
          <div className={`p-2 rounded-lg bg-muted/50 ${metric.color}`}>
            <metric.icon className="w-4 h-4" />
          </div>
          <div>
            <p className="text-2xl font-semibold tracking-tight text-foreground">
              {metric.value}
            </p>
            <p className="text-xs text-muted-foreground whitespace-nowrap">
              {metric.label}
            </p>
          </div>
          {idx < metrics.length - 1 && (
            <div className="w-px h-10 bg-border/40 ml-4" />
          )}
        </div>
      ))}
    </div>
  );
});

MetricsStrip.displayName = 'MetricsStrip';

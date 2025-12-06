import { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Users, UserCheck, Calendar, Clock, TrendingUp, Target
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EnhancedStatsGridProps {
  totalApplicants: number;
  activeCandidates: number;
  interviewsThisWeek: number;
  daysOpen: number;
  conversionRate: number;
  avgTimeToHire: number;
}

// Industry benchmarks for comparison
const BENCHMARKS = {
  daysOpen: { good: 30, warning: 60 },
  conversionRate: { good: 25, warning: 15 },
  avgTimeToHire: { good: 30, warning: 45 },
};

export const EnhancedStatsGrid = memo(({
  totalApplicants,
  activeCandidates,
  interviewsThisWeek,
  daysOpen,
  conversionRate,
  avgTimeToHire
}: EnhancedStatsGridProps) => {
  const getDaysOpenColor = (days: number) => {
    if (days <= BENCHMARKS.daysOpen.good) return 'text-emerald-500';
    if (days <= BENCHMARKS.daysOpen.warning) return 'text-amber-500';
    return 'text-rose-500';
  };
  
  const getConversionColor = (rate: number) => {
    if (rate >= BENCHMARKS.conversionRate.good) return 'text-emerald-500';
    if (rate >= BENCHMARKS.conversionRate.warning) return 'text-amber-500';
    return 'text-rose-500';
  };
  
  const getTimeToHireColor = (days: number) => {
    if (days <= BENCHMARKS.avgTimeToHire.good) return 'text-emerald-500';
    if (days <= BENCHMARKS.avgTimeToHire.warning) return 'text-amber-500';
    return 'text-rose-500';
  };

  const stats = [
    {
      label: "Total Applicants",
      value: totalApplicants,
      icon: Users,
      trend: null,
      benchmark: null,
      color: 'text-foreground'
    },
    {
      label: "Active in Pipeline",
      value: activeCandidates,
      icon: UserCheck,
      trend: null,
      benchmark: null,
      color: 'text-primary'
    },
    {
      label: "Interviews Scheduled",
      value: interviewsThisWeek,
      icon: Calendar,
      trend: null,
      benchmark: null,
      color: 'text-foreground'
    },
    {
      label: "Days Open",
      value: daysOpen,
      suffix: 'd',
      icon: Clock,
      benchmark: `<${BENCHMARKS.daysOpen.good}d ideal`,
      color: getDaysOpenColor(daysOpen)
    },
    {
      label: "Conversion Rate",
      value: conversionRate,
      suffix: '%',
      icon: TrendingUp,
      benchmark: `>${BENCHMARKS.conversionRate.good}% ideal`,
      color: getConversionColor(conversionRate)
    },
    {
      label: "Avg. Time to Hire",
      value: avgTimeToHire,
      suffix: 'd',
      icon: Target,
      benchmark: `<${BENCHMARKS.avgTimeToHire.good}d ideal`,
      color: getTimeToHireColor(avgTimeToHire)
    }
  ];

  return (
    <Card className="border border-border/40 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl">
      <CardContent className="p-4">
        <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3">Pipeline Metrics</h4>
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat, idx) => (
            <div 
              key={idx}
              className="p-3 rounded-lg bg-background/40 border border-border/20 hover:bg-background/60 transition-all duration-200"
            >
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[10px] uppercase font-medium text-muted-foreground truncate">
                  {stat.label}
                </span>
              </div>
              <p className={cn("text-xl font-bold", stat.color)}>
                {stat.value}{stat.suffix || ''}
              </p>
              {stat.benchmark && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {stat.benchmark}
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});

EnhancedStatsGrid.displayName = 'EnhancedStatsGrid';

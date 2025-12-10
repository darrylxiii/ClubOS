import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, AlertTriangle, Target, Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface InsightsPanelProps {
  metrics: {
    totalApplicants: number;
    stageBreakdown: { [key: number]: number };
    avgDaysInStage: { [key: number]: number };
    conversionRates: { [key: string]: number };
  };
  stages: any[];
}

export const InsightsPanel = memo(({ metrics, stages }: InsightsPanelProps) => {
  // Find bottleneck stages
  const bottlenecks = stages
    .map((stage, idx) => ({
      stage: stage.name,
      avgDays: metrics.avgDaysInStage[idx] || 0,
      count: metrics.stageBreakdown[idx] || 0
    }))
    .filter(s => s.avgDays > 7)
    .sort((a, b) => b.avgDays - a.avgDays);

  // Calculate time-to-hire forecast
  const avgTimeToHire = Object.values(metrics.avgDaysInStage).reduce((a, b) => a + b, 0);

  // Generate insights
  const insights = [];
  
  if (bottlenecks.length > 0) {
    insights.push({
      type: 'warning',
      title: 'Pipeline Bottleneck',
      text: `${bottlenecks[0].stage} is slowing down (${bottlenecks[0].avgDays}d avg)`,
      icon: AlertTriangle,
      color: 'text-amber-600',
      bgColor: 'bg-amber-500/10'
    });
  }
  
  // Find high conversion stages
  const highConversion = Object.entries(metrics.conversionRates)
    .filter(([_, rate]) => rate > 60)
    .map(([key, rate]) => {
      const [from] = key.split('-').map(Number);
      return { stage: stages[from]?.name || 'Unknown', rate };
    });

  if (highConversion.length > 0) {
    insights.push({
      type: 'success',
      title: 'Strong Conversion',
      text: `${highConversion[0].stage} has ${highConversion[0].rate}% pass rate`,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-500/10'
    });
  }

  // First stage backlog
  const stageOneCount = metrics.stageBreakdown[0] || 0;
  if (stageOneCount > 5) {
    insights.push({
      type: 'action',
      title: 'Review Needed',
      text: `${stageOneCount} candidates waiting in first stage`,
      icon: Target,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    });
  }

  // Add positive message if no issues
  if (insights.length === 0) {
    insights.push({
      type: 'success',
      title: 'Looking Good',
      text: 'Pipeline is flowing smoothly',
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-500/10'
    });
  }

  return (
    <Card className="border border-border/40 bg-card/95">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Sparkles className="w-4 h-4" />
          AI Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.slice(0, 3).map((insight, idx) => (
          <div 
            key={idx} 
            className={cn(
              "flex items-start gap-3 p-3 rounded-lg border border-border/20",
              insight.bgColor
            )}
          >
            <insight.icon className={cn("w-4 h-4 mt-0.5 flex-shrink-0", insight.color)} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">{insight.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{insight.text}</p>
            </div>
          </div>
        ))}
        
        {/* Time to Hire */}
        <div className="pt-3 border-t border-border/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              Estimated time-to-hire
            </div>
            <span className="text-sm font-semibold text-foreground">
              {Math.round(avgTimeToHire)} days
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

InsightsPanel.displayName = 'InsightsPanel';

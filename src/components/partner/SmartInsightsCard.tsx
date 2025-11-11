import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, AlertTriangle, Target, Clock } from "lucide-react";

interface SmartInsightsCardProps {
  metrics: {
    totalApplicants: number;
    stageBreakdown: { [key: number]: number };
    avgDaysInStage: { [key: number]: number };
    conversionRates: { [key: string]: number };
  };
  stages: any[];
}

export function SmartInsightsCard({ metrics, stages }: SmartInsightsCardProps) {
  // Find bottleneck stages (avg days > 7)
  const bottlenecks = stages
    .map((stage, idx) => ({
      stage: stage.name,
      avgDays: metrics.avgDaysInStage[idx] || 0,
      count: metrics.stageBreakdown[idx] || 0
    }))
    .filter(s => s.avgDays > 7)
    .sort((a, b) => b.avgDays - a.avgDays);

  // Find top performers (conversion > 60%)
  const topStages = Object.entries(metrics.conversionRates)
    .filter(([_, rate]) => rate > 60)
    .map(([key, rate]) => {
      const [from] = key.split('-').map(Number);
      return { stage: stages[from]?.name || 'Unknown', rate };
    });

  // Calculate time-to-hire forecast
  const avgTimeToHire = Object.values(metrics.avgDaysInStage).reduce((a, b) => a + b, 0);

  // Generate recommendations
  const recommendations = [];
  
  if (bottlenecks.length > 0) {
    recommendations.push({
      type: 'warning',
      text: `${bottlenecks[0].stage} stage is slowing pipeline (${bottlenecks[0].avgDays}d avg)`,
      icon: AlertTriangle,
      color: 'text-yellow-600'
    });
  }
  
  if (topStages.length > 0) {
    recommendations.push({
      type: 'success',
      text: `Strong conversion in ${topStages[0].stage} (${topStages[0].rate}%)`,
      icon: TrendingUp,
      color: 'text-green-600'
    });
  }

  if (avgTimeToHire > 30) {
    recommendations.push({
      type: 'info',
      text: `Consider streamlining process (${Math.round(avgTimeToHire)}d avg time-to-hire)`,
      icon: Clock,
      color: 'text-blue-600'
    });
  }

  if (metrics.totalApplicants > 0) {
    const stageOneCount = metrics.stageBreakdown[0] || 0;
    const percentageInFirstStage = (stageOneCount / metrics.totalApplicants) * 100;
    if (percentageInFirstStage > 50) {
      recommendations.push({
        type: 'action',
        text: `${stageOneCount} candidates need review in first stage`,
        icon: Target,
        color: 'text-primary'
      });
    }
  }

  if (recommendations.length === 0) {
    recommendations.push({
      type: 'success',
      text: 'Pipeline is flowing smoothly',
      icon: Sparkles,
      color: 'text-accent'
    });
  }

  return (
    <Card className="border-2 border-accent/20 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl shadow-[var(--shadow-glass-md)] hover:shadow-[var(--shadow-glass-lg)] transition-all duration-300">
      <CardHeader>
        <CardTitle className="font-black uppercase text-sm flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-accent/20">
            <Sparkles className="w-4 h-4 text-accent" />
          </div>
          Club AI Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendations.slice(0, 3).map((rec, idx) => (
          <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-background/40 backdrop-blur-sm border border-border/20 hover:bg-background/60 transition-all duration-300">
            <rec.icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${rec.color}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">{rec.text}</p>
            </div>
            <Badge 
              variant="secondary" 
              className="text-xs bg-background/60 border-0 whitespace-nowrap"
            >
              {rec.type}
            </Badge>
          </div>
        ))}
        
        <div className="pt-2 border-t border-border/20">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Time-to-hire forecast</span>
            <span className="font-bold text-foreground">{Math.round(avgTimeToHire)} days</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

import { Card } from "@/components/ui/card";
import { usePipelineVelocity, useDealStages } from "@/hooks/useDealPipeline";
import { Loader2, Clock, Trophy, TrendingUp, Zap } from "lucide-react";

export function PipelineVelocityMetrics() {
  const { data, isLoading, error } = usePipelineVelocity();

  if (isLoading) {
    return (
      <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Pipeline Velocity</h3>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Pipeline Velocity</h3>
        <p className="text-sm text-muted-foreground">Unable to load velocity data.</p>
      </Card>
    );
  }

  const winRate = data.win_rate || 0;
  const avgDaysToClose = data.avg_days_to_close || 0;
  const historyCount = data.total_history_records || 0;

  // Get forward-progression transitions only
  const forwardTransitions = (data.conversion_rates || []).filter((c: any) => {
    const stageOrder: Record<string, number> = {
      'New': 1, 'new': 1,
      'Qualified': 2,
      'Proposal': 3,
      'Negotiation': 4,
      'Closed Won': 5,
    };
    return (stageOrder[c.from_stage] || 0) < (stageOrder[c.to_stage] || 0);
  });

  const getDaysColor = (days: number) => {
    if (days <= 7) return 'text-green-500';
    if (days <= 14) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getDaysBg = (days: number) => {
    if (days <= 7) return 'bg-green-500/20';
    if (days <= 14) return 'bg-yellow-500/20';
    return 'bg-red-500/20';
  };

  return (
    <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
      <h3 className="text-lg font-semibold mb-4 text-foreground">Pipeline Velocity</h3>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded-lg border border-border/50 p-3 bg-background/50">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs text-muted-foreground">Win Rate</span>
          </div>
          <p className="text-xl font-bold text-foreground">{winRate}%</p>
        </div>
        <div className="rounded-lg border border-border/50 p-3 bg-background/50">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs text-muted-foreground">Avg Days to Close</span>
          </div>
          <p className="text-xl font-bold text-foreground">{avgDaysToClose}d</p>
        </div>
      </div>

      {/* Stage Transition Times */}
      {forwardTransitions.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Stage Transitions
            </span>
          </div>
          {forwardTransitions.map((t: any, i: number) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-32 truncate">
                {t.from_stage} → {t.to_stage}
              </span>
              <div className="flex-1 h-2 rounded-full bg-muted/30 overflow-hidden">
                <div
                  className={`h-full rounded-full ${getDaysBg(t.avg_days)}`}
                  style={{ width: `${Math.min((t.avg_days / 30) * 100, 100)}%` }}
                />
              </div>
              <span className={`text-xs font-medium w-10 text-right ${getDaysColor(t.avg_days)}`}>
                {t.avg_days}d
              </span>
              <span className="text-[10px] text-muted-foreground/60 w-6">
                ×{t.transition_count}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Not enough transition data yet ({historyCount} records).
        </p>
      )}
    </Card>
  );
}

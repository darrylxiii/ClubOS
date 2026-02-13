import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sunrise, X, AlertTriangle, Calendar, Bot, TrendingUp } from "lucide-react";
import { useDailyBriefing, useDismissBriefing } from "@/hooks/useDailyBriefing";

export function DailyBriefingBanner() {
  const { data: briefing, isLoading } = useDailyBriefing();
  const dismiss = useDismissBriefing();

  if (isLoading || !briefing) return null;

  const { summary, agentic_stats, top_actions } = briefing.content;

  return (
    <Card className="glass-subtle rounded-2xl border-primary/20 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <Sunrise className="h-4 w-4 text-primary" />
            </div>
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">Morning Briefing</p>
                <Badge variant="secondary" className="text-[10px]">
                  Powered by QUIN
                </Badge>
              </div>

              {/* Quick stats */}
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                {summary.stalled_candidates > 0 && (
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 text-destructive" />
                    {summary.stalled_candidates} stalled
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {summary.active_signals} signals
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {summary.meetings_today} meetings
                </span>
                <span className="flex items-center gap-1">
                  <Bot className="h-3 w-3" />
                  {summary.agent_decisions_24h} AI actions
                </span>
              </div>

              {/* Top actions */}
              {top_actions.length > 0 && (
                <div className="space-y-1">
                  {top_actions.map((action, i) => (
                    <p key={i} className="text-xs text-foreground/80">
                      <span className="text-primary font-medium">{i + 1}.</span> {action}
                    </p>
                  ))}
                </div>
              )}

              {/* Agentic stats */}
              {agentic_stats.heartbeat_runs > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  Overnight: {agentic_stats.events_processed} events processed · {agentic_stats.tasks_auto_created} tasks auto-created
                  {agentic_stats.errors > 0 && ` · ${agentic_stats.errors} errors`}
                </p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 min-h-0 min-w-0 shrink-0"
            onClick={() => dismiss.mutate(briefing.id)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

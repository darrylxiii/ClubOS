import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { useAgentDecisions } from "@/hooks/useAgentActivity";
import { useAISuggestions } from "@/hooks/useAISuggestions";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const agentColors: Record<string, string> = {
  club_ai: "bg-primary/10 text-primary",
  analytics_agent: "bg-blue-500/10 text-blue-500",
  engagement_agent: "bg-emerald-500/10 text-emerald-500",
  interview_agent: "bg-purple-500/10 text-purple-500",
  sourcing_agent: "bg-amber-500/10 text-amber-500",
};

export function AgentActivityWidget() {
  const { data: decisions, isLoading: decisionsLoading } = useAgentDecisions();
  const { suggestions, loading: suggestionsLoading } = useAISuggestions();

  const pendingApprovals = suggestions.filter(s => !s.shown && s.suggestion_type === 'agent_recommendation');
  const isLoading = decisionsLoading || suggestionsLoading;

  if (isLoading) {
    return (
      <Card className="glass-subtle rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Agent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-start gap-3 p-3">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-subtle rounded-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Agent Activity
              {(decisions?.length || 0) > 0 && (
                <Badge variant="secondary" className="text-xs">{decisions?.length}</Badge>
              )}
            </CardTitle>
            <CardDescription>Autonomous actions & pending approvals (24h)</CardDescription>
          </div>
          {pendingApprovals.length > 0 && (
            <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30">
              {pendingApprovals.length} pending
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {/* Pending Approvals */}
          {pendingApprovals.slice(0, 3).map(suggestion => (
            <div
              key={suggestion.id}
              className="flex items-start gap-3 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10"
            >
              <div className="p-1.5 rounded-lg bg-amber-500/10">
                <Clock className="h-3.5 w-3.5 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">{suggestion.title}</p>
                <p className="text-[11px] text-muted-foreground truncate">{suggestion.description}</p>
              </div>
              <Badge variant="outline" className="text-[10px] shrink-0">
                Needs approval
              </Badge>
            </div>
          ))}

          {/* Agent Decisions */}
          {(!decisions || decisions.length === 0) && pendingApprovals.length === 0 && (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No agent activity in the last 24 hours
            </div>
          )}

          {decisions?.slice(0, 8).map(decision => (
            <div
              key={decision.id}
              className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors"
            >
              <div className={cn("p-1.5 rounded-lg", agentColors[decision.agent_name] || "bg-muted")}>
                {decision.was_overridden
                  ? <AlertCircle className="h-3.5 w-3.5" />
                  : <CheckCircle2 className="h-3.5 w-3.5" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{decision.decision_made}</p>
                <p className="text-[11px] text-muted-foreground">
                  {decision.agent_name.replace(/_/g, ' ')}
                  {decision.confidence_score ? ` · ${Math.round(decision.confidence_score * 100)}% conf` : ''}
                </p>
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {decision.created_at
                  ? formatDistanceToNow(new Date(decision.created_at), { addSuffix: true })
                  : ''
                }
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

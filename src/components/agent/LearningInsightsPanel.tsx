import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Brain, 
  TrendingUp,
  Lightbulb,
  Target,
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react";

interface BehaviorRule {
  id: string;
  agent_name: string;
  rule_type: string;
  rule_description: string | null;
  condition: Record<string, unknown>;
  action_modifier: Record<string, unknown>;
  confidence_score: number;
  positive_outcomes: number;
  negative_outcomes: number;
  is_active: boolean;
  created_at: string;
}

interface ActionOutcome {
  id: string;
  action_type: string;
  outcome_quality: number;
  learnings_extracted: Record<string, unknown> | null;
  created_at: string;
}

export function LearningInsightsPanel() {
  // Fetch behavior rules
  const { data: rules, isLoading: rulesLoading } = useQuery({
    queryKey: ['behavior-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_behavior_rules')
        .select('*')
        .eq('is_active', true)
        .order('confidence_score', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data as BehaviorRule[];
    },
  });

  // Fetch recent action outcomes
  const { data: outcomes, isLoading: outcomesLoading } = useQuery({
    queryKey: ['action-outcomes'],
    queryFn: async () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { data, error } = await supabase
        .from('agent_action_outcomes')
        .select('*')
        .gte('created_at', weekAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as ActionOutcome[];
    },
  });

  // Calculate stats
  const stats = {
    totalOutcomes: outcomes?.length || 0,
    positiveOutcomes: outcomes?.filter(o => o.outcome_quality > 0).length || 0,
    negativeOutcomes: outcomes?.filter(o => o.outcome_quality < 0).length || 0,
    activeRules: rules?.length || 0,
    avgConfidence: rules?.length 
      ? (rules.reduce((sum, r) => sum + (r.confidence_score || 0), 0) / rules.length * 100).toFixed(1)
      : 0,
  };

  const successRate = stats.totalOutcomes 
    ? ((stats.positiveOutcomes / stats.totalOutcomes) * 100).toFixed(1)
    : 0;

  if (rulesLoading || outcomesLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card variant="static">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate}%</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>

        <Card variant="static">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rules</CardTitle>
            <Brain className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeRules}</div>
            <p className="text-xs text-muted-foreground">Learned behaviors</p>
          </CardContent>
        </Card>

        <Card variant="static">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Positive Outcomes</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.positiveOutcomes}</div>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>

        <Card variant="static">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            <Target className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgConfidence}%</div>
            <p className="text-xs text-muted-foreground">Rule confidence</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Behavior Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            Learned Behaviors
          </CardTitle>
          <CardDescription>
            Rules that QUIN has learned from observing outcomes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rules?.length ? (
            <div className="space-y-4">
              {rules.map((rule) => (
                <RuleCard key={rule.id} rule={rule} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Lightbulb className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                No learned behaviors yet. As agents take actions and receive feedback, 
                patterns will be identified and learned.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Outcomes */}
      {outcomes && outcomes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Recent Outcomes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {outcomes.slice(0, 10).map((outcome) => (
                <OutcomeItem key={outcome.id} outcome={outcome} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RuleCard({ rule }: { rule: BehaviorRule }) {
  const totalOutcomes = (rule.positive_outcomes || 0) + (rule.negative_outcomes || 0);
  const successRate = totalOutcomes > 0 
    ? ((rule.positive_outcomes || 0) / totalOutcomes * 100) 
    : 0;

  return (
    <div className="p-4 rounded-lg border border-border/50 bg-muted/20">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{rule.rule_description || rule.rule_type}</h4>
            <Badge 
              variant="outline" 
              className={rule.confidence_score > 0.7 
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
              }
            >
              {(rule.confidence_score * 100).toFixed(0)}% confidence
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Agent: {rule.agent_name} • {totalOutcomes} observations
          </p>
        </div>
      </div>

      {totalOutcomes > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Success rate</span>
            <span>{successRate.toFixed(0)}%</span>
          </div>
          <Progress value={successRate} className="h-1.5" />
        </div>
      )}
    </div>
  );
}

function OutcomeItem({ outcome }: { outcome: ActionOutcome }) {
  const isPositive = outcome.outcome_quality > 0;
  const isNegative = outcome.outcome_quality < 0;

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
      <div className={`p-1.5 rounded-full ${
        isPositive 
          ? 'bg-emerald-500/20 text-emerald-500'
          : isNegative
            ? 'bg-rose-500/20 text-rose-500'
            : 'bg-muted text-muted-foreground'
      }`}>
        {isPositive ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : isNegative ? (
          <XCircle className="h-4 w-4" />
        ) : (
          <AlertCircle className="h-4 w-4" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{outcome.action_type}</p>
        <p className="text-xs text-muted-foreground">
          Quality: {(outcome.outcome_quality * 100).toFixed(0)}%
        </p>
      </div>
      <span className="text-xs text-muted-foreground">
        {new Date(outcome.created_at).toLocaleDateString()}
      </span>
    </div>
  );
}

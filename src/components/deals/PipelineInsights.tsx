import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, TrendingUp, Lightbulb, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Insight {
  type: 'alert' | 'opportunity' | 'recommendation' | 'benchmark';
  title: string;
  description: string;
  icon: any;
  priority: 'high' | 'medium' | 'low';
}

export function PipelineInsights() {
  const { data: insights, isLoading } = useQuery({
    queryKey: ['pipeline-insights'],
    queryFn: async () => {
      const insights: Insight[] = [];

      // Get stale deals (no activity > 14 days)
      const { data: staleDeals } = await supabase
        .from('jobs')
        .select('id, title, last_activity_date')
        .eq('status', 'open')
        .eq('is_lost', false)
        .lt('last_activity_date', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString());

      if (staleDeals && staleDeals.length > 0) {
        insights.push({
          type: 'alert',
          title: `${staleDeals.length} deals need attention`,
          description: `These deals haven't had activity in over 14 days. Consider reaching out to keep momentum.`,
          icon: AlertTriangle,
          priority: 'high',
        });
      }

      // Get deals at risk (health score < 50)
      const { data: atRiskDeals } = await supabase
        .from('jobs')
        .select('id, title, deal_health_score')
        .eq('status', 'open')
        .eq('is_lost', false)
        .lt('deal_health_score', 50);

      if (atRiskDeals && atRiskDeals.length > 0) {
        insights.push({
          type: 'alert',
          title: `${atRiskDeals.length} deals at risk`,
          description: `Health scores below 50 indicate these deals need immediate action to prevent loss.`,
          icon: AlertTriangle,
          priority: 'high',
        });
      }

      // Calculate win rate
      const { data: closedDeals } = await supabase
        .from('jobs')
        .select('id, is_lost')
        .in('deal_stage', ['Closed Won', 'Closed Lost']);

      if (closedDeals && closedDeals.length > 0) {
        const wonDeals = closedDeals.filter(d => !d.is_lost).length;
        const winRate = (wonDeals / closedDeals.length) * 100;
        
        insights.push({
          type: 'benchmark',
          title: `Current win rate: ${winRate.toFixed(1)}%`,
          description: winRate < 40 
            ? 'Below target. Review qualification criteria and proposal strategy.'
            : 'On track. Continue current strategies.',
          icon: Target,
          priority: winRate < 40 ? 'high' : 'low',
        });
      }

      // Find opportunities (deals in negotiation with high health)
      const { data: hotDeals } = await supabase
        .from('jobs')
        .select('id, title, deal_health_score')
        .eq('deal_stage', 'Negotiation')
        .gte('deal_health_score', 75);

      if (hotDeals && hotDeals.length > 0) {
        insights.push({
          type: 'opportunity',
          title: `${hotDeals.length} deals ready to close`,
          description: 'High health scores in negotiation stage indicate strong likelihood of closing soon.',
          icon: TrendingUp,
          priority: 'medium',
        });
      }

      // Analyze lost deals
      const { data: lostReasons } = await (supabase as any)
        .from('deal_loss_reasons')
        .select('reason_category')
        .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

      if (lostReasons && lostReasons.length > 0) {
        const reasonCounts = lostReasons.reduce((acc: any, r: any) => {
          acc[r.reason_category] = (acc[r.reason_category] || 0) + 1;
          return acc;
        }, {});

        const topReason = Object.entries(reasonCounts)
          .sort(([, a]: any, [, b]: any) => b - a)[0];

        if (topReason) {
          insights.push({
            type: 'recommendation',
            title: `Top loss reason: ${topReason[0].replace(/_/g, ' ')}`,
            description: `${topReason[1]} deals lost for this reason in last 90 days. Consider addressing this pattern.`,
            icon: Lightbulb,
            priority: 'medium',
          });
        }
      }

      return insights.sort((a, b) => {
        const priority = { high: 0, medium: 1, low: 2 };
        return priority[a.priority] - priority[b.priority];
      });
    },
  });

  if (isLoading) {
    return (
      <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
        <h3 className="text-lg font-semibold mb-4 text-foreground">Pipeline Insights</h3>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  const getVariant = (type: string) => {
    if (type === 'alert') return 'destructive';
    return 'default';
  };

  return (
    <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
      <h3 className="text-lg font-semibold mb-4 text-foreground">Pipeline Insights</h3>
      
      {insights && insights.length > 0 ? (
        <div className="space-y-3">
          {insights.map((insight, index) => {
            const Icon = insight.icon;
            return (
              <Alert key={index} variant={getVariant(insight.type)} className="border-border/50">
                <Icon className="h-4 w-4" />
                <AlertTitle className="text-sm font-semibold">
                  {insight.title}
                </AlertTitle>
                <AlertDescription className="text-xs">
                  {insight.description}
                </AlertDescription>
              </Alert>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No insights available yet.</p>
      )}
    </Card>
  );
}

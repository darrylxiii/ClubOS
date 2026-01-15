import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  AlertTriangle,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UnifiedKPI, DomainHealth } from '@/hooks/useUnifiedKPIs';
import { useKPIInsights } from '@/hooks/useKPIInsights';

interface AIExecutiveSummaryProps {
  allKPIs: UnifiedKPI[];
  domainHealth: Record<string, DomainHealth>;
  overallHealth: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function AIExecutiveSummary({
  allKPIs,
  domainHealth,
  overallHealth,
  onRefresh,
  isRefreshing,
}: AIExecutiveSummaryProps) {
  // Safe domainHealth with fallback
  const safeDomainHealth = domainHealth || {};
  const safeAllKPIs = Array.isArray(allKPIs) ? allKPIs : [];
  
  // Fetch Real AI Insights
  const { data: aiInsights, isLoading: isAiLoading, refetch: refreshAi } = useKPIInsights(safeAllKPIs, Object.values(safeDomainHealth));

  const insights = useMemo(() => {
    // Fallback to rules-based if AI is loading or failed/null, 
    // OR if we want to mix both (e.g. use AI for text, rules for counts)

    // Use safe arrays for calculations
    const criticalKPIs = safeAllKPIs.filter(k => k?.status === 'critical');
    const warningKPIs = safeAllKPIs.filter(k => k?.status === 'warning');
    const improvingKPIs = safeAllKPIs.filter(k =>
      (k?.trendDirection === 'up' && !k?.lowerIsBetter) ||
      (k?.trendDirection === 'down' && k?.lowerIsBetter)
    );
    const decliningKPIs = safeAllKPIs.filter(k =>
      (k?.trendDirection === 'down' && !k?.lowerIsBetter) ||
      (k?.trendDirection === 'up' && k?.lowerIsBetter)
    );

    // Use AI summary if available, otherwise fallback
    const summaryText = aiInsights?.summary || "Analyzing KPI data...";

    return {
      summary: summaryText,
      criticalKPIs,
      warningKPIs,
      improvingKPIs,
      decliningKPIs,
      // Pass through recommendations if present
      aiRecommendations: aiInsights?.recommendations
    };
  }, [safeAllKPIs, safeDomainHealth, aiInsights]);


  // Generate recommendations (Mix of AI and Rules)
  const recommendations = useMemo(() => {
    if (aiInsights?.recommendations) {
      return aiInsights.recommendations;
    }

    // Fallback rules...
    const recs: { text: string; priority: 'high' | 'medium' | 'low'; action?: string }[] = [];
    insights.criticalKPIs.slice(0, 2).forEach(kpi => {
      recs.push({
        text: `Address ${kpi.displayName} immediately - currently at ${kpi.value.toFixed(1)}`,
        priority: 'high',
        action: `Fix ${kpi.category}`,
      });
    });
    return recs.slice(0, 4);
  }, [insights, aiInsights]);

  return (
    <Card className="bg-gradient-to-br from-primary/5 via-primary/0 to-transparent border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">AI Executive Summary</CardTitle>
              <p className="text-xs text-muted-foreground">
                Powered by QUIN Intelligence
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4 mr-1", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Text */}
        <div className="p-4 bg-muted/30 rounded-lg">
          <p className="text-sm leading-relaxed">
            {insights.summary.split('**').map((part, i) =>
              i % 2 === 1 ? <strong key={i}>{part}</strong> : part
            )}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center p-2 bg-rose-500/10 rounded-lg">
            <div className="text-lg font-bold text-rose-600">{insights.criticalKPIs.length}</div>
            <div className="text-[10px] text-muted-foreground">Critical</div>
          </div>
          <div className="text-center p-2 bg-amber-500/10 rounded-lg">
            <div className="text-lg font-bold text-amber-600">{insights.warningKPIs.length}</div>
            <div className="text-[10px] text-muted-foreground">Warning</div>
          </div>
          <div className="text-center p-2 bg-emerald-500/10 rounded-lg">
            <div className="text-lg font-bold text-emerald-600">{insights.improvingKPIs.length}</div>
            <div className="text-[10px] text-muted-foreground">Improving</div>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <div className="text-lg font-bold text-muted-foreground">{insights.decliningKPIs.length}</div>
            <div className="text-[10px] text-muted-foreground">Declining</div>
          </div>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              Recommended Actions
            </h4>
            <div className="space-y-1.5">
              {recommendations.map((rec, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg text-sm",
                    rec.priority === 'high' && "bg-rose-500/5 border border-rose-500/20",
                    rec.priority === 'medium' && "bg-amber-500/5 border border-amber-500/20",
                    rec.priority === 'low' && "bg-muted/30 border border-border/50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] px-1.5",
                        rec.priority === 'high' && "bg-rose-500/10 text-rose-600 border-rose-500/20",
                        rec.priority === 'medium' && "bg-amber-500/10 text-amber-600 border-amber-500/20",
                        rec.priority === 'low' && "bg-muted text-muted-foreground"
                      )}
                    >
                      {rec.priority}
                    </Badge>
                    <span className="text-xs">{rec.text}</span>
                  </div>
                  {rec.action && (
                    <Button variant="ghost" size="sm" className="h-6 text-xs">
                      {rec.action}
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

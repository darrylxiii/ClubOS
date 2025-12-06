import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UnifiedKPI, DomainHealth } from '@/hooks/useUnifiedKPIs';

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
  // Generate AI-like insights based on KPI data
  const insights = useMemo(() => {
    const criticalKPIs = allKPIs.filter(k => k.status === 'critical');
    const warningKPIs = allKPIs.filter(k => k.status === 'warning');
    const improvingKPIs = allKPIs.filter(k => 
      k.trendDirection === 'up' && !k.lowerIsBetter ||
      k.trendDirection === 'down' && k.lowerIsBetter
    );
    const decliningKPIs = allKPIs.filter(k =>
      k.trendDirection === 'down' && !k.lowerIsBetter ||
      k.trendDirection === 'up' && k.lowerIsBetter
    );

    // Find worst performing domain
    const worstDomain = Object.entries(domainHealth)
      .sort((a, b) => a[1].healthScore - b[1].healthScore)[0];
    
    // Find best performing domain
    const bestDomain = Object.entries(domainHealth)
      .sort((a, b) => b[1].healthScore - a[1].healthScore)[0];

    const summaryParts: string[] = [];
    
    // Overall health assessment
    if (overallHealth >= 80) {
      summaryParts.push(`Platform health is **excellent** at ${overallHealth}%.`);
    } else if (overallHealth >= 60) {
      summaryParts.push(`Platform health is **good** at ${overallHealth}%, with room for improvement.`);
    } else if (overallHealth >= 40) {
      summaryParts.push(`Platform health needs **attention** at ${overallHealth}%.`);
    } else {
      summaryParts.push(`Platform health is **critical** at ${overallHealth}% and requires immediate action.`);
    }

    // Critical issues
    if (criticalKPIs.length > 0) {
      const topCritical = criticalKPIs.slice(0, 2).map(k => k.displayName).join(' and ');
      summaryParts.push(`${criticalKPIs.length} critical issue${criticalKPIs.length > 1 ? 's' : ''} detected: ${topCritical}.`);
    }

    // Domain insights
    if (worstDomain && worstDomain[1].healthScore < 60) {
      summaryParts.push(`**${worstDomain[0]}** domain needs focus with ${worstDomain[1].critical} critical alerts.`);
    }

    if (bestDomain && bestDomain[1].healthScore >= 80) {
      summaryParts.push(`**${bestDomain[0]}** is performing well at ${bestDomain[1].healthScore}% health.`);
    }

    // Trends
    if (improvingKPIs.length > decliningKPIs.length) {
      summaryParts.push(`Overall trend is positive with ${improvingKPIs.length} improving metrics.`);
    } else if (decliningKPIs.length > improvingKPIs.length) {
      summaryParts.push(`Monitor declining trends in ${decliningKPIs.length} metrics.`);
    }

    return {
      summary: summaryParts.join(' '),
      criticalKPIs,
      warningKPIs,
      improvingKPIs,
      decliningKPIs,
      worstDomain,
      bestDomain,
    };
  }, [allKPIs, domainHealth, overallHealth]);

  // Generate recommendations
  const recommendations = useMemo(() => {
    const recs: { text: string; priority: 'high' | 'medium' | 'low'; action?: string }[] = [];

    insights.criticalKPIs.slice(0, 2).forEach(kpi => {
      recs.push({
        text: `Address ${kpi.displayName} immediately - currently at ${kpi.value.toFixed(1)}`,
        priority: 'high',
        action: `Fix ${kpi.category}`,
      });
    });

    if (insights.worstDomain && insights.worstDomain[1].healthScore < 60) {
      recs.push({
        text: `Review ${insights.worstDomain[0]} domain strategy`,
        priority: 'medium',
        action: `View ${insights.worstDomain[0]}`,
      });
    }

    insights.decliningKPIs.slice(0, 2).forEach(kpi => {
      recs.push({
        text: `Monitor ${kpi.displayName} trend (${kpi.trendDirection} ${kpi.trendPercentage?.toFixed(1)}%)`,
        priority: 'low',
      });
    });

    return recs.slice(0, 4);
  }, [insights]);

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

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Building2, 
  Globe, 
  DollarSign, 
  AlertTriangle, 
  AlertCircle,
  TrendingUp,
  Lightbulb,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DomainHealth, CriticalAlert, UnifiedKPI, KPIDomain } from '@/hooks/useUnifiedKPIs';
import { useCrossDomainInsights } from '@/hooks/useUnifiedKPIs';

interface KPIOverviewProps {
  domainHealth: DomainHealth[];
  criticalAlerts: CriticalAlert[];
  allKPIs: UnifiedKPI[];
  onSelectCategory: (domain: KPIDomain, category: string) => void;
}

const domainIcons: Record<KPIDomain, React.ElementType> = {
  operations: Building2,
  website: Globe,
  sales: DollarSign,
};

const domainColors: Record<KPIDomain, { bg: string; text: string; border: string }> = {
  operations: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20' },
  website: { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/20' },
  sales: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20' },
};

function DomainHealthCard({ 
  domain, 
  onSelectCategory 
}: { 
  domain: DomainHealth; 
  onSelectCategory: (domain: KPIDomain, category: string) => void;
}) {
  const Icon = domainIcons[domain.domain];
  const colors = domainColors[domain.domain];

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500';
    if (score >= 60) return 'text-amber-500';
    return 'text-rose-500';
  };

  return (
    <Card className={cn("border", colors.border)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("p-2 rounded-lg", colors.bg)}>
              <Icon className={cn("h-5 w-5", colors.text)} />
            </div>
            <CardTitle className="text-lg">{domain.label}</CardTitle>
          </div>
          <div className={cn("text-3xl font-bold", getHealthColor(domain.healthScore))}>
            {domain.healthScore}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <p className="text-lg font-bold text-emerald-500">{domain.onTarget}</p>
            <p className="text-[10px] text-muted-foreground">On Target</p>
          </div>
          <div className="p-2 rounded-lg bg-amber-500/10">
            <p className="text-lg font-bold text-amber-500">{domain.warnings}</p>
            <p className="text-[10px] text-muted-foreground">Warning</p>
          </div>
          <div className="p-2 rounded-lg bg-rose-500/10">
            <p className="text-lg font-bold text-rose-500">{domain.critical}</p>
            <p className="text-[10px] text-muted-foreground">Critical</p>
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-2">
          {domain.categories.slice(0, 4).map(cat => (
            <button
              key={cat.name}
              onClick={() => onSelectCategory(domain.domain, cat.name)}
              className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  cat.healthScore >= 80 ? 'bg-emerald-500' :
                  cat.healthScore >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                )} />
                <span className="text-sm">{cat.displayName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{cat.kpiCount} KPIs</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AlertsCard({ alerts }: { alerts: CriticalAlert[] }) {
  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  const warningAlerts = alerts.filter(a => a.severity === 'warning');

  return (
    <Card className="border-rose-500/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertCircle className="h-5 w-5 text-rose-500" />
          Alerts ({alerts.length})
        </CardTitle>
        <CardDescription>KPIs requiring immediate attention</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 max-h-[300px] overflow-auto">
        {criticalAlerts.slice(0, 5).map((alert, i) => (
          <div 
            key={i}
            className="flex items-start gap-3 p-3 rounded-lg bg-rose-500/5 border border-rose-500/20"
          >
            <AlertCircle className="h-4 w-4 text-rose-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{alert.kpi.displayName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
              <Badge variant="outline" className="mt-1.5 text-[10px]">
                {alert.kpi.domain} / {alert.kpi.category}
              </Badge>
            </div>
          </div>
        ))}
        {warningAlerts.slice(0, 3).map((alert, i) => (
          <div 
            key={`w-${i}`}
            className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20"
          >
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{alert.kpi.displayName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
            </div>
          </div>
        ))}
        {alerts.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            All KPIs are within acceptable ranges
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function InsightsCard({ allKPIs }: { allKPIs: UnifiedKPI[] }) {
  const insights = useCrossDomainInsights(allKPIs);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          Cross-Domain Insights
        </CardTitle>
        <CardDescription>AI-detected correlations and recommendations</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight, i) => (
          <div 
            key={i}
            className={cn(
              "p-3 rounded-lg border",
              insight.type === 'warning' ? 'bg-amber-500/5 border-amber-500/20' :
              insight.type === 'success' ? 'bg-emerald-500/5 border-emerald-500/20' :
              'bg-blue-500/5 border-blue-500/20'
            )}
          >
            <p className="text-sm">{insight.message}</p>
            {insight.action && (
              <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                <ArrowRight className="h-3 w-3" />
                {insight.action}
              </p>
            )}
          </div>
        ))}
        {insights.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No significant correlations detected
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function KPIOverview({
  domainHealth,
  criticalAlerts,
  allKPIs,
  onSelectCategory,
}: KPIOverviewProps) {
  return (
    <div className="space-y-6">
      {/* Domain Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {domainHealth.map(domain => (
          <DomainHealthCard 
            key={domain.domain} 
            domain={domain} 
            onSelectCategory={onSelectCategory}
          />
        ))}
      </div>

      {/* Alerts and Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AlertsCard alerts={criticalAlerts} />
        <InsightsCard allKPIs={allKPIs} />
      </div>
    </div>
  );
}

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  Users,
  Briefcase,
  Activity,
  FileText,
  ArrowRight,
  Crown
} from 'lucide-react';
import type { UnifiedKPI, DomainHealth } from '@/hooks/useUnifiedKPIs';

interface ExecutiveKPIDashboardProps {
  allKPIs: UnifiedKPI[];
  domainHealth: DomainHealth[];
  overallHealth: number;
  onViewDetails?: (kpi: UnifiedKPI) => void;
  onGenerateReport?: () => void;
}

interface VitalMetric {
  id: string;
  label: string;
  value: string;
  trend: 'up' | 'down' | 'stable';
  trendValue: string;
  status: 'success' | 'warning' | 'critical';
  icon: typeof TrendingUp;
}

// Strategic KPIs that executives care about
const EXECUTIVE_KPI_IDS = [
  'total_revenue',
  'win_rate', 
  'pipeline_coverage_ratio',
  'nps_candidate',
  'platform_health_score'
];

export function ExecutiveKPIDashboard({
  allKPIs,
  domainHealth,
  overallHealth,
  onViewDetails,
  onGenerateReport
}: ExecutiveKPIDashboardProps) {
  // Extract the 5 key vitals for executives
  const companyVitals = useMemo((): VitalMetric[] => {
    const vitals: VitalMetric[] = [];
    
    // Revenue
    const revenue = allKPIs.find(k => k.id === 'total_revenue');
    if (revenue) {
      vitals.push({
        id: 'revenue',
        label: 'Total Revenue',
        value: `€${((revenue.value || 0) / 1000).toFixed(0)}K`,
        trend: revenue.trendDirection || 'stable',
        trendValue: `${revenue.trendPercentage?.toFixed(1) || 0}%`,
        status: revenue.status === 'success' ? 'success' : revenue.status === 'warning' ? 'warning' : 'critical',
        icon: DollarSign
      });
    }
    
    // Pipeline Coverage
    const pipeline = allKPIs.find(k => k.id === 'pipeline_coverage_ratio' || k.id === 'total_pipeline_value');
    if (pipeline) {
      vitals.push({
        id: 'pipeline',
        label: 'Pipeline Coverage',
        value: pipeline.format === 'currency' ? `€${((pipeline.value || 0) / 1000).toFixed(0)}K` : `${(pipeline.value || 0).toFixed(1)}x`,
        trend: pipeline.trendDirection || 'stable',
        trendValue: `${pipeline.trendPercentage?.toFixed(1) || 0}%`,
        status: pipeline.status === 'success' ? 'success' : pipeline.status === 'warning' ? 'warning' : 'critical',
        icon: Briefcase
      });
    }
    
    // Win Rate
    const winRate = allKPIs.find(k => k.id === 'win_rate');
    if (winRate) {
      vitals.push({
        id: 'winRate',
        label: 'Win Rate',
        value: `${(winRate.value || 0).toFixed(1)}%`,
        trend: winRate.trendDirection || 'stable',
        trendValue: `${winRate.trendPercentage?.toFixed(1) || 0}%`,
        status: winRate.status === 'success' ? 'success' : winRate.status === 'warning' ? 'warning' : 'critical',
        icon: Target
      });
    }
    
    // NPS
    const nps = allKPIs.find(k => k.id === 'nps_candidate' || k.id === 'nps_client');
    if (nps) {
      vitals.push({
        id: 'nps',
        label: 'Candidate NPS',
        value: `${(nps.value || 0).toFixed(0)}`,
        trend: nps.trendDirection || 'stable',
        trendValue: `${nps.trendPercentage?.toFixed(1) || 0}%`,
        status: nps.status === 'success' ? 'success' : nps.status === 'warning' ? 'warning' : 'critical',
        icon: Users
      });
    }
    
    // Platform Health
    const platformHealth = allKPIs.find(k => k.id === 'platform_health_score');
    if (platformHealth) {
      vitals.push({
        id: 'platform',
        label: 'Platform Health',
        value: `${(platformHealth.value || 0).toFixed(0)}%`,
        trend: platformHealth.trendDirection || 'stable',
        trendValue: `${platformHealth.trendPercentage?.toFixed(1) || 0}%`,
        status: platformHealth.status === 'success' ? 'success' : platformHealth.status === 'warning' ? 'warning' : 'critical',
        icon: Activity
      });
    }
    
    return vitals;
  }, [allKPIs]);

  // Strategic Initiatives (derived from domain health)
  const strategicInitiatives = useMemo(() => {
    return domainHealth.map(domain => ({
      name: domain.label,
      progress: domain.healthScore,
      status: domain.critical > 0 ? 'critical' : domain.warnings > 0 ? 'warning' : 'success',
      kpis: domain.totalKPIs,
      onTarget: domain.onTarget
    }));
  }, [domainHealth]);

  // Critical items requiring attention
  const criticalItems = useMemo(() => {
    return allKPIs
      .filter(k => k.status === 'critical')
      .slice(0, 5)
      .map(k => ({
        id: k.id,
        name: k.displayName,
        domain: k.domain,
        value: k.format === 'percent' ? `${k.value?.toFixed(1)}%` : 
               k.format === 'currency' ? `€${k.value?.toFixed(0)}` : 
               k.value?.toFixed(1) || '0',
        target: k.targetValue ? (k.format === 'percent' ? `${k.targetValue}%` : k.targetValue.toString()) : 'N/A'
      }));
  }, [allKPIs]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-emerald-500';
      case 'warning': return 'text-amber-500';
      case 'critical': return 'text-rose-500';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'success': return 'bg-emerald-500/10';
      case 'warning': return 'bg-amber-500/10';
      case 'critical': return 'bg-rose-500/10';
      default: return 'bg-muted/10';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Crown className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Executive Dashboard</h2>
            <p className="text-sm text-muted-foreground">Strategic overview for leadership</p>
          </div>
        </div>
        {onGenerateReport && (
          <Button onClick={onGenerateReport} variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Generate Board Report
          </Button>
        )}
      </div>

      {/* Overall Health Score */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Overall Platform Health</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">{overallHealth.toFixed(0)}%</span>
                <Badge variant="outline" className={cn(
                  overallHealth >= 80 ? 'border-emerald-500 text-emerald-500' :
                  overallHealth >= 60 ? 'border-amber-500 text-amber-500' :
                  'border-rose-500 text-rose-500'
                )}>
                  {overallHealth >= 80 ? 'Healthy' : overallHealth >= 60 ? 'Attention Needed' : 'Critical'}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">
                {allKPIs.filter(k => k.status === 'success').length} of {allKPIs.length} KPIs on target
              </p>
              <Progress 
                value={overallHealth} 
                className="w-48 mt-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Vitals - 5 Key Metrics */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Company Vitals</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {companyVitals.map(vital => {
            const Icon = vital.icon;
            return (
              <Card key={vital.id} className={cn("border-border/50", getStatusBg(vital.status))}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={cn("h-4 w-4", getStatusColor(vital.status))} />
                    <span className="text-xs text-muted-foreground">{vital.label}</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold">{vital.value}</span>
                    <div className={cn(
                      "flex items-center text-xs",
                      vital.trend === 'up' ? 'text-emerald-500' : 
                      vital.trend === 'down' ? 'text-rose-500' : 
                      'text-muted-foreground'
                    )}>
                      {vital.trend === 'up' ? <TrendingUp className="h-3 w-3 mr-1" /> :
                       vital.trend === 'down' ? <TrendingDown className="h-3 w-3 mr-1" /> : null}
                      {vital.trendValue}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Strategic Initiatives Progress */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Domain Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {strategicInitiatives.map(initiative => (
            <Card key={initiative.name} className="border-border/50">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{initiative.name}</span>
                  <Badge variant="outline" className={cn(
                    "text-xs",
                    initiative.status === 'success' ? 'border-emerald-500/50 text-emerald-500' :
                    initiative.status === 'warning' ? 'border-amber-500/50 text-amber-500' :
                    'border-rose-500/50 text-rose-500'
                  )}>
                    {initiative.onTarget}/{initiative.kpis} on target
                  </Badge>
                </div>
                <Progress 
                  value={initiative.progress} 
                  className={cn(
                    "h-2",
                    initiative.status === 'critical' && "[&>div]:bg-rose-500",
                    initiative.status === 'warning' && "[&>div]:bg-amber-500"
                  )}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Health Score: {initiative.progress.toFixed(0)}%
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Critical Items Requiring Attention */}
      {criticalItems.length > 0 && (
        <Card className="border-rose-500/20 bg-rose-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-rose-500">
              <AlertTriangle className="h-4 w-4" />
              Critical Items Requiring Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {criticalItems.map(item => (
                <div 
                  key={item.id}
                  className="flex items-center justify-between p-2 rounded-md bg-background/50 hover:bg-background/80 cursor-pointer transition-colors"
                  onClick={() => {
                    const kpi = allKPIs.find(k => k.id === item.id);
                    if (kpi && onViewDetails) onViewDetails(kpi);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 text-rose-500" />
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{item.domain}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-rose-500">{item.value}</p>
                      <p className="text-xs text-muted-foreground">Target: {item.target}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats Footer */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          <div>
            <p className="text-lg font-semibold">{allKPIs.filter(k => k.status === 'success').length}</p>
            <p className="text-xs text-muted-foreground">On Target</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10">
          <Clock className="h-5 w-5 text-amber-500" />
          <div>
            <p className="text-lg font-semibold">{allKPIs.filter(k => k.status === 'warning').length}</p>
            <p className="text-xs text-muted-foreground">Warnings</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-rose-500/10">
          <AlertTriangle className="h-5 w-5 text-rose-500" />
          <div>
            <p className="text-lg font-semibold">{allKPIs.filter(k => k.status === 'critical').length}</p>
            <p className="text-xs text-muted-foreground">Critical</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10">
          <Activity className="h-5 w-5 text-primary" />
          <div>
            <p className="text-lg font-semibold">{allKPIs.length}</p>
            <p className="text-xs text-muted-foreground">Total KPIs</p>
          </div>
        </div>
      </div>
    </div>
  );
}

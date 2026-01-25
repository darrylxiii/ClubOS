import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  AlertTriangle, 
  TrendingDown, 
  TrendingUp, 
  RefreshCw,
  CheckCircle,
  XCircle,
  BarChart3,
  Users,
  Mail,
  Phone
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDomainBehaviorPatterns, type NoShowPrediction } from '@/hooks/useNoShowPrediction';
import { NoShowRiskBadge } from './NoShowRiskBadge';

interface NoShowPredictionPanelProps {
  predictions: Record<string, NoShowPrediction>;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  className?: string;
}

export function NoShowPredictionPanel({
  predictions,
  onRefresh,
  isRefreshing,
  className,
}: NoShowPredictionPanelProps) {
  const { data: domainPatterns, isLoading: loadingPatterns } = useDomainBehaviorPatterns();

  const predictionList = Object.values(predictions);
  
  // Calculate summary stats
  const totalPredictions = predictionList.length;
  const highRiskCount = predictionList.filter(p => p.risk_level === 'high' || p.risk_level === 'critical').length;
  const averageScore = totalPredictions > 0
    ? Math.round(predictionList.reduce((sum, p) => sum + p.risk_score, 0) / totalPredictions)
    : 0;
  const interventionsTriggered = predictionList.filter(p => p.intervention_triggered).length;

  // Group by risk level
  const riskGroups = {
    critical: predictionList.filter(p => p.risk_level === 'critical'),
    high: predictionList.filter(p => p.risk_level === 'high'),
    medium: predictionList.filter(p => p.risk_level === 'medium'),
    low: predictionList.filter(p => p.risk_level === 'low'),
  };

  // Top risky domains
  const riskyDomains = domainPatterns
    ?.filter(d => d.total_bookings >= 3 && d.no_show_count > 0)
    .map(d => ({
      domain: d.guest_email_domain,
      noShowRate: d.no_show_count / d.total_bookings,
      totalBookings: d.total_bookings,
    }))
    .sort((a, b) => b.noShowRate - a.noShowRate)
    .slice(0, 5);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Bookings</p>
                <p className="text-2xl font-bold">{totalPredictions}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">High Risk</p>
                <p className="text-2xl font-bold text-destructive">{highRiskCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive/50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Risk Score</p>
                <p className="text-2xl font-bold">{averageScore}%</p>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <Progress value={averageScore} className="mt-2 h-1" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Interventions</p>
                <p className="text-2xl font-bold text-amber-600">{interventionsTriggered}</p>
              </div>
              <Mail className="h-8 w-8 text-amber-600/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Distribution */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Risk Distribution</CardTitle>
              <CardDescription>Breakdown of upcoming bookings by risk level</CardDescription>
            </div>
            {onRefresh && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={cn('h-4 w-4 mr-2', isRefreshing && 'animate-spin')} />
                Refresh
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { level: 'critical', label: 'Critical', count: riskGroups.critical.length, color: 'bg-destructive' },
              { level: 'high', label: 'High', count: riskGroups.high.length, color: 'bg-orange-500' },
              { level: 'medium', label: 'Medium', count: riskGroups.medium.length, color: 'bg-amber-500' },
              { level: 'low', label: 'Low', count: riskGroups.low.length, color: 'bg-emerald-500' },
            ].map(({ level, label, count, color }) => (
              <div key={level} className="flex items-center gap-3">
                <div className={cn('w-3 h-3 rounded-full', color)} />
                <span className="flex-1 text-sm">{label}</span>
                <span className="font-medium">{count}</span>
                <div className="w-24">
                  <Progress 
                    value={totalPredictions > 0 ? (count / totalPredictions) * 100 : 0} 
                    className={cn('h-2', color.replace('bg-', '[&>div]:bg-'))}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* High Risk Domains */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">High Risk Domains</CardTitle>
          <CardDescription>Email domains with highest historical no-show rates</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingPatterns ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : riskyDomains && riskyDomains.length > 0 ? (
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {riskyDomains.map(({ domain, noShowRate, totalBookings }) => (
                  <div 
                    key={domain}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      {noShowRate >= 0.5 ? (
                        <XCircle className="h-4 w-4 text-destructive" />
                      ) : noShowRate >= 0.25 ? (
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                      )}
                      <span className="font-medium text-sm">@{domain}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {totalBookings} bookings
                      </span>
                      <Badge 
                        variant="outline"
                        className={cn(
                          noShowRate >= 0.5 
                            ? 'text-destructive border-destructive/30' 
                            : noShowRate >= 0.25 
                              ? 'text-amber-600 border-amber-500/30'
                              : 'text-emerald-600 border-emerald-500/30'
                        )}
                      >
                        {(noShowRate * 100).toFixed(0)}% no-show
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingDown className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Not enough data yet</p>
              <p className="text-xs">Domain patterns will appear after more bookings</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

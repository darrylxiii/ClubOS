import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { useKPIOwnership, useKPIActions } from '@/hooks/useKPIOwnership';
import { useUnifiedKPIs, UnifiedKPI } from '@/hooks/useUnifiedKPIs';
import { KPIActionPlanCard } from '../actions/KPIActionPlanCard';
import { motion } from 'framer-motion';

export function MyKPIsDashboard() {
  const { myOwnerships, loadingOwnerships } = useKPIOwnership();
  const { myActions } = useKPIActions();
  const { allKPIs: kpis, isLoading: loadingKPIs } = useUnifiedKPIs();

  // Get KPIs that I own
  const myKPIs = React.useMemo(() => {
    if (!myOwnerships || !kpis) return [];
    const myKPINames = new Set(myOwnerships.map(o => o.kpi_name));
    return kpis.filter(kpi => myKPINames.has(kpi.name));
  }, [myOwnerships, kpis]);

  // Stats
  const stats = React.useMemo(() => {
    const total = myKPIs.length;
    const critical = myKPIs.filter(k => k.status === 'critical').length;
    const warning = myKPIs.filter(k => k.status === 'warning').length;
    const success = myKPIs.filter(k => k.status === 'success').length;
    const pendingActions = myActions?.filter(a => a.status !== 'completed').length || 0;
    return { total, critical, warning, success, pendingActions };
  }, [myKPIs, myActions]);

  const getStatusBadge = (kpi: UnifiedKPI) => {
    const config = {
      critical: { icon: AlertTriangle, class: 'text-rose-600 bg-rose-500/10 border-rose-600/30' },
      warning: { icon: AlertTriangle, class: 'text-amber-600 bg-amber-500/10 border-amber-600/30' },
      success: { icon: CheckCircle2, class: 'text-emerald-600 bg-emerald-500/10 border-emerald-600/30' },
      neutral: { icon: Target, class: 'text-muted-foreground' },
    };
    const { icon: Icon, class: className } = config[kpi.status] || config.neutral;
    return (
      <Badge variant="outline" className={`gap-1 ${className}`}>
        <Icon className="h-3 w-3" />
        {kpi.status}
      </Badge>
    );
  };

  const loading = loadingOwnerships || loadingKPIs;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-24 bg-muted/30 rounded-lg animate-pulse" />
        <div className="h-64 bg-muted/30 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (myKPIs.length === 0) {
    return (
      <Card className="bg-card/50">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">No KPIs Assigned</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              You don't have any KPIs assigned to you yet. Contact an admin to get KPIs assigned to your role.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="bg-card/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">My KPIs</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Target className="h-6 w-6 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">On Target</p>
                <p className="text-2xl font-bold text-emerald-600">{stats.success}</p>
              </div>
              <CheckCircle2 className="h-6 w-6 text-emerald-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Warning</p>
                <p className="text-2xl font-bold text-amber-600">{stats.warning}</p>
              </div>
              <AlertTriangle className="h-6 w-6 text-amber-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Critical</p>
                <p className="text-2xl font-bold text-rose-600">{stats.critical}</p>
              </div>
              <AlertTriangle className="h-6 w-6 text-rose-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Actions</p>
                <p className="text-2xl font-bold text-blue-600">{stats.pendingActions}</p>
              </div>
              <Clock className="h-6 w-6 text-blue-500/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* My KPIs List */}
        <div className="col-span-2">
          <Card className="bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg">My KPIs</CardTitle>
              <CardDescription>KPIs you're responsible for</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {myKPIs.map((kpi, index) => {
                    const progress = kpi.targetValue 
                      ? Math.min(100, (kpi.value / kpi.targetValue) * 100)
                      : 50;
                    
                    return (
                      <motion.div
                        key={kpi.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-4 rounded-lg border bg-background/50 space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{kpi.displayName}</span>
                              {getStatusBadge(kpi)}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {kpi.domain} • {kpi.category}
                            </p>
                          </div>
                          <div className="text-right">
                          <p className="text-lg font-bold">
                              {typeof kpi.value === 'number' ? kpi.value.toFixed(1) : kpi.value}
                              {kpi.format === 'percent' && '%'}
                            </p>
                            {kpi.targetValue && (
                              <p className="text-xs text-muted-foreground">
                                Target: {kpi.targetValue}{kpi.format === 'percent' && '%'}
                              </p>
                            )}
                          </div>
                        </div>

                        {kpi.targetValue && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Progress</span>
                              <span>{progress.toFixed(0)}%</span>
                            </div>
                            <Progress 
                              value={progress} 
                              className="h-2"
                            />
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs">
                            {kpi.trendPercentage !== undefined && (
                              <span className={`flex items-center gap-1 ${
                                kpi.trendPercentage >= 0 ? 'text-emerald-600' : 'text-rose-600'
                              }`}>
                                {kpi.trendPercentage >= 0 ? (
                                  <TrendingUp className="h-3 w-3" />
                                ) : (
                                  <TrendingDown className="h-3 w-3" />
                                )}
                                {Math.abs(kpi.trendPercentage).toFixed(1)}%
                              </span>
                            )}
                          </div>
                          <Button variant="ghost" size="sm" className="gap-1 text-xs">
                            View Details
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* My Actions */}
        <div>
          <KPIActionPlanCard showOnlyMine maxItems={6} />
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Gauge, 
  Shield,
  Zap,
  XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DomainSLA {
  domain: string;
  max_stale_minutes: number;
  target_calculation_time_ms: number;
  min_success_rate: number;
  last_calculation: string | null;
  is_stale: boolean;
  recent_success_rate: number | null;
  avg_calculation_time_ms: number | null;
  sla_status: 'healthy' | 'warning' | 'breach';
}

interface CircuitBreaker {
  function_name: string;
  state: 'closed' | 'open' | 'half_open';
  failure_count: number;
  last_failure_at: string | null;
  next_retry_at: string | null;
}

interface SLADashboardData {
  domains: DomainSLA[] | null;
  circuit_breakers: CircuitBreaker[] | null;
  overall_health: 'healthy' | 'degraded' | 'critical';
  last_updated: string;
}

function useSLADashboard() {
  return useQuery({
    queryKey: ['kpi-sla-dashboard'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_kpi_sla_dashboard');
      if (error) throw error;
      return data as unknown as SLADashboardData;
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });
}

const statusConfig = {
  healthy: {
    icon: CheckCircle2,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    label: 'Healthy',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    label: 'Warning',
  },
  breach: {
    icon: XCircle,
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    label: 'SLA Breach',
  },
  degraded: {
    icon: AlertTriangle,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    label: 'Degraded',
  },
  critical: {
    icon: XCircle,
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    label: 'Critical',
  },
};

const circuitStateConfig = {
  closed: {
    icon: CheckCircle2,
    color: 'text-emerald-500',
    label: 'Closed',
  },
  open: {
    icon: XCircle,
    color: 'text-rose-500',
    label: 'Open',
  },
  half_open: {
    icon: AlertTriangle,
    color: 'text-amber-500',
    label: 'Half-Open',
  },
};

export function SLAStatusPanel() {
  const { data, isLoading, error } = useSLADashboard();

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            SLA Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            SLA Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Unable to load SLA data</p>
        </CardContent>
      </Card>
    );
  }

  const overallConfig = statusConfig[data.overall_health] || statusConfig.healthy;
  const OverallIcon = overallConfig.icon;

  const healthyCount = data.domains?.filter(d => d.sla_status === 'healthy').length ?? 0;
  const totalDomains = data.domains?.length ?? 0;
  const openCircuits = data.circuit_breakers?.filter(cb => cb.state === 'open').length ?? 0;

  return (
    <TooltipProvider>
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              SLA Status
            </CardTitle>
            <Badge 
              variant="outline" 
              className={cn(
                'text-xs font-medium',
                overallConfig.color,
                overallConfig.bg,
                overallConfig.border
              )}
            >
              <OverallIcon className="h-3 w-3 mr-1" />
              {overallConfig.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Domain SLA Summary */}
          <div className="grid grid-cols-3 gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex flex-col items-center p-2 rounded-lg bg-emerald-500/10 cursor-help">
                  <span className="text-lg font-bold text-emerald-500">{healthyCount}</span>
                  <span className="text-[10px] text-muted-foreground">Healthy</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Domains meeting all SLA targets</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50 cursor-help">
                  <span className="text-lg font-bold text-foreground">{totalDomains}</span>
                  <span className="text-[10px] text-muted-foreground">Total</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Total monitored domains</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  "flex flex-col items-center p-2 rounded-lg cursor-help",
                  openCircuits > 0 ? "bg-rose-500/10" : "bg-muted/50"
                )}>
                  <span className={cn(
                    "text-lg font-bold",
                    openCircuits > 0 ? "text-rose-500" : "text-muted-foreground"
                  )}>
                    {openCircuits}
                  </span>
                  <span className="text-[10px] text-muted-foreground">Circuits Open</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Functions with open circuit breakers (temporarily disabled)</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Domain Details */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Domain Health
            </p>
            <div className="space-y-1.5">
              {data.domains?.slice(0, 5).map((domain) => {
                const config = statusConfig[domain.sla_status] || statusConfig.healthy;
                const StatusIcon = config.icon;
                
                return (
                  <Tooltip key={domain.domain}>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-help">
                        <div className="flex items-center gap-2">
                          <StatusIcon className={cn("h-3.5 w-3.5", config.color)} />
                          <span className="text-sm capitalize">{domain.domain}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {domain.recent_success_rate !== null && (
                            <span className={cn(
                              domain.recent_success_rate >= domain.min_success_rate 
                                ? "text-emerald-500" 
                                : "text-rose-500"
                            )}>
                              {domain.recent_success_rate}%
                            </span>
                          )}
                          {domain.last_calculation && (
                            <span className={cn(
                              domain.is_stale ? "text-amber-500" : "text-muted-foreground"
                            )}>
                              {formatDistanceToNow(new Date(domain.last_calculation), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-xs">
                      <div className="space-y-1 text-xs">
                        <p><strong>Max Stale:</strong> {domain.max_stale_minutes} min</p>
                        <p><strong>Target Time:</strong> {domain.target_calculation_time_ms}ms</p>
                        <p><strong>Min Success Rate:</strong> {domain.min_success_rate}%</p>
                        {domain.avg_calculation_time_ms && (
                          <p><strong>Avg Calc Time:</strong> {domain.avg_calculation_time_ms}ms</p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>

          {/* Circuit Breakers (only show if any are open) */}
          {data.circuit_breakers && data.circuit_breakers.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Circuit Breakers
              </p>
              <div className="space-y-1.5">
                {data.circuit_breakers.map((cb) => {
                  const config = circuitStateConfig[cb.state];
                  const StateIcon = config.icon;
                  
                  return (
                    <div 
                      key={cb.function_name}
                      className="flex items-center justify-between p-2 rounded-lg bg-rose-500/5 border border-rose-500/20"
                    >
                      <div className="flex items-center gap-2">
                        <StateIcon className={cn("h-3.5 w-3.5", config.color)} />
                        <span className="text-sm font-mono">{cb.function_name}</span>
                      </div>
                      <Badge variant="outline" className={cn("text-xs", config.color)}>
                        {config.label}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

// Compact version for the executive summary bar
export function SLAStatusBadge() {
  const { data, isLoading } = useSLADashboard();

  if (isLoading || !data) {
    return null;
  }

  const config = statusConfig[data.overall_health] || statusConfig.healthy;
  const Icon = config.icon;

  const healthyCount = data.domains?.filter(d => d.sla_status === 'healthy').length ?? 0;
  const totalDomains = data.domains?.length ?? 0;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-help",
            config.bg,
            config.border
          )}>
            <Icon className={cn("h-4 w-4", config.color)} />
            <span className={cn("font-bold", config.color)}>
              {healthyCount}/{totalDomains}
            </span>
            <span className="text-xs text-muted-foreground hidden sm:inline">SLA</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{healthyCount} of {totalDomains} domains meeting SLA targets</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

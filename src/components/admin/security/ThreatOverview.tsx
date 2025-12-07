import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, ShieldAlert, ShieldCheck, ShieldX, AlertTriangle, Ban, Activity } from 'lucide-react';
import { useThreatSummary } from '@/hooks/useThreatDetection';
import { ThreatLevel } from '@/types/threat';
import { cn } from '@/lib/utils';

const threatLevelConfig: Record<ThreatLevel, { icon: typeof Shield; color: string; bgColor: string; label: string }> = {
  low: { icon: ShieldCheck, color: 'text-green-500', bgColor: 'bg-green-500/10', label: 'Low Risk' },
  medium: { icon: Shield, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10', label: 'Elevated' },
  high: { icon: ShieldAlert, color: 'text-orange-500', bgColor: 'bg-orange-500/10', label: 'High Risk' },
  critical: { icon: ShieldX, color: 'text-red-500', bgColor: 'bg-red-500/10', label: 'Critical' },
};

export function ThreatOverview() {
  const { data: summary, isLoading } = useThreatSummary();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Threat Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const level = summary?.threat_level || 'low';
  const config = threatLevelConfig[level];
  const ThreatIcon = config.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Threat Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {/* Threat Level Gauge */}
          <div className={cn(
            "col-span-2 md:col-span-1 p-4 rounded-lg border flex flex-col items-center justify-center",
            config.bgColor
          )}>
            <ThreatIcon className={cn("h-12 w-12 mb-2", config.color)} />
            <span className={cn("text-lg font-bold", config.color)}>{config.label}</span>
            <span className="text-xs text-muted-foreground">Current Threat Level</span>
          </div>

          {/* Critical Threats */}
          <div className="p-4 rounded-lg border bg-red-500/5">
            <div className="flex items-center gap-2 mb-2">
              <ShieldX className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Critical</span>
            </div>
            <span className="text-2xl font-bold text-red-500">{summary?.critical_threats || 0}</span>
          </div>

          {/* High Threats */}
          <div className="p-4 rounded-lg border bg-orange-500/5">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">High</span>
            </div>
            <span className="text-2xl font-bold text-orange-500">{summary?.high_threats || 0}</span>
          </div>

          {/* Blocked IPs */}
          <div className="p-4 rounded-lg border bg-muted/50">
            <div className="flex items-center gap-2 mb-2">
              <Ban className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Blocked IPs</span>
            </div>
            <span className="text-2xl font-bold">{summary?.blocked_ips_active || 0}</span>
            <Badge variant="outline" className="ml-2 text-xs">
              +{summary?.blocked_ips_today || 0} today
            </Badge>
          </div>

          {/* Total Threats 24h */}
          <div className="p-4 rounded-lg border bg-muted/50">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Threats (24h)</span>
            </div>
            <span className="text-2xl font-bold">{summary?.total_threats_24h || 0}</span>
          </div>
        </div>

        {/* Attack Types Breakdown */}
        {summary?.attacks_by_type && Object.keys(summary.attacks_by_type).length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">Attack Types (24h)</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(summary.attacks_by_type).map(([type, count]) => (
                <Badge key={type} variant="secondary" className="capitalize">
                  {type.replace('_', ' ')}: {count}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

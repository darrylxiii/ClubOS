import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { UnifiedKPI, KPIDomain } from '@/hooks/useUnifiedKPIs';

interface KPIHeatMapProps {
  kpis: UnifiedKPI[];
  groupBy: 'domain' | 'category' | 'time';
  onCellClick?: (kpi: UnifiedKPI) => void;
  className?: string;
}

interface HeatMapCell {
  id: string;
  label: string;
  value: number;
  status: 'success' | 'warning' | 'critical' | 'neutral';
  kpi?: UnifiedKPI;
  count?: number;
}

const statusColors = {
  success: 'bg-emerald-500/80 hover:bg-emerald-500',
  warning: 'bg-amber-500/80 hover:bg-amber-500',
  critical: 'bg-rose-500/80 hover:bg-rose-500',
  neutral: 'bg-muted hover:bg-muted/80',
};

const domainLabels: Record<KPIDomain, string> = {
  operations: 'Operations',
  website: 'Website',
  sales: 'Sales',
  platform: 'Platform',
  intelligence: 'Intelligence',
  growth: 'Growth',
  costs: 'Costs',
};

export function KPIHeatMap({ kpis, groupBy, onCellClick, className }: KPIHeatMapProps) {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  const cells = useMemo(() => {
    if (groupBy === 'domain') {
      // Group by domain with health score
      const domains = new Map<KPIDomain, { kpis: UnifiedKPI[]; healthScore: number }>();
      
      kpis.forEach(kpi => {
        const existing = domains.get(kpi.domain) || { kpis: [], healthScore: 0 };
        existing.kpis.push(kpi);
        domains.set(kpi.domain, existing);
      });

      return Array.from(domains.entries()).map(([domain, data]) => {
        const successCount = data.kpis.filter(k => k.status === 'success').length;
        const healthScore = data.kpis.length > 0 ? (successCount / data.kpis.length) * 100 : 0;
        const criticalCount = data.kpis.filter(k => k.status === 'critical').length;
        const warningCount = data.kpis.filter(k => k.status === 'warning').length;
        
        let status: HeatMapCell['status'] = 'neutral';
        if (criticalCount > 0) status = 'critical';
        else if (warningCount > 0) status = 'warning';
        else if (successCount > 0) status = 'success';

        return {
          id: domain,
          label: domainLabels[domain],
          value: healthScore,
          status,
          count: data.kpis.length,
        } as HeatMapCell;
      });
    }

    if (groupBy === 'category') {
      // Group by category
      const categories = new Map<string, { kpis: UnifiedKPI[]; domain: KPIDomain }>();
      
      kpis.forEach(kpi => {
        const key = `${kpi.domain}:${kpi.category}`;
        const existing = categories.get(key) || { kpis: [], domain: kpi.domain };
        existing.kpis.push(kpi);
        categories.set(key, existing);
      });

      return Array.from(categories.entries()).map(([key, data]) => {
        const successCount = data.kpis.filter(k => k.status === 'success').length;
        const healthScore = data.kpis.length > 0 ? (successCount / data.kpis.length) * 100 : 0;
        const criticalCount = data.kpis.filter(k => k.status === 'critical').length;
        const warningCount = data.kpis.filter(k => k.status === 'warning').length;
        
        let status: HeatMapCell['status'] = 'neutral';
        if (criticalCount > 0) status = 'critical';
        else if (warningCount > 0) status = 'warning';
        else if (successCount > 0) status = 'success';

        const [, category] = key.split(':');
        return {
          id: key,
          label: category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          value: healthScore,
          status,
          count: data.kpis.length,
        } as HeatMapCell;
      });
    }

    // Individual KPIs (time view or default)
    return kpis.map(kpi => ({
      id: kpi.id,
      label: kpi.displayName,
      value: kpi.value,
      status: kpi.status,
      kpi,
    } as HeatMapCell));
  }, [kpis, groupBy]);

  const gridCols = groupBy === 'domain' ? 'grid-cols-7' : 
                   groupBy === 'category' ? 'grid-cols-4 md:grid-cols-6 lg:grid-cols-8' : 
                   'grid-cols-5 md:grid-cols-8 lg:grid-cols-10';

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">KPI Health Heat Map</CardTitle>
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-emerald-500" />
              <span className="text-muted-foreground">On Target</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-amber-500" />
              <span className="text-muted-foreground">Warning</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-rose-500" />
              <span className="text-muted-foreground">Critical</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <TooltipProvider delayDuration={100}>
          <div className={cn("grid gap-1", gridCols)}>
            {cells.map(cell => (
              <Tooltip key={cell.id}>
                <TooltipTrigger asChild>
                  <button
                    className={cn(
                      "aspect-square rounded-md transition-all duration-200 flex items-center justify-center",
                      "text-[10px] font-medium text-white/90 truncate p-1",
                      statusColors[cell.status],
                      hoveredCell === cell.id && "ring-2 ring-ring ring-offset-2 ring-offset-background scale-105",
                      cell.kpi && "cursor-pointer"
                    )}
                    onMouseEnter={() => setHoveredCell(cell.id)}
                    onMouseLeave={() => setHoveredCell(null)}
                    onClick={() => cell.kpi && onCellClick?.(cell.kpi)}
                  >
                    {groupBy === 'domain' && cell.label.charAt(0)}
                    {groupBy === 'category' && cell.label.slice(0, 3)}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <div className="space-y-1">
                    <p className="font-medium">{cell.label}</p>
                    {cell.count !== undefined && (
                      <p className="text-xs text-muted-foreground">{cell.count} KPIs</p>
                    )}
                    <p className="text-xs">
                      Health: <span className="font-medium">{cell.value.toFixed(1)}%</span>
                    </p>
                    <Badge variant={cell.status === 'success' ? 'default' : cell.status === 'warning' ? 'secondary' : 'destructive'} className="text-[10px]">
                      {cell.status.toUpperCase()}
                    </Badge>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}

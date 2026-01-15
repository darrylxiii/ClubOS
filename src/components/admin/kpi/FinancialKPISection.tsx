import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  DollarSign, 
  FileText, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useMoneybirdFinancialKPIs, type FinancialKPI } from '@/hooks/useMoneybirdFinancialKPIs';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface FinancialKPICardProps {
  kpi: FinancialKPI;
}

function FinancialKPICard({ kpi }: FinancialKPICardProps) {
  const formatValue = (value: number, format: string, unit?: string) => {
    if (format === 'currency') {
      return `${unit || '€'}${value.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    if (format === 'percent') {
      return `${value.toFixed(1)}%`;
    }
    return value.toLocaleString();
  };

  const statusColors = {
    success: 'text-emerald-500',
    warning: 'text-amber-500',
    critical: 'text-rose-500',
    neutral: 'text-muted-foreground',
  };

  const statusBgColors = {
    success: 'bg-emerald-500/10 border-emerald-500/20',
    warning: 'bg-amber-500/10 border-amber-500/20',
    critical: 'bg-rose-500/10 border-rose-500/20',
    neutral: 'bg-muted/50 border-border',
  };

  const StatusIcon = kpi.status === 'success' ? CheckCircle : 
                     kpi.status === 'critical' ? XCircle : 
                     kpi.status === 'warning' ? AlertTriangle : Clock;

  return (
    <Card className={cn("border", statusBgColors[kpi.status])}>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              {kpi.displayName}
            </p>
            <p className={cn("text-2xl font-bold", statusColors[kpi.status])}>
              {formatValue(kpi.value, kpi.format, kpi.unit)}
            </p>
          </div>
          <StatusIcon className={cn("h-5 w-5", statusColors[kpi.status])} />
        </div>
        {kpi.targetValue !== undefined && (
          <p className="text-xs text-muted-foreground mt-2">
            Target: {formatValue(kpi.targetValue, kpi.format, kpi.unit)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface FinancialKPISectionProps {
  year?: number;
}

export function FinancialKPISection({ year }: FinancialKPISectionProps) {
  const { kpis, isLoading, metrics, paymentAging } = useMoneybirdFinancialKPIs(year);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Financial KPIs (Moneybird)</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <DollarSign className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">No financial data synced yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Visit the Financial Dashboard to sync Moneybird data
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group KPIs by category
  const revenueKPIs = kpis.filter(k => k.category === 'revenue');
  const invoiceKPIs = kpis.filter(k => k.category === 'invoices');
  const agingKPIs = kpis.filter(k => k.category === 'aging');
  const efficiencyKPIs = kpis.filter(k => k.category === 'efficiency');
  const pipelineKPIs = kpis.filter(k => k.category === 'pipeline');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Financial KPIs (Moneybird)</h3>
        </div>
        {metrics.last_synced_at && (
          <Badge variant="outline" className="text-xs">
            Synced: {new Date(metrics.last_synced_at).toLocaleString('nl-NL', { 
              day: 'numeric', 
              month: 'short', 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Badge>
        )}
      </div>

      {/* Revenue Section */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Revenue
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {revenueKPIs.map(kpi => (
            <FinancialKPICard key={kpi.id} kpi={kpi} />
          ))}
          {pipelineKPIs.map(kpi => (
            <FinancialKPICard key={kpi.id} kpi={kpi} />
          ))}
        </div>
      </div>

      {/* Invoices Section */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Invoices
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {invoiceKPIs.map(kpi => (
            <FinancialKPICard key={kpi.id} kpi={kpi} />
          ))}
          {efficiencyKPIs.map(kpi => (
            <FinancialKPICard key={kpi.id} kpi={kpi} />
          ))}
        </div>
      </div>

      {/* Payment Aging Section */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Payment Aging
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {agingKPIs.map(kpi => (
            <FinancialKPICard key={kpi.id} kpi={kpi} />
          ))}
          
          {/* Aging breakdown card */}
          <Card className="col-span-2 border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">AR Aging Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {[
                  { label: 'Current', value: paymentAging.current, color: 'bg-emerald-500' },
                  { label: '1-30 days', value: paymentAging.overdue_30, color: 'bg-amber-400' },
                  { label: '31-60 days', value: paymentAging.overdue_60, color: 'bg-amber-500' },
                  { label: '61-90 days', value: paymentAging.overdue_90, color: 'bg-rose-400' },
                  { label: '90+ days', value: paymentAging.overdue_90_plus, color: 'bg-rose-600' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", item.color)} />
                      <span className="text-muted-foreground">{item.label}</span>
                    </div>
                    <span className="font-medium">
                      €{item.value.toLocaleString('nl-NL', { minimumFractionDigits: 0 })}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

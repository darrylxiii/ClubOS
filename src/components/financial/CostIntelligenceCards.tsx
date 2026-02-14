import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCostIntelligence } from '@/hooks/useSubscriptionBudgets';
import { DollarSign, TrendingDown, Activity, AlertTriangle, Users, BarChart3 } from 'lucide-react';
import { formatCurrency } from '@/lib/revenueCalculations';

export function CostIntelligenceCards() {
  const { data, isLoading } = useCostIntelligence();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="pt-6"><Skeleton className="h-20" /></CardContent></Card>
        ))}
      </div>
    );
  }

  const healthColor = (data?.healthScore || 0) >= 75 ? 'text-success' : (data?.healthScore || 0) >= 50 ? 'text-warning' : 'text-destructive';
  const totalSavings = (data?.savingsOpportunities.underutilized || 0) + (data?.savingsOpportunities.duplicateCategories.length || 0) + (data?.savingsOpportunities.renewingSoon || 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Cost per Placement</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(data?.costPerPlacement || 0)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Based on {data?.placementCount} placement{data?.placementCount !== 1 ? 's' : ''} this year
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Cost per Revenue €</CardTitle>
          <TrendingDown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">€{data?.costPerRevenueEuro?.toFixed(2) || '0.00'}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {data?.costToRevenuePercent?.toFixed(1)}% of revenue goes to operations
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Subscription Health</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${healthColor}`}>{data?.healthScore || 0}/100</div>
          <p className="text-xs text-muted-foreground mt-1">
            {data?.activeSubscriptionCount} active subscriptions
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Savings Opportunities</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalSavings}</div>
          <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
            {data?.savingsOpportunities.underutilized ? (
              <div className="flex items-center gap-1"><Users className="h-3 w-3" />{data.savingsOpportunities.underutilized} underutilized</div>
            ) : null}
            {data?.savingsOpportunities.duplicateCategories.length ? (
              <div className="flex items-center gap-1"><BarChart3 className="h-3 w-3" />{data.savingsOpportunities.duplicateCategories.length} duplicate categories</div>
            ) : null}
            {data?.savingsOpportunities.renewingSoon ? (
              <div className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{data.savingsOpportunities.renewingSoon} renewing soon</div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default CostIntelligenceCards;

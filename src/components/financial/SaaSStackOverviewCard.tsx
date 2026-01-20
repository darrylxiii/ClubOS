import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useSubscriptionMetrics, useVendorSubscriptions } from '@/hooks/useVendorSubscriptions';
import { Loader2, TrendingUp, TrendingDown, AlertTriangle, CreditCard, Calendar, Users } from 'lucide-react';

export function SaaSStackOverviewCard() {
  const { data: subscriptions, isLoading } = useVendorSubscriptions('active');
  const metrics = useSubscriptionMetrics();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const topVendors = subscriptions
    ?.sort((a, b) => b.monthly_cost - a.monthly_cost)
    .slice(0, 5);

  const categoryData = Object.entries(metrics.byCategory)
    .sort((a, b) => b[1].mrc - a[1].mrc);

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Main Metrics Card */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            SaaS Stack Overview
          </CardTitle>
          <CardDescription>Monthly recurring operational costs</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Monthly Recurring</p>
              <p className="text-2xl font-bold">{formatCurrency(metrics.totalMRC)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Annual Cost</p>
              <p className="text-2xl font-bold">{formatCurrency(metrics.totalARC)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Subscriptions</p>
              <p className="text-2xl font-bold">{metrics.activeCount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Renewals (30d)
              </p>
              <p className="text-2xl font-bold">
                {metrics.upcomingRenewals}
                {metrics.upcomingRenewals > 0 && (
                  <AlertTriangle className="h-4 w-4 inline ml-1 text-warning" />
                )}
              </p>
            </div>
          </div>

          {/* Top Vendors */}
          <div>
            <h4 className="text-sm font-medium mb-3">Top Vendors by Cost</h4>
            <div className="space-y-2">
              {topVendors?.map((vendor) => {
                const percentage = (vendor.monthly_cost / metrics.totalMRC) * 100;
                return (
                  <div key={vendor.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate">{vendor.vendor_name}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatCurrency(vendor.monthly_cost)}
                        </span>
                      </div>
                      <Progress value={percentage} className="h-1.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Underutilized Warning */}
          {metrics.underutilized > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
              <Users className="h-4 w-4 text-warning" />
              <span className="text-sm">
                <strong>{metrics.underutilized}</strong> subscriptions with less than 50% seat utilization
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Spend by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {categoryData.map(([category, data]) => {
              const percentage = (data.mrc / metrics.totalMRC) * 100;
              return (
                <div key={category}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="truncate">{category}</span>
                    <span className="text-muted-foreground">{percentage.toFixed(0)}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={percentage} className="h-2 flex-1" />
                    <span className="text-xs text-muted-foreground w-16 text-right">
                      {formatCurrency(data.mrc)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {categoryData.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No subscriptions yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

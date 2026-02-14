import { lazy, Suspense, useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { RoleGate } from '@/components/RoleGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PageLoader } from '@/components/PageLoader';
import { CostIntelligenceCards } from '@/components/financial/CostIntelligenceCards';
import { BurnRateChart } from '@/components/financial/BurnRateChart';
import { BudgetVsActual } from '@/components/financial/BudgetVsActual';
import { SubscriptionROITable } from '@/components/financial/SubscriptionROITable';
import { useCostIntelligence, useGenerateExpensesFromSubscriptions } from '@/hooks/useSubscriptionBudgets';
import { useSubscriptionMetrics } from '@/hooks/useVendorSubscriptions';
import { formatCurrency } from '@/lib/revenueCalculations';
import { CreditCard, TrendingUp, Receipt, RefreshCw, ArrowLeft, DollarSign, CalendarClock, Percent } from 'lucide-react';
import { Link } from 'react-router-dom';

const SubscriptionsTab = lazy(() => import('@/components/financial/SubscriptionsTab').then(m => ({ default: m.SubscriptionsTab })));

export default function SubscriptionManagement() {
  const { data: intelligence, isLoading: intelLoading } = useCostIntelligence();
  const metrics = useSubscriptionMetrics();
  const generateExpenses = useGenerateExpensesFromSubscriptions();
  const [showFullTable, setShowFullTable] = useState(false);

  return (
    <AppLayout>
      <RoleGate allowedRoles={['admin', 'strategist']}>
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <Link to="/admin/finance" className="text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
                <CreditCard className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold tracking-tight">SUBSCRIPTION MANAGEMENT</h1>
              </div>
              <p className="text-muted-foreground">
                Enterprise cost control, ROI tracking, and budget management for all recurring expenses
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => generateExpenses.mutate()}
              disabled={generateExpenses.isPending}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${generateExpenses.isPending ? 'animate-spin' : ''}`} />
              Sync to Expenses
            </Button>
          </div>

          {/* Hero Metrics Strip */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
                  <DollarSign className="h-3.5 w-3.5" />
                  Total MRC
                </div>
                <div className="text-xl font-bold">{intelLoading ? <Skeleton className="h-7 w-20" /> : formatCurrency(intelligence?.totalMRC || 0)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Total ARC
                </div>
                <div className="text-xl font-bold">{intelLoading ? <Skeleton className="h-7 w-20" /> : formatCurrency(intelligence?.totalARC || 0)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
                  <Percent className="h-3.5 w-3.5" />
                  Cost-to-Revenue
                </div>
                <div className="text-xl font-bold">{intelLoading ? <Skeleton className="h-7 w-20" /> : `${intelligence?.costToRevenuePercent?.toFixed(1) || '0'}%`}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
                  <CalendarClock className="h-3.5 w-3.5" />
                  Upcoming Renewals
                </div>
                <div className="text-xl font-bold">{metrics.upcomingRenewals}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
                  <Receipt className="h-3.5 w-3.5" />
                  Active Subs
                </div>
                <div className="text-xl font-bold">{metrics.activeCount}</div>
              </CardContent>
            </Card>
          </div>

          {/* Cost Intelligence Cards */}
          <CostIntelligenceCards />

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BurnRateChart />
            <BudgetVsActual />
          </div>

          {/* ROI Table */}
          <SubscriptionROITable />

          {/* Full Subscription Management */}
          <div className="space-y-4">
            <Button
              variant="ghost"
              onClick={() => setShowFullTable(!showFullTable)}
              className="text-lg font-semibold p-0 h-auto"
            >
              {showFullTable ? '▾' : '▸'} Full Subscription Management
            </Button>
            {showFullTable && (
              <Suspense fallback={<PageLoader />}>
                <SubscriptionsTab />
              </Suspense>
            )}
          </div>
        </div>
      </RoleGate>
    </AppLayout>
  );
}

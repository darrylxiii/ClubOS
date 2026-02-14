import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useSubscriptionBudgets } from '@/hooks/useSubscriptionBudgets';
import { useSubscriptionMetrics } from '@/hooks/useVendorSubscriptions';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/revenueCalculations';
import { cn } from '@/lib/utils';
import { AddBudgetDialog } from './AddBudgetDialog';

export function BudgetVsActual() {
  const { data: budgets, isLoading } = useSubscriptionBudgets();
  const metrics = useSubscriptionMetrics();

  if (isLoading) {
    return <Card><CardContent className="pt-6"><Skeleton className="h-[200px]" /></CardContent></Card>;
  }

  if (!budgets || budgets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Budget vs Actual</span>
            <AddBudgetDialog />
          </CardTitle>
          <CardDescription>No budgets configured yet. Set category budgets to track spend limits.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Use the "Set Budget" button above to define monthly spend limits per subscription category.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Budget vs Actual</span>
          <AddBudgetDialog />
        </CardTitle>
        <CardDescription>Monthly category spend against budgets</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {budgets.map(budget => {
          const actualSpend = metrics.byCategory[budget.category]?.mrc || 0;
          const percent = budget.budget_amount > 0 ? (actualSpend / budget.budget_amount) * 100 : 0;
          const status = percent > 100 ? 'over' : percent >= 90 ? 'warning' : 'ok';

          return (
            <div key={budget.id} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{budget.category}</span>
                <span className={cn(
                  'text-xs font-medium',
                  status === 'over' && 'text-destructive',
                  status === 'warning' && 'text-warning',
                  status === 'ok' && 'text-success',
                )}>
                  {formatCurrency(actualSpend)} / {formatCurrency(budget.budget_amount)}
                  <span className="ml-1">({percent.toFixed(0)}%)</span>
                </span>
              </div>
              <Progress
                value={Math.min(percent, 100)}
                className={cn(
                  'h-2',
                  status === 'over' && '[&>div]:bg-destructive',
                  status === 'warning' && '[&>div]:bg-warning',
                )}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default BudgetVsActual;

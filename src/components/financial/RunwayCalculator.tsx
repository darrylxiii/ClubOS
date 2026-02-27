import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Fuel, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCostIntelligence } from '@/hooks/useSubscriptionBudgets';
import { formatCurrency } from '@/lib/currency';

interface RunwayCalculatorProps {
  year?: number;
  legalEntity?: string;
}

export function RunwayCalculator({ year, legalEntity }: RunwayCalculatorProps) {
  const currentYear = year || new Date().getFullYear();
  const [cashBalance, setCashBalance] = useState<number>(250000);
  const { data: costData } = useCostIntelligence();

  const { data: burnData } = useQuery({
    queryKey: ['runway-burn-data', currentYear, legalEntity],
    queryFn: async () => {
      const startOfYear = `${currentYear}-01-01`;

      // Monthly operating expenses
      let expsQ = supabase
        .from('operating_expenses')
        .select('amount, amount_eur, expense_date')
        .gte('expense_date', startOfYear);
      if (legalEntity && legalEntity !== 'all') expsQ = expsQ.eq('legal_entity', legalEntity);
      const { data: exps } = await expsQ;

      const monthsElapsed = new Date().getMonth() + 1;
      const totalOpex = (exps || []).reduce((s, e) => s + (Number(e.amount_eur ?? e.amount) || 0), 0);
      const avgMonthlyOpex = monthsElapsed > 0 ? totalOpex / monthsElapsed : 0;

      // Monthly net collections
      let invQ = supabase
        .from('moneybird_sales_invoices')
        .select('paid_amount, invoice_date')
        .gte('invoice_date', startOfYear);
      if (legalEntity && legalEntity !== 'all') invQ = invQ.eq('legal_entity', legalEntity);
      const { data: invs } = await invQ;

      const totalCollected = (invs || []).reduce((s, i) => s + (Number(i.paid_amount) || 0), 0);
      const avgMonthlyCollections = monthsElapsed > 0 ? totalCollected / monthsElapsed : 0;

      const subscriptionMRC = costData?.totalMRC || 0;
      const monthlyBurn = avgMonthlyOpex + subscriptionMRC;
      const netBurn = monthlyBurn - avgMonthlyCollections;

      return {
        monthlyBurn: Math.round(monthlyBurn),
        avgMonthlyCollections: Math.round(avgMonthlyCollections),
        netBurn: Math.round(netBurn),
        subscriptionMRC: Math.round(subscriptionMRC),
        avgMonthlyOpex: Math.round(avgMonthlyOpex),
      };
    },
  });

  const netBurn = burnData?.netBurn || 0;
  const runwayMonths = netBurn > 0 ? cashBalance / netBurn : netBurn <= 0 ? Infinity : 0;

  // Scenarios
  const scenarios = [
    {
      name: 'Current Trajectory',
      burn: netBurn,
      runway: netBurn > 0 ? cashBalance / netBurn : Infinity,
      color: 'text-foreground',
    },
    {
      name: 'Cost Reduction (-20%)',
      burn: netBurn * 0.8,
      runway: netBurn * 0.8 > 0 ? cashBalance / (netBurn * 0.8) : Infinity,
      color: 'text-primary',
    },
    {
      name: 'Revenue Growth (+30%)',
      burn: (burnData?.monthlyBurn || 0) - (burnData?.avgMonthlyCollections || 0) * 1.3,
      runway:
        ((burnData?.monthlyBurn || 0) - (burnData?.avgMonthlyCollections || 0) * 1.3) > 0
          ? cashBalance / ((burnData?.monthlyBurn || 0) - (burnData?.avgMonthlyCollections || 0) * 1.3)
          : Infinity,
      color: 'text-primary',
    },
  ];

  const getRunwayStatus = (months: number) => {
    if (months === Infinity) return { label: 'Profitable', variant: 'default' as const, icon: TrendingUp };
    if (months >= 18) return { label: 'Healthy', variant: 'default' as const, icon: TrendingUp };
    if (months >= 9) return { label: 'Moderate', variant: 'secondary' as const, icon: Fuel };
    return { label: 'Critical', variant: 'destructive' as const, icon: AlertTriangle };
  };

  const status = getRunwayStatus(runwayMonths);
  const StatusIcon = status.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fuel className="h-5 w-5" />
          Runway Calculator
        </CardTitle>
        <CardDescription>Cash position and burn analysis with scenario modeling</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Cash Balance Input */}
        <div className="space-y-2">
          <Label htmlFor="cash-balance">Current Cash Balance (€)</Label>
          <Input
            id="cash-balance"
            type="number"
            value={cashBalance}
            onChange={(e) => setCashBalance(Number(e.target.value) || 0)}
            className="max-w-xs"
          />
        </div>

        {/* Current Status */}
        <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
          <StatusIcon className="h-8 w-8 text-primary" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">
                {runwayMonths === Infinity ? '∞' : `${runwayMonths.toFixed(1)}`}
              </span>
              <span className="text-muted-foreground">months runway</span>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Net burn: {formatCurrency(netBurn)}/mo · Collections: {formatCurrency(burnData?.avgMonthlyCollections || 0)}/mo
            </p>
          </div>
        </div>

        {/* Burn Breakdown */}
        <div className="grid gap-3 md:grid-cols-3">
          <div className="p-3 rounded-lg border">
            <p className="text-sm text-muted-foreground">Avg Monthly OpEx</p>
            <p className="text-lg font-semibold">{formatCurrency(burnData?.avgMonthlyOpex || 0)}</p>
          </div>
          <div className="p-3 rounded-lg border">
            <p className="text-sm text-muted-foreground">Subscription MRC</p>
            <p className="text-lg font-semibold">{formatCurrency(burnData?.subscriptionMRC || 0)}</p>
          </div>
          <div className="p-3 rounded-lg border">
            <p className="text-sm text-muted-foreground">Avg Monthly Collections</p>
            <p className="text-lg font-semibold">{formatCurrency(burnData?.avgMonthlyCollections || 0)}</p>
          </div>
        </div>

        {/* Scenario Table */}
        <div>
          <h4 className="text-sm font-medium mb-3">Scenario Analysis</h4>
          <div className="space-y-2">
            {scenarios.map((s) => (
              <div key={s.name} className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium text-sm">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Net burn: {s.burn <= 0 ? 'Net positive' : `${formatCurrency(s.burn)}/mo`}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${s.color}`}>
                    {s.runway === Infinity ? '∞' : `${s.runway.toFixed(1)} mo`}
                  </p>
                  {s.runway !== Infinity && s.runway > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Until {new Date(Date.now() + s.runway * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

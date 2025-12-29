import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Calculator, TrendingUp, TrendingDown, Target } from "lucide-react";

interface UnitEconomicsProps {
  ltv: number;
  cac: number;
  arpu: number;
  churnRate: number;
}

export function UnitEconomics({ ltv, cac, arpu, churnRate }: UnitEconomicsProps) {
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  const ltvCacRatio = cac > 0 ? ltv / cac : 0;
  const cacPaybackMonths = arpu > 0 ? cac / arpu : 0;
  const monthlyChurn = churnRate;
  const averageLifetimeMonths = monthlyChurn > 0 ? 100 / monthlyChurn : 24;

  // Benchmark targets
  const LTV_CAC_TARGET = 3;
  const PAYBACK_TARGET = 12;
  const CHURN_TARGET = 5;

  const getHealthIndicator = (current: number, target: number, inverse = false) => {
    const ratio = inverse ? target / current : current / target;
    if (ratio >= 1) return { color: 'text-green-600', bg: 'bg-green-500', label: 'Healthy' };
    if (ratio >= 0.7) return { color: 'text-amber-600', bg: 'bg-amber-500', label: 'Acceptable' };
    return { color: 'text-red-600', bg: 'bg-red-500', label: 'Needs Work' };
  };

  const ltvCacHealth = getHealthIndicator(ltvCacRatio, LTV_CAC_TARGET);
  const paybackHealth = getHealthIndicator(cacPaybackMonths, PAYBACK_TARGET, true);
  const churnHealth = getHealthIndicator(monthlyChurn, CHURN_TARGET, true);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          Unit Economics
        </CardTitle>
        <CardDescription>Key SaaS efficiency metrics</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* LTV */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Customer Lifetime Value (LTV)</span>
            <span className="text-lg font-bold">{formatCurrency(ltv)}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Based on {averageLifetimeMonths.toFixed(0)} month avg. lifetime × {formatCurrency(arpu)} ARPU
          </div>
        </div>

        {/* CAC */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Customer Acquisition Cost (CAC)</span>
            <span className="text-lg font-bold">{formatCurrency(cac)}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Estimated from marketing spend / new customers
          </div>
        </div>

        {/* LTV/CAC Ratio */}
        <div className="space-y-2 p-4 rounded-lg bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              <span className="text-sm font-medium">LTV/CAC Ratio</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xl font-bold ${ltvCacHealth.color}`}>
                {ltvCacRatio.toFixed(1)}x
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${ltvCacHealth.bg}/20 ${ltvCacHealth.color}`}>
                {ltvCacHealth.label}
              </span>
            </div>
          </div>
          <Progress value={Math.min((ltvCacRatio / LTV_CAC_TARGET) * 100, 100)} className="h-2" />
          <div className="text-xs text-muted-foreground">
            Target: {LTV_CAC_TARGET}x or higher
          </div>
        </div>

        {/* CAC Payback */}
        <div className="space-y-2 p-4 rounded-lg bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-medium">CAC Payback Period</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xl font-bold ${paybackHealth.color}`}>
                {cacPaybackMonths.toFixed(1)} mo
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${paybackHealth.bg}/20 ${paybackHealth.color}`}>
                {paybackHealth.label}
              </span>
            </div>
          </div>
          <Progress value={Math.min((PAYBACK_TARGET / Math.max(cacPaybackMonths, 1)) * 100, 100)} className="h-2" />
          <div className="text-xs text-muted-foreground">
            Target: {PAYBACK_TARGET} months or less
          </div>
        </div>

        {/* Monthly Churn */}
        <div className="space-y-2 p-4 rounded-lg bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              <span className="text-sm font-medium">Monthly Churn Rate</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xl font-bold ${churnHealth.color}`}>
                {monthlyChurn.toFixed(2)}%
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${churnHealth.bg}/20 ${churnHealth.color}`}>
                {churnHealth.label}
              </span>
            </div>
          </div>
          <Progress value={Math.min((CHURN_TARGET / Math.max(monthlyChurn, 0.1)) * 100, 100)} className="h-2" />
          <div className="text-xs text-muted-foreground">
            Target: {CHURN_TARGET}% or less
          </div>
        </div>

        {/* ARPU */}
        <div className="flex items-center justify-between p-4 rounded-lg border">
          <span className="text-sm font-medium">Average Revenue Per User (ARPU)</span>
          <span className="text-lg font-bold">{formatCurrency(arpu)}/mo</span>
        </div>
      </CardContent>
    </Card>
  );
}

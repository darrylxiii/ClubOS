import { AppLayout } from "@/components/AppLayout";
import { RoleGate } from "@/components/RoleGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { useInventoryStats, calculateKIA, KIA_THRESHOLDS_2024 } from "@/hooks/useInventoryStats";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

const formatCurrency = (v: number) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(v);

const KIAOptimization = () => {
  const { stats, loading } = useInventoryStats();
  const kiaTotal = stats?.kiaEligibleTotal || 0;
  const kiaDeduction = calculateKIA(kiaTotal);
  const minThreshold = KIA_THRESHOLDS_2024.minimum;
  const maxThreshold = KIA_THRESHOLDS_2024.maximum;
  const isEligible = kiaTotal >= minThreshold && kiaTotal <= maxThreshold;
  const progressPercent = Math.min(100, (kiaTotal / maxThreshold) * 100);

  return (
    <AppLayout>
      <RoleGate allowedRoles={["admin"]} showLoading>
        <div className="container mx-auto py-8 max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">KIA & Tax Optimization</h1>
            <p className="text-muted-foreground">Kleinschaligheidsinvesteringsaftrek (KIA) overview for 2024</p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
          ) : (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <Card><CardContent className="pt-4"><div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><Calculator className="h-4 w-4" />KIA Eligible</div><div className="text-2xl font-bold">{formatCurrency(kiaTotal)}</div></CardContent></Card>
                <Card className={isEligible ? "border-green-500" : "border-yellow-500"}><CardContent className="pt-4"><div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><TrendingUp className="h-4 w-4" />KIA Deduction</div><div className="text-2xl font-bold text-green-600">{formatCurrency(kiaDeduction)}</div></CardContent></Card>
                <Card><CardContent className="pt-4"><div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">{isEligible ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertCircle className="h-4 w-4 text-yellow-500" />}Status</div><div className="text-lg font-semibold">{isEligible ? "Eligible" : kiaTotal < minThreshold ? "Below Minimum" : "Above Maximum"}</div></CardContent></Card>
                <Card><CardContent className="pt-4"><div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><Calculator className="h-4 w-4" />Tax Savings (25%)</div><div className="text-2xl font-bold text-green-600">{formatCurrency(kiaDeduction * 0.25)}</div></CardContent></Card>
              </div>

              {/* Progress Visualization */}
              <Card className="mb-8">
                <CardHeader><CardTitle>KIA Investment Threshold</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Progress value={progressPercent} className="h-4" />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{formatCurrency(0)}</span>
                      <span className="text-center"><span className="font-medium text-foreground">{formatCurrency(kiaTotal)}</span><br/>Current</span>
                      <span>{formatCurrency(maxThreshold)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-yellow-600">Min: {formatCurrency(minThreshold)}</span>
                      <span className="text-green-600">Optimal: {formatCurrency(65915)}</span>
                      <span className="text-red-600">Max: {formatCurrency(maxThreshold)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* KIA Brackets */}
              <Card className="mb-8">
                <CardHeader><CardTitle>2024 KIA Brackets</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className={`p-4 rounded-lg border ${kiaTotal >= 2801 && kiaTotal <= 65915 ? 'bg-green-50 border-green-200 dark:bg-green-950' : ''}`}>
                      <div className="flex justify-between"><span className="font-medium">€2,801 - €65,915</span><span className="text-green-600">28% of investment</span></div>
                      <p className="text-sm text-muted-foreground mt-1">Highest deduction percentage bracket</p>
                    </div>
                    <div className={`p-4 rounded-lg border ${kiaTotal > 65915 && kiaTotal <= 131823 ? 'bg-green-50 border-green-200 dark:bg-green-950' : ''}`}>
                      <div className="flex justify-between"><span className="font-medium">€65,916 - €131,823</span><span className="text-green-600">Fixed €15,750</span></div>
                      <p className="text-sm text-muted-foreground mt-1">Maximum fixed deduction</p>
                    </div>
                    <div className={`p-4 rounded-lg border ${kiaTotal > 131823 && kiaTotal <= 353973 ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950' : ''}`}>
                      <div className="flex justify-between"><span className="font-medium">€131,824 - €353,973</span><span className="text-yellow-600">€15,750 minus 7.59%</span></div>
                      <p className="text-sm text-muted-foreground mt-1">Decreasing deduction (phase-out)</p>
                    </div>
                    <div className={`p-4 rounded-lg border ${kiaTotal > 353973 ? 'bg-red-50 border-red-200 dark:bg-red-950' : ''}`}>
                      <div className="flex justify-between"><span className="font-medium">&gt; €353,973</span><span className="text-red-600">No deduction</span></div>
                      <p className="text-sm text-muted-foreground mt-1">Above maximum threshold</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tips */}
              <Card>
                <CardHeader><CardTitle>Optimization Tips</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {kiaTotal < minThreshold && <li className="flex gap-2"><AlertCircle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />Consider additional investments of {formatCurrency(minThreshold - kiaTotal)} to reach the KIA threshold.</li>}
                    {kiaTotal > 65915 && kiaTotal <= 131823 && <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />You're in the optimal fixed deduction bracket.</li>}
                    {kiaTotal > 131823 && <li className="flex gap-2"><AlertCircle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />Consider splitting investments across fiscal years to maximize KIA benefits.</li>}
                    <li className="flex gap-2"><Calculator className="h-4 w-4 text-primary shrink-0 mt-0.5" />KIA eligible investments: business assets with minimum €450 per asset.</li>
                  </ul>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </RoleGate>
    </AppLayout>
  );
};

export default KIAOptimization;

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { useInventoryStats, calculateKIA, KIA_THRESHOLDS_2024 } from "@/hooks/useInventoryStats";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { KIACalculator } from "@/components/admin/inventory/KIACalculator";

const formatCurrency = (v: number) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(v);

const KIAOptimization = () => {
  const { stats, loading } = useInventoryStats();
  const kiaTotal = stats?.kiaEligibleTotal || 0;
  const kiaDeduction = calculateKIA(kiaTotal);
  const minThreshold = KIA_THRESHOLDS_2024.minimum;
  const maxThreshold = KIA_THRESHOLDS_2024.maximum;
  const isEligible = kiaTotal >= minThreshold && kiaTotal <= maxThreshold;
  const progressPercent = Math.min(100, (kiaTotal / maxThreshold) * 100);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Calculator className="h-4 w-4" />KIA Eligible Assets
            </div>
            <div className="text-2xl font-bold">{stats?.kiaEligibleCount || 0}</div>
            <div className="text-sm text-muted-foreground mt-1">{formatCurrency(kiaTotal)} total</div>
          </CardContent>
        </Card>
        <Card className={isEligible ? "border-green-500/50" : "border-yellow-500/50"}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <TrendingUp className="h-4 w-4" />KIA Deduction
            </div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(kiaDeduction)}</div>
            <div className="text-sm text-muted-foreground mt-1">
              {kiaTotal > 0 ? `${((kiaDeduction / kiaTotal) * 100).toFixed(1)}% effective` : '—'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              {isEligible ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertCircle className="h-4 w-4 text-yellow-500" />}
              Status
            </div>
            <div className="text-lg font-semibold">
              {isEligible ? "Eligible" : kiaTotal < minThreshold ? "Below Minimum" : "Above Maximum"}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {kiaTotal < minThreshold 
                ? `Need €${(minThreshold - kiaTotal).toLocaleString('nl-NL')} more`
                : kiaTotal > maxThreshold 
                  ? 'Split investments'
                  : 'Optimized'}
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Calculator className="h-4 w-4" />Tax Savings (25.8%)
            </div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(kiaDeduction * 0.258)}</div>
            <div className="text-sm text-muted-foreground mt-1">Annual benefit</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <KIACalculator currentInvestment={kiaTotal} />

        <Card>
          <CardHeader><CardTitle>KIA Investment Position</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="relative pt-8">
                <div className="absolute top-0 left-0 text-xs text-muted-foreground">Current Position</div>
                <Progress value={progressPercent} className="h-6" />
                <div className="absolute top-8 bottom-0 w-0.5 bg-yellow-500" style={{ left: `${(minThreshold / maxThreshold) * 100}%` }}>
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-yellow-600 whitespace-nowrap">Min</div>
                </div>
                <div className="absolute top-8 bottom-0 w-0.5 bg-green-500" style={{ left: `${(65915 / maxThreshold) * 100}%` }}>
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-green-600 whitespace-nowrap">Optimal</div>
                </div>
                <div className="absolute top-8 bottom-0 w-0.5 bg-blue-500" style={{ left: `${(131823 / maxThreshold) * 100}%` }}>
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-blue-600 whitespace-nowrap">€15,750</div>
                </div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-4">
                <span>{formatCurrency(0)}</span>
                <span className="font-medium text-foreground">{formatCurrency(kiaTotal)}</span>
                <span>{formatCurrency(maxThreshold)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KIA Brackets */}
      <Card>
        <CardHeader><CardTitle>2024 KIA Brackets</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className={`p-4 rounded-lg border transition-all ${kiaTotal >= 2801 && kiaTotal <= 65915 ? 'bg-green-50 border-green-300 dark:bg-green-950/50 ring-2 ring-green-500/20' : ''}`}>
              <div className="flex justify-between items-center">
                <span className="font-medium">€2,801 - €65,915</span>
                <span className="text-green-600 font-semibold">28% of investment</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Highest deduction percentage bracket • Max €18,456</p>
              {kiaTotal >= 2801 && kiaTotal <= 65915 && (
                <div className="mt-2 text-sm text-green-600 font-medium flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" /> You are in this bracket
                </div>
              )}
            </div>
            <div className={`p-4 rounded-lg border transition-all ${kiaTotal > 65915 && kiaTotal <= 131823 ? 'bg-green-50 border-green-300 dark:bg-green-950/50 ring-2 ring-green-500/20' : ''}`}>
              <div className="flex justify-between items-center">
                <span className="font-medium">€65,916 - €131,823</span>
                <span className="text-green-600 font-semibold">Fixed €15,750</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Maximum fixed deduction amount</p>
              {kiaTotal > 65915 && kiaTotal <= 131823 && (
                <div className="mt-2 text-sm text-green-600 font-medium flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" /> You are in this bracket
                </div>
              )}
            </div>
            <div className={`p-4 rounded-lg border transition-all ${kiaTotal > 131823 && kiaTotal <= 353973 ? 'bg-yellow-50 border-yellow-300 dark:bg-yellow-950/50 ring-2 ring-yellow-500/20' : ''}`}>
              <div className="flex justify-between items-center">
                <span className="font-medium">€131,824 - €353,973</span>
                <span className="text-yellow-600 font-semibold">€15,750 minus 7.59%</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Decreasing deduction (phase-out zone)</p>
              {kiaTotal > 131823 && kiaTotal <= 353973 && (
                <div className="mt-2 text-sm text-yellow-600 font-medium flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" /> You are in this bracket - consider optimization
                </div>
              )}
            </div>
            <div className={`p-4 rounded-lg border transition-all ${kiaTotal > 353973 ? 'bg-red-50 border-red-300 dark:bg-red-950/50 ring-2 ring-red-500/20' : ''}`}>
              <div className="flex justify-between items-center">
                <span className="font-medium">&gt; €353,973</span>
                <span className="text-red-600 font-semibold">No deduction</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Above maximum threshold - no KIA available</p>
              {kiaTotal > 353973 && (
                <div className="mt-2 text-sm text-red-600 font-medium flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" /> Consider splitting across fiscal years
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card>
        <CardHeader><CardTitle>Optimization Tips</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm">
            {kiaTotal < minThreshold && (
              <li className="flex gap-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200">
                <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0" />
                <div>
                  <div className="font-medium">Reach the minimum threshold</div>
                  <div className="text-muted-foreground">Consider additional investments of {formatCurrency(minThreshold - kiaTotal)} to unlock KIA deduction.</div>
                </div>
              </li>
            )}
            {kiaTotal >= minThreshold && kiaTotal < 65915 && (
              <li className="flex gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200">
                <TrendingUp className="h-5 w-5 text-blue-500 shrink-0" />
                <div>
                  <div className="font-medium">Maximize the 28% bracket</div>
                  <div className="text-muted-foreground">You could invest up to {formatCurrency(65915 - kiaTotal)} more while staying in the highest percentage bracket.</div>
                </div>
              </li>
            )}
            {kiaTotal > 65915 && kiaTotal <= 131823 && (
              <li className="flex gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                <div>
                  <div className="font-medium">Optimal position</div>
                  <div className="text-muted-foreground">You're in the optimal fixed deduction bracket with maximum €15,750 benefit.</div>
                </div>
              </li>
            )}
            {kiaTotal > 131823 && (
              <li className="flex gap-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200">
                <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0" />
                <div>
                  <div className="font-medium">Consider timing optimization</div>
                  <div className="text-muted-foreground">Split investments across fiscal years to maximize KIA benefits per year.</div>
                </div>
              </li>
            )}
            <li className="flex gap-3 p-3 rounded-lg bg-muted/50 border">
              <Calculator className="h-5 w-5 text-primary shrink-0" />
              <div>
                <div className="font-medium">Minimum per asset</div>
                <div className="text-muted-foreground">KIA eligible investments require minimum €450 per individual asset.</div>
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default KIAOptimization;

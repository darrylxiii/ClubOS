import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Calculator, Lightbulb, Target } from 'lucide-react';
import { calculateKIA, KIA_THRESHOLDS_2024 } from '@/hooks/useInventoryStats';

interface KIACalculatorProps {
  currentInvestment: number;
}

const formatCurrency = (v: number) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(v);

export function KIACalculator({ currentInvestment }: KIACalculatorProps) {
  const [plannedInvestment, setPlannedInvestment] = useState(0);
  const [showOptimization, setShowOptimization] = useState(false);

  const totalInvestment = currentInvestment + plannedInvestment;
  const currentDeduction = calculateKIA(currentInvestment);
  const projectedDeduction = calculateKIA(totalInvestment);
  const additionalDeduction = projectedDeduction - currentDeduction;

  const minThreshold = KIA_THRESHOLDS_2024.minimum;
  const maxThreshold = KIA_THRESHOLDS_2024.maximum;
  const optimalPoint = 65915; // Highest percentage bracket

  // Calculate optimal investment suggestion
  const getOptimalInvestment = (): { amount: number; deduction: number; reason: string } | null => {
    if (totalInvestment >= optimalPoint && totalInvestment <= 131823) {
      return null; // Already in optimal range
    }

    if (totalInvestment < minThreshold) {
      const needed = minThreshold - currentInvestment;
      return {
        amount: needed,
        deduction: calculateKIA(minThreshold),
        reason: `Invest €${needed.toLocaleString('nl-NL')} more to reach minimum threshold and unlock KIA deduction.`
      };
    }

    if (totalInvestment < optimalPoint) {
      const toOptimal = optimalPoint - currentInvestment;
      return {
        amount: toOptimal,
        deduction: calculateKIA(optimalPoint),
        reason: `Invest €${toOptimal.toLocaleString('nl-NL')} to reach optimal 28% bracket (maximum €18,456 deduction).`
      };
    }

    if (totalInvestment > 131823 && totalInvestment <= maxThreshold) {
      // In phase-out zone - suggest staying at 131823
      return {
        amount: 131823 - currentInvestment,
        deduction: 15750,
        reason: `Consider limiting total investment to €131,823 to maintain maximum fixed €15,750 deduction.`
      };
    }

    if (totalInvestment > maxThreshold) {
      return {
        amount: 0,
        deduction: 0,
        reason: `Investment exceeds maximum. Consider splitting across fiscal years to maximize KIA benefits.`
      };
    }

    return null;
  };

  const optimization = getOptimalInvestment();
  const progressPercent = Math.min(100, (totalInvestment / maxThreshold) * 100);
  const optimalPercent = (optimalPoint / maxThreshold) * 100;

  // Determine current bracket
  const getBracketInfo = () => {
    if (totalInvestment < minThreshold) return { color: 'text-yellow-600', label: 'Below Minimum' };
    if (totalInvestment <= 65915) return { color: 'text-green-600', label: '28% Bracket' };
    if (totalInvestment <= 131823) return { color: 'text-green-600', label: 'Fixed €15,750' };
    if (totalInvestment <= maxThreshold) return { color: 'text-yellow-600', label: 'Phase-out Zone' };
    return { color: 'text-red-600', label: 'Over Maximum' };
  };

  const bracket = getBracketInfo();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          KIA Investment Simulator
        </CardTitle>
        <CardDescription>
          Plan your investments to maximize KIA tax deductions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current vs Planned */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground mb-1">Current KIA Eligible</div>
            <div className="text-2xl font-bold">{formatCurrency(currentInvestment)}</div>
            <div className="text-sm text-muted-foreground">
              Deduction: <span className="text-green-600 font-medium">{formatCurrency(currentDeduction)}</span>
            </div>
          </div>
          <div className="rounded-lg border p-4">
            <Label htmlFor="planned" className="text-sm text-muted-foreground">Planned Investment</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
              <Input
                id="planned"
                type="number"
                min={0}
                value={plannedInvestment || ''}
                onChange={(e) => setPlannedInvestment(parseFloat(e.target.value) || 0)}
                className="pl-8 text-xl font-bold h-12"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* Projection */}
        <div className="rounded-lg bg-muted/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Total Investment (Projected)</span>
            <span className="text-xl font-bold">{formatCurrency(totalInvestment)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Projected KIA Deduction</span>
            <span className="text-xl font-bold text-green-600">{formatCurrency(projectedDeduction)}</span>
          </div>
          {plannedInvestment > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Additional Deduction from Planned</span>
              <span className={additionalDeduction > 0 ? 'text-green-600' : 'text-red-600'}>
                {additionalDeduction >= 0 ? '+' : ''}{formatCurrency(additionalDeduction)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Current Bracket</span>
            <span className={`font-medium ${bracket.color}`}>{bracket.label}</span>
          </div>
        </div>

        {/* Visual Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>€0</span>
            <span>Optimal (€65,915)</span>
            <span>Max (€353,973)</span>
          </div>
          <div className="relative">
            <Progress value={progressPercent} className="h-3" />
            {/* Optimal marker */}
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-green-500"
              style={{ left: `${optimalPercent}%` }}
            />
            {/* Current position indicator */}
            <div 
              className="absolute -top-1 w-3 h-3 bg-primary rounded-full border-2 border-background"
              style={{ left: `${Math.min(progressPercent, 100)}%`, transform: 'translateX(-50%)' }}
            />
          </div>
        </div>

        {/* Optimization Suggestion */}
        {optimization && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-medium mb-1">Optimization Suggestion</div>
                <p className="text-sm text-muted-foreground">{optimization.reason}</p>
                {optimization.amount > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPlannedInvestment(optimization.amount)}
                    >
                      <Target className="h-4 w-4 mr-1" />
                      Set to {formatCurrency(optimization.amount)}
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      → {formatCurrency(optimization.deduction)} deduction
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tax Savings */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1">Tax Savings (25.8% rate)</div>
            <div className="text-lg font-bold text-green-600">
              {formatCurrency(projectedDeduction * 0.258)}
            </div>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1">Effective Reduction</div>
            <div className="text-lg font-bold">
              {totalInvestment > 0 ? ((projectedDeduction / totalInvestment) * 100).toFixed(1) : 0}%
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

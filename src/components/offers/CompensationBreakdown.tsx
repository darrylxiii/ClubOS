import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  PiggyBank,
  Briefcase,
  Gift,
  Percent
} from 'lucide-react';
import type { CandidateOffer } from '@/hooks/useCandidateOffers';

interface CompensationBreakdownProps {
  offer: CandidateOffer;
  showTaxEstimate?: boolean;
  currency?: string;
}

export function CompensationBreakdown({ 
  offer, 
  showTaxEstimate = true,
  currency = 'EUR'
}: CompensationBreakdownProps) {
  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return '€0';
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const baseSalary = offer.base_salary || 0;
  const bonusAmount = baseSalary * ((offer.bonus_percentage || 0) / 100);
  const totalComp = offer.total_compensation || baseSalary + bonusAmount;

  // Dutch tax brackets (simplified 2024)
  const calculateNetSalary = (gross: number): number => {
    // Box 1: Progressive tax rates
    const bracket1 = Math.min(gross, 73031) * 0.3697;
    const bracket2 = Math.max(0, gross - 73031) * 0.495;
    const totalTax = bracket1 + bracket2;
    return gross - totalTax;
  };

  const netAnnual = calculateNetSalary(totalComp);
  const netMonthly = netAnnual / 12;

  // Percentile indicator
  const percentile = offer.salary_percentile || 50;
  const percentileColor = percentile >= 75 ? 'text-green-500' : percentile >= 50 ? 'text-blue-500' : 'text-amber-500';
  const PercentileIcon = percentile >= 50 ? TrendingUp : percentile >= 25 ? Minus : TrendingDown;

  // Benchmark comparison
  const benchmark = offer.benchmark_comparison as { min?: number; max?: number; median?: number } | null;

  return (
    <div className="space-y-6">
      {/* Total Compensation Hero */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Annual Compensation</p>
              <p className="text-4xl font-bold text-primary">{formatCurrency(totalComp)}</p>
              {showTaxEstimate && (
                <p className="text-sm text-muted-foreground mt-2">
                  ≈ {formatCurrency(netMonthly)}/month after tax (NL)
                </p>
              )}
            </div>
            <div className="text-right">
              <Badge variant="outline" className={percentileColor}>
                <PercentileIcon className="h-3 w-3 mr-1" />
                {percentile}th percentile
              </Badge>
              {offer.market_competitiveness_score && (
                <p className="text-xs text-muted-foreground mt-2">
                  Market score: {Math.round(offer.market_competitiveness_score)}%
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Briefcase className="h-5 w-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Base Salary</p>
                <p className="text-xl font-semibold">{formatCurrency(baseSalary)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(baseSalary / 12)}/month
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Gift className="h-5 w-5 text-green-500" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Annual Bonus</p>
                <p className="text-xl font-semibold">
                  {offer.bonus_percentage ? `${offer.bonus_percentage}%` : '—'}
                </p>
                <p className="text-xs text-muted-foreground">
                  ≈ {formatCurrency(bonusAmount)}/year
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Percent className="h-5 w-5 text-purple-500" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Equity</p>
                <p className="text-xl font-semibold">
                  {offer.equity_percentage ? `${offer.equity_percentage}%` : '—'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Vesting schedule varies
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Market Benchmark */}
      {benchmark && (benchmark.min || benchmark.max || benchmark.median) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Market Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Visual range */}
              <div className="relative pt-6 pb-2">
                <div className="h-2 bg-muted rounded-full">
                  <div 
                    className="absolute h-2 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full"
                    style={{ 
                      left: '0%', 
                      width: '100%' 
                    }}
                  />
                  {/* Current offer marker */}
                  {benchmark.min && benchmark.max && (
                    <div 
                      className="absolute top-0 w-4 h-4 bg-primary rounded-full border-2 border-background shadow-lg transform -translate-x-1/2"
                      style={{ 
                        left: `${Math.min(100, Math.max(0, ((totalComp - benchmark.min) / (benchmark.max - benchmark.min)) * 100))}%` 
                      }}
                    />
                  )}
                </div>
                {/* Labels */}
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>{formatCurrency(benchmark.min)}</span>
                  <span className="font-medium">Median: {formatCurrency(benchmark.median)}</span>
                  <span>{formatCurrency(benchmark.max)}</span>
                </div>
              </div>

              {/* Comparison text */}
              {benchmark.median && (
                <div className="text-sm text-center">
                  {totalComp > benchmark.median ? (
                    <span className="text-green-600">
                      This offer is {formatCurrency(totalComp - benchmark.median)} above market median
                    </span>
                  ) : totalComp < benchmark.median ? (
                    <span className="text-amber-600">
                      This offer is {formatCurrency(benchmark.median - totalComp)} below market median
                    </span>
                  ) : (
                    <span className="text-blue-600">
                      This offer matches the market median
                    </span>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* After-Tax Estimate (NL) */}
      {showTaxEstimate && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PiggyBank className="h-4 w-4" />
              After-Tax Estimate (Netherlands)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Net Annual</p>
                <p className="text-lg font-semibold">{formatCurrency(netAnnual)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Net Monthly</p>
                <p className="text-lg font-semibold">{formatCurrency(netMonthly)}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              * Estimate based on 2024 Dutch tax brackets. Actual take-home may vary based on 
              deductions, 30% ruling eligibility, and other factors.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion } from '@/lib/motion';
import { Zap, DollarSign, Gift, TrendingUp } from 'lucide-react';
import type { OfferBenchmarks, SimulationResult } from '@/hooks/useOfferSimulator';

interface OfferComparisonSimulatorProps {
  benchmarks: OfferBenchmarks;
  initialBase: number;
  initialBonus: number;
  initialEquity: number;
  currency?: string;
  simulate: (base: number, bonus: number, equity: number) => SimulationResult;
  findOptimal: () => { baseSalary: number; bonus: number; equity: number };
  className?: string;
}

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function ProbabilityGauge({ value }: { value: number }) {
  const color =
    value >= 75
      ? 'text-emerald-500'
      : value >= 50
      ? 'text-amber-500'
      : 'text-rose-500';

  const bgColor =
    value >= 75
      ? 'bg-emerald-500'
      : value >= 50
      ? 'bg-amber-500'
      : 'bg-rose-500';

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs text-muted-foreground font-medium">Acceptance</span>
      <motion.div
        key={value}
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className={cn('text-4xl font-bold tabular-nums', color)}
      >
        {value}%
      </motion.div>
      <div className="w-full h-2 rounded-full bg-muted/30 overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', bgColor)}
          initial={{ width: '0%' }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}

export function OfferComparisonSimulator({
  benchmarks,
  initialBase,
  initialBonus,
  initialEquity,
  currency = 'USD',
  simulate,
  findOptimal,
  className,
}: OfferComparisonSimulatorProps) {
  const { t } = useTranslation('partner');

  const [baseSalary, setBaseSalary] = useState(initialBase);
  const [bonus, setBonus] = useState(initialBonus);
  const [equity, setEquity] = useState(initialEquity);

  const result = useMemo(
    () => simulate(baseSalary, bonus, equity),
    [baseSalary, bonus, equity, simulate]
  );

  const p50Result = useMemo(
    () => simulate(benchmarks.p50, 10, 0),
    [benchmarks.p50, simulate]
  );

  const handleOptimal = useCallback(() => {
    const opt = findOptimal();
    setBaseSalary(opt.baseSalary);
    setBonus(opt.bonus);
    setEquity(opt.equity);
  }, [findOptimal]);

  const sliderMin = Math.round(benchmarks.min * 0.8);
  const sliderMax = Math.round(benchmarks.max * 1.3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.3 }}
    >
      <Card className={cn('glass-card', className)}>
        <CardContent className="p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              {t('offerIntel.simulatorTitle', 'Offer Comparison Simulator')}
            </h3>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleOptimal}>
              <Zap className="h-3 w-3" />
              {t('offerIntel.optimal', 'Optimal')}
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sliders column */}
            <div className="lg:col-span-2 space-y-5">
              {/* Base Salary */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <DollarSign className="h-3 w-3" />
                    {t('offerIntel.baseSalary', 'Base Salary')}
                  </label>
                  <span className="text-sm font-semibold tabular-nums">
                    {formatCurrency(baseSalary, currency)}
                  </span>
                </div>
                <Slider
                  value={[baseSalary]}
                  onValueChange={([v]) => setBaseSalary(v)}
                  min={sliderMin}
                  max={sliderMax}
                  step={1000}
                  aria-label={t('offerIntel.baseSalary', 'Base Salary')}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
                  <span>{formatCurrency(sliderMin, currency)}</span>
                  <span>{formatCurrency(sliderMax, currency)}</span>
                </div>
              </div>

              {/* Bonus */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Gift className="h-3 w-3" />
                    {t('offerIntel.bonus', 'Bonus')}
                  </label>
                  <span className="text-sm font-semibold tabular-nums">{bonus}%</span>
                </div>
                <Slider
                  value={[bonus]}
                  onValueChange={([v]) => setBonus(v)}
                  min={0}
                  max={50}
                  step={1}
                  aria-label={t('offerIntel.bonus', 'Bonus')}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
                  <span>0%</span>
                  <span>50%</span>
                </div>
              </div>

              {/* Equity */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    {t('offerIntel.equity', 'Equity')}
                  </label>
                  <span className="text-sm font-semibold tabular-nums">{equity}%</span>
                </div>
                <Slider
                  value={[equity]}
                  onValueChange={([v]) => setEquity(v)}
                  min={0}
                  max={30}
                  step={0.5}
                  aria-label={t('offerIntel.equity', 'Equity')}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
                  <span>0%</span>
                  <span>30%</span>
                </div>
              </div>
            </div>

            {/* Results column */}
            <div className="flex flex-col gap-4">
              <ProbabilityGauge value={result.acceptanceProbability} />

              {/* Side-by-side comparison */}
              <div className="grid grid-cols-2 gap-3 mt-auto">
                <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground mb-1">
                    {t('offerIntel.yourOffer', 'Your Offer')}
                  </p>
                  <p className="text-sm font-bold tabular-nums">
                    {formatCurrency(result.totalComp, currency)}
                  </p>
                  <p className={cn(
                    'text-[10px] font-medium mt-0.5',
                    result.vsMarketP50 >= 0 ? 'text-emerald-500' : 'text-rose-500',
                  )}>
                    {result.vsMarketP50 >= 0 ? '+' : ''}{result.vsMarketP50}% vs P50
                  </p>
                </div>
                <div className="rounded-lg bg-muted/30 border border-border/20 p-3 text-center">
                  <p className="text-[10px] text-muted-foreground mb-1">
                    {t('offerIntel.marketP50', 'Market P50')}
                  </p>
                  <p className="text-sm font-bold tabular-nums text-muted-foreground">
                    {formatCurrency(p50Result.totalComp, currency)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {p50Result.acceptanceProbability}% {t('offerIntel.acceptance', 'acceptance')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

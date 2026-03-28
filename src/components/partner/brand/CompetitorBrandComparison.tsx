import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { useBrandScore } from '@/hooks/useBrandScore';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface BenchmarkRow {
  metric_type: string;
  company_value: number | null;
  industry_average: number | null;
  industry_percentile: number | null;
}

interface CompetitorBrandComparisonProps {
  companyId: string;
}

export function CompetitorBrandComparison({ companyId }: CompetitorBrandComparisonProps) {
  const { t } = useTranslation('partner');
  const { brandScore } = useBrandScore(companyId);

  const { data: benchmarks, isLoading } = useQuery({
    queryKey: ['brand-benchmarks', companyId],
    queryFn: async (): Promise<BenchmarkRow[]> => {
      try {
        const { data, error } = await (supabase as any)
          .from('partner_benchmarks')
          .select('metric_type, company_value, industry_average, industry_percentile')
          .eq('company_id', companyId)
          .order('calculated_at', { ascending: false })
          .limit(6);

        if (error) {
          if (error.code === '42P01') return [];
          throw error;
        }
        return (data || []) as BenchmarkRow[];
      } catch {
        return [];
      }
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5,
  });

  // Derive industry average brand score from benchmarks
  const industryAvgScore = benchmarks && benchmarks.length > 0
    ? Math.round(
        benchmarks.reduce((sum, b) => sum + (b.industry_average || 0), 0) / benchmarks.length
      )
    : 55; // Fallback industry average

  const diff = brandScore - industryAvgScore;
  const isAboveAverage = diff > 0;

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-primary" />
            {t('brandCenter.competitorComparison', 'Brand vs. Industry')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card group hover:border-primary/30 transition-all duration-300">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
            {t('brandCenter.competitorComparison', 'Brand vs. Industry')}
          </div>
          <Badge
            variant="outline"
            className={cn(
              'gap-1',
              isAboveAverage
                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-600 border-rose-500/30'
            )}
          >
            {isAboveAverage ? (
              <TrendingUp className="h-3 w-3" />
            ) : diff < 0 ? (
              <TrendingDown className="h-3 w-3" />
            ) : (
              <Minus className="h-3 w-3" />
            )}
            {Math.abs(diff)} {t('brandCenter.points', 'pts')} {isAboveAverage ? t('brandCenter.above', 'above') : t('brandCenter.below', 'below')}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Primary comparison bars */}
        <div className="space-y-4">
          <ComparisonBar
            label={t('brandCenter.yourBrand', 'Your Brand Score')}
            value={brandScore}
            maxValue={100}
            color="primary"
            delay={0.1}
          />
          <ComparisonBar
            label={t('brandCenter.industryAverage', 'Industry Average')}
            value={industryAvgScore}
            maxValue={100}
            color="muted"
            delay={0.2}
          />
        </div>

        {/* Divider */}
        <div className="border-t border-border/20" />

        {/* Metric breakdown from benchmarks */}
        {benchmarks && benchmarks.length > 0 ? (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t('brandCenter.metricBreakdown', 'Metric Breakdown')}
            </p>
            {benchmarks.slice(0, 4).map((bm, i) => {
              const companyVal = bm.company_value || 0;
              const industryVal = bm.industry_average || 0;
              const isTimeMetric = bm.metric_type.includes('time');
              const isBetter = isTimeMetric ? companyVal < industryVal : companyVal > industryVal;

              return (
                <motion.div
                  key={bm.metric_type}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * (i + 1) }}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-muted-foreground capitalize">
                    {bm.metric_type.replace(/_/g, ' ')}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium tabular-nums">
                      {Math.round(companyVal)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      vs {Math.round(industryVal)}
                    </span>
                    {isBetter ? (
                      <TrendingUp className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-rose-500" />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-xs text-muted-foreground">
              {t(
                'brandCenter.noBenchmarks',
                'Complete more hiring cycles to unlock detailed benchmarks against anonymized industry data.'
              )}
            </p>
          </div>
        )}

        {/* Percentile indicator */}
        {benchmarks && benchmarks.length > 0 && (
          <div className="pt-2 text-center">
            <p className="text-xs text-muted-foreground">
              {t('brandCenter.percentileNote', 'Comparisons based on anonymized partner benchmarks')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Horizontal bar component ──────────────────────────────────── */

function ComparisonBar({
  label,
  value,
  maxValue,
  color,
  delay = 0,
}: {
  label: string;
  value: number;
  maxValue: number;
  color: 'primary' | 'muted';
  delay?: number;
}) {
  const pct = Math.min(100, Math.round((value / maxValue) * 100));

  const barClass = color === 'primary'
    ? 'bg-primary'
    : 'bg-muted-foreground/40';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">{value}</span>
      </div>
      <div className="h-3 rounded-full bg-muted/50 overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', barClass)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}

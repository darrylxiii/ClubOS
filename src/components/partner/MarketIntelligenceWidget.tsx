import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Globe, DollarSign, Users, Clock } from 'lucide-react';
import { motion } from '@/lib/motion';
import { Skeleton } from '@/components/ui/skeleton';

interface MarketIntelligenceWidgetProps {
  companyId: string;
}

export function MarketIntelligenceWidget({ companyId }: MarketIntelligenceWidgetProps) {
  const { t } = useTranslation('partner');

  const { data, isLoading } = useQuery({
    queryKey: ['market-intelligence', companyId],
    queryFn: async () => {
      try {
      // Aggregate job-level metrics for this company
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, title, salary_min, salary_max, salary_currency, location, created_at, status, candidate_count, days_since_opened')
        .eq('company_id', companyId)
        .eq('status', 'published');

      if (!jobs || jobs.length === 0) return null;

      const avgSalaryMin = jobs.reduce((sum, j) => sum + (j.salary_min || 0), 0) / jobs.length;
      const avgSalaryMax = jobs.reduce((sum, j) => sum + (j.salary_max || 0), 0) / jobs.length;
      const avgCandidates = jobs.reduce((sum, j) => sum + (j.candidate_count || 0), 0) / jobs.length;
      const avgDaysOpen = jobs.reduce((sum, j) => sum + (j.days_since_opened || 0), 0) / jobs.length;
      const currency = jobs[0]?.salary_currency || 'USD';

      return {
        activeRoles: jobs.length,
        avgSalaryRange: { min: avgSalaryMin, max: avgSalaryMax, currency },
        avgCandidatesPerRole: Math.round(avgCandidates),
        avgDaysToFill: Math.round(avgDaysOpen),
        benchmarkDaysToFill: 42, // Estimated industry average — will be replaced by partner_benchmarks data
        demandTrend: avgCandidates > 5 ? 'high' : avgCandidates > 2 ? 'medium' : 'low', // Thresholds based on typical application volumes
      };
      } catch {
        return null;
      }
    },
    enabled: !!companyId,
    staleTime: 300000, // 5 min
  });

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en', { style: 'currency', currency: data.avgSalaryRange.currency, maximumFractionDigits: 0 }).format(val);

  const daysVsBenchmark = data.avgDaysToFill - data.benchmarkDaysToFill;
  const DaysIcon = daysVsBenchmark > 5 ? TrendingDown : daysVsBenchmark < -5 ? TrendingUp : Minus;
  const daysColor = daysVsBenchmark > 5 ? 'text-destructive' : daysVsBenchmark < -5 ? 'text-emerald-500' : 'text-muted-foreground';

  const demandColor = data.demandTrend === 'high' ? 'bg-emerald-500/10 text-emerald-500' : data.demandTrend === 'medium' ? 'bg-amber-500/10 text-amber-500' : 'bg-destructive/10 text-destructive';

  const insights = [
    {
      icon: DollarSign,
      label: t('marketIntel.avgSalaryRange', 'Avg. Salary Range'),
      value: `${formatCurrency(data.avgSalaryRange.min)} - ${formatCurrency(data.avgSalaryRange.max)}`,
      color: 'text-foreground',
    },
    {
      icon: Users,
      label: t('marketIntel.avgCandidates', 'Avg. Candidates/Role'),
      value: String(data.avgCandidatesPerRole),
      badge: { label: data.demandTrend, className: demandColor },
    },
    {
      icon: Clock,
      label: t('marketIntel.avgTimeToFill', 'Avg. Time to Fill'),
      value: t('marketIntel.days', '{{count}} days', { count: data.avgDaysToFill }),
      subValue: daysVsBenchmark !== 0
        ? `${daysVsBenchmark > 0 ? '+' : ''}${daysVsBenchmark}d ${t('marketIntel.vsBenchmark', 'vs est. avg')}`
        : t('marketIntel.onBenchmark', 'On est. avg'),
      subColor: daysColor,
      SubIcon: DaysIcon,
    },
    {
      icon: Globe,
      label: t('marketIntel.activeRoles', 'Active Roles'),
      value: String(data.activeRoles),
      color: 'text-primary',
    },
  ];

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Globe className="h-4 w-4 text-primary" />
          </div>
          {t('marketIntel.title', 'Your Hiring Metrics')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {insights.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-3 rounded-lg bg-muted/30 border border-border/50"
              >
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                  <Icon className="h-3 w-3" />
                  {item.label}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-semibold text-sm ${item.color || 'text-foreground'}`}>{item.value}</span>
                  {item.badge && (
                    <Badge variant="outline" className={`text-[10px] py-0 ${item.badge.className}`}>
                      {item.badge.label}
                    </Badge>
                  )}
                </div>
                {item.subValue && (
                  <div className={`flex items-center gap-1 text-xs mt-0.5 ${item.subColor}`}>
                    {item.SubIcon && <item.SubIcon className="h-3 w-3" />}
                    {item.subValue}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

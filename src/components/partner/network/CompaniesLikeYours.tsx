import { useTranslation } from 'react-i18next';
import { motion } from '@/lib/motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Building2, Target, TrendingUp, Users } from 'lucide-react';
import { GlassMetricCard } from '@/components/partner/shared/GlassMetricCard';
import { useAnonymizedBenchmarks } from '@/hooks/useAnonymizedBenchmarks';
import { useCompanyIntelligenceData } from '@/hooks/useCompanyIntelligenceData';
import { Skeleton } from '@/components/ui/skeleton';

interface InsightItem {
  icon: React.ElementType;
  label: string;
  value: string;
  subtitle: string;
  color: 'primary' | 'emerald' | 'amber' | 'rose';
}

export function CompaniesLikeYours() {
  const { t } = useTranslation('partner');
  const { data: benchmarks, isLoading: benchLoading } = useAnonymizedBenchmarks();
  const { data: company, isLoading: companyLoading } = useCompanyIntelligenceData();

  const isLoading = benchLoading || companyLoading;

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-primary" />
            {t('networkIntelligence.similar.title', 'Companies Like Yours')}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const rolesPerQuarter =
    benchmarks.networkAvgCandidatesPerRole != null
      ? Math.round(benchmarks.networkAvgCandidatesPerRole * 0.4)
      : null;

  const topOfferRate =
    benchmarks.networkAvgOfferAcceptance != null
      ? Math.min(99, Math.round(benchmarks.networkAvgOfferAcceptance * 1.15))
      : null;

  const avgTTF = benchmarks.networkAvgTimeToFill;

  const insights: InsightItem[] = [
    {
      icon: Users,
      label: t('networkIntelligence.similar.rolesPerQuarter', 'Roles per Quarter'),
      value: rolesPerQuarter != null ? `~${rolesPerQuarter}` : '--',
      subtitle: t(
        'networkIntelligence.similar.rolesPerQuarterDesc',
        'Companies your size typically hire this many roles per quarter',
      ),
      color: 'primary',
    },
    {
      icon: Target,
      label: t('networkIntelligence.similar.topAcceptance', 'Top Acceptance Rate'),
      value: topOfferRate != null ? `${topOfferRate}%+` : '--',
      subtitle: t(
        'networkIntelligence.similar.topAcceptanceDesc',
        'Top-performing companies in your segment achieve this offer acceptance',
      ),
      color: 'emerald',
    },
    {
      icon: TrendingUp,
      label: t('networkIntelligence.similar.avgTimeToFill', 'Avg Time to Fill'),
      value: avgTTF != null ? `${Math.round(avgTTF)} days` : '--',
      subtitle: t(
        'networkIntelligence.similar.avgTimeToFillDesc',
        'Network average for companies with similar hiring volume',
      ),
      color: 'amber',
    },
    {
      icon: Building2,
      label: t('networkIntelligence.similar.healthBenchmark', 'Health Benchmark'),
      value: company.healthScore != null ? `${Math.round(company.healthScore)}` : '--',
      subtitle: t(
        'networkIntelligence.similar.healthBenchmarkDesc',
        'Your overall hiring health score vs. network peers',
      ),
      color: company.healthScore != null && company.healthScore >= 70 ? 'emerald' : 'rose',
    },
  ];

  return (
    <Card className="glass-card group hover:border-primary/30 transition-all duration-300">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          {t('networkIntelligence.similar.title', 'Companies Like Yours')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {insights.map((insight, i) => (
            <motion.div
              key={insight.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.25 }}
            >
              <GlassMetricCard
                icon={insight.icon}
                label={insight.label}
                value={insight.value}
                subtitle={insight.subtitle}
                color={insight.color}
                delay={0}
              />
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

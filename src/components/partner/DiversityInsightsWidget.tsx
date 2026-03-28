import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRole } from '@/contexts/RoleContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Globe, Shuffle } from 'lucide-react';
import { motion } from '@/lib/motion';
import { Skeleton } from '@/components/ui/skeleton';

export function DiversityInsightsWidget() {
  const { t } = useTranslation('partner');
  const { companyId } = useRole();

  const { data, isLoading } = useQuery({
    queryKey: ['diversity-insights', companyId],
    queryFn: async () => {
      if (!companyId) return null;

      try {
      // Get applications with source info for this company's jobs
      const { data: applications } = await (supabase as any)
        .from('applications')
        .select(`
          id,
          source,
          stage,
          status,
          jobs!inner (company_id)
        `)
        .eq('jobs.company_id', companyId);

      if (!applications || applications.length === 0) return null;

      const total = applications.length;

      // Source diversity (how many distinct sources)
      const sources = new Set(applications.map((a: any) => a.source || 'direct'));
      const sourceDistribution: Record<string, number> = {};
      applications.forEach((a: any) => {
        const src = a.source || 'direct';
        sourceDistribution[src] = (sourceDistribution[src] || 0) + 1;
      });

      // Pipeline progression by stage
      const stageDistribution: Record<string, number> = {};
      applications.forEach((a: any) => {
        const stage = a.stage || 'applied';
        stageDistribution[stage] = (stageDistribution[stage] || 0) + 1;
      });

      // Calculate diversity index (Shannon index simplified)
      const proportions = Object.values(sourceDistribution).map(c => c / total);
      const shannonIndex = -proportions.reduce((sum, p) => sum + (p > 0 ? p * Math.log(p) : 0), 0);
      const maxShannon = Math.log(Math.max(sources.size, 1));
      const diversityScore = maxShannon > 0 ? Math.round((shannonIndex / maxShannon) * 100) : 0;

      // Conversion rates by stage
      const applied = total;
      const screened = Object.entries(stageDistribution)
        .filter(([k]) => !['applied', 'new', 'sourced'].includes(k))
        .reduce((s, [, v]) => s + v, 0);
      const interviewed = Object.entries(stageDistribution)
        .filter(([k]) => k.includes('interview'))
        .reduce((s, [, v]) => s + v, 0);
      const offered = (stageDistribution['offer'] || 0) + (stageDistribution['offer_sent'] || 0) + (stageDistribution['offer_accepted'] || 0);

      return {
        totalApplications: total,
        sourceCount: sources.size,
        diversityScore,
        sourceDistribution: Object.entries(sourceDistribution)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([source, count]) => ({ source, count, pct: Math.round((count / total) * 100) })),
        funnelStages: [
          { label: t('diversity.applied', 'Applied'), count: applied, pct: 100 },
          { label: t('diversity.screened', 'Screened'), count: screened, pct: Math.round((screened / applied) * 100) },
          { label: t('diversity.interviewed', 'Interviewed'), count: interviewed, pct: Math.round((interviewed / applied) * 100) },
          { label: t('diversity.offered', 'Offered'), count: offered, pct: Math.round((offered / applied) * 100) },
        ],
      };
      } catch {
        return null;
      }
    },
    enabled: !!companyId,
    staleTime: 300000,
  });

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-44" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const scoreColor = data.diversityScore >= 70 ? 'text-emerald-500' : data.diversityScore >= 40 ? 'text-amber-500' : 'text-destructive';
  const scoreBg = data.diversityScore >= 70 ? '[&>div]:bg-emerald-500' : data.diversityScore >= 40 ? '[&>div]:bg-amber-500' : '[&>div]:bg-destructive';

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Shuffle className="h-4 w-4 text-primary" />
          </div>
          {t('diversity.title', 'Source Diversity & Pipeline Funnel')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Diversity Score */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-lg bg-muted/30 border border-border/50"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Globe className="h-3 w-3" />
              {t('diversity.sourceDiversityScore', 'Source Diversity Score')}
            </span>
            <span className={`text-lg font-bold ${scoreColor}`}>{data.diversityScore}%</span>
          </div>
          <Progress value={data.diversityScore} className={`h-2 ${scoreBg}`} />
          <p className="text-xs text-muted-foreground mt-1.5">
            {t('diversity.sourceCountDesc', '{{count}} distinct candidate sources', { count: data.sourceCount })}
          </p>
        </motion.div>

        {/* Source Distribution */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {t('diversity.topSources', 'Top Sources')}
          </h4>
          <div className="space-y-1.5">
            {data.sourceDistribution.map((src, i) => (
              <motion.div
                key={src.source}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-2 text-sm"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="capitalize truncate">{src.source.replace(/_/g, ' ')}</span>
                    <span className="text-xs text-muted-foreground ml-2">{src.pct}%</span>
                  </div>
                  <Progress value={src.pct} className="h-1 mt-1 [&>div]:bg-primary" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Pipeline Funnel */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {t('diversity.pipelineFunnel', 'Pipeline Funnel')}
          </h4>
          <div className="space-y-1.5">
            {data.funnelStages.map((stage, i) => (
              <motion.div
                key={stage.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 text-sm"
              >
                <span className="w-24 text-xs text-muted-foreground truncate">{stage.label}</span>
                <div className="flex-1">
                  <Progress value={stage.pct} className="h-1.5 [&>div]:bg-primary" />
                </div>
                <span className="text-xs tabular-nums w-8 text-right">{stage.count}</span>
                <Badge variant="outline" className="text-[10px] py-0 w-10 justify-center">{stage.pct}%</Badge>
              </motion.div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

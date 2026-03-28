import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { TrendSparkline } from '@/components/partner/shared';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquareHeart, Smile, Meh, Frown, ClipboardList } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface NPSData {
  currentNPS: number;
  totalResponses: number;
  promoters: number;
  passives: number;
  detractors: number;
  trendData: number[];
  tableExists: boolean;
}

const NPS_DEFAULTS: NPSData = {
  currentNPS: 0,
  totalResponses: 0,
  promoters: 0,
  passives: 0,
  detractors: 0,
  trendData: [],
  tableExists: false,
};

function npsColor(nps: number): string {
  if (nps >= 50) return 'text-emerald-500';
  if (nps >= 20) return 'text-amber-500';
  return 'text-rose-500';
}

function npsLabel(nps: number, t: (key: string, fallback: string) => string): string {
  if (nps >= 50) return 'Excellent';
  if (nps >= 20) return 'Good';
  if (nps >= 0) return 'Fair';
  return 'Poor';
}

interface CandidateNPSTrackingProps {
  companyId: string;
}

export function CandidateNPSTracking({ companyId }: CandidateNPSTrackingProps) {
  const { t } = useTranslation('partner');

  const { data, isLoading } = useQuery({
    queryKey: ['candidate-nps', companyId],
    queryFn: async (): Promise<NPSData> => {
      try {
        // Attempt to query nps_surveys via the applications join
        // nps_surveys has application_id which links to applications which links to jobs
        const { data: jobs } = await supabase
          .from('jobs')
          .select('id')
          .eq('company_id', companyId);

        const jobIds = (jobs || []).map(j => j.id);
        if (jobIds.length === 0) return { ...NPS_DEFAULTS, tableExists: true };

        // Get applications for these jobs
        const { data: applications } = await supabase
          .from('applications')
          .select('id')
          .in('job_id', jobIds);

        const applicationIds = (applications || []).map(a => a.id);
        if (applicationIds.length === 0) return { ...NPS_DEFAULTS, tableExists: true };

        // Query NPS surveys for these applications
        const { data: surveys, error } = await (supabase as any)
          .from('nps_surveys')
          .select('nps_score, response_date, created_at')
          .in('application_id', applicationIds)
          .not('nps_score', 'is', null)
          .order('created_at', { ascending: true });

        if (error) {
          // Table may not exist in this environment
          if (error.code === '42P01' || error.message?.includes('does not exist')) {
            return NPS_DEFAULTS;
          }
          throw error;
        }

        if (!surveys || surveys.length === 0) {
          return { ...NPS_DEFAULTS, tableExists: true };
        }

        // Calculate NPS: promoters (9-10), passives (7-8), detractors (0-6)
        const total = surveys.length;
        const promoters = surveys.filter((s: any) => s.nps_score >= 9).length;
        const passives = surveys.filter((s: any) => s.nps_score >= 7 && s.nps_score < 9).length;
        const detractors = surveys.filter((s: any) => s.nps_score < 7).length;
        const currentNPS = Math.round(((promoters - detractors) / total) * 100);

        // Build trend data: group by month, compute rolling NPS
        const monthBuckets = new Map<string, { promoters: number; detractors: number; total: number }>();
        surveys.forEach((s: any) => {
          const date = s.response_date || s.created_at;
          if (!date) return;
          const month = date.substring(0, 7); // YYYY-MM
          const bucket = monthBuckets.get(month) || { promoters: 0, detractors: 0, total: 0 };
          bucket.total++;
          if (s.nps_score >= 9) bucket.promoters++;
          else if (s.nps_score < 7) bucket.detractors++;
          monthBuckets.set(month, bucket);
        });

        const trendData = Array.from(monthBuckets.values()).map(
          b => Math.round(((b.promoters - b.detractors) / b.total) * 100)
        );

        return {
          currentNPS,
          totalResponses: total,
          promoters,
          passives,
          detractors,
          trendData,
          tableExists: true,
        };
      } catch {
        return NPS_DEFAULTS;
      }
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5,
  });

  const nps = data || NPS_DEFAULTS;

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquareHeart className="h-4 w-4 text-primary" />
            {t('brandCenter.candidateNPS', 'Candidate NPS')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  // Empty state: table doesn't exist or no data
  if (!nps.tableExists) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquareHeart className="h-4 w-4 text-primary" />
            {t('brandCenter.candidateNPS', 'Candidate NPS')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-3">
            <div className="rounded-full bg-muted p-4 w-fit mx-auto">
              <ClipboardList className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold">
              {t('brandCenter.setupNPS', 'Set Up NPS Surveys')}
            </h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              {t(
                'brandCenter.setupNPSDescription',
                'Start collecting candidate satisfaction scores after interviews to track your employer brand health over time.'
              )}
            </p>
            <Button variant="outline" size="sm" disabled>
              {t('brandCenter.comingSoon', 'Coming Soon')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (nps.totalResponses === 0) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquareHeart className="h-4 w-4 text-primary" />
            {t('brandCenter.candidateNPS', 'Candidate NPS')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-2">
            <ClipboardList className="h-8 w-8 mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {t('brandCenter.noNPSData', 'No NPS responses yet. Scores will appear as candidates complete surveys.')}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const promoterPct = Math.round((nps.promoters / nps.totalResponses) * 100);
  const passivePct = Math.round((nps.passives / nps.totalResponses) * 100);
  const detractorPct = Math.round((nps.detractors / nps.totalResponses) * 100);

  return (
    <Card className="glass-card group hover:border-primary/30 transition-all duration-300">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <MessageSquareHeart className="h-4 w-4 text-primary" />
            </div>
            {t('brandCenter.candidateNPS', 'Candidate NPS')}
          </div>
          <span className="text-xs text-muted-foreground">
            {nps.totalResponses} {t('brandCenter.responses', 'responses')}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Big NPS number + label */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-baseline gap-3"
        >
          <span className={cn('text-4xl font-bold tabular-nums', npsColor(nps.currentNPS))}>
            {nps.currentNPS > 0 ? '+' : ''}{nps.currentNPS}
          </span>
          <span className={cn('text-sm font-medium', npsColor(nps.currentNPS))}>
            {npsLabel(nps.currentNPS, t)}
          </span>
        </motion.div>

        {/* Breakdown bar */}
        <div className="space-y-2">
          <div className="flex h-3 rounded-full overflow-hidden">
            {promoterPct > 0 && (
              <div
                className="bg-emerald-500 transition-all duration-500"
                style={{ width: `${promoterPct}%` }}
              />
            )}
            {passivePct > 0 && (
              <div
                className="bg-amber-400 transition-all duration-500"
                style={{ width: `${passivePct}%` }}
              />
            )}
            {detractorPct > 0 && (
              <div
                className="bg-rose-500 transition-all duration-500"
                style={{ width: `${detractorPct}%` }}
              />
            )}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Smile className="h-3 w-3 text-emerald-500" />
              {t('brandCenter.promoters', 'Promoters')} {promoterPct}%
            </span>
            <span className="flex items-center gap-1">
              <Meh className="h-3 w-3 text-amber-400" />
              {t('brandCenter.passives', 'Passives')} {passivePct}%
            </span>
            <span className="flex items-center gap-1">
              <Frown className="h-3 w-3 text-rose-500" />
              {t('brandCenter.detractors', 'Detractors')} {detractorPct}%
            </span>
          </div>
        </div>

        {/* Sparkline trend */}
        {nps.trendData.length >= 2 && (
          <div className="pt-2 space-y-1">
            <p className="text-xs text-muted-foreground">
              {t('brandCenter.npsTrend', 'NPS Trend (monthly)')}
            </p>
            <TrendSparkline
              data={nps.trendData}
              color={nps.currentNPS >= 20 ? 'emerald' : nps.currentNPS >= 0 ? 'amber' : 'rose'}
              height={36}
              width={260}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

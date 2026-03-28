import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from '@/lib/motion';
import { useRole } from '@/contexts/RoleContext';
import { useUnifiedCandidateTimeline } from '@/hooks/useUnifiedCandidateTimeline';
import { useCRIMetrics } from '@/hooks/useCRIMetrics';
import { UnifiedInteractionTimeline } from '@/components/partner/cri/UnifiedInteractionTimeline';
import { SentimentAnalysisPanel } from '@/components/partner/cri/SentimentAnalysisPanel';
import { OptimalOutreachTiming } from '@/components/partner/cri/OptimalOutreachTiming';
import { WarmReactivationAlerts } from '@/components/partner/cri/WarmReactivationAlerts';
import { EngagementHeatmap } from '@/components/partner/cri/EngagementHeatmap';
import { GlassMetricCard, ConfidenceBadge } from '@/components/partner/shared';
import { EmptyState } from '@/components/EmptyState';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Search,
  Brain,
  Activity,
  Heart,
  X,
  Loader2,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  name: string;
  avatarUrl: string | null;
  email: string | null;
}

export default function CRIDashboard() {
  const { t } = useTranslation('partner');
  const { companyId } = useRole();

  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [selectedCandidateName, setSelectedCandidateName] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);

  // ── Search ──────────────────────────────────────────────────────
  const { data: searchResults = [], isLoading: searchLoading } = useQuery({
    queryKey: ['cri-search', searchQuery, companyId],
    enabled: searchQuery.length >= 2 && !!companyId,
    staleTime: 10_000,
    queryFn: async (): Promise<SearchResult[]> => {
      try {
        // Search profiles that have applications with this company
        const { data: apps } = await (supabase as any)
          .from('applications')
          .select('candidate_id, jobs!inner(company_id)')
          .eq('jobs.company_id', companyId)
          .limit(200);

        if (!apps || apps.length === 0) return [];

        const candidateIds = [
          ...new Set((apps as any[]).map((a) => a.candidate_id)),
        ] as string[];

        const { data: profiles } = await (supabase as any)
          .from('profiles')
          .select('id, full_name, avatar_url, email')
          .in('id', candidateIds)
          .ilike('full_name', `%${searchQuery}%`)
          .limit(10);

        return (profiles || []).map((p: any) => ({
          id: p.id,
          name: p.full_name || 'Unknown',
          avatarUrl: p.avatar_url,
          email: p.email,
        }));
      } catch (err) {
        console.error('[CRIDashboard] Search error:', err);
        return [];
      }
    },
  });

  // ── CRI data for selected candidate ─────────────────────────────
  const { timeline, isLoading: timelineLoading } = useUnifiedCandidateTimeline(
    selectedCandidateId || undefined,
  );
  const criMetrics = useCRIMetrics(selectedCandidateId || undefined);

  const handleSelectCandidate = useCallback(
    (id: string, name?: string) => {
      setSelectedCandidateId(id);
      setSelectedCandidateName(name || '');
      setSearchQuery('');
      setShowResults(false);
    },
    [],
  );

  const handleClearSelection = useCallback(() => {
    setSelectedCandidateId(null);
    setSelectedCandidateName('');
  }, []);

  // ── Guard: no company ───────────────────────────────────────────
  if (!companyId) {
    return (
      <EmptyState
        icon={Brain}
        title={t('cri.noCompany', 'No company linked')}
        description={t(
          'cri.noCompanyDesc',
          'Candidate relationship intelligence will be available once your company profile is set up.',
        )}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            {t('cri.title', 'Candidate Relationship Intelligence')}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t('cri.subtitle', 'Deep insights into every candidate relationship')}
          </p>
        </div>
      </motion.div>

      {/* Search bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="relative"
      >
        <div className="relative max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
            placeholder={t('cri.searchPlaceholder', 'Search candidates by name...')}
            className="pl-9 pr-10 bg-card/30 backdrop-blur border-border/20"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => {
                setSearchQuery('');
                setShowResults(false);
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Search results dropdown */}
        <AnimatePresence>
          {showResults && searchQuery.length >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute z-50 mt-1 w-full max-w-lg bg-card border border-border/30 rounded-lg shadow-lg overflow-hidden"
            >
              {searchLoading ? (
                <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('cri.searching', 'Searching...')}
                </div>
              ) : searchResults.length === 0 ? (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  {t('cri.noResults', 'No candidates found')}
                </div>
              ) : (
                searchResults.map((r) => (
                  <button
                    key={r.id}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left"
                    onClick={() => handleSelectCandidate(r.id, r.name)}
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={r.avatarUrl || undefined} alt={r.name} />
                      <AvatarFallback className="text-[10px]">
                        {r.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{r.name}</p>
                      {r.email && (
                        <p className="text-[10px] text-muted-foreground truncate">
                          {r.email}
                        </p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Selected candidate header */}
      <AnimatePresence mode="wait">
        {selectedCandidateId && (
          <motion.div
            key="candidate-header"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-4 p-4 rounded-xl bg-card/30 backdrop-blur border border-border/20"
          >
            <Avatar className="h-10 w-10">
              <AvatarFallback>
                {selectedCandidateName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold truncate">
                  {selectedCandidateName || t('cri.candidate', 'Candidate')}
                </h3>
                <ConfidenceBadge
                  score={criMetrics.engagementScore}
                  label={`${criMetrics.engagementScore}% ${t('cri.engaged', 'engaged')}`}
                />
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  {t('cri.engagement', 'Engagement')}: {criMetrics.engagementScore}/100
                </span>
                <span className="flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  {t('cri.sentimentLabel', 'Sentiment')}: {criMetrics.currentSentiment}/100
                </span>
                {criMetrics.isWarmReactivation && (
                  <span className="text-amber-500 font-medium">
                    {t('cri.warmReactivation', 'Warm Reactivation')}
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0"
              onClick={handleClearSelection}
            >
              <X className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <AnimatePresence mode="wait">
        {selectedCandidateId ? (
          <motion.div
            key="candidate-detail"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Top metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <GlassMetricCard
                icon={Activity}
                label={t('cri.metrics.engagement', 'Engagement Score')}
                value={criMetrics.engagementScore}
                trend={
                  criMetrics.engagementScore >= 60
                    ? 'up'
                    : criMetrics.engagementScore >= 30
                    ? 'neutral'
                    : 'down'
                }
                color="primary"
                subtitle={t('cri.metrics.outOf100', 'out of 100')}
                delay={0}
              />
              <GlassMetricCard
                icon={Heart}
                label={t('cri.metrics.sentiment', 'Sentiment')}
                value={criMetrics.currentSentiment}
                trend={
                  criMetrics.sentimentDirection === 'warming'
                    ? 'up'
                    : criMetrics.sentimentDirection === 'cooling'
                    ? 'down'
                    : 'neutral'
                }
                trendLabel={
                  criMetrics.sentimentDirection === 'warming'
                    ? t('cri.sentiment.warmingUp', 'Warming up')
                    : criMetrics.sentimentDirection === 'cooling'
                    ? t('cri.sentiment.coolingDown', 'Cooling down')
                    : t('cri.sentiment.stable', 'Stable')
                }
                sparklineData={criMetrics.sentimentTrend.slice(-8).map((p) => p.value)}
                color={
                  criMetrics.currentSentiment >= 70
                    ? 'emerald'
                    : criMetrics.currentSentiment >= 40
                    ? 'amber'
                    : 'rose'
                }
                delay={0.05}
              />
              <GlassMetricCard
                icon={Search}
                label={t('cri.metrics.bestOutreach', 'Best Outreach Time')}
                value={criMetrics.optimalOutreach.label}
                color="muted"
                subtitle={t('cri.metrics.basedOnHistory', 'Based on response patterns')}
                delay={0.1}
              />
            </div>

            {/* Two-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
              {/* Left: Timeline */}
              <div className="glass-card p-5 rounded-xl bg-card/30 backdrop-blur border border-border/20">
                <h3 className="text-sm font-medium text-muted-foreground mb-4">
                  {t('cri.timeline.title', 'Interaction Timeline')}
                </h3>
                <UnifiedInteractionTimeline
                  timeline={timeline}
                  isLoading={timelineLoading}
                />
              </div>

              {/* Right: Sentiment + Outreach */}
              <div className="space-y-4">
                <SentimentAnalysisPanel
                  currentSentiment={criMetrics.currentSentiment}
                  sentimentTrend={criMetrics.sentimentTrend}
                  sentimentDirection={criMetrics.sentimentDirection}
                />
                <OptimalOutreachTiming
                  heatmap={criMetrics.optimalOutreach.heatmap}
                  bestTimeLabel={criMetrics.optimalOutreach.label}
                />
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="overview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Overview mode: heatmap + reactivation */}
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6">
              <EngagementHeatmap
                companyId={companyId}
                onSelectCandidate={(id) => handleSelectCandidate(id)}
              />
              <WarmReactivationAlerts
                companyId={companyId}
                onSelectCandidate={(id) => handleSelectCandidate(id)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

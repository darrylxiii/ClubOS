import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRole } from '@/contexts/RoleContext';
import { motion, AnimatePresence } from '@/lib/motion';
import { cn } from '@/lib/utils';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  BarChart3,
  ClipboardList,
  PlayCircle,
  StopCircle,
  ChevronRight,
  ArrowLeft,
  Gavel,
} from 'lucide-react';

import { useCalibrationSession, type VotingSession } from '@/hooks/useCalibrationSession';
import { CalibrationAnalytics } from '@/components/partner/committee/CalibrationAnalytics';
import { DecisionAuditTrail } from '@/components/partner/committee/DecisionAuditTrail';
import { CommitteeRosterPanel } from '@/components/partner/committee/CommitteeRosterPanel';
import { AggregatedScorecardView } from '@/components/scorecards/AggregatedScorecardView';
import { LiveVotingPanel } from '@/components/scorecards/LiveVotingPanel';

// ── Session detail view ─────────────────────────────────────────
function SessionDetail({
  session,
  onBack,
  onEnd,
  isEnding,
}: {
  session: VotingSession;
  onBack: () => void;
  onEnd: () => void;
  isEnding: boolean;
}) {
  const { t } = useTranslation('partner');
  const isActive = session.status === 'active';

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1"
          onClick={onBack}
          aria-label={t('committee.sessions.back', 'Back to sessions')}
        >
          <ArrowLeft className="h-4 w-4" />
          {t('committee.sessions.back', 'Back')}
        </Button>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold truncate">
            {session.candidate_name} — {session.job_title}
          </h3>
          <p className="text-xs text-muted-foreground">
            {isActive
              ? t('committee.sessions.statusActive', 'Voting in progress')
              : t('committee.sessions.statusCompleted', 'Session completed')}
          </p>
        </div>
        {isActive && (
          <Button
            variant="destructive"
            size="sm"
            className="gap-1 text-xs"
            onClick={onEnd}
            disabled={isEnding}
          >
            <StopCircle className="h-3.5 w-3.5" />
            {t('committee.sessions.endSession', 'End Session')}
          </Button>
        )}
      </div>

      {/* Main content: scorecards + roster side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <AggregatedScorecardView applicationId={session.application_id} />
          <LiveVotingPanel applicationId={session.application_id} />
        </div>
        <div>
          <div className="glass-card p-4 rounded-xl">
            <CommitteeRosterPanel
              jobId=""
              applicationId={session.application_id}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Session list ────────────────────────────────────────────────
function SessionList({
  sessions,
  isLoading,
  onSelect,
}: {
  sessions: VotingSession[];
  isLoading: boolean;
  onSelect: (session: VotingSession) => void;
}) {
  const { t } = useTranslation('partner');

  if (isLoading) {
    return (
      <div className="space-y-3" role="status" aria-label={t('committee.sessions.loading', 'Loading sessions')}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center" role="status">
        <Gavel className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">
          {t('committee.sessions.emptyTitle', 'No active voting sessions')}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1 max-w-sm">
          {t(
            'committee.sessions.emptyDesc',
            'Voting sessions are created when a candidate reaches the committee review stage. Check back soon.'
          )}
        </p>
      </div>
    );
  }

  const active = sessions.filter(s => s.status === 'active');
  const completed = sessions.filter(s => s.status !== 'active');

  return (
    <div className="space-y-6">
      {/* Active sessions */}
      {active.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <PlayCircle className="h-3.5 w-3.5 text-emerald-500" />
            {t('committee.sessions.activeHeader', 'Active Sessions')}
            <Badge variant="secondary" className="text-[10px] ml-1">{active.length}</Badge>
          </h3>
          {active.map((session, i) => (
            <SessionCard key={session.id} session={session} index={i} onSelect={onSelect} />
          ))}
        </div>
      )}

      {/* Completed sessions */}
      {completed.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('committee.sessions.completedHeader', 'Past Sessions')}
          </h3>
          {completed.map((session, i) => (
            <SessionCard key={session.id} session={session} index={i + active.length} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

function SessionCard({
  session,
  index,
  onSelect,
}: {
  session: VotingSession;
  index: number;
  onSelect: (s: VotingSession) => void;
}) {
  const { t } = useTranslation('partner');
  const isActive = session.status === 'active';

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
      onClick={() => onSelect(session)}
      className={cn(
        'w-full flex items-center gap-4 p-4 rounded-xl text-left transition-colors',
        'glass-card hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
      )}
      aria-label={t('committee.sessions.openSession', 'Open session for {{candidate}}', {
        candidate: session.candidate_name,
      })}
    >
      {/* Status dot */}
      <div className={cn(
        'h-2.5 w-2.5 rounded-full shrink-0',
        isActive ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/30',
      )} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{session.candidate_name}</p>
        <p className="text-xs text-muted-foreground truncate">{session.job_title}</p>
      </div>

      {/* Status badge */}
      <Badge
        variant={isActive ? 'default' : 'outline'}
        className={cn('text-[10px] shrink-0', isActive && 'bg-emerald-500/90')}
      >
        {isActive
          ? t('committee.sessions.active', 'Active')
          : t('committee.sessions.completed', 'Completed')}
      </Badge>

      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </motion.button>
  );
}

// ── Empty company guard ─────────────────────────────────────────
function EmptyCompanyState() {
  const { t } = useTranslation('partner');
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center" role="alert">
      <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
      <p className="text-base font-medium text-muted-foreground">
        {t('committee.noCompany', 'No company context found')}
      </p>
      <p className="text-sm text-muted-foreground/70 mt-1">
        {t('committee.noCompanyDesc', 'Please make sure you are associated with a company to access the Hiring Committee.')}
      </p>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────
export default function HiringCommittee() {
  const { t } = useTranslation('partner');
  const { companyId } = useRole();
  const [selectedSession, setSelectedSession] = useState<VotingSession | null>(null);

  const {
    sessions,
    calibrationData,
    isLoading,
    endSession,
  } = useCalibrationSession(companyId);

  if (!companyId) return <EmptyCompanyState />;

  const activeCount = sessions.filter(s => s.status === 'active').length;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <Gavel className="h-5 w-5 text-primary" />
          {t('committee.title', 'Hiring Committee')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t('committee.subtitle', 'Collaborative hiring decisions, calibration, and audit trails')}
        </p>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="sessions" className="space-y-6">
        <TabsList className="h-auto inline-flex bg-card/30 backdrop-blur-sm border border-border/20 rounded-lg p-1">
          <TabsTrigger value="sessions" className="gap-1.5 text-xs sm:text-sm">
            <Users className="h-3.5 w-3.5" />
            {t('committee.tabs.sessions', 'Active Sessions')}
            {activeCount > 0 && (
              <Badge variant="secondary" className="text-[10px] ml-1 h-5 min-w-[20px]">{activeCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="calibration" className="gap-1.5 text-xs sm:text-sm">
            <BarChart3 className="h-3.5 w-3.5" />
            {t('committee.tabs.calibration', 'Calibration')}
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5 text-xs sm:text-sm">
            <ClipboardList className="h-3.5 w-3.5" />
            {t('committee.tabs.audit', 'Audit Trail')}
          </TabsTrigger>
        </TabsList>

        {/* Sessions tab */}
        <TabsContent value="sessions" className="mt-0">
          <AnimatePresence mode="wait">
            {selectedSession ? (
              <SessionDetail
                key={selectedSession.id}
                session={selectedSession}
                onBack={() => setSelectedSession(null)}
                onEnd={() => {
                  endSession.mutate(selectedSession.id, {
                    onSuccess: () => setSelectedSession(null),
                  });
                }}
                isEnding={endSession.isPending}
              />
            ) : (
              <SessionList
                key="list"
                sessions={sessions}
                isLoading={isLoading}
                onSelect={setSelectedSession}
              />
            )}
          </AnimatePresence>
        </TabsContent>

        {/* Calibration tab */}
        <TabsContent value="calibration" className="mt-0">
          <CalibrationAnalytics data={calibrationData} isLoading={isLoading} />
        </TabsContent>

        {/* Audit trail tab */}
        <TabsContent value="audit" className="mt-0">
          <DecisionAuditTrail companyId={companyId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

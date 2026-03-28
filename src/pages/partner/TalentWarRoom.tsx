import { useTranslation } from 'react-i18next';
import { useRole } from '@/contexts/RoleContext';
import { useTalentWarRoom } from '@/hooks/useTalentWarRoom';
import { GlassMetricCard } from '@/components/partner/shared';
import { LivePulseIndicator } from '@/components/partner/warroom/LivePulseIndicator';
import { ThreatRadar } from '@/components/partner/warroom/ThreatRadar';
import { CompetitorHiringTracker } from '@/components/partner/warroom/CompetitorHiringTracker';
import { FlightRiskRadar } from '@/components/partner/warroom/FlightRiskRadar';
import { SalaryMovementTicker } from '@/components/partner/warroom/SalaryMovementTicker';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from '@/lib/motion';
import { Swords, Users, AlertTriangle, DollarSign, Shield } from 'lucide-react';

// ── Skeleton ───────────────────────────────────────────────────────

function WarRoomSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading war room">
      {/* Top bar skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>

      {/* Metric cards skeleton */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 rounded-xl bg-card/20 backdrop-blur border border-border/20">
            <div className="flex items-center gap-2 mb-3">
              <Skeleton className="h-7 w-7 rounded-lg" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="p-5 rounded-xl bg-card/20 backdrop-blur border border-border/20 h-64">
            <Skeleton className="h-4 w-40 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </div>
          <div className="p-5 rounded-xl bg-card/20 backdrop-blur border border-border/20 h-48">
            <Skeleton className="h-4 w-36 mb-4" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          </div>
        </div>
        <div className="p-5 rounded-xl bg-card/20 backdrop-blur border border-border/20 h-[480px]">
          <Skeleton className="h-4 w-36 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────

export default function TalentWarRoom() {
  const { t } = useTranslation('partner');
  const { companyId } = useRole();
  const {
    competitors,
    flightRisks,
    salaryMovements,
    threatLevel,
    competitorCount,
    flightRiskCount,
    avgSalaryPressure,
    isLoading,
    isError,
    lastUpdated,
  } = useTalentWarRoom();

  // Guard: no company
  if (!companyId) {
    return (
      <EmptyState
        icon={Swords}
        title={t('warRoom.noCompany', 'No company associated')}
        description={t(
          'warRoom.noCompanyDesc',
          'Please ensure your account is linked to a company to access the Talent War Room.'
        )}
      />
    );
  }

  // Loading
  if (isLoading) {
    return <WarRoomSkeleton />;
  }

  // Error
  if (isError) {
    return (
      <EmptyState
        icon={Swords}
        title={t('warRoom.error', 'Unable to load war room')}
        description={t(
          'warRoom.errorDesc',
          'There was a problem loading intelligence data. Please try again later.'
        )}
      />
    );
  }

  const highRiskCount = flightRisks.filter((r) => r.riskScore >= 75).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
      role="main"
      aria-label={t('warRoom.title', 'Talent War Room')}
    >
      {/* ── Top bar: live indicator + title ──────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Swords className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-sm font-semibold">
              {t('warRoom.heading', 'Talent War Room')}
            </h2>
            <p className="text-[10px] text-muted-foreground">
              {t('warRoom.subtitle', 'Live command center for hiring intelligence')}
            </p>
          </div>
        </div>
        <LivePulseIndicator lastUpdated={lastUpdated} />
      </div>

      {/* ── Key metrics row ──────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <GlassMetricCard
          icon={Shield}
          label={t('warRoom.metrics.threatLevel', 'Threat Level')}
          value={t(`warRoom.threatRadar.levels.${threatLevel}`, threatLevel.charAt(0).toUpperCase() + threatLevel.slice(1))}
          color={
            threatLevel === 'critical' || threatLevel === 'high'
              ? 'rose'
              : threatLevel === 'medium'
                ? 'amber'
                : 'emerald'
          }
          delay={0}
          className="bg-card/20"
        />
        <GlassMetricCard
          icon={Users}
          label={t('warRoom.metrics.competitors', 'Competitor Roles')}
          value={competitorCount}
          color={competitorCount >= 5 ? 'rose' : competitorCount >= 2 ? 'amber' : 'emerald'}
          subtitle={t('warRoom.metrics.overlapping', 'overlapping roles')}
          delay={0.05}
          className="bg-card/20"
        />
        <GlassMetricCard
          icon={AlertTriangle}
          label={t('warRoom.metrics.flightRisks', 'Flight Risks')}
          value={flightRiskCount}
          color={highRiskCount > 0 ? 'rose' : flightRiskCount > 0 ? 'amber' : 'emerald'}
          subtitle={
            highRiskCount > 0
              ? t('warRoom.metrics.highRisk', '{{count}} critical', { count: highRiskCount })
              : t('warRoom.metrics.monitored', 'monitored')
          }
          delay={0.1}
          className="bg-card/20"
        />
        <GlassMetricCard
          icon={DollarSign}
          label={t('warRoom.metrics.salaryPressure', 'Salary Pressure')}
          value={`${avgSalaryPressure > 0 ? '+' : ''}${avgSalaryPressure}%`}
          color={Math.abs(avgSalaryPressure) >= 5 ? 'rose' : Math.abs(avgSalaryPressure) >= 2 ? 'amber' : 'emerald'}
          trend={avgSalaryPressure > 1 ? 'up' : avgSalaryPressure < -1 ? 'down' : 'neutral'}
          delay={0.15}
          className="bg-card/20"
        />
      </div>

      {/* ── Threat Radar (full-width) ────────────────────────────── */}
      <ThreatRadar
        threatLevel={threatLevel}
        competitorCount={competitorCount}
        flightRiskCount={flightRiskCount}
        avgSalaryPressure={avgSalaryPressure}
      />

      {/* ── Main content: two-column layout ──────────────────────── */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Left column: competitors + salary */}
        <div className="space-y-4">
          <CompetitorHiringTracker
            competitors={competitors}
            threatLevel={threatLevel}
          />
          <SalaryMovementTicker movements={salaryMovements} />
        </div>

        {/* Right column: flight risk radar */}
        <FlightRiskRadar flightRisks={flightRisks} />
      </div>
    </motion.div>
  );
}

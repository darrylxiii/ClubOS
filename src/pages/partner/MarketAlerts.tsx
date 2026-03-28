import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from '@/lib/motion';
import { useRole } from '@/contexts/RoleContext';
import { Bell, AlertTriangle, CalendarDays, Settings } from 'lucide-react';
import { GlassMetricCard } from '@/components/partner/shared/GlassMetricCard';
import { MarketAlertsFeed } from '@/components/partner/alerts/MarketAlertsFeed';
import { AlertPreferencesDialog } from '@/components/partner/alerts/AlertPreferencesDialog';
import { EmptyState } from '@/components/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useMarketAlerts } from '@/hooks/useMarketAlerts';

// ── Loading skeleton ─────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}

// ── Page component ───────────────────────────────────────────────

export default function MarketAlerts() {
  const { t } = useTranslation('partner');
  const { companyId } = useRole();
  const [prefsOpen, setPrefsOpen] = useState(false);

  const {
    alerts,
    preferences,
    dismiss,
    snooze,
    updatePreferences,
    isLoading,
    isError,
    criticalCount,
    thisWeekCount,
  } = useMarketAlerts(companyId);

  // ── No company ─────────────────────────────────────────────────
  if (!companyId) {
    return (
      <EmptyState
        icon={Bell}
        title={t('marketAlerts.noCompany.title', 'No Company Selected')}
        description={t(
          'marketAlerts.noCompany.description',
          'Select a company to view talent market alerts.',
        )}
      />
    );
  }

  // ── Loading ────────────────────────────────────────────────────
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // ── Error ──────────────────────────────────────────────────────
  if (isError) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title={t('marketAlerts.error.title', 'Unable to Load Alerts')}
        description={t(
          'marketAlerts.error.description',
          'Something went wrong loading market alerts. Please try again later.',
        )}
      />
    );
  }

  // ── Handlers ───────────────────────────────────────────────────
  const handleDismiss = (id: string) => dismiss.mutate(id);
  const handleSnooze = (id: string) => snooze.mutate({ alertId: id });

  return (
    <div className="space-y-6">
      {/* ── Header row with settings gear ───────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            {t('marketAlerts.title', 'Talent Market Alerts')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('marketAlerts.subtitle', 'Real-time signals on competitor moves, layoffs, and pipeline health')}
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          className="shrink-0"
          onClick={() => setPrefsOpen(true)}
          aria-label={t('marketAlerts.prefs.title', 'Alert Preferences')}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {/* ── Metric cards ────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <GlassMetricCard
          icon={Bell}
          label={t('marketAlerts.cards.active', 'Active Alerts')}
          value={alerts.length}
          color="primary"
          delay={0}
        />
        <GlassMetricCard
          icon={AlertTriangle}
          label={t('marketAlerts.cards.critical', 'Critical')}
          value={criticalCount}
          color={criticalCount > 0 ? 'rose' : 'muted'}
          delay={0.05}
        />
        <GlassMetricCard
          icon={CalendarDays}
          label={t('marketAlerts.cards.thisWeek', 'This Week')}
          value={thisWeekCount}
          color="amber"
          delay={0.1}
        />
      </motion.div>

      {/* ── Feed ────────────────────────────────────────────────── */}
      <MarketAlertsFeed
        alerts={alerts}
        onDismiss={handleDismiss}
        onSnooze={handleSnooze}
      />

      {/* ── Preferences dialog ──────────────────────────────────── */}
      <AlertPreferencesDialog
        open={prefsOpen}
        onOpenChange={setPrefsOpen}
        preferences={preferences}
        onSave={updatePreferences}
      />
    </div>
  );
}

import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from '@/lib/motion';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  Clock,
  Activity,
  Target,
  TrendingUp,
  Briefcase,
  type LucideIcon,
} from 'lucide-react';
import type { BriefingSectionId } from './BriefingSectionSelector';
import type { PartnerBriefingData } from '@/hooks/usePartnerBriefingData';

// ── Types ──────────────────────────────────────────────────────────
interface BriefingPreviewProps {
  data: PartnerBriefingData;
  selected: Set<BriefingSectionId>;
  className?: string;
}

interface MetricItem {
  label: string;
  value: string | number;
}

// ── Helpers ────────────────────────────────────────────────────────
function fmt(val: number | null | undefined, suffix = ''): string {
  if (val === null || val === undefined) return 'N/A';
  return `${val}${suffix}`;
}

function fmtPct(val: number | null | undefined): string {
  if (val === null || val === undefined) return 'N/A';
  return `${Math.round(val)}%`;
}

// ── Section card wrapper ───────────────────────────────────────────
function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="bg-white dark:bg-card rounded-lg border border-border/30 p-5 space-y-4"
    >
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
          {title}
        </h3>
      </div>
      {children}
    </motion.div>
  );
}

function MetricsGrid({ items }: { items: MetricItem[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {items.map((m) => (
        <div
          key={m.label}
          className="p-3 rounded-md bg-muted/30 border border-border/10 text-center"
        >
          <p className="text-lg font-bold tabular-nums text-foreground">{m.value}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{m.label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Main Preview ───────────────────────────────────────────────────
export function BriefingPreview({ data, selected, className }: BriefingPreviewProps) {
  const { t } = useTranslation('partner');
  const { currentMetrics: m, quarterlyTrends, pipelineSummary, openRoles } = data;

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Nothing selected
  if (selected.size === 0) {
    return (
      <div className={cn('flex items-center justify-center py-20 text-muted-foreground text-sm', className)}>
        {t('briefing.selectSections', 'Select sections from the left panel to preview your briefing.')}
      </div>
    );
  }

  return (
    <div className={cn('space-y-5', className)}>
      {/* Document header */}
      <div className="text-center pb-4 border-b border-border/30">
        <h2 className="text-lg font-bold text-foreground">
          {t('briefing.documentTitle', 'Executive Hiring Briefing')}
        </h2>
        <p className="text-xs text-muted-foreground mt-1">{today}</p>
      </div>

      <AnimatePresence mode="popLayout">
        {/* 1 - Hiring Progress */}
        {selected.has('hiring-progress') && (
          <SectionCard
            key="hiring-progress"
            icon={BarChart3}
            title={t('briefing.sections.hiringProgress', 'Hiring Progress')}
          >
            <MetricsGrid
              items={[
                { label: t('briefing.metric.totalApplications', 'Total Applications'), value: m.totalApplications },
                { label: t('briefing.metric.totalHires', 'Total Hires'), value: m.totalHires },
                { label: t('briefing.metric.activeJobs', 'Active Jobs'), value: m.activeJobs },
              ]}
            />
          </SectionCard>
        )}

        {/* 2 - Time & Cost */}
        {selected.has('time-cost') && (
          <SectionCard
            key="time-cost"
            icon={Clock}
            title={t('briefing.sections.timeCost', 'Time & Cost Metrics')}
          >
            <MetricsGrid
              items={[
                {
                  label: t('briefing.metric.avgTimeToHire', 'Avg Time to Hire'),
                  value: fmt(m.avgTimeToHire, ' days'),
                },
                {
                  label: t('briefing.metric.offerAcceptance', 'Offer Acceptance Rate'),
                  value: fmtPct(m.offerAcceptanceRate),
                },
              ]}
            />
          </SectionCard>
        )}

        {/* 3 - Pipeline Health */}
        {selected.has('pipeline-health') && (
          <SectionCard
            key="pipeline-health"
            icon={Activity}
            title={t('briefing.sections.pipelineHealth', 'Pipeline Health')}
          >
            {pipelineSummary.length > 0 ? (
              <div className="space-y-2">
                {pipelineSummary.map((s) => (
                  <div
                    key={s.stage}
                    className="flex items-center justify-between p-2.5 rounded-md bg-muted/20 border border-border/10"
                  >
                    <span className="text-sm capitalize text-foreground">
                      {s.stage.replace(/_/g, ' ')}
                    </span>
                    <span className="text-sm font-semibold tabular-nums">{s.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t('briefing.noPipelineData', 'No pipeline data available.')}
              </p>
            )}
          </SectionCard>
        )}

        {/* 4 - Benchmarks */}
        {selected.has('benchmarks') && (
          <SectionCard
            key="benchmarks"
            icon={Target}
            title={t('briefing.sections.benchmarks', 'Benchmarks')}
          >
            <MetricsGrid
              items={[
                {
                  label: t('briefing.metric.benchmarkTTF', 'Network Avg Time-to-Fill'),
                  value: fmt(m.benchmarkTimeToFill, ' days'),
                },
                {
                  label: t('briefing.metric.benchmarkOffer', 'Network Offer Acceptance'),
                  value: fmtPct(m.benchmarkOfferAcceptance),
                },
                {
                  label: t('briefing.metric.benchmarkCPR', 'Avg Candidates / Role'),
                  value: fmt(m.benchmarkCandidatesPerRole),
                },
              ]}
            />
            <p className="text-xs text-muted-foreground">
              {t('briefing.benchmarkNote', 'Benchmarks are anonymized averages across the ClubOS partner network.')}
            </p>
          </SectionCard>
        )}

        {/* 5 - Quarterly Trends */}
        {selected.has('quarterly-trends') && (
          <SectionCard
            key="quarterly-trends"
            icon={TrendingUp}
            title={t('briefing.sections.quarterlyTrends', 'Quarterly Trends')}
          >
            {quarterlyTrends.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border/20">
                      <th className="pb-2 font-medium">{t('briefing.table.quarter', 'Quarter')}</th>
                      <th className="pb-2 font-medium text-right">{t('briefing.table.applications', 'Applications')}</th>
                      <th className="pb-2 font-medium text-right">{t('briefing.table.hires', 'Hires')}</th>
                      <th className="pb-2 font-medium text-right">{t('briefing.table.ttf', 'TTF (days)')}</th>
                      <th className="pb-2 font-medium text-right">{t('briefing.table.offerRate', 'Offer %')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quarterlyTrends.map((q) => (
                      <tr key={q.quarter} className="border-b border-border/10 last:border-0">
                        <td className="py-2 font-medium">{q.quarter}</td>
                        <td className="py-2 text-right tabular-nums">{q.totalApplications}</td>
                        <td className="py-2 text-right tabular-nums">{q.totalHires}</td>
                        <td className="py-2 text-right tabular-nums">{fmt(q.avgTimeToHire)}</td>
                        <td className="py-2 text-right tabular-nums">{fmtPct(q.offerAcceptanceRate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t('briefing.noTrendData', 'No quarterly trend data available yet.')}
              </p>
            )}
          </SectionCard>
        )}

        {/* 6 - Open Roles */}
        {selected.has('open-roles') && (
          <SectionCard
            key="open-roles"
            icon={Briefcase}
            title={t('briefing.sections.openRoles', 'Open Roles Summary')}
          >
            {openRoles.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border/20">
                      <th className="pb-2 font-medium">{t('briefing.table.role', 'Role')}</th>
                      <th className="pb-2 font-medium text-right">{t('briefing.table.applicants', 'Applicants')}</th>
                      <th className="pb-2 font-medium text-right">{t('briefing.table.daysOpen', 'Days Open')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openRoles.map((r) => (
                      <tr key={r.id} className="border-b border-border/10 last:border-0">
                        <td className="py-2 font-medium truncate max-w-[200px]">{r.title}</td>
                        <td className="py-2 text-right tabular-nums">{r.applicationCount}</td>
                        <td className="py-2 text-right tabular-nums">{r.daysSincePosted}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t('briefing.noOpenRoles', 'No open roles at this time.')}
              </p>
            )}
          </SectionCard>
        )}
      </AnimatePresence>
    </div>
  );
}

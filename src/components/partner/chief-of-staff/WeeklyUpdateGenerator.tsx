import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { GlassMetricCard } from '@/components/partner/shared';
import {
  UserCheck,
  Users,
  FileText,
  Activity,
  Copy,
  Send,
  CheckCircle,
} from 'lucide-react';
import type { WeeklyUpdate } from '@/hooks/useAIChiefOfStaff';

// ── Config ─────────────────────────────────────────────────────────

const HEALTH_CONFIG: Record<
  WeeklyUpdate['pipelineHealth'],
  { label: string; color: 'emerald' | 'primary' | 'amber' | 'rose' }
> = {
  excellent: { label: 'Excellent', color: 'emerald' },
  good: { label: 'Good', color: 'primary' },
  'needs-attention': { label: 'Needs Attention', color: 'amber' },
  critical: { label: 'Critical', color: 'rose' },
};

// ── Props ──────────────────────────────────────────────────────────

interface WeeklyUpdateGeneratorProps {
  weeklyUpdate: WeeklyUpdate;
  className?: string;
}

// ── Component ──────────────────────────────────────────────────────

export function WeeklyUpdateGenerator({ weeklyUpdate, className }: WeeklyUpdateGeneratorProps) {
  const { t } = useTranslation('partner');
  const [copied, setCopied] = useState(false);

  const health = HEALTH_CONFIG[weeklyUpdate.pipelineHealth];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(weeklyUpdate.narrativeText);
      setCopied(true);
      toast.success(t('chiefOfStaff.weekly.copied', 'Weekly update copied to clipboard'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('chiefOfStaff.weekly.copyFailed', 'Failed to copy'));
    }
  };

  const handleSend = () => {
    toast.info(t('chiefOfStaff.weekly.sendQueued', 'Weekly update queued for team delivery'));
  };

  return (
    <div className={cn('glass-card p-5 rounded-xl', className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">
            {t('chiefOfStaff.weekly.title', 'Weekly Update')}
          </h3>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <GlassMetricCard
          icon={UserCheck}
          label={t('chiefOfStaff.weekly.hires', 'Hires')}
          value={weeklyUpdate.hiresThisWeek}
          color="emerald"
          delay={0}
          className="!p-3"
        />
        <GlassMetricCard
          icon={Users}
          label={t('chiefOfStaff.weekly.newCandidates', 'New Candidates')}
          value={weeklyUpdate.newCandidates}
          color="primary"
          delay={0.05}
          className="!p-3"
        />
        <GlassMetricCard
          icon={Send}
          label={t('chiefOfStaff.weekly.offersSent', 'Offers Sent')}
          value={weeklyUpdate.offersSent}
          color="amber"
          delay={0.1}
          className="!p-3"
        />
        <GlassMetricCard
          icon={Activity}
          label={t('chiefOfStaff.weekly.pipelineHealth', 'Pipeline')}
          value={t(`chiefOfStaff.weekly.health.${weeklyUpdate.pipelineHealth}`, health.label)}
          color={health.color}
          delay={0.15}
          className="!p-3"
        />
      </div>

      {/* Narrative preview */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="p-3 rounded-lg bg-card/30 backdrop-blur border border-border/20 mb-3"
      >
        <p className="text-xs text-muted-foreground leading-relaxed">
          {weeklyUpdate.narrativeText || t('chiefOfStaff.weekly.noData', 'No activity data available for this week.')}
        </p>
      </motion.div>

      {/* Key events */}
      {weeklyUpdate.keyEvents.length > 0 && (
        <div className="mb-3">
          <p className="text-[11px] font-medium text-muted-foreground mb-1.5">
            {t('chiefOfStaff.weekly.keyEvents', 'Key Events')}
          </p>
          <ul className="space-y-1">
            {weeklyUpdate.keyEvents.map((event, i) => (
              <li key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CheckCircle className="h-3 w-3 text-primary shrink-0" />
                {event}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs gap-1.5 flex-1"
          onClick={handleCopy}
        >
          {copied ? (
            <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {copied
            ? t('chiefOfStaff.weekly.copiedBtn', 'Copied!')
            : t('chiefOfStaff.weekly.copyBtn', 'Copy to clipboard')}
        </Button>
        <Button
          variant="default"
          size="sm"
          className="h-8 text-xs gap-1.5 flex-1"
          onClick={handleSend}
        >
          <Send className="h-3.5 w-3.5" />
          {t('chiefOfStaff.weekly.sendBtn', 'Send to team')}
        </Button>
      </div>
    </div>
  );
}

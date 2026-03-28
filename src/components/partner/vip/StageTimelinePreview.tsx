import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  FileText,
  Search,
  UserCheck,
  Gift,
  PartyPopper,
  Bell,
  BellOff,
  GitBranch,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface StageConfig {
  key: string;
  label: string;
  icon: LucideIcon;
  color: string;
}

const DEFAULT_STAGES: StageConfig[] = [
  { key: 'applied', label: 'Applied', icon: FileText, color: 'text-blue-500 bg-blue-500/10' },
  { key: 'screening', label: 'Screening', icon: Search, color: 'text-violet-500 bg-violet-500/10' },
  { key: 'interview', label: 'Interview', icon: UserCheck, color: 'text-amber-500 bg-amber-500/10' },
  { key: 'offer', label: 'Offer', icon: Gift, color: 'text-emerald-500 bg-emerald-500/10' },
  { key: 'hired', label: 'Hired', icon: PartyPopper, color: 'text-primary bg-primary/10' },
];

interface StageTimelinePreviewProps {
  companyId: string;
  initialNotifications: Record<string, boolean>;
  className?: string;
}

export function StageTimelinePreview({
  companyId,
  initialNotifications,
  className,
}: StageTimelinePreviewProps) {
  const { t } = useTranslation('partner');
  const [notifications, setNotifications] = useState<Record<string, boolean>>(() => {
    const defaults: Record<string, boolean> = {};
    DEFAULT_STAGES.forEach((s) => {
      defaults[s.key] = initialNotifications[s.key] ?? true;
    });
    return defaults;
  });

  const handleToggle = async (stageKey: string, enabled: boolean) => {
    const updated = { ...notifications, [stageKey]: enabled };
    setNotifications(updated);

    try {
      // Persist stage notification preferences to company metadata
      const { data: company } = await supabase
        .from('companies')
        .select('metadata')
        .eq('id', companyId)
        .maybeSingle();

      const existingMetadata = (company?.metadata ?? {}) as Record<string, unknown>;
      const { error } = await supabase
        .from('companies')
        .update({
          metadata: { ...existingMetadata, stage_notifications: updated },
        })
        .eq('id', companyId);

      if (error) throw error;
    } catch (err) {
      console.error('Error updating stage notifications:', err);
      // Revert on failure
      setNotifications((prev) => ({ ...prev, [stageKey]: !enabled }));
      toast.error(t('vip.stageTimeline.updateError', 'Failed to update notification setting'));
    }
  };

  const enabledCount = Object.values(notifications).filter(Boolean).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'glass-card rounded-xl border border-border/20 p-5 space-y-4',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <GitBranch className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-semibold">
            {t('vip.stageTimeline.title', 'Candidate Stage Timeline')}
          </span>
        </div>
        <Badge variant="outline" className="text-xs">
          {enabledCount}/{DEFAULT_STAGES.length} {t('vip.stageTimeline.active', 'active')}
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground">
        {t(
          'vip.stageTimeline.description',
          'Toggle real-time notifications candidates receive at each stage.',
        )}
      </p>

      {/* Visual pipeline */}
      <div className="relative">
        {/* Connecting line */}
        <div className="absolute top-5 left-5 right-5 h-px bg-border/40 z-0" />

        <div className="flex justify-between relative z-10">
          {DEFAULT_STAGES.map((stage, idx) => {
            const Icon = stage.icon;
            const isEnabled = notifications[stage.key] ?? true;
            const colorParts = stage.color.split(' ');

            return (
              <motion.div
                key={stage.key}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05, duration: 0.25 }}
                className="flex flex-col items-center gap-1.5"
              >
                {/* Stage icon bubble */}
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors',
                    isEnabled
                      ? cn(colorParts[1], 'border-current')
                      : 'bg-muted/30 border-border/30 text-muted-foreground',
                  )}
                >
                  <Icon
                    className={cn(
                      'h-4 w-4',
                      isEnabled ? colorParts[0] : 'text-muted-foreground',
                    )}
                  />
                </div>

                {/* Stage label */}
                <span
                  className={cn(
                    'text-[10px] font-medium',
                    isEnabled ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {stage.label}
                </span>

                {/* Notification indicator */}
                <div className="flex items-center gap-1">
                  {isEnabled ? (
                    <Bell className="h-2.5 w-2.5 text-emerald-500" />
                  ) : (
                    <BellOff className="h-2.5 w-2.5 text-muted-foreground" />
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Toggle controls */}
      <div className="space-y-2 pt-2 border-t border-border/20">
        {DEFAULT_STAGES.map((stage) => {
          const Icon = stage.icon;
          const isEnabled = notifications[stage.key] ?? true;

          return (
            <div
              key={stage.key}
              className="flex items-center justify-between py-1"
            >
              <div className="flex items-center gap-2">
                <Icon className={cn('h-3.5 w-3.5', stage.color.split(' ')[0])} />
                <span className="text-xs font-medium">{stage.label}</span>
                <span className="text-[10px] text-muted-foreground">
                  {isEnabled
                    ? t('vip.stageTimeline.notifyOn', 'Notify candidate')
                    : t('vip.stageTimeline.notifyOff', 'Silent')}
                </span>
              </div>
              <Switch
                checked={isEnabled}
                onCheckedChange={(checked) => handleToggle(stage.key, checked)}
              />
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

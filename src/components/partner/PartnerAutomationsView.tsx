import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRole } from '@/contexts/RoleContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Mail, Bell, Clock, CheckCircle2, Webhook, MessageSquare } from 'lucide-react';
import { motion } from '@/lib/motion';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

interface Workflow {
  id: string;
  workflow_type: string;
  trigger_event: string;
  trigger_minutes: number | null;
  is_active: boolean;
  email_template: string | null;
  sms_template: string | null;
}

export default function PartnerAutomationsView() {
  const { t } = useTranslation('partner');
  const { companyId } = useRole();

  const { data: workflows, isLoading } = useQuery({
    queryKey: ['partner-automations', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      try {
        // Step 1: Get job IDs for this company
        const { data: jobs } = await supabase
          .from('jobs')
          .select('id')
          .eq('company_id', companyId);

        if (!jobs || jobs.length === 0) return [];
        const jobIds = jobs.map(j => j.id);

        // Step 2: Get booking links for those jobs
        const { data: bookingLinks } = await (supabase as any)
          .from('booking_links')
          .select('id')
          .in('job_id', jobIds);

        if (!bookingLinks || bookingLinks.length === 0) return [];
        const linkIds = bookingLinks.map((bl: any) => bl.id);

        // Step 3: Get active workflows for those booking links
        const { data, error } = await (supabase as any)
          .from('booking_workflows')
          .select('id, workflow_type, trigger_event, trigger_minutes, is_active, email_template, sms_template')
          .in('booking_link_id', linkIds)
          .eq('is_active', true);

        if (error) return [];
        return (data || []) as Workflow[];
      } catch {
        return [];
      }
    },
    enabled: !!companyId,
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email': return Mail;
      case 'sms': return MessageSquare;
      case 'webhook': return Webhook;
      default: return Bell;
    }
  };

  const getTriggerLabel = (trigger: string, minutes: number | null) => {
    const labels: Record<string, string> = {
      booking_created: t('automations.bookingCreated', 'When a meeting is booked'),
      booking_cancelled: t('automations.bookingCancelled', 'When a meeting is cancelled'),
      booking_rescheduled: t('automations.bookingRescheduled', 'When a meeting is rescheduled'),
      reminder_before: minutes
        ? t('automations.reminderBefore', '{{minutes}} min before meeting', { minutes })
        : t('automations.reminder', 'Before meeting'),
      booking_completed: t('automations.bookingCompleted', 'When a meeting ends'),
    };
    return labels[trigger] || trigger.replace(/_/g, ' ');
  };

  // Also show some "built-in" automations that ClubOS handles regardless
  const builtInAutomations = [
    {
      id: 'builtin-1',
      type: 'system',
      trigger: t('automations.autoMatch', 'AI matches candidates with 85%+ score to your roles'),
      icon: Zap,
      label: t('automations.clubSync', 'Club Sync'),
    },
    {
      id: 'builtin-2',
      type: 'system',
      trigger: t('automations.slaMonitoring', 'SLA breach alerts sent when response times exceed targets'),
      icon: Clock,
      label: t('automations.slaAlerts', 'SLA Monitoring'),
    },
    {
      id: 'builtin-3',
      type: 'system',
      trigger: t('automations.dailyBriefing', 'Daily pipeline briefing generated every morning'),
      icon: Bell,
      label: t('automations.briefing', 'Daily Briefing'),
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Built-in automations */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {t('automations.platformAutomations', 'Platform Automations')}
        </h3>
        <div className="space-y-2">
          {builtInAutomations.map((auto, index) => {
            const Icon = auto.icon;
            return (
              <motion.div
                key={auto.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="glass-card">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{auto.label}</p>
                      <p className="text-xs text-muted-foreground">{auto.trigger}</p>
                    </div>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 shrink-0">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {t('automations.active', 'Active')}
                    </Badge>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Custom workflows */}
      {workflows && workflows.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {t('automations.customWorkflows', 'Custom Workflows')}
          </h3>
          <div className="space-y-2">
            {workflows.map((wf, index) => {
              const TypeIcon = getTypeIcon(wf.workflow_type);
              return (
                <motion.div
                  key={wf.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="glass-card">
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="p-2 rounded-lg bg-muted shrink-0">
                        <TypeIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm capitalize">{wf.workflow_type} {t('automations.workflow', 'workflow')}</p>
                        <p className="text-xs text-muted-foreground">{getTriggerLabel(wf.trigger_event, wf.trigger_minutes)}</p>
                      </div>
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 shrink-0">
                        {t('automations.active', 'Active')}
                      </Badge>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

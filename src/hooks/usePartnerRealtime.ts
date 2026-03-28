import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import i18n from '@/i18n/config';
import { quantumSoundEngine } from '@/lib/sounds/QuantumSoundEngine';

/**
 * Hook to enable real-time subscriptions for Partner Dashboard
 * Subscribes to partner_smart_alerts, applications, and meetings tables
 */
export function usePartnerRealtime(companyId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!companyId) return;

    // Channel for all partner-related realtime updates
    const channel = supabase
      .channel(`partner-dashboard-${companyId}`)
      // Smart Alerts - live updates
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'partner_smart_alerts',
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['smart-alerts', companyId] });
        }
      )
      // Applications - pipeline changes with stage toast notifications
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'applications',
        },
        (payload) => {
          const oldStage = (payload.old as any)?.stage;
          const newStage = (payload.new as any)?.stage;
          if (oldStage && newStage && oldStage !== newStage) {
            quantumSoundEngine.play('pipeline.stage_advanced');
            const stageName = String(newStage).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            toast.info(i18n.t('common:realtime.candidateMoved', 'Candidate moved to {{stage}}', { stage: stageName }), {
              description: i18n.t('common:realtime.pipelineUpdated', 'Pipeline updated in real-time'),
            });
          }
          queryClient.invalidateQueries({ queryKey: ['partner-applications', companyId] });
          queryClient.invalidateQueries({ queryKey: ['hiring-pipeline', companyId] });
          queryClient.invalidateQueries({ queryKey: ['recent-applications', companyId] });
          queryClient.invalidateQueries({ queryKey: ['role-stats', 'partner'] });
          queryClient.invalidateQueries({ queryKey: ['pending-offers', companyId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'applications',
        },
        () => {
          quantumSoundEngine.play('pipeline.new_application');
          toast.info(i18n.t('common:realtime.newApplication', 'New application received'), {
            description: i18n.t('common:realtime.candidateApplied', 'A candidate has applied to one of your roles'),
          });
          queryClient.invalidateQueries({ queryKey: ['partner-applications', companyId] });
          queryClient.invalidateQueries({ queryKey: ['hiring-pipeline', companyId] });
          queryClient.invalidateQueries({ queryKey: ['recent-applications', companyId] });
          queryClient.invalidateQueries({ queryKey: ['role-stats', 'partner'] });
        }
      )
      // Meetings - interview updates
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meetings',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['upcoming-meetings'] });
          queryClient.invalidateQueries({ queryKey: ['today-interviews'] });
          queryClient.invalidateQueries({ queryKey: ['upcoming-deadlines', companyId] });
        }
      )
      // Messages - unread count updates
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['unread-messages'] });
        }
      )
      // SLA Tracking - deadline updates
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'partner_sla_tracking',
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['sla-tracking', companyId] });
          queryClient.invalidateQueries({ queryKey: ['upcoming-deadlines', companyId] });
        }
      )
      // Health Scores - dashboard updates
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'partner_health_scores',
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['partner-health-score', companyId] });
        }
      )
      // Placement Fees - revenue updates
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'placement_fees',
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['placement-revenue', companyId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, queryClient]);
}

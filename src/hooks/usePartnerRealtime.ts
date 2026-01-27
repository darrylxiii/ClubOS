import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
      // Applications - pipeline changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'applications',
        },
        () => {
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

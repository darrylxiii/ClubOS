import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Hook that ensures partner dashboard data is properly populated on load
 * Handles:
 * - Auto-generating daily briefing if none exists for today
 * - Triggering smart alerts generation
 * - Ensuring health score is calculated
 * - Populating benchmarks
 */
export function usePartnerDataPopulation(companyId: string | undefined) {
  const queryClient = useQueryClient();
  const hasRunRef = useRef(false);

  const populateDailyBriefing = useCallback(async () => {
    if (!companyId) return;

    try {
      // Check if we have a briefing for today
      const today = new Date().toISOString().split('T')[0];
      const { data: existingBriefing } = await supabase
        .from('partner_ai_insights' as any)
        .select('id')
        .eq('company_id', companyId)
        .eq('insight_type', 'daily_briefing')
        .gte('created_at', `${today}T00:00:00`)
        .maybeSingle();

      if (!existingBriefing) {
        // Trigger briefing generation via edge function
        const { error } = await supabase.functions.invoke('generate-partner-insights', {
          body: { companyId, insightType: 'daily_briefing' }
        });

        if (!error) {
          queryClient.invalidateQueries({ queryKey: ['daily-briefing', companyId] });
        }
      }
    } catch (error) {
      // Silent fail - briefing will show empty state
      console.debug('Daily briefing population skipped:', error);
    }
  }, [companyId, queryClient]);

  const populateSmartAlerts = useCallback(async () => {
    if (!companyId) return;

    try {
      // Check if we have any alerts
      const { data: existingAlerts } = await supabase
        .from('partner_smart_alerts' as any)
        .select('id')
        .eq('company_id', companyId)
        .eq('is_dismissed', false)
        .limit(1);

      // If no alerts, trigger the generation function
      if (!existingAlerts || existingAlerts.length === 0) {
        await supabase.rpc('generate_partner_smart_alerts' as any, {
          p_company_id: companyId
        });
        queryClient.invalidateQueries({ queryKey: ['smart-alerts', companyId] });
      }
    } catch (error) {
      console.debug('Smart alerts population skipped:', error);
    }
  }, [companyId, queryClient]);

  const populateHealthScore = useCallback(async () => {
    if (!companyId) return;

    try {
      // Check if we have a recent health score (within last hour)
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: existingScore } = await supabase
        .from('partner_health_scores' as any)
        .select('id')
        .eq('company_id', companyId)
        .gte('calculated_at', hourAgo)
        .maybeSingle();

      if (!existingScore) {
        await supabase.rpc('calculate_company_health_score' as any, {
          p_company_id: companyId
        });
        queryClient.invalidateQueries({ queryKey: ['partner-health-score', companyId] });
      }
    } catch (error) {
      console.debug('Health score population skipped:', error);
    }
  }, [companyId, queryClient]);

  const populateBenchmarks = useCallback(async () => {
    if (!companyId) return;

    try {
      // Check if we have any benchmarks
      const { data: existingBenchmarks } = await supabase
        .from('partner_benchmarks' as any)
        .select('id')
        .eq('company_id', companyId)
        .limit(1);

      if (!existingBenchmarks || existingBenchmarks.length === 0) {
        await supabase.rpc('calculate_partner_benchmarks' as any, {
          p_company_id: companyId
        });
        queryClient.invalidateQueries({ queryKey: ['partner-benchmarks', companyId] });
      }
    } catch (error) {
      console.debug('Benchmarks population skipped:', error);
    }
  }, [companyId, queryClient]);

  const populateTalentMatches = useCallback(async () => {
    if (!companyId) return;

    try {
      // Get active jobs for the company
      const { data: activeJobs } = await supabase
        .from('jobs')
        .select('id')
        .eq('company_id', companyId)
        .eq('status', 'published')
        .limit(5);

      if (activeJobs && activeJobs.length > 0) {
        // Check if we have matches for these jobs
        const { data: existingMatches } = await supabase
          .from('talent_matches' as any)
          .select('job_id')
          .eq('company_id', companyId)
          .in('job_id', activeJobs.map(j => j.id))
          .limit(1);

        if (!existingMatches || existingMatches.length === 0) {
          // Generate matches for the first active job
          await supabase.rpc('generate_talent_matches' as any, {
            p_job_id: activeJobs[0].id,
            p_limit: 10
          });
          queryClient.invalidateQueries({ queryKey: ['talent-matches', companyId] });
        }
      }
    } catch (error) {
      console.debug('Talent matches population skipped:', error);
    }
  }, [companyId, queryClient]);

  // Run population on mount (once per session)
  useEffect(() => {
    if (!companyId || hasRunRef.current) return;
    hasRunRef.current = true;

    // Run all population tasks in parallel, but don't block UI
    const populateData = async () => {
      await Promise.allSettled([
        populateDailyBriefing(),
        populateSmartAlerts(),
        populateHealthScore(),
        populateBenchmarks(),
        populateTalentMatches()
      ]);
    };

    // Delay slightly to not block initial render
    const timer = setTimeout(populateData, 1000);
    return () => clearTimeout(timer);
  }, [companyId, populateDailyBriefing, populateSmartAlerts, populateHealthScore, populateBenchmarks, populateTalentMatches]);

  return {
    refreshAll: useCallback(async () => {
      if (!companyId) return;
      
      toast.loading('Refreshing dashboard data...');
      
      await Promise.allSettled([
        populateDailyBriefing(),
        populateSmartAlerts(),
        populateHealthScore(),
        populateBenchmarks(),
        populateTalentMatches()
      ]);

      // Invalidate all partner queries
      queryClient.invalidateQueries({ queryKey: ['partner-analytics', companyId] });
      queryClient.invalidateQueries({ queryKey: ['smart-alerts', companyId] });
      queryClient.invalidateQueries({ queryKey: ['daily-briefing', companyId] });
      queryClient.invalidateQueries({ queryKey: ['partner-health-score', companyId] });
      queryClient.invalidateQueries({ queryKey: ['partner-benchmarks', companyId] });
      queryClient.invalidateQueries({ queryKey: ['talent-matches', companyId] });

      toast.success('Dashboard refreshed');
    }, [companyId, queryClient, populateDailyBriefing, populateSmartAlerts, populateHealthScore, populateBenchmarks, populateTalentMatches])
  };
}

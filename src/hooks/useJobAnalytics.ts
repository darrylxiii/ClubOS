// Phase 2: Job-Specific Analytics Hook
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface JobAnalyticsData {
  // Sourcing Analytics
  sourcing: {
    clubSync: number;
    directApply: number;
    referrals: number;
    other: number;
  };
  
  // Pipeline Performance
  pipelinePerformance: {
    stageConversions: Array<{
      from: string;
      to: string;
      rate: number;
      count: number;
    }>;
    dropoffPoints: Array<{
      stage: string;
      dropoffRate: number;
      count: number;
    }>;
  };
  
  // Time Metrics
  timeMetrics: {
    avgTimeInStages: Array<{
      stage: string;
      avgDays: number;
    }>;
    totalTimeToHire: number;
    fastestHire: number;
    slowestHire: number;
  };
  
  // Candidate Quality
  candidateQuality: {
    avgFitScore: number;
    avgEngagementRate: number;
    interviewPassRate: number;
    offerAcceptanceRate: number;
  };
  
  // Hiring Velocity
  hiringVelocity: {
    applicationsPerWeek: Array<{
      week: string;
      count: number;
    }>;
    avgDaysToFill: number;
    progressToTarget: number;
  };
  
  // Overall Stats
  totalApplications: number;
  activeApplications: number;
  totalHires: number;
}

export const useJobAnalytics = (jobId: string | undefined) => {
  const [data, setData] = useState<JobAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      setLoading(false);
      return;
    }

    fetchJobAnalytics();

    // Real-time subscription for updates
    const channel = supabase
      .channel(`job-analytics-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'applications',
          filter: `job_id=eq.${jobId}`
        },
        () => {
          fetchJobAnalytics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  const fetchJobAnalytics = async () => {
    if (!jobId) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch job details and applications
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .select('*, pipeline_stages')
        .eq('id', jobId)
        .single();

      if (jobError) throw jobError;

      const { data: applications, error: appsError } = await supabase
        .from('applications')
        .select('*')
        .eq('job_id', jobId);

      if (appsError) throw appsError;

      const stages = job.pipeline_stages || [];
      const activeApps = applications?.filter(a => a.status !== 'rejected') || [];
      const hiredApps = applications?.filter(a => a.status === 'hired') || [];

      // Calculate Sourcing Analytics
      const clubSyncCount = activeApps.filter(a => a.application_source === 'club_sync').length;
      const directApplyCount = activeApps.filter(a => a.application_source === 'direct' || !a.application_source).length;
      const referralCount = activeApps.filter(a => a.application_source === 'referral').length;
      const otherCount = activeApps.length - clubSyncCount - directApplyCount - referralCount;

      // Calculate Pipeline Performance
      const pipelineStages = Array.isArray(stages) ? stages : [];
      const stageConversions = [];
      for (let i = 0; i < pipelineStages.length - 1; i++) {
        const stage = pipelineStages[i] as any;
        const nextStage = pipelineStages[i + 1] as any;
        const currentStageApps = activeApps.filter(a => (a.current_stage_index ?? 0) >= i);
        const nextStageApps = activeApps.filter(a => (a.current_stage_index ?? 0) >= i + 1);
        const rate = currentStageApps.length > 0
          ? Math.round((nextStageApps.length / currentStageApps.length) * 100)
          : 0;
        
        stageConversions.push({
          from: stage?.name || `Stage ${i}`,
          to: nextStage?.name || `Stage ${i + 1}`,
          rate,
          count: nextStageApps.length
        });
      }

      const dropoffPoints = pipelineStages.map((stage: any, index: number) => {
        const stageApps = activeApps.filter(a => (a.current_stage_index ?? 0) === index);
        const previousStageApps = index > 0
          ? activeApps.filter(a => (a.current_stage_index ?? 0) >= index - 1)
          : activeApps;
        const dropoffRate = previousStageApps.length > 0
          ? Math.round(((previousStageApps.length - stageApps.length) / previousStageApps.length) * 100)
          : 0;
        
        return {
          stage: stage.name,
          dropoffRate,
          count: previousStageApps.length - stageApps.length
        };
      });

      // Calculate Time Metrics
      const avgTimeInStages = pipelineStages.map((stage: any, index: number) => {
        const stageApps = activeApps.filter(a => (a.current_stage_index ?? 0) === index);
        const avgDays = stageApps.length > 0
          ? Math.round(
              stageApps.reduce((sum, app) => {
                const days = Math.floor(
                  (new Date().getTime() - new Date(app.updated_at || app.created_at).getTime()) / (1000 * 60 * 60 * 24)
                );
                return sum + days;
              }, 0) / stageApps.length
            )
          : 0;
        
        return {
          stage: stage.name,
          avgDays
        };
      });

      const hireTimes = hiredApps.map(app => 
        Math.floor((new Date(app.updated_at).getTime() - new Date(app.created_at).getTime()) / (1000 * 60 * 60 * 24))
      );
      const totalTimeToHire = hireTimes.length > 0
        ? Math.round(hireTimes.reduce((a, b) => a + b, 0) / hireTimes.length)
        : 0;
      const fastestHire = hireTimes.length > 0 ? Math.min(...hireTimes) : 0;
      const slowestHire = hireTimes.length > 0 ? Math.max(...hireTimes) : 0;

      // Calculate Candidate Quality (using mock data for now)
      const candidateQuality = {
        avgFitScore: 78,
        avgEngagementRate: 65,
        interviewPassRate: activeApps.length > 0
          ? Math.round((activeApps.filter(a => a.current_stage_index >= 2).length / activeApps.length) * 100)
          : 0,
        offerAcceptanceRate: hiredApps.length > 0 ? 85 : 0
      };

      // Calculate Hiring Velocity
      const weeklyData: Record<string, number> = {};
      applications?.forEach(app => {
        const week = new Date(app.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        });
        weeklyData[week] = (weeklyData[week] || 0) + 1;
      });

      const applicationsPerWeek = Object.entries(weeklyData)
        .slice(-8)
        .map(([week, count]) => ({ week, count }));

      const avgDaysToFill = totalTimeToHire;
      const progressToTarget = hiredApps.length > 0 ? 100 : Math.min((activeApps.length / 10) * 100, 90);

      setData({
        sourcing: {
          clubSync: clubSyncCount,
          directApply: directApplyCount,
          referrals: referralCount,
          other: otherCount
        },
        pipelinePerformance: {
          stageConversions,
          dropoffPoints
        },
        timeMetrics: {
          avgTimeInStages,
          totalTimeToHire,
          fastestHire,
          slowestHire
        },
        candidateQuality,
        hiringVelocity: {
          applicationsPerWeek,
          avgDaysToFill,
          progressToTarget
        },
        totalApplications: applications?.length || 0,
        activeApplications: activeApps.length,
        totalHires: hiredApps.length
      });
    } catch (err: any) {
      console.error('Error fetching job analytics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refetch: fetchJobAnalytics };
};

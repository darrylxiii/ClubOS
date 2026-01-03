/**
 * Unified Health Scores Hook
 * Combines deal, company, and engagement health into a single interface
 * Used for forecasting, pipeline views, and health dashboards
 */

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface HealthScore {
  score: number;
  status: 'excellent' | 'good' | 'at_risk' | 'critical' | 'unknown';
  label: string;
  color: string;
}

export interface DealHealth extends HealthScore {
  candidateScore: number;
  engagementScore: number;
  timeScore: number;
  progressionScore: number;
  dataScore: number;
}

export interface CompanyHealth extends HealthScore {
  responseTimeScore: number;
  pipelineVelocityScore: number;
  conversionRateScore: number;
  bottleneckScore: number;
}

export interface EngagementHealth extends HealthScore {
  positiveRatio: number;
  negativeRatio: number;
  sentimentTrend: 'improving' | 'stable' | 'declining';
}

// Health score thresholds
const HEALTH_THRESHOLDS = {
  excellent: 80,
  good: 60,
  at_risk: 40,
};

/**
 * Get health status from score
 */
function getHealthStatus(score: number): HealthScore['status'] {
  if (score >= HEALTH_THRESHOLDS.excellent) return 'excellent';
  if (score >= HEALTH_THRESHOLDS.good) return 'good';
  if (score >= HEALTH_THRESHOLDS.at_risk) return 'at_risk';
  return 'critical';
}

/**
 * Get display properties for health status
 */
function getHealthDisplay(status: HealthScore['status']): { label: string; color: string } {
  const displays: Record<HealthScore['status'], { label: string; color: string }> = {
    excellent: { label: 'Healthy', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    good: { label: 'Good', color: 'text-blue-600 bg-blue-50 border-blue-200' },
    at_risk: { label: 'Needs Attention', color: 'text-amber-600 bg-amber-50 border-amber-200' },
    critical: { label: 'At Risk', color: 'text-rose-600 bg-rose-50 border-rose-200' },
    unknown: { label: 'Unknown', color: 'text-slate-600 bg-slate-50 border-slate-200' },
  };
  return displays[status];
}

/**
 * Hook for deal/job health score
 */
export function useDealHealth(jobId: string | undefined) {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['deal-health', jobId],
    queryFn: async (): Promise<DealHealth | null> => {
      if (!jobId) return null;
      
      // Try to get cached score from jobs table first
      const { data: job } = await supabase
        .from('jobs')
        .select('deal_health_score')
        .eq('id', jobId)
        .single();
      
      if (job?.deal_health_score) {
        const score = job.deal_health_score;
        const status = getHealthStatus(score);
        const display = getHealthDisplay(status);
        
        return {
          score,
          status,
          label: display.label,
          color: display.color,
          candidateScore: 0,
          engagementScore: 0,
          timeScore: 0,
          progressionScore: 0,
          dataScore: 0,
        };
      }
      
      // Calculate fresh score
      const { data, error } = await (supabase as any)
        .rpc('calculate_deal_health_score', { job_id: jobId });
      
      if (error) throw error;
      
      const score = data ?? 0;
      const status = getHealthStatus(score);
      const display = getHealthDisplay(status);
      
      // Update job with new score (fire and forget)
      supabase
        .from('jobs')
        .update({ deal_health_score: score } as any)
        .eq('id', jobId)
        .then();
      
      return {
        score,
        status,
        label: display.label,
        color: display.color,
        candidateScore: 0,
        engagementScore: 0,
        timeScore: 0,
        progressionScore: 0,
        dataScore: 0,
      };
    },
    enabled: !!jobId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  const recalculate = useMutation({
    mutationFn: async () => {
      if (!jobId) throw new Error('No job ID');
      
      const { data, error } = await (supabase as any)
        .rpc('calculate_deal_health_score', { job_id: jobId });
      
      if (error) throw error;
      
      // Update job
      await supabase
        .from('jobs')
        .update({ deal_health_score: data } as any)
        .eq('id', jobId);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deal-health', jobId] });
    },
  });
  
  return {
    health: query.data,
    isLoading: query.isLoading,
    error: query.error,
    recalculate: recalculate.mutate,
    isRecalculating: recalculate.isPending,
  };
}

/**
 * Hook for company/partner health score
 */
export function useCompanyHealth(companyId: string | undefined, periodDays: number = 30) {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['company-health', companyId, periodDays],
    queryFn: async (): Promise<CompanyHealth | null> => {
      if (!companyId) return null;
      
      const { data, error } = await (supabase as any)
        .rpc('calculate_company_health_score', {
          p_company_id: companyId,
          p_period_days: periodDays,
        });
      
      if (error) throw error;
      
      const result = Array.isArray(data) ? data[0] : data;
      const score = result?.overall_score ?? 50;
      const status = getHealthStatus(score);
      const display = getHealthDisplay(status);
      
      return {
        score,
        status,
        label: display.label,
        color: display.color,
        responseTimeScore: result?.response_time_score ?? 0,
        pipelineVelocityScore: result?.pipeline_velocity_score ?? 0,
        conversionRateScore: result?.conversion_rate_score ?? 0,
        bottleneckScore: result?.bottleneck_score ?? 0,
      };
    },
    enabled: !!companyId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
  
  const recalculate = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('No company ID');
      
      const { data, error } = await (supabase as any)
        .rpc('calculate_company_health_score', {
          p_company_id: companyId,
          p_period_days: periodDays,
        });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-health', companyId] });
    },
  });
  
  return {
    health: query.data,
    isLoading: query.isLoading,
    error: query.error,
    recalculate: recalculate.mutate,
    isRecalculating: recalculate.isPending,
  };
}

/**
 * Hook for engagement/sentiment health
 */
export function useEngagementHealth(companyId: string | undefined) {
  const query = useQuery({
    queryKey: ['engagement-health', companyId],
    queryFn: async (): Promise<EngagementHealth | null> => {
      if (!companyId) return null;
      
      // Use type assertion to handle dynamic table
      const { data, error } = await (supabase as any)
        .from('company_email_sentiment')
        .select('*')
        .eq('company_id', companyId)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      
      if (!data) {
        return {
          score: 50,
          status: 'unknown',
          label: 'No Data',
          color: 'text-slate-600 bg-slate-50 border-slate-200',
          positiveRatio: 0,
          negativeRatio: 0,
          sentimentTrend: 'stable',
        };
      }
      
      // Access properties with type assertion
      const sentimentData = data as {
        health_score?: number;
        positive_ratio?: number;
        negative_ratio?: number;
        sentiment_trend?: string;
      };
      
      const score = sentimentData.health_score ?? 50;
      const status = getHealthStatus(score);
      const display = getHealthDisplay(status);
      
      return {
        score,
        status,
        label: display.label,
        color: display.color,
        positiveRatio: sentimentData.positive_ratio ?? 0,
        negativeRatio: sentimentData.negative_ratio ?? 0,
        sentimentTrend: (sentimentData.sentiment_trend as EngagementHealth['sentimentTrend']) ?? 'stable',
      };
    },
    enabled: !!companyId,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
  
  return {
    health: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}

/**
 * Combined health scores for a company (all domains)
 */
export function useCombinedHealth(companyId: string | undefined) {
  const company = useCompanyHealth(companyId);
  const engagement = useEngagementHealth(companyId);
  
  const combinedScore = useMemo(() => {
    const scores: number[] = [];
    
    if (company.health) scores.push(company.health.score);
    if (engagement.health && engagement.health.status !== 'unknown') {
      scores.push(engagement.health.score);
    }
    
    if (scores.length === 0) return null;
    
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const status = getHealthStatus(avgScore);
    const display = getHealthDisplay(status);
    
    return {
      score: Math.round(avgScore),
      status,
      label: display.label,
      color: display.color,
    };
  }, [company.health, engagement.health]);
  
  return {
    combined: combinedScore,
    company: company.health,
    engagement: engagement.health,
    isLoading: company.isLoading || engagement.isLoading,
  };
}


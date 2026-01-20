import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ChurnRiskUser {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  risk_level: 'critical' | 'high' | 'medium' | 'low';
  risk_score: number;
  reasons: string[];
  last_activity: string | null;
  days_inactive: number;
  recommended_action: string;
}

export interface MLModelStatus {
  id: string;
  version: number;
  model_type: string;
  status: string;
  metrics: {
    auc_roc?: number;
    precision_at_10?: number;
    ndcg_at_10?: number;
    interview_rate?: number;
    hire_rate?: number;
  };
  training_data_count?: number;
  created_at: string;
}

export interface CandidateMatchPrediction {
  id: string;
  candidate_id: string;
  candidate_name: string;
  job_id: string;
  job_title: string;
  prediction_score: number;
  interview_probability?: number;
  predicted_time_to_hire_days?: number;
  created_at: string;
}

export interface HiringPrediction {
  jobId: string;
  jobTitle: string;
  predictions: any;
  generatedAt: string;
}

export function usePredictiveAnalytics() {
  const [generatingPredictions, setGeneratingPredictions] = useState(false);

  // Fetch active ML model
  const { data: activeModel, isLoading: modelLoading, refetch: refetchModel } = useQuery({
    queryKey: ['ml-active-model'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ml_models')
        .select('*')
        .eq('status', 'active')
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as MLModelStatus | null;
    },
  });

  // Fetch ML predictions with candidate/job details
  const { data: matchPredictions, isLoading: predictionsLoading } = useQuery({
    queryKey: ['ml-predictions'],
    queryFn: async () => {
      const { data: predictions, error } = await supabase
        .from('ml_predictions')
        .select(`
          id,
          candidate_id,
          job_id,
          prediction_score,
          interview_probability,
          predicted_time_to_hire_days,
          created_at
        `)
        .order('prediction_score', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      if (!predictions?.length) return [];

      // Fetch candidate and job names
      const candidateIds = [...new Set(predictions.map(p => p.candidate_id))];
      const jobIds = [...new Set(predictions.map(p => p.job_id))];

      const [candidatesRes, jobsRes] = await Promise.all([
        supabase.from('candidate_profiles').select('id, full_name').in('id', candidateIds),
        supabase.from('jobs').select('id, title').in('id', jobIds)
      ]);

      const candidateMap = new Map((candidatesRes.data || []).map(c => [c.id, c.full_name || 'Unknown']));
      const jobMap = new Map((jobsRes.data || []).map(j => [j.id, j.title]));

      return predictions.map(p => ({
        ...p,
        candidate_name: candidateMap.get(p.candidate_id) || 'Unknown Candidate',
        job_title: jobMap.get(p.job_id) || 'Unknown Job',
      })) as CandidateMatchPrediction[];
    },
  });

  // Calculate churn risk from user activity tracking
  const { data: churnRiskUsers, isLoading: churnLoading, refetch: refetchChurn } = useQuery({
    queryKey: ['churn-risk-analysis'],
    queryFn: async () => {
      const now = new Date();

      // Get all users with activity tracking
      const { data: activityData, error: activityError } = await supabase
        .from('user_activity_tracking')
        .select(`
          user_id,
          last_activity_at,
          activity_level,
          total_actions,
          activity_score,
          session_count
        `)
        .order('last_activity_at', { ascending: true })
        .limit(100);

      if (activityError) throw activityError;

      // Get profiles for these users
      const userIds = (activityData || []).map(a => a.user_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const profileMap = new Map((profilesData || []).map(p => [p.id, p]));

      // Get user roles
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);
      
      const roleMap = new Map((rolesData || []).map(r => [r.user_id, r.role]));

      // Calculate churn risk for each user
      const churnRisks: ChurnRiskUser[] = (activityData || []).map(user => {
        const lastActivity = user.last_activity_at ? new Date(user.last_activity_at) : null;
        const daysInactive = lastActivity 
          ? Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        const profile = profileMap.get(user.user_id);
        const reasons: string[] = [];
        let riskScore = 0;

        // Calculate risk score
        if (daysInactive >= 30) {
          riskScore += 40;
          reasons.push(`No activity in ${daysInactive} days`);
        } else if (daysInactive >= 14) {
          riskScore += 30;
          reasons.push(`Inactive for ${daysInactive} days`);
        } else if (daysInactive >= 7) {
          riskScore += 15;
          reasons.push(`Low recent activity (${daysInactive} days)`);
        }

        if (user.activity_level === 'inactive') {
          riskScore += 25;
          reasons.push('Activity level marked as inactive');
        } else if (user.activity_level === 'low') {
          riskScore += 15;
          reasons.push('Low engagement pattern');
        }

        if ((user.total_actions || 0) < 10) {
          riskScore += 15;
          reasons.push('Very few total actions on platform');
        }

        if ((user.session_count || 0) < 3) {
          riskScore += 10;
          reasons.push('Limited session history');
        }

        // Determine risk level
        let riskLevel: 'critical' | 'high' | 'medium' | 'low';
        if (riskScore >= 60) riskLevel = 'critical';
        else if (riskScore >= 40) riskLevel = 'high';
        else if (riskScore >= 20) riskLevel = 'medium';
        else riskLevel = 'low';

        // Generate recommended action
        let recommended_action = 'Monitor engagement';
        if (riskLevel === 'critical') {
          recommended_action = 'Urgent: Send re-engagement email + personal outreach';
        } else if (riskLevel === 'high') {
          recommended_action = 'Send personalized check-in message';
        } else if (riskLevel === 'medium') {
          recommended_action = 'Include in nurture campaign';
        }

        return {
          id: user.user_id,
          user_id: user.user_id,
          full_name: profile?.full_name || 'Unknown User',
          email: profile?.email || '',
          role: roleMap.get(user.user_id) || 'user',
          risk_level: riskLevel,
          risk_score: riskScore,
          reasons,
          last_activity: user.last_activity_at,
          days_inactive: daysInactive,
          recommended_action,
        };
      }).filter(u => u.risk_score > 15) // Only show users with some risk
        .sort((a, b) => b.risk_score - a.risk_score);

      return churnRisks;
    },
    refetchInterval: 60000,
  });

  // Fetch engagement predictions from session events
  const { data: engagementStats, isLoading: engagementLoading } = useQuery({
    queryKey: ['engagement-predictions'],
    queryFn: async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('user_session_events')
        .select('user_id, event_type, event_timestamp')
        .gte('event_timestamp', sevenDaysAgo);
      
      if (error) throw error;

      // Group by user and count events
      const userEvents = (data || []).reduce((acc, event) => {
        if (!acc[event.user_id]) {
          acc[event.user_id] = { total: 0, types: {} as Record<string, number> };
        }
        acc[event.user_id].total++;
        acc[event.user_id].types[event.event_type] = (acc[event.user_id].types[event.event_type] || 0) + 1;
        return acc;
      }, {} as Record<string, { total: number; types: Record<string, number> }>);

      // Calculate engagement tiers
      const users = Object.entries(userEvents);
      const highEngagement = users.filter(([_, v]) => v.total >= 50).length;
      const mediumEngagement = users.filter(([_, v]) => v.total >= 20 && v.total < 50).length;
      const lowEngagement = users.filter(([_, v]) => v.total < 20).length;

      return {
        totalUsers: users.length,
        highEngagement,
        mediumEngagement,
        lowEngagement,
        avgEventsPerUser: users.length ? Math.round(users.reduce((sum, [_, v]) => sum + v.total, 0) / users.length) : 0,
      };
    },
  });

  // Get active jobs for hiring predictions
  const { data: activeJobs } = useQuery({
    queryKey: ['active-jobs-for-predictions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, title, company_id, created_at')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data || [];
    },
  });

  // Generate hiring predictions for a job
  const generateHiringPredictions = async (jobId: string): Promise<HiringPrediction | null> => {
    try {
      setGeneratingPredictions(true);
      const { data, error } = await supabase.functions.invoke('predict-hiring-outcomes', {
        body: { jobId }
      });
      
      if (error) throw error;
      
      const job = activeJobs?.find(j => j.id === jobId);
      return {
        jobId,
        jobTitle: job?.title || 'Unknown Job',
        predictions: data?.predictions,
        generatedAt: new Date().toISOString(),
      };
    } catch (err) {
      console.error('Failed to generate hiring predictions:', err);
      return null;
    } finally {
      setGeneratingPredictions(false);
    }
  };

  // Train ML model
  const trainModel = async (config = {}) => {
    try {
      const { data, error } = await supabase.functions.invoke('train-ml-model', {
        body: { n_estimators: 50, learning_rate: 0.1, ...config }
      });
      if (error) throw error;
      await refetchModel();
      return data;
    } catch (err) {
      console.error('Failed to train model:', err);
      throw err;
    }
  };

  // Generate action recommendations
  const generateRecommendations = () => {
    const recommendations: Array<{
      action: string;
      priority: 'high' | 'medium' | 'low';
      impact: string;
      category: string;
    }> = [];

    // Based on churn risk
    const criticalChurn = churnRiskUsers?.filter(u => u.risk_level === 'critical').length || 0;
    if (criticalChurn > 0) {
      recommendations.push({
        action: `Reach out to ${criticalChurn} critical churn-risk users immediately`,
        priority: 'high',
        impact: 'Prevent user loss and maintain engagement',
        category: 'Retention',
      });
    }

    // Based on ML model
    if (!activeModel) {
      recommendations.push({
        action: 'Train initial ML model to enable candidate matching predictions',
        priority: 'high',
        impact: 'Enable AI-powered candidate recommendations',
        category: 'ML Pipeline',
      });
    } else if ((matchPredictions?.length || 0) < 10) {
      recommendations.push({
        action: 'Generate more match predictions for active jobs',
        priority: 'medium',
        impact: 'Improve hiring efficiency with AI recommendations',
        category: 'ML Pipeline',
      });
    }

    // Based on engagement
    if ((engagementStats?.lowEngagement || 0) > (engagementStats?.highEngagement || 0)) {
      recommendations.push({
        action: 'Launch re-engagement campaign for low-activity users',
        priority: 'medium',
        impact: 'Increase platform engagement and retention',
        category: 'Engagement',
      });
    }

    // Default recommendation
    if (recommendations.length === 0) {
      recommendations.push({
        action: 'Platform health is good - continue monitoring',
        priority: 'low',
        impact: 'Maintain current performance levels',
        category: 'Monitoring',
      });
    }

    return recommendations;
  };

  return {
    // Data
    activeModel,
    matchPredictions,
    churnRiskUsers,
    engagementStats,
    activeJobs,
    recommendations: generateRecommendations(),
    
    // Loading states
    isLoading: modelLoading || predictionsLoading || churnLoading || engagementLoading,
    generatingPredictions,
    
    // Actions
    generateHiringPredictions,
    trainModel,
    refetchChurn,
    refetchModel,
  };
}

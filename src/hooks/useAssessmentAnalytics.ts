import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AssessmentAnalytics } from '@/types/assessment';

export const useAssessmentAnalytics = (assessmentId?: string) => {
  const [analytics, setAnalytics] = useState<AssessmentAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [assessmentId]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('assessment_analytics')
        .select('*')
        .order('date', { ascending: false })
        .limit(30);

      if (assessmentId) {
        query = query.eq('assessment_id', assessmentId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setAnalytics(data || []);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getOverviewStats = () => {
    if (analytics.length === 0) {
      return {
        totalAttempts: 0,
        totalCompletions: 0,
        avgCompletionRate: 0,
        avgScore: 0,
      };
    }

    const totalAttempts = analytics.reduce((sum, a) => sum + a.total_attempts, 0);
    const totalCompletions = analytics.reduce((sum, a) => sum + a.total_completions, 0);
    const avgCompletionRate = analytics.reduce((sum, a) => sum + (a.completion_rate || 0), 0) / analytics.length;
    const scoresWithValues = analytics.filter(a => a.avg_score !== null && a.avg_score !== undefined);
    const avgScore = scoresWithValues.length > 0
      ? scoresWithValues.reduce((sum, a) => sum + (a.avg_score || 0), 0) / scoresWithValues.length
      : 0;

    return {
      totalAttempts,
      totalCompletions,
      avgCompletionRate: Math.round(avgCompletionRate * 100) / 100,
      avgScore: Math.round(avgScore * 100) / 100,
    };
  };

  return {
    analytics,
    loading,
    getOverviewStats,
    refresh: loadAnalytics,
  };
};

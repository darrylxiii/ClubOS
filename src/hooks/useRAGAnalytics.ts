import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RAGMetrics {
  precision_at_5: number;
  recall_at_5: number;
  f1_at_5: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  context_utilization: number;
  hallucination_rate: number;
  cache_hit_rate: number;
  feedback_positive_rate: number;
  total_queries: number;
}

export interface RAGTrend {
  date: string;
  precision_at_5: number;
  recall_at_5: number;
  f1_at_5: number;
  avg_latency_ms: number;
  total_queries: number;
}

export interface QueryIntentDistribution {
  intent_type: string;
  count: number;
  percentage: number;
}

export interface PromptExperimentResult {
  id: string;
  experiment_name: string;
  prompt_variant: string;
  total_impressions: number;
  positive_feedback: number;
  negative_feedback: number;
  success_rate: number;
  is_control: boolean;
}

export function useRAGAnalytics(dateRange: { start: Date; end: Date }) {
  const [metrics, setMetrics] = useState<RAGMetrics | null>(null);
  const [trends, setTrends] = useState<RAGTrend[]>([]);
  const [intentDistribution, setIntentDistribution] = useState<QueryIntentDistribution[]>([]);
  const [experimentResults, setExperimentResults] = useState<PromptExperimentResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const startDate = dateRange.start.toISOString();
      const endDate = dateRange.end.toISOString();

      // Fetch RAG evaluation metrics
      const { data: evalMetrics, error: evalError } = await supabase
        .from('rag_evaluation_metrics')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (evalError) throw evalError;

      // Calculate aggregate metrics
      const totalQueries = evalMetrics?.length || 0;
      
      let avgPrecision = 0;
      let avgRecall = 0;
      let avgLatency = 0;
      let avgContextUtil = 0;

      if (evalMetrics && evalMetrics.length > 0) {
        avgPrecision = evalMetrics.reduce((sum, m: any) => sum + (m.precision_at_5 || 0), 0) / totalQueries;
        avgRecall = evalMetrics.reduce((sum, m: any) => sum + (m.recall_at_5 || 0), 0) / totalQueries;
        avgLatency = evalMetrics.reduce((sum, m: any) => sum + (m.retrieval_time_ms || 0), 0) / totalQueries;
        avgContextUtil = evalMetrics.reduce((sum, m: any) => sum + (m.context_utilization || 0), 0) / totalQueries;
      }

      // Calculate F1 score
      const f1 = avgPrecision + avgRecall > 0 
        ? 2 * (avgPrecision * avgRecall) / (avgPrecision + avgRecall)
        : 0;

      // Calculate P95 latency
      const latencies = evalMetrics?.map((m: any) => m.retrieval_time_ms || 0).sort((a, b) => a - b) || [];
      const p95Index = Math.floor(latencies.length * 0.95);
      const p95Latency = latencies[p95Index] || 0;

      // Fetch hallucination stats
      const { data: hallucinationData } = await supabase
        .from('hallucination_detection_log')
        .select('hallucination_score')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      const hallucinationRate = hallucinationData && hallucinationData.length > 0
        ? hallucinationData.reduce((sum, h) => sum + (h.hallucination_score || 0), 0) / hallucinationData.length
        : 0;

      // Fetch cache stats
      const { data: cacheData } = await supabase
        .from('embedding_cache')
        .select('hit_count')
        .gte('created_at', startDate);

      const totalHits = cacheData?.reduce((sum, c) => sum + (c.hit_count || 0), 0) || 0;
      const cacheHitRate = totalQueries > 0 ? totalHits / (totalQueries + totalHits) : 0;

      // Fetch feedback stats
      const { data: feedbackData } = await supabase
        .from('rag_feedback')
        .select('feedback_type')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .in('feedback_type', ['thumbs_up', 'thumbs_down']);

      const positiveCount = feedbackData?.filter(f => f.feedback_type === 'thumbs_up').length || 0;
      const totalFeedback = feedbackData?.length || 0;
      const positiveFeedbackRate = totalFeedback > 0 ? positiveCount / totalFeedback : 0;

      setMetrics({
        precision_at_5: Math.round(avgPrecision * 1000) / 1000,
        recall_at_5: Math.round(avgRecall * 1000) / 1000,
        f1_at_5: Math.round(f1 * 1000) / 1000,
        avg_latency_ms: Math.round(avgLatency),
        p95_latency_ms: Math.round(p95Latency),
        context_utilization: Math.round(avgContextUtil * 100) / 100,
        hallucination_rate: Math.round(hallucinationRate * 100) / 100,
        cache_hit_rate: Math.round(cacheHitRate * 100) / 100,
        feedback_positive_rate: Math.round(positiveFeedbackRate * 100) / 100,
        total_queries: totalQueries,
      });

      // Fetch daily trends
      await fetchTrends(startDate, endDate);

      // Fetch intent distribution
      await fetchIntentDistribution(startDate, endDate);

      // Fetch experiment results
      await fetchExperimentResults();

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch metrics');
      setError(error);
      console.error('RAG analytics error:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  const fetchTrends = async (startDate: string, endDate: string) => {
    // Group metrics by day
    const { data, error } = await supabase
      .from('rag_evaluation_metrics')
      .select('created_at, precision_at_5, recall_at_5, retrieval_time_ms')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: true });

    if (error || !data) {
      setTrends([]);
      return;
    }

    // Group by date
    const byDate = new Map<string, any[]>();
    for (const metric of data) {
      const date = new Date(metric.created_at).toISOString().split('T')[0];
      if (!byDate.has(date)) {
        byDate.set(date, []);
      }
      byDate.get(date)!.push(metric);
    }

    const trendData: RAGTrend[] = [];
    for (const [date, metrics] of byDate.entries()) {
      const avgPrecision = metrics.reduce((sum, m: any) => sum + (m.precision_at_5 || 0), 0) / metrics.length;
      const avgRecall = metrics.reduce((sum, m: any) => sum + (m.recall_at_5 || 0), 0) / metrics.length;
      const avgLatency = metrics.reduce((sum, m: any) => sum + (m.retrieval_time_ms || 0), 0) / metrics.length;
      const f1 = avgPrecision + avgRecall > 0
        ? 2 * (avgPrecision * avgRecall) / (avgPrecision + avgRecall)
        : 0;

      trendData.push({
        date,
        precision_at_5: Math.round(avgPrecision * 1000) / 1000,
        recall_at_5: Math.round(avgRecall * 1000) / 1000,
        f1_at_5: Math.round(f1 * 1000) / 1000,
        avg_latency_ms: Math.round(avgLatency),
        total_queries: metrics.length,
      });
    }

    setTrends(trendData);
  };

  const fetchIntentDistribution = async (startDate: string, endDate: string) => {
    const { data, error } = await supabase
      .from('query_intent_cache')
      .select('intent_type')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (error || !data) {
      setIntentDistribution([]);
      return;
    }

    // Count by intent type
    const counts = new Map<string, number>();
    for (const item of data) {
      counts.set(item.intent_type, (counts.get(item.intent_type) || 0) + 1);
    }

    const total = data.length;
    const distribution: QueryIntentDistribution[] = [];
    for (const [intent_type, count] of counts.entries()) {
      distribution.push({
        intent_type,
        count,
        percentage: Math.round((count / total) * 100),
      });
    }

    distribution.sort((a, b) => b.count - a.count);
    setIntentDistribution(distribution);
  };

  const fetchExperimentResults = async () => {
    const { data, error } = await supabase
      .from('prompt_experiments')
      .select('*')
      .eq('is_active', true)
      .order('total_impressions', { ascending: false });

    if (error || !data) {
      setExperimentResults([]);
      return;
    }

    const results: PromptExperimentResult[] = data.map(exp => ({
      id: exp.id,
      experiment_name: exp.experiment_name,
      prompt_variant: exp.prompt_variant,
      total_impressions: exp.total_impressions,
      positive_feedback: exp.positive_feedback,
      negative_feedback: exp.negative_feedback,
      success_rate: exp.total_impressions > 0 
        ? (exp.positive_feedback / exp.total_impressions) 
        : 0,
      is_control: exp.is_control || false,
    }));

    setExperimentResults(results);
  };

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return {
    metrics,
    trends,
    intentDistribution,
    experimentResults,
    loading,
    error,
    refresh: fetchMetrics,
  };
}

// Hook for collecting feedback
export function useRAGFeedback() {
  const [submitting, setSubmitting] = useState(false);

  const submitFeedback = async (
    queryId: string,
    feedbackType: 'thumbs_up' | 'thumbs_down' | 'rating' | 'comment',
    options?: {
      rating?: number;
      comment?: string;
      resultId?: string;
      resultRank?: number;
      contextUsed?: any;
    }
  ) => {
    setSubmitting(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('collect-rag-feedback', {
        body: {
          query_id: queryId,
          feedback_type: feedbackType,
          rating: options?.rating,
          comment: options?.comment,
          result_id: options?.resultId,
          result_rank: options?.resultRank,
          context_used: options?.contextUsed,
        },
      });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Feedback submission error:', err);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  return {
    submitFeedback,
    submitting,
  };
}

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { notify } from '@/lib/notify';

interface RelationshipMetrics {
  total_communications: number;
  response_rate: number;
  avg_response_time_hours: number;
  sentiment_trend: number;
  days_since_last_contact: number;
  channel_diversity: number;
  meeting_count: number;
  positive_interactions: number;
  negative_interactions: number;
}

interface Predictions {
  conversion_probability: number;
  churn_risk: number;
  trajectory: 'improving' | 'stable' | 'declining';
  confidence: number;
  time_to_conversion_days: number;
  health_score: number;
}

interface OptimalTiming {
  best_day: string;
  best_hour: number;
  best_time_formatted: string;
  recommended_frequency_days: number;
  avoid_hours: number[];
}

interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  action: string;
  reason: string;
  impact: string;
}

interface PredictionResult {
  metrics: RelationshipMetrics;
  predictions: Predictions;
  optimalTiming: OptimalTiming;
  recommendations: Recommendation[];
}

export function useRelationshipPredictions() {
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);

  const getPrediction = useCallback(async (entityType: string, entityId: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('predict-relationship-outcomes', {
        body: { entity_type: entityType, entity_id: entityId }
      });

      if (error) throw error;

      setPrediction({
        metrics: data.metrics,
        predictions: data.predictions,
        optimalTiming: data.optimalTiming,
        recommendations: data.recommendations,
      });

      return data;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get prediction';
      notify.error('Prediction failed', { description: errorMessage });
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearPrediction = useCallback(() => {
    setPrediction(null);
  }, []);

  return {
    loading,
    prediction,
    getPrediction,
    clearPrediction,
  };
}

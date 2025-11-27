import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useMLTraining() {
  const [loading, setLoading] = useState(false);

  const prepareData = async (limit = 1000) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('prepare-training-data', {
        body: { limit, include_semantic: true }
      });
      if (error) throw error;
      return data;
    } finally {
      setLoading(false);
    }
  };

  const trainModel = async (config = {}) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('train-ml-model', {
        body: { n_estimators: 50, learning_rate: 0.1, ...config }
      });
      if (error) throw error;
      return data;
    } finally {
      setLoading(false);
    }
  };

  const trackOutcome = async (predictionId: string, outcome: string) => {
    const { data, error } = await supabase.functions.invoke('track-ml-outcome', {
      body: { prediction_id: predictionId, outcome }
    });
    if (error) throw error;
    return data;
  };

  return { prepareData, trainModel, trackOutcome, loading };
}

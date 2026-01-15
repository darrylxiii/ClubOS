import { useState } from 'react';
import { aiService } from '@/services/aiService';
import type { MLFeatures, FeatureGenerationRequest } from '@/types/ml';

/**
 * Hook to generate and fetch ML features for candidate-job matches
 */
export function useMLFeatures() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const generateFeatures = async (
    request: FeatureGenerationRequest
  ): Promise<MLFeatures | null> => {
    setLoading(true);
    setError(null);

    try {
      const data = await aiService.generateMLFeatures(request);

      const functionError = null; // aiService throws on error, so we catch below

      if (functionError) throw functionError;

      return data.features;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to generate features');
      setError(error);
      console.error('Error generating ML features:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const generateBatchFeatures = async (
    requests: FeatureGenerationRequest[]
  ): Promise<(MLFeatures | null)[]> => {
    setLoading(true);
    setError(null);

    try {
      const results = await Promise.all(
        requests.map(req => generateFeatures(req))
      );
      return results;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to generate batch features');
      setError(error);
      console.error('Error generating batch ML features:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    generateFeatures,
    generateBatchFeatures,
    loading,
    error,
  };
}

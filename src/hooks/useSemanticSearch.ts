import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type SemanticEntityType = 
  | 'candidate' 
  | 'job' 
  | 'knowledge' 
  | 'interaction'
  | 'meeting_candidate'
  | 'meeting_job'
  | 'meeting_interviewer';

export interface SemanticSearchResult {
  id: string;
  similarity_score?: number;
  [key: string]: any;
}

export interface SemanticSearchOptions {
  entity_type: SemanticEntityType;
  query: string;
  limit?: number;
  threshold?: number;
}

export function useSemanticSearch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const search = async (
    options: SemanticSearchOptions
  ): Promise<SemanticSearchResult[] | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke(
        'semantic-search',
        {
          body: {
            query: options.query,
            entity_type: options.entity_type,
            limit: options.limit || 10,
            threshold: options.threshold || 0.7,
          },
        }
      );

      if (functionError) throw functionError;

      return data.results || [];
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Search failed');
      setError(error);
      console.error('Semantic search error:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    search,
    loading,
    error,
  };
}

export function useEmbeddingGenerator() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const generateEmbedding = async (
    text: string,
    entity_type?: SemanticEntityType,
    entity_id?: string
  ): Promise<number[] | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke(
        'generate-embeddings',
        {
          body: {
            text,
            entity_type,
            entity_id,
          },
        }
      );

      if (functionError) throw functionError;

      return data.embedding || null;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Embedding generation failed');
      setError(error);
      console.error('Embedding generation error:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const batchGenerateEmbeddings = async (
    entity_type: SemanticEntityType,
    limit?: number,
    offset?: number
  ): Promise<{ processed: number; errors: number } | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke(
        'batch-generate-embeddings',
        {
          body: {
            entity_type,
            limit: limit || 100,
            offset: offset || 0,
          },
        }
      );

      if (functionError) throw functionError;

      return {
        processed: data.processed || 0,
        errors: data.errors || 0,
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Batch generation failed');
      setError(error);
      console.error('Batch embedding error:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    generateEmbedding,
    batchGenerateEmbeddings,
    loading,
    error,
  };
}
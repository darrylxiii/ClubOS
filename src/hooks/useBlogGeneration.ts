import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export type ContentFormat = 
  | 'career-playbook' 
  | 'market-analysis' 
  | 'trend-report' 
  | 'success-story' 
  | 'myth-buster' 
  | 'talent-origin' 
  | 'executive-stack';

interface QueueItem {
  id: string;
  topic: string;
  category: string;
  target_keywords: string[] | null;
  priority: number | null;
  source: string;
  status: string;
  content_format: ContentFormat | null;
  generated_post_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

interface TopicSuggestion {
  topic: string;
  category: string;
  format: ContentFormat;
  targetKeywords: string[];
  priority: number;
  reasoning: string;
}

interface GenerationResult {
  success: boolean;
  postId?: string;
  title?: string;
  slug?: string;
  error?: string;
}

export function useBlogGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<TopicSuggestion[]>([]);

  const addToQueue = async (
    topic: string,
    category: string,
    targetKeywords?: string[],
    priority: number = 5,
    format?: ContentFormat
  ): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('blog_generation_queue')
        .insert({
          topic,
          category,
          target_keywords: targetKeywords || null,
          priority,
          content_format: format || null,
          source: 'user',
          status: 'pending',
        } as any)
        .select()
        .single();

      if (error) throw error;
      toast.success('Topic added to queue');
      return (data as any).id;
    } catch (error) {
      logger.error('Error adding to queue', error instanceof Error ? error : new Error(String(error)));
      toast.error('Failed to add topic to queue');
      return null;
    }
  };

  const generateFromQueue = async (queueItem: QueueItem): Promise<GenerationResult> => {
    setIsGenerating(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/blog-generate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            queueId: queueItem.id,
            topic: queueItem.topic,
            category: queueItem.category,
            targetKeywords: queueItem.target_keywords,
            contentFormat: queueItem.content_format,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Generation failed');

      toast.success(`Article generated: ${data.title}`);
      return { success: true, ...data };
    } catch (error) {
      logger.error('Generation error', error instanceof Error ? error : new Error(String(error)));
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Generation failed: ${errorMessage}`);
      return { success: false, error: errorMessage };
    } finally {
      setIsGenerating(false);
    }
  };

  const getSuggestions = async (autoQueue: boolean = false): Promise<TopicSuggestion[]> => {
    setIsSuggesting(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/blog-suggest`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ autoQueue }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to get suggestions');

      setSuggestions(data.suggestions);
      if (autoQueue) toast.success(`${data.suggestions.length} topics added to queue`);
      return data.suggestions;
    } catch (error) {
      logger.error('Suggestion error', error instanceof Error ? error : new Error(String(error)));
      toast.error('Failed to get topic suggestions');
      return [];
    } finally {
      setIsSuggesting(false);
    }
  };

  const fetchQueue = async (): Promise<QueueItem[]> => {
    try {
      const { data, error } = await supabase
        .from('blog_generation_queue')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as QueueItem[];
    } catch (error) {
      logger.error('Error fetching queue', error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  };

  const updatePriority = async (queueId: string, priority: number): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('blog_generation_queue')
        .update({ priority, updated_at: new Date().toISOString() })
        .eq('id', queueId);
      if (error) throw error;
      return true;
    } catch (error) {
      logger.error('Error updating priority', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  };

  const deleteFromQueue = async (queueId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('blog_generation_queue')
        .delete()
        .eq('id', queueId);
      if (error) throw error;
      toast.success('Removed from queue');
      return true;
    } catch (error) {
      logger.error('Error deleting from queue', error instanceof Error ? error : new Error(String(error)));
      toast.error('Failed to remove from queue');
      return false;
    }
  };

  return {
    isGenerating,
    isSuggesting,
    suggestions,
    addToQueue,
    generateFromQueue,
    getSuggestions,
    fetchQueue,
    updatePriority,
    deleteFromQueue,
  };
}

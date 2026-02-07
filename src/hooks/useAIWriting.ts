import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type AIOperation = 
  | 'improve' 
  | 'summarize' 
  | 'expand' 
  | 'translate' 
  | 'generate' 
  | 'simplify' 
  | 'professional' 
  | 'casual';

interface AIWritingOptions {
  context?: string;
  targetLanguage?: string;
  customPrompt?: string;
}

interface AIWritingResult {
  result: string;
  operation: AIOperation;
  originalLength: number;
  resultLength: number;
}

export function useAIWriting() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processText = useCallback(async (
    operation: AIOperation,
    text: string,
    options: AIWritingOptions = {}
  ): Promise<string | null> => {
    if (!text.trim()) {
      toast.error('Please select some text first');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke<AIWritingResult>(
        'ai-writing',
        {
          body: {
            operation,
            text,
            context: options.context,
            targetLanguage: options.targetLanguage,
            customPrompt: options.customPrompt,
          },
        }
      );

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (!data?.result) {
        throw new Error('No result returned');
      }

      return data.result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI writing failed';
      setError(message);
      
      if (message.includes('rate limit') || message.includes('429')) {
        toast.error('AI rate limit exceeded. Please try again in a moment.');
      } else if (message.includes('402') || message.includes('credits')) {
        toast.error('AI credits exhausted. Please add funds to continue.');
      } else {
        toast.error(`Club AI: ${message}`);
      }
      
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const improve = useCallback((text: string, context?: string) => 
    processText('improve', text, { context }), [processText]);

  const summarize = useCallback((text: string, context?: string) => 
    processText('summarize', text, { context }), [processText]);

  const expand = useCallback((text: string, context?: string) => 
    processText('expand', text, { context }), [processText]);

  const translate = useCallback((text: string, targetLanguage: string) => 
    processText('translate', text, { targetLanguage }), [processText]);

  const generate = useCallback((prompt: string, context?: string) => 
    processText('generate', prompt, { context, customPrompt: prompt }), [processText]);

  const simplify = useCallback((text: string, context?: string) => 
    processText('simplify', text, { context }), [processText]);

  const makeProfessional = useCallback((text: string) => 
    processText('professional', text), [processText]);

  const makeCasual = useCallback((text: string) => 
    processText('casual', text), [processText]);

  return {
    isLoading,
    error,
    processText,
    improve,
    summarize,
    expand,
    translate,
    generate,
    simplify,
    makeProfessional,
    makeCasual,
  };
}

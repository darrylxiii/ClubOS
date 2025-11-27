import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { IncubatorScenario, IncubatorFrameAnswers, IncubatorPlanSection } from '@/types/assessment';

export type IncubatorPhase = 'brief' | 'frame' | 'build' | 'commit' | 'complete';

export interface IncubatorAction {
  timestamp_ms: number;
  action_type: 'PROMPT' | 'EDIT' | 'TOOL_USE' | 'SAVE' | 'NAVIGATE';
  payload?: any;
  prompt_text?: string;
  tool_used?: string;
  ai_response?: string;
  tokens_used?: number;
  response_action?: 'accept' | 'reject' | 'edit';
  edit_delta?: any;
}

export function useIncubatorSession(scenario: IncubatorScenario) {
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [phase, setPhase] = useState<IncubatorPhase>('brief');
  const [frameAnswers, setFrameAnswers] = useState<IncubatorFrameAnswers | null>(null);
  const [planSections, setPlanSections] = useState<Partial<IncubatorPlanSection>>({});
  const [wordCount, setWordCount] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const startTime = useRef<number>(Date.now());
  const actionsQueue = useRef<IncubatorAction[]>([]);

  // Create session on mount
  useEffect(() => {
    if (!user) return;
    
    const createSession = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('incubator_sessions')
          .insert([{
            user_id: user.id,
            scenario_seed: JSON.stringify(scenario),
            scenario_difficulty: scenario.difficulty,
          }])
          .select()
          .single();

        if (error) throw error;
        setSessionId(data.id);
        startTime.current = Date.now();
      } catch (error: any) {
        console.error('Error creating session:', error);
        toast.error('Failed to start assessment');
      }
    };

    createSession();
  }, [user, scenario]);

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeElapsed(Math.floor((Date.now() - startTime.current) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Log action
  const logAction = useCallback(async (action: Omit<IncubatorAction, 'timestamp_ms'>) => {
    if (!sessionId) return;

    const fullAction: IncubatorAction = {
      ...action,
      timestamp_ms: Date.now() - startTime.current,
    };

    actionsQueue.current.push(fullAction);

    // Batch insert actions every 5 seconds or when queue reaches 10
    if (actionsQueue.current.length >= 10) {
      const toInsert = [...actionsQueue.current];
      actionsQueue.current = [];

      try {
        await supabase.from('incubator_actions').insert(
          toInsert.map(a => ({
            session_id: sessionId,
            ...a,
          }))
        );
      } catch (error) {
        console.error('Error logging actions:', error);
      }
    }
  }, [sessionId]);

  // Save frame answers
  const saveFrameAnswers = useCallback(async (answers: IncubatorFrameAnswers) => {
    if (!sessionId) return;

    try {
      const { error } = await supabase
        .from('incubator_sessions')
        .update({
          frame_problem: answers.problem,
          frame_customer: answers.customer,
          frame_success_metric: answers.successMetric,
          frame_completed_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (error) throw error;
      setFrameAnswers(answers);
      setPhase('build');
    } catch (error: any) {
      console.error('Error saving frame:', error);
      toast.error('Failed to save answers');
    }
  }, [sessionId]);

  // Update plan section
  const updatePlanSection = useCallback((sectionId: keyof IncubatorPlanSection, content: string) => {
    setPlanSections(prev => {
      const newPlan = { ...prev, [sectionId]: content };
      
      // Calculate total word count using the updated plan
      const totalWords = Object.values(newPlan).reduce((sum, text) => {
        if (!text) return sum;
        return sum + text.trim().split(/\s+/).length;
      }, 0);
      setWordCount(totalWords);

      logAction({
        action_type: 'EDIT',
        payload: { section: sectionId, content, wordCount: totalWords },
      });
      
      return newPlan;
    });
  }, [logAction]);

  // Submit assessment
  const submitAssessment = useCallback(async (voiceBlob?: Blob) => {
    if (!sessionId || !user) return;
    setIsSubmitting(true);

    try {
      // Flush remaining actions
      if (actionsQueue.current.length > 0) {
        await supabase.from('incubator_actions').insert(
          actionsQueue.current.map(a => ({
            session_id: sessionId,
            ...a,
          }))
        );
        actionsQueue.current = [];
      }

      // Upload voice if provided
      let voiceUrl: string | undefined;
      if (voiceBlob) {
        const fileName = `${sessionId}_rationale.webm`;
        const { error: uploadError } = await supabase.storage
          .from('assessment-recordings')
          .upload(fileName, voiceBlob);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('assessment-recordings')
            .getPublicUrl(fileName);
          voiceUrl = publicUrl;
        }
      }

      // Update session with final data
      const { error: updateError } = await supabase
        .from('incubator_sessions')
        .update({
          final_plan: planSections,
          word_count: wordCount,
          voice_rationale_url: voiceUrl,
          submitted_at: new Date().toISOString(),
          build_completed_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (updateError) throw updateError;

      // Create assessment result entry with time tracking
      const { data: resultData, error: resultError } = await supabase
        .from('assessment_results')
        .insert([{
          user_id: user.id,
          assessment_id: 'incubator-20',
          assessment_name: 'Incubator:20',
          assessment_type: 'strategic',
          results_data: {
            scenario,
            frameAnswers,
            finalPlan: planSections,
            wordCount,
            timeElapsed,
          } as any,
          time_spent_seconds: timeElapsed,
          metadata: {
            wordCount,
            hasVoiceRationale: !!voiceUrl
          }
        }])
        .select()
        .single();

      if (resultError) throw resultError;

      // Link assessment result to session
      await supabase
        .from('incubator_sessions')
        .update({ assessment_result_id: resultData.id })
        .eq('id', sessionId);

      setPhase('complete');
      toast.success('Assessment submitted! Calculating your scores...');

      // Trigger scoring in background (will be implemented separately)
      supabase.functions.invoke('score-incubator', {
        body: { sessionId },
      }).catch(console.error);

    } catch (error: any) {
      console.error('Error submitting assessment:', error);
      toast.error('Failed to submit assessment');
    } finally {
      setIsSubmitting(false);
    }
  }, [sessionId, user, planSections, wordCount, scenario, frameAnswers, timeElapsed]);

  return {
    sessionId,
    phase,
    setPhase,
    frameAnswers,
    saveFrameAnswers,
    planSections,
    updatePlanSection,
    wordCount,
    timeElapsed,
    logAction,
    submitAssessment,
    isSubmitting,
  };
}

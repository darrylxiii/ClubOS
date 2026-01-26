import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

interface StepTiming {
  step: number;
  startTime: number;
  endTime?: number;
}

/**
 * Hook for tracking funnel analytics events
 * Uses the existing funnel_analytics table schema
 */
export function useFunnelAnalytics(sessionId: string) {
  const stepTimings = useRef<StepTiming[]>([]);
  const interactionCount = useRef(0);

  // Track step view
  const trackStepView = useCallback(async (stepIndex: number, stepName: string) => {
    // Record start time for this step
    stepTimings.current.push({
      step: stepIndex,
      startTime: Date.now(),
    });

    try {
      await supabase.from('funnel_analytics').insert({
        session_id: sessionId,
        step_number: stepIndex,
        step_name: stepName,
        action: 'view',
        user_agent: navigator.userAgent,
        source_channel: new URLSearchParams(window.location.search).get("source") || "direct",
        utm_source: new URLSearchParams(window.location.search).get("utm_source"),
        utm_medium: new URLSearchParams(window.location.search).get("utm_medium"),
        utm_campaign: new URLSearchParams(window.location.search).get("utm_campaign"),
      });
    } catch (error) {
      logger.warn('Failed to track step view', { error, componentName: 'FunnelAnalytics' });
    }
  }, [sessionId]);

  // Track step completion
  const trackStepComplete = useCallback(async (stepIndex: number, stepName: string) => {
    // Calculate time spent on step
    const currentTiming = stepTimings.current.find(t => t.step === stepIndex && !t.endTime);
    let timeSpentSeconds = 0;
    
    if (currentTiming) {
      currentTiming.endTime = Date.now();
      timeSpentSeconds = Math.floor((currentTiming.endTime - currentTiming.startTime) / 1000);
    }

    try {
      await supabase.from('funnel_analytics').insert({
        session_id: sessionId,
        step_number: stepIndex,
        step_name: stepName,
        action: 'complete',
        time_on_step_seconds: timeSpentSeconds,
        user_agent: navigator.userAgent,
      });
      
      // Reset interaction count for next step
      interactionCount.current = 0;
    } catch (error) {
      logger.warn('Failed to track step complete', { error, componentName: 'FunnelAnalytics' });
    }
  }, [sessionId]);

  // Track step abandonment
  const trackStepAbandon = useCallback(async (stepIndex: number, stepName: string) => {
    const currentTiming = stepTimings.current.find(t => t.step === stepIndex && !t.endTime);
    let timeSpentSeconds = 0;
    
    if (currentTiming) {
      currentTiming.endTime = Date.now();
      timeSpentSeconds = Math.floor((currentTiming.endTime - currentTiming.startTime) / 1000);
    }

    try {
      await supabase.from('funnel_analytics').insert({
        session_id: sessionId,
        step_number: stepIndex,
        step_name: stepName,
        action: 'abandon',
        time_on_step_seconds: timeSpentSeconds,
        user_agent: navigator.userAgent,
      });
    } catch (error) {
      logger.warn('Failed to track step abandon', { error, componentName: 'FunnelAnalytics' });
    }
  }, [sessionId]);

  // Track field interaction (lightweight)
  const trackFieldInteraction = useCallback((fieldName: string, interactionType: 'focus' | 'blur' | 'change') => {
    interactionCount.current += 1;
    // Field interactions are tracked in-memory only to reduce DB writes
  }, []);

  // Track verification events
  const trackVerification = useCallback(async (
    type: 'email' | 'phone',
    status: 'sent' | 'verified' | 'failed' | 'resend'
  ) => {
    try {
      await supabase.from('funnel_analytics').insert({
        session_id: sessionId,
        step_number: type === 'email' ? 0 : 4,
        step_name: type === 'email' ? 'contact' : 'verification',
        action: `${type}_${status}`,
        user_agent: navigator.userAgent,
      });
    } catch (error) {
      logger.warn('Failed to track verification', { error, componentName: 'FunnelAnalytics' });
    }
  }, [sessionId]);

  // Track funnel completion
  const trackFunnelComplete = useCallback(async (totalTimeSeconds: number) => {
    try {
      await supabase.from('funnel_analytics').insert({
        session_id: sessionId,
        step_number: 5,
        step_name: 'complete',
        action: 'funnel_complete',
        time_on_step_seconds: totalTimeSeconds,
        user_agent: navigator.userAgent,
      });
    } catch (error) {
      logger.warn('Failed to track funnel complete', { error, componentName: 'FunnelAnalytics' });
    }
  }, [sessionId]);

  // Track exit intent shown
  const trackExitIntent = useCallback(async (action: 'shown' | 'continued' | 'exited') => {
    try {
      await supabase.from('funnel_analytics').insert({
        session_id: sessionId,
        step_number: -1,
        step_name: 'exit_intent',
        action: `exit_${action}`,
        user_agent: navigator.userAgent,
      });
    } catch (error) {
      logger.warn('Failed to track exit intent', { error, componentName: 'FunnelAnalytics' });
    }
  }, [sessionId]);

  return {
    trackStepView,
    trackStepComplete,
    trackStepAbandon,
    trackFieldInteraction,
    trackVerification,
    trackFunnelComplete,
    trackExitIntent,
  };
}

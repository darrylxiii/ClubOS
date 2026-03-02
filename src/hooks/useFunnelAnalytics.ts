import { useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

interface StepTiming {
  step: number;
  startTime: number;
  endTime?: number;
}

interface UtmOverrides {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  source_channel?: string | null;
}

/**
 * Hook for tracking funnel analytics events
 * Uses the existing funnel_analytics table schema
 */
export function useFunnelAnalytics(sessionId: string) {
  const stepTimings = useRef<StepTiming[]>([]);
  const interactionCount = useRef(0);
  const trackedStepViews = useRef<Set<number>>(new Set());
  const utmOverrides = useRef<UtmOverrides | null>(null);

  // Allow setting UTM overrides (e.g. from resumed session saved data)
  const setUtmOverrides = useCallback((overrides: UtmOverrides) => {
    utmOverrides.current = overrides;
  }, []);

  const getUtms = useCallback(() => {
    if (utmOverrides.current) {
      return {
        source_channel: utmOverrides.current.source_channel || 'direct',
        utm_source: utmOverrides.current.utm_source || null,
        utm_medium: utmOverrides.current.utm_medium || null,
        utm_campaign: utmOverrides.current.utm_campaign || null,
      };
    }
    const params = new URLSearchParams(window.location.search);
    return {
      source_channel: params.get('source') || 'direct',
      utm_source: params.get('utm_source'),
      utm_medium: params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign'),
    };
  }, []);

  // Track step view (with deduplication)
  const trackStepView = useCallback(async (stepIndex: number, stepName: string) => {
    if (trackedStepViews.current.has(stepIndex)) return;
    trackedStepViews.current.add(stepIndex);

    stepTimings.current.push({
      step: stepIndex,
      startTime: Date.now(),
    });

    try {
      const utms = getUtms();
      await supabase.from('funnel_analytics').insert({
        session_id: sessionId,
        step_number: stepIndex,
        step_name: stepName,
        action: 'view',
        user_agent: navigator.userAgent,
        ...utms,
        metadata: { funnel_version: 3 },
      });
    } catch (error) {
      logger.warn('Failed to track step view', { error, componentName: 'FunnelAnalytics' });
    }
  }, [sessionId, getUtms]);

  // Track step completion
  const trackStepComplete = useCallback(async (stepIndex: number, stepName: string) => {
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
        metadata: { funnel_version: 3 },
      });
      
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
        metadata: { funnel_version: 3 },
      });
    } catch (error) {
      logger.warn('Failed to track step abandon', { error, componentName: 'FunnelAnalytics' });
    }
  }, [sessionId]);

  // Track field interaction (lightweight)
  const trackFieldInteraction = useCallback((_fieldName: string, _interactionType: 'focus' | 'blur' | 'change') => {
    interactionCount.current += 1;
  }, []);

  // Track funnel completion (step 2 is the actual final step)
  const trackFunnelComplete = useCallback(async (totalTimeSeconds: number) => {
    try {
      await supabase.from('funnel_analytics').insert({
        session_id: sessionId,
        step_number: 2,
        step_name: 'complete',
        action: 'funnel_complete',
        time_on_step_seconds: totalTimeSeconds,
        user_agent: navigator.userAgent,
        metadata: { funnel_version: 3 },
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
        metadata: { funnel_version: 3 },
      });
    } catch (error) {
      logger.warn('Failed to track exit intent', { error, componentName: 'FunnelAnalytics' });
    }
  }, [sessionId]);

  return useMemo(() => ({
    trackStepView,
    trackStepComplete,
    trackStepAbandon,
    trackFieldInteraction,
    trackFunnelComplete,
    trackExitIntent,
    setUtmOverrides,
  }), [trackStepView, trackStepComplete, trackStepAbandon, trackFieldInteraction, trackFunnelComplete, trackExitIntent, setUtmOverrides]);
}

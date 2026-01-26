/**
 * A/B Testing Hook for Partner Funnel
 * Manages experiment variants and tracks conversions
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useFeatureFlag } from './useFeatureFlag';

// Experiment definitions
export type FunnelExperiment = 
  | 'partner_funnel_cta'      // CTA button text variants
  | 'partner_funnel_headline' // Headline copy variants
  | 'partner_funnel_layout'   // Step layout variants
  | 'partner_funnel_trust';   // Trust badge placement

interface ExperimentVariant {
  id: string;
  name: string;
  value: string | Record<string, any>;
  weight: number; // 0-100 percentage
}

interface ExperimentConfig {
  id: FunnelExperiment;
  name: string;
  variants: ExperimentVariant[];
  isActive: boolean;
}

// Default experiment configurations
const EXPERIMENTS: ExperimentConfig[] = [
  {
    id: 'partner_funnel_cta',
    name: 'CTA Button Text',
    isActive: true,
    variants: [
      { id: 'control', name: 'Control', value: 'Continue', weight: 50 },
      { id: 'action', name: 'Action-Oriented', value: 'Start Partnership', weight: 50 },
    ],
  },
  {
    id: 'partner_funnel_headline',
    name: 'Headline Copy',
    isActive: true,
    variants: [
      { id: 'control', name: 'Control', value: 'Partner Request', weight: 34 },
      { id: 'benefit', name: 'Benefit-Focused', value: 'Access Top Talent Today', weight: 33 },
      { id: 'exclusive', name: 'Exclusivity', value: 'Join The Quantum Club', weight: 33 },
    ],
  },
  {
    id: 'partner_funnel_trust',
    name: 'Trust Badge Placement',
    isActive: true,
    variants: [
      { id: 'control', name: 'Bottom', value: 'bottom', weight: 50 },
      { id: 'inline', name: 'Inline', value: 'inline', weight: 50 },
    ],
  },
];

interface UseFunnelABTestResult {
  variant: string;
  variantValue: string | Record<string, any>;
  isLoading: boolean;
  trackConversion: (conversionType?: string) => Promise<void>;
  trackExposure: () => Promise<void>;
}

/**
 * Get or assign a variant for an experiment
 */
export function useFunnelABTest(
  experimentId: FunnelExperiment,
  sessionId: string
): UseFunnelABTestResult {
  const [variant, setVariant] = useState<string>('control');
  const [variantValue, setVariantValue] = useState<string | Record<string, any>>('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasTrackedExposure, setHasTrackedExposure] = useState(false);
  
  // Check if AB testing is enabled via feature flag
  const { enabled: abTestingEnabled } = useFeatureFlag('partner_funnel_ab', true);

  // Get experiment config
  const experiment = useMemo(() => 
    EXPERIMENTS.find(e => e.id === experimentId),
    [experimentId]
  );

  // Assign variant based on session ID (consistent per session)
  useEffect(() => {
    if (!experiment?.isActive || !abTestingEnabled) {
      setIsLoading(false);
      return;
    }

    const assignVariant = async () => {
      try {
        // Check if variant already assigned for this session
        const storageKey = `ab_${experimentId}_${sessionId}`;
        const cached = localStorage.getItem(storageKey);
        
        if (cached) {
          const { variant: cachedVariant, value: cachedValue } = JSON.parse(cached);
          setVariant(cachedVariant);
          setVariantValue(cachedValue);
          setIsLoading(false);
          return;
        }

        // Deterministic variant assignment based on session hash
        const hash = hashString(sessionId + experimentId);
        const normalizedHash = (hash % 100) + 1;
        
        let cumulativeWeight = 0;
        let selectedVariant = experiment.variants[0];
        
        for (const v of experiment.variants) {
          cumulativeWeight += v.weight;
          if (normalizedHash <= cumulativeWeight) {
            selectedVariant = v;
            break;
          }
        }

        setVariant(selectedVariant.id);
        setVariantValue(selectedVariant.value);
        
        // Cache for session consistency
        localStorage.setItem(storageKey, JSON.stringify({
          variant: selectedVariant.id,
          value: selectedVariant.value,
        }));

      } catch (error) {
        console.error('[ABTest] Error assigning variant:', error);
      } finally {
        setIsLoading(false);
      }
    };

    assignVariant();
  }, [experimentId, sessionId, experiment, abTestingEnabled]);

  // Track exposure (when user sees the variant)
  const trackExposure = useCallback(async () => {
    if (hasTrackedExposure || !experiment?.isActive) return;
    
    try {
      await supabase.from('funnel_analytics').insert({
        session_id: sessionId,
        step_number: -1, // Special marker for AB test events
        step_name: 'ab_exposure',
        action: 'exposure',
        device_type: getDeviceType(),
        metadata: {
          experiment_id: experimentId,
          variant_id: variant,
          experiment_name: experiment.name,
        },
      });
      
      setHasTrackedExposure(true);
    } catch (error) {
      console.error('[ABTest] Error tracking exposure:', error);
    }
  }, [sessionId, experimentId, variant, experiment, hasTrackedExposure]);

  // Track conversion
  const trackConversion = useCallback(async (conversionType: string = 'complete') => {
    if (!experiment?.isActive) return;
    
    try {
      await supabase.from('funnel_analytics').insert({
        session_id: sessionId,
        step_number: -2, // Special marker for conversion
        step_name: 'ab_conversion',
        action: conversionType,
        device_type: getDeviceType(),
        metadata: {
          experiment_id: experimentId,
          variant_id: variant,
          experiment_name: experiment.name,
          conversion_type: conversionType,
        },
      });
    } catch (error) {
      console.error('[ABTest] Error tracking conversion:', error);
    }
  }, [sessionId, experimentId, variant, experiment]);

  return {
    variant,
    variantValue,
    isLoading,
    trackConversion,
    trackExposure,
  };
}

// Simple hash function for deterministic variant assignment
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Get device type for segmentation
function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/tablet|ipad/i.test(ua)) return 'tablet';
  if (/mobile|android|iphone/i.test(ua)) return 'mobile';
  return 'desktop';
}

/**
 * Hook to get all active experiments for the funnel
 */
export function useActiveFunnelExperiments(sessionId: string) {
  const ctaTest = useFunnelABTest('partner_funnel_cta', sessionId);
  const headlineTest = useFunnelABTest('partner_funnel_headline', sessionId);
  const trustTest = useFunnelABTest('partner_funnel_trust', sessionId);

  return {
    cta: ctaTest,
    headline: headlineTest,
    trust: trustTest,
    isLoading: ctaTest.isLoading || headlineTest.isLoading || trustTest.isLoading,
    trackAllConversions: async (type?: string) => {
      await Promise.all([
        ctaTest.trackConversion(type),
        headlineTest.trackConversion(type),
        trustTest.trackConversion(type),
      ]);
    },
  };
}

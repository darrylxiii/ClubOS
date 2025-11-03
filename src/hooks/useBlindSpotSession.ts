import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BlindSpotSelfRating, BlindSpotResult, BlindSpotGap } from '@/types/assessment';
import { BLIND_SPOT_DIMENSIONS, BLIND_SPOT_SCENARIOS } from '@/data/blindSpotData';
import { useToast } from '@/hooks/use-toast';

export function useBlindSpotSession() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selfRatings, setSelfRatings] = useState<BlindSpotSelfRating[]>([]);
  const [scenarioResponses, setScenarioResponses] = useState<Array<{
    scenarioId: string;
    choiceId: string;
    timestamp: string;
    timeSpent: number;
  }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const initSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('blind_spot_sessions')
        .insert({
          user_id: user.id,
          started_at: new Date().toISOString(),
          self_ratings: [],
          scenario_responses: []
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create session:', error);
        toast({ title: 'Error', description: 'Failed to start assessment', variant: 'destructive' });
      } else {
        setSessionId(data.id);
      }
    };

    initSession();
  }, [toast]);

  const saveSelfRatings = useCallback(async (ratings: BlindSpotSelfRating[]) => {
    if (!sessionId) return;

    setSelfRatings(ratings);

    await supabase
      .from('blind_spot_sessions')
      .update({ self_ratings: ratings as any })
      .eq('id', sessionId);
  }, [sessionId]);

  const addScenarioResponse = useCallback(async (scenarioId: string, choiceId: string, timeSpent: number) => {
    if (!sessionId) return;

    const response = {
      scenarioId,
      choiceId,
      timestamp: new Date().toISOString(),
      timeSpent
    };

    setScenarioResponses(prev => [...prev, response]);
  }, [sessionId]);

  const calculateResults = useCallback((): BlindSpotResult => {
    // Calculate objective scores from scenario responses
    const objectiveScores: { [dimensionId: string]: number } = {};
    
    BLIND_SPOT_DIMENSIONS.forEach(dim => {
      const relevantScenarios = BLIND_SPOT_SCENARIOS.filter(s => 
        s.dimensionsTested.includes(dim.id)
      );
      
      let totalScore = 0;
      let count = 0;

      relevantScenarios.forEach(scenario => {
        const response = scenarioResponses.find(r => r.scenarioId === scenario.id);
        if (response) {
          const choice = scenario.choices.find(c => c.id === response.choiceId);
          if (choice && choice.scores[dim.id] !== undefined) {
            totalScore += choice.scores[dim.id];
            count++;
          }
        }
      });

      // Normalize to 1-10 scale (scores range from -2 to +2)
      const avgScore = count > 0 ? totalScore / count : 0;
      objectiveScores[dim.id] = Math.max(1, Math.min(10, 5 + (avgScore * 2)));
    });

    // Calculate gaps
    const gaps: BlindSpotGap[] = BLIND_SPOT_DIMENSIONS.map(dim => {
      const selfRating = selfRatings.find(r => r.dimensionId === dim.id)?.selfRating || 5;
      const objectiveRating = objectiveScores[dim.id] || 5;
      const gap = selfRating - objectiveRating;

      return {
        dimension: dim.name,
        selfRating,
        objectiveRating,
        gap,
        type: Math.abs(gap) < 1.5 ? 'accurate' as const :
              gap > 1.5 ? 'blind_spot' as const :
              'hidden_strength' as const
      };
    });

    // Calculate overall self-awareness score
    const avgAbsoluteGap = gaps.reduce((sum, g) => sum + Math.abs(g.gap), 0) / gaps.length;
    const selfAwarenessScore = Math.max(0, 100 - (avgAbsoluteGap * 15));

    // Calculate coachability (hidden strengths indicate humility)
    const hiddenStrengthCount = gaps.filter(g => g.type === 'hidden_strength').length;
    const coachabilityScore = (hiddenStrengthCount / gaps.length) * 100;

    // Get top blind spots and hidden strengths
    const blindSpots = gaps
      .filter(g => g.type === 'blind_spot')
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 3)
      .map(g => g.dimension);

    const hiddenStrengths = gaps
      .filter(g => g.type === 'hidden_strength')
      .sort((a, b) => a.gap - b.gap)
      .slice(0, 3)
      .map(g => g.dimension);

    // Create dimension scores object
    const dimensionScores: { [key: string]: { self: number; objective: number } } = {};
    BLIND_SPOT_DIMENSIONS.forEach(dim => {
      const selfRating = selfRatings.find(r => r.dimensionId === dim.id)?.selfRating || 5;
      dimensionScores[dim.name] = {
        self: selfRating,
        objective: objectiveScores[dim.id] || 5
      };
    });

    return {
      selfAwarenessScore,
      coachabilityScore,
      gaps,
      topBlindSpots: blindSpots,
      hiddenStrengths,
      dimensionScores
    };
  }, [selfRatings, scenarioResponses]);

  const submitAssessment = useCallback(async () => {
    if (!sessionId || isSubmitting) return;

    setIsSubmitting(true);
    const results = calculateResults();

    try {
      await supabase
        .from('blind_spot_sessions')
        .update({
          completed_at: new Date().toISOString(),
          scenario_responses: scenarioResponses as any,
          objective_scores: results.dimensionScores as any,
          awareness_gaps: results.gaps as any,
          overall_self_awareness_score: results.selfAwarenessScore,
          coachability_indicator: results.coachabilityScore,
          top_blind_spots: results.topBlindSpots,
          hidden_strengths: results.hiddenStrengths
        })
        .eq('id', sessionId);

      // Save to assessment_results
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('assessment_results').insert({
          assessment_id: 'blind_spot_detector',
          assessment_name: 'Blind Spot Detector',
          assessment_type: 'personality',
          score: results.selfAwarenessScore,
          results_data: results as any
        });
      }

      toast({ title: 'Success', description: 'Assessment completed!' });
      return results;
    } catch (error) {
      console.error('Failed to submit assessment:', error);
      toast({ title: 'Error', description: 'Failed to save results', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  }, [sessionId, isSubmitting, scenarioResponses, calculateResults, toast]);

  return {
    sessionId,
    selfRatings,
    scenarioResponses,
    saveSelfRatings,
    addScenarioResponse,
    submitAssessment,
    isSubmitting
  };
}

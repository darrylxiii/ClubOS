import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ValueAllocation, ValuesPokerResult } from '@/types/assessment';
import { WORK_VALUES, VALUE_TRADEOFF_SCENARIOS, VALUE_ARCHETYPES } from '@/data/valuesPokerData';
import { useToast } from '@/hooks/use-toast';

export function useValuesPokerSession() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [statedPriorities, setStatedPriorities] = useState<ValueAllocation[]>([]);
  const [tradeoffResponses, setTradeoffResponses] = useState<Array<{
    scenarioId: string;
    choice: 'A' | 'B';
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
        .from('values_poker_sessions')
        .insert({
          user_id: user.id,
          started_at: new Date().toISOString(),
          stated_priorities: [],
          tradeoff_responses: []
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

  const saveStatedPriorities = useCallback(async (priorities: ValueAllocation[]) => {
    if (!sessionId) return;

    setStatedPriorities(priorities);

    await supabase
      .from('values_poker_sessions')
      .update({ stated_priorities: priorities as any })
      .eq('id', sessionId);
  }, [sessionId]);

  const addTradeoffResponse = useCallback(async (scenarioId: string, choice: 'A' | 'B', timeSpent: number) => {
    if (!sessionId) return;

    const response = {
      scenarioId,
      choice,
      timestamp: new Date().toISOString(),
      timeSpent
    };

    setTradeoffResponses(prev => [...prev, response]);
  }, [sessionId]);

  const calculateResults = useCallback((): ValuesPokerResult => {
    // Calculate revealed priorities from trade-off choices
    const revealedScores: { [valueId: string]: number } = {};
    WORK_VALUES.forEach(v => revealedScores[v.id] = 0);

    tradeoffResponses.forEach(response => {
      const scenario = VALUE_TRADEOFF_SCENARIOS.find(s => s.id === response.scenarioId);
      if (!scenario) return;

      const chosen = response.choice === 'A' ? scenario.optionA : scenario.optionB;
      
      Object.entries(chosen.values).forEach(([valueId, weight]) => {
        revealedScores[valueId] = (revealedScores[valueId] || 0) + weight;
      });
    });

    // Normalize to 100 points
    const total = Object.values(revealedScores).reduce((sum, v) => Math.max(0, sum + v), 0);
    const revealedPriorities: ValueAllocation[] = Object.entries(revealedScores).map(([valueId, score]) => ({
      valueId,
      points: total > 0 ? (Math.max(0, score) / total) * 100 : 0
    }));

    // Calculate consistency (correlation between stated and revealed)
    let consistency = 0;
    if (statedPriorities.length > 0) {
      const correlationSum = statedPriorities.reduce((sum, stated) => {
        const revealed = revealedPriorities.find(r => r.valueId === stated.valueId);
        if (!revealed) return sum;
        return sum + (stated.points * revealed.points);
      }, 0);
      
      const statedMagnitude = Math.sqrt(statedPriorities.reduce((sum, s) => sum + s.points * s.points, 0));
      const revealedMagnitude = Math.sqrt(revealedPriorities.reduce((sum, r) => sum + r.points * r.points, 0));
      
      consistency = correlationSum / (statedMagnitude * revealedMagnitude);
      consistency = Math.max(0, Math.min(100, consistency * 100));
    }

    // Determine archetype based on top revealed value
    const sortedRevealed = [...revealedPriorities].sort((a, b) => b.points - a.points);
    const topValueId = sortedRevealed[0]?.valueId || 'growth';
    const archetype = VALUE_ARCHETYPES[topValueId as keyof typeof VALUE_ARCHETYPES]?.name || 'The Builder';

    // Get top 3 values
    const topValues = sortedRevealed
      .slice(0, 3)
      .map(v => WORK_VALUES.find(wv => wv.id === v.valueId)?.name || v.valueId);

    // Identify red flags (large discrepancies)
    const redFlags: string[] = [];
    statedPriorities.forEach(stated => {
      const revealed = revealedPriorities.find(r => r.valueId === stated.valueId);
      if (revealed) {
        const diff = Math.abs(stated.points - revealed.points);
        if (diff > 20) {
          const valueName = WORK_VALUES.find(v => v.id === stated.valueId)?.name || stated.valueId;
          if (stated.points > revealed.points) {
            redFlags.push(`Said ${valueName} matters (${stated.points.toFixed(0)}%) but chose it less (${revealed.points.toFixed(0)}%)`);
          } else {
            redFlags.push(`Downplayed ${valueName} (${stated.points.toFixed(0)}%) but revealed preference (${revealed.points.toFixed(0)}%)`);
          }
        }
      }
    });

    // Mock culture fit scores
    const cultureFitScores: { [key: string]: number } = {
      'High-Growth Startup': revealedScores.innovation * 2 + revealedScores.impact * 2 + revealedScores.autonomy,
      'Enterprise Corp': revealedScores.stability * 3 + revealedScores.compensation * 2 + revealedScores.prestige,
      'Mission-Driven Org': revealedScores.impact * 4 + revealedScores.team_culture * 2
    };

    return {
      archetype,
      consistencyScore: consistency,
      statedPriorities,
      revealedPriorities,
      topValues,
      cultureFitScores,
      redFlags
    };
  }, [statedPriorities, tradeoffResponses]);

  const submitAssessment = useCallback(async () => {
    if (!sessionId || isSubmitting) return;

    setIsSubmitting(true);
    const results = calculateResults();

    try {
      await supabase
        .from('values_poker_sessions')
        .update({
          completed_at: new Date().toISOString(),
          tradeoff_responses: tradeoffResponses as any,
          revealed_priorities: results.revealedPriorities as any,
          consistency_score: results.consistencyScore,
          value_archetype: results.archetype,
          culture_fit_scores: results.cultureFitScores as any,
          red_flags: results.redFlags
        })
        .eq('id', sessionId);

      // Save to assessment_results
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('assessment_results').insert({
          assessment_id: 'values_poker',
          assessment_name: 'Values Poker',
          assessment_type: 'culture',
          score: results.consistencyScore,
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
  }, [sessionId, isSubmitting, tradeoffResponses, calculateResults, toast]);

  return {
    sessionId,
    statedPriorities,
    tradeoffResponses,
    saveStatedPriorities,
    addTradeoffResponse,
    submitAssessment,
    isSubmitting
  };
}

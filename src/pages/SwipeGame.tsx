import { memo, useState, useCallback } from 'react';
import { InstructionsPage } from '@/components/swipe-game/InstructionsPage';
import { SwipeInterface } from '@/components/swipe-game/SwipeInterface';
import { LoadingScreen } from '@/components/swipe-game/LoadingScreen';
import { ResultsDashboard } from '@/components/swipe-game/ResultsDashboard';
import { SWIPE_SCENARIOS } from '@/data/assessments';
import { SwipeResult, SwipeScenario, SwipeDirection } from '@/types/assessment';

type GameStage = 'instructions' | 'swiping' | 'loading' | 'results';

const SwipeGame = memo(() => {
  const [stage, setStage] = useState<GameStage>('instructions');
  const [result, setResult] = useState<SwipeResult | null>(null);

  const handleStart = useCallback(() => {
    setStage('swiping');
  }, []);

  const handleComplete = useCallback(
    (responses: Array<{ scenario: SwipeScenario; direction: SwipeDirection }>) => {
      setStage('loading');

      // Calculate results based on responses
      setTimeout(() => {
        const traitScores: { [key: string]: number } = {};
        let totalPoints = 0;

        // Calculate trait scores
        responses.forEach(({ scenario, direction }) => {
          const points = direction === 'up' ? 2 : direction === 'right' ? 1 : direction === 'left' ? -1 : -2;
          totalPoints += points;

          Object.entries(scenario.traits).forEach(([trait, weight]) => {
            if (!traitScores[trait]) traitScores[trait] = 0;
            traitScores[trait] += points * weight;
          });
        });

        // Normalize scores to 0-10 scale
        const maxScore = Math.max(...Object.values(traitScores));
        const normalizedTraits: { [key: string]: number } = {};
        Object.entries(traitScores).forEach(([trait, score]) => {
          normalizedTraits[trait] = Math.round((score / maxScore) * 10);
        });

        // Determine archetype
        const topTrait = Object.entries(normalizedTraits).sort(([, a], [, b]) => b - a)[0][0];
        const archetypes: { [key: string]: string } = {
          leadership: 'Natural Leader',
          collaboration: 'Team Player',
          analytical: 'Strategic Thinker',
          innovation: 'Innovator',
          autonomy: 'Independent Contributor',
        };

        const calculatedResult: SwipeResult = {
          score: Math.round(((totalPoints + 100) / 200) * 100),
          archetype: archetypes[topTrait] || 'Balanced Professional',
          traits: normalizedTraits,
          topStrengths: [
            'Excels in collaborative environments',
            'Strong problem-solving abilities',
            'Adapts quickly to change',
          ],
          growthAreas: [
            'Could improve time management',
            'Consider developing leadership skills',
          ],
          recommendedJobs: [
            { title: 'Senior Product Manager', match: 92 },
            { title: 'Tech Lead', match: 88 },
            { title: 'Engineering Manager', match: 85 },
          ],
        };

        setResult(calculatedResult);
        setStage('results');
      }, 3000);
    },
    []
  );

  const handleLoadingComplete = useCallback(() => {
    setStage('results');
  }, []);

  return (
    <>
      {stage === 'instructions' && <InstructionsPage onStart={handleStart} />}
      {stage === 'swiping' && (
        <SwipeInterface scenarios={SWIPE_SCENARIOS} onComplete={handleComplete} />
      )}
      {stage === 'loading' && <LoadingScreen onComplete={handleLoadingComplete} />}
      {stage === 'results' && result && <ResultsDashboard result={result} />}
    </>
  );
});

SwipeGame.displayName = 'SwipeGame';

export default SwipeGame;

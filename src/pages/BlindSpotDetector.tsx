import { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { useBlindSpotSession } from '@/hooks/useBlindSpotSession';
import { BLIND_SPOT_DIMENSIONS, BLIND_SPOT_SCENARIOS } from '@/data/blindSpotData';
import { BlindSpotIntro } from '@/components/blind-spot/BlindSpotIntro';
import { BlindSpotSelfRating } from '@/components/blind-spot/BlindSpotSelfRating';
import { BlindSpotScenarios } from '@/components/blind-spot/BlindSpotScenarios';
import { BlindSpotResults } from '@/components/blind-spot/BlindSpotResults';
import { BlindSpotResult } from '@/types/assessment';

const BlindSpotDetector = memo(() => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<'intro' | 'self-rating' | 'scenarios' | 'results'>('intro');
  const [results, setResults] = useState<BlindSpotResult | null>(null);
  
  const session = useBlindSpotSession();

  const handleStart = () => {
    setPhase('self-rating');
  };

  const handleSelfRatingComplete = () => {
    setPhase('scenarios');
  };

  const handleScenariosComplete = async () => {
    const assessmentResults = await session.submitAssessment();
    if (assessmentResults) {
      setResults(assessmentResults);
      setPhase('results');
    }
  };

  const handleBackToAssessments = () => {
    navigate('/assessments');
  };

  return (
    <AppLayout>
      {phase === 'intro' && (
        <BlindSpotIntro onStart={handleStart} />
      )}

      {phase === 'self-rating' && (
        <BlindSpotSelfRating
          dimensions={BLIND_SPOT_DIMENSIONS}
          session={session}
          onComplete={handleSelfRatingComplete}
        />
      )}

      {phase === 'scenarios' && (
        <BlindSpotScenarios
          scenarios={BLIND_SPOT_SCENARIOS}
          session={session}
          onComplete={handleScenariosComplete}
        />
      )}

      {phase === 'results' && results && (
        <BlindSpotResults
          results={results}
          onBack={handleBackToAssessments}
        />
      )}
    </AppLayout>
  );
});

BlindSpotDetector.displayName = 'BlindSpotDetector';

export default BlindSpotDetector;

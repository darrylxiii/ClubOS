import { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { useValuesPokerSession } from '@/hooks/useValuesPokerSession';
import { WORK_VALUES, VALUE_TRADEOFF_SCENARIOS } from '@/data/valuesPokerData';
import { ValuesPokerIntro } from '@/components/values-poker/ValuesPokerIntro';
import { ValuesAllocation } from '@/components/values-poker/ValuesAllocation';
import { ValuesTradeoffs } from '@/components/values-poker/ValuesTradeoffs';
import { ValuesPokerResults } from '@/components/values-poker/ValuesPokerResults';
import { ValuesPokerResult } from '@/types/assessment';

const ValuesPoker = memo(() => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<'intro' | 'allocation' | 'tradeoffs' | 'results'>('intro');
  const [results, setResults] = useState<ValuesPokerResult | null>(null);
  
  const session = useValuesPokerSession();

  const handleStart = () => {
    setPhase('allocation');
  };

  const handleAllocationComplete = () => {
    setPhase('tradeoffs');
  };

  const handleTradeoffsComplete = async () => {
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
        <ValuesPokerIntro onStart={handleStart} />
      )}

      {phase === 'allocation' && (
        <ValuesAllocation
          values={WORK_VALUES}
          session={session}
          onComplete={handleAllocationComplete}
        />
      )}

      {phase === 'tradeoffs' && (
        <ValuesTradeoffs
          scenarios={VALUE_TRADEOFF_SCENARIOS}
          session={session}
          onComplete={handleTradeoffsComplete}
        />
      )}

      {phase === 'results' && results && (
        <ValuesPokerResults
          results={results}
          onBack={handleBackToAssessments}
        />
      )}
    </AppLayout>
  );
});

ValuesPoker.displayName = 'ValuesPoker';

export default ValuesPoker;

import { memo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { usePressureCookerSession } from '@/hooks/usePressureCookerSession';
import { PRESSURE_COOKER_SCENARIOS } from '@/data/pressureCookerScenarios';
import { PressureCookerIntro } from '@/components/pressure-cooker/PressureCookerIntro';
import { PressureCookerGame } from '@/components/pressure-cooker/PressureCookerGame';
import { PressureCookerResults } from '@/components/pressure-cooker/PressureCookerResults';
import { PressureCookerResult } from '@/types/assessment';

const PressureCooker = memo(() => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<'intro' | 'playing' | 'results'>('intro');
  const [results, setResults] = useState<PressureCookerResult | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  const scenario = PRESSURE_COOKER_SCENARIOS.product_launch;
  const session = usePressureCookerSession('product_launch', scenario.tasks);

  useEffect(() => {
    if (phase !== 'playing') return;
    
    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    // Auto-present tasks based on arrivalTime
    scenario.tasks.forEach(task => {
      const timeout = setTimeout(() => {
        session.addVisibleTask(task);
      }, task.arrivalTime * 1000);
      
      return () => clearTimeout(timeout);
    });

    return () => clearInterval(interval);
  }, [phase, scenario.tasks, session]);

  const handleStart = () => {
    setPhase('playing');
  };

  const handleComplete = async () => {
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
        <PressureCookerIntro
          scenario={scenario}
          onStart={handleStart}
        />
      )}

      {phase === 'playing' && (
        <PressureCookerGame
          session={session}
          elapsedTime={elapsedTime}
          onComplete={handleComplete}
        />
      )}

      {phase === 'results' && results && (
        <PressureCookerResults
          results={results}
          onBack={handleBackToAssessments}
        />
      )}
    </AppLayout>
  );
});

PressureCooker.displayName = 'PressureCooker';

export default PressureCooker;

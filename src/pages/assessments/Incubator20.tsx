import { memo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { generatePersonalizedScenario } from '@/data/incubatorScenarios';
import { useIncubatorSession } from '@/hooks/useIncubatorSession';
import { IncubatorBriefScreen } from '@/components/incubator/IncubatorBriefScreen';
import { IncubatorFrameScreen } from '@/components/incubator/IncubatorFrameScreen';
import { IncubatorBuildScreen } from '@/components/incubator/IncubatorBuildScreen';
import { IncubatorCommitScreen } from '@/components/incubator/IncubatorCommitScreen';
import { IncubatorTimer } from '@/components/incubator/IncubatorTimer';
import type { IncubatorScenario } from '@/types/assessment';

const Incubator20 = memo(() => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [scenario, setScenario] = useState<IncubatorScenario | null>(null);

  const session = useIncubatorSession(scenario!);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    // Fetch user profile for better personalization
    const loadProfileAndGenerateScenario = async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('current_title, career_preferences, location, years_of_experience')
          .eq('id', user.id)
          .single();

        // Generate personalized scenario with profile data
        const generatedScenario = generatePersonalizedScenario(profile);
        setScenario(generatedScenario);
      } catch (error) {
        console.error('Error loading profile for scenario:', error);
        // Fallback to non-personalized scenario
        const generatedScenario = generatePersonalizedScenario();
        setScenario(generatedScenario);
      }
    };

    loadProfileAndGenerateScenario();
  }, [user, navigate]);

  if (!scenario) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="text-6xl mb-4">🚀</div>
          <p className="text-muted-foreground">Generating your challenge...</p>
        </div>
      </div>
    );
  }

  const TIME_LIMIT = 20 * 60; // 20 minutes in seconds

  return (
    <div className="relative">
      {/* Timer (visible after brief phase) */}
      {session.phase !== 'brief' && session.phase !== 'complete' && (
        <IncubatorTimer
          timeElapsed={session.timeElapsed}
          timeLimit={TIME_LIMIT}
          phase={session.phase}
        />
      )}

      {/* Phase Rendering */}
      {session.phase === 'brief' && (
        <IncubatorBriefScreen
          scenario={scenario}
          onComplete={() => session.setPhase('frame')}
        />
      )}

      {session.phase === 'frame' && (
        <IncubatorFrameScreen
          onComplete={session.saveFrameAnswers}
        />
      )}

      {session.phase === 'build' && session.frameAnswers && (
        <IncubatorBuildScreen
          scenario={scenario}
          frameAnswers={session.frameAnswers}
          planSections={session.planSections}
          onSectionUpdate={session.updatePlanSection}
          totalWordCount={session.wordCount}
          onComplete={() => session.setPhase('commit')}
          logAction={session.logAction}
        />
      )}

      {session.phase === 'commit' && (
        <IncubatorCommitScreen
          planSections={session.planSections}
          totalWordCount={session.wordCount}
          onSubmit={session.submitAssessment}
          isSubmitting={session.isSubmitting}
        />
      )}

      {session.phase === 'complete' && (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="text-center space-y-6">
            <div className="text-8xl mb-4">🎉</div>
            <h1 className="text-4xl font-bold font-serif">Assessment Complete!</h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Your plan has been submitted and is being scored. Check your profile for results.
            </p>
            <button
              onClick={() => navigate('/profile')}
              className="btn btn-primary"
            >
              View My Profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

Incubator20.displayName = 'Incubator20';

export default Incubator20;

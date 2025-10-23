import { memo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { SkipForward } from 'lucide-react';
import { SwipeCard } from './SwipeCard';
import { SwipeScenario, SwipeDirection } from '@/types/assessment';
import { AnimatePresence } from 'framer-motion';

interface SwipeInterfaceProps {
  scenarios: SwipeScenario[];
  onComplete: (responses: Array<{ scenario: SwipeScenario; direction: SwipeDirection }>) => void;
}

export const SwipeInterface = memo(({ scenarios, onComplete }: SwipeInterfaceProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Array<{ scenario: SwipeScenario; direction: SwipeDirection }>>([]);

  const handleSwipe = useCallback((direction: SwipeDirection) => {
    const newResponses = [...responses, { scenario: scenarios[currentIndex], direction }];
    setResponses(newResponses);

    if (currentIndex >= scenarios.length - 1) {
      setTimeout(() => onComplete(newResponses), 300);
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, responses, scenarios, onComplete]);

  const handleSkip = useCallback(() => {
    if (currentIndex >= scenarios.length - 1) {
      onComplete(responses);
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, responses, scenarios.length, onComplete]);

  const progress = ((currentIndex + 1) / scenarios.length) * 100;

  return (
    <div className="min-h-screen flex flex-col p-4 bg-gradient-to-br from-background to-background/80">
      {/* Progress Bar */}
      <div className="max-w-2xl w-full mx-auto mb-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            {currentIndex + 1} / {scenarios.length}
          </span>
          <span className="text-muted-foreground">{Math.round(progress)}% Complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Swipe Cards Container */}
      <div className="flex-1 max-w-2xl w-full mx-auto relative">
        <AnimatePresence>
          {scenarios
            .slice(currentIndex, currentIndex + 3)
            .map((scenario, idx) => (
              <SwipeCard
                key={scenario.id}
                scenario={scenario}
                onSwipe={handleSwipe}
                index={idx}
                totalCards={3}
              />
            ))}
        </AnimatePresence>
      </div>

      {/* Skip Button */}
      <div className="max-w-2xl w-full mx-auto mt-4">
        <Button
          variant="outline"
          onClick={handleSkip}
          className="w-full"
        >
          <SkipForward className="h-4 w-4 mr-2" />
          Skip
        </Button>
      </div>
    </div>
  );
});

SwipeInterface.displayName = 'SwipeInterface';

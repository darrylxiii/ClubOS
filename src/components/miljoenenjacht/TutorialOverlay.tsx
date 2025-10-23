import { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface TutorialOverlayProps {
  onComplete: () => void;
}

const TUTORIAL_STEPS = [
  {
    title: "Welcome to Miljoenenjacht!",
    content: "This game will reveal your risk-taking personality and decision-making style. Let me show you around.",
    highlight: null
  },
  {
    title: "The Prize Board",
    content: "All possible prize amounts from €0.01 to €5,000,000. As you eliminate cases, amounts will be crossed off.",
    highlight: "prize-board"
  },
  {
    title: "Opening Cases",
    content: "Click briefcases to open them and eliminate amounts. Try to keep the high values in play!",
    highlight: "case-grid"
  },
  {
    title: "The Banker's Call",
    content: "After each round, the mysterious Banker will offer you cash to quit. The offer depends on what's left.",
    highlight: "banker"
  },
  {
    title: "Deal or No Deal?",
    content: "Every decision reveals your personality. Are you risk-averse? Optimistic? We're tracking over 50 behavioral signals.",
    highlight: null
  },
  {
    title: "Ready to Play?",
    content: "Your psychological profile and career matches will be revealed at the end. Good luck!",
    highlight: null
  }
];

export const TutorialOverlay = memo(({ onComplete }: TutorialOverlayProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('miljoenenjacht_tutorial_seen');
    if (!hasSeenTutorial) {
      setShow(true);
    } else {
      onComplete();
    }
  }, [onComplete]);

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    localStorage.setItem('miljoenenjacht_tutorial_seen', 'true');
    setShow(false);
    onComplete();
  };

  if (!show) return null;

  const step = TUTORIAL_STEPS[currentStep];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={handleSkip}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          <Card className="max-w-md w-full">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="text-sm text-muted-foreground">
                  Step {currentStep + 1} of {TUTORIAL_STEPS.length}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-3">
                <h3 className="text-xl font-bold">{step.title}</h3>
                <p className="text-muted-foreground">{step.content}</p>
              </div>

              <div className="flex gap-2">
                {currentStep > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(prev => prev - 1)}
                  >
                    Back
                  </Button>
                )}
                <Button
                  onClick={handleNext}
                  className="flex-1"
                >
                  {currentStep < TUTORIAL_STEPS.length - 1 ? 'Next' : 'Start Playing!'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

TutorialOverlay.displayName = 'TutorialOverlay';

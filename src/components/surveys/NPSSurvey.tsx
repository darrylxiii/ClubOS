/**
 * NPS Survey Component
 * Net Promoter Score survey for measuring user satisfaction
 * Triggered after successful placements
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  recordSurveyShown,
  recordSurveyResponse,
  recordSurveyDismissal,
} from '@/services/surveyTriggerService';

interface NPSSurveyProps {
  isOpen: boolean;
  onClose: () => void;
  context?: {
    placementId?: string;
    jobTitle?: string;
    companyName?: string;
  };
}

const SURVEY_TYPE = 'nps';

const NPS_LABELS: Record<number, string> = {
  0: 'Not at all likely',
  5: 'Neutral',
  10: 'Extremely likely',
};

export function NPSSurvey({ isOpen, onClose, context }: NPSSurveyProps) {
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [step, setStep] = useState<'score' | 'feedback' | 'thanks'>('score');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleScoreSelect = useCallback((value: number) => {
    setScore(value);
    // Show feedback step for detractors (0-6) and promoters (9-10)
    if (value <= 6 || value >= 9) {
      setStep('feedback');
    } else {
      // Passives (7-8) skip to submit
      handleSubmit(value, '');
    }
  }, []);

  const handleSubmit = async (finalScore: number, finalFeedback: string) => {
    setIsSubmitting(true);
    
    recordSurveyResponse(SURVEY_TYPE, {
      score: finalScore,
      feedback: finalFeedback || undefined,
      nps_category: finalScore >= 9 ? 'promoter' : finalScore >= 7 ? 'passive' : 'detractor',
      ...context,
    });
    
    setStep('thanks');
    setIsSubmitting(false);
    
    // Auto-close after thanks
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  const handleDismiss = () => {
    recordSurveyDismissal(SURVEY_TYPE);
    onClose();
  };

  const handleFeedbackSubmit = () => {
    if (score !== null) {
      handleSubmit(score, feedback);
    }
  };

  // Record shown when opened
  useState(() => {
    if (isOpen) {
      recordSurveyShown(SURVEY_TYPE);
    }
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed bottom-4 right-4 z-50 w-full max-w-md"
        >
          <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <span className="font-medium text-foreground">Quick Feedback</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDismiss}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-6">
              <AnimatePresence mode="wait">
                {step === 'score' && (
                  <motion.div
                    key="score"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      How likely are you to recommend The Quantum Club?
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Based on your recent experience
                    </p>

                    {/* NPS Scale */}
                    <div className="space-y-3">
                      <div className="flex justify-between gap-1">
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                          <button
                            key={value}
                            onClick={() => handleScoreSelect(value)}
                            className={cn(
                              'flex-1 aspect-square rounded-lg text-sm font-medium transition-all',
                              'hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary',
                              score === value
                                ? 'bg-primary text-primary-foreground'
                                : value <= 6
                                  ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                                  : value <= 8
                                    ? 'bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20'
                                    : 'bg-green-500/10 text-green-600 hover:bg-green-500/20'
                            )}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{NPS_LABELS[0]}</span>
                        <span>{NPS_LABELS[10]}</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {step === 'feedback' && (
                  <motion.div
                    key="feedback"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      {score !== null && score <= 6
                        ? "We're sorry to hear that. How can we improve?"
                        : "That's great! What do you love most?"}
                    </h3>
                    <Textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Your feedback helps us improve..."
                      className="min-h-[100px] mb-4"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleSubmit(score!, '')}
                        className="flex-1"
                      >
                        Skip
                      </Button>
                      <Button
                        onClick={handleFeedbackSubmit}
                        disabled={isSubmitting}
                        className="flex-1"
                      >
                        Submit
                      </Button>
                    </div>
                  </motion.div>
                )}

                {step === 'thanks' && (
                  <motion.div
                    key="thanks"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-4"
                  >
                    <div className="text-4xl mb-3">✨</div>
                    <h3 className="text-lg font-medium text-foreground">
                      Thank you!
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Your feedback helps us improve.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default NPSSurvey;

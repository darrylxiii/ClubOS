/**
 * Feature Feedback Survey Component
 * Collects feedback on specific features (e.g., QUIN AI)
 * Triggered after feature usage threshold
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, ThumbsUp, ThumbsDown, Meh } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  recordSurveyShown,
  recordSurveyResponse,
  recordSurveyDismissal,
} from '@/services/surveyTriggerService';

interface FeatureFeedbackProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
  featureIcon?: React.ReactNode;
  context?: Record<string, unknown>;
}

const SURVEY_TYPE = 'feature_feedback';

const SATISFACTION_OPTIONS = [
  { value: 'unhappy', label: 'Needs work', icon: ThumbsDown, color: 'text-destructive' },
  { value: 'neutral', label: 'It\'s okay', icon: Meh, color: 'text-yellow-500' },
  { value: 'happy', label: 'Love it!', icon: ThumbsUp, color: 'text-green-500' },
] as const;

export function FeatureFeedback({
  isOpen,
  onClose,
  featureName,
  featureIcon,
  context,
}: FeatureFeedbackProps) {
  const [satisfaction, setSatisfaction] = useState<string | null>(null);
  const [improvement, setImprovement] = useState('');
  const [step, setStep] = useState<'rating' | 'details' | 'thanks'>('rating');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      recordSurveyShown(SURVEY_TYPE);
    }
  }, [isOpen]);

  const handleSatisfactionSelect = useCallback((value: string) => {
    setSatisfaction(value);
    if (value === 'happy') {
      // Happy users can skip details
      handleSubmit(value, '');
    } else {
      setStep('details');
    }
  }, []);

  const handleSubmit = async (finalSatisfaction: string, finalImprovement: string) => {
    setIsSubmitting(true);
    
    recordSurveyResponse(SURVEY_TYPE, {
      feature_name: featureName,
      satisfaction: finalSatisfaction,
      improvement_suggestion: finalImprovement || undefined,
      ...context,
    });
    
    setStep('thanks');
    setIsSubmitting(false);
    
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  const handleDismiss = () => {
    recordSurveyDismissal(SURVEY_TYPE);
    onClose();
  };

  const handleDetailsSubmit = () => {
    if (satisfaction) {
      handleSubmit(satisfaction, improvement);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed bottom-4 right-4 z-50 w-full max-w-sm"
        >
          <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-primary/10 to-transparent">
              <div className="flex items-center gap-2">
                {featureIcon || <Sparkles className="h-5 w-5 text-primary" />}
                <span className="font-medium text-foreground">{featureName} Feedback</span>
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
            <div className="p-5">
              <AnimatePresence mode="wait">
                {step === 'rating' && (
                  <motion.div
                    key="rating"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <h3 className="text-base font-medium text-foreground mb-4">
                      How's your experience with {featureName}?
                    </h3>

                    <div className="flex gap-3">
                      {SATISFACTION_OPTIONS.map((option) => {
                        const Icon = option.icon;
                        return (
                          <button
                            key={option.value}
                            onClick={() => handleSatisfactionSelect(option.value)}
                            className={cn(
                              'flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border transition-all',
                              'hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary',
                              satisfaction === option.value
                                ? 'border-primary bg-primary/10'
                                : 'border-border bg-muted/30 hover:bg-muted/50'
                            )}
                          >
                            <Icon className={cn('h-8 w-8', option.color)} />
                            <span className="text-xs font-medium text-foreground">
                              {option.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {step === 'details' && (
                  <motion.div
                    key="details"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <h3 className="text-base font-medium text-foreground mb-2">
                      What could we improve?
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Your feedback shapes the future of {featureName}
                    </p>
                    <Textarea
                      value={improvement}
                      onChange={(e) => setImprovement(e.target.value)}
                      placeholder="Tell us what would make it better..."
                      className="min-h-[80px] mb-4"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleSubmit(satisfaction!, '')}
                        className="flex-1"
                        size="sm"
                      >
                        Skip
                      </Button>
                      <Button
                        onClick={handleDetailsSubmit}
                        disabled={isSubmitting}
                        className="flex-1"
                        size="sm"
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
                    <div className="text-3xl mb-2">🙏</div>
                    <h3 className="text-base font-medium text-foreground">
                      Thanks for your feedback!
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Powered by QUIN
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

export default FeatureFeedback;

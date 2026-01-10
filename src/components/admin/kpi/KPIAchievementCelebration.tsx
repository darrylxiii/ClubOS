import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, TrendingUp, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import confetti from 'canvas-confetti';

interface Achievement {
  id: string;
  kpiName: string;
  previousStatus: 'warning' | 'critical';
  newStatus: 'success';
  improvementPercent: number;
  milestone?: string;
}

interface KPIAchievementCelebrationProps {
  achievement?: Achievement | null;
  onDismiss?: () => void;
}

export function KPIAchievementCelebration({ 
  achievement = null, 
  onDismiss = () => {}
}: KPIAchievementCelebrationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (achievement) {
      setIsVisible(true);
      
      // Fire confetti
      const duration = 3000;
      const end = Date.now() + duration;

      const colors = ['#C9A24E', '#F5F4EF', '#10B981'];

      (function frame() {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: colors
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: colors
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      }());

      // Auto-dismiss after 8 seconds
      const timer = setTimeout(() => {
        handleDismiss();
      }, 8000);

      return () => clearTimeout(timer);
    }
  }, [achievement]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300);
  };

  if (!achievement) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          onClick={handleDismiss}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 15 }}
            className="relative w-full max-w-md mx-4 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header gradient */}
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-accent/20 to-transparent" />
            
            {/* Sparkle decorations */}
            <div className="absolute top-4 left-4">
              <Sparkles className="h-6 w-6 text-accent animate-pulse" />
            </div>
            <div className="absolute top-4 right-12">
              <Star className="h-5 w-5 text-accent/60 animate-bounce" />
            </div>
            
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8 rounded-full"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>

            <div className="relative p-8 pt-12 text-center">
              {/* Trophy icon */}
              <motion.div
                initial={{ rotate: -10, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-accent to-accent/60 mb-6 shadow-lg"
              >
                <Trophy className="h-10 w-10 text-accent-foreground" />
              </motion.div>

              {/* Achievement text */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  KPI Target Achieved!
                </h2>
                <p className="text-muted-foreground mb-4">
                  Congratulations on this milestone
                </p>
              </motion.div>

              {/* KPI details card */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-muted/50 rounded-xl p-4 mb-6"
              >
                <h3 className="font-semibold text-foreground text-lg mb-2">
                  {achievement.kpiName}
                </h3>
                
                <div className="flex items-center justify-center gap-3 text-sm">
                  <span className={`px-2 py-1 rounded-full ${
                    achievement.previousStatus === 'critical' 
                      ? 'bg-destructive/20 text-destructive' 
                      : 'bg-yellow-500/20 text-yellow-600'
                  }`}>
                    {achievement.previousStatus === 'critical' ? 'Critical' : 'Warning'}
                  </span>
                  <TrendingUp className="h-4 w-4 text-accent" />
                  <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-600">
                    On Target
                  </span>
                </div>

                {achievement.improvementPercent > 0 && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    <span className="text-green-500 font-semibold">
                      +{achievement.improvementPercent.toFixed(1)}%
                    </span>{' '}
                    improvement
                  </p>
                )}

                {achievement.milestone && (
                  <p className="mt-2 text-xs text-accent font-medium">
                    🎯 {achievement.milestone}
                  </p>
                )}
              </motion.div>

              {/* Action button */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <Button 
                  onClick={handleDismiss}
                  className="bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  Continue
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

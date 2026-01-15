import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Sparkles, PartyPopper, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { RevenueMilestone } from '@/hooks/useRevenueLadder';

interface MilestoneUnlockCelebrationProps {
  milestone: RevenueMilestone | null;
  onClose: () => void;
}

export function MilestoneUnlockCelebration({ milestone, onClose }: MilestoneUnlockCelebrationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (milestone) {
      setIsVisible(true);
      
      // Trigger confetti
      const duration = 3000;
      const end = Date.now() + duration;
      
      const colors = ['#C9A24E', '#FFD700', '#FFA500', '#FF6347'];
      
      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors,
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors,
        });
        
        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      
      frame();

      // Center burst
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors,
        });
      }, 500);
    }
  }, [milestone]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `€${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `€${(amount / 1000).toFixed(0)}K`;
    }
    return `€${amount}`;
  };

  return (
    <AnimatePresence>
      {isVisible && milestone && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-xl"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 20,
              delay: 0.1 
            }}
            className="relative max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-2 -right-2 z-10 rounded-full bg-card shadow-lg"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>

            {/* Main Card */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-card via-card to-card/80 border border-border/50 shadow-float">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-warning/20 via-transparent to-premium/20" />
              
              {/* Animated particles */}
              <div className="absolute inset-0 overflow-hidden">
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 bg-warning/40 rounded-full"
                    initial={{ 
                      x: Math.random() * 100 + '%',
                      y: '100%',
                      scale: 0 
                    }}
                    animate={{ 
                      y: '-20%',
                      scale: [0, 1, 0],
                      opacity: [0, 1, 0]
                    }}
                    transition={{
                      duration: 2 + Math.random() * 2,
                      repeat: Infinity,
                      delay: i * 0.3,
                    }}
                  />
                ))}
              </div>

              <div className="relative z-10 p-8 text-center space-y-6">
                {/* Icon */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 200, 
                    damping: 15,
                    delay: 0.3 
                  }}
                  className="relative inline-block"
                >
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-warning via-warning/80 to-warning/60 flex items-center justify-center shadow-[0_0_60px_hsl(38_92%_50%/0.5)]">
                    <Trophy className="h-12 w-12 text-warning-foreground" />
                  </div>
                  
                  {/* Sparkles around trophy */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0"
                  >
                    {[0, 60, 120, 180, 240, 300].map((deg, i) => (
                      <Sparkles
                        key={i}
                        className="absolute h-4 w-4 text-warning"
                        style={{
                          top: `${50 + 50 * Math.sin((deg * Math.PI) / 180)}%`,
                          left: `${50 + 50 * Math.cos((deg * Math.PI) / 180)}%`,
                          transform: 'translate(-50%, -50%)',
                        }}
                      />
                    ))}
                  </motion.div>
                </motion.div>

                {/* Title */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-center gap-2">
                    <PartyPopper className="h-5 w-5 text-warning" />
                    <p className="text-label-md uppercase tracking-wider text-muted-foreground">
                      Milestone Unlocked
                    </p>
                    <PartyPopper className="h-5 w-5 text-warning scale-x-[-1]" />
                  </div>
                  <h2 className="text-display-sm font-bold tracking-tight">
                    {milestone.display_name}
                  </h2>
                </motion.div>

                {/* Amount */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7, type: "spring" }}
                  className="py-4"
                >
                  <p className="text-display-lg font-bold text-warning tracking-tight">
                    {formatCurrency(milestone.threshold_amount)}
                  </p>
                  <p className="text-body-sm text-muted-foreground mt-2">
                    Revenue milestone reached
                  </p>
                </motion.div>

                {/* CTA */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                >
                  <Button 
                    size="lg" 
                    className="gap-2 bg-warning text-warning-foreground hover:bg-warning/90"
                    onClick={handleClose}
                  >
                    <Sparkles className="h-4 w-4" />
                    Propose a Reward
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

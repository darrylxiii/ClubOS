import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { X, Sparkles, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface UnlockedAchievement {
  id: string;
  name: string;
  icon_emoji: string;
  points: number;
  rarity: string;
  animation_type?: string;
}

export const AchievementUnlockToast = () => {
  const [queue, setQueue] = useState<UnlockedAchievement[]>([]);
  const [current, setCurrent] = useState<UnlockedAchievement | null>(null);

  useEffect(() => {
    const handleUnlock = (event: CustomEvent<UnlockedAchievement>) => {
      setQueue((prev) => [...prev, event.detail]);
    };

    window.addEventListener('achievementUnlocked' as any, handleUnlock);
    return () => {
      window.removeEventListener('achievementUnlocked' as any, handleUnlock);
    };
  }, []);

  useEffect(() => {
    if (!current && queue.length > 0) {
      const [next, ...rest] = queue;
      setCurrent(next);
      setQueue(rest);

      // Trigger celebration
      triggerCelebration(next.rarity, next.animation_type);

      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        setCurrent(null);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [current, queue]);

  const triggerCelebration = (rarity: string, animationType?: string) => {
    // Play sound (optional)
    try {
      const audio = new Audio('/achievement-unlock.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Ignore audio errors
      });
    } catch (e) {
      // Ignore
    }

    // Confetti based on rarity
    const confettiConfig = getConfettiConfig(rarity);
    confetti(confettiConfig);

    // Additional animation for legendary/quantum
    if (rarity === 'legendary' || rarity === 'quantum') {
      setTimeout(() => confetti(confettiConfig), 200);
      setTimeout(() => confetti(confettiConfig), 400);
    }
  };

  const getConfettiConfig = (rarity: string) => {
    const configs: Record<string, Record<string, unknown>> = {
      common: {
        particleCount: 50,
        spread: 50,
        origin: { y: 0.6 },
      },
      rare: {
        particleCount: 75,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#06b6d4'],
      },
      epic: {
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#a855f7', '#ec4899'],
      },
      legendary: {
        particleCount: 150,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#f97316', '#ef4444'],
        gravity: 0.5,
      },
      quantum: {
        particleCount: 200,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#C9A24E', '#F5E6D3'],
        gravity: 0.3,
        scalar: 1.2,
      },
    };

    return configs[rarity] || configs.common;
  };

  const handleShare = () => {
    if (!current) return;
    
    toast.success('Achievement shared to your feed!');
    setCurrent(null);
  };

  const handleClose = () => {
    setCurrent(null);
  };

  const rarityColors: Record<string, string> = {
    common: 'from-gray-500/20 to-gray-600/20 border-gray-500',
    rare: 'from-blue-500/20 to-cyan-500/20 border-blue-500',
    epic: 'from-purple-500/20 to-pink-500/20 border-purple-500',
    legendary: 'from-orange-500/20 to-red-500/20 border-orange-500',
    quantum: 'from-primary/20 to-accent/20 border-primary',
  };

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          initial={{ scale: 0, opacity: 0, y: 100 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0, opacity: 0, y: -100 }}
          transition={{ type: 'spring', damping: 15, stiffness: 300 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4"
        >
          <div
            className={`
              relative overflow-hidden rounded-2xl border-2 shadow-2xl backdrop-blur-xl
              bg-gradient-to-br ${rarityColors[current.rarity]}
              p-6
            `}
          >
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-primary/10 to-transparent animate-pulse" />
            
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-2 right-2 p-2 rounded-full hover:bg-background/20 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative space-y-4">
              {/* Achievement Unlocked Header */}
              <div className="flex items-center justify-center gap-2 text-sm font-semibold text-primary">
                <Sparkles className="h-4 w-4 animate-pulse" />
                <span>ACHIEVEMENT UNLOCKED</span>
                <Sparkles className="h-4 w-4 animate-pulse" />
              </div>

              {/* Icon */}
              <div className="flex justify-center">
                <motion.div
                  animate={{
                    rotate: [0, -10, 10, -10, 10, 0],
                    scale: [1, 1.1, 1.1, 1.1, 1.1, 1],
                  }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="text-8xl"
                >
                  {current.icon_emoji}
                </motion.div>
              </div>

              {/* Name */}
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold">{current.name}</h3>
                <div className="flex items-center justify-center gap-2">
                  <Badge variant="outline" className="capitalize text-sm">
                    {current.rarity}
                  </Badge>
                  <Badge variant="secondary" className="gap-1 text-sm">
                    <Sparkles className="h-3 w-3" />
                    +{current.points} XP
                  </Badge>
                </div>
              </div>

              {/* Share Button */}
              <Button
                onClick={handleShare}
                className="w-full gap-2"
                variant="default"
              >
                <Share2 className="h-4 w-4" />
                Share to Feed
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

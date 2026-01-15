import { memo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SwipeScenario } from '@/types/assessment';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';

interface SwipeCardProps {
  scenario: SwipeScenario;
  onSwipe: (direction: 'up' | 'right' | 'left' | 'down') => void;
  index: number;
  totalCards: number;
}

export const SwipeCard = memo(({ scenario, onSwipe, index, totalCards }: SwipeCardProps) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [exitDirection, setExitDirection] = useState<string | null>(null);

  const rotateX = useTransform(y, [-200, 200], [10, -10]);
  const rotateY = useTransform(x, [-200, 200], [-10, 10]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 100;
    const { offset, velocity } = info;

    // Determine direction based on drag distance and velocity
    if (Math.abs(offset.y) > Math.abs(offset.x)) {
      if (offset.y < -threshold || velocity.y < -500) {
        setExitDirection('up');
        onSwipe('up');
      } else if (offset.y > threshold || velocity.y > 500) {
        setExitDirection('down');
        onSwipe('down');
      }
    } else {
      if (offset.x > threshold || velocity.x > 500) {
        setExitDirection('right');
        onSwipe('right');
      } else if (offset.x < -threshold || velocity.x < -500) {
        setExitDirection('left');
        onSwipe('left');
      }
    }
  };

  const cardVariants = {
    enter: { scale: 0.9, opacity: 0, y: 20 },
    center: { scale: 1, opacity: 1, y: 0 },
    exit: (direction: string) => ({
      x: direction === 'left' ? -400 : direction === 'right' ? 400 : 0,
      y: direction === 'up' ? -400 : direction === 'down' ? 400 : 0,
      opacity: 0,
      transition: { duration: 0.3 },
    }),
  };

  return (
    <motion.div
      className="absolute inset-0"
      style={{
        x,
        y,
        rotateX,
        rotateY,
        zIndex: totalCards - index,
        scale: useTransform(x, [-200, 0, 200], [0.95, 1, 0.95]),
      }}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      variants={cardVariants}
      initial="enter"
      animate="center"
      exit={exitDirection ? ['exit', exitDirection] : undefined}
      custom={exitDirection}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.95 }}
    >
      <Card className="h-full cursor-grab active:cursor-grabbing select-none">
        <CardContent className="h-full flex flex-col items-center justify-center p-8 space-y-6">
          <div className="text-7xl">{scenario.emoji}</div>
          
          <Badge variant="outline" className="text-xs">
            {scenario.category}
          </Badge>

          <p className="text-2xl font-medium text-center leading-relaxed">
            {scenario.text}
          </p>

          {/* Swipe direction overlays */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center bg-green-500/20 backdrop-blur-sm rounded-2xl"
            style={{ opacity: useTransform(y, [-200, 0], [1, 0]) }}
          >
            <span className="text-6xl font-bold text-green-400">LOVE IT!</span>
          </motion.div>

          <motion.div
            className="absolute inset-0 flex items-center justify-center bg-blue-500/20 backdrop-blur-sm rounded-2xl"
            style={{ opacity: useTransform(x, [0, 200], [0, 1]) }}
          >
            <span className="text-6xl font-bold text-blue-400">LIKE IT</span>
          </motion.div>

          <motion.div
            className="absolute inset-0 flex items-center justify-center bg-orange-500/20 backdrop-blur-sm rounded-2xl"
            style={{ opacity: useTransform(x, [-200, 0], [1, 0]) }}
          >
            <span className="text-6xl font-bold text-orange-400">NOT FOR ME</span>
          </motion.div>

          <motion.div
            className="absolute inset-0 flex items-center justify-center bg-red-500/20 backdrop-blur-sm rounded-2xl"
            style={{ opacity: useTransform(y, [0, 200], [0, 1]) }}
          >
            <span className="text-6xl font-bold text-red-400">AVOID</span>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

SwipeCard.displayName = 'SwipeCard';
